/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** demo.test.ts
*/

import { MergedNotification } from '../src/batching/notification-merger';
import { UrgencyLevel } from '../src/notification/urgency-level';
import { runDemo } from '../scripts/demo';
import { buildDemoScenario, createDemoPipeline, demoDate } from '../scripts/demo-fixtures';

function sentNotifications(provider: ReturnType<typeof createDemoPipeline>['provider']): MergedNotification[] {
  return provider.getLogs().map((entry) => entry.notification as MergedNotification);
}

describe('Démo — fixtures', () => {
  it('construit 6 ateliers, 7 participants et le graphe de cascade', () => {
    const { graph, workshopRepository, participantRepository, workshops } = buildDemoScenario();

    expect(workshopRepository.getAll()).toHaveLength(6);
    expect(participantRepository.getAll()).toHaveLength(7);

    // « si l'atelier X change, qui est directement impacté ? »
    expect(graph.getDependents(workshops.atelier1.id)).toHaveLength(2); // 2 et 3
    expect(graph.getDependents(workshops.atelier2.id)).toHaveLength(2); // 4 et 5
    expect(graph.getDependents(workshops.atelier3.id)).toHaveLength(1); // 5
    expect(graph.getDependents(workshops.atelier6.id)).toHaveLength(0); // fin de chaîne
  });

  it('inscrit certains participants à plusieurs ateliers', () => {
    const { workshopRepository, participants } = buildDemoScenario();

    expect(workshopRepository.getWorkshopsOfParticipant(participants.alice.id)).toHaveLength(2);
    expect(workshopRepository.getWorkshopsOfParticipant(participants.chloe.id)).toHaveLength(2);
    expect(workshopRepository.getWorkshopsOfParticipant(participants.emma.id)).toHaveLength(1);
  });

  it('annuler l’atelier 1 impacte la cascade complète : 6 ateliers, 7 participants', () => {
    const { impactCalculator, workshops } = buildDemoScenario();

    expect(impactCalculator.computeImpactedWorkshopIds(workshops.atelier1.id).size).toBe(6);
    expect(impactCalculator.computeImpactedSet(workshops.atelier1.id)).toHaveLength(7);
  });

  it('un changement en milieu de chaîne ne touche que les personnes concernées', () => {
    const { impactCalculator, workshops, participants } = buildDemoScenario();

    // atelier 3 -> 5 -> 6 : Alice, Chloé, Félix, David, Inès (PAS Bob ni Emma)
    const ids = impactCalculator.computeImpactedSet(workshops.atelier3.id).map((p) => p.id).sort();

    expect(ids).toEqual(
      [participants.alice.id, participants.chloe.id, participants.felix.id, participants.david.id, participants.ines.id].sort(),
    );
  });
});

