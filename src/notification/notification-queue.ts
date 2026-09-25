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

export class NotificationQueue {
  private readonly heap: MinHeap<QueuedNotification>;
  private sequenceCounter = 0;

  constructor() {
    this.heap = new MinHeap<QueuedNotification>((a, b) => {
      if (a.urgency !== b.urgency) {
        return a.urgency - b.urgency;
      }
      if (a.createdAt.getTime() !== b.createdAt.getTime()) {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }
      return a.sequence - b.sequence;
    });
  }

  enqueue(notification: Notification): void {
    this.heap.push({ ...notification, sequence: this.sequenceCounter++ });
  }

  dequeue(): Notification | undefined {
    const item = this.heap.pop();
    if (!item) {
      return undefined;
    }
    return {
      id: item.id,
      urgency: item.urgency,
      createdAt: item.createdAt,
      payload: item.payload,
    };
  }

  peek(): Notification | undefined {
    const item = this.heap.peek();
    if (!item) {
      return undefined;
    }
    return {
      id: item.id,
      urgency: item.urgency,
      createdAt: item.createdAt,
      payload: item.payload,
    };
  }

  get size(): number {
    return this.heap.size;
  }

  isEmpty(): boolean {
    return this.heap.isEmpty();
  }
}