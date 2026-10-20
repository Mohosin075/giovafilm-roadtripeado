import mongoose from 'mongoose'
import { Place } from '../place/place.model'
import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IBusiness, BusinessStatus } from './business.interface'
import { Business } from './business.model'
import { Offer } from '../offer/offer.model'
import { OfferRedemption } from '../offer/offerRedemption.model'
import { UsageView } from '../stats/usageView.model'
import { Visited } from '../visited/visited.model'
import { getTimeFilterQuery } from '../../helpers/dateHelper'
import QueryBuilder from '../../builder/QueryBuilder'
import { businessSearchableFields } from './business.constants'
import { OFFER_STATUS } from '../../enum/offer'
import { Subscription } from '../subscription/subscription.model'
import { autoTranslateField } from '../../utils/autoTranslate'
import { USER_ROLES } from '../../enum/user'
import { getUserFromToken } from '../../helpers/mapAccessHelper'

const resolveUserRole = (user: any): string | undefined =>
  user?.role || user?.user?.role || user?.data?.role

const isAdminRole = (role?: string) =>
  !!role && [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(role as any)

const getBusinessOwnerId = (business: any): string | null => {
  if (!business?.user) return null
  return (business.user._id || business.user).toString()
}

const stripPrivateInfo = (business: any) => {
  if (!business) return business
  const obj =
    typeof business.toObject === 'function' ? business.toObject() : { ...business }
  delete obj.privateInfo
  delete obj.adminReview
  return obj
}

const processBusinessTranslations = async (payload: Partial<IBusiness>) => {
  if (payload.name) {
    if (typeof payload.name === 'string') {
      const trimmed = payload.name.trim()
      payload.name = { en: trimmed, es: trimmed } as any
    } else if (typeof payload.name === 'object' && payload.name !== null) {
      const enVal = ((payload.name as any).en || '').trim()
      const esVal = ((payload.name as any).es || '').trim()
      if (enVal && esVal) {
        payload.name = { en: enVal, es: esVal } as any
      } else {
        const fallback = enVal || esVal || ''
        payload.name = { en: enVal || fallback, es: esVal || fallback } as any
      }
    }
  }
  if (payload.description) payload.description = await autoTranslateField(payload.description)
}

const createBusiness = async (payload: any, userId?: string): Promise<IBusiness> => {
  const businessData = {
    ...payload,
    user: userId || payload.user,
  }

  if (payload.images) {
    if (!businessData.media) businessData.media = {}
    businessData.media.photos = Array.isArray(payload.images)
      ? payload.images
      : [payload.images]
  }

  if (payload.documents) {
    if (!businessData.media) businessData.media = {}
    businessData.media.menu = Array.isArray(payload.documents)
      ? payload.documents[0]
      : payload.documents
  }

  await processBusinessTranslations(businessData)
  businessData.status = 'Pending' // Always start as pending until admin approves
  businessData.hasActiveSubscription = false // Explicitly start with no active subscription
  const result = await Business.create(businessData)
  return result
}

/**
 * Retrieves all businesses with support for queries (search, filter, sort, pagination).
 * Strips private admin info for non-owner/non-admin users.
 */
const getAllBusinesses = async (
  query: Record<string, unknown>,
  authHeader?: string,
) => {
  const queryObj = { ...query }
  // If requesting specifically for the map, enforce active subscription and approved status
  if (queryObj.mapView === 'true') {
    queryObj.hasActiveSubscription = true
    queryObj.status = 'Approved'
    delete queryObj.mapView
  }

  const businessQuery = new QueryBuilder(
    Business.find()
      .populate('user', 'name email profile')
      .populate('category', 'name color icon status')
      .lean(),
    queryObj,
  )
    .search(businessSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields()

  const [user, result, meta] = await Promise.all([
    getUserFromToken(authHeader),
    businessQuery.modelQuery,
    businessQuery.getPaginationInfo(),
  ])

  const data = result.map((biz: any) => {
    const ownerId = getBusinessOwnerId(biz)
    const canSeePrivate =
      isAdminRole(user?.role) || (user && ownerId === user._id.toString())
    return canSeePrivate ? biz : stripPrivateInfo(biz)
  })

  return {
    meta,
    data,
  }
}

/**
 * Retrieves businesses belonging to the authenticated user.
 * @param userId The user's ID
 * @param query The query parameters from the request
 * @returns Paginated list of businesses and metadata
 */
const getMyBusinesses = async (userId: string, query: Record<string, unknown>) => {
  const businessQuery = new QueryBuilder(
    Business.find({ user: userId })
      .populate('user', 'name email profile')
      .populate('category', 'name color icon status')
      .lean(),
    query
  )
    .search(businessSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields()

  const result = await businessQuery.modelQuery
  const meta = await businessQuery.getPaginationInfo()

  const unpaidIds = (result as any[])
    .filter((business) => !business.hasActiveSubscription)
    .map((business) => business._id)

  if (unpaidIds.length > 0) {
    const paidSubs = await Subscription.find({
      businessId: { $in: unpaidIds },
      status: { $in: ['active', 'trialing'] },
    })
      .select('businessId planId')
      .lean()

    if (paidSubs.length > 0) {
      const paidByBusiness = new Map(
        paidSubs.map((sub) => [String(sub.businessId), sub]),
      )

      await Promise.all(
        paidSubs.map((sub) =>
          Business.findByIdAndUpdate(sub.businessId, {
            hasActiveSubscription: true,
            ...(sub.planId ? { plan: sub.planId } : {}),
          }),
        ),
      )

      for (const business of result as any[]) {
        const paid = paidByBusiness.get(String(business._id))
        if (paid) {
          business.hasActiveSubscription = true
          if (paid.planId) business.plan = paid.planId
        }
      }
    }
  }

  const timeFilter = typeof query.timeFilter === 'string' ? query.timeFilter : undefined
  const dateRange = getTimeFilterQuery(timeFilter)

  // Populate offer information, views, and discounts redeemed count for each business
  const businessIds = (result as any[]).map((business) => business._id)
  let overallTotalViews = 0
  let overallTotalRedemptions = 0

  if (businessIds.length > 0) {
    const offers = await Offer.find({ business: { $in: businessIds } })
      .select('_id business redemptionsCount title discountType discountValue')
      .lean()

    const offersByBusiness = new Map<string, any[]>()
    for (const off of offers) {
      const bId = String(off.business)
      if (!offersByBusiness.has(bId)) offersByBusiness.set(bId, [])
      offersByBusiness.get(bId)!.push(off)
    }

    // Get views and visits for each business (including any matching places with same name)
    const businessNames: string[] = []
    for (const b of result as any[]) {
      if (typeof b.name === 'object') {
        if (b.name.en) businessNames.push(b.name.en)
        if (b.name.es) businessNames.push(b.name.es)
      } else if (typeof b.name === 'string' && b.name.trim()) {
        businessNames.push(b.name.trim())
      }
    }

    const linkedPlaces =
      businessNames.length > 0
        ? await Place.find({
            $or: [
              { name: { $in: businessNames } },
              { 'name.en': { $in: businessNames } },
              { 'name.es': { $in: businessNames } },
            ],
          })
            .select('_id name')
            .lean()
        : []

    const linkedPlaceIds = linkedPlaces.map((p) => p._id)
    const linkedPlaceIdStrings = linkedPlaceIds.map(String)

    // Map place ID to business ID
    const placeIdToBusinessId = new Map<string, string>()
    for (const p of linkedPlaces) {
      const pName = (typeof p.name === 'object' ? `${p.name.en || ''} ${p.name.es || ''}` : p.name || '').toLowerCase().trim()
      for (const b of result as any[]) {
        const bName = (typeof b.name === 'object' ? `${b.name.en || ''} ${b.name.es || ''}` : b.name || '').toLowerCase().trim()
        if (pName && bName && (pName.includes(bName) || bName.includes(pName))) {
          placeIdToBusinessId.set(String(p._id), String(b._id))
        }
      }
    }

    const viewsByBusiness = new Map<string, number>()
    const visitedByBusiness = new Map<string, number>()

    const allEntityIds = [...businessIds.map(String), ...linkedPlaceIdStrings]
    const viewMatch: any = {
      $or: [
        { type: 'business', entityId: { $in: businessIds.map(String) } },
        { entityId: { $in: allEntityIds } },
      ],
    }
    if (dateRange) viewMatch.lastSeenAt = dateRange

    const visitedMatch: any = {
      $or: [
        { type: 'Business', business: { $in: businessIds } },
        { business: { $in: businessIds } },
        ...(linkedPlaceIds.length > 0 ? [{ place: { $in: linkedPlaceIds } }] : []),
      ],
    }
    if (dateRange) visitedMatch.visitedAt = dateRange

    const [viewAgg, visitedAgg] = await Promise.all([
      UsageView.aggregate([
        { $match: viewMatch },
        {
          $group: {
            _id: '$entityId',
            count: { $sum: 1 },
          },
        },
      ]),
      Visited.aggregate([
        { $match: visitedMatch },
        {
          $group: {
            _id: { $ifNull: ['$business', '$place'] },
            count: { $sum: 1 },
          },
        },
      ]),
    ])

    for (const item of viewAgg) {
      const idStr = String(item._id)
      const mappedBizId = placeIdToBusinessId.get(idStr) || idStr
      viewsByBusiness.set(
        mappedBizId,
        (viewsByBusiness.get(mappedBizId) || 0) + item.count,
      )
    }
    for (const item of visitedAgg) {
      const idStr = String(item._id)
      const mappedBizId = placeIdToBusinessId.get(idStr) || idStr
      visitedByBusiness.set(
        mappedBizId,
        (visitedByBusiness.get(mappedBizId) || 0) + item.count,
      )
    }

    // Get redemptions for all offers
    const offerIds = offers.map((o) => o._id)
    const redemptionsByOffer = new Map<string, number>()
    if (offerIds.length > 0) {
      const redemptQuery: any = { offer: { $in: offerIds } }
      if (dateRange) redemptQuery.createdAt = dateRange
      const redemptAgg = await OfferRedemption.aggregate([
        { $match: redemptQuery },
        {
          $group: {
            _id: '$offer',
            count: { $sum: 1 },
          },
        },
      ])
      for (const item of redemptAgg) {
        redemptionsByOffer.set(String(item._id), item.count)
      }
    }

    for (const business of result as any[]) {
      const bOffers = offersByBusiness.get(String(business._id)) || []
      business.offer = bOffers[0] || null

      let bRedemptions = 0
      for (const off of bOffers) {
        const rCount = redemptionsByOffer.get(String(off._id))
        if (rCount !== undefined) {
          bRedemptions += rCount
        } else if (!dateRange) {
          bRedemptions += off.redemptionsCount || 0
        }
      }
      business.discountsRedeemed = bRedemptions
      overallTotalRedemptions += bRedemptions

      const uViews = viewsByBusiness.get(String(business._id)) || 0
      const vCount = visitedByBusiness.get(String(business._id)) || 0
      const effectiveVisits = dateRange
        ? Math.max(uViews, vCount)
        : Math.max(business.viewCount || 0, uViews, vCount)

      business.viewCount = effectiveVisits
      business.visitsCount = effectiveVisits
      overallTotalViews += effectiveVisits
    }
  }

  (meta as any).stats = {
    totalBusinesses: (result as any[]).length,
    totalViews: overallTotalViews,
    totalVisits: overallTotalViews,
    totalDiscountsRedeemed: overallTotalRedemptions,
    activeBusinesses: (result as any[]).filter(
      (b) => b.hasActiveSubscription && (b.status === 'Approved' || b.status === 'approved')
    ).length,
    timeFilter: timeFilter || 'all_time',
  }

  return {
    meta,
    data: result,
  }
}


/**
 * Retrieves a single business by its ID.
 * Strips private admin info for non-owner/non-admin users.
 */
const getBusinessById = async (
  id: string,
  authHeader?: string,
): Promise<any | null> => {
  const [user, result] = await Promise.all([
    getUserFromToken(authHeader),
    Business.findById(id).populate('user category'),
  ])
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }

  const ownerId = getBusinessOwnerId(result)
  const canSeePrivate =
    isAdminRole(user?.role) || (user && ownerId === user._id.toString())

  return canSeePrivate ? result : stripPrivateInfo(result)
}

/**
 * Updates an existing business listing with permission and status enforcement.
 */
const updateBusiness = async (
  id: string,
  payload: any,
  authUser?: any,
): Promise<IBusiness | null> => {
  const existing = await Business.findById(id)
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }

  const ownerId = getBusinessOwnerId(existing)
  const admin = isAdminRole(resolveUserRole(authUser))
  const currentUserId = (authUser?.authId || authUser?._id || authUser?.id || '')?.toString()
  if (!admin && ownerId !== currentUserId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to update this business',
    )
  }

  const businessData = { ...payload }

  // Users cannot self-approve, self-verify, or toggle subscription
  if (!admin) {
    delete businessData.status
    delete businessData.hasActiveSubscription
    delete businessData.isAccuracyVerified
    delete businessData.adminReview
  }

  const existingReview =
    (existing as any).adminReview &&
    typeof (existing as any).adminReview === 'object'
      ? (existing as any).adminReview
      : {}

  if (businessData.adminReview) {
    businessData.adminReview = {
      ...existingReview,
      ...businessData.adminReview,
    }
    if (typeof businessData.adminReview.locationPinVerified === 'boolean') {
      businessData.isAccuracyVerified =
        businessData.adminReview.locationPinVerified
    }
  }

  if (typeof businessData.isAccuracyVerified === 'boolean') {
    businessData.adminReview = {
      ...existingReview,
      ...businessData.adminReview,
      locationPinVerified: businessData.isAccuracyVerified,
    }
  }

  // Handle image upload from disk storage
  if (payload.images) {
    if (!businessData.media) businessData.media = {}
    const newPhotos = Array.isArray(payload.images)
      ? payload.images
      : [payload.images]
    const existingPhotos = Array.isArray(businessData.media.photos)
      ? businessData.media.photos
      : Array.isArray(existing.media?.photos)
      ? existing.media.photos
      : []
    businessData.media.photos = [...existingPhotos, ...newPhotos]
  }

  // Handle menu/document upload from disk storage
  if (payload.documents) {
    if (!businessData.media) businessData.media = {}
    businessData.media.menu = Array.isArray(payload.documents)
      ? payload.documents[0]
      : payload.documents
  }

  if (businessData.media && existing.media?.menu && !businessData.media.menu) {
    businessData.media.menu = existing.media.menu
  }

  await processBusinessTranslations(businessData)
  const result = await Business.findByIdAndUpdate(id, businessData, {
    new: true,
    runValidators: true,
  }).populate('user category')
  return result
}

