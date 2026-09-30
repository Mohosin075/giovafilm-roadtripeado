import express from 'express'
import { AwardController } from './award.controller'
import { AwardConfigController } from './awardConfig.controller'
import { LevelConfigController } from './levelConfig.controller'
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

router
  .route('/levels')
  .get(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    LevelConfigController.getAllLevelConfigs,
  )
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    LevelConfigController.createLevelConfig,
  )

router
  .route('/levels/:id')
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    LevelConfigController.updateLevelConfig,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    LevelConfigController.deleteLevelConfig,
  )

router
  .route('/configs')
  .get(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    AwardConfigController.getAllAwardConfigs,
  )
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    AwardConfigController.createAwardConfig,
  )

router.get(
  '/configs/:id/download',
  AwardConfigController.downloadAwardPdf,
)

router
  .route('/configs/:id')
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    AwardConfigController.updateAwardConfig,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    AwardConfigController.deleteAwardConfig,
  )

export const AwardRoutes = router

