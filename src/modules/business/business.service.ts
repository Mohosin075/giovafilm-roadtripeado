import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IBusiness, BusinessStatus } from './business.interface'
import { Business } from './business.model'
import { Offer } from '../offer/offer.model'
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
  if (!admin && ownerId !== authUser?.authId?.toString()) {
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
    businessData.media.photos = Array.isArray(payload.images)
      ? payload.images
      : [payload.images]
  }

  // Handle menu/document upload from disk storage
  if (payload.documents) {
    if (!businessData.media) businessData.media = {}
    businessData.media.menu = Array.isArray(payload.documents)
      ? payload.documents[0]
      : payload.documents
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


const getBusinessStats = async (businessId: string) => {
  const business = await Business.findById(businessId)
  if (!business) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }

  // Get all offers for this business and sum their redemptions
  const offers = await Offer.find({ business: businessId })
  const totalOfferRedemptions = offers.reduce(
    (acc, offer) => acc + (offer.redemptionsCount || 0),
    0,
  )

  return {
    viewCount: business.viewCount || 0,
    totalOfferRedemptions,
    activeOffersCount: offers.filter(o => o.status === OFFER_STATUS.ACTIVE).length,
  }
}

const incrementViewCount = async (id: string) => {
  return await Business.findByIdAndUpdate(
    id,
    { $inc: { viewCount: 1 } },
    { new: true },
  )
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
