/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** notification-deduplicator.test.ts
*/

import { NotificationDeduplicator } from '../src/batching/notification-deduplicator';

describe('NotificationDeduplicator', () => {
  it('ne connaît aucune paire au départ', () => {
    const dedup = new NotificationDeduplicator();
    expect(dedup.hasBeenNotified('p1', 'c1')).toBe(false);
  });

  it('mémorise une paire (participant, changement) comme notifiée', () => {
    const dedup = new NotificationDeduplicator();
    dedup.markAsNotified('p1', 'c1');

    expect(dedup.hasBeenNotified('p1', 'c1')).toBe(true);
  });

  it('distingue bien les paires : un même changement pour un autre participant n\'est pas affecté', () => {
    const dedup = new NotificationDeduplicator();
    dedup.markAsNotified('p1', 'c1');

    expect(dedup.hasBeenNotified('p2', 'c1')).toBe(false);
  });

  it('distingue bien les paires : un même participant pour un autre changement n\'est pas affecté', () => {
    const dedup = new NotificationDeduplicator();
    dedup.markAsNotified('p1', 'c1');

    expect(dedup.hasBeenNotified('p1', 'c2')).toBe(false);
  });

  it('marquer deux fois la même paire ne cause pas d\'erreur (idempotent)', () => {
    const dedup = new NotificationDeduplicator();
    dedup.markAsNotified('p1', 'c1');

    expect(() => dedup.markAsNotified('p1', 'c1')).not.toThrow();
    expect(dedup.hasBeenNotified('p1', 'c1')).toBe(true);
  });
});