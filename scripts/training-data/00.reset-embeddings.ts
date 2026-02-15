/**
 * scripts/training-data/00.reset-embeddings.ts
 *
 * DANGEROUS ADMIN SCRIPT
 *
 * Clears the Supabase `embeddings` table (training data / RAG index).
 *
 * Use:
 *   node --import tsx/esm scripts/training-data/00.reset-embeddings.ts --count
 *   node --import tsx/esm scripts/training-data/00.reset-embeddings.ts --wipe-all --yes
 *
 * Environment:
 *   - Loads `.env.local` (if present)
 *   - Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs"
import path from "path"

type Args = {
  countOnly: boolean
  wipeAll: boolean
  yes: boolean
  help: boolean
}

function parseArgs(argv: string[]): Args {
  const flags = new Set(argv)
  return {
    countOnly: flags.has("--count"),
    wipeAll: flags.has("--wipe-all"),
    yes: flags.has("--yes"),
    help: flags.has("--help") || flags.has("-h"),
  }
}

function printHelp() {
  console.log("Usage:")
  console.log("  node --import tsx/esm scripts/training-data/00.reset-embeddings.ts --count")
  console.log("  node --import tsx/esm scripts/training-data/00.reset-embeddings.ts --wipe-all --yes")
  console.log("")
  console.log("Flags:")
  console.log("  --count       Print current embeddings row count and exit")
  console.log("  --wipe-all    Delete all rows from embeddings table")
  console.log("  --yes         Required safety confirmation for --wipe-all")
  console.log("  --help, -h    Show this help and exit")
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

function getSupabaseProjectHost(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  try {
    return new URL(url).host || url || "(missing NEXT_PUBLIC_SUPABASE_URL)"
  } catch {
    return url || "(missing NEXT_PUBLIC_SUPABASE_URL)"
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  loadEnvFile(path.join(process.cwd(), ".env.local"))

  const { createAdminSupabaseClient } = await import("../../src/db/supabase")
  const supabase = createAdminSupabaseClient()

  async function getEmbeddingsCount(): Promise<number> {
    const { count, error } = await supabase
      .from("embeddings")
      .select("*", { count: "exact", head: true })
    if (error) {
      throw new Error(`Failed to get embeddings count: ${error.message}`)
    }
    return count ?? 0
  }

  const projectHost = getSupabaseProjectHost()
  console.log("================================")
  console.log("🧨 RESET EMBEDDINGS (Admin)")
  console.log("================================")
  console.log(`Supabase:     ${projectHost}`)

  const before = await getEmbeddingsCount()
  console.log(`Embeddings:   ${before}`)

  if (args.countOnly && !args.wipeAll) return

  if (!args.wipeAll) {
    console.error("❌ No action specified. Use --count or --wipe-all.")
    process.exit(2)
  }

  if (!args.yes) {
    console.error("❌ Refusing to wipe embeddings without --yes")
    process.exit(2)
  }

  if (before === 0) {
    console.log("✅ Table already empty; nothing to delete.")
    return
  }

  // PostgREST requires a filter for DELETE. Using a sentinel UUID that should never exist.
  const ZERO_UUID = "00000000-0000-0000-0000-000000000000"
  console.log("")
  console.log("Deleting ALL rows from `embeddings`...")
  const { error } = await supabase.from("embeddings").delete().neq("id", ZERO_UUID)
  if (error) {
    throw new Error(`Failed to wipe embeddings: ${error.message}`)
  }

  const after = await getEmbeddingsCount()
  console.log(`✅ Deleted:    ${before - after}`)
  console.log(`Embeddings:   ${after}`)
}

main().catch((err) => {
  console.error("Fatal error during embeddings reset:", err)
  process.exit(1)
})
