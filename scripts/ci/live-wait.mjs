#!/usr/bin/env node
/**
 * WAIT UNTIL THE LIVE SITE RUNS THE COMMIT THAT JUST DEPLOYED.
 *
 *   LIVE_URL=https://… DEPLOY_SHA=<sha> GITHUB_REPOSITORY=o/r GITHUB_TOKEN=… node scripts/ci/live-wait.mjs
 *
 * live-check.yml starts when GitHub is told a Production deploy succeeded. The
 * site's own `/api/healthz` says which commit it serves (`buildId`). Polls it:
 *   - buildId = DEPLOY_SHA            -> exit 0, the smoke test may run
 *   - another buildId that is NEWER   -> exit 0, "superseded": the next deploy's
 *     run checks the site, so this run has nothing to say (writes state=superseded
 *     to GITHUB_OUTPUT so the next step skips)
 *   - nothing matches in 10 minutes   -> exit 1
 * "Newer" is asked of GitHub's compare API with the run's own token (no secret):
 * compare/<deploy sha>...<buildId> says `ahead` when buildId has the deploy as
 * an ancestor. An older or unrelated build keeps the wait going.
 * Read-only: GET requests only.
 */

import { appendFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * @param {{ fetch: typeof fetch, liveUrl: string, sha: string,
 *   isNewer: (buildId: string) => Promise<boolean>,
 *   timeoutMs?: number, intervalMs?: number, sleep?: (ms: number) => Promise<unknown>, now?: () => number,
 *   log?: (line: string) => void }} o
 * @returns {Promise<{ state: "match" | "superseded" | "timeout", buildId?: string, polls: number }>}
 */
export async function waitForBuild({ fetch: doFetch, liveUrl, sha, isNewer, timeoutMs = 600_000, intervalMs = 15_000, sleep = sleepMs, now = Date.now, log = () => {} }) {
  const deadline = now() + timeoutMs
  let polls = 0
  let last
  for (;;) {
    polls++
    let buildId
    try {
      const res = await doFetch(`${liveUrl}/api/healthz`, { headers: { accept: "application/json" } })
      if (res.ok) {
        const body = await res.json()
        // A commit sha only: the id goes into a GitHub API path, so nothing else may through.
        if (body && typeof body.buildId === "string" && /^[0-9a-f]{40}$/.test(body.buildId)) buildId = body.buildId
        else if (body && body.buildId !== undefined) log("healthz buildId is not a 40-character commit sha, ignored")
      } else {
        log(`healthz answered ${res.status}`)
      }
    } catch (err) {
      log(`healthz not reachable: ${err instanceof Error ? err.message : err}`)
    }
    if (buildId) {
      last = buildId
      if (buildId === sha) return { state: "match", buildId, polls }
      let newer = false
      try {
        newer = await isNewer(buildId)
      } catch (err) {
        log(`compare failed: ${err instanceof Error ? err.message : err}`)
      }
      if (newer) return { state: "superseded", buildId, polls }
      log(`live runs ${buildId.slice(0, 8)}, waiting for ${sha.slice(0, 8)}`)
    }
    if (now() + intervalMs >= deadline) return { state: "timeout", buildId: last, polls }
    await sleep(intervalMs)
  }
}

/** A newer-commit check through GitHub's compare API; `ahead` = buildId descends from sha. */
export function githubIsNewer({ fetch: doFetch, repo, token, sha }) {
  return async (buildId) => {
    const res = await doFetch(`https://api.github.com/repos/${repo}/compare/${sha}...${buildId}`, {
      headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`compare answered ${res.status}`)
    const body = await res.json()
    return body.status === "ahead"
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { LIVE_URL, DEPLOY_SHA, GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_OUTPUT } = process.env
  if (!LIVE_URL || !DEPLOY_SHA) {
    console.error("LIVE_URL and DEPLOY_SHA are required")
    process.exit(1)
  }
  const result = await waitForBuild({
    fetch,
    liveUrl: LIVE_URL,
    sha: DEPLOY_SHA,
    isNewer: githubIsNewer({ fetch, repo: GITHUB_REPOSITORY ?? "", token: GITHUB_TOKEN ?? "", sha: DEPLOY_SHA }),
    log: (l) => console.log(l),
  })
  console.log(`live-wait: ${result.state} (live buildId ${result.buildId ?? "none"}, ${result.polls} polls)`)
  if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `state=${result.state}\n`)
  process.exit(result.state === "timeout" ? 1 : 0)
}
