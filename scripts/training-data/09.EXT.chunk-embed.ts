/**
 * scripts/training-data/09.EXT.chunk-embed.ts
 *
 * Chunk and Embed Stage (Stage 09)
 *
 * Transforms enriched content into embedded chunks, outputs to intermediate files.
 * This stage prepares data for ingestion but does NOT write to the database.
 *
 * Reads:
 *   - Enriched content files (from Stage 07):
 *       data/07.LLM.content/**\/*.enriched.json
 *
 * Writes:
 *   - Chunked and embedded files:
 *       data/09.EXT.chunks/<source>/<video>.chunks.json
 *   - State tracking:
 *       data/09.EXT.chunks/.chunk_state.json
 *
 * Use:
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/09.EXT.chunk-embed.ts
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/09.EXT.chunk-embed.ts --source daily_evolution
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/09.EXT.chunk-embed.ts --manifest docs/pipeline/batches/CANARY.1.txt
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/09.EXT.chunk-embed.ts --dry-run
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/09.EXT.chunk-embed.ts --full
 *
 * Environment:
 *   - Loads `.env.local` (if present)
 *   - Uses `src/qa/config` for chunk settings
 *   - Requires Ollama running for embeddings
 */

import fs from "fs"
import fsp from "fs/promises"
import path from "path"
import crypto from "crypto"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChunkStateV1 = {
  version: 1
  embeddingModel: string
  chunkSize: number
  chunkOverlap: number
  sources: Record<
    string,
    {
      enrichedHash: string
      chunkCount: number
      updatedAt: string
    }
  >
}

type Args = {
  force: boolean
  dryRun: boolean
  help: boolean
  source: string | null
  manifest: string | null
  quarantineFile: string | null
  minChunkConfidence: number
  maskTranscriptArtifacts: boolean
  maskAllTranscriptArtifacts: boolean
  maskLowQuality: boolean
}

type SegmentType = "INTERACTION" | "EXPLANATION" | "COMMENTARY" | "UNKNOWN"

type SpeakerLabel = {
  role?: string
  confidence?: number
}

type SpeakerLabels = Record<string, SpeakerLabel>

type ChunkMetadata = {
  segmentType: SegmentType
  isRealExample: boolean
  chunkIndex: number
  totalChunks: number
  conversationId?: number
  // Interaction-local indices for stitching full conversations at retrieval time.
  conversationChunkIndex?: number
  conversationChunkTotal?: number
  phase?: string
  techniques?: string[]
  topics?: string[]
  investmentLevel?: string
  // Parent references for sibling chunk retrieval
  videoId: string
  videoType: string
  channel: string
  confidence?: number
  // Phase confidence from Stage 07 LLM evaluation (0.0-1.0)
  phaseConfidence?: number
  // Approx timestamps from source segments (seconds).
  startSec?: number
  endSec?: number
  // Transcript quality signals (from Stage 07)
  asrLowQualitySegmentCount?: number
  asrTranscriptArtifactCount?: number
  asrTranscriptArtifactTypes?: string[]
  worstArtifactSeverity?: string
  // Deterministic heuristic score for retrieval downranking (0.0-1.0).
  chunk_confidence_score?: number
  chunkConfidenceVersion?: number
  // Quality flags - if present, chunk contains problematic segments
  problematicReason?: string[]
  damaged_segment_ids?: number[]
  contains_repaired_text?: boolean
  // Section/conversation summary from Stage 07 enrichment
  description?: string
  // Position within talking_head (1-based section index)
  section_index?: number
  // True for summary chunks (one per enrichment entry)
  isSummary?: boolean
  // Cross-reference fields (D14b: commentary ↔ conversation linking)
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
  sourceKey: string
  sourceFile: string
  sourceHash: string
  embeddingModel: string
  chunkSize: number
  chunkOverlap: number
  // Active confidence floor used to retain non-summary chunks in this run.
  minChunkConfidence: number
  // Number of chunks before confidence-floor filtering.
  preFilterChunkCount: number
  // Number of non-summary chunks dropped by confidence-floor filtering.
  droppedChunksBelowFloor: number
  videoType: string
  channel: string
  // YouTube video id (11 chars). Primary key for videos.
  videoId: string
  // Display-only title (may be derived from filename if missing upstream).
  videoTitle: string
  // Filename stem (includes [video_id] and audio variant suffixes); useful for tracing to Stage 07 artifacts.
  videoStem: string
  generatedAt: string
  chunks: Chunk[]
}

type InteractionJsonlRow = {
  id?: string
  conversation_id?: number
  source_video?: string
  start_time?: number
  end_time?: number
  content_summary?: string
  techniques?: string[]
  topics?: string[]
  turns?: Array<{
    speaker?: string
    text?: string
    // Stage 09 can intentionally omit masked lines from chunk text while still
    // counting the underlying segment for quality/confidence stats.
    masked?: boolean
    start?: number
    end?: number
    phase?: string
    semantic_tags?: {
      phase?: string
      techniques?: string[]
      topics?: string[]
      topic_values?: Record<string, string>
    }
  }>
}

type ContentSegment = {
  id?: number
  start?: number
  end?: number
  text?: string
  speaker_id?: string
  speaker_role?: string
  segment_type?: string
  conversation_id?: number
  is_teaser?: boolean
  teaser_of_conversation_id?: number | null
  segment_confidence?: {
    transcript?: number
    speaker?: number
    phase?: number
    overall?: number
  }
  confidence_tier?: "high" | "medium" | "low" | string
  contamination_sources?: string[]
  contains_repaired_text?: boolean
}

type ContentEnrichment = {
  type?: string
  conversation_id?: number
  block_index?: number
  section_index?: number
  start_segment?: number
  end_segment?: number
  description?: string
  techniques_used?: unknown
  techniques_discussed?: unknown
  topics_discussed?: unknown
  turn_phases?: Array<{ segment?: number; phase?: string }>
  investment_level?: string
  // Phase confidence from Stage 07 LLM evaluation
  phase_confidence?: Record<string, number>
}

type EnrichedFile = {
  source?: string
  video_id?: string
  video_title?: string
  video_type?: { type?: string }
  metadata?: {
    source_file?: string
  }
  // Stage 07 transcript quality signals (global segment ids)
  low_quality_segments?: Array<{ segment?: number; reason?: string; repaired?: boolean }>
  transcript_artifacts?: Array<{
    type?: string
    segment_index?: number
    artifact_type?: string
    description?: string
    damage_severity?: string
  }>
  speaker_labels?: SpeakerLabels
  segments?: ContentSegment[]
  enrichments?: ContentEnrichment[]
}

