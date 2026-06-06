/**
 * Ingest Stage 09 chunks into embeddings_test table.
 * Isolated from production embeddings table.
 *
 * Usage:
 *   npx tsx scripts/training-data/10.EXT.ingest-test.ts --manifest docs/pipeline/batches/QUALITY-TEST.1.07b-passed.txt
 *   npx tsx scripts/training-data/10.EXT.ingest-test.ts --manifest docs/pipeline/batches/QUALITY-TEST.1.07b-passed.txt --dry-run
 *   npx tsx scripts/training-data/10.EXT.ingest-test.ts --clear
 */

import fs from "fs"
import path from "path"

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  for (const rawLine of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim()
    if (!key || process.env[key] !== undefined) continue
    process.env[key] = value.replace(/^["']|["']$/g, "")
  }
}
loadEnvFile(path.join(process.cwd(), ".env.local"))

const CHUNKS_DIR = path.resolve(__dirname, "../../data/09.EXT.chunks")

interface ChunkFile {
  chunks: Array<{
    content: string
    embedding: number[]
    metadata: Record<string, unknown>
  }>
  channel?: string
}

function parseManifest(manifestPath: string): string[] {
  const lines = fs.readFileSync(manifestPath, "utf-8").split("\n")
  const videoIds: string[] = []
  for (const line of lines) {
    if (line.startsWith("#") || !line.trim()) continue
    const match = line.match(/\[([A-Za-z0-9_-]{11})\]/)
    if (match) videoIds.push(match[1])
  }
  return videoIds
}

function findChunkFiles(videoIds: string[]): Array<{ path: string; videoId: string }> {
  const results: Array<{ path: string; videoId: string }> = []
  for (const vid of videoIds) {
    const files = findFilesRecursive(CHUNKS_DIR, `${vid}.chunks.json`)
    for (const f of files) {
      results.push({ path: f, videoId: vid })
    }
  }
  return results
}

function findFilesRecursive(dir: string, filename: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findFilesRecursive(full, filename))
    } else if (entry.name === filename) {
      results.push(full)
    }
  }
  return results
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const clear = args.includes("--clear")
  const manifestIdx = args.indexOf("--manifest")
  const manifestPath = manifestIdx >= 0 ? args[manifestIdx + 1] : null

  const { storeTestEmbeddings, deleteTestEmbeddingsBySource, getTestEmbeddingsCount } =
    await import("../../src/db/embeddingsTestRepo")

  if (clear) {
    console.log("Clearing all test embeddings...")
    const { createAdminSupabaseClient } = await import("../../src/db/supabase")
    const supabase = createAdminSupabaseClient()
    const { error } = await supabase.from("embeddings_test").delete().neq("id", "00000000-0000-0000-0000-000000000000")
    if (error) throw new Error(`Clear failed: ${error.message}`)
    console.log("Done.")
    return
  }

  if (!manifestPath) {
    console.error("Usage: npx tsx scripts/training-data/10.EXT.ingest-test.ts --manifest <path>")
    process.exit(1)
  }

  const videoIds = parseManifest(manifestPath)
  console.log(`Manifest: ${videoIds.length} videos`)

  const chunkFiles = findChunkFiles(videoIds)
  console.log(`Found ${chunkFiles.length} chunk files`)

  let totalChunks = 0
  let totalIngested = 0

  for (const { path: filePath, videoId } of chunkFiles) {
    const data: ChunkFile = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    const chunks = data.chunks || []
    totalChunks += chunks.length

    if (chunks.length === 0) {
      console.log(`  ${videoId}: 0 chunks, skipping`)
      continue
    }

    const rel = path.relative(CHUNKS_DIR, filePath)
    const source = rel.replace(/\.chunks\.json$/, ".txt")

    const embeddings = chunks.map((c) => ({
      content: c.content,
      source,
      embedding: c.embedding,
      metadata: c.metadata as Record<string, unknown>,
    }))

    if (dryRun) {
      console.log(`  ${videoId}: ${chunks.length} chunks → embeddings_test (dry run)`)
    } else {
      await deleteTestEmbeddingsBySource(source)
      await storeTestEmbeddings(embeddings)
      console.log(`  ${videoId}: ${chunks.length} chunks ingested`)
    }
    totalIngested += chunks.length
  }

  const count = dryRun ? totalIngested : await getTestEmbeddingsCount()
  console.log(`\nDone. Total chunks: ${totalChunks}, Ingested: ${totalIngested}, Table count: ${count}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
