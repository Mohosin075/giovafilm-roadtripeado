import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IOffer } from './offer.interface'
import { Offer } from './offer.model'
import { OfferRedemption } from './offerRedemption.model'
import QueryBuilder from '../../builder/QueryBuilder'
import { BOGO_SECOND_TYPE, DISCOUNT_TYPE, OFFER_STATUS } from '../../enum/offer'
import { Business } from '../business/business.model'
import { Place } from '../place/place.model'
import { autoTranslateField } from '../../utils/autoTranslate'
import {
  getUserFromToken,
  getAccessibleMapIds,
  verifyEditorEditAccess,
  verifyEditorBusinessAccess,
  buildCountryToMapIdLookup,
  resolveOfferMapId,
  resolveOfferMapIdAsync,
} from '../../helpers/mapAccessHelper'
import { USER_ROLES } from '../../enum/user'

const processOfferTranslations = async (payload: Partial<IOffer>) => {
  if (payload.title) payload.title = await autoTranslateField(payload.title)
  if (payload.description) payload.description = await autoTranslateField(payload.description)
  if (payload.buttonLabel) payload.buttonLabel = await autoTranslateField(payload.buttonLabel)
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Strip paid-only fields from locked list items; keep teaser fields for cards. */
const sanitizeLockedOffer = (offer: any) => {
  const {
    description: _description,
    redemptionRules: _redemptionRules,
    ...safe
  } = offer
  return {
    ...safe,
    description: undefined,
    redemptionRules: undefined,
    isLocked: true,
  }
}

const assertUserOwnsBusiness = async (user: any, businessId?: string) => {
  if (!businessId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You can only manage offers for your own business',
    )
  }
  const business = await Business.findById(businessId)
  if (!business) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }
  const ownerId = (business.user as any)?._id?.toString() || business.user?.toString()
  if (ownerId !== user._id.toString()) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only manage offers for your own business',
    )
  }
  return business
}

const createOffer = async (payload: any, authHeader?: string): Promise<IOffer> => {
  const { images, ...offerData } = payload
  const user = await getUserFromToken(authHeader)

  if (user && user.role === USER_ROLES.USER) {
    await assertUserOwnsBusiness(user, offerData.business)
    delete offerData.place
  }

  // Verify access for Map Editors
  if (user && user.role === USER_ROLES.MAP_EDITOR) {
    if (offerData.place) {
      const place = await Place.findById(offerData.place)
      if (!place) throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
      const mapId = place.map?._id || place.map
      if (mapId) {
        await verifyEditorEditAccess(user, mapId.toString())
      }
    } else if (offerData.business) {
      const business = await Business.findById(offerData.business)
      if (!business) throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
      await verifyEditorBusinessAccess(user, business.location?.country)
    }
  }

  // Handle image upload from disk storage
  if (images) {
    offerData.photo = Array.isArray(images) ? images[0] : images
  }

  await processOfferTranslations(offerData)
  if (offerData.discountType === DISCOUNT_TYPE.BOGO && !offerData.bogoSecondType) {
    offerData.bogoSecondType = BOGO_SECOND_TYPE.FREE
  }
  const status = offerData.status || OFFER_STATUS.ACTIVE
  if (status === OFFER_STATUS.ACTIVE && (offerData.place || offerData.business)) {
    const query: any[] = []
    if (offerData.place) query.push({ place: offerData.place })
    if (offerData.business) query.push({ business: offerData.business })

    if (query.length > 0) {
      const existingActiveOffer = await Offer.findOne({
        $or: query,
        status: OFFER_STATUS.ACTIVE,
      })

      if (existingActiveOffer) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'An active offer already exists for this place or business',
        )
      }
    }
  }

  const result = await Offer.create(offerData)
  return result
}

