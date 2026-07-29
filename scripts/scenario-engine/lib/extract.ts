/**
 * scripts/scenario-engine/lib/extract.ts
 *
 * Pure extraction logic for the scenario engine: turns stage-09 chunk data
 * into scenario "moments" (career-response, cold-read) with free labels
 * (coach's actual next line, conversation outcome, coach identity).
 *
 * No IO here — engine.ts reads chunk files and feeds parsed data in.
 * Mirrors the pure/IO split of scripts/training-data/lib/ingestQaScreen.ts.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpeakerRole = "coach" | "girl" | "other"

export type ConvLine = {
  speaker: SpeakerRole
  /** Raw speaker label as it appeared (Coach, Student, Girl, ...) */
  label: string
  text: string
}

export type RawChunkInput = {
  content: string
  segmentType: string
  videoId: string
  conversationId: number | null
  conversationChunkIndex: number | null
  channel: string
  description?: string
}

export type Conversation = {
  videoId: string
  convId: number
  channel: string
  lines: ConvLine[]
  descs: string[]
}

export type MomentDirection = "girl-reveal" | "coach-ask" | "coach-read"

export type ScenarioKind = "career" | "coldread"

export type Outcome = "closed" | "fizzled" | "unknown"

export type Moment = {
  id: string
  scenario: ScenarioKind
  direction: MomentDirection
  channel: string
  videoId: string
  convId: number
  /** Index of the trigger line within the conversation */
  lineIndex: number
  /** The line that opens the moment (girl's reveal, or coach's ask/read) */
  trigger: string
  /** Up to 3 lines of dialogue immediately before the trigger */
  context: string[]
  /** Coach lines that respond to the moment (girl-reveal) or follow the read/ask */
  coachResponse: string[]
  /** Girl lines that follow the coach response — her reaction */
  girlReaction: string[]
  /** Cold-read only: did she confirm the read? */
  readConfirmed?: boolean
  outcome: Outcome
  descs: string[]
}

export type Dataset = {
  version: 1
  generatedAt: string
  stats: DatasetStats
  career: Moment[]
  coldread: Moment[]
  /** Full transcript per conversation (key: videoId#convId). Distillation must
   * read whole conversations — principles written from moment windows get
   * distorted (a payoff line without its setup reads as a different move). */
  transcripts: Record<string, string[]>
}

export type DatasetStats = {
  conversationsScanned: number
  conversationsAfterDedup: number
  careerByChannel: Record<string, number>
  coldreadByChannel: Record<string, number>
  outcomes: Record<Outcome, number>
  /** Corpus rate of cold reads the girl confirmed (of those with a clear signal) */
  coldReadConfirmRate: number | null
}

// ---------------------------------------------------------------------------
// Detection patterns (validated by hand against the corpus in the
// July 2026 audit — see memory/scenario-mining-career-response.md)
// ---------------------------------------------------------------------------

const APOS = "['’]?"

/** Girl reveals occupation/study. Occupational suffix or explicit job word is
 * required — bare "I'm a ..." matches too much (devil, virgin, ambivert). */
export const GIRL_REVEAL_RE = new RegExp(
  [
    `\\bI${APOS}?(m| am) (a|an) \\w+(ist|ette|ess|cian|ian|eer|er|or|ant|ent)\\b`,
    `\\bI work\\b`,
    `\\bI stud(y|ied)\\b`,
    `\\bmy (job|major|degree|shift|residency)\\b`,
    `\\bresidency\\b`,
    `\\b(nurse|teacher|lawyer|doctor|dancer|architect|accountant|student|waitress|barista|engineer|designer|scientist|psychologist|nanny|model)\\b`,
  ].join("|"),
  "i"
)

/** Non-occupational "I'm a X" false positives seen in the corpus. */
const REVEAL_BLOCKLIST_RE =
  /\b(devil|virgin|ambivert|introvert|extrovert|believer|big fan|good (girl|person)|bit|little|really|very|kind of|f\W*er|loner|foodie|dreamer)\b/i

