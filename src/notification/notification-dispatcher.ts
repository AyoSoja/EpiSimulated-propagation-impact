/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** notification-dispatcher.ts
*/

import { NotificationQueue } from './notification-queue';
import { RateLimiter } from './rate-limiter';
import { NotificationProvider } from './notification-provider';

export class NotificationDispatcher {
  constructor(
    private readonly queue: NotificationQueue,
    private readonly rateLimiter: RateLimiter,
    private readonly provider: NotificationProvider,
  ) {}

  async dispatchNext(now: Date = new Date()): Promise<boolean> {
    if (this.queue.isEmpty()) {
      return false;
    }

    if (!this.rateLimiter.tryConsume(now)) {
      return false;
    }

    const notification = this.queue.dequeue()!;
    await this.provider.send(notification);
    return true;
  }

  async dispatchAvailable(now: Date = new Date()): Promise<number> {
    let sentCount = 0;
    while (await this.dispatchNext(now)) {
      sentCount++;
    }
    return sentCount;
  }
}