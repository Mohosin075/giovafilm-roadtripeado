import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { CategoryService } from './category.service'

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const categoryData = { ...req.body }

  // Backward compatibility: support existing "images" field.
  if (req.body.images) {
    categoryData.icon = Array.isArray(req.body.images)
      ? req.body.images[0]
      : req.body.images
  }
  if (req.body.icon) {
    categoryData.icon = Array.isArray(req.body.icon)
      ? req.body.icon[0]
      : req.body.icon
  }

  const result = await CategoryService.createCategory(categoryData)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Category created successfully',
    data: result,
  })
})

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getAllCategories(req.query)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Categories retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await CategoryService.getCategoryById(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Category retrieved successfully',
    data: result,
  })
})

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const categoryData = { ...req.body }

  // Backward compatibility: support existing "images" field.
  if (req.body.images) {
    categoryData.icon = Array.isArray(req.body.images)
      ? req.body.images[0]
      : req.body.images
  }
  if (req.body.icon) {
    categoryData.icon = Array.isArray(req.body.icon)
      ? req.body.icon[0]
      : req.body.icon
  }

  const result = await CategoryService.updateCategory(id, categoryData)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Category updated successfully',
    data: result,
  })
})

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await CategoryService.deleteCategory(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Category deleted successfully',
    data: result,
  })
})

export const CategoryController = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
}
