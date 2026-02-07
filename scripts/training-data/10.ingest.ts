/**
 * scripts/training-data/10.ingest.ts
 *
 * Ingest Stage (Stage 10)
 *
 * Reads chunked and embedded data, inserts into Supabase pgvector.
 * This stage performs ONLY database operations - no chunking or embedding.
 *
 * Reads:
 *   - Chunked and embedded files (from Stage 09):
 *       data/09.chunks/<source>/<video>.chunks.json
 *
 * Writes:
 *   - Supabase embeddings (via `storeEmbeddings`)
 *   - Ingest state tracking:
 *       data/.ingest_state.json
 *
 * Use:
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --source daily_evolution
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --dry-run
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --verify
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --full
 *
 * Environment:
 *   - Loads `.env.local` (if present)
 *   - Uses Supabase env vars (see `src/db/server`)
 */

import fs from "fs"
import fsp from "fs/promises"
import path from "path"
import crypto from "crypto"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IngestStateV1 = {
  version: 1
  sources: Record<
    string,
    {
      chunksHash: string
      ingestedCount: number
      ingestedAt: string
    }
  >
}

type Args = {
  force: boolean
  dryRun: boolean
  verifyOnly: boolean
  source: string | null
}

type ChunkMetadata = {
  segmentType: string
  isRealExample: boolean
  chunkIndex: number
  totalChunks: number
  conversationId?: number
  phase?: string
  techniques?: string[]
  topics?: string[]
}

type Chunk = {
  content: string
  embedding: number[]
  metadata: ChunkMetadata
}

type ChunksFile = {
  version: 1
  sourceFile: string
  sourceHash: string
  embeddingModel: string
  chunkSize: number
  chunkOverlap: number
  videoType: string
  channel: string
  videoTitle: string
  generatedAt: string
  chunks: Chunk[]
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): Args {
  const flags = new Set(argv)
  let source: string | null = null

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--source" && argv[i + 1]) {
      source = argv[++i]
    }
    if (arg.startsWith("--source=")) {
      source = arg.split("=", 2)[1]
    }
  }

  return {
    force: flags.has("--full") || flags.has("--force"),
    dryRun: flags.has("--dry-run"),
    verifyOnly: flags.has("--verify"),
    source,
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return

  const envContent = fs.readFileSync(filePath, "utf-8")
  for (const rawLine of envContent.split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue

    const eq = line.indexOf("=")
    if (eq === -1) continue

    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim()

    if (!key) continue
    if (process.env[key] !== undefined) continue

    process.env[key] = value
  }
}

async function listChunkFiles(rootDir: string): Promise<string[]> {
  const out: string[] = []

  async function walk(dir: string) {
    const dirents = await fsp.readdir(dir, { withFileTypes: true })
    for (const dirent of dirents) {
      const full = path.join(dir, dirent.name)
      if (dirent.isDirectory()) {
        await walk(full)
      } else if (dirent.isFile() && full.endsWith(".chunks.json")) {
        out.push(full)
      }
    }
  }

  if (fs.existsSync(rootDir)) {
    await walk(rootDir)
  }
  return out.sort((a, b) => a.localeCompare(b))
}

function hashFile(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex")
}

async function loadState(statePath: string): Promise<IngestStateV1> {
  try {
    const raw = await fsp.readFile(statePath, "utf-8")
    const parsed = JSON.parse(raw)
    if (parsed?.version !== 1 || typeof parsed?.sources !== "object") {
      throw new Error("Unsupported ingest state format")
    }
    return parsed
  } catch {
    return {
      version: 1,
      sources: {},
    }
  }
}

