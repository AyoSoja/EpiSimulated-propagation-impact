/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** change-debouncer.test.ts
*/

import { ChangeDebouncer } from '../src/batching/change-debouncer';
import { Change } from '../src/batching/change';
import { ChangeType } from '../src/notification/change-type';

function makeChange(id: string, occurredAt: Date): Change {
  return { id, workshopId: 'w1', type: ChangeType.SCHEDULE_CHANGE_MINOR, occurredAt };
}

describe('ChangeDebouncer', () => {
  it('rejette une fenêtre invalide (windowMs <= 0)', () => {
    expect(() => new ChangeDebouncer(0)).toThrow();
    expect(() => new ChangeDebouncer(-100)).toThrow();
  });

  it('scénario du brief : 5 changements successifs en moins de 2 minutes sont regroupés en 1 seul batch', () => {
    const debouncer = new ChangeDebouncer(120_000);
    const t0 = new Date('2026-01-10T10:00:00.000Z');

    for (let i = 0; i < 5; i++) {
      debouncer.recordChange(makeChange(`c${i}`, new Date(t0.getTime() + i * 20_000)), new Date(t0.getTime() + i * 20_000));
    }

    expect(debouncer.getPendingCount()).toBe(5);
    expect(debouncer.hasPendingChanges()).toBe(true);

    const lastChangeAt = t0.getTime() + 4 * 20_000;
    debouncer.flushIfIdle(new Date(lastChangeAt + 120_001));

    const ready = debouncer.drainReadyBatches();
    expect(ready).toHaveLength(1);
    expect(ready[0]).toHaveLength(5);
    expect(ready[0].map((c) => c.id)).toEqual(['c0', 'c1', 'c2', 'c3', 'c4']);
  });

  it('deux changements séparés de plus que la fenêtre forment deux batches distincts', () => {
    const debouncer = new ChangeDebouncer(60_000);
    const t0 = new Date('2026-01-10T10:00:00.000Z');
    const t1 = new Date(t0.getTime() + 61_000);

    debouncer.recordChange(makeChange('c1', t0), t0);
    debouncer.recordChange(makeChange('c2', t1), t1);

    const ready = debouncer.drainReadyBatches();
    expect(ready).toHaveLength(1);
    expect(ready[0].map((c) => c.id)).toEqual(['c1']);
    expect(debouncer.getPendingCount()).toBe(1);
  });

  it('un changement exactement à la limite de la fenêtre (== windowMs) rejoint le batch en cours', () => {
    const debouncer = new ChangeDebouncer(60_000);
    const t0 = new Date('2026-01-10T10:00:00.000Z');
    const exactlyAtLimit = new Date(t0.getTime() + 60_000);

    debouncer.recordChange(makeChange('c1', t0), t0);
    debouncer.recordChange(makeChange('c2', exactlyAtLimit), exactlyAtLimit);

    expect(debouncer.getPendingCount()).toBe(2);
  });

  it('un changement 1ms après la limite de la fenêtre ouvre un nouveau batch', () => {
    const debouncer = new ChangeDebouncer(60_000);
    const t0 = new Date('2026-01-10T10:00:00.000Z');
    const justAfterLimit = new Date(t0.getTime() + 60_001);

    debouncer.recordChange(makeChange('c1', t0), t0);
    debouncer.recordChange(makeChange('c2', justAfterLimit), justAfterLimit);

    const ready = debouncer.drainReadyBatches();
    expect(ready).toHaveLength(1);
    expect(ready[0].map((c) => c.id)).toEqual(['c1']);
    expect(debouncer.getPendingCount()).toBe(1);
  });

  it('flushIfIdle() ne clôture rien si le batch n\'est pas encore inactif assez longtemps', () => {
    const debouncer = new ChangeDebouncer(60_000);
    const t0 = new Date('2026-01-10T10:00:00.000Z');

    debouncer.recordChange(makeChange('c1', t0), t0);
    debouncer.flushIfIdle(new Date(t0.getTime() + 30_000));

    expect(debouncer.hasPendingChanges()).toBe(true);
    expect(debouncer.drainReadyBatches()).toEqual([]);
  });

  it('flushIfIdle() ne fait rien s\'il n\'y a aucun changement en attente', () => {
    const debouncer = new ChangeDebouncer(60_000);

    expect(() => debouncer.flushIfIdle(new Date())).not.toThrow();
    expect(debouncer.drainReadyBatches()).toEqual([]);
  });

  it('drainReadyBatches() ne retourne chaque batch qu\'une seule fois', () => {
    const debouncer = new ChangeDebouncer(60_000);
    const t0 = new Date('2026-01-10T10:00:00.000Z');

    debouncer.recordChange(makeChange('c1', t0), t0);
    debouncer.flushIfIdle(new Date(t0.getTime() + 60_001));

    expect(debouncer.drainReadyBatches()).toHaveLength(1);
    expect(debouncer.drainReadyBatches()).toEqual([]);
  });

  it('des rafales de changements successifs à intervalles longs produisent plusieurs batches indépendants', () => {
    const debouncer = new ChangeDebouncer(10_000);
    const t0 = new Date('2026-01-10T10:00:00.000Z');

    debouncer.recordChange(makeChange('c1', t0), t0);
    debouncer.recordChange(makeChange('c2', new Date(t0.getTime() + 2_000)), new Date(t0.getTime() + 2_000));

    const t2 = new Date(t0.getTime() + 60_000);
    debouncer.recordChange(makeChange('c3', t2), t2);
    debouncer.flushIfIdle(new Date(t2.getTime() + 10_001));

    const ready = debouncer.drainReadyBatches();
    expect(ready).toHaveLength(2);
    expect(ready[0].map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(ready[1].map((c) => c.id)).toEqual(['c3']);
  });
});