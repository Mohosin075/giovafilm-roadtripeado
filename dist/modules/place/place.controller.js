"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaceController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const place_service_1 = require("./place.service");
const localize_1 = require("../../helpers/localize");
const placeFields = [
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
    'map.name',
    'map.description',
];
const createPlace = (0, catchAsync_1.default)(async (req, res) => {
    const result = await place_service_1.PlaceService.createPlace(req.body, req.user || req.headers.authorization);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Place created successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, placeFields),
    });
});
const getAllPlaces = (0, catchAsync_1.default)(async (req, res) => {
    const result = await place_service_1.PlaceService.getAllPlaces(req.query, req.headers.authorization);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Places retrieved successfully',
        meta: result.meta,
        data: (0, localize_1.localizeDocument)(result.data, req.lang, placeFields),
    });
});
const getPlaceById = (0, catchAsync_1.default)(async (req, res) => {
    const result = await place_service_1.PlaceService.getPlaceById(req.params.id, req.headers.authorization);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Place retrieved successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, placeFields),
    });
});
const updatePlace = (0, catchAsync_1.default)(async (req, res) => {
    const result = await place_service_1.PlaceService.updatePlace(req.params.id, req.body, req.user || req.headers.authorization);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Place updated successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, placeFields),
    });
});
const deletePlace = (0, catchAsync_1.default)(async (req, res) => {
    const result = await place_service_1.PlaceService.deletePlace(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Place deleted successfully',
        data: result,
    });
});
const incrementOpenCount = (0, catchAsync_1.default)(async (req, res) => {
    const result = await place_service_1.PlaceService.incrementOpenCount(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Place view count incremented successfully',
        data: result,
    });
});
const extractCoordinates = (0, catchAsync_1.default)(async (req, res) => {
    const { url } = req.body;
    const coordinates = await place_service_1.PlaceService.extractCoordinates(url);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Coordinates extracted successfully',
        data: coordinates,
    });
});
exports.PlaceController = {
    createPlace,
    getAllPlaces,
    getPlaceById,
    updatePlace,
    deletePlace,
    incrementOpenCount,
    extractCoordinates,
};
