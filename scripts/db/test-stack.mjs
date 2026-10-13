#!/usr/bin/env node
/**
 * THE TEST BACKEND: a throwaway local Supabase built from production's schema.
 *
 *   node scripts/db/test-stack.mjs up     start it (or reuse it), print its env
 *   node scripts/db/test-stack.mjs env    print the env of the running stack
 *   node scripts/db/test-stack.mjs down   stop it and throw its data away
 *
 * WHY NOT supabase/migrations/ DIRECTLY: they cannot build the schema from
 * nothing (the second file alters a table no migration creates). The stack
 * starts from tests/db/baseline.sql — a schema-only dump of production, made by
 * scripts/db/baseline.sh — plus tests/db/shim.sql, plus every repo migration
 * newer than the baseline's stamp. So a migration nobody has applied to
 * production yet is already in the tests.
 *
 * Every test makes its own user here, so nothing is ever truncated and nothing
 * touches production. Plan: docs/plans/tests-worth-their-keep.md, Phase 7.
 */
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const WORKDIR = path.join(ROOT, "tests/db")
const BASELINE = path.join(WORKDIR, "baseline.sql")
const SHIM = path.join(WORKDIR, "shim.sql")
const GENERATED = path.join(WORKDIR, "supabase/migrations")
const STAMP_FILE = path.join(WORKDIR, "supabase/.temp/assembled.sha256")
const REPO_MIGRATIONS = path.join(ROOT, "supabase/migrations")

// Services this suite never uses. Starting them costs memory and minutes.
const EXCLUDED = [
  "realtime", "storage-api", "imgproxy", "studio", "edge-runtime",
  "logflare", "vector", "supavisor", "postgres-meta",
]

function supabase(args, { quiet = false } = {}) {
  return execFileSync("supabase", [...args, "--workdir", WORKDIR], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: quiet ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "inherit"],
  })
}

/** Versions compare as numbers, padded to 14 digits: `20260225` is a day, not a smaller number. */
function versionOf(file) {
  const m = /^(\d+)_/.exec(file)
  if (!m) throw new Error(`Migration file without a numeric version: ${file}`)
  return BigInt(m[1].padEnd(14, "0"))
}

/** Writes the generated migrations folder and returns a hash of what it holds. */
function assemble() {
  const first = fs.readFileSync(BASELINE, "utf8").split("\n", 1)[0]
  const m = /^-- baseline-stamp: (\d+)$/.exec(first)
  if (!m) throw new Error(`${BASELINE} has no "-- baseline-stamp:" line. Re-run scripts/db/baseline.sh.`)
  const stamp = BigInt(m[1])

  const newer = fs.readdirSync(REPO_MIGRATIONS)
    .filter((f) => f.endsWith(".sql") && versionOf(f) > stamp)
    .sort((a, b) => (versionOf(a) < versionOf(b) ? -1 : 1))

  fs.rmSync(GENERATED, { recursive: true, force: true })
  fs.mkdirSync(GENERATED, { recursive: true })
  const files = [
    ["00000000000000_baseline.sql", BASELINE],
    ["00000000000001_auth_shim.sql", SHIM],
    ...newer.map((f) => [f, path.join(REPO_MIGRATIONS, f)]),
  ]
  const hash = createHash("sha256")
  for (const [name, from] of files) {
    const sql = fs.readFileSync(from)
    fs.writeFileSync(path.join(GENERATED, name), sql)
    hash.update(name).update(sql)
  }
  return { hash: hash.digest("hex"), newer }
}

function isRunning() {
  try {
    supabase(["status", "-o", "json"], { quiet: true })
    return true
  } catch {
    return false
  }
}

function readEnv() {
  const out = supabase(["status", "-o", "env"], { quiet: true })
  const env = {}
  for (const line of out.split("\n")) {
    const m = /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim())
    if (m) env[m[1]] = m[2]
  }
  for (const key of ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY", "DB_URL"]) {
    if (!env[key]) throw new Error(`The test stack's status has no ${key}. Output was:\n${out}`)
  }
  return env
}

function up() {
  const { hash, newer } = assemble()
  const previous = fs.existsSync(STAMP_FILE) ? fs.readFileSync(STAMP_FILE, "utf8") : null

  if (!isRunning()) {
    console.error("[test-stack] starting the local test backend…")
    supabase(["start", "-x", EXCLUDED.join(",")])
  } else if (previous !== hash) {
    // Running, but built from different SQL (a new migration, a new baseline).
    console.error("[test-stack] schema changed since this stack started; resetting…")
    supabase(["db", "reset"])
  }
  fs.mkdirSync(path.dirname(STAMP_FILE), { recursive: true })
  fs.writeFileSync(STAMP_FILE, hash)
  if (newer.length) console.error(`[test-stack] applied on top of the baseline: ${newer.join(", ")}`)
  return readEnv()
}

const command = process.argv[2]
if (command === "up") {
  console.log(JSON.stringify(up()))
} else if (command === "env") {
  console.log(JSON.stringify(readEnv()))
} else if (command === "down") {
  supabase(["stop", "--no-backup"])
  fs.rmSync(STAMP_FILE, { force: true })
} else {
  console.error("usage: node scripts/db/test-stack.mjs up | env | down")
  process.exit(2)
}
