import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IPlace } from './place.interface'
import { Place } from './place.model'
import { Map } from '../map/map.model'
import { Category } from '../category/category.model'
import mongoose from 'mongoose'
import { getCountryFromCoordinates } from '../../utils/reverseGeocoding'
import { Business } from '../business/business.model'
import { autoTranslateField } from '../../utils/autoTranslate'
import { difficultyMap } from './place.constants'
import {
  getUserFromToken,
  getAccessibleMapIds,
  verifyEditorEditAccess,
} from '../../helpers/mapAccessHelper'
import { getCoordinatesFromUrl } from '../../utils/mapHelper'
import { toStringArray } from '../../utils/media'
import { USER_ROLES } from '../../enum/user'

const processPlaceTranslations = async (payload: Partial<IPlace>) => {
  if (payload.name) payload.name = await autoTranslateField(payload.name)
  if (payload.description) payload.description = await autoTranslateField(payload.description)
  if (payload.access) payload.access = await autoTranslateField(payload.access)
  if (payload.entryCost) payload.entryCost = await autoTranslateField(payload.entryCost)
  if (payload.difficulty) {
    if (typeof payload.difficulty === 'string' && difficultyMap[payload.difficulty]) {
      payload.difficulty = difficultyMap[payload.difficulty]
    } else {
      payload.difficulty = await autoTranslateField(payload.difficulty)
    }
  }
  if (payload.hikeTime) payload.hikeTime = await autoTranslateField(payload.hikeTime)
  if (payload.atmosphere) payload.atmosphere = await autoTranslateField(payload.atmosphere)
  if (payload.accessibility?.notes) {
    payload.accessibility.notes = await autoTranslateField(payload.accessibility.notes)
  }
  if (payload.recommendations?.tips) {
    payload.recommendations.tips = await autoTranslateField(payload.recommendations.tips)
  }
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toNumber = (value: unknown): number => {
  const parsed =
    typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : NaN
}

const createPlace = async (payload: any, userOrAuthHeader?: any): Promise<IPlace> => {
  const user = typeof userOrAuthHeader === 'string'
    ? await getUserFromToken(userOrAuthHeader)
    : userOrAuthHeader

  const placeData = { ...payload }
  const uploadedImages = toStringArray(placeData.images)
  const uploadedDocs = toStringArray(placeData.documents)
  if (uploadedImages.length || placeData.media) {
    placeData.media = [...toStringArray(placeData.media), ...uploadedImages]
  }
  if (uploadedDocs.length || placeData.menuImages) {
    placeData.menuImages = [...toStringArray(placeData.menuImages), ...uploadedDocs]
  }
  delete placeData.images
  delete placeData.documents

  // A place must belong to a map, verify access
  if (placeData.map) {
    await verifyEditorEditAccess(user, placeData.map.toString())
  }

  // Auto-populate country if not provided (run before transaction/session to prevent locks)
  if (!placeData.country && placeData.location?.coordinates) {
    const [lng, lat] = placeData.location.coordinates
    // MongoDB stores [lng, lat], but Google API needs (lat, lng)
    const country = await getCountryFromCoordinates(lat, lng)
    console.log('country', country)
    if (country) {
      placeData.country = country
    } else {
      placeData.country = 'Unknown' // Fallback
    }
  }

  await processPlaceTranslations(placeData)

  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    // Check if map exists
    const map = await Map.findById(placeData.map).session(session)
    if (!map) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Map not found')
    }

    const result = await Place.create([placeData], { session })
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
  query: Record<string, unknown>,
  authHeader?: string,
) => {
  // Run auth lookup and paid map IDs in parallel to avoid sequential DB hits
  const [user, paidMaps] = await Promise.all([
    getUserFromToken(authHeader),
    Map.find({ isPaid: true }, '_id'),
  ])
  const accessibleMapIds = await getAccessibleMapIds(user)

  const paidMapIds = paidMaps.map(m => m._id.toString())
  const lockedMapIds = paidMapIds.filter(id => !accessibleMapIds.includes(id))

  const isPremium = user && [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MAP_EDITOR].includes(user.role as any)

  const searchTerm =
    typeof query.searchTerm === 'string' ? query.searchTerm.trim() : ''
  const lat = toNumber(query.lat)
  const lng = toNumber(query.lng)
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng)
  const sort =
    typeof query.sort === 'string' && query.sort.trim()
      ? (query.sort as string)
      : '-createdAt'
  const page = Math.max(1, toNumber(query.page) || 1)
  const limit = Math.max(1, toNumber(query.limit) || 10)
  const skip = (page - 1) * limit

  // 1. Build Place Query
  const match: Record<string, unknown> = {}
  if (query.map) {
    match.map = new mongoose.Types.ObjectId(query.map as string)
  }
  if (query.category) {
    match.category = new mongoose.Types.ObjectId(query.category as string)
  }
  if (query.status) {
    match.status = query.status
  } else {
    match.status = 'Published'
  }
  if (query.country) {
    match.country = new RegExp(`^${escapeRegex(String(query.country).trim())}$`, 'i')
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
    .populate('map', 'name isPaid price')
    .lean()

  if (!hasGeo) {
    placeQuery = placeQuery.sort(sort)
  }

  const places = await placeQuery
  const formattedPlaces = places.map(p => ({
    ...p,
    _id: p._id.toString(),
    type: 'Regular',
    placeType: 'Regular',
  }))

  // 2. Build Business Query (if type is not strictly 'Regular' and no specific map filter is applied)
  let formattedBusinesses: any[] = []
  if (query.type !== 'Regular' && !query.map) {
    const businessMatch: Record<string, unknown> = {}

    if (query.category) {
      businessMatch.category = new mongoose.Types.ObjectId(query.category as string)
    }
    if (query.country) {
      businessMatch['location.country'] = new RegExp(
        `^${escapeRegex(String(query.country).trim())}$`,
        'i',
      )
    }

    // Map place statuses to business statuses
    if (match.status) {
      const statusObj = match.status as any
      if (statusObj && statusObj.$in) {
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
      } else if (sortField === 'createdAt') {
        valA = new Date(a.createdAt || 0).getTime()
        valB = new Date(b.createdAt || 0).getTime()
      } else {
        valA = a[sortField] || ''
        valB = b[sortField] || ''
      }

      if (valA < valB) return isDesc ? 1 : -1
      if (valA > valB) return isDesc ? -1 : 1
      return 0
    })
  }

  const total = combined.length
  const paginatedData = combined.slice(skip, skip + limit)

  const updatedData = paginatedData.map((place: any) => {
    const mapId = place.map?._id || place.map
    const isLocked = !isPremium && mapId && lockedMapIds.includes(mapId.toString()) && place.type !== 'Business'
    if (isLocked) {
      // Keep teaser fields (name/media/category/location) for locked cards
      const { description: _description, hours: _hours, privateInfo: _privateInfo, ...teaser } = place
      return {
        ...teaser,
        description: undefined,
        hours: undefined,
        privateInfo: undefined,
        isLocked: true,
      }
    }
    return {
      ...place,
      isLocked: false,
    }
  })

  return {
    meta: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit) || 0,
    },
    data: updatedData,
  }
}

