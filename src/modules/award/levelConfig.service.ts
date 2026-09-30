import { Types } from 'mongoose'
import { LevelConfig } from './levelConfig.model'
import { ILevelConfig } from './levelConfig.interface'
import { USER_LEVELS } from '../../constants/userLevels.constant'
import { autoTranslateField } from '../../utils/autoTranslate'


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
  await seedLevelConfigs()
  return await LevelConfig.find({}).sort({ level: 1 })
}

const processLevelTranslations = async (payload: Partial<ILevelConfig>) => {
  if (payload.name) payload.name = await autoTranslateField(payload.name)
  if (payload.description) payload.description = await autoTranslateField(payload.description)
}

const createLevelConfig = async (payload: ILevelConfig): Promise<ILevelConfig> => {
  await processLevelTranslations(payload)
  return await LevelConfig.create(payload)
}

const updateLevelConfig = async (
  id: string,
  payload: Partial<ILevelConfig>
): Promise<ILevelConfig | null> => {
  await processLevelTranslations(payload)
  if (Types.ObjectId.isValid(id)) {
    return await LevelConfig.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
  }
  return await LevelConfig.findOneAndUpdate({ level: Number(id) }, payload, {
    new: true,
    upsert: true,
    runValidators: true,
  })
}

const deleteLevelConfig = async (id: string): Promise<ILevelConfig | null> => {
  if (Types.ObjectId.isValid(id)) {
    return await LevelConfig.findByIdAndDelete(id)
  }
  return await LevelConfig.findOneAndDelete({ level: Number(id) })
}


export const LevelConfigServices = {
  seedLevelConfigs,
  getAllLevelConfigs,
  createLevelConfig,
  updateLevelConfig,
  deleteLevelConfig,
}
