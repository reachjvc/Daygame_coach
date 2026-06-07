/**
 * Pre-ingest QA screen.
 *
 * Stage 09 chunks reaching the ingest step have only passed the 06h hard gate
 * (`quality_gate.blocked=false`). That is necessary but NOT sufficient — several
 * quality issues slip through (see docs/pipeline/learnings.md "Pre-Ingest Quality
 * Screen"). This module derives per-video verdicts from already-produced artifacts
 * (06 video-type, 06h confidence report, 09 chunks) — no LLM cost — and the ingest
 * script refuses to auto-ingest anything worse than PASS/ADVISORY (fail-closed).
 *
 * Severity ladder: PASS < ADVISORY < REVIEW < BLOCK.
 *   BLOCK    — thin/negligible content; never ingested.
 *   REVIEW   — type-uncertain, low post-repair confidence, or unverifiable; needs --allow-review.
 *   ADVISORY — heavy-repair reliance or compilation; ingested, but logged.
 */

import fs from "fs"
import path from "path"

export type Severity = "PASS" | "ADVISORY" | "REVIEW" | "BLOCK"

const SEV_ORDER: Record<Severity, number> = { PASS: 0, ADVISORY: 1, REVIEW: 2, BLOCK: 3 }

/** Tunable thresholds. Keep in one place so the unit test and report cite the same numbers. */
export const QA_THRESHOLDS = {
  minChunks: 4, // chunkCount <= this -> BLOCK (negligible content)
  shortSegs: 60, // segments < this AND below minHighRatio -> BLOCK (escaped the size-gated lq check)
  minHighRatio: 0.95, // high-tier / total below this -> REVIEW (low post-repair confidence)
  minVtConfidence: 0.8, // 06 video_type confidence below this -> REVIEW (type uncertain)
  heavyRepairLq: 0.3, // raw low-quality ratio at/above this -> ADVISORY (rescued by 06e)
}

/** All signals the screen reasons over. Pure data — gathered separately from IO. */
export interface VideoSignals {
  videoId: string
  chunkCount: number
  segments: number | null
  highTierRatio: number | null // tier_counts.high / segments_total
  lqRatio: number | null // 06h quality_gate.inputs.low_quality_total_ratio
  videoType: string | null // 06h video_type
  dominantChunkType: string | null // most common [TYPE:] tag across 09 chunks
  vtConfidence: number | null // 06 video_type.confidence
}

export interface Verdict {
  videoId: string
  severity: Severity
  reasons: string[] // what drove BLOCK/REVIEW
  advisories: string[] // non-blocking notes (still worth a human glance)
}

/** Pure: signals -> verdict. No IO, no randomness — fully unit-testable. */
export function screenVideo(s: VideoSignals): Verdict {
  const reasons: string[] = []
  const advisories: string[] = []
  let severity: Severity = "PASS"
  const esc = (lvl: Severity) => {
    if (SEV_ORDER[lvl] > SEV_ORDER[severity]) severity = lvl
  }

  // Fail-closed: cannot verify quality without the 06h signals.
  if (s.segments == null || s.highTierRatio == null) {
    reasons.push("unverifiable: missing/unparseable 06h confidence report")
    esc("REVIEW")
  }

  // #1 thin / negligible content -> BLOCK
  if (s.chunkCount <= QA_THRESHOLDS.minChunks) {
    reasons.push(`thin: only ${s.chunkCount} chunks (<= ${QA_THRESHOLDS.minChunks})`)
    esc("BLOCK")
  }
  if (
    s.segments != null &&
    s.segments < QA_THRESHOLDS.shortSegs &&
    s.highTierRatio != null &&
    s.highTierRatio < QA_THRESHOLDS.minHighRatio
  ) {
    reasons.push(
      `thin+damaged: ${s.segments} segs & ${(s.highTierRatio * 100).toFixed(1)}% high — ` +
        `escaped the size-gated lq check (fires only at >= ${QA_THRESHOLDS.shortSegs} segs)`
    )
    esc("BLOCK")
  }

  // #2 type-classification uncertainty -> REVIEW
  if (s.vtConfidence != null && s.vtConfidence < QA_THRESHOLDS.minVtConfidence) {
    reasons.push(`type-uncertain: video_type confidence ${s.vtConfidence} (< ${QA_THRESHOLDS.minVtConfidence})`)
    esc("REVIEW")
  }
  if (s.videoType && s.dominantChunkType && s.videoType !== s.dominantChunkType) {
    reasons.push(`type-mismatch: 06h=${s.videoType} vs dominant chunk=${s.dominantChunkType}`)
    esc("REVIEW")
  }

  // #4 low post-repair confidence -> REVIEW
  if (s.highTierRatio != null && s.highTierRatio < QA_THRESHOLDS.minHighRatio) {
    reasons.push(`low-confidence: ${(s.highTierRatio * 100).toFixed(1)}% high-tier (< ${QA_THRESHOLDS.minHighRatio * 100}%)`)
    esc("REVIEW")
  }

  // #3 heavy-repair reliance -> ADVISORY
  if (s.lqRatio != null && s.lqRatio >= QA_THRESHOLDS.heavyRepairLq) {
    advisories.push(`heavy-repair: raw low-quality ratio ${s.lqRatio.toFixed(2)} (>= ${QA_THRESHOLDS.heavyRepairLq}), repaired by 06e`)
    esc("ADVISORY")
  }
  // #5 compilation -> ADVISORY
  if (s.videoType === "compilation") {
    advisories.push("compilation: multi-clip video — verify chunk/context boundaries")
    esc("ADVISORY")
  }

  return { videoId: s.videoId, severity, reasons, advisories }
}

