/**
 * scripts/scenario-engine/lib/split.ts
 *
 * Deterministic, channel-stratified train/test split of the scenario dataset.
 * Pure logic — no IO, no LLM. Guarantee: a channel with >=2 moments appears in
 * BOTH splits (so no coach exists only in the held-out set); single-moment
 * channels go to train.
 */

import type { Dataset, Moment, ScenarioKind } from "./extract"

export type SplitResult = {
  seed: string
  holdoutRatio: number
  career: { train: string[]; test: string[] }
  coldread: { train: string[]; test: string[] }
}

/** djb2-variant string hash (same family as src/scenarios/shared/seeding). */
export function hashString(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i)
  }
  return hash >>> 0
}

/** Deterministic Fisher-Yates using a mulberry32 PRNG seeded from a string. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let a = hashString(seed) || 1
  const rand = () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function splitMoments(
  moments: Moment[],
  holdoutRatio: number,
  seed: string
): { train: string[]; test: string[] } {
  const byChannel = new Map<string, Moment[]>()
  for (const m of moments) {
    const list = byChannel.get(m.channel) ?? []
    list.push(m)
    byChannel.set(m.channel, list)
  }
  const train: string[] = []
  const test: string[] = []
  for (const [channel, list] of [...byChannel.entries()].sort()) {
    if (list.length < 2) {
      train.push(...list.map((m) => m.id))
      continue
    }
    const shuffled = seededShuffle(
      [...list].sort((a, b) => a.id.localeCompare(b.id)),
      `${seed}:${channel}`
    )
    // at least 1 held out, at least 1 kept in train
    const nTest = Math.min(list.length - 1, Math.max(1, Math.round(list.length * holdoutRatio)))
    test.push(...shuffled.slice(0, nTest).map((m) => m.id))
    train.push(...shuffled.slice(nTest).map((m) => m.id))
  }
  return { train, test }
}

export function splitDataset(dataset: Dataset, holdoutRatio: number, seed: string): SplitResult {
  const result: SplitResult = {
    seed,
    holdoutRatio,
    career: { train: [], test: [] },
    coldread: { train: [], test: [] },
  }
  for (const kind of ["career", "coldread"] as ScenarioKind[]) {
    result[kind] = splitMoments(dataset[kind], holdoutRatio, `${seed}:${kind}`)
  }
  return result
}
