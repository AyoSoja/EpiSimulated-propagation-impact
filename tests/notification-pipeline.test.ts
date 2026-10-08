/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** notification-pipeline.test.ts
*/

import { ParticipantRepository } from '../src/graph/participant.repository';
import { WorkshopRepository } from '../src/graph/workshop.repository';
import { DependencyGraph } from '../src/graph/dependency-graph';
import { ImpactCalculator } from '../src/graph/impact-calculator';
import { ChangeDebouncer } from '../src/batching/change-debouncer';
import { ChangeReconciler } from '../src/batching/change-reconciler';
import { NotificationMerger, MergedNotification } from '../src/batching/notification-merger';
import { NotificationQueue } from '../src/notification/notification-queue';
import { RateLimiter } from '../src/notification/rate-limiter';
import { MockNotificationProvider } from '../src/notification/mock-notification-provider';
import { NotificationDispatcher } from '../src/notification/notification-dispatcher';
import { NotificationPipeline } from '../src/notification/notification-pipeline';
import { ChangeType } from '../src/notification/change-type';
import { UrgencyLevel } from '../src/notification/urgency-level';

function buildPipeline() {
  const participantRepo = new ParticipantRepository();
  const workshopRepo = new WorkshopRepository(participantRepo);
  const graph = new DependencyGraph();
  const calculator = new ImpactCalculator(graph, workshopRepo);

  const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
  const bob = participantRepo.create({ firstName: 'Bob', lastName: 'D', email: 'bob@example.com' });
  const w1 = workshopRepo.create({ name: 'W1', startTime: new Date(), endTime: new Date() });
  const w2 = workshopRepo.create({ name: 'W2', startTime: new Date(), endTime: new Date() });
  [w1, w2].forEach((w) => graph.addNode(w.id, 'workshop', w.name));
  workshopRepo.enrollParticipant(w1.id, alice.id);
  workshopRepo.enrollParticipant(w2.id, bob.id);

  const queue = new NotificationQueue();
  const provider = new MockNotificationProvider();
  const dispatcher = new NotificationDispatcher(queue, new RateLimiter({ maxRequests: 1, windowMs: 60_000 }), provider);
  const pipeline = new NotificationPipeline(
    new ChangeDebouncer(60_000),
    new ChangeReconciler(),
    new NotificationMerger(calculator, workshopRepo),
    queue,
    dispatcher,
  );

  return { pipeline, w1, w2, alice, bob };
}

describe('NotificationPipeline — lecture de l\'état (pour l\'interface)', () => {
  const t0 = new Date('2026-01-10T10:00:00.000Z');
  const afterWindow = new Date(t0.getTime() + 60_001);

  it('pendingChangeCount compte les changements dans la fenêtre, puis retombe à 0 une fois traités', () => {
    const { pipeline, w1 } = buildPipeline();

    expect(pipeline.pendingChangeCount).toBe(0);

    pipeline.recordChange({ id: 'c1', workshopId: w1.id, type: ChangeType.GENERAL_INFO, occurredAt: t0 }, t0);
    pipeline.recordChange({ id: 'c2', workshopId: w1.id, type: ChangeType.ROOM_CHANGE, occurredAt: t0 }, t0);
    expect(pipeline.pendingChangeCount).toBe(2);

    pipeline.processReadyBatches(afterWindow);
    expect(pipeline.pendingChangeCount).toBe(0);
  });

  it('getPendingNotifications() liste les notifications en file par priorité, sans les retirer', () => {
    const { pipeline, w1, w2, alice, bob } = buildPipeline();

    pipeline.recordChange({ id: 'c1', workshopId: w1.id, type: ChangeType.GENERAL_INFO, occurredAt: t0 }, t0); // Alice : LOW
    pipeline.recordChange({ id: 'c2', workshopId: w2.id, type: ChangeType.CANCELLATION, occurredAt: t0 }, t0); // Bob : CRITICAL
    pipeline.processReadyBatches(afterWindow);

    const pending = pipeline.getPendingNotifications() as MergedNotification[];

    expect(pending.map((n) => n.participantId)).toEqual([bob.id, alice.id]); // le plus urgent d'abord
    expect(pending.map((n) => n.urgency)).toEqual([UrgencyLevel.CRITICAL, UrgencyLevel.LOW]);
    expect(pipeline.pendingQueueSize).toBe(2); // lecture seule
  });

  it('getPendingNotifications() ne contient plus que les notifications non envoyées après un dispatch limité par le débit', async () => {
    const { pipeline, w1, w2 } = buildPipeline();

    pipeline.recordChange({ id: 'c1', workshopId: w1.id, type: ChangeType.GENERAL_INFO, occurredAt: t0 }, t0);
    pipeline.recordChange({ id: 'c2', workshopId: w2.id, type: ChangeType.CANCELLATION, occurredAt: t0 }, t0);
    pipeline.processReadyBatches(afterWindow);

    const sent = await pipeline.dispatchAvailable(afterWindow); // débit = 1 seul envoi

    expect(sent).toBe(1);
    const remaining = pipeline.getPendingNotifications();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].urgency).toBe(UrgencyLevel.LOW); // la CRITICAL est partie en premier
  });
});