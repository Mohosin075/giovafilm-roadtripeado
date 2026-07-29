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
import { getUserFromToken, getAccessibleMapIds, verifyEditorEditAccess } from '../../helpers/mapAccessHelper'
import { Map } from './map.model'
import ApiError from '../../errors/ApiError'

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
  const authorizationHeader = req.headers.authorization
  const user = await getUserFromToken(authorizationHeader)
  const accessibleMapIds = await getAccessibleMapIds(user)

  const isAdmin = user && (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN)

  const query = { ...req.query }
  if (!isAdmin) {
    query.isActive = 'true'
  }

  const result = await MapService.getAllMaps(query)

  // Tag each map with isLocked (places are NOT populated in list view for performance)
  const data = result.data.map((map: any) => {
    const mapObj = typeof map.toObject === 'function' ? map.toObject() : map
    const isLockedMap = !accessibleMapIds.includes(mapObj._id.toString())
    mapObj.isLocked = isLockedMap
    return mapObj
  })

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Maps retrieved successfully',
    meta: result.meta,
    data,
  })
})

const getMapById = catchAsync(async (req: Request, res: Response) => {
  const authorizationHeader = req.headers.authorization
  const user = await getUserFromToken(authorizationHeader)
  const accessibleMapIds = await getAccessibleMapIds(user)

  const result = await MapService.getMapById(req.params.id)
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Map not found')
  }

  const mapObj = typeof result.toObject === 'function' ? (result as any).toObject() : result
  const isLockedMap = !accessibleMapIds.includes(mapObj._id.toString())
  mapObj.places = (mapObj.places || []).map((place: any) => {
    const isPlaceLocked = isLockedMap && place.type !== 'Business'
    return {
      ...place,
      isLocked: isPlaceLocked,
    }
  })

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Map retrieved successfully',
    data: mapObj,
  })
})

const updateMap = catchAsync(async (req: Request, res: Response) => {
  const user = await getUserFromToken(req.headers.authorization)
  const mapId = req.params.id
  
  await verifyEditorEditAccess(user, mapId)

  const result = await MapService.updateMap(mapId, req.body)
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

const getDiscoveryData = catchAsync(async (req: Request, res: Response) => {
  const authorizationHeader = req.headers.authorization
  const user = await getUserFromToken(authorizationHeader)

  // Run accessible map IDs and paid maps lookup in parallel
  const [accessibleMapIds, paidMaps] = await Promise.all([
    getAccessibleMapIds(user),
    Map.find({ isPaid: true }, '_id'),
  ])

  const paidMapIds = paidMaps.map(m => m._id.toString())
  const lockedMapIds = paidMapIds.filter(id => !accessibleMapIds.includes(id))

  const result = await MapService.getDiscoveryData(req.query, lockedMapIds)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Discovery data retrieved successfully',
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
  getDiscoveryData,
}