const getAllOffers = async (query: Record<string, unknown>, authHeader?: string) => {
  const queryObj = { ...query }

  // Extract custom query filters before QueryBuilder.filter() runs
  const country =
    typeof queryObj.country === 'string' ? queryObj.country.trim() : ''
  const searchTerm =
    typeof queryObj.searchTerm === 'string' ? queryObj.searchTerm.trim() : ''
  delete queryObj.country
  delete queryObj.searchTerm

  // Find all approved businesses with active subscriptions
  const activeBusinesses = await Business.find({
    status: 'Approved',
    hasActiveSubscription: true,
  }).select('_id').lean()
  const activeBusinessIds = activeBusinesses.map(b => b._id)

  // Filter offers: must either belong to a place or to an active/approved business
  const filterConditions: any[] = [
    {
      $or: [
        { place: { $exists: true, $ne: null } },
        { business: { $in: activeBusinessIds } },
      ],
    },
  ]

  // Filter by country if provided
  if (country) {
    const countryRegex = new RegExp(`^${escapeRegex(country)}$`, 'i')
    const [matchingPlaces, matchingBusinesses] = await Promise.all([
      Place.find({ country: countryRegex }).select('_id').lean(),
      Business.find({
        $or: [
          { 'location.country': countryRegex },
          { country: countryRegex },
        ],
      }).select('_id').lean(),
    ])

    const placeIds = matchingPlaces.map(p => p._id)
    const businessIds = matchingBusinesses.map(b => b._id)

    filterConditions.push({
      $or: [
        { place: { $in: placeIds } },
        { business: { $in: businessIds } },
      ],
    })
  }

  // Search by offer title/description, place name/address/municipality/region, or business name/address/city
  if (searchTerm) {
    const searchRegex = new RegExp(escapeRegex(searchTerm), 'i')

    const [matchingPlaces, matchingBusinesses] = await Promise.all([
      Place.find({
        $or: [
          { name: searchRegex },
          { address: searchRegex },
          { country: searchRegex },
        ],
      }).select('_id').lean(),
      Business.find({
        $or: [
          { name: searchRegex },
          { 'location.address': searchRegex },
          { 'location.city': searchRegex },
          { 'location.country': searchRegex },
        ],
      }).select('_id').lean(),
    ])

    const placeIds = matchingPlaces.map(p => p._id)
    const businessIds = matchingBusinesses.map(b => b._id)

    const searchOr: any[] = [
      { title: searchRegex },
      { description: searchRegex },
    ]

    if (placeIds.length > 0) {
      searchOr.push({ place: { $in: placeIds } })
    }
    if (businessIds.length > 0) {
      searchOr.push({ business: { $in: businessIds } })
    }

    filterConditions.push({ $or: searchOr })
  }

  const finalFilter =
    filterConditions.length > 1
      ? { $and: filterConditions }
      : filterConditions[0]

  const offerQuery = new QueryBuilder(
    Offer.find(finalFilter)
      .populate('business', 'name location media status category map country')
      .populate('place', 'name location media status category map country address')
      .lean(),
    queryObj,
  )
    .filter()
    .sort()
    .paginate()
    .fields()

  // Concurrently run query, pagination, and user authentication
  const [user, rawData, meta] = await Promise.all([
    getUserFromToken(authHeader),
    offerQuery.modelQuery,
    offerQuery.getPaginationInfo(),
  ])

  const isPremium = user && (
    [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MAP_EDITOR].includes(user.role as any)
  )

  const accessibleMapIds = await getAccessibleMapIds(user)

  const countries = rawData
    .map((offer: any) => offer.business?.location?.country || offer.business?.country)
    .filter(Boolean)
  const countryLookup = await buildCountryToMapIdLookup(countries)

  const updatedData = rawData.map((offer: any) => {
    const placeMapId = resolveOfferMapId(offer, countryLookup)
    const isLocked = !isPremium && (!placeMapId || !accessibleMapIds.includes(placeMapId))
    if (isLocked) {
      return sanitizeLockedOffer({ ...offer, isLocked: true })
    }
    return {
      ...offer,
      isLocked: false,
    }
  })

  return {
    meta,
    data: updatedData,
  }
}

const getOfferById = async (id: string, authHeader?: string): Promise<any> => {
  const [user, rawResult] = await Promise.all([
    getUserFromToken(authHeader),
    Offer.findById(id)
      .populate('place', 'name location media status category map country address')
      .populate('business', 'name location media status category'),
  ])

  if (!rawResult) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Offer not found')
  }

  const isPremium = user && (
    [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MAP_EDITOR].includes(user.role as any)
  )

  if (!isPremium) {
    const accessibleMapIds = await getAccessibleMapIds(user)
    const placeMapId = await resolveOfferMapIdAsync(rawResult)
    if (!placeMapId || !accessibleMapIds.includes(placeMapId)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'This information and these benefits can be unlocked by purchasing your favorite map.',
      )
    }
  }

  let result: any = rawResult
  if (user) {
    const [activeRedemption, userRedemptionCount] = await Promise.all([
      OfferRedemption.findOne({
        user: user._id,
        offer: id,
        expiresAt: { $gt: new Date() },
      }),
      OfferRedemption.countDocuments({
        user: user._id,
        offer: id,
      }),
    ])

    const offerObj = typeof result.toObject === 'function' ? result.toObject() : result
    result = {
      ...offerObj,
      activeRedemption,
      userRedemptionCount,
    }
  }

  return result
}

