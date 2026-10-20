import { Types } from 'mongoose'
import { Award } from './award.model'
import { IAwardType } from './award.interface'
import { User } from '../user/user.model'
import ApiError from '../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'

import { AwardConfig } from './awardConfig.model'
import { AwardConfigServices } from './awardConfig.service'
import { NotificationIntegration } from '../notification/notification.integration'

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
    const found = existingAwards.find(
      a =>
        (a.configId && a.configId.toString() === config._id.toString()) ||
        (a.type === config.type && a.target === config.target)
    )
    
    const userPoints = Number(user.points) || 0
    // Every reward and badge tracks user points against the target requirement set by admin in dashboard.
    // If the award has a custom action progress (e.g. approved reviews), we take the highest progress.
    const progress = Math.max(userPoints, found?.progress || 0)
    const isUnlocked = progress >= config.target

    if (!found) {
      const newAward = await Award.create({
        userId,
        configId: config._id,
        type: config.type,
        target: config.target,
        progress,
        isUnlocked,
      })

      if (isUnlocked) {
        const rewardTitle =
          typeof config.title === 'object'
            ? config.title.en || config.title.es || config.type
            : config.title || config.type

        NotificationIntegration.onRewardEarned({
          userId,
          rewardTitle,
          rewardType: config.type,
          awardId: newAward._id,
        }).catch(err => console.error('Failed to notify award earned:', err))
      }

      // Attach config properties for frontend
      const awardObj = newAward.toObject()
      ;(awardObj as any).config = config
      awards.push(awardObj)
    } else {
      // Update target, progress, isUnlocked if they differ
      const wasUnlocked = Boolean(found.isUnlocked)
      const updates: any = {
        configId: config._id,
        target: config.target,
        progress,
        isUnlocked,
      }

      if (!wasUnlocked && updates.isUnlocked) {
        const rewardTitle =
          typeof config.title === 'object'
            ? config.title.en || config.title.es || config.type
            : config.title || config.type

        NotificationIntegration.onRewardEarned({
          userId,
          rewardTitle,
          rewardType: config.type,
          awardId: found._id,
        }).catch(err => console.error('Failed to notify award earned:', err))
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

  return awards.sort((a, b) => (a.target || 0) - (b.target || 0))
}

const updateAwardProgress = async (
  userId: string,
  type: IAwardType,
  progressIncrement: number,
) => {
  const user = await User.findById(userId).select('points')
  const userPoints = Number(user?.points) || 0
  const awards = await Award.find({ userId, type })
  for (const award of awards) {
    const wasUnlocked = Boolean(award.isUnlocked)
    const actionProgress = (award.progress || 0) + progressIncrement
    const newProgress = Math.max(userPoints, actionProgress)
    const isUnlocked = newProgress >= award.target
    await Award.updateOne(
      { _id: award._id },
      { $set: { progress: newProgress, isUnlocked } },
    )

    if (!wasUnlocked && isUnlocked) {
      NotificationIntegration.onRewardEarned({
        userId,
        rewardTitle: type,
        rewardType: type,
        awardId: award._id,
      }).catch(err => console.error('Failed to notify award earned:', err))
    }
  }
}

const redeemFreeMap = async (userId: string, mapId: string) => {
  const user = await User.findById(userId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  // Ensure awards and unlock states are synchronized based on user points
  await getMyAwards(userId)

  // Find all unlocked Free Map awards for this user
  const freeMapAwards = await Award.find({ userId, type: 'Free Map', isUnlocked: true }).populate('configId')
  if (!freeMapAwards || freeMapAwards.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Free Map award is not unlocked yet')
  }

  // Calculate total free maps allowed across all unlocked awards
  const totalAllowed = freeMapAwards.reduce((acc, award: any) => {
    const count = Number(award.configId?.mapCount) || 1
    return acc + count
  }, 0)

  // Determine currently redeemed maps
  const currentRedeemed: Types.ObjectId[] = Array.isArray(user.redeemedFreeMaps) && user.redeemedFreeMaps.length > 0
    ? user.redeemedFreeMaps
    : (user.redeemedFreeMap ? [user.redeemedFreeMap] : [])

  if (currentRedeemed.length >= totalAllowed) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You have already redeemed all your free map rewards')
  }

  // Check if map already redeemed
  if (currentRedeemed.some(m => m.toString() === mapId.toString())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You have already redeemed this specific map')
  }

  // Update user: set redeemedFreeMap and add to redeemedFreeMaps & purchasedMaps
  const result = await User.findByIdAndUpdate(
    userId,
    {
      $set: { redeemedFreeMap: new Types.ObjectId(mapId) },
      $addToSet: {
        redeemedFreeMaps: new Types.ObjectId(mapId),
        purchasedMaps: new Types.ObjectId(mapId),
      },
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
