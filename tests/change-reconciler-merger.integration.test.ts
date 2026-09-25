/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** change-reconciler-merger.integration.test.ts
*/

import { ParticipantRepository } from '../src/graph/participant.repository';
import { WorkshopRepository } from '../src/graph/workshop.repository';
import { DependencyGraph } from '../src/graph/dependency-graph';
import { ImpactCalculator } from '../src/graph/impact-calculator';
import { NotificationMerger } from '../src/batching/notification-merger';
import { ChangeReconciler } from '../src/batching/change-reconciler';
import { Change } from '../src/batching/change';
import { ChangeType } from '../src/notification/change-type';

describe('Intégration : ChangeReconciler -> NotificationMerger', () => {
  it('un participant ne reçoit aucune notification pour une annulation immédiatement rétablie', () => {
    const participantRepo = new ParticipantRepository();
    const workshopRepo = new WorkshopRepository(participantRepo);
    const graph = new DependencyGraph();
    const calculator = new ImpactCalculator(graph, workshopRepo);
    const merger = new NotificationMerger(calculator, workshopRepo);
    const reconciler = new ChangeReconciler();

    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const workshop = workshopRepo.create({ name: 'Atelier BFS', startTime: new Date(), endTime: new Date() });
    graph.addNode(workshop.id, 'workshop', workshop.name);
    workshopRepo.enrollParticipant(workshop.id, alice.id);

    const rawChanges: Change[] = [
      { id: 'c1', workshopId: workshop.id, type: ChangeType.CANCELLATION, occurredAt: new Date('2026-01-10T10:00:00Z') },
      { id: 'c2', workshopId: workshop.id, type: ChangeType.RESTORATION, occurredAt: new Date('2026-01-10T10:05:00Z') },
    ];

    const reconciledChanges = reconciler.reconcile(rawChanges);
    const notifications = merger.mergeChangesIntoNotifications(reconciledChanges);

    expect(notifications).toHaveLength(0);
  });

  it('sans réconciliation préalable, le participant recevrait bien 2 messages contradictoires (comportement de référence)', () => {
    const participantRepo = new ParticipantRepository();
    const workshopRepo = new WorkshopRepository(participantRepo);
    const graph = new DependencyGraph();
    const calculator = new ImpactCalculator(graph, workshopRepo);
    const merger = new NotificationMerger(calculator, workshopRepo);

    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const workshop = workshopRepo.create({ name: 'Atelier BFS', startTime: new Date(), endTime: new Date() });
    graph.addNode(workshop.id, 'workshop', workshop.name);
    workshopRepo.enrollParticipant(workshop.id, alice.id);

    const rawChanges: Change[] = [
      { id: 'c1', workshopId: workshop.id, type: ChangeType.CANCELLATION, occurredAt: new Date('2026-01-10T10:00:00Z') },
      { id: 'c2', workshopId: workshop.id, type: ChangeType.RESTORATION, occurredAt: new Date('2026-01-10T10:05:00Z') },
    ];

    const [notification] = merger.mergeChangesIntoNotifications(rawChanges);

    expect(notification.changes).toHaveLength(2);
  });

  it('un changement réel après réconciliation (annulation non rétablie) reste notifié normalement', () => {
    const participantRepo = new ParticipantRepository();
    const workshopRepo = new WorkshopRepository(participantRepo);
    const graph = new DependencyGraph();
    const calculator = new ImpactCalculator(graph, workshopRepo);
    const merger = new NotificationMerger(calculator, workshopRepo);
    const reconciler = new ChangeReconciler();

    const bob = participantRepo.create({ firstName: 'Bob', lastName: 'D', email: 'bob@example.com' });
    const workshop = workshopRepo.create({ name: 'Atelier Graphes', startTime: new Date(), endTime: new Date() });
    graph.addNode(workshop.id, 'workshop', workshop.name);
    workshopRepo.enrollParticipant(workshop.id, bob.id);

    const rawChanges: Change[] = [
      { id: 'c1', workshopId: workshop.id, type: ChangeType.CANCELLATION, occurredAt: new Date('2026-01-10T10:00:00Z') },
    ];

    const reconciledChanges = reconciler.reconcile(rawChanges);
    const notifications = merger.mergeChangesIntoNotifications(reconciledChanges);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].changes.map((c) => c.id)).toEqual(['c1']);
  });
});