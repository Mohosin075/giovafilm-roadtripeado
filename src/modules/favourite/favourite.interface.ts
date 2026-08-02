import { Model, Types } from 'mongoose'

export interface IFavourite {
  user: Types.ObjectId
  map?: Types.ObjectId
  place?: Types.ObjectId
  offer?: Types.ObjectId
  business?: Types.ObjectId
  type: 'Map' | 'Place' | 'Offer' | 'Business'
}

export type FavouriteModel = Model<IFavourite>
