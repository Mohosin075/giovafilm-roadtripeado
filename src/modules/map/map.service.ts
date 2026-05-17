import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IMap } from './map.interface'
import { Map } from './map.model'
import QueryBuilder from '../../builder/QueryBuilder'
import { User } from '../user/user.model'
import { Place } from '../place/place.model'
import { Business } from '../business/business.model'
import mongoose from 'mongoose'
import { mapSearchableFields } from './map.constants'
import { placeSearchableFields } from '../place/place.constants'
import { businessSearchableFields } from '../business/business.constants'

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
  console.log(payload, id)
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

const getAvailableCountries = async (): Promise<string[]> => {
  const result = await Place.distinct('country', { status: 'Published' })
  return result.filter((country): country is string => typeof country === 'string' && country !== 'Unknown')
}

const getDiscoveryData = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  
  // Prepare separate queries because Place and Business have different schemas
  const placeQueryObj = { ...query }
  const businessQueryObj = { ...query }

  // 1. Handle "map" filter (Only applicable for Places)
  if (businessQueryObj.map) {
    delete businessQueryObj.map
  }

  // 2. Handle "country" filter (Business uses location.country)
  if (businessQueryObj.country) {
    businessQueryObj['location.country'] = businessQueryObj.country
    delete businessQueryObj.country
  }

  // 3. Handle "status" default if not provided
  if (!placeQueryObj.status) placeQueryObj.status = 'Published'
  if (!businessQueryObj.status) businessQueryObj.status = 'Approved'

  // Use QueryBuilder for Places
  const placeQuery = new QueryBuilder(
    Place.find().populate('category').lean(),
    placeQueryObj
  )
    .search(placeSearchableFields)
    .filter()
    .sort()

  // Use QueryBuilder for Businesses
  const businessQuery = new QueryBuilder(
    Business.find().populate('category').lean(),
    businessQueryObj
  )
    .search(businessSearchableFields)
    .filter()
    .sort()

  // We fetch more items and then combine, sort, and paginate in memory 
  // to ensure consistent combined results.
  placeQuery.modelQuery.limit(100)
  businessQuery.modelQuery.limit(100)

  const [places, businesses] = await Promise.all([
    placeQuery.modelQuery,
    businessQuery.modelQuery,
  ])

  // Map to include type
  const formattedPlaces = places.map(place => ({
    ...(place as any),
    type: 'place',
  }))

  const formattedBusinesses = businesses.map(business => ({
    ...(business as any),
    type: 'business',
  }))

  // Combine results
  let result = [...formattedPlaces, ...formattedBusinesses]

  // If there's a searchTerm, we might want to sort by relevance or alphabetically
  if (query.searchTerm) {
    result.sort((a, b) => a.name.localeCompare(b.name))
  } else if (query.sort) {
    // Basic sorting on combined results if needed
    const isDesc = (query.sort as string).startsWith('-')
    const sortField = (query.sort as string).replace('-', '')
    
    result.sort((a: any, b: any) => {
      if (a[sortField] < b[sortField]) return isDesc ? 1 : -1
      if (a[sortField] > b[sortField]) return isDesc ? -1 : 1
      return 0
    })
  }

  // Apply pagination on the combined data
  const total = result.length
  const totalPage = Math.ceil(total / limit)
  const skip = (page - 1) * limit
  result = result.slice(skip, skip + limit)

  return {
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
    data: result,
  }
}

export const MapService = {
  createMap,
  getAllMaps,
  getMapById,
  updateMap,
  deleteMap,
  purchaseMap,
  getPurchasedMaps,
  getAvailableCountries,
  getDiscoveryData,
}
