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
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --skip-readiness-gate
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --semantic-min-fresh 5 --semantic-min-mean-overall 75 --semantic-max-major-error-rate 0.20 --semantic-fail-on-stale
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --semantic-min-fresh 5 --semantic-report-out data/validation/semantic_gate/CANARY.1.custom.report.json
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --quality-gate
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
  qualityGate: boolean
  source: string | null
  manifest: string | null
  skipTaxonomyGate: boolean
  skipReadinessGate: boolean
  readinessSummary: string | null
  semanticBatchId: string | null
  semanticReportOut: string | null
  semanticMinFresh: number | null
  semanticMinMeanOverall: number | null
  semanticMaxMajorErrorRate: number | null
  semanticMaxHallucinationRate: number | null
  semanticFailOnStale: boolean
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
  let readinessSummary: string | null = null
  let semanticBatchId: string | null = null
  let semanticReportOut: string | null = null
  let semanticMinFresh: number | null = null
  let semanticMinMeanOverall: number | null = null
  let semanticMaxMajorErrorRate: number | null = null
  let semanticMaxHallucinationRate: number | null = null

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
    semanticBatchId,
    semanticReportOut,
    semanticMinFresh,
    semanticMinMeanOverall,
    semanticMaxMajorErrorRate,
    semanticMaxHallucinationRate,
    semanticFailOnStale: flags.has("--semantic-fail-on-stale"),
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
  const idx = parts.indexOf("07.content")
  if (idx >= 0 && idx + 1 < parts.length) {
    const src = parts[idx + 1]
    if (src && src !== "07.content") {
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
    ? path.join(process.cwd(), "data", "07.content", source)
    : path.join(process.cwd(), "data", "07.content")
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

function semanticGateRequested(args: Args): boolean {
  return (
    args.semanticMinFresh !== null
    || args.semanticMinMeanOverall !== null
    || args.semanticMaxMajorErrorRate !== null
    || args.semanticMaxHallucinationRate !== null
    || args.semanticFailOnStale
  )
}

function checkReadinessGate(
  manifestPath: string,
  expectedVideoIds: Set<string>,
  source: string | null,
  readinessSummaryOverride: string | null
): void {
  if (expectedVideoIds.size <= 0) {
    return
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
      if (scopeVideoCount > 0 && scopeVideoCount !== expectedVideoIds.size) {
        console.error(
          `❌ Readiness summary scope.video_count mismatch: expected ${expectedVideoIds.size}, got ${scopeVideoCount} (${summaryPath})`
        )
        process.exit(1)
      }
    }
  }

  const byVideo = new Map<string, { status: string; readyForIngest: boolean; reason: string }>()
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
    const status = String(item.status || "")
    if (status !== "READY" && status !== "REVIEW" && status !== "BLOCKED") {
      console.error(`❌ Readiness summary contains invalid status='${status}' for video_id=${rawVid} (${summaryPath})`)
      process.exit(1)
    }
    const readyRaw = item.ready_for_ingest
    const readyForIngest = typeof readyRaw === "boolean"
      ? readyRaw
      : (allowIngestStatuses ? allowIngestStatuses.has(status) : status !== "BLOCKED")
    const reason = typeof item.reason_code === "string" ? item.reason_code : ""
    byVideo.set(rawVid, { status, readyForIngest, reason })
  }

  const missing: string[] = []
  const blocked: string[] = []
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
      const reasonSuffix = item.reason ? `:${item.reason}` : ""
      blocked.push(`${vid}:${item.status}${reasonSuffix}`)
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
    const sample = blocked.slice(0, 8).join(", ")
    const suffix = blocked.length > 8 ? ", ..." : ""
    const policyLabel = allowIngestStatuses
      ? `[${Array.from(allowIngestStatuses).sort((a, b) => a.localeCompare(b)).join(", ")}]`
      : "[READY, REVIEW] (default)"
    const breakdown = `READY=${blockedByStatus.READY}, REVIEW=${blockedByStatus.REVIEW}, BLOCKED=${blockedByStatus.BLOCKED}`
    console.error(
      `❌ Readiness gate blocked ingest: ${blocked.length} video(s) are not ingest-ready `
      + `under allow_ingest_statuses=${policyLabel} (${breakdown}; e.g. ${sample}${suffix}).`
    )
    process.exit(1)
  }

  const reviewAllowed = allowIngestStatuses ? allowIngestStatuses.has("REVIEW") : true
  if (reviewCount > 0 && reviewAllowed) {
    console.warn(`⚠️  Readiness gate: ${reviewCount} video(s) are REVIEW (ingest allowed).`)
  }
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

