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
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const user_1 = require("../../enum/user");
const mapAccessHelper_1 = require("../../helpers/mapAccessHelper");
const isAdminRole = (role) => !!role && [user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN].includes(role);
const getBusinessOwnerId = (business) => {
    if (!(business === null || business === void 0 ? void 0 : business.user))
        return null;
    return (business.user._id || business.user).toString();
};
const stripPrivateInfo = (business) => {
    if (!business)
        return business;
    const obj = typeof business.toObject === 'function' ? business.toObject() : { ...business };
    delete obj.privateInfo;
    return obj;
};
/**
 * Controller to handle business creation requests.
 * Extracts user ID from the JWT payload and injects into business data.
 */
const createBusiness = (0, catchAsync_1.default)(async (req, res) => {
    // Grab the user from the auth token
    const user = req.user;
    const businessData = {
        ...req.body,
        user: user === null || user === void 0 ? void 0 : user.authId,
    };
    // Handle image upload from disk storage
    if (req.body.images) {
        if (!businessData.media)
            businessData.media = {};
        businessData.media.photos = Array.isArray(req.body.images)
            ? req.body.images
            : [req.body.images];
    }
    // Handle menu/document upload from disk storage
    if (req.body.documents) {
        if (!businessData.media)
            businessData.media = {};
        businessData.media.menu = Array.isArray(req.body.documents)
            ? req.body.documents[0]
            : req.body.documents;
    }
    const result = await business_service_1.BusinessService.createBusiness(businessData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Business created successfully and is pending approval',
        data: result,
    });
});
/**
 * Controller to retrieve a paginated listing of all businesses.
 */
const getAllBusinesses = (0, catchAsync_1.default)(async (req, res) => {
    const user = await (0, mapAccessHelper_1.getUserFromToken)(req.headers.authorization);
    const result = await business_service_1.BusinessService.getAllBusinesses(req.query);
    const data = result.data.map((biz) => {
        const ownerId = getBusinessOwnerId(biz);
        const canSeePrivate = isAdminRole(user === null || user === void 0 ? void 0 : user.role) || (user && ownerId === user._id.toString());
        return canSeePrivate ? biz : stripPrivateInfo(biz);
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Businesses retrieved successfully',
        meta: result.meta,
        data,
    });
});
/**
 * Controller to retrieve a paginated listing of businesses owned by the user.
 */
const getMyBusinesses = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    // Assuming the user's ID is at user.authId based on createBusiness
    const result = await business_service_1.BusinessService.getMyBusinesses(user.authId, req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'My businesses retrieved successfully',
        meta: result.meta,
        data: result.data,
    });
});
/**
 * Controller to retrieve single business detailed information by ID.
 */
const getBusinessById = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(req.headers.authorization);
    const result = await business_service_1.BusinessService.getBusinessById(id);
    const ownerId = getBusinessOwnerId(result);
    const canSeePrivate = isAdminRole(user === null || user === void 0 ? void 0 : user.role) || (user && ownerId === user._id.toString());
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Business retrieved successfully',
        data: canSeePrivate ? result : stripPrivateInfo(result),
    });
});
/**
 * Controller to update a business submission.
 */
const updateBusiness = (0, catchAsync_1.default)(async (req, res) => {
    var _a;
    const { id } = req.params;
    const authUser = req.user;
    const existing = await business_service_1.BusinessService.getBusinessById(id);
    if (!existing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Business not found');
    }
    const ownerId = getBusinessOwnerId(existing);
    const admin = isAdminRole(authUser === null || authUser === void 0 ? void 0 : authUser.role);
    if (!admin && ownerId !== ((_a = authUser === null || authUser === void 0 ? void 0 : authUser.authId) === null || _a === void 0 ? void 0 : _a.toString())) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to update this business');
    }
    const businessData = { ...req.body };
    // Users cannot self-approve or toggle subscription
    if (!admin) {
        delete businessData.status;
        delete businessData.hasActiveSubscription;
    }
    // Handle image upload from disk storage
    if (req.body.images) {
        if (!businessData.media)
            businessData.media = {};
        businessData.media.photos = Array.isArray(req.body.images)
            ? req.body.images
            : [req.body.images];
    }
    // Handle menu/document upload from disk storage
    if (req.body.documents) {
        if (!businessData.media)
            businessData.media = {};
        businessData.media.menu = Array.isArray(req.body.documents)
            ? req.body.documents[0]
            : req.body.documents;
    }
    const result = await business_service_1.BusinessService.updateBusiness(id, businessData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Business updated successfully',
        data: result,
    });
});
/**
 * Controller strictly for administrative actions to alter the business status state machine.
 */
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
/**
 * Controller to handle permanent deletion of a business.
 */
const deleteBusiness = (0, catchAsync_1.default)(async (req, res) => {
    var _a;
    const { id } = req.params;
    const authUser = req.user;
    const existing = await business_service_1.BusinessService.getBusinessById(id);
    if (!existing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Business not found');
    }
    const ownerId = getBusinessOwnerId(existing);
    const admin = isAdminRole(authUser === null || authUser === void 0 ? void 0 : authUser.role);
    if (!admin && ownerId !== ((_a = authUser === null || authUser === void 0 ? void 0 : authUser.authId) === null || _a === void 0 ? void 0 : _a.toString())) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to delete this business');
    }
    const result = await business_service_1.BusinessService.deleteBusiness(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Business deleted successfully',
        data: result,
    });
});
const getBusinessStats = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await business_service_1.BusinessService.getBusinessStats(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Business stats retrieved successfully',
        data: result,
    });
});
const incrementViewCount = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await business_service_1.BusinessService.incrementViewCount(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'View count incremented successfully',
        data: result,
    });
});
exports.BusinessController = {
    createBusiness,
    getAllBusinesses,
    getMyBusinesses,
    getBusinessById,
    updateBusiness,
    updateBusinessStatus,
    deleteBusiness,
    getBusinessStats,
    incrementViewCount,
};
