import { Schema, model } from 'mongoose'
import { IRoutePlan, IRouteStop, RoutePlanModel } from './route-plan.interface'

const RouteStopSchema = new Schema<IRouteStop>(
  {
    place: {
      type: Schema.Types.ObjectId,
      ref: 'Place',
      default: null,
    },
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
    },
    type: {
      type: String,
      enum: ['Place', 'Business'],
      default: 'Place',
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
)

const RoutePlanSchema = new Schema<IRoutePlan, RoutePlanModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Mi Roadtrip',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    stops: {
      type: [RouteStopSchema],
      default: [],
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

// Index for efficient user queries
RoutePlanSchema.index({ user: 1, updatedAt: -1 })

export const RoutePlan = model<IRoutePlan, RoutePlanModel>('RoutePlan', RoutePlanSchema)
