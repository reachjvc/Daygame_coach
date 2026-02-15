/**
 * scripts/training-data/11.retrieval-smoke.ts
 *
 * Smoke test for RAG retrieval against the Supabase `embeddings` table.
 *
 * It:
 *  - loads `.env.local` (so Supabase service key is available)
 *  - generates a query embedding via Ollama
 *  - runs vector search via Supabase RPC (match_embeddings)
 *
 * Use:
 *   node node_modules/tsx/dist/cli.mjs scripts/training-data/11.retrieval-smoke.ts "what is a false time constraint?"
 */

import fs from "fs"
import path from "path"

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

function parseQuestion(argv: string[]): string {
  const rest = argv.filter((a) => !a.startsWith("--"))
  const q = rest.join(" ").trim()
  return q || "what is a false time constraint?"
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"))

  const question = parseQuestion(process.argv.slice(2))
  const { retrieveRelevantChunks } = await import("../../src/qa/retrieval")

  console.log("================================")
  console.log("🔎 RETRIEVAL SMOKE TEST")
  console.log("================================")
  console.log(`Question: ${question}`)
  console.log("")

  const chunks = await retrieveRelevantChunks(question, { topK: 8, minScore: 0.2 })
  if (!chunks.length) {
    console.log("No chunks returned.")
    return
  }

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]
    const source = c.metadata?.source ?? "(unknown source)"
    const score = typeof c.relevanceScore === "number" ? c.relevanceScore.toFixed(3) : "?"
    const coach = c.metadata?.coach ? String(c.metadata.coach) : ""
    const topic = c.metadata?.topic ? String(c.metadata.topic) : ""

    console.log(`${i + 1}. score=${score} source=${source}`)
    if (coach) console.log(`   coach=${coach}`)
    if (topic) console.log(`   topic=${topic}`)
    console.log(`   text=${(c.text ?? "").slice(0, 200).replace(/\s+/g, " ").trim()}...`)
  }
}

main().catch((err) => {
  console.error("Fatal error during retrieval smoke test:", err)
  process.exit(1)
})
