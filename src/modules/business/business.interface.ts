import { Model, Types } from 'mongoose'

export type BusinessStatus = 'Pending' | 'Approved' | 'Rejected'
export type DaySchedule = {
  days: string
  openTime: string
  closeTime: string
}

export interface IBusiness {
  _id: Types.ObjectId
  user: Types.ObjectId // The user who submitted the business
  name: string
  category: Types.ObjectId // Ref to Category
  description: string
  contact: {
    phone: string
    website?: string
    instagram?: string
  }
  location: {
    address: string
    city: string
    country: string
    mapLocation: {
      type: 'Point'
      coordinates: [number, number] // [longitude, latitude]
    }
  }
  hours: {
    customHours: boolean
    schedule: DaySchedule[]
  }
  media: {
    photos: string[]
    menu?: string
  }
  privateInfo: {
    ownerPhone: string
    contactEmail: string
  }
  plan?: Types.ObjectId // Reference to SubscriptionPlan
  status: BusinessStatus
  isAccuracyVerified: boolean
  viewCount: number
  createdAt: Date
  updatedAt: Date
}

export type BusinessModel = Model<IBusiness>
