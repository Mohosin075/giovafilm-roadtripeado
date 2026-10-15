"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutePlanController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const route_plan_service_1 = require("./route-plan.service");
const localize_1 = require("../../helpers/localize");
const routeFields = [
    'stops.place.name',
    'stops.place.description',
    'stops.place.access',
    'stops.place.entryCost',
    'stops.place.category.name',
    'stops.business.name',
    'stops.business.description',
    'stops.business.category.name',
];
const getAuthUserId = (req) => {
    const user = req.user;
    return ((user === null || user === void 0 ? void 0 : user.authId) || (user === null || user === void 0 ? void 0 : user.id) || (user === null || user === void 0 ? void 0 : user._id) || '');
};
const createRoutePlan = (0, catchAsync_1.default)(async (req, res) => {
    const userId = getAuthUserId(req);
    const result = await route_plan_service_1.RoutePlanService.createRoutePlan(userId, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Route plan created successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, routeFields),
    });
});
const getMyRoutePlans = (0, catchAsync_1.default)(async (req, res) => {
    const userId = getAuthUserId(req);
    const result = await route_plan_service_1.RoutePlanService.getMyRoutePlans(userId, req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Route plans retrieved successfully',
        meta: result.meta,
        data: (0, localize_1.localizeDocument)(result.data, req.lang, routeFields),
    });
});
const getRoutePlanById = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const userId = getAuthUserId(req);
    const userRole = user === null || user === void 0 ? void 0 : user.role;
    const { id } = req.params;
    const result = await route_plan_service_1.RoutePlanService.getRoutePlanById(id, userId, userRole);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Route plan retrieved successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, routeFields),
    });
});
const updateRoutePlan = (0, catchAsync_1.default)(async (req, res) => {
    const userId = getAuthUserId(req);
    const { id } = req.params;
    const result = await route_plan_service_1.RoutePlanService.updateRoutePlan(id, userId, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Route plan updated successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, routeFields),
    });
});
const deleteRoutePlan = (0, catchAsync_1.default)(async (req, res) => {
    const userId = getAuthUserId(req);
    const { id } = req.params;
    const result = await route_plan_service_1.RoutePlanService.deleteRoutePlan(id, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Route plan deleted successfully',
        data: result,
    });
});
const clearRouteStops = (0, catchAsync_1.default)(async (req, res) => {
    const userId = getAuthUserId(req);
    const { id } = req.params;
    const result = await route_plan_service_1.RoutePlanService.clearRouteStops(id, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Route stops cleared successfully',
        data: result,
    });
});
const addStop = (0, catchAsync_1.default)(async (req, res) => {
    const userId = getAuthUserId(req);
    const { id } = req.params;
    const result = await route_plan_service_1.RoutePlanService.addStop(id, userId, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Stop added to route successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, routeFields),
    });
});
const removeStop = (0, catchAsync_1.default)(async (req, res) => {
    const userId = getAuthUserId(req);
    const { id, stopId } = req.params;
    const result = await route_plan_service_1.RoutePlanService.removeStop(id, stopId, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Stop removed from route successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, routeFields),
    });
});
exports.RoutePlanController = {
    createRoutePlan,
    getMyRoutePlans,
    getRoutePlanById,
    updateRoutePlan,
    deleteRoutePlan,
    clearRouteStops,
    addStop,
    removeStop,
};
