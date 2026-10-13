// @vitest-environment node
/**
 * THE DEPLOYMENT'S RULES, MADE TO BITE.
 *
 * `infra/` holds the only statement of what a machine running this app is: the
 * image (infra/Dockerfile), what goes into it (.dockerignore), how it runs
 * (infra/compose.yaml) and what stands in front of it (infra/caddy/). Each rule
 * below is invisible until the day it is broken, and each break looks like
 * nothing at all until then:
 *
 *   1. NO PORT FOR THE APP. Caddy reaches the app over the compose network. A
 *      `ports:` entry would put the app on the machine's network with no proxy
 *      in front of it, which Next's own self-hosting guide tells you not to do.
 *      Nothing fails; it just becomes true.
 *
 *   2. NO HSTS LOCALLY. Strict-Transport-Security applies to a HOST and ignores
 *      the PORT, so serving it for `localhost` makes the browser force HTTPS on
 *      http://localhost:3000 as well — the owner's `next dev`, which has no
 *      certificate. It presents as a dead dev server. (The production
 *      Caddyfile must send it; tests/unit/infra/production.test.ts guards that
 *      with the file itself.)
 *
 *   3. NOTHING STAYS DOWN OR FILLS THE DISK: restart policies, capped logs,
 *      size-capped tmpfs, the persistent certificate volume.
 *
 *   4. THE IMAGE HOLDS NO SECRET AND RUNS AS NOBODY IMPORTANT: an allow-list
 *      .dockerignore that still excludes .env*, no secret at build time, a
 *      non-root user, a read-only filesystem, and `exec` so the stop signal
 *      reaches Next.
 *
 *   5. A MISSING SETTING STOPS COMPOSE instead of starting something
 *      half-configured, and the preview headers a leaked build key would need
 *      are stripped at the proxy.
 *
 * The port-agreement and loopback tests that guarded the systemd deployment
 * went with it (2026-10-13): there is no host port and no `next start` any more.
 *
 * Text and YAML assertions, because these files are the only statement of what
 * the machine is; there is no second copy to compare them against.
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { parse } from "yaml"

const ROOT = resolve(__dirname, "../../..")
const read = (p: string) => readFileSync(join(ROOT, p), "utf8")
const withoutComments = (text: string) => text.replace(/^\s*#.*$/gm, "")

const COMPOSE = "infra/compose.yaml"
const DOCKERFILE = "infra/Dockerfile"
const DOCKERIGNORE = ".dockerignore"
const CADDYFILE_LOCAL = "infra/caddy/Caddyfile.local"
const COMMON = "infra/caddy/common.caddy"

type Service = {
  image?: string
  env_file?: string
  ports?: unknown[]
  restart?: string
  logging?: { options?: Record<string, string> }
  tmpfs?: string[]
  read_only?: boolean
  cap_drop?: string[]
  security_opt?: string[]
  mem_limit?: string
  init?: boolean
  volumes?: string[]
}
const compose = parse(read(COMPOSE)) as { name: string; services: Record<string, Service>; networks: Record<string, { enable_ipv6?: boolean }> }
const app = compose.services.app
const caddy = compose.services.caddy

describe("the app is reachable only through Caddy", () => {
  it("publishes no port", () => {
    expect(app.ports, `${COMPOSE}: the app must not publish a port; Caddy reaches it as app:3000.`).toBeUndefined()
    expect(read(COMPOSE)).not.toMatch(/network_mode:\s*host/)
  })

  it("Caddy proxies to the app over the compose network", () => {
    expect(withoutComments(read(COMMON))).toMatch(/reverse_proxy\s+app:3000/)
  })
})

describe("HSTS is kept away from localhost", () => {
  it("the local Caddyfile, and what it imports, send no HSTS header", () => {
    for (const file of [CADDYFILE_LOCAL, COMMON]) {
      expect(
        /strict-transport-security/i.test(withoutComments(read(file))),
        `${file} sets Strict-Transport-Security. That header ignores the port, so it would force HTTPS on http://localhost:3000 — the dev server, which has no certificate.`,
      ).toBe(false)
    }
    expect(withoutComments(read(CADDYFILE_LOCAL))).toMatch(/import\s+\/etc\/caddy\/common\.caddy/)
  })
})

describe("nothing stays down or fills the disk", () => {
  it.each([
    ["app", app],
    ["caddy", caddy],
  ])("%s restarts itself and caps its logs", (name, service) => {
    expect(service.restart, `${COMPOSE} ${name}: no restart policy`).toBe("unless-stopped")
    expect(service.logging?.options?.["max-size"], `${COMPOSE} ${name}: unbounded logs`).toBeDefined()
    expect(service.logging?.options?.["max-file"], `${COMPOSE} ${name}: unbounded log files`).toBeDefined()
  })

  it("the app's writable places are size-capped tmpfs", () => {
    const tmpfs = app.tmpfs ?? []
    expect(tmpfs.find((t) => t.startsWith("/tmp:"))).toMatch(/size=\d+m/)
    expect(tmpfs.find((t) => t.startsWith("/app/.next/cache:"))).toMatch(/size=\d+m/)
    // .next/server holds the prerendered pages; a mount there would hide them.
    expect(tmpfs.some((t) => t.startsWith("/app/.next/server"))).toBe(false)
  })

  it("the certificate volume is the persistent one the old deployment used", () => {
    // `name: infra` + `caddy_data` is the existing volume infra_caddy_data: a new
    // one would mint a new local root and break the one trusted in a browser.
    expect(compose.name).toBe("infra")
    expect(caddy.volumes).toContain("caddy_data:/data")
    expect(caddy.volumes).toContain("caddy_config:/config")
  })
})

describe("the container holds no secret and has no power it does not need", () => {
  const dockerfile = withoutComments(read(DOCKERFILE))

  it("runs as a non-root user, read-only, with no capabilities and a memory limit", () => {
    expect(dockerfile).toMatch(/^USER\s+1000:1000\s*$/m)
    expect(app.read_only).toBe(true)
    expect(app.cap_drop).toEqual(["ALL"])
    expect(app.security_opt).toContain("no-new-privileges:true")
    expect(app.mem_limit).toBe("2g")
    expect(app.init).toBe(true)
  })

  it("execs the server, so the stop signal reaches Next and it drains", () => {
    expect(dockerfile).toMatch(/CMD \["sh", "-c", "node scripts\/check-runtime-env\.mjs && exec node server\.js"\]/)
  })

  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_APP_URL", "BUILD_SHA"])(
    "refuses to build without %s",
    (arg) => {
      expect(dockerfile).toMatch(new RegExp(`\\$\\{${arg}:\\?`))
    },
  )

  it("never receives the Server Actions key at build time", () => {
    // Each server sets its own at runtime, which replaces the one a build bakes in.
    expect(dockerfile).not.toMatch(/NEXT_SERVER_ACTIONS_ENCRYPTION_KEY/)
  })

  it(".dockerignore is an allow-list that still shuts out every .env file", () => {
    const lines = withoutComments(read(DOCKERIGNORE)).split("\n").map((l) => l.trim()).filter(Boolean)
    expect(lines[0], "the first rule excludes everything").toBe("*")
    const lastEnvRule = lines.lastIndexOf("**/.env*")
    expect(lastEnvRule, ".dockerignore no longer excludes .env* files").toBeGreaterThan(-1)
    // A later `!` rule could let one back in.
    expect(lines.slice(lastEnvRule + 1).some((l) => l.startsWith("!"))).toBe(false)
  })
})

describe("a missing setting stops compose, and the proxy strips what a leaked key needs", () => {
  it("fails on a missing image, env file or Caddyfile instead of guessing", () => {
    expect(app.image).toMatch(/^\$\{APP_IMAGE:\?/)
    expect(app.env_file).toMatch(/^\$\{APP_ENV_FILE:\?/)
    expect(caddy.volumes?.[0]).toMatch(/^\.\/\$\{CADDYFILE:\?/)
  })

  it("strips the preview and subrequest headers before they reach the app", () => {
    const common = withoutComments(read(COMMON))
    for (const header of ["x-prerender-revalidate*", "x-middleware-subrequest", "x-next-revalidate*"]) {
      expect(common, `${COMMON} no longer strips ${header}`).toContain(`request_header -${header}`)
    }
  })

  it("pins Caddy by digest", () => {
    expect(caddy.image).toMatch(/^caddy:[\w.-]+@sha256:[0-9a-f]{64}$/)
  })

  it("keeps IPv6 visitors' own addresses", () => {
    expect(compose.networks.web.enable_ipv6).toBe(true)
  })
})
