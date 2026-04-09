import express from 'express'
import { USER_ROLES } from '../../enum/user'
import auth from '../../middleware/auth'
import { StatsController } from './stats.controller'

const router = express.Router()

router.get(
  '/dashboard',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  StatsController.getDashboardData,
)

export const StatsRoutes = router
