"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PassportAuthController = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const passport_auth_service_1 = require("./passport.auth.service");
const common_1 = require("../common");
const config_1 = __importDefault(require("../../../config"));
const login = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const { deviceToken, password } = req.body;
    const result = await common_1.AuthCommonServices.handleLoginLogic({ deviceToken: deviceToken, password: password }, user);
    const { status, message, accessToken, refreshToken, role, needPassword } = result;
    if (refreshToken) {
        res.cookie('refreshToken', refreshToken, {
            secure: config_1.default.node_env === 'production',
            httpOnly: true,
        });
    }
    (0, sendResponse_1.default)(res, {
        statusCode: status,
        success: true,
        message: message,
        data: { accessToken, refreshToken, role, needPassword },
    });
});
const googleAuthCallback = (0, catchAsync_1.default)(async (req, res) => {
    const result = await passport_auth_service_1.PassportAuthServices.handleGoogleLogin(req.user);
    const { accessToken, refreshToken } = result;
    // Set refresh cookie on API domain so FE credentials:include refresh works
    if (refreshToken) {
        res.cookie('refreshToken', refreshToken, {
            secure: config_1.default.node_env === 'production',
            httpOnly: true,
            sameSite: config_1.default.node_env === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }
    // Do not put refreshToken in the URL
    return res.redirect(`${config_1.default.clientUrl}/login?accessToken=${accessToken}&role=user`);
});
exports.PassportAuthController = {
    login,
    googleAuthCallback,
};
