import { Schema, model } from 'mongoose'
import { ICategory, CategoryModel } from './category.interface'

const CategorySchema = new Schema<ICategory, CategoryModel>(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    icon: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Active', 'Hidden'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
)

export const Category = model<ICategory, CategoryModel>('Category', CategorySchema)
