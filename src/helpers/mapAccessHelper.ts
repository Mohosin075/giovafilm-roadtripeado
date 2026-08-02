import { Secret, JwtPayload } from 'jsonwebtoken'
import config from '../config'
import { jwtHelper } from './jwtHelper'
import { User } from '../modules/user/user.model'
import { Map } from '../modules/map/map.model'
import { USER_ROLES } from '../enum/user'

export const getUserFromToken = async (authorizationHeader?: string) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authorizationHeader.split(' ')[1]
  if (!token) return null
  try {
    const verified = jwtHelper.verifyToken(token, config.jwt.jwt_secret as Secret) as JwtPayload
    if (!verified || !verified.authId) return null
    const user = await User.findById(verified.authId)
    return user
  } catch (err) {
    return null
  }
}

export const getAccessibleMapIds = async (user: any): Promise<string[]> => {
  // Admin / Super Admin — all maps
  if (user && [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role)) {
    const allMaps = await Map.find({}, '_id')
    return allMaps.map(m => m._id.toString())
  }

  // Map Editor — only assigned maps + maps in assigned countries
  if (user && user.role === USER_ROLES.MAP_EDITOR) {
    const assignedMapIds = (user.assignedMaps || []).map((id: any) =>
      id.toString(),
    )
    const assignedCountries: string[] = user.assignedCountries || []

    const countryMaps =
      assignedCountries.length > 0
        ? await Map.find({ country: { $in: assignedCountries } }, '_id')
        : []

    const countryMapIds = countryMaps.map(m => m._id.toString())
    return Array.from(new Set([...assignedMapIds, ...countryMapIds]))
  }

  // Find all free maps
  const freeMaps = await Map.find({ isPaid: false }, '_id')
  const freeMapIds = freeMaps.map(m => m._id.toString())

  // If user is logged in, append purchased maps
  if (user && user.purchasedMaps) {
    const purchasedMapIds = user.purchasedMaps.map((id: any) => id.toString())
    return Array.from(new Set([...freeMapIds, ...purchasedMapIds]))
  }

  return freeMapIds
}

import { StatusCodes } from 'http-status-codes'
import ApiError from '../errors/ApiError'

export const verifyEditorEditAccess = async (user: any, mapId: string): Promise<boolean> => {
  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized.')
  }

  // Admin and Super Admin have full access
  if ([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role)) {
    return true
  }

  // If Map Editor, check assigned maps and countries
  if (user.role === USER_ROLES.MAP_EDITOR) {
    const map = await Map.findById(mapId)
    if (!map) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Map not found.')
    }

    const mapIdStr = map._id.toString()
    const mapCountry = map.country

    const isAssignedMap = user.assignedMaps?.some((id: any) => id.toString() === mapIdStr)
    const isAssignedCountry = mapCountry && user.assignedCountries?.includes(mapCountry)

    if (isAssignedMap || isAssignedCountry) {
      return true
    }

    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to edit this map or its places.'
    )
  }

  throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to edit this resource.')
}

/**
 * Business docs store location.country as map name OR geographic country.
 * Allow access if:
 * - assignedCountries includes that value, OR
 * - any assigned map's name or country matches that value
 */
export const verifyEditorBusinessAccess = async (
  user: any,
  businessCountry?: string | null,
): Promise<boolean> => {
  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized.')
  }

  if ([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role)) {
    return true
  }

  if (user.role !== USER_ROLES.MAP_EDITOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to edit this resource.')
  }

  const country = (businessCountry || '').trim()
  if (!country) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to edit offers for this business.',
    )
  }

  if (user.assignedCountries?.includes(country)) {
    return true
  }

  const assignedMapIds = (user.assignedMaps || []).map((id: any) => id.toString())
  if (assignedMapIds.length > 0) {
    const maps = await Map.find({ _id: { $in: assignedMapIds } }).select('name country')
    const matchesAssignedMap = maps.some(
      m => m.name === country || m.country === country,
    )
    if (matchesAssignedMap) {
      return true
    }
  }

  // Country assignment may be geographic (e.g. "United States") while
  // business.location.country stores the map name ("Estados Unidos")
  const countryMaps =
    (user.assignedCountries || []).length > 0
      ? await Map.find({ country: { $in: user.assignedCountries } }).select(
          'name country',
        )
      : []
  if (countryMaps.some(m => m.name === country || m.country === country)) {
    return true
  }

  throw new ApiError(
    StatusCodes.FORBIDDEN,
    'You are not authorized to edit offers for this business.',
  )
}

/** Direct map id from place/business populate (when present). */
export const getDirectOfferMapId = (offer: any): string | null => {
  const placeMap = offer?.place?.map?._id || offer?.place?.map
  if (placeMap) return placeMap.toString()
  const businessMap = offer?.business?.map?._id || offer?.business?.map
  if (businessMap) return businessMap.toString()
  return null
}

/**
 * Businesses store location.country as map name or geographic country.
 * Build name/country → mapId lookup for batch lock checks.
 */
export const buildCountryToMapIdLookup = async (
  countries: string[],
): Promise<Record<string, string>> => {
  const unique = Array.from(
    new Set(countries.map(c => (c || '').trim()).filter(Boolean)),
  )
  if (unique.length === 0) return {}

  const maps = await Map.find({
    $or: [{ name: { $in: unique } }, { country: { $in: unique } }],
  }).select('_id name country')

  const lookup: Record<string, string> = {}
  for (const m of maps) {
    if (m.name) lookup[m.name] = m._id.toString()
    if (m.country) lookup[m.country] = m._id.toString()
  }
  return lookup
}

/** Resolve the map id that gates an offer (place.map or business country → map). */
export const resolveOfferMapId = (
  offer: any,
  countryLookup: Record<string, string> = {},
): string | null => {
  const direct = getDirectOfferMapId(offer)
  if (direct) return direct

  const country = (
    offer?.business?.location?.country ||
    offer?.business?.country ||
    ''
  ).trim()
  if (country && countryLookup[country]) return countryLookup[country]
  return null
}

export const resolveOfferMapIdAsync = async (
  offer: any,
): Promise<string | null> => {
  const direct = getDirectOfferMapId(offer)
  if (direct) return direct

  const country = (
    offer?.business?.location?.country ||
    offer?.business?.country ||
    ''
  ).trim()
  if (!country) return null

  const lookup = await buildCountryToMapIdLookup([country])
  return lookup[country] || null
}
