import express from 'express'
import { AwardController } from './award.controller'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../enum/user'

const router = express.Router()

router.get(
  '/my-awards',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AwardController.getMyAwards,
)

export const AwardRoutes = router
