import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { VisitedService } from './visited.service'
import { JwtPayload } from 'jsonwebtoken'
import { localizeDocument } from '../../helpers/localize'

const visitedFields = [
  'place.name',
  'place.description',
  'business.name',
  'business.description',
]

const toggleVisited = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).authId
  const result = await VisitedService.toggleVisited(userId, req.body)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.isVisited
      ? 'Place marked as visited successfully'
      : 'Place unmarked as visited successfully',
    data: result,
  })
})

const getMyVisitedPlaces = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).authId
  const result = await VisitedService.getMyVisitedPlaces(userId, req.query)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Visited places retrieved successfully',
    meta: result.meta,
    data: localizeDocument(result.data, req.lang, visitedFields),
  })
})

const getVisitedCount = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).authId
  const result = await VisitedService.getVisitedCount(userId)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Visited count retrieved successfully',
    data: result,
  })
})

const removeVisited = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = (req.user as JwtPayload).authId
  const result = await VisitedService.removeVisited(id, userId)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Visited record removed successfully',
    data: result,
  })
})

export const VisitedController = {
  toggleVisited,
  getMyVisitedPlaces,
  getVisitedCount,
  removeVisited,
}
