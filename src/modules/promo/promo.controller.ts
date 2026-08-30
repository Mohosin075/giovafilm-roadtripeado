import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { JwtPayload } from 'jsonwebtoken'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { PromoServices } from './promo.service'

const verifyPromoCode = catchAsync(async (req: Request, res: Response) => {
  const { code, mapId } = req.query as { code?: string; mapId?: string }
  if (!code) {
    return sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: 'Code query parameter is required',
    })
  }

  const result = await PromoServices.verifyPromoCode(code, mapId)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Promo link is valid',
    data: result,
  })
})

const claimFreePromo = catchAsync(async (req: Request, res: Response) => {
  const { code, mapId } = req.body
  const user = req.user as JwtPayload
  const userId = user?.authId // Get authenticated user ID from req.user
  if (!userId) {
    return sendResponse(res, {
      statusCode: StatusCodes.UNAUTHORIZED,
      success: false,
      message: 'User authentication credentials not found',
    })
  }

  const result = await PromoServices.claimFreePromo(userId, code, mapId)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
  })
})

const createPromoCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const { code, mapId } = req.body
    const user = req.user as JwtPayload
    if (!user) {
      return sendResponse(res, {
        statusCode: StatusCodes.UNAUTHORIZED,
        success: false,
        message: 'User credentials not found',
      })
    }

    const result = await PromoServices.createPromoCheckoutSession(
      user,
      code,
      mapId,
    )
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Promo checkout session created successfully',
      data: result,
    })
  },
)

const bulkGeneratePromoLinks = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PromoServices.bulkGeneratePromoLinks(req.body)
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: 'Promo links generated successfully',
      data: result,
    })
  },
)

const sendBulkPromoEmails = catchAsync(async (req: Request, res: Response) => {
  const { promoIds } = req.body
  const result = await PromoServices.sendBulkPromoEmails(promoIds)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
  })
})

const getAllPromoLinks = catchAsync(async (req: Request, res: Response) => {
  const result = await PromoServices.getAllPromoLinks(req.query)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Promo links retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})

export const PromoControllers = {
  verifyPromoCode,
  claimFreePromo,
  createPromoCheckoutSession,
  bulkGeneratePromoLinks,
  sendBulkPromoEmails,
  getAllPromoLinks,
}
