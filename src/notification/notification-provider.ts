/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** notification-provider.ts
*/

import { Notification } from './notification-queue';

export interface NotificationProvider {
  send(notification: Notification): Promise<void>;
}