function checkTaxonomyGate(manifestPath: string, expectedManifestVideos: number): void {
  const stem = path.basename(manifestPath, path.extname(manifestPath))
  const expectedSource = `manifest:${path.basename(manifestPath)}`
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

  if (!isObject(data)) {
    console.error(`❌ Stage 08 report has invalid root shape: ${reportPath}`)
    process.exit(1)
  }

  if (data.stage !== "08.taxonomy-validation") {
    console.error(`❌ Stage 08 report has unexpected stage=${String(data.stage)} (${reportPath})`)
    process.exit(1)
  }

  if (data.source !== expectedSource) {
    console.error(`❌ Stage 08 report source mismatch: expected '${expectedSource}', found '${String(data.source)}'`)
    console.error(`   Re-run: python3 scripts/training-data/08.taxonomy-validation --manifest ${manifestPath}`)
    process.exit(1)
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
  const filesProcessed = isObject(details) ? details.files_processed : undefined
  if (typeof filesProcessed !== "number" || !Number.isFinite(filesProcessed) || filesProcessed <= 0) {
    console.error(`❌ Stage 08 report has invalid details.files_processed=${String(filesProcessed)} (${reportPath})`)
    process.exit(1)
  }
  const filesUnreadable = isObject(details) ? details.files_unreadable : undefined
  if (typeof filesUnreadable !== "number" || !Number.isFinite(filesUnreadable) || filesUnreadable < 0) {
    console.error(`❌ Stage 08 report has invalid details.files_unreadable=${String(filesUnreadable)} (${reportPath})`)
    process.exit(1)
  }
  if (filesUnreadable > 0) {
    console.error(`❌ Stage 08 report indicates unreadable enriched files (${filesUnreadable}); refusing ingest.`)
    process.exit(1)
  }

  const manifestCoverage = isObject(details) ? details.manifest_coverage : undefined
  if (!isObject(manifestCoverage)) {
    console.error(`❌ Stage 08 report missing details.manifest_coverage (${reportPath})`)
    process.exit(1)
  }
  const manifestVideos = manifestCoverage.manifest_videos
  const matchedVideoIds = manifestCoverage.matched_video_ids
  const missingVideos = manifestCoverage.missing_videos
  if (
    typeof manifestVideos !== "number"
    || !Number.isFinite(manifestVideos)
    || manifestVideos <= 0
    || typeof expectedManifestVideos !== "number"
    || !Number.isFinite(expectedManifestVideos)
    || expectedManifestVideos <= 0
    || manifestVideos !== expectedManifestVideos
    || typeof matchedVideoIds !== "number"
    || !Number.isFinite(matchedVideoIds)
    || matchedVideoIds <= 0
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
  if (missingVideos > 0) {
    console.error(`❌ Stage 08 report indicates incomplete manifest coverage (missing_videos=${missingVideos}).`)
    console.error(`   Re-run: python3 scripts/training-data/08.taxonomy-validation --manifest ${manifestPath}`)
    process.exit(1)
  }

  if (status === "FAIL") {
    console.error(`❌ Stage 08 taxonomy gate FAIL (${reportPath})`)
    if (typeof reason === "string" && reason.trim()) console.error(`   Reason: ${reason.trim()}`)
    process.exit(1)
  }

  if (status === "WARNING") {
    console.warn(`⚠️  Stage 08 taxonomy gate WARNING (${reportPath})`)
    if (typeof reason === "string" && reason.trim()) console.warn(`   Reason: ${reason.trim()}`)
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

  const chunksDir = path.join(process.cwd(), "data", "09.chunks")
  const statePath = path.join(process.cwd(), "data", ".ingest_state.json")

  const state = await loadState(statePath)

  let manifestAllowList: Map<string, Set<string>> | null = null
  let expectedManifestVideos = 0
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

    const expectedVideoIds = new Set<string>()
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

    if (!args.skipTaxonomyGate) {
      checkTaxonomyGate(args.manifest, expectedManifestVideos)
    }
    if (!args.skipReadinessGate) {
      checkReadinessGate(args.manifest, expectedVideoIds, args.source, args.readinessSummary)
    }
    if (semanticGateRequested(args)) {
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
