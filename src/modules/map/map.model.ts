import { Schema, model } from 'mongoose'
import { IMap, MapModel } from './map.interface'

const MapSchema = new Schema<IMap, MapModel>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    images: [{ type: String, required: true }],
    features: [{ type: String, default: [] }],
    places: [{ type: Schema.Types.ObjectId, ref: 'Place' }],
    status: {
      type: String,
      enum: ['Draft', 'Published'],
      default: 'Draft',
    },
    isPaid: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    totalReview: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

export const Map = model<IMap, MapModel>('Map', MapSchema)