const getPlaceById = async (
  id: string,
  authHeader?: string,
): Promise<any | null> => {
  const [user, placeDoc] = await Promise.all([
    getUserFromToken(authHeader),
    Place.findById(id).populate('category').populate('map'),
  ])

  let result: any = placeDoc
  if (!result) {
    // Fallback to checking Business collection
    const business = await Business.findById(id).populate('category')
    if (business) {
      // Map Business fields to Place schema so frontend doesn't break
      result = {
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
  }

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
  }

  const isPremium = user && [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MAP_EDITOR].includes(user.role as any)
  const accessibleMapIds = await getAccessibleMapIds(user)

  const mapId = result.map?._id || result.map
  if (mapId) {
    const isLocked = !accessibleMapIds.includes(mapId.toString())
    if (!isPremium && isLocked) {
      if (result.type !== 'Business') {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          'This information and these benefits can be unlocked by purchasing your favorite map.'
        )
      }
    }
  }

  const placeObj = typeof (result as any).toObject === 'function' ? (result as any).toObject() : result
  const isLocked = mapId && !accessibleMapIds.includes(mapId.toString()) && result.type !== 'Business'
  placeObj.isLocked = !isPremium && !!isLocked

  return placeObj
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
  payload: any,
  userOrAuthHeader?: any,
): Promise<any | null> => {
  const user = typeof userOrAuthHeader === 'string'
    ? await getUserFromToken(userOrAuthHeader)
    : userOrAuthHeader

  const placeData = { ...payload }
  const uploadedImages = toStringArray(placeData.images)
  const uploadedDocs = toStringArray(placeData.documents)
  if (uploadedImages.length || placeData.media) {
    placeData.media = [...toStringArray(placeData.media), ...uploadedImages]
  }
  if (uploadedDocs.length || placeData.menuImages) {
    placeData.menuImages = [...toStringArray(placeData.menuImages), ...uploadedDocs]
  }
  delete placeData.images
  delete placeData.documents

  const isExist = await Place.findById(id)
  if (isExist) {
    // A place must belong to a map, verify access to the existing map
    const mapId = isExist.map?._id || isExist.map
    if (mapId) {
      await verifyEditorEditAccess(user, mapId.toString())
    }

    // If they are moving the place to a new map, verify access to the new map too
    if (placeData.map && placeData.map.toString() !== mapId?.toString()) {
      await verifyEditorEditAccess(user, placeData.map.toString())
    }
  }
  await processPlaceTranslations(placeData)
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

const extractCoordinates = async (url?: string) => {
  if (!url) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Google Maps URL is required')
  }
  const coordinates = await getCoordinatesFromUrl(url)
  if (!coordinates) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Could not extract coordinates. Try using the full URL from your browser address bar.'
    )
  }
  return coordinates
}

export const PlaceService = {
  createPlace,
  getAllPlaces,
  getPlaceById,
  incrementOpenCount,
  updatePlace,
  deletePlace,
  extractCoordinates,
}

