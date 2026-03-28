import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { ICategory } from './category.interface'
import { Category } from './category.model'
import QueryBuilder from '../../builder/QueryBuilder'
import { categorySearchableFields } from './category.constants'

const createCategory = async (payload: ICategory): Promise<ICategory> => {
  const isExist = await Category.findOne({ name: payload.name })
  if (isExist) {
    throw new ApiError(StatusCodes.CONFLICT, 'Category already exists')
  }
  const result = await Category.create(payload)
  return result
}

const getAllCategories = async (query: Record<string, unknown>) => {
  const categoryQuery = new QueryBuilder(Category.find(), query)
    .search(categorySearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields()

  const result = await categoryQuery.modelQuery
  const meta = await categoryQuery.getPaginationInfo()

  return {
    meta,
    data: result,
  }
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
