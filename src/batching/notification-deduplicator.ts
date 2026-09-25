/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** notification-deduplicator.ts
*/

export class NotificationDeduplicator {
    private notifiedPairs: Set<string> = new Set();
  
    hasBeenNotified(participantId: string, changeId: string): boolean {
      return this.notifiedPairs.has(this.makeKey(participantId, changeId));
    }
  
    markAsNotified(participantId: string, changeId: string): void {
      this.notifiedPairs.add(this.makeKey(participantId, changeId));
    }
  
    private makeKey(participantId: string, changeId: string): string {
      return `${participantId}:${changeId}`;
    }
  }