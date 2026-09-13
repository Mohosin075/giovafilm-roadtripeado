"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const translateMessage_1 = require("../helpers/translateMessage");
const sendResponse = (res, data) => {
    var _a;
    const lang = ((_a = res.req) === null || _a === void 0 ? void 0 : _a.lang) || 'es';
    const localizedMessage = data.message ? (0, translateMessage_1.translateMessage)(data.message, lang) : null;
    const responseData = {
        statusCode: data.statusCode,
        success: data.success,
        message: localizedMessage,
        meta: data.meta,
        data: data.data || null,
    };
    res.status(data.statusCode).json(responseData);
};
exports.default = sendResponse;
