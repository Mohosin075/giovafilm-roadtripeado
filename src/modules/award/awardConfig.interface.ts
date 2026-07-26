import { Model, Types } from 'mongoose'
import { IAwardType } from './award.interface'

export interface IAwardConfig {
  _id: Types.ObjectId
  type: IAwardType
  title: string
  description: string
  coverPhoto?: string
  target: number
  fileUrl?: string
  mapId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export type AwardConfigModel = Model<IAwardConfig>
