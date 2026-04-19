import { Model, Types } from 'mongoose'

export interface IFavourite {
  user: Types.ObjectId
  map?: Types.ObjectId
  place?: Types.ObjectId
  offer?: Types.ObjectId
  type: 'Map' | 'Place' | 'Offer'
}

export type FavouriteModel = Model<IFavourite>
