/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** demo.integration.test.ts
*/

import { ParticipantRepository } from '../src/graph/participant.repository';
import { WorkshopRepository } from '../src/graph/workshop.repository';
import { DependencyGraph } from '../src/graph/dependency-graph';
import { ImpactCalculator } from '../src/graph/impact-calculator';
import { ChangeType } from '../src/notification/change-type';
import { Change } from '../src/batching/change';
import { ChangeDebouncer } from '../src/batching/change-debouncer';
import { ChangeReconciler } from '../src/batching/change-reconciler';
import { NotificationMerger } from '../src/batching/notification-merger';
import { NotificationDeduplicator } from '../src/batching/notification-deduplicator';
import { NotificationQueue } from '../src/notification/notification-queue';
import { NotificationDispatcher } from '../src/notification/notification-dispatcher';
import { MockNotificationProvider } from '../src/notification/mock-notification-provider';
import { RateLimiter } from '../src/notification/rate-limiter';
import { NotificationPipeline } from '../src/notification/notification-pipeline';

describe('Demo scenario - event with cascades', () => {
  const baseDate = new Date('2026-06-15T09:00:00.000Z');

  const date = (minutes: number): Date =>
    new Date(baseDate.getTime() + minutes * 60_000);

  it('propagates an event change through multiple workshop cascades', () => {
    const participants = new ParticipantRepository();
    const workshops = new WorkshopRepository(participants);
    const graph = new DependencyGraph();

    const alice = participants.create({
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.test',
    });

    const bob = participants.create({
      firstName: 'Bob',
      lastName: 'Durand',
      email: 'bob@example.test',
    });

    const chloe = participants.create({
      firstName: 'Chloé',
      lastName: 'Bernard',
      email: 'chloe@example.test',
    });

    const david = participants.create({
      firstName: 'David',
      lastName: 'Petit',
      email: 'david@example.test',
    });

    const atelier1 = workshops.create({
      name: 'Conférence d’ouverture',
      startTime: date(0),
      endTime: date(60),
    });

    const atelier2 = workshops.create({
      name: 'Atelier Architecture',
      startTime: date(75),
      endTime: date(135),
    });

    const atelier3 = workshops.create({
      name: 'Atelier Backend',
      startTime: date(150),
      endTime: date(210),
    });

    const atelier4 = workshops.create({
      name: 'Atelier Frontend',
      startTime: date(225),
      endTime: date(285),
    });

    const atelier5 = workshops.create({
      name: 'Atelier Tests',
      startTime: date(300),
      endTime: date(360),
    });

    const atelier6 = workshops.create({
      name: 'Présentation finale',
      startTime: date(375),
      endTime: date(435),
    });

    for (const workshop of [
      atelier1,
      atelier2,
      atelier3,
      atelier4,
      atelier5,
      atelier6,
    ]) {
      graph.addNode(workshop.id, 'workshop', workshop.name);
    }

    graph.addEdge(atelier1.id, atelier2.id);
    graph.addEdge(atelier1.id, atelier3.id);
    graph.addEdge(atelier2.id, atelier4.id);
    graph.addEdge(atelier2.id, atelier5.id);
    graph.addEdge(atelier3.id, atelier5.id);
    graph.addEdge(atelier4.id, atelier6.id);
    graph.addEdge(atelier5.id, atelier6.id);

    workshops.enrollParticipant(atelier1.id, alice.id);
    workshops.enrollParticipant(atelier2.id, bob.id);
    workshops.enrollParticipant(atelier3.id, alice.id);
    workshops.enrollParticipant(atelier3.id, chloe.id);
    workshops.enrollParticipant(atelier4.id, bob.id);
    workshops.enrollParticipant(atelier4.id, david.id);
    workshops.enrollParticipant(atelier5.id, chloe.id);
    workshops.enrollParticipant(atelier6.id, david.id);

    const calculator = new ImpactCalculator(
      graph,
      workshops,
    );

    const impactedWorkshops =
      calculator.computeImpactedWorkshopIds(atelier1.id);

    expect(impactedWorkshops).toEqual(
      new Set([
        atelier1.id,
        atelier2.id,
        atelier3.id,
        atelier4.id,
        atelier5.id,
        atelier6.id,
      ]),
    );

    const impactedParticipants =
      calculator.computeImpactedSet(atelier1.id);

    expect(
      impactedParticipants.map((participant) => participant.id),
    ).toEqual(
      expect.arrayContaining([
        alice.id,
        bob.id,
        chloe.id,
        david.id,
      ]),
    );

    expect(impactedParticipants).toHaveLength(4);
  });

  it('batches several changes and generates one notification per participant', () => {
    const participants = new ParticipantRepository();
    const workshops = new WorkshopRepository(participants);
    const graph = new DependencyGraph();

    const alice = participants.create({
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.test',
    });

    const bob = participants.create({
      firstName: 'Bob',
      lastName: 'Durand',
      email: 'bob@example.test',
    });

    const workshop1 = workshops.create({
      name: 'Conférence',
      startTime: date(0),
      endTime: date(60),
    });

    const workshop2 = workshops.create({
      name: 'Atelier Architecture',
      startTime: date(75),
      endTime: date(135),
    });

    graph.addNode(workshop1.id, 'workshop', workshop1.name);
    graph.addNode(workshop2.id, 'workshop', workshop2.name);
    graph.addEdge(workshop1.id, workshop2.id);

    workshops.enrollParticipant(workshop1.id, alice.id);
    workshops.enrollParticipant(workshop2.id, bob.id);

    const calculator = new ImpactCalculator(
      graph,
      workshops,
    );

    const merger = new NotificationMerger(
      calculator,
      workshops,
      new NotificationDeduplicator(),
    );

    const debouncer = new ChangeDebouncer(5_000);
    const reconciler = new ChangeReconciler();
    const queue = new NotificationQueue();

    const provider = new MockNotificationProvider();

    const dispatcher = new NotificationDispatcher(
      queue,
      new RateLimiter({
        maxRequests: 100,
        windowMs: 60_000,
      }),
      provider,
    );

    const pipeline = new NotificationPipeline(
      debouncer,
      reconciler,
      merger,
      queue,
      dispatcher,
    );

    const changes: Change[] = [
      {
        id: 'demo-1',
        workshopId: workshop1.id,
        type: ChangeType.CANCELLATION,
        occurredAt: date(10),
        description: 'Intervenant indisponible',
      },
      {
        id: 'demo-2',
        workshopId: workshop2.id,
        type: ChangeType.ROOM_CHANGE,
        occurredAt: date(11),
        description: 'Salle modifiée',
      },
    ];

    pipeline.recordChange(changes[0], date(10));
    pipeline.recordChange(changes[1], date(11));

    pipeline.processReadyBatches(date(20));

    expect(pipeline.pendingQueueSize).toBe(2);

    return pipeline.dispatchAvailable(date(21)).then((sent) => {
      expect(sent).toBe(2);
      expect(provider.getSentCount()).toBe(2);
    });
  });

  it('deduplicates the same change for a participant', () => {
    const participants = new ParticipantRepository();
    const workshops = new WorkshopRepository(participants);
    const graph = new DependencyGraph();

    const alice = participants.create({
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.test',
    });

    const workshop = workshops.create({
      name: 'Atelier critique',
      startTime: date(0),
      endTime: date(60),
    });

    graph.addNode(
      workshop.id,
      'workshop',
      workshop.name,
    );

    workshops.enrollParticipant(
      workshop.id,
      alice.id,
    );

    const calculator = new ImpactCalculator(
      graph,
      workshops,
    );

    const deduplicator = new NotificationDeduplicator();

    const merger = new NotificationMerger(
      calculator,
      workshops,
      deduplicator,
    );

    const change: Change = {
      id: 'same-change',
      workshopId: workshop.id,
      type: ChangeType.CANCELLATION,
      occurredAt: date(10),
    };

    const firstResult =
      merger.mergeChangesIntoNotifications(
        [change],
        date(11),
      );

    const secondResult =
      merger.mergeChangesIntoNotifications(
        [change],
        date(12),
      );

    expect(firstResult).toHaveLength(1);
    expect(secondResult).toHaveLength(0);
  });
});