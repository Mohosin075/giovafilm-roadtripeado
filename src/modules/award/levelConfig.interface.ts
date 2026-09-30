import { Model, Types } from 'mongoose'
import { TranslatableString } from '../../interfaces/i18n.interface'

export interface ILevelConfig {
  _id?: Types.ObjectId
  level: number
  name: TranslatableString
  points: number
  reviews: number
  badgeUrl?: string
  description?: TranslatableString
  createdAt?: Date
  updatedAt?: Date
}

export type LevelConfigModel = Model<ILevelConfig>
