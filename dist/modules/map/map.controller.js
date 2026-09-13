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
const localize_1 = require("../../helpers/localize");
const mapFields = ['name', 'description'];
const discoveryFields = [
    'name',
    'description',
    'access',
    'entryCost',
    'difficulty',
    'hikeTime',
    'atmosphere',
    'services',
    'schedules',
    'accessibility.notes',
    'recommendations.tips',
    'category.name',
];
const createMap = (0, catchAsync_1.default)(async (req, res) => {
    const result = await map_service_1.MapService.createMap(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Map created successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, mapFields),
    });
});
const getAllMaps = (0, catchAsync_1.default)(async (req, res) => {
    const result = await map_service_1.MapService.getAllMaps(req.query, req.headers.authorization);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Maps retrieved successfully',
        meta: result.meta,
        data: (0, localize_1.localizeDocument)(result.data, req.lang, mapFields),
    });
});
const getMapById = (0, catchAsync_1.default)(async (req, res) => {
    const result = await map_service_1.MapService.getMapById(req.params.id, req.headers.authorization);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Map retrieved successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, mapFields),
    });
});
const updateMap = (0, catchAsync_1.default)(async (req, res) => {
    const result = await map_service_1.MapService.updateMap(req.params.id, req.body, req.user);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Map updated successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, mapFields),
    });
});
const deleteMap = (0, catchAsync_1.default)(async (req, res) => {
    const result = await map_service_1.MapService.deleteMap(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Map deleted successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, mapFields),
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
        data: (0, localize_1.localizeDocument)(result, req.lang, mapFields),
    });
});
const incrementViewCount = (0, catchAsync_1.default)(async (req, res) => {
    const result = await map_service_1.MapService.incrementViewCount(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Map view recorded',
        data: { viewCount: result.viewCount || 0 },
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
    const result = await map_service_1.MapService.getDiscoveryData(req.query, req.headers.authorization);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Discovery data retrieved successfully',
        meta: result.meta,
        data: (0, localize_1.localizeDocument)(result.data, req.lang, discoveryFields),
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
    incrementViewCount,
    getAvailableCountries,
    getDiscoveryData,
};
