import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { BusinessService } from './business.service'
import { JwtPayload } from 'jsonwebtoken'

const createBusiness = catchAsync(async (req: Request, res: Response) => {
  // Grab the user from the auth token
  const user = req.user as JwtPayload
  const businessData = {
    ...req.body,
    user: user?.authId,
  }

  const result = await BusinessService.createBusiness(businessData)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Business created successfully and is pending approval',
    data: result,
  })
})

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

const updateBusiness = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await BusinessService.updateBusiness(id, req.body)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Business updated successfully',
    data: result,
  })
})

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
