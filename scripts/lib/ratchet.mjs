/**
 * THE PART OF A RATCHET THAT IS NOT ABOUT TYPES OR LINT.
 *
 * WHY THIS EXISTS: `typecheck-ratchet.mjs` was written first and worked. When a
 * second ratchet was needed for eslint, the obvious move was to copy it — and
 * the ninety lines worth copying are the subtle ones: the comparison that makes
 * two findings "the same finding", the refusal to write a baseline that accepts
 * something the old one did not, and the three ways a checker can fail to run
 * while looking like a pass.
 *
 * Two copies of that would drift, and the drift would be silent and one-sided:
 * whichever gate lost a guard would simply stop catching things, and a gate that
 * quietly stops catching things is worse than no gate, because people still
 * trust it. So the shared half lives here and each ratchet supplies only what is
 * genuinely its own — how to run its checker and how to read one finding out of
 * the output.
 *
 * WHAT A "FINDING" IS: a file plus a signature, where the signature is whatever
 * makes it the same finding on the next run. Line and column are never part of
 * it; they move when anything above them is edited, and a baseline that churns
 * on unrelated edits gets regenerated blindly, which is the same as not having
 * one.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs"

/**
 * Group findings into `file → signature → count`.
 * @param {Array<{file: string, signature: string}>} findings
 */
export function tally(findings) {
  const counts = {}
  for (const { file, signature } of findings) {
    counts[file] ??= {}
    counts[file][signature] = (counts[file][signature] ?? 0) + 1
  }
  return counts
}

/** Deterministic key order, so a regenerated baseline diffs cleanly. */
export function sortDeep(counts) {
  const files = {}
  for (const file of Object.keys(counts).sort()) {
    files[file] = Object.fromEntries(
      Object.entries(counts[file]).sort(([a], [b]) => a.localeCompare(b)),
    )
  }
  return files
}

/**
 * Everything in `a` that `b` does not already cover, as printable lines.
 *
 * Counts matter, not just presence: a file baselined with one unused variable
 * that now has three is two new findings, and reporting it as "already known"
 * is how a baseline becomes a place to hide things.
 */
export function excess(a, b) {
  const out = []
  for (const [file, signatures] of Object.entries(a)) {
    for (const [signature, count] of Object.entries(signatures)) {
      const allowed = b[file]?.[signature] ?? 0
      if (count > allowed) {
        out.push(`${file}: ${signature}${count > 1 ? ` (x${count - allowed} more than baselined)` : ""}`)
      }
    }
  }
  return out.sort()
}

/**
 * A checker that could not run is not a checker that found nothing.
 *
 * Three ways for that to happen, all of which read as a pass unless checked:
 * killed by a signal (out of memory is the usual one), an exit status the tool
 * never uses for "I looked and found problems", or a configuration failure —
 * which most tools report as a failure with nothing attached to a file.
 *
 * @param {{error?: Error, signal?: string, status: number}} run
 * @param {{tool: string, okStatuses: number[], found: number, output: string}} ctx
 */
export function assertCheckerRan(run, { tool, okStatuses, found, output }) {
  if (run.error) {
    console.error(`${tool} could not be started: ${run.error.message}`)
    process.exit(1)
  }
  if (run.signal) {
    console.error(`${tool} was killed by ${run.signal} — its report is incomplete, so this is not a pass.`)
    process.exit(1)
  }
  if (!okStatuses.includes(run.status)) {
    console.error(
      `${tool} exited with ${run.status}, which is not a result it uses for "checked, found problems":\n${output.trim()}`,
    )
    process.exit(1)
  }
  if (run.status !== 0 && found === 0) {
    console.error(`${tool} reported a failure but no findings — refusing to treat that as a pass:\n${output.trim()}`)
    process.exit(1)
  }
}

/** Read a baseline, treating an older format as absent rather than comparable. */
export function loadBaseline(path, format) {
  const stored = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null
  if (stored && stored._format !== format) {
    console.warn(`${path} is in an older format (${stored._format ?? "counts"}); rebuilding it as ${format}.`)
  }
  return stored && stored._format === format ? stored : null
}

/**
 * The whole compare-or-update flow, which is identical for every ratchet.
 *
 * @param {object} o
 * @param {string} o.path         baseline file
 * @param {string} o.format       `_format` value this version can compare against
 * @param {string} o.comment      `_comment` written into the baseline
 * @param {object} o.current      tallied findings
 * @param {number} o.total        how many findings in total
 * @param {string} o.noun         "type error" / "lint error", for messages
 * @param {string} o.label        how the summary line names them ("Type errors")
 * @param {boolean} o.update      --update was passed
 * @param {boolean} o.acceptNew   --accept-new was passed
 * @param {string} o.regenerate   the exact command that regenerates it
 */
export function applyRatchet({ path, format, comment, current, total, noun, label, update, acceptNew, regenerate }) {
  const baseline = loadBaseline(path, format)

  if (update) {
    if (baseline) {
      const added = excess(current, baseline.files)
      if (added.length && !acceptNew) {
        console.error(
          `Refusing to write a baseline that accepts ${added.length} ${noun}(s) the current one does not:\n  ` +
            added.join("\n  ") +
            `\n\nFix them, or say so out loud with --update --accept-new so the decision is visible in the diff.`,
        )
        process.exit(1)
      }
      if (added.length) {
        console.warn(`Accepting ${added.length} NEW ${noun}(s) into the baseline:\n  ` + added.join("\n  "))
      }
    }
    writeFileSync(
      path,
      JSON.stringify({ _comment: comment, _format: format, total, files: sortDeep(current) }, null, 2) + "\n",
    )
    console.log(`baseline written: ${total} ${noun}s across ${Object.keys(current).length} files`)
    process.exit(0)
  }

  if (!baseline) {
    console.error(`No usable ${path}. Create it once with: ${regenerate}`)
    process.exit(1)
  }

  const added = excess(current, baseline.files)
  if (added.length) {
    console.error(
      `${added.length} ${noun}(s) that are not in ${path}:\n  ` +
        added.join("\n  ") +
        `\n\nFix them. Do not raise the baseline.`,
    )
    process.exit(1)
  }

  const fixed = baseline.total - total
  if (fixed > 0) {
    console.log(`${label}: ${total} (baseline ${baseline.total}). ${fixed} fewer — lower the baseline: ${regenerate}`)
  } else {
    console.log(`${label}: ${total}, none new.`)
  }
}
