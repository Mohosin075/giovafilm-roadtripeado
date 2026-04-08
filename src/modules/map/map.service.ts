import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IMap } from './map.interface'
import { Map } from './map.model'
import QueryBuilder from '../../builder/QueryBuilder'
import { User } from '../user/user.model'
import { Place } from '../place/place.model'
import mongoose from 'mongoose'
import { mapSearchableFields } from './map.constants'

const createMap = async (payload: IMap): Promise<IMap> => {
  const result = await Map.create(payload)
  return result
}

const getAllMaps = async (query: Record<string, unknown>) => {
  let mapIds: mongoose.Types.ObjectId[] = []

  // If category filter is provided, find maps that contain places with those categories
  if (query.category) {
    const categoryIds = (query.category as string).split(',')
    const places = await Place.find({
      category: { $in: categoryIds },
    }).select('map')

    mapIds = places.map(place => place.map as unknown as mongoose.Types.ObjectId)
    
    // If no places found for these categories, we should return no maps
    if (mapIds.length === 0) {
      return {
        meta: {
          page: Number(query.page) || 1,
          limit: Number(query.limit) || 10,
          total: 0,
          totalPage: 0,
        },
        data: [],
      }
    }

    // Add map ID filtering to the query
    query._id = { $in: mapIds }
    delete query.category // Remove category from query as it's not a field in Map model
  }

  const mapQuery = new QueryBuilder(
    Map.find().populate({
      path: 'places',
      populate: { path: 'category' },
    }),
    query
  )
    .search(mapSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields()

  const result = await mapQuery.modelQuery
  const meta = await mapQuery.getPaginationInfo()

  return {
    meta,
    data: result,
  }
}

const getMapById = async (id: string): Promise<IMap | null> => {
  const result = await Map.findById(id).populate('places')
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Map not found')
  }
  return result
}

const updateMap = async (id: string, payload: Partial<IMap>): Promise<IMap | null> => {
  const isExist = await Map.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Map not found')
  }

  const result = await Map.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })
  return result
}

const deleteMap = async (id: string): Promise<IMap | null> => {
  const isExist = await Map.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Map not found')
  }

  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    // 1. Delete the Map
    const result = await Map.findByIdAndDelete(id).session(session)

    // 2. Delete all Places associated with this Map
    await Place.deleteMany({ map: id }).session(session)

    // 3. Remove this map from all users' purchased list
    await User.updateMany(
      { purchasedMaps: id },
      { $pull: { purchasedMaps: id } },
      { session }
    )

    await session.commitTransaction()
    return result
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

const purchaseMap = async (userId: string, mapId: string) => {
  const isMapExist = await Map.findById(mapId)
  if (!isMapExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Map not found')
  }

  const user = await User.findById(userId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  // Check if already purchased
  const alreadyPurchased = user.purchasedMaps?.some(
    id => id.toString() === mapId
  )
  if (alreadyPurchased) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Map already purchased')
  }

  const result = await User.findByIdAndUpdate(
    userId,
    { $push: { purchasedMaps: mapId } },
    { new: true }
  )

  return result
}

const getPurchasedMaps = async (userId: string) => {
  const user = await User.findById(userId).populate({
    path: 'purchasedMaps',
    populate: { path: 'places', populate: { path: 'category' } },
  })

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  return user.purchasedMaps || []
}

export const MapService = {
  createMap,
  getAllMaps,
  getMapById,
  updateMap,
  deleteMap,
  purchaseMap,
  getPurchasedMaps,
}
