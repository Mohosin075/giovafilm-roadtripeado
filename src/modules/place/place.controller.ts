import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { PlaceService } from './place.service'

const createPlace = catchAsync(async (req: Request, res: Response) => {
  const result = await PlaceService.createPlace(req.body)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Place created successfully',
    data: result,
  })
})

const getAllPlaces = catchAsync(async (req: Request, res: Response) => {
  const result = await PlaceService.getAllPlaces()
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Places retrieved successfully',
    data: result,
  })
})

const getPlaceById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await PlaceService.getPlaceById(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Place retrieved successfully',
    data: result,
  })
})

const updatePlace = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await PlaceService.updatePlace(id, req.body)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Place updated successfully',
    data: result,
  })
})

const deletePlace = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await PlaceService.deletePlace(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Place deleted successfully',
    data: result,
  })
})

export const PlaceController = {
  createPlace,
  getAllPlaces,
  getPlaceById,
  updatePlace,
  deletePlace,
}
