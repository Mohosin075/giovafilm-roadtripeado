import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IPlace } from './place.interface'
import { Place } from './place.model'
import { Map } from '../map/map.model'
import { Category } from '../category/category.model'
import mongoose from 'mongoose'
import { getCountryFromCoordinates } from '../../utils/reverseGeocoding'
import { Business } from '../business/business.model'

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toNumber = (value: unknown): number => {
  const parsed =
    typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : NaN
}

const createPlace = async (payload: IPlace): Promise<IPlace> => {
  // Auto-populate country if not provided (run before transaction/session to prevent locks)
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

  const session = await mongoose.startSession()
  try {
    session.startTransaction()

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

const getPlaceById = async (id: string): Promise<any | null> => {
  const result = await Place.findById(id).populate('category').populate('map')
  if (result) return result

  // Fallback to checking Business collection
  const business = await Business.findById(id).populate('category')
  if (business) {
    // Map Business fields to Place schema so frontend doesn't break
    return {
      ...business.toObject(),
      type: 'Business',
      placeType: 'Business',
      media: business.media?.photos || [],
      menuImages: business.media?.menu ? [business.media.menu] : [],
      address: business.location?.address || '',
      country: business.location?.country || '',
      location: {
        type: 'Point',
        coordinates: business.location?.mapLocation?.coordinates || [],
      },
      map: { name: business.location?.country },
    }
  }
  throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
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
): Promise<any | null> => {
  const isExist = await Place.findById(id)
  if (!isExist) {
    // Fallback: Check and update Business collection
    const isBusiness = await Business.findById(id)
    if (!isBusiness) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
    }

    // Map payload from Place structure back to Business schema format
    const businessPayload: any = {}
    if (payload.name) businessPayload.name = payload.name
    if (payload.category) businessPayload.category = payload.category
    if (payload.description) businessPayload.description = payload.description
    
    // Address & coordinates mapping
    if (payload.address || payload.location?.coordinates) {
      businessPayload.location = {
        ...(isBusiness.location || {}),
        ...(payload.address && { address: payload.address }),
        ...(payload.location?.coordinates && {
          mapLocation: {
            type: 'Point',
            coordinates: payload.location.coordinates,
          },
        }),
      }
    }

    // Media mapping
    if (payload.media) {
      businessPayload.media = {
        ...(isBusiness.media || {}),
        photos: payload.media,
      }
    }
    if (payload.menuImages && payload.menuImages.length > 0) {
      businessPayload.media = {
        ...(businessPayload.media || isBusiness.media || {}),
        menu: payload.menuImages[0], // Business schema holds a single string for menu
      }
    }

    // Phone, website, instagram
    if (payload.phone || payload.website || payload.instagram) {
      businessPayload.contact = {
        ...(isBusiness.contact || {}),
        ...(payload.phone && { phone: payload.phone }),
        ...(payload.website && { website: payload.website }),
        ...(payload.instagram && { instagram: payload.instagram }),
      }
    }

    // Hours / Schedule
    if (payload.operatingHours) {
      businessPayload.hours = {
        customHours: true,
        schedule: payload.operatingHours,
      }
    }

    const updatedBusiness = await Business.findByIdAndUpdate(id, businessPayload, {
      new: true,
      runValidators: true,
    }).populate('category')

    // Return mapped to Place schema format
    if (updatedBusiness) {
      return {
        ...updatedBusiness.toObject(),
        type: 'Business',
        placeType: 'Business',
        media: updatedBusiness.media?.photos || [],
        menuImages: updatedBusiness.media?.menu ? [updatedBusiness.media.menu] : [],
        address: updatedBusiness.location?.address || '',
        country: updatedBusiness.location?.country || '',
        location: {
          type: 'Point',
          coordinates: updatedBusiness.location?.mapLocation?.coordinates || [],
        },
        map: { name: updatedBusiness.location?.country },
      }
    }
    return null
  }

  const nextCoords = payload.location?.coordinates
  const prevCoords = isExist.location?.coordinates
  const COORD_EPSILON = 1e-6
  const coordsChanged =
    !!nextCoords &&
    (!prevCoords ||
      Math.abs(nextCoords[0] - prevCoords[0]) > COORD_EPSILON ||
      Math.abs(nextCoords[1] - prevCoords[1]) > COORD_EPSILON)

  // Only hit Google when the pin actually moved (run before transaction/session to prevent locks)
  if (coordsChanged && !payload.country) {
    const [lng, lat] = nextCoords
    const country = await getCountryFromCoordinates(lat, lng)
    if (country) {
      payload.country = country
    }
  }

  const session = await mongoose.startSession()
  try {
    session.startTransaction()

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

const deletePlace = async (id: string): Promise<any | null> => {
  const isExist = await Place.findById(id)
  if (!isExist) {
    const isBusiness = await Business.findById(id)
    if (!isBusiness) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
    }
    return await Business.findByIdAndDelete(id)
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
