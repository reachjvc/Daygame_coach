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
}

function parseArgs(argv: string[]): Args {
  const flags = new Set(argv)
  return {
    force: flags.has("--full") || flags.has("--force"),
    dryRun: flags.has("--dry-run"),
    verifyOnly: flags.has("--verify"),
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

type SegmentType = "INTERACTION" | "EXPLANATION" | "UNKNOWN"

type Chunk = {
  content: string
  type: SegmentType
  chunkIndex: number
  totalChunks: number
}

function classifySegmentType(text: string): SegmentType {
  const lower = text.toLowerCase()

  const interactionSignals = [
    /\byou\b.*\?/, // questions to her
    /\byou\b.*\!/, // direct statements
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

function segmentTranscript(text: string, maxChunkSize: number, overlapSize: number) {
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

  const { QA_CONFIG } = await import("../src/qa/config")
  const { storeEmbeddings, deleteEmbeddingsBySource } = await import("../src/db/server")

  const transcriptsDir = path.join(process.cwd(), "training-data", "transcripts")
  if (!fs.existsSync(transcriptsDir)) {
    console.error(`❌ Missing directory: ${transcriptsDir}`)
    process.exit(1)
  }

  const transcriptFiles = await listTxtFiles(transcriptsDir)
  if (transcriptFiles.length === 0) {
    console.log("No transcript .txt files found under training-data/transcripts")
    return
  }

  const chunkSize = QA_CONFIG.rag.chunkSize
  const chunkOverlap = QA_CONFIG.rag.chunkOverlap
  const embeddingModel = QA_CONFIG.ollama.embeddingModel

  const statePath = path.join(process.cwd(), "training-data", ".ingest_state.json")
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

  console.log("================================")
  console.log("🧠 TRAINING DATA INGEST")
  console.log("================================")
  console.log(`Transcripts:  ${transcriptFiles.length}`)
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

      rows.push({
        content: chunk.content,
        source,
        embedding,
        metadata: {
          channel,
          coach: channel,
          video_title: videoTitle,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunk.totalChunks,
          segmentType: chunk.type,
          isRealExample: chunk.type === "INTERACTION",
        },
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
