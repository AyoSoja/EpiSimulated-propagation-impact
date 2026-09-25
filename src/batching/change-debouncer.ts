/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** change-debouncer.ts
*/

import { Change } from './change';

export class ChangeDebouncer {
  private pendingBatch: Change[] = [];
  private lastChangeAt: Date | null = null;
  private readyBatches: Change[][] = [];

  constructor(private readonly windowMs: number) {
    if (windowMs <= 0) {
      throw new Error('windowMs must be strictly positive');
    }
  }

  recordChange(change: Change, now: Date): void {
    if (this.pendingBatch.length > 0 && this.lastChangeAt && !this.isWithinWindow(now)) {
      this.closeCurrentBatch();
    }

    this.pendingBatch.push(change);
    this.lastChangeAt = now;
  }

  flushIfIdle(now: Date): void {
    if (this.pendingBatch.length > 0 && this.lastChangeAt && !this.isWithinWindow(now)) {
      this.closeCurrentBatch();
    }
  }

  drainReadyBatches(): Change[][] {
    const batches = this.readyBatches;
    this.readyBatches = [];
    return batches;
  }

  hasPendingChanges(): boolean {
    return this.pendingBatch.length > 0;
  }

  getPendingCount(): number {
    return this.pendingBatch.length;
  }

  private isWithinWindow(now: Date): boolean {
    return now.getTime() - this.lastChangeAt!.getTime() <= this.windowMs;
  }

  private closeCurrentBatch(): void {
    this.readyBatches.push(this.pendingBatch);
    this.pendingBatch = [];
    this.lastChangeAt = null;
  }
}