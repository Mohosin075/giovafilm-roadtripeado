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
const user_1 = require("../../enum/user");
const mapAccessHelper_1 = require("../../helpers/mapAccessHelper");
const map_model_1 = require("./map.model");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
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
    const authorizationHeader = req.headers.authorization;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(authorizationHeader);
    const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(user);
    const isAdmin = user && (user.role === user_1.USER_ROLES.ADMIN || user.role === user_1.USER_ROLES.SUPER_ADMIN);
    const query = { ...req.query };
    if (!isAdmin) {
        query.isActive = 'true';
    }
    const result = await map_service_1.MapService.getAllMaps(query);
    // Tag each map with isLocked (places are NOT populated in list view for performance)
    const data = result.data.map((map) => {
        const mapObj = typeof map.toObject === 'function' ? map.toObject() : map;
        const isLockedMap = !accessibleMapIds.includes(mapObj._id.toString());
        mapObj.isLocked = isLockedMap;
        return mapObj;
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Maps retrieved successfully',
        meta: result.meta,
        data,
    });
});
const getMapById = (0, catchAsync_1.default)(async (req, res) => {
    const authorizationHeader = req.headers.authorization;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(authorizationHeader);
    const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(user);
    const result = await map_service_1.MapService.getMapById(req.params.id);
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Map not found');
    }
    const mapObj = typeof result.toObject === 'function'
        ? result.toObject()
        : { ...result };
    // Access flag for catalog UI; places are loaded via discovery, not nested here
    mapObj.isLocked = !accessibleMapIds.includes(mapObj._id.toString());
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Map retrieved successfully',
        data: mapObj,
    });
});
const updateMap = (0, catchAsync_1.default)(async (req, res) => {
    const user = await (0, mapAccessHelper_1.getUserFromToken)(req.headers.authorization);
    const mapId = req.params.id;
    await (0, mapAccessHelper_1.verifyEditorEditAccess)(user, mapId);
    const result = await map_service_1.MapService.updateMap(mapId, req.body);
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
    const authorizationHeader = req.headers.authorization;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(authorizationHeader);
    // Run accessible map IDs and paid maps lookup in parallel
    const [accessibleMapIds, paidMaps] = await Promise.all([
        (0, mapAccessHelper_1.getAccessibleMapIds)(user),
        map_model_1.Map.find({ isPaid: true }, '_id'),
    ]);
    const paidMapIds = paidMaps.map(m => m._id.toString());
    const lockedMapIds = paidMapIds.filter(id => !accessibleMapIds.includes(id));
    const result = await map_service_1.MapService.getDiscoveryData(req.query, lockedMapIds);
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
