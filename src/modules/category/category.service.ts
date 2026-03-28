import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { ICategory } from './category.interface'
import { Category } from './category.model'

const createCategory = async (payload: ICategory): Promise<ICategory> => {
  const isExist = await Category.findOne({ name: payload.name })
  if (isExist) {
    throw new ApiError(StatusCodes.CONFLICT, 'Category already exists')
  }
  const result = await Category.create(payload)
  return result
}

const getAllCategories = async (): Promise<ICategory[]> => {
  const result = await Category.find()
  return result
}

const getCategoryById = async (id: string): Promise<ICategory | null> => {
  const result = await Category.findById(id)
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found')
  }
  return result
}

const updateCategory = async (
  id: string,
  payload: Partial<ICategory>,
): Promise<ICategory | null> => {
  const isExist = await Category.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found')
  }

  const result = await Category.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })
  return result
}

const deleteCategory = async (id: string): Promise<ICategory | null> => {
  const isExist = await Category.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found')
  }
  const result = await Category.findByIdAndDelete(id)
  return result
}

export const CategoryService = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
}
