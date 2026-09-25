/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** change-reconciler.test.ts
*/

import { ChangeReconciler } from '../src/batching/change-reconciler';
import { Change } from '../src/batching/change';
import { ChangeType } from '../src/notification/change-type';

function makeChange(id: string, workshopId: string, type: ChangeType, occurredAt: Date): Change {
  return { id, workshopId, type, occurredAt };
}

describe('ChangeReconciler', () => {
  let reconciler: ChangeReconciler;

  beforeEach(() => {
    reconciler = new ChangeReconciler();
  });

  it('retourne un tableau vide pour un batch vide', () => {
    expect(reconciler.reconcile([])).toEqual([]);
  });

  it('un changement seul, sans opposé, est conservé tel quel', () => {
    const change = makeChange('c1', 'w1', ChangeType.CANCELLATION, new Date('2026-01-10T10:00:00Z'));

    expect(reconciler.reconcile([change])).toEqual([change]);
  });

  describe('critère d\'acceptation : séquence de changements opposés', () => {
    it('annulation suivie d\'un rétablissement : les deux s\'annulent, résultat final vide', () => {
      const cancellation = makeChange('c1', 'w1', ChangeType.CANCELLATION, new Date('2026-01-10T10:00:00Z'));
      const restoration = makeChange('c2', 'w1', ChangeType.RESTORATION, new Date('2026-01-10T10:05:00Z'));

      const result = reconciler.reconcile([cancellation, restoration]);

      expect(result).toEqual([]);
    });

    it('fonctionne même si les changements arrivent dans le batch en désordre chronologique', () => {
      const cancellation = makeChange('c1', 'w1', ChangeType.CANCELLATION, new Date('2026-01-10T10:00:00Z'));
      const restoration = makeChange('c2', 'w1', ChangeType.RESTORATION, new Date('2026-01-10T10:05:00Z'));

      const result = reconciler.reconcile([restoration, cancellation]);

      expect(result).toEqual([]);
    });

    it('rétablissement suivi d\'une nouvelle annulation : le résultat final est une annulation réelle', () => {
      const cancellation1 = makeChange('c1', 'w1', ChangeType.CANCELLATION, new Date('2026-01-10T10:00:00Z'));
      const restoration = makeChange('c2', 'w1', ChangeType.RESTORATION, new Date('2026-01-10T10:05:00Z'));
      const cancellation2 = makeChange('c3', 'w1', ChangeType.CANCELLATION, new Date('2026-01-10T10:10:00Z'));

      const result = reconciler.reconcile([cancellation1, restoration, cancellation2]);

      expect(result).toEqual([cancellation2]);
    });

    it('un rétablissement sans annulation préalable est un no-op silencieux', () => {
      const restoration = makeChange('c1', 'w1', ChangeType.RESTORATION, new Date('2026-01-10T10:00:00Z'));

      expect(reconciler.reconcile([restoration])).toEqual([]);
    });

    it('deux paires annulation/rétablissement successives s\'annulent toutes deux', () => {
      const changes = [
        makeChange('c1', 'w1', ChangeType.CANCELLATION, new Date('2026-01-10T10:00:00Z')),
        makeChange('c2', 'w1', ChangeType.RESTORATION, new Date('2026-01-10T10:05:00Z')),
        makeChange('c3', 'w1', ChangeType.CANCELLATION, new Date('2026-01-10T10:10:00Z')),
        makeChange('c4', 'w1', ChangeType.RESTORATION, new Date('2026-01-10T10:15:00Z')),
      ];

      expect(reconciler.reconcile(changes)).toEqual([]);
    });
  });

  it('n\'affecte pas les changements d\'un autre atelier (isolation par workshopId)', () => {
    const cancellationOnA = makeChange('c1', 'workshop-A', ChangeType.CANCELLATION, new Date('2026-01-10T10:00:00Z'));
    const restorationOnA = makeChange('c2', 'workshop-A', ChangeType.RESTORATION, new Date('2026-01-10T10:05:00Z'));
    const cancellationOnB = makeChange('c3', 'workshop-B', ChangeType.CANCELLATION, new Date('2026-01-10T10:02:00Z'));

    const result = reconciler.reconcile([cancellationOnA, restorationOnA, cancellationOnB]);

    expect(result).toEqual([cancellationOnB]);
  });

  it('ne touche pas aux types de changement autres que CANCELLATION/RESTORATION', () => {
    const roomChange = makeChange('c1', 'w1', ChangeType.ROOM_CHANGE, new Date('2026-01-10T10:00:00Z'));
    const generalInfo = makeChange('c2', 'w1', ChangeType.GENERAL_INFO, new Date('2026-01-10T10:01:00Z'));

    const result = reconciler.reconcile([roomChange, generalInfo]);

    expect(result).toHaveLength(2);
    expect(result.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('mixe correctement une paire qui s\'annule et un changement indépendant sur le même atelier', () => {
    const cancellation = makeChange('c1', 'w1', ChangeType.CANCELLATION, new Date('2026-01-10T10:00:00Z'));
    const roomChange = makeChange('c2', 'w1', ChangeType.ROOM_CHANGE, new Date('2026-01-10T10:02:00Z'));
    const restoration = makeChange('c3', 'w1', ChangeType.RESTORATION, new Date('2026-01-10T10:05:00Z'));

    const result = reconciler.reconcile([cancellation, roomChange, restoration]);

    expect(result).toEqual([roomChange]);
  });

  it('résultat final cohérent sur un scénario complexe multi-ateliers', () => {
    const changes = [
      makeChange('c1', 'A', ChangeType.CANCELLATION, new Date('2026-01-10T10:00:00Z')),
      makeChange('c2', 'A', ChangeType.RESTORATION, new Date('2026-01-10T10:05:00Z')),
      makeChange('c3', 'B', ChangeType.ROOM_CHANGE, new Date('2026-01-10T10:01:00Z')),
      makeChange('c4', 'C', ChangeType.CANCELLATION, new Date('2026-01-10T10:03:00Z')),
      makeChange('c5', 'A', ChangeType.GENERAL_INFO, new Date('2026-01-10T10:06:00Z')),
    ];

    const result = reconciler.reconcile(changes);

    expect(result.map((c) => c.id).sort()).toEqual(['c3', 'c4', 'c5'].sort());
  });
});