type InternalChunk = {
  content: string
  type: SegmentType
  chunkIndex: number
  totalChunks: number
  conversationId?: number
  conversationChunkIndex?: number
  conversationChunkTotal?: number
  phase?: string
  techniques?: string[]
  topics?: string[]
  investmentLevel?: string
  // Parent references (populated during processing)
  videoId?: string
  videoType?: string
  channel?: string
  // Phase confidence from Stage 07 (0.0-1.0)
  phaseConfidence?: number
  startSec?: number
  endSec?: number
  asrLowQualitySegmentCount?: number
  asrTranscriptArtifactCount?: number
  asrTranscriptArtifactTypes?: string[]
  worstArtifactSeverity?: string
  chunk_confidence_score?: number
  chunkConfidenceVersion?: number
  // Quality flags
  problematicReason?: string[]
  damaged_segment_ids?: number[]
  contains_repaired_text?: boolean
  description?: string
  section_index?: number
  isSummary?: boolean
  // Cross-reference fields (D14b)
  blockIndex?: number
  relatedConversationId?: number | null
  relatedCommentaryBlockIndices?: number[]
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const DEFAULT_MIN_CHUNK_CONFIDENCE = 0.3

function printUsage() {
  console.log("Usage:")
  console.log("  node --import tsx/esm scripts/training-data/09.EXT.chunk-embed.ts [options]")
  console.log("")
  console.log("Options:")
  console.log("  --source <name>                  Restrict processing to one source")
  console.log("  --manifest <path>                Restrict processing to manifest scope")
  console.log("  --quarantine-file <path>         Skip video IDs listed in quarantine JSON")
  console.log("  --min-chunk-confidence <0..1>    Confidence floor for non-summary chunk retention (default 0.30)")
  console.log("  --dry-run                        Build chunks without writing/embedding")
  console.log("  --full, --force                  Force re-chunk of all eligible files")
  console.log("  --mask-low-quality               Also mask low-quality segments")
  console.log("  --no-mask-transcript-artifacts   Keep ALL transcript artifacts in chunk text")
  console.log("  --mask-all-transcript-artifacts  Mask all artifacts (not just high-severity)")
  console.log("  -h, --help                       Show this help")
}

function parseArgs(argv: string[]): Args {
  const flags = new Set(argv)
  let source: string | null = null
  let manifest: string | null = null
  let quarantineFile: string | null = null
  let minChunkConfidence = DEFAULT_MIN_CHUNK_CONFIDENCE

  const parseBoundedConfidence = (raw: string): number => {
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`--min-chunk-confidence must be a number in [0,1], got: ${raw}`)
    }
    return value
  }

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
    if (arg === "--quarantine-file" && argv[i + 1]) {
      quarantineFile = argv[++i]
    }
    if (arg.startsWith("--quarantine-file=")) {
      quarantineFile = arg.split("=", 2)[1]
    }
    if (arg === "--min-chunk-confidence" && argv[i + 1]) {
      minChunkConfidence = parseBoundedConfidence(argv[++i])
    }
    if (arg.startsWith("--min-chunk-confidence=")) {
      minChunkConfidence = parseBoundedConfidence(arg.split("=", 2)[1])
    }
  }

  return {
    force: flags.has("--full") || flags.has("--force"),
    dryRun: flags.has("--dry-run"),
    help: flags.has("-h") || flags.has("--help"),
    source,
    manifest,
    quarantineFile,
    minChunkConfidence,
    // Default: mask only high-severity transcript artifacts (genuine nonsense/gibberish).
    // Low-severity artifacts (word repetition, minor grammar) are kept in chunk text.
    // --mask-all-transcript-artifacts restores old behavior of masking everything.
    maskTranscriptArtifacts: !flags.has("--no-mask-transcript-artifacts"),
    maskAllTranscriptArtifacts: flags.has("--mask-all-transcript-artifacts"),
    maskLowQuality: flags.has("--mask-low-quality"),
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

async function listJsonlFiles(rootDir: string, suffix: string): Promise<string[]> {
  const out: string[] = []

  async function walk(dir: string) {
    const dirents = await fsp.readdir(dir, { withFileTypes: true })
    for (const dirent of dirents) {
      const full = path.join(dir, dirent.name)
      if (dirent.isDirectory()) {
        await walk(full)
      } else if (dirent.isFile() && full.endsWith(suffix)) {
        out.push(full)
      }
    }
  }

  await walk(rootDir)
  return out.sort((a, b) => a.localeCompare(b))
}

function hashFile(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex")
}

async function loadState(
  statePath: string,
  defaults: Pick<ChunkStateV1, "embeddingModel" | "chunkSize" | "chunkOverlap">
): Promise<ChunkStateV1> {
  try {
    const raw = await fsp.readFile(statePath, "utf-8")
    const parsed = JSON.parse(raw)
    if (parsed?.version !== 1 || typeof parsed?.sources !== "object") {
      throw new Error("Unsupported chunk state format")
    }
    return parsed
  } catch {
    return {
      version: 1,
      embeddingModel: defaults.embeddingModel,
      chunkSize: defaults.chunkSize,
      chunkOverlap: defaults.chunkOverlap,
      sources: {},
    }
  }
}

async function saveState(statePath: string, state: ChunkStateV1): Promise<void> {
  await fsp.mkdir(path.dirname(statePath), { recursive: true })
  await fsp.writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf-8")
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Manifest filtering
// ---------------------------------------------------------------------------

const MANIFEST_VIDEO_ID_RE = /\[([A-Za-z0-9_-]{11})\]/
const QUARANTINE_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

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

function loadQuarantineVideoIds(quarantinePath: string): Set<string> {
  const abs = path.isAbsolute(quarantinePath)
    ? quarantinePath
    : path.join(process.cwd(), quarantinePath)
  const raw = fs.readFileSync(abs, "utf-8")
  const parsed: unknown = JSON.parse(raw)
  const ids = new Set<string>()

  const addId = (value: unknown) => {
    if (typeof value !== "string") return
    const v = value.trim()
    if (QUARANTINE_VIDEO_ID_RE.test(v)) ids.add(v)
  }

  if (Array.isArray(parsed)) {
    for (const item of parsed) addId(item)
    return ids
  }

  if (!parsed || typeof parsed !== "object") return ids

  const obj = parsed as Record<string, unknown>
  for (const key of ["quarantined_video_ids", "video_ids"]) {
    const arr = obj[key]
    if (!Array.isArray(arr)) continue
    for (const item of arr) addId(item)
  }

  const videos = obj.videos
  if (Array.isArray(videos)) {
    for (const item of videos) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        addId((item as Record<string, unknown>).video_id)
      } else {
        addId(item)
      }
    }
  }

  return ids
}

// ---------------------------------------------------------------------------
// Quality assessment
// ---------------------------------------------------------------------------

const PROBLEMATIC_SPEAKER_ROLES = ["collapsed", "mixed/unclear", "unknown"]
const MIN_SPEAKER_CONFIDENCE = 0.7

// Severity ordering for worst-wins comparison
const ARTIFACT_SEVERITY_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3 }

type AsrQualityIndex = {
  lowQualityIds: Set<number>
  transcriptArtifactIds: Set<number>
  transcriptArtifactTypesById: Map<number, Set<string>>
  transcriptArtifactSeveritiesById: Map<number, string>
}

function buildAsrQualityIndex(file: EnrichedFile): AsrQualityIndex {
  const lowQualityIds = new Set<number>()
  const transcriptArtifactIds = new Set<number>()
  const transcriptArtifactTypesById = new Map<number, Set<string>>()
  const transcriptArtifactSeveritiesById = new Map<number, string>()

  for (const lq of file.low_quality_segments ?? []) {
    if (lq?.repaired) continue
    const segId = lq?.segment
    if (typeof segId === "number" && Number.isFinite(segId)) lowQualityIds.add(segId)
  }

  for (const art of file.transcript_artifacts ?? []) {
    if (art?.repaired) continue
    const segId = art?.segment_index
    if (typeof segId !== "number" || !Number.isFinite(segId)) continue
    transcriptArtifactIds.add(segId)

    const t = typeof art?.artifact_type === "string" ? art.artifact_type.trim() : ""
    if (t) {
      const set = transcriptArtifactTypesById.get(segId) ?? new Set<string>()
      set.add(t)
      transcriptArtifactTypesById.set(segId, set)
    }

    // Track worst severity per segment (default "medium" if not stamped by Stage 07)
    const severity = typeof art?.damage_severity === "string" ? art.damage_severity : "medium"
    const existing = transcriptArtifactSeveritiesById.get(segId)
    if (!existing || (ARTIFACT_SEVERITY_ORDER[severity] ?? 2) > (ARTIFACT_SEVERITY_ORDER[existing] ?? 2)) {
      transcriptArtifactSeveritiesById.set(segId, severity)
    }
  }

  return { lowQualityIds, transcriptArtifactIds, transcriptArtifactTypesById, transcriptArtifactSeveritiesById }
}

function collectAsrStats(
  segments: ContentSegment[],
  asr: AsrQualityIndex | null
): {
  lowQualityCount: number
  transcriptArtifactCount: number
  transcriptArtifactTypes: string[]
  worstArtifactSeverity: string | null
} {
  if (!asr) return { lowQualityCount: 0, transcriptArtifactCount: 0, transcriptArtifactTypes: [], worstArtifactSeverity: null }

  let lowQualityCount = 0
  let transcriptArtifactCount = 0
  const types = new Set<string>()
  let worstSeverity: string | null = null

  for (const seg of segments) {
    const segId = seg.id
    if (typeof segId !== "number") continue
    if (asr.lowQualityIds.has(segId)) lowQualityCount++
    if (asr.transcriptArtifactIds.has(segId)) {
      transcriptArtifactCount++
      const segTypes = asr.transcriptArtifactTypesById.get(segId)
      if (segTypes) {
        for (const t of segTypes) types.add(t)
      }
      const segSeverity = asr.transcriptArtifactSeveritiesById.get(segId)
      if (segSeverity && (!worstSeverity || (ARTIFACT_SEVERITY_ORDER[segSeverity] ?? 2) > (ARTIFACT_SEVERITY_ORDER[worstSeverity] ?? 2))) {
        worstSeverity = segSeverity
      }
    }
  }

  return {
    lowQualityCount,
    transcriptArtifactCount,
    transcriptArtifactTypes: Array.from(types).sort((a, b) => a.localeCompare(b)),
    worstArtifactSeverity: worstSeverity,
  }
}

function collectConfidenceDamageStats(
  segments: ContentSegment[]
): {
  damaged_segment_ids: number[]
  contains_repaired_text: boolean
  lowTierCount: number
  mediumTierCount: number
} {
  const damaged_segment_ids: number[] = []
  let contains_repaired_text = false
  let lowTierCount = 0
  let mediumTierCount = 0

  for (const seg of segments) {
    const sid = seg.id
    const tier = (seg.confidence_tier ?? "").toLowerCase().trim()
    const hasContamination = Array.isArray(seg.contamination_sources) && seg.contamination_sources.length > 0
    if (typeof sid === "number" && (tier === "low" || hasContamination)) {
      damaged_segment_ids.push(sid)
    }
    if (tier === "low") {
      lowTierCount += 1
    } else if (tier === "medium") {
      mediumTierCount += 1
    }
    if (seg.contains_repaired_text === true) {
      contains_repaired_text = true
    }
  }

  return {
    damaged_segment_ids: [...new Set(damaged_segment_ids)].sort((a, b) => a - b),
    contains_repaired_text,
    lowTierCount,
    mediumTierCount,
  }
}

