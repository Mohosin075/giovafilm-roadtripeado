import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IPlace } from './place.interface'
import { Place } from './place.model'
import { Map } from '../map/map.model'
import { Category } from '../category/category.model'
import mongoose from 'mongoose'
import { getCountryFromCoordinates } from '../../utils/reverseGeocoding'

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toNumber = (value: unknown): number => {
  const parsed =
    typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : NaN
}

const createPlace = async (payload: IPlace): Promise<IPlace> => {
  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    // Auto-populate country if not provided
    if (!payload.country && payload.location?.coordinates) {
      const [lng, lat] = payload.location.coordinates
      // MongoDB stores [lng, lat], but Google API needs (lat, lng)
      const country = await getCountryFromCoordinates(lat, lng)
      console.log('country', country)
      if (country) {
        payload.country = country
      } else {
        payload.country = 'Unknown' // Fallback
      }
    }

    // Check if map exists
    const map = await Map.findById(payload.map).session(session)
    if (!map) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Map not found')
    }

    const result = await Place.create([payload], { session })
    const createdPlace = result[0]

    // Add place to map
    await Map.findByIdAndUpdate(
      payload.map,
      { 
        $push: { places: createdPlace._id },
        // If map doesn't have a country, set it from the place
        $set: { country: createdPlace.country } 
      },
      { session }
    )

    await session.commitTransaction()
    return createdPlace
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

const getAllPlaces = async (
  query: Record<string, unknown>
) => {
  const searchTerm =
    typeof query.searchTerm === 'string' ? query.searchTerm.trim() : ''
  const lat = toNumber(query.lat)
  const lng = toNumber(query.lng)
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng)
  const sort =
    typeof query.sort === 'string' && query.sort.trim()
      ? query.sort.trim()
      : '-createdAt'
  const limit = Number(query.limit) || 10
  const page = Number(query.page) || 1
  const skip = (page - 1) * limit

  const match: Record<string, unknown> = {}

  for (const key of ['status', 'map', 'country', 'category', 'type'] as const) {
    const value = query[key]
    if (typeof value === 'string' && value.trim() && value !== 'undefined') {
      match[key] = value.includes(',') ? { $in: value.split(',') } : value
    }
  }

  if (searchTerm) {
    const regex = new RegExp(escapeRegex(searchTerm), 'i')
    const matchingCategories = await Category.find({ name: regex })
      .select('_id')
      .lean()

    const or: Record<string, unknown>[] = [
      { name: regex },
      { address: regex },
      { country: regex },
    ]

    if (matchingCategories.length > 0) {
      or.push({ category: { $in: matchingCategories.map(c => c._id) } })
    }

    match.$or = or
  }

  const total = await Place.countDocuments(match)

  let findQuery = Place.find(
    hasGeo
      ? {
          ...match,
          location: {
            $nearSphere: {
              $geometry: { type: 'Point', coordinates: [lng, lat] },
            },
          },
        }
      : match,
  )
    .populate('category', 'name color icon status')
    .populate('map', 'name country status isPaid')
    .lean()

  if (!hasGeo) {
    findQuery = findQuery.sort(sort)
  }

  const data = await findQuery.skip(skip).limit(limit)

  return {
    meta: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit) || 0,
    },
    data,
  }
}

const getPlaceById = async (id: string): Promise<IPlace | null> => {
  const result = await Place.findById(id).populate('category').populate('map')
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
  }
  return result
}

const incrementOpenCount = async (id: string) => {
  const result = await Place.findByIdAndUpdate(
    id,
    { $inc: { openCount: 1 } },
    { new: true },
  ).select('name openCount')
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
  }
  return result
}

const updatePlace = async (
  id: string,
  payload: Partial<IPlace>,
): Promise<IPlace | null> => {
  const isExist = await Place.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
  }

  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    const nextCoords = payload.location?.coordinates
    const prevCoords = isExist.location?.coordinates
    const COORD_EPSILON = 1e-6
    const coordsChanged =
      !!nextCoords &&
      (!prevCoords ||
        Math.abs(nextCoords[0] - prevCoords[0]) > COORD_EPSILON ||
        Math.abs(nextCoords[1] - prevCoords[1]) > COORD_EPSILON)

    // Only hit Google when the pin actually moved
    if (coordsChanged && !payload.country) {
      const [lng, lat] = nextCoords
      const country = await getCountryFromCoordinates(lat, lng)
      if (country) {
        payload.country = country
      }
    }

    // Handle map change
    if (payload.map && payload.map.toString() !== isExist.map.toString()) {
      // Remove from old map
      await Map.findByIdAndUpdate(
        isExist.map,
        { $pull: { places: isExist._id } },
        { session }
      )
      // Add to new map
      await Map.findByIdAndUpdate(
        payload.map,
        { $push: { places: isExist._id } },
        { session }
      )
    }

    const nextMedia = Array.isArray(payload.media)
      ? payload.media.filter(Boolean)
      : undefined
    if (nextMedia) {
      payload.media = nextMedia.length > 0 ? nextMedia : isExist.media
    }

    const nextMenu = Array.isArray(payload.menuImages)
      ? payload.menuImages.filter(Boolean)
      : undefined
    if (nextMenu) {
      payload.menuImages = nextMenu.length > 0 ? nextMenu : isExist.menuImages
    }

    const result = await Place.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
      session,
    })
      .populate('category')
      .populate('map')

    await session.commitTransaction()
    return result
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

const deletePlace = async (id: string): Promise<IPlace | null> => {
  const isExist = await Place.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
  }

  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    const result = await Place.findByIdAndDelete(id).session(session)

    // Remove place from map
    if (result && result.map) {
      await Map.findByIdAndUpdate(
        result.map,
        { $pull: { places: result._id } },
        { session }
      )
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

export const PlaceService = {
  createPlace,
  getAllPlaces,
  getPlaceById,
  incrementOpenCount,
  updatePlace,
  deletePlace,
}
