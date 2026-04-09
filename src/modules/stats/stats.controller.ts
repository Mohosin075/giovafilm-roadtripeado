import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { StatsService } from './stats.service'

const getDashboardData = catchAsync(async (req: Request, res: Response) => {
  const result = await StatsService.getDashboardData()

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Dashboard data fetched successfully',
    data: result,
  })
})

const getReportsData = catchAsync(async (req: Request, res: Response) => {
  const result = await StatsService.getReportsData()

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Reports data fetched successfully',
    data: result,
  })
})

export const StatsController = {
  getDashboardData,
  getReportsData,
}
