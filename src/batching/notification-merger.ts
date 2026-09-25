/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** notification-merger.ts
*/

import { randomUUID } from 'crypto';
import { Change } from './change';
import { ImpactCalculator } from '../graph/impact-calculator';
import { WorkshopRepository } from '../graph/workshop.repository';
import { Notification } from '../notification/notification-queue';
import { UrgencyLevel, getUrgencyForChangeType } from '../notification/urgency-level';
import { CHANGE_TYPE_LABELS } from '../notification/change-type-labels';
import { NotificationDeduplicator } from './notification-deduplicator';

export interface MergedNotification extends Notification {
  participantId: string;
  changes: Change[];
  message: string;
}

export class NotificationMerger {
  constructor(
    private readonly impactCalculator: ImpactCalculator,
    private readonly workshopRepository: WorkshopRepository,
    private readonly deduplicator?: NotificationDeduplicator,
  ) {}

  mergeChangesIntoNotifications(changes: Change[], now: Date = new Date()): MergedNotification[] {
    const changesByParticipant = this.groupChangesByImpactedParticipant(changes);

    const notifications: MergedNotification[] = [];
    for (const [participantId, participantChanges] of changesByParticipant.entries()) {
      const newChanges = this.deduplicator
        ? participantChanges.filter((c) => !this.deduplicator!.hasBeenNotified(participantId, c.id))
        : participantChanges;

      if (newChanges.length === 0) {
        continue;
      }

      notifications.push({
        id: randomUUID(),
        urgency: this.computeHighestUrgency(newChanges),
        createdAt: now,
        participantId,
        changes: newChanges,
        message: this.formatMessage(newChanges),
        payload: { changeIds: newChanges.map((c) => c.id) },
      });

      if (this.deduplicator) {
        for (const change of newChanges) {
          this.deduplicator.markAsNotified(participantId, change.id);
        }
      }
    }

    return notifications;
  }

  private groupChangesByImpactedParticipant(changes: Change[]): Map<string, Change[]> {
    const changesByParticipant = new Map<string, Change[]>();

    for (const change of changes) {
      const impactedParticipants = this.impactCalculator.computeImpactedSet(change.workshopId);

      for (const participant of impactedParticipants) {
        const existing = changesByParticipant.get(participant.id) ?? [];
        existing.push(change);
        changesByParticipant.set(participant.id, existing);
      }
    }

    return changesByParticipant;
  }

  private computeHighestUrgency(changes: Change[]): UrgencyLevel {
    return Math.min(...changes.map((c) => getUrgencyForChangeType(c.type)));
  }

  private formatMessage(changes: Change[]): string {
    const header =
      changes.length === 1 ? '1 changement vous concerne :' : `${changes.length} changements vous concernent :`;

    const lines = changes.map((change) => {
      const workshop = this.workshopRepository.getById(change.workshopId);
      const label = CHANGE_TYPE_LABELS[change.type];
      const suffix = change.description ? ` (${change.description})` : '';
      return `- ${workshop.name} : ${label}${suffix}`;
    });

    return [header, ...lines].join('\n');
  }
}