/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** workshop-dependency.service.test.ts
*/

import { ParticipantRepository } from '../src/graph/participant.repository';
import { WorkshopRepository } from '../src/graph/workshop.repository';
import { DependencyGraph } from '../src/graph/dependency-graph';
import { WorkshopDependencyService } from '../src/graph/workshop-dependency.service';
import { WorkshopNotFoundError } from '../src/graph/workshop.repository';

describe('WorkshopDependencyService', () => {
  let workshopRepo: WorkshopRepository;
  let dependencyService: WorkshopDependencyService;

  beforeEach(() => {
    const participantRepo = new ParticipantRepository();
    workshopRepo = new WorkshopRepository(participantRepo);
    dependencyService = new WorkshopDependencyService(workshopRepo, new DependencyGraph());
  });

  it('déclare une dépendance entre deux ateliers existants', () => {
    const a = workshopRepo.create({ name: 'A', startTime: new Date(), endTime: new Date() });
    const b = workshopRepo.create({ name: 'B (salle partagée)', startTime: new Date(), endTime: new Date() });

    dependencyService.declareDependency(a.id, b.id);

    expect(dependencyService.getDependenciesOf(a.id)).toEqual([b.id]);
    expect(dependencyService.getDependentsOf(b.id)).toEqual([a.id]);
  });

  it('lève WorkshopNotFoundError si un des deux ateliers n\'existe pas', () => {
    const a = workshopRepo.create({ name: 'A', startTime: new Date(), endTime: new Date() });

    expect(() => dependencyService.declareDependency(a.id, 'id-inexistant')).toThrow(
      WorkshopNotFoundError,
    );
  });

  it('gère une cascade multi-niveaux (A dépend de B, B dépend de C)', () => {
    const a = workshopRepo.create({ name: 'A', startTime: new Date(), endTime: new Date() });
    const b = workshopRepo.create({ name: 'B', startTime: new Date(), endTime: new Date() });
    const c = workshopRepo.create({ name: 'C', startTime: new Date(), endTime: new Date() });

    dependencyService.declareDependency(a.id, b.id);
    dependencyService.declareDependency(b.id, c.id);

    expect(dependencyService.getDependenciesOf(a.id)).toEqual([b.id]);
    expect(dependencyService.getDependenciesOf(b.id)).toEqual([c.id]);
  });

  it('supprime une dépendance existante', () => {
    const a = workshopRepo.create({ name: 'A', startTime: new Date(), endTime: new Date() });
    const b = workshopRepo.create({ name: 'B', startTime: new Date(), endTime: new Date() });
    dependencyService.declareDependency(a.id, b.id);

    dependencyService.removeDependency(a.id, b.id);

    expect(dependencyService.getDependenciesOf(a.id)).toEqual([]);
  });

  it('le graphe sous-jacent reste sérialisable après plusieurs déclarations', () => {
    const a = workshopRepo.create({ name: 'A', startTime: new Date(), endTime: new Date() });
    const b = workshopRepo.create({ name: 'B', startTime: new Date(), endTime: new Date() });
    dependencyService.declareDependency(a.id, b.id);

    const serialized = dependencyService.getGraph().toJSON();

    expect(() => JSON.stringify(serialized)).not.toThrow();
    expect(serialized.edges).toEqual([{ from: a.id, to: b.id }]);
  });
});