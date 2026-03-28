"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const offer_model_1 = require("./offer.model");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const offer_constants_1 = require("./offer.constants");
const offer_1 = require("../../enum/offer");
const createOffer = async (payload) => {
    const result = await offer_model_1.Offer.create(payload);
    return result;
};
const getAllOffers = async (query) => {
    const offerQuery = new QueryBuilder_1.default(offer_model_1.Offer.find().populate('place'), query)
        .search(offer_constants_1.offerSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = await offerQuery.modelQuery;
    const meta = await offerQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
};
const getOfferById = async (id) => {
    const result = await offer_model_1.Offer.findById(id).populate('place');
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Offer not found');
    }
    return result;
};
const updateOffer = async (id, payload) => {
    const isExist = await offer_model_1.Offer.findById(id);
    if (!isExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Offer not found');
    }
    const result = await offer_model_1.Offer.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    }).populate('place');
    return result;
};
const deleteOffer = async (id) => {
    const isExist = await offer_model_1.Offer.findById(id);
    if (!isExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Offer not found');
    }
    const result = await offer_model_1.Offer.findByIdAndDelete(id);
    return result;
};
const calculateDiscount = async (id, price) => {
    const offer = await offer_model_1.Offer.findById(id);
    if (!offer) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Offer not found');
    }
    let discountAmount = 0;
    if (offer.discountType === offer_1.DISCOUNT_TYPE.PERCENTAGE) {
        const percentage = Number(offer.discountValue);
        if (!isNaN(percentage))
            discountAmount = (price * percentage) / 100;
    }
    else if (offer.discountType === offer_1.DISCOUNT_TYPE.FLAT) {
        const flat = Number(offer.discountValue);
        if (!isNaN(flat))
            discountAmount = flat > price ? price : flat;
    }
    const finalPrice = Math.max(0, price - discountAmount);
    return { originalPrice: price, discountAmount, finalPrice };
};
exports.OfferService = {
    createOffer,
    getAllOffers,
    getOfferById,
    updateOffer,
    deleteOffer,
    calculateDiscount,
};
