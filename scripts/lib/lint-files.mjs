/**
 * LINT ONLY SOME FILES, AND JUDGE THEM BY THE SAME BASELINE AS THE WHOLE RUN.
 *
 * WHY THIS EXISTS: the pre-commit hook used to run only unit tests, so a new
 * lint error reached `main` and turned CI red ("Lint" is the commonest main
 * breaker). `scripts/lint-ratchet.mjs --files a.ts b.tsx` checks just those
 * files, in about a second, and uses the exact same finding signature, tally and
 * `excess` rule as the full run, so the two can never disagree: a file may have
 * at most as many of each (rule + message) as `eslint-baseline.json` lists for
 * that file, and anything above is new.
 *
 * WHAT IS LINTED: the text as staged (`git show :path`) when the file is in the
 * index, else the file on disk. A commit contains the index, so a half-staged
 * file is judged on what will be committed and unstaged edits can neither block
 * nor excuse the commit.
 */

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { ESLint } from "eslint"
import { excess, tally } from "./ratchet.mjs"

const LINTABLE = /\.(?:[cm]?[jt]s|[jt]sx)$/

/**
 * The same finding, spelled the same way every run.
 *
 * eslint embeds identifiers in its messages — "'foo' is defined but never used"
 * — which is what makes two unused variables in one file distinguishable, and
 * is worth keeping. What is not worth keeping is anything positional, so any
 * digits that look like a location are not part of a signature. Nothing here
 * strips the identifier itself: renaming a variable genuinely is a different
 * finding, and having it show up as new is correct.
 */
export function normalise(message) {
  return message.replace(/\s+/g, " ").trim()
}

/** One eslint message as a baseline finding, or null when it is not gated (a warning). */
export function toFinding(file, message) {
  if (message.severity !== 2) return null
  // A fatal parse error has no ruleId; it still has to be visible.
  const rule = message.ruleId ?? "(fatal parse error)"
  return { file, signature: `${rule}: ${normalise(message.message)}` }
}

/** The staged text of `file`, or the text on disk when it is not staged. */
export function sourceOf(file, cwd) {
  try {
    return execFileSync("git", ["show", `:${file}`], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 })
  } catch {
    return readFileSync(path.join(cwd, file), "utf8")
  }
}

/**
 * Lint `files` (repo-relative) and return the findings that exceed the baseline.
 * @param {string[]} files
 * @param {{files: Record<string, Record<string, number>>}} baseline
 * @param {{cwd?: string, readSource?: (file: string, cwd: string) => string}} [opts]
 * @returns {Promise<{checked: string[], added: string[]}>}
 */
export async function checkFiles(files, baseline, { cwd = process.cwd(), readSource = sourceOf } = {}) {
  const checked = [...new Set(files)].filter((f) => LINTABLE.test(f) && existsSync(path.join(cwd, f)))
  const eslint = new ESLint({ cwd })
  const findings = []
  for (const file of checked) {
    const results = await eslint.lintText(readSource(file, cwd), { filePath: path.join(cwd, file), warnIgnored: false })
    for (const result of results) {
      for (const message of result.messages) {
        const finding = toFinding(file, message)
        if (finding) findings.push(finding)
      }
    }
  }
  return { checked, added: excess(tally(findings), baseline.files) }
}
