import { IContact } from './contact.interface'
import { Contact } from './contact.model'
import { emailHelper } from '../../helpers/emailHelper'
import config from '../../config'
import ApiError from '../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'

const createContact = async (payload: IContact): Promise<IContact> => {
  const result = await Contact.create(payload)
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create contact message')
  }

  // Send email to admin
  await emailHelper.sendEmail({
    to: config.email.user || '', // Admin email
    subject: `New Contact Message: ${payload.subject}`,
    html: `
      <p>You have received a new contact message:</p>
      <p><strong>Name:</strong> ${payload.name}</p>
      <p><strong>Email:</strong> ${payload.email}</p>
      <p><strong>Subject:</strong> ${payload.subject}</p>
      <p><strong>Message:</strong> ${payload.message}</p>
    `,
  })

  return result
}

const getAllContacts = async (): Promise<IContact[]> => {
  const result = await Contact.find().sort({ createdAt: -1 })
  return result
}

export const ContactServices = {
  createContact,
  getAllContacts,
}
