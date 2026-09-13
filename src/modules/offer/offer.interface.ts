import { Model, Types } from 'mongoose'
import { OFFER_STATUS, DISCOUNT_TYPE, BOGO_SECOND_TYPE } from '../../enum/offer'
import { TranslatableString } from '../../interfaces/i18n.interface'

export interface IOffer {
  _id: Types.ObjectId
  title: TranslatableString
  photo?: string
  place?: Types.ObjectId // Ref Place
  business?: Types.ObjectId // Ref Business
  description: TranslatableString
  discountType: DISCOUNT_TYPE
  discountValue?: string | number
  bogoSecondType?: BOGO_SECOND_TYPE
  validFrom?: Date
  validUntil?: Date
  noExpiration?: boolean
  maxRedemptions?: number // How many times a single user may redeem
  totalRedemptionLimit?: number // Optional cap across all users
  redemptionRules?: string[]
  buttonLabel?: TranslatableString
  redemptionDuration?: number // Duration in minutes, e.g., 15
  status: OFFER_STATUS
  redemptionsCount: number // Default 0
  createdAt: Date
  updatedAt: Date
}

export type OfferModel = Model<IOffer>
