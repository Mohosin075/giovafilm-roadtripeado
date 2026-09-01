import { Schema, model } from 'mongoose'
import { IPromoLink, PromoLinkModel } from './promo.interface'

const promoLinkSchema = new Schema<IPromoLink, PromoLinkModel>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    mapId: {
      type: Schema.Types.ObjectId,
      ref: 'Map',
      default: null,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    promoType: {
      type: String,
      enum: ['influencer', 'upgrade', 'custom'],
      required: true,
      default: 'upgrade',
      index: true,
    },
    label: {
      type: String,
      required: true,
    },
    recipientEmail: {
      type: String,
      default: null,
      index: true,
    },
    isEmailSent: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    usedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

export const PromoLink = model<IPromoLink, PromoLinkModel>(
  'PromoLink',
  promoLinkSchema,
)
