import express from 'express'
import { FavouriteController } from './favourite.controller'
import validateRequest from '../../middleware/validateRequest'
import { toggleFavouriteZodSchema } from './favourite.validation'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../enum/user'

const router = express.Router()

router
  .route('/')
  .post(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(toggleFavouriteZodSchema),
    FavouriteController.toggleFavourite,
  )
  .get(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    FavouriteController.getMyFavourites,
  )

router
  .route('/:id')
  .delete(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    FavouriteController.removeFavourite,
  )

export const FavouriteRoutes = router
