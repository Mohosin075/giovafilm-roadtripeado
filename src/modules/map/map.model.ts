import { Schema, model } from 'mongoose'
import { IMap, MapModel } from './map.interface'

const MapSchema = new Schema<IMap, MapModel>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    image: { type: String, required: true },
    places: [{ type: Schema.Types.ObjectId, ref: 'Place' }],
    status: {
      type: String,
      enum: ['Draft', 'Published'],
      default: 'Draft',
    },
    isPaid: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

export const Map = model<IMap, MapModel>('Map', MapSchema)
