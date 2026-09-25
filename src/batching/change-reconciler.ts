/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** change-reconciler.ts
*/

import { Change } from './change';
import { ChangeType } from '../notification/change-type';

export class ChangeReconciler {
  reconcile(changes: Change[]): Change[] {
    const changesByWorkshop = this.groupByWorkshop(changes);

    const result: Change[] = [];
    for (const workshopChanges of changesByWorkshop.values()) {
      result.push(...this.reconcileForOneWorkshop(workshopChanges));
    }

    return result.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  }

  private reconcileForOneWorkshop(workshopChanges: Change[]): Change[] {
    const sorted = [...workshopChanges].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    const result: Change[] = [];
    const pendingCancellations: Change[] = [];

    for (const change of sorted) {
      if (change.type === ChangeType.CANCELLATION) {
        pendingCancellations.push(change);
        continue;
      }

      if (change.type === ChangeType.RESTORATION) {
        if (pendingCancellations.length > 0) {
          pendingCancellations.pop();
        }
        continue;
      }

      result.push(change);
    }

    result.push(...pendingCancellations);

    return result;
  }

  private groupByWorkshop(changes: Change[]): Map<string, Change[]> {
    const map = new Map<string, Change[]>();
    for (const change of changes) {
      const existing = map.get(change.workshopId) ?? [];
      existing.push(change);
      map.set(change.workshopId, existing);
    }
    return map;
  }
}