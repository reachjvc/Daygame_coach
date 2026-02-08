/**
 * Seeding utilities for deterministic random selection.
 *
 * Used to pick consistent items from arrays based on a seed string.
 */

/**
 * Convert a seed string to a numeric hash for array indexing.
 * Uses multiplicative hash (djb2 variant) for fast, decent distribution.
 */
export function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i)
  }
  return hash
}

/**
 * Pick an item from an array deterministically based on seed.
 */
export function pickBySeed<T>(items: T[], seed: string): T {
  const index = Math.abs(hashSeed(seed)) % items.length
  return items[index]
}
