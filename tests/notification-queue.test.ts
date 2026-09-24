/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** notification-queue.test.ts
*/

import { NotificationQueue, Notification } from '../src/notification/notification-queue';
import { UrgencyLevel } from '../src/notification/urgency-level';

function makeNotification(id: string, urgency: UrgencyLevel, createdAt = new Date()): Notification {
  return { id, urgency, createdAt, payload: { id } };
}

describe('NotificationQueue', () => {
  it('est vide à la création', () => {
    const queue = new NotificationQueue();
    expect(queue.isEmpty()).toBe(true);
    expect(queue.size).toBe(0);
    expect(queue.dequeue()).toBeUndefined();
  });

  it('sort les notifications les plus urgentes en premier (CRITICAL avant LOW)', () => {
    const queue = new NotificationQueue();
    queue.enqueue(makeNotification('low-1', UrgencyLevel.LOW));
    queue.enqueue(makeNotification('critical-1', UrgencyLevel.CRITICAL));
    queue.enqueue(makeNotification('medium-1', UrgencyLevel.MEDIUM));
    queue.enqueue(makeNotification('high-1', UrgencyLevel.HIGH));

    const order = [
      queue.dequeue()?.id,
      queue.dequeue()?.id,
      queue.dequeue()?.id,
      queue.dequeue()?.id,
    ];

    expect(order).toEqual(['critical-1', 'high-1', 'medium-1', 'low-1']);
  });

  it('respecte l\'ordre FIFO entre deux notifications de même urgence', () => {
    const queue = new NotificationQueue();
    const t0 = new Date('2026-01-10T10:00:00.000Z');
    queue.enqueue(makeNotification('first', UrgencyLevel.HIGH, t0));
    queue.enqueue(makeNotification('second', UrgencyLevel.HIGH, t0));
    queue.enqueue(makeNotification('third', UrgencyLevel.HIGH, t0));

    expect(queue.dequeue()?.id).toBe('first');
    expect(queue.dequeue()?.id).toBe('second');
    expect(queue.dequeue()?.id).toBe('third');
  });

  it('départage deux notifications de même urgence mais de createdAt différent par le plus ancien', () => {
    const queue = new NotificationQueue();
    const earlier = new Date('2026-01-10T09:00:00.000Z');
    const later = new Date('2026-01-10T10:00:00.000Z');
    queue.enqueue(makeNotification('later', UrgencyLevel.HIGH, later));
    queue.enqueue(makeNotification('earlier', UrgencyLevel.HIGH, earlier));

    expect(queue.dequeue()?.id).toBe('earlier');
    expect(queue.dequeue()?.id).toBe('later');
  });

  it('peek() retourne undefined sur une file vide', () => {
    const queue = new NotificationQueue();
    expect(queue.peek()).toBeUndefined();
  });

  it('une notification urgente enfilée après des notifications moins urgentes passe quand même devant', () => {
    const queue = new NotificationQueue();
    queue.enqueue(makeNotification('info-1', UrgencyLevel.LOW));
    queue.enqueue(makeNotification('info-2', UrgencyLevel.LOW));
    queue.enqueue(makeNotification('cancellation', UrgencyLevel.CRITICAL));

    expect(queue.dequeue()?.id).toBe('cancellation');
  });

  it('peek() retourne la prochaine notification sans la retirer de la file', () => {
    const queue = new NotificationQueue();
    queue.enqueue(makeNotification('a', UrgencyLevel.MEDIUM));

    expect(queue.peek()?.id).toBe('a');
    expect(queue.size).toBe(1);
  });

  it('size et isEmpty reflètent correctement l\'état de la file', () => {
    const queue = new NotificationQueue();
    queue.enqueue(makeNotification('a', UrgencyLevel.LOW));
    queue.enqueue(makeNotification('b', UrgencyLevel.LOW));

    expect(queue.size).toBe(2);
    expect(queue.isEmpty()).toBe(false);

    queue.dequeue();
    queue.dequeue();

    expect(queue.size).toBe(0);
    expect(queue.isEmpty()).toBe(true);
  });

  it('scénario réaliste : cascade de changements mixtes traités dans le bon ordre', () => {
    const queue = new NotificationQueue();
    queue.enqueue(makeNotification('rappel-general', UrgencyLevel.LOW));
    queue.enqueue(makeNotification('decalage-mineur', UrgencyLevel.MEDIUM));
    queue.enqueue(makeNotification('annulation-atelier-A', UrgencyLevel.CRITICAL));
    queue.enqueue(makeNotification('changement-salle', UrgencyLevel.HIGH));
    queue.enqueue(makeNotification('decalage-majeur', UrgencyLevel.HIGH));

    const processedOrder: string[] = [];
    while (!queue.isEmpty()) {
      processedOrder.push(queue.dequeue()!.id);
    }

    expect(processedOrder).toEqual([
      'annulation-atelier-A',
      'changement-salle',
      'decalage-majeur',
      'decalage-mineur',
      'rappel-general',
    ]);
  });
});