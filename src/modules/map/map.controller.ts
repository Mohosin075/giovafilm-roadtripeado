import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { MapService } from './map.service'
import { JwtPayload } from 'jsonwebtoken'

const createMap = catchAsync(async (req: Request, res: Response) => {
  const result = await MapService.createMap(req.body)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Map created successfully',
    data: result,
  })
})

const getAllMaps = catchAsync(async (req: Request, res: Response) => {
  const result = await MapService.getAllMaps(req.query)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Maps retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})

const getMapById = catchAsync(async (req: Request, res: Response) => {
  const result = await MapService.getMapById(req.params.id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Map retrieved successfully',
    data: result,
  })
})

const updateMap = catchAsync(async (req: Request, res: Response) => {
  const result = await MapService.updateMap(req.params.id, req.body)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Map updated successfully',
    data: result,
  })
})

const deleteMap = catchAsync(async (req: Request, res: Response) => {
  const result = await MapService.deleteMap(req.params.id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Map deleted successfully',
    data: result,
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
    data: result,
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
}
