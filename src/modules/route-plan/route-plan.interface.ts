import { Model, Types } from 'mongoose'
import { IPlace } from '../place/place.interface'
import { IBusiness } from '../business/business.interface'

export interface IRouteStop {
  _id?: Types.ObjectId
  place?: Types.ObjectId | IPlace
  business?: Types.ObjectId | IBusiness
  type: 'Place' | 'Business'
  order: number
  note?: string
}

export interface IRoutePlan {
  _id: Types.ObjectId
  user: Types.ObjectId
  name: string
  description?: string
  stops: IRouteStop[]
  isPublic?: boolean
  createdAt: Date
  updatedAt: Date
}

export type RoutePlanModel = Model<IRoutePlan>
