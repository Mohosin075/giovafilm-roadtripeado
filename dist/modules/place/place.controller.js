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
const createPlace = (0, catchAsync_1.default)(async (req, res) => {
    const result = await place_service_1.PlaceService.createPlace(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Place created successfully',
        data: result,
    });
});
const getAllPlaces = (0, catchAsync_1.default)(async (req, res) => {
    const result = await place_service_1.PlaceService.getAllPlaces(req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Places retrieved successfully',
        meta: result.meta,
        data: result.data,
    });
});
const getPlaceById = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await place_service_1.PlaceService.getPlaceById(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Place retrieved successfully',
        data: result,
    });
});
const updatePlace = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
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
exports.PlaceController = {
    createPlace,
    getAllPlaces,
    getPlaceById,
    updatePlace,
    deletePlace,
};
