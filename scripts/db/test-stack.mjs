#!/usr/bin/env node
/**
 * THE TEST BACKEND: a throwaway local Supabase built from production's schema.
 *
 *   node scripts/db/test-stack.mjs up     start it (or reuse it), print its env
 *   node scripts/db/test-stack.mjs env    print the env of the running stack
 *   node scripts/db/test-stack.mjs down   stop it and throw its data away
 *
 * WHY NOT supabase/migrations/ DIRECTLY: they cannot build the schema from
 * nothing (the second file alters a table no migration creates). The stack is
 * built from, in this order:
 *   1. tests/db/before-baseline.sql — clears the local stack's default
 *      privileges, so the baseline restores production's grants and not wider
 *      ones (the file says why);
 *   2. tests/db/baseline.sql — a schema-only dump of production, made by
 *      scripts/db/baseline.sh;
 *   3. tests/db/shim.sql — the auth.users trigger a public-schema dump cannot
 *      carry;
 *   4. every repo migration newer than the baseline's stamp. So a migration
 *      nobody has applied to production yet is already in the tests.
 *
 * Every test makes its own user here, so nothing is ever truncated and nothing
 * touches production. Plan: Plans/tests-worth-their-keep.md, Phase 7.
 */
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const WORKDIR = path.join(ROOT, "tests/db")
const BEFORE_BASELINE = path.join(WORKDIR, "before-baseline.sql")
const BASELINE = path.join(WORKDIR, "baseline.sql")
const SHIM = path.join(WORKDIR, "shim.sql")
const GENERATED = path.join(WORKDIR, "supabase/migrations")
const STAMP_FILE = path.join(WORKDIR, "supabase/.temp/assembled.sha256")
const REPO_MIGRATIONS = path.join(ROOT, "supabase/migrations")

/**
 * THE ONE SUPABASE CLI VERSION THIS STACK IS BUILT WITH, here and in CI.
 *
 * The CLI decides which Postgres, auth and API images the stack runs, so two
 * versions are two different backends. On 2026-10-13 a second binary landed
 * earlier on PATH mid-session; the next reset swapped the database image under
 * a stack the older CLI had started, and the result was a mix of both. `up`
 * now refuses any other version rather than build something nobody proved.
 * .github/workflows/ci.yml installs the same version; tests/unit/ciWorkflows.test.ts
 * fails if the two disagree.
 */
export const SUPABASE_CLI_VERSION = "2.120.0"

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

/** The migrations the stack is built from, in order, and a hash of their names and contents. */
function plan() {
  const first = fs.readFileSync(BASELINE, "utf8").split("\n", 1)[0]
  const m = /^-- baseline-stamp: (\d+)$/.exec(first)
  if (!m) throw new Error(`${BASELINE} has no "-- baseline-stamp:" line. Re-run scripts/db/baseline.sh.`)
  const stamp = BigInt(m[1])

  const newer = fs.readdirSync(REPO_MIGRATIONS)
    .filter((f) => f.endsWith(".sql") && versionOf(f) > stamp)
    .sort((a, b) => (versionOf(a) < versionOf(b) ? -1 : 1))

  // The order is the point: see the header. Before-baseline must run first, or
  // the baseline's objects are created under the local stack's wide defaults.
  const files = [
    ["00000000000000_before_baseline.sql", BEFORE_BASELINE],
    ["00000000000001_baseline.sql", BASELINE],
    ["00000000000002_auth_shim.sql", SHIM],
    ...newer.map((f) => [f, path.join(REPO_MIGRATIONS, f)]),
  ].map(([name, from]) => [name, fs.readFileSync(from)])
  const hash = createHash("sha256")
  for (const [name, sql] of files) hash.update(name).update(sql)
  return { files, hash: hash.digest("hex"), newer }
}

/**
 * Writes the generated folder next to itself and swaps it in, so a reader never
 * sees it half-written. Only called under the lock, and only when the schema
 * changed — several suites call `up` at once and must not rewrite it under each
 * other.
 */
