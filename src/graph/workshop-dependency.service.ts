/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** workshop-dependency.service.ts
*/

import { DependencyGraph } from './dependency-graph';
import { WorkshopRepository } from './workshop.repository';

export class WorkshopDependencyService {
  constructor(
    private readonly workshopRepository: WorkshopRepository,
    private readonly graph: DependencyGraph,
  ) {}

  declareDependency(workshopId: string, dependsOnWorkshopId: string): void {
    const workshop = this.workshopRepository.getById(workshopId);
    const dependency = this.workshopRepository.getById(dependsOnWorkshopId);

    this.graph.addNode(workshop.id, 'workshop', workshop.name);
    this.graph.addNode(dependency.id, 'workshop', dependency.name);

    this.graph.addEdge(workshopId, dependsOnWorkshopId);
  }

  removeDependency(workshopId: string, dependsOnWorkshopId: string): void {
    this.graph.removeEdge(workshopId, dependsOnWorkshopId);
  }

  getDependenciesOf(workshopId: string): string[] {
    return this.graph.getDependencies(workshopId);
  }

  getDependentsOf(workshopId: string): string[] {
    return this.graph.getDependents(workshopId);
  }

  getGraph(): DependencyGraph {
    return this.graph;
  }
}