import { Model, Types } from 'mongoose'

export interface IMap {
  _id: Types.ObjectId
  name: string
  description: string
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
  createdAt: Date
  updatedAt: Date
}

export type MapModel = Model<IMap>
