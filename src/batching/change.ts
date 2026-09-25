/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** change.ts
*/

import { ChangeType } from '../notification/change-type';

export interface Change {
  id: string;
  workshopId: string;
  type: ChangeType;
  occurredAt: Date;
  description?: string;
}