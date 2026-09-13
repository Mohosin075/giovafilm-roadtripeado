"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const business_model_1 = require("./business.model");
const offer_model_1 = require("../offer/offer.model");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const business_constants_1 = require("./business.constants");
const offer_1 = require("../../enum/offer");
const subscription_model_1 = require("../subscription/subscription.model");
const autoTranslate_1 = require("../../utils/autoTranslate");
const user_1 = require("../../enum/user");
const mapAccessHelper_1 = require("../../helpers/mapAccessHelper");
const resolveUserRole = (user) => { var _a, _b; return (user === null || user === void 0 ? void 0 : user.role) || ((_a = user === null || user === void 0 ? void 0 : user.user) === null || _a === void 0 ? void 0 : _a.role) || ((_b = user === null || user === void 0 ? void 0 : user.data) === null || _b === void 0 ? void 0 : _b.role); };
const isAdminRole = (role) => !!role && [user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN].includes(role);
const getBusinessOwnerId = (business) => {
    if (!(business === null || business === void 0 ? void 0 : business.user))
        return null;
    return (business.user._id || business.user).toString();
};
const stripPrivateInfo = (business) => {
    if (!business)
        return business;
    const obj = typeof business.toObject === 'function' ? business.toObject() : { ...business };
    delete obj.privateInfo;
    delete obj.adminReview;
    return obj;
};
const processBusinessTranslations = async (payload) => {
    if (payload.name)
        payload.name = await (0, autoTranslate_1.autoTranslateField)(payload.name);
    if (payload.description)
        payload.description = await (0, autoTranslate_1.autoTranslateField)(payload.description);
};
const createBusiness = async (payload, userId) => {
    const businessData = {
        ...payload,
        user: userId || payload.user,
    };
    if (payload.images) {
        if (!businessData.media)
            businessData.media = {};
        businessData.media.photos = Array.isArray(payload.images)
            ? payload.images
            : [payload.images];
    }
    if (payload.documents) {
        if (!businessData.media)
            businessData.media = {};
        businessData.media.menu = Array.isArray(payload.documents)
            ? payload.documents[0]
            : payload.documents;
    }
    await processBusinessTranslations(businessData);
    businessData.status = 'Pending'; // Always start as pending until admin approves
    businessData.hasActiveSubscription = false; // Explicitly start with no active subscription
    const result = await business_model_1.Business.create(businessData);
    return result;
};
/**
 * Retrieves all businesses with support for queries (search, filter, sort, pagination).
 * Strips private admin info for non-owner/non-admin users.
 */
