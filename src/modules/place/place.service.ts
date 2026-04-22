import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IPlace } from './place.interface'
import { Place } from './place.model'
import QueryBuilder from '../../builder/QueryBuilder'
import { placeSearchableFields } from './place.constants'
import { Map } from '../map/map.model'
import mongoose from 'mongoose'
import { getCountryFromCoordinates } from '../../utils/reverseGeocoding'

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

const getAllPlaces = async (query: Record<string, unknown>) => {
  const placeQuery = new QueryBuilder(
    Place.find().populate('category').populate('map'),
    query
  )
    .search(placeSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields()

  const result = await placeQuery.modelQuery
  const meta = await placeQuery.getPaginationInfo()

  return {
    meta,
    data: result,
  }
}

const getPlaceById = async (id: string): Promise<IPlace | null> => {
  const result = await Place.findById(id).populate('category').populate('map')
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

    // Auto-populate country if coordinates are updated but country is not
    if (payload.location?.coordinates && !payload.country) {
      const [lng, lat] = payload.location.coordinates
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
  updatePlace,
  deletePlace,
}
