import { IContact } from './contact.interface'
import { Contact } from './contact.model'
import { emailHelper } from '../../helpers/emailHelper'
import config from '../../config'
import ApiError from '../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'
import { User } from '../user/user.model'

const createContact = async (payload: IContact): Promise<IContact> => {
  const result = await Contact.create(payload)
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create contact message',
    )
  }

  // Find admin user to send notification
  const admin = await User.findOne({ role: ['admin', 'super_admin'] })

  // Send email to admin
  await emailHelper.sendEmail({
    to: admin?.email || config.email.user || '', // Admin email
    subject: `New Contact Message: ${payload.subject}`,
    html: `
      <h1>New Contact Form Submission</h1>
      <p>You have received a new message from the contact form:</p>
      <ul>
        <li><strong>Name:</strong> ${payload.name}</li>
        <li><strong>Email:</strong> ${payload.email}</li>
        <li><strong>Phone:</strong> ${payload.phone}</li>
        <li><strong>Country:</strong> ${payload.country}</li>
        <li><strong>Subject:</strong> ${payload.subject}</li>
      </ul>
      <h2>Message:</h2>
      <p>${payload.message}</p>
      <p>You can respond directly to the sender by replying to: ${payload.email}</p>
    `,
  })

  // Send thank you email to user
  await emailHelper.sendEmail({
    to: payload.email,
    subject: `Thank you for contacting us: ${payload.subject}`,
    html: `
      <h1>Thank You for Contacting Us</h1>
      <p>Dear ${payload.name},</p>
      <p>We have received your message regarding "<strong>${payload.subject}</strong>" and will get back to you as soon as possible.</p>
      <p>Here's a copy of your message:</p>
      <p><em>${payload.message}</em></p>
      <p>Best regards,<br>The Team</p>
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
