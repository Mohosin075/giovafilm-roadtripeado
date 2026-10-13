import { Model, Types } from 'mongoose'
import { TARGET_AUDIENCE } from '../../enum/notification'
export { TARGET_AUDIENCE }

export enum NotificationCategory {
  ACCOUNT = 'account',
  ROADTRIPEADO = 'roadtripeado',
}

export interface INotification {
  _id: Types.ObjectId
  userId?: Types.ObjectId
  targetAudience?: TARGET_AUDIENCE
  category?: NotificationCategory
  interests?: string[]
  country?: string
  title: string | { en: string; es: string }
  content: string | { en: string; es: string }
  type: NotificationType
  channel: NotificationChannel
  status: NotificationStatus
  priority: NotificationPriority
  metadata?: Record<string, any>
  scheduledAt?: Date
  sentAt?: Date
  readAt?: Date
  actionUrl?: string
  actionText?: string | { en: string; es: string }
  actionClickedAt?: Date
  isRead: boolean
  isArchived: boolean
  readBy?: Types.ObjectId[]
  archivedBy?: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

export enum NotificationType {
  NEW_MESSAGE = 'NEW_MESSAGE',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  WELCOME = 'WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ACCOUNT_VERIFICATION = 'ACCOUNT_VERIFICATION',
  NEW_OFFER = 'NEW_OFFER',
  APPROVED_REVIEW = 'APPROVED_REVIEW',
  REJECTED_REVIEW = 'REJECTED_REVIEW',
  NEW_LOCATION = 'NEW_LOCATION',
  EARNED_REWARD = 'EARNED_REWARD',
  UNLOCKED_LEVEL = 'UNLOCKED_LEVEL',
  NEW_MAP = 'NEW_MAP',
  IMPORTANT_UPDATE = 'IMPORTANT_UPDATE',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  BOTH = 'BOTH',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface INotificationFilterables {
  searchTerm?: string
  userId?: string
  category?: NotificationCategory | string
  type?: NotificationType
  channel?: NotificationChannel
  status?: NotificationStatus
  priority?: NotificationPriority
  isRead?: boolean | string
  isArchived?: boolean | string
  startDate?: string
  endDate?: string
}

export interface EmailNotificationData {
  to: string | string[]
  subject: string
  template: string
  data: Record<string, any>
  attachments?: Array<{
    filename: string
    path?: string
    content?: Buffer | string
    contentType?: string
  }>
}

export interface CreateNotificationDto {
  userId?: string | Types.ObjectId
  targetAudience?: TARGET_AUDIENCE
  category?: NotificationCategory
  interests?: string[]
  country?: string
  title: string | { en: string; es: string }
  content: string | { en: string; es: string }
  type: NotificationType
  channel?: NotificationChannel
  priority?: NotificationPriority
  metadata?: Record<string, any>
  scheduledAt?: Date
  actionUrl?: string
  actionText?: string | { en: string; es: string }
}

export type NotificationModel = Model<INotification, {}, {}>

export interface IUnreadCountResponse {
  totalUnread: number
  unreadAccount: number
  unreadRoadtripeado: number
  byType: Record<string, number>
}

export interface INotificationStats {
  total: number
  unread: number
  byType: Record<string, number>
  byChannel: Record<string, number>
  byStatus: Record<string, number>
}


