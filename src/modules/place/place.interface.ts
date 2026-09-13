import { Model, Types } from 'mongoose'
import { TranslatableString } from '../../interfaces/i18n.interface'

export interface IPlace {
  _id: Types.ObjectId
  name: TranslatableString
  map: Types.ObjectId // Ref Map
  category: Types.ObjectId // Ref Category
  type: 'Business' | 'Regular'
  country?: string // Country name
  description: TranslatableString
  media: string[]
  menuImages?: string[]
  address: string
  location: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
  }
  access?: TranslatableString
  accessibility?: {
    features: string[]
    notes?: TranslatableString
  }
  recommendations?: {
    tips?: TranslatableString
  }
  services?: string[]
  schedules?: string
  operatingHours?: Record<string, { open: string; close: string; closed: boolean }>
  phone?: string
  website?: string
  instagram?: string
  entryCost?: TranslatableString
  difficulty?: 'Easy' | 'Moderate' | 'Hard'
  hikeTime?: TranslatableString
  atmosphere?: TranslatableString
  status: 'Draft' | 'Published'
  rating?: number
  totalReview?: number
  openCount: number
  createdAt: Date
  updatedAt: Date
}

export type PlaceModel = Model<IPlace>
