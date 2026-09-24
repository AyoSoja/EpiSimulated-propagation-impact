/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** rate-limiter.ts
*/

export interface RateLimiterConfig {
    maxRequests: number;
    windowMs: number;
  }

  export class RateLimiter {
    private timestamps: number[] = [];
  
    constructor(private readonly config: RateLimiterConfig) {
      if (config.maxRequests <= 0) {
        throw new Error('maxRequests must be strictly positive');
      }
      if (config.windowMs <= 0) {
        throw new Error('windowMs must be strictly positive');
      }
    }

    tryConsume(now: Date = new Date()): boolean {
      this.purgeExpired(now);
  
      if (this.timestamps.length >= this.config.maxRequests) {
        return false;
      }
  
      this.timestamps.push(now.getTime());
      return true;
    }
  
    getCurrentUsage(now: Date = new Date()): number {
      this.purgeExpired(now);
      return this.timestamps.length;
    }
  
    getRemainingCapacity(now: Date = new Date()): number {
      return this.config.maxRequests - this.getCurrentUsage(now);
    }
  
    private purgeExpired(now: Date): void {
      const cutoff = now.getTime() - this.config.windowMs;
      this.timestamps = this.timestamps.filter((t) => t > cutoff);
    }
  }