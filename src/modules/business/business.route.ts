import express from 'express'
import { BusinessController } from './business.controller'
import validateRequest from '../../middleware/validateRequest'
import {
  createBusinessZodSchema,
  updateBusinessZodSchema,
  updateBusinessStatusZodSchema,
} from './business.validation'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../enum/user'
import { fileAndBodyProcessorUsingDiskStorage } from '../../middleware/processReqBody'

const router = express.Router()

// User submitting a business (pending by default)
router
  .route('/')
  .post(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(createBusinessZodSchema),
    BusinessController.createBusiness
  )
  .get(BusinessController.getAllBusinesses)

// Route to get my businesses
router.get(
  '/my-business',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  BusinessController.getMyBusinesses
)

router
  .route('/:id')
  .get(BusinessController.getBusinessById)
  // Only admin/super_admin or the owner should update, but for simplicity auth is USER
  .patch(
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileAndBodyProcessorUsingDiskStorage(),
    validateRequest(updateBusinessZodSchema),
    BusinessController.updateBusiness
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), // Only admins can delete a business
    BusinessController.deleteBusiness
  )

// Admin route to approve/reject
router.patch(
  '/:id/status',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(updateBusinessStatusZodSchema),
  BusinessController.updateBusinessStatus,
)

router.get('/:id/stats', BusinessController.getBusinessStats)
router.post('/:id/view', BusinessController.incrementViewCount)

export const BusinessRoutes = router
