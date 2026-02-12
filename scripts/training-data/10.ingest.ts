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
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --dry-run
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --verify
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --full
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --skip-taxonomy-gate
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --allow-unstable-source-key
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
  manifest: string | null
  skipTaxonomyGate: boolean
  allowUnstableSourceKey: boolean
}

type ChunkMetadata = {
  segmentType: string
  isRealExample: boolean
  chunkIndex: number
  totalChunks: number
  conversationId?: number
  conversationChunkIndex?: number
  conversationChunkTotal?: number
  phase?: string
  techniques?: string[]
  topics?: string[]
  investmentLevel?: string
  phaseConfidence?: number
  startSec?: number
  endSec?: number
  asrLowQualitySegmentCount?: number
  asrTranscriptArtifactCount?: number
  asrTranscriptArtifactTypes?: string[]
  chunkConfidence?: number
  chunkConfidenceVersion?: number
  problematicReason?: string[]
}

type Chunk = {
  content: string
  embedding: number[]
  metadata: ChunkMetadata
}

type ChunksFile = {
  version: 1
  // Stable idempotency key for ingestion and state tracking.
  // Format: "<channel>/<youtube_video_id>.txt"
  sourceKey?: string
  sourceFile: string
  sourceHash: string
  embeddingModel: string
  chunkSize: number
  chunkOverlap: number
  videoType: string
  channel: string
  // YouTube video id (11 chars). Newer Stage 09 artifacts include this.
  videoId?: string
  videoTitle: string
  // Stage 07 stem (title + [video_id] + audio variant suffix). Optional.
  videoStem?: string
  generatedAt: string
  chunks: Chunk[]
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): Args {
  const flags = new Set(argv)
  let source: string | null = null
  let manifest: string | null = null

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--source" && argv[i + 1]) {
      source = argv[++i]
    }
    if (arg.startsWith("--source=")) {
      source = arg.split("=", 2)[1]
    }
    if (arg === "--manifest" && argv[i + 1]) {
      manifest = argv[++i]
    }
    if (arg.startsWith("--manifest=")) {
      manifest = arg.split("=", 2)[1]
    }
  }

  return {
    force: flags.has("--full") || flags.has("--force"),
    dryRun: flags.has("--dry-run"),
    verifyOnly: flags.has("--verify"),
    source,
    manifest,
    skipTaxonomyGate: flags.has("--skip-taxonomy-gate"),
    allowUnstableSourceKey: flags.has("--allow-unstable-source-key"),
  }
}

function isValidVideoId(raw: unknown): raw is string {
  return typeof raw === "string" && /^[A-Za-z0-9_-]{11}$/.test(raw.trim())
}

function isStableSourceKey(raw: unknown): raw is string {
  if (typeof raw !== "string") return false
  const trimmed = raw.trim()
  if (!trimmed) return false
  // Expected: "<channel>/<video_id>.txt" (channel may include nested dirs, but basename must be video id).
  return /[\\/][A-Za-z0-9_-]{11}\.txt$/.test(trimmed)
}

