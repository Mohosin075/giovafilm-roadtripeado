"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const stats_service_1 = require("./stats.service");
const getDashboardData = (0, catchAsync_1.default)(async (req, res) => {
    const result = await stats_service_1.StatsService.getDashboardData();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Dashboard data fetched successfully',
        data: result,
    });
});
const getReportsData = (0, catchAsync_1.default)(async (req, res) => {
    const result = await stats_service_1.StatsService.getReportsData();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Reports data fetched successfully',
        data: result,
    });
});
exports.StatsController = {
    getDashboardData,
    getReportsData,
};
