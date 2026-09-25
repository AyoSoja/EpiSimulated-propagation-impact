/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** demo.ts
*/

import { ParticipantRepository } from '../src/graph/participant.repository';
import { WorkshopRepository } from '../src/graph/workshop.repository';
import { DependencyGraph } from '../src/graph/dependency-graph';
import { ImpactCalculator } from '../src/graph/impact-calculator';
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

const BASE_DATE = new Date('2026-06-15T09:00:00.000Z');

function date(minutes: number): Date {
  return new Date(BASE_DATE.getTime() + minutes * 60_000);
}

function printSection(title: string): void {
  console.log(`\n${'='.repeat(70)}`);
  console.log(title);
  console.log('='.repeat(70));
}

function printParticipants(
  workshopRepository: WorkshopRepository,
  workshopIds: string[],
): void {
  for (const workshopId of workshopIds) {
    const workshop = workshopRepository.getById(workshopId);
    const participants = workshopRepository.getParticipantsOfWorkshop(workshopId);

    console.log(
      `  ${workshop.name}: ${participants
        .map((participant) => `${participant.firstName} ${participant.lastName}`)
        .join(', ')}`,
    );
  }
}

async function main(): Promise<void> {
  printSection('EpiSimulated - scénario de démonstration');

  const participantRepository = new ParticipantRepository();
  const workshopRepository = new WorkshopRepository(participantRepository);
  const graph = new DependencyGraph();

  /*
   * Participants
   *
   * Alice  -> Atelier 1 + Atelier 3
   * Bob    -> Atelier 2 + Atelier 4
   * Chloé  -> Atelier 3 + Atelier 5
   * David  -> Atelier 4 + Atelier 6
   * Emma   -> Atelier 2
   * Félix  -> Atelier 5
   * Inès   -> Atelier 6
   */
  const alice = participantRepository.create({
    firstName: 'Alice',
    lastName: 'Martin',
    email: 'alice@example.test',
  });

  const bob = participantRepository.create({
    firstName: 'Bob',
    lastName: 'Durand',
    email: 'bob@example.test',
  });

  const chloe = participantRepository.create({
    firstName: 'Chloé',
    lastName: 'Bernard',
    email: 'chloe@example.test',
  });

  const david = participantRepository.create({
    firstName: 'David',
    lastName: 'Petit',
    email: 'david@example.test',
  });

  const emma = participantRepository.create({
    firstName: 'Emma',
    lastName: 'Robert',
    email: 'emma@example.test',
  });

  const felix = participantRepository.create({
    firstName: 'Félix',
    lastName: 'Richard',
    email: 'felix@example.test',
  });

  const ines = participantRepository.create({
    firstName: 'Inès',
    lastName: 'Moreau',
    email: 'ines@example.test',
  });

  /*
   * Ateliers
   *
   * Architecture de démonstration :
   *
   * Atelier 1 ──► Atelier 2 ──► Atelier 4 ──► Atelier 6
   *      │             │
   *      │             └──────► Atelier 5
   *      │
   *      └────────────────────► Atelier 3 ──► Atelier 5
   *
   * Une modification de l'Atelier 1 provoque donc
   * plusieurs cascades et peut toucher le même participant
   * via plusieurs chemins.
   */
  const atelier1 = workshopRepository.create({
    name: 'Conférence d’ouverture',
    startTime: date(0),
    endTime: date(60),
  });

  const atelier2 = workshopRepository.create({
    name: 'Atelier Architecture',
    startTime: date(75),
    endTime: date(135),
  });

  const atelier3 = workshopRepository.create({
    name: 'Atelier Backend',
    startTime: date(150),
    endTime: date(210),
  });

  const atelier4 = workshopRepository.create({
    name: 'Atelier Frontend',
    startTime: date(225),
    endTime: date(285),
  });

  const atelier5 = workshopRepository.create({
    name: 'Atelier Tests',
    startTime: date(300),
    endTime: date(360),
  });

  const atelier6 = workshopRepository.create({
    name: 'Présentation finale',
    startTime: date(375),
    endTime: date(435),
  });

  const workshops = [
    atelier1,
    atelier2,
    atelier3,
    atelier4,
    atelier5,
    atelier6,
  ];

  for (const workshop of workshops) {
    graph.addNode(workshop.id, 'workshop', workshop.name);
  }

  /*
   * Dépendances.
   *
   * Une arête A -> B signifie que B dépend de A.
   */
  graph.addEdge(atelier1.id, atelier2.id);
  graph.addEdge(atelier1.id, atelier3.id);
  graph.addEdge(atelier2.id, atelier4.id);
  graph.addEdge(atelier2.id, atelier5.id);
  graph.addEdge(atelier3.id, atelier5.id);
  graph.addEdge(atelier4.id, atelier6.id);
  graph.addEdge(atelier5.id, atelier6.id);

  /*
   * Inscriptions.
   */
  await enroll(workshopRepository, atelier1.id, alice.id);
  await enroll(workshopRepository, atelier2.id, bob.id);
  await enroll(workshopRepository, atelier2.id, emma.id);
  await enroll(workshopRepository, atelier3.id, alice.id);
  await enroll(workshopRepository, atelier3.id, chloe.id);
  await enroll(workshopRepository, atelier4.id, bob.id);
  await enroll(workshopRepository, atelier4.id, david.id);
  await enroll(workshopRepository, atelier5.id, chloe.id);
  await enroll(workshopRepository, atelier5.id, felix.id);
  await enroll(workshopRepository, atelier6.id, david.id);
  await enroll(workshopRepository, atelier6.id, ines.id);

  printSection('1. Événement et participants');

  console.log(`Ateliers : ${workshops.length}`);
  console.log(`Participants : ${participantRepository.getAll().length}`);

  printParticipants(workshopRepository, workshops.map((workshop) => workshop.id));

  printSection('2. Graphe de dépendances');

  for (const workshop of workshops) {
    const dependents = graph
      .getDependents(workshop.id)
      .map((id) => graph.getNode(id).label);

    if (dependents.length > 0) {
      console.log(`  ${workshop.name}`);
      console.log(`    └── dépend de : ${dependents.join(', ')}`);
    }
  }

  /*
   * Calcul d'impact direct.
   */
  const impactCalculator = new ImpactCalculator(
    graph,
    workshopRepository,
  );

  printSection('3. Cascade provoquée par une annulation');

  const impactedWorkshopIds = impactCalculator.computeImpactedWorkshopIds(
    atelier1.id,
  );

  console.log(
    `Modification : ${atelier1.name} → ANNULATION`,
  );

  console.log('\nAteliers impactés :');

  for (const workshopId of impactedWorkshopIds) {
    console.log(`  → ${graph.getNode(workshopId).label}`);
  }

  const impactedParticipants = impactCalculator.computeImpactedSet(
    atelier1.id,
  );

  console.log('\nParticipants impactés :');

  for (const participant of impactedParticipants) {
    console.log(
      `  → ${participant.firstName} ${participant.lastName}`,
    );
  }

  /*
   * Pipeline complet.
   */
  printSection('4. Pipeline de notifications');

  const deduplicator = new NotificationDeduplicator();

  const merger = new NotificationMerger(
    impactCalculator,
    workshopRepository,
    deduplicator,
  );

  const debouncer = new ChangeDebouncer(5_000);
  const reconciler = new ChangeReconciler();
  const queue = new NotificationQueue();

  const provider = new MockNotificationProvider();

  const rateLimiter = new RateLimiter({
    maxRequests: 100,
    windowMs: 60_000,
  });

  const dispatcher = new NotificationDispatcher(
    queue,
    rateLimiter,
    provider,
  );

  const pipeline = new NotificationPipeline(
    debouncer,
    reconciler,
    merger,
    queue,
    dispatcher,
  );

  /*
   * Trois changements très rapprochés :
   *
   * - annulation de l'atelier 1 ;
   * - changement de salle de l'atelier 2 ;
   * - changement horaire majeur de l'atelier 3.
   *
   * Le debouncer doit les regrouper.
   *
   * L'atelier 2 et l'atelier 3 sont eux-mêmes dans la cascade
   * de l'atelier 1 : certains participants vont donc être
   * concernés par plusieurs changements.
   */
  const changes: Change[] = [
    {
      id: 'demo-change-1',
      workshopId: atelier1.id,
      type: ChangeType.CANCELLATION,
      occurredAt: date(10),
      description: 'Intervenant indisponible',
    },
    {
      id: 'demo-change-2',
      workshopId: atelier2.id,
      type: ChangeType.ROOM_CHANGE,
      occurredAt: date(11),
      description: 'Salle B → Salle C',
    },
    {
      id: 'demo-change-3',
      workshopId: atelier3.id,
      type: ChangeType.SCHEDULE_CHANGE_MAJOR,
      occurredAt: date(12),
      description: 'Décalage de 30 minutes',
    },
  ];

  for (const change of changes) {
    pipeline.recordChange(change, change.occurredAt);
  }

  /*
   * On avance suffisamment dans le temps pour fermer
   * la fenêtre de debounce.
   */
  pipeline.processReadyBatches(date(20));

  console.log(
    `Changements reçus : ${changes.length}`,
  );

  console.log(
    `Notifications en attente après fusion/déduplication : ${pipeline.pendingQueueSize}`,
  );

  printSection('5. Notifications générées');

  while (!queue.isEmpty()) {
    const notification = queue.dequeue()!;

    console.log(`Notification : ${notification.id}`);
    console.log(`Urgence      : ${notification.urgency}`);
    console.log(`Payload      : ${JSON.stringify(notification.payload)}`);
    console.log();
  }

  /*
   * Pour montrer réellement le dispatcher, on reconstruit
   * le pipeline avec les mêmes composants et on rejoue les changements.
   */
  const queueForDispatch = new NotificationQueue();

  const mergerForDispatch = new NotificationMerger(
    impactCalculator,
    workshopRepository,
    new NotificationDeduplicator(),
  );

  const notifications = mergerForDispatch.mergeChangesIntoNotifications(
    changes,
    date(20),
  );

  for (const notification of notifications) {
    queueForDispatch.enqueue(notification);
  }

  const dispatchProvider = new MockNotificationProvider();

  const dispatchRateLimiter = new RateLimiter({
    maxRequests: 100,
    windowMs: 60_000,
  });

  const dispatchDispatcher = new NotificationDispatcher(
    queueForDispatch,
    dispatchRateLimiter,
    dispatchProvider,
  );

  const sent = await dispatchDispatcher.dispatchAvailable(date(21));

  console.log(`Notifications envoyées : ${sent}`);

  for (const log of dispatchProvider.getLogs()) {
    console.log(
      `  → ${log.notification.id} / urgence ${log.notification.urgency}`,
    );
  }

  printSection('Démonstration terminée');

  console.log('Le scénario montre :');
  console.log('  ✓ plusieurs ateliers');
  console.log('  ✓ plusieurs niveaux de dépendances');
  console.log('  ✓ plusieurs chemins de cascade');
  console.log('  ✓ participants présents dans plusieurs ateliers');
  console.log('  ✓ batching de changements');
  console.log('  ✓ fusion des notifications');
  console.log('  ✓ déduplication');
  console.log('  ✓ priorisation');
  console.log('  ✓ dispatch avec rate limiting');
}

async function enroll(
  repository: WorkshopRepository,
  workshopId: string,
  participantId: string,
): Promise<void> {
  repository.enrollParticipant(workshopId, participantId);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});