"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactServices = void 0;
const contact_model_1 = require("./contact.model");
const emailHelper_1 = require("../../helpers/emailHelper");
const config_1 = __importDefault(require("../../config"));
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const user_model_1 = require("../user/user.model");
const createContact = async (payload) => {
    const result = await contact_model_1.Contact.create(payload);
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to create contact message');
    }
    // Find admin user to send notification
    const admin = await user_model_1.User.findOne({ role: ['admin', 'super_admin'] });
    // Send email to admin
    await emailHelper_1.emailHelper.sendEmail({
        to: (admin === null || admin === void 0 ? void 0 : admin.email) || config_1.default.email.user || '', // Admin email
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
    });
    // Send thank you email to user
    await emailHelper_1.emailHelper.sendEmail({
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
    });
    return result;
};
const getAllContacts = async () => {
    const result = await contact_model_1.Contact.find().sort({ createdAt: -1 });
    return result;
};
exports.ContactServices = {
    createContact,
    getAllContacts,
};
