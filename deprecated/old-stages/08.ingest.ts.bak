/**
 * scripts/training-data/08.ingest.ts
 *
 * Ingest training data into the vector store (Supabase embeddings).
 *
 * Reads:
 *   - Enriched content files (from step 07.content):
 *       data/07.content/**\/*.enriched.json
 *
 * Writes:
 *   - Supabase embeddings (via `storeEmbeddings`)
 *   - Local incremental state:
 *       data/.ingest_state.json
 *
 * Use:
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/08.ingest.ts
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/08.ingest.ts --source daily_evolution
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/08.ingest.ts --dry-run
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/08.ingest.ts --verify
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/08.ingest.ts --full
 *
 * Environment:
 *   - Loads `.env.local` (if present)
 *   - Uses `src/qa/config` + Supabase env vars (see `src/db/server`)
 *
 * Note:
 *   - Commentary and talking_head sections are chunked separately with
 *     segmentType="COMMENTARY" and isRealExample=false.
 *
 * Migration:
 *   If upgrading from 09.ingest.ts, the script auto-migrates
 *   data/.ingest_state.interactions.json -> data/.ingest_state.json
 *   to preserve incremental state.
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
  embeddingModel: string
  chunkSize: number
  chunkOverlap: number
  sources: Record<
    string,
    {
      hash: string
      chunkCount: number
      updatedAt: string
    }
  >
}

type Args = {
  force: boolean
  dryRun: boolean
  verifyOnly: boolean
  source: string | null
}

type SegmentType = "INTERACTION" | "EXPLANATION" | "COMMENTARY" | "UNKNOWN"

type Chunk = {
  content: string
  type: SegmentType
  chunkIndex: number
  totalChunks: number
  conversationId?: number
  phase?: string
  techniques?: string[]
  topics?: string[]
}

type InteractionJsonlRow = {
  id?: string
  conversation_id?: number
  source_video?: string
  start_time?: number
  end_time?: number
  outcome?: string
  content_summary?: string
  techniques?: string[]
  topics?: string[]
  turns?: Array<{
    speaker?: string
    text?: string
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

type EnrichedInteraction = {
  id?: unknown
  original_id?: unknown
  conversation_id?: number
  start_time?: number
  end_time?: number
  outcome?: string
  topics_discussed?: unknown
  techniques_used?: unknown
  turns?: InteractionJsonlRow["turns"]
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
}

type ContentEnrichment = {
  type?: string // "approach" | "commentary" | "talking_head_section"
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
}

type EnrichedFile = {
  video_id?: string
  video_title?: string
  video_type?: { type?: string }
  segments?: ContentSegment[]
  enrichments?: ContentEnrichment[]
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

function hashChunks(chunks: Chunk[]): string {
  const h = crypto.createHash("sha256")
  for (const chunk of chunks) {
    h.update(chunk.content)
    h.update("\n---\n")
  }
  return h.digest("hex")
}

async function loadState(statePath: string, defaults: Pick<IngestStateV1, "embeddingModel" | "chunkSize" | "chunkOverlap">): Promise<IngestStateV1> {
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
      embeddingModel: defaults.embeddingModel,
      chunkSize: defaults.chunkSize,
      chunkOverlap: defaults.chunkOverlap,
      sources: {},
    }
  }
}

async function saveState(statePath: string, state: IngestStateV1): Promise<void> {
  await fsp.mkdir(path.dirname(statePath), { recursive: true })
  await fsp.writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf-8")
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Chunking helpers
// ---------------------------------------------------------------------------

function mapSpeakerLabel(raw?: string): string {
  const s = (raw ?? "").toLowerCase().trim()
  if (s === "coach") return "Coach"
  if (s === "target") return "Girl"
  if (s === "voiceover") return "Voiceover"
  if (s === "ambiguous") return "Ambiguous"
  return "Unknown"
}

/**
 * Phase-based chunking: group turns by phase, creating one chunk per phase.
 * This respects conversation boundaries and semantic structure.
 */
