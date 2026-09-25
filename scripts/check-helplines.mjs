#!/usr/bin/env node
/**
 * DOES EVERY LINK IN THE CRISIS DOOR STILL GO SOMEWHERE?
 *
 * `tests/unit/vice/helpFreshness.test.ts` is honest about what it cannot do: it
 * checks that `VERIFIED` was moved within 90 days and says in its own header
 * that actually reaching each service "is work no test can do". That was true
 * of the test and it was read as true of the repo, so nobody checked — and on
 * 2026-09-25 the NHS local-services link in `help.ts` was found returning
 * **410 Gone**, an explicit "permanently not here", shown to somebody looking
 * for alcohol treatment. It had been dead for an unknown length of time.
 *
 * This does the half that is mechanical. It cannot ring a phone number, and it
 * does not pretend to: the numbers still need a person, and the report below
 * says so every time it runs.
 *
 * NOT A TEST, AND DELIBERATELY NOT IN CI. It depends on eight third-party sites
 * being up, so as a CI gate it would go red for reasons that have nothing to do
 * with this repo and be muted within a month. It is a tool you run when the
 * freshness test fails and you are doing the check it is asking for.
 *
 *   node scripts/check-helplines.mjs
 *
 * Exits non-zero if any URL does not answer, so it can still be wired into a
 * scheduled job later if somebody wants one.
 */

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const HELP = resolve(HERE, "../src/vice/data/help.ts")

/**
 * The urls, read out of the source rather than imported.
 *
 * `help.ts` is TypeScript and this is a plain node script; a regex over the
 * file avoids dragging a transpiler in for eight strings. If the shape of the
 * file changes this finds nothing, which is why it fails loudly on an empty
 * result rather than reporting "all clear".
 */
function urlsInHelp() {
  const source = readFileSync(HELP, "utf8")
  const found = [...source.matchAll(/^\s*url:\s*"([^"]+)"/gm)].map((m) => m[1])
  return [...new Set(found)]
}

/** A browser-ish agent: several of these sites refuse an unrecognised one. */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

/**
 * THREE OUTCOMES, NOT TWO, and the third is the one that keeps this usable.
 *
 * The first version of this reported anything that was not 2xx as DEAD, and its
 * first run called gamcare.org.uk and samhsa.gov dead. Both are live; both sit
 * behind a bot wall and answer 403 to anything without a real browser, curl
 * included. A checker that reports two false deaths out of ten is a checker
 * somebody mutes, and then the real 410 goes past unread — which is the failure
 * this script was written because of.
 *
 * So: gone is gone (404/410), blocked and flaky are "could not be checked from
 * here", and only the first kind fails the run.
 */
function verdictFor(status) {
  if (status >= 200 && status < 400) return "ok"
  if (status === 404 || status === 410) return "gone"
  return "unchecked"
}

async function check(url) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(20_000),
    })
    return { url, status: res.status, verdict: verdictFor(res.status) }
  } catch (error) {
    return { url, status: 0, verdict: "unchecked", error: String(error?.message ?? error) }
  }
}

const urls = urlsInHelp()
if (urls.length === 0) {
  console.error(
    "Found no urls in src/vice/data/help.ts. Either the file moved or its shape changed —\n" +
      "this script reads it with a regex, and an empty result is a broken script, not a clean run.",
  )
  process.exit(2)
}

console.log(`Checking ${urls.length} links from src/vice/data/help.ts\n`)
const results = await Promise.all(urls.map(check))
const RANK = { gone: 0, unchecked: 1, ok: 2 }
const MARK = { gone: "GONE", unchecked: "????", ok: "ok  " }

for (const r of results.sort((a, b) => RANK[a.verdict] - RANK[b.verdict])) {
  console.log(
    `${MARK[r.verdict]} ${String(r.status || "-").padEnd(4)} ${r.url}` +
      `${r.error ? `  (${r.error})` : ""}`,
  )
}

const gone = results.filter((r) => r.verdict === "gone")
const unchecked = results.filter((r) => r.verdict === "unchecked")

console.log(
  `\n${results.filter((r) => r.verdict === "ok").length} answered, ` +
    `${unchecked.length} could not be checked from here, ${gone.length} gone.`,
)

if (unchecked.length > 0) {
  console.log(
    "\n???? is NOT a failure and must not be read as one. A 403 here is a bot\n" +
      "wall — gamcare.org.uk and samhsa.gov both refuse anything that is not a\n" +
      "real browser, curl included, and both are live. Open those by hand.",
  )
}

console.log(
  "\nTHE PHONE NUMBERS ARE NOT CHECKED BY THIS AND CANNOT BE. Ring them, or read\n" +
    "them off the provider's own page, before moving VERIFIED in help.ts. On\n" +
    "2026-09-25 every number in that file was correct and one of these links was\n" +
    "410 Gone — the two halves rot independently.",
)

process.exit(gone.length === 0 ? 0 : 1)
