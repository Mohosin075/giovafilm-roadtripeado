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
const offer_1 = require("../../enum/offer");
const business_model_1 = require("../business/business.model");
const place_model_1 = require("../place/place.model");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const createOffer = async (payload) => {
    if (payload.discountType === offer_1.DISCOUNT_TYPE.BOGO && !payload.bogoSecondType) {
        payload.bogoSecondType = offer_1.BOGO_SECOND_TYPE.FREE;
    }
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
    const queryObj = { ...query };
    // Extract custom query filters before QueryBuilder.filter() runs
    const country = typeof queryObj.country === 'string' ? queryObj.country.trim() : '';
    const searchTerm = typeof queryObj.searchTerm === 'string' ? queryObj.searchTerm.trim() : '';
    delete queryObj.country;
    delete queryObj.searchTerm;
    // Find all approved businesses with active subscriptions
    const activeBusinesses = await business_model_1.Business.find({
        status: 'Approved',
        hasActiveSubscription: true,
    }).select('_id').lean();
    const activeBusinessIds = activeBusinesses.map(b => b._id);
    // Filter offers: must either belong to a place or to an active/approved business
    const filterConditions = [
        {
            $or: [
                { place: { $exists: true, $ne: null } },
                { business: { $in: activeBusinessIds } },
            ],
        },
    ];
    // Filter by country if provided
    if (country) {
        const countryRegex = new RegExp(`^${escapeRegex(country)}$`, 'i');
        const [matchingPlaces, matchingBusinesses] = await Promise.all([
            place_model_1.Place.find({ country: countryRegex }).select('_id').lean(),
            business_model_1.Business.find({
                $or: [
                    { 'location.country': countryRegex },
                    { country: countryRegex },
                ],
            }).select('_id').lean(),
        ]);
        const placeIds = matchingPlaces.map(p => p._id);
        const businessIds = matchingBusinesses.map(b => b._id);
        filterConditions.push({
            $or: [
                { place: { $in: placeIds } },
                { business: { $in: businessIds } },
            ],
        });
    }
    // Search by offer title/description, place name/address/municipality/region, or business name/address/city
    if (searchTerm) {
        const searchRegex = new RegExp(escapeRegex(searchTerm), 'i');
        const [matchingPlaces, matchingBusinesses] = await Promise.all([
            place_model_1.Place.find({
                $or: [
                    { name: searchRegex },
                    { address: searchRegex },
                    { country: searchRegex },
                ],
            }).select('_id').lean(),
            business_model_1.Business.find({
                $or: [
                    { name: searchRegex },
                    { 'location.address': searchRegex },
                    { 'location.city': searchRegex },
                    { 'location.country': searchRegex },
                ],
            }).select('_id').lean(),
        ]);
        const placeIds = matchingPlaces.map(p => p._id);
        const businessIds = matchingBusinesses.map(b => b._id);
        const searchOr = [
            { title: searchRegex },
            { description: searchRegex },
        ];
        if (placeIds.length > 0) {
            searchOr.push({ place: { $in: placeIds } });
        }
        if (businessIds.length > 0) {
            searchOr.push({ business: { $in: businessIds } });
        }
        filterConditions.push({ $or: searchOr });
    }
    const finalFilter = filterConditions.length > 1
        ? { $and: filterConditions }
        : filterConditions[0];
    const offerQuery = new QueryBuilder_1.default(offer_model_1.Offer.find(finalFilter)
        .populate('business', 'name location media status category map country')
        .populate('place', 'name location media status category map country address')
        .lean(), queryObj)
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
    const result = await offer_model_1.Offer.findById(id)
        .populate('place', 'name location media status category map country address')
        .populate('business', 'name location media status category');
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
    if (payload.discountType === offer_1.DISCOUNT_TYPE.BOGO && !payload.bogoSecondType) {
        payload.bogoSecondType = isExist.bogoSecondType || offer_1.BOGO_SECOND_TYPE.FREE;
    }
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
    // Optional cap across every user
    if (offer.totalRedemptionLimit &&
        offer.redemptionsCount >= offer.totalRedemptionLimit) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Offer redemption limit reached');
    }
    // maxRedemptions is per user, not global
    if (offer.maxRedemptions) {
        const userRedemptions = await offerRedemption_model_1.OfferRedemption.countDocuments({
            user: userId,
            offer: id,
        });
        if (userRedemptions >= offer.maxRedemptions) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, offer.maxRedemptions === 1
                ? 'You have already redeemed this offer'
                : `You can redeem this offer only ${offer.maxRedemptions} times`);
        }
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
