import { Types } from 'mongoose'
import { Award } from './award.model'
import { IAwardType } from './award.interface'
import { User } from '../user/user.model'
import ApiError from '../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'

const getMyAwards = async (userId: string) => {
  const user = await User.findById(userId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  const existingAwards = await Award.find({ userId })

  const defaultAwards: {
    type: IAwardType
    target: number
    progress: number
    isUnlocked: boolean
  }[] = [
    {
      type: 'PDF Itinerary',
      target: 500,
      progress: user.points || 0,
      isUnlocked: (user.points || 0) >= 500,
    },
    {
      type: 'Free Map',
      target: 1000,
      progress: user.points || 0,
      isUnlocked: (user.points || 0) >= 1000,
    },
    {
      type: 'Gourmet Guide',
      target: 2000,
      progress: 0,
      isUnlocked: false,
    },
    {
      type: 'Top Reviewer',
      target: 1000,
      progress: 0,
      isUnlocked: false,
    },
    {
      type: 'Trail Master',
      target: 500,
      progress: 0,
      isUnlocked: false,
    },
    {
      type: 'History Buff',
      target: 1500,
      progress: 0,
      isUnlocked: false,
    },
    {
      type: 'Legendary Explorer',
      target: 100,
      progress: 0,
      isUnlocked: false,
    },
  ]

  // Initialize or update awards
  for (const defaultAward of defaultAwards) {
    const found = existingAwards.find(a => a.type === defaultAward.type)
    if (!found) {
      await Award.create({
        userId,
        ...defaultAward,
      })
    } else {
      // Update progress for point-based awards
      if (defaultAward.type === 'PDF Itinerary' || defaultAward.type === 'Free Map') {
        await Award.updateOne(
          { _id: found._id },
          { 
            $set: { 
              progress: defaultAward.progress,
              isUnlocked: defaultAward.isUnlocked
            } 
          }
        )
      }
    }
  }

  return await Award.find({ userId }).sort({ type: 1 })
}

const updateAwardProgress = async (
  userId: string,
  type: IAwardType,
  progressIncrement: number,
) => {
  const award = await Award.findOne({ userId, type })
  if (award) {
    const newProgress = Math.min(award.progress + progressIncrement, award.target)
    const isUnlocked = newProgress >= award.target
    await Award.updateOne(
      { userId, type },
      { $set: { progress: newProgress, isUnlocked } },
    )
  }
}

const redeemFreeMap = async (userId: string, mapId: string) => {
  const user = await User.findById(userId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  // Check if already redeemed
  if (user.redeemedFreeMap) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You have already redeemed your free map')
  }

  // Check if Free Map award is unlocked
  const freeMapAward = await Award.findOne({ userId, type: 'Free Map' })
  if (!freeMapAward || !freeMapAward.isUnlocked) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Free Map award is not unlocked yet')
  }

  // Update user: set redeemedFreeMap and add to purchasedMaps
  const result = await User.findByIdAndUpdate(
    userId,
    {
      $set: { redeemedFreeMap: new Types.ObjectId(mapId) },
      $addToSet: { purchasedMaps: new Types.ObjectId(mapId) },
    },
    { new: true },
  )

  return result
}

export const AwardServices = {
  getMyAwards,
  updateAwardProgress,
  redeemFreeMap,
}