/** Coach asks about her job/study. */
export const COACH_ASK_RE = new RegExp(
  [
    `\\bwhat do you (do|study)\\b`,
    `\\bdo you (work|study)\\b`,
    `\\bare you (a student|working|studying)\\b`,
    `\\bwhat${APOS}s your (job|major)\\b`,
    `\\byou stud(y|ied)\\b`,
    `\\b(started|starting|finishing) residency\\b`,
    `\\bwhat year are you\\b`,
    `\\bwhat do you do for (work|a living)\\b`,
  ].join("|"),
  "i"
)

/** Generic "you seem <compliment>" lines are pleasantries, not committed reads. */
const COLD_READ_BLOCKLIST_RE =
  /\byou seem (like )?(really |very |pretty |quite )?(cool|nice|good|great|fun|sweet|chill|lovely|smart|happy|positive)\b/i

/** Coach commits to a read of her (job, type, personality). */
export const COLD_READ_RE = new RegExp(
  [
    `\\byou look like (a|an|you)\\b`,
    `\\byou seem (like )?(a|an|very|really|kind of)?\\s*\\w`,
    `\\bI can (see|tell|feel)\\b`,
    `\\byou${APOS}re (probably|definitely|either)\\b`,
    `\\blet me guess\\b`,
    `\\bI${APOS}m guessing\\b`,
    `\\byou give (me|off) .{0,20}(vibes?|energy|feeling|impression)\\b`,
    `\\bI get th(e|is) (feeling|vibe|sense)\\b`,
    `\\byou strike me as\\b`,
  ].join("|"),
  "i"
)

/** Close markers — number/social exchange actually happening. */
export const CLOSE_RE = new RegExp(
  [
    `\\b(put|pop|type) your number\\b`,
    `\\bgive me your number\\b`,
    `\\bwhat${APOS}s your number\\b`,
    `\\btake (your|my) number\\b`,
    `\\bI${APOS}ll (text|call) you\\b`,
    `\\binstagram\\b`,
    `\\binsta\\b`,
    `\\bwhatsapp\\b`,
    `\\bwhat${APOS}s your @`,
  ].join("|"),
  "i"
)

/** Conversation-ending pleasantries with no close = fizzle signal. */
export const ENDING_RE =
  /\b(nice (meeting|talking to) you|have a good (day|one|night)|see you around|take care|good luck)\b/i

const CONFIRM_RE = /\b(yes|yeah|yep|exactly|that's right|how did you know|I am|I do|you're right|right)\b/i
const DENY_RE = /\b(no\b|nope|not really|I'm not|actually|wrong)\b/i

// ---------------------------------------------------------------------------
// Conversation assembly
// ---------------------------------------------------------------------------

const GIRL_LABELS = /^(girl|woman|target)/i
const COACH_LABELS = /^(coach|student)/i
const LINE_RE = /^([A-Z][A-Za-z ]{0,24}):\s*(.+)$/

function roleFor(label: string): SpeakerRole {
  if (GIRL_LABELS.test(label)) return "girl"
  if (COACH_LABELS.test(label)) return "coach"
  return "other"
}

/**
 * Assemble ordered conversations from INTERACTION chunks.
 * - Strips [TYPE:...] header lines and [SUMMARY] chunks.
 * - Dedupes lines repeated by chunk overlap (sliding window).
 */
export function buildConversations(chunks: RawChunkInput[]): Conversation[] {
  const byConv = new Map<string, { chunks: RawChunkInput[]; channel: string }>()
  for (const c of chunks) {
    if (c.segmentType !== "INTERACTION") continue
    if (c.conversationId == null) continue
    if (c.content.startsWith("[SUMMARY]")) continue
    const key = `${c.videoId}#${c.conversationId}`
    const entry = byConv.get(key) ?? { chunks: [], channel: c.channel }
    entry.chunks.push(c)
    byConv.set(key, entry)
  }

  const convs: Conversation[] = []
  for (const [key, entry] of byConv) {
    const [videoId, convIdStr] = key.split("#")
    const sorted = [...entry.chunks].sort(
      (a, b) => (a.conversationChunkIndex ?? 0) - (b.conversationChunkIndex ?? 0)
    )
    const lines: ConvLine[] = []
    const descs = new Set<string>()
    for (const chunk of sorted) {
      if (chunk.description) descs.add(chunk.description)
      for (const raw of chunk.content.split("\n")) {
        if (raw.startsWith("[")) continue
        const m = LINE_RE.exec(raw.trim())
        if (!m) continue
        const line: ConvLine = { speaker: roleFor(m[1]), label: m[1], text: m[2].trim() }
        // overlap dedup: skip if identical to a recent line
        const window = lines.slice(-8)
        if (window.some((w) => w.text === line.text && w.label === line.label)) continue
        lines.push(line)
      }
    }
    if (lines.length === 0) continue
    convs.push({ videoId, convId: Number(convIdStr), channel: entry.channel, lines, descs: [...descs] })
  }
  return convs
}

// ---------------------------------------------------------------------------
// Footage-level dedup (same clip published in multiple videos/channels)
// ---------------------------------------------------------------------------

/** Word 5-gram shingle set over the normalized transcript. */
export function shingles(conv: Conversation): Set<string> {
  const words = conv.lines
    .map((l) => l.text)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i + 5 <= words.length; i += 1) out.add(words.slice(i, i + 5).join(" "))
  return out
}

