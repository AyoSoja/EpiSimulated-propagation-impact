/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** backend.ts
*/

import { ParticipantRepository } from '@backend/graph/participant.repository';
import { WorkshopRepository } from '@backend/graph/workshop.repository';
import { DependencyGraph } from '@backend/graph/dependency-graph';
import { ImpactCalculator } from '@backend/graph/impact-calculator';
import { ChangeDebouncer } from '@backend/batching/change-debouncer';
import { ChangeReconciler } from '@backend/batching/change-reconciler';
import { NotificationMerger } from '@backend/batching/notification-merger';
import { NotificationDeduplicator } from '@backend/batching/notification-deduplicator';
import { NotificationQueue } from '@backend/notification/notification-queue';
import { RateLimiter } from '@backend/notification/rate-limiter';
import { MockNotificationProvider } from '@backend/notification/mock-notification-provider';
import { NotificationDispatcher } from '@backend/notification/notification-dispatcher';
import { NotificationPipeline } from '@backend/notification/notification-pipeline';

export const DEBOUNCE_WINDOW_MS = 10_000;
export const RATE_LIMIT = { maxRequests: 4, windowMs: 30_000 };

export interface Backend {
  participantRepository: ParticipantRepository;
  workshopRepository: WorkshopRepository;
  graph: DependencyGraph;
  impactCalculator: ImpactCalculator;
  pipeline: NotificationPipeline;
  provider: MockNotificationProvider;
}

function seedDemoEvent(
  participantRepository: ParticipantRepository,
  workshopRepository: WorkshopRepository,
  graph: DependencyGraph,
): void {
  const alice = participantRepository.create({ firstName: 'Alice', lastName: 'Martin', email: 'alice@example.test' });
  const bob = participantRepository.create({ firstName: 'Bob', lastName: 'Durand', email: 'bob@example.test' });
  const chloe = participantRepository.create({ firstName: 'Chloé', lastName: 'Bernard', email: 'chloe@example.test' });
  const david = participantRepository.create({ firstName: 'David', lastName: 'Petit', email: 'david@example.test' });
  const emma = participantRepository.create({ firstName: 'Emma', lastName: 'Robert', email: 'emma@example.test' });

  const base = Date.now();
  const slot = (offsetMinutes: number) => new Date(base + offsetMinutes * 60_000);

  const intro = workshopRepository.create({ name: "Conférence d'ouverture", startTime: slot(0), endTime: slot(60) });
  const archi = workshopRepository.create({ name: 'Atelier Architecture', startTime: slot(75), endTime: slot(135) });
  const backendWorkshop = workshopRepository.create({ name: 'Atelier Backend', startTime: slot(75), endTime: slot(135) });
  const tests = workshopRepository.create({ name: 'Atelier Tests', startTime: slot(150), endTime: slot(210) });

  [intro, archi, backendWorkshop, tests].forEach((w) => graph.addNode(w.id, 'workshop', w.name));

  graph.addEdge(archi.id, intro.id);
  graph.addEdge(backendWorkshop.id, intro.id);
  graph.addEdge(tests.id, archi.id);
  graph.addEdge(tests.id, backendWorkshop.id);

  workshopRepository.enrollParticipant(intro.id, alice.id);
  workshopRepository.enrollParticipant(archi.id, bob.id);
  workshopRepository.enrollParticipant(archi.id, emma.id);
  workshopRepository.enrollParticipant(backendWorkshop.id, alice.id);
  workshopRepository.enrollParticipant(backendWorkshop.id, chloe.id);
  workshopRepository.enrollParticipant(tests.id, chloe.id);
  workshopRepository.enrollParticipant(tests.id, david.id);
}

export function createBackend(): Backend {
  const participantRepository = new ParticipantRepository();
  const workshopRepository = new WorkshopRepository(participantRepository);
  const graph = new DependencyGraph();
  seedDemoEvent(participantRepository, workshopRepository, graph);

  const impactCalculator = new ImpactCalculator(graph, workshopRepository);
  const debouncer = new ChangeDebouncer(DEBOUNCE_WINDOW_MS);
  const reconciler = new ChangeReconciler();
  const merger = new NotificationMerger(impactCalculator, workshopRepository, new NotificationDeduplicator());
  const queue = new NotificationQueue();
  const provider = new MockNotificationProvider();
  const rateLimiter = new RateLimiter(RATE_LIMIT);
  const dispatcher = new NotificationDispatcher(queue, rateLimiter, provider);
  const pipeline = new NotificationPipeline(debouncer, reconciler, merger, queue, dispatcher);

  return { participantRepository, workshopRepository, graph, impactCalculator, pipeline, provider };
}