import express from 'express'
import { CategoryController } from './category.controller'
import validateRequest from '../../middleware/validateRequest'
import {
  createCategoryZodSchema,
  updateCategoryZodSchema,
} from './category.validation'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../enum/user'
import { fileAndBodyProcessorUsingDiskStorage } from '../../middleware/processReqBody'

const router = express.Router()

router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(createCategoryZodSchema),
    CategoryController.createCategory,
  )
  .get(CategoryController.getAllCategories)

router
  .route('/:id')
  .get(CategoryController.getCategoryById)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(updateCategoryZodSchema),
    CategoryController.updateCategory,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    CategoryController.deleteCategory,
  )

export const CategoryRoutes = router