/** Containment: share of the smaller conversation's shingles found in the larger. */
export function containment(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  for (const s of small) if (large.has(s)) inter += 1
  return inter / small.size
}

/**
 * Empirically chosen against the July 2026 corpus: cross-video duplicate
 * footage sits at containment >= 0.51; the densest legitimate overlap
 * (a compilation of one scripted opener run on 7 different girls) tops out
 * at 0.48. Containment (not symmetric Jaccard) because the same footage is
 * republished inside videos of very different lengths.
 */
const DUP_CONTAINMENT = 0.5

/**
 * Near-duplicate detection for footage republished across videos/channels
 * (slightly different ASR text and clip start points, so prefix hashing
 * misses them). Same-video conversation pairs are never deduped — those are
 * distinct approaches by construction (replays are COMMENTARY, not
 * INTERACTION). Keeps the first conversation of each group (input order).
 */
export function dedupeConversations(convs: Conversation[]): Conversation[] {
  const kept: { conv: Conversation; sh: Set<string> }[] = []
  for (const conv of convs) {
    const sh = shingles(conv)
    const isDup =
      sh.size >= 5 &&
      kept.some(
        (k) =>
          k.conv.videoId !== conv.videoId &&
          k.sh.size >= 5 &&
          containment(sh, k.sh) >= DUP_CONTAINMENT
      )
    if (isDup) continue
    kept.push({ conv, sh })
  }
  return kept.map((k) => k.conv)
}

// ---------------------------------------------------------------------------
// Moment detection
// ---------------------------------------------------------------------------

function collectAround(conv: Conversation, idx: number) {
  // 8 lines: enough to include a cold read placed several lines before the
  // reveal it pays off — a 3-line window made "So I was right!" look like a
  // retroactive claim and distorted the distilled principles.
  const context = conv.lines.slice(Math.max(0, idx - 8), idx).map(fmt)
  const coachResponse: string[] = []
  const girlReaction: string[] = []
  // walk forward: first block of coach lines, then first block of girl lines
  let i = idx + 1
  while (i < conv.lines.length && conv.lines[i].speaker !== "coach") i += 1
  while (i < conv.lines.length && conv.lines[i].speaker === "coach" && coachResponse.length < 6) {
    coachResponse.push(conv.lines[i].text)
    i += 1
  }
  while (i < conv.lines.length && conv.lines[i].speaker === "girl" && girlReaction.length < 4) {
    girlReaction.push(conv.lines[i].text)
    i += 1
  }
  return { context, coachResponse, girlReaction }
}

function fmt(l: ConvLine): string {
  return `${l.speaker === "girl" ? "Girl" : l.speaker === "coach" ? "Coach" : l.label}: ${l.text}`
}

export function labelOutcome(conv: Conversation): Outcome {
  const n = conv.lines.length
  const secondHalf = conv.lines.slice(Math.floor(n / 2)).map((l) => l.text).join(" ")
  if (CLOSE_RE.test(secondHalf)) return "closed"
  const tail = conv.lines.slice(-6).map((l) => l.text).join(" ")
  if (ENDING_RE.test(tail)) return "fizzled"
  return "unknown"
}

