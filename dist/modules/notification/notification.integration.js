"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationIntegration = void 0;
const notification_service_1 = require("./notification.service");
const notification_interface_1 = require("./notification.interface");
const user_model_1 = require("../user/user.model");
class NotificationIntegration {
    static async onNewMessage(senderId, receiverId, message) {
        try {
            await notification_service_1.NotificationServices.createNotification({
                userId: receiverId,
                title: 'Nuevo Mensaje',
                content: `Tienes un nuevo mensaje: "${message.substring(0, 100)}..."`,
                type: notification_interface_1.NotificationType.NEW_MESSAGE,
                channel: notification_interface_1.NotificationChannel.IN_APP,
                priority: notification_interface_1.NotificationPriority.MEDIUM,
                metadata: {
                    senderId,
                    messagePreview: message.substring(0, 100),
                },
                actionUrl: `${process.env.CLIENT_URL}/messages/${senderId}`,
                actionText: 'Ver Mensaje',
            });
        }
        catch (error) {
            console.error('Error creating message notification:', error);
        }
    }
    static async sendPasswordReset(userId, resetCode) {
        try {
            const user = await user_model_1.User.findById(userId);
            if (!user)
                return;
            await notification_service_1.NotificationServices.createNotification({
                userId: user._id,
                title: 'Solicitud de Restablecimiento de Contraseña',
                content: `Usa este código para restablecer tu contraseña: ${resetCode}`,
                type: notification_interface_1.NotificationType.PASSWORD_RESET,
                channel: notification_interface_1.NotificationChannel.EMAIL,
                priority: notification_interface_1.NotificationPriority.URGENT,
                metadata: {
                    resetCode,
                },
            }, true);
        }
        catch (error) {
            console.error('Error creating password reset notification:', error);
        }
    }
    static async sendAccountVerification(userId, verificationToken) {
        try {
            const user = await user_model_1.User.findById(userId);
            if (!user)
                return;
            await notification_service_1.NotificationServices.createNotification({
                userId: user._id,
                title: 'Verifica tu Cuenta',
                content: 'Por favor verifica tu dirección de correo electrónico para completar tu registro.',
                type: notification_interface_1.NotificationType.ACCOUNT_VERIFICATION,
                channel: notification_interface_1.NotificationChannel.EMAIL,
                priority: notification_interface_1.NotificationPriority.HIGH,
                metadata: {
                    verificationToken,
                },
            }, true);
        }
        catch (error) {
            console.error('Error creating account verification notification:', error);
        }
    }
}
exports.NotificationIntegration = NotificationIntegration;
exports.default = NotificationIntegration;
