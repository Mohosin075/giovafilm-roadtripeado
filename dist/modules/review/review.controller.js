"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewController = void 0;
const review_service_1 = require("./review.service");
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const pagination_1 = require("../../interfaces/pagination");
const pick_1 = __importDefault(require("../../shared/pick"));
const createReview = (0, catchAsync_1.default)(async (req, res) => {
    const result = await review_service_1.ReviewService.createReview(req.user, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Review created successfully',
        data: result,
    });
});
const updateReview = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await review_service_1.ReviewService.updateReview(req.user, id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Review updated successfully',
        data: result,
    });
});
const getAllReviews = (0, catchAsync_1.default)(async (req, res) => {
    const paginationOptions = (0, pick_1.default)(req.query, pagination_1.paginationFields);
    const result = await review_service_1.ReviewService.getAllReviews(paginationOptions);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Reviews retrieved successfully',
        data: result,
    });
});
const getReviewsByPlace = (0, catchAsync_1.default)(async (req, res) => {
    const { placeId } = req.params;
    const paginationOptions = (0, pick_1.default)(req.query, pagination_1.paginationFields);
    const result = await review_service_1.ReviewService.getReviewsByPlace(placeId, paginationOptions);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Reviews retrieved successfully',
        data: result,
    });
});
const deleteReview = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await review_service_1.ReviewService.deleteReview(req.user, id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Review deleted successfully',
        data: result,
    });
});
const getSingleReview = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await review_service_1.ReviewService.getSingleReview(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Review retrieved successfully',
        data: result,
    });
});
exports.ReviewController = {
    createReview,
    updateReview,
    getAllReviews,
    deleteReview,
    getSingleReview,
    getReviewsByPlace,
};
