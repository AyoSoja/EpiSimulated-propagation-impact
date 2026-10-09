/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** demo-fixtures.ts
*/

import { ParticipantRepository } from '../src/graph/participant.repository';
import { WorkshopRepository } from '../src/graph/workshop.repository';
import { DependencyGraph } from '../src/graph/dependency-graph';
import { ImpactCalculator } from '../src/graph/impact-calculator';
import { Participant } from '../src/graph/participant';
import { Workshop } from '../src/graph/workshop';
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
import { ChangeType } from '../src/notification/change-type';

export const DEMO_BASE_DATE = new Date('2026-06-15T09:00:00.000Z');

export const DEMO_DEBOUNCE_MS = 5 * 60_000;

export const DEMO_RATE_LIMIT = { maxRequests: 5, windowMs: 60_000 };

export function demoDate(minutesFromStart: number): Date {
  return new Date(DEMO_BASE_DATE.getTime() + minutesFromStart * 60_000);
}

export interface DemoScenario {
  participantRepository: ParticipantRepository;
  workshopRepository: WorkshopRepository;
  graph: DependencyGraph;
  impactCalculator: ImpactCalculator;
  participants: {
    alice: Participant;
    bob: Participant;
    chloe: Participant;
    david: Participant;
    emma: Participant;
    felix: Participant;
    ines: Participant;
  };
  workshops: {
    atelier1: Workshop;
    atelier2: Workshop;
    atelier3: Workshop;
    atelier4: Workshop;
    atelier5: Workshop;
    atelier6: Workshop;
  };
  changes: {
    burst: Change[];
    followUp: Change[];
    replay: Change;
  };
}

export function buildDemoScenario(): DemoScenario {
  const participantRepository = new ParticipantRepository();
  const workshopRepository = new WorkshopRepository(participantRepository);
  const graph = new DependencyGraph();

  const person = (firstName: string, lastName: string) =>
    participantRepository.create({
      firstName,
      lastName,
      email: `${firstName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()}@example.test`,
    });

  const alice = person('Alice', 'Martin');
  const bob = person('Bob', 'Durand');
  const chloe = person('Chloé', 'Bernard');
  const david = person('David', 'Petit');
  const emma = person('Emma', 'Robert');
  const felix = person('Félix', 'Richard');
  const ines = person('Inès', 'Moreau');

  const atelier1 = workshopRepository.create({ name: 'Conférence d’ouverture', startTime: demoDate(0), endTime: demoDate(60) });
  const atelier2 = workshopRepository.create({ name: 'Atelier Architecture', startTime: demoDate(75), endTime: demoDate(135) });
  const atelier3 = workshopRepository.create({ name: 'Atelier Backend', startTime: demoDate(150), endTime: demoDate(210) });
  const atelier4 = workshopRepository.create({ name: 'Atelier Frontend', startTime: demoDate(225), endTime: demoDate(285) });
  const atelier5 = workshopRepository.create({ name: 'Atelier Tests', startTime: demoDate(300), endTime: demoDate(360) });
  const atelier6 = workshopRepository.create({ name: 'Présentation finale', startTime: demoDate(375), endTime: demoDate(435) });

  [atelier1, atelier2, atelier3, atelier4, atelier5, atelier6].forEach((w) =>
    graph.addNode(w.id, 'workshop', w.name),
  );

  graph.addEdge(atelier2.id, atelier1.id); // 2 dépend de 1
  graph.addEdge(atelier3.id, atelier1.id); // 3 dépend de 1
  graph.addEdge(atelier4.id, atelier2.id); // 4 dépend de 2
  graph.addEdge(atelier5.id, atelier2.id); // 5 dépend de 2
  graph.addEdge(atelier5.id, atelier3.id); // 5 dépend aussi de 3 (deux chemins depuis l'atelier 1)
  graph.addEdge(atelier6.id, atelier4.id); // 6 dépend de 4
  graph.addEdge(atelier6.id, atelier5.id); // 6 dépend aussi de 5

  const enroll = (workshop: Workshop, ...people: Participant[]) =>
    people.forEach((p) => workshopRepository.enrollParticipant(workshop.id, p.id));

  enroll(atelier1, alice);
  enroll(atelier2, bob, emma);
  enroll(atelier3, alice, chloe);
  enroll(atelier4, bob, david);
  enroll(atelier5, chloe, felix);
  enroll(atelier6, david, ines);

  const burst: Change[] = [
    { id: 'demo-change-1', workshopId: atelier1.id, type: ChangeType.CANCELLATION, occurredAt: demoDate(10), description: 'Intervenant indisponible' },
    { id: 'demo-change-2', workshopId: atelier2.id, type: ChangeType.ROOM_CHANGE, occurredAt: demoDate(11), description: 'Salle B → Salle C' },
    { id: 'demo-change-3', workshopId: atelier3.id, type: ChangeType.SCHEDULE_CHANGE_MAJOR, occurredAt: demoDate(12), description: 'Décalage de 30 minutes' },
  ];

  const followUp: Change[] = [
    { id: 'demo-change-4', workshopId: atelier4.id, type: ChangeType.CANCELLATION, occurredAt: demoDate(30), description: 'Salle indisponible' },
    { id: 'demo-change-5', workshopId: atelier4.id, type: ChangeType.RESTORATION, occurredAt: demoDate(31), description: 'Salle retrouvée' },
    { id: 'demo-change-6', workshopId: atelier6.id, type: ChangeType.GENERAL_INFO, occurredAt: demoDate(32), description: 'Buffet servi après la présentation' },
  ];

  return {
    participantRepository,
    workshopRepository,
    graph,
    impactCalculator: new ImpactCalculator(graph, workshopRepository),
    participants: { alice, bob, chloe, david, emma, felix, ines },
    workshops: { atelier1, atelier2, atelier3, atelier4, atelier5, atelier6 },
    changes: { burst, followUp, replay: burst[0] },
  };
}

export interface DemoPipeline {
  pipeline: NotificationPipeline;
  provider: MockNotificationProvider;
}

export function createDemoPipeline(scenario: DemoScenario): DemoPipeline {
  const queue = new NotificationQueue();
  const provider = new MockNotificationProvider();
  const dispatcher = new NotificationDispatcher(queue, new RateLimiter(DEMO_RATE_LIMIT), provider);
  const merger = new NotificationMerger(
    scenario.impactCalculator,
    scenario.workshopRepository,
    new NotificationDeduplicator(),
  );

  const pipeline = new NotificationPipeline(
    new ChangeDebouncer(DEMO_DEBOUNCE_MS),
    new ChangeReconciler(),
    merger,
    queue,
    dispatcher,
  );

  return { pipeline, provider };
}