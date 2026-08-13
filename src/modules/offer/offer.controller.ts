import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { OfferService } from './offer.service'
import ApiError from '../../errors/ApiError'

import { JwtPayload } from 'jsonwebtoken'

import {
  getUserFromToken,
  getAccessibleMapIds,
  verifyEditorEditAccess,
  verifyEditorBusinessAccess,
  buildCountryToMapIdLookup,
  resolveOfferMapId,
  resolveOfferMapIdAsync,
} from '../../helpers/mapAccessHelper'
import { Place } from '../place/place.model'
import { Business } from '../business/business.model'
import { USER_ROLES } from '../../enum/user'
import { OfferRedemption } from './offerRedemption.model'

/** Strip paid-only fields from locked list items; keep teaser fields for cards. */
const sanitizeLockedOffer = (offer: any) => {
  const {
    description,
    redemptionRules,
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

const createOffer = catchAsync(async (req: Request, res: Response) => {
  const { images, ...offerData } = req.body
  const user = await getUserFromToken(req.headers.authorization)

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

  const result = await OfferService.createOffer(offerData)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Offer created successfully',
    data: result,
  })
})

const getAllOffers = catchAsync(async (req: Request, res: Response) => {
  const authorizationHeader = req.headers.authorization

  // Run in parallel to avoid sequential DB round-trips
  const [user, result] = await Promise.all([
    getUserFromToken(authorizationHeader),
    OfferService.getAllOffers(req.query),
  ])

  const isPremium = user && (
    [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MAP_EDITOR].includes(user.role as any)
  )

  const accessibleMapIds = await getAccessibleMapIds(user)

  const countries = result.data
    .map((offer: any) => offer.business?.location?.country || offer.business?.country)
    .filter(Boolean)
  const countryLookup = await buildCountryToMapIdLookup(countries)

  const updatedData = result.data.map((offer: any) => {
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

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Offers retrieved successfully',
    meta: result.meta,
    data: updatedData,
  })
})

const getOfferById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const authorizationHeader = req.headers.authorization
  const user = await getUserFromToken(authorizationHeader)

  const isPremium = user && (
    [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MAP_EDITOR].includes(user.role as any)
  )

  let result: any = await OfferService.getOfferById(id)

  if (!isPremium && result) {
    const accessibleMapIds = await getAccessibleMapIds(user)
    const placeMapId = await resolveOfferMapIdAsync(result)
    if (!placeMapId || !accessibleMapIds.includes(placeMapId)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'This information and these benefits can be unlocked by purchasing your favorite map.'
      )
    }
  }

  if (result && user) {
    const activeRedemption = await OfferRedemption.findOne({
      user: user._id,
      offer: id,
      expiresAt: { $gt: new Date() },
    })

    const offerObj = typeof result.toObject === 'function' ? result.toObject() : result
    result = {
      ...offerObj,
      activeRedemption,
    }
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Offer retrieved successfully',
    data: result,
  })
})

const updateOffer = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const { images, ...offerData } = req.body
  const user = await getUserFromToken(req.headers.authorization)

  const existingOffer = await OfferService.getOfferById(id)
  if (!existingOffer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Offer not found')
  }

  // Verify access for Map Editors
  // getOfferById populates place/business — always resolve raw ids
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

  const result = await OfferService.updateOffer(id, offerData)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Offer updated successfully',
    data: result,
  })
})

const getOffersByPlaceOrBusinessId = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const authorizationHeader = req.headers.authorization
  const user = await getUserFromToken(authorizationHeader)

  const isPremium = user && (
    [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MAP_EDITOR].includes(user.role as any)
  )

  const result = await OfferService.getOffersByPlaceOrBusinessId(id)

  let offerObj: any = null
  if (result) {
    offerObj = typeof result.toObject === 'function' ? (result as any).toObject() : result
    const accessibleMapIds = await getAccessibleMapIds(user)
    const placeMapId = await resolveOfferMapIdAsync(offerObj)
    offerObj.isLocked = !isPremium && (!placeMapId || !accessibleMapIds.includes(placeMapId))
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Offers retrieved successfully',
    data: offerObj,
  })
})

const deleteOffer = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await OfferService.deleteOffer(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Offer deleted successfully',
    data: result,
  })
})

const calculateDiscount = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const { price } = req.body
  const authorizationHeader = req.headers.authorization
  const user = await getUserFromToken(authorizationHeader)

  const isPremium = user && (
    [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MAP_EDITOR].includes(user.role as any)
  )

  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Valid price must be provided')
  }

  const offer = await OfferService.getOfferById(id)
  if (!offer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Offer not found')
  }

  if (!isPremium) {
    const accessibleMapIds = await getAccessibleMapIds(user)
    const placeMapId = await resolveOfferMapIdAsync(offer)
    if (!placeMapId || !accessibleMapIds.includes(placeMapId)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'This information and these benefits can be unlocked by purchasing your favorite map.'
      )
    }
  }

  const result = await OfferService.calculateDiscount(id, Number(price))
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Discount calculated successfully',
    data: result,
  })
})

const redeemOffer = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const { authId } = req.user as JwtPayload
  const authorizationHeader = req.headers.authorization
  const user = await getUserFromToken(authorizationHeader)

  const isPremium = user && (
    [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MAP_EDITOR].includes(user.role as any)
  )

  const offer = await OfferService.getOfferById(id)
  if (!offer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Offer not found')
  }

  if (!isPremium) {
    const accessibleMapIds = await getAccessibleMapIds(user)
    const placeMapId = await resolveOfferMapIdAsync(offer)
    if (!placeMapId || !accessibleMapIds.includes(placeMapId)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'This information and these benefits can be unlocked by purchasing your favorite map.'
      )
    }
  }

  const result = await OfferService.redeemOffer(id, authId)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Offer redeemed successfully',
    data: result,
  })
})

export const OfferController = {
  createOffer,
  getAllOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
  calculateDiscount,
  redeemOffer,
  getOffersByPlaceOrBusinessId,
}
