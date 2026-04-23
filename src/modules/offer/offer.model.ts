import { Schema, model } from 'mongoose'
import { IOffer, OfferModel } from './offer.interface'
import { OFFER_STATUS, DISCOUNT_TYPE } from '../../enum/offer'

const OfferSchema = new Schema<IOffer, OfferModel>(
  {
    title: { type: String, required: true, trim: true },
    photo: { type: String },
    place: { type: Schema.Types.ObjectId, ref: 'Place' },
    business: { type: Schema.Types.ObjectId, ref: 'Business' },
    description: { type: String, required: true },
    discountType: {
      type: String,
      enum: Object.values(DISCOUNT_TYPE),
      required: true,
    },
    discountValue: { type: Schema.Types.Mixed }, // String or Number
    validFrom: { type: Date },
    validUntil: { type: Date },
    redemptionRules: { type: [String], default: [] },
    buttonLabel: { type: String, default: 'Redeem Offer' },
    redemptionDuration: { type: Number, default: 5 }, // Default to 5 minutes
    status: {
      type: String,
      enum: Object.values(OFFER_STATUS),
      default: OFFER_STATUS.ACTIVE,
    },
    redemptionsCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
)

export const Offer = model<IOffer, OfferModel>('Offer', OfferSchema)
