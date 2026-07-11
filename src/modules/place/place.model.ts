import { Schema, model } from 'mongoose'
import { IPlace, PlaceModel } from './place.interface'
import { placeDifficulty } from './place.constants'

const PlaceSchema = new Schema<IPlace, PlaceModel>(
  {
    name: { type: String, required: true, trim: true },
    map: { type: Schema.Types.ObjectId, ref: 'Map', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    type: {
      type: String,
      enum: ['Business', 'Regular'],
      default: 'Regular',
    },
    country: { type: String, required: true },
    description: { type: String, required: true },
    media: { type: [String], default: [] },
    address: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    access: { type: String },
    accessibility: {
      features: { type: [String], default: [] },
      notes: { type: String },
    },
    recommendations: {
      tips: { type: String },
    },
    services: { type: [String], default: [] },
    schedules: { type: String },
    entryCost: { type: String },
    difficulty: {
      type: String,
      enum: placeDifficulty,
      default: 'Easy',
      set: (v: string) => (v === '' ? undefined : v),
    },
    hikeTime: { type: String },
    atmosphere: { type: String },
    status: {
      type: String,
      enum: ['Draft', 'Published'],
      default: 'Draft',
    },
    rating: { type: Number, default: 0 },
    totalReview: { type: Number, default: 0 },
    openCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

PlaceSchema.index({ location: '2dsphere' }) // important for geo queries!
PlaceSchema.index({ map: 1, status: 1 })    // most common filter: map + status
PlaceSchema.index({ category: 1 })          // category filter
PlaceSchema.index({ status: 1 })            // status filter alone
PlaceSchema.index({ country: 1 })           // country filter
PlaceSchema.index(                           // text search on searchable fields
  { name: 'text', description: 'text', address: 'text', country: 'text' },
  { weights: { name: 10, address: 5, description: 2, country: 1 } }
)

export const Place = model<IPlace, PlaceModel>('Place', PlaceSchema)
