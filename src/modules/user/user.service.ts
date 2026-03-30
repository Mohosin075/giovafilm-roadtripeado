import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IUser, IUserFilterables } from './user.interface'
import { User } from './user.model'
import { Types } from 'mongoose'

import { InterestCategory, USER_ROLES, USER_STATUS } from '../../enum/user'

import { JwtPayload } from 'jsonwebtoken'
import { paginationHelper } from '../../helpers/paginationHelper'
import { IPaginationOptions } from '../../interfaces/pagination'
import { S3Helper } from '../../helpers/image/s3helper'
import config from '../../config'
import { userFilterableFields } from './user.constants'

const updateProfile = async (user: JwtPayload, payload: Partial<IUser>) => {
  console.log({ payload })
  const isUserExist = await User.findOne({
    _id: user.authId,
    status: { $nin: [USER_STATUS.DELETED] },
  })

  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  const updatedProfile = await User.findOneAndUpdate(
    { _id: user.authId, status: { $nin: [USER_STATUS.DELETED] } },
    {
      $set: payload,
    },
    { new: true },
  )

  if (!updatedProfile) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update profile.')
  }

  return 'Profile updated successfully.'
}

const createAdmin = async (): Promise<Partial<IUser> | null> => {
  const admin = {
    email: config.super_admin.email,
    name: config.super_admin.name,
    password: config.super_admin.password,
    role: USER_ROLES.SUPER_ADMIN,
    status: USER_STATUS.ACTIVE,
    verified: true,
    authentication: {
      oneTimeCode: null,
      restrictionLeftAt: null,
      expiresAt: null,
      latestRequestAt: new Date(),
      authType: 'createAccount',
    },
  }

  const isAdminExist = await User.findOne({
    email: admin.email,
    status: { $nin: [USER_STATUS.DELETED] },
  })

  if (isAdminExist) {
    console.log('Admin account already exist, skipping creation.🦥')
    return isAdminExist
  }
  const result = await User.create([admin])
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create admin')
  }
  return result[0]
}

const getAllUsers = async (
  paginationOptions: IPaginationOptions,
  filterables: IUserFilterables = {},
) => {
  const { searchTerm, ...filterData } = filterables
  const { page, skip, limit, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions)

  let whereConditions: any = {}

  // 🔥 FIXED: Properly typed arrays
  const searchConditions: any[] = []
  const filterConditions: any[] = []

  // Search functionality
  if (searchTerm && searchTerm.trim() !== '') {
    searchConditions.push({
      $or: userFilterableFields.map(field => ({
        [field]: {
          $regex: searchTerm.trim(),
          $options: 'i',
        },
      })),
    })
  }

  // Filter functionality
  if (Object.keys(filterData).length > 0) {
    Object.entries(filterData).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        filterConditions.push({ [key]: value })
      }
    })
  }

  // Always exclude deleted users
  filterConditions.push({
    status: { $nin: [USER_STATUS.DELETED, null] },
  })

  // Combine conditions
  if (searchConditions.length > 0 && filterConditions.length > 0) {
    whereConditions = {
      $and: [...searchConditions, ...filterConditions],
    }
  } else if (searchConditions.length > 0) {
    whereConditions = { $and: searchConditions }
  } else if (filterConditions.length > 0) {
    whereConditions = { $and: filterConditions }
  }

  const [users, total] = await Promise.all([
    User.find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort(sortBy ? { [sortBy]: sortOrder } : { createdAt: -1 })
      .select('-password -authentication -__v')
      .lean(),
    User.countDocuments(whereConditions),
  ])

  const result = users.map(user => {
    return {
      ...user,
    }
  })

  console.log(result, 'resule')

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  }
}

const deleteUser = async (userId: string): Promise<string> => {
  const isUserExist = await User.findOne({
    _id: userId,
    status: { $nin: [USER_STATUS.DELETED] },
  })
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  const deletedUser = await User.findOneAndUpdate(
    { _id: userId, status: { $nin: [USER_STATUS.DELETED] } },
    { $set: { status: USER_STATUS.DELETED } },
    { new: true },
  )

  if (!deletedUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete user.')
  }

  return 'User deleted successfully.'
}

const deleteProfile = async (
  userId: string,
  password: string,
): Promise<string> => {
  const isUserExist = await User.findOne({
    _id: userId,
    status: { $nin: [USER_STATUS.DELETED] },
  }).select('+password')
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }
  const isPasswordMatched = await User.isPasswordMatched(
    password,
    isUserExist.password,
  )

  if (!isPasswordMatched) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Password is incorrect.')
  }

  const deletedUser = await User.findOneAndUpdate(
    { _id: userId, status: { $nin: [USER_STATUS.DELETED] } },
    { $set: { status: USER_STATUS.DELETED } },
    { new: true },
  )

  if (!deletedUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete user.')
  }

  return 'User deleted successfully.'
}

const getUserById = async (userId: string): Promise<any> => {
  const user = await User.findOne({
    _id: userId,
    status: { $nin: [USER_STATUS.DELETED] },
  }).select('-password -authentication -__v')

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  return user
}

const updateUserStatus = async (userId: string, status: USER_STATUS) => {
  const isUserExist = await User.findOne({
    _id: userId,
    status: { $nin: [USER_STATUS.DELETED] },
  })
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, status: { $nin: [USER_STATUS.DELETED] } },
    { $set: { status } },
    { new: true },
  )

  if (!updatedUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update user status.')
  }

  return 'User status updated successfully.'
}

export const getProfile = async (user: JwtPayload) => {
  // --- Fetch user ---
  const isUserExist = await User.findOne({
    _id: user.authId,
    status: { $nin: [USER_STATUS.DELETED] },
  }).select('-authentication -password -__v')

  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  return isUserExist
}

const addUserInterest = async (
  userId: string,
  interest: InterestCategory[],
): Promise<IUser | null> => {
  const isUserExist = await User.findOne({
    _id: userId,
    status: { $nin: [USER_STATUS.DELETED] },
  })
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, status: { $nin: [USER_STATUS.DELETED] } },
    { $set: { interest } },
    { new: true },
  )
  if (!updatedUser) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to update user interest.',
    )
  }
  return updatedUser
}

const toggleFavoritePlace = async (
  userId: string,
  placeId: string,
): Promise<string> => {
  const isUserExist = await User.findById(userId)
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  const isFavorite = isUserExist.favoritePlaces?.includes(
    new Types.ObjectId(placeId),
  )

  if (isFavorite) {
    await User.findByIdAndUpdate(userId, {
      $pull: { favoritePlaces: placeId },
    })
    return 'Place removed from favorites.'
  } else {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { favoritePlaces: placeId },
    })
    return 'Place added to favorites.'
  }
}

const getFavoritePlaces = async (userId: string) => {
  const user = await User.findById(userId).populate({
    path: 'favoritePlaces',
    populate: { path: 'category' },
  })

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  return user.favoritePlaces || []
}

export const UserServices = {
  updateProfile,
  createAdmin,
  getAllUsers,
  deleteUser,
  getUserById,
  updateUserStatus,
  getProfile,
  deleteProfile,
  addUserInterest,
  toggleFavoritePlace,
  getFavoritePlaces,
}
