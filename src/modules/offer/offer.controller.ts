import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { OfferService } from './offer.service'
import ApiError from '../../errors/ApiError'

import { JwtPayload } from 'jsonwebtoken'

const createOffer = catchAsync(async (req: Request, res: Response) => {
  const { images, ...offerData } = req.body

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
