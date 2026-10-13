// @vitest-environment node
/**
 * THE DEPLOY SCRIPTS' REFUSALS, WHICH ARE THE PART THAT MATTERS.
 *
 * infra/deploy.sh is the only way anything reaches a server, and what makes it
 * safe is what it refuses: a tag (which can point at different code tomorrow),
 * a digest that already failed, a settings file it does not understand.
 * infra/write-env-file.sh handles real secrets, so it must write them only
 * where they belong, mode 600, and never print one. The happy paths run on a
 * real machine (Plans/caddy-deploy-and-cicd.md, Phase 3 acceptance); these
 * cover the refusals, which a real machine rarely exercises. None of them
 * reaches Docker: each refusal comes first.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"

const ROOT = resolve(__dirname, "../../..")
const run = (script: string, args: string[], env: Record<string, string> = {}) =>
  spawnSync("bash", [join(ROOT, script), ...args], {
    encoding: "utf8",
    env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "test", ...env },
  })

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "deploy-scripts-"))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const DIGEST = `sha256:${"a".repeat(64)}`

function settings(lines: string[]) {
  writeFileSync(join(dir, "runtime.env"), "X='1'\n")
  const path = join(dir, "deploy.env")
  writeFileSync(path, [`APP_ENV_FILE=${join(dir, "runtime.env")}`, "CADDYFILE=caddy/Caddyfile.local", "SITE_HOST=localhost", `STATE_DIR=${dir}`, ...lines].join("\n") + "\n")
  return path
}

describe("infra/deploy.sh refuses", () => {
  it.each([
    ["a tag", "ghcr.io/reachjvc/daygame-coach-staging:staging"],
    ["latest", "daygame-coach:latest"],
    ["a short digest", "ghcr.io/x/y@sha256:abc"],
    ["a name with no digest", "daygame-coach"],
  ])("%s: only digests are deployed", (_, ref) => {
    const r = run("infra/deploy.sh", [ref], { DAYGAME_DEPLOY_ENV: settings([]) })
    expect(r.status).toBe(2)
    expect(r.stderr).toContain("Tags are never deployed")
  })

  it("a digest marked failed, unless asked on purpose", () => {
    const ref = `ghcr.io/reachjvc/daygame-coach-staging@${DIGEST}`
    writeFileSync(join(dir, "failed-digests"), `${ref}\n`)
    const r = run("infra/deploy.sh", [ref], { DAYGAME_DEPLOY_ENV: settings([]) })
    expect(r.status).toBe(2)
    expect(r.stderr).toContain("is marked failed")
  })

  it("a settings file with a key it does not know", () => {
    const r = run("infra/deploy.sh", [DIGEST], { DAYGAME_DEPLOY_ENV: settings(["SIET_HOST=typo"]) })
    expect(r.status).toBe(2)
    expect(r.stderr).toContain("unknown setting 'SIET_HOST'")
  })

  it("a machine with no settings at all", () => {
    const r = run("infra/deploy.sh", [DIGEST], { DAYGAME_DEPLOY_ENV: join(dir, "missing.env") })
    expect(r.status).toBe(2)
    expect(r.stderr).toContain("no machine settings")
  })
})

describe("infra/build-image.sh refuses", () => {
  it("something that is not a commit", () => {
    const r = run("infra/build-image.sh", ["not-a-commit-anywhere"])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain("is not a commit")
  })
})

describe("infra/write-env-file.sh", () => {
  const SECRET = "s3cret-value-that-must-not-print"
  const source = () => {
    const path = join(dir, "env.local")
    writeFileSync(
      path,
      [
        `NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co`,
        `NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-${SECRET}`,
        `SUPABASE_SERVICE_ROLE_KEY=service-${SECRET}`,
        `ANTHROPIC_API_KEY=anthropic-${SECRET}`,
        `TEST_USER_PASSWORD=test-${SECRET}`,
        `USE_CLAUDE_CODE=true`,
        `CLAUDE_PATH=/somewhere/claude`,
        `ENABLE_TEST_ROUTES=true`,
      ].join("\n"),
    )
    return path
  }
  const write = (env: Record<string, string>) =>
    run("infra/write-env-file.sh", ["staging"], { DAYGAME_CONFIG_DIR: join(dir, "cfg"), ...env })

  it("writes both files mode 600 in a 700 directory, and prints no value", () => {
    const r = write({ ENV_SOURCE: source() })
    expect(r.status, r.stderr).toBe(0)
    expect(r.stdout + r.stderr).not.toContain(SECRET)
    expect(statSync(join(dir, "cfg")).mode & 0o777).toBe(0o700)
    for (const f of ["staging.env", "build-public.env"]) {
      expect(statSync(join(dir, "cfg", f)).mode & 0o777, f).toBe(0o600)
    }
  })

  it("writes the server's variables, and leaves out test accounts, test routes and the Claude CLI", () => {
    write({ ENV_SOURCE: source() })
    const runtime = readFileSync(join(dir, "cfg", "staging.env"), "utf8")
    expect(runtime).toContain(`SUPABASE_SERVICE_ROLE_KEY='service-${SECRET}'`)
    expect(runtime).toContain(`ANTHROPIC_API_KEY='anthropic-${SECRET}'`)
    expect(runtime).toMatch(/^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY='[A-Za-z0-9+/]{43}='$/m)
    for (const left of ["TEST_USER_PASSWORD", "USE_CLAUDE_CODE", "CLAUDE_PATH", "ENABLE_TEST_ROUTES"]) {
      expect(runtime, left).not.toContain(left)
    }
    const pub = readFileSync(join(dir, "cfg", "build-public.env"), "utf8")
    expect(pub).toContain("NEXT_PUBLIC_APP_URL='https://localhost'")
    expect(pub).not.toContain("SERVICE_ROLE")
  })

  it("keeps the Server Actions key it generated, so a rerun does not log anyone out of a form", () => {
    write({ ENV_SOURCE: source() })
    const key = () => readFileSync(join(dir, "cfg", "staging.env"), "utf8").match(/^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=.*$/m)?.[0]
    const first = key()
    write({ ENV_SOURCE: source() })
    expect(key()).toBe(first)
  })

  it("refuses a value it cannot write literally, naming the variable and not the value", () => {
    const path = source()
    writeFileSync(path, readFileSync(path, "utf8") + `\nADMIN_SECRET_KEY="it's-${SECRET}"\n`)
    const r = write({ ENV_SOURCE: path })
    expect(r.status).toBe(1)
    expect(r.stderr).toContain("ADMIN_SECRET_KEY holds a newline or a single quote")
    expect(r.stdout + r.stderr).not.toContain(SECRET)
  })

  it("refuses when a required variable is missing", () => {
    const path = join(dir, "thin.env")
    writeFileSync(path, "NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co\n")
    const r = write({ ENV_SOURCE: path })
    expect(r.status).toBe(1)
    expect(r.stderr).toContain("SUPABASE_SERVICE_ROLE_KEY")
  })
})
