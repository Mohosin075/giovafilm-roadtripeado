import express from 'express'
import { ContactController } from './contact.controller'
import validateRequest from '../../middleware/validateRequest'
import { createContactSchema } from './contact.validation'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../enum/user'

const router = express.Router()

router.post(
  '/',
  validateRequest(createContactSchema),
  ContactController.createContact,
)

router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  ContactController.getAllContacts,
)

export const ContactRoutes = router
