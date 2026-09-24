/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** impact-calculator.test.ts
*/

/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** impact-calculator.test.ts
*/

import { ParticipantRepository } from '../src/graph/participant.repository';
import { WorkshopRepository } from '../src/graph/workshop.repository';
import { DependencyGraph, NodeNotFoundError } from '../src/graph/dependency-graph';
import { ImpactCalculator } from '../src/graph/impact-calculator';

describe('ImpactCalculator', () => {
  let participantRepo: ParticipantRepository;
  let workshopRepo: WorkshopRepository;
  let graph: DependencyGraph;
  let calculator: ImpactCalculator;

  beforeEach(() => {
    participantRepo = new ParticipantRepository();
    workshopRepo = new WorkshopRepository(participantRepo);
    graph = new DependencyGraph();
    calculator = new ImpactCalculator(graph, workshopRepo);
  });

  function createWorkshop(name: string, participantIds: string[] = []) {
    const workshop = workshopRepo.create({ name, startTime: new Date(), endTime: new Date() });
    graph.addNode(workshop.id, 'workshop', name);
    for (const participantId of participantIds) {
      workshopRepo.enrollParticipant(workshop.id, participantId);
    }
    return workshop;
  }

  it('lève NodeNotFoundError si le nœud modifié n\'existe pas dans le graphe', () => {
    expect(() => calculator.computeImpactedSet('id-inexistant')).toThrow(NodeNotFoundError);
  });

  it('cas isolé : un atelier sans dépendance n\'impacte que ses propres participants', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const bob = participantRepo.create({ firstName: 'Bob', lastName: 'D', email: 'bob@example.com' });
    const isolatedWorkshop = createWorkshop('Isolé', [alice.id]);
    createWorkshop('Autre atelier', [bob.id]);

    const impacted = calculator.computeImpactedSet(isolatedWorkshop.id);

    expect(impacted.map((p) => p.id)).toEqual([alice.id]);
  });

  it('chaîne simple A <- B (B dépend de A) : changer A impacte les participants de A et B', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const bob = participantRepo.create({ firstName: 'Bob', lastName: 'D', email: 'bob@example.com' });

    const a = createWorkshop('A', [alice.id]);
    const b = createWorkshop('B', [bob.id]);
    graph.addEdge(b.id, a.id);

    const impacted = calculator.computeImpactedSet(a.id);

    expect(impacted.map((p) => p.id).sort()).toEqual([alice.id, bob.id].sort());
  });

  it('changer B (qui dépend de A) n\'impacte PAS A : pas de faux positif en amont', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const bob = participantRepo.create({ firstName: 'Bob', lastName: 'D', email: 'bob@example.com' });

    const a = createWorkshop('A', [alice.id]);
    const b = createWorkshop('B', [bob.id]);
    graph.addEdge(b.id, a.id);

    const impacted = calculator.computeImpactedSet(b.id);

    expect(impacted.map((p) => p.id)).toEqual([bob.id]);
  });

  it('cascade multi-niveaux : A <- B <- C, changer A impacte A, B et C', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const bob = participantRepo.create({ firstName: 'Bob', lastName: 'D', email: 'bob@example.com' });
    const carol = participantRepo.create({ firstName: 'Carol', lastName: 'K', email: 'carol@example.com' });

    const a = createWorkshop('A', [alice.id]);
    const b = createWorkshop('B', [bob.id]);
    const c = createWorkshop('C', [carol.id]);
    graph.addEdge(b.id, a.id);
    graph.addEdge(c.id, b.id);

    const impacted = calculator.computeImpactedSet(a.id);

    expect(impacted.map((p) => p.id).sort()).toEqual([alice.id, bob.id, carol.id].sort());
  });

  it('cas diamant : D dépend de B et C, qui dépendent tous deux de A -> pas de doublon', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const dave = participantRepo.create({ firstName: 'Dave', lastName: 'X', email: 'dave@example.com' });

    const a = createWorkshop('A', [alice.id]);
    const b = createWorkshop('B');
    const c = createWorkshop('C');
    const d = createWorkshop('D', [dave.id]);
    graph.addEdge(b.id, a.id);
    graph.addEdge(c.id, a.id);
    graph.addEdge(d.id, b.id);
    graph.addEdge(d.id, c.id);

    const impacted = calculator.computeImpactedSet(a.id);

    expect(impacted.map((p) => p.id).sort()).toEqual([alice.id, dave.id].sort());
    expect(impacted).toHaveLength(2);
  });

  it('un participant inscrit à deux ateliers impactés n\'est compté qu\'une seule fois', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });

    const a = createWorkshop('A', [alice.id]);
    const b = createWorkshop('B', [alice.id]);
    graph.addEdge(b.id, a.id);

    const impacted = calculator.computeImpactedSet(a.id);

    expect(impacted).toHaveLength(1);
    expect(impacted[0].id).toBe(alice.id);
  });

  it('graphe avec un cycle : le BFS termine et ne boucle pas indéfiniment', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const bob = participantRepo.create({ firstName: 'Bob', lastName: 'D', email: 'bob@example.com' });

    const a = createWorkshop('A', [alice.id]);
    const b = createWorkshop('B', [bob.id]);
    graph.addEdge(a.id, b.id);
    graph.addEdge(b.id, a.id);

    const impacted = calculator.computeImpactedSet(a.id);

    expect(impacted.map((p) => p.id).sort()).toEqual([alice.id, bob.id].sort());
  });

  it('un atelier sans participant n\'ajoute personne, même s\'il est impacté', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });

    const a = createWorkshop('A', [alice.id]);
    const emptyWorkshop = createWorkshop('B vide');
    graph.addEdge(emptyWorkshop.id, a.id);

    const impacted = calculator.computeImpactedSet(a.id);

    expect(impacted.map((p) => p.id)).toEqual([alice.id]);
  });
});