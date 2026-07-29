/**
 * Scenario Lab service — corpus-grounded cold-read + career-response practice.
 *
 * Every session is seeded by a REAL infield moment from the scenario-engine
 * dataset (data/scenario-mining/dataset.json). The sim-girl is grounded in the
 * real girl's lines; the judge is grounded in the engine-distilled principles
 * (data/scenario-mining/principles/<kind>.md, validated by the engine's
 * held-out tests). Debriefs show the real coach's response as the receipt.
 *
 * Test-lab only (served behind /api/scenarios/lab, page /test/scenario-lab).
 * Fail-closed: missing dataset/principles or empty LLM output throws — the
 * route surfaces an explicit error, never a fallback (CLAUDE.md rule 15).
 */

import fs from "fs"
import path from "path"

import { queryClaudeHeadless, queryClaudeHeadlessJSON } from "@/src/shared/claudeHeadless"
import { clampScore } from "./types"
import type {
  LabChatMessage,
  LabDebriefResult,
  LabKind,
  LabMoment,
  LabRespondResult,
  LabStartResult,
} from "./types"
import { hashSeed } from "./shared/seeding"

const MINING_DIR = () => path.join(process.cwd(), "data", "scenario-mining")

export const LAB_MAX_TURNS = 5

// ---------------------------------------------------------------------------
// Dataset access (cached per process)
// ---------------------------------------------------------------------------

type EngineDataset = { career: LabMoment[]; coldread: LabMoment[]; stats: { coldReadConfirmRate: number | null } }

let cachedDataset: EngineDataset | null = null

export function loadLabDataset(): EngineDataset {
  if (cachedDataset) return cachedDataset
  const p = path.join(MINING_DIR(), "dataset.json")
  if (!fs.existsSync(p)) throw new Error("Scenario dataset missing — run scripts/scenario-engine/engine.ts extract")
  cachedDataset = JSON.parse(fs.readFileSync(p, "utf-8"))
  return cachedDataset!
}

export function loadLabPrinciples(kind: LabKind): string {
  const p = path.join(MINING_DIR(), "principles", `${kind}.md`)
  if (!fs.existsSync(p)) throw new Error(`Principles missing for ${kind} — run scripts/scenario-engine/engine.ts distill`)
  return fs.readFileSync(p, "utf-8")
}

/** Moments usable by the lab: must have a real coach response to show as receipt. */
export function labMoments(kind: LabKind): LabMoment[] {
  const ds = loadLabDataset()
  const pool = kind === "coldread" ? ds.coldread : ds.career
  return pool.filter((m) => m.coachResponse.length > 0)
}

export function pickLabMoment(kind: LabKind, seed: string): LabMoment {
  const pool = labMoments(kind)
  if (pool.length === 0) throw new Error(`No lab moments for ${kind}`)
  return pool[Math.abs(hashSeed(seed)) % pool.length]
}

// ---------------------------------------------------------------------------
// Session start
// ---------------------------------------------------------------------------

export async function startLabSession(kind: LabKind, seed: string): Promise<LabStartResult> {
  const moment = pickLabMoment(kind, seed)
  if (kind === "coldread") {
    // LLM writes what the man SEES, without giving away the coach's conclusion.
    const scene = await queryClaudeHeadless(
      `A dating coach on the street made this cold read about a woman:\n"${moment.trigger}"\n` +
        `Context right before it:\n${moment.context.join("\n") || "(conversation just started)"}\n\n` +
        `Write 2-3 sentences describing what a man approaching her SEES — her outfit, vibe, ` +
        `setting — consistent with that read but WITHOUT stating or paraphrasing the read's conclusion. ` +
        `Second person ("You spot her..."). Present tense. Output only the description.`,
      { timeoutMs: 90_000 }
    )
    return { kind, momentId: moment.id, scene, openingLine: null }
  }
  // career: she reveals — the trigger (girl-reveal) or her answer (coach-ask)
  const reveal = moment.trigger.startsWith("Girl:")
    ? moment.trigger.replace(/^Girl:\s*/, "")
    : moment.girlReaction[0] ?? moment.trigger.replace(/^\w+:\s*/, "")
  const scene =
    `You're a couple of minutes into a street stop. It's going okay — she's warm but not sold. ` +
    `The conversation drifts to what she does.`
  return { kind, momentId: moment.id, scene, openingLine: reveal }
}

// ---------------------------------------------------------------------------
// Sim-girl turns
// ---------------------------------------------------------------------------

function findMoment(kind: LabKind, momentId: string): LabMoment {
  const m = labMoments(kind).find((x) => x.id === momentId)
  if (!m) throw new Error(`Unknown moment: ${momentId}`)
  return m
}

function historyBlock(history: LabChatMessage[]): string {
  return history.map((h) => `${h.role === "user" ? "Him" : "Her"}: ${h.text}`).join("\n")
}

