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
const createOffer = (0, catchAsync_1.default)(async (req, res) => {
    var _a, _b, _c;
    const { images, ...offerData } = req.body;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(req.headers.authorization);
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
            const country = (_b = business.location) === null || _b === void 0 ? void 0 : _b.country;
            if (!((_c = user.assignedCountries) === null || _c === void 0 ? void 0 : _c.includes(country))) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to edit offers for this business.');
            }
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
    const user = await (0, mapAccessHelper_1.getUserFromToken)(authorizationHeader);
    const isPremium = user && ([user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.MAP_EDITOR].includes(user.role));
    const result = await offer_service_1.OfferService.getAllOffers(req.query);
    const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(user);
    const updatedData = result.data.map((offer) => {
        var _a, _b, _c, _d, _e, _f;
        const placeMapId = ((_b = (_a = offer.place) === null || _a === void 0 ? void 0 : _a.map) === null || _b === void 0 ? void 0 : _b._id) || ((_c = offer.place) === null || _c === void 0 ? void 0 : _c.map) || ((_e = (_d = offer.business) === null || _d === void 0 ? void 0 : _d.map) === null || _e === void 0 ? void 0 : _e._id) || ((_f = offer.business) === null || _f === void 0 ? void 0 : _f.map);
        const isLocked = !isPremium && (!placeMapId || !accessibleMapIds.includes(placeMapId.toString()));
        return {
            ...offer,
            isLocked,
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
    var _a, _b, _c, _d, _e, _f;
    const { id } = req.params;
    const authorizationHeader = req.headers.authorization;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(authorizationHeader);
    const isPremium = user && ([user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.MAP_EDITOR].includes(user.role));
    let result = await offer_service_1.OfferService.getOfferById(id);
    if (!isPremium && result) {
        const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(user);
        const placeMapId = ((_b = (_a = result.place) === null || _a === void 0 ? void 0 : _a.map) === null || _b === void 0 ? void 0 : _b._id) || ((_c = result.place) === null || _c === void 0 ? void 0 : _c.map) || ((_e = (_d = result.business) === null || _d === void 0 ? void 0 : _d.map) === null || _e === void 0 ? void 0 : _e._id) || ((_f = result.business) === null || _f === void 0 ? void 0 : _f.map);
        if (!placeMapId || !accessibleMapIds.includes(placeMapId.toString())) {
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
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { id } = req.params;
    const { images, ...offerData } = req.body;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(req.headers.authorization);
    const existingOffer = await offer_service_1.OfferService.getOfferById(id);
    if (!existingOffer) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Offer not found');
    }
    // Verify access for Map Editors
    if (user && user.role === user_1.USER_ROLES.MAP_EDITOR) {
        // Check existing offer's place/business
        if (existingOffer.place) {
            const place = await place_model_1.Place.findById(existingOffer.place);
            if (place) {
                const mapId = ((_a = place.map) === null || _a === void 0 ? void 0 : _a._id) || place.map;
                if (mapId) {
                    await (0, mapAccessHelper_1.verifyEditorEditAccess)(user, mapId.toString());
                }
            }
        }
        else if (existingOffer.business) {
            const business = await business_model_1.Business.findById(existingOffer.business);
            if (business) {
                const country = (_b = business.location) === null || _b === void 0 ? void 0 : _b.country;
                if (!((_c = user.assignedCountries) === null || _c === void 0 ? void 0 : _c.includes(country))) {
                    throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to edit offers for this business.');
                }
            }
        }
        // Check new place/business if they are being updated
        if (offerData.place && offerData.place !== ((_d = existingOffer.place) === null || _d === void 0 ? void 0 : _d.toString())) {
            const place = await place_model_1.Place.findById(offerData.place);
            if (place) {
                const mapId = ((_e = place.map) === null || _e === void 0 ? void 0 : _e._id) || place.map;
                if (mapId) {
                    await (0, mapAccessHelper_1.verifyEditorEditAccess)(user, mapId.toString());
                }
            }
        }
        else if (offerData.business && offerData.business !== ((_f = existingOffer.business) === null || _f === void 0 ? void 0 : _f.toString())) {
            const business = await business_model_1.Business.findById(offerData.business);
            if (business) {
                const country = (_g = business.location) === null || _g === void 0 ? void 0 : _g.country;
                if (!((_h = user.assignedCountries) === null || _h === void 0 ? void 0 : _h.includes(country))) {
                    throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to assign offers to this business.');
                }
            }
        }
    }
    // Handle image upload from disk storage
    if (images) {
        offerData.photo = Array.isArray(images) ? images[0] : images;
    }
    console.log(req.body);
    const result = await offer_service_1.OfferService.updateOffer(id, offerData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Offer updated successfully',
        data: result,
    });
});
const getOffersByPlaceOrBusinessId = (0, catchAsync_1.default)(async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    const { id } = req.params;
    const authorizationHeader = req.headers.authorization;
    const user = await (0, mapAccessHelper_1.getUserFromToken)(authorizationHeader);
    const isPremium = user && ([user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.MAP_EDITOR].includes(user.role));
    const result = await offer_service_1.OfferService.getOffersByPlaceOrBusinessId(id);
    let offerObj = null;
    if (result) {
        offerObj = typeof result.toObject === 'function' ? result.toObject() : result;
        const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(user);
        const placeMapId = ((_b = (_a = offerObj.place) === null || _a === void 0 ? void 0 : _a.map) === null || _b === void 0 ? void 0 : _b._id) || ((_c = offerObj.place) === null || _c === void 0 ? void 0 : _c.map) || ((_e = (_d = offerObj.business) === null || _d === void 0 ? void 0 : _d.map) === null || _e === void 0 ? void 0 : _e._id) || ((_f = offerObj.business) === null || _f === void 0 ? void 0 : _f.map);
        offerObj.isLocked = !isPremium && (!placeMapId || !accessibleMapIds.includes(placeMapId.toString()));
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
    var _a, _b, _c, _d, _e, _f;
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
        const placeMapId = ((_b = (_a = offer.place) === null || _a === void 0 ? void 0 : _a.map) === null || _b === void 0 ? void 0 : _b._id) || ((_c = offer.place) === null || _c === void 0 ? void 0 : _c.map) || ((_e = (_d = offer.business) === null || _d === void 0 ? void 0 : _d.map) === null || _e === void 0 ? void 0 : _e._id) || ((_f = offer.business) === null || _f === void 0 ? void 0 : _f.map);
        if (!placeMapId || !accessibleMapIds.includes(placeMapId.toString())) {
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
    var _a, _b, _c, _d, _e, _f;
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
        const placeMapId = ((_b = (_a = offer.place) === null || _a === void 0 ? void 0 : _a.map) === null || _b === void 0 ? void 0 : _b._id) || ((_c = offer.place) === null || _c === void 0 ? void 0 : _c.map) || ((_e = (_d = offer.business) === null || _d === void 0 ? void 0 : _d.map) === null || _e === void 0 ? void 0 : _e._id) || ((_f = offer.business) === null || _f === void 0 ? void 0 : _f.map);
        if (!placeMapId || !accessibleMapIds.includes(placeMapId.toString())) {
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
