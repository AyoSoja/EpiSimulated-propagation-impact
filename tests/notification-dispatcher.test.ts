/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** notification-dispatcher.test.ts
*/

import { NotificationQueue, Notification } from '../src/notification/notification-queue';
import { RateLimiter } from '../src/notification/rate-limiter';
import { MockNotificationProvider } from '../src/notification/mock-notification-provider';
import { NotificationDispatcher } from '../src/notification/notification-dispatcher';
import { UrgencyLevel } from '../src/notification/urgency-level';

function makeNotification(id: string, urgency = UrgencyLevel.MEDIUM): Notification {
  return { id, urgency, createdAt: new Date(), payload: { id } };
}

describe('NotificationDispatcher (intégration queue + rate limiter + provider)', () => {
  it('n\'envoie jamais plus que la limite configurée, même avec beaucoup de notifications en attente', async () => {
    const queue = new NotificationQueue();
    for (let i = 0; i < 10; i++) {
      queue.enqueue(makeNotification(`n${i}`));
    }

    const rateLimiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
    const provider = new MockNotificationProvider();
    const dispatcher = new NotificationDispatcher(queue, rateLimiter, provider);

    const now = new Date('2026-01-10T10:00:00.000Z');
    const sentCount = await dispatcher.dispatchAvailable(now);

    expect(sentCount).toBe(3);
    expect(provider.getSentCount()).toBe(3);
    expect(queue.size).toBe(7);
  });

  it('respecte l\'ordre de priorité de la file lors de l\'envoi sous contrainte de débit', async () => {
    const queue = new NotificationQueue();
    queue.enqueue(makeNotification('info', UrgencyLevel.LOW));
    queue.enqueue(makeNotification('annulation', UrgencyLevel.CRITICAL));
    queue.enqueue(makeNotification('salle', UrgencyLevel.HIGH));

    const rateLimiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });
    const provider = new MockNotificationProvider();
    const dispatcher = new NotificationDispatcher(queue, rateLimiter, provider);

    await dispatcher.dispatchAvailable(new Date('2026-01-10T10:00:00.000Z'));

    const sentIds = provider.getLogs().map((log) => log.notification.id);
    expect(sentIds).toEqual(['annulation', 'salle']);
    expect(queue.size).toBe(1);
  });

  it('reprend l\'envoi une fois la fenêtre de débit libérée', async () => {
    const queue = new NotificationQueue();
    for (let i = 0; i < 4; i++) {
      queue.enqueue(makeNotification(`n${i}`));
    }

    const rateLimiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });
    const provider = new MockNotificationProvider();
    const dispatcher = new NotificationDispatcher(queue, rateLimiter, provider);

    const t0 = new Date('2026-01-10T10:00:00.000Z');
    const firstBatch = await dispatcher.dispatchAvailable(t0);
    expect(firstBatch).toBe(2);
    expect(queue.size).toBe(2);

    const t1 = new Date(t0.getTime() + 1001);
    const secondBatch = await dispatcher.dispatchAvailable(t1);
    expect(secondBatch).toBe(2);
    expect(queue.size).toBe(0);

    expect(provider.getSentCount()).toBe(4);
  });

  it('dispatchNext() retourne false sans rien envoyer si la file est vide', async () => {
    const queue = new NotificationQueue();
    const rateLimiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
    const provider = new MockNotificationProvider();
    const dispatcher = new NotificationDispatcher(queue, rateLimiter, provider);

    const sent = await dispatcher.dispatchNext();

    expect(sent).toBe(false);
    expect(provider.getSentCount()).toBe(0);
  });

  it('dispatchAvailable() utilise l\'heure courante par défaut quand "now" n\'est pas fourni', async () => {
    const queue = new NotificationQueue();
    queue.enqueue(makeNotification('n1'));

    const rateLimiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
    const provider = new MockNotificationProvider();
    const dispatcher = new NotificationDispatcher(queue, rateLimiter, provider);

    const sentCount = await dispatcher.dispatchAvailable();

    expect(sentCount).toBe(1);
    expect(provider.getSentCount()).toBe(1);
  });
});