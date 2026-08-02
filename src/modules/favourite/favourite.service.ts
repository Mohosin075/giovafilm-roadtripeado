import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IFavourite } from './favourite.interface'
import { Favourite } from './favourite.model'
import { Map } from '../map/map.model'
import { Place } from '../place/place.model'
import { Offer } from '../offer/offer.model'
import { Business } from '../business/business.model'
import { User } from '../user/user.model'
import mongoose from 'mongoose'

const toggleFavourite = async (
  userId: string,
  payload: Partial<IFavourite>,
): Promise<IFavourite | null> => {
  const { type, map, place, offer, business } = payload
  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    if (type === 'Map' && map) {
      const isMapExist = await Map.findById(map).session(session)
      if (!isMapExist) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Map not found')
      }

      const isFavouriteExist = await Favourite.findOne({ user: userId, map }).session(session)
      if (isFavouriteExist) {
        await Favourite.findOneAndDelete({ user: userId, map }).session(session)
        await User.findByIdAndUpdate(userId, { $pull: { favoriteMaps: map } }).session(session)
        await session.commitTransaction()
        return null
      } else {
        const result = await Favourite.create([{ user: userId, map, type }], { session })
        await User.findByIdAndUpdate(userId, { $addToSet: { favoriteMaps: map } }).session(session)
        await session.commitTransaction()
        return result[0]
      }
    } else if (type === 'Place' && place) {
      const isPlaceExist = await Place.findById(place).session(session)
      if (!isPlaceExist) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
      }

      const isFavouriteExist = await Favourite.findOne({ user: userId, place }).session(session)
      if (isFavouriteExist) {
        await Favourite.findOneAndDelete({ user: userId, place }).session(session)
        await User.findByIdAndUpdate(userId, { $pull: { favoritePlaces: place } }).session(session)
        await session.commitTransaction()
        return null
      } else {
        const result = await Favourite.create([{ user: userId, place, type }], { session })
        await User.findByIdAndUpdate(userId, { $addToSet: { favoritePlaces: place } }).session(session)
        await session.commitTransaction()
        return result[0]
      }
    } else if (type === 'Offer' && offer) {
      const isOfferExist = await Offer.findById(offer).session(session)
      if (!isOfferExist) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Offer not found')
      }

      const isFavouriteExist = await Favourite.findOne({ user: userId, offer }).session(session)
      if (isFavouriteExist) {
        await Favourite.findOneAndDelete({ user: userId, offer }).session(session)
        await User.findByIdAndUpdate(userId, { $pull: { favoriteOffers: offer } }).session(session)
        await session.commitTransaction()
        return null
      } else {
        const result = await Favourite.create([{ user: userId, offer, type }], { session })
        await User.findByIdAndUpdate(userId, { $addToSet: { favoriteOffers: offer } }).session(session)
        await session.commitTransaction()
        return result[0]
      }
    } else if (type === 'Business' && business) {
      const isBusinessExist = await Business.findById(business).session(session)
      if (!isBusinessExist) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
      }

      const isFavouriteExist = await Favourite.findOne({
        user: userId,
        business,
      }).session(session)
      if (isFavouriteExist) {
        await Favourite.findOneAndDelete({ user: userId, business }).session(
          session,
        )
        await User.findByIdAndUpdate(userId, {
          $pull: { favoriteBusinesses: business },
        }).session(session)
        await session.commitTransaction()
        return null
      } else {
        const result = await Favourite.create(
          [{ user: userId, business, type }],
          { session },
        )
        await User.findByIdAndUpdate(userId, {
          $addToSet: { favoriteBusinesses: business },
        }).session(session)
        await session.commitTransaction()
        return result[0]
      }
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid payload')
    }
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

const getMyFavourites = async (userId: string, query: Record<string, unknown>) => {
  const { page = 1, limit = 10, sort = '-createdAt', ...filterData } = query
  const skip = (Number(page) - 1) * Number(limit)

  const sortStr = sort as string
  const sortOrder = sortStr.startsWith('-') ? -1 : 1
  const sortField = sortStr.replace(/^-/, '')

  const matchStage: Record<string, unknown> = {
    user: new mongoose.Types.ObjectId(userId),
    ...filterData,
  }

  // Paginate first, then lookup only the page of docs (list fields only)
  const pipeline: any[] = [
    { $match: matchStage },
    { $sort: { [sortField]: sortOrder } },
    { $skip: skip },
    { $limit: Number(limit) },
    {
      $lookup: {
        from: 'maps',
        localField: 'map',
        foreignField: '_id',
        pipeline: [
          { $project: { name: 1, description: 1, images: 1 } },
        ],
        as: 'map',
      },
    },
    { $unwind: { path: '$map', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'places',
        localField: 'place',
        foreignField: '_id',
        pipeline: [
          { $project: { name: 1, description: 1, media: 1 } },
        ],
        as: 'place',
      },
    },
    { $unwind: { path: '$place', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'offers',
        localField: 'offer',
        foreignField: '_id',
        pipeline: [
          { $project: { title: 1, name: 1, description: 1, image: 1, media: 1 } },
        ],
        as: 'offer',
      },
    },
    { $unwind: { path: '$offer', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'businesses',
        localField: 'business',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              name: 1,
              description: 1,
              'media.photos': 1,
            },
          },
        ],
        as: 'business',
      },
    },
    { $unwind: { path: '$business', preserveNullAndEmptyArrays: true } },
  ]

  const [data, total] = await Promise.all([
    Favourite.aggregate(pipeline),
    Favourite.countDocuments(matchStage),
  ])
  const totalPage = Math.ceil(total / Number(limit))

  return {
    meta: {
      total,
      limit: Number(limit),
      page: Number(page),
      totalPage,
    },
    data,
  }
}

const removeFavourite = async (id: string, userId: string): Promise<IFavourite | null> => {
  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    const result = await Favourite.findOneAndDelete({ _id: id, user: userId }).session(session)
    if (!result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Favourite not found')
    }

    if (result.type === 'Map' && result.map) {
      await User.findByIdAndUpdate(userId, { $pull: { favoriteMaps: result.map } }).session(session)
    } else if (result.type === 'Place' && result.place) {
      await User.findByIdAndUpdate(userId, { $pull: { favoritePlaces: result.place } }).session(session)
    } else if (result.type === 'Offer' && result.offer) {
      await User.findByIdAndUpdate(userId, { $pull: { favoriteOffers: result.offer } }).session(session)
    } else if (result.type === 'Business' && result.business) {
      await User.findByIdAndUpdate(userId, {
        $pull: { favoriteBusinesses: result.business },
      }).session(session)
    }

    await session.commitTransaction()
    return result
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export const FavouriteService = {
  toggleFavourite,
  getMyFavourites,
  removeFavourite,
}
