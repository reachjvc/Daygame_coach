// @vitest-environment node
/**
 * THE PIPELINE'S SAFETY RULES, READ FROM THE WORKFLOW FILES THEMSELVES.
 *
 * This repository is public, and CI is about to publish the images servers
 * run. A few lines of YAML decide whether someone else's pull request can run
 * with this repository's write token, whether a red check can still publish,
 * and whether a stale run can finish last. Each of those lines is easy to
 * delete without anything going red, so each one is asserted here.
 * (Plans/caddy-deploy-and-cicd.md, steps 2.6, 4.3 and 5.5.)
 *
 * `tests/unit/ciWorkflows.test.ts` belongs to another plan (which browser
 * projects run where); these rules live here so the two never collide.
 */

import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { parse, stringify } from "yaml"

const ROOT = resolve(__dirname, "../../..")
const DIR = join(ROOT, ".github/workflows")

type Job = {
  "runs-on"?: string
  if?: string
  permissions?: Record<string, string> | string
  environment?: string | { name: string }
  needs?: string | string[]
  concurrency?: unknown
  steps?: Array<{ id?: string; if?: string; uses?: string; run?: string; with?: Record<string, unknown>; env?: Record<string, unknown> }>
}
type Workflow = {
  on: Record<string, unknown> | string | string[]
  permissions?: Record<string, string> | string
  concurrency?: { group: string; "cancel-in-progress": string | boolean }
  jobs: Record<string, Job>
}

const FILES = readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f))
const load = (file: string): Workflow => parse(readFileSync(join(DIR, file), "utf8"))
const ci = load("ci.yml")

function triggers(w: Workflow): string[] {
  if (typeof w.on === "string") return [w.on]
  if (Array.isArray(w.on)) return w.on
  return Object.keys(w.on ?? {})
}

/** A job that pushes images (or anything else) somewhere: it may write packages. */
function publishingJobs(w: Workflow): Array<[string, Job]> {
  return Object.entries(w.jobs).filter(
    ([name, job]) =>
      /^image-/.test(name) || (typeof job.permissions === "object" && job.permissions.packages === "write"),
  )
}

const FULL_SHA = /^[^@\s]+@[0-9a-f]{40}$/

describe("no workflow runs someone else's code with this repository's rights", () => {
  it.each(FILES)("%s uses neither pull_request_target nor workflow_run", (file) => {
    // pull_request_target runs a fork's pull request with this repository's
    // secrets and write token. workflow_run fires only from main's copy of a
    // workflow, so on this repository it silently never fires (C1).
    const bad = triggers(load(file)).filter((t) => t === "pull_request_target" || t === "workflow_run")
    expect(bad).toEqual([])
  })
})