function deriveSourceKey(
  chunksData: ChunksFile,
  filePath: string,
  allowUnstableSourceKey: boolean
): { sourceKey: string; stable: boolean; reason?: string } {
  if (typeof chunksData.sourceKey === "string" && chunksData.sourceKey.trim()) {
    const explicit = chunksData.sourceKey.trim()
    if (isStableSourceKey(explicit)) {
      return { sourceKey: explicit, stable: true }
    }
    const channel = typeof chunksData.channel === "string" ? chunksData.channel.trim() : ""
    const videoId = typeof chunksData.videoId === "string" ? chunksData.videoId.trim() : ""
    if (channel && isValidVideoId(videoId)) {
      return { sourceKey: path.join(channel, `${videoId}.txt`), stable: true }
    }
    if (allowUnstableSourceKey) {
      return { sourceKey: explicit, stable: false, reason: "invalid_source_key" }
    }
    return { sourceKey: "", stable: false, reason: "invalid_source_key" }
  }

  if (typeof chunksData.channel === "string" && chunksData.channel.trim()) {
    const channel = chunksData.channel.trim()
    const videoId = typeof chunksData.videoId === "string" ? chunksData.videoId.trim() : ""
    if (isValidVideoId(videoId)) {
      return { sourceKey: path.join(channel, `${videoId}.txt`), stable: true }
    }
    if (allowUnstableSourceKey) {
      return {
        sourceKey: path.join(channel, `${chunksData.videoTitle}.txt`),
        stable: false,
        reason: "missing_video_id",
      }
    }
    return {
      sourceKey: "",
      stable: false,
      reason: "missing_video_id",
    }
  }

  if (allowUnstableSourceKey) {
    return {
      sourceKey: path.basename(filePath, ".chunks.json"),
      stable: false,
      reason: "missing_channel",
    }
  }

  return {
    sourceKey: "",
    stable: false,
    reason: "missing_channel",
  }
}

function validateChunksFileForIngest(chunksData: ChunksFile, filePath: string): string[] {
  const errors: string[] = []

  if (!chunksData || typeof chunksData !== "object") {
    return ["chunks file root must be a JSON object"]
  }
  if (chunksData.version !== 1) {
    errors.push(`unsupported version=${String((chunksData as any).version)}`)
  }
  if (typeof chunksData.embeddingModel !== "string" || !chunksData.embeddingModel.trim()) {
    errors.push("missing embeddingModel")
  }
  if (typeof chunksData.chunkSize !== "number" || !Number.isFinite(chunksData.chunkSize) || chunksData.chunkSize <= 0) {
    errors.push(`invalid chunkSize=${String(chunksData.chunkSize)}`)
  }
  if (typeof chunksData.chunkOverlap !== "number" || !Number.isFinite(chunksData.chunkOverlap) || chunksData.chunkOverlap < 0) {
    errors.push(`invalid chunkOverlap=${String(chunksData.chunkOverlap)}`)
  }
  if (typeof chunksData.channel !== "string" || !chunksData.channel.trim()) {
    errors.push("missing channel")
  }
  if (typeof chunksData.videoType !== "string" || !chunksData.videoType.trim()) {
    errors.push("missing videoType")
  }
  if (typeof chunksData.videoTitle !== "string" || !chunksData.videoTitle.trim()) {
    errors.push("missing videoTitle")
  }
  if (!Array.isArray(chunksData.chunks) || chunksData.chunks.length === 0) {
    errors.push("chunks must be a non-empty array")
    return errors
  }

  let embeddingDim: number | null = null
  for (let i = 0; i < chunksData.chunks.length; i++) {
    const chunk = chunksData.chunks[i] as any
    if (!chunk || typeof chunk !== "object") {
      errors.push(`chunk[${i}] must be an object`)
      continue
    }
    if (typeof chunk.content !== "string" || !chunk.content.trim()) {
      errors.push(`chunk[${i}] has empty content`)
    }

    if (!Array.isArray(chunk.embedding) || chunk.embedding.length === 0) {
      errors.push(`chunk[${i}] has missing/empty embedding`)
    } else {
      for (let j = 0; j < chunk.embedding.length; j++) {
        const val = chunk.embedding[j]
        if (typeof val !== "number" || !Number.isFinite(val)) {
          errors.push(`chunk[${i}] embedding[${j}] is not a finite number`)
          break
        }
      }
      if (embeddingDim === null) {
        embeddingDim = chunk.embedding.length
      } else if (chunk.embedding.length !== embeddingDim) {
        errors.push(
          `chunk[${i}] embedding length ${chunk.embedding.length} != expected ${embeddingDim}`
        )
      }
    }

    if (!chunk.metadata || typeof chunk.metadata !== "object") {
      errors.push(`chunk[${i}] missing metadata`)
      continue
    }
    if (typeof chunk.metadata.segmentType !== "string" || !chunk.metadata.segmentType.trim()) {
      errors.push(`chunk[${i}] missing metadata.segmentType`)
    }
    if (typeof chunk.metadata.chunkIndex !== "number" || !Number.isFinite(chunk.metadata.chunkIndex)) {
      errors.push(`chunk[${i}] missing/invalid metadata.chunkIndex`)
    }
    if (typeof chunk.metadata.totalChunks !== "number" || !Number.isFinite(chunk.metadata.totalChunks)) {
      errors.push(`chunk[${i}] missing/invalid metadata.totalChunks`)
    }
  }

  // Keep logs readable when a file is badly malformed.
  if (errors.length > 12) {
    return [...errors.slice(0, 12), `... (${errors.length - 12} more issue(s)) in ${filePath}`]
  }

  return errors
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

// ---------------------------------------------------------------------------
// Manifest filtering
// ---------------------------------------------------------------------------

const MANIFEST_VIDEO_ID_RE = /\[([A-Za-z0-9_-]{11})\]/

function loadManifestAllowList(manifestPath: string): Map<string, Set<string>> {
  const abs = path.isAbsolute(manifestPath)
    ? manifestPath
    : path.join(process.cwd(), manifestPath)
  const raw = fs.readFileSync(abs, "utf-8")
  const out = new Map<string, Set<string>>()

  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const parts = line.split("|", 2).map((p) => p.trim())
    if (parts.length !== 2) continue
    const [source, folder] = parts
    const m = folder.match(MANIFEST_VIDEO_ID_RE)
    const vid = m?.[1]
    if (!source || !vid) continue
    const set = out.get(source) ?? new Set<string>()
    set.add(vid)
    out.set(source, set)
  }

  return out
}

