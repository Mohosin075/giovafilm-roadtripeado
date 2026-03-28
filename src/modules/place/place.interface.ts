import { Model, Types } from 'mongoose'

export interface IPlace {
  _id: Types.ObjectId
  name: string
  category: Types.ObjectId // Ref Category
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
  status: 'Draft' | 'Published'
  createdAt: Date
  updatedAt: Date
}

export type PlaceModel = Model<IPlace>
