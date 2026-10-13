"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_SUBJECTS = exports.NOTIFICATION_CONFIG = exports.NOTIFICATION_TEMPLATES = exports.notificationFilterableFields = exports.notificationSearchableFields = void 0;
const notification_interface_1 = require("./notification.interface");
exports.notificationSearchableFields = [
    'title',
    'content',
    'targetAudience',
    'country',
];
exports.notificationFilterableFields = [
    'searchTerm',
    'userId',
    'targetAudience',
    'category',
    'type',
    'channel',
    'status',
    'priority',
    'isRead',
    'isArchived',
    'startDate',
    'endDate',
    'country',
];
exports.NOTIFICATION_TEMPLATES = {
    // User Templates
    WELCOME: 'welcome',
    PASSWORD_RESET: 'password-reset',
    ACCOUNT_VERIFICATION: 'account-verification',
    PROFILE_UPDATED: 'profile-updated',
    // System Templates
    SYSTEM_ALERT: 'system-alert',
    MAINTENANCE: 'maintenance',
    NEW_FEATURE: 'new-feature',
};
exports.NOTIFICATION_CONFIG = {
    // Priority levels with default channel
    PRIORITY_CONFIG: {
        [notification_interface_1.NotificationPriority.URGENT]: {
            channel: notification_interface_1.NotificationChannel.BOTH,
            retryAttempts: 3,
        },
        [notification_interface_1.NotificationPriority.HIGH]: {
            channel: notification_interface_1.NotificationChannel.BOTH,
            retryAttempts: 2,
        },
        [notification_interface_1.NotificationPriority.MEDIUM]: {
            channel: notification_interface_1.NotificationChannel.EMAIL,
            retryAttempts: 1,
        },
        [notification_interface_1.NotificationPriority.LOW]: {
            channel: notification_interface_1.NotificationChannel.IN_APP,
            retryAttempts: 0,
        },
    },
    // Default settings
    DEFAULT_CHANNEL: notification_interface_1.NotificationChannel.IN_APP,
    DEFAULT_PRIORITY: notification_interface_1.NotificationPriority.MEDIUM,
    DEFAULT_RETRY_DELAY: 30000, // 30 seconds
    MAX_RETRY_ATTEMPTS: 3,
    BATCH_SIZE: 50,
    // Scheduled notification settings
    SCHEDULED_CHECK_INTERVAL: 60000, // 1 minute
    CLEANUP_ARCHIVED_AFTER_DAYS: 30,
};
exports.EMAIL_SUBJECTS = {
    [notification_interface_1.NotificationType.WELCOME]: 'Welcome to Roadtripeado!',
    [notification_interface_1.NotificationType.PASSWORD_RESET]: 'Password Reset Request',
    [notification_interface_1.NotificationType.ACCOUNT_VERIFICATION]: 'Verify Your Account',
    [notification_interface_1.NotificationType.SYSTEM_ALERT]: 'Roadtripeado System Alert',
    [notification_interface_1.NotificationType.NEW_OFFER]: 'Nueva Oferta Exclusiva en Roadtripeado',
    [notification_interface_1.NotificationType.APPROVED_REVIEW]: '¡Tu reseña ha sido aprobada! 🎉',
    [notification_interface_1.NotificationType.REJECTED_REVIEW]: 'Actualización sobre tu reseña',
    [notification_interface_1.NotificationType.NEW_LOCATION]: 'Nuevo Destino en Roadtripeado 📍',
    [notification_interface_1.NotificationType.EARNED_REWARD]: '¡Has ganado una nueva recompensa! 🏆',
    [notification_interface_1.NotificationType.UNLOCKED_LEVEL]: '¡Has desbloqueado un nuevo nivel! 🌟',
    [notification_interface_1.NotificationType.NEW_MAP]: 'Nuevo Mapa Disponible en Roadtripeado 🗺️',
    [notification_interface_1.NotificationType.IMPORTANT_UPDATE]: 'Actualización importante de Roadtripeado',
    [notification_interface_1.NotificationType.NEW_MESSAGE]: 'Tienes un nuevo mensaje en Roadtripeado',
};
