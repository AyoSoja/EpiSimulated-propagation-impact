/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** notification-pipeline.ts
*/

import { ChangeDebouncer } from '../batching/change-debouncer';
import { ChangeReconciler } from '../batching/change-reconciler';
import { NotificationMerger } from '../batching/notification-merger';
import { Change } from '../batching/change';
import { NotificationQueue } from '../notification/notification-queue';
import { NotificationDispatcher } from '../notification/notification-dispatcher';

export class NotificationPipeline {
  constructor(
    private readonly debouncer: ChangeDebouncer,
    private readonly reconciler: ChangeReconciler,
    private readonly merger: NotificationMerger,
    private readonly queue: NotificationQueue,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  recordChange(change: Change, now: Date): void {
    this.debouncer.recordChange(change, now);
  }

  processReadyBatches(now: Date): void {
    this.debouncer.flushIfIdle(now);

    for (const rawBatch of this.debouncer.drainReadyBatches()) {
      const reconciledChanges = this.reconciler.reconcile(rawBatch);
      const notifications = this.merger.mergeChangesIntoNotifications(reconciledChanges, now);

      for (const notification of notifications) {
        this.queue.enqueue(notification);
      }
    }
  }

  async dispatchAvailable(now: Date): Promise<number> {
    return this.dispatcher.dispatchAvailable(now);
  }

  get pendingQueueSize(): number {
    return this.queue.size;
  }
}