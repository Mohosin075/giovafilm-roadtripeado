import express from 'express'
import { RoutePlanController } from './route-plan.controller'
import validateRequest from '../../middleware/validateRequest'
import {
  createRoutePlanZodSchema,
  updateRoutePlanZodSchema,
  addStopZodSchema,
} from './route-plan.validation'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../enum/user'

const router = express.Router()

// All route-plan actions require authenticated user
const authMiddleware = auth(
  USER_ROLES.USER,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.MAP_EDITOR
)

router
  .route('/')
  .post(
    authMiddleware,
    validateRequest(createRoutePlanZodSchema),
    RoutePlanController.createRoutePlan
  )
  .get(authMiddleware, RoutePlanController.getMyRoutePlans)

router.route('/my-routes').get(authMiddleware, RoutePlanController.getMyRoutePlans)

router
  .route('/:id')
  .get(authMiddleware, RoutePlanController.getRoutePlanById)
  .patch(
    authMiddleware,
    validateRequest(updateRoutePlanZodSchema),
    RoutePlanController.updateRoutePlan
  )
  .delete(authMiddleware, RoutePlanController.deleteRoutePlan)

// Clear all stops in a route
router.route('/:id/clear').post(authMiddleware, RoutePlanController.clearRouteStops)

// Add a single stop or remove a specific stop
router
  .route('/:id/stops')
  .post(
    authMiddleware,
    validateRequest(addStopZodSchema),
    RoutePlanController.addStop
  )

router
  .route('/:id/stops/:stopId')
  .delete(authMiddleware, RoutePlanController.removeStop)

export const RoutePlanRoutes = router
