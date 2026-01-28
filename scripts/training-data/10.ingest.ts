/**
 * scripts/training-data/10.ingest.ts
 *
 * Ingest training data into the vector store (Supabase embeddings).
 *
 * Reads:
 *   - Transcript .txt files:
 *       data/02.transcribe/**\/*.txt
 *   - Enriched ground-truth JSON files (from step 09.enrich):
 *       data/09.enrich/**\/*.enriched.json
 *
 * Writes:
 *   - Supabase embeddings (via `storeEmbeddings`)
 *   - Local incremental state:
 *       data/.ingest_state.json
 *       data/.ingest_state.interactions.json
 *
 * Use:
 *   # enriched interactions (default)
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts
 *
 *   # transcripts
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --mode transcripts
 *
 *   # utilities
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --dry-run
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --verify
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --full
 *
 * Environment:
 *   - Loads `.env.local` (if present)
 *   - Uses `src/qa/config` + Supabase env vars (see `src/db/server`)
 *
 * Note:
 *   - Interactions mode ingests from `data/09.enrich` (step 09 output).
 */

import fs from "fs"
import fsp from "fs/promises"
import path from "path"
import crypto from "crypto"

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
  mode: "transcripts" | "interactions"
}

function parseArgs(argv: string[]): Args {
  const flags = new Set(argv)
  let mode: Args["mode"] = "interactions"

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--interactions") mode = "interactions"
    if (arg.startsWith("--mode=")) {
      const value = arg.split("=", 2)[1]
      if (value === "transcripts" || value === "interactions") mode = value
    }
    if (arg === "--mode") {
      const value = argv[i + 1]
      if (value === "transcripts" || value === "interactions") mode = value
    }
  }
  return {
    force: flags.has("--full") || flags.has("--force"),
    dryRun: flags.has("--dry-run"),
    verifyOnly: flags.has("--verify"),
    mode,
  }
}

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

