import { Model, Types } from 'mongoose'
import { OFFER_STATUS, DISCOUNT_TYPE } from '../../enum/offer'

export interface IOffer {
  _id: Types.ObjectId
  title: string
  photo?: string
  place: Types.ObjectId // Ref Place
  description: string
  discountType: DISCOUNT_TYPE
  discountValue?: string | number
  validFrom?: Date
  validUntil?: Date
  redemptionRules?: string[]
  buttonLabel?: string
  status: OFFER_STATUS
  redemptionsCount: number // Default 0
  createdAt: Date
  updatedAt: Date
}

export type OfferModel = Model<IOffer>
