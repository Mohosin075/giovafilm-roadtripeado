import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { FavouriteService } from './favourite.service'
import { JwtPayload } from 'jsonwebtoken'

const toggleFavourite = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).authId
  const result = await FavouriteService.toggleFavourite(userId, req.body)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result ? 'Added to favourites' : 'Removed from favourites',
    data: result,
  })
})

const getMyFavourites = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).authId
  const result = await FavouriteService.getMyFavourites(userId, req.query)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Favourites retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})

const removeFavourite = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = (req.user as JwtPayload).authId
  const result = await FavouriteService.removeFavourite(id, userId)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Favourite removed successfully',
    data: result,
  })
})

export const FavouriteController = {
  toggleFavourite,
  getMyFavourites,
  removeFavourite,
}
