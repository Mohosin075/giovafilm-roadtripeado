import { Types } from 'mongoose'
import { Award } from './award.model'
import { IAwardType } from './award.interface'
import { User } from '../user/user.model'
import ApiError from '../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'

import { AwardConfig } from './awardConfig.model'
import { AwardConfigServices } from './awardConfig.service'

const getMyAwards = async (userId: string) => {
  const user = await User.findById(userId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  // Seed default configs if missing
  await AwardConfigServices.seedAwardConfigs()

  // Fetch configs and existing awards
  const configs = await AwardConfig.find({}).populate('mapId')
  const existingAwards = await Award.find({ userId })

  const awards = []

  for (const config of configs) {
    const found = existingAwards.find(a => a.type === config.type)
    
    let progress = 0
    let isUnlocked = false

    if (
      config.type === 'PDF Itinerary' ||
      config.type === 'Free Map' ||
      config.type === 'Gourmet Guide' ||
      config.type === 'Exclusive Discount' ||
      config.type === 'Permanent Discount'
    ) {
      progress = user.points || 0
      isUnlocked = progress >= config.target
    } else if (found) {
      progress = found.progress
      isUnlocked = found.progress >= config.target
    }

    if (!found) {
      const newAward = await Award.create({
        userId,
        type: config.type,
        target: config.target,
        progress,
        isUnlocked,
      })
      // Attach config properties for frontend
      const awardObj = newAward.toObject()
      ;(awardObj as any).config = config
      awards.push(awardObj)
    } else {
      // Update target, progress, isUnlocked if they differ
      const updates: any = { target: config.target }
      if (
        config.type === 'PDF Itinerary' ||
        config.type === 'Free Map' ||
        config.type === 'Gourmet Guide' ||
        config.type === 'Exclusive Discount' ||
        config.type === 'Permanent Discount'
      ) {
        updates.progress = progress
        updates.isUnlocked = isUnlocked
      } else {
        updates.isUnlocked = found.progress >= config.target
      }

      const updatedAward = await Award.findByIdAndUpdate(
        found._id,
        { $set: updates },
        { new: true }
      )
      const awardObj = updatedAward!.toObject()
      ;(awardObj as any).config = config
      awards.push(awardObj)
    }
  }

  return awards.sort((a, b) => a.type.localeCompare(b.type))
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