describe("ci.yml says what it may do, and stops its own stale runs", () => {
  it("grants the token only contents: read at the top", () => {
    expect(ci.permissions).toEqual({ contents: "read" })
  })

  it("cancels a superseded run, except on main, where a run may be waiting for approval", () => {
    expect(ci.concurrency).toEqual({
      group:
        "ci-${{ github.event_name }}-${{ github.ref }}${{ github.ref == 'refs/heads/main' && format('-{0}', github.run_id) || '' }}",
      "cancel-in-progress":
        "${{ (github.event_name == 'push' || github.event_name == 'pull_request') && github.ref != 'refs/heads/main' }}",
    })
  })

  it("pins the runner image instead of riding ubuntu-latest", () => {
    for (const [name, job] of Object.entries(ci.jobs)) {
      expect(job["runs-on"], `ci.yml job ${name}`).toBe("ubuntu-24.04")
    }
  })

  it("reads Node's version from .nvmrc, the one place it is written", () => {
    const setups = Object.values(ci.jobs).flatMap((job) =>
      (job.steps ?? []).filter((s) => s.uses?.startsWith("actions/setup-node@")),
    )
    expect(setups.length).toBeGreaterThan(0)
    for (const step of setups) {
      expect(step.with?.["node-version-file"]).toBe(".nvmrc")
      expect(step.with?.["node-version"]).toBeUndefined()
    }
  })

  it("scans the whole history for secrets and fails on a finding", () => {
    const checks = ci.jobs.static
    expect(checks, "ci.yml has a `static` job").toBeDefined()
    const checkout = (checks.steps ?? []).find((s) => s.uses?.startsWith("actions/checkout@"))
    expect(checkout?.with?.["fetch-depth"]).toBe(0)
    const scan = (checks.steps ?? []).find((s) => s.run?.includes("gitleaks"))
    expect(scan?.run).toMatch(/sha256sum -c/)
    expect(scan?.run).toMatch(/gitleaks" git --redact --no-banner --exit-code 1/)
  })

  it("runs the dependency audit ratchet", () => {
    expect((ci.jobs.static.steps ?? []).some((s) => s.run === "npm run audit:ratchet")).toBe(true)
  })
})

type Composite = { runs: { steps: Array<{ name?: string; uses?: string; run?: string; with?: Record<string, unknown> }> } }
const loadAction = (uses: string): Composite => parse(readFileSync(join(ROOT, uses, "action.yml"), "utf8"))

/** The actions a local composite action (`./.github/actions/x`) uses in turn. */
function localActionUses(uses: string): string[] {
  if (!uses.startsWith("./")) return []
  return loadAction(uses).runs.steps.flatMap((st) => (st.uses ? [st.uses] : []))
}

/** Every way a publishing job breaks the rules, as readable lines. */
function publishingViolations(file: string, w: Workflow): string[] {
  return publishingJobs(w).flatMap(([name, job]) => {
    const where = `${file} ${name}`
    const out: string[] = []
    // A pull request from a fork must never reach a job that holds a write
    // token. Requiring a push event keeps it out by construction.
    if (!/github\.event_name == 'push'/.test(job.if ?? "") || /pull_request/.test(job.if ?? "")) {
      out.push(`${where} can run for something other than a push: if: ${job.if ?? "(none)"}`)
    }
    for (const secret of [...stringify(job).matchAll(/secrets\.([A-Za-z0-9_]+)/g)].map((m) => m[1])) {
      if (secret !== "GITHUB_TOKEN") out.push(`${where} uses secrets.${secret}`)
    }
    // A tag can be moved to different code after review; a commit SHA cannot.
    // A local composite action is part of the job, so its actions count too.
    for (const uses of (job.steps ?? []).flatMap((st) => (st.uses ? [st.uses, ...localActionUses(st.uses)] : []))) {
      if (!uses.startsWith("./") && !FULL_SHA.test(uses)) out.push(`${where} uses ${uses}, not pinned to a commit SHA`)
    }
    return out
  })
}

describe("a job that publishes", () => {
  it("never runs for a pull request, uses only GITHUB_TOKEN, and pins every action to a commit", () => {
    expect(FILES.flatMap((file) => publishingViolations(file, load(file)))).toEqual([])
  })

  it("is recognised, and each rule bites (a made-up job that breaks all three)", () => {
    const bad: Workflow = parse(`
on: [push, pull_request]
jobs:
  image-staging:
    if: github.event_name == 'pull_request'
    permissions: { packages: write }
    steps:
      - uses: docker/login-action@v4
        with: { password: "\${{ secrets.DEPLOY_TOKEN }}" }
      - uses: docker/build-push-action@c3c9e263c25d99ce0380d002d59b67737d91b0dc
      - uses: ./.github/actions/publish-image
`)
    expect(publishingViolations("made-up.yml", bad)).toEqual([
      "made-up.yml image-staging can run for something other than a push: if: github.event_name == 'pull_request'",
      "made-up.yml image-staging uses secrets.DEPLOY_TOKEN",
      "made-up.yml image-staging uses docker/login-action@v4, not pinned to a commit SHA",
    ])
  })
})

describe("the unit suite runs in two shards, and publishing waits for every check job", () => {
  const stepRun = (job: Job, name: string) => (job.steps ?? []).find((st) => (st as { name?: string }).name === name)?.run

  it("`unit` runs shards 1/2 and 2/2 as a matrix, so no half is left out", () => {
    const unit = ci.jobs.unit as Job & { strategy?: { matrix?: { shard?: string[] } } }
    expect(unit, "ci.yml has a unit job").toBeDefined()
    expect(unit.strategy?.matrix?.shard).toEqual(["1/2", "2/2"])
    expect(stepRun(unit, "Unit tests")).toBe("npm test -- --shard=${{ matrix.shard }}")
  })

  it("the check jobs are static, unit and database, side by side: none waits for another", () => {
    for (const name of ["static", "unit", "database"]) {
      expect(ci.jobs[name], `ci.yml has a ${name} job`).toBeDefined()
      expect(ci.jobs[name].needs, `${name} waits for another job`).toBeUndefined()
    }
    expect(ci.jobs.checks, "the old one-job `checks` is back").toBeUndefined()
  })

  it("is awaited by both image jobs, and production checks every result", () => {
    for (const name of ["image-staging", "image-production"]) {
      expect(ci.jobs[name].needs, name).toEqual(["static", "unit", "database"])
    }
    for (const job of ["static", "unit", "database"]) {
      expect(ci.jobs["image-production"].if).toContain(`needs.${job}.result == 'success'`)
    }
  })
})

describe("the staging image job", () => {
  const job = ci.jobs["image-staging"]
  const publish = loadAction("./.github/actions/publish-image")
  const stepIndex = (pred: (st: Composite["runs"]["steps"][number]) => boolean) => publish.runs.steps.findIndex(pred)

  it("runs only after the checks, only for a push to main, only when switched on", () => {
    expect(job, "ci.yml has an image-staging job").toBeDefined()
    expect(job.needs).toEqual(["static", "unit", "database"])
    expect(job.if).toContain("github.event_name == 'push'")
    expect(job.if).toContain("github.ref == 'refs/heads/main'")
    expect(job.if).toContain("vars.STAGING_PUBLISH == 'on'")
    expect(job.environment).toBe("staging")
    expect(job.permissions).toEqual({ contents: "read", packages: "write", actions: "read" })
  })

  it("waits for e2e.yml on the same commit before it builds anything", () => {
    const steps = job.steps ?? []
    const wait = steps.findIndex((st) => st.run === "node scripts/ci/await-workflow.mjs")
    const build = steps.findIndex((st) => st.uses === "./.github/actions/publish-image")
    expect(wait).toBeGreaterThan(-1)
    expect(build).toBeGreaterThan(wait)
  })

  it("does not publish a commit whose browser run was superseded, and does not fail for it", () => {
    const steps = job.steps ?? []
    const wait = steps.find((st) => st.run === "node scripts/ci/await-workflow.mjs")!
    const build = steps.find((st) => st.uses === "./.github/actions/publish-image")!
    expect(wait.id, "the wait step needs an id so the build step can read its output").toBe("wait")
    expect(String(build.if)).toContain("steps.wait.outputs.superseded != 'true'")
  })

  it("does not publish, and does not turn main red, for a browser run still queued at the timeout", () => {
    const steps = job.steps ?? []
    const build = steps.find((st) => st.uses === "./.github/actions/publish-image")!
    expect(String(build.if)).toContain("steps.wait.outputs.unfinished != 'true'")
    // the publish still needs the other conditions
    expect(String(build.if)).toContain("steps.wait.outputs.superseded != 'true'")
  })

  it("never creates the package itself: from this public repository it would come out public", () => {
    const privacy = publish.runs.steps.find((st) => st.name === "The package is private")!
    expect(privacy.run).not.toMatch(/docker push/)
    expect(privacy.run).toMatch(/case "\$code" in\s*200\)/)
  })

  it("searches the image as root, so no directory is hidden from the search", () => {
    const smoke = publish.runs.steps.find((st) => !!st.run?.includes(".env*"))!
    expect(smoke.run).toMatch(/docker run --rm --user 0:0 --entrypoint sh "\$ref" -c 'find \/ -xdev -name "\.env\*"'/)
  })

  it("proves the package private before building, and boots and searches the image before pushing", () => {
    const privacy = stepIndex((st) => st.name === "The package is private")
    const build = stepIndex((st) => !!st.uses?.startsWith("docker/build-push-action@"))
    const smoke = stepIndex((st) => !!st.run?.includes("/api/healthz") && !!st.run?.includes(".env*"))
    const push = stepIndex((st) => st.name === "Push")
    expect(privacy).toBeGreaterThan(-1)
    expect(build).toBeGreaterThan(privacy)
    expect(smoke).toBeGreaterThan(build)
    expect(push).toBeGreaterThan(smoke)
  })

  it("builds with no cache, no provenance and no SBOM, and only loads (the push is a later step)", () => {
    const build = publish.runs.steps.find((st) => st.uses?.startsWith("docker/build-push-action@"))!
    expect(build.with).toMatchObject({ provenance: false, sbom: false, "no-cache": true, load: true, push: false })
    expect(build.with).not.toHaveProperty("cache-from")
    expect(build.with).not.toHaveProperty("cache-to")
    expect(String(build.with?.["build-args"])).toContain("BUILD_SHA=${{ github.sha }}")
  })

  it("says so in the run summary while publishing is switched off", () => {
    const off = (ci.jobs.static.steps ?? []).find((st) => st.run?.includes("Staging publishing is off: see blockers"))
    expect(off, "the static job no longer reports that staging publishing is off").toBeDefined()
  })
})
