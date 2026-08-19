"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketHelper = void 0;
const colors_1 = __importDefault(require("colors"));
const usage_service_1 = require("../modules/stats/usage.service");
const usageView_model_1 = require("../modules/stats/usageView.model");
const socket = (io) => {
    usageView_model_1.UsageView.syncIndexes().catch(error => {
        console.error('Failed to sync usage view indexes:', error);
    });
    io.on('connection', socket => {
        console.log(colors_1.default.blue('A user connected'), socket.id);
        socket.on('join-room', (roomId) => {
            if (roomId) {
                socket.join(`room:${roomId}`);
                console.log(colors_1.default.green(`User ${socket.id} joined room:${roomId}`));
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
