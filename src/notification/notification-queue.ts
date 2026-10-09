/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** notification-queue.ts
*/

import { MinHeap } from './min-heap';
import { UrgencyLevel } from './urgency-level';

export interface Notification {
  id: string;
  urgency: UrgencyLevel;
  createdAt: Date;
  payload: unknown;
}

interface QueuedNotification extends Notification {
  sequence: number;
}

function compareQueued(a: QueuedNotification, b: QueuedNotification): number {
  if (a.urgency !== b.urgency) {
    return a.urgency - b.urgency;
  }
  if (a.createdAt.getTime() !== b.createdAt.getTime()) {
    return a.createdAt.getTime() - b.createdAt.getTime();
  }
  return a.sequence - b.sequence;
}

function toPublicNotification(item: QueuedNotification): Notification {
  const { sequence, ...notification } = item;
  void sequence;
  return notification;
}

export class NotificationQueue {
  private readonly heap = new MinHeap<QueuedNotification>(compareQueued);
  private sequenceCounter = 0;

  enqueue(notification: Notification): void {
    this.heap.push({ ...notification, sequence: this.sequenceCounter++ });
  }

  dequeue(): Notification | undefined {
    const item = this.heap.pop();
    return item ? toPublicNotification(item) : undefined;
  }

  peek(): Notification | undefined {
    const item = this.heap.peek();
    return item ? toPublicNotification(item) : undefined;
  }

  getPending(): Notification[] {
    return this.heap.toArray().sort(compareQueued).map(toPublicNotification);
  }

  get size(): number {
    return this.heap.size;
  }

  isEmpty(): boolean {
    return this.heap.isEmpty();
  }
}