/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** graph-persistence.service.ts
*/

import { promises as fs } from 'fs';
import { DependencyGraph, SerializedGraph } from './dependency-graph';

export class GraphFileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`Graph file not found at "${filePath}"`);
    this.name = 'GraphFileNotFoundError';
  }
}

export class GraphParseError extends Error {
  constructor(filePath: string, cause: unknown) {
    super(`Failed to parse graph file at "${filePath}": ${(cause as Error).message}`);
    this.name = 'GraphParseError';
  }
}

export class GraphPersistenceService {
  constructor(private readonly filePath: string) {}

  async save(graph: DependencyGraph): Promise<void> {
    const serialized: SerializedGraph = graph.toJSON();
    const content = JSON.stringify(serialized, null, 2);
    await fs.writeFile(this.filePath, content, 'utf-8');
  }

  async load(): Promise<DependencyGraph> {
    let raw: string;
    try {
      raw = await fs.readFile(this.filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new GraphFileNotFoundError(this.filePath);
      }
      throw error;
    }

    try {
      const parsed: SerializedGraph = JSON.parse(raw);
      return DependencyGraph.fromJSON(parsed);
    } catch (error) {
      throw new GraphParseError(this.filePath, error);
    }
  }

  async loadOrCreate(): Promise<DependencyGraph> {
    try {
      return await this.load();
    } catch (error) {
      if (error instanceof GraphFileNotFoundError) {
        return new DependencyGraph();
      }
      throw error;
    }
  }
}