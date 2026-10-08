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
import { NotificationPipeline } from '@backend/pipeline/notification-pipeline';

export interface Backend {
  participantRepository: ParticipantRepository;
  workshopRepository: WorkshopRepository;
  graph: DependencyGraph;
  impactCalculator: ImpactCalculator;
  pipeline: NotificationPipeline;
  provider: MockNotificationProvider;
}

function seedSampleWorkshops(workshopRepository: WorkshopRepository, graph: DependencyGraph): void {
  const intro = workshopRepository.create({
    name: "Conférence d'ouverture",
    startTime: new Date(),
    endTime: new Date(),
  });
  const archi = workshopRepository.create({
    name: 'Atelier Architecture',
    startTime: new Date(),
    endTime: new Date(),
  });
  const backendWorkshop = workshopRepository.create({
    name: 'Atelier Backend',
    startTime: new Date(),
    endTime: new Date(),
  });

  [intro, archi, backendWorkshop].forEach((w) => graph.addNode(w.id, 'workshop', w.name));
  graph.addEdge(archi.id, intro.id);
  graph.addEdge(backendWorkshop.id, intro.id);
}

export function createBackend(): Backend {
  const participantRepository = new ParticipantRepository();
  const workshopRepository = new WorkshopRepository(participantRepository);
  const graph = new DependencyGraph();
  seedSampleWorkshops(workshopRepository, graph);

  const impactCalculator = new ImpactCalculator(graph, workshopRepository);
  const debouncer = new ChangeDebouncer(5 * 60_000);
  const reconciler = new ChangeReconciler();
  const merger = new NotificationMerger(impactCalculator, workshopRepository, new NotificationDeduplicator());
  const queue = new NotificationQueue();
  const provider = new MockNotificationProvider();
  const rateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60_000 });
  const dispatcher = new NotificationDispatcher(queue, rateLimiter, provider);
  const pipeline = new NotificationPipeline(debouncer, reconciler, merger, queue, dispatcher);

  return { participantRepository, workshopRepository, graph, impactCalculator, pipeline, provider };
}