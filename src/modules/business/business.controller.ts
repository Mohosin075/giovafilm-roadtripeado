import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { BusinessService } from './business.service'
import { JwtPayload } from 'jsonwebtoken'
import ApiError from '../../errors/ApiError'
import { USER_ROLES } from '../../enum/user'
import { getUserFromToken } from '../../helpers/mapAccessHelper'

const isAdminRole = (role?: string) =>
  !!role && [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(role as any)

const getBusinessOwnerId = (business: any): string | null => {
  if (!business?.user) return null
  return (business.user._id || business.user).toString()
}

const stripPrivateInfo = (business: any) => {
  if (!business) return business
  const obj =
    typeof business.toObject === 'function' ? business.toObject() : { ...business }
  delete obj.privateInfo
  return obj
}

/**
 * Controller to handle business creation requests.
 * Extracts user ID from the JWT payload and injects into business data.
 */
const createBusiness = catchAsync(async (req: Request, res: Response) => {
  // Grab the user from the auth token
  const user = req.user as JwtPayload
  const businessData = {
    ...req.body,
    user: user?.authId,
  }

  // Handle image upload from disk storage
  if (req.body.images) {
    if (!businessData.media) businessData.media = {}
    businessData.media.photos = Array.isArray(req.body.images)
      ? req.body.images
      : [req.body.images]
  }

  // Handle menu/document upload from disk storage
  if (req.body.documents) {
    if (!businessData.media) businessData.media = {}
    businessData.media.menu = Array.isArray(req.body.documents)
      ? req.body.documents[0]
      : req.body.documents
  }

  const result = await BusinessService.createBusiness(businessData)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Business created successfully and is pending approval',
    data: result,
  })
})

/**
 * Controller to retrieve a paginated listing of all businesses.
 */
const getAllBusinesses = catchAsync(async (req: Request, res: Response) => {
  const user = await getUserFromToken(req.headers.authorization)
  const result = await BusinessService.getAllBusinesses(req.query)

  const data = result.data.map((biz: any) => {
    const ownerId = getBusinessOwnerId(biz)
    const canSeePrivate =
      isAdminRole(user?.role) || (user && ownerId === user._id.toString())
    return canSeePrivate ? biz : stripPrivateInfo(biz)
  })

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Businesses retrieved successfully',
    meta: result.meta,
    data,
  })
})

/**
 * Controller to retrieve a paginated listing of businesses owned by the user.
 */
const getMyBusinesses = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload
  // Assuming the user's ID is at user.authId based on createBusiness
  const result = await BusinessService.getMyBusinesses(user.authId, req.query)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'My businesses retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})

/**
 * Controller to retrieve single business detailed information by ID.
 */
const getBusinessById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const user = await getUserFromToken(req.headers.authorization)
  const result = await BusinessService.getBusinessById(id)
  const ownerId = getBusinessOwnerId(result)
  const canSeePrivate =
    isAdminRole(user?.role) || (user && ownerId === user._id.toString())

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Business retrieved successfully',
    data: canSeePrivate ? result : stripPrivateInfo(result),
  })
})

/**
 * Controller to update a business submission.
 */
const updateBusiness = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const authUser = req.user as JwtPayload
  const existing = await BusinessService.getBusinessById(id)
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }

  const ownerId = getBusinessOwnerId(existing)
  const admin = isAdminRole(authUser?.role)
  if (!admin && ownerId !== authUser?.authId?.toString()) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to update this business',
    )
  }

  const businessData = { ...req.body }

  // Users cannot self-approve or toggle subscription
  if (!admin) {
    delete businessData.status
    delete businessData.hasActiveSubscription
  }

  // Handle image upload from disk storage
  if (req.body.images) {
    if (!businessData.media) businessData.media = {}
    businessData.media.photos = Array.isArray(req.body.images)
      ? req.body.images
      : [req.body.images]
  }

  // Handle menu/document upload from disk storage
  if (req.body.documents) {
    if (!businessData.media) businessData.media = {}
    businessData.media.menu = Array.isArray(req.body.documents)
      ? req.body.documents[0]
      : req.body.documents
  }

  const result = await BusinessService.updateBusiness(id, businessData)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Business updated successfully',
    data: result,
  })
})

/**
 * Controller strictly for administrative actions to alter the business status state machine.
 */
const updateBusinessStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const { status } = req.body
  const result = await BusinessService.updateBusinessStatus(id, status)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Business status updated to ${status} successfully`,
    data: result,
  })
})

/**
 * Controller to handle permanent deletion of a business.
 */
const deleteBusiness = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const authUser = req.user as JwtPayload
  const existing = await BusinessService.getBusinessById(id)
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }

  const ownerId = getBusinessOwnerId(existing)
  const admin = isAdminRole(authUser?.role)
  if (!admin && ownerId !== authUser?.authId?.toString()) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to delete this business',
    )
  }

  const result = await BusinessService.deleteBusiness(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Business deleted successfully',
    data: result,
  })
})

const getBusinessStats = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await BusinessService.getBusinessStats(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Business stats retrieved successfully',
    data: result,
  })
})

const incrementViewCount = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await BusinessService.incrementViewCount(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'View count incremented successfully',
    data: result,
  })
})

export const BusinessController = {
  createBusiness,
  getAllBusinesses,
  getMyBusinesses,
  getBusinessById,
  updateBusiness,
  updateBusinessStatus,
  deleteBusiness,
  getBusinessStats,
  incrementViewCount,
}
