/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** workshop.repository.test.ts
*/

import { ParticipantRepository } from '../src/graph/participant.repository';
import {
  WorkshopRepository,
  WorkshopNotFoundError,
  ParticipantAlreadyEnrolledError,
  ParticipantNotEnrolledError,
} from '../src/graph/workshop.repository';
import { ParticipantNotFoundError } from '../src/graph/participant.repository';

describe('WorkshopRepository', () => {
  let participantRepo: ParticipantRepository;
  let workshopRepo: WorkshopRepository;

  beforeEach(() => {
    participantRepo = new ParticipantRepository();
    workshopRepo = new WorkshopRepository(participantRepo);
  });

  describe('create', () => {
    it('crée un atelier avec une liste de participants vide', () => {
      const workshop = workshopRepo.create({
        name: 'Atelier BFS/DFS',
        startTime: new Date('2026-01-10T10:00:00'),
        endTime: new Date('2026-01-10T12:00:00'),
      });

      expect(workshop.id).toBeDefined();
      expect(workshop.name).toBe('Atelier BFS/DFS');
      expect(workshop.participantIds).toEqual([]);
    });
  });

  describe('getById / getAll', () => {
    it('lève WorkshopNotFoundError pour un id inconnu', () => {
      expect(() => workshopRepo.getById('id-inexistant')).toThrow(WorkshopNotFoundError);
    });

    it('retourne tous les ateliers créés', () => {
      workshopRepo.create({ name: 'A', startTime: new Date(), endTime: new Date() });
      workshopRepo.create({ name: 'B', startTime: new Date(), endTime: new Date() });

      expect(workshopRepo.getAll()).toHaveLength(2);
    });
  });

  describe('enrollParticipant', () => {
    it('inscrit un participant existant à un atelier', () => {
      const participant = participantRepo.create({
        firstName: 'Alice',
        lastName: 'Martin',
        email: 'alice@example.com',
      });
      const workshop = workshopRepo.create({
        name: 'Atelier Graph',
        startTime: new Date(),
        endTime: new Date(),
      });

      const updated = workshopRepo.enrollParticipant(workshop.id, participant.id);

      expect(updated.participantIds).toContain(participant.id);
    });

    it('lève ParticipantNotFoundError si le participant n\'existe pas', () => {
      const workshop = workshopRepo.create({ name: 'A', startTime: new Date(), endTime: new Date() });

      expect(() => workshopRepo.enrollParticipant(workshop.id, 'id-inexistant')).toThrow(
        ParticipantNotFoundError,
      );
    });

    it('lève WorkshopNotFoundError si l\'atelier n\'existe pas', () => {
      const participant = participantRepo.create({
        firstName: 'Alice',
        lastName: 'Martin',
        email: 'alice@example.com',
      });

      expect(() => workshopRepo.enrollParticipant('id-inexistant', participant.id)).toThrow(
        WorkshopNotFoundError,
      );
    });

    it('refuse d\'inscrire deux fois le même participant au même atelier', () => {
      const participant = participantRepo.create({
        firstName: 'Alice',
        lastName: 'Martin',
        email: 'alice@example.com',
      });
      const workshop = workshopRepo.create({ name: 'A', startTime: new Date(), endTime: new Date() });

      workshopRepo.enrollParticipant(workshop.id, participant.id);

      expect(() => workshopRepo.enrollParticipant(workshop.id, participant.id)).toThrow(
        ParticipantAlreadyEnrolledError,
      );
    });

    it('permet à un participant de s\'inscrire à plusieurs ateliers différents', () => {
      const participant = participantRepo.create({
        firstName: 'Alice',
        lastName: 'Martin',
        email: 'alice@example.com',
      });
      const workshopA = workshopRepo.create({ name: 'A', startTime: new Date(), endTime: new Date() });
      const workshopB = workshopRepo.create({ name: 'B', startTime: new Date(), endTime: new Date() });

      workshopRepo.enrollParticipant(workshopA.id, participant.id);
      workshopRepo.enrollParticipant(workshopB.id, participant.id);

      const workshopsOfParticipant = workshopRepo.getWorkshopsOfParticipant(participant.id);
      expect(workshopsOfParticipant).toHaveLength(2);
      expect(workshopsOfParticipant.map((w) => w.id)).toEqual(
        expect.arrayContaining([workshopA.id, workshopB.id]),
      );
    });
  });

  describe('unenrollParticipant', () => {
    it('désinscrit un participant inscrit', () => {
      const participant = participantRepo.create({
        firstName: 'Alice',
        lastName: 'Martin',
        email: 'alice@example.com',
      });
      const workshop = workshopRepo.create({ name: 'A', startTime: new Date(), endTime: new Date() });
      workshopRepo.enrollParticipant(workshop.id, participant.id);

      const updated = workshopRepo.unenrollParticipant(workshop.id, participant.id);

      expect(updated.participantIds).not.toContain(participant.id);
    });

    it('lève ParticipantNotEnrolledError si le participant n\'était pas inscrit', () => {
      const participant = participantRepo.create({
        firstName: 'Alice',
        lastName: 'Martin',
        email: 'alice@example.com',
      });
      const workshop = workshopRepo.create({ name: 'A', startTime: new Date(), endTime: new Date() });

      expect(() => workshopRepo.unenrollParticipant(workshop.id, participant.id)).toThrow(
        ParticipantNotEnrolledError,
      );
    });
  });

  describe('getParticipantsOfWorkshop', () => {
    it('retourne les objets Participant complets inscrits à un atelier', () => {
      const alice = participantRepo.create({ firstName: 'Alice', lastName: 'Martin', email: 'alice@example.com' });
      const bob = participantRepo.create({ firstName: 'Bob', lastName: 'Durand', email: 'bob@example.com' });
      const workshop = workshopRepo.create({ name: 'A', startTime: new Date(), endTime: new Date() });

      workshopRepo.enrollParticipant(workshop.id, alice.id);
      workshopRepo.enrollParticipant(workshop.id, bob.id);

      const participants = workshopRepo.getParticipantsOfWorkshop(workshop.id);

      expect(participants).toHaveLength(2);
      expect(participants.map((p) => p.email)).toEqual(
        expect.arrayContaining(['alice@example.com', 'bob@example.com']),
      );
    });
  });
});