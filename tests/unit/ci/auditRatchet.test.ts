// @vitest-environment node
/**
 * THE DEPENDENCY AUDIT BLAMES COMMITS, NOT THE CALENDAR.
 *
 * `scripts/audit-ratchet.mjs` has to tell apart two things that look the same in
 * `npm audit`'s output: a commit that brought in a vulnerable version (fail),
 * and an advisory published overnight against a version nobody touched (warn,
 * or the whole repository goes red with no commit at fault). It also must never
 * read "could not check" as "nothing found". Each rule is driven here with
 * made-up audit reports, so the day one is loosened the suite says so.
 */

import { describe, it, expect } from "vitest"
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { compare, lockedVersions, readAudit } from "../../../scripts/audit-ratchet.mjs"

const ROOT = resolve(__dirname, "../../..")

const lock = (packages: Record<string, string>) =>
  JSON.stringify({
    lockfileVersion: 3,
    packages: {
      "": { name: "app" },
      ...Object.fromEntries(Object.entries(packages).map(([path, version]) => [path, { version }])),
    },
  })

const advisory = (id: string, severity = "high") => ({
  source: 1,
  name: "x",
  title: "t",
  url: `https://github.com/advisories/${id}`,
  severity,
  range: "<9",
})

const report = (vulnerabilities: Record<string, { via: unknown[]; nodes: string[] }>) =>
  JSON.stringify({ auditReportVersion: 2, vulnerabilities, metadata: { vulnerabilities: {} } })

const LOCK = lock({
  "node_modules/sharp": "0.34.5",
  "node_modules/next/node_modules/sharp": "0.35.5",
  "node_modules/@scope/pkg": "1.0.0",
  "node_modules/needs-sharp": "2.0.0",
})

describe("reading npm audit", () => {
  it("records each vulnerable version's own advisories, and skips packages that only depend on one", () => {
    const { advisories, critical } = readAudit(
      report({
        sharp: { via: [advisory("GHSA-a"), advisory("GHSA-b")], nodes: ["node_modules/sharp"] },
        "needs-sharp": { via: ["sharp"], nodes: ["node_modules/needs-sharp"] },
        "@scope/pkg": { via: [advisory("GHSA-c", "critical")], nodes: ["node_modules/@scope/pkg"] },
      }),
      LOCK,
    )
    expect(advisories).toEqual({ "@scope/pkg@1.0.0": ["GHSA-c"], "sharp@0.34.5": ["GHSA-a", "GHSA-b"] })
    expect(critical).toEqual(["@scope/pkg@1.0.0"])
  })

  it("reads lockfile names at any depth, scoped or not", () => {
    expect([...lockedVersions(LOCK)].sort()).toEqual([
      "@scope/pkg@1.0.0",
      "needs-sharp@2.0.0",
      "sharp@0.34.5",
      "sharp@0.35.5",
    ])
  })

  it.each([
    ["empty output", ""],
    ["output that is not JSON", "npm ERR! network request failed"],
    ["an error report", JSON.stringify({ error: { code: "ENOTFOUND", summary: "registry unreachable" } })],
    ["JSON that is not an audit report", JSON.stringify({ hello: "world" })],
  ])("refuses %s, because could not check is not a pass", (_, text) => {
    expect(() => readAudit(text, LOCK)).toThrow()
  })

  it("refuses a report that names a package the lockfile does not install", () => {
    expect(() =>
      readAudit(report({ ghost: { via: [advisory("GHSA-z")], nodes: ["node_modules/ghost"] } }), LOCK),
    ).toThrow(/does not install/)
  })
})

describe("deciding", () => {
  const reference = new Set(["sharp@0.34.5", "left-pad@1.0.0"])

  it("passes an advisory that is already baselined", () => {
    const out = compare({
      current: { "sharp@0.34.5": ["GHSA-a"] },
      shippedCritical: [],
      baseline: { "sharp@0.34.5": ["GHSA-a"] },
      reference,
    })
    expect(out).toEqual({ failures: [], warnings: [], stale: [] })
  })

  it("fails a version the lockfile added or changed that carries an advisory", () => {
    const out = compare({
      current: { "sharp@0.33.0": ["GHSA-a"] },
      shippedCritical: [],
      baseline: { "sharp@0.34.5": ["GHSA-a"] },
      reference,
    })
    expect(out.failures).toEqual(["sharp@0.33.0 was added or changed by the lockfile and carries GHSA-a"])
  })

  it("only warns about an advisory newly published against a version nobody changed", () => {
    const out = compare({
      current: { "left-pad@1.0.0": ["GHSA-new"] },
      shippedCritical: [],
      baseline: {},
      reference,
    })
    expect(out.failures).toEqual([])
    expect(out.warnings).toEqual([
      "left-pad@1.0.0 did not change, but GHSA-new was published against it since the baseline",
    ])
  })

  it("fails any critical in shipped dependencies, baselined or not", () => {
    const out = compare({
      current: { "sharp@0.34.5": ["GHSA-a"] },
      shippedCritical: ["sharp@0.34.5"],
      baseline: { "sharp@0.34.5": ["GHSA-a"] },
      reference,
    })
    expect(out.failures).toEqual(["sharp@0.34.5 ships to production with a critical advisory (GHSA-a)"])
  })

  it("says which baseline line to delete when an advisory disappears", () => {
    const out = compare({
      current: { "sharp@0.34.5": ["GHSA-a"] },
      shippedCritical: [],
      baseline: { "sharp@0.34.5": ["GHSA-a", "GHSA-b"], "uuid@10.0.0": ["GHSA-u"] },
      reference,
    })
    expect(out.stale).toEqual([
      'delete GHSA-b from "sharp@0.34.5" in audit-baseline.json: no longer reported',
      'delete the line "uuid@10.0.0" from audit-baseline.json: it no longer has an advisory',
    ])
    expect(out.failures).toEqual([])
  })
})

describe("when npm audit cannot run", () => {
  it("retries once, then fails rather than passing", () => {
    const dir = mkdtempSync(join(tmpdir(), "fake-npm-"))
    try {
      const counter = join(dir, "calls")
      writeFileSync(counter, "")
      const fake = join(dir, "npm")
      writeFileSync(fake, `#!/bin/sh\necho x >> "${counter}"\necho "npm ERR! network unreachable"\nexit 1\n`)
      chmodSync(fake, 0o755)
      const run = spawnSync(process.execPath, [join(ROOT, "scripts/audit-ratchet.mjs")], {
        cwd: ROOT,
        env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, GITHUB_STEP_SUMMARY: "" },
        encoding: "utf8",
      })
      expect(run.status).toBe(1)
      expect(run.stderr).toContain("could not check, so this is a failure, not a pass")
      expect(readFileSync(counter, "utf8").trim().split("\n")).toHaveLength(2)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
