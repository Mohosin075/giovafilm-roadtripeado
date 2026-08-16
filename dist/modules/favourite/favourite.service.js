"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavouriteService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const favourite_model_1 = require("./favourite.model");
const map_model_1 = require("../map/map.model");
const place_model_1 = require("../place/place.model");
const offer_model_1 = require("../offer/offer.model");
const business_model_1 = require("../business/business.model");
const user_model_1 = require("../user/user.model");
const mongoose_1 = __importDefault(require("mongoose"));
const toggleFavourite = async (userId, payload) => {
    const { type, map, place, offer, business } = payload;
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        if (type === 'Map' && map) {
            const isMapExist = await map_model_1.Map.findById(map).session(session);
            if (!isMapExist) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Map not found');
            }
            const isFavouriteExist = await favourite_model_1.Favourite.findOne({ user: userId, map }).session(session);
            if (isFavouriteExist) {
                await favourite_model_1.Favourite.findOneAndDelete({ user: userId, map }).session(session);
                await user_model_1.User.findByIdAndUpdate(userId, { $pull: { favoriteMaps: map } }).session(session);
                await session.commitTransaction();
                return null;
            }
            else {
                const result = await favourite_model_1.Favourite.create([{ user: userId, map, type }], { session });
                await user_model_1.User.findByIdAndUpdate(userId, { $addToSet: { favoriteMaps: map } }).session(session);
                await session.commitTransaction();
                return result[0];
            }
        }
        else if (type === 'Place' && place) {
            const isPlaceExist = await place_model_1.Place.findById(place).session(session);
            if (!isPlaceExist) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
            }
            const isFavouriteExist = await favourite_model_1.Favourite.findOne({ user: userId, place }).session(session);
            if (isFavouriteExist) {
                await favourite_model_1.Favourite.findOneAndDelete({ user: userId, place }).session(session);
                await user_model_1.User.findByIdAndUpdate(userId, { $pull: { favoritePlaces: place } }).session(session);
                await session.commitTransaction();
                return null;
            }
            else {
                const result = await favourite_model_1.Favourite.create([{ user: userId, place, type }], { session });
                await user_model_1.User.findByIdAndUpdate(userId, { $addToSet: { favoritePlaces: place } }).session(session);
                await session.commitTransaction();
                return result[0];
            }
        }
        else if (type === 'Offer' && offer) {
            const isOfferExist = await offer_model_1.Offer.findById(offer).session(session);
            if (!isOfferExist) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Offer not found');
            }
            const isFavouriteExist = await favourite_model_1.Favourite.findOne({ user: userId, offer }).session(session);
            if (isFavouriteExist) {
                await favourite_model_1.Favourite.findOneAndDelete({ user: userId, offer }).session(session);
                await user_model_1.User.findByIdAndUpdate(userId, { $pull: { favoriteOffers: offer } }).session(session);
                await session.commitTransaction();
                return null;
            }
            else {
                const result = await favourite_model_1.Favourite.create([{ user: userId, offer, type }], { session });
                await user_model_1.User.findByIdAndUpdate(userId, { $addToSet: { favoriteOffers: offer } }).session(session);
                await session.commitTransaction();
                return result[0];
            }
        }
        else if (type === 'Business' && business) {
            const isBusinessExist = await business_model_1.Business.findById(business).session(session);
            if (!isBusinessExist) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Business not found');
            }
            const isFavouriteExist = await favourite_model_1.Favourite.findOne({
                user: userId,
                business,
            }).session(session);
            if (isFavouriteExist) {
                await favourite_model_1.Favourite.findOneAndDelete({ user: userId, business }).session(session);
                await user_model_1.User.findByIdAndUpdate(userId, {
                    $pull: { favoriteBusinesses: business },
                }).session(session);
                await session.commitTransaction();
                return null;
            }
            else {
                const result = await favourite_model_1.Favourite.create([{ user: userId, business, type }], { session });
                await user_model_1.User.findByIdAndUpdate(userId, {
                    $addToSet: { favoriteBusinesses: business },
                }).session(session);
                await session.commitTransaction();
                return result[0];
            }
        }
        else {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid payload');
        }
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
const getMyFavourites = async (userId, query) => {
    const { page = 1, limit = 10, sort = '-createdAt', ...filterData } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const sortStr = sort;
    const sortOrder = sortStr.startsWith('-') ? -1 : 1;
    const sortField = sortStr.replace(/^-/, '');
    const matchStage = {
        user: new mongoose_1.default.Types.ObjectId(userId),
        ...filterData,
    };
    // Paginate first, then lookup only the page of docs (list fields only)
    const pipeline = [
        { $match: matchStage },
        { $sort: { [sortField]: sortOrder } },
        { $skip: skip },
        { $limit: Number(limit) },
        {
            $lookup: {
                from: 'maps',
                localField: 'map',
                foreignField: '_id',
                pipeline: [
                    { $project: { name: 1, description: 1, images: 1 } },
                ],
                as: 'map',
            },
        },
        { $unwind: { path: '$map', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'places',
                localField: 'place',
                foreignField: '_id',
                pipeline: [
                    { $project: { name: 1, description: 1, media: 1 } },
                ],
                as: 'place',
            },
        },
        { $unwind: { path: '$place', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'offers',
                localField: 'offer',
                foreignField: '_id',
                pipeline: [
                    { $project: { title: 1, name: 1, description: 1, image: 1, media: 1 } },
                ],
                as: 'offer',
            },
        },
        { $unwind: { path: '$offer', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'businesses',
                localField: 'business',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            name: 1,
                            description: 1,
                            'media.photos': 1,
                        },
                    },
                ],
                as: 'business',
            },
        },
        { $unwind: { path: '$business', preserveNullAndEmptyArrays: true } },
    ];
    const [data, total] = await Promise.all([
        favourite_model_1.Favourite.aggregate(pipeline),
        favourite_model_1.Favourite.countDocuments(matchStage),
    ]);
    const totalPage = Math.ceil(total / Number(limit));
    return {
        meta: {
            total,
            limit: Number(limit),
            page: Number(page),
            totalPage,
        },
        data,
    };
};
const removeFavourite = async (id, userId) => {
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        const result = await favourite_model_1.Favourite.findOneAndDelete({ _id: id, user: userId }).session(session);
        if (!result) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Favourite not found');
        }
        if (result.type === 'Map' && result.map) {
            await user_model_1.User.findByIdAndUpdate(userId, { $pull: { favoriteMaps: result.map } }).session(session);
        }
        else if (result.type === 'Place' && result.place) {
            await user_model_1.User.findByIdAndUpdate(userId, { $pull: { favoritePlaces: result.place } }).session(session);
        }
        else if (result.type === 'Offer' && result.offer) {
            await user_model_1.User.findByIdAndUpdate(userId, { $pull: { favoriteOffers: result.offer } }).session(session);
        }
        else if (result.type === 'Business' && result.business) {
            await user_model_1.User.findByIdAndUpdate(userId, {
                $pull: { favoriteBusinesses: result.business },
            }).session(session);
        }
        await session.commitTransaction();
        return result;
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
exports.FavouriteService = {
    toggleFavourite,
    getMyFavourites,
    removeFavourite,
};
