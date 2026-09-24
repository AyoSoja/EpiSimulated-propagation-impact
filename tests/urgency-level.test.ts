/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** urgency-level.test.ts
*/

import { ChangeType } from '../src/notification/change-type';
import { UrgencyLevel, getUrgencyForChangeType, CHANGE_TYPE_URGENCY_MAP } from '../src/notification/urgency-level';

describe('urgency-level mapping', () => {
  it('associe CANCELLATION à CRITICAL', () => {
    expect(getUrgencyForChangeType(ChangeType.CANCELLATION)).toBe(UrgencyLevel.CRITICAL);
  });

  it('associe ROOM_CHANGE et SCHEDULE_CHANGE_MAJOR à HIGH', () => {
    expect(getUrgencyForChangeType(ChangeType.ROOM_CHANGE)).toBe(UrgencyLevel.HIGH);
    expect(getUrgencyForChangeType(ChangeType.SCHEDULE_CHANGE_MAJOR)).toBe(UrgencyLevel.HIGH);
  });

  it('associe SCHEDULE_CHANGE_MINOR à MEDIUM', () => {
    expect(getUrgencyForChangeType(ChangeType.SCHEDULE_CHANGE_MINOR)).toBe(UrgencyLevel.MEDIUM);
  });

  it('associe GENERAL_INFO à LOW', () => {
    expect(getUrgencyForChangeType(ChangeType.GENERAL_INFO)).toBe(UrgencyLevel.LOW);
  });

  it('le mapping couvre bien toutes les valeurs de ChangeType (garanti aussi par le typage)', () => {
    const allChangeTypes = Object.values(ChangeType);
    const mappedTypes = Object.keys(CHANGE_TYPE_URGENCY_MAP);

    expect(mappedTypes.sort()).toEqual(allChangeTypes.sort());
  });

  it('l\'ordre numérique des niveaux reflète bien l\'ordre de priorité voulu', () => {
    expect(UrgencyLevel.CRITICAL).toBeLessThan(UrgencyLevel.HIGH);
    expect(UrgencyLevel.HIGH).toBeLessThan(UrgencyLevel.MEDIUM);
    expect(UrgencyLevel.MEDIUM).toBeLessThan(UrgencyLevel.LOW);
  });
});