// @vitest-environment node
/**
 * THE DEPLOYMENT'S RULES, MADE TO BITE.
 *
 * `infra/` carries four rules that are invisible until the day they are broken,
 * and each of them is currently written down in more than one file. A rule
 * stored twice is a rule that can disagree with itself, which is the shape of
 * half the failures in docs/known-failures.md.
 *
 *   1. THE PORT. 3100 appears in the Caddyfile, in the systemd unit and in
 *      run-local.sh. Change one and the proxy answers 502 — on a deployment
 *      whose whole point is that it is not the dev server, so nobody is
 *      watching it closely.
 *
 *   2. LOOPBACK ONLY. `next start` binds every interface unless given
 *      -H 127.0.0.1. Drop that flag and the app is reachable on the LAN with no
 *      proxy in front of it, which is the one thing Next.js's own self-hosting
 *      guide tells you not to do. Nothing fails; it just becomes true.
 *
 *   3. NO HSTS LOCALLY. Strict-Transport-Security applies to a HOST and ignores
 *      the PORT, so serving it for `localhost` makes the browser force HTTPS on
 *      http://localhost:3000 as well — the owner's `next dev`, which has no
 *      certificate. One header here breaks the daily driver, and it presents as
 *      a dead dev server rather than as a proxy misconfiguration.
 *
 *   4. ...AND HSTS ON THE REAL DOMAIN, when that file arrives. The same rule
 *      inverts once there is a public hostname, so the guard inverts with it
 *      rather than being deleted.
 *
 * Why text assertions. These files are the only statement of what the machine
 * is; there is no second copy to compare them against. So this reads them the
 * way Caddy and systemd read them, exactly as tests/unit/ciWorkflows.test.ts
 * reads the workflow YAML and tests/unit/hooks/hookCommandPaths.test.ts reads
 * settings.json.
 */

import { describe, it, expect } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"

const ROOT = resolve(__dirname, "../../..")
const read = (p: string) => readFileSync(join(ROOT, p), "utf8")

const CADDYFILE_LOCAL = "infra/caddy/Caddyfile.local"
const CADDYFILE_PROD = "infra/caddy/Caddyfile.production"
const UNIT = "infra/systemd/daygame-local.service.template"
const SCRIPT = "infra/run-local.sh"
const COMPOSE = "infra/compose.local.yaml"

describe("the local deployment's files agree with each other", () => {
  it("every file that names the app's port names the same one", () => {
    const caddy = read(CADDYFILE_LOCAL).match(/reverse_proxy\s+127\.0\.0\.1:(\d+)/)
    const unit = read(UNIT).match(/next start .*-p (\d+)/)
    const script = read(SCRIPT).match(/^APP_PORT=(\d+)/m)

    expect(caddy, `${CADDYFILE_LOCAL} no longer proxies to 127.0.0.1:<port>`).not.toBeNull()
    expect(unit, `${UNIT} no longer starts Next with an explicit -p <port>`).not.toBeNull()
    expect(script, `${SCRIPT} no longer declares APP_PORT`).not.toBeNull()

    const ports = { caddy: caddy![1], unit: unit![1], script: script![1] }
    expect(
      new Set(Object.values(ports)).size,
      `these three disagree about the app's port, so Caddy will answer 502: ${JSON.stringify(ports)}`,
    ).toBe(1)
  })

  it("the app is started on loopback only, so the proxy is the only door in", () => {
    // -H / --hostname is what stops `next start` listening on every interface.
    expect(
      /next start .*(-H|--hostname)\s+127\.0\.0\.1/.test(read(UNIT)),
      `${UNIT} must start Next with -H 127.0.0.1. Without it the app answers on the machine's LAN address with no proxy in front of it.`,
    ).toBe(true)
  })

  it("run-local.sh still proves the loopback rule instead of asserting it", () => {
    // The check that is easiest to quietly delete, because everything still
    // works without it — right up until the app is on the network.
    const script = read(SCRIPT)
    expect(
      script.includes("hostname -I"),
      `${SCRIPT} no longer checks the machine's own LAN address. That check is the only thing that would notice the app had stopped being loopback-only.`,
    ).toBe(true)
    expect(
      /loopback-only/.test(script),
      `${SCRIPT} no longer reports on the loopback guarantee.`,
    ).toBe(true)
  })
})

describe("HSTS is kept away from localhost and required on the real domain", () => {
  const HSTS = /strict-transport-security/i

  it("the local Caddyfile sends no HSTS header", () => {
    expect(
      HSTS.test(read(CADDYFILE_LOCAL).replace(/^\s*#.*$/gm, "")),
      `${CADDYFILE_LOCAL} sets Strict-Transport-Security. That header ignores the port, so it would force HTTPS on http://localhost:3000 — the dev server, which has no certificate — and present as a dead dev server.`,
    ).toBe(false)
  })

  it("the production Caddyfile, once it exists, does send HSTS", () => {
    // Phase 6 of docs/plans/local-deploy-and-cd-pipeline.md creates this file.
    // Until then there is nothing to check, and saying so is better than a
    // test that silently passes on a missing file forever.
    if (!existsSync(join(ROOT, CADDYFILE_PROD))) {
      expect(existsSync(join(ROOT, CADDYFILE_LOCAL))).toBe(true)
      return
    }
    expect(
      HSTS.test(read(CADDYFILE_PROD).replace(/^\s*#.*$/gm, "")),
      `${CADDYFILE_PROD} exists but sets no Strict-Transport-Security. On a real domain that header is wanted; it is only localhost it must stay away from.`,
    ).toBe(true)
  })
})

describe("the proxy cannot quietly fill the disk or stay down", () => {
  it("Caddy restarts itself and caps its logs", () => {
    const compose = read(COMPOSE)
    expect(
      /restart:\s*unless-stopped/.test(compose),
      `${COMPOSE} has no restart policy, so Caddy stays down after a crash or a reboot.`,
    ).toBe(true)
    // Docker's default json-file driver has no size limit at all, and the disk
    // is the single point of failure on a one-box deployment.
    expect(
      /max-size:/.test(compose),
      `${COMPOSE} does not cap the container log size. Docker's default is unbounded.`,
    ).toBe(true)
  })

  it("the certificate volume is persistent, so the trusted root survives a restart", () => {
    // A fresh volume means a fresh CA root, which means the root the owner
    // trusted in their browser stops matching and a working site starts
    // showing certificate errors.
    expect(
      /caddy_data:\s*\/data/.test(read(COMPOSE)),
      `${COMPOSE} no longer mounts a named volume at /data. Caddy would mint a new CA root on every restart and invalidate the one trusted in the browser.`,
    ).toBe(true)
  })
})
