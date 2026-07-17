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
  // If user is Admin, Super Admin, or Map Editor, they have access to all maps
  if (user && [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MAP_EDITOR].includes(user.role)) {
    const allMaps = await Map.find({}, '_id')
    return allMaps.map(m => m._id.toString())
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
