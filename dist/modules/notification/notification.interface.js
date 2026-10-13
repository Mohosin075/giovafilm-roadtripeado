"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPriority = exports.NotificationStatus = exports.NotificationChannel = exports.NotificationType = exports.NotificationCategory = exports.TARGET_AUDIENCE = void 0;
const notification_1 = require("../../enum/notification");
Object.defineProperty(exports, "TARGET_AUDIENCE", { enumerable: true, get: function () { return notification_1.TARGET_AUDIENCE; } });
var NotificationCategory;
(function (NotificationCategory) {
    NotificationCategory["ACCOUNT"] = "account";
    NotificationCategory["ROADTRIPEADO"] = "roadtripeado";
})(NotificationCategory || (exports.NotificationCategory = NotificationCategory = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["NEW_MESSAGE"] = "NEW_MESSAGE";
    NotificationType["SYSTEM_ALERT"] = "SYSTEM_ALERT";
    NotificationType["WELCOME"] = "WELCOME";
    NotificationType["PASSWORD_RESET"] = "PASSWORD_RESET";
    NotificationType["ACCOUNT_VERIFICATION"] = "ACCOUNT_VERIFICATION";
    NotificationType["NEW_OFFER"] = "NEW_OFFER";
    NotificationType["APPROVED_REVIEW"] = "APPROVED_REVIEW";
    NotificationType["REJECTED_REVIEW"] = "REJECTED_REVIEW";
    NotificationType["NEW_LOCATION"] = "NEW_LOCATION";
    NotificationType["EARNED_REWARD"] = "EARNED_REWARD";
    NotificationType["UNLOCKED_LEVEL"] = "UNLOCKED_LEVEL";
    NotificationType["NEW_MAP"] = "NEW_MAP";
    NotificationType["IMPORTANT_UPDATE"] = "IMPORTANT_UPDATE";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["IN_APP"] = "IN_APP";
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["BOTH"] = "BOTH";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["PENDING"] = "PENDING";
    NotificationStatus["SENT"] = "SENT";
    NotificationStatus["FAILED"] = "FAILED";
    NotificationStatus["READ"] = "READ";
    NotificationStatus["ARCHIVED"] = "ARCHIVED";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "LOW";
    NotificationPriority["MEDIUM"] = "MEDIUM";
    NotificationPriority["HIGH"] = "HIGH";
    NotificationPriority["URGENT"] = "URGENT";
})(NotificationPriority || (exports.NotificationPriority = NotificationPriority = {}));
