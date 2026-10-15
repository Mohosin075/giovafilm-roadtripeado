import { Types } from 'mongoose'
import { LevelConfig } from './levelConfig.model'
import { ILevelConfig } from './levelConfig.interface'
import { USER_LEVELS } from '../../constants/userLevels.constant'
import { autoTranslateField } from '../../utils/autoTranslate'
import { User } from '../user/user.model'
import { USER_STATUS } from '../../enum/user'

let cachedConfigs: ILevelConfig[] | null = null
let cacheExpiresAt = 0

export const clearLevelConfigCache = () => {
  cachedConfigs = null
  cacheExpiresAt = 0
}

const seedLevelConfigs = async () => {
  try {
    const count = await LevelConfig.countDocuments()
    if (count === 0) {
      for (const lvl of USER_LEVELS) {
        await LevelConfig.updateOne(
          { level: lvl.level },
          {
            $setOnInsert: {
              level: lvl.level,
              name: { en: lvl.name, es: lvl.name },
              points: lvl.points,
              reviews: lvl.reviews,
            },
          },
          { upsert: true },
        )
      }
    }
  } catch (error) {
    console.error('Error seeding level configs:', error)
  }
}

const getAllLevelConfigs = async (): Promise<ILevelConfig[]> => {
  const now = Date.now()
  if (cachedConfigs && cachedConfigs.length > 0 && now < cacheExpiresAt) {
    return cachedConfigs
  }
  await seedLevelConfigs()
  const configs = await LevelConfig.find({}).sort({ level: 1 }).lean()
  cachedConfigs = configs as ILevelConfig[]
  cacheExpiresAt = now + 60 * 1000 // 60s TTL
  return cachedConfigs
}

const calculateDynamicLevelFromList = (
  points: number,
  approvedReviews: number,
  configs?: any[]
) => {
  const list =
    configs && configs.length > 0
      ? [...configs].sort((a, b) => Number(a.level) - Number(b.level))
      : [...USER_LEVELS].sort((a, b) => Number(a.level) - Number(b.level))

  let currentConfig = list[0] || {
    level: 0,
    name: 'Explorador',
    points: 0,
    reviews: 0,
  }
  let currentIndex = 0

  for (let i = list.length - 1; i >= 0; i--) {
    const lvl = list[i]
    const reqPoints = Number(lvl.points ?? lvl.xp) || 0
    const reqReviews = Number(lvl.reviews) || 0
    if (points >= reqPoints && approvedReviews >= reqReviews) {
      currentConfig = lvl
      currentIndex = i
      break
    }
  }

  const nextConfig =
    currentIndex < list.length - 1 ? list[currentIndex + 1] : null

  const currentPointsReq = Number(currentConfig.points ?? currentConfig.xp) || 0
  const currentReviewsReq = Number(currentConfig.reviews) || 0

  let progressPercent = 100
  let pointsRemaining = 0
  let reviewsRemaining = 0
  let nextLevelData: any = null

  if (nextConfig) {
    const nextPointsReq = Number(nextConfig.points ?? nextConfig.xp) || 0
    const nextReviewsReq = Number(nextConfig.reviews) || 0
    const pointsDelta = Math.max(1, nextPointsReq - currentPointsReq)
    const earnedDelta = Math.max(0, points - currentPointsReq)

    progressPercent = Math.min(
      100,
      Math.max(0, Math.round((earnedDelta / pointsDelta) * 100))
    )
    pointsRemaining = Math.max(0, nextPointsReq - points)
    reviewsRemaining = Math.max(0, nextReviewsReq - approvedReviews)

    const nextTitle =
      typeof nextConfig.name === 'string'
        ? nextConfig.name
        : nextConfig.name?.es ||
          nextConfig.name?.en ||
          nextConfig.title ||
          `Nivel ${nextConfig.level}`

    nextLevelData = {
      levelNumber: Number(nextConfig.level),
      title: nextTitle,
      name: nextConfig.name,
      pointsRequired: nextPointsReq,
      pointsRemaining,
      reviewsRequired: nextReviewsReq,
      reviewsRemaining,
    }
  }

  const currentTitle =
    typeof currentConfig.name === 'string'
      ? currentConfig.name
      : currentConfig.name?.es ||
        currentConfig.name?.en ||
        currentConfig.title ||
        `Nivel ${currentConfig.level}`

  return {
    levelNumber: Number(currentConfig.level),
    title: currentTitle,
    name: currentConfig.name,
    pointsRequired: currentPointsReq,
    reviewsRequired: currentReviewsReq,
    nextLevel: nextLevelData,
    progressPercent,
    badgeUrl: currentConfig.badgeUrl,
    description: currentConfig.description,
  }
}