function chunkInteractionByPhase(row: InteractionJsonlRow, maxChunkSize: number): Chunk[] {
  const chunks: Chunk[] = []
  const turns = row.turns ?? []

  if (turns.length === 0) return chunks

  type PhaseGroup = {
    phase: string
    turns: typeof turns
    techniques: string[]
    topics: string[]
  }

  const phaseGroups: PhaseGroup[] = []
  let currentGroup: PhaseGroup | null = null

  for (const turn of turns) {
    const phase = turn.phase || turn.semantic_tags?.phase || "unknown"

    if (!currentGroup || currentGroup.phase !== phase) {
      if (currentGroup) {
        phaseGroups.push(currentGroup)
      }
      currentGroup = {
        phase,
        turns: [],
        techniques: [...new Set(row.techniques ?? [])],
        topics: [...new Set(row.topics ?? [])],
      }
    }

    currentGroup.turns.push(turn)

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
    for (const turn of group.turns) {
      const speaker = mapSpeakerLabel(turn.speaker)
      const text = (turn.text ?? "").trim()
      if (text) {
        const line = `${speaker}: ${text}`
        if (content.length + line.length + 1 > maxChunkSize && content.length > 0) {
          chunks.push({
            content: content.trim(),
            type: "INTERACTION",
            chunkIndex: chunks.length,
            totalChunks: 0, // normalized later
            conversationId: row.conversation_id,
            phase: group.phase,
            techniques: Array.from(new Set(group.techniques)),
            topics: Array.from(new Set(group.topics)),
          })
          content = ""
        }
        content += (content ? "\n" : "") + line
      }
    }

    if (content.trim()) {
      chunks.push({
        content: content.trim(),
        type: "INTERACTION",
        chunkIndex: chunks.length,
        totalChunks: 0,
        conversationId: row.conversation_id,
        phase: group.phase,
        techniques: [...new Set(group.techniques)],
        topics: [...new Set(group.topics)],
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
 * Replaces the old regex-based segmentTranscript for commentary text.
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
 * Uses plain text chunking (not phase-based).
 */
function chunkCommentaryText(
  text: string,
  techniques: string[],
  topics: string[],
  maxSize: number,
  overlap: number,
): Chunk[] {
  if (text.length < 20) return []

  const parts = splitTextBySize(text, maxSize, overlap)
  return parts.map((content, idx) => ({
    content,
    type: "COMMENTARY" as SegmentType,
    chunkIndex: idx,
    totalChunks: parts.length,
    techniques,
    topics,
  }))
}

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

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
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2))

  loadEnvFile(path.join(process.cwd(), ".env.local"))

  const { QA_CONFIG } = await import("../../src/qa/config")

  const enrichedDir = path.join(process.cwd(), "data", "07.content")

  const chunkSize = QA_CONFIG.rag.chunkSize
  const chunkOverlap = QA_CONFIG.rag.chunkOverlap
  const embeddingModel = QA_CONFIG.ollama.embeddingModel

  const statePath = path.join(process.cwd(), "data", ".ingest_state.json")

  // Auto-migrate from old state file name (09.ingest.ts used a different path)
  const oldStatePath = path.join(process.cwd(), "data", ".ingest_state.interactions.json")
  if (!fs.existsSync(statePath) && fs.existsSync(oldStatePath)) {
    console.log("Migrating state file: .ingest_state.interactions.json -> .ingest_state.json")
    fs.renameSync(oldStatePath, statePath)
  }

  const state = await loadState(statePath, { embeddingModel, chunkSize, chunkOverlap })

  let force = args.force
  if (
    state.embeddingModel !== embeddingModel ||
    state.chunkSize !== chunkSize ||
    state.chunkOverlap !== chunkOverlap
  ) {
    console.log("⚠️  Ingest settings changed since last run; forcing full re-ingest.")
    force = true
    state.embeddingModel = embeddingModel
    state.chunkSize = chunkSize
    state.chunkOverlap = chunkOverlap
  }

  // If --source provided, only scan that subdirectory
  const scanDir = args.source
    ? path.join(enrichedDir, args.source)
    : enrichedDir

  if (!fs.existsSync(scanDir)) {
    console.error(`❌ Missing directory: ${scanDir}`)
    process.exit(1)
  }

  const enrichedFiles = await listJsonlFiles(scanDir, ".enriched.json")
  if (enrichedFiles.length === 0) {
    console.log(`No .enriched.json files found under ${scanDir}`)
    return
  }

  const toIngest: Array<{ source: string; chunks: Chunk[]; hash: string; videoType?: string }> = []
  let unchanged = 0

  for (const filePath of enrichedFiles) {
    const relEnrichedPath = path.relative(enrichedDir, filePath)
    const channel = relEnrichedPath.split(path.sep).filter(Boolean)[0] ?? "unknown"
    const videoStem = normalizeVideoStemFromEnrichedFilename(filePath)
    const sourceKey = path.join(channel, `${videoStem}.txt`)

    const raw = await fsp.readFile(filePath, "utf-8")
    const interactionChunks: Chunk[] = []

    let parsedFile: EnrichedFile | null = null
    try {
      parsedFile = JSON.parse(raw)
    } catch {
      continue
    }

    const fileVideoType = extractVideoType(parsedFile?.video_type)
    const fileSegments = parsedFile?.segments
    const fileEnrichments = parsedFile?.enrichments

    const hasContent =
      Array.isArray(fileSegments) &&
      Array.isArray(fileEnrichments) &&
      fileEnrichments.length > 0

    if (!hasContent) {
      continue
    }

    // Process approach enrichments via phase-based chunking
    const approachEnrichments = fileEnrichments!.filter((e) => e.type === "approach")
    for (const enrichment of approachEnrichments) {
      const convId = enrichment.conversation_id
      if (convId === undefined) continue

      const convSegments = fileSegments!.filter((s) => s.conversation_id === convId)
      if (convSegments.length === 0) continue

      const phaseMap = new Map<number, string>()
      for (const tp of enrichment.turn_phases ?? []) {
        if (tp.segment !== undefined && tp.phase) {
          phaseMap.set(tp.segment, tp.phase)
        }
      }

      const turns: InteractionJsonlRow["turns"] = convSegments.map((seg, idx) => ({
        speaker: seg.speaker_role ?? seg.speaker_id ?? "unknown",
        text: seg.text ?? "",
        start: seg.start,
        end: seg.end,
        phase: phaseMap.get(idx),
      }))

      const row: InteractionJsonlRow = {
        id: `approach_${convId}`,
        conversation_id: convId,
        source_video: parsedFile?.video_title ?? parsedFile?.video_id ?? videoStem,
        start_time: convSegments[0]?.start,
        end_time: convSegments[convSegments.length - 1]?.end,
        techniques: extractTechniqueNames(enrichment.techniques_used),
        topics: extractStringArray(enrichment.topics_discussed),
        turns,
      }

      const phaseChunks = chunkInteractionByPhase(row, chunkSize)
      if (phaseChunks.length > 0) {
        interactionChunks.push(...phaseChunks)
      }
      // No fallback — if phase chunking yields 0 chunks, the approach has no valid turns
    }

    // Process commentary blocks via simple text chunking
    const commentaryBlocks = groupCommentaryBlocks(fileSegments!)
    const commentaryEnrichments = fileEnrichments!.filter((e) => e.type === "commentary")

    for (let blockIdx = 0; blockIdx < commentaryBlocks.length; blockIdx++) {
      const block = commentaryBlocks[blockIdx]
      const text = block
        .map((seg) => {
          const speaker = mapSpeakerLabel(seg.speaker_role ?? seg.speaker_id)
          return `${speaker}: ${(seg.text ?? "").trim()}`
        })
        .filter((line) => line.length > 2)
        .join("\n")

      const enrichment = commentaryEnrichments.find(
        (e) => e.block_index === blockIdx + 1
      )
      const techniques = extractTechniqueNames(enrichment?.techniques_discussed)
      const topics = extractStringArray(enrichment?.topics_discussed)

      const commentaryChunks = chunkCommentaryText(
        text, techniques, topics, chunkSize, chunkOverlap
      )
      interactionChunks.push(...commentaryChunks)
    }

    // Process talking_head sections via simple text chunking
    const sectionEnrichments = fileEnrichments!.filter(
      (e) => e.type === "talking_head_section"
    )
    for (const section of sectionEnrichments) {
      const startSeg = section.start_segment ?? 0
      const endSeg = section.end_segment ?? (fileSegments!.length - 1)
      const sectionSegs = fileSegments!.filter(
        (seg) => (seg.id ?? 0) >= startSeg && (seg.id ?? 0) <= endSeg
      )

      const text = sectionSegs
        .map((seg) => {
          const speaker = mapSpeakerLabel(seg.speaker_role ?? seg.speaker_id)
          return `${speaker}: ${(seg.text ?? "").trim()}`
        })
        .filter((line) => line.length > 2)
        .join("\n")

      const techniques = extractTechniqueNames(section.techniques_discussed)
      const topics = extractStringArray(section.topics_discussed)

      const sectionChunks = chunkCommentaryText(
        text, techniques, topics, chunkSize, chunkOverlap
      )
      interactionChunks.push(...sectionChunks)
    }

    if (interactionChunks.length === 0) {
      continue
    }

    // Normalize chunkIndex/totalChunks across the whole video source.
    const normalizedChunks = interactionChunks.map((c, idx) => ({
      ...c,
      chunkIndex: idx,
      totalChunks: interactionChunks.length,
    }))

    const hash = hashChunks(normalizedChunks)
    const prev = state.sources[sourceKey]
    const isUnchanged =
      !force && prev?.hash === hash && prev?.chunkCount === normalizedChunks.length

    if (isUnchanged) {
      unchanged++
      continue
    }

    toIngest.push({ source: sourceKey, chunks: normalizedChunks, hash, videoType: fileVideoType })
  }

  console.log("================================")
  console.log("🧠 TRAINING DATA INGEST")
  console.log("================================")
  console.log(`Source:       ${args.source ?? "all"}`)
  console.log(`Unchanged:    ${unchanged}`)
  console.log(`To ingest:    ${toIngest.length}${force ? " (forced)" : ""}`)
  console.log(`Chunk size:   ${chunkSize}`)
  console.log(`Overlap:      ${chunkOverlap}`)
  console.log(`Model:        ${embeddingModel}`)
  console.log(`State file:   ${statePath}`)

  if (args.verifyOnly || args.dryRun) {
    console.log("")
    console.log(args.verifyOnly ? "✅ Verify-only: no DB writes." : "✅ Dry run: no DB writes.")
    return
  }

  if (toIngest.length === 0) {
    console.log("✅ Nothing to ingest.")
    return
  }

  const { storeEmbeddings, deleteEmbeddingsBySource } = await import("../../src/db/server")

  async function generateEmbedding(text: string): Promise<number[]> {
    const MAX_LENGTH = 8000
    const inputText = text.length > MAX_LENGTH ? text.substring(0, MAX_LENGTH) : text

    const response = await fetch(`${QA_CONFIG.ollama.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: embeddingModel, prompt: inputText }),
    })

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

  async function generateEmbeddingWithRetry(text: string, maxRetries = 3): Promise<number[]> {
    let lastError: unknown = null
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await generateEmbedding(text)
      } catch (err) {
        lastError = err
        if (attempt < maxRetries) {
          await sleep(1500)
        }
      }
    }
    throw lastError
  }

  for (const item of toIngest) {
    const { source, chunks, hash, videoType } = item

    const parts = source.split(path.sep)
    const channel = parts.length > 1 ? parts[0] : "unknown"
    const videoTitle = path.basename(source, ".txt")

    console.log("")
    console.log(`🔁 Ingesting: ${source} (${chunks.length} chunks)`)

    const rows = [] as Array<{
      content: string
      source: string
      embedding: number[]
      metadata: Record<string, unknown>
    }>

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = await generateEmbeddingWithRetry(chunk.content)

      const metadata: Record<string, unknown> = {
        channel,
        coach: channel,
        video_title: videoTitle,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        segmentType: chunk.type,
        isRealExample: chunk.type === "INTERACTION",
      }

      if (videoType) {
        metadata.video_type = videoType
      }

      if (chunk.conversationId !== undefined) {
        metadata.conversationId = chunk.conversationId
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

      rows.push({
        content: chunk.content,
        source,
        embedding,
        metadata,
      })

      if ((i + 1) % 25 === 0 || i + 1 === chunks.length) {
        console.log(`   - Embedded ${i + 1}/${chunks.length}`)
      }
    }

    console.log(`💾 Replacing embeddings for source: ${source}`)
    await deleteEmbeddingsBySource(source)
    await storeEmbeddings(rows)

    state.sources[source] = {
      hash,
      chunkCount: chunks.length,
      updatedAt: new Date().toISOString(),
    }
    await saveState(statePath, state)

    console.log(`✅ Done: ${source}`)
  }

  console.log("")
  console.log("🎉 Ingest complete!")
}

main().catch((err) => {
  console.error("Fatal error during ingest:", err)
  process.exit(1)
})
