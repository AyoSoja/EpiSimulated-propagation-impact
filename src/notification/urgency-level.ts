/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** urgency-level.ts
*/

import { ChangeType } from './change-type';

export enum UrgencyLevel {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
}

export const CHANGE_TYPE_URGENCY_MAP: Readonly<Record<ChangeType, UrgencyLevel>> = {
  [ChangeType.CANCELLATION]: UrgencyLevel.CRITICAL,
  [ChangeType.ROOM_CHANGE]: UrgencyLevel.HIGH,
  [ChangeType.SCHEDULE_CHANGE_MAJOR]: UrgencyLevel.HIGH,
  [ChangeType.SCHEDULE_CHANGE_MINOR]: UrgencyLevel.MEDIUM,
  [ChangeType.GENERAL_INFO]: UrgencyLevel.LOW,
};

export function getUrgencyForChangeType(changeType: ChangeType): UrgencyLevel {
  return CHANGE_TYPE_URGENCY_MAP[changeType];
}