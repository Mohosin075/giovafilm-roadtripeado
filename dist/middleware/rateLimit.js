"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokenRateLimiter = exports.contactRateLimiter = exports.passwordRateLimiter = exports.otpRateLimiter = exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_status_codes_1 = require("http-status-codes");
const rateLimitHandler = (_req, res) => {
    res.status(http_status_codes_1.StatusCodes.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Too many requests. Please try again later.',
    });
};
/** Login / signup / social login — brute-force protection */
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});
/** OTP verify / resend / forget-password — tighter spam protection */
exports.otpRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});
/** Password reset / change — account takeover protection */
exports.passwordRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});
/** Public contact form */
exports.contactRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});
/** Refresh token endpoint */
exports.refreshTokenRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});
