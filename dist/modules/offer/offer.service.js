"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const offer_model_1 = require("./offer.model");
const offerRedemption_model_1 = require("./offerRedemption.model");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const offer_constants_1 = require("./offer.constants");
const offer_1 = require("../../enum/offer");
const createOffer = async (payload) => {
    const status = payload.status || offer_1.OFFER_STATUS.ACTIVE;
    if (status === offer_1.OFFER_STATUS.ACTIVE && (payload.place || payload.business)) {
        const query = [];
        if (payload.place)
            query.push({ place: payload.place });
        if (payload.business)
            query.push({ business: payload.business });
        if (query.length > 0) {
            const existingActiveOffer = await offer_model_1.Offer.findOne({
                $or: query,
                status: offer_1.OFFER_STATUS.ACTIVE,
            });
            if (existingActiveOffer) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'An active offer already exists for this place or business');
            }
        }
    }
    const result = await offer_model_1.Offer.create(payload);
    return result;
};
const getAllOffers = async (query) => {
    const offerQuery = new QueryBuilder_1.default(offer_model_1.Offer.find().populate('business'), query)
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
    const targetStatus = payload.status || isExist.status;
    const targetPlace = payload.place || isExist.place;
    const targetBusiness = payload.business || isExist.business;
    if (targetStatus === offer_1.OFFER_STATUS.ACTIVE && (targetPlace || targetBusiness)) {
        const query = [];
        if (targetPlace)
            query.push({ place: targetPlace });
        if (targetBusiness)
            query.push({ business: targetBusiness });
        if (query.length > 0) {
            const existingActiveOffer = await offer_model_1.Offer.findOne({
                _id: { $ne: id },
                $or: query,
                status: offer_1.OFFER_STATUS.ACTIVE,
            });
            if (existingActiveOffer) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'An active offer already exists for this place or business');
            }
        }
    }
    const result = await offer_model_1.Offer.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    }).populate('place');
    return result;
};
const getOffersByPlaceOrBusinessId = async (id) => {
    const result = await offer_model_1.Offer.findOne({
        $or: [{ place: id }, { business: id }],
    }).populate('place business');
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
const redeemOffer = async (id, userId) => {
    const offer = await offer_model_1.Offer.findById(id);
    if (!offer) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Offer not found');
    }
    if (offer.status !== offer_1.OFFER_STATUS.ACTIVE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Offer is not active');
    }
    // Check if maxRedemptions is reached
    if (offer.maxRedemptions && offer.redemptionsCount >= offer.maxRedemptions) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Offer redemption limit reached');
    }
    // Check expiration date
    const now = new Date();
    if (offer.noExpiration !== true) {
        if (offer.validFrom && now < new Date(offer.validFrom)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Offer is not yet valid');
        }
        if (offer.validUntil && now > new Date(offer.validUntil)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Offer has expired');
        }
    }
    // Check if there is an active redemption (timer still running)
    const activeRedemption = await offerRedemption_model_1.OfferRedemption.findOne({
        user: userId,
        offer: id,
        expiresAt: { $gt: new Date() },
    });
    if (activeRedemption) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You already have an active redemption for this offer');
    }
    // Use redemptionDuration from offer model or default to 15
    const durationInMinutes = offer.redemptionDuration || 15;
    const expiresAt = new Date(Date.now() + durationInMinutes * 60 * 1000);
    const redemption = await offerRedemption_model_1.OfferRedemption.create({
        user: userId,
        offer: id,
        redemptionTime: new Date(),
        expiresAt,
    });
    // Increment redemption count
    await offer_model_1.Offer.findByIdAndUpdate(id, { $inc: { redemptionsCount: 1 } });
    return redemption;
};
exports.OfferService = {
    createOffer,
    getAllOffers,
    getOfferById,
    updateOffer,
    deleteOffer,
    calculateDiscount,
    redeemOffer,
    getOffersByPlaceOrBusinessId,
};
