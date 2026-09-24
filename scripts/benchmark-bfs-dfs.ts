/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** benchmark-bfs-dfs.ts
*/

import { DependencyGraph } from '../src/graph/dependency-graph';
import { WorkshopRepository } from '../src/graph/workshop.repository';
import { ParticipantRepository } from '../src/graph/participant.repository';
import { ImpactCalculator } from '../src/graph/impact-calculator';

type Topology = 'chain' | 'wide' | 'tree';

function buildGraph(n: number, topology: Topology): { graph: DependencyGraph; rootId: string } {
  const graph = new DependencyGraph();
  const ids: string[] = [];

  for (let i = 0; i < n; i++) {
    const id = `w${i}`;
    graph.addNode(id, 'workshop', `Atelier ${i}`);
    ids.push(id);
  }

  if (topology === 'chain') {
    for (let i = 1; i < n; i++) {
      graph.addEdge(ids[i], ids[i - 1]);
    }
  } else if (topology === 'wide') {
    for (let i = 1; i < n; i++) {
      graph.addEdge(ids[i], ids[0]);
    }
  } else {
    const branching = 4;
    for (let i = 0; i < n; i++) {
      for (let c = 1; c <= branching; c++) {
        const childIndex = i * branching + c;
        if (childIndex < n) {
          graph.addEdge(ids[childIndex], ids[i]);
        }
      }
    }
  }

  return { graph, rootId: ids[0] };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function timeIt(fn: () => void, runs = 5): number {
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = process.hrtime.bigint();
    fn();
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1_000_000); // ms
  }
  return median(times);
}

function run(): void {
  const sizes = [100, 1_000, 10_000, 100_000];
  const topologies: Topology[] = ['chain', 'wide', 'tree'];

  console.log('n\ttopology\tBFS (ms)\tDFS (ms)');

  for (const n of sizes) {
    for (const topology of topologies) {
      const { graph, rootId } = buildGraph(n, topology);
      const participantRepo = new ParticipantRepository();
      const workshopRepo = new WorkshopRepository(participantRepo);
      const calculator = new ImpactCalculator(graph, workshopRepo);

      const bfsTime = timeIt(() => calculator.computeImpactedWorkshopIds(rootId));
      const dfsTime = timeIt(() => calculator.computeImpactedWorkshopIdsDFS(rootId));

      console.log(`${n}\t${topology}\t${bfsTime.toFixed(3)}\t${dfsTime.toFixed(3)}`);
    }
  }
}

run();