async function listTxtFiles(rootDir: string): Promise<string[]> {
  const out: string[] = []

  async function walk(dir: string) {
    const dirents = await fsp.readdir(dir, { withFileTypes: true })
    for (const dirent of dirents) {
      const full = path.join(dir, dirent.name)
      if (dirent.isDirectory()) {
        await walk(full)
      } else if (dirent.isFile() && full.endsWith(".txt")) {
        out.push(full)
      }
    }
  }

  await walk(rootDir)
  return out.sort((a, b) => a.localeCompare(b))
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

type SegmentType = "INTERACTION" | "EXPLANATION" | "UNKNOWN"

type Chunk = {
  content: string
  type: SegmentType
  chunkIndex: number
  totalChunks: number
  // New fields for phase-based chunking
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

function classifySegmentType(text: string): SegmentType {
  const lower = text.toLowerCase()

  const interactionSignals = [
    /\byou\b.*\?/, // questions to her
    /\byou\b.*!/, // direct statements
    /^(so|well|okay|look|hey|alright)/i,
    /\bthat'?s\s+(cool|nice|cute|amazing|interesting|funny)/i,
    /what (do|are|have|can|would).*you/i,
  ]

  const explanationSignals = [
    /\b(see|notice|watch|observe)\s+(how|what)/i,
    /\b(this|that|what|the reason)\s+(is|was|shows|demonstrates)/i,
    /\b(because|so that|in order to|the point is)/i,
    /\bshowed?\s+(her|him|them)\b/i,
    /\byou\s+(can|should|might|could)\b/i,
    /\bthe key\b/i,
    /notice how/i,
  ]

  const interactionScore = interactionSignals.filter((sig) => sig.test(lower)).length
  const explanationScore = explanationSignals.filter((sig) => sig.test(lower)).length

  if (interactionScore > explanationScore && interactionScore > 0) return "INTERACTION"
  if (explanationScore > interactionScore && explanationScore > 0) return "EXPLANATION"
  return "UNKNOWN"
}

function splitOverlongUnit(unit: string, maxChunkSize: number): string[] {
  const trimmed = unit.trim()
  if (!trimmed) return []
  if (trimmed.length <= maxChunkSize) return [trimmed]

  const out: string[] = []
  let remaining = trimmed

  while (remaining.length > maxChunkSize) {
    // Prefer splitting on whitespace near the boundary for readability.
    const window = remaining.slice(0, maxChunkSize + 1)
    let splitAt = window.lastIndexOf(" ")

    // If whitespace is too far back (tiny chunk), hard-split.
    if (splitAt < Math.floor(maxChunkSize * 0.7)) splitAt = -1
    if (splitAt === -1) splitAt = maxChunkSize

    const head = remaining.slice(0, splitAt).trim()
    if (head) out.push(head)
    remaining = remaining.slice(splitAt).trim()
  }

  if (remaining) out.push(remaining)
  return out
}

function splitTranscriptIntoUnits(text: string, maxChunkSize: number): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim()
  if (!normalized) return []

  // Whisper .txt transcripts often have no punctuation but do have line breaks.
  // Split on newlines first, then on sentence-ending punctuation within a line.
  const rawLines = normalized.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const units: string[] = []

  for (const line of rawLines.length > 0 ? rawLines : [normalized]) {
    const parts = line.split(/(?<=[.!?])\s+/).map((p) => p.trim()).filter(Boolean)
    for (const part of parts.length > 0 ? parts : [line]) {
      units.push(...splitOverlongUnit(part, maxChunkSize))
    }
  }

  return units
}

function segmentTranscriptLegacy(text: string, maxChunkSize: number, overlapSize: number) {
  const sentences = text.split(/(?<=[.!?\n])\s+/)

  const segments: Array<{ content: string; type: SegmentType }> = []
  let currentSegment = ""
  let currentType: SegmentType = "UNKNOWN"

  for (const sentence of sentences) {
    const sentenceType = classifySegmentType(sentence)

    const isTypeChange =
      currentType !== "UNKNOWN" && sentenceType !== "UNKNOWN" && currentType !== sentenceType

    const potentialContent = currentSegment + (currentSegment ? " " : "") + sentence

    if ((isTypeChange || potentialContent.length > maxChunkSize) && currentSegment.length > 0) {
      segments.push({ content: currentSegment.trim(), type: currentType })

      const overlapStart = Math.max(0, currentSegment.length - overlapSize)
      currentSegment = currentSegment.slice(overlapStart).trim() + " " + sentence
      currentType = sentenceType !== "UNKNOWN" ? sentenceType : currentType
    } else {
      currentSegment = potentialContent
      if (sentenceType !== "UNKNOWN" && currentType === "UNKNOWN") {
        currentType = sentenceType
      }
    }
  }

  if (currentSegment.trim().length > 0) {
    segments.push({ content: currentSegment.trim(), type: currentType })
  }

  return segments
}

function segmentTranscript(text: string, maxChunkSize: number, overlapSize: number) {
  // Back-compat: keep the previous chunking output when it already produces valid chunk sizes,
  // to avoid unnecessary full re-ingests. Fall back to a more robust line-aware chunker when
  // transcripts lack punctuation (common for Whisper .txt) or contain very long "sentences".
  const legacy = segmentTranscriptLegacy(text, maxChunkSize, overlapSize)
  const legacyMaxLen = legacy.reduce((m, s) => Math.max(m, s.content.length), 0)
  if (legacy.length > 0 && legacyMaxLen <= maxChunkSize) {
    return legacy
  }

  const units = splitTranscriptIntoUnits(text, maxChunkSize)

  const segments: Array<{ content: string; type: SegmentType }> = []
  let currentSegment = ""
  let currentType: SegmentType = "UNKNOWN"

  for (const unit of units) {
    const unitType = classifySegmentType(unit)

    const isTypeChange =
      currentType !== "UNKNOWN" && unitType !== "UNKNOWN" && currentType !== unitType

    const joiner = "\n"
    const potentialContent = currentSegment + (currentSegment ? joiner : "") + unit

    if ((isTypeChange || potentialContent.length > maxChunkSize) && currentSegment.length > 0) {
      segments.push({ content: currentSegment.trim(), type: currentType })

      // Ensure the overlap + next unit never exceeds the max chunk size.
      const allowedOverlap = Math.min(
        overlapSize,
        Math.max(0, maxChunkSize - joiner.length - unit.length)
      )
      const overlapStart = Math.max(0, currentSegment.length - allowedOverlap)
      const overlapText = currentSegment.slice(overlapStart).trim()
      currentSegment = overlapText ? overlapText + joiner + unit : unit
      currentType = unitType !== "UNKNOWN" ? unitType : currentType
    } else {
      currentSegment = potentialContent
      if (unitType !== "UNKNOWN" && currentType === "UNKNOWN") {
        currentType = unitType
      }
    }
  }

  if (currentSegment.trim().length > 0) {
    segments.push({ content: currentSegment.trim(), type: currentType })
  }

  return segments
}

function segmentsToChunks(segments: Array<{ content: string; type: SegmentType }>): Chunk[] {
  return segments.map((seg, index) => ({
    content: seg.content,
    type: seg.type,
    chunkIndex: index,
    totalChunks: segments.length,
  }))
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

async function main() {
  const args = parseArgs(process.argv.slice(2))

  loadEnvFile(path.join(process.cwd(), ".env.local"))

  const { QA_CONFIG } = await import("../../src/qa/config")

  const transcriptsDir = path.join(process.cwd(), "data", "02.transcribe")
  const enrichedDir = path.join(process.cwd(), "data", "09.enrich")

  const chunkSize = QA_CONFIG.rag.chunkSize
  const chunkOverlap = QA_CONFIG.rag.chunkOverlap
  const embeddingModel = QA_CONFIG.ollama.embeddingModel

  const statePath = path.join(
    process.cwd(),
    "data",
    args.mode === "interactions" ? ".ingest_state.interactions.json" : ".ingest_state.json"
  )
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

  const toIngest: Array<{ source: string; chunks: Chunk[]; hash: string }> = []
  let unchanged = 0

  if (args.mode === "transcripts") {
    if (!fs.existsSync(transcriptsDir)) {
      console.error(`❌ Missing directory: ${transcriptsDir}`)
      process.exit(1)
    }

    const transcriptFiles = await listTxtFiles(transcriptsDir)
    if (transcriptFiles.length === 0) {
      console.log("No transcript .txt files found under data/02.transcribe")
      return
    }

    for (const filePath of transcriptFiles) {
      const relSource = path.relative(transcriptsDir, filePath)
      const content = await fsp.readFile(filePath, "utf-8")

      const segments = segmentTranscript(content, chunkSize, chunkOverlap)
      const chunks = segmentsToChunks(segments)
      const hash = hashChunks(chunks)

      const prev = state.sources[relSource]
      const isUnchanged = !force && prev?.hash === hash && prev?.chunkCount === chunks.length

      if (isUnchanged) {
        unchanged++
        continue
      }

      toIngest.push({ source: relSource, chunks, hash })
    }
  } else {
    if (!fs.existsSync(enrichedDir)) {
      console.error(`❌ Missing directory: ${enrichedDir}`)
      process.exit(1)
    }

    const enrichedFiles = await listJsonlFiles(enrichedDir, ".enriched.json")
    if (enrichedFiles.length === 0) {
      console.log("No .enriched.json files found under data/09.enrich")
      return
    }

    function mapSpeakerLabel(raw?: string): string {
      const s = (raw ?? "").toLowerCase().trim()
      if (s === "coach") return "Coach"
      if (s === "target") return "Girl"
      if (s === "voiceover") return "Voiceover"
      if (s === "ambiguous") return "Ambiguous"
      return "Unknown"
    }

    function formatInteraction(row: InteractionJsonlRow): string {
      const start = typeof row.start_time === "number" ? row.start_time.toFixed(1) : ""
      const end = typeof row.end_time === "number" ? row.end_time.toFixed(1) : ""
      const outcomeStr = row.outcome && row.outcome !== "unknown" ? ` [${row.outcome}]` : ""
      const header = start && end ? `Interaction (${start}s–${end}s)${outcomeStr}` : `Interaction${outcomeStr}`
      const lines = (row.turns ?? [])
        .filter((t) => typeof t.text === "string" && t.text.trim().length > 0)
        .map((t) => `${mapSpeakerLabel(t.speaker)}: ${String(t.text).trim()}`)
      return [header, ...lines].join("\n")
    }

    /**
     * Phase-based chunking: group turns by phase, creating one chunk per phase
     * This respects conversation boundaries and semantic structure.
     */
    function chunkInteractionByPhase(row: InteractionJsonlRow, maxChunkSize: number): Chunk[] {
      const chunks: Chunk[] = []
      const turns = row.turns ?? []

      if (turns.length === 0) return chunks

      // Group turns by phase
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

        // Collect techniques and topics from semantic tags
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

      // Create chunks from phase groups
      for (const group of phaseGroups) {
        let content = ""
        for (const turn of group.turns) {
          const speaker = mapSpeakerLabel(turn.speaker)
          const text = (turn.text ?? "").trim()
          if (text) {
            const line = `${speaker}: ${text}`
            if (content.length + line.length + 1 > maxChunkSize && content.length > 0) {
              // Split large phase groups
              chunks.push({
                content: content.trim(),
                type: "INTERACTION",
                chunkIndex: chunks.length,
                totalChunks: 0, // Will be normalized later
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

    type EnrichedFile = {
      source?: string
      video_title?: string
      interactions?: EnrichedInteraction[]
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

    for (const filePath of enrichedFiles) {
      const relEnrichedPath = path.relative(enrichedDir, filePath)
      const channel = relEnrichedPath.split(path.sep).filter(Boolean)[0] ?? "unknown"
      const videoStem = normalizeVideoStemFromEnrichedFilename(filePath)
      // Store under a stable per-video source key for DB lookups.
      const sourceKey = path.join(channel, `${videoStem}.txt`)

      const raw = await fsp.readFile(filePath, "utf-8")
      const interactionChunks: Chunk[] = []

      let parsedFile: EnrichedFile | null = null
      try {
        parsedFile = JSON.parse(raw)
      } catch {
        continue
      }

      const interactions = parsedFile?.interactions
      if (!Array.isArray(interactions) || interactions.length === 0) {
        continue
      }

      for (let i = 0; i < interactions.length; i++) {
        const interaction = interactions[i]
        if (!interaction || typeof interaction !== "object") continue

        const row: InteractionJsonlRow = {
          id:
            typeof interaction.original_id === "string"
              ? interaction.original_id
              : typeof interaction.id === "string"
                ? interaction.id
                : `interaction_${i + 1}`,
          conversation_id:
            typeof interaction.conversation_id === "number" ? interaction.conversation_id : i + 1,
          source_video: parsedFile?.video_title ?? videoStem,
          start_time: typeof interaction.start_time === "number" ? interaction.start_time : undefined,
          end_time: typeof interaction.end_time === "number" ? interaction.end_time : undefined,
          outcome: typeof interaction.outcome === "string" ? interaction.outcome : undefined,
          techniques: extractTechniqueNames(interaction.techniques_used),
          topics: extractStringArray(interaction.topics_discussed),
          turns: Array.isArray(interaction.turns) ? interaction.turns : [],
        }

        // Use phase-based chunking for better semantic structure
        const phaseChunks = chunkInteractionByPhase(row, chunkSize)

        if (phaseChunks.length > 0) {
          interactionChunks.push(...phaseChunks)
        } else {
          // Fallback to simple formatting for interactions without turns
          const formatted = formatInteraction(row)
          if (formatted.length < 20) continue

          const segments = segmentTranscript(formatted, chunkSize, chunkOverlap)
          const chunks = segmentsToChunks(
            segments.map((seg) => ({ ...seg, type: "INTERACTION" as const }))
          )
          interactionChunks.push(...chunks)
        }
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

      toIngest.push({ source: sourceKey, chunks: normalizedChunks, hash })
    }
  }

  console.log("================================")
  console.log("🧠 TRAINING DATA INGEST")
  console.log("================================")
  console.log(`Mode:         ${args.mode}`)
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
    const { source, chunks, hash } = item

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

      // Build metadata with new phase-based fields
      const metadata: Record<string, unknown> = {
        channel,
        coach: channel,
        video_title: videoTitle,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        segmentType: chunk.type,
        isRealExample: chunk.type === "INTERACTION",
      }

      // Add phase-based metadata if available
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
