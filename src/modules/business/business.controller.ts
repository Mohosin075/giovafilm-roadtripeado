import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { BusinessService } from './business.service'
import { JwtPayload } from 'jsonwebtoken'

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
  const result = await BusinessService.getAllBusinesses(req.query)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Businesses retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})

/**
 * Controller to retrieve single business detailed information by ID.
 */
const getBusinessById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await BusinessService.getBusinessById(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Business retrieved successfully',
    data: result,
  })
})

/**
 * Controller to update a business submission.
 */
const updateBusiness = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const businessData = { ...req.body }

  // Handle image upload from disk storage
  if (req.body.images) {
    if (!businessData.media) businessData.media = {}
    businessData.media.photos = Array.isArray(req.body.images)
      ? req.body.images
      : [req.body.images]
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
  const result = await BusinessService.deleteBusiness(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Business deleted successfully',
    data: result,
  })
})

export const BusinessController = {
  createBusiness,
  getAllBusinesses,
  getBusinessById,
  updateBusiness,
  updateBusinessStatus,
  deleteBusiness,
}
