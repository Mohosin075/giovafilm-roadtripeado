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
import { generateOtp } from '../../utils/crypto'
import { emailTemplate } from '../../shared/emailTemplate'
import { emailHelper } from '../../helpers/emailHelper'

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
        if (key !== 'status') {
          filterConditions.push({ [key]: value })
        }
      }
    })
  }

  // Handle status filtering (allows retrieving deleted users if explicitly requested)
  if (filterData.status) {
    filterConditions.push({ status: filterData.status })
  } else {
    // Default: Exclude deleted and null status users if no status is specified
    filterConditions.push({
      status: { $nin: [USER_STATUS.DELETED, null] },
    })
  }

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

const deleteUser = async (
  userId: string,
  actor?: JwtPayload,
): Promise<string> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid User ID.')
  }

  const isUserExist = await User.findOne({
    _id: userId,
    status: { $nin: [USER_STATUS.DELETED] },
  })
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  assertCanDeleteUser(actor?.role, isUserExist.role)

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
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid User ID.')
  }

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
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete profile.')
  }

  return 'Profile deleted successfully.'
}

const getUserById = async (userId: string): Promise<any> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid User ID.')
  }

  const user = await User.findOne({
    _id: userId,
    status: { $nin: [USER_STATUS.DELETED] },
  }).select('-password -authentication -__v')

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  return user
}

/** Public, shareable profile — safe fields only */
const getPublicProfile = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid User ID.')
  }

  const user = await User.findOne({
    _id: userId,
    status: USER_STATUS.ACTIVE,
    verified: true,
  }).select(
    'name profile level points role createdAt website instagram description specialty settings.profileStatus',
  )

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Profile not found.')
  }

  if (user.settings?.profileStatus === 'private') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'This profile is private.')
  }

  return user
}

const updateUserStatus = async (
  userId: string,
  status: USER_STATUS,
  actor?: JwtPayload,
) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid User ID.')
  }

  const isUserExist = await User.findOne({
    _id: userId,
    status: { $nin: [USER_STATUS.DELETED] },
  })
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  // Admin cannot change super_admin status
  if (
    isUserExist.role === USER_ROLES.SUPER_ADMIN &&
    actor?.role !== USER_ROLES.SUPER_ADMIN
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only Super Admin can update Super Admin status.',
    )
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

const assertCanAssignRole = (
  actorRole: string | undefined,
  targetRole: USER_ROLES,
  existingRole?: string,
) => {
  if (!actorRole) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized.')
  }

  // Only super_admin can create / manage super_admin
  if (
    (targetRole === USER_ROLES.SUPER_ADMIN ||
      existingRole === USER_ROLES.SUPER_ADMIN) &&
    actorRole !== USER_ROLES.SUPER_ADMIN
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only Super Admin can manage Super Admin accounts.',
    )
  }

  if (
    actorRole !== USER_ROLES.ADMIN &&
    actorRole !== USER_ROLES.SUPER_ADMIN
  ) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not authorized.')
  }
}

const assertCanDeleteUser = (
  actorRole: string | undefined,
  targetRole: string | undefined,
) => {
  if (!actorRole) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized.')
  }
  if (!targetRole) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Target user role is missing.')
  }

  if (targetRole === USER_ROLES.SUPER_ADMIN) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Super Admin accounts cannot be deleted this way.',
    )
  }

  if (actorRole === USER_ROLES.SUPER_ADMIN) {
    return
  }

  if (actorRole === USER_ROLES.ADMIN) {
    // Admin can delete regular users and map editors only
    if (
      targetRole === USER_ROLES.USER ||
      targetRole === USER_ROLES.MAP_EDITOR
    ) {
      return
    }
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Admins cannot delete other admin accounts.',
    )
  }

  throw new ApiError(StatusCodes.FORBIDDEN, 'You are not authorized.')
}

const updateUserRole = async (
  userId: string,
  role: USER_ROLES,
  assignedMaps?: string[],
  assignedCountries?: string[],
  actor?: JwtPayload,
) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid User ID.')
  }

  const isUserExist = await User.findOne({
    _id: userId,
    status: { $nin: [USER_STATUS.DELETED] },
  })
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  assertCanAssignRole(actor?.role, role, isUserExist.role)

  const updateData: any = { role }

  if (role === USER_ROLES.MAP_EDITOR) {
    const maps = assignedMaps || []
    const countries = assignedCountries || []
    if (maps.length === 0 && countries.length === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Map Editor must be assigned at least one map or country.',
      )
    }
    updateData.assignedMaps = maps
    updateData.assignedCountries = countries
  } else {
    // Clear editor scope when leaving map_editor
    updateData.assignedMaps = []
    updateData.assignedCountries = []
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, status: { $nin: [USER_STATUS.DELETED] } },
    { $set: updateData },
    { new: true },
  )

  if (!updatedUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update user role.')
  }

  return 'User role updated successfully.'
}

