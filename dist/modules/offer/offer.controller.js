"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const offer_service_1 = require("./offer.service");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const createOffer = (0, catchAsync_1.default)(async (req, res) => {
    const offerData = { ...req.body };
    // Handle image upload from disk storage
    if (req.body.images) {
        offerData.photo = Array.isArray(req.body.images)
            ? req.body.images[0]
            : req.body.images;
    }
    const result = await offer_service_1.OfferService.createOffer(offerData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Offer created successfully',
        data: result,
    });
});
const getAllOffers = (0, catchAsync_1.default)(async (req, res) => {
    const result = await offer_service_1.OfferService.getAllOffers(req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Offers retrieved successfully',
        meta: result.meta,
        data: result.data,
    });
});
const getOfferById = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await offer_service_1.OfferService.getOfferById(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Offer retrieved successfully',
        data: result,
    });
});
const updateOffer = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const offerData = { ...req.body };
    // Handle image upload from disk storage
    if (req.body.images) {
        offerData.photo = Array.isArray(req.body.images)
            ? req.body.images[0]
            : req.body.images;
    }
    const result = await offer_service_1.OfferService.updateOffer(id, offerData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Offer updated successfully',
        data: result,
    });
});
const deleteOffer = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await offer_service_1.OfferService.deleteOffer(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Offer deleted successfully',
        data: result,
    });
});
const calculateDiscount = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const { price } = req.body;
    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Valid price must be provided');
    }
    const result = await offer_service_1.OfferService.calculateDiscount(id, Number(price));
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Discount calculated successfully',
        data: result,
    });
});
exports.OfferController = {
    createOffer,
    getAllOffers,
    getOfferById,
    updateOffer,
    deleteOffer,
    calculateDiscount,
};
