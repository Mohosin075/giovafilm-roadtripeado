import { Schema, model } from 'mongoose'
import { IOffer, OfferModel } from './offer.interface'

const OfferSchema = new Schema<IOffer, OfferModel>(
  {
    title: { type: String, required: true, trim: true },
    photo: { type: String },
    place: { type: Schema.Types.ObjectId, ref: 'Place', required: true },
    description: { type: String, required: true },
    discountType: { type: String, required: true },
    discountValue: { type: Schema.Types.Mixed }, // String or Number
    validFrom: { type: Date },
    validUntil: { type: Date },
    redemptionRules: { type: String },
    buttonLabel: { type: String, default: 'Redeem Offer' },
    status: {
      type: String,
      enum: ['Active', 'Expired', 'Paused'],
      default: 'Active',
    },
    redemptionsCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
)

export const Offer = model<IOffer, OfferModel>('Offer', OfferSchema)