/** Should this verdict be ingested? BLOCK never; REVIEW only with override; PASS/ADVISORY yes. */
export function shouldIngest(v: Verdict, allowReview: boolean): boolean {
  if (v.severity === "BLOCK") return false
  if (v.severity === "REVIEW") return allowReview
  return true
}

// ---------------------------------------------------------------------------
// IO layer
// ---------------------------------------------------------------------------

const RE_ID = /\[([A-Za-z0-9_-]{11})\]/g
const RE_TYPE = /\[TYPE: ([a-z_]+)\]/g

function walkFiles(dir: string, suffix: string): string[] {
  const out: string[] = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkFiles(full, suffix))
    else if (entry.name.endsWith(suffix)) out.push(full)
  }
  return out
}

/** Index per-video stage files by the bracketed YouTube id in their path (last match wins). */
function indexByBracketId(dir: string, suffix: string): Map<string, string> {
  const m = new Map<string, string>()
  for (const f of walkFiles(dir, suffix)) {
    const ids = [...f.matchAll(RE_ID)].map((x) => x[1])
    if (ids.length) m.set(ids[ids.length - 1], f)
  }
  return m
}

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, "utf-8"))
}

export interface ScreenDirs {
  stage06: string
  stage06h: string
}

export interface ScreenIndexes {
  i06: Map<string, string>
  i06h: Map<string, string>
}

export function buildIndexes(dirs: ScreenDirs): ScreenIndexes {
  return {
    i06: indexByBracketId(dirs.stage06, "conversations.json"),
    i06h: indexByBracketId(dirs.stage06h, "confidence.report.json"),
  }
}

/** Gather signals for one video from its chunk file plus the 06/06h indexes. */
export function gatherSignals(videoId: string, chunkFilePath: string, idx: ScreenIndexes): VideoSignals {
  // 09 chunks
  let chunkCount = 0
  const typeCounts = new Map<string, number>()
  try {
    const data = readJson(chunkFilePath)
    const chunks: Array<{ content?: string }> = Array.isArray(data) ? data : data.chunks || []
    chunkCount = chunks.length
    for (const c of chunks) {
      for (const t of (c.content || "").matchAll(RE_TYPE)) {
        typeCounts.set(t[1], (typeCounts.get(t[1]) || 0) + 1)
      }
    }
  } catch {
    chunkCount = 0
  }
  let dominantChunkType: string | null = null
  let best = 0
  for (const [t, n] of typeCounts) if (n > best) ((best = n), (dominantChunkType = t))

  // 06 video_type confidence
  let vtConfidence: number | null = null
  const p06 = idx.i06.get(videoId)
  if (p06) {
    try {
      const vt = readJson(p06)?.video_type
      if (vt && typeof vt.confidence === "number") vtConfidence = vt.confidence
    } catch {
      /* leave null */
    }
  }

  // 06h confidence report
  let segments: number | null = null
  let highTierRatio: number | null = null
  let lqRatio: number | null = null
  let videoType: string | null = null
  const p06h = idx.i06h.get(videoId)
  if (p06h) {
    try {
      const r = readJson(p06h)
      const total = r?.summary?.segments_total
      const high = r?.summary?.tier_counts?.high
      if (typeof total === "number" && total > 0) {
        segments = total
        if (typeof high === "number") highTierRatio = high / total
      }
      const lq = r?.quality_gate?.inputs?.low_quality_total_ratio
      if (typeof lq === "number") lqRatio = lq
      if (typeof r?.video_type === "string") videoType = r.video_type
    } catch {
      /* leave nulls -> screened as REVIEW (unverifiable) */
    }
  }

  return { videoId, chunkCount, segments, highTierRatio, lqRatio, videoType, dominantChunkType, vtConfidence }
}

/** Run the screen over (videoId, chunkFilePath) pairs. */
export function runScreen(
  videos: Array<{ videoId: string; chunkFilePath: string }>,
  dirs: ScreenDirs
): Verdict[] {
  const idx = buildIndexes(dirs)
  return videos.map(({ videoId, chunkFilePath }) => screenVideo(gatherSignals(videoId, chunkFilePath, idx)))
}

/** Human-readable report grouped by severity. */
export function renderReport(verdicts: Verdict[], manifestLabel: string, generatedAt: string): string {
  const by = (sev: Severity) => verdicts.filter((v) => v.severity === sev)
  const counts = { BLOCK: by("BLOCK").length, REVIEW: by("REVIEW").length, ADVISORY: by("ADVISORY").length, PASS: by("PASS").length }
  const lines: string[] = []
  lines.push(`# Pre-Ingest QA Screen — ${manifestLabel}`)
  lines.push("")
  lines.push(`Generated: ${generatedAt}`)
  lines.push("")
  lines.push(`Totals: PASS ${counts.PASS} · ADVISORY ${counts.ADVISORY} · REVIEW ${counts.REVIEW} · BLOCK ${counts.BLOCK}`)
  lines.push("")
  const section = (sev: Severity, blurb: string) => {
    const items = by(sev)
    if (!items.length) return
    lines.push(`## ${sev} (${items.length}) — ${blurb}`)
    for (const v of items) {
      const notes = [...v.reasons, ...v.advisories.map((a) => `(advisory) ${a}`)]
      lines.push(`- \`${v.videoId}\`${notes.length ? ": " + notes.join("; ") : ""}`)
    }
    lines.push("")
  }
  section("BLOCK", "never ingested")
  section("REVIEW", "needs --allow-review")
  section("ADVISORY", "ingested, glance recommended")
  section("PASS", "clean")
  return lines.join("\n")
}