export async function labRespond(
  kind: LabKind,
  momentId: string,
  history: LabChatMessage[],
  userMessage: string
): Promise<LabRespondResult> {
  const moment = findMoment(kind, momentId)
  const ds = loadLabDataset()
  const confirmRate = ds.stats.coldReadConfirmRate ?? 0.4
  const turn = history.filter((h) => h.role === "user").length + 1

  const coldReadGuidance =
    kind === "coldread" && turn === 1
      ? `His first message is (or contains) a GUESS about you — your job, origin, or personality.\n` +
        `The real coach in this footage guessed: "${moment.trigger}" and the real woman ` +
        `${moment.readConfirmed === true ? "CONFIRMED it" : moment.readConfirmed === false ? "DENIED it" : "reacted ambiguously"}: ` +
        `"${moment.girlReaction.join(" ") || "(reaction not captured)"}".\n` +
        `If his guess is essentially the same as the real coach's, react the way the real woman did (in your own words). ` +
        `If it's a different guess, decide in character — across this corpus women confirm reads about ${Math.round(confirmRate * 100)}% of the time. ` +
        `A specific, committed guess deserves a livelier reaction (either way) than a vague hedge.\n`
      : ""

  const careerGuidance =
    kind === "career" && turn >= 2 && !history.some((h) => h.role === "girl" && /what (do|about) you/i.test(h.text))
      ? `At a natural point in THIS reply, flip the frame and ask him what HE does ("And what do you do?" in your own words) — real women do this once the exchange warms up.\n`
      : ""

  const prompt =
    `You play the WOMAN in a realistic street-approach conversation. Ground yourself in this real footage:\n` +
    `Scene context:\n${moment.context.join("\n") || "(start of interaction)"}\n` +
    `Real lines from this woman (match her voice/energy):\n${moment.girlReaction.map((g) => `- ${g}`).join("\n") || "- (none captured — neutral friendly, slightly busy)"}\n\n` +
    `Rules: reply with 1-2 short spoken sentences max, natural register, no narration, never break character. ` +
    `You are neither hostile nor easy: bland/interview-ish lines get short polite answers; playful, specific, ` +
    `calibrated lines pull you in; a genuinely creepy line makes you pull back and you say so. ` +
    `You do NOT reward politeness with interest.\n` +
    coldReadGuidance +
    careerGuidance +
    `\nConversation so far:\n${historyBlock(history)}\nHim: ${userMessage}\n\n` +
    `Return JSON only: {"reply": "her spoken reply", "done": true|false} — "done" true only if she naturally ` +
    `ends the exchange (has to go, or turn ${LAB_MAX_TURNS}+ reached).`

  const parsed = await queryClaudeHeadlessJSON<{ reply: string; done?: boolean }>(prompt, { timeoutMs: 90_000 })
  if (!parsed.reply) throw new Error("Sim returned no reply")
  return { reply: parsed.reply, turn, done: Boolean(parsed.done) || turn >= LAB_MAX_TURNS }
}

// ---------------------------------------------------------------------------
// Debrief
// ---------------------------------------------------------------------------

export async function labDebrief(
  kind: LabKind,
  momentId: string,
  history: LabChatMessage[]
): Promise<LabDebriefResult> {
  const moment = findMoment(kind, momentId)
  const principles = loadLabPrinciples(kind)
  const parsed = await queryClaudeHeadlessJSON<{
    score: number
    feedback: string
    bestMove: string
    weakestLine: string
    rewrite: string
  }>(
    `You judge in-field dating conversations using these principles distilled from real coach transcripts:\n\n` +
      `${principles}\n\n---\n\n` +
      `A user practiced this scenario. Their conversation with the simulated woman:\n${historyBlock(history)}\n\n` +
      `Judge by the principles, not politeness norms — calibrated teasing and boldness score well here; ` +
      `bland validation and interview mode score poorly.\n` +
      `Return JSON only: {"score": 1-10, "feedback": "2-3 sentences", "bestMove": "his best line/move and which ` +
      `named principle it matches (or 'none')", "weakestLine": "his weakest line verbatim", "rewrite": "a stronger ` +
      `version of that weakest line, in-register"}`,
    { timeoutMs: 120_000 }
  )
  return {
    score: clampScore(Number(parsed.score)),
    feedback: parsed.feedback ?? "",
    bestMove: parsed.bestMove ?? "",
    weakestLine: parsed.weakestLine ?? "",
    rewrite: parsed.rewrite ?? "",
    receipt: {
      channel: moment.channel,
      situation: [...moment.context, moment.trigger],
      coachResponse: moment.coachResponse,
      girlReaction: moment.girlReaction,
      outcome: moment.outcome,
    },
  }
}
