import { Model, Types } from 'mongoose'
import { IAwardType } from './award.interface'
import { TranslatableString } from '../../interfaces/i18n.interface'

export interface IAwardConfig {
  _id: Types.ObjectId
  type: IAwardType
  title: TranslatableString
  description: TranslatableString
  coverPhoto?: string
  target: number
  fileUrl?: string
  mapId?: Types.ObjectId
  discountPercentage?: number
  createdAt: Date
  updatedAt: Date
}

export type AwardConfigModel = Model<IAwardConfig>
