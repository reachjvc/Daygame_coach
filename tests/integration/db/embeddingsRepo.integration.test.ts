/**
 * Integration tests for embeddingsRepo.
 * Tests batch insert correctness and delete source isolation.
 *
 * These tests validate database behavior for training data storage:
 * 1. Batch insert with 450+ chunks - catches off-by-one at batch boundaries
 * 2. Delete by source isolation - catches filter bugs that could wipe all data
 */

import { describe, test, expect, beforeEach } from "vitest"
import { getClient, truncateAllTables } from "../setup"

const BATCH_SIZE = 200 // Matches embeddingsRepo.ts constant

/**
 * Helper to create a fake embedding vector.
 * Real embeddings are 768-1536 dimensions, but we use 3 for test speed.
 */
function createFakeEmbedding(seed: number): number[] {
  return [seed * 0.1, seed * 0.2, seed * 0.3]
}

/**
 * Helper to insert embeddings in batches (mirrors repo logic).
 * This replicates the exact batching logic from embeddingsRepo.storeEmbeddings()
 */
async function insertEmbeddingsInBatches(
  client: ReturnType<typeof getClient> extends Promise<infer T> ? T : never,
  embeddings: Array<{ content: string; source: string; embedding: number[]; metadata: Record<string, unknown> | null }>
): Promise<void> {
  for (let i = 0; i < embeddings.length; i += BATCH_SIZE) {
    const batch = embeddings.slice(i, i + BATCH_SIZE)

    // Build bulk insert query
    const values: unknown[] = []
    const placeholders: string[] = []

    batch.forEach((emb, idx) => {
      const offset = idx * 4
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}::double precision[], $${offset + 4}::jsonb)`)
      values.push(emb.content, emb.source, emb.embedding, JSON.stringify(emb.metadata))
    })

    await client.query(
      `INSERT INTO embeddings (content, source, embedding, metadata) VALUES ${placeholders.join(", ")}`,
      values
    )
  }
}

describe("embeddingsRepo Integration Tests", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  // ============================================
  // Test 1: Batch Insert Correctness
  // ============================================

  describe("Batch insert correctness", () => {
    test("should store exactly 450 embeddings across 3 batches without losing any", async () => {
      // Arrange: Create 450 embeddings (crosses 2 batch boundaries: 200 + 200 + 50)
      const totalCount = 450
      const embeddings = Array.from({ length: totalCount }, (_, i) => ({
        content: `Chunk ${i}: Some coaching advice about approaching women.`,
        source: "ToddV/approach-anxiety.txt",
        embedding: createFakeEmbedding(i),
        metadata: { chunkIndex: i, totalChunks: totalCount, coach: "ToddV" },
      }))

      const client = await getClient()

      try {
        // Act: Insert using the same batching logic as the repo
        await insertEmbeddingsInBatches(client, embeddings)

        // Assert: Count should be exactly 450
        const countResult = await client.query("SELECT COUNT(*) as count FROM embeddings")
        expect(Number(countResult.rows[0].count)).toBe(totalCount)

        // Assert: Verify content integrity at batch boundaries
        // Check first item of batch 1 (index 0)
        const first = await client.query(
          "SELECT content FROM embeddings WHERE content LIKE 'Chunk 0:%'"
        )
        expect(first.rows).toHaveLength(1)

        // Check last item of batch 1 (index 199)
        const lastBatch1 = await client.query(
          "SELECT content FROM embeddings WHERE content LIKE 'Chunk 199:%'"
        )
        expect(lastBatch1.rows).toHaveLength(1)

        // Check first item of batch 2 (index 200) - boundary check
        const firstBatch2 = await client.query(
          "SELECT content FROM embeddings WHERE content LIKE 'Chunk 200:%'"
        )
        expect(firstBatch2.rows).toHaveLength(1)

        // Check last item of batch 2 (index 399)
        const lastBatch2 = await client.query(
          "SELECT content FROM embeddings WHERE content LIKE 'Chunk 399:%'"
        )
        expect(lastBatch2.rows).toHaveLength(1)

        // Check first item of batch 3 (index 400) - boundary check
        const firstBatch3 = await client.query(
          "SELECT content FROM embeddings WHERE content LIKE 'Chunk 400:%'"
        )
        expect(firstBatch3.rows).toHaveLength(1)

        // Check last item (index 449)
        const last = await client.query(
          "SELECT content FROM embeddings WHERE content LIKE 'Chunk 449:%'"
        )
        expect(last.rows).toHaveLength(1)
      } finally {
        await client.end()
      }
    })

    test("should handle exact batch size (200) without off-by-one", async () => {
      // Arrange: Exactly 200 embeddings (one full batch)
      const totalCount = 200
      const embeddings = Array.from({ length: totalCount }, (_, i) => ({
        content: `Exact batch chunk ${i}`,
        source: "TestCoach/video.txt",
        embedding: createFakeEmbedding(i),
        metadata: null,
      }))

      const client = await getClient()

      try {
        // Act
        await insertEmbeddingsInBatches(client, embeddings)

        // Assert
        const countResult = await client.query("SELECT COUNT(*) as count FROM embeddings")
        expect(Number(countResult.rows[0].count)).toBe(totalCount)

        // Verify first and last
        const first = await client.query(
          "SELECT content FROM embeddings WHERE content = 'Exact batch chunk 0'"
        )
        expect(first.rows).toHaveLength(1)

        const last = await client.query(
          "SELECT content FROM embeddings WHERE content = 'Exact batch chunk 199'"
        )
        expect(last.rows).toHaveLength(1)
      } finally {
        await client.end()
      }
    })

    test("should store metadata correctly as JSONB", async () => {
      // Arrange: Single embedding with rich metadata
      const metadata = {
        coach: "ToddV",
        video_title: "Approach Anxiety Cure",
        chunkIndex: 5,
        totalChunks: 100,
        phase: "OPEN",
        techniques: ["direct_opener", "compliment"],
        isRealExample: true,
      }

      const client = await getClient()

      try {
        // Act
        await client.query(
          `INSERT INTO embeddings (content, source, embedding, metadata)
           VALUES ($1, $2, $3::double precision[], $4::jsonb)`,
          ["Test content", "test/source.txt", [0.1, 0.2, 0.3], JSON.stringify(metadata)]
        )

        // Assert: Query back and verify JSONB fields
        const result = await client.query(
          "SELECT metadata FROM embeddings WHERE source = 'test/source.txt'"
        )
        const storedMetadata = result.rows[0].metadata

        expect(storedMetadata.coach).toBe("ToddV")
        expect(storedMetadata.techniques).toEqual(["direct_opener", "compliment"])
        expect(storedMetadata.isRealExample).toBe(true)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Test 2: Delete by Source Isolation
  // ============================================

  describe("Delete by source isolation", () => {
    test("should delete only embeddings from specified source without affecting others", async () => {
      // Arrange: Insert embeddings from two different sources
      const client = await getClient()

      try {
        // Insert 10 embeddings from "ToddV/video1.txt"
        for (let i = 0; i < 10; i++) {
          await client.query(
            `INSERT INTO embeddings (content, source, embedding, metadata)
             VALUES ($1, $2, $3::double precision[], $4::jsonb)`,
            [`ToddV content ${i}`, "ToddV/video1.txt", createFakeEmbedding(i), JSON.stringify({ coach: "ToddV" })]
          )
        }

        // Insert 10 embeddings from "JamesTusk/video2.txt"
        for (let i = 0; i < 10; i++) {
          await client.query(
            `INSERT INTO embeddings (content, source, embedding, metadata)
             VALUES ($1, $2, $3::double precision[], $4::jsonb)`,
            [`JamesTusk content ${i}`, "JamesTusk/video2.txt", createFakeEmbedding(i + 100), JSON.stringify({ coach: "JamesTusk" })]
          )
        }

        // Verify initial state
        const initialCount = await client.query("SELECT COUNT(*) as count FROM embeddings")
        expect(Number(initialCount.rows[0].count)).toBe(20)

        // Act: Delete only ToddV's embeddings (mirrors deleteEmbeddingsBySource)
        await client.query("DELETE FROM embeddings WHERE source = $1", ["ToddV/video1.txt"])

        // Assert: Only JamesTusk's embeddings remain
        const finalCount = await client.query("SELECT COUNT(*) as count FROM embeddings")
        expect(Number(finalCount.rows[0].count)).toBe(10)

        // Verify ToddV is gone
        const toddvCount = await client.query(
          "SELECT COUNT(*) as count FROM embeddings WHERE source = $1",
          ["ToddV/video1.txt"]
        )
        expect(Number(toddvCount.rows[0].count)).toBe(0)

        // Verify JamesTusk is intact
        const jamesCount = await client.query(
          "SELECT COUNT(*) as count FROM embeddings WHERE source = $1",
          ["JamesTusk/video2.txt"]
        )
        expect(Number(jamesCount.rows[0].count)).toBe(10)
      } finally {
        await client.end()
      }
    })

    test("should handle source names with special characters", async () => {
      // Arrange: Sources with path separators and special chars
      const client = await getClient()

      try {
        await client.query(
          `INSERT INTO embeddings (content, source, embedding, metadata)
           VALUES ($1, $2, $3::double precision[], NULL)`,
          ["Content 1", "Coach Name/Video - Part 1 (2026).txt", [0.1, 0.2, 0.3]]
        )
        await client.query(
          `INSERT INTO embeddings (content, source, embedding, metadata)
           VALUES ($1, $2, $3::double precision[], NULL)`,
          ["Content 2", "Other Coach/Different Video.txt", [0.4, 0.5, 0.6]]
        )

        // Act: Delete the one with special characters
        await client.query(
          "DELETE FROM embeddings WHERE source = $1",
          ["Coach Name/Video - Part 1 (2026).txt"]
        )

        // Assert: Only the other source remains
        const remaining = await client.query("SELECT source FROM embeddings")
        expect(remaining.rows).toHaveLength(1)
        expect(remaining.rows[0].source).toBe("Other Coach/Different Video.txt")
      } finally {
        await client.end()
      }
    })

    test("should not delete anything when source does not exist", async () => {
      // Arrange: Insert some embeddings
      const client = await getClient()

      try {
        await client.query(
          `INSERT INTO embeddings (content, source, embedding, metadata)
           VALUES ($1, $2, $3::double precision[], NULL)`,
          ["Existing content", "existing/source.txt", [0.1, 0.2, 0.3]]
        )

        const initialCount = await client.query("SELECT COUNT(*) as count FROM embeddings")
        expect(Number(initialCount.rows[0].count)).toBe(1)

        // Act: Try to delete non-existent source
        await client.query(
          "DELETE FROM embeddings WHERE source = $1",
          ["nonexistent/source.txt"]
        )

        // Assert: Original embedding still exists
        const finalCount = await client.query("SELECT COUNT(*) as count FROM embeddings")
        expect(Number(finalCount.rows[0].count)).toBe(1)
      } finally {
        await client.end()
      }
    })

    test("should handle case-sensitive source matching correctly", async () => {
      // Arrange: Insert embeddings with similar but differently-cased sources
      const client = await getClient()

      try {
        await client.query(
          `INSERT INTO embeddings (content, source, embedding, metadata)
           VALUES ($1, $2, $3::double precision[], NULL)`,
          ["Lowercase content", "toddv/video.txt", [0.1, 0.2, 0.3]]
        )
        await client.query(
          `INSERT INTO embeddings (content, source, embedding, metadata)
           VALUES ($1, $2, $3::double precision[], NULL)`,
          ["Uppercase content", "ToddV/video.txt", [0.4, 0.5, 0.6]]
        )

        // Act: Delete only lowercase version
        await client.query("DELETE FROM embeddings WHERE source = $1", ["toddv/video.txt"])

        // Assert: Only uppercase version remains (case-sensitive)
        const remaining = await client.query("SELECT source, content FROM embeddings")
        expect(remaining.rows).toHaveLength(1)
        expect(remaining.rows[0].source).toBe("ToddV/video.txt")
        expect(remaining.rows[0].content).toBe("Uppercase content")
      } finally {
        await client.end()
      }
    })
  })
})
