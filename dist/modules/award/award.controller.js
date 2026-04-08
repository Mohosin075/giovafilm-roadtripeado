"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwardController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const award_service_1 = require("./award.service");
const getMyAwards = (0, catchAsync_1.default)(async (req, res) => {
    const { authId } = req.user;
    const result = await award_service_1.AwardServices.getMyAwards(authId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'User awards retrieved successfully',
        data: result,
    });
});
exports.AwardController = {
    getMyAwards,
};
