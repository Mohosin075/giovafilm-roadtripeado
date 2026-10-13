import express from 'express'
import { PlaceController } from './place.controller'
import validateRequest from '../../middleware/validateRequest'
import {
  createPlaceZodSchema,
  updatePlaceZodSchema,
  recommendPlaceZodSchema,
  reviewPlaceZodSchema,
} from './place.validation'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../enum/user'
import { fileAndBodyProcessorUsingDiskStorage } from '../../middleware/processReqBody'

const router = express.Router()

router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MAP_EDITOR),
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(createPlaceZodSchema),
    PlaceController.createPlace,
  )
  .get(PlaceController.getAllPlaces)

router.post(
  '/extract-coordinates',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MAP_EDITOR, USER_ROLES.USER),
  PlaceController.extractCoordinates,
)

router.post(
  '/recommend',
  auth(),
  fileAndBodyProcessorUsingDiskStorage(),
  validateRequest(recommendPlaceZodSchema),
  PlaceController.recommendPlace,
)

router.get(
  '/my-recommendations',
  auth(),
  PlaceController.getMyRecommendations,
)

router.patch(
  '/:id/review',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MAP_EDITOR),
  validateRequest(reviewPlaceZodSchema),
  PlaceController.reviewRecommendedPlace,
)

router.post('/:id/view', PlaceController.incrementOpenCount)

router
  .route('/:id')
  .get(PlaceController.getPlaceById)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MAP_EDITOR),
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(updatePlaceZodSchema),
    PlaceController.updatePlace,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    PlaceController.deletePlace,
  )

export const PlaceRoutes = router
