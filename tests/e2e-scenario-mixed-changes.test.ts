/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** e2e-scenario-mixed-changes.test.ts
*/

import { ParticipantRepository } from '../src/graph/participant.repository';
import { WorkshopRepository } from '../src/graph/workshop.repository';
import { DependencyGraph } from '../src/graph/dependency-graph';
import { ImpactCalculator } from '../src/graph/impact-calculator';
import { ChangeDebouncer } from '../src/batching/change-debouncer';
import { ChangeReconciler } from '../src/batching/change-reconciler';
import { NotificationMerger, MergedNotification } from '../src/batching/notification-merger';
import { NotificationDeduplicator } from '../src/batching/notification-deduplicator';
import { NotificationQueue } from '../src/notification/notification-queue';
import { RateLimiter } from '../src/notification/rate-limiter';
import { MockNotificationProvider } from '../src/notification/mock-notification-provider';
import { NotificationDispatcher } from '../src/notification/notification-dispatcher';
import { NotificationPipeline } from '../src/notification/notification-pipeline';
import { ChangeType } from '../src/notification/change-type';
import { UrgencyLevel } from '../src/notification/urgency-level';

describe('E2E — Scénario 2 : rafale mixte, contradiction, débit limité et rejeu', () => {
  it('regroupe, réconcilie, priorise sous contrainte de débit, et ignore les rejeux', async () => {
    const participantRepo = new ParticipantRepository();
    const workshopRepo = new WorkshopRepository(participantRepo);
    const graph = new DependencyGraph();
    const calculator = new ImpactCalculator(graph, workshopRepo);

    const eve = participantRepo.create({ firstName: 'Eve', lastName: 'F', email: 'eve@example.com' });
    const frank = participantRepo.create({ firstName: 'Frank', lastName: 'G', email: 'frank@example.com' });

    const w1 = workshopRepo.create({ name: 'Atelier 1 (annulé puis rétabli)', startTime: new Date(), endTime: new Date() });
    const w2 = workshopRepo.create({ name: 'Atelier 2', startTime: new Date(), endTime: new Date() });
    [w1, w2].forEach((w) => graph.addNode(w.id, 'workshop', w.name));

    workshopRepo.enrollParticipant(w1.id, eve.id);
    workshopRepo.enrollParticipant(w2.id, eve.id); 
    workshopRepo.enrollParticipant(w2.id, frank.id);

    const debouncer = new ChangeDebouncer(60_000);
    const reconciler = new ChangeReconciler();
    const deduplicator = new NotificationDeduplicator();
    const merger = new NotificationMerger(calculator, workshopRepo, deduplicator);
    const queue = new NotificationQueue();
    const rateLimiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000 });
    const provider = new MockNotificationProvider();
    const dispatcher = new NotificationDispatcher(queue, rateLimiter, provider);
    const pipeline = new NotificationPipeline(debouncer, reconciler, merger, queue, dispatcher);

    const t0 = new Date('2026-01-10T10:00:00.000Z');

    pipeline.recordChange(
      { id: 'c-cancel', workshopId: w1.id, type: ChangeType.CANCELLATION, occurredAt: t0 },
      t0,
    );
    const t1 = new Date(t0.getTime() + 10_000);
    pipeline.recordChange(
      { id: 'c-restore', workshopId: w1.id, type: ChangeType.RESTORATION, occurredAt: t1 },
      t1,
    );
    const t2 = new Date(t0.getTime() + 20_000);
    pipeline.recordChange(
      { id: 'c-room', workshopId: w2.id, type: ChangeType.ROOM_CHANGE, occurredAt: t2 },
      t2,
    );

    const afterWindow = new Date(t2.getTime() + 60_001);
    pipeline.processReadyBatches(afterWindow);

    expect(pipeline.pendingQueueSize).toBe(2);

    const firstDispatchCount = await pipeline.dispatchAvailable(afterWindow);
    expect(firstDispatchCount).toBe(1);
    expect(pipeline.pendingQueueSize).toBe(1);

    const nextWindow = new Date(afterWindow.getTime() + 60_001);
    const secondDispatchCount = await pipeline.dispatchAvailable(nextWindow);
    expect(secondDispatchCount).toBe(1);
    expect(pipeline.pendingQueueSize).toBe(0);

    const logs = provider.getLogs();
    expect(logs).toHaveLength(2);

    const notifiedIds = logs.map((log) => (log.notification as MergedNotification).participantId);
    expect(notifiedIds.sort()).toEqual([eve.id, frank.id].sort());

    for (const log of logs) {
      const notification = log.notification as MergedNotification;
      expect(notification.changes.map((c) => c.id)).toEqual(['c-room']);
      expect(notification.urgency).toBe(UrgencyLevel.HIGH);
      expect(notification.message).toContain('Atelier 2');
      expect(notification.message).not.toContain('Atelier 1');
    }

    const t3 = new Date(nextWindow.getTime() + 1_000);
    pipeline.recordChange(
      { id: 'c-room', workshopId: w2.id, type: ChangeType.ROOM_CHANGE, occurredAt: t2 },
      t3,
    );
    const afterReplayWindow = new Date(t3.getTime() + 60_001);
    pipeline.processReadyBatches(afterReplayWindow);

    expect(pipeline.pendingQueueSize).toBe(0);

    const finalDispatchCount = await pipeline.dispatchAvailable(afterReplayWindow);
    expect(finalDispatchCount).toBe(0);
    expect(provider.getSentCount()).toBe(2);
  });
});