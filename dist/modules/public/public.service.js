"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicServices = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const public_model_1 = require("./public.model");
const createPublic = async (payload) => {
    const isExist = await public_model_1.Public.findOne({
        type: payload.type,
    });
    if (isExist) {
        await public_model_1.Public.findByIdAndUpdate(isExist._id, {
            $set: {
                content: payload.content,
            },
        }, {
            new: true,
        });
    }
    else {
        const result = await public_model_1.Public.create(payload);
        if (!result)
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to create Public');
    }
    return `${payload.type} created successfully}`;
};
const getAllPublics = async (type) => {
    const result = await public_model_1.Public.findOne({ type: type }).lean();
    return result || null;
};
const deletePublic = async (id) => {
    const result = await public_model_1.Public.findByIdAndDelete(id);
    return result;
};
const createFaq = async (payload) => {
    const result = await public_model_1.Faq.create(payload);
    if (!result)
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to create Faq');
    // redisClient.del(`public:${RedisKeys.FAQ}`)
    return result;
};
const getAllFaqs = async () => {
    const result = await public_model_1.Faq.find({});
    return result || [];
};
const getSingleFaq = async (id) => {
    const result = await public_model_1.Faq.findById(id);
    return result || null;
};
const updateFaq = async (id, payload) => {
    const result = await public_model_1.Faq.findByIdAndUpdate(id, { $set: payload }, {
        new: true,
    });
    return result;
};
const deleteFaq = async (id) => {
    const result = await public_model_1.Faq.findByIdAndDelete(id);
    return result;
};
const updatePublic = async (id, payload) => {
    const data = await public_model_1.Public.findById(id);
    if (!data) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Public document not found');
    }
    // Filter payload to only allow 'content' field update
    const updateData = {
        content: payload.content,
    };
    const result = await public_model_1.Public.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    return result;
};
exports.PublicServices = {
    createPublic,
    getAllPublics,
    deletePublic,
    createFaq,
    getAllFaqs,
    getSingleFaq,
    updateFaq,
    deleteFaq,
    updatePublic,
};
