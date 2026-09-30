import { Schema, model } from 'mongoose'
import { ILevelConfig, LevelConfigModel } from './levelConfig.interface'

const LevelConfigSchema = new Schema<ILevelConfig, LevelConfigModel>(
  {
    level: { type: Number, required: true, unique: true },
    name: { type: Schema.Types.Mixed, required: true },
    points: { type: Number, required: true, default: 0 },
    reviews: { type: Number, required: true, default: 0 },
    badgeUrl: { type: String },
    description: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
)

export const LevelConfig = model<ILevelConfig, LevelConfigModel>(
  'LevelConfig',
  LevelConfigSchema
)
