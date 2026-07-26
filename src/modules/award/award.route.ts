import express from 'express'
import { AwardController } from './award.controller'
import { AwardConfigController } from './awardConfig.controller'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../enum/user'
import { fileAndBodyProcessorUsingDiskStorage } from '../../middleware/processReqBody'

const router = express.Router()

router.get(
  '/my-awards',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AwardController.getMyAwards,
)

router.post(
  '/redeem-free-map',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AwardController.redeemFreeMap,
)

router.get(
  '/configs',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AwardConfigController.getAllAwardConfigs,
)

router.patch(
  '/configs/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  fileAndBodyProcessorUsingDiskStorage(),
  AwardConfigController.updateAwardConfig,
)

export const AwardRoutes = router
