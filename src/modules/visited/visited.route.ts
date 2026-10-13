import express from 'express'
import { VisitedController } from './visited.controller'
import validateRequest from '../../middleware/validateRequest'
import { toggleVisitedZodSchema } from './visited.validation'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../enum/user'

const router = express.Router()

router
  .route('/')
  .post(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(toggleVisitedZodSchema),
    VisitedController.toggleVisited,
  )

router.post(
  '/toggle',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(toggleVisitedZodSchema),
  VisitedController.toggleVisited,
)

router.get(
  '/my-places',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  VisitedController.getMyVisitedPlaces,
)

router.get(
  '/count',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  VisitedController.getVisitedCount,
)

router.delete(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  VisitedController.removeVisited,
)

export const VisitedRoutes = router
