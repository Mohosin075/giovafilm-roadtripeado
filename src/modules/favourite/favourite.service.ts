import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IFavourite } from './favourite.interface'
import { Favourite } from './favourite.model'
import { Map } from '../map/map.model'
import { Place } from '../place/place.model'
import { User } from '../user/user.model'
import QueryBuilder from '../../builder/QueryBuilder'
import mongoose from 'mongoose'

const toggleFavourite = async (
  userId: string,
  payload: Partial<IFavourite>,
): Promise<IFavourite | null> => {
  const { type, map, place } = payload
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
  const favouriteQuery = new QueryBuilder(
    Favourite.find({ user: userId }).populate('map').populate('place'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields()

  const result = await favouriteQuery.modelQuery
  const meta = await favouriteQuery.getPaginationInfo()

  return {
    meta,
    data: result,
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
