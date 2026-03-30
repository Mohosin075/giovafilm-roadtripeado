import { Schema, model } from 'mongoose'
import { IReview, ReviewModel } from './review.interface'

const reviewSchema = new Schema<IReview, ReviewModel>(
  {
    placeId: { type: Schema.Types.ObjectId, ref: 'Place', required: true },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true },
    media: { type: [String], default: [] },
  },
  {
    timestamps: true,
  },
)

export const Review = model<IReview, ReviewModel>('Review', reviewSchema)
