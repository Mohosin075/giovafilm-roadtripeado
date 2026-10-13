import { Model, Types } from 'mongoose'

export type IVisitedLocationType = 'Place' | 'Business'

export interface IVisited {
  _id: Types.ObjectId
  user: Types.ObjectId
  place?: Types.ObjectId
  business?: Types.ObjectId
  type: IVisitedLocationType
  visitedAt: Date
  createdAt: Date
  updatedAt: Date
}

export type VisitedModel = Model<IVisited>
