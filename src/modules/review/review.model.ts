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
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    isVerified: { type: Boolean, default: false },
    pointsEarned: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
)

reviewSchema.index({ placeId: 1 })           // get reviews by place
reviewSchema.index({ reviewer: 1 })          // get my reviews
reviewSchema.index({ placeId: 1, reviewer: 1 }) // check duplicate review
reviewSchema.index({ status: 1 })            // filter by status

export const Review = model<IReview, ReviewModel>('Review', reviewSchema)
