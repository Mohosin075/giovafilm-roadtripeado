"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const review_model_1 = require("./review.model");
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = require("../user/user.model");
const place_model_1 = require("../place/place.model");
const business_model_1 = require("../business/business.model");
const paginationHelper_1 = require("../../helpers/paginationHelper");
const award_service_1 = require("../award/award.service");
const mapAccessHelper_1 = require("../../helpers/mapAccessHelper");
const ratingIncPipeline = (rating) => [
    {
        $set: {
            totalReview: { $add: [{ $ifNull: ['$totalReview', 0] }, 1] },
            rating: {
                $divide: [
                    {
                        $add: [
                            {
                                $multiply: [
                                    { $ifNull: ['$rating', 0] },
                                    { $ifNull: ['$totalReview', 0] },
                                ],
                            },
                            rating,
                        ],
                    },
                    { $add: [{ $ifNull: ['$totalReview', 0] }, 1] },
                ],
            },
        },
    },
];
const ratingDecPipeline = (rating) => [
    {
        $set: {
            rating: {
                $cond: [
                    { $lte: ['$totalReview', 1] },
                    0,
                    {
                        $divide: [
                            {
                                $subtract: [
                                    { $multiply: ['$rating', '$totalReview'] },
                                    rating,
                                ],
                            },
                            { $subtract: ['$totalReview', 1] },
                        ],
                    },
                ],
            },
            totalReview: {
                $cond: [
                    { $lte: ['$totalReview', 1] },
                    0,
                    { $subtract: ['$totalReview', 1] },
                ],
            },
        },
    },
];
const createReview = async (user, payload) => {
    payload.reviewer = user.authId;
    // Force review status to Pending on creation
    payload.status = 'Pending';
    payload.isVerified = false;
    payload.pointsEarned = 0;
    const isUserExist = await user_model_1.User.findById(user.authId);
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    if (payload.placeId) {
        const isPlaceExist = await place_model_1.Place.findById(payload.placeId);
        if (!isPlaceExist) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
        }
        // Check map access: only allow review if the map is free, purchased, or the user is admin/editor
        const mapId = isPlaceExist.map ? isPlaceExist.map.toString() : null;
        if (mapId) {
            const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(isUserExist);
            if (!accessibleMapIds.includes(mapId)) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You must unlock or purchase this map before you can review this place.');
            }
        }
    }
    else if (payload.businessId) {
        const isBusinessExist = await business_model_1.Business.findById(payload.businessId);
        if (!isBusinessExist) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Business not found');
        }
        if (isBusinessExist.status !== 'Approved') {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only approved businesses can be reviewed.');
        }
    }
    else {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Either placeId or businessId is required');
    }
    const result = await review_model_1.Review.create(payload);
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to create Review, please try again later.');
    }
    return result;
};
const getAllReviews = async (paginationOptions, filter = {}) => {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper_1.paginationHelper.calculatePagination(paginationOptions);
    const [result, total] = await Promise.all([
        review_model_1.Review.find(filter)
            .populate('reviewer', 'name profile level')
            .populate('placeId', 'name media')
            .populate('businessId', 'name media.photos')
            .skip(skip)
            .limit(limit)
            .sort({ [sortBy]: sortOrder }),
        review_model_1.Review.countDocuments(filter),
    ]);
    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: result,
    };
};
const getReviewsByPlace = async (placeId, paginationOptions) => {
    return await getAllReviews(paginationOptions, { placeId, status: 'Approved' });
};
const getReviewsByBusiness = async (businessId, paginationOptions) => {
    return await getAllReviews(paginationOptions, {
        businessId,
        status: 'Approved',
    });
};
const updateReview = async (user, id, payload) => {
    var _a;
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        const existingReview = await review_model_1.Review.findById(id).session(session);
        if (!existingReview) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found.');
        }
        if ((existingReview === null || existingReview === void 0 ? void 0 : existingReview.reviewer.toString()) !== user.authId) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'You are not authorized to update this review.');
        }
        const oldRating = existingReview.rating;
        const newRating = (_a = payload.rating) !== null && _a !== void 0 ? _a : oldRating;
        // If review body or rating changes, reset status to Pending to trigger admin re-verification
        if (payload.review !== undefined || payload.rating !== undefined || payload.media !== undefined) {
            payload.status = 'Pending';
            payload.isVerified = false;
            payload.pointsEarned = 0;
        }
        // Update place/business stats and user points if the review was Approved but is now going back to Pending (due to edit)
        if (existingReview.status === 'Approved' && (payload.review !== undefined || payload.rating !== undefined || payload.media !== undefined)) {
            const rating = existingReview.rating;
            if (existingReview.placeId) {
                await place_model_1.Place.findByIdAndUpdate(existingReview.placeId, ratingDecPipeline(rating), { session, new: true });
            }
            else if (existingReview.businessId) {
                await business_model_1.Business.findByIdAndUpdate(existingReview.businessId, ratingDecPipeline(rating), { session, new: true });
            }
            // Deduct points from user
            const reviewerId = existingReview.reviewer.toString();
            const pointsToDeduct = existingReview.pointsEarned || 0;
            const reviewer = await user_model_1.User.findById(reviewerId).session(session);
            if (reviewer) {
                const newPoints = Math.max(0, (reviewer.points || 0) - pointsToDeduct);
                const newApprovedCount = Math.max(0, (reviewer.totalReviewsApproved || 0) - 1);
                let newLevel = 0;
                const USER_LEVELS = [
                    { level: 0, points: 0, reviews: 0 },
                    { level: 1, points: 100, reviews: 6 },
                    { level: 2, points: 200, reviews: 13 },
                    { level: 3, points: 400, reviews: 26 },
                    { level: 4, points: 700, reviews: 46 },
                    { level: 5, points: 1300, reviews: 86 },
                    { level: 6, points: 2300, reviews: 153 },
                    { level: 7, points: 4000, reviews: 266 },
                    { level: 8, points: 6500, reviews: 433 },
                    { level: 9, points: 10000, reviews: 665 },
                    { level: 10, points: 15000, reviews: 1000 },
                    { level: 11, points: 22500, reviews: 1500 },
                    { level: 12, points: 33000, reviews: 2200 },
                    { level: 13, points: 48000, reviews: 3200 },
                    { level: 14, points: 67500, reviews: 4500 }
                ];
                for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
                    if (newPoints >= USER_LEVELS[i].points && newApprovedCount >= USER_LEVELS[i].reviews) {
                        newLevel = USER_LEVELS[i].level;
                        break;
                    }
                }
                await user_model_1.User.findByIdAndUpdate(reviewerId, { $set: { points: newPoints, totalReviewsApproved: newApprovedCount, level: newLevel } }, { session });
            }
        }
        const result = await review_model_1.Review.findByIdAndUpdate(id, payload, {
            new: true,
            session,
        });
        await session.commitTransaction();
        return result;
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        await session.endSession();
    }
};
const deleteReview = async (user, id) => {
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        const existingReview = await review_model_1.Review.findById(id).session(session);
        if (!existingReview) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found.');
        }
        if (user.role !== 'admin' &&
            user.role !== 'super_admin' &&
            existingReview.reviewer.toString() !== user.authId) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'You are not authorized to delete this review.');
        }
        // If the review was approved, we need to update the place/business ratings/stats and reduce user points
        if (existingReview.status === 'Approved') {
            const rating = existingReview.rating;
            if (existingReview.placeId) {
                await place_model_1.Place.findByIdAndUpdate(existingReview.placeId, ratingDecPipeline(rating), { session, new: true });
            }
            else if (existingReview.businessId) {
                await business_model_1.Business.findByIdAndUpdate(existingReview.businessId, ratingDecPipeline(rating), { session, new: true });
            }
            // Deduct points from user
            const reviewerId = existingReview.reviewer.toString();
            const pointsToDeduct = existingReview.pointsEarned || 0;
            const reviewer = await user_model_1.User.findById(reviewerId).session(session);
            if (reviewer) {
                const newPoints = Math.max(0, (reviewer.points || 0) - pointsToDeduct);
                const newApprovedCount = Math.max(0, (reviewer.totalReviewsApproved || 0) - 1);
                // Recalculate level
                let newLevel = 0;
                const USER_LEVELS = [
                    { level: 0, points: 0, reviews: 0 },
                    { level: 1, points: 100, reviews: 6 },
                    { level: 2, points: 200, reviews: 13 },
                    { level: 3, points: 400, reviews: 26 },
                    { level: 4, points: 700, reviews: 46 },
                    { level: 5, points: 1300, reviews: 86 },
                    { level: 6, points: 2300, reviews: 153 },
                    { level: 7, points: 4000, reviews: 266 },
                    { level: 8, points: 6500, reviews: 433 },
                    { level: 9, points: 10000, reviews: 665 },
                    { level: 10, points: 15000, reviews: 1000 },
                    { level: 11, points: 22500, reviews: 1500 },
                    { level: 12, points: 33000, reviews: 2200 },
                    { level: 13, points: 48000, reviews: 3200 },
                    { level: 14, points: 67500, reviews: 4500 }
                ];
                for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
                    if (newPoints >= USER_LEVELS[i].points && newApprovedCount >= USER_LEVELS[i].reviews) {
                        newLevel = USER_LEVELS[i].level;
                        break;
                    }
                }
                await user_model_1.User.findByIdAndUpdate(reviewerId, { $set: { points: newPoints, totalReviewsApproved: newApprovedCount, level: newLevel } }, { session });
            }
        }
        const result = await review_model_1.Review.findByIdAndDelete(id, { session });
        await session.commitTransaction();
        return result;
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        await session.endSession();
    }
};
const getSingleReview = async (id) => {
    const result = await review_model_1.Review.findById(id).populate('reviewer', 'name profile');
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found.');
    }
    return result;
};
const getMyReviews = async (user, paginationOptions) => {
    return await getAllReviews(paginationOptions, { reviewer: user.authId });
};
const approveReview = async (id) => {
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        const existingReview = await review_model_1.Review.findById(id).session(session);
        if (!existingReview) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found');
        }
        if (existingReview.status === 'Approved') {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Review is already approved');
        }
        // 1. Calculate points
        // Star qualification (only rating, no review text) = 1 point
        // Review text present = 5 points
        // Length of review >= 200 characters = +10 bonus points
        let points = 0;
        if (!existingReview.review || existingReview.review.trim() === '') {
            points = 1;
        }
        else {
            points = 5;
            if (existingReview.review.trim().length >= 200) {
                points += 10;
            }
        }
        // Update review status
        const updatedReview = await review_model_1.Review.findByIdAndUpdate(id, { $set: { status: 'Approved', isVerified: true, pointsEarned: points } }, { session, new: true });
        // 2. Update user points, approved review count, and recalculate level
        const reviewerId = existingReview.reviewer.toString();
        const reviewer = await user_model_1.User.findById(reviewerId).session(session);
        if (reviewer) {
            const newPoints = (reviewer.points || 0) + points;
            const newApprovedCount = (reviewer.totalReviewsApproved || 0) + 1;
            // Recalculate level based on points AND approved reviews count thresholds
            const USER_LEVELS = [
                { level: 0, points: 0, reviews: 0 },
                { level: 1, points: 100, reviews: 6 },
                { level: 2, points: 200, reviews: 13 },
                { level: 3, points: 400, reviews: 26 },
                { level: 4, points: 700, reviews: 46 },
                { level: 5, points: 1300, reviews: 86 },
                { level: 6, points: 2300, reviews: 153 },
                { level: 7, points: 4000, reviews: 266 },
                { level: 8, points: 6500, reviews: 433 },
                { level: 9, points: 10000, reviews: 665 },
                { level: 10, points: 15000, reviews: 1000 },
                { level: 11, points: 22500, reviews: 1500 },
                { level: 12, points: 33000, reviews: 2200 },
                { level: 13, points: 48000, reviews: 3200 },
                { level: 14, points: 67500, reviews: 4500 }
            ];
            let newLevel = 0;
            for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
                if (newPoints >= USER_LEVELS[i].points && newApprovedCount >= USER_LEVELS[i].reviews) {
                    newLevel = USER_LEVELS[i].level;
                    break;
                }
            }
            await user_model_1.User.findByIdAndUpdate(reviewerId, { $set: { points: newPoints, totalReviewsApproved: newApprovedCount, level: newLevel } }, { session });
            // Award update
            await award_service_1.AwardServices.updateAwardProgress(reviewerId, 'Top Reviewer', 1);
        }
        // 3. Update the place/business rating and total reviews
        if (existingReview.placeId) {
            await place_model_1.Place.findByIdAndUpdate(existingReview.placeId, ratingIncPipeline(existingReview.rating), { session, new: true });
        }
        else if (existingReview.businessId) {
            await business_model_1.Business.findByIdAndUpdate(existingReview.businessId, ratingIncPipeline(existingReview.rating), { session, new: true });
        }
        await session.commitTransaction();
        return updatedReview;
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        await session.endSession();
    }
};
const rejectReview = async (id) => {
    const existingReview = await review_model_1.Review.findById(id);
    if (!existingReview) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found');
    }
    if (existingReview.status === 'Approved') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot reject an already approved review');
    }
    const result = await review_model_1.Review.findByIdAndUpdate(id, { $set: { status: 'Rejected', isVerified: false, pointsEarned: 0 } }, { new: true });
    return result;
};
exports.ReviewService = {
    createReview,
    getAllReviews,
    getReviewsByPlace,
    getReviewsByBusiness,
    updateReview,
    deleteReview,
    getSingleReview,
    getMyReviews,
    approveReview,
    rejectReview,
};
