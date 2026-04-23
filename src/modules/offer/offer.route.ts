import express from 'express'
import { OfferController } from './offer.controller'
import validateRequest from '../../middleware/validateRequest'
import {
  createOfferZodSchema,
  updateOfferZodSchema,
} from './offer.validation'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../enum/user'
import { fileAndBodyProcessorUsingDiskStorage } from '../../middleware/processReqBody'

const router = express.Router()

router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(createOfferZodSchema),
    OfferController.createOffer,
  )
  .get(OfferController.getAllOffers)

router
  .route('/:id')
  .get(OfferController.getOfferById)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(updateOfferZodSchema),
    OfferController.updateOffer,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    OfferController.deleteOffer,
  )

router.post(
  '/:id/calculate',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.USER),
  OfferController.calculateDiscount,
)

router.post(
  '/:id/redeem',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.USER),
  OfferController.redeemOffer,
)

export const OfferRoutes = router