/**
 * Updates the approval status of a business listing (e.g., Pending, Approved, Rejected).
 * @param id The business document ID
 * @param status The new status value
 * @returns The updated business document
 */
const updateBusinessStatus = async (
  id: string,
  status: BusinessStatus,
): Promise<IBusiness | null> => {
  const isExist = await Business.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }

  const result = await Business.findByIdAndUpdate(
    id,
    { status },
    {
      new: true,
      runValidators: true,
    },
  ).populate('user category')
  return result
}

/**
 * Deletes a business listing permanently with permission check.
 */
const deleteBusiness = async (
  id: string,
  authUser?: any,
): Promise<IBusiness | null> => {
  const existing = await Business.findById(id)
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }

  const ownerId = getBusinessOwnerId(existing)
  const admin = isAdminRole(resolveUserRole(authUser))
  if (!admin && ownerId !== authUser?.authId?.toString()) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to delete this business',
    )
  }

  const result = await Business.findByIdAndDelete(id)
  return result
}


const getBusinessStats = async (businessId: string, timeFilter?: string) => {
  const business = await Business.findById(businessId)
  if (!business) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }

  const dateRange = getTimeFilterQuery(timeFilter)

  // Get all offers for this business and sum their redemptions
  const offers = await Offer.find({ business: businessId }).select(
    '_id status redemptionsCount',
  )
  const offerIds = offers.map((o) => o._id)

  let totalOfferRedemptions = 0
  if (offerIds.length > 0) {
    const redemptionQuery: any = { offer: { $in: offerIds } }
    if (dateRange) {
      redemptionQuery.createdAt = dateRange
    }
    const redemptionsCount = await OfferRedemption.countDocuments(redemptionQuery)
    if (!dateRange && redemptionsCount === 0) {
      totalOfferRedemptions = offers.reduce(
        (acc, offer) => acc + (offer.redemptionsCount || 0),
        0,
      )
    } else {
      totalOfferRedemptions = redemptionsCount
    }
  }

  // Views and visits from UsageView and Visited (including any duplicate or linked Place entries)
  const businessName =
    typeof business.name === 'object'
      ? business.name.en || business.name.es || ''
      : business.name || ''

  const matchingPlace = businessName
    ? await Place.findOne({
        $or: [
          { name: businessName },
          { 'name.en': businessName },
          { 'name.es': businessName },
        ],
      })
        .select('_id')
        .lean()
    : null

  const targetIds = [businessId]
  if (matchingPlace) {
    targetIds.push(String(matchingPlace._id))
  }

  let viewCount = 0
  const viewQuery: any = {
    $or: [
      { type: 'business', entityId: businessId },
      { entityId: { $in: targetIds } },
    ],
  }
  const visitedQuery: any = {
    $or: [
      { business: businessId },
      { type: 'Business', business: businessId },
      ...(matchingPlace ? [{ place: matchingPlace._id }] : []),
    ],
  }
  if (dateRange) {
    viewQuery.lastSeenAt = dateRange
    visitedQuery.visitedAt = dateRange
    const [trackedViews, visitedCount] = await Promise.all([
      UsageView.countDocuments(viewQuery),
      Visited.countDocuments(visitedQuery),
    ])
    viewCount = Math.max(trackedViews, visitedCount)
  } else {
    const [trackedViews, visitedCount] = await Promise.all([
      UsageView.countDocuments(viewQuery),
      Visited.countDocuments(visitedQuery),
    ])
    viewCount = Math.max(trackedViews, visitedCount, business.viewCount || 0)
  }

  return {
    viewCount,
    visitsCount: viewCount,
    totalOfferRedemptions,
    activeOffersCount: offers.filter((o) => o.status === OFFER_STATUS.ACTIVE).length,
    timeFilter: timeFilter || 'all_time',
  }
}

const incrementViewCount = async (id: string, userId?: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null
  const business = await Business.findByIdAndUpdate(
    id,
    { $inc: { viewCount: 1 } },
    { new: true },
  )
  if (userId) {
    try {
      await UsageView.findOneAndUpdate(
        { viewerKey: `user:${userId}`, type: 'business', entityId: String(id) },
        { $set: { lastSeenAt: new Date() } },
        { upsert: true }
      )
    } catch {
      // Ignore unique index collision
    }
  }
  return business
}

export const BusinessService = {
  createBusiness,
  getAllBusinesses,
  getMyBusinesses,
  getBusinessById,
  updateBusiness,
  updateBusinessStatus,
  deleteBusiness,
  getBusinessStats,
  incrementViewCount,
}