describe('Démo — pipeline complet', () => {
  it('ne notifie rien tant que la fenêtre de regroupement n’est pas écoulée', () => {
    const scenario = buildDemoScenario();
    const { pipeline } = createDemoPipeline(scenario);
    scenario.changes.burst.forEach((c) => pipeline.recordChange(c, c.occurredAt));

    pipeline.processReadyBatches(demoDate(13)); // 1 min après le dernier changement

    expect(pipeline.pendingQueueSize).toBe(0);
  });

  it('fusionne 3 changements en UNE notification par participant (7 au total)', () => {
    const scenario = buildDemoScenario();
    const { pipeline, provider } = createDemoPipeline(scenario);
    scenario.changes.burst.forEach((c) => pipeline.recordChange(c, c.occurredAt));

    pipeline.processReadyBatches(demoDate(20));
    expect(pipeline.pendingQueueSize).toBe(7);

    return pipeline.dispatchAvailable(demoDate(21)).then(async () => {
      await pipeline.dispatchAvailable(demoDate(22));

      const byFirstName = new Map(
        sentNotifications(provider).map((n) => [
          scenario.participantRepository.getById(n.participantId).firstName,
          n,
        ]),
      );

      // nombre de changements concernant chaque personne (cf. graphe)
      expect(byFirstName.get('Alice')!.changes).toHaveLength(2);
      expect(byFirstName.get('Bob')!.changes).toHaveLength(2);
      expect(byFirstName.get('Emma')!.changes).toHaveLength(2);
      expect(byFirstName.get('Chloé')!.changes).toHaveLength(3);
      expect(byFirstName.get('David')!.changes).toHaveLength(3);
      expect(byFirstName.get('Félix')!.changes).toHaveLength(3);
      expect(byFirstName.get('Inès')!.changes).toHaveLength(3);

      const chloe = byFirstName.get('Chloé')!;
      expect(chloe.message).toContain('3 changements vous concernent :');
      expect(chloe.message).toContain('Conférence d’ouverture : Annulation');
      expect(chloe.urgency).toBe(UrgencyLevel.CRITICAL); // l'annulation l'emporte
    });
  });

  it('respecte la limite de débit : 5 envoyées puis 2 après libération de la fenêtre', async () => {
    const scenario = buildDemoScenario();
    const { pipeline, provider } = createDemoPipeline(scenario);
    scenario.changes.burst.forEach((c) => pipeline.recordChange(c, c.occurredAt));
    pipeline.processReadyBatches(demoDate(20));

    expect(await pipeline.dispatchAvailable(demoDate(21))).toBe(5);
    expect(pipeline.pendingQueueSize).toBe(2); // retenues, pas perdues
    expect(provider.getSentCount()).toBe(5);

    expect(await pipeline.dispatchAvailable(demoDate(22))).toBe(2);
    expect(pipeline.pendingQueueSize).toBe(0);
    expect(provider.getSentCount()).toBe(7);
  });

  it('annulation puis rétablissement s’annulent : seule l’info générale est notifiée', async () => {
    const scenario = buildDemoScenario();
    const { pipeline, provider } = createDemoPipeline(scenario);
    scenario.changes.followUp.forEach((c) => pipeline.recordChange(c, c.occurredAt));

    pipeline.processReadyBatches(demoDate(40));
    expect(pipeline.pendingQueueSize).toBe(2); // David et Inès (atelier 6 uniquement)

    await pipeline.dispatchAvailable(demoDate(41));
    const sent = sentNotifications(provider);

    expect(sent.map((n) => scenario.participantRepository.getById(n.participantId).firstName).sort()).toEqual([
      'David',
      'Inès',
    ]);
    for (const n of sent) {
      expect(n.urgency).toBe(UrgencyLevel.LOW);
      expect(n.message).toContain('Présentation finale');
      expect(n.message).not.toContain('Atelier Frontend'); // aucune trace de l'annulation rétablie
    }
  });

  it('un rejeu d’un changement déjà traité ne notifie personne', async () => {
    const scenario = buildDemoScenario();
    const { pipeline, provider } = createDemoPipeline(scenario);
    scenario.changes.burst.forEach((c) => pipeline.recordChange(c, c.occurredAt));
    pipeline.processReadyBatches(demoDate(20));
    await pipeline.dispatchAvailable(demoDate(21));
    await pipeline.dispatchAvailable(demoDate(22));
    expect(provider.getSentCount()).toBe(7);

    pipeline.recordChange(scenario.changes.replay, demoDate(50));
    pipeline.processReadyBatches(demoDate(60));

    expect(pipeline.pendingQueueSize).toBe(0);
    expect(provider.getSentCount()).toBe(7);
  });
});

describe('Démo — script de présentation', () => {
  it('se déroule jusqu’au bout et affiche les chiffres annoncés', async () => {
    const lines: string[] = [];

    await runDemo((line) => lines.push(line));
    const output = lines.join('\n');

    expect(output).toContain('Participants impactés (7/7)');
    expect(output).toContain('5 envoyées, 2 retenues par la limite de débit');
    expect(output).toContain('2 envoyées, 0 restante');
    expect(output).toContain('2 notification(s) seulement');
    expect(output).toContain('0 nouvelle notification');
    expect(output).toContain('Total envoyé : 9 notifications.');
    expect(output).toContain('Démonstration terminée');
  });
});