function writeGenerated(files) {
  const staging = `${GENERATED}.${process.pid}`
  fs.rmSync(staging, { recursive: true, force: true })
  fs.mkdirSync(staging, { recursive: true })
  for (const [name, sql] of files) fs.writeFileSync(path.join(staging, name), sql)
  fs.rmSync(GENERATED, { recursive: true, force: true })
  fs.renameSync(staging, GENERATED)
}

const LOCK = path.join(WORKDIR, "supabase/.temp/up.lock")
const LOCK_STALE_MS = 15 * 60_000

/**
 * ONE `up` AT A TIME CHANGES THE STACK. The browser suite, the database suite
 * and several sessions all call `up`; two of them starting or resetting the
 * same stack at once would break both. A directory is the lock because
 * creating one is atomic. A lock older than any real start is someone's
 * crashed run and is taken over, loudly.
 */
function withLock(run) {
  fs.mkdirSync(path.dirname(LOCK), { recursive: true })
  const deadline = Date.now() + LOCK_STALE_MS
  for (;;) {
    try {
      fs.mkdirSync(LOCK)
      break
    } catch (error) {
      if (error.code !== "EEXIST") throw error
      const age = Date.now() - fs.statSync(LOCK).mtimeMs
      if (age > LOCK_STALE_MS) {
        console.error(`[test-stack] taking over a lock left ${Math.round(age / 60_000)} min ago by a run that did not finish`)
        fs.rmSync(LOCK, { recursive: true, force: true })
        continue
      }
      if (Date.now() > deadline) throw new Error(`[test-stack] still locked after ${LOCK_STALE_MS / 60_000} min: ${LOCK}`)
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500)
    }
  }
  try {
    return run()
  } finally {
    fs.rmSync(LOCK, { recursive: true, force: true })
  }
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

/** Fails, naming both versions, unless the `supabase` on PATH is SUPABASE_CLI_VERSION. */
function requirePinnedCli() {
  let found
  try {
    found = execFileSync("supabase", ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .trim()
      .split("\n")[0]
      .replace(/^v/, "")
  } catch {
    found = null
  }
  if (found === SUPABASE_CLI_VERSION) return
  let where
  try {
    where = execFileSync("sh", ["-c", "command -v supabase"], { encoding: "utf8" }).trim()
  } catch {
    where = "not on PATH"
  }
  throw new Error(
    `[test-stack] needs Supabase CLI ${SUPABASE_CLI_VERSION}, but \`supabase\` on PATH is ` +
      `${found ?? "missing"} (${where}). Put ${SUPABASE_CLI_VERSION} first on PATH — releases are at ` +
      `https://github.com/supabase/cli/releases/tag/v${SUPABASE_CLI_VERSION} — or, if the version is ` +
      `meant to move, change SUPABASE_CLI_VERSION in scripts/db/test-stack.mjs and the setup-cli step in ` +
      `.github/workflows/ci.yml together, then \`down\` and \`up\` so the stack is rebuilt by it.`
  )
}

function up() {
  requirePinnedCli()
  const { files, hash, newer } = plan()
  const stamp = () => (fs.existsSync(STAMP_FILE) ? fs.readFileSync(STAMP_FILE, "utf8") : null)

  // The common case touches nothing: running, and built from this exact SQL.
  if (stamp() === hash && isRunning()) return readEnv()

  withLock(() => {
    // Re-check under the lock: another run may have done the work meanwhile.
    const running = isRunning()
    if (running && stamp() === hash) return
    writeGenerated(files)
    if (!running) {
      console.error("[test-stack] starting the local test backend…")
      supabase(["start", "-x", EXCLUDED.join(",")])
    } else {
      // Running, but built from different SQL (a new migration, a new baseline).
      console.error("[test-stack] schema changed since this stack started; resetting…")
      supabase(["db", "reset"])
    }
    fs.mkdirSync(path.dirname(STAMP_FILE), { recursive: true })
    fs.writeFileSync(STAMP_FILE, hash)
    if (newer.length) console.error(`[test-stack] applied on top of the baseline: ${newer.join(", ")}`)
  })
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
