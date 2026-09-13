import { Model, Types } from 'mongoose'
import { TranslatableString } from '../../interfaces/i18n.interface'

export interface IMap {
  _id: Types.ObjectId
  name: TranslatableString
  description: TranslatableString
  price: number
  images: string[] // Multiple images
  features: string[] // Key features list
  places: Types.ObjectId[] // Array of Place IDs
  country?: string // Country name
  status: 'Draft' | 'Published'
  isPaid: boolean
  rating: number // Optional rating field
  totalReview: number // Number of reviews
  viewCount: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type MapModel = Model<IMap>
