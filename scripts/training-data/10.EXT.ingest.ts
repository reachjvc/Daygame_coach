/**
 * scripts/training-data/10.EXT.ingest.ts
 *
 * Ingest Stage (Stage 10)
 *
 * Reads chunked and embedded data, inserts into Supabase pgvector.
 * This stage performs ONLY database operations - no chunking or embedding.
 *
 * Reads:
 *   - Chunked and embedded files (from Stage 09):
 *       data/09.EXT.chunks/<source>/<video>.chunks.json
 *
 * Writes:
 *   - Supabase embeddings (via `storeEmbeddings`)
 *   - Ingest state tracking:
 *       data/.ingest_state.json
 *   - Manifest quarantine decision report:
 *       data/validation/ingest_quarantine/<manifest>[.<source>].<run>.report.json
 *
 * Use:
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --source daily_evolution
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --dry-run
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --verify
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --full
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --skip-taxonomy-gate
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --skip-readiness-gate
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --semantic-min-fresh 5 --semantic-min-mean-overall 75 --semantic-max-major-error-rate 0.20 --semantic-fail-on-stale
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --semantic-min-fresh 5 --semantic-report-out data/validation/semantic_gate/CANARY.1.custom.report.json
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --quality-gate
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --allow-unstable-source-key
 *
 * Notes:
 *   - Manifest ingest uses per-video quarantine for Stage 08/Readiness failures when report detail is available.
 *   - Default readiness ingest policy is READY-only.
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
  qualityGate: boolean
  source: string | null
  manifest: string | null
  skipTaxonomyGate: boolean
  skipReadinessGate: boolean
  readinessSummary: string | null
  quarantineReportOut: string | null
  quarantineFile: string | null
  semanticBatchId: string | null
  semanticReportOut: string | null
  semanticMinFresh: number | null
  semanticMinMeanOverall: number | null
  semanticMaxMajorErrorRate: number | null
  semanticMaxHallucinationRate: number | null
  semanticFailOnStale: boolean
  allowUnstableSourceKey: boolean
  primaryConfidenceThreshold: number
  ingestReviewLane: boolean
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
  worstArtifactSeverity?: string
  chunk_confidence_score?: number
  // Legacy field names (read for backward compat with old chunks.json)
  chunkConfidence?: number
  chunkConfidenceScore?: number
  chunkConfidenceVersion?: number
  problematicReason?: string[]
  damaged_segment_ids?: number[]
  // Legacy field names (read for backward compat)
  damagedSegmentIds?: number[]
  contains_repaired_text?: boolean
  // Legacy field name (read for backward compat)
  containsRepairedText?: boolean
  // Cross-reference fields (D14b)
  blockIndex?: number
  relatedConversationId?: number | null
  relatedCommentaryBlockIndices?: number[]
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

function printUsage(): void {
  console.log(`Usage:
  node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts [options]

Core:
  --manifest <path>         Restrict ingest to manifest scope
  --source <name>           Restrict ingest to one source
  --dry-run                 Validate and print without DB writes
  --verify                  Verify-only mode
  --full, --force           Force re-ingest even when state appears unchanged

Gates:
  --skip-taxonomy-gate      Skip Stage 08 taxonomy gate (manifest mode)
  --skip-readiness-gate     Skip readiness summary gate (manifest mode)
  --readiness-summary <p>   Override readiness summary path
                            (default readiness policy is READY-only)
  --quarantine-file <path>  Upstream quarantine JSON — quarantined video IDs are excluded from ingest
  --quarantine-report-out <p>
                            Override manifest quarantine report output path

Semantic Gate:
  --quality-gate                 Strict semantic policy preset
  --semantic-batch-id <id>       Read judgements from data/validation_judgements/<id>/
  --semantic-min-fresh <n>       Require at least n fresh judgements
  --semantic-min-mean-overall <n>
                                 Require mean overall score >= n (0..100)
  --semantic-max-major-error-rate <n>
                                 Require major_error_rate <= n (0..1)
  --semantic-max-hallucination-rate <n>
                                 Require hallucination_rate <= n (0..1)
  --semantic-fail-on-stale       Fail when stale judgements are present
  --semantic-report-out <path>   Write semantic gate report to this path

Other:
  --allow-unstable-source-key    Allow legacy/unstable source keys (manifest mode)
  --primary-confidence-threshold <n>
                            Primary ingest lane threshold for chunk confidence score (0..1, default: 0.7)
  --ingest-review-lane      Also ingest review-lane chunks using source suffix '#review'
  -h, --help                     Show this help
`)
}

function validateKnownArgs(argv: string[]): void {
  const flags = new Set([
    "--dry-run",
    "--verify",
    "--full",
    "--force",
    "--skip-taxonomy-gate",
    "--skip-readiness-gate",
    "--quality-gate",
    "--semantic-fail-on-stale",
    "--allow-unstable-source-key",
    "--ingest-review-lane",
    "-h",
    "--help",
  ])
  const valueOpts = new Set([
    "--source",
    "--manifest",
    "--readiness-summary",
    "--quarantine-file",
    "--quarantine-report-out",
    "--semantic-batch-id",
    "--semantic-report-out",
    "--semantic-min-fresh",
    "--semantic-min-mean-overall",
    "--semantic-max-major-error-rate",
    "--semantic-max-hallucination-rate",
    "--primary-confidence-threshold",
  ])

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith("-")) {
      console.error(`❌ Unexpected argument: ${arg}`)
      process.exit(1)
    }
    if (flags.has(arg)) {
      continue
    }
    if (valueOpts.has(arg)) {
      if (i + 1 >= argv.length) {
        console.error(`❌ Missing value for option: ${arg}`)
        process.exit(1)
      }
      const next = argv[i + 1]
      if (next.trim().length === 0 || next.startsWith("-")) {
        console.error(`❌ Missing value for option: ${arg}`)
        process.exit(1)
      }
      i += 1
      continue
    }
    const eq = arg.indexOf("=")
    if (eq > 0) {
      const key = arg.slice(0, eq)
      if (valueOpts.has(key)) {
        const value = arg.slice(eq + 1)
        if (value.trim().length === 0) {
          console.error(`❌ Missing value for option: ${key}`)
          process.exit(1)
        }
        continue
      }
    }
    console.error(`❌ Unknown option: ${arg}`)
    process.exit(1)
  }
}

function parseArgs(argv: string[]): Args {
  const flags = new Set(argv)
  let source: string | null = null
  let manifest: string | null = null
  let readinessSummary: string | null = null
  let quarantineReportOut: string | null = null
  let quarantineFile: string | null = null
  let semanticBatchId: string | null = null
  let semanticReportOut: string | null = null
  let semanticMinFresh: number | null = null
  let semanticMinMeanOverall: number | null = null
  let semanticMaxMajorErrorRate: number | null = null
  let semanticMaxHallucinationRate: number | null = null
  let primaryConfidenceThreshold: number | null = null

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
    if (arg === "--readiness-summary" && argv[i + 1]) {
      readinessSummary = argv[++i]
    }
    if (arg.startsWith("--readiness-summary=")) {
      readinessSummary = arg.split("=", 2)[1]
    }
    if (arg === "--quarantine-file" && argv[i + 1]) {
      quarantineFile = argv[++i]
    }
    if (arg.startsWith("--quarantine-file=")) {
      quarantineFile = arg.split("=", 2)[1]
    }
    if (arg === "--quarantine-report-out" && argv[i + 1]) {
      quarantineReportOut = argv[++i]
    }
    if (arg.startsWith("--quarantine-report-out=")) {
      quarantineReportOut = arg.split("=", 2)[1]
    }
    if (arg === "--semantic-batch-id" && argv[i + 1]) {
      semanticBatchId = argv[++i]
    }
    if (arg.startsWith("--semantic-batch-id=")) {
      semanticBatchId = arg.split("=", 2)[1]
    }
    if (arg === "--semantic-report-out" && argv[i + 1]) {
      semanticReportOut = argv[++i]
    }
    if (arg.startsWith("--semantic-report-out=")) {
      semanticReportOut = arg.split("=", 2)[1]
    }
    if (arg === "--semantic-min-fresh" && argv[i + 1]) {
      semanticMinFresh = Number(argv[++i])
    }
    if (arg.startsWith("--semantic-min-fresh=")) {
      semanticMinFresh = Number(arg.split("=", 2)[1])
    }
    if (arg === "--semantic-min-mean-overall" && argv[i + 1]) {
      semanticMinMeanOverall = Number(argv[++i])
    }
    if (arg.startsWith("--semantic-min-mean-overall=")) {
      semanticMinMeanOverall = Number(arg.split("=", 2)[1])
    }
    if (arg === "--semantic-max-major-error-rate" && argv[i + 1]) {
      semanticMaxMajorErrorRate = Number(argv[++i])
    }
    if (arg.startsWith("--semantic-max-major-error-rate=")) {
      semanticMaxMajorErrorRate = Number(arg.split("=", 2)[1])
    }
    if (arg === "--semantic-max-hallucination-rate" && argv[i + 1]) {
      semanticMaxHallucinationRate = Number(argv[++i])
    }
    if (arg.startsWith("--semantic-max-hallucination-rate=")) {
      semanticMaxHallucinationRate = Number(arg.split("=", 2)[1])
    }
    if (arg === "--primary-confidence-threshold" && argv[i + 1]) {
      primaryConfidenceThreshold = Number(argv[++i])
    }
    if (arg.startsWith("--primary-confidence-threshold=")) {
      primaryConfidenceThreshold = Number(arg.split("=", 2)[1])
    }
  }

  return {
    force: flags.has("--full") || flags.has("--force"),
    dryRun: flags.has("--dry-run"),
    verifyOnly: flags.has("--verify"),
    qualityGate: flags.has("--quality-gate"),
    source,
    manifest,
    skipTaxonomyGate: flags.has("--skip-taxonomy-gate"),
    skipReadinessGate: flags.has("--skip-readiness-gate"),
    readinessSummary,
    quarantineReportOut,
    quarantineFile,
    semanticBatchId,
    semanticReportOut,
    semanticMinFresh,
    semanticMinMeanOverall,
    semanticMaxMajorErrorRate,
    semanticMaxHallucinationRate,
    semanticFailOnStale: flags.has("--semantic-fail-on-stale"),
    allowUnstableSourceKey: flags.has("--allow-unstable-source-key"),
    primaryConfidenceThreshold:
      typeof primaryConfidenceThreshold === "number" && Number.isFinite(primaryConfidenceThreshold)
        ? Math.max(0, Math.min(1, primaryConfidenceThreshold))
        : 0.7,
    ingestReviewLane: flags.has("--ingest-review-lane"),
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
  const expectedChunkCount = chunksData.chunks.length
  const seenChunkIndices = new Set<number>()
  let declaredTotalChunks: number | null = null

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
    if (!Number.isInteger(chunk.metadata.chunkIndex) || chunk.metadata.chunkIndex < 0) {
      errors.push(`chunk[${i}] missing/invalid metadata.chunkIndex`)
    }
    if (!Number.isInteger(chunk.metadata.totalChunks) || chunk.metadata.totalChunks <= 0) {
      errors.push(`chunk[${i}] missing/invalid metadata.totalChunks`)
    }

    const chunkIndex = chunk.metadata.chunkIndex
    const totalChunks = chunk.metadata.totalChunks
    if (Number.isInteger(totalChunks) && totalChunks > 0) {
      if (declaredTotalChunks === null) {
        declaredTotalChunks = totalChunks
      } else if (totalChunks !== declaredTotalChunks) {
        errors.push(`chunk[${i}] metadata.totalChunks ${totalChunks} != expected ${declaredTotalChunks}`)
      }
    }

    if (Number.isInteger(chunkIndex) && chunkIndex >= 0 && Number.isInteger(totalChunks) && totalChunks > 0) {
      if (chunkIndex >= totalChunks) {
        errors.push(`chunk[${i}] metadata.chunkIndex ${chunkIndex} out of bounds for totalChunks=${totalChunks}`)
      }
    }

    if (Number.isInteger(chunkIndex) && chunkIndex >= 0) {
      if (chunkIndex >= expectedChunkCount) {
        errors.push(`chunk[${i}] metadata.chunkIndex ${chunkIndex} out of bounds for chunk_count=${expectedChunkCount}`)
      } else if (seenChunkIndices.has(chunkIndex)) {
        errors.push(`chunk[${i}] duplicate metadata.chunkIndex=${chunkIndex}`)
      } else {
        seenChunkIndices.add(chunkIndex)
      }
    }
  }

  if (declaredTotalChunks !== null && declaredTotalChunks !== expectedChunkCount) {
    errors.push(
      `metadata.totalChunks ${declaredTotalChunks} does not match actual chunk count ${expectedChunkCount}`
    )
  }

  if (expectedChunkCount > 0) {
    const missingIndices: number[] = []
    for (let i = 0; i < expectedChunkCount; i++) {
      if (!seenChunkIndices.has(i)) {
        missingIndices.push(i)
        if (missingIndices.length >= 5) break
      }
    }
    if (missingIndices.length > 0) {
      const suffix = expectedChunkCount - seenChunkIndices.size > missingIndices.length ? ", ..." : ""
      errors.push(`missing metadata.chunkIndex values: ${missingIndices.join(", ")}${suffix}`)
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
const SEMANTIC_JUDGE_DEFAULT_PROMPT_VERSION = "1.2.9"
const SEMANTIC_JUDGE_DEFAULT_MAX_SEGMENTS = 200

type SemanticRequestEntry = {
  videoId: string
  source: string
  conversationId: number
  enrichment: Record<string, unknown>
  transcriptSegments: number[]
}

function extractVideoIdFromPathHint(filePath: string): string | null {
  const bracket = filePath.match(MANIFEST_VIDEO_ID_RE)
  if (bracket && isValidVideoId(bracket[1])) {
    return bracket[1]
  }
  const base = path.basename(filePath)
  const first = base.split(".", 1)[0]
  if (isValidVideoId(first)) {
    return first
  }
  const anyId = base.match(/([A-Za-z0-9_-]{11})/)
  if (anyId && isValidVideoId(anyId[1])) {
    return anyId[1]
  }
  return null
}

function inferSourceFromStage07Path(filePath: string): string | null {
  const parts = filePath.split(path.sep)
  const idx = parts.indexOf("07.LLM.content")
  if (idx >= 0 && idx + 1 < parts.length) {
    const src = parts[idx + 1]
    if (src && src !== "07.LLM.content") {
      return src
    }
  }
  return null
}

function listFilesRecursiveSync(rootDir: string, suffix: string): string[] {
  const out: string[] = []

  const walk = (dir: string): void => {
    let dirents: fs.Dirent[]
    try {
      dirents = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const dirent of dirents) {
      const full = path.join(dir, dirent.name)
      if (dirent.isDirectory()) {
        walk(full)
      } else if (dirent.isFile() && full.endsWith(suffix)) {
        out.push(full)
      }
    }
  }

  if (fs.existsSync(rootDir)) {
    walk(rootDir)
  }
  return out.sort((a, b) => a.localeCompare(b))
}

function pickBestCandidate(candidates: string[], preferredSource: string | null): string {
  const rank = (p: string): [number, number, number, string] => {
    const inferredSource = inferSourceFromStage07Path(p)
    const sourceBonus = preferredSource && inferredSource === preferredSource ? 1 : 0
    const depth = p.split(path.sep).length
    let mtime = 0
    try {
      mtime = fs.statSync(p).mtimeMs
    } catch {
      mtime = 0
    }
    return [sourceBonus, depth, mtime, p]
  }

  return [...candidates].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra[0] !== rb[0]) return rb[0] - ra[0]
    if (ra[1] !== rb[1]) return rb[1] - ra[1]
    if (ra[2] !== rb[2]) return rb[2] - ra[2]
    return rb[3].localeCompare(ra[3])
  })[0]
}

function pythonStyleJsonDumps(value: unknown): string {
  if (value === null) {
    return "null"
  }
  if (typeof value === "string") {
    return JSON.stringify(value)
  }
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "NaN"
    if (value === Infinity) return "Infinity"
    if (value === -Infinity) return "-Infinity"
    return String(value)
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => pythonStyleJsonDumps(v)).join(", ")}]`
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>
    const parts: string[] = []
    for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b))) {
      parts.push(`${JSON.stringify(key)}: ${pythonStyleJsonDumps(obj[key])}`)
    }
    return `{${parts.join(", ")}}`
  }
  return "null"
}

function stableHash(value: unknown): string {
  const payload = pythonStyleJsonDumps(value)
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex")
}

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

function loadStage07EnrichedForSemanticGate(
  expectedVideoIds: Set<string>,
  source: string | null,
  preferredSourceByVideo: Map<string, string>
): Array<Record<string, unknown>> {
  const root = source
    ? path.join(process.cwd(), "data", "07.LLM.content", source)
    : path.join(process.cwd(), "data", "07.LLM.content")
  if (!fs.existsSync(root)) {
    return []
  }

  const byVideo = new Map<string, string[]>()
  for (const filePath of listFilesRecursiveSync(root, ".enriched.json")) {
    const vid = extractVideoIdFromPathHint(filePath)
    if (!vid || !expectedVideoIds.has(vid)) {
      continue
    }
    const arr = byVideo.get(vid) ?? []
    arr.push(filePath)
    byVideo.set(vid, arr)
  }

  const out: Array<Record<string, unknown>> = []
  for (const vid of Array.from(byVideo.keys()).sort((a, b) => a.localeCompare(b))) {
    const candidates = byVideo.get(vid) ?? []
    if (candidates.length <= 0) {
      continue
    }
    const preferredSource = source ?? preferredSourceByVideo.get(vid) ?? null
    const best = pickBestCandidate(candidates, preferredSource)
    try {
      const parsed = JSON.parse(fs.readFileSync(best, "utf-8"))
      if (!isObject(parsed)) {
        continue
      }
      const rec = parsed as Record<string, unknown>
      rec._source_file = best
      out.push(rec)
    } catch {
      // Ignore unreadable files here; Stage 08/manifest gates already enforce this upstream.
    }
  }
  return out
}

function buildSemanticRequestIndex(
  enrichedFiles: Array<Record<string, unknown>>
): Map<string, SemanticRequestEntry> {
  const out = new Map<string, SemanticRequestEntry>()

  for (const ef of enrichedFiles) {
    const rawVid = ef.video_id
    let videoId: string | null = typeof rawVid === "string" && isValidVideoId(rawVid) ? rawVid : null
    const sourcePath = typeof ef._source_file === "string" ? ef._source_file : null
    if (!videoId && sourcePath) {
      videoId = extractVideoIdFromPathHint(sourcePath)
    }
    if (!videoId) {
      continue
    }

    let source = typeof ef.source === "string" ? ef.source : ""
    if (!source && sourcePath) {
      source = inferSourceFromStage07Path(sourcePath) ?? ""
    }

    const convSegIds = new Map<number, number[]>()
    const segments = Array.isArray(ef.segments) ? ef.segments : []
    for (const rawSeg of segments) {
      if (!isObject(rawSeg)) {
        continue
      }
      const cid = rawSeg.conversation_id
      const sid = rawSeg.id
      if (!Number.isInteger(cid) || cid <= 0 || !Number.isInteger(sid)) {
        continue
      }
      const arr = convSegIds.get(cid) ?? []
      arr.push(sid)
      convSegIds.set(cid, arr)
    }

    const enrichments = Array.isArray(ef.enrichments) ? ef.enrichments : []
    for (const rawEnrichment of enrichments) {
      if (!isObject(rawEnrichment)) {
        continue
      }
      if (rawEnrichment.type !== "approach") {
        continue
      }
      const cid = rawEnrichment.conversation_id
      if (!Number.isInteger(cid) || cid <= 0) {
        continue
      }
      const transcriptSegments = [...(convSegIds.get(cid) ?? [])].sort((a, b) => a - b)
      const key = `${videoId}:${cid}`
      out.set(key, {
        videoId,
        source,
        conversationId: cid,
        enrichment: rawEnrichment as Record<string, unknown>,
        transcriptSegments,
      })
    }
  }

  return out
}

function loadSemanticJudgementsForGate(
  batchId: string,
  expectedVideoIds: Set<string>
): Array<Record<string, unknown>> {
  const root = path.join(process.cwd(), "data", "validation_judgements", batchId)
  if (!fs.existsSync(root)) {
    return []
  }
  const out: Array<Record<string, unknown>> = []
  for (const filePath of listFilesRecursiveSync(root, ".judge.json")) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"))
      if (!isObject(parsed)) {
        continue
      }
      const vid = parsed.video_id
      if (typeof vid !== "string" || !expectedVideoIds.has(vid)) {
        continue
      }
      out.push(parsed as Record<string, unknown>)
    } catch {
      continue
    }
  }
  return out
}

function safeReportName(raw: string): string {
  const cleaned = (raw || "").trim().replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "")
  return cleaned || "report"
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object"
}

function defaultStageReportsDir(manifestPath: string, source: string | null): string {
  const stem = path.basename(manifestPath, path.extname(manifestPath))
  const suffix = source ? `.${source}` : ""
  const label = safeReportName(`${stem}${suffix}`)
  return path.join(process.cwd(), "data", "validation", "stage_reports", label)
}

function resolveReadinessSummaryPath(
  manifestPath: string,
  source: string | null,
  overridePath: string | null
): string {
  if (overridePath && overridePath.trim()) {
    return path.isAbsolute(overridePath) ? overridePath : path.join(process.cwd(), overridePath)
  }
  return path.join(defaultStageReportsDir(manifestPath, source), "readiness-summary.json")
}

function defaultSemanticBatchId(manifestPath: string): string {
  return path.basename(manifestPath, path.extname(manifestPath))
}

function resolveSemanticGateReportPath(
  manifestPath: string,
  source: string | null,
  batchId: string,
  overridePath: string | null
): string {
  if (overridePath && overridePath.trim()) {
    return path.isAbsolute(overridePath) ? overridePath : path.join(process.cwd(), overridePath)
  }
  const stem = path.basename(manifestPath, path.extname(manifestPath))
  const suffix = source ? `.${source}` : ""
  const label = safeReportName(`${stem}${suffix}.${batchId}`)
  return path.join(process.cwd(), "data", "validation", "semantic_gate", `${label}.report.json`)
}

function compactUtcRunLabel(isoTimestamp: string): string {
  return isoTimestamp.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

function resolveManifestQuarantineReportPath(
  manifestPath: string,
  source: string | null,
  generatedAt: string,
  overridePath: string | null
): string {
  if (overridePath && overridePath.trim()) {
    return path.isAbsolute(overridePath) ? overridePath : path.join(process.cwd(), overridePath)
  }
  const manifestStem = path.basename(manifestPath, path.extname(manifestPath))
  const suffix = source ? `.${source}` : ""
  const runLabel = compactUtcRunLabel(generatedAt)
  const label = safeReportName(`${manifestStem}${suffix}.${runLabel}`)
  return path.join(process.cwd(), "data", "validation", "ingest_quarantine", `${label}.report.json`)
}

async function writeManifestQuarantineReport({
  manifestPath,
  source,
  generatedAt,
  overridePath,
  initialVideoIds,
  postTaxonomyVideoIds,
  postReadinessVideoIds,
  sourceByVideo,
  taxonomyGate,
  readinessGate,
  taxonomyGateEnabled,
  readinessGateEnabled,
}: {
  manifestPath: string
  source: string | null
  generatedAt: string
  overridePath: string | null
  initialVideoIds: Set<string>
  postTaxonomyVideoIds: Set<string>
  postReadinessVideoIds: Set<string>
  sourceByVideo: Map<string, string>
  taxonomyGate: TaxonomyGateResult | null
  readinessGate: ReadinessGateResult | null
  taxonomyGateEnabled: boolean
  readinessGateEnabled: boolean
}): Promise<string> {
  const taxonomyBlocked = taxonomyGate?.blockedReasons ?? new Map<string, string>()
  const readinessBlocked = new Map<string, ReadinessBlockedItem>()
  for (const item of readinessGate?.blocked ?? []) {
    if (!readinessBlocked.has(item.videoId)) {
      readinessBlocked.set(item.videoId, item)
    }
  }

  const blockedIds = Array.from(new Set<string>([
    ...Array.from(taxonomyBlocked.keys()),
    ...Array.from(readinessBlocked.keys()),
  ])).sort((a, b) => a.localeCompare(b))

  const blockedVideos: ManifestQuarantineReportVideo[] = blockedIds.map((vid) => {
    const readiness = readinessBlocked.get(vid)
    const taxonomyReason = taxonomyBlocked.get(vid)
    const blockedBy: string[] = []
    if (taxonomyReason) blockedBy.push("stage08_taxonomy")
    if (readiness) blockedBy.push("readiness")
    return {
      video_id: vid,
      source: sourceByVideo.get(vid) ?? readiness?.source ?? null,
      blocked_by: blockedBy,
      ...(taxonomyReason
        ? {
            stage08: {
              reason: taxonomyReason,
              report: taxonomyGate?.reportPath ?? "",
            },
          }
        : {}),
      ...(readiness
        ? {
            readiness: {
              status: readiness.status,
              reason: readiness.reason || "not_ingest_ready",
              source: readiness.source ?? null,
              report: readiness.report ?? null,
            },
          }
        : {}),
    }
  })

  const eligibleVideoIds = Array.from(postReadinessVideoIds).sort((a, b) => a.localeCompare(b))

  const report = {
    version: 1,
    generated_at: generatedAt,
    manifest: manifestPath,
    source_filter: source ?? null,
    scope: {
      initial_videos: initialVideoIds.size,
      post_taxonomy_videos: postTaxonomyVideoIds.size,
      post_readiness_videos: postReadinessVideoIds.size,
      blocked_videos: blockedIds.length,
      eligible_videos: eligibleVideoIds.length,
    },
    stages: {
      taxonomy: {
        enabled: taxonomyGateEnabled,
        report: taxonomyGate?.reportPath ?? null,
        status: taxonomyGate?.status ?? null,
        reason: taxonomyGate?.reason || null,
        blocked_videos: taxonomyGate?.blockedVideoIds.size ?? 0,
      },
      readiness: {
        enabled: readinessGateEnabled,
        summary: readinessGate?.summaryPath ?? null,
        blocked_videos: readinessGate?.blocked.length ?? 0,
      },
    },
    blocked_video_ids: blockedIds,
    eligible_video_ids: eligibleVideoIds,
    blocked_videos: blockedVideos,
  }

  const reportPath = resolveManifestQuarantineReportPath(manifestPath, source, generatedAt, overridePath)
  await fsp.mkdir(path.dirname(reportPath), { recursive: true })
  await fsp.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf-8")
  return reportPath
}

function semanticGateRequested(args: Args): boolean {
  return (
    args.semanticMinFresh !== null
    || args.semanticMinMeanOverall !== null
    || args.semanticMaxMajorErrorRate !== null
    || args.semanticMaxHallucinationRate !== null
    || args.semanticFailOnStale
  )
}

type ReadinessBlockedItem = {
  videoId: string
  status: "READY" | "REVIEW" | "BLOCKED"
  reason: string
  source?: string | null
  report?: string | null
}

type ReadinessGateResult = {
  eligibleVideoIds: Set<string>
  blocked: ReadinessBlockedItem[]
  summaryPath: string
}

type TaxonomyGateResult = {
  blockedVideoIds: Set<string>
  blockedReasons: Map<string, string>
  reportPath: string
  status: "PASS" | "WARNING" | "FAIL"
  reason: string
}

type ManifestQuarantineReportVideo = {
  video_id: string
  source: string | null
  blocked_by: string[]
  stage08?: {
    reason: string
    report: string
  }
  readiness?: {
    status: "READY" | "REVIEW" | "BLOCKED"
    reason: string
    source: string | null
    report: string | null
  }
}

function checkReadinessGate(
  manifestPath: string,
  expectedVideoIds: Set<string>,
  source: string | null,
  readinessSummaryOverride: string | null
) : ReadinessGateResult {
  const emptyResult: ReadinessGateResult = { eligibleVideoIds: new Set<string>(), blocked: [], summaryPath: "" }
  if (expectedVideoIds.size <= 0) {
    return emptyResult
  }

  const summaryPath = resolveReadinessSummaryPath(manifestPath, source, readinessSummaryOverride)
  const sourceArg = source ? ` --source ${source}` : ""
  const stageReportsDir = defaultStageReportsDir(manifestPath, source)

  if (!fs.existsSync(summaryPath)) {
    console.error(`❌ Missing readiness summary: ${summaryPath}`)
    console.error(`   Run: python3 scripts/training-data/validation/validate_manifest.py --manifest ${manifestPath}${sourceArg} --emit-stage-reports`)
    console.error(
      `   Then: python3 scripts/training-data/validation/validate_stage_report.py --dir ${stageReportsDir} --manifest ${manifestPath}${sourceArg} --emit-readiness-summary`
    )
    process.exit(1)
  }

  let data: unknown
  try {
    data = JSON.parse(fs.readFileSync(summaryPath, "utf-8"))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`❌ Could not read readiness summary: ${summaryPath} (${msg})`)
    process.exit(1)
  }

  if (!isObject(data) || !Array.isArray((data as any).videos)) {
    console.error(`❌ Readiness summary has invalid shape (missing videos[]): ${summaryPath}`)
    process.exit(1)
  }

  let allowIngestStatuses: Set<string> | null = null
  const policy = isObject((data as any).policy) ? ((data as any).policy as Record<string, unknown>) : null
  if (policy && typeof policy.allow_ingest_statuses !== "undefined" && policy.allow_ingest_statuses !== null) {
    if (!Array.isArray(policy.allow_ingest_statuses)) {
      console.error(`❌ Readiness summary policy.allow_ingest_statuses must be an array (${summaryPath})`)
      process.exit(1)
    }
    const parsed = new Set<string>()
    for (const raw of policy.allow_ingest_statuses as unknown[]) {
      if (raw !== "READY" && raw !== "REVIEW" && raw !== "BLOCKED") {
        console.error(
          `❌ Readiness summary policy.allow_ingest_statuses contains invalid value='${String(raw)}' (${summaryPath})`
        )
        process.exit(1)
      }
      parsed.add(raw)
    }
    allowIngestStatuses = parsed
  }

  const summaryScope = isObject((data as any).scope) ? ((data as any).scope as Record<string, unknown>) : null
  if (summaryScope) {
    const scopeManifest = typeof summaryScope.manifest === "string" ? summaryScope.manifest.trim() : ""
    if (scopeManifest) {
      const expectedManifestBase = path.basename(manifestPath)
      const scopeManifestBase = path.basename(scopeManifest)
      if (scopeManifestBase !== expectedManifestBase) {
        console.error(
          `❌ Readiness summary scope mismatch: expected manifest '${expectedManifestBase}', got '${scopeManifestBase}' (${summaryPath})`
        )
        process.exit(1)
      }
    }

    const scopeSourceRaw = summaryScope.source_filter
    const scopeSource = typeof scopeSourceRaw === "string" ? scopeSourceRaw.trim() : ""
    if (typeof scopeSourceRaw !== "undefined" && scopeSourceRaw !== null && typeof scopeSourceRaw !== "string") {
      console.error(`❌ Readiness summary scope.source_filter must be string or null (${summaryPath})`)
      process.exit(1)
    }
    if (source && scopeSource && scopeSource !== source) {
      console.error(
        `❌ Readiness summary source mismatch: expected source '${source}', got '${scopeSource}' (${summaryPath})`
      )
      process.exit(1)
    }
    if (!source && scopeSource) {
      console.error(
        `❌ Readiness summary is source-scoped ('${scopeSource}') but ingest is manifest-wide (${summaryPath})`
      )
      process.exit(1)
    }

    const scopeVideoCount = summaryScope.video_count
    if (typeof scopeVideoCount !== "undefined" && scopeVideoCount !== null) {
      if (!Number.isInteger(scopeVideoCount) || scopeVideoCount < 0) {
        console.error(`❌ Readiness summary scope.video_count must be integer >= 0 (${summaryPath})`)
        process.exit(1)
      }
      if (scopeVideoCount > 0 && scopeVideoCount < expectedVideoIds.size) {
        console.error(
          `❌ Readiness summary scope.video_count mismatch: expected at least ${expectedVideoIds.size}, got ${scopeVideoCount} (${summaryPath})`
        )
        process.exit(1)
      }
      if (scopeVideoCount > expectedVideoIds.size) {
        console.warn(
          `⚠️  Readiness summary scope.video_count=${scopeVideoCount} is larger than current ingest-eligible set=${expectedVideoIds.size} `
          + "(likely due to upstream per-video quarantine)."
        )
      }
    }
  }

  const byVideo = new Map<string, {
    status: "READY" | "REVIEW" | "BLOCKED"
    readyForIngest: boolean
    reason: string
    source: string | null
    report: string | null
  }>()
  for (const item of (data as any).videos as unknown[]) {
    if (!isObject(item)) {
      console.error(`❌ Readiness summary contains non-object video entry: ${summaryPath}`)
      process.exit(1)
    }
    const rawVid = item.video_id
    if (!isValidVideoId(rawVid)) {
      console.error(`❌ Readiness summary contains invalid video_id=${String(rawVid)} (${summaryPath})`)
      process.exit(1)
    }
    if (byVideo.has(rawVid)) {
      console.error(`❌ Readiness summary contains duplicate video_id=${rawVid} (${summaryPath})`)
      process.exit(1)
    }
    const statusRaw = String(item.status || "")
    let status: "READY" | "REVIEW" | "BLOCKED"
    if (statusRaw === "READY") {
      status = "READY"
    } else if (statusRaw === "REVIEW") {
      status = "REVIEW"
    } else if (statusRaw === "BLOCKED") {
      status = "BLOCKED"
    } else {
      console.error(`❌ Readiness summary contains invalid status='${statusRaw}' for video_id=${rawVid} (${summaryPath})`)
      process.exit(1)
    }
    const readyRaw = item.ready_for_ingest
    const readyForIngest = typeof readyRaw === "boolean"
      ? readyRaw
      : (allowIngestStatuses ? allowIngestStatuses.has(status) : status === "READY")
    const reason = typeof item.reason_code === "string" ? item.reason_code : ""

    let sourceLabel: string | null = null
    const sourcesRaw = item.sources
    if (Array.isArray(sourcesRaw)) {
      const firstSource = sourcesRaw.find((raw: unknown) => typeof raw === "string" && raw.trim())
      if (typeof firstSource === "string" && firstSource.trim()) {
        sourceLabel = firstSource.trim()
      }
    }

    let reportPath: string | null = null
    const reportsRaw = item.reports
    if (Array.isArray(reportsRaw)) {
      const firstReport = reportsRaw.find((raw: unknown) => typeof raw === "string" && raw.trim())
      if (typeof firstReport === "string" && firstReport.trim()) {
        reportPath = firstReport.trim()
      }
    }

    byVideo.set(rawVid, { status, readyForIngest, reason, source: sourceLabel, report: reportPath })
  }

  const eligibleVideoIds = new Set<string>()
  const missing: string[] = []
  const blocked: ReadinessBlockedItem[] = []
  const blockedByStatus: Record<"READY" | "REVIEW" | "BLOCKED", number> = { READY: 0, REVIEW: 0, BLOCKED: 0 }
  let reviewCount = 0

  for (const vid of Array.from(expectedVideoIds).sort((a, b) => a.localeCompare(b))) {
    const item = byVideo.get(vid)
    if (!item) {
      missing.push(vid)
      continue
    }
    if (item.status === "REVIEW") {
      reviewCount += 1
    }
    if (item.status === "BLOCKED" || item.readyForIngest === false) {
      blockedByStatus[item.status] += 1
      blocked.push({
        videoId: vid,
        status: item.status,
        reason: item.reason,
        source: item.source,
        report: item.report,
      })
    } else {
      eligibleVideoIds.add(vid)
    }
  }

  if (missing.length > 0) {
    const sample = missing.slice(0, 8).join(", ")
    const suffix = missing.length > 8 ? ", ..." : ""
    console.error(
      `❌ Readiness summary manifest coverage mismatch: ${missing.length} missing video(s) `
      + `(e.g. ${sample}${suffix}).`
    )
    process.exit(1)
  }

  if (blocked.length > 0) {
    const sample = blocked
      .slice(0, 8)
      .map((b) => `${b.videoId}:${b.status}${b.reason ? `:${b.reason}` : ""}`)
      .join(", ")
    const suffix = blocked.length > 8 ? ", ..." : ""
    const policyLabel = allowIngestStatuses
      ? `[${Array.from(allowIngestStatuses).sort((a, b) => a.localeCompare(b)).join(", ")}]`
      : "[READY] (default)"
    const breakdown = `READY=${blockedByStatus.READY}, REVIEW=${blockedByStatus.REVIEW}, BLOCKED=${blockedByStatus.BLOCKED}`
    console.warn(
      `⚠️  Readiness gate quarantined ${blocked.length} video(s): `
      + `under allow_ingest_statuses=${policyLabel} (${breakdown}; e.g. ${sample}${suffix}).`
    )
    console.warn(`   Ingest scope reduced to ${eligibleVideoIds.size}/${expectedVideoIds.size} READY video(s).`)
    console.warn(`   Readiness summary: ${summaryPath}`)
    for (const row of blocked.slice(0, 12)) {
      const details = [
        row.videoId,
        `status=${row.status}`,
        `reason=${row.reason || "not_ingest_ready"}`,
      ]
      if (row.source) details.push(`source=${row.source}`)
      if (row.report) details.push(`report=${row.report}`)
      console.warn(`   - ${details.join(" ")}`)
    }
    if (blocked.length > 12) {
      console.warn(`   ... (${blocked.length - 12} more blocked video(s))`)
    }
  }

  const reviewAllowed = allowIngestStatuses ? allowIngestStatuses.has("REVIEW") : false
  if (reviewCount > 0 && reviewAllowed) {
    console.warn(`⚠️  Readiness gate: ${reviewCount} video(s) are REVIEW (ingest allowed).`)
  }

  return { eligibleVideoIds, blocked, summaryPath }
}

function checkSemanticGate(
  manifestPath: string,
  source: string | null,
  expectedVideoIds: Set<string>,
  preferredSourceByVideo: Map<string, string>,
  {
    batchId,
    semanticReportOut,
    semanticMinFresh,
    semanticMinMeanOverall,
    semanticMaxMajorErrorRate,
    semanticMaxHallucinationRate,
    semanticFailOnStale,
  }: {
    batchId: string
    semanticReportOut: string | null
    semanticMinFresh: number | null
    semanticMinMeanOverall: number | null
    semanticMaxMajorErrorRate: number | null
    semanticMaxHallucinationRate: number | null
    semanticFailOnStale: boolean
  }
): void {
  const policyParts: string[] = []
  if (semanticMinFresh !== null) policyParts.push(`min_fresh=${semanticMinFresh}`)
  if (semanticMinMeanOverall !== null) policyParts.push(`min_mean_overall=${semanticMinMeanOverall}`)
  if (semanticMaxMajorErrorRate !== null) policyParts.push(`max_major_error_rate=${semanticMaxMajorErrorRate}`)
  if (semanticMaxHallucinationRate !== null) policyParts.push(`max_hallucination_rate=${semanticMaxHallucinationRate}`)
  if (semanticFailOnStale) policyParts.push("fail_on_stale=true")
  const policyLabel = policyParts.length > 0 ? policyParts.join(", ") : "none"
  console.log(`Semantic gate policy (batch_id=${batchId}): ${policyLabel}`)

  const enrichedFiles = loadStage07EnrichedForSemanticGate(expectedVideoIds, source, preferredSourceByVideo)
  const requestIndex = buildSemanticRequestIndex(enrichedFiles)
  if (requestIndex.size <= 0) {
    console.error("❌ Semantic gate requested but no Stage 07 enriched data found for this manifest scope.")
    console.error("   Run Stage 07 before ingest, then rerun semantic_judge.py and this ingest command.")
    process.exit(1)
  }

  const judgements = loadSemanticJudgementsForGate(batchId, expectedVideoIds)
  if (judgements.length <= 0) {
    console.error(`❌ Semantic gate requested but no semantic judgements found for batch_id=${batchId}.`)
    console.error(
      `   Run: python3 scripts/training-data/validation/semantic_judge.py --manifest ${manifestPath}`
      + (source ? ` --source ${source}` : "")
      + ` --batch-id ${batchId}`
    )
    process.exit(1)
  }

  let freshCount = 0
  let staleCount = 0
  let staleMissingOrDeleted = 0
  let staleFingerprintMismatch = 0
  let majorErrors = 0
  let hallucinations = 0
  const overallScores: number[] = []

  for (const judgement of judgements) {
    const vid = judgement.video_id
    const cid = judgement.conversation_id
    if (typeof vid !== "string" || !Number.isInteger(cid)) {
      staleCount += 1
      staleMissingOrDeleted += 1
      continue
    }

    const req = requestIndex.get(`${vid}:${cid}`)
    if (!req) {
      staleCount += 1
      staleMissingOrDeleted += 1
      continue
    }

    const reqMeta = isObject(judgement.request) ? judgement.request : {}
    const promptVersion = typeof reqMeta.prompt_version === "string" && reqMeta.prompt_version
      ? reqMeta.prompt_version
      : SEMANTIC_JUDGE_DEFAULT_PROMPT_VERSION
    const maxSegments = Number.isInteger(reqMeta.max_segments) && reqMeta.max_segments > 0
      ? reqMeta.max_segments
      : SEMANTIC_JUDGE_DEFAULT_MAX_SEGMENTS

    const expectedFingerprint = stableHash({
      video_id: req.videoId,
      source: req.source,
      conversation_id: req.conversationId,
      enrichment: req.enrichment,
      transcript_segments: req.transcriptSegments,
      prompt_version: promptVersion,
      max_segments: maxSegments,
    })
    if (judgement.request_fingerprint !== expectedFingerprint) {
      staleCount += 1
      staleFingerprintMismatch += 1
      continue
    }

    freshCount += 1

    const scores = isObject(judgement.scores) ? judgement.scores : {}
    const overall = scores.overall_score_0_100
    if (typeof overall === "number" && Number.isFinite(overall)) {
      overallScores.push(overall)
    } else if (typeof overall === "string") {
      const parsed = Number(overall)
      if (Number.isFinite(parsed)) {
        overallScores.push(parsed)
      }
    }

    const flags = isObject(judgement.flags) ? judgement.flags : {}
    if (flags.major_errors === true) {
      majorErrors += 1
    }
    if (flags.hallucination_suspected === true) {
      hallucinations += 1
    }
  }

  const meanOverall = overallScores.length > 0
    ? overallScores.reduce((a, b) => a + b, 0) / overallScores.length
    : 0
  const majorErrorRate = majorErrors / Math.max(freshCount, 1)
  const hallucinationRate = hallucinations / Math.max(freshCount, 1)

  const failures: string[] = []
  if (semanticFailOnStale && staleCount > 0) {
    failures.push(`stale judgements present: stale=${staleCount}`)
  }
  if (semanticMinFresh !== null && freshCount < semanticMinFresh) {
    failures.push(`fresh judgements below threshold: fresh=${freshCount} < min=${semanticMinFresh}`)
  }
  if (semanticMinMeanOverall !== null && meanOverall < semanticMinMeanOverall) {
    failures.push(`mean overall score below threshold: mean=${meanOverall.toFixed(1)} < min=${semanticMinMeanOverall.toFixed(1)}`)
  }
  if (semanticMaxMajorErrorRate !== null && majorErrorRate > semanticMaxMajorErrorRate) {
    failures.push(`major error rate above threshold: rate=${majorErrorRate.toFixed(3)} > max=${semanticMaxMajorErrorRate.toFixed(3)}`)
  }
  if (semanticMaxHallucinationRate !== null && hallucinationRate > semanticMaxHallucinationRate) {
    failures.push(`hallucination rate above threshold: rate=${hallucinationRate.toFixed(3)} > max=${semanticMaxHallucinationRate.toFixed(3)}`)
  }

  const reportPath = resolveSemanticGateReportPath(manifestPath, source, batchId, semanticReportOut)
  const report = {
    stage: "10.ingest-semantic-gate",
    generated_at: new Date().toISOString(),
    manifest_path: manifestPath,
    source_filter: source,
    batch_id: batchId,
    policy: {
      min_fresh_judgements: semanticMinFresh,
      min_mean_overall_score_0_100: semanticMinMeanOverall,
      max_major_error_rate: semanticMaxMajorErrorRate,
      max_hallucination_rate: semanticMaxHallucinationRate,
      fail_on_stale: semanticFailOnStale,
    },
    observed: {
      total_judgements: judgements.length,
      fresh_judgements: freshCount,
      stale_judgements: staleCount,
      stale_missing_or_deleted: staleMissingOrDeleted,
      stale_fingerprint_mismatch: staleFingerprintMismatch,
      mean_overall_score_0_100: meanOverall,
      major_error_rate: majorErrorRate,
      hallucination_rate: hallucinationRate,
    },
    failures,
    passed: failures.length === 0,
  }
  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf-8")
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`⚠️  Could not write semantic gate report: ${reportPath} (${msg})`)
  }

  if (failures.length > 0) {
    console.error(
      `❌ Semantic gate blocked ingest (batch_id=${batchId}). `
      + `fresh=${freshCount}, stale=${staleCount} (missing/deleted=${staleMissingOrDeleted}, fingerprint_mismatch=${staleFingerprintMismatch}), `
      + `mean=${meanOverall.toFixed(1)}, major_error_rate=${majorErrorRate.toFixed(3)}, hallucination_rate=${hallucinationRate.toFixed(3)}`
    )
    console.error(`   Report: ${reportPath}`)
    for (const failure of failures) {
      console.error(`   - ${failure}`)
    }
    console.error("   Run semantic_judge.py for this manifest scope and retry.")
    process.exit(1)
  }

  console.log(
    `✅ Semantic gate passed (batch_id=${batchId}): `
    + `fresh=${freshCount}, stale=${staleCount}, mean=${meanOverall.toFixed(1)}, `
    + `major_error_rate=${majorErrorRate.toFixed(3)}, hallucination_rate=${hallucinationRate.toFixed(3)}`
  )
  console.log(`Semantic gate report: ${reportPath}`)
}

function checkTaxonomyGate(
  manifestPath: string,
  source: string | null,
  expectedVideoIds: Set<string>,
  overrideManifestVideoCount?: number
): TaxonomyGateResult {
  const emptyResult: TaxonomyGateResult = {
    blockedVideoIds: new Set<string>(),
    blockedReasons: new Map<string, string>(),
    reportPath: "",
    status: "PASS",
    reason: "",
  }
  if (expectedVideoIds.size <= 0) {
    return emptyResult
  }

  const expectedManifestVideos = overrideManifestVideoCount ?? expectedVideoIds.size
  const stem = path.basename(manifestPath, path.extname(manifestPath))
  const manifestBase = path.basename(manifestPath)
  const expectedSource = source
    ? `manifest:${manifestBase}|source:${source}`
    : `manifest:${manifestBase}`
  const legacyExpectedSource = `manifest:${manifestBase}`
  const reportStem = source ? `${stem}.${source}` : stem
  let reportPath = path.join(
    process.cwd(),
    "data",
    "08.DET.taxonomy-validation",
    `${safeReportName(reportStem)}.report.json`
  )
  const legacyReportPath = path.join(
    process.cwd(),
    "data",
    "08.DET.taxonomy-validation",
    `${safeReportName(stem)}.report.json`
  )

  if (!fs.existsSync(reportPath)) {
    if (source && fs.existsSync(legacyReportPath)) {
      console.warn(
        `⚠️  Using legacy Stage 08 report path without source suffix: ${legacyReportPath}`
      )
      reportPath = legacyReportPath
    } else {
      console.error(`❌ Missing Stage 08 report: ${reportPath}`)
      console.error(`   Run: python3 scripts/training-data/08.DET.taxonomy-validation --manifest ${manifestPath}`)
      process.exit(1)
    }
  }

  let data: unknown
  try {
    data = JSON.parse(fs.readFileSync(reportPath, "utf-8"))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`❌ Could not read Stage 08 report: ${reportPath} (${msg})`)
    process.exit(1)
  }

  if (!isObject(data)) {
    console.error(`❌ Stage 08 report has invalid root shape: ${reportPath}`)
    process.exit(1)
  }

  if (data.stage !== "08.DET.taxonomy-validation") {
    console.error(`❌ Stage 08 report has unexpected stage=${String(data.stage)} (${reportPath})`)
    process.exit(1)
  }

  const reportSource = String(data.source ?? "")
  if (reportSource !== expectedSource) {
    if (!(source && reportSource === legacyExpectedSource)) {
      console.error(`❌ Stage 08 report source mismatch: expected '${expectedSource}', found '${reportSource}'`)
      console.error(`   Re-run: python3 scripts/training-data/08.DET.taxonomy-validation --manifest ${manifestPath}`)
      process.exit(1)
    }
  }

  const scope = isObject(data.scope) ? (data.scope as Record<string, unknown>) : null
  if (scope) {
    const scopeManifest = typeof scope.manifest === "string" ? path.basename(scope.manifest) : null
    if (scopeManifest && scopeManifest !== manifestBase) {
      console.error(
        `❌ Stage 08 report scope.manifest mismatch: expected '${manifestBase}', found '${scopeManifest}' (${reportPath})`
      )
      process.exit(1)
    }
    const scopeSource = typeof scope.source_filter === "string" ? scope.source_filter.trim() : ""
    if (source) {
      if (scopeSource && scopeSource !== source) {
        console.error(
          `❌ Stage 08 report scope.source_filter mismatch: expected '${source}', found '${scopeSource}' (${reportPath})`
        )
        process.exit(1)
      }
    } else if (scopeSource) {
      console.error(
        `❌ Stage 08 report is source-scoped ('${scopeSource}') but ingest is manifest-wide (${reportPath})`
      )
      process.exit(1)
    }
    const scopeManifestVideos = scope.manifest_videos
    if (typeof scopeManifestVideos === "number" && Number.isFinite(scopeManifestVideos) && scopeManifestVideos > 0) {
      if (scopeManifestVideos !== expectedManifestVideos) {
        console.error(
          `❌ Stage 08 report scope.manifest_videos mismatch: expected ${expectedManifestVideos}, got ${scopeManifestVideos} (${reportPath})`
        )
        process.exit(1)
      }
    }
  }

  const validation = data.validation
  if (!isObject(validation)) {
    console.error(`❌ Stage 08 report missing validation object (${reportPath})`)
    process.exit(1)
  }

  const status = validation.status
  const reason = validation.reason
  if (status !== "PASS" && status !== "WARNING" && status !== "FAIL") {
    console.error(`❌ Stage 08 report has invalid validation.status=${String(status)} (${reportPath})`)
    process.exit(1)
  }

  const details = data.details
  const manifestCoverage = isObject(details) ? details.manifest_coverage : undefined
  if (!isObject(manifestCoverage)) {
    console.error(`❌ Stage 08 report missing details.manifest_coverage (${reportPath})`)
    process.exit(1)
  }
  const manifestVideos = manifestCoverage.manifest_videos
  const matchedVideoIds = manifestCoverage.matched_video_ids
  const missingVideos = manifestCoverage.missing_videos
  const filesProcessed = isObject(details) ? details.files_processed : undefined
  const allowZeroFilesProcessed =
    typeof filesProcessed === "number"
    && Number.isFinite(filesProcessed)
    && filesProcessed === 0
    && status === "FAIL"
    && typeof missingVideos === "number"
    && Number.isFinite(missingVideos)
    && missingVideos === expectedManifestVideos
  if (
    typeof filesProcessed !== "number"
    || !Number.isFinite(filesProcessed)
    || filesProcessed < 0
    || (!allowZeroFilesProcessed && filesProcessed <= 0)
  ) {
    console.error(`❌ Stage 08 report has invalid details.files_processed=${String(filesProcessed)} (${reportPath})`)
    process.exit(1)
  }
  const filesUnreadable = isObject(details) ? details.files_unreadable : undefined
  if (typeof filesUnreadable !== "number" || !Number.isFinite(filesUnreadable) || filesUnreadable < 0) {
    console.error(`❌ Stage 08 report has invalid details.files_unreadable=${String(filesUnreadable)} (${reportPath})`)
    process.exit(1)
  }

  if (
    typeof manifestVideos !== "number"
    || !Number.isFinite(manifestVideos)
    || manifestVideos <= 0
    || manifestVideos !== expectedManifestVideos
    || typeof matchedVideoIds !== "number"
    || !Number.isFinite(matchedVideoIds)
    || matchedVideoIds < 0
    || typeof missingVideos !== "number"
    || !Number.isFinite(missingVideos)
    || missingVideos < 0
  ) {
    console.error(
      `❌ Stage 08 report manifest coverage mismatch `
      + `(report_manifest_videos=${String(manifestVideos)}, expected_manifest_videos=${String(expectedManifestVideos)}).`
    )
    process.exit(1)
  }

  const blockedReasons = new Map<string, string>()
  const addBlocked = (videoId: string, reasonCode: string) => {
    if (!isValidVideoId(videoId)) return
    if (!expectedVideoIds.has(videoId)) return
    if (!blockedReasons.has(videoId)) {
      blockedReasons.set(videoId, reasonCode)
    }
  }

  const missingVideoIdsRaw = manifestCoverage.missing_video_ids
  if (Array.isArray(missingVideoIdsRaw)) {
    for (const raw of missingVideoIdsRaw) {
      if (typeof raw !== "string") continue
      addBlocked(raw.trim(), "missing_stage07_enriched")
    }
  } else if (missingVideos > 0) {
    console.error(
      `❌ Stage 08 report missing details.manifest_coverage.missing_video_ids while missing_videos=${missingVideos} (${reportPath})`
    )
    process.exit(1)
  }

  const unreadableVideoIdsRaw = isObject(details) ? details.unreadable_video_ids : undefined
  if (Array.isArray(unreadableVideoIdsRaw)) {
    for (const raw of unreadableVideoIdsRaw) {
      if (typeof raw !== "string") continue
      addBlocked(raw.trim(), "unreadable_stage07_enriched")
    }
  } else if (filesUnreadable > 0) {
    console.error(
      `❌ Stage 08 report missing details.unreadable_video_ids while files_unreadable=${filesUnreadable} (${reportPath})`
    )
    process.exit(1)
  }

  const videoResultsRaw = validation.video_results
  let sawPerVideoResults = false
  if (Array.isArray(videoResultsRaw)) {
    sawPerVideoResults = true
    for (const row of videoResultsRaw) {
      if (!isObject(row)) continue
      const rowVid = typeof row.video_id === "string" ? row.video_id.trim() : ""
      if (!isValidVideoId(rowVid) || !expectedVideoIds.has(rowVid)) continue
      const rowStatus = typeof row.status === "string" ? row.status.trim().toUpperCase() : ""
      const rowReason = typeof row.reason === "string" ? row.reason.trim() : ""
      if (rowStatus === "FAIL") {
        addBlocked(rowVid, rowReason || "stage08_video_fail")
      }
    }
  }

  if (status === "FAIL" && !sawPerVideoResults && blockedReasons.size === 0) {
    console.error(`❌ Stage 08 taxonomy gate FAIL (${reportPath})`)
    if (typeof reason === "string" && reason.trim()) console.error(`   Reason: ${reason.trim()}`)
    console.error("   This report does not expose per-video failures; cannot quarantine safely.")
    process.exit(1)
  }

  if (blockedReasons.size > 0) {
    const blockedRows = Array.from(blockedReasons.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    const blockedLabels = blockedRows.map(([vid, why]) => `${vid}:${why || "taxonomy_fail"}`)
    const sample = blockedLabels.slice(0, 10).join(", ")
    const suffix = blockedLabels.length > 10 ? ", ..." : ""
    console.warn(
      `⚠️  Stage 08 quarantine: ${blockedLabels.length} video(s) blocked by taxonomy gate `
      + `(e.g. ${sample}${suffix}).`
    )
    console.warn(`   Report: ${reportPath}`)
    for (const [vid, why] of blockedRows.slice(0, 12)) {
      console.warn(`   - ${vid} reason=${why || "taxonomy_fail"} report=${reportPath}`)
    }
    if (blockedRows.length > 12) {
      console.warn(`   ... (${blockedRows.length - 12} more blocked video(s))`)
    }
  }

  if (status === "WARNING") {
    console.warn(`⚠️  Stage 08 taxonomy gate WARNING (${reportPath})`)
    if (typeof reason === "string" && reason.trim()) console.warn(`   Reason: ${reason.trim()}`)
  } else if (status === "PASS") {
    console.log(`✅ Stage 08 taxonomy gate PASS (${reportPath})`)
  } else if (status === "FAIL") {
    console.warn(
      `⚠️  Stage 08 taxonomy gate FAIL at manifest level, but per-video quarantine was derived from report details.`
    )
  }

  return {
    blockedVideoIds: new Set<string>(blockedReasons.keys()),
    blockedReasons,
    reportPath,
    status,
    reason: typeof reason === "string" ? reason.trim() : "",
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
  const rawArgs = process.argv.slice(2)
  if (rawArgs.includes("-h") || rawArgs.includes("--help")) {
    printUsage()
    return
  }
  validateKnownArgs(rawArgs)
  const args = parseArgs(rawArgs)

  if (args.qualityGate) {
    if (!args.manifest) {
      console.error("❌ --quality-gate requires --manifest")
      process.exit(1)
    }
    if (args.semanticMinFresh === null) {
      args.semanticMinFresh = 5
    }
    if (args.semanticMinMeanOverall === null) {
      args.semanticMinMeanOverall = 75
    }
    if (args.semanticMaxMajorErrorRate === null) {
      args.semanticMaxMajorErrorRate = 0.2
    }
    if (args.semanticMaxHallucinationRate === null) {
      args.semanticMaxHallucinationRate = 0.1
    }
    args.semanticFailOnStale = true
  }

  if (args.semanticMinFresh !== null && (!Number.isInteger(args.semanticMinFresh) || args.semanticMinFresh < 0)) {
    console.error("❌ --semantic-min-fresh must be an integer >= 0")
    process.exit(1)
  }
  if (
    args.semanticMinMeanOverall !== null
    && (!Number.isFinite(args.semanticMinMeanOverall) || args.semanticMinMeanOverall < 0 || args.semanticMinMeanOverall > 100)
  ) {
    console.error("❌ --semantic-min-mean-overall must be in [0, 100]")
    process.exit(1)
  }
  if (
    args.semanticMaxMajorErrorRate !== null
    && (!Number.isFinite(args.semanticMaxMajorErrorRate) || args.semanticMaxMajorErrorRate < 0 || args.semanticMaxMajorErrorRate > 1)
  ) {
    console.error("❌ --semantic-max-major-error-rate must be in [0, 1]")
    process.exit(1)
  }
  if (
    args.semanticMaxHallucinationRate !== null
    && (!Number.isFinite(args.semanticMaxHallucinationRate) || args.semanticMaxHallucinationRate < 0 || args.semanticMaxHallucinationRate > 1)
  ) {
    console.error("❌ --semantic-max-hallucination-rate must be in [0, 1]")
    process.exit(1)
  }
  if (semanticGateRequested(args) && !args.manifest) {
    console.error("❌ Semantic gate options require --manifest")
    process.exit(1)
  }

  loadEnvFile(path.join(process.cwd(), ".env.local"))

  const chunksDir = path.join(process.cwd(), "data", "09.EXT.chunks")
  const statePath = path.join(process.cwd(), "data", ".ingest_state.json")
  const runStartedAt = new Date().toISOString()

  const state = await loadState(statePath)

  let manifestAllowList: Map<string, Set<string>> | null = null
  let eligibleManifestVideoIds: Set<string> | null = null
  let expectedManifestVideos = 0
  let manifestScopeVideoIds: Set<string> | null = null
  let postTaxonomyVideoIds: Set<string> | null = null
  let postReadinessVideoIds: Set<string> | null = null
  let manifestSourceByVideo: Map<string, string> | null = null
  let taxonomyGateResult: TaxonomyGateResult | null = null
  let readinessGateResult: ReadinessGateResult | null = null
  let taxonomyGateExecuted = false
  let readinessGateExecuted = false
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

    if (args.source) {
      expectedManifestVideos = manifestAllowList.get(args.source)?.size ?? 0
      if (expectedManifestVideos <= 0) {
        console.error(`❌ Manifest has no entries for source '${args.source}'`)
        process.exit(1)
      }
    } else {
      for (const ids of manifestAllowList.values()) expectedManifestVideos += ids.size
      if (expectedManifestVideos <= 0) {
        console.error(`❌ Manifest had no valid video IDs: ${args.manifest}`)
        process.exit(1)
      }
    }

    let expectedVideoIds = new Set<string>()
    const expectedSourceByVideo = new Map<string, string>()
    if (args.source) {
      for (const vid of manifestAllowList.get(args.source) ?? []) {
        expectedVideoIds.add(vid)
        expectedSourceByVideo.set(vid, args.source)
      }
    } else {
      for (const [src, ids] of manifestAllowList.entries()) {
        for (const vid of ids) {
          expectedVideoIds.add(vid)
          if (!expectedSourceByVideo.has(vid)) {
            expectedSourceByVideo.set(vid, src)
          }
        }
      }
    }
    manifestScopeVideoIds = new Set(expectedVideoIds)
    manifestSourceByVideo = new Map(expectedSourceByVideo)
    postTaxonomyVideoIds = new Set(expectedVideoIds)
    postReadinessVideoIds = new Set(expectedVideoIds)

    // Exclude upstream-quarantined videos
    if (args.quarantineFile) {
      try {
        const qRaw = fs.readFileSync(args.quarantineFile, "utf-8")
        const qData = JSON.parse(qRaw)
        const qIds: string[] = Array.isArray(qData?.quarantined_video_ids) ? qData.quarantined_video_ids : []
        if (qIds.length > 0) {
          const before = expectedVideoIds.size
          for (const qid of qIds) {
            expectedVideoIds.delete(qid)
          }
          const removed = before - expectedVideoIds.size
          if (removed > 0) {
            console.log(`🔒 Quarantine file: excluded ${removed} video(s) from ingest`)
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`⚠️  Could not read quarantine file: ${args.quarantineFile} (${msg})`)
      }
    }

    if (!args.skipTaxonomyGate) {
      taxonomyGateExecuted = true
      taxonomyGateResult = checkTaxonomyGate(args.manifest, args.source, expectedVideoIds, expectedManifestVideos)
      if (taxonomyGateResult.blockedVideoIds.size > 0) {
        const before = expectedVideoIds.size
        const filtered = new Set<string>()
        for (const vid of expectedVideoIds) {
          if (!taxonomyGateResult.blockedVideoIds.has(vid)) {
            filtered.add(vid)
          }
        }
        expectedVideoIds = filtered
        console.warn(
          `⚠️  Taxonomy quarantine applied: ${taxonomyGateResult.blockedVideoIds.size} blocked, `
          + `${expectedVideoIds.size}/${before} remain ingest-eligible.`
        )
      }
      postTaxonomyVideoIds = new Set(expectedVideoIds)
    }

    if (expectedVideoIds.size > 0 && !args.skipReadinessGate) {
      readinessGateExecuted = true
      readinessGateResult = checkReadinessGate(args.manifest, expectedVideoIds, args.source, args.readinessSummary)
      expectedVideoIds = readinessGateResult.eligibleVideoIds
      postReadinessVideoIds = new Set(expectedVideoIds)
    }

    if (expectedVideoIds.size > 0 && semanticGateRequested(args)) {
      const semanticBatchId = (args.semanticBatchId && args.semanticBatchId.trim())
        ? args.semanticBatchId.trim()
        : defaultSemanticBatchId(args.manifest)
      checkSemanticGate(args.manifest, args.source, expectedVideoIds, expectedSourceByVideo, {
        batchId: semanticBatchId,
        semanticReportOut: args.semanticReportOut,
        semanticMinFresh: args.semanticMinFresh,
        semanticMinMeanOverall: args.semanticMinMeanOverall,
        semanticMaxMajorErrorRate: args.semanticMaxMajorErrorRate,
        semanticMaxHallucinationRate: args.semanticMaxHallucinationRate,
        semanticFailOnStale: args.semanticFailOnStale,
      })
    }
    eligibleManifestVideoIds = new Set(expectedVideoIds)
  }

  let quarantineReportPath: string | null = null
  if (
    args.manifest
    && manifestScopeVideoIds
    && postTaxonomyVideoIds
    && postReadinessVideoIds
    && manifestSourceByVideo
  ) {
    quarantineReportPath = await writeManifestQuarantineReport({
      manifestPath: args.manifest,
      source: args.source,
      generatedAt: runStartedAt,
      overridePath: args.quarantineReportOut,
      initialVideoIds: manifestScopeVideoIds,
      postTaxonomyVideoIds,
      postReadinessVideoIds,
      sourceByVideo: manifestSourceByVideo,
      taxonomyGate: taxonomyGateResult,
      readinessGate: readinessGateResult,
      taxonomyGateEnabled: taxonomyGateExecuted,
      readinessGateEnabled: readinessGateExecuted,
    })
    console.log(`Quarantine report: ${quarantineReportPath}`)

    if (eligibleManifestVideoIds && eligibleManifestVideoIds.size <= 0) {
      if (!args.skipTaxonomyGate && postTaxonomyVideoIds.size <= 0) {
        console.error("❌ All manifest videos were blocked by Stage 08 taxonomy quarantine.")
      } else {
        console.error("❌ All manifest videos were blocked by readiness policy.")
      }
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
        if (eligibleManifestVideoIds && !eligibleManifestVideoIds.has(vid)) {
          continue
        }
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
      process.exit(1)
    }
    if (missingFromManifest > 0) {
      console.error(`❌ Missing expected chunk files for manifest scope: ${missingFromManifest}`)
      console.error(`   Run Stage 09 (chunk-embed) to produce all required .chunks.json files before ingest.`)
      process.exit(1)
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
  let mtimeForced = 0
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
      // Safety net: re-ingest if chunks file is newer than last ingest
      if (prev?.ingestedAt) {
        try {
          const chunksStat = await fsp.stat(filePath)
          const ingestedAtMs = new Date(prev.ingestedAt).getTime()
          if (chunksStat.mtimeMs > ingestedAtMs) {
            mtimeForced++
            toIngest.push({ filePath, sourceKey, chunksData, fileHash })
            continue
          }
        } catch {
          // stat failed — unusual, fall through to unchanged
        }
      }
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
  if (mtimeForced > 0) console.log(`Stale:        ${mtimeForced} file(s) with chunks newer than last ingest (auto-forced)`)
  console.log(`State file:   ${statePath}`)
  console.log(`Primary lane: chunk_confidence_score >= ${args.primaryConfidenceThreshold.toFixed(2)}`)
  console.log(`Review lane:  ${args.ingestReviewLane ? "ingest (#review source suffix)" : "skip"}`)

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

    const reviewSourceKey = `${sourceKey}#review`
    const rowsPrimary: Array<{
      content: string
      source: string
      embedding: number[]
      metadata: Record<string, unknown>
    }> = []
    const rowsReview: Array<{
      content: string
      source: string
      embedding: number[]
      metadata: Record<string, unknown>
    }> = []
    let missingConfidenceMetadata = 0

    for (const chunk of chunks) {
      const metadata: Record<string, unknown> = {
        channel,
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
      if (typeof chunk.metadata.worstArtifactSeverity === "string") {
        metadata.worstArtifactSeverity = chunk.metadata.worstArtifactSeverity
      }
      // Resolve confidence score: prefer canonical name, fall back to legacy names
      const chunkConfidenceScore =
        (typeof chunk.metadata.chunk_confidence_score === "number" && Number.isFinite(chunk.metadata.chunk_confidence_score))
          ? chunk.metadata.chunk_confidence_score
          : (typeof chunk.metadata.chunkConfidenceScore === "number" && Number.isFinite(chunk.metadata.chunkConfidenceScore))
          ? chunk.metadata.chunkConfidenceScore
          : (typeof chunk.metadata.chunkConfidence === "number" && Number.isFinite(chunk.metadata.chunkConfidence))
          ? chunk.metadata.chunkConfidence
          : null
      const hasConfidenceScore = typeof chunkConfidenceScore === "number"
      if (!hasConfidenceScore) {
        missingConfidenceMetadata += 1
      } else {
        metadata.chunk_confidence_score = chunkConfidenceScore
      }
      if (typeof chunk.metadata.chunkConfidenceVersion === "number") {
        metadata.chunkConfidenceVersion = chunk.metadata.chunkConfidenceVersion
      }
      if (chunk.metadata.problematicReason && chunk.metadata.problematicReason.length > 0) {
        metadata.problematicReason = chunk.metadata.problematicReason
      }
      // Read canonical or legacy name, write only canonical
      const damagedSegmentIds = Array.isArray(chunk.metadata.damaged_segment_ids)
        ? chunk.metadata.damaged_segment_ids.filter((x): x is number => typeof x === "number")
        : Array.isArray(chunk.metadata.damagedSegmentIds)
        ? chunk.metadata.damagedSegmentIds.filter((x): x is number => typeof x === "number")
        : []
      if (damagedSegmentIds.length > 0) {
        metadata.damaged_segment_ids = damagedSegmentIds
      }
      const containsRepairedText =
        chunk.metadata.contains_repaired_text === true || chunk.metadata.containsRepairedText === true
      if (containsRepairedText) {
        metadata.contains_repaired_text = true
      }
      // D14b: cross-reference metadata pass-through
      if (typeof chunk.metadata.blockIndex === "number") {
        metadata.blockIndex = chunk.metadata.blockIndex
      }
      if (chunk.metadata.relatedConversationId !== undefined) {
        metadata.relatedConversationId = chunk.metadata.relatedConversationId
      }
      if (Array.isArray(chunk.metadata.relatedCommentaryBlockIndices) && chunk.metadata.relatedCommentaryBlockIndices.length > 0) {
        metadata.relatedCommentaryBlockIndices = chunk.metadata.relatedCommentaryBlockIndices
      }
      if (typeof chunk.metadata.description === "string" && chunk.metadata.description) {
        metadata.description = chunk.metadata.description
      }
      if (typeof chunk.metadata.section_index === "number") {
        metadata.section_index = chunk.metadata.section_index
      }
      if (chunk.metadata.isSummary === true) {
        metadata.isSummary = true
      }

      const lane: "primary" | "review" =
        hasConfidenceScore && (chunkConfidenceScore as number) >= args.primaryConfidenceThreshold
          ? "primary"
          : "review"
      metadata.ingest_lane = lane

      const row = {
        content: chunk.content,
        source: lane === "primary" ? sourceKey : reviewSourceKey,
        embedding: chunk.embedding,
        metadata,
      }

      if (lane === "primary") {
        rowsPrimary.push(row)
      } else {
        rowsReview.push(row)
      }
    }

    const rows = args.ingestReviewLane
      ? [...rowsPrimary, ...rowsReview]
      : rowsPrimary

    console.log(
      `   📊 Lane split: primary=${rowsPrimary.length}, review=${rowsReview.length}, `
      + `missing_confidence=${missingConfidenceMetadata}`
    )
    if (!args.ingestReviewLane && rowsReview.length > 0) {
      console.log(`   ⏭️  Skipping ${rowsReview.length} review-lane chunk(s)`)
    }

    console.log(`   💾 Replacing embeddings for source: ${sourceKey}`)
    await deleteEmbeddingsBySource(sourceKey)
    if (args.ingestReviewLane) {
      console.log(`   💾 Replacing embeddings for review lane source: ${reviewSourceKey}`)
      await deleteEmbeddingsBySource(reviewSourceKey)
    }
    if (rows.length > 0) {
      await storeEmbeddings(rows)
    } else {
      console.log("   ℹ️  No rows selected for ingest after lane gating")
    }

    state.sources[sourceKey] = {
      chunksHash: fileHash,
      ingestedCount: rows.length,
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
