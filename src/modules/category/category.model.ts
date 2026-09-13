import { Schema, model } from 'mongoose'
import { ICategory, CategoryModel } from './category.interface'

const CategorySchema = new Schema<ICategory, CategoryModel>(
  {
    name: { type: Schema.Types.Mixed, required: true },
    color: { type: String, required: true, trim: true },
    icon: { type: String,  trim: true },
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
