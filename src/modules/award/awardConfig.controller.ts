import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { AwardConfigServices } from './awardConfig.service'

const getAllAwardConfigs = catchAsync(async (req: Request, res: Response) => {
  const result = await AwardConfigServices.getAllAwardConfigs()
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Award configurations retrieved successfully',
    data: result,
  })
})

const updateAwardConfig = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params

  // Process uploaded files if present
  if (req.body.icon) {
    req.body.coverPhoto = req.body.icon
  }
  if (req.body.documents) {
    // If documents is an array, take the first item, otherwise use it directly
    req.body.fileUrl = Array.isArray(req.body.documents)
      ? req.body.documents[0]
      : req.body.documents
  }

  const result = await AwardConfigServices.updateAwardConfig(id, req.body)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Award configuration updated successfully',
    data: result,
  })
})

const createAwardConfig = catchAsync(async (req: Request, res: Response) => {
  if (req.body.icon) {
    req.body.coverPhoto = req.body.icon
  }
  if (req.body.documents) {
    req.body.fileUrl = Array.isArray(req.body.documents)
      ? req.body.documents[0]
      : req.body.documents
  }
  const result = await AwardConfigServices.createAwardConfig(req.body)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Award configuration created successfully',
    data: result,
  })
})

const deleteAwardConfig = catchAsync(async (req: Request, res: Response) => {
  const result = await AwardConfigServices.deleteAwardConfig(req.params.id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Award configuration deleted successfully',
    data: result,
  })
})

export const AwardConfigController = {
  getAllAwardConfigs,
  updateAwardConfig,
  createAwardConfig,
  deleteAwardConfig,
}