const updateOffer = async (
  id: string,
  payload: any,
  authHeader?: string,
): Promise<IOffer | null> => {
  const existingOffer = await Offer.findById(id)
  if (!existingOffer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Offer not found')
  }

  const { images, ...offerData } = payload
  const user = await getUserFromToken(authHeader)

  // getOfferById / raw model populates place/business — always resolve raw ids
  const existingPlaceId =
    (existingOffer as any).place?._id?.toString() ||
    (existingOffer as any).place?.toString() ||
    null
  const existingBusinessId =
    (existingOffer as any).business?._id?.toString() ||
    (existingOffer as any).business?.toString() ||
    null

  if (user && user.role === USER_ROLES.USER) {
    await assertUserOwnsBusiness(user, existingBusinessId || offerData.business)
    delete offerData.business
    delete offerData.place
  }

  if (user && user.role === USER_ROLES.MAP_EDITOR) {
    // Check existing offer's place/business
    if (existingPlaceId) {
      const place = await Place.findById(existingPlaceId)
      if (place) {
        const mapId = place.map?._id || place.map
        if (mapId) {
          await verifyEditorEditAccess(user, mapId.toString())
        }
      }
    } else if (existingBusinessId) {
      const business = await Business.findById(existingBusinessId)
      if (business) {
        await verifyEditorBusinessAccess(user, business.location?.country)
      }
    }

    // Check new place/business if they are being updated
    if (offerData.place && offerData.place !== existingPlaceId) {
      const place = await Place.findById(offerData.place)
      if (place) {
        const mapId = place.map?._id || place.map
        if (mapId) {
          await verifyEditorEditAccess(user, mapId.toString())
        }
      }
    } else if (offerData.business && offerData.business !== existingBusinessId) {
      const business = await Business.findById(offerData.business)
      if (business) {
        await verifyEditorBusinessAccess(user, business.location?.country)
      }
    }
  }

  // Handle image upload from disk storage
  if (images) {
    offerData.photo = Array.isArray(images) ? images[0] : images
  }

  await processOfferTranslations(offerData)

  const targetStatus = offerData.status || existingOffer.status
  const targetPlace = offerData.place || existingOffer.place
  const targetBusiness = offerData.business || existingOffer.business

  if (offerData.discountType === DISCOUNT_TYPE.BOGO && !offerData.bogoSecondType) {
    offerData.bogoSecondType = existingOffer.bogoSecondType || BOGO_SECOND_TYPE.FREE
  }

  if (targetStatus === OFFER_STATUS.ACTIVE && (targetPlace || targetBusiness)) {
    const query: any[] = []
    if (targetPlace) query.push({ place: targetPlace })
    if (targetBusiness) query.push({ business: targetBusiness })

    if (query.length > 0) {
      const existingActiveOffer = await Offer.findOne({
        _id: { $ne: id },
        $or: query,
        status: OFFER_STATUS.ACTIVE,
      })

      if (existingActiveOffer) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'An active offer already exists for this place or business',
        )
      }
    }
  }

  const result = await Offer.findByIdAndUpdate(id, offerData, {
    new: true,
    runValidators: true,
  }).populate('place')
  return result
}

const getOffersByPlaceOrBusinessId = async (id: string, authHeader?: string) => {
  const [user, result] = await Promise.all([
    getUserFromToken(authHeader),
    Offer.findOne({
      $or: [{ place: id }, { business: id }],
    }).populate('place business'),
  ])

  const isPremium = user && (
    [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MAP_EDITOR].includes(user.role as any)
  )

  let offerObj: any = null
  if (result) {
    offerObj = typeof (result as any).toObject === 'function' ? (result as any).toObject() : result
    const accessibleMapIds = await getAccessibleMapIds(user)
    const placeMapId = await resolveOfferMapIdAsync(offerObj)
    offerObj.isLocked = !isPremium && (!placeMapId || !accessibleMapIds.includes(placeMapId))
  }

  return offerObj
}

