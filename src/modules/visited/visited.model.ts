import { Schema, model } from 'mongoose'
import { IVisited, VisitedModel } from './visited.interface'

const VisitedSchema = new Schema<IVisited, VisitedModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    place: {
      type: Schema.Types.ObjectId,
      ref: 'Place',
    },
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
    },
    type: {
      type: String,
      enum: ['Place', 'Business'],
      default: 'Place',
      required: true,
    },
    visitedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

VisitedSchema.index({ user: 1, visitedAt: -1 })
VisitedSchema.index({ user: 1, place: 1 })
VisitedSchema.index({ user: 1, business: 1 })
VisitedSchema.index({ user: 1, type: 1 })

export const Visited = model<IVisited, VisitedModel>('Visited', VisitedSchema)
