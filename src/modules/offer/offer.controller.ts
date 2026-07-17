import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { OfferService } from './offer.service'
import ApiError from '../../errors/ApiError'

import { JwtPayload } from 'jsonwebtoken'

import { getUserFromToken, verifyEditorEditAccess } from '../../helpers/mapAccessHelper'
import { Place } from '../place/place.model'
import { Business } from '../business/business.model'
import { USER_ROLES } from '../../enum/user'

const createOffer = catchAsync(async (req: Request, res: Response) => {
  const { images, ...offerData } = req.body
  const user = await getUserFromToken(req.headers.authorization)

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
      const country = business.location?.country
      if (!user.assignedCountries?.includes(country)) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You are not authorized to edit offers for this business.')
      }
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
  const result = await OfferService.getAllOffers(req.query)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Offers retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})

const getOfferById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await OfferService.getOfferById(id)
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
  if (user && user.role === USER_ROLES.MAP_EDITOR) {
    // Check existing offer's place/business
    if (existingOffer.place) {
      const place = await Place.findById(existingOffer.place)
      if (place) {
        const mapId = place.map?._id || place.map
        if (mapId) {
          await verifyEditorEditAccess(user, mapId.toString())
        }
      }
    } else if (existingOffer.business) {
      const business = await Business.findById(existingOffer.business)
      if (business) {
        const country = business.location?.country
        if (!user.assignedCountries?.includes(country)) {
          throw new ApiError(StatusCodes.FORBIDDEN, 'You are not authorized to edit offers for this business.')
        }
      }
    }

    // Check new place/business if they are being updated
    if (offerData.place && offerData.place !== existingOffer.place?.toString()) {
      const place = await Place.findById(offerData.place)
      if (place) {
        const mapId = place.map?._id || place.map
        if (mapId) {
          await verifyEditorEditAccess(user, mapId.toString())
        }
      }
    } else if (offerData.business && offerData.business !== existingOffer.business?.toString()) {
      const business = await Business.findById(offerData.business)
      if (business) {
        const country = business.location?.country
        if (!user.assignedCountries?.includes(country)) {
          throw new ApiError(StatusCodes.FORBIDDEN, 'You are not authorized to assign offers to this business.')
        }
      }
    }
  }

  // Handle image upload from disk storage
  if (images) {
    offerData.photo = Array.isArray(images) ? images[0] : images
  }

  console.log(req.body)

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
  const result = await OfferService.getOffersByPlaceOrBusinessId(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Offers retrieved successfully',
    data: result,
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

  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Valid price must be provided')
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
