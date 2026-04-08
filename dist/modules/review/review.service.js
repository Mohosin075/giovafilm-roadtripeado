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
const paginationHelper_1 = require("../../helpers/paginationHelper");
const createReview = async (user, payload) => {
    payload.reviewer = user.authId;
    const isUserExist = await user_model_1.User.findById(user.authId);
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    const isPlaceExist = await place_model_1.Place.findById(payload.placeId);
    if (!isPlaceExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
    }
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        const result = await review_model_1.Review.create([payload], { session });
        if (!result) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to create Review, please try again later.');
        }
        // update the review count and rating of the place
        await place_model_1.Place.findByIdAndUpdate(payload.placeId, [
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
                                    payload.rating,
                                ],
                            },
                            { $add: [{ $ifNull: ['$totalReview', 0] }, 1] },
                        ],
                    },
                },
            },
        ], { session, new: true });
        await session.commitTransaction();
        return result[0];
    }
    catch (error) {
        console.log({ error });
        await session.abortTransaction();
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to create Review, please try again later.');
    }
    finally {
        await session.endSession();
    }
};
const getAllReviews = async (paginationOptions, filter = {}) => {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper_1.paginationHelper.calculatePagination(paginationOptions);
    const [result, total] = await Promise.all([
        review_model_1.Review.find(filter)
            .populate('reviewer', 'name profile')
            .populate('placeId', 'name')
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
    return await getAllReviews(paginationOptions, { placeId });
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
        // Update place rating if rating changed
        if (payload.rating !== undefined && oldRating !== newRating) {
            await place_model_1.Place.findByIdAndUpdate(existingReview.placeId, [
                {
                    $set: {
                        rating: {
                            $cond: [
                                { $eq: ['$totalReview', 0] },
                                0,
                                {
                                    $divide: [
                                        {
                                            $add: [
                                                {
                                                    $subtract: [
                                                        { $multiply: ['$rating', '$totalReview'] },
                                                        oldRating,
                                                    ],
                                                },
                                                newRating,
                                            ],
                                        },
                                        '$totalReview',
                                    ],
                                },
                            ],
                        },
                    },
                },
            ], { session, new: true });
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
        const rating = existingReview.rating;
        // Update place rating and review count
        await place_model_1.Place.findByIdAndUpdate(existingReview.placeId, [
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
        ], { session, new: true });
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
exports.ReviewService = {
    createReview,
    getAllReviews,
    getReviewsByPlace,
    updateReview,
    deleteReview,
    getSingleReview,
};