const CHUNK_CONFIDENCE_VERSION = 2  // v2: graduated artifact severity penalty (was flat x0.75)

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function computeChunkConfidence(chunk: InternalChunk): number {
  // Heuristic only: this is meant for downranking, not as a hard gate.
  let conf = 1.0

  // No type-based penalty: commentary is equally valuable for RAG retrieval

  if (typeof chunk.phaseConfidence === "number") {
    const pc = clamp01(chunk.phaseConfidence)
    conf *= Math.max(0.3, pc)
  }

  const probs = chunk.problematicReason ?? []
  if (probs.some((r) => r.startsWith("speaker_role:"))) conf *= 0.85
  if (probs.some((r) => r.startsWith("low_speaker_conf:"))) conf *= 0.9
  if (probs.some((r) => r === "confidence_tier:low")) conf *= 0.70
  if (probs.some((r) => r === "confidence_tier:medium")) conf *= 0.90
  if (probs.some((r) => r === "contamination_sources_present")) conf *= 0.82

  // Graduated artifact penalty based on worst severity in chunk
  const artSeverity = chunk.worstArtifactSeverity
  if (artSeverity === "high") conf *= 0.70
  else if (artSeverity === "medium") conf *= 0.85
  else if (artSeverity === "low") conf *= 0.97

  if ((chunk.asrLowQualitySegmentCount ?? 0) > 0) conf *= 0.85
  if ((chunk.damaged_segment_ids ?? []).length > 0) conf *= 0.82

  return clamp01(conf)
}

/**
 * Assess segments for quality problems.
 * Returns array of reason strings if problematic, empty array if clean.
 */
function assessSegmentsForProblems(
  segments: ContentSegment[],
  speakerLabels: SpeakerLabels
): string[] {
  const reasons: string[] = []

  for (const seg of segments) {
    const role = (seg.speaker_role ?? "").toLowerCase().trim()

    // Flag: problematic speaker role
    if (PROBLEMATIC_SPEAKER_ROLES.includes(role)) {
      reasons.push(`speaker_role:${role}`)
    }

    // Flag: low speaker confidence
    const speakerId = seg.speaker_id
    if (speakerId) {
      const speakerConf = speakerLabels[speakerId]?.confidence ?? 1.0
      if (speakerConf < MIN_SPEAKER_CONFIDENCE) {
        reasons.push(`low_speaker_conf:${speakerId}:${speakerConf.toFixed(2)}`)
      }
    }
  }

  // Dedupe and return
  return [...new Set(reasons)]
}

// ---------------------------------------------------------------------------
// Metadata prefix for embeddings
// ---------------------------------------------------------------------------

/**
 * Build a metadata prefix for semantic matching.
 * Format: [PHASE: pre_hook] [TECH: cold_read, qualification] [TOPIC: career, ambition]
 *
 * Only includes non-empty fields. This prefix is prepended to chunk content
 * before embedding so that queries like "cold reading examples" match better.
 */
function buildMetadataPrefix(
  phase?: string,
  techniques?: string[],
  topics?: string[],
  description?: string,
  videoType?: string
): string {
  const parts: string[] = []

  if (videoType) {
    parts.push(`[TYPE: ${videoType}]`)
  }

  if (phase && phase !== "unknown") {
    parts.push(`[PHASE: ${phase}]`)
  }

  if (techniques && techniques.length > 0) {
    parts.push(`[TECH: ${techniques.join(", ")}]`)
  }

  if (topics && topics.length > 0) {
    parts.push(`[TOPIC: ${topics.join(", ")}]`)
  }

  if (description) {
    parts.push(`[DESC: ${description}]`)
  }

  return parts.length > 0 ? parts.join(" ") + "\n" : ""
}

/**
 * Build a summary chunk from an enrichment entry's description.
 * Returns null if the description is missing or too short to be useful.
 */
function buildSummaryChunk(
  enrichment: ContentEnrichment,
  type: SegmentType,
  opts: { conversationId?: number; blockIndex?: number; section_index?: number }
): InternalChunk | null {
  const desc = enrichment.description
  if (typeof desc !== "string" || desc.trim().length < 10) return null

  const techniques = extractTechniqueNames(
    enrichment.techniques_used ?? enrichment.techniques_discussed
  )
  const topics = extractStringArray(enrichment.topics_discussed)

  return {
    content: desc.trim(),
    type,
    chunkIndex: 0,
    totalChunks: 0,
    techniques,
    topics,
    conversationId: opts.conversationId,
    section_index: opts.section_index,
    blockIndex: opts.blockIndex,
    description: desc.trim(),
    isSummary: true,
    chunk_confidence_score: 1.0,
    chunkConfidenceVersion: CHUNK_CONFIDENCE_VERSION,
  }
}

// ---------------------------------------------------------------------------
// Chunking helpers
// ---------------------------------------------------------------------------

function mapSpeakerLabel(raw?: string): string {
  const s = (raw ?? "").toLowerCase().trim()
  if (s === "coach") return "Coach"
  if (s === "student") return "Student"
  if (s === "target") return "Girl"
  if (s === "voiceover") return "Voiceover"
  if (s === "ambiguous") return "Ambiguous"
  return "Unknown"
}

/**
 * Phase-based chunking: group turns by phase, creating one chunk per phase.
 * Also assesses segment quality and attaches problematicReason if issues found.
 */
function chunkInteractionByPhase(
  row: InteractionJsonlRow,
  maxChunkSize: number,
  segments: ContentSegment[],
  speakerLabels: SpeakerLabels,
  asrIndex: AsrQualityIndex | null
): InternalChunk[] {
  const chunks: InternalChunk[] = []
  const turns = row.turns ?? []

  if (turns.length === 0) return chunks

  type PhaseGroup = {
    phase: string
    turns: typeof turns
    turnIndices: number[] // Track which segment indices are in this group
    techniques: string[]
    topics: string[]
  }

  const phaseGroups: PhaseGroup[] = []
  let currentGroup: PhaseGroup | null = null

  for (let turnIdx = 0; turnIdx < turns.length; turnIdx++) {
    const turn = turns[turnIdx]
    const phase = turn.phase || turn.semantic_tags?.phase || "unknown"

    if (!currentGroup || currentGroup.phase !== phase) {
      if (currentGroup) {
        phaseGroups.push(currentGroup)
      }
      currentGroup = {
        phase,
        turns: [],
        turnIndices: [],
        techniques: [...new Set(row.techniques ?? [])],
        topics: [...new Set(row.topics ?? [])],
      }
    }

    currentGroup.turns.push(turn)
    currentGroup.turnIndices.push(turnIdx)

    const tags = turn.semantic_tags
    if (tags?.techniques) {
      currentGroup.techniques.push(...tags.techniques)
    }
    if (tags?.topics) {
      currentGroup.topics.push(...tags.topics)
    }
  }

  if (currentGroup) {
    phaseGroups.push(currentGroup)
  }

  for (const group of phaseGroups) {
    let content = ""
    let chunkTurnIndices: number[] = []

    for (let i = 0; i < group.turns.length; i++) {
      const turn = group.turns[i]
      const turnIdx = group.turnIndices[i]
      const speaker = mapSpeakerLabel(turn.speaker)
      const text = (turn.text ?? "").trim()
      const masked = Boolean(turn.masked)

      if (text) {
        const line = `${speaker}: ${text}`
        if (content.length + line.length + 1 > maxChunkSize && content.length > 0) {
          // Assess only the segments in this specific chunk
          const chunkSegments = chunkTurnIndices
            .map((idx) => segments[idx])
            .filter((s): s is ContentSegment => s !== undefined)
          const chunkProblems = assessSegmentsForProblems(chunkSegments, speakerLabels)
          const asrStats = collectAsrStats(chunkSegments, asrIndex)
          const confStats = collectConfidenceDamageStats(chunkSegments)

          if (asrStats.lowQualityCount > 0) {
            chunkProblems.push("asr_low_quality")
          }
          if (asrStats.transcriptArtifactTypes.length > 0) {
            for (const t of asrStats.transcriptArtifactTypes) {
              chunkProblems.push(`asr_transcript_artifact:${t}`)
            }
          }
          if (confStats.lowTierCount > 0) {
            chunkProblems.push("confidence_tier:low")
          } else if (confStats.mediumTierCount > 0) {
            chunkProblems.push("confidence_tier:medium")
          }
          if (confStats.damaged_segment_ids.length > 0) {
            chunkProblems.push("contamination_sources_present")
          }

          const startSec = Math.min(
            ...chunkSegments.map((s) => (typeof s.start === "number" ? s.start : Number.POSITIVE_INFINITY))
          )
          const endSec = Math.max(
            ...chunkSegments.map((s) => (typeof s.end === "number" ? s.end : Number.NEGATIVE_INFINITY))
          )

          chunks.push({
            content: content.trim(),
            type: "INTERACTION",
            chunkIndex: chunks.length,
            totalChunks: 0,
            conversationId: row.conversation_id,
            phase: group.phase,
            techniques: Array.from(new Set(group.techniques)),
            topics: Array.from(new Set(group.topics)),
            startSec: Number.isFinite(startSec) ? startSec : undefined,
            endSec: Number.isFinite(endSec) ? endSec : undefined,
            asrLowQualitySegmentCount: asrStats.lowQualityCount || undefined,
            asrTranscriptArtifactCount: asrStats.transcriptArtifactCount || undefined,
            asrTranscriptArtifactTypes: asrStats.transcriptArtifactTypes.length > 0 ? asrStats.transcriptArtifactTypes : undefined,
            worstArtifactSeverity: asrStats.worstArtifactSeverity ?? undefined,
            problematicReason: chunkProblems.length > 0 ? [...new Set(chunkProblems)] : undefined,
            damaged_segment_ids: confStats.damaged_segment_ids.length > 0 ? confStats.damaged_segment_ids : undefined,
            contains_repaired_text: confStats.contains_repaired_text || undefined,
          })
          content = ""
          chunkTurnIndices = []
        }
        content += (content ? "\n" : "") + line
      }

      if (text || masked) {
        // Track the segment for stats (even if masked/omitted from text).
        chunkTurnIndices.push(turnIdx)
      }
    }

    if (content.trim()) {
      // Assess the final chunk's segments
      const chunkSegments = chunkTurnIndices
        .map((idx) => segments[idx])
        .filter((s): s is ContentSegment => s !== undefined)
      const chunkProblems = assessSegmentsForProblems(chunkSegments, speakerLabels)
      const asrStats = collectAsrStats(chunkSegments, asrIndex)
      const confStats = collectConfidenceDamageStats(chunkSegments)

      if (asrStats.lowQualityCount > 0) {
        chunkProblems.push("asr_low_quality")
      }
      if (asrStats.transcriptArtifactTypes.length > 0) {
        for (const t of asrStats.transcriptArtifactTypes) {
          chunkProblems.push(`asr_transcript_artifact:${t}`)
        }
      }
      if (confStats.lowTierCount > 0) {
        chunkProblems.push("confidence_tier:low")
      } else if (confStats.mediumTierCount > 0) {
        chunkProblems.push("confidence_tier:medium")
      }
      if (confStats.damaged_segment_ids.length > 0) {
        chunkProblems.push("contamination_sources_present")
      }

      const startSec = Math.min(
        ...chunkSegments.map((s) => (typeof s.start === "number" ? s.start : Number.POSITIVE_INFINITY))
      )
      const endSec = Math.max(
        ...chunkSegments.map((s) => (typeof s.end === "number" ? s.end : Number.NEGATIVE_INFINITY))
      )

      chunks.push({
        content: content.trim(),
        type: "INTERACTION",
        chunkIndex: chunks.length,
        totalChunks: 0,
        conversationId: row.conversation_id,
        phase: group.phase,
        techniques: [...new Set(group.techniques)],
        topics: [...new Set(group.topics)],
        startSec: Number.isFinite(startSec) ? startSec : undefined,
        endSec: Number.isFinite(endSec) ? endSec : undefined,
        asrLowQualitySegmentCount: asrStats.lowQualityCount || undefined,
        asrTranscriptArtifactCount: asrStats.transcriptArtifactCount || undefined,
        asrTranscriptArtifactTypes: asrStats.transcriptArtifactTypes.length > 0 ? asrStats.transcriptArtifactTypes : undefined,
        worstArtifactSeverity: asrStats.worstArtifactSeverity ?? undefined,
        problematicReason: chunkProblems.length > 0 ? [...new Set(chunkProblems)] : undefined,
        damaged_segment_ids: confStats.damaged_segment_ids.length > 0 ? confStats.damaged_segment_ids : undefined,
        contains_repaired_text: confStats.contains_repaired_text || undefined,
      })
    }
  }

  return chunks
}

