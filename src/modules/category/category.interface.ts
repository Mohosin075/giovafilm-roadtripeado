import { Model, Types } from 'mongoose'

export interface ICategory {
  _id: Types.ObjectId
  name: string
  color: string
  icon: string
  status: 'Active' | 'Hidden'
  createdAt: Date
  updatedAt: Date
}

export type CategoryModel = Model<ICategory>
