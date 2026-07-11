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


FavouriteSchema.index({ user: 1 })             // get user's favourites
FavouriteSchema.index({ user: 1, type: 1 })    // filter by type
FavouriteSchema.index({ user: 1, map: 1 })     // check if map is favourited
FavouriteSchema.index({ user: 1, place: 1 })   // check if place is favourited
FavouriteSchema.index({ user: 1, offer: 1 })   // check if offer is favourited

export const Favourite = model<IFavourite, FavouriteModel>(
  'Favourite',
  FavouriteSchema
)
