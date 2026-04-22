import { Request, Response } from 'express'
import { ReviewService } from './review.service'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { StatusCodes } from 'http-status-codes'
import { paginationFields } from '../../interfaces/pagination'
import pick from '../../shared/pick'
import { JwtPayload } from 'jsonwebtoken'

const createReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.createReview(req.user!, req.body)

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Review created successfully',
    data: result,
  })
})

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await ReviewService.updateReview(req.user!, id, req.body)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Review updated successfully',
    data: result,
  })
})

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const paginationOptions = pick(req.query, paginationFields)
  const result = await ReviewService.getAllReviews(paginationOptions)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    data: result,
  })
})

const getReviewsByPlace = catchAsync(async (req: Request, res: Response) => {
  const { placeId } = req.params
  const paginationOptions = pick(req.query, paginationFields)
  const result = await ReviewService.getReviewsByPlace(placeId, paginationOptions)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    data: result,
  })
})

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await ReviewService.deleteReview(req.user!, id)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Review deleted successfully',
    data: result,
  })
})

const getSingleReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await ReviewService.getSingleReview(id)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Review retrieved successfully',
    data: result,
  })
})

const getMyReviews = catchAsync(async (req: Request, res: Response) => {
  const paginationOptions = pick(req.query, paginationFields)
  const result = await ReviewService.getMyReviews(req.user!, paginationOptions)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'My reviews retrieved successfully',
    data: result,
  })
})

export const ReviewController = {
  createReview,
  updateReview,
  getAllReviews,
  deleteReview,
  getSingleReview,
  getReviewsByPlace,
  getMyReviews,
}
