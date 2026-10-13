/**
 * embeddingsRepo against production's real `embeddings` table and its
 * `match_embeddings` function, with real pgvector (768 dimensions).
 *
 * This is the retrieval Ask Coach answers from: the training pipeline stores
 * transcript chunks, a question is embedded, and `match_embeddings` returns the
 * nearest chunks above a similarity floor, nearest first.
 *
 * THE TABLE IS GLOBAL, not per user, and the repo writes it with the service
 * role. Each test therefore writes under a source name nobody else can
 * produce, asks with a random direction no other row is near (random vectors in
 * 768 dimensions are almost exactly orthogonal), and removes its own source
 * when done — through the repo's own delete, which is under test as well.
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { asOwner } from "@/tests/db/harness"
import {
  deleteEmbeddingsBySource,
  fetchEmbeddingsBySourceAndConversation,
  searchSimilarEmbeddings,
  storeEmbeddings,
} from "@/src/db/embeddingsRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const DIMENSIONS = 768

function unit(v: number[]): number[] {
  const length = Math.hypot(...v)
  return v.map((x) => Number((x / length).toFixed(6)))
}
const randomDirection = () => unit(Array.from({ length: DIMENSIONS }, () => Math.random() - 0.5))
/** `a` weighted against `b`. With two random directions, cosine to `a` is about wa / hypot(wa, wb). */
const blend = (a: number[], wa: number, b: number[], wb: number) => unit(a.map((x, i) => wa * x + wb * b[i]))
const oneHot = (i: number) => Array.from({ length: DIMENSIONS }, (_, j) => (j === i % DIMENSIONS ? 1 : 0))

async function withSource<T>(run: (source: string) => Promise<T>): Promise<T> {
  const source = `stack-test-${randomUUID()}`
  try {
    return await run(source)
  } finally {
    await deleteEmbeddingsBySource(source)
  }
}

async function countIn(source: string): Promise<number> {
  const [row] = await asOwner((q) => q("select count(*)::int as n from public.embeddings where source = $1", [source]))
  return row.n as number
}

describe("retrieval for Ask Coach", () => {
  it("finds the passages near a question, nearest first, and leaves out the unrelated one and anything past the limit", async () => {
    await withSource(async (source) => {
      const question = randomDirection()
      await storeEmbeddings([
        { content: "unrelated", source, embedding: randomDirection(), metadata: null },
        { content: "related", source, embedding: blend(question, 0.6, randomDirection(), 0.8), metadata: null },
        { content: "almost the question", source, embedding: blend(question, 1, randomDirection(), 0.05), metadata: { coach: "A" } },
      ])

      const found = await searchSimilarEmbeddings(question, { limit: 5, matchThreshold: 0.5 })

      expect(found.map((m) => m.content)).toEqual(["almost the question", "related"])
      expect(found[0]).toMatchObject({ source, metadata: { coach: "A" } })
      expect(found[0].similarity).toBeGreaterThan(0.99)
      expect(found[1].similarity).toBeGreaterThan(0.5)
      expect(found[1].similarity).toBeLessThan(0.75)

      const top = await searchSimilarEmbeddings(question, { limit: 1, matchThreshold: 0.5 })
      expect(top.map((m) => m.content)).toEqual(["almost the question"])
    })
  })

  it("stores every chunk of a run larger than one insert", async () => {
    await withSource(async (source) => {
      const CHUNKS = 201 // one past the repo's batch of 200: the smallest run with a second batch
      await storeEmbeddings(
        Array.from({ length: CHUNKS }, (_, i) => ({ content: `chunk ${i}`, source, embedding: oneHot(i) }))
      )

      expect(await countIn(source)).toBe(CHUNKS)
    })
  })

  it("hands back every chunk of one conversation from one video, and only that conversation", async () => {
    await withSource(async (source) => {
      await storeEmbeddings([
        { content: "opener", source, embedding: oneHot(1), metadata: { conversationId: 7 } },
        { content: "close", source, embedding: oneHot(2), metadata: { conversationId: 7, phase: "close" } },
        { content: "another set", source, embedding: oneHot(3), metadata: { conversationId: 8 } },
      ])

      const chunks = await fetchEmbeddingsBySourceAndConversation(source, 7)

      expect(chunks.map((c) => c.content).sort()).toEqual(["close", "opener"])
    })
  })

  it("re-ingesting one video removes its chunks and no other video's", async () => {
    await withSource(async (kept) => {
      const removed = `stack-test-${randomUUID()}`
      await storeEmbeddings([
        { content: "goes", source: removed, embedding: oneHot(4) },
        { content: "goes too", source: removed, embedding: oneHot(5) },
        { content: "stays", source: kept, embedding: oneHot(6) },
      ])

      await deleteEmbeddingsBySource(removed)

      expect(await countIn(removed)).toBe(0)
      expect(await countIn(kept)).toBe(1)
    })
  })
})
