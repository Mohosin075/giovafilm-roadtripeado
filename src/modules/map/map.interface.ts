import { Model, Types } from 'mongoose'

export interface IMap {
  _id: Types.ObjectId
  name: string
  description: string
  price: number
  image: string
  places: Types.ObjectId[] // Array of Place IDs
  status: 'Draft' | 'Published'
  isPaid: boolean
  createdAt: Date
  updatedAt: Date
}

export type MapModel = Model<IMap>
