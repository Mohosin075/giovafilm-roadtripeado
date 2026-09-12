import { Types } from 'mongoose'
import { NotificationServices } from './notification.service'
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from './notification.interface'
import { User } from '../user/user.model'

export class NotificationIntegration {
  static async onNewMessage(
    senderId: Types.ObjectId,
    receiverId: Types.ObjectId,
    message: string,
  ): Promise<void> {
    try {
      await NotificationServices.createNotification({
        userId: receiverId,
        title: 'Nuevo Mensaje',
        content: `Tienes un nuevo mensaje: "${message.substring(0, 100)}..."`,
        type: NotificationType.NEW_MESSAGE,
        channel: NotificationChannel.IN_APP,
        priority: NotificationPriority.MEDIUM,
        metadata: {
          senderId,
          messagePreview: message.substring(0, 100),
        },
        actionUrl: `${process.env.CLIENT_URL}/messages/${senderId}`,
        actionText: 'Ver Mensaje',
      })
    } catch (error) {
      console.error('Error creating message notification:', error)
    }
  }

  static async sendPasswordReset(
    userId: Types.ObjectId,
    resetCode: string,
  ): Promise<void> {
    try {
      const user = await User.findById(userId)
      if (!user) return

      await NotificationServices.createNotification(
        {
          userId: user._id,
          title: 'Solicitud de Restablecimiento de Contraseña',
          content: `Usa este código para restablecer tu contraseña: ${resetCode}`,
          type: NotificationType.PASSWORD_RESET,
          channel: NotificationChannel.EMAIL,
          priority: NotificationPriority.URGENT,
          metadata: {
            resetCode,
          },
        },
        true,
      )
    } catch (error) {
      console.error('Error creating password reset notification:', error)
    }
  }

  static async sendAccountVerification(
    userId: Types.ObjectId,
    verificationToken: string,
  ): Promise<void> {
    try {
      const user = await User.findById(userId)
      if (!user) return

      await NotificationServices.createNotification(
        {
          userId: user._id,
          title: 'Verifica tu Cuenta',
          content:
            'Por favor verifica tu dirección de correo electrónico para completar tu registro.',
          type: NotificationType.ACCOUNT_VERIFICATION,
          channel: NotificationChannel.EMAIL,
          priority: NotificationPriority.HIGH,
          metadata: {
            verificationToken,
          },
        },
        true,
      )
    } catch (error) {
      console.error('Error creating account verification notification:', error)
    }
  }
}

export default NotificationIntegration