export function detectCareerMoments(conv: Conversation): Moment[] {
  const moments: Moment[] = []
  const outcome = labelOutcome(conv)
  for (let i = 0; i < conv.lines.length; i += 1) {
    const line = conv.lines[i]
    let direction: MomentDirection | null = null
    if (line.speaker === "girl" && GIRL_REVEAL_RE.test(line.text) && !REVEAL_BLOCKLIST_RE.test(line.text)) {
      direction = "girl-reveal"
    } else if (line.speaker === "coach" && COACH_ASK_RE.test(line.text)) {
      direction = "coach-ask"
    }
    if (!direction) continue
    const { context, coachResponse, girlReaction } = collectAround(conv, i)
    if (direction === "girl-reveal" && coachResponse.length === 0) continue
    moments.push({
      id: `${conv.videoId}#${conv.convId}@${i}`,
      scenario: "career",
      direction,
      channel: conv.channel,
      videoId: conv.videoId,
      convId: conv.convId,
      lineIndex: i,
      trigger: fmt(line),
      context,
      coachResponse,
      girlReaction,
      outcome,
      descs: conv.descs,
    })
    break // one career moment per conversation — the first is the scenario seed
  }
  return moments
}

export function detectColdReadMoments(conv: Conversation): Moment[] {
  const moments: Moment[] = []
  const outcome = labelOutcome(conv)
  for (let i = 0; i < conv.lines.length; i += 1) {
    const line = conv.lines[i]
    if (line.speaker !== "coach" || !COLD_READ_RE.test(line.text)) continue
    if (COLD_READ_BLOCKLIST_RE.test(line.text)) continue
    // find her reaction to the read
    const next = conv.lines.slice(i + 1).find((l) => l.speaker === "girl")
    let readConfirmed: boolean | undefined
    if (next) {
      if (DENY_RE.test(next.text)) readConfirmed = false
      else if (CONFIRM_RE.test(next.text)) readConfirmed = true
    }
    const { context, coachResponse, girlReaction } = collectAround(conv, i)
    moments.push({
      id: `${conv.videoId}#${conv.convId}@${i}`,
      scenario: "coldread",
      direction: "coach-read",
      channel: conv.channel,
      videoId: conv.videoId,
      convId: conv.convId,
      lineIndex: i,
      trigger: fmt(line),
      context,
      coachResponse,
      girlReaction,
      readConfirmed,
      outcome,
      descs: conv.descs,
    })
    break // one per conversation
  }
  return moments
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export function extractDataset(convs: Conversation[], now: string): Dataset {
  const deduped = dedupeConversations(convs)
  const career: Moment[] = []
  const coldread: Moment[] = []
  for (const conv of deduped) {
    career.push(...detectCareerMoments(conv))
    coldread.push(...detectColdReadMoments(conv))
  }
  const byChannel = (ms: Moment[]) => {
    const out: Record<string, number> = {}
    for (const m of ms) out[m.channel] = (out[m.channel] ?? 0) + 1
    return out
  }
  const outcomes: Record<Outcome, number> = { closed: 0, fizzled: 0, unknown: 0 }
  for (const m of [...career, ...coldread]) outcomes[m.outcome] += 1
  const confirmSignals = coldread.filter((m) => m.readConfirmed !== undefined)
  const confirmRate =
    confirmSignals.length > 0
      ? confirmSignals.filter((m) => m.readConfirmed).length / confirmSignals.length
      : null
  const transcripts: Record<string, string[]> = {}
  const wanted = new Set([...career, ...coldread].map((m) => `${m.videoId}#${m.convId}`))
  for (const conv of deduped) {
    const key = `${conv.videoId}#${conv.convId}`
    if (wanted.has(key)) transcripts[key] = conv.lines.map(fmt)
  }
  return {
    version: 1,
    generatedAt: now,
    stats: {
      conversationsScanned: convs.length,
      conversationsAfterDedup: deduped.length,
      careerByChannel: byChannel(career),
      coldreadByChannel: byChannel(coldread),
      outcomes,
      coldReadConfirmRate: confirmRate,
    },
    career,
    coldread,
    transcripts,
  }
}
