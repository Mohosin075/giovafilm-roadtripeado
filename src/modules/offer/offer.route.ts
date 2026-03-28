import express from 'express'
import { OfferController } from './offer.controller'
import validateRequest from '../../middleware/validateRequest'
import {
  createOfferZodSchema,
  updateOfferZodSchema,
} from './offer.validation'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../enum/user'

const router = express.Router()

router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(createOfferZodSchema),
    OfferController.createOffer,
  )
  .get(OfferController.getAllOffers)

router
  .route('/:id')
  .get(OfferController.getOfferById)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(updateOfferZodSchema),
    OfferController.updateOffer,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    OfferController.deleteOffer,
  )

export const OfferRoutes = router
