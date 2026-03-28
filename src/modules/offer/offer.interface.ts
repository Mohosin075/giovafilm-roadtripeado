import { Model, Types } from 'mongoose'

export interface IOffer {
  _id: Types.ObjectId
  title: string
  photo?: string
  place: Types.ObjectId // Ref Place
  description: string
  discountType: string // e.g., '% off', '$ off', 'Free item', 'BOGO'
  discountValue?: string | number
  validFrom?: Date
  validUntil?: Date
  redemptionRules?: string
  buttonLabel?: string
  status: 'Active' | 'Expired' | 'Paused'
  redemptionsCount: number // Default 0
  createdAt: Date
  updatedAt: Date
}

export type OfferModel = Model<IOffer>
