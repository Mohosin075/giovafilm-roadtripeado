"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactController = void 0;
const contact_service_1 = require("./contact.service");
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const createContact = (0, catchAsync_1.default)(async (req, res) => {
    const contactData = req.body;
    const result = await contact_service_1.ContactServices.createContact(contactData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Message sent successfully. We will get back to you soon!',
        data: result,
    });
});
const getAllContacts = (0, catchAsync_1.default)(async (req, res) => {
    const result = await contact_service_1.ContactServices.getAllContacts();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Contact messages retrieved successfully',
        data: result,
    });
});
exports.ContactController = {
    createContact,
    getAllContacts,
};
