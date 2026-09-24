/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** min-heap.test.ts
*/

import { MinHeap } from '../src/notification/min-heap';

describe('MinHeap', () => {
  const numericHeap = () => new MinHeap<number>((a, b) => a - b);

  it('est vide à la création', () => {
    const heap = numericHeap();
    expect(heap.isEmpty()).toBe(true);
    expect(heap.size).toBe(0);
    expect(heap.peek()).toBeUndefined();
    expect(heap.pop()).toBeUndefined();
  });

  it('retourne toujours le plus petit élément en premier (ordre croissant)', () => {
    const heap = numericHeap();
    [5, 1, 8, 2, 9, 0, 3].forEach((n) => heap.push(n));

    const output: number[] = [];
    while (!heap.isEmpty()) {
      output.push(heap.pop()!);
    }

    expect(output).toEqual([0, 1, 2, 3, 5, 8, 9]);
  });

  it('peek() retourne le minimum sans le retirer', () => {
    const heap = numericHeap();
    heap.push(4);
    heap.push(1);

    expect(heap.peek()).toBe(1);
    expect(heap.size).toBe(2);
  });

  it('gère les doublons correctement', () => {
    const heap = numericHeap();
    [3, 1, 3, 1, 2].forEach((n) => heap.push(n));

    const output: number[] = [];
    while (!heap.isEmpty()) {
      output.push(heap.pop()!);
    }

    expect(output).toEqual([1, 1, 2, 3, 3]);
  });

  it('fonctionne avec un comparateur inversé (max-heap)', () => {
    const heap = new MinHeap<number>((a, b) => b - a);
    [5, 1, 8, 2].forEach((n) => heap.push(n));

    const output: number[] = [];
    while (!heap.isEmpty()) {
      output.push(heap.pop()!);
    }

    expect(output).toEqual([8, 5, 2, 1]);
  });

  it('reste cohérent sur un grand nombre d\'éléments aléatoires', () => {
    const heap = numericHeap();
    const input = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 10000));
    input.forEach((n) => heap.push(n));

    const output: number[] = [];
    while (!heap.isEmpty()) {
      output.push(heap.pop()!);
    }

    expect(output).toEqual([...input].sort((a, b) => a - b));
  });
});