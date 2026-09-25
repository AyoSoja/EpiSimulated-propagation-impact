/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** e2e-scenario-cascade-cancellation.test.ts
*/

import { ParticipantRepository } from '../src/graph/participant.repository';
import { WorkshopRepository } from '../src/graph/workshop.repository';
import { DependencyGraph } from '../src/graph/dependency-graph';
import { ImpactCalculator } from '../src/graph/impact-calculator';
import { ChangeDebouncer } from '../src/batching/change-debouncer';
import { ChangeReconciler } from '../src/batching/change-reconciler';
import { NotificationMerger } from '../src/batching/notification-merger';
import { NotificationQueue } from '../src/notification/notification-queue';
import { RateLimiter } from '../src/notification/rate-limiter';
import { MockNotificationProvider } from '../src/notification/mock-notification-provider';
import { NotificationDispatcher } from '../src/notification/notification-dispatcher';
import { NotificationPipeline } from '../src/notification/notification-pipeline';
import { MergedNotification } from '../src/batching/notification-merger';
import { ChangeType } from '../src/notification/change-type';
import { UrgencyLevel } from '../src/notification/urgency-level';

describe('E2E — Scénario 1 : annulation en cascade et notification groupée', () => {
  it('notifie tous les participants impactés (directs et en cascade), et eux seuls', async () => {
    const participantRepo = new ParticipantRepository();
    const workshopRepo = new WorkshopRepository(participantRepo);
    const graph = new DependencyGraph();
    const calculator = new ImpactCalculator(graph, workshopRepo);

    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const bob = participantRepo.create({ firstName: 'Bob', lastName: 'D', email: 'bob@example.com' });
    const carol = participantRepo.create({ firstName: 'Carol', lastName: 'K', email: 'carol@example.com' });
    const dave = participantRepo.create({ firstName: 'Dave', lastName: 'X', email: 'dave@example.com' });

    const salleCommune = workshopRepo.create({ name: 'Salle commune', startTime: new Date(), endTime: new Date() });
    const atelierB = workshopRepo.create({ name: 'Atelier B (suit la salle)', startTime: new Date(), endTime: new Date() });
    const atelierC = workshopRepo.create({ name: 'Atelier C (suit la salle)', startTime: new Date(), endTime: new Date() });
    const atelierIsole = workshopRepo.create({ name: 'Atelier isolé', startTime: new Date(), endTime: new Date() });

    [salleCommune, atelierB, atelierC, atelierIsole].forEach((w) => graph.addNode(w.id, 'workshop', w.name));
    graph.addEdge(atelierB.id, salleCommune.id);
    graph.addEdge(atelierC.id, salleCommune.id);

    workshopRepo.enrollParticipant(salleCommune.id, alice.id);
    workshopRepo.enrollParticipant(atelierB.id, bob.id);
    workshopRepo.enrollParticipant(atelierC.id, carol.id);
    workshopRepo.enrollParticipant(atelierIsole.id, dave.id);

    const debouncer = new ChangeDebouncer(30_000);
    const reconciler = new ChangeReconciler();
    const merger = new NotificationMerger(calculator, workshopRepo);
    const queue = new NotificationQueue();
    const rateLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60_000 });
    const provider = new MockNotificationProvider();
    const dispatcher = new NotificationDispatcher(queue, rateLimiter, provider);
    const pipeline = new NotificationPipeline(debouncer, reconciler, merger, queue, dispatcher);

    const t0 = new Date('2026-01-10T10:00:00.000Z');
    pipeline.recordChange(
      { id: 'change-1', workshopId: salleCommune.id, type: ChangeType.CANCELLATION, occurredAt: t0 },
      t0,
    );

    const afterWindow = new Date(t0.getTime() + 30_001);
    pipeline.processReadyBatches(afterWindow);

    expect(pipeline.pendingQueueSize).toBe(3);

    const sentCount = await pipeline.dispatchAvailable(afterWindow);

    expect(sentCount).toBe(3);
    expect(pipeline.pendingQueueSize).toBe(0);

    const logs = provider.getLogs();
    expect(logs).toHaveLength(3);

    const notifiedParticipantIds = logs.map((log) => (log.notification as MergedNotification).participantId);
    expect(notifiedParticipantIds.sort()).toEqual([alice.id, bob.id, carol.id].sort());
    expect(notifiedParticipantIds).not.toContain(dave.id);

    for (const log of logs) {
      const notification = log.notification as MergedNotification;
      expect(notification.urgency).toBe(UrgencyLevel.CRITICAL);
      expect(notification.message).toContain('Salle commune');
      expect(notification.message).toContain('Annulation');
    }
  });
});
