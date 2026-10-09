/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** demo.ts
*/

import { MergedNotification } from '../src/batching/notification-merger';
import { UrgencyLevel } from '../src/notification/urgency-level';
import {
  DEMO_DEBOUNCE_MS,
  DEMO_RATE_LIMIT,
  DemoScenario,
  buildDemoScenario,
  createDemoPipeline,
  demoDate,
} from './demo-fixtures';

type Logger = (line: string) => void;

function section(log: Logger, title: string): void {
  log(`\n${'='.repeat(72)}\n${title}\n${'='.repeat(72)}`);
}

function fullName(scenario: DemoScenario, participantId: string): string {
  const p = scenario.participantRepository.getById(participantId);
  return `${p.firstName} ${p.lastName}`;
}

function printSent(log: Logger, scenario: DemoScenario, notifications: MergedNotification[]): void {
  for (const n of notifications) {
    log(`  ✉  ${fullName(scenario, n.participantId)}  [${UrgencyLevel[n.urgency]}]`);
    for (const line of n.message.split('\n')) {
      log(`       ${line}`);
    }
  }
}

export async function runDemo(log: Logger = console.log): Promise<void> {
  const scenario = buildDemoScenario();
  const { workshops } = scenario;
  const { pipeline, provider } = createDemoPipeline(scenario);
  const allWorkshops = Object.values(workshops);

  section(log, 'EpiSimulated — notifier uniquement les personnes réellement impactées');

  section(log, '1. L’événement');
  log(`${allWorkshops.length} ateliers, ${scenario.participantRepository.getAll().length} participants\n`);
  for (const w of allWorkshops) {
    const names = scenario.workshopRepository.getParticipantsOfWorkshop(w.id).map((p) => p.firstName);
    log(`  ${w.name.padEnd(24)} ${names.join(', ')}`);
  }

  section(log, '2. Graphe de dépendances (« si celui-ci change… »)');
  for (const w of allWorkshops) {
    const dependents = scenario.graph.getDependents(w.id).map((id) => scenario.graph.getNode(id).label);
    log(`  ${w.name.padEnd(24)} → ${dependents.length > 0 ? dependents.join(', ') : '(personne)'}`);
  }

  section(log, `3. Cascade : annulation de « ${workshops.atelier1.name} »`);
  const impactedIds = scenario.impactCalculator.computeImpactedWorkshopIds(workshops.atelier1.id);
  log(`Ateliers impactés (${impactedIds.size}) : ${[...impactedIds].map((id) => scenario.graph.getNode(id).label).join(' | ')}`);
  const impactedPeople = scenario.impactCalculator.computeImpactedSet(workshops.atelier1.id);
  log(`Participants impactés (${impactedPeople.length}/7) : ${impactedPeople.map((p) => p.firstName).join(', ')}`);

  const isolated = scenario.impactCalculator.computeImpactedSet(workshops.atelier3.id);
  log(`\nÀ l'inverse, un changement sur « ${workshops.atelier3.name} » ne touche que ${isolated.length} personnes : ${isolated.map((p) => p.firstName).join(', ')}`);
  log('→ pas de notification à tout le monde : seulement les personnes concernées.');

  section(log, '4. Trois changements en 3 minutes → UNE notification par personne');
  for (const change of scenario.changes.burst) {
    log(`  min ${(change.occurredAt.getTime() - demoDate(0).getTime()) / 60_000} : ${change.type} sur « ${scenario.workshopRepository.getById(change.workshopId).name} »`);
    pipeline.recordChange(change, change.occurredAt);
  }

  pipeline.processReadyBatches(demoDate(13));
  log(`\nÀ min 13 : fenêtre de ${DEMO_DEBOUNCE_MS / 60_000} min pas écoulée → ${pipeline.pendingQueueSize} notification prête (regroupement en cours).`);

  pipeline.processReadyBatches(demoDate(20));
  log(`À min 20 : fenêtre écoulée → ${pipeline.pendingQueueSize} notifications fusionnées (1 par participant, pas 3 × 7 = 21).`);

  section(log, `5. Envoi limité à ${DEMO_RATE_LIMIT.maxRequests} notifications / ${DEMO_RATE_LIMIT.windowMs / 1000} s`);
  const firstWave = await pipeline.dispatchAvailable(demoDate(21));
  log(`Min 21 : ${firstWave} envoyées, ${pipeline.pendingQueueSize} retenues par la limite de débit.\n`);
  printSent(log, scenario, provider.getLogs().map((entry) => entry.notification as MergedNotification));

  const secondWave = await pipeline.dispatchAvailable(demoDate(22));
  log(`\nMin 22 : fenêtre de débit libérée → ${secondWave} envoyées, ${pipeline.pendingQueueSize} restante.`);

  section(log, '6. Changements contradictoires : annulation puis rétablissement');
  for (const change of scenario.changes.followUp) {
    log(`  ${change.type} sur « ${scenario.workshopRepository.getById(change.workshopId).name} » — ${change.description}`);
    pipeline.recordChange(change, change.occurredAt);
  }
  pipeline.processReadyBatches(demoDate(40));
  log(`\n→ L'annulation et le rétablissement de l'Atelier Frontend s'annulent : ${pipeline.pendingQueueSize} notification(s) seulement (l'info buffet).`);

  const sentBefore = provider.getSentCount();
  await pipeline.dispatchAvailable(demoDate(41));
  printSent(
    log,
    scenario,
    provider.getLogs().slice(sentBefore).map((entry) => entry.notification as MergedNotification),
  );

  section(log, '7. Rejeu accidentel : personne n’est notifié deux fois');
  pipeline.recordChange(scenario.changes.replay, demoDate(50));
  pipeline.processReadyBatches(demoDate(60));
  log(`Rejeu de « ${scenario.changes.replay.id} » → ${pipeline.pendingQueueSize} nouvelle notification.`);

  section(log, 'Démonstration terminée');
  log(`Total envoyé : ${provider.getSentCount()} notifications.`);
  log('  ✓ cascade par parcours de graphe     ✓ regroupement (debounce)');
  log('  ✓ fusion par participant            ✓ priorisation par urgence');
  log('  ✓ limite de débit                   ✓ contradictions résolues');
  log('  ✓ déduplication');
}

if (require.main === module) {
  runDemo().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}