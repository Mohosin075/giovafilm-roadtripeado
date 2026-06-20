"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../enum/user");
const auth_1 = __importDefault(require("../../middleware/auth"));
const stats_controller_1 = require("./stats.controller");
const router = express_1.default.Router();
router.get('/dashboard', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN), stats_controller_1.StatsController.getDashboardData);
router.get('/reports', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN), stats_controller_1.StatsController.getReportsData);
exports.StatsRoutes = router;
