/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** change-type-labels.ts
*/

import { ChangeType } from './change-type';

export const CHANGE_TYPE_LABELS: Readonly<Record<ChangeType, string>> = {
  [ChangeType.CANCELLATION]: 'Annulation',
  [ChangeType.ROOM_CHANGE]: 'Changement de salle',
  [ChangeType.SCHEDULE_CHANGE_MAJOR]: "Changement d'horaire important",
  [ChangeType.SCHEDULE_CHANGE_MINOR]: "Changement d'horaire mineur",
  [ChangeType.GENERAL_INFO]: 'Information générale',
};