/**
 * Group consecutive commentary segments (conversation_id=0) into contiguous blocks.
 */
function groupCommentaryBlocks(segs: ContentSegment[]): ContentSegment[][] {
  const blocks: ContentSegment[][] = []
  let current: ContentSegment[] = []

  for (const seg of segs) {
    if ((seg.conversation_id ?? 0) === 0) {
      current.push(seg)
    } else {
      if (current.length > 0) {
        blocks.push(current)
        current = []
      }
    }
  }
  if (current.length > 0) {
    blocks.push(current)
  }
  return blocks
}

type CrossReferenceMap = {
  /** blockIndex (1-indexed) → linked conversation_id (null if no conversations) */
  commentaryToConversation: Map<number, number | null>
  /** conversation_id → blockIndex[] (1-indexed) */
  conversationToCommentary: Map<number, number[]>
}

/**
 * Build cross-reference links between commentary blocks and approach conversations.
 * Uses segment ID proximity to determine which commentary discusses which conversation.
 *
 * Heuristic:
 * - Commentary before all conversations → links to first conversation
 * - Commentary after all conversations → links to last conversation
 * - Commentary between two conversations → links to preceding conversation (debrief)
 * - Same conversation on both sides (interleaved) → links to that conversation
 * - No conversations in video → null
 */
function buildCommentaryConversationLinks(
  commentaryBlocks: ContentSegment[][],
  segments: ContentSegment[]
): CrossReferenceMap {
  const result: CrossReferenceMap = {
    commentaryToConversation: new Map(),
    conversationToCommentary: new Map(),
  }

  if (commentaryBlocks.length === 0) return result

  // Build conversation ranges: for each conversation_id > 0, find min/max segment.id
  const convRanges = new Map<number, { minSegId: number; maxSegId: number }>()
  for (const seg of segments) {
    const convId = seg.conversation_id ?? 0
    if (convId <= 0) continue
    const segId = seg.id ?? 0
    const existing = convRanges.get(convId)
    if (existing) {
      existing.minSegId = Math.min(existing.minSegId, segId)
      existing.maxSegId = Math.max(existing.maxSegId, segId)
    } else {
      convRanges.set(convId, { minSegId: segId, maxSegId: segId })
    }
  }

  // Sort conversations by their first segment ID
  const sortedConvs = [...convRanges.entries()]
    .map(([convId, range]) => ({ convId, ...range }))
    .sort((a, b) => a.minSegId - b.minSegId)

  if (sortedConvs.length === 0) {
    // No conversations — all blocks get null
    for (let i = 0; i < commentaryBlocks.length; i++) {
      result.commentaryToConversation.set(i + 1, null)
    }
    return result
  }

  for (let blockIdx = 0; blockIdx < commentaryBlocks.length; blockIdx++) {
    const block = commentaryBlocks[blockIdx]
    const blockMinSeg = block[0]?.id ?? 0
    const blockMaxSeg = block[block.length - 1]?.id ?? 0
    const blockMid = (blockMinSeg + blockMaxSeg) / 2

    // Find preceding conversation (last conv whose maxSegId < blockMinSeg)
    let preceding: { convId: number } | null = null
    for (const conv of sortedConvs) {
      if (conv.maxSegId < blockMinSeg) preceding = conv
      else break
    }

    // Find following conversation (first conv whose minSegId > blockMaxSeg)
    let following: { convId: number } | null = null
    for (const conv of sortedConvs) {
      if (conv.minSegId > blockMaxSeg) {
        following = conv
        break
      }
    }

    let linkedConvId: number
    if (!preceding && !following) {
      // Block overlaps with a conversation range — find nearest by midpoint
      let bestDist = Infinity
      linkedConvId = sortedConvs[0].convId
      for (const conv of sortedConvs) {
        const convMid = (conv.minSegId + conv.maxSegId) / 2
        const dist = Math.abs(blockMid - convMid)
        if (dist < bestDist) {
          bestDist = dist
          linkedConvId = conv.convId
        }
      }
    } else if (!preceding) {
      // Before all conversations → link to first
      linkedConvId = following!.convId
    } else if (!following) {
      // After all conversations → link to last
      linkedConvId = preceding.convId
    } else if (preceding.convId === following.convId) {
      // Same conversation on both sides (interleaved)
      linkedConvId = preceding.convId
    } else {
      // Between two different conversations → link to preceding (debrief)
      linkedConvId = preceding.convId
    }

    const bIdx = blockIdx + 1 // 1-indexed
    result.commentaryToConversation.set(bIdx, linkedConvId)

    const existing = result.conversationToCommentary.get(linkedConvId) ?? []
    existing.push(bIdx)
    result.conversationToCommentary.set(linkedConvId, existing)
  }

  return result
}

/**
 * Simple size-based text chunking on line boundaries.
 */
function splitTextBySize(text: string, maxSize: number, overlap: number): string[] {
  const lines = text.split("\n").filter((l) => l.trim().length > 0)
  const chunks: string[] = []
  let current = ""

  for (const line of lines) {
    const candidate = current ? current + "\n" + line : line
    if (candidate.length > maxSize && current.length > 0) {
      chunks.push(current.trim())
      const overlapStart = Math.max(0, current.length - overlap)
      const overlapText = current.slice(overlapStart).trim()
      current = overlapText ? overlapText + "\n" + line : line
    } else {
      current = candidate
    }
  }

  if (current.trim()) {
    chunks.push(current.trim())
  }

  return chunks
}

/**
 * Build simple text chunks for commentary or talking_head content.
 * Assesses quality per-chunk by mapping text lines back to source segments,
 * so a few bad segments (e.g. intro music) don't penalize the entire section.
 */
