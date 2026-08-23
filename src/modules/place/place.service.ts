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

  // 1. Fetch regular places if applicable
  const queryType = query.type as string | undefined
  const shouldQueryPlaces = !queryType || queryType === 'Regular' || queryType.includes('Regular')
  
  let places: any[] = []
  if (shouldQueryPlaces) {
    let placeQuery = Place.find(
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
      placeQuery = placeQuery.sort(sort)
    }

    places = await placeQuery
  }

  const formattedPlaces = places.map(p => ({
    ...p,
    _id: p._id.toString(),
  }))

  // 2. Fetch businesses if applicable
  const shouldQueryBusinesses = !queryType || queryType === 'Business' || queryType.includes('Business')
  let formattedBusinesses: any[] = []

  if (shouldQueryBusinesses) {
    const businessMatch: Record<string, any> = {}

    if (match.category) {
      businessMatch.category = match.category
    }

    if (match.country) {
      businessMatch['location.country'] = match.country
    } else if (match.map) {
      if (typeof match.map === 'object' && match.map !== null && '$in' in match.map) {
        const mapObjs = await Map.find({ _id: match.map }).select('name country').lean()
        businessMatch['location.country'] = { $in: mapObjs.map(m => m.country || m.name) }
      } else {
        const mapObj = await Map.findById(match.map).select('name country').lean()
        if (mapObj) {
          businessMatch['location.country'] = mapObj.country || mapObj.name
        }
      }
    }

    if (match.status) {
      if (typeof match.status === 'object' && match.status !== null && '$in' in match.status) {
        const statusObj = match.status as any
        const statuses = statusObj.$in.map((s: string) => {
          if (s === 'Published') return 'Approved'
          if (s === 'Draft') return 'Pending'
          return s
        })
        businessMatch.status = { $in: statuses }
      } else {
        const statusStr = match.status as string
        if (statusStr === 'Published') {
          businessMatch.status = 'Approved'
        } else if (statusStr === 'Draft') {
          businessMatch.status = 'Pending'
        } else {
          businessMatch.status = statusStr
        }
      }
    }

    if (searchTerm) {
      const regex = new RegExp(escapeRegex(searchTerm), 'i')
      const matchingCategories = await Category.find({ name: regex })
        .select('_id')
        .lean()

      const or: Record<string, unknown>[] = [
        { name: regex },
        { 'location.address': regex },
        { 'location.country': regex },
      ]

      if (matchingCategories.length > 0) {
        or.push({ category: { $in: matchingCategories.map(c => c._id) } })
      }

      businessMatch.$or = or
    }

    let businessQuery = Business.find(
      hasGeo
        ? {
            ...businessMatch,
            'location.mapLocation': {
              $nearSphere: {
                $geometry: { type: 'Point', coordinates: [lng, lat] },
              },
            },
          }
        : businessMatch,
    )
      .populate('category', 'name color icon status')
      .lean()

    if (!hasGeo) {
      businessQuery = businessQuery.sort(sort)
    }

    const businesses = await businessQuery

    formattedBusinesses = businesses.map(business => {
      let placeStatus = 'Draft'
      if (business.status === 'Approved') placeStatus = 'Published'
      else if (business.status === 'Pending') placeStatus = 'Draft'
      else placeStatus = business.status

      return {
        ...business,
        _id: business._id.toString(),
        type: 'Business',
        placeType: 'Business',
        status: placeStatus,
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
    })
  }

  // 3. Combine results
  const combined = [...formattedPlaces, ...formattedBusinesses]

  // Sort combined results if not sorting by geo location distance
  if (!hasGeo) {
    const isDesc = sort.startsWith('-')
    const sortField = sort.replace('-', '')

    combined.sort((a: any, b: any) => {
      let valA = a[sortField]
      let valB = b[sortField]

      if (sortField === 'map') {
        valA = a.map?.name || ''
        valB = b.map?.name || ''
      } else if (sortField === 'category') {
        valA = a.category?.name || ''
        valB = b.category?.name || ''
      } else if (sortField === 'createdAt' || sortField === 'updatedAt') {
        valA = valA ? new Date(valA).getTime() : 0
        valB = valB ? new Date(valB).getTime() : 0
      }

      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()

      if (valA < valB) return isDesc ? 1 : -1
      if (valA > valB) return isDesc ? -1 : 1
      return 0
    })
  }

  const total = combined.length
  const paginatedData = combined.slice(skip, skip + limit)

  return {
    meta: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit) || 0,
    },
    data: paginatedData,
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