const getDynamicUserLevel = async (
  points: number,
  approvedReviews: number
) => {
  const configs = await getAllLevelConfigs()
  return calculateDynamicLevelFromList(points, approvedReviews, configs)
}

const syncAllUsersLevels = async () => {
  try {
    const configs = await LevelConfig.find({}).sort({ level: 1 }).lean()
    if (!configs || configs.length === 0) return

    const users = await User.find({
      status: { $nin: [USER_STATUS.DELETED] },
    })
      .select('_id points totalReviewsApproved level')
      .lean()

    const bulkOps: any[] = []
    for (const u of users) {
      const pts = (u as any).points || 0
      const revs = (u as any).totalReviewsApproved || 0
      const dynamicInfo = calculateDynamicLevelFromList(pts, revs, configs)
      if (u.level !== dynamicInfo.levelNumber) {
        bulkOps.push({
          updateOne: {
            filter: { _id: u._id },
            update: { $set: { level: dynamicInfo.levelNumber } },
          },
        })
      }
    }

    if (bulkOps.length > 0) {
      await User.bulkWrite(bulkOps)
      console.log(
        `[syncAllUsersLevels] Real-time synced ${bulkOps.length} user level(s) based on rewards configuration.`
      )
    }
  } catch (err) {
    console.error('[syncAllUsersLevels] Error syncing user levels:', err)
  }
}

const processLevelTranslations = async (payload: Partial<ILevelConfig>) => {
  if (payload.name) payload.name = await autoTranslateField(payload.name)
  if (payload.description)
    payload.description = await autoTranslateField(payload.description)
}

const createLevelConfig = async (
  payload: ILevelConfig
): Promise<ILevelConfig> => {
  await processLevelTranslations(payload)
  const result = await LevelConfig.create(payload)
  clearLevelConfigCache()
  syncAllUsersLevels().catch(err =>
    console.error('Failed to sync users level after create:', err)
  )
  return result
}

const updateLevelConfig = async (
  id: string,
  payload: Partial<ILevelConfig>
): Promise<ILevelConfig | null> => {
  await processLevelTranslations(payload)
  let result: ILevelConfig | null = null
  if (Types.ObjectId.isValid(id)) {
    result = await LevelConfig.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
  } else {
    result = await LevelConfig.findOneAndUpdate(
      { level: Number(id) },
      payload,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    )
  }
  clearLevelConfigCache()
  syncAllUsersLevels().catch(err =>
    console.error('Failed to sync users level after update:', err)
  )
  return result
}

const deleteLevelConfig = async (
  id: string
): Promise<ILevelConfig | null> => {
  let result: ILevelConfig | null = null
  if (Types.ObjectId.isValid(id)) {
    result = await LevelConfig.findByIdAndDelete(id)
  } else {
    result = await LevelConfig.findOneAndDelete({ level: Number(id) })
  }
  clearLevelConfigCache()
  syncAllUsersLevels().catch(err =>
    console.error('Failed to sync users level after delete:', err)
  )
  return result
}

export const LevelConfigServices = {
  seedLevelConfigs,
  getAllLevelConfigs,
  createLevelConfig,
  updateLevelConfig,
  deleteLevelConfig,
  getDynamicUserLevel,
  calculateDynamicLevelFromList,
  syncAllUsersLevels,
  clearLevelConfigCache,
}

