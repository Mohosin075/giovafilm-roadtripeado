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
const mapAccessHelper_1 = require("../../helpers/mapAccessHelper");
const place_model_1 = require("../place/place.model");
const business_model_1 = require("../business/business.model");
const user_1 = require("../../enum/user");
const offerRedemption_model_1 = require("./offerRedemption.model");
/** Strip paid-only fields from locked list items; keep teaser fields for cards. */
const sanitizeLockedOffer = (offer) => {
    const { description, redemptionRules, ...safe } = offer;
    return {
        ...safe,
        description: undefined,
        redemptionRules: undefined,
        isLocked: true,
    };
};
const assertUserOwnsBusiness = async (user, businessId) => {
    var _a, _b, _c;
    if (!businessId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You can only manage offers for your own business');
    }
    const business = await business_model_1.Business.findById(businessId);
    if (!business) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Business not found');
    }
    const ownerId = ((_b = (_a = business.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()) || ((_c = business.user) === null || _c === void 0 ? void 0 : _c.toString());
    if (ownerId !== user._id.toString()) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only manage offers for your own business');
    }
    return business;
};
const createOffer = (0, catchAsync_1.default)(async (req, res) => {
    var _a, _b;
    const { images, ...offerData } = req.body;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(req.headers.authorization);
    if (user && user.role === user_1.USER_ROLES.USER) {
        await assertUserOwnsBusiness(user, offerData.business);
        delete offerData.place;
    }
    // Verify access for Map Editors
    if (user && user.role === user_1.USER_ROLES.MAP_EDITOR) {
        if (offerData.place) {
            const place = await place_model_1.Place.findById(offerData.place);
            if (!place)
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
            const mapId = ((_a = place.map) === null || _a === void 0 ? void 0 : _a._id) || place.map;
            if (mapId) {
                await (0, mapAccessHelper_1.verifyEditorEditAccess)(user, mapId.toString());
            }
        }
        else if (offerData.business) {
            const business = await business_model_1.Business.findById(offerData.business);
            if (!business)
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Business not found');
            await (0, mapAccessHelper_1.verifyEditorBusinessAccess)(user, (_b = business.location) === null || _b === void 0 ? void 0 : _b.country);
        }
    }
    // Handle image upload from disk storage
    if (images) {
        offerData.photo = Array.isArray(images) ? images[0] : images;
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
    const authorizationHeader = req.headers.authorization;
    // Run in parallel to avoid sequential DB round-trips
    const [user, result] = await Promise.all([
        (0, mapAccessHelper_1.getUserFromToken)(authorizationHeader),
        offer_service_1.OfferService.getAllOffers(req.query),
    ]);
    const isPremium = user && ([user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.MAP_EDITOR].includes(user.role));
    const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(user);
    const countries = result.data
        .map((offer) => { var _a, _b, _c; return ((_b = (_a = offer.business) === null || _a === void 0 ? void 0 : _a.location) === null || _b === void 0 ? void 0 : _b.country) || ((_c = offer.business) === null || _c === void 0 ? void 0 : _c.country); })
        .filter(Boolean);
    const countryLookup = await (0, mapAccessHelper_1.buildCountryToMapIdLookup)(countries);
    const updatedData = result.data.map((offer) => {
        const placeMapId = (0, mapAccessHelper_1.resolveOfferMapId)(offer, countryLookup);
        const isLocked = !isPremium && (!placeMapId || !accessibleMapIds.includes(placeMapId));
        if (isLocked) {
            return sanitizeLockedOffer({ ...offer, isLocked: true });
        }
        return {
            ...offer,
            isLocked: false,
        };
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Offers retrieved successfully',
        meta: result.meta,
        data: updatedData,
    });
});
const getOfferById = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const authorizationHeader = req.headers.authorization;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(authorizationHeader);
    const isPremium = user && ([user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.MAP_EDITOR].includes(user.role));
    let result = await offer_service_1.OfferService.getOfferById(id);
    if (!isPremium && result) {
        const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(user);
        const placeMapId = await (0, mapAccessHelper_1.resolveOfferMapIdAsync)(result);
        if (!placeMapId || !accessibleMapIds.includes(placeMapId)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'This information and these benefits can be unlocked by purchasing your favorite map.');
        }
    }
    if (result && user) {
        const activeRedemption = await offerRedemption_model_1.OfferRedemption.findOne({
            user: user._id,
            offer: id,
            expiresAt: { $gt: new Date() },
        });
        const offerObj = typeof result.toObject === 'function' ? result.toObject() : result;
        result = {
            ...offerObj,
            activeRedemption,
        };
    }
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Offer retrieved successfully',
        data: result,
    });
});
const updateOffer = (0, catchAsync_1.default)(async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const { id } = req.params;
    const { images, ...offerData } = req.body;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(req.headers.authorization);
    const existingOffer = await offer_service_1.OfferService.getOfferById(id);
    if (!existingOffer) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Offer not found');
    }
    // Verify access for Map Editors
    // getOfferById populates place/business — always resolve raw ids
    const existingPlaceId = ((_b = (_a = existingOffer.place) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()) ||
        ((_c = existingOffer.place) === null || _c === void 0 ? void 0 : _c.toString()) ||
        null;
    const existingBusinessId = ((_e = (_d = existingOffer.business) === null || _d === void 0 ? void 0 : _d._id) === null || _e === void 0 ? void 0 : _e.toString()) ||
        ((_f = existingOffer.business) === null || _f === void 0 ? void 0 : _f.toString()) ||
        null;
    if (user && user.role === user_1.USER_ROLES.USER) {
        await assertUserOwnsBusiness(user, existingBusinessId || offerData.business);
        delete offerData.business;
        delete offerData.place;
    }
    if (user && user.role === user_1.USER_ROLES.MAP_EDITOR) {
        // Check existing offer's place/business
        if (existingPlaceId) {
            const place = await place_model_1.Place.findById(existingPlaceId);
            if (place) {
                const mapId = ((_g = place.map) === null || _g === void 0 ? void 0 : _g._id) || place.map;
                if (mapId) {
                    await (0, mapAccessHelper_1.verifyEditorEditAccess)(user, mapId.toString());
                }
            }
        }
        else if (existingBusinessId) {
            const business = await business_model_1.Business.findById(existingBusinessId);
            if (business) {
                await (0, mapAccessHelper_1.verifyEditorBusinessAccess)(user, (_h = business.location) === null || _h === void 0 ? void 0 : _h.country);
            }
        }
        // Check new place/business if they are being updated
        if (offerData.place && offerData.place !== existingPlaceId) {
            const place = await place_model_1.Place.findById(offerData.place);
            if (place) {
                const mapId = ((_j = place.map) === null || _j === void 0 ? void 0 : _j._id) || place.map;
                if (mapId) {
                    await (0, mapAccessHelper_1.verifyEditorEditAccess)(user, mapId.toString());
                }
            }
        }
        else if (offerData.business && offerData.business !== existingBusinessId) {
            const business = await business_model_1.Business.findById(offerData.business);
            if (business) {
                await (0, mapAccessHelper_1.verifyEditorBusinessAccess)(user, (_k = business.location) === null || _k === void 0 ? void 0 : _k.country);
            }
        }
    }
    // Handle image upload from disk storage
    if (images) {
        offerData.photo = Array.isArray(images) ? images[0] : images;
    }
    const result = await offer_service_1.OfferService.updateOffer(id, offerData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Offer updated successfully',
        data: result,
    });
});
const getOffersByPlaceOrBusinessId = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const authorizationHeader = req.headers.authorization;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(authorizationHeader);
    const isPremium = user && ([user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.MAP_EDITOR].includes(user.role));
    const result = await offer_service_1.OfferService.getOffersByPlaceOrBusinessId(id);
    let offerObj = null;
    if (result) {
        offerObj = typeof result.toObject === 'function' ? result.toObject() : result;
        const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(user);
        const placeMapId = await (0, mapAccessHelper_1.resolveOfferMapIdAsync)(offerObj);
        offerObj.isLocked = !isPremium && (!placeMapId || !accessibleMapIds.includes(placeMapId));
    }
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Offers retrieved successfully',
        data: offerObj,
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
    const authorizationHeader = req.headers.authorization;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(authorizationHeader);
    const isPremium = user && ([user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.MAP_EDITOR].includes(user.role));
    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Valid price must be provided');
    }
    const offer = await offer_service_1.OfferService.getOfferById(id);
    if (!offer) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Offer not found');
    }
    if (!isPremium) {
        const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(user);
        const placeMapId = await (0, mapAccessHelper_1.resolveOfferMapIdAsync)(offer);
        if (!placeMapId || !accessibleMapIds.includes(placeMapId)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'This information and these benefits can be unlocked by purchasing your favorite map.');
        }
    }
    const result = await offer_service_1.OfferService.calculateDiscount(id, Number(price));
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Discount calculated successfully',
        data: result,
    });
});
const redeemOffer = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const { authId } = req.user;
    const authorizationHeader = req.headers.authorization;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(authorizationHeader);
    const isPremium = user && ([user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.MAP_EDITOR].includes(user.role));
    const offer = await offer_service_1.OfferService.getOfferById(id);
    if (!offer) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Offer not found');
    }
    if (!isPremium) {
        const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(user);
        const placeMapId = await (0, mapAccessHelper_1.resolveOfferMapIdAsync)(offer);
        if (!placeMapId || !accessibleMapIds.includes(placeMapId)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'This information and these benefits can be unlocked by purchasing your favorite map.');
        }
    }
    const result = await offer_service_1.OfferService.redeemOffer(id, authId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Offer redeemed successfully',
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
    redeemOffer,
    getOffersByPlaceOrBusinessId,
};
