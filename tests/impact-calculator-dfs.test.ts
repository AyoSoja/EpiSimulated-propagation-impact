/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** impact-calculator-dfs.test.ts
*/

import { ParticipantRepository } from '../src/graph/participant.repository';
import { WorkshopRepository } from '../src/graph/workshop.repository';
import { DependencyGraph, NodeNotFoundError } from '../src/graph/dependency-graph';
import { ImpactCalculator } from '../src/graph/impact-calculator';

describe('ImpactCalculator - computeImpactedWorkshopIdsDFS', () => {
  let workshopRepo: WorkshopRepository;
  let graph: DependencyGraph;
  let calculator: ImpactCalculator;

  beforeEach(() => {
    const participantRepo = new ParticipantRepository();
    workshopRepo = new WorkshopRepository(participantRepo);
    graph = new DependencyGraph();
    calculator = new ImpactCalculator(graph, workshopRepo);
  });

  function createWorkshop(name: string) {
    const workshop = workshopRepo.create({ name, startTime: new Date(), endTime: new Date() });
    graph.addNode(workshop.id, 'workshop', name);
    return workshop;
  }

  it('lève NodeNotFoundError si le nœud modifié n\'existe pas', () => {
    expect(() => calculator.computeImpactedWorkshopIdsDFS('id-inexistant')).toThrow(
      NodeNotFoundError,
    );
  });

  it('retourne le même ensemble de nœuds impactés que le BFS sur une cascade simple', () => {
    const a = createWorkshop('A');
    const b = createWorkshop('B');
    const c = createWorkshop('C');
    graph.addEdge(b.id, a.id);
    graph.addEdge(c.id, b.id);

    const bfsResult = calculator.computeImpactedWorkshopIds(a.id);
    const dfsResult = calculator.computeImpactedWorkshopIdsDFS(a.id);

    expect([...dfsResult].sort()).toEqual([...bfsResult].sort());
  });

  it('cas diamant : le DFS ne compte pas de doublon non plus', () => {
    const a = createWorkshop('A');
    const b = createWorkshop('B');
    const c = createWorkshop('C');
    const d = createWorkshop('D');
    graph.addEdge(b.id, a.id);
    graph.addEdge(c.id, a.id);
    graph.addEdge(d.id, b.id);
    graph.addEdge(d.id, c.id);

    const result = calculator.computeImpactedWorkshopIdsDFS(a.id);

    expect(result.size).toBe(4);
  });

  it('gère un cycle sans boucle infinie (version itérative, pas de risque de stack overflow)', () => {
    const a = createWorkshop('A');
    const b = createWorkshop('B');
    graph.addEdge(a.id, b.id);
    graph.addEdge(b.id, a.id);

    const result = calculator.computeImpactedWorkshopIdsDFS(a.id);

    expect([...result].sort()).toEqual([a.id, b.id].sort());
  });
});