async function saveState(statePath: string, state: IngestStateV1): Promise<void> {
  await fsp.mkdir(path.dirname(statePath), { recursive: true })
  await fsp.writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf-8")
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2))

  loadEnvFile(path.join(process.cwd(), ".env.local"))

  const chunksDir = path.join(process.cwd(), "data", "09.chunks")
  const statePath = path.join(process.cwd(), "data", ".ingest_state.json")

  const state = await loadState(statePath)

  const scanDir = args.source ? path.join(chunksDir, args.source) : chunksDir

  if (!fs.existsSync(scanDir)) {
    console.error(`❌ Missing directory: ${scanDir}`)
    console.error(`   Run Stage 09 (chunk-embed) first to generate chunk files.`)
    process.exit(1)
  }

  const chunkFiles = await listChunkFiles(scanDir)
  if (chunkFiles.length === 0) {
    console.log(`No .chunks.json files found under ${scanDir}`)
    console.log(`Run Stage 09 (chunk-embed) first to generate chunk files.`)
    return
  }

  const toIngest: Array<{
    filePath: string
    sourceKey: string
    chunksData: ChunksFile
    fileHash: string
  }> = []
  let unchanged = 0

  for (const filePath of chunkFiles) {
    const rawContent = await fsp.readFile(filePath, "utf-8")
    const fileHash = hashFile(rawContent)

    let chunksData: ChunksFile
    try {
      chunksData = JSON.parse(rawContent)
    } catch {
      console.warn(`Warning: Could not parse ${filePath}, skipping`)
      continue
    }

    if (chunksData.version !== 1 || !Array.isArray(chunksData.chunks)) {
      console.warn(`Warning: Invalid chunks file format ${filePath}, skipping`)
      continue
    }

    const sourceKey = path.join(chunksData.channel, `${chunksData.videoTitle}.txt`)

    const prev = state.sources[sourceKey]
    const isUnchanged = !args.force && prev?.chunksHash === fileHash

    if (isUnchanged) {
      unchanged++
      continue
    }

    toIngest.push({ filePath, sourceKey, chunksData, fileHash })
  }

  console.log("================================")
  console.log("💾 INGEST TO SUPABASE (Stage 10)")
  console.log("================================")
  console.log(`Source:       ${args.source ?? "all"}`)
  console.log(`Unchanged:    ${unchanged}`)
  console.log(`To ingest:    ${toIngest.length}${args.force ? " (forced)" : ""}`)
  console.log(`State file:   ${statePath}`)

  if (args.verifyOnly || args.dryRun) {
    console.log("")
    console.log(args.verifyOnly ? "✅ Verify-only: no DB writes." : "✅ Dry run: no DB writes.")

    if (toIngest.length > 0) {
      console.log("")
      console.log("Would ingest:")
      for (const item of toIngest) {
        console.log(`  - ${item.sourceKey} (${item.chunksData.chunks.length} chunks)`)
      }
    }
    return
  }

  if (toIngest.length === 0) {
    console.log("✅ Nothing to ingest.")
    return
  }

  const { storeEmbeddings, deleteEmbeddingsBySource } = await import("../../src/db/server")

  for (const item of toIngest) {
    const { sourceKey, chunksData, fileHash } = item
    const { channel, videoTitle, videoType, chunks } = chunksData

    console.log("")
    console.log(`🔁 Ingesting: ${sourceKey} (${chunks.length} chunks)`)

    const rows = chunks.map((chunk) => {
      const metadata: Record<string, unknown> = {
        channel,
        coach: channel,
        video_title: videoTitle,
        chunkIndex: chunk.metadata.chunkIndex,
        totalChunks: chunk.metadata.totalChunks,
        segmentType: chunk.metadata.segmentType,
        isRealExample: chunk.metadata.isRealExample,
      }

      if (videoType) {
        metadata.video_type = videoType
      }

      if (chunk.metadata.conversationId !== undefined) {
        metadata.conversationId = chunk.metadata.conversationId
      }
      if (chunk.metadata.phase) {
        metadata.phase = chunk.metadata.phase
      }
      if (chunk.metadata.techniques && chunk.metadata.techniques.length > 0) {
        metadata.techniques = chunk.metadata.techniques
      }
      if (chunk.metadata.topics && chunk.metadata.topics.length > 0) {
        metadata.topics = chunk.metadata.topics
      }

      return {
        content: chunk.content,
        source: sourceKey,
        embedding: chunk.embedding,
        metadata,
      }
    })

    console.log(`   💾 Replacing embeddings for source: ${sourceKey}`)
    await deleteEmbeddingsBySource(sourceKey)
    await storeEmbeddings(rows)

    state.sources[sourceKey] = {
      chunksHash: fileHash,
      ingestedCount: chunks.length,
      ingestedAt: new Date().toISOString(),
    }
    await saveState(statePath, state)

    console.log(`   ✅ Done: ${sourceKey}`)
  }

  console.log("")
  console.log("🎉 Ingest complete!")
}

main().catch((err) => {
  console.error("Fatal error during ingest:", err)
  process.exit(1)
})
