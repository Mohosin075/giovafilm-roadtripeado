"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const mongoose_1 = require("mongoose");
const notification_interface_1 = require("./notification.interface");
const notificationSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true,
    },
    targetAudience: {
        type: String,
        enum: Object.values(notification_interface_1.TARGET_AUDIENCE),
        index: true,
    },
    category: {
        type: String,
        enum: Object.values(notification_interface_1.NotificationCategory),
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
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
    },
    content: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
    },
    type: {
        type: String,
        enum: Object.values(notification_interface_1.NotificationType),
        required: true,
        index: true,
    },
    channel: {
        type: String,
        enum: Object.values(notification_interface_1.NotificationChannel),
        default: notification_interface_1.NotificationChannel.IN_APP,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(notification_interface_1.NotificationStatus),
        default: notification_interface_1.NotificationStatus.PENDING,
        index: true,
    },
    priority: {
        type: String,
        enum: Object.values(notification_interface_1.NotificationPriority),
        default: notification_interface_1.NotificationPriority.MEDIUM,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
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
        type: mongoose_1.Schema.Types.Mixed,
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
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    archivedBy: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (_doc, ret) {
            delete ret.__v;
            return ret;
        },
    },
    toObject: {
        virtuals: true,
    },
});
// Indexes for efficient querying
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, createdAt: -1 });
notificationSchema.index({ category: 1, createdAt: -1 });
notificationSchema.index({ targetAudience: 1, createdAt: -1 });
notificationSchema.index({ status: 1, scheduledAt: 1 });
notificationSchema.index({ readBy: 1 });
notificationSchema.index({ archivedBy: 1 });
notificationSchema.index({ country: 1 });
notificationSchema.index({ createdAt: -1 });
// Virtual populate for user details
notificationSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true,
});
// Pre-save middleware to update timestamps and category
notificationSchema.pre('save', function (next) {
    if (!this.category) {
        const roadtripeadoTypes = [
            notification_interface_1.NotificationType.NEW_OFFER,
            notification_interface_1.NotificationType.NEW_LOCATION,
            notification_interface_1.NotificationType.NEW_MAP,
            notification_interface_1.NotificationType.IMPORTANT_UPDATE,
            notification_interface_1.NotificationType.SYSTEM_ALERT,
        ];
        if (roadtripeadoTypes.includes(this.type)) {
            this.category = notification_interface_1.NotificationCategory.ROADTRIPEADO;
        }
        else {
            this.category = notification_interface_1.NotificationCategory.ACCOUNT;
        }
    }
    if (this.isModified('isRead') && this.isRead && !this.readAt) {
        this.readAt = new Date();
    }
    if (this.isModified('status') &&
        this.status === notification_interface_1.NotificationStatus.SENT &&
        !this.sentAt) {
        this.sentAt = new Date();
    }
    next();
});
// Static method to mark as read
notificationSchema.statics.markAsRead = async function (notificationId, userId) {
    const notif = await this.findById(notificationId);
    if (!notif)
        return null;
    if (notif.userId && notif.userId.toString() === userId) {
        return this.findByIdAndUpdate(notificationId, {
            isRead: true,
            readAt: new Date(),
            status: notification_interface_1.NotificationStatus.READ,
        }, { new: true });
    }
    // Broadcast or audience notification: add to readBy array
    return this.findByIdAndUpdate(notificationId, {
        $addToSet: { readBy: userId },
    }, { new: true });
};
// Static method to archive
notificationSchema.statics.archive = async function (notificationId, userId) {
    const notif = await this.findById(notificationId);
    if (!notif)
        return null;
    if (notif.userId && notif.userId.toString() === userId) {
        return this.findByIdAndUpdate(notificationId, {
            isArchived: true,
        }, { new: true });
    }
    // Broadcast or audience notification: add to archivedBy array
    return this.findByIdAndUpdate(notificationId, {
        $addToSet: { archivedBy: userId },
    }, { new: true });
};
exports.Notification = (0, mongoose_1.model)('Notification', notificationSchema);
