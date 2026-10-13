#!/usr/bin/env bash
#
# Write this machine's runtime and build env files from .env.local.
#
#   infra/write-env-file.sh staging
#
# Writes, mode 600, in ~/.config/daygame/ (outside the repository and the image):
#   staging.env        what the container reads at runtime: every required and
#                      optional variable in scripts/check-runtime-env.mjs that
#                      .env.local sets, plus NEXT_SERVER_ACTIONS_ENCRYPTION_KEY,
#                      generated once and kept on later runs.
#   build-public.env   the three public build values for infra/build-image.sh,
#                      with NEXT_PUBLIC_APP_URL=https://localhost.
#
# Left out on purpose: the test accounts (they are not on the list), the test
# routes switch, and the two Claude-CLI switches (USE_CLAUDE_CODE, CLAUDE_PATH):
# a container has no Claude CLI, so the features that shell out to it do not
# work there. That loss is the master plan's D4, not this script's.
#
# It prints names, never values. A value it cannot write safely (one holding a
# newline or a single quote) stops it, by name.
#
# Plans/caddy-deploy-and-cicd.md, Phase 3 step 6. Production's file is written on
# the server by infra/server/push-env.sh, not here.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="${DAYGAME_CONFIG_DIR:-$HOME/.config/daygame}"
SOURCE="${ENV_SOURCE:-$REPO/.env.local}"

die() { printf 'write-env-file: ERROR: %s\n' "$*" >&2; exit 1; }

[ "${1:-}" = "staging" ] || die "usage: infra/write-env-file.sh staging"
[ -f "$SOURCE" ] || die "$SOURCE does not exist."
[ -f "$REPO/node_modules/dotenv/package.json" ] || die "dotenv is not installed in $REPO/node_modules (npm ci)."

umask 077
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"

node --input-type=module - "$SOURCE" "$CONFIG_DIR" "$REPO" <<'JS'
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { randomBytes } from "node:crypto"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const [source, dir, repo] = process.argv.slice(2)
const require = createRequire(join(repo, "package.json"))
const dotenv = require("dotenv")
const { ALL } = await import(pathToFileURL(join(repo, "scripts/check-runtime-env.mjs")).href)

const local = dotenv.parse(readFileSync(source))
const NEVER = new Set(["ENABLE_TEST_ROUTES", "USE_CLAUDE_CODE", "CLAUDE_PATH", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"])
const fail = (msg) => {
  console.error(`write-env-file: ERROR: ${msg}`)
  process.exit(1)
}

/** One KEY='value' line, literal in Docker Compose's env_file parser. */
function line(name, value) {
  if (/[\n\r']/.test(value)) fail(`${name} holds a newline or a single quote, which cannot be written safely. Put it on one line without single quotes.`)
  return `${name}='${value}'`
}

/** Read KEY='value' lines this script wrote earlier, so a generated key is kept. */
function previous(path) {
  if (!existsSync(path)) return {}
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .filter((l) => /^[A-Z0-9_]+='.*'$/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 2, -1)]),
  )
}

function writeAtomically(path, lines) {
  const tmp = `${path}.tmp-${process.pid}`
  writeFileSync(tmp, lines.join("\n") + "\n", { mode: 0o600 })
  renameSync(tmp, path)
}

const runtimeNames = Object.entries(ALL)
  .filter(([name, v]) => (v.kind === "required" || v.kind === "optional") && !NEVER.has(name))
  .map(([name]) => name)

const missingRequired = runtimeNames.filter((n) => ALL[n].kind === "required" && !local[n])
if (missingRequired.length) fail(`${source} does not set ${missingRequired.join(", ")}, which the server cannot start without.`)

const runtimePath = join(dir, "staging.env")
const kept = previous(runtimePath).NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
const actionsKey = kept && /^[A-Za-z0-9+/]{43}=$/.test(kept) ? kept : randomBytes(32).toString("base64")

const written = runtimeNames.filter((n) => local[n])
writeAtomically(runtimePath, [
  "# Written by infra/write-env-file.sh from .env.local. Runtime values for the container.",
  ...written.map((n) => line(n, local[n])),
  line("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY", actionsKey),
])

for (const n of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
  if (!local[n]) fail(`${source} does not set ${n}, which the build needs.`)
}
writeAtomically(join(dir, "build-public.env"), [
  "# Written by infra/write-env-file.sh. Public values inlined into the bundles at build time.",
  line("NEXT_PUBLIC_SUPABASE_URL", local.NEXT_PUBLIC_SUPABASE_URL),
  line("NEXT_PUBLIC_SUPABASE_ANON_KEY", local.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  line("NEXT_PUBLIC_APP_URL", "https://localhost"),
])

const skipped = runtimeNames.filter((n) => !local[n])
console.log(`write-env-file: ${runtimePath}: ${written.length} variables (${written.join(", ")}), plus NEXT_SERVER_ACTIONS_ENCRYPTION_KEY (${kept ? "kept" : "generated"}).`)
if (skipped.length) console.log(`write-env-file: optional and not set in .env.local, so not configured: ${skipped.join(", ")}.`)
console.log(`write-env-file: ${join(dir, "build-public.env")}: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL=https://localhost.`)
JS
