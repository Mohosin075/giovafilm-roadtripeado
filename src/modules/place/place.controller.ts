import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { PlaceService } from './place.service'
import { localizeDocument } from '../../helpers/localize'

const placeFields = [
  'name',
  'description',
  'access',
  'entryCost',
  'difficulty',
  'hikeTime',
  'atmosphere',
  'services',
  'schedules',
  'accessibility.notes',
  'recommendations.tips',
  'category.name',
  'map.name',
  'map.description',
]

const createPlace = catchAsync(async (req: Request, res: Response) => {
  const result = await PlaceService.createPlace(req.body, req.user || req.headers.authorization)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Place created successfully',
    data: localizeDocument(result, req.lang, placeFields),
  })
})

const getAllPlaces = catchAsync(async (req: Request, res: Response) => {
  const result = await PlaceService.getAllPlaces(req.query, req.headers.authorization)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Places retrieved successfully',
    meta: result.meta,
    data: localizeDocument(result.data, req.lang, placeFields),
  })
})

const getPlaceById = catchAsync(async (req: Request, res: Response) => {
  const result = await PlaceService.getPlaceById(req.params.id, req.headers.authorization)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Place retrieved successfully',
    data: localizeDocument(result, req.lang, placeFields),
  })
})

const updatePlace = catchAsync(async (req: Request, res: Response) => {
  const result = await PlaceService.updatePlace(req.params.id, req.body, req.user || req.headers.authorization)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Place updated successfully',
    data: localizeDocument(result, req.lang, placeFields),
  })
})

const deletePlace = catchAsync(async (req: Request, res: Response) => {
  const result = await PlaceService.deletePlace(req.params.id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Place deleted successfully',
    data: result,
  })
})

const incrementOpenCount = catchAsync(async (req: Request, res: Response) => {
  const result = await PlaceService.incrementOpenCount(req.params.id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Place view count incremented successfully',
    data: result,
  })
})

const extractCoordinates = catchAsync(async (req: Request, res: Response) => {
  const { url } = req.body
  const coordinates = await PlaceService.extractCoordinates(url)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Coordinates extracted successfully',
    data: coordinates,
  })
})

export const PlaceController = {
  createPlace,
  getAllPlaces,
  getPlaceById,
  updatePlace,
  deletePlace,
  incrementOpenCount,
  extractCoordinates,
}
