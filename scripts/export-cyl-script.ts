/**
 * Render docs/research/change-your-life/06-short-script.md from the same array
 * the /test/change-your-life/short page renders.
 *
 * One source, two outputs: a script that drifts from the page it was approved on
 * is worse than no script. Re-run after editing CYL_SCRIPT:
 *
 *   npx tsx scripts/export-cyl-script.ts
 */

import { writeFileSync } from "node:fs"

import { CYL_SCRIPT, CYL_SCRIPT_NOTES } from "../src/goals/data/changeYourLife"

const OUT = "docs/research/change-your-life/06-short-script.md"

function timecode(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

const spans = CYL_SCRIPT.map((b, i) => (i === CYL_SCRIPT.length - 1 ? 5 : CYL_SCRIPT[i + 1].at - b.at))
const runtime = CYL_SCRIPT[CYL_SCRIPT.length - 1].at + spans[spans.length - 1]
const words = CYL_SCRIPT.reduce((n, b) => n + (b.line ? b.line.trim().split(/\s+/).length : 0), 0)

const lines: string[] = []

lines.push("# The short — “You already know what to do”")
lines.push("")
lines.push(
  "**3-minute vertical, 9:16.** Generated from `src/goals/data/changeYourLife.ts` by " +
    "`scripts/export-cyl-script.ts`, which is also what `/test/change-your-life/short` renders. " +
    "Edit the data file, re-run the script — never edit this file by hand, or the page and the " +
    "script stop agreeing.",
)
lines.push("")
lines.push(`**${timecode(runtime)} · ${CYL_SCRIPT.length} beats · ${words} spoken words.**`)
lines.push("")
lines.push("## Why it is shaped like this")
lines.push("")
lines.push(
  "The study's strongest structural finding is that **resonance tracks recognition, not instruction** — " +
    "seven of the ten lowest-resonance videos in a 474M-view corpus are tactical listicles. So this opens " +
    "on a comment the audience wrote and upvoted, not on a promise, a tip, or a face.",
)
lines.push("")
lines.push(`- **Hook rule.** ${CYL_SCRIPT_NOTES.hookRule}`)
lines.push(`- **One mechanism.** ${CYL_SCRIPT_NOTES.oneMechanism}`)
lines.push(`- **Cutdowns.** ${CYL_SCRIPT_NOTES.cutdowns}`)
lines.push(`- **Runtime.** ${CYL_SCRIPT_NOTES.runtime}`)
lines.push(`- **Do not use.** ${CYL_SCRIPT_NOTES.avoid}`)
lines.push("")

lines.push("## Shot list")
lines.push("")
let section = ""
for (const [i, b] of CYL_SCRIPT.entries()) {
  if (b.section !== section) {
    section = b.section
    lines.push("")
    lines.push(`### ${section}`)
    lines.push("")
    lines.push("| Time | Line | On screen | Visual |")
    lines.push("|---|---|---|---|")
  }
  const line = b.line ? b.line.replace(/\|/g, "\\|") : "*[silence]*"
  const onScreen = b.onScreen ? `\`${b.onScreen.replace(/\|/g, "\\|")}\`` : "—"
  const visual = b.visual.replace(/\|/g, "\\|")
  const src = b.source ? `<br><sub>source: ${b.source}</sub>` : ""
  lines.push(`| \`${timecode(b.at)}\` <sub>+${spans[i]}s</sub> | ${line}${src} | ${onScreen} | ${visual} |`)
}

lines.push("")
lines.push("## Transcript — what a viewer hears")
lines.push("")
const bySection = new Map<string, string[]>()
for (const b of CYL_SCRIPT) {
  if (!b.line) continue
  const arr = bySection.get(b.section) ?? []
  arr.push(b.line)
  bySection.set(b.section, arr)
}
for (const [name, spoken] of bySection) {
  lines.push(`**${name}.** ${spoken.join(" ")}`)
  lines.push("")
}

writeFileSync(OUT, lines.join("\n"), "utf8")
console.log(`wrote ${OUT} — ${CYL_SCRIPT.length} beats, ${timecode(runtime)}`)
