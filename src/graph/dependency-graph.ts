/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** dependency-graph.ts
*/

export type GraphNodeType = 'workshop' | 'participant';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface SerializedGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class NodeNotFoundError extends Error {
  constructor(id: string) {
    super(`Graph node with id "${id}" not found`);
    this.name = 'NodeNotFoundError';
  }
}

export class EdgeAlreadyExistsError extends Error {
  constructor(from: string, to: string) {
    super(`Edge from "${from}" to "${to}" already exists`);
    this.name = 'EdgeAlreadyExistsError';
  }
}

export class EdgeNotFoundError extends Error {
  constructor(from: string, to: string) {
    super(`Edge from "${from}" to "${to}" does not exist`);
    this.name = 'EdgeNotFoundError';
  }
}

export class SelfLoopError extends Error {
  constructor(id: string) {
    super(`Node "${id}" cannot depend on itself`);
    this.name = 'SelfLoopError';
  }
}

export class DependencyGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private outgoing: Map<string, Set<string>> = new Map();
  private incoming: Map<string, Set<string>> = new Map();

  addNode(id: string, type: GraphNodeType, label: string): GraphNode {
    const existing = this.nodes.get(id);
    if (existing) {
      return existing;
    }

    const node: GraphNode = { id, type, label };
    this.nodes.set(id, node);
    this.outgoing.set(id, new Set());
    this.incoming.set(id, new Set());
    return node;
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  getNode(id: string): GraphNode {
    const node = this.nodes.get(id);
    if (!node) {
      throw new NodeNotFoundError(id);
    }
    return node;
  }

  getAllNodes(): GraphNode[] {
    return [...this.nodes.values()];
  }

  addEdge(from: string, to: string): void {
    if (from === to) {
      throw new SelfLoopError(from);
    }
    this.getNode(from);
    this.getNode(to);

    if (this.outgoing.get(from)!.has(to)) {
      throw new EdgeAlreadyExistsError(from, to);
    }

    this.outgoing.get(from)!.add(to);
    this.incoming.get(to)!.add(from);
  }

  removeEdge(from: string, to: string): void {
    this.getNode(from);
    this.getNode(to);

    if (!this.outgoing.get(from)!.has(to)) {
      throw new EdgeNotFoundError(from, to);
    }

    this.outgoing.get(from)!.delete(to);
    this.incoming.get(to)!.delete(from);
  }

  hasEdge(from: string, to: string): boolean {
    return this.outgoing.get(from)?.has(to) ?? false;
  }

  getDependencies(id: string): string[] {
    this.getNode(id);
    return [...(this.outgoing.get(id) ?? [])];
  }

  getDependents(id: string): string[] {
    this.getNode(id);
    return [...(this.incoming.get(id) ?? [])];
  }

  getAllEdges(): GraphEdge[] {
    const edges: GraphEdge[] = [];
    for (const [from, targets] of this.outgoing.entries()) {
      for (const to of targets) {
        edges.push({ from, to });
      }
    }
    return edges;
  }

  toJSON(): SerializedGraph {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
    };
  }

  static fromJSON(data: SerializedGraph): DependencyGraph {
    const graph = new DependencyGraph();
    for (const node of data.nodes) {
      graph.addNode(node.id, node.type, node.label);
    }
    for (const edge of data.edges) {
      graph.addEdge(edge.from, edge.to);
    }
    return graph;
  }
}