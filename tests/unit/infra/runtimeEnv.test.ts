// @vitest-environment node
/**
 * THE LIST OF ENVIRONMENT VARIABLES CANNOT FALL BEHIND THE CODE.
 *
 * `scripts/check-runtime-env.mjs` is the one list of what the app reads, and
 * the container refuses to start without the required ones. A list that
 * silently misses a variable is worse than none: the server starts, and fails
 * later on the first request that needed it. So these tests read the code the
 * way the list claims to: every `process.env.X`, and every import of a library
 * that reads its own variables.
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { readdirSync, readFileSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import {
  ALL,
  READ_IN_CODE,
  SELF_CONFIGURING_SDKS,
  checkRuntimeEnv,
} from "../../../scripts/check-runtime-env.mjs"

const ROOT = resolve(__dirname, "../../..")
const SCRIPT = join(ROOT, "scripts/check-runtime-env.mjs")

/** What ships: the app, its slices, the proxy and the build config. */
function shippedFiles(): string[] {
  const walk = (dir: string): string[] =>
    readdirSync(join(ROOT, dir), { withFileTypes: true, recursive: true })
      .filter((e) => e.isFile() && /\.(ts|tsx|js|mjs)$/.test(e.name))
      .map((e) => join(e.parentPath, e.name))
  const roots = ["proxy.ts", "next.config.mjs", "instrumentation.ts"]
    .map((f) => join(ROOT, f))
    .filter((f) => existsSync(f))
  return [...walk("app"), ...walk("src"), ...roots]
}

const ENV_READ = /process\.env\.([A-Za-z_][A-Za-z0-9_]*)|process\.env\[\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]\s*\]/g
const UNREADABLE_ENV = /process\.env\[\s*[^"'`\s]|\{[^}]*\}\s*=\s*process\.env\b/
const IMPORTED = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g

function envNamesIn(source: string): string[] {
  return [...source.matchAll(ENV_READ)].map((m) => m[1] ?? m[2])
}

function importsIn(source: string): string[] {
  return [...source.matchAll(IMPORTED)].map((m) => m[1])
}

/** `pkg` or `pkg/sub` imports `pkg`; `@scope/pkg/sub` imports `@scope/pkg`. */
function packageOf(spec: string): string {
  const parts = spec.split("/")
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]
}

describe("every variable the code reads is on the list", () => {
  it("every process.env.X in app/, src/, proxy.ts and next.config.mjs is listed", () => {
    const unlisted = shippedFiles().flatMap((file) =>
      envNamesIn(readFileSync(file, "utf8"))
        .filter((name) => !(name in ALL))
        .map((name) => `${name} (${file.slice(ROOT.length + 1)})`),
    )
    expect(
      unlisted,
      "Add each one to scripts/check-runtime-env.mjs with its kind: build-public, build, platform, required or optional.",
    ).toEqual([])
  })

  it("no file reads the environment in a way this scan cannot see", () => {
    const hidden = shippedFiles().filter((file) => UNREADABLE_ENV.test(readFileSync(file, "utf8")))
    expect(
      hidden.map((f) => f.slice(ROOT.length + 1)),
      "A computed process.env[key] or a destructured process.env hides which variable is read. Write process.env.NAME.",
    ).toEqual([])
  })

  it("every import of a self-configuring library has its variables listed", () => {
    const sdks = SELF_CONFIGURING_SDKS as Record<string, string[]>
    const unlisted = shippedFiles().flatMap((file) =>
      importsIn(readFileSync(file, "utf8"))
        .map(packageOf)
        .filter((pkg) => pkg in sdks)
        .flatMap((pkg) =>
          sdks[pkg]
            .filter((name) => !(name in ALL))
            .map((name) => `${name}, read by ${pkg} (${file.slice(ROOT.length + 1)})`),
        ),
    )
    expect(
      unlisted,
      "The library reads these by itself. Add them to IMPLICIT in scripts/check-runtime-env.mjs.",
    ).toEqual([])
  })

  it("lists nothing under READ_IN_CODE that the code no longer reads", () => {
    const read = new Set(shippedFiles().flatMap((file) => envNamesIn(readFileSync(file, "utf8"))))
    const stale = Object.keys(READ_IN_CODE).filter((name) => !read.has(name))
    expect(stale, "Delete these from READ_IN_CODE, or move them to IMPLICIT and name what reads them.").toEqual([])
  })
})

describe("a server does not start without what it needs", () => {
  const complete = Object.fromEntries(
    Object.entries(ALL)
      .filter(([, v]) => v.kind === "required")
      .map(([name]) => [name, "set"]),
  )

  it("passes when every required variable is set", () => {
    expect(checkRuntimeEnv(complete)).toMatchObject({ missing: [], refused: [] })
  })

  it("names a required variable that was removed, and an empty one counts as removed", () => {
    expect(checkRuntimeEnv({ ...complete, SUPABASE_SERVICE_ROLE_KEY: undefined }).missing).toEqual([
      "SUPABASE_SERVICE_ROLE_KEY",
    ])
    expect(checkRuntimeEnv({ ...complete, NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: " " }).missing).toEqual([
      "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
    ])
  })

  it("refuses ENABLE_TEST_ROUTES=true, which opens routes that write real data", () => {
    expect(checkRuntimeEnv({ ...complete, ENABLE_TEST_ROUTES: "true" }).refused).toEqual(["ENABLE_TEST_ROUTES"])
  })

  it("exits non-zero and names the missing variable when run as the container runs it", () => {
    const env = { PATH: process.env.PATH, ...complete } as Record<string, string>
    delete env.SUPABASE_SERVICE_ROLE_KEY
    const run = spawnSync(process.execPath, [SCRIPT], { env, encoding: "utf8" })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain("SUPABASE_SERVICE_ROLE_KEY is required and not set")

    const ok = spawnSync(process.execPath, [SCRIPT], { env: { PATH: process.env.PATH, ...complete }, encoding: "utf8" })
    expect(ok.status).toBe(0)
    expect(ok.stdout).toContain("every required variable is set")
  })

  it("prints names only, never a value", () => {
    const secret = "do-not-print-this-value"
    const env = { PATH: process.env.PATH, ...complete, ANTHROPIC_API_KEY: secret, ENABLE_TEST_ROUTES: "true" }
    const run = spawnSync(process.execPath, [SCRIPT], { env, encoding: "utf8" })
    expect(run.stdout + run.stderr).not.toContain(secret)
  })
})

describe("an optional feature says it is not configured", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("Ollama has no localhost default any more", async () => {
    vi.stubEnv("OLLAMA_API_URL", "")
    const { QA_CONFIG } = await import("@/src/qa/config")
    const { INFERENCE_CONFIG } = await import("@/src/inner-game/config")
    expect(() => QA_CONFIG.ollama.baseUrl).toThrow("Ollama is not configured: OLLAMA_API_URL is not set.")
    expect(() => INFERENCE_CONFIG.baseUrl).toThrow("Ollama is not configured")

    vi.stubEnv("OLLAMA_API_URL", "http://ollama.internal:11434")
    expect(QA_CONFIG.ollama.baseUrl).toBe("http://ollama.internal:11434")
    expect(INFERENCE_CONFIG.baseUrl).toBe("http://ollama.internal:11434")
  })
})