const deleteOffer = async (id: string): Promise<IOffer | null> => {
  const isExist = await Offer.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Offer not found')
  }
  const result = await Offer.findByIdAndDelete(id)
  return result
}

const calculateDiscount = async (id: string, price: number, authHeader?: string) => {
  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Valid price must be provided')
  }

  const [user, offer] = await Promise.all([
    getUserFromToken(authHeader),
    Offer.findById(id),
  ])

  if (!offer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Offer not found')
  }

  const isPremium = user && (
    [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MAP_EDITOR].includes(user.role as any)
  )

  if (!isPremium) {
    const accessibleMapIds = await getAccessibleMapIds(user)
    const placeMapId = await resolveOfferMapIdAsync(offer)
    if (!placeMapId || !accessibleMapIds.includes(placeMapId)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'This information and these benefits can be unlocked by purchasing your favorite map.',
      )
    }
  }

  let discountAmount = 0
  if (offer.discountType === DISCOUNT_TYPE.PERCENTAGE) {
    const percentage = Number(offer.discountValue)
    if (!isNaN(percentage)) discountAmount = (price * percentage) / 100
  } else if (offer.discountType === DISCOUNT_TYPE.FLAT) {
    const flat = Number(offer.discountValue)
    if (!isNaN(flat)) discountAmount = flat > price ? price : flat
  }

  const finalPrice = Math.max(0, price - discountAmount)
  return { originalPrice: price, discountAmount, finalPrice }
}

const redeemOffer = async (id: string, userId: string, authHeader?: string) => {
  const [user, offer] = await Promise.all([
    getUserFromToken(authHeader),
    Offer.findById(id),
  ])

  if (!offer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Offer not found')
  }

  const isPremium = user && (
    [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MAP_EDITOR].includes(user.role as any)
  )

  if (!isPremium) {
    const accessibleMapIds = await getAccessibleMapIds(user)
    const placeMapId = await resolveOfferMapIdAsync(offer)
    if (!placeMapId || !accessibleMapIds.includes(placeMapId)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'This information and these benefits can be unlocked by purchasing your favorite map.',
      )
    }
  }

  if (offer.status !== OFFER_STATUS.ACTIVE) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Offer is not active')
  }

  // Optional cap across every user
  if (
    offer.totalRedemptionLimit &&
    offer.redemptionsCount >= offer.totalRedemptionLimit
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Offer redemption limit reached',
    )
  }

  // maxRedemptions is per user, not global
  if (offer.maxRedemptions) {
    const userRedemptions = await OfferRedemption.countDocuments({
      user: userId,
      offer: id,
    })
    if (userRedemptions >= offer.maxRedemptions) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        offer.maxRedemptions === 1
          ? 'You have already redeemed this offer'
          : `You can redeem this offer only ${offer.maxRedemptions} times`,
      )
    }
  }

  // Check expiration date
  const now = new Date()
  if (offer.noExpiration !== true) {
    if (offer.validFrom && now < new Date(offer.validFrom)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Offer is not yet valid')
    }
    if (offer.validUntil && now > new Date(offer.validUntil)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Offer has expired')
    }
  }

  // Check if there is an active redemption (timer still running)
  const activeRedemption = await OfferRedemption.findOne({
    user: userId,
    offer: id,
    expiresAt: { $gt: new Date() },
  })

  if (activeRedemption) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have an active redemption for this offer',
    )
  }

  // Use redemptionDuration from offer model or default to 15
  const durationInMinutes = offer.redemptionDuration || 15
  const expiresAt = new Date(Date.now() + durationInMinutes * 60 * 1000)

  const redemption = await OfferRedemption.create({
    user: userId,
    offer: id,
    redemptionTime: new Date(),
    expiresAt,
  })

  // Increment redemption count
  await Offer.findByIdAndUpdate(id, { $inc: { redemptionsCount: 1 } })

  return redemption
}

export const OfferService = {
  createOffer,
  getAllOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
  calculateDiscount,
  redeemOffer,
  getOffersByPlaceOrBusinessId,
}
