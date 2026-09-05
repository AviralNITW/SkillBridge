import prisma from '../../../config/db';
import { Notification, NotificationPreference, NotificationDelivery } from '@prisma/client';

export const notificationRepository = {
  async create(data: {
    userId: string;
    title: string;
    message: string;
    category: string;
    priority: string;
  }): Promise<Notification> {
    return prisma.notification.create({ data });
  },

  async findByUser(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async countUnread(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  },

  async markAsRead(id: string) {
    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  },

  async getPreferences(userId: string) {
    return prisma.notificationPreference.findUnique({ where: { userId } });
  },

  async upsertPreferences(userId: string, data: Partial<NotificationPreference>) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },

  async createDelivery(data: {
    notificationId: string;
    channel: string;
    status: string;
    attemptCount?: number;
    sentAt?: Date;
  }): Promise<NotificationDelivery> {
    return prisma.notificationDelivery.create({ data });
  },

  async updateDelivery(id: string, data: Partial<NotificationDelivery>) {
    return prisma.notificationDelivery.update({ where: { id }, data });
  },

  async getPendingDeliveries() {
    return prisma.notificationDelivery.findMany({ where: { status: 'PENDING' } });
  },
};