function chunkCommentaryText(
  text: string,
  techniques: string[],
  topics: string[],
  maxSize: number,
  overlap: number,
  segments: ContentSegment[],
  speakerLabels: SpeakerLabels,
  asrIndex: AsrQualityIndex | null
): InternalChunk[] {
  if (text.length < 20) return []

  // Split text into lines and track which segment each line came from.
  // The caller builds text as "Speaker: seg.text" per segment, one line per segment,
  // filtering out masked/empty lines. We mirror that logic to map line→segment.
  const textLines = text.split("\n").filter((l) => l.trim().length > 0)

  // Build line→segment mapping: for each non-empty text line, find the matching segment
  const lineToSegment: (ContentSegment | undefined)[] = []
  let segCursor = 0
  for (const line of textLines) {
    // Find the segment whose text appears in this line
    let matched = false
    for (let s = segCursor; s < segments.length; s++) {
      const segText = (segments[s].text ?? "").trim()
      if (segText && line.includes(segText)) {
        lineToSegment.push(segments[s])
        segCursor = s + 1
        matched = true
        break
      }
    }
    if (!matched) lineToSegment.push(undefined)
  }

  // Use the same splitting logic as splitTextBySize but track line indices per chunk
  const chunkLineRanges: { start: number; end: number }[] = []
  let current = ""
  let chunkStartLine = 0
  let lineIdx = 0

  for (const line of textLines) {
    const candidate = current ? current + "\n" + line : line
    if (candidate.length > maxSize && current.length > 0) {
      chunkLineRanges.push({ start: chunkStartLine, end: lineIdx })
      // Overlap: rewind by overlap chars worth of lines
      const overlapStart = Math.max(0, current.length - overlap)
      const overlapText = current.slice(overlapStart).trim()
      current = overlapText ? overlapText + "\n" + line : line
      // Approximate: overlap lines come from the tail of the previous chunk
      const overlapLineCount = current.split("\n").length - 1
      chunkStartLine = Math.max(0, lineIdx - overlapLineCount)
    } else {
      current = candidate
    }
    lineIdx++
  }
  if (current.trim()) {
    chunkLineRanges.push({ start: chunkStartLine, end: textLines.length })
  }

  const parts = splitTextBySize(text, maxSize, overlap)

  return parts.map((content, idx) => {
    // Gather segments for this specific chunk
    const range = chunkLineRanges[idx] ?? { start: 0, end: textLines.length }
    const chunkSegments: ContentSegment[] = []
    for (let l = range.start; l < range.end; l++) {
      const seg = lineToSegment[l]
      if (seg) chunkSegments.push(seg)
    }
    // Fall back to all segments if mapping produced nothing (safety net)
    const segs = chunkSegments.length > 0 ? chunkSegments : segments

    const problems = assessSegmentsForProblems(segs, speakerLabels)
    const asrStats = collectAsrStats(segs, asrIndex)
    const confStats = collectConfidenceDamageStats(segs)

    if (asrStats.lowQualityCount > 0) {
      problems.push("asr_low_quality")
    }
    if (asrStats.transcriptArtifactTypes.length > 0) {
      for (const t of asrStats.transcriptArtifactTypes) {
        problems.push(`asr_transcript_artifact:${t}`)
      }
    }
    if (confStats.lowTierCount > 0) {
      problems.push("confidence_tier:low")
    } else if (confStats.mediumTierCount > 0) {
      problems.push("confidence_tier:medium")
    }
    if (confStats.damaged_segment_ids.length > 0) {
      problems.push("contamination_sources_present")
    }

    const chunkStartSec = Math.min(
      ...segs.map((s) => (typeof s.start === "number" ? s.start : Number.POSITIVE_INFINITY))
    )
    const chunkEndSec = Math.max(
      ...segs.map((s) => (typeof s.end === "number" ? s.end : Number.NEGATIVE_INFINITY))
    )

    return {
      content,
      type: "COMMENTARY" as SegmentType,
      chunkIndex: idx,
      totalChunks: parts.length,
      techniques,
      topics,
      startSec: Number.isFinite(chunkStartSec) ? chunkStartSec : undefined,
      endSec: Number.isFinite(chunkEndSec) ? chunkEndSec : undefined,
      asrLowQualitySegmentCount: asrStats.lowQualityCount || undefined,
      asrTranscriptArtifactCount: asrStats.transcriptArtifactCount || undefined,
      asrTranscriptArtifactTypes: asrStats.transcriptArtifactTypes.length > 0 ? asrStats.transcriptArtifactTypes : undefined,
      worstArtifactSeverity: asrStats.worstArtifactSeverity ?? undefined,
      problematicReason: problems.length > 0 ? [...new Set(problems)] : undefined,
      damaged_segment_ids: confStats.damaged_segment_ids.length > 0 ? confStats.damaged_segment_ids : undefined,
      contains_repaired_text: confStats.contains_repaired_text || undefined,
    }
  })
}

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

const VIDEO_ID_RE = /\[([A-Za-z0-9_-]{11})\]/

function isValidVideoId(raw: unknown): raw is string {
  return typeof raw === "string" && /^[A-Za-z0-9_-]{11}$/.test(raw)
}

function extractVideoIdFromText(text: string): string | null {
  const m = text.match(VIDEO_ID_RE)
  return m?.[1] ?? null
}

function isPlausibleChannelName(raw: string | null | undefined): raw is string {
  if (!raw) return false
  const s = raw.trim()
  if (!s) return false
  // Channel/source dirs are stable identifiers (no brackets, no file suffixes).
  if (s.includes("[") || s.includes("]")) return false
  if (s.endsWith(".json") || s.endsWith(".enriched")) return false
  if (s.includes(".audio.asr.")) return false
  return true
}

function extractChannelFromSourceFile(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null
  const normalized = raw.replace(/\\/g, "/")
  // Example: data/06c.DET.patched/<channel>/<stem>.conversations.json
  const m = normalized.match(
    /data\/(?:06c\.DET\.patched|06\.LLM\.video-type|06b\.verify|07\.LLM\.content|05\.EXT\.audio-features)\/([^/]+)\//
  )
  return m?.[1] ?? null
}

function displayTitleFromStem(videoStem: string): string {
  // Stage 07 filenames are: "<title> [VIDEO_ID].audio.asr.clean16k"
  let s = videoStem
  for (const suffix of [".audio.asr.clean16k", ".audio.asr.raw16k"]) {
    if (s.endsWith(suffix)) s = s.slice(0, -suffix.length)
  }
  s = s.replace(/\s*\[[A-Za-z0-9_-]{11}\]\s*$/, "").trim()
  return s || videoStem
}

function normalizeVideoStemFromEnrichedFilename(filePath: string): string {
  let base = path.basename(filePath, ".enriched.json")
  if (base.endsWith(".interactions")) base = base.slice(0, -".interactions".length)
  return base
}

function extractTechniqueNames(raw: unknown): string[] {
  if (!raw) return []
  if (!Array.isArray(raw)) return []
  const names: string[] = []
  for (const entry of raw) {
    if (typeof entry === "string") {
      if (entry.trim()) names.push(entry.trim())
      continue
    }
    if (entry && typeof entry === "object" && "technique" in entry) {
      const technique = (entry as { technique?: unknown }).technique
      if (typeof technique === "string" && technique.trim()) {
        names.push(technique.trim())
      }
    }
  }
  return Array.from(new Set(names))
}

function extractStringArray(raw: unknown): string[] {
  if (!raw) return []
  if (!Array.isArray(raw)) return []
  const out = raw
    .filter((x) => typeof x === "string")
    .map((x) => String(x).trim())
    .filter(Boolean)
  return Array.from(new Set(out))
}

function extractVideoType(vt: unknown): string {
  if (vt && typeof vt === "object" && "type" in vt) {
    const t = (vt as { type?: unknown }).type
    if (typeof t === "string") return t
  }
  return "unknown"
}

// ---------------------------------------------------------------------------
// Embedding generation
// ---------------------------------------------------------------------------

const OLLAMA_REQUEST_TIMEOUT_MS = 25_000

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function checkOllamaReady(baseUrl: string, model: string): Promise<void> {
  const url = `${baseUrl}/api/tags`
  let response: Response
  try {
    response = await fetchWithTimeout(url, { method: "GET" }, 2000)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Ollama is not reachable at ${baseUrl} (${msg}). ` +
        `Start it with 'ollama serve' and ensure OLLAMA_API_URL is correct.`
    )
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(
      `Ollama health check failed (${response.status}) at ${url}: ${body.slice(0, 200)}`
    )
  }

  try {
    const data = (await response.json()) as { models?: Array<{ name?: string }> }
    const names = (data.models ?? [])
      .map((m) => (typeof m?.name === "string" ? m.name : ""))
      .filter(Boolean)
    const ok = names.some((n) => n === model || n.startsWith(`${model}:`))
    if (!ok) {
      console.warn(
        `⚠️  Ollama embedding model '${model}' not found in /api/tags. ` +
          `You may need: ollama pull ${model}`
      )
    }
  } catch {
    // Non-fatal: model existence will be validated by the /api/embeddings call anyway.
  }
}

async function generateEmbedding(
  text: string,
  baseUrl: string,
  model: string
): Promise<number[]> {
  const MAX_LENGTH = 8000
  const inputText = text.length > MAX_LENGTH ? text.substring(0, MAX_LENGTH) : text

  const response = await fetchWithTimeout(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: inputText }),
  }, OLLAMA_REQUEST_TIMEOUT_MS)

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Ollama embedding failed (${response.status}): ${body}`)
  }

  const data = await response.json()
  if (!data.embedding) {
    throw new Error(`Invalid embedding response: ${JSON.stringify(data)}`)
  }

  return data.embedding
}

