/**
 * scripts/training-data/11.EXT.retrieval-smoke.ts
 *
 * Smoke test for RAG retrieval against the Supabase `embeddings` table.
 *
 * It:
 *  - loads `.env.local` (so Supabase service key is available)
 *  - generates a query embedding via Ollama
 *  - runs vector search via Supabase RPC (match_embeddings)
 *
 * Use:
 *   node --import tsx/esm scripts/training-data/11.EXT.retrieval-smoke.ts "what is a false time constraint?"
 */

import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

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

const DEFAULT_QUESTION = "what is a false time constraint?"
const DEFAULT_TOP_K = 8
const DEFAULT_MIN_SCORE = 0.2

type ParsedArgs = {
  help: boolean
  topK: number
  minScore: number
  question: string
}

function parsePositiveIntFlag(name: string, raw: string): number {
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Invalid value for ${name}: ${raw}`)
  }
  return n
}

function parseUnitIntervalFlag(name: string, raw: string): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new Error(`Invalid value for ${name}: ${raw}`)
  }
  return n
}

function parseArgs(argv: string[]): ParsedArgs {
  let help = false
  let topK = DEFAULT_TOP_K
  let minScore = DEFAULT_MIN_SCORE
  const questionTokens: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === "--help" || arg === "-h") {
      help = true
      continue
    }

    if (arg.startsWith("--top-k=")) {
      topK = parsePositiveIntFlag("--top-k", arg.slice("--top-k=".length))
      continue
    }

    if (arg === "--top-k") {
      const value = argv[i + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --top-k")
      }
      topK = parsePositiveIntFlag("--top-k", value)
      i += 1
      continue
    }

    if (arg.startsWith("--min-score=")) {
      minScore = parseUnitIntervalFlag("--min-score", arg.slice("--min-score=".length))
      continue
    }

    if (arg === "--min-score") {
      const value = argv[i + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --min-score")
      }
      minScore = parseUnitIntervalFlag("--min-score", value)
      i += 1
      continue
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown flag: ${arg}`)
    }

    questionTokens.push(arg)
  }

  const question = questionTokens.join(" ").trim() || DEFAULT_QUESTION
  return { help, topK, minScore, question }
}

function printHelp() {
  console.log("Usage:")
  console.log("  node --import tsx/esm scripts/training-data/11.EXT.retrieval-smoke.ts \"your question\"")
  console.log("")
  console.log("Examples:")
  console.log("  node --import tsx/esm scripts/training-data/11.EXT.retrieval-smoke.ts \"approach a girl in public\"")
  console.log("")
  console.log("Optional flags:")
  console.log(`  --top-k <n>           Number of matches to return (default: ${DEFAULT_TOP_K})`)
  console.log(`  --min-score <0-1>     Similarity threshold sent to match_embeddings (default: ${DEFAULT_MIN_SCORE})`)
  console.log("")
  console.log("Flags:")
  console.log("  --help, -h    Show this help and exit")
}

async function generateEmbedding(baseUrl: string, model: string, question: string): Promise<number[]> {
  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: question,
    }),
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Ollama model '${model}' not found. Run 'ollama pull ${model}'.`)
    }
    const body = await response.text()
    throw new Error(`Embedding generation failed (${response.status}): ${body}`)
  }

  const data = await response.json()
  if (!Array.isArray(data.embedding)) {
    throw new Error(`Invalid Ollama response (missing embedding array): ${JSON.stringify(data)}`)
  }

  return data.embedding as number[]
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  loadEnvFile(path.join(process.cwd(), ".env.local"))

  const question = args.question
  const topK = args.topK
  const minScore = args.minScore

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in environment variables")
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in environment variables")

  const ollamaBaseUrl = process.env.OLLAMA_API_URL || "http://localhost:11434"
  const ollamaEmbeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text"

  const queryEmbedding = await generateEmbedding(ollamaBaseUrl, ollamaEmbeddingModel, question)
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await supabase.rpc("match_embeddings", {
    query_embedding: queryEmbedding,
    match_threshold: minScore,
    match_count: topK,
  })
  if (error) {
    throw new Error(`Supabase match_embeddings failed: ${error.message}`)
  }

  console.log("================================")
  console.log("🔎 RETRIEVAL SMOKE TEST")
  console.log("================================")
  console.log(`Question: ${question}`)
  console.log(`topK=${topK}, minScore=${minScore}`)
  console.log("")

  const chunks = Array.isArray(data) ? data : []
  if (!chunks.length) {
    console.log("No chunks returned.")
    return
  }

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i] as {
      source?: string
      content?: string
      similarity?: number
      metadata?: Record<string, unknown> | null
    }
    const metadata = c.metadata && typeof c.metadata === "object" ? c.metadata : null
    const source = c.source ?? (typeof metadata?.source === "string" ? metadata.source : "(unknown source)")
    const score = typeof c.similarity === "number" ? c.similarity.toFixed(3) : "?"
    const coach = typeof metadata?.coach === "string" ? metadata.coach : ""
    const topic = typeof metadata?.topic === "string" ? metadata.topic : ""
    const text = typeof c.content === "string" ? c.content : ""

    console.log(`${i + 1}. score=${score} source=${source}`)
    if (coach) console.log(`   coach=${coach}`)
    if (topic) console.log(`   topic=${topic}`)
    console.log(`   text=${text.slice(0, 200).replace(/\s+/g, " ").trim()}...`)
  }
}

main().catch((err) => {
  console.error("Fatal error during retrieval smoke test:", err)
  process.exit(1)
})