const inviteUser = async (
  payload: {
    email: string
    role: USER_ROLES
    assignedMaps?: string[]
    assignedCountries?: string[]
  },
  actor?: JwtPayload,
) => {
  const email = payload.email.toLowerCase().trim()

  assertCanAssignRole(actor?.role, payload.role)

  const isUserExist = await User.findOne({ email })

  if (isUserExist && isUserExist.verified) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'User with this email already exists and is verified.',
    )
  }

  const otp = generateOtp()
  const otpExpiresIn = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours for invitation

  const authentication = {
    oneTimeCode: otp,
    expiresAt: otpExpiresIn,
    latestRequestAt: new Date(),
    requestCount: 1,
    authType: 'createAccount',
  }

  const baseUpdate: any = {
    role: payload.role,
    status: USER_STATUS.ACTIVE,
    verified: false,
    authentication,
  }

  if (payload.role === USER_ROLES.MAP_EDITOR) {
    const maps = payload.assignedMaps || []
    const countries = payload.assignedCountries || []
    if (maps.length === 0 && countries.length === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Map Editor must be assigned at least one map or country.',
      )
    }
    baseUpdate.assignedMaps = maps
    baseUpdate.assignedCountries = countries
  } else {
    // Re-invite as non-editor — clear any previous editor scope
    baseUpdate.assignedMaps = []
    baseUpdate.assignedCountries = []
  }

  let user
  if (isUserExist) {
    // Update existing unverified or deleted user
    user = await User.findOneAndUpdate(
      { email },
      { $set: baseUpdate },
      { new: true },
    )
  } else {
    // Create new user
    user = await User.create({
      email,
      ...baseUpdate
    })
  }

  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to invite user.')
  }

  // Send invitation email
  const invitationEmail = emailTemplate.userInvitation({
    email: user.email as string,
    role: user.role as string,
    otp,
  })

  await emailHelper.sendEmail(invitationEmail)

  return 'User invited successfully.'
}

export const getProfile = async (user: JwtPayload) => {
  // --- Fetch user ---
  const isUserExist = await User.findOne({
    _id: user.authId,
    status: { $nin: [USER_STATUS.DELETED] },
  })
    .select('-authentication -password -__v')
    .populate('assignedMaps', 'name country')

  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  return isUserExist
}

const addUserInterest = async (
  userId: string,
  interest: InterestCategory[],
): Promise<IUser | null> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid User ID.')
  }

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

const toggleFavoriteMap = async (
  userId: string,
  mapId: string,
) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid User ID.')
  }
  if (!Types.ObjectId.isValid(mapId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Map ID.')
  }

  const isUserExist = await User.findById(userId)

  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  const isFavorite = isUserExist.favoriteMaps?.includes(
    new Types.ObjectId(mapId),
  )

  const updateDoc = isFavorite
    ? {
        $pull: { favoriteMaps: mapId },
      }
    : {
        $addToSet: { favoriteMaps: mapId },
      }

  const result = await User.findByIdAndUpdate(userId, updateDoc, { new: true })
  return result
}

const getFavoriteMaps = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid User ID.')
  }

  const user = await User.findById(userId)
    .populate({
      path: 'favoriteMaps',
      select:
        'name country images isActive isPaid price rating totalReview createdAt description',
    })
    .lean()

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  return user.favoriteMaps || []
}

const toggleFavoriteOffer = async (
  userId: string,
  offerId: string,
): Promise<string> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid User ID.')
  }
  if (!Types.ObjectId.isValid(offerId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Offer ID.')
  }

  const isUserExist = await User.findById(userId)
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  const isFavorite = isUserExist.favoriteOffers?.includes(
    new Types.ObjectId(offerId),
  )

  if (isFavorite) {
    await User.findByIdAndUpdate(userId, {
      $pull: { favoriteOffers: offerId },
    })
    return 'Offer removed from favorites.'
  } else {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { favoriteOffers: offerId },
    })
    return 'Offer added to favorites.'
  }
}

const getFavoriteOffers = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid User ID.')
  }

  const user = await User.findById(userId).populate({
    path: 'favoriteOffers',
    populate: { path: 'place' },
  })

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  return user.favoriteOffers || []
}

const updatePointsAndLevel = async (userId: string, pointsToAdd: number) => {
  const user = await User.findById(userId)
  if (!user) return

  const newPoints = (user.points || 0) + pointsToAdd
  // Simple level logic: every 1000 points = 1 level
  const newLevel = Math.floor(newPoints / 1000) + 1

  await User.findByIdAndUpdate(userId, {
    $set: {
      points: newPoints,
      level: newLevel,
    },
  })
}

const assignEditorAccess = async (
  userId: string,
  assignedMaps?: string[],
  assignedCountries?: string[]
) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid User ID.')
  }

  const user = await User.findById(userId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.')
  }

  if (user.role !== USER_ROLES.MAP_EDITOR) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not a MAP_EDITOR.')
  }

  const maps = assignedMaps ?? user.assignedMaps?.map((id: any) => id.toString()) ?? []
  const countries = assignedCountries ?? user.assignedCountries ?? []

  if (maps.length === 0 && countries.length === 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Map Editor must be assigned at least one map or country.',
    )
  }

  const updateData: any = {}
  if (assignedMaps !== undefined) {
    updateData.assignedMaps = assignedMaps
  }
  if (assignedCountries !== undefined) {
    updateData.assignedCountries = assignedCountries
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  )

  return updatedUser
}

export const UserServices = {
  updateProfile,
  createAdmin,
  getAllUsers,
  deleteUser,
  getUserById,
  getPublicProfile,
  updateUserStatus,
  updateUserRole,
  inviteUser,
  getProfile,
  deleteProfile,
  addUserInterest,
  toggleFavoriteMap,
  getFavoriteMaps,
  toggleFavoriteOffer,
  getFavoriteOffers,
  updatePointsAndLevel,
  assignEditorAccess,
}
