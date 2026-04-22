import express from 'express'
import { ReviewController } from './review.controller'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../enum/user'
import validateRequest from '../../middleware/validateRequest'
import { createReviewSchema, updateReviewSchema } from './review.validation'

const router = express.Router()

router
  .route('/')
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    ReviewController.getAllReviews,
  )
  .post(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(createReviewSchema),
    ReviewController.createReview,
  )

router.get(
  '/my-reviews',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReviewController.getMyReviews,
)

router
  .route('/:placeId/place')
  .get(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    ReviewController.getReviewsByPlace,
  )

router
  .route('/:id')
  .get(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    ReviewController.getSingleReview,
  )
  .patch(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(updateReviewSchema),
    ReviewController.updateReview,
  )
  .delete(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    ReviewController.deleteReview,
  )

export const ReviewRoutes = router
