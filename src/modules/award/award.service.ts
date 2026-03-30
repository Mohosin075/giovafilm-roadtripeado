import { Types } from 'mongoose'
import { Award } from './award.model'
import { IAwardType } from './award.interface'

const getMyAwards = async (userId: string) => {
  const existingAwards = await Award.find({ userId })

  const defaultAwards: {
    type: IAwardType
    target: number
    progress: number
    isUnlocked: boolean
  }[] = [
    {
      type: 'Gourmet Guide',
      target: 2000,
      progress: 1458,
      isUnlocked: false,
    },
    {
      type: 'Top Reviewer',
      target: 1000,
      progress: 800,
      isUnlocked: false,
    },
    {
      type: 'Trail Master',
      target: 500,
      progress: 250,
      isUnlocked: false,
    },
    {
      type: 'History Buff',
      target: 1500,
      progress: 1200,
      isUnlocked: false,
    },
    {
      type: 'Legendary Explorer',
      target: 100,
      progress: 100,
      isUnlocked: true,
    },
  ]

  // If user doesn't have all default awards, initialize them
  for (const defaultAward of defaultAwards) {
    const found = existingAwards.find(a => a.type === defaultAward.type)
    if (!found) {
      await Award.create({
        userId,
        ...defaultAward,
      })
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

export const AwardServices = {
  getMyAwards,
  updateAwardProgress,
}
