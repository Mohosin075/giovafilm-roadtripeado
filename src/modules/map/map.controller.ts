import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { MapService } from './map.service'
import { JwtPayload } from 'jsonwebtoken'
import { jwtHelper } from '../../helpers/jwtHelper'
import config from '../../config'
import { Secret } from 'jsonwebtoken'
import { USER_ROLES } from '../../enum/user'

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
  const tokenWithBearer = req.headers.authorization
  let isAdmin = false

  if (tokenWithBearer && tokenWithBearer.startsWith('Bearer')) {
    const token = tokenWithBearer.split(' ')[1]
    try {
      const verifyUser = jwtHelper.verifyToken(
        token,
        config.jwt.jwt_secret as Secret,
      ) as JwtPayload
      if (
        verifyUser.role === USER_ROLES.ADMIN ||
        verifyUser.role === USER_ROLES.SUPER_ADMIN
      ) {
        isAdmin = true
      }
    } catch (error) {
      // Ignore token verification errors for public route
    }
  }

  const query = { ...req.query }
  if (!isAdmin) {
    query.isActive = true
  }

  const result = await MapService.getAllMaps(query)
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

const getAvailableCountries = catchAsync(async (req: Request, res: Response) => {
  const result = await MapService.getAvailableCountries()
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Available countries retrieved successfully',
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
  getAvailableCountries,
}
