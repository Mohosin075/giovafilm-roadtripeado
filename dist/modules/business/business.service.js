"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const business_model_1 = require("./business.model");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const createBusiness = async (payload) => {
    payload.status = 'Pending'; // Always start as pending until admin approves
    const result = await business_model_1.Business.create(payload);
    return result;
};
const getAllBusinesses = async (query) => {
    const businessQuery = new QueryBuilder_1.default(business_model_1.Business.find().populate('user category'), query)
        .search(['name', 'description'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = await businessQuery.modelQuery;
    const meta = await businessQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
};
const getBusinessById = async (id) => {
    const result = await business_model_1.Business.findById(id).populate('user category');
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Business not found');
    }
    return result;
};
const updateBusiness = async (id, payload) => {
    const isExist = await business_model_1.Business.findById(id);
    if (!isExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Business not found');
    }
    const result = await business_model_1.Business.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    }).populate('user category');
    return result;
};
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
const deleteBusiness = async (id) => {
    const isExist = await business_model_1.Business.findById(id);
    if (!isExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Business not found');
    }
    const result = await business_model_1.Business.findByIdAndDelete(id);
    return result;
};
exports.BusinessService = {
    createBusiness,
    getAllBusinesses,
    getBusinessById,
    updateBusiness,
    updateBusinessStatus,
    deleteBusiness,
};
