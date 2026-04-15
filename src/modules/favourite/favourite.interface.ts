import { Model, Types } from 'mongoose'

export interface IFavourite {
  user: Types.ObjectId
  map?: Types.ObjectId
  place?: Types.ObjectId
  type: 'Map' | 'Place'
}

export type FavouriteModel = Model<IFavourite>
