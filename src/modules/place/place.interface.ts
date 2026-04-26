import { Model, Types } from 'mongoose'

export interface IPlace {
  _id: Types.ObjectId
  name: string
  map: Types.ObjectId // Ref Map
  category: Types.ObjectId // Ref Category
  country?: string // Country name
  description: string
  media: string[]
  address: string
  location: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
  }
  access?: string
  accessibility?: {
    features: string[]
    notes?: string
  }
  recommendations?: {
    tips?: string
  }
  services?: string[]
  schedules?: string
  entryCost?: string
  difficulty?: 'Easy' | 'Moderate' | 'Hard'
  hikeTime?: string
  atmosphere?: string
  status: 'Draft' | 'Published'
  rating?: number
  totalReview?: number
  openCount: number
  createdAt: Date
  updatedAt: Date
}

export type PlaceModel = Model<IPlace>
