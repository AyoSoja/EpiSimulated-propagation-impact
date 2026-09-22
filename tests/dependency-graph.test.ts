/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** dependency-graph.test.ts
*/

import {
    DependencyGraph,
    NodeNotFoundError,
    EdgeAlreadyExistsError,
    EdgeNotFoundError,
    SelfLoopError,
  } from '../src/graph/dependency-graph';
  
  describe('DependencyGraph', () => {
    let graph: DependencyGraph;
  
    beforeEach(() => {
      graph = new DependencyGraph();
    });
  
    describe('addNode', () => {
      it('ajoute un nœud consultable ensuite', () => {
        graph.addNode('w1', 'workshop', 'Atelier BFS');
  
        expect(graph.hasNode('w1')).toBe(true);
        expect(graph.getNode('w1')).toEqual({ id: 'w1', type: 'workshop', label: 'Atelier BFS' });
      });
  
      it('est idempotent : ajouter deux fois le même id ne lève pas d\'erreur', () => {
        graph.addNode('w1', 'workshop', 'Atelier BFS');
        expect(() => graph.addNode('w1', 'workshop', 'Atelier BFS')).not.toThrow();
      });
    });
  
    describe('addEdge', () => {
      beforeEach(() => {
        graph.addNode('w1', 'workshop', 'Atelier A');
        graph.addNode('w2', 'workshop', 'Atelier B');
      });
  
      it('crée une arête orientée entre deux nœuds existants', () => {
        graph.addEdge('w1', 'w2');
  
        expect(graph.hasEdge('w1', 'w2')).toBe(true);
        expect(graph.hasEdge('w2', 'w1')).toBe(false);
      });
  
      it('lève NodeNotFoundError si l\'un des nœuds n\'existe pas', () => {
        expect(() => graph.addEdge('w1', 'inexistant')).toThrow(NodeNotFoundError);
        expect(() => graph.addEdge('inexistant', 'w1')).toThrow(NodeNotFoundError);
      });
  
      it('lève SelfLoopError si un nœud dépend de lui-même', () => {
        expect(() => graph.addEdge('w1', 'w1')).toThrow(SelfLoopError);
      });
  
      it('lève EdgeAlreadyExistsError si l\'arête existe déjà', () => {
        graph.addEdge('w1', 'w2');
        expect(() => graph.addEdge('w1', 'w2')).toThrow(EdgeAlreadyExistsError);
      });
    });
  
    describe('removeEdge', () => {
      beforeEach(() => {
        graph.addNode('w1', 'workshop', 'Atelier A');
        graph.addNode('w2', 'workshop', 'Atelier B');
        graph.addEdge('w1', 'w2');
      });
  
      it('supprime une arête existante', () => {
        graph.removeEdge('w1', 'w2');
        expect(graph.hasEdge('w1', 'w2')).toBe(false);
      });
  
      it('lève EdgeNotFoundError si l\'arête n\'existe pas', () => {
        expect(() => graph.removeEdge('w2', 'w1')).toThrow(EdgeNotFoundError);
      });
    });
  
    describe('getDependencies / getDependents', () => {
      it('retourne les bonnes relations directionnelles', () => {
        graph.addNode('w1', 'workshop', 'A');
        graph.addNode('w2', 'workshop', 'B');
        graph.addNode('w3', 'workshop', 'C');
        graph.addEdge('w1', 'w2');
        graph.addEdge('w3', 'w2');
  
        expect(graph.getDependencies('w1')).toEqual(['w2']);
        expect(graph.getDependents('w2')).toEqual(expect.arrayContaining(['w1', 'w3']));
        expect(graph.getDependents('w2')).toHaveLength(2);
      });
    });
  
    describe('sérialisation (toJSON / fromJSON)', () => {
      it('sérialise puis désérialise un graphe en préservant nœuds et arêtes', () => {
        graph.addNode('w1', 'workshop', 'Atelier A');
        graph.addNode('w2', 'workshop', 'Atelier B');
        graph.addNode('p1', 'participant', 'Alice');
        graph.addEdge('w1', 'w2');
  
        const json = graph.toJSON();
        const raw = JSON.stringify(json);
        const parsed = JSON.parse(raw);
  
        const restored = DependencyGraph.fromJSON(parsed);
  
        expect(restored.getAllNodes()).toHaveLength(3);
        expect(restored.hasEdge('w1', 'w2')).toBe(true);
        expect(restored.getNode('p1').type).toBe('participant');
      });
    });
  });