async function generateEmbeddingWithRetry(
  text: string,
  baseUrl: string,
  model: string,
  maxRetries = 3
): Promise<number[]> {
  let lastError: unknown = null
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateEmbedding(text, baseUrl, model)
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        await sleep(1500)
      }
    }
  }
  throw lastError
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let args: Args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`❌ ${msg}`)
    process.exit(1)
  }
  if (args.help) {
    printUsage()
    return
  }

  loadEnvFile(path.join(process.cwd(), ".env.local"))

  const { QA_CONFIG } = await import("../../src/qa/config")

  const enrichedDir = path.join(process.cwd(), "data", "07.LLM.content")
  const chunksDir = path.join(process.cwd(), "data", "09.EXT.chunks")

  const chunkSize = QA_CONFIG.rag.chunkSize
  const chunkOverlap = QA_CONFIG.rag.chunkOverlap
  const embeddingModel = QA_CONFIG.ollama.embeddingModel
  const ollamaBaseUrl = QA_CONFIG.ollama.baseUrl

  const statePath = path.join(chunksDir, ".chunk_state.json")

  const state = await loadState(statePath, { embeddingModel, chunkSize, chunkOverlap })

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
  let quarantineVideoIds = new Set<string>()
  if (args.quarantineFile) {
    try {
      quarantineVideoIds = loadQuarantineVideoIds(args.quarantineFile)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`❌ Could not read quarantine file: ${args.quarantineFile} (${msg})`)
      process.exit(1)
    }
  }

  let force = args.force
  if (
    state.embeddingModel !== embeddingModel ||
    state.chunkSize !== chunkSize ||
    state.chunkOverlap !== chunkOverlap
  ) {
    console.log("⚠️  Chunk settings changed since last run; forcing full re-chunk.")
    force = true
    state.embeddingModel = embeddingModel
    state.chunkSize = chunkSize
    state.chunkOverlap = chunkOverlap
  }

  let enrichedFiles: string[] = []

  if (manifestAllowList && !args.source) {
    for (const src of Array.from(manifestAllowList.keys()).sort((a, b) => a.localeCompare(b))) {
      const srcDir = path.join(enrichedDir, src)
      if (!fs.existsSync(srcDir)) continue
      enrichedFiles.push(...(await listJsonlFiles(srcDir, ".enriched.json")))
    }
  } else {
    const scanDir = args.source ? path.join(enrichedDir, args.source) : enrichedDir
    if (!fs.existsSync(scanDir)) {
      console.error(`❌ Missing directory: ${scanDir}`)
      process.exit(1)
    }
    enrichedFiles = await listJsonlFiles(scanDir, ".enriched.json")
  }

  if (enrichedFiles.length === 0) {
    console.log(`No .enriched.json files found under ${args.source ?? "data/07.LLM.content/"}`)
    return
  }

  const candidates: Array<{
    filePath: string
    sourceKey: string
    channel: string
    videoId: string
    videoStem: string
    videoTitle: string
    fileHash: string
    videoType: string
    rank: number
  }> = []
  let skippedBadJson = 0
  let skippedNoContent = 0
  let skippedNoVideoId = 0
  let skippedNotInManifest = 0
  let skippedQuarantine = 0

  for (const filePath of enrichedFiles) {
    const relEnrichedPath = path.relative(enrichedDir, filePath)
    const relParts = relEnrichedPath.split(path.sep).filter(Boolean)
    const channelCandidate = relParts.length > 1 ? relParts[0] : null
    const videoStem = normalizeVideoStemFromEnrichedFilename(filePath)
    const videoIdFromFilename = extractVideoIdFromText(videoStem) || extractVideoIdFromText(relEnrichedPath)

    if (videoIdFromFilename && quarantineVideoIds.has(videoIdFromFilename)) {
      skippedQuarantine++
      continue
    }

    if (manifestAllowList && channelCandidate) {
      const allowed = videoIdFromFilename ? manifestAllowList.get(channelCandidate) : null
      if (!allowed || !videoIdFromFilename || !allowed.has(videoIdFromFilename)) {
        skippedNotInManifest++
        continue
      }
    }

    const rawContent = await fsp.readFile(filePath, "utf-8")
    const fileHash = hashFile(rawContent)

    let parsedFile: EnrichedFile
    try {
      parsedFile = JSON.parse(rawContent)
    } catch {
      skippedBadJson++
      continue
    }

    const fileSegments = parsedFile.segments
    const fileEnrichments = parsedFile.enrichments
    const hasContent =
      Array.isArray(fileSegments) &&
      Array.isArray(fileEnrichments) &&
      fileEnrichments.length > 0

    if (!hasContent) {
      skippedNoContent++
      continue
    }

    const videoId =
      (isValidVideoId(parsedFile.video_id) ? parsedFile.video_id : null) ||
      videoIdFromFilename

    if (!videoId) {
      skippedNoVideoId++
      continue
    }
    if (quarantineVideoIds.has(videoId)) {
      skippedQuarantine++
      continue
    }

    const channelFromJson =
      typeof parsedFile.source === "string" && parsedFile.source.trim()
        ? parsedFile.source.trim()
        : null
    const channelFromMeta = extractChannelFromSourceFile(parsedFile.metadata?.source_file)
    const channel = isPlausibleChannelName(channelCandidate)
      ? channelCandidate
      : channelFromJson ?? channelFromMeta ?? "unknown"

    if (manifestAllowList) {
      const allowed = manifestAllowList.get(channel)
      if (!allowed || !allowed.has(videoId)) {
        skippedNotInManifest++
        continue
      }
    }

    const sourceKey = path.join(channel, `${videoId}.txt`)
    const fileVideoType = extractVideoType(parsedFile.video_type)
    const videoTitle =
      typeof parsedFile.video_title === "string" && parsedFile.video_title.trim()
        ? parsedFile.video_title.trim()
        : displayTitleFromStem(videoStem)

    candidates.push({
      filePath,
      sourceKey,
      channel,
      videoId,
      videoStem,
      videoTitle,
      fileHash,
      videoType: fileVideoType,
      // Prefer deeper paths (source-flat over root-flat) when duplicates exist.
      rank: relParts.length,
    })
  }

  // Deduplicate by stable sourceKey (channel + video_id).
  const bestByKey = new Map<string, (typeof candidates)[number]>()
  let deduped = 0
  for (const cand of candidates) {
    const prev = bestByKey.get(cand.sourceKey)
    if (
      !prev ||
      cand.rank > prev.rank ||
      (cand.rank === prev.rank && cand.filePath.localeCompare(prev.filePath) < 0)
    ) {
      if (prev) deduped++
      bestByKey.set(cand.sourceKey, cand)
    } else {
      deduped++
    }
  }

  const toProcess: Array<(typeof candidates)[number]> = []
  let unchanged = 0
  let mtimeForced = 0
  for (const cand of Array.from(bestByKey.values()).sort((a, b) => a.sourceKey.localeCompare(b.sourceKey))) {
    const prev = state.sources[cand.sourceKey]
    const isUnchanged = !force && prev?.enrichedHash === cand.fileHash
    if (isUnchanged) {
      // Safety net: verify output exists and isn't older than input
      const outputPath = path.join(chunksDir, cand.channel, `${cand.videoId}.chunks.json`)
      try {
        const [inputStat, outputStat] = await Promise.all([
          fsp.stat(cand.filePath),
          fsp.stat(outputPath),
        ])
        if (inputStat.mtimeMs > outputStat.mtimeMs) {
          mtimeForced++
          toProcess.push(cand)
          continue
        }
      } catch {
        // Output missing — re-process even though hash says unchanged
        mtimeForced++
        toProcess.push(cand)
        continue
      }
      unchanged++
      continue
    }
    toProcess.push(cand)
  }

  console.log("================================")
  console.log("📦 CHUNK & EMBED (Stage 09)")
  console.log("================================")
  console.log(`Source:       ${args.source ?? "all"}`)
  if (args.manifest) console.log(`Manifest:     ${args.manifest}`)
  if (args.quarantineFile) console.log(`Quarantine:   ${args.quarantineFile} (${quarantineVideoIds.size} ids)`)
  console.log(`Unchanged:    ${unchanged}`)
  console.log(`To process:   ${toProcess.length}${force ? " (forced)" : ""}`)
  if (mtimeForced > 0) console.log(`Stale:        ${mtimeForced} file(s) with input newer than output (auto-forced)`)
  if (deduped > 0) console.log(`Deduped:      ${deduped} duplicate enriched artifact(s)`)
  if (skippedBadJson > 0) console.log(`Skipped:      ${skippedBadJson} unreadable JSON file(s)`)
  if (skippedNoVideoId > 0) console.log(`Skipped:      ${skippedNoVideoId} file(s) missing video_id`)
  if (skippedNoContent > 0) console.log(`Skipped:      ${skippedNoContent} file(s) with no content`)
  if (skippedNotInManifest > 0) console.log(`Skipped:      ${skippedNotInManifest} file(s) not in manifest`)
  if (skippedQuarantine > 0) console.log(`Skipped:      ${skippedQuarantine} file(s) quarantined`)
  console.log(`Chunk size:   ${chunkSize}`)
  console.log(`Overlap:      ${chunkOverlap}`)
  console.log(`Min conf:     ${args.minChunkConfidence}`)
  console.log(`Model:        ${embeddingModel}`)
  console.log(`Output dir:   ${chunksDir}`)

  if (args.dryRun) {
    console.log("")
    console.log("✅ Dry run: no files written.")
    return
  }

  if (toProcess.length === 0) {
    console.log("✅ Nothing to process.")
    return
  }

  // Preflight Ollama once (avoid failing mid-run with unclear errors).
  await checkOllamaReady(ollamaBaseUrl, embeddingModel)

  for (const item of toProcess) {
    const { sourceKey, channel, videoId, videoStem, videoTitle, videoType, filePath } = item

    console.log("")
    console.log(`🔁 Processing: ${sourceKey} (videoId: ${videoId})`)

    const rawContent = await fsp.readFile(filePath, "utf-8")
    const fileHash = hashFile(rawContent)

    let parsedFile: EnrichedFile
    try {
      parsedFile = JSON.parse(rawContent)
    } catch {
      console.warn(`   ⚠️  Skipping unreadable JSON: ${filePath}`)
      continue
    }

    const asrIndex = buildAsrQualityIndex(parsedFile)
    const maskedSegmentIds = new Set<number>()
    if (args.maskTranscriptArtifacts) {
      if (args.maskAllTranscriptArtifacts) {
        // Legacy behavior: mask all artifact segments regardless of severity
        for (const id of asrIndex.transcriptArtifactIds) maskedSegmentIds.add(id)
      } else {
        // Default: only mask high-severity artifacts (genuine nonsense/gibberish)
        for (const [id, severity] of asrIndex.transcriptArtifactSeveritiesById) {
          if (severity === "high") maskedSegmentIds.add(id)
        }
      }
    }
    if (args.maskLowQuality) {
      for (const id of asrIndex.lowQualityIds) maskedSegmentIds.add(id)
    }
    const asrMaskedCount = maskedSegmentIds.size
    if (asrMaskedCount > 0) {
      console.log(`   🧹 Masking ${asrMaskedCount} ASR-flagged segment(s) in chunk text`)
    }

    const internalChunks: InternalChunk[] = []

    const allSegments = parsedFile.segments!
    const fileEnrichments = parsedFile.enrichments!

    // Filter out teaser segments (previews that duplicate content later in video)
    const teaserCount = allSegments.filter((s) => s.is_teaser).length
    const fileSegments = allSegments.filter((s) => !s.is_teaser)
    if (teaserCount > 0) {
      console.log(`   ⏭️  Skipping ${teaserCount} teaser segments`)
    }

    // Speaker role uncertainty is often worse than minor ASR issues for retrieval.
    // Mask these segments from chunk text by default (still counted for confidence).
    let speakerMaskedCount = 0
    for (const seg of fileSegments) {
      const segId = seg.id
      const role = (seg.speaker_role ?? "").toLowerCase().trim()
      if (typeof segId === "number" && PROBLEMATIC_SPEAKER_ROLES.includes(role)) {
        if (!maskedSegmentIds.has(segId)) speakerMaskedCount++
        maskedSegmentIds.add(segId)
      }
    }
    if (speakerMaskedCount > 0) {
      console.log(`   🧹 Masking ${speakerMaskedCount} speaker-uncertain segment(s) in chunk text`)
    }

    // Confidence-aware masking: keep low-confidence contaminated lines out of
    // primary interaction chunk text.
    let confidenceMaskedCount = 0
    for (const seg of fileSegments) {
      const segId = seg.id
      if (typeof segId !== "number") continue
      const tier = (seg.confidence_tier ?? "").toLowerCase().trim()
      const hasContamination = Array.isArray(seg.contamination_sources) && seg.contamination_sources.length > 0
      if (tier === "low" && hasContamination) {
        if (!maskedSegmentIds.has(segId)) confidenceMaskedCount++
        maskedSegmentIds.add(segId)
      }
    }
    if (confidenceMaskedCount > 0) {
      console.log(`   🧹 Masking ${confidenceMaskedCount} low-confidence contaminated segment(s) in chunk text`)
    }

    // Process approach enrichments via phase-based chunking
    const approachChunksByConvId = new Map<number, InternalChunk[]>()
    const approachEnrichments = fileEnrichments.filter((e) => e.type === "approach")
    for (const enrichment of approachEnrichments) {
      const convId = enrichment.conversation_id
      if (convId === undefined) continue

      const convSegments = fileSegments.filter((s) => s.conversation_id === convId)
      if (convSegments.length === 0) continue

      const phaseMap = new Map<number, string>()
      for (const tp of enrichment.turn_phases ?? []) {
        if (tp.segment !== undefined && tp.phase) {
          phaseMap.set(tp.segment, tp.phase)
        }
      }

      // Stage 07 writes turn_phases[].segment as a global segments[].id (it remaps from
      // conversation-local indices before writing). Older artifacts may still contain
      // conversation-local indices, so we fall back to idx when the global id lookup fails.
      let usedLocalPhaseIndex = false
      const turns: InteractionJsonlRow["turns"] = convSegments.map((seg, idx) => {
        const globalSegId = seg.id
        const globalPhase =
          globalSegId !== undefined ? phaseMap.get(globalSegId) : undefined
        const localPhase = phaseMap.get(idx)
        const phase = globalPhase ?? localPhase

        if (globalSegId !== undefined && globalPhase === undefined && localPhase !== undefined) {
          usedLocalPhaseIndex = true
        }

        const masked = typeof globalSegId === "number" && maskedSegmentIds.has(globalSegId)

        return {
          speaker: seg.speaker_role ?? seg.speaker_id ?? "unknown",
          text: masked ? "" : (seg.text ?? ""),
          masked,
          start: seg.start,
          end: seg.end,
          phase,
        }
      })

      if (usedLocalPhaseIndex) {
        console.warn(
          `   ⚠️  turn_phases appears to use conversation-local indices for conv ${convId}; ` +
            `expected global segments[].id (legacy Stage 07 artifact?)`
        )
      }

      const row: InteractionJsonlRow = {
        id: `approach_${convId}`,
        conversation_id: convId,
        source_video: parsedFile.video_title ?? parsedFile.video_id ?? videoStem,
        start_time: convSegments[0]?.start,
        end_time: convSegments[convSegments.length - 1]?.end,
        techniques: extractTechniqueNames(enrichment.techniques_used),
        topics: extractStringArray(enrichment.topics_discussed),
        turns,
      }

      const speakerLabels = parsedFile.speaker_labels ?? {}
      const phaseChunks = chunkInteractionByPhase(row, chunkSize, convSegments, speakerLabels, asrIndex)

      // Add investmentLevel from enrichment to each chunk
      const investmentLevel = enrichment.investment_level
      if (investmentLevel) {
        for (const chunk of phaseChunks) {
          chunk.investmentLevel = investmentLevel
        }
      }

      // Add phaseConfidence from enrichment to each chunk based on its phase
      const phaseConfidenceMap = enrichment.phase_confidence
      if (phaseConfidenceMap) {
        for (const chunk of phaseChunks) {
          if (chunk.phase && phaseConfidenceMap[chunk.phase] !== undefined) {
            chunk.phaseConfidence = phaseConfidenceMap[chunk.phase]
          }
        }
      }

      // Propagate description from enrichment
      const approachDesc = typeof enrichment.description === "string" ? enrichment.description : undefined
      if (approachDesc) {
        for (const chunk of phaseChunks) chunk.description = approachDesc
      }

      if (phaseChunks.length > 0) {
        for (let i = 0; i < phaseChunks.length; i++) {
          phaseChunks[i].conversationChunkIndex = i + 1
          phaseChunks[i].conversationChunkTotal = phaseChunks.length
        }
        approachChunksByConvId.set(convId, phaseChunks)
        internalChunks.push(...phaseChunks)
      }

      // Summary chunk for this approach enrichment
      const summaryChunk = buildSummaryChunk(enrichment, "INTERACTION", { conversationId: convId })
      if (summaryChunk) {
        if (investmentLevel) summaryChunk.investmentLevel = investmentLevel
        internalChunks.push(summaryChunk)
      }
    }

    // Process commentary blocks via simple text chunking
    const commentaryBlocks = groupCommentaryBlocks(fileSegments)
    const crossRefMap = buildCommentaryConversationLinks(commentaryBlocks, fileSegments)
    const commentaryEnrichments = fileEnrichments.filter((e) => e.type === "commentary")
    const speakerLabelsForCommentary = parsedFile.speaker_labels ?? {}

    for (let blockIdx = 0; blockIdx < commentaryBlocks.length; blockIdx++) {
      const block = commentaryBlocks[blockIdx]
      const text = block
        .map((seg) => {
          const segId = seg.id
          if (typeof segId === "number" && maskedSegmentIds.has(segId)) return null
          const speaker = mapSpeakerLabel(seg.speaker_role ?? seg.speaker_id)
          return `${speaker}: ${(seg.text ?? "").trim()}`
        })
        .filter((line): line is string => Boolean(line) && line!.length > 2)
        .join("\n")

      const enrichment = commentaryEnrichments.find((e) => e.block_index === blockIdx + 1)
      const techniques = extractTechniqueNames(enrichment?.techniques_discussed)
      const topics = extractStringArray(enrichment?.topics_discussed)

      const commentaryChunks = chunkCommentaryText(
        text,
        techniques,
        topics,
        chunkSize,
        chunkOverlap,
        block,
        speakerLabelsForCommentary,
        asrIndex
      )

      // Propagate description from enrichment
      const commentaryDesc = typeof enrichment?.description === "string" ? enrichment.description : undefined
      if (commentaryDesc) {
        for (const chunk of commentaryChunks) chunk.description = commentaryDesc
      }

      // D14b: stamp cross-reference metadata on commentary chunks
      const bIdx = blockIdx + 1
      const relatedConvId = crossRefMap.commentaryToConversation.get(bIdx)
      for (const chunk of commentaryChunks) {
        chunk.blockIndex = bIdx
        if (relatedConvId !== undefined) {
          chunk.relatedConversationId = relatedConvId
        }
      }

      internalChunks.push(...commentaryChunks)

      // Summary chunk for this commentary enrichment
      if (enrichment) {
        const commentarySummary = buildSummaryChunk(enrichment, "COMMENTARY", { blockIndex: bIdx })
        if (commentarySummary) {
          if (relatedConvId !== undefined) commentarySummary.relatedConversationId = relatedConvId
          internalChunks.push(commentarySummary)
        }
      }
    }

    // D14b: stamp relatedCommentaryBlockIndices on approach chunks (second pass)
    for (const [convId, chunks] of approachChunksByConvId) {
      const relatedBlocks = crossRefMap.conversationToCommentary.get(convId)
      if (relatedBlocks && relatedBlocks.length > 0) {
        for (const chunk of chunks) {
          chunk.relatedCommentaryBlockIndices = relatedBlocks
        }
      }
    }

    // Process talking_head sections via simple text chunking
    const sectionEnrichments = fileEnrichments.filter((e) => e.type === "talking_head_section")
    const speakerLabelsForSections = parsedFile.speaker_labels ?? {}
    for (const section of sectionEnrichments) {
      const startSeg = section.start_segment ?? 0
      const endSeg = section.end_segment ?? fileSegments.length - 1
      const sectionSegs = fileSegments.filter(
        (seg) => (seg.id ?? 0) >= startSeg && (seg.id ?? 0) <= endSeg
      )

      const text = sectionSegs
        .map((seg) => {
          const segId = seg.id
          if (typeof segId === "number" && maskedSegmentIds.has(segId)) return null
          const speaker = mapSpeakerLabel(seg.speaker_role ?? seg.speaker_id)
          return `${speaker}: ${(seg.text ?? "").trim()}`
        })
        .filter((line): line is string => Boolean(line) && line!.length > 2)
        .join("\n")

      const techniques = extractTechniqueNames(section.techniques_discussed)
      const topics = extractStringArray(section.topics_discussed)

      const sectionChunks = chunkCommentaryText(
        text,
        techniques,
        topics,
        chunkSize,
        chunkOverlap,
        sectionSegs,
        speakerLabelsForSections,
        asrIndex
      )
      // Propagate description + section_index from enrichment
      const sectionDesc = typeof section.description === "string" ? section.description : undefined
      const secIdx = typeof section.section_index === "number" ? section.section_index : undefined
      for (const chunk of sectionChunks) {
        if (sectionDesc) chunk.description = sectionDesc
        if (secIdx !== undefined) chunk.section_index = secIdx
      }
      internalChunks.push(...sectionChunks)

      // Summary chunk for this talking_head section
      const sectionSummary = buildSummaryChunk(section, "COMMENTARY", { section_index: secIdx })
      if (sectionSummary) internalChunks.push(sectionSummary)
    }

    if (internalChunks.length === 0) {
      console.log(`   ⚠️  No chunks generated, skipping`)
      continue
    }

    // Normalize chunkIndex/totalChunks across the whole video
    const normalizedChunks = internalChunks.map((c, idx) => {
      const chunk: InternalChunk = {
        ...c,
        chunkIndex: idx,
        totalChunks: internalChunks.length,
      }
      // Summary chunks keep their pre-set 1.0 confidence (no ASR source)
      if (!chunk.isSummary) {
        chunk.chunk_confidence_score = computeChunkConfidence(chunk)
      }
      chunk.chunkConfidenceVersion = CHUNK_CONFIDENCE_VERSION
      return chunk
    })

    // Filter out chunks below minimum confidence threshold
    const beforeFilterCount = normalizedChunks.length
    const filteredChunks = normalizedChunks.filter((c) => {
      if (c.isSummary) return true
      const score = c.chunk_confidence_score ?? 1.0
      return score >= args.minChunkConfidence
    })
    const droppedCount = beforeFilterCount - filteredChunks.length
    if (droppedCount > 0) {
      console.log(`   🚫 Filtered ${droppedCount} chunk(s) below confidence floor ${args.minChunkConfidence}`)
    }

    // Re-normalize global indices after filtering
    for (let i = 0; i < filteredChunks.length; i++) {
      filteredChunks[i].chunkIndex = i
      filteredChunks[i].totalChunks = filteredChunks.length
    }

    if (filteredChunks.length === 0) {
      console.log(`   ⚠️  All chunks filtered below confidence floor, skipping`)
      continue
    }

    // Generate embeddings
    console.log(`   📊 Generating ${filteredChunks.length} embeddings...`)
    const chunks: Chunk[] = []

    for (let i = 0; i < filteredChunks.length; i++) {
      const chunk = filteredChunks[i]

      // Build metadata prefix for semantic matching
      const summaryTag = chunk.isSummary ? "[SUMMARY] " : ""
      const prefix = buildMetadataPrefix(chunk.phase, chunk.techniques, chunk.topics, chunk.description, videoType)
      const contentWithPrefix = summaryTag + prefix + chunk.content

      const embedding = await generateEmbeddingWithRetry(contentWithPrefix, ollamaBaseUrl, embeddingModel)

      const metadata: ChunkMetadata = {
        segmentType: chunk.type,
        isRealExample: chunk.type === "INTERACTION",
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        // Parent references for sibling chunk retrieval
        videoId,
        videoType,
        channel,
      }

      if (chunk.conversationId !== undefined) {
        metadata.conversationId = chunk.conversationId
      }
      if (chunk.conversationChunkIndex !== undefined) {
        metadata.conversationChunkIndex = chunk.conversationChunkIndex
      }
      if (chunk.conversationChunkTotal !== undefined) {
        metadata.conversationChunkTotal = chunk.conversationChunkTotal
      }
      if (chunk.phase) {
        metadata.phase = chunk.phase
      }
      if (chunk.techniques && chunk.techniques.length > 0) {
        metadata.techniques = chunk.techniques
      }
      if (chunk.topics && chunk.topics.length > 0) {
        metadata.topics = chunk.topics
      }
      if (chunk.investmentLevel) {
        metadata.investmentLevel = chunk.investmentLevel
      }
      if (chunk.phaseConfidence !== undefined) {
        metadata.phaseConfidence = chunk.phaseConfidence
      }
      if (chunk.startSec !== undefined) {
        metadata.startSec = chunk.startSec
      }
      if (chunk.endSec !== undefined) {
        metadata.endSec = chunk.endSec
      }
      if (chunk.asrLowQualitySegmentCount !== undefined) {
        metadata.asrLowQualitySegmentCount = chunk.asrLowQualitySegmentCount
      }
      if (chunk.asrTranscriptArtifactCount !== undefined) {
        metadata.asrTranscriptArtifactCount = chunk.asrTranscriptArtifactCount
      }
      if (chunk.asrTranscriptArtifactTypes && chunk.asrTranscriptArtifactTypes.length > 0) {
        metadata.asrTranscriptArtifactTypes = chunk.asrTranscriptArtifactTypes
      }
      if (chunk.worstArtifactSeverity) {
        metadata.worstArtifactSeverity = chunk.worstArtifactSeverity
      }
      if (chunk.chunk_confidence_score !== undefined) {
        metadata.chunk_confidence_score = chunk.chunk_confidence_score
      }
      if (chunk.chunkConfidenceVersion !== undefined) {
        metadata.chunkConfidenceVersion = chunk.chunkConfidenceVersion
      }
      if (chunk.problematicReason && chunk.problematicReason.length > 0) {
        metadata.problematicReason = chunk.problematicReason
      }
      if (chunk.damaged_segment_ids && chunk.damaged_segment_ids.length > 0) {
        metadata.damaged_segment_ids = chunk.damaged_segment_ids
      }
      if (chunk.contains_repaired_text !== undefined) {
        metadata.contains_repaired_text = chunk.contains_repaired_text
      }
      // D14b: cross-reference metadata
      if (typeof chunk.blockIndex === "number") {
        metadata.blockIndex = chunk.blockIndex
      }
      if (chunk.relatedConversationId !== undefined) {
        metadata.relatedConversationId = chunk.relatedConversationId
      }
      if (chunk.relatedCommentaryBlockIndices && chunk.relatedCommentaryBlockIndices.length > 0) {
        metadata.relatedCommentaryBlockIndices = chunk.relatedCommentaryBlockIndices
      }
      // M2: description + section context
      if (chunk.description) {
        metadata.description = chunk.description
      }
      if (chunk.section_index !== undefined) {
        metadata.section_index = chunk.section_index
      }
      // M3: summary chunk flag
      if (chunk.isSummary) {
        metadata.isSummary = true
      }

      chunks.push({
        content: contentWithPrefix,
        embedding,
        metadata,
      })

      if ((i + 1) % 25 === 0 || i + 1 === filteredChunks.length) {
        console.log(`   - Embedded ${i + 1}/${filteredChunks.length}`)
      }
    }

    // Write chunks file
    const outputDir = path.join(chunksDir, channel)
    await fsp.mkdir(outputDir, { recursive: true })

    const outputPath = path.join(outputDir, `${videoId}.chunks.json`)
    const chunksFile: ChunksFile = {
      version: 1,
      sourceKey,
      sourceFile: filePath,
      sourceHash: fileHash,
      embeddingModel,
      chunkSize,
      chunkOverlap,
      minChunkConfidence: args.minChunkConfidence,
      preFilterChunkCount: beforeFilterCount,
      droppedChunksBelowFloor: droppedCount,
      videoType,
      channel,
      videoId,
      videoTitle,
      videoStem,
      generatedAt: new Date().toISOString(),
      chunks,
    }

    await fsp.writeFile(outputPath, JSON.stringify(chunksFile, null, 2) + "\n", "utf-8")

    // Update state
    state.sources[sourceKey] = {
      enrichedHash: fileHash,
      chunkCount: chunks.length,
      updatedAt: new Date().toISOString(),
    }
    await saveState(statePath, state)

    console.log(`   ✅ Written: ${outputPath} (${chunks.length} chunks)`)
  }

  console.log("")
  console.log("🎉 Chunk & embed complete!")
}

main().catch((err) => {
  console.error("Fatal error during chunk-embed:", err)
  process.exit(1)
})
