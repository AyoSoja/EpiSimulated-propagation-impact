/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** mock-notification-provider.test.ts
*/

import { MockNotificationProvider } from '../src/notification/mock-notification-provider';
import { Notification } from '../src/notification/notification-queue';
import { UrgencyLevel } from '../src/notification/urgency-level';

function makeNotification(id: string): Notification {
  return { id, urgency: UrgencyLevel.MEDIUM, createdAt: new Date(), payload: { id } };
}

describe('MockNotificationProvider', () => {
  it('n\'a aucun log au départ', () => {
    const provider = new MockNotificationProvider();
    expect(provider.getLogs()).toEqual([]);
    expect(provider.getSentCount()).toBe(0);
  });

  it('enregistre chaque envoi dans un log consultable', async () => {
    const provider = new MockNotificationProvider();
    await provider.send(makeNotification('n1'));
    await provider.send(makeNotification('n2'));

    const logs = provider.getLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].notification.id).toBe('n1');
    expect(logs[0].sentAt).toBeInstanceOf(Date);
    expect(logs[1].notification.id).toBe('n2');
  });

  it('wasSent() permet de vérifier si une notification précise a été envoyée', async () => {
    const provider = new MockNotificationProvider();
    await provider.send(makeNotification('n1'));

    expect(provider.wasSent('n1')).toBe(true);
    expect(provider.wasSent('n-jamais-envoyee')).toBe(false);
  });

  it('clear() vide le log', async () => {
    const provider = new MockNotificationProvider();
    await provider.send(makeNotification('n1'));

    provider.clear();

    expect(provider.getLogs()).toEqual([]);
  });

  it('getLogs() retourne une copie, pas une référence modifiable en interne', async () => {
    const provider = new MockNotificationProvider();
    await provider.send(makeNotification('n1'));

    const logs = provider.getLogs();
    (logs as NotificationLogEntryMutable[]).push({ notification: makeNotification('intrus'), sentAt: new Date() });

    expect(provider.getLogs()).toHaveLength(1);
  });
});

type NotificationLogEntryMutable = { notification: Notification; sentAt: Date };