function safeReportName(raw: string): string {
  const cleaned = (raw || "").trim().replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "")
  return cleaned || "report"
}

function checkTaxonomyGate(manifestPath: string): void {
  const stem = path.basename(manifestPath, path.extname(manifestPath))
  const reportPath = path.join(
    process.cwd(),
    "data",
    "08.taxonomy-validation",
    `${safeReportName(stem)}.report.json`
  )

  if (!fs.existsSync(reportPath)) {
    console.error(`❌ Missing Stage 08 report: ${reportPath}`)
    console.error(`   Run: python3 scripts/training-data/08.taxonomy-validation --manifest ${manifestPath}`)
    process.exit(1)
  }

  let data: unknown
  try {
    data = JSON.parse(fs.readFileSync(reportPath, "utf-8"))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`❌ Could not read Stage 08 report: ${reportPath} (${msg})`)
    process.exit(1)
  }

  const status = (data as any)?.validation?.status
  const reason = (data as any)?.validation?.reason

  if (status === "FAIL") {
    console.error(`❌ Stage 08 taxonomy gate FAIL (${reportPath})`)
    if (typeof reason === "string" && reason.trim()) console.error(`   Reason: ${reason.trim()}`)
    process.exit(1)
  }

  if (status === "WARNING") {
    console.warn(`⚠️  Stage 08 taxonomy gate WARNING (${reportPath})`)
    if (typeof reason === "string" && reason.trim()) console.warn(`   Reason: ${reason.trim()}`)
  } else if (status !== "PASS") {
    console.warn(`⚠️  Stage 08 taxonomy gate status is unknown (${String(status)}). Proceeding anyway.`)
  }
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

  if (args.manifest && !args.skipTaxonomyGate) {
    checkTaxonomyGate(args.manifest)
  }

  let manifestAllowList: Map<string, Set<string>> | null = null
  if (args.manifest) {
    try {
      manifestAllowList = loadManifestAllowList(args.manifest)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`❌ Could not read manifest: ${args.manifest} (${msg})`)
      process.exit(1)
    }
    if (manifestAllowList.size === 0) {
      console.error(`❌ Manifest had no valid entries: ${args.manifest}`)
      process.exit(1)
    }
  }

  let chunkFiles: string[] = []
  let missingFromManifest = 0

  if (manifestAllowList) {
    const sources = args.source
      ? [args.source]
      : Array.from(manifestAllowList.keys()).sort((a, b) => a.localeCompare(b))
    for (const src of sources) {
      const ids = manifestAllowList.get(src)
      if (!ids) continue
      for (const vid of Array.from(ids).sort((a, b) => a.localeCompare(b))) {
        const candidate = path.join(chunksDir, src, `${vid}.chunks.json`)
        if (fs.existsSync(candidate)) {
          chunkFiles.push(candidate)
        } else {
          missingFromManifest++
        }
      }
    }

    if (chunkFiles.length === 0) {
      const prefix = args.source ? `source '${args.source}' ` : ""
      console.log(`No .chunks.json files found for ${prefix}manifest ${args.manifest}`)
      console.log(`Run Stage 09 (chunk-embed) first to generate chunk files.`)
      if (missingFromManifest > 0) {
        console.log(`Missing expected chunk files: ${missingFromManifest}`)
      }
      return
    }
  } else {
    const scanDir = args.source ? path.join(chunksDir, args.source) : chunksDir

    if (!fs.existsSync(scanDir)) {
      console.error(`❌ Missing directory: ${scanDir}`)
      console.error(`   Run Stage 09 (chunk-embed) first to generate chunk files.`)
      process.exit(1)
    }

    chunkFiles = await listChunkFiles(scanDir)
    if (chunkFiles.length === 0) {
      console.log(`No .chunks.json files found under ${scanDir}`)
      console.log(`Run Stage 09 (chunk-embed) first to generate chunk files.`)
      return
    }
  }

  const toIngest: Array<{
    filePath: string
    sourceKey: string
    chunksData: ChunksFile
    fileHash: string
  }> = []
  let unchanged = 0
  let skippedUnstableSourceKey = 0
  let invalidChunkFiles = 0

  for (const filePath of chunkFiles) {
    const rawContent = await fsp.readFile(filePath, "utf-8")
    const fileHash = hashFile(rawContent)

    let chunksData: ChunksFile
    try {
      chunksData = JSON.parse(rawContent)
    } catch {
      console.warn(`Warning: Could not parse ${filePath}, skipping`)
      invalidChunkFiles++
      continue
    }

    if (chunksData.version !== 1 || !Array.isArray(chunksData.chunks)) {
      console.warn(`Warning: Invalid chunks file format ${filePath}, skipping`)
      invalidChunkFiles++
      continue
    }

    const validationErrors = validateChunksFileForIngest(chunksData, filePath)
    if (validationErrors.length > 0) {
      invalidChunkFiles++
      console.warn(`Warning: Invalid chunk payload ${filePath}, skipping`)
      for (const err of validationErrors) {
        console.warn(`  - ${err}`)
      }
      continue
    }

    const derived = deriveSourceKey(chunksData, filePath, args.allowUnstableSourceKey)
    if (!derived.stable && !args.allowUnstableSourceKey) {
      skippedUnstableSourceKey++
      const reasonText = derived.reason === "missing_video_id"
        ? "missing valid videoId"
        : derived.reason === "invalid_source_key"
        ? "invalid sourceKey (expected <channel>/<video_id>.txt)"
        : "missing channel/sourceKey"
      console.warn(`Warning: Skipping ${filePath}; ${reasonText} (would create unstable sourceKey).`)
      continue
    }
    if (!derived.stable && args.allowUnstableSourceKey) {
      const fallbackText = derived.reason === "missing_video_id"
        ? "falling back to channel/title sourceKey"
        : derived.reason === "invalid_source_key"
        ? "keeping provided unstable sourceKey"
        : "falling back to filename-based sourceKey"
      console.warn(`Warning: ${filePath}; ${fallbackText} (unstable).`)
    }

    const sourceKey = derived.sourceKey.trim()
    if (!sourceKey) {
      skippedUnstableSourceKey++
      console.warn(`Warning: Skipping ${filePath}; could not derive sourceKey.`)
      continue
    }

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
  if (args.manifest) console.log(`Manifest:     ${args.manifest}`)
  if (missingFromManifest > 0) {
    console.log(`Missing:      ${missingFromManifest} manifest chunk file(s) not found`)
  }
  if (skippedUnstableSourceKey > 0) {
    console.log(`Skipped:      ${skippedUnstableSourceKey} unstable sourceKey file(s)`)
  }
  if (invalidChunkFiles > 0) {
    console.log(`Skipped:      ${invalidChunkFiles} invalid chunk file(s)`)
  }
  console.log(`Unchanged:    ${unchanged}`)
  console.log(`To ingest:    ${toIngest.length}${args.force ? " (forced)" : ""}`)
  console.log(`State file:   ${statePath}`)

  if (invalidChunkFiles > 0 && args.manifest) {
    console.error("")
    console.error(
      "❌ Refusing manifest ingest: one or more chunk files failed Stage 10 preflight validation."
    )
    process.exit(1)
  }

  if (skippedUnstableSourceKey > 0 && args.manifest && !args.allowUnstableSourceKey) {
    console.error("")
    console.error(
      "❌ Refusing manifest ingest: one or more files had unstable source keys. " +
      "Re-run Stage 09, or use --allow-unstable-source-key for legacy artifacts."
    )
    process.exit(1)
  }

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
    const { channel, videoTitle, videoType, chunks, videoId } = chunksData

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
      if (typeof videoId === "string" && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
        metadata.video_id = videoId
      }

      if (chunk.metadata.conversationId !== undefined) {
        metadata.conversationId = chunk.metadata.conversationId
      }
      if (chunk.metadata.conversationChunkIndex !== undefined) {
        metadata.conversationChunkIndex = chunk.metadata.conversationChunkIndex
      }
      if (chunk.metadata.conversationChunkTotal !== undefined) {
        metadata.conversationChunkTotal = chunk.metadata.conversationChunkTotal
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
      if (chunk.metadata.investmentLevel) {
        metadata.investmentLevel = chunk.metadata.investmentLevel
      }
      if (typeof chunk.metadata.phaseConfidence === "number") {
        metadata.phaseConfidence = chunk.metadata.phaseConfidence
      }
      if (typeof chunk.metadata.startSec === "number") {
        metadata.startSec = chunk.metadata.startSec
      }
      if (typeof chunk.metadata.endSec === "number") {
        metadata.endSec = chunk.metadata.endSec
      }
      if (typeof chunk.metadata.asrLowQualitySegmentCount === "number") {
        metadata.asrLowQualitySegmentCount = chunk.metadata.asrLowQualitySegmentCount
      }
      if (typeof chunk.metadata.asrTranscriptArtifactCount === "number") {
        metadata.asrTranscriptArtifactCount = chunk.metadata.asrTranscriptArtifactCount
      }
      if (chunk.metadata.asrTranscriptArtifactTypes && chunk.metadata.asrTranscriptArtifactTypes.length > 0) {
        metadata.asrTranscriptArtifactTypes = chunk.metadata.asrTranscriptArtifactTypes
      }
      if (typeof chunk.metadata.chunkConfidence === "number") {
        metadata.chunkConfidence = chunk.metadata.chunkConfidence
      }
      if (typeof chunk.metadata.chunkConfidenceVersion === "number") {
        metadata.chunkConfidenceVersion = chunk.metadata.chunkConfidenceVersion
      }
      if (chunk.metadata.problematicReason && chunk.metadata.problematicReason.length > 0) {
        metadata.problematicReason = chunk.metadata.problematicReason
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
