import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { MapService } from './map.service'
import { JwtPayload } from 'jsonwebtoken'
import { localizeDocument } from '../../helpers/localize'

const mapFields = ['name', 'description']
const discoveryFields = [
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
]

const createMap = catchAsync(async (req: Request, res: Response) => {
  const result = await MapService.createMap(req.body)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Map created successfully',
    data: localizeDocument(result, req.lang, mapFields),
  })
})

const getAllMaps = catchAsync(async (req: Request, res: Response) => {
  const result = await MapService.getAllMaps(req.query, req.headers.authorization)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Maps retrieved successfully',
    meta: result.meta,
    data: localizeDocument(result.data, req.lang, mapFields),
  })
})

const getMapById = catchAsync(async (req: Request, res: Response) => {
  const result = await MapService.getMapById(req.params.id, req.headers.authorization)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Map retrieved successfully',
    data: localizeDocument(result, req.lang, mapFields),
  })
})

const updateMap = catchAsync(async (req: Request, res: Response) => {
  const result = await MapService.updateMap(req.params.id, req.body, req.user)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Map updated successfully',
    data: localizeDocument(result, req.lang, mapFields),
  })
})

const deleteMap = catchAsync(async (req: Request, res: Response) => {
  const result = await MapService.deleteMap(req.params.id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Map deleted successfully',
    data: localizeDocument(result, req.lang, mapFields),
  })
})

const purchaseMap = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload
  const result = await MapService.purchaseMap(user.authId, req.params.id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Map purchased successfully',
    data: result,
  })
})

const getPurchasedMaps = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload
  const result = await MapService.getPurchasedMaps(user.authId)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Purchased maps retrieved successfully',
    data: localizeDocument(result, req.lang, mapFields),
  })
})

const incrementViewCount = catchAsync(async (req: Request, res: Response) => {
  const result = await MapService.incrementViewCount(req.params.id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Map view recorded',
    data: { viewCount: (result as any).viewCount || 0 },
  })
})

const getAvailableCountries = catchAsync(async (req: Request, res: Response) => {
  const result = await MapService.getAvailableCountries()
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Available countries retrieved successfully',
    data: result,
  })
})

const getDiscoveryData = catchAsync(async (req: Request, res: Response) => {
  const result = await MapService.getDiscoveryData(req.query, req.headers.authorization)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Discovery data retrieved successfully',
    meta: result.meta,
    data: localizeDocument(result.data, req.lang, discoveryFields),
  })
})

export const MapController = {
  createMap,
  getAllMaps,
  getMapById,
  updateMap,
  deleteMap,
  purchaseMap,
  getPurchasedMaps,
  incrementViewCount,
  getAvailableCountries,
  getDiscoveryData,
}
