/**
 * Ingest Stage 09 chunks into embeddings_test table.
 * Isolated from production embeddings table.
 *
 * Usage:
 *   npx tsx scripts/training-data/10.EXT.ingest-test.ts --manifest docs/pipeline/batches/QUALITY-TEST.1.07b-passed.txt
 *   npx tsx scripts/training-data/10.EXT.ingest-test.ts --manifest <m> --dry-run
 *   npx tsx scripts/training-data/10.EXT.ingest-test.ts --manifest <m> --allow-review   # also ingest REVIEW verdicts
 *   npx tsx scripts/training-data/10.EXT.ingest-test.ts --manifest <m> --ack-blocks     # exit 0 even if BLOCKs present
 *   npx tsx scripts/training-data/10.EXT.ingest-test.ts --clear
 *
 * A pre-ingest QA screen runs first (no LLM cost). PASS/ADVISORY ingest automatically;
 * REVIEW needs --allow-review; BLOCK is never ingested. Verdicts + report are written to
 * data/validation/ingest-qa/. See scripts/training-data/lib/ingestQaScreen.ts.
 */

import fs from "fs"
import path from "path"
import { runScreen, shouldIngest, renderReport, Verdict } from "./lib/ingestQaScreen"

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  for (const rawLine of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim()
    if (!key || process.env[key] !== undefined) continue
    process.env[key] = value.replace(/^["']|["']$/g, "")
  }
}
loadEnvFile(path.join(process.cwd(), ".env.local"))

const CHUNKS_DIR = path.resolve(__dirname, "../../data/09.EXT.chunks")
const STAGE06_DIR = path.resolve(__dirname, "../../data/06.LLM.video-type")
const STAGE06H_DIR = path.resolve(__dirname, "../../data/06h.DET.confidence-propagation")
const QA_OUT_DIR = path.resolve(__dirname, "../../data/validation/ingest-qa")

interface ChunkFile {
  chunks: Array<{
    content: string
    embedding: number[]
    metadata: Record<string, unknown>
  }>
  channel?: string
}

function parseManifest(manifestPath: string): string[] {
  const lines = fs.readFileSync(manifestPath, "utf-8").split("\n")
  const videoIds: string[] = []
  for (const line of lines) {
    if (line.startsWith("#") || !line.trim()) continue
    const match = line.match(/\[([A-Za-z0-9_-]{11})\]/)
    if (match) videoIds.push(match[1])
  }
  return videoIds
}

function findChunkFiles(videoIds: string[]): Array<{ path: string; videoId: string }> {
  const results: Array<{ path: string; videoId: string }> = []
  for (const vid of videoIds) {
    const files = findFilesRecursive(CHUNKS_DIR, `${vid}.chunks.json`)
    for (const f of files) {
      results.push({ path: f, videoId: vid })
    }
  }
  return results
}

function findFilesRecursive(dir: string, filename: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findFilesRecursive(full, filename))
    } else if (entry.name === filename) {
      results.push(full)
    }
  }
  return results
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const clear = args.includes("--clear")
  const allowReview = args.includes("--allow-review")
  const ackBlocks = args.includes("--ack-blocks")
  const manifestIdx = args.indexOf("--manifest")
  const manifestPath = manifestIdx >= 0 ? args[manifestIdx + 1] : null

  const { storeTestEmbeddings, deleteTestEmbeddingsBySource, getTestEmbeddingsCount } =
    await import("../../src/db/embeddingsTestRepo")

  if (clear) {
    console.log("Clearing all test embeddings...")
    const { createAdminSupabaseClient } = await import("../../src/db/supabase")
    const supabase = createAdminSupabaseClient()
    const { error } = await supabase.from("embeddings_test").delete().neq("id", "00000000-0000-0000-0000-000000000000")
    if (error) throw new Error(`Clear failed: ${error.message}`)
    console.log("Done.")
    return
  }

  if (!manifestPath) {
    console.error("Usage: npx tsx scripts/training-data/10.EXT.ingest-test.ts --manifest <path>")
    process.exit(1)
  }

  const videoIds = parseManifest(manifestPath)
  console.log(`Manifest: ${videoIds.length} videos`)

  const chunkFiles = findChunkFiles(videoIds)
  console.log(`Found ${chunkFiles.length} chunk files`)

  // --- Pre-ingest QA screen (fail-closed gate) ---
  const verdicts = runScreen(
    chunkFiles.map((c) => ({ videoId: c.videoId, chunkFilePath: c.path })),
    { stage06: STAGE06_DIR, stage06h: STAGE06H_DIR }
  )
  const verdictById = new Map<string, Verdict>(verdicts.map((v) => [v.videoId, v]))
  const manifestLabel = path.basename(manifestPath).replace(/\.txt$/, "")
  // Date is only used to label the report; tolerate sandboxes without a real clock.
  let generatedAt = "unknown"
  try {
    generatedAt = new Date().toISOString()
  } catch {
    /* leave 'unknown' */
  }
  fs.mkdirSync(QA_OUT_DIR, { recursive: true })
  fs.writeFileSync(
    path.join(QA_OUT_DIR, `${manifestLabel}.verdicts.json`),
    JSON.stringify({ manifest: manifestLabel, generatedAt, verdicts }, null, 2)
  )
  fs.writeFileSync(path.join(QA_OUT_DIR, `${manifestLabel}.report.md`), renderReport(verdicts, manifestLabel, generatedAt))
  const tally = { BLOCK: 0, REVIEW: 0, ADVISORY: 0, PASS: 0 }
  for (const v of verdicts) tally[v.severity]++
  console.log(
    `QA screen: PASS ${tally.PASS} · ADVISORY ${tally.ADVISORY} · REVIEW ${tally.REVIEW} · BLOCK ${tally.BLOCK} ` +
      `→ data/validation/ingest-qa/${manifestLabel}.report.md`
  )
  if (tally.BLOCK || tally.REVIEW) {
    console.log("  Not ingesting:")
    for (const v of verdicts) {
      if (v.severity === "BLOCK" || (v.severity === "REVIEW" && !allowReview)) {
        console.log(`    [${v.severity}] ${v.videoId}: ${v.reasons.join("; ")}`)
      }
    }
    if (tally.REVIEW && !allowReview) console.log("  (re-run with --allow-review to ingest REVIEW verdicts)")
  }

  let totalChunks = 0
  let totalIngested = 0
  let skipped = 0

  for (const { path: filePath, videoId } of chunkFiles) {
    const verdict = verdictById.get(videoId)
    if (verdict && !shouldIngest(verdict, allowReview)) {
      skipped++
      continue
    }
    if (verdict && verdict.advisories.length) {
      console.log(`  ${videoId}: ADVISORY — ${verdict.advisories.join("; ")}`)
    }

    const data: ChunkFile = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    const chunks = data.chunks || []
    totalChunks += chunks.length

    if (chunks.length === 0) {
      console.log(`  ${videoId}: 0 chunks, skipping`)
      continue
    }

    const rel = path.relative(CHUNKS_DIR, filePath)
    const source = rel.replace(/\.chunks\.json$/, ".txt")

    const embeddings = chunks.map((c) => ({
      content: c.content,
      source,
      embedding: c.embedding,
      metadata: c.metadata as Record<string, unknown>,
    }))

    if (dryRun) {
      console.log(`  ${videoId}: ${chunks.length} chunks → embeddings_test (dry run)`)
    } else {
      await deleteTestEmbeddingsBySource(source)
      await storeTestEmbeddings(embeddings)
      console.log(`  ${videoId}: ${chunks.length} chunks ingested`)
    }
    totalIngested += chunks.length
  }

  const count = dryRun ? totalIngested : await getTestEmbeddingsCount()
  console.log(
    `\nDone. Ingested ${totalIngested} chunks from ${chunkFiles.length - skipped} videos ` +
      `(skipped ${skipped} BLOCK/REVIEW). Table count: ${count}`
  )

  // Fail-closed signal: surface unresolved BLOCKs unless explicitly acknowledged.
  if (tally.BLOCK && !ackBlocks) {
    console.error(`\n${tally.BLOCK} video(s) BLOCKed by the QA screen and not ingested. Resolve or re-run with --ack-blocks.`)
    process.exit(2)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
