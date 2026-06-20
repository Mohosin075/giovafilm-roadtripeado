"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const map_service_1 = require("./map.service");
const jwtHelper_1 = require("../../helpers/jwtHelper");
const config_1 = __importDefault(require("../../config"));
const user_1 = require("../../enum/user");
const createMap = (0, catchAsync_1.default)(async (req, res) => {
    const result = await map_service_1.MapService.createMap(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Map created successfully',
        data: result,
    });
});
const getAllMaps = (0, catchAsync_1.default)(async (req, res) => {
    const tokenWithBearer = req.headers.authorization;
    let isAdmin = false;
    if (tokenWithBearer && tokenWithBearer.startsWith('Bearer')) {
        const token = tokenWithBearer.split(' ')[1];
        try {
            const verifyUser = jwtHelper_1.jwtHelper.verifyToken(token, config_1.default.jwt.jwt_secret);
            if (verifyUser.role === user_1.USER_ROLES.ADMIN ||
                verifyUser.role === user_1.USER_ROLES.SUPER_ADMIN) {
                isAdmin = true;
            }
        }
        catch (error) {
            // Ignore token verification errors for public route
        }
    }
    const query = { ...req.query };
    if (!isAdmin) {
        query.isActive = 'true';
    }
    const result = await map_service_1.MapService.getAllMaps(query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Maps retrieved successfully',
        meta: result.meta,
        data: result.data,
    });
});
const getMapById = (0, catchAsync_1.default)(async (req, res) => {
    const result = await map_service_1.MapService.getMapById(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Map retrieved successfully',
        data: result,
    });
});
const updateMap = (0, catchAsync_1.default)(async (req, res) => {
    const result = await map_service_1.MapService.updateMap(req.params.id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Map updated successfully',
        data: result,
    });
});
const deleteMap = (0, catchAsync_1.default)(async (req, res) => {
    const result = await map_service_1.MapService.deleteMap(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Map deleted successfully',
        data: result,
    });
});
const purchaseMap = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const result = await map_service_1.MapService.purchaseMap(user.authId, req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Map purchased successfully',
        data: result,
    });
});
const getPurchasedMaps = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const result = await map_service_1.MapService.getPurchasedMaps(user.authId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Purchased maps retrieved successfully',
        data: result,
    });
});
const getAvailableCountries = (0, catchAsync_1.default)(async (req, res) => {
    const result = await map_service_1.MapService.getAvailableCountries();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Available countries retrieved successfully',
        data: result,
    });
});
const getDiscoveryData = (0, catchAsync_1.default)(async (req, res) => {
    const result = await map_service_1.MapService.getDiscoveryData(req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Discovery data retrieved successfully',
        data: result,
    });
});
exports.MapController = {
    createMap,
    getAllMaps,
    getMapById,
    updateMap,
    deleteMap,
    purchaseMap,
    getPurchasedMaps,
    getAvailableCountries,
    getDiscoveryData,
};
