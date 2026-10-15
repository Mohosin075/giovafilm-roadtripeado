import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { RoutePlanService } from './route-plan.service'
import { JwtPayload } from 'jsonwebtoken'
import { localizeDocument } from '../../helpers/localize'

const routeFields = [
  'stops.place.name',
  'stops.place.description',
  'stops.place.access',
  'stops.place.entryCost',
  'stops.place.category.name',
  'stops.business.name',
  'stops.business.description',
  'stops.business.category.name',
]

const getAuthUserId = (req: Request): string => {
  const user = req.user as JwtPayload
  return (user?.authId || user?.id || user?._id || '') as string
}

const createRoutePlan = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthUserId(req)
  const result = await RoutePlanService.createRoutePlan(userId, req.body)

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Route plan created successfully',
    data: localizeDocument(result, req.lang, routeFields),
  })
})

const getMyRoutePlans = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthUserId(req)
  const result = await RoutePlanService.getMyRoutePlans(userId, req.query)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Route plans retrieved successfully',
    meta: result.meta,
    data: localizeDocument(result.data, req.lang, routeFields),
  })
})

const getRoutePlanById = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload
  const userId = getAuthUserId(req)
  const userRole = user?.role
  const { id } = req.params
  const result = await RoutePlanService.getRoutePlanById(id, userId, userRole)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Route plan retrieved successfully',
    data: localizeDocument(result, req.lang, routeFields),
  })
})

const updateRoutePlan = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthUserId(req)
  const { id } = req.params
  const result = await RoutePlanService.updateRoutePlan(id, userId, req.body)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Route plan updated successfully',
    data: localizeDocument(result, req.lang, routeFields),
  })
})

const deleteRoutePlan = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthUserId(req)
  const { id } = req.params
  const result = await RoutePlanService.deleteRoutePlan(id, userId)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Route plan deleted successfully',
    data: result,
  })
})

const clearRouteStops = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthUserId(req)
  const { id } = req.params
  const result = await RoutePlanService.clearRouteStops(id, userId)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Route stops cleared successfully',
    data: result,
  })
})

const addStop = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthUserId(req)
  const { id } = req.params
  const result = await RoutePlanService.addStop(id, userId, req.body)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Stop added to route successfully',
    data: localizeDocument(result, req.lang, routeFields),
  })
})

const removeStop = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthUserId(req)
  const { id, stopId } = req.params
  const result = await RoutePlanService.removeStop(id, stopId, userId)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Stop removed from route successfully',
    data: localizeDocument(result, req.lang, routeFields),
  })
})

export const RoutePlanController = {
  createRoutePlan,
  getMyRoutePlans,
  getRoutePlanById,
  updateRoutePlan,
  deleteRoutePlan,
  clearRouteStops,
  addStop,
  removeStop,
}
