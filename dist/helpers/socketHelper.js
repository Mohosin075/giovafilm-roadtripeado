"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketHelper = void 0;
const colors_1 = __importDefault(require("colors"));
const usage_service_1 = require("../modules/stats/usage.service");
const usageView_model_1 = require("../modules/stats/usageView.model");
const jwtHelper_1 = require("./jwtHelper");
const config_1 = __importDefault(require("../config"));
const socket = (io) => {
    usageView_model_1.UsageView.syncIndexes().catch(error => {
        console.error('Failed to sync usage view indexes:', error);
    });
    io.on('connection', socket => {
        var _a, _b, _c;
        console.log(colors_1.default.blue('A user connected'), socket.id);
        // Auto-join user room if authentication token is provided in handshake
        const rawToken = ((_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.token) ||
            ((_b = socket.handshake.query) === null || _b === void 0 ? void 0 : _b.token) ||
            ((_c = socket.handshake.headers) === null || _c === void 0 ? void 0 : _c.authorization);
        if (rawToken) {
            try {
                const token = typeof rawToken === 'string' && rawToken.startsWith('Bearer ')
                    ? rawToken.split(' ')[1]
                    : rawToken;
                const verifiedUser = jwtHelper_1.jwtHelper.verifyToken(token, config_1.default.jwt.jwt_secret);
                if (verifiedUser === null || verifiedUser === void 0 ? void 0 : verifiedUser.authId) {
                    const authIdStr = verifiedUser.authId.toString();
                    socket.join(authIdStr);
                    socket.join(`room:${authIdStr}`);
                    console.log(colors_1.default.green(`User socket ${socket.id} auto-joined room:${authIdStr}`));
                }
            }
            catch (_d) {
                // Token invalid or expired, continue as guest
            }
        }
        socket.on('join-room', (roomId) => {
            if (roomId) {
                const idStr = roomId.toString();
                socket.join(idStr);
                socket.join(`room:${idStr}`);
                console.log(colors_1.default.green(`User ${socket.id} joined room:${idStr}`));
            }
        });
        socket.on('leave-room', (roomId) => {
            if (roomId) {
                socket.leave(`room:${roomId}`);
                console.log(colors_1.default.yellow(`User ${socket.id} left room:${roomId}`));
            }
        });
        socket.on('track-usage', async (payload) => {
            try {
                await (0, usage_service_1.recordUniqueUsage)(socket, payload);
            }
            catch (error) {
                console.error('Failed to record usage via socket:', error);
            }
        });
        socket.on('disconnect', () => {
            console.log(colors_1.default.red('A user disconnect'), socket.id);
        });
    });
};
exports.socketHelper = { socket };
