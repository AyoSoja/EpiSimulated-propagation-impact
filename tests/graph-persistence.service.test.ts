/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** graph-persistence.service.test.ts
*/

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DependencyGraph } from '../src/graph/dependency-graph';
import {
  GraphPersistenceService,
  GraphFileNotFoundError,
  GraphParseError,
} from '../src/graph/graph-persistence.service';

describe('GraphPersistenceService', () => {
  let tmpFilePath: string;
  let persistence: GraphPersistenceService;

  beforeEach(async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'graph-persistence-'));
    tmpFilePath = path.join(tmpDir, 'graph.json');
    persistence = new GraphPersistenceService(tmpFilePath);
  });

  afterEach(async () => {
    await fs.rm(path.dirname(tmpFilePath), { recursive: true, force: true });
  });

  describe('save', () => {
    it('écrit un fichier JSON valide sur disque', async () => {
      const graph = new DependencyGraph();
      graph.addNode('w1', 'workshop', 'Atelier A');

      await persistence.save(graph);

      const raw = await fs.readFile(tmpFilePath, 'utf-8');
      expect(() => JSON.parse(raw)).not.toThrow();
    });
  });

  describe('load', () => {
    it('lève GraphFileNotFoundError si le fichier n\'existe pas', async () => {
      await expect(persistence.load()).rejects.toThrow(GraphFileNotFoundError);
    });

    it('lève GraphParseError si le fichier contient du JSON invalide', async () => {
      await fs.writeFile(tmpFilePath, '{ this is not valid json', 'utf-8');

      await expect(persistence.load()).rejects.toThrow(GraphParseError);
    });
  });

  describe('loadOrCreate', () => {
    it('retourne un graphe vide si le fichier n\'existe pas encore', async () => {
      const graph = await persistence.loadOrCreate();

      expect(graph.getAllNodes()).toEqual([]);
      expect(graph.getAllEdges()).toEqual([]);
    });
  });

  describe('non-régression : round-trip sauvegarde -> chargement', () => {
    it('restitue exactement les mêmes nœuds et arêtes après save puis load', async () => {
      const original = new DependencyGraph();
      original.addNode('w1', 'workshop', 'Atelier A');
      original.addNode('w2', 'workshop', 'Atelier B');
      original.addNode('p1', 'participant', 'Alice');
      original.addEdge('w1', 'w2');

      await persistence.save(original);
      const restored = await persistence.load();

      // comparaison profonde du graphe sérialisé, pas juste "ça ne plante pas"
      expect(restored.toJSON()).toEqual(original.toJSON());
    });

    it('survit à plusieurs cycles successifs de save/load sans perte ni dérive', async () => {
      const graph = new DependencyGraph();
      graph.addNode('w1', 'workshop', 'A');
      graph.addNode('w2', 'workshop', 'B');
      graph.addEdge('w1', 'w2');

      await persistence.save(graph);
      const firstLoad = await persistence.load();

      await persistence.save(firstLoad);
      const secondLoad = await persistence.load();

      expect(secondLoad.toJSON()).toEqual(graph.toJSON());
    });

    it('écrase correctement un fichier existant lors d\'une nouvelle sauvegarde', async () => {
      const graphV1 = new DependencyGraph();
      graphV1.addNode('w1', 'workshop', 'A');
      await persistence.save(graphV1);

      const graphV2 = new DependencyGraph();
      graphV2.addNode('w1', 'workshop', 'A');
      graphV2.addNode('w2', 'workshop', 'B');
      graphV2.addEdge('w1', 'w2');
      await persistence.save(graphV2);

      const restored = await persistence.load();
      expect(restored.toJSON()).toEqual(graphV2.toJSON());
      expect(restored.getAllNodes()).toHaveLength(2);
    });
  });
});