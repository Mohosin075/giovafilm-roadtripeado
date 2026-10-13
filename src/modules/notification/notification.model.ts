import { Schema, model } from 'mongoose'
import {
  INotification,
  NotificationModel,
  NotificationType,
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  TARGET_AUDIENCE,
} from './notification.interface'

const notificationSchema = new Schema<INotification, NotificationModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    targetAudience: {
      type: String,
      enum: Object.values(TARGET_AUDIENCE),
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(NotificationCategory),
      index: true,
    },
    interests: [
      {
        type: String,
        trim: true,
      },
    ],
    country: {
      type: String,
      trim: true,
    },
    title: {
      type: Schema.Types.Mixed,
      required: true,
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      default: NotificationChannel.IN_APP,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.PENDING,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.MEDIUM,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    scheduledAt: {
      type: Date,
      index: true,
    },
    sentAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    actionUrl: {
      type: String,
    },
    actionText: {
      type: Schema.Types.Mixed,
    },
    actionClickedAt: {
      type: Date,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    archivedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: Record<string, unknown>) {
        delete ret.__v
        return ret
      },
    },
    toObject: {
      virtuals: true,
    },
  },
)

// Indexes for efficient querying
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, category: 1, createdAt: -1 })
notificationSchema.index({ category: 1, createdAt: -1 })
notificationSchema.index({ targetAudience: 1, createdAt: -1 })
notificationSchema.index({ status: 1, scheduledAt: 1 })
notificationSchema.index({ readBy: 1 })
notificationSchema.index({ archivedBy: 1 })
notificationSchema.index({ country: 1 })
notificationSchema.index({ createdAt: -1 })

// Virtual populate for user details
notificationSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
})

// Pre-save middleware to update timestamps and category
notificationSchema.pre('save', function (next) {
  if (!this.category) {
    const roadtripeadoTypes = [
      NotificationType.NEW_OFFER,
      NotificationType.NEW_LOCATION,
      NotificationType.NEW_MAP,
      NotificationType.IMPORTANT_UPDATE,
      NotificationType.SYSTEM_ALERT,
    ]
    if (roadtripeadoTypes.includes(this.type)) {
      this.category = NotificationCategory.ROADTRIPEADO
    } else {
      this.category = NotificationCategory.ACCOUNT
    }
  }

  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date()
  }
  if (
    this.isModified('status') &&
    this.status === NotificationStatus.SENT &&
    !this.sentAt
  ) {
    this.sentAt = new Date()
  }
  next()
})

// Static method to mark as read
notificationSchema.statics.markAsRead = async function (
  notificationId: string,
  userId: string,
) {
  const notif = await this.findById(notificationId)
  if (!notif) return null

  if (notif.userId && notif.userId.toString() === userId) {
    return this.findByIdAndUpdate(
      notificationId,
      {
        isRead: true,
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
      { new: true },
    )
  }

  // Broadcast or audience notification: add to readBy array
  return this.findByIdAndUpdate(
    notificationId,
    {
      $addToSet: { readBy: userId },
    },
    { new: true },
  )
}

// Static method to archive
notificationSchema.statics.archive = async function (
  notificationId: string,
  userId: string,
) {
  const notif = await this.findById(notificationId)
  if (!notif) return null

  if (notif.userId && notif.userId.toString() === userId) {
    return this.findByIdAndUpdate(
      notificationId,
      {
        isArchived: true,
      },
      { new: true },
    )
  }

  // Broadcast or audience notification: add to archivedBy array
  return this.findByIdAndUpdate(
    notificationId,
    {
      $addToSet: { archivedBy: userId },
    },
    { new: true },
  )
}

export const Notification = model<INotification, NotificationModel>(
  'Notification',
  notificationSchema,
)
