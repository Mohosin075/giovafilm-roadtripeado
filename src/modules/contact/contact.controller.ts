import { Request, Response } from 'express'
import { ContactServices } from './contact.service'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { StatusCodes } from 'http-status-codes'

const createContact = catchAsync(async (req: Request, res: Response) => {
  const contactData = req.body

  const result = await ContactServices.createContact(contactData)

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Message sent successfully. We will get back to you soon!',
    data: result,
  })
})

const getAllContacts = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactServices.getAllContacts()

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Contact messages retrieved successfully',
    data: result,
  })
})

export const ContactController = {
  createContact,
  getAllContacts,
}
