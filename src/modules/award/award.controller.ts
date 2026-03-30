import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { AwardServices } from './award.service'
import { JwtPayload } from 'jsonwebtoken'

const getMyAwards = catchAsync(async (req: Request, res: Response) => {
  const { authId } = req.user as JwtPayload
  const result = await AwardServices.getMyAwards(authId)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User awards retrieved successfully',
    data: result,
  })
})

export const AwardController = {
  getMyAwards,
}
