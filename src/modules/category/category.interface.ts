import { Model, Types } from 'mongoose'
import { I18nString } from '../../interfaces/i18n.interface'

export interface ICategory {
  _id: Types.ObjectId
  name: I18nString | string
  color: string
  icon: string
  status: 'Active' | 'Hidden'
  createdAt: Date
  updatedAt: Date
}

export type CategoryModel = Model<ICategory>
