import { Schema, model } from 'mongoose'
import { IAward, AwardModel } from './award.interface'

const awardSchema = new Schema<IAward, AwardModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'Gourmet Guide',
        'Top Reviewer',
        'Trail Master',
        'History Buff',
        'Legendary Explorer',
      ],
      required: true,
    },
    progress: { type: Number, default: 0 },
    target: { type: Number, required: true },
    isUnlocked: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

export const Award = model<IAward, AwardModel>('Award', awardSchema)
