/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** rate-limiter.test.ts
*/

import { RateLimiter } from '../src/notification/rate-limiter';

describe('RateLimiter', () => {
  it('rejette une configuration invalide (maxRequests ou windowMs <= 0)', () => {
    expect(() => new RateLimiter({ maxRequests: 0, windowMs: 1000 })).toThrow();
    expect(() => new RateLimiter({ maxRequests: 5, windowMs: 0 })).toThrow();
  });

  it('autorise les envois jusqu\'à la limite configurée', () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
    const now = new Date('2026-01-10T10:00:00.000Z');

    expect(limiter.tryConsume(now)).toBe(true);
    expect(limiter.tryConsume(now)).toBe(true);
    expect(limiter.tryConsume(now)).toBe(true);
  });

  it('refuse tout envoi au-delà de la limite dans la même fenêtre', () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
    const now = new Date('2026-01-10T10:00:00.000Z');

    limiter.tryConsume(now);
    limiter.tryConsume(now);
    limiter.tryConsume(now);

    expect(limiter.tryConsume(now)).toBe(false);
  });

  it('n\'enregistre rien quand un envoi est refusé (pas de "fuite" de quota)', () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });
    const now = new Date('2026-01-10T10:00:00.000Z');

    limiter.tryConsume(now);
    limiter.tryConsume(now);
    limiter.tryConsume(now);

    expect(limiter.getCurrentUsage(now)).toBe(1);
  });

  it('libère de la capacité une fois la fenêtre glissante écoulée', () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });
    const t0 = new Date('2026-01-10T10:00:00.000Z');
    const afterWindow = new Date(t0.getTime() + 1001);

    limiter.tryConsume(t0);
    limiter.tryConsume(t0);
    expect(limiter.tryConsume(t0)).toBe(false);

    expect(limiter.tryConsume(afterWindow)).toBe(true);
  });

  it('getRemainingCapacity() reflète correctement le quota restant', () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
    const now = new Date('2026-01-10T10:00:00.000Z');

    expect(limiter.getRemainingCapacity(now)).toBe(5);

    limiter.tryConsume(now);
    limiter.tryConsume(now);

    expect(limiter.getRemainingCapacity(now)).toBe(3);
  });

  it('gère une fenêtre glissante progressive (pas juste un reset brutal)', () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });
    const t0 = new Date('2026-01-10T10:00:00.000Z');
    const t0plus500 = new Date(t0.getTime() + 500);
    const t0plus1001 = new Date(t0.getTime() + 1001);

    expect(limiter.tryConsume(t0)).toBe(true);
    expect(limiter.tryConsume(t0plus500)).toBe(false);

    expect(limiter.tryConsume(t0plus1001)).toBe(true);
  });

  it('utilise l\'heure courante par défaut quand "now" n\'est pas fourni', () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60_000 });

    expect(limiter.tryConsume()).toBe(true);
    expect(limiter.getCurrentUsage()).toBe(1);
    expect(limiter.getRemainingCapacity()).toBe(1);
  });
});