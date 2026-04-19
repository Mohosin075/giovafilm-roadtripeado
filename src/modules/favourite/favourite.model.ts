import { Schema, model } from 'mongoose'
import { IFavourite, FavouriteModel } from './favourite.interface'

const FavouriteSchema = new Schema<IFavourite, FavouriteModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    map: {
      type: Schema.Types.ObjectId,
      ref: 'Map',
    },
    place: {
      type: Schema.Types.ObjectId,
      ref: 'Place',
    },
    offer: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
    },
    type: {
      type: String,
      enum: ['Map', 'Place', 'Offer'],
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Ensure uniqueness for user and map
FavouriteSchema.index({ map: 1 }, { unique: true, sparse: true })
// Ensure uniqueness for user and place
FavouriteSchema.index({ place: 1 }, { unique: true, sparse: true })
// Ensure uniqueness for user and offer
FavouriteSchema.index({ offer: 1 }, { unique: true, sparse: true })

export const Favourite = model<IFavourite, FavouriteModel>(
  'Favourite',
  FavouriteSchema
)
