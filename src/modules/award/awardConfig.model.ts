import { Schema, model } from 'mongoose'
import { IAwardConfig, AwardConfigModel } from './awardConfig.interface'

const AwardConfigSchema = new Schema<IAwardConfig, AwardConfigModel>(
  {
    type: {
      type: String,
      enum: [
        'PDF Itinerary',
        'Free Map',
        'Gourmet Guide',
        'Top Reviewer',
        'Trail Master',
        'History Buff',
        'Legendary Explorer',
        'Exclusive Discount',
        'Permanent Discount',
      ],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    coverPhoto: { type: String },
    target: { type: Number, required: true },
    fileUrl: { type: String },
    mapId: { type: Schema.Types.ObjectId, ref: 'Map' },
  },
  {
    timestamps: true,
  }
)

export const AwardConfig = model<IAwardConfig, AwardConfigModel>('AwardConfig', AwardConfigSchema)
