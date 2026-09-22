/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** participant.repository.test.ts
*/

import {
    ParticipantRepository,
    ParticipantNotFoundError,
    DuplicateEmailError,
  } from '../src/graph/participant.repository';
  
  describe('ParticipantRepository', () => {
    let repo: ParticipantRepository;
  
    beforeEach(() => {
      repo = new ParticipantRepository();
    });
  
    describe('create', () => {
      it('crée un participant avec un id, createdAt et updatedAt générés', () => {
        const participant = repo.create({
          firstName: 'Alice',
          lastName: 'Martin',
          email: 'alice.martin@example.com',
        });
  
        expect(participant.id).toBeDefined();
        expect(participant.firstName).toBe('Alice');
        expect(participant.createdAt).toBeInstanceOf(Date);
        expect(participant.updatedAt).toBeInstanceOf(Date);
      });
  
      it('refuse de créer deux participants avec le même email', () => {
        repo.create({ firstName: 'Alice', lastName: 'Martin', email: 'alice@example.com' });
  
        expect(() =>
          repo.create({ firstName: 'Alicia', lastName: 'M.', email: 'alice@example.com' }),
        ).toThrow(DuplicateEmailError);
      });
  
      it('la vérification d\'email en doublon est insensible à la casse', () => {
        repo.create({ firstName: 'Alice', lastName: 'Martin', email: 'Alice@Example.com' });
  
        expect(() =>
          repo.create({ firstName: 'Alicia', lastName: 'M.', email: 'alice@example.com' }),
        ).toThrow(DuplicateEmailError);
      });
    });
  
    describe('getById', () => {
      it('retourne le participant correspondant à un id existant', () => {
        const created = repo.create({ firstName: 'Bob', lastName: 'Durand', email: 'bob@example.com' });
        const found = repo.getById(created.id);
  
        expect(found).toEqual(created);
      });
  
      it('lève ParticipantNotFoundError pour un id inconnu', () => {
        expect(() => repo.getById('id-inexistant')).toThrow(ParticipantNotFoundError);
      });
    });
  
    describe('getAll', () => {
      it('retourne un tableau vide quand aucun participant n\'existe', () => {
        expect(repo.getAll()).toEqual([]);
      });
  
      it('retourne tous les participants créés', () => {
        repo.create({ firstName: 'Alice', lastName: 'Martin', email: 'alice@example.com' });
        repo.create({ firstName: 'Bob', lastName: 'Durand', email: 'bob@example.com' });
  
        expect(repo.getAll()).toHaveLength(2);
      });
    });
  
    describe('update', () => {
      it('met à jour les champs fournis et actualise updatedAt', async () => {
        const created = repo.create({ firstName: 'Alice', lastName: 'Martin', email: 'alice@example.com' });
  
        // petite attente pour garantir un updatedAt strictement différent
        await new Promise((resolve) => setTimeout(resolve, 5));
  
        const updated = repo.update(created.id, { firstName: 'Alicia' });
  
        expect(updated.firstName).toBe('Alicia');
        expect(updated.lastName).toBe('Martin'); // inchangé
        expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
      });
  
      it('lève ParticipantNotFoundError si le participant n\'existe pas', () => {
        expect(() => repo.update('id-inexistant', { firstName: 'X' })).toThrow(
          ParticipantNotFoundError,
        );
      });
  
      it('refuse de mettre à jour vers un email déjà utilisé par un autre participant', () => {
        repo.create({ firstName: 'Alice', lastName: 'Martin', email: 'alice@example.com' });
        const bob = repo.create({ firstName: 'Bob', lastName: 'Durand', email: 'bob@example.com' });
  
        expect(() => repo.update(bob.id, { email: 'alice@example.com' })).toThrow(
          DuplicateEmailError,
        );
      });
    });
  
    describe('delete', () => {
      it('supprime un participant existant', () => {
        const created = repo.create({ firstName: 'Alice', lastName: 'Martin', email: 'alice@example.com' });
  
        repo.delete(created.id);
  
        expect(() => repo.getById(created.id)).toThrow(ParticipantNotFoundError);
      });
  
      it('lève ParticipantNotFoundError si le participant n\'existe pas', () => {
        expect(() => repo.delete('id-inexistant')).toThrow(ParticipantNotFoundError);
      });
    });
  });