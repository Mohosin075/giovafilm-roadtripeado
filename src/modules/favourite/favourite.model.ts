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


export const Favourite = model<IFavourite, FavouriteModel>(
  'Favourite',
  FavouriteSchema
)
