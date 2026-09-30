import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { LevelConfigServices } from './levelConfig.service'
import { localizeDocument } from '../../helpers/localize'

const levelFields = ['name', 'description']

const getAllLevelConfigs = catchAsync(async (req: Request, res: Response) => {
  const result = await LevelConfigServices.getAllLevelConfigs()
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Level configurations retrieved successfully',
    data: localizeDocument(result, req.lang, levelFields),
  })
})

const updateLevelConfig = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  if (req.body.icon) {
    req.body.badgeUrl = req.body.icon
  }
  const result = await LevelConfigServices.updateLevelConfig(id, req.body)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Level configuration updated successfully',
    data: localizeDocument(result, req.lang, levelFields),
  })
})

const createLevelConfig = catchAsync(async (req: Request, res: Response) => {
  if (req.body.icon) {
    req.body.badgeUrl = req.body.icon
  }
  const result = await LevelConfigServices.createLevelConfig(req.body)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Level configuration created successfully',
    data: localizeDocument(result, req.lang, levelFields),
  })
})

const deleteLevelConfig = catchAsync(async (req: Request, res: Response) => {
  const result = await LevelConfigServices.deleteLevelConfig(req.params.id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Level configuration deleted successfully',
    data: result,
  })
})

export const LevelConfigController = {
  getAllLevelConfigs,
  updateLevelConfig,
  createLevelConfig,
  deleteLevelConfig,
}
