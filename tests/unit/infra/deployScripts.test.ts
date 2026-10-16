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
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
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

  it("a failed digest even when the settings are written with quotes, which it reads like the other scripts", () => {
    const ref = `ghcr.io/reachjvc/daygame-coach-staging@${DIGEST}`
    writeFileSync(join(dir, "failed-digests"), `${ref}\n`)
    writeFileSync(join(dir, "runtime.env"), "X='1'\n")
    const path = join(dir, "quoted.env")
    writeFileSync(
      path,
      [`APP_ENV_FILE='${join(dir, "runtime.env")}'`, "CADDYFILE='caddy/Caddyfile.local'", "SITE_HOST='localhost'", `STATE_DIR='${dir}'`].join("\n") + "\n",
    )
    const r = run("infra/deploy.sh", [ref], { DAYGAME_DEPLOY_ENV: path })
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

describe("infra/deploy.sh starting a container", () => {
  // A stand-in Docker that behaves like compose about the working directory:
  // it refuses to run from a directory it cannot read.
  const docker = `case "$*" in
  "inspect -f {{.State.Running}} dg-caddy") echo true ;;
  "image inspect -f"*revision*) echo ${"b".repeat(40)} ;;
  "image inspect"*) exit 0 ;;
  "inspect -f"*dg-app) echo "" ;;
  compose*) ls . >/dev/null 2>&1 || { echo "validating compose.yaml: stat .: permission denied" >&2; exit 1; }
            case "$*" in *" up "*) echo "compose: up failed for a reason" >&2; exit 1 ;; esac ;;
esac`
  const deploy = (cwd: string) =>
    spawnSync("bash", [join(ROOT, "infra/deploy.sh"), DIGEST], {
      cwd,
      encoding: "utf8",
      env: { ...fakes({ docker, curl: "echo 308", logger: "exit 0" }), HOME: process.env.HOME, NODE_ENV: "test", DAYGAME_DEPLOY_ENV: settings([]), HEALTH_WAIT_SECONDS: "1" },
    })

  it("runs compose from its own directory, so a caller's unreadable directory cannot stop it", () => {
    // 2026-10-16, the rehearsal: `su deploy -c` from root's home made every
    // compose call fail with "stat .: permission denied".
    const locked = join(dir, "locked")
    mkdirSync(locked)
    chmodSync(locked, 0o111) // enterable, not readable, like root's home to the deploy user
    try {
      const r = deploy(locked)
      expect(r.stderr).not.toContain("permission denied")
      expect(r.stderr).toContain("compose: up failed for a reason")
    } finally {
      chmodSync(locked, 0o755)
    }
  })

  it("--restart refuses an image that is not the one running", () => {
    const r = spawnSync("bash", [join(ROOT, "infra/deploy.sh"), "--restart", DIGEST], {
      cwd: dir,
      encoding: "utf8",
      env: { ...fakes({ docker, curl: "echo 308", logger: "exit 0" }), HOME: process.env.HOME, NODE_ENV: "test", DAYGAME_DEPLOY_ENV: settings([]) },
    })
    expect(r.status).toBe(2)
    expect(r.stderr).toContain("--restart starts the app's own image again")
  })

  it("--restart recreates the running container, so new settings take effect", () => {
    const running = `case "$*" in "inspect -f"*dg-app) echo "${DIGEST}"; exit 0 ;; esac\n${docker}`
    spawnSync("bash", [join(ROOT, "infra/deploy.sh"), "--restart", DIGEST], {
      cwd: dir,
      encoding: "utf8",
      env: { ...fakes({ docker: running, curl: "echo 308", logger: "exit 0" }), HOME: process.env.HOME, NODE_ENV: "test", DAYGAME_DEPLOY_ENV: settings([]), HEALTH_WAIT_SECONDS: "1" },
    })
    expect(calls("docker").some((c) => /compose .* up -d --no-deps --force-recreate app$/.test(c))).toBe(true)
  })

  it("--restart starts a stopped app container too, from the image on the machine", () => {
    const ref = `ghcr.io/x/y@${DIGEST}`
    const stopped = `case "$*" in *State.Running*dg-app) echo ""; exit 0 ;; *Config.Image*dg-app) echo "${ref}"; exit 0 ;; esac\n${docker}`
    const r = spawnSync("bash", [join(ROOT, "infra/deploy.sh"), "--restart", ref], {
      cwd: dir,
      encoding: "utf8",
      env: { ...fakes({ docker: stopped, curl: "echo 308", logger: "exit 0" }), HOME: process.env.HOME, NODE_ENV: "test", DAYGAME_DEPLOY_ENV: settings([]), HEALTH_WAIT_SECONDS: "1" },
    })
    expect(r.stderr).not.toContain("is not it")
    expect(calls("docker").some((c) => /compose .* up -d --no-deps --force-recreate app$/.test(c))).toBe(true)
    expect(calls("docker").some((c) => c.startsWith("pull"))).toBe(false)
    expect(r.stderr).toContain("unhealthy after --restart")
  })

  it("--restart says so when another deploy holds the lock, instead of reporting nothing to do", () => {
    const lock = join(dir, "deploy.lock")
    const r = spawnSync("bash", ["-c", 'exec 8>"$1"; flock 8; bash "$2" --restart "$3"', "_", lock, join(ROOT, "infra/deploy.sh"), DIGEST], {
      encoding: "utf8",
      env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "test", DAYGAME_DEPLOY_ENV: settings([]) },
    })
    expect(r.status).toBe(1)
    expect(r.stderr).toContain("nothing restarted, try again in a minute")
  })

  it("says why compose could not start the app, instead of waiting out a health check", () => {
    const r = deploy(dir)
    expect(r.stderr).toMatch(/could not start sha256:a{64}: compose: up failed for a reason/)
    expect(r.status).toBe(1)
  })
})

describe("one deploy path, one lock", () => {
  it("deploy.sh locks in the state directory, so the agent and a person share one lock", () => {
    // XDG_RUNTIME_DIR differs between root and the deploy user, so a lock there
    // would let two deploys run at once.
    expect(readFileSync(join(ROOT, "infra/deploy.sh"), "utf8")).toMatch(/^lock="\$STATE_DIR\/deploy\.lock"$/m)
  })

  it("sync-infra.sh never starts or recreates the app; only deploy.sh does, with a health check", () => {
    const script = readFileSync(join(ROOT, "infra/server/sync-infra.sh"), "utf8").replace(/^\s*#.*$/gm, "")
    expect(script).not.toMatch(/up -d[^\n]*\bapp\b/)
  })

  it("the agent leaves a deferred digest alone for 15 minutes instead of retrying every minute", () => {
    const agent = readFileSync(join(ROOT, "infra/deploy-agent.sh"), "utf8")
    expect(agent).toMatch(/DEFER_SECONDS=900/)
    expect(agent).toMatch(/deferred-digests/)
  })
})

describe("infra/deploy-agent.sh refuses", () => {
  it("a watched reference that is not <repo>:<tag>", () => {
    const r = run("infra/deploy-agent.sh", [], { DAYGAME_DEPLOY_ENV: settings([`WATCH=ghcr.io/x/y@${DIGEST}`]) })
    expect(r.status).toBe(1)
    expect(r.stderr).toContain("is not <repo>:<tag>")
  })
})

describe("infra/build-image.sh", () => {
  it("extracts the commit with umask 022, so the image's non-root user can read its own files", () => {
    // 2026-10-13: a caller's umask 077 leaked into the extraction, every file
    // in the image became 0600 root-owned, and the container could not read
    // scripts/check-runtime-env.mjs. infra/deploy.sh caught it and stopped it.
    const script = readFileSync(join(ROOT, "infra/build-image.sh"), "utf8")
    const umask = script.indexOf("umask 022")
    expect(umask).toBeGreaterThan(-1)
    expect(umask).toBeLessThan(script.indexOf("archive --format=tar"))
  })

  it("checks for room on C: before it builds, and trims its cache after", () => {
    // 2026-10-13: a full C: detached WSL and killed every session, while the
    // builder held 30 GB of cache. B-DISK in Plans/caddy-deploy-and-cicd.md.
    const script = readFileSync(join(ROOT, "infra/build-image.sh"), "utf8")
    const guard = script.indexOf("df -BG --output=avail /mnt/c")
    expect(guard).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(script.indexOf("docker buildx build"))
    expect(script).toMatch(/docker buildx prune --builder "\$BUILDER" --keep-storage 4gb/)
  })

  it("refuses something that is not a commit", () => {
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

  it("writes production's file with the domain's URL and keeps the server's own Server Actions key", () => {
    const serverKey = "A".repeat(43) + "="
    const r = run("infra/write-env-file.sh", ["production", "example.com"], {
      DAYGAME_CONFIG_DIR: join(dir, "cfg"),
      ENV_SOURCE: source(),
      SERVER_ACTIONS_KEY: serverKey,
    })
    expect(r.status, r.stderr).toBe(0)
    const prod = readFileSync(join(dir, "cfg", "production.env"), "utf8")
    expect(prod).toContain("NEXT_PUBLIC_APP_URL='https://example.com'")
    expect(prod).toContain(`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY='${serverKey}'`)
    expect(statSync(join(dir, "cfg", "production.env")).mode & 0o777).toBe(0o600)
    expect(() => statSync(join(dir, "cfg", "build-public.env")), "production writes no build file").toThrow()
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

/** A directory of stand-ins first on PATH: each records its arguments, one call per line. */
function fakes(scripts: Record<string, string>) {
  const bin = join(dir, "bin")
  mkdirSync(bin, { recursive: true })
  for (const [name, body] of Object.entries(scripts)) {
    // curl -K - reads its URL from stdin: keep that too.
    const stdin = name === "curl" ? `case "$*" in *"-K -"*) cat >> "${join(dir, name)}.stdin" ;; esac\n` : ""
    writeFileSync(join(bin, name), `#!/bin/sh\nprintf '%s\\n' "$*" >> "${join(dir, name)}.calls"\n${stdin}${body}\n`, { mode: 0o755 })
  }
  return { PATH: `${bin}:${process.env.PATH}` }
}
/** The URLs curl was handed on stdin (`url = "..."`), in order. */
const urls = () => {
  try {
    return [...readFileSync(join(dir, "curl.stdin"), "utf8").matchAll(/^url = "(.*)"$/gm)].map((m) => m[1])
  } catch {
    return []
  }
}
const calls = (name: string) => {
  try {
    return readFileSync(join(dir, `${name}.calls`), "utf8").trim().split("\n").filter(Boolean)
  } catch {
    return []
  }
}

describe("the dead-man's switch (infra/deploy-agent.sh, PING_URL)", () => {
  const TARGET = `ghcr.io/x/y@${DIGEST}`
  // The registry says the tag points at TARGET, and TARGET is what runs: "up to date".
  const upToDate = () =>
    fakes({
      docker: `case "$*" in *imagetools*) echo '{"digest":"${DIGEST}"}' ;; inspect*) echo '${TARGET}' ;; esac`,
      curl: "exit 0",
      logger: "exit 0",
    })
  const agent = (lines: string[], env: Record<string, string>) =>
    run("infra/deploy-agent.sh", [], { DAYGAME_DEPLOY_ENV: settings(lines), INFRA_VERSION_FILE: join(dir, "missing"), ...env })

  it("is off when PING_URL is unset: no request, and the log says so", () => {
    const r = agent(["WATCH=ghcr.io/x/y:staging"], upToDate())
    expect(r.status, r.stderr).toBe(0)
    expect(r.stderr).toContain("up to date")
    expect(r.stderr).toContain("dead-man's switch off: PING_URL is not set")
    expect(calls("curl")).toEqual([])
  })

  it("pings PING_URL after a good run, and never logs the URL", () => {
    const r = agent(["WATCH=ghcr.io/x/y:staging", "PING_URL=https://hc-ping.com/secret-uuid"], upToDate())
    expect(r.status, r.stderr).toBe(0)
    expect(urls()).toEqual(["https://hc-ping.com/secret-uuid"])
    expect(r.stderr).toContain("dead-man's switch pinged (ok)")
    expect(r.stderr).not.toContain("secret-uuid")
    // Not on curl's command line either, where `ps` would show it.
    expect(calls("curl").join("\n")).not.toContain("secret-uuid")
  })

  it("pings PING_URL/fail when the run fails, and keeps the run's exit status", () => {
    const r = agent([`WATCH=ghcr.io/x/y@${DIGEST}`, "PING_URL=https://hc-ping.com/secret-uuid"], upToDate())
    expect(r.status).toBe(1)
    expect(urls()).toEqual(["https://hc-ping.com/secret-uuid/fail"])
  })

  it("does not let a failing ping change a good run's outcome", () => {
    const env = { ...upToDate(), ...fakes({ curl: "exit 7" }) }
    const r = agent(["WATCH=ghcr.io/x/y:staging", "PING_URL=https://hc-ping.com/secret-uuid"], env)
    expect(r.status).toBe(0)
    expect(r.stderr).toContain("could not ping the dead-man's switch (ok)")
  })

  it("hands a new digest to deploy.sh on a new machine, where nothing was ever deferred or failed", () => {
    // 2026-10-16, the rehearsal: with no deferred-digests file yet, the lookup
    // failed under pipefail and the agent exited 2 before its first deploy.
    const env = fakes({
      docker: `case "$*" in *imagetools*) echo '{"digest":"${DIGEST}"}' ;; esac`,
      curl: "exit 0",
      logger: "exit 0",
    })
    const r = agent(["WATCH=ghcr.io/x/y:staging", "PING_URL=https://hc-ping.com/secret-uuid"], env)
    expect(r.stderr).toContain(`new digest: ${TARGET} (running: nothing)`)
    // deploy.sh then stops at the stand-in Docker, and the switch reports that.
    expect(r.status).not.toBe(0)
    expect(r.stderr).toMatch(/run ended with exit status [1-9]/)
    expect(urls().at(-1)).toMatch(/\/fail$/)
  })

  it("refuses a tag other than production's on a real domain", () => {
    const r = agent(["WATCH=ghcr.io/x/daygame-coach-staging:staging", "SITE_HOST=example.com"], upToDate())
    expect(r.status).toBe(1)
    expect(r.stderr).toContain("is not production's tag, and example.com is a real domain")
  })

  it("deploy.sh accepts the alert settings in the shared file", () => {
    const ref = `ghcr.io/reachjvc/daygame-coach-staging@${DIGEST}`
    writeFileSync(join(dir, "failed-digests"), `${ref}\n`)
    const lines = ["PING_URL=https://a/b", "DISK_WARN_PING_URL=https://a/c", "DISK_CRIT_PING_URL=https://a/d"]
    const r = run("infra/deploy.sh", [ref], { DAYGAME_DEPLOY_ENV: settings(lines) })
    expect(r.stderr).not.toContain("unknown setting")
    expect(r.stderr).toContain("is marked failed")
  })
})

describe("the disk alerts (infra/disk-alert.sh, 25 % and 10 % free)", () => {
  // df -Pk as the filesystem would report it, with `free` percent available.
  const disk = (free: number) =>
    fakes({
      df: `printf 'Filesystem 1024-blocks Used Available Capacity Mounted on\\n/dev/vda1 1000 ${1000 - free * 10} ${free * 10} ${100 - free}%% /\\n'`,
      curl: "exit 0",
      logger: "exit 0",
    })
  const alert = (free: number, lines: string[]) =>
    run("infra/disk-alert.sh", [], { DAYGAME_DEPLOY_ENV: settings(lines), DOCKER_DATA: join(dir, "none"), ...disk(free) })
  const URLS = ["DISK_WARN_PING_URL=https://hc-ping.com/warn", "DISK_CRIT_PING_URL=https://hc-ping.com/crit"]
  const pinged = urls

  it("sends nothing when no URL is set, and says each level is off", () => {
    const r = alert(5, [])
    expect(r.status).toBe(1)
    expect(calls("curl")).toEqual([])
    expect(r.stderr).toContain("the 25 % alert is off: DISK_WARN_PING_URL is not set")
    expect(r.stderr).toContain("the 10 % alert is off: DISK_CRIT_PING_URL is not set")
  })

  it.each([
    [60, ["https://hc-ping.com/warn", "https://hc-ping.com/crit"], 0],
    [20, ["https://hc-ping.com/warn/fail", "https://hc-ping.com/crit"], 1],
    [5, ["https://hc-ping.com/warn/fail", "https://hc-ping.com/crit/fail"], 1],
  ])("with %i %% free it pings %j", (free, urls, status) => {
    const r = alert(free, URLS)
    expect(r.status, r.stderr).toBe(status)
    expect(pinged()).toEqual(urls)
    expect(r.stderr).toContain(`/ has ${free} % free`)
  })

  it("names the filesystem and the free space in the message it sends", () => {
    alert(20, URLS)
    expect(calls("curl")[0]).toMatch(/--data-raw .*: \/ has 20 % free, below 25 %/)
  })
})