const getAllBusinesses = async (query, authHeader) => {
    const queryObj = { ...query };
    // If requesting specifically for the map, enforce active subscription and approved status
    if (queryObj.mapView === 'true') {
        queryObj.hasActiveSubscription = true;
        queryObj.status = 'Approved';
        delete queryObj.mapView;
    }
    const businessQuery = new QueryBuilder_1.default(business_model_1.Business.find()
        .populate('user', 'name email profile')
        .populate('category', 'name color icon status')
        .lean(), queryObj)
        .search(business_constants_1.businessSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();
    const [user, result, meta] = await Promise.all([
        (0, mapAccessHelper_1.getUserFromToken)(authHeader),
        businessQuery.modelQuery,
        businessQuery.getPaginationInfo(),
    ]);
    const data = result.map((biz) => {
        const ownerId = getBusinessOwnerId(biz);
        const canSeePrivate = isAdminRole(user === null || user === void 0 ? void 0 : user.role) || (user && ownerId === user._id.toString());
        return canSeePrivate ? biz : stripPrivateInfo(biz);
    });
    return {
        meta,
        data,
    };
};
/**
 * Retrieves businesses belonging to the authenticated user.
 * @param userId The user's ID
 * @param query The query parameters from the request
 * @returns Paginated list of businesses and metadata
 */
const getMyBusinesses = async (userId, query) => {
    const businessQuery = new QueryBuilder_1.default(business_model_1.Business.find({ user: userId })
        .populate('user', 'name email profile')
        .populate('category', 'name color icon status')
        .lean(), query)
        .search(business_constants_1.businessSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = await businessQuery.modelQuery;
    const meta = await businessQuery.getPaginationInfo();
    const unpaidIds = result
        .filter((business) => !business.hasActiveSubscription)
        .map((business) => business._id);
    if (unpaidIds.length > 0) {
        const paidSubs = await subscription_model_1.Subscription.find({
            businessId: { $in: unpaidIds },
            status: { $in: ['active', 'trialing'] },
        })
            .select('businessId planId')
            .lean();
        if (paidSubs.length > 0) {
            const paidByBusiness = new Map(paidSubs.map((sub) => [String(sub.businessId), sub]));
            await Promise.all(paidSubs.map((sub) => business_model_1.Business.findByIdAndUpdate(sub.businessId, {
                hasActiveSubscription: true,
                ...(sub.planId ? { plan: sub.planId } : {}),
            })));
            for (const business of result) {
                const paid = paidByBusiness.get(String(business._id));
                if (paid) {
                    business.hasActiveSubscription = true;
                    if (paid.planId)
                        business.plan = paid.planId;
                }
            }
        }
    }
    return {
        meta,
        data: result,
    };
};
/**
 * Retrieves a single business by its ID.
 * Strips private admin info for non-owner/non-admin users.
 */
const getBusinessById = async (id, authHeader) => {
    const [user, result] = await Promise.all([
        (0, mapAccessHelper_1.getUserFromToken)(authHeader),
        business_model_1.Business.findById(id).populate('user category'),
    ]);
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Business not found');
    }
    const ownerId = getBusinessOwnerId(result);
    const canSeePrivate = isAdminRole(user === null || user === void 0 ? void 0 : user.role) || (user && ownerId === user._id.toString());
    return canSeePrivate ? result : stripPrivateInfo(result);
};
/**
 * Updates an existing business listing with permission and status enforcement.
 */
const updateBusiness = async (id, payload, authUser) => {
    var _a;
    const existing = await business_model_1.Business.findById(id);
    if (!existing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Business not found');
    }
    const ownerId = getBusinessOwnerId(existing);
    const admin = isAdminRole(resolveUserRole(authUser));
    if (!admin && ownerId !== ((_a = authUser === null || authUser === void 0 ? void 0 : authUser.authId) === null || _a === void 0 ? void 0 : _a.toString())) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to update this business');
    }
    const businessData = { ...payload };
    // Users cannot self-approve, self-verify, or toggle subscription
    if (!admin) {
        delete businessData.status;
        delete businessData.hasActiveSubscription;
        delete businessData.isAccuracyVerified;
        delete businessData.adminReview;
    }
    const existingReview = existing.adminReview &&
        typeof existing.adminReview === 'object'
        ? existing.adminReview
        : {};
    if (businessData.adminReview) {
        businessData.adminReview = {
            ...existingReview,
            ...businessData.adminReview,
        };
        if (typeof businessData.adminReview.locationPinVerified === 'boolean') {
            businessData.isAccuracyVerified =
                businessData.adminReview.locationPinVerified;
        }
    }
    if (typeof businessData.isAccuracyVerified === 'boolean') {
        businessData.adminReview = {
            ...existingReview,
            ...businessData.adminReview,
            locationPinVerified: businessData.isAccuracyVerified,
        };
    }
    // Handle image upload from disk storage
    if (payload.images) {
        if (!businessData.media)
            businessData.media = {};
        businessData.media.photos = Array.isArray(payload.images)
            ? payload.images
            : [payload.images];
    }
    // Handle menu/document upload from disk storage
    if (payload.documents) {
        if (!businessData.media)
            businessData.media = {};
        businessData.media.menu = Array.isArray(payload.documents)
            ? payload.documents[0]
            : payload.documents;
    }
    await processBusinessTranslations(businessData);
    const result = await business_model_1.Business.findByIdAndUpdate(id, businessData, {
        new: true,
        runValidators: true,
    }).populate('user category');
    return result;
};
/**
 * Updates the approval status of a business listing (e.g., Pending, Approved, Rejected).
 * @param id The business document ID
 * @param status The new status value
 * @returns The updated business document
 */
const updateBusinessStatus = async (id, status) => {
    const isExist = await business_model_1.Business.findById(id);
    if (!isExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Business not found');
    }
    const result = await business_model_1.Business.findByIdAndUpdate(id, { status }, {
        new: true,
        runValidators: true,
    }).populate('user category');
    return result;
};
/**
 * Deletes a business listing permanently with permission check.
 */
const deleteBusiness = async (id, authUser) => {
    var _a;
    const existing = await business_model_1.Business.findById(id);
    if (!existing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Business not found');
    }
    const ownerId = getBusinessOwnerId(existing);
    const admin = isAdminRole(resolveUserRole(authUser));
    if (!admin && ownerId !== ((_a = authUser === null || authUser === void 0 ? void 0 : authUser.authId) === null || _a === void 0 ? void 0 : _a.toString())) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to delete this business');
    }
    const result = await business_model_1.Business.findByIdAndDelete(id);
    return result;
};
const getBusinessStats = async (businessId) => {
    const business = await business_model_1.Business.findById(businessId);
    if (!business) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Business not found');
    }
    // Get all offers for this business and sum their redemptions
    const offers = await offer_model_1.Offer.find({ business: businessId });
    const totalOfferRedemptions = offers.reduce((acc, offer) => acc + (offer.redemptionsCount || 0), 0);
    return {
        viewCount: business.viewCount || 0,
        totalOfferRedemptions,
        activeOffersCount: offers.filter(o => o.status === offer_1.OFFER_STATUS.ACTIVE).length,
    };
};
const incrementViewCount = async (id) => {
    return await business_model_1.Business.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true });
};
exports.BusinessService = {
    createBusiness,
    getAllBusinesses,
    getMyBusinesses,
    getBusinessById,
    updateBusiness,
    updateBusinessStatus,
    deleteBusiness,
    getBusinessStats,
    incrementViewCount,
};
