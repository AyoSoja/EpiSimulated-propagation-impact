/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** participant.repository.ts
*/

import { randomUUID } from 'crypto';
import {
    Participant,
    CreateParticipantInput,
    UpdateParticipantInput,
  } from './participant';

export class ParticipantNotFoundError extends Error {
  constructor(id: string) {
    super(`Participant with id "${id}" not found`);
    this.name = 'ParticipantNotFoundError';
  }
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`A participant with email "${email}" already exists`);
    this.name = 'DuplicateEmailError';
  }
}

export class ParticipantRepository {
  private participants: Map<string, Participant> = new Map();

  create(input: CreateParticipantInput): Participant {
    const emailExists = [...this.participants.values()].some(
      (p) => p.email.toLowerCase() === input.email.toLowerCase(),
    );
    if (emailExists) {
      throw new DuplicateEmailError(input.email);
    }

    const now = new Date();
    const participant: Participant = {
      id: randomUUID(),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      createdAt: now,
      updatedAt: now,
    };

    this.participants.set(participant.id, participant);
    return participant;
  }

  getById(id: string): Participant {
    const participant = this.participants.get(id);
    if (!participant) {
      throw new ParticipantNotFoundError(id);
    }
    return participant;
  }

  getAll(): Participant[] {
    return [...this.participants.values()];
  }

  update(id: string, input: UpdateParticipantInput): Participant {
    const existing = this.getById(id);

    if (input.email && input.email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailExists = [...this.participants.values()].some(
        (p) => p.id !== id && p.email.toLowerCase() === input.email!.toLowerCase(),
      );
      if (emailExists) {
        throw new DuplicateEmailError(input.email);
      }
    }

    const updated: Participant = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    this.participants.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.participants.has(id)) {
      throw new ParticipantNotFoundError(id);
    }
    this.participants.delete(id);
  }
}