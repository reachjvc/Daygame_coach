// Runs in Node at build time (next.config.mjs imports it), not in a browser.
import { execFileSync } from "node:child_process"

/**
 * WHICH COMMIT THIS BUILD IS: THE FULL 40-CHARACTER SHA, OR NO BUILD.
 *
 * Without a build ID every build calls itself "dev", and a fault fixed three
 * deploys ago goes on incrementing the same crash-report row forever, which
 * makes "how often does this happen" meaningless.
 *
 * One value names a build everywhere: the crash reports (`/api/errors` stores it
 * as the release), the offline store's version, `/api/healthz`'s `buildId`, and
 * the Docker image's `org.opencontainers.image.revision` label. `infra/deploy.sh`
 * compares the last two to decide whether a deploy worked, so they must be the
 * same string, not a short SHA in one place and a long one in the other.
 *
 * Where it comes from, first answer wins:
 *   1. BUILD_SHA — set by `infra/Dockerfile` and CI. A Docker build has no `.git`.
 *   2. VERCEL_GIT_COMMIT_SHA — Vercel's build, while Vercel is still production.
 *   3. `git rev-parse HEAD` — a build in a checkout.
 *
 * No answer fails the build. This used to say "unknown", and an image that
 * cannot say which commit it is cannot be rolled back to by name, nor can a
 * health check prove the deploy it is checking. A value that is set but is not a
 * full SHA fails too, rather than falling through to the next source: a short
 * SHA here would quietly never match the image label.
 */

const FULL_SHA = /^[0-9a-f]{40}$/

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
  } catch {
    return undefined
  }
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {() => string | undefined} readGitHead
 * @returns {string}
 */
export function buildId(env = process.env, readGitHead = gitHead) {
  const sources = [
    ["BUILD_SHA", () => env.BUILD_SHA],
    ["VERCEL_GIT_COMMIT_SHA", () => env.VERCEL_GIT_COMMIT_SHA],
    ["git rev-parse HEAD", readGitHead],
  ]
  for (const [name, read] of sources) {
    const value = read()?.trim()
    if (!value) continue
    if (!FULL_SHA.test(value)) {
      throw new Error(
        `${name} is "${value.slice(0, 80)}", which is not a full 40-character commit SHA. ` +
          "Every build is named by its full commit SHA; see scripts/build-id.mjs.",
      )
    }
    return value
  }
  throw new Error(
    "This build has no commit: BUILD_SHA is not set, there is no VERCEL_GIT_COMMIT_SHA, " +
      "and `git rev-parse HEAD` did not answer. Set BUILD_SHA to the full commit SHA " +
      "(infra/build-image.sh does this). See scripts/build-id.mjs.",
  )
}
