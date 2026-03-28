"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const business_service_1 = require("./business.service");
const createBusiness = (0, catchAsync_1.default)(async (req, res) => {
    // Grab the user from the auth token
    const user = req.user;
    const businessData = {
        ...req.body,
        user: user === null || user === void 0 ? void 0 : user.authId,
    };
    const result = await business_service_1.BusinessService.createBusiness(businessData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Business created successfully and is pending approval',
        data: result,
    });
});
const getAllBusinesses = (0, catchAsync_1.default)(async (req, res) => {
    const result = await business_service_1.BusinessService.getAllBusinesses(req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Businesses retrieved successfully',
        meta: result.meta,
        data: result.data,
    });
});
const getBusinessById = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await business_service_1.BusinessService.getBusinessById(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Business retrieved successfully',
        data: result,
    });
});
const updateBusiness = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await business_service_1.BusinessService.updateBusiness(id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Business updated successfully',
        data: result,
    });
});
const updateBusinessStatus = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const result = await business_service_1.BusinessService.updateBusinessStatus(id, status);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: `Business status updated to ${status} successfully`,
        data: result,
    });
});
const deleteBusiness = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await business_service_1.BusinessService.deleteBusiness(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Business deleted successfully',
        data: result,
    });
});
exports.BusinessController = {
    createBusiness,
    getAllBusinesses,
    getBusinessById,
    updateBusiness,
    updateBusinessStatus,
    deleteBusiness,
};
