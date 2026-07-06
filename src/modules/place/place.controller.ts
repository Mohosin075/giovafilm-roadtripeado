import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { PlaceService } from './place.service'
import { getUserFromToken, getAccessibleMapIds } from '../../helpers/mapAccessHelper'
import { Map } from '../map/map.model'
import ApiError from '../../errors/ApiError'
import { getCoordinatesFromUrl } from '../../utils/mapHelper'

const createPlace = catchAsync(async (req: Request, res: Response) => {
  if (req.body.images) {
    req.body.media = req.body.images
  }
  const result = await PlaceService.createPlace(req.body)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Place created successfully',
    data: result,
  })
})

const getAllPlaces = catchAsync(async (req: Request, res: Response) => {
  const authorizationHeader = req.headers.authorization
  const user = await getUserFromToken(authorizationHeader)
  const accessibleMapIds = await getAccessibleMapIds(user)

  // Find all paid map IDs
  const paidMaps = await Map.find({ isPaid: true }, '_id')
  const paidMapIds = paidMaps.map(m => m._id.toString())

  // Compute locked maps
  const lockedMapIds = paidMapIds.filter(id => !accessibleMapIds.includes(id))

  const result = await PlaceService.getAllPlaces(req.query, lockedMapIds)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Places retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})

const getPlaceById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await PlaceService.getPlaceById(id)
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
  }

  const authorizationHeader = req.headers.authorization
  const user = await getUserFromToken(authorizationHeader)
  const accessibleMapIds = await getAccessibleMapIds(user)

  const mapId = result.map?._id || result.map
  if (mapId) {
    const isLocked = !accessibleMapIds.includes(mapId.toString())
    if (isLocked) {
      if (result.type !== 'Business') {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          'You must purchase the map to access this location'
        )
      }
    }
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Place retrieved successfully',
    data: result,
  })
})

const updatePlace = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  if (req.body.images) {
    req.body.media = req.body.images
  }
  console.log(req.body)
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

const extractCoordinates = catchAsync(async (req: Request, res: Response) => {
  const { url } = req.body
  if (!url) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Google Maps URL is required')
  }

  const coordinates = await getCoordinatesFromUrl(url)
  if (!coordinates) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Could not extract coordinates. Try using the full URL from your browser address bar.'
    )
  }

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
  extractCoordinates,
}
