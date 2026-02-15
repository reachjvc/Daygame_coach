/**
 * scripts/training-data/09.chunk-embed.ts
 *
 * Chunk and Embed Stage (Stage 09)
 *
 * Transforms enriched content into embedded chunks, outputs to intermediate files.
 * This stage prepares data for ingestion but does NOT write to the database.
 *
 * Reads:
 *   - Enriched content files (from Stage 07):
 *       data/07.content/**\/*.enriched.json
 *
 * Writes:
 *   - Chunked and embedded files:
 *       data/09.chunks/<source>/<video>.chunks.json
 *   - State tracking:
 *       data/09.chunks/.chunk_state.json
 *
 * Use:
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/09.chunk-embed.ts
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/09.chunk-embed.ts --source daily_evolution
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/09.chunk-embed.ts --manifest docs/pipeline/batches/CANARY.1.txt
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/09.chunk-embed.ts --dry-run
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/09.chunk-embed.ts --full
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
  source: string | null
  manifest: string | null
  maskTranscriptArtifacts: boolean
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
  // Deterministic heuristic score for retrieval downranking (0.0-1.0).
  chunkConfidence?: number
  chunkConfidenceVersion?: number
  // Quality flags - if present, chunk contains problematic segments
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
  sourceKey: string
  sourceFile: string
  sourceHash: string
  embeddingModel: string
  chunkSize: number
  chunkOverlap: number
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
  low_quality_segments?: Array<{ segment?: number; reason?: string }>
  transcript_artifacts?: Array<{
    type?: string
    segment_index?: number
    artifact_type?: string
    description?: string
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
  chunkConfidence?: number
  chunkConfidenceVersion?: number
  // Quality flags
  problematicReason?: string[]
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
    source,
    manifest,
    // Default: mask transcript_artifacts (usually egregious nonsense / repeated garbage).
    // Low-quality segment flags are more subjective, so keep them unless explicitly enabled.
    maskTranscriptArtifacts: !flags.has("--no-mask-transcript-artifacts"),
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

// ---------------------------------------------------------------------------
// Quality assessment
// ---------------------------------------------------------------------------

const PROBLEMATIC_SPEAKER_ROLES = ["collapsed", "mixed/unclear", "unknown"]
const MIN_SPEAKER_CONFIDENCE = 0.7

type AsrQualityIndex = {
  lowQualityIds: Set<number>
  transcriptArtifactIds: Set<number>
  transcriptArtifactTypesById: Map<number, Set<string>>
}

function buildAsrQualityIndex(file: EnrichedFile): AsrQualityIndex {
  const lowQualityIds = new Set<number>()
  const transcriptArtifactIds = new Set<number>()
  const transcriptArtifactTypesById = new Map<number, Set<string>>()

  for (const lq of file.low_quality_segments ?? []) {
    const segId = lq?.segment
    if (typeof segId === "number" && Number.isFinite(segId)) lowQualityIds.add(segId)
  }

  for (const art of file.transcript_artifacts ?? []) {
    const segId = art?.segment_index
    if (typeof segId !== "number" || !Number.isFinite(segId)) continue
    transcriptArtifactIds.add(segId)

    const t = typeof art?.artifact_type === "string" ? art.artifact_type.trim() : ""
    if (!t) continue
    const set = transcriptArtifactTypesById.get(segId) ?? new Set<string>()
    set.add(t)
    transcriptArtifactTypesById.set(segId, set)
  }

  return { lowQualityIds, transcriptArtifactIds, transcriptArtifactTypesById }
}

function collectAsrStats(
  segments: ContentSegment[],
  asr: AsrQualityIndex | null
): {
  lowQualityCount: number
  transcriptArtifactCount: number
  transcriptArtifactTypes: string[]
} {
  if (!asr) return { lowQualityCount: 0, transcriptArtifactCount: 0, transcriptArtifactTypes: [] }

  let lowQualityCount = 0
  let transcriptArtifactCount = 0
  const types = new Set<string>()

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
    }
  }

  return {
    lowQualityCount,
    transcriptArtifactCount,
    transcriptArtifactTypes: Array.from(types).sort((a, b) => a.localeCompare(b)),
  }
}

const CHUNK_CONFIDENCE_VERSION = 1

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function computeChunkConfidence(chunk: InternalChunk): number {
  // Heuristic only: this is meant for downranking, not as a hard gate.
  let conf = 1.0

  if (chunk.type !== "INTERACTION") conf *= 0.9

  if (typeof chunk.phaseConfidence === "number") {
    const pc = clamp01(chunk.phaseConfidence)
    conf *= Math.max(0.3, pc)
  }

  const probs = chunk.problematicReason ?? []
  if (probs.some((r) => r.startsWith("speaker_role:"))) conf *= 0.85
  if (probs.some((r) => r.startsWith("low_speaker_conf:"))) conf *= 0.9

  if ((chunk.asrTranscriptArtifactCount ?? 0) > 0) conf *= 0.75
  if ((chunk.asrLowQualitySegmentCount ?? 0) > 0) conf *= 0.85

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
  topics?: string[]
): string {
  const parts: string[] = []

  if (phase && phase !== "unknown") {
    parts.push(`[PHASE: ${phase}]`)
  }

  if (techniques && techniques.length > 0) {
    parts.push(`[TECH: ${techniques.join(", ")}]`)
  }

  if (topics && topics.length > 0) {
    parts.push(`[TOPIC: ${topics.join(", ")}]`)
  }

  return parts.length > 0 ? parts.join(" ") + "\n" : ""
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

          if (asrStats.lowQualityCount > 0) {
            chunkProblems.push("asr_low_quality")
          }
          if (asrStats.transcriptArtifactTypes.length > 0) {
            for (const t of asrStats.transcriptArtifactTypes) {
              chunkProblems.push(`asr_transcript_artifact:${t}`)
            }
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
            problematicReason: chunkProblems.length > 0 ? [...new Set(chunkProblems)] : undefined,
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

      if (asrStats.lowQualityCount > 0) {
        chunkProblems.push("asr_low_quality")
      }
      if (asrStats.transcriptArtifactTypes.length > 0) {
        for (const t of asrStats.transcriptArtifactTypes) {
          chunkProblems.push(`asr_transcript_artifact:${t}`)
        }
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
        problematicReason: chunkProblems.length > 0 ? [...new Set(chunkProblems)] : undefined,
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
 * Assesses all source segments for quality issues - if any segment is problematic,
 * all chunks from this block are flagged (conservative approach for non-phase-aligned content).
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

  // Assess all segments that contributed to this text block
  const problems = assessSegmentsForProblems(segments, speakerLabels)
  const asrStats = collectAsrStats(segments, asrIndex)

  if (asrStats.lowQualityCount > 0) {
    problems.push("asr_low_quality")
  }
  if (asrStats.transcriptArtifactTypes.length > 0) {
    for (const t of asrStats.transcriptArtifactTypes) {
      problems.push(`asr_transcript_artifact:${t}`)
    }
  }

  const startSec = Math.min(
    ...segments.map((s) => (typeof s.start === "number" ? s.start : Number.POSITIVE_INFINITY))
  )
  const endSec = Math.max(
    ...segments.map((s) => (typeof s.end === "number" ? s.end : Number.NEGATIVE_INFINITY))
  )

  const parts = splitTextBySize(text, maxSize, overlap)
  return parts.map((content, idx) => ({
    content,
    type: "COMMENTARY" as SegmentType,
    chunkIndex: idx,
    totalChunks: parts.length,
    techniques,
    topics,
    startSec: Number.isFinite(startSec) ? startSec : undefined,
    endSec: Number.isFinite(endSec) ? endSec : undefined,
    asrLowQualitySegmentCount: asrStats.lowQualityCount || undefined,
    asrTranscriptArtifactCount: asrStats.transcriptArtifactCount || undefined,
    asrTranscriptArtifactTypes: asrStats.transcriptArtifactTypes.length > 0 ? asrStats.transcriptArtifactTypes : undefined,
    problematicReason: problems.length > 0 ? [...new Set(problems)] : undefined,
  }))
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
  // Example: data/06c.patched/<channel>/<stem>.conversations.json
  const m = normalized.match(
    /data\/(?:06c\.patched|06\.video-type|06b\.verify|07\.content|05\.audio-features)\/([^/]+)\//
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
  const args = parseArgs(process.argv.slice(2))

  loadEnvFile(path.join(process.cwd(), ".env.local"))

  const { QA_CONFIG } = await import("../../src/qa/config")

  const enrichedDir = path.join(process.cwd(), "data", "07.content")
  const chunksDir = path.join(process.cwd(), "data", "09.chunks")

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
    console.log(`No .enriched.json files found under ${args.source ?? "data/07.content/"}`)
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

  for (const filePath of enrichedFiles) {
    const relEnrichedPath = path.relative(enrichedDir, filePath)
    const relParts = relEnrichedPath.split(path.sep).filter(Boolean)
    const channelCandidate = relParts.length > 1 ? relParts[0] : null
    const videoStem = normalizeVideoStemFromEnrichedFilename(filePath)

    if (manifestAllowList && channelCandidate) {
      const vidFromFilename = extractVideoIdFromText(videoStem) || extractVideoIdFromText(relEnrichedPath)
      const allowed = vidFromFilename ? manifestAllowList.get(channelCandidate) : null
      if (!allowed || !vidFromFilename || !allowed.has(vidFromFilename)) {
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
      extractVideoIdFromText(videoStem) ||
      extractVideoIdFromText(relEnrichedPath)

    if (!videoId) {
      skippedNoVideoId++
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
  for (const cand of Array.from(bestByKey.values()).sort((a, b) => a.sourceKey.localeCompare(b.sourceKey))) {
    const prev = state.sources[cand.sourceKey]
    const isUnchanged = !force && prev?.enrichedHash === cand.fileHash
    if (isUnchanged) {
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
  console.log(`Unchanged:    ${unchanged}`)
  console.log(`To process:   ${toProcess.length}${force ? " (forced)" : ""}`)
  if (deduped > 0) console.log(`Deduped:      ${deduped} duplicate enriched artifact(s)`)
  if (skippedBadJson > 0) console.log(`Skipped:      ${skippedBadJson} unreadable JSON file(s)`)
  if (skippedNoVideoId > 0) console.log(`Skipped:      ${skippedNoVideoId} file(s) missing video_id`)
  if (skippedNoContent > 0) console.log(`Skipped:      ${skippedNoContent} file(s) with no content`)
  if (skippedNotInManifest > 0) console.log(`Skipped:      ${skippedNotInManifest} file(s) not in manifest`)
  console.log(`Chunk size:   ${chunkSize}`)
  console.log(`Overlap:      ${chunkOverlap}`)
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
      for (const id of asrIndex.transcriptArtifactIds) maskedSegmentIds.add(id)
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

    // Process approach enrichments via phase-based chunking
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

      if (phaseChunks.length > 0) {
        for (let i = 0; i < phaseChunks.length; i++) {
          phaseChunks[i].conversationChunkIndex = i + 1
          phaseChunks[i].conversationChunkTotal = phaseChunks.length
        }
        internalChunks.push(...phaseChunks)
      }
    }

    // Process commentary blocks via simple text chunking
    const commentaryBlocks = groupCommentaryBlocks(fileSegments)
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
      internalChunks.push(...commentaryChunks)
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
      internalChunks.push(...sectionChunks)
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
      chunk.chunkConfidence = computeChunkConfidence(chunk)
      chunk.chunkConfidenceVersion = CHUNK_CONFIDENCE_VERSION
      return chunk
    })

    // Generate embeddings
    console.log(`   📊 Generating ${normalizedChunks.length} embeddings...`)
    const chunks: Chunk[] = []

    for (let i = 0; i < normalizedChunks.length; i++) {
      const chunk = normalizedChunks[i]

      // Build metadata prefix for semantic matching
      const prefix = buildMetadataPrefix(chunk.phase, chunk.techniques, chunk.topics)
      const contentWithPrefix = prefix + chunk.content

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
      if (chunk.chunkConfidence !== undefined) {
        metadata.chunkConfidence = chunk.chunkConfidence
      }
      if (chunk.chunkConfidenceVersion !== undefined) {
        metadata.chunkConfidenceVersion = chunk.chunkConfidenceVersion
      }
      if (chunk.problematicReason && chunk.problematicReason.length > 0) {
        metadata.problematicReason = chunk.problematicReason
      }

      chunks.push({
        content: contentWithPrefix,
        embedding,
        metadata,
      })

      if ((i + 1) % 25 === 0 || i + 1 === normalizedChunks.length) {
        console.log(`   - Embedded ${i + 1}/${normalizedChunks.length}`)
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
