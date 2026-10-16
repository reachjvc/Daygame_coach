// @vitest-environment node
/**
 * THE PRODUCTION SERVER'S RULES, CHECKED BEFORE THE SERVER EXISTS.
 *
 * Phase 6 of Plans/caddy-deploy-and-cicd.md runs these files for real, once,
 * against the internet. Each rule below is one line that is easy to delete and
 * expensive to have deleted: HSTS on the real domain, password logins and
 * OpenSSH off, containers kept away from the metadata service and the tailnet,
 * no firewall rule that opens an internal port or forgets IPv6, no DNS record
 * behind Cloudflare's proxy, and a production image job that cannot publish a
 * red commit, run twice at once, or skip the owner's approval.
 */

import { describe, it, expect } from "vitest"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { parse } from "yaml"
import { spawnSync, type SpawnSyncOptionsWithStringEncoding } from "node:child_process"

const ROOT = resolve(__dirname, "../../..")
const read = (p: string) => readFileSync(join(ROOT, p), "utf8")
const withoutComments = (text: string) => text.replace(/^\s*#.*$/gm, "")

describe("the production Caddyfile", () => {
  const caddy = withoutComments(read("infra/caddy/Caddyfile.production"))

  it("sends HSTS for a year, without preload", () => {
    const hsts = caddy.match(/Strict-Transport-Security\s+"([^"]+)"/)
    expect(hsts, "Caddyfile.production no longer sends Strict-Transport-Security").not.toBeNull()
    expect(Number(hsts![1].match(/max-age=(\d+)/)?.[1])).toBeGreaterThanOrEqual(31536000)
    expect(hsts![1]).not.toMatch(/preload/)
  })

  it("has slow-client timeouts and no write timeout, so streamed pages survive", () => {
    expect(caddy).toMatch(/read_body\s+30s/)
    expect(caddy).toMatch(/read_header\s+10s/)
    expect(caddy).toMatch(/idle\s+2m/)
    expect(caddy).not.toMatch(/\bwrite\s+\d/)
  })

  it("gets certificates from Let's Encrypt only, matching the CAA record", () => {
    // ACME_DIRECTORY exists for the practice server; unset, it is Let's Encrypt.
    expect(caddy).toMatch(/cert_issuer acme \{\s*dir \{\$ACME_DIRECTORY:https:\/\/acme-v02\.api\.letsencrypt\.org\/directory\}\s*\}/)
    expect(caddy).not.toMatch(/zerossl|local_certs/i)
  })

  it("has no admin API, and shares everything else with staging", () => {
    expect(caddy).toMatch(/admin off/)
    expect(caddy).toMatch(/import \/etc\/caddy\/common\.caddy/)
  })

  it("receives its domain and ACME email from the server's settings, and Let's Encrypt unless told otherwise", () => {
    const compose = parse(read("infra/compose.yaml"))
    expect(compose.services.caddy.environment).toEqual({
      SITE_DOMAIN: "${SITE_HOST:-}",
      ACME_EMAIL: "${ACME_EMAIL:-}",
      ACME_DIRECTORY: "${ACME_DIRECTORY:-https://acme-v02.api.letsencrypt.org/directory}",
      SSL_CERT_FILE: "${ACME_CA_CERT:+/etc/caddy/acme-ca.pem}",
    })
    expect(compose.services.caddy.volumes).toContain("${ACME_CA_CERT:-/dev/null}:/etc/caddy/acme-ca.pem:ro")
    expect(caddy).toMatch(/\{\$SITE_DOMAIN\} \{/)
  })
})

describe("the first boot", () => {
  const raw = read("infra/server/cloud-init.yaml")
  const ci = parse(raw) as {
    ssh_pwauth: boolean
    users: Array<{ name: string; sudo?: unknown; lock_passwd?: boolean }>
    runcmd: string[][]
    write_files: Array<{ path: string; content: string }>
  }
  const runcmd = ci.runcmd.map((c) => c.join(" "))

  it("allows no password login and turns OpenSSH off", () => {
    expect(ci.ssh_pwauth).toBe(false)
    expect(runcmd).toContain("systemctl disable --now ssh.socket ssh.service")
    expect(runcmd).toContain("systemctl mask ssh.socket ssh.service")
  })

  it("gives the deploy user no password and no sudo", () => {
    const deploy = ci.users.find((u) => u.name === "deploy")!
    expect(deploy.lock_passwd).toBe(true)
    expect(deploy.sudo ?? null).toBeNull()
  })

  it("keeps containers away from the metadata service and the tailnet", () => {
    const rules = ci.write_files.find((f) => f.path === "/usr/local/sbin/daygame-docker-user-rules")!.content
    expect(rules).toMatch(/add iptables 169\.254\.169\.254\/32/)
    expect(rules).toMatch(/add iptables 100\.64\.0\.0\/10/)
    expect(rules).toMatch(/DOCKER-USER/)
    expect(runcmd).toContain("systemctl enable --now daygame-docker-user.service")
  })

  it("holds no real Tailscale key, only the placeholder provision.sh fills in", () => {
    expect(raw).toContain("--auth-key=@@TAILSCALE_AUTHKEY@@")
    expect(raw).not.toMatch(/tskey-[a-z]+-[A-Za-z0-9]{6,}/)
  })
})

describe("the firewall", () => {
  const script = read("infra/server/provision.sh")
  const rules = JSON.parse(script.match(/RULES='(\[[\s\S]*?\])'/)![1]) as Array<{
    direction: string
    protocol: string
    port: string
    source_ips: string[]
  }>

  it("opens only 80/tcp, 443/tcp and 443/udp", () => {
    expect(rules.map((r) => `${r.port}/${r.protocol}`).sort()).toEqual(["443/tcp", "443/udp", "80/tcp"])
  })

  it.each(["22", "3000", "5432", "11434", "2019"])("never opens %s", (port) => {
    expect(rules.some((r) => r.port === port || r.port.split("-").includes(port))).toBe(false)
  })

  it("covers IPv6 as well as IPv4 on every rule", () => {
    for (const r of rules) {
      expect(r.direction).toBe("in")
      expect(r.source_ips).toContain("0.0.0.0/0")
      expect(r.source_ips).toContain("::/0")
    }
  })
})

describe("secrets stay off command lines, and settings are never executed as root", () => {
  it("records.sh hands the Cloudflare token to curl in a header file", () => {
    const script = read("infra/dns/records.sh")
    expect(script).toMatch(/curl -fsS -H @"\$headers"/)
    expect(script).not.toMatch(/-H "Authorization: Bearer/)
  })

  it("provision.sh fills the Tailscale key in without passing it to another program", () => {
    expect(read("infra/server/provision.sh")).not.toMatch(/sed[^\n]*TAILSCALE_AUTHKEY/)
  })

  it("sync-infra.sh reads deploy.env instead of sourcing it", () => {
    const script = read("infra/server/sync-infra.sh")
    expect(script).not.toMatch(/\. \/etc\/daygame\/deploy\.env/)
    expect(script).toMatch(/grep -E '\^\(APP_ENV_FILE\|CADDYFILE\|SITE_HOST\|ACME_EMAIL\|ACME_DIRECTORY\|ACME_CA_CERT\)=\[A-Za-z0-9\._@\/:\+-\]\+/)
  })
})

describe("a real domain can only use Let's Encrypt (the practice CA is for .test names)", () => {
  const env = { PATH: process.env.PATH, HOME: process.env.HOME }

  it.each(["WATCH", "ACME_DIRECTORY", "ACME_CA_CERT", "CA_CERT"])("push-env.sh refuses %s for a real domain", (key) => {
    const r = spawnSync("bash", [join(ROOT, "infra/server/push-env.sh"), "--dry-run", "example.com", "ops@example.com"], {
      encoding: "utf8",
      env: { ...env, [key]: key === "WATCH" ? "ghcr.io/x/y:z" : "https://10.0.2.2:14000/dir" },
    })
    expect(r.status).toBe(1)
    expect(r.stderr).toContain("are for the practice server only, and 'example.com' is not a .test name")
  })

  it("push-env.sh writes them for a .test name, and production's tag otherwise", () => {
    const practice = spawnSync("bash", [join(ROOT, "infra/server/push-env.sh"), "--dry-run", "practice.daygame.test", "ops@daygame.test"], {
      encoding: "utf8",
      env: { ...env, ACME_DIRECTORY: "https://10.0.2.2:14000/dir" },
    })
    expect(practice.stdout).toContain("ACME_DIRECTORY=https://10.0.2.2:14000/dir")
    const real = spawnSync("bash", [join(ROOT, "infra/server/push-env.sh"), "--dry-run", "example.com", "ops@example.com"], { encoding: "utf8", env })
    expect(real.stdout).toContain("WATCH=ghcr.io/reachjvc/daygame-coach-production:production")
    expect(real.stdout).not.toContain("ACME_DIRECTORY")
  })

  it("deploy.sh refuses a practice CA for a real domain, before touching anything", () => {
    const dir = mkdtempSync(join(tmpdir(), "production-test-"))
    try {
      const settings = join(dir, "deploy.env")
      writeFileSync(join(dir, "runtime.env"), "X='1'\n")
      writeFileSync(
        settings,
        [`APP_ENV_FILE=${join(dir, "runtime.env")}`, "CADDYFILE=caddy/Caddyfile.production", "SITE_HOST=example.com", `STATE_DIR=${dir}`, "ACME_DIRECTORY=https://10.0.2.2:14000/dir"].join("\n") + "\n",
      )
      const r = spawnSync("bash", [join(ROOT, "infra/deploy.sh"), `sha256:${"a".repeat(64)}`], { encoding: "utf8", env: { ...env, DAYGAME_DEPLOY_ENV: settings } })
      expect(r.status).toBe(2)
      expect(r.stderr).toContain("is not a .test name. A real domain gets its certificates from Let's Encrypt.")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe("a new server is set up in the order the rehearsal proved (Phase 5b)", () => {
  const script = withoutComments(read("infra/server/sync-infra.sh"))

  it("sync-infra.sh stops before installing anything until push-env.sh has written deploy.env", () => {
    const guard = script.indexOf('ssh_root "test -f /etc/daygame/deploy.env"')
    expect(guard).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(script.indexOf('tar -C "$stage" -c'))
  })

  it("starts Caddy before the timers, so the agent's first run finds it up", () => {
    expect(script.indexOf("up -d --quiet-pull --no-deps caddy")).toBeGreaterThan(-1)
    expect(script.indexOf("up -d --quiet-pull --no-deps caddy")).toBeLessThan(script.indexOf("systemctl daemon-reload"))
  })

  it("rewrites only what changed, so systemd never sees an unchanged unit as changed on disk", () => {
    // 2026-10-16, the rehearsal: every run reinstalled every unit, and systemd
    // warned "changed on disk. Run 'systemctl daemon-reload'" after each one.
    expect(script).toContain('cmp -s \\"\\$tmp/units/\\$u\\" /etc/systemd/system/\\$u || install -m 644')
    expect(script).toContain('cmp -s \\"\\$tmp/infra/\\$f\\" $DEST/\\$f || install')
  })

  it("installs the disk alert and its timer with the agent", () => {
    expect(script).toMatch(/FILES=\([^)]*infra\/disk-alert\.sh/)
    expect(script).toMatch(/UNITS=\([^)]*daygame-disk\.service daygame-disk\.timer/)
    expect(script).toMatch(/TIMERS=\(daygame-deploy\.timer daygame-disk\.timer\)/)
  })
})

describe("spending money is the owner's act", () => {
  it("provision.sh refuses to create a server without a person at a terminal typing yes", () => {
    // An AI session has no terminal: it can run the dry run and nothing else.
    // `detached` is honoured by spawnSync at runtime (a new session, so no
    // controlling terminal), but Node's types list it for spawn only; written
    // inline it failed the type ratchet in CI on 7e16b812.
    const options = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], detached: true } as SpawnSyncOptionsWithStringEncoding
    const r = spawnSync("bash", [join(ROOT, "infra/server/provision.sh")], options)
    expect(r.status).toBe(1)
    expect(r.stderr).toContain("only a person at a terminal can run it")
  })
})

describe("DNS", () => {
  it("never puts a record behind Cloudflare's proxy (Q11: Caddy owns TLS end to end)", () => {
    const script = read("infra/dns/records.sh")
    expect(script).not.toMatch(/proxied\s*:\s*true/)
    expect(script).toMatch(/proxied:false/)
    expect(script).toMatch(/CAA \$domain 0 issue \\"letsencrypt\.org\\"/)
    expect(script).toMatch(/TXT \$domain v=spf1 -all/)
    expect(script).toMatch(/TXT _dmarc\.\$domain v=DMARC1; p=reject/)
  })

  it("replaces only the record of the same kind, and stops when there are several", () => {
    // An apex TXT record is often someone's verification token; overwriting it
    // because it came back first would be silent and hard to undo.
    const script = read("infra/dns/records.sh")
    expect(script).toContain('select(.content | ltrimstr("\\"") | startswith($p))')
    expect(script).toContain('select(.data.tag == "issue")')
    expect(script).toMatch(/\[ "\$existing" != MANY \] \|\| die/)
  })
})

describe("the production jobs", () => {
  type Job = {
    needs?: string
    if?: string
    environment?: string
    concurrency?: { group: string; "cancel-in-progress": boolean }
    steps?: Array<{ name?: string; run?: string; uses?: string; env?: Record<string, string> }>
  }
  const jobs = (parse(read(".github/workflows/ci.yml")) as { jobs: Record<string, Job> }).jobs
  const image = jobs["image-production"]
  const verify = jobs["verify-production"]

  it("publish only after green checks, on a push to main, when switched on", () => {
    expect(image.needs).toBe("checks")
    for (const part of [
      "!cancelled()",
      "needs.checks.result == 'success'",
      "github.event_name == 'push'",
      "github.ref == 'refs/heads/main'",
      "vars.PRODUCTION_PUBLISH == 'on'",
    ]) {
      expect(image.if, part).toContain(part)
    }
  })

  it("wait for the owner's approval, and never run two at once", () => {
    expect(image.environment).toBe("production")
    expect(image.concurrency).toEqual({ group: "publish-production", "cancel-in-progress": false })
  })

  it("refuse a commit that is no longer main's tip, and show e2e.yml's answer beside the approval", () => {
    const names = (image.steps ?? []).map((s) => s.name)
    expect(names.indexOf("Only main's tip is published")).toBeGreaterThan(-1)
    expect(names.indexOf("Only main's tip is published")).toBeLessThan(
      (image.steps ?? []).findIndex((s) => s.uses === "./.github/actions/publish-image"),
    )
    expect((image.steps ?? []).some((s) => s.run?.includes(".github/workflows/e2e.yml") && s.run?.includes("GITHUB_STEP_SUMMARY"))).toBe(true)
  })

  it("verify the site itself, after a successful publish, without a second approval", () => {
    expect(verify.needs).toBe("image-production")
    expect(verify.if).toBe("${{ !cancelled() && needs.image-production.result == 'success' }}")
    expect(verify.environment).toBeUndefined()
    const step = (verify.steps ?? [])[0]
    expect(step.env?.SITE_DOMAIN).toBe("${{ vars.SITE_DOMAIN }}")
    expect(step.run).toMatch(/https:\/\/\$SITE_DOMAIN\/api\/healthz/)
    expect(step.run).toMatch(/SECONDS \+ 600/)
  })
})
