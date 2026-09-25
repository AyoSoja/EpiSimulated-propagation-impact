/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** notification-merger.test.ts
*/

import { ParticipantRepository } from '../src/graph/participant.repository';
import { WorkshopRepository } from '../src/graph/workshop.repository';
import { DependencyGraph } from '../src/graph/dependency-graph';
import { ImpactCalculator } from '../src/graph/impact-calculator';
import { NotificationMerger } from '../src/batching/notification-merger';
import { Change } from '../src/batching/change';
import { ChangeType } from '../src/notification/change-type';
import { UrgencyLevel } from '../src/notification/urgency-level';

describe('NotificationMerger', () => {
  let participantRepo: ParticipantRepository;
  let workshopRepo: WorkshopRepository;
  let graph: DependencyGraph;
  let calculator: ImpactCalculator;
  let merger: NotificationMerger;

  beforeEach(() => {
    participantRepo = new ParticipantRepository();
    workshopRepo = new WorkshopRepository(participantRepo);
    graph = new DependencyGraph();
    calculator = new ImpactCalculator(graph, workshopRepo);
    merger = new NotificationMerger(calculator, workshopRepo);
  });

  function createWorkshop(name: string, participantIds: string[] = []) {
    const workshop = workshopRepo.create({ name, startTime: new Date(), endTime: new Date() });
    graph.addNode(workshop.id, 'workshop', name);
    for (const id of participantIds) {
      workshopRepo.enrollParticipant(workshop.id, id);
    }
    return workshop;
  }

  function makeChange(id: string, workshopId: string, type: ChangeType, description?: string): Change {
    return { id, workshopId, type, occurredAt: new Date(), description };
  }

  it('retourne un tableau vide pour un batch de changements vide', () => {
    expect(merger.mergeChangesIntoNotifications([])).toEqual([]);
  });

  it('fusionne plusieurs changements concernant le même participant en une seule notification', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const a = createWorkshop('Atelier BFS', [alice.id]);
    const b = createWorkshop('Atelier Graphes avancés', [alice.id]);

    const changes = [
      makeChange('c1', a.id, ChangeType.ROOM_CHANGE),
      makeChange('c2', b.id, ChangeType.SCHEDULE_CHANGE_MINOR),
    ];

    const notifications = merger.mergeChangesIntoNotifications(changes);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].participantId).toBe(alice.id);
    expect(notifications[0].changes).toHaveLength(2);
    expect(notifications[0].changes.map((c) => c.id).sort()).toEqual(['c1', 'c2']);
  });

  it('critère d\'acceptation : la notification fusionnée contient TOUS les changements pertinents', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const a = createWorkshop('A', [alice.id]);
    const b = createWorkshop('B', [alice.id]);
    const c = createWorkshop('C', [alice.id]);

    const changes = [
      makeChange('c1', a.id, ChangeType.CANCELLATION),
      makeChange('c2', b.id, ChangeType.ROOM_CHANGE),
      makeChange('c3', c.id, ChangeType.GENERAL_INFO),
    ];

    const [notification] = merger.mergeChangesIntoNotifications(changes);

    expect(notification.changes).toHaveLength(3);
    expect(notification.changes.map((c) => c.id).sort()).toEqual(['c1', 'c2', 'c3']);
  });

  it('un participant non concerné par un changement ne le retrouve pas dans sa notification', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const bob = participantRepo.create({ firstName: 'Bob', lastName: 'D', email: 'bob@example.com' });
    const workshopAlice = createWorkshop('Atelier Alice', [alice.id]);
    const workshopBob = createWorkshop('Atelier Bob', [bob.id]);

    const changes = [
      makeChange('c1', workshopAlice.id, ChangeType.CANCELLATION),
      makeChange('c2', workshopBob.id, ChangeType.CANCELLATION),
    ];

    const notifications = merger.mergeChangesIntoNotifications(changes);

    expect(notifications).toHaveLength(2);
    const aliceNotif = notifications.find((n) => n.participantId === alice.id)!;
    const bobNotif = notifications.find((n) => n.participantId === bob.id)!;

    expect(aliceNotif.changes.map((c) => c.id)).toEqual(['c1']);
    expect(bobNotif.changes.map((c) => c.id)).toEqual(['c2']);
  });

  it('l\'urgence de la notification fusionnée est la plus critique parmi les changements pertinents', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const a = createWorkshop('A', [alice.id]);
    const b = createWorkshop('B', [alice.id]);

    const changes = [
      makeChange('c1', a.id, ChangeType.GENERAL_INFO),
      makeChange('c2', b.id, ChangeType.CANCELLATION),
    ];

    const [notification] = merger.mergeChangesIntoNotifications(changes);

    expect(notification.urgency).toBe(UrgencyLevel.CRITICAL);
  });

  it('critère d\'acceptation : le message est formaté de façon lisible', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const a = createWorkshop('Introduction au BFS', [alice.id]);
    const b = createWorkshop('Clôture', [alice.id]);

    const changes = [
      makeChange('c1', a.id, ChangeType.CANCELLATION),
      makeChange('c2', b.id, ChangeType.ROOM_CHANGE, 'Salle B204 au lieu de B201'),
    ];

    const [notification] = merger.mergeChangesIntoNotifications(changes);

    expect(notification.message).toBe(
      [
        '2 changements vous concernent :',
        '- Introduction au BFS : Annulation',
        '- Clôture : Changement de salle (Salle B204 au lieu de B201)',
      ].join('\n'),
    );
  });

  it('utilise un en-tête au singulier pour un seul changement pertinent', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const a = createWorkshop('Atelier A', [alice.id]);

    const [notification] = merger.mergeChangesIntoNotifications([
      makeChange('c1', a.id, ChangeType.GENERAL_INFO),
    ]);

    expect(notification.message.startsWith('1 changement vous concerne :')).toBe(true);
  });

  it('les notifications produites sont directement compatibles avec NotificationQueue', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const a = createWorkshop('A', [alice.id]);

    const [notification] = merger.mergeChangesIntoNotifications([
      makeChange('c1', a.id, ChangeType.CANCELLATION),
    ]);

    expect(notification.id).toBeDefined();
    expect(notification.urgency).toBeDefined();
    expect(notification.createdAt).toBeInstanceOf(Date);
    expect(notification.payload).toBeDefined();
  });

  it('scénario réaliste avec cascade : un changement en amont impacte plusieurs participants via le graphe', () => {
    const alice = participantRepo.create({ firstName: 'Alice', lastName: 'M', email: 'alice@example.com' });
    const bob = participantRepo.create({ firstName: 'Bob', lastName: 'D', email: 'bob@example.com' });

    const salleCommune = createWorkshop('Salle commune', [alice.id]);
    const atelierDependant = createWorkshop('Atelier qui suit', [bob.id]);
    graph.addEdge(atelierDependant.id, salleCommune.id);

    const changes = [makeChange('c1', salleCommune.id, ChangeType.ROOM_CHANGE)];

    const notifications = merger.mergeChangesIntoNotifications(changes);

    expect(notifications).toHaveLength(2);
    expect(notifications.map((n) => n.participantId).sort()).toEqual([alice.id, bob.id].sort());
  });
});