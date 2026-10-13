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
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { parse } from "yaml"

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
    expect(caddy).toMatch(/cert_issuer acme \{\s*dir https:\/\/acme-v02\.api\.letsencrypt\.org\/directory\s*\}/)
    expect(caddy).not.toMatch(/zerossl|local_certs/i)
  })

  it("has no admin API, and shares everything else with staging", () => {
    expect(caddy).toMatch(/admin off/)
    expect(caddy).toMatch(/import \/etc\/caddy\/common\.caddy/)
  })

  it("receives its domain and ACME email from the server's settings", () => {
    const compose = parse(read("infra/compose.yaml"))
    expect(compose.services.caddy.environment).toEqual({ SITE_DOMAIN: "${SITE_HOST:-}", ACME_EMAIL: "${ACME_EMAIL:-}" })
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
