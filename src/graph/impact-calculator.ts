/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** impact-calculator.ts
*/

import { DependencyGraph } from './dependency-graph';
import { WorkshopRepository } from './workshop.repository';
import { Participant } from './participant';

export class ImpactCalculator {
  constructor(
    private readonly graph: DependencyGraph,
    private readonly workshopRepository: WorkshopRepository,
  ) {}

  computeImpactedWorkshopIds(changeNodeId: string): Set<string> {
    this.graph.getNode(changeNodeId);

    const visited = new Set<string>([changeNodeId]);
    const queue: string[] = [changeNodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const dependents = this.graph.getDependents(current);

      for (const dependentId of dependents) {
        if (!visited.has(dependentId)) {
          visited.add(dependentId);
          queue.push(dependentId);
        }
      }
    }

    return visited;
  }

  computeImpactedSet(changeNodeId: string): Participant[] {
    const impactedWorkshopIds = this.computeImpactedWorkshopIds(changeNodeId);

    const impactedParticipantsById = new Map<string, Participant>();

    for (const workshopId of impactedWorkshopIds) {
      const participants = this.workshopRepository.getParticipantsOfWorkshop(workshopId);
      for (const participant of participants) {
        impactedParticipantsById.set(participant.id, participant);
      }
    }

    return [...impactedParticipantsById.values()];
  }
}