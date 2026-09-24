/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** mock-notification-provider.ts
*/

import { NotificationProvider } from './notification-provider';
import { Notification } from './notification-queue';

export interface NotificationLogEntry {
  notification: Notification;
  sentAt: Date;
}

export class MockNotificationProvider implements NotificationProvider {
  private logs: NotificationLogEntry[] = [];

  async send(notification: Notification): Promise<void> {
    this.logs.push({ notification, sentAt: new Date() });
  }

  getLogs(): readonly NotificationLogEntry[] {
    return [...this.logs];
  }

  getSentCount(): number {
    return this.logs.length;
  }

  wasSent(notificationId: string): boolean {
    return this.logs.some((entry) => entry.notification.id === notificationId);
  }

  clear(): void {
    this.logs = [];
  }
}