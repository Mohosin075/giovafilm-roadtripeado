import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { OfferService } from './offer.service'

const createOffer = catchAsync(async (req: Request, res: Response) => {
  const result = await OfferService.createOffer(req.body)
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
  const result = await OfferService.updateOffer(id, req.body)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Offer updated successfully',
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

export const OfferController = {
  createOffer,
  getAllOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
}
