"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitedController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const visited_service_1 = require("./visited.service");
const localize_1 = require("../../helpers/localize");
const visitedFields = [
    'place.name',
    'place.description',
    'business.name',
    'business.description',
];
const toggleVisited = (0, catchAsync_1.default)(async (req, res) => {
    const userId = req.user.authId;
    const result = await visited_service_1.VisitedService.toggleVisited(userId, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: result.isVisited
            ? 'Place marked as visited successfully'
            : 'Place unmarked as visited successfully',
        data: result,
    });
});
const getMyVisitedPlaces = (0, catchAsync_1.default)(async (req, res) => {
    const userId = req.user.authId;
    const result = await visited_service_1.VisitedService.getMyVisitedPlaces(userId, req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Visited places retrieved successfully',
        meta: result.meta,
        data: (0, localize_1.localizeDocument)(result.data, req.lang, visitedFields),
    });
});
const getVisitedCount = (0, catchAsync_1.default)(async (req, res) => {
    const userId = req.user.authId;
    const result = await visited_service_1.VisitedService.getVisitedCount(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Visited count retrieved successfully',
        data: result,
    });
});
const removeVisited = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.authId;
    const result = await visited_service_1.VisitedService.removeVisited(id, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Visited record removed successfully',
        data: result,
    });
});
exports.VisitedController = {
    toggleVisited,
    getMyVisitedPlaces,
    getVisitedCount,
    removeVisited,
};
