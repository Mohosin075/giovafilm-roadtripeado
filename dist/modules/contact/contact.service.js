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
const createContact = async (payload) => {
    const result = await contact_model_1.Contact.create(payload);
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to create contact message');
    }
    // Send email to admin
    await emailHelper_1.emailHelper.sendEmail({
        to: config_1.default.email.user || '', // Admin email
        subject: `New Contact Message: ${payload.subject}`,
        html: `
      <p>You have received a new contact message:</p>
      <p><strong>Name:</strong> ${payload.name}</p>
      <p><strong>Email:</strong> ${payload.email}</p>
      <p><strong>Subject:</strong> ${payload.subject}</p>
      <p><strong>Message:</strong> ${payload.message}</p>
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
