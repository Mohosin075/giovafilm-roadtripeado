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
const mapAccessHelper_1 = require("../../helpers/mapAccessHelper");
const map_model_1 = require("../map/map.model");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const mapHelper_1 = require("../../utils/mapHelper");
const createPlace = (0, catchAsync_1.default)(async (req, res) => {
    if (req.body.images) {
        req.body.media = req.body.images;
    }
    const result = await place_service_1.PlaceService.createPlace(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Place created successfully',
        data: result,
    });
});
const getAllPlaces = (0, catchAsync_1.default)(async (req, res) => {
    const authorizationHeader = req.headers.authorization;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(authorizationHeader);
    const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(user);
    // Find all paid map IDs
    const paidMaps = await map_model_1.Map.find({ isPaid: true }, '_id');
    const paidMapIds = paidMaps.map(m => m._id.toString());
    // Compute locked maps
    const lockedMapIds = paidMapIds.filter(id => !accessibleMapIds.includes(id));
    const result = await place_service_1.PlaceService.getAllPlaces(req.query, lockedMapIds);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Places retrieved successfully',
        meta: result.meta,
        data: result.data,
    });
});
const getPlaceById = (0, catchAsync_1.default)(async (req, res) => {
    var _a;
    const { id } = req.params;
    const result = await place_service_1.PlaceService.getPlaceById(id);
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
    }
    const authorizationHeader = req.headers.authorization;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(authorizationHeader);
    const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(user);
    const mapId = ((_a = result.map) === null || _a === void 0 ? void 0 : _a._id) || result.map;
    if (mapId) {
        const isLocked = !accessibleMapIds.includes(mapId.toString());
        if (isLocked) {
            if (result.type !== 'Business') {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You must purchase the map to access this location');
            }
        }
    }
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Place retrieved successfully',
        data: result,
    });
});
const updatePlace = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    if (req.body.images) {
        req.body.media = req.body.images;
    }
    console.log(req.body);
    const result = await place_service_1.PlaceService.updatePlace(id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Place updated successfully',
        data: result,
    });
});
const deletePlace = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await place_service_1.PlaceService.deletePlace(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Place deleted successfully',
        data: result,
    });
});
const extractCoordinates = (0, catchAsync_1.default)(async (req, res) => {
    const { url } = req.body;
    if (!url) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Google Maps URL is required');
    }
    const coordinates = await (0, mapHelper_1.getCoordinatesFromUrl)(url);
    if (!coordinates) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Could not extract coordinates. Try using the full URL from your browser address bar.');
    }
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
    extractCoordinates,
};
