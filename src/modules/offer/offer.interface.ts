import { Model, Types } from 'mongoose'
import { OFFER_STATUS, DISCOUNT_TYPE, BOGO_SECOND_TYPE } from '../../enum/offer'

export interface IOffer {
  _id: Types.ObjectId
  title: string
  photo?: string
  place?: Types.ObjectId // Ref Place
  business?: Types.ObjectId // Ref Business
  description: string
  discountType: DISCOUNT_TYPE
  discountValue?: string | number
  bogoSecondType?: BOGO_SECOND_TYPE
  validFrom?: Date
  validUntil?: Date
  noExpiration?: boolean
  maxRedemptions?: number // How many times a single user may redeem
  totalRedemptionLimit?: number // Optional cap across all users
  redemptionRules?: string[]
  buttonLabel?: string
  redemptionDuration?: number // Duration in minutes, e.g., 15
  status: OFFER_STATUS
  redemptionsCount: number // Default 0
  createdAt: Date
  updatedAt: Date
}

export type OfferModel = Model<IOffer>
