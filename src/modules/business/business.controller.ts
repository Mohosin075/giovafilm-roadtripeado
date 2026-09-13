import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { BusinessService } from './business.service'
import { JwtPayload } from 'jsonwebtoken'
import { localizeDocument } from '../../helpers/localize'

const businessFields = [
  'name',
  'description',
  'category.name',
  'address',
  'accessDescription',
  'atmosphere',
  'location.address',
]

/**
 * Controller to handle business creation requests.
 */
const createBusiness = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload
  const result = await BusinessService.createBusiness(req.body, user?.authId)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Business submitted successfully and is pending approval',
    data: localizeDocument(result, req.lang, businessFields),
  })
})

/**
 * Controller to retrieve a paginated listing of all businesses.
 */
const getAllBusinesses = catchAsync(async (req: Request, res: Response) => {
  const result = await BusinessService.getAllBusinesses(req.query, req.headers.authorization)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Businesses retrieved successfully',
    meta: result.meta,
    data: localizeDocument(result.data, req.lang, businessFields),
  })
})

/**
 * Controller to retrieve a paginated listing of businesses owned by the user.
 */
const getMyBusinesses = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload
  const result = await BusinessService.getMyBusinesses(user.authId, req.query)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'My businesses retrieved successfully',
    meta: result.meta,
    data: localizeDocument(result.data, req.lang, businessFields),
  })
})

/**
 * Controller to retrieve single business detailed information by ID.
 */
const getBusinessById = catchAsync(async (req: Request, res: Response) => {
  const result = await BusinessService.getBusinessById(req.params.id, req.headers.authorization)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Business retrieved successfully',
    data: localizeDocument(result, req.lang, businessFields),
  })
})

/**
 * Controller to update a business submission.
 */
const updateBusiness = catchAsync(async (req: Request, res: Response) => {
  const result = await BusinessService.updateBusiness(req.params.id, req.body, req.user)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Business updated successfully',
    data: localizeDocument(result, req.lang, businessFields),
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
  const result = await BusinessService.deleteBusiness(req.params.id, req.user)
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
