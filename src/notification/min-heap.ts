/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** min-heap.ts
*/

export class MinHeap<T> {
    private items: T[] = [];
  
    constructor(private readonly compare: (a: T, b: T) => number) {}
  
    get size(): number {
      return this.items.length;
    }
  
    isEmpty(): boolean {
      return this.items.length === 0;
    }
  
    peek(): T | undefined {
      return this.items[0];
    }
  
    push(item: T): void {
      this.items.push(item);
      this.siftUp(this.items.length - 1);
    }
  
    pop(): T | undefined {
      if (this.items.length === 0) {
        return undefined;
      }
  
      const top = this.items[0];
      const last = this.items.pop()!;
  
      if (this.items.length > 0) {
        this.items[0] = last;
        this.siftDown(0);
      }
  
      return top;
    }
  
    private siftUp(index: number): void {
      let current = index;
      while (current > 0) {
        const parent = Math.floor((current - 1) / 2);
        if (this.compare(this.items[current], this.items[parent]) >= 0) {
          break;
        }
        this.swap(current, parent);
        current = parent;
      }
    }
  
    private siftDown(index: number): void {
      let current = index;
      const length = this.items.length;
  
      while (current < length) {
        const left = 2 * current + 1;
        const right = 2 * current + 2;
        let smallest = current;
  
        if (left < length && this.compare(this.items[left], this.items[smallest]) < 0) {
          smallest = left;
        }
        if (right < length && this.compare(this.items[right], this.items[smallest]) < 0) {
          smallest = right;
        }
        if (smallest === current) {
          return;
        }
  
        this.swap(current, smallest);
        current = smallest;
      }
    }
  
    private swap(i: number, j: number): void {
      [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
    }
  }