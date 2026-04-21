import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IReview } from './review.interface'
import { Review } from './review.model'
import { JwtPayload } from 'jsonwebtoken'
import mongoose from 'mongoose'
import { User } from '../user/user.model'
import { Place } from '../place/place.model'
import { IPaginationOptions } from '../../interfaces/pagination'
import { paginationHelper } from '../../helpers/paginationHelper'

const createReview = async (user: JwtPayload, payload: IReview) => {
  payload.reviewer = user.authId as unknown as mongoose.Types.ObjectId

  const isUserExist = await User.findById(user.authId)
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  const isPlaceExist = await Place.findById(payload.placeId)
  if (!isPlaceExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
  }

  const session = await mongoose.startSession()
  try {
    session.startTransaction()
    const result = await Review.create([payload], { session })
    if (!result) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to create Review, please try again later.',
      )
    }

    // Calculate points: 10 points for review, 5 points per media/photo
    const pointsForReview = 10
    const pointsForMedia = (payload.media?.length || 0) * 5
    const totalPointsEarned = pointsForReview + pointsForMedia

    // Update user points and level
    const user = await User.findById(payload.reviewer)
    if (user) {
      const newPoints = (user.points || 0) + totalPointsEarned
      const newLevel = Math.floor(newPoints / 1000) + 1
      await User.findByIdAndUpdate(
        payload.reviewer,
        { $set: { points: newPoints, level: newLevel } },
        { session },
      )
    }

    // update the review count and rating of the place
    await Place.findByIdAndUpdate(
      payload.placeId,
      [
        {
          $set: {
            totalReview: { $add: [{ $ifNull: ['$totalReview', 0] }, 1] },
            rating: {
              $divide: [
                {
                  $add: [
                    {
                      $multiply: [
                        { $ifNull: ['$rating', 0] },
                        { $ifNull: ['$totalReview', 0] },
                      ],
                    },
                    payload.rating,
                  ],
                },
                { $add: [{ $ifNull: ['$totalReview', 0] }, 1] },
              ],
            },
          },
        },
      ],
      { session, new: true },
    )

    await session.commitTransaction()
    return result[0]
  } catch (error) {
    console.log({ error })
    await session.abortTransaction()
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create Review, please try again later.',
    )
  } finally {
    await session.endSession()
  }
}

const getAllReviews = async (
  paginationOptions: IPaginationOptions,
  filter: any = {},
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions)

  const [result, total] = await Promise.all([
    Review.find(filter)
      .populate('reviewer', 'name profile')
      .populate('placeId', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder }),
    Review.countDocuments(filter),
  ])

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  }
}

const getReviewsByPlace = async (
  placeId: string,
  paginationOptions: IPaginationOptions,
) => {
  return await getAllReviews(paginationOptions, { placeId })
}

const updateReview = async (
  user: JwtPayload,
  id: string,
  payload: Partial<IReview>,
) => {
  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    const existingReview = await Review.findById(id).session(session)

    if (!existingReview) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found.')
    }
    if (existingReview?.reviewer.toString() !== user.authId) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'You are not authorized to update this review.',
      )
    }

    const oldRating = existingReview.rating
    const newRating = payload.rating ?? oldRating

    // Update place rating if rating changed
    if (payload.rating !== undefined && oldRating !== newRating) {
      await Place.findByIdAndUpdate(
        existingReview.placeId,
        [
          {
            $set: {
              rating: {
                $cond: [
                  { $eq: ['$totalReview', 0] },
                  0,
                  {
                    $divide: [
                      {
                        $add: [
                          {
                            $subtract: [
                              { $multiply: ['$rating', '$totalReview'] },
                              oldRating,
                            ],
                          },
                          newRating,
                        ],
                      },
                      '$totalReview',
                    ],
                  },
                ],
              },
            },
          },
        ],
        { session, new: true },
      )
    }

    const result = await Review.findByIdAndUpdate(id, payload, {
      new: true,
      session,
    })

    await session.commitTransaction()
    return result
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    await session.endSession()
  }
}

const deleteReview = async (user: JwtPayload, id: string) => {
  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    const existingReview = await Review.findById(id).session(session)
    if (!existingReview) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found.')
    }

    if (
      user.role !== 'admin' &&
      user.role !== 'super_admin' &&
      existingReview.reviewer.toString() !== user.authId
    ) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'You are not authorized to delete this review.',
      )
    }

    const rating = existingReview.rating

    // Update place rating and review count
    await Place.findByIdAndUpdate(
      existingReview.placeId,
      [
        {
          $set: {
            rating: {
              $cond: [
                { $lte: ['$totalReview', 1] },
                0,
                {
                  $divide: [
                    {
                      $subtract: [
                        { $multiply: ['$rating', '$totalReview'] },
                        rating,
                      ],
                    },
                    { $subtract: ['$totalReview', 1] },
                  ],
                },
              ],
            },
            totalReview: {
              $cond: [
                { $lte: ['$totalReview', 1] },
                0,
                { $subtract: ['$totalReview', 1] },
              ],
            },
          },
        },
      ],
      { session, new: true },
    )

    const result = await Review.findByIdAndDelete(id, { session })

    await session.commitTransaction()
    return result
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    await session.endSession()
  }
}

const getSingleReview = async (id: string) => {
  const result = await Review.findById(id).populate('reviewer', 'name profile')
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found.')
  }
  return result
}

export const ReviewService = {
  createReview,
  getAllReviews,
  getReviewsByPlace,
  updateReview,
  deleteReview,
  getSingleReview,
}
