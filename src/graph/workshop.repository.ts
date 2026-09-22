/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** workshop.repository.ts
*/

import { randomUUID } from 'crypto';
import { Workshop, CreateWorkshopInput, UpdateWorkshopInput } from './workshop';
import { Participant } from './participant';
import { ParticipantRepository } from './participant.repository';

export class WorkshopNotFoundError extends Error {
  constructor(id: string) {
    super(`Workshop with id "${id}" not found`);
    this.name = 'WorkshopNotFoundError';
  }
}

export class ParticipantAlreadyEnrolledError extends Error {
  constructor(participantId: string, workshopId: string) {
    super(`Participant "${participantId}" is already enrolled in workshop "${workshopId}"`);
    this.name = 'ParticipantAlreadyEnrolledError';
  }
}

export class ParticipantNotEnrolledError extends Error {
  constructor(participantId: string, workshopId: string) {
    super(`Participant "${participantId}" is not enrolled in workshop "${workshopId}"`);
    this.name = 'ParticipantNotEnrolledError';
  }
}

export class WorkshopRepository {
  private workshops: Map<string, Workshop> = new Map();

  constructor(private readonly participantRepository: ParticipantRepository) {}

  create(input: CreateWorkshopInput): Workshop {
    const now = new Date();
    const workshop: Workshop = {
      id: randomUUID(),
      name: input.name,
      startTime: input.startTime,
      endTime: input.endTime,
      participantIds: [],
      createdAt: now,
      updatedAt: now,
    };

    this.workshops.set(workshop.id, workshop);
    return workshop;
  }

  getById(id: string): Workshop {
    const workshop = this.workshops.get(id);
    if (!workshop) {
      throw new WorkshopNotFoundError(id);
    }
    return workshop;
  }

  getAll(): Workshop[] {
    return [...this.workshops.values()];
  }

  update(id: string, input: UpdateWorkshopInput): Workshop {
    const existing = this.getById(id);

    const updated: Workshop = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    this.workshops.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.workshops.has(id)) {
      throw new WorkshopNotFoundError(id);
    }
    this.workshops.delete(id);
  }

  enrollParticipant(workshopId: string, participantId: string): Workshop {
    const workshop = this.getById(workshopId);

    this.participantRepository.getById(participantId);

    if (workshop.participantIds.includes(participantId)) {
      throw new ParticipantAlreadyEnrolledError(participantId, workshopId);
    }

    const updated: Workshop = {
      ...workshop,
      participantIds: [...workshop.participantIds, participantId],
      updatedAt: new Date(),
    };

    this.workshops.set(workshopId, updated);
    return updated;
  }

  unenrollParticipant(workshopId: string, participantId: string): Workshop {
    const workshop = this.getById(workshopId);

    if (!workshop.participantIds.includes(participantId)) {
      throw new ParticipantNotEnrolledError(participantId, workshopId);
    }

    const updated: Workshop = {
      ...workshop,
      participantIds: workshop.participantIds.filter((id) => id !== participantId),
      updatedAt: new Date(),
    };

    this.workshops.set(workshopId, updated);
    return updated;
  }


  getParticipantsOfWorkshop(workshopId: string): Participant[] {
    const workshop = this.getById(workshopId);
    return workshop.participantIds.map((id) => this.participantRepository.getById(id));
  }

  getWorkshopsOfParticipant(participantId: string): Workshop[] {
    return this.getAll().filter((workshop) => workshop.participantIds.includes(participantId));
  }
}