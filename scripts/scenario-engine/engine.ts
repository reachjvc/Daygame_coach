/**
 * scripts/scenario-engine/engine.ts
 *
 * Single entrypoint for the scenario engine (CLAUDE.md rule 14):
 * builds a scenario dataset from the stage-09 corpus, splits it, distills
 * principles with an LLM, and validates the LLM judge against held-out data.
 *
 * Stages:
 *   extract  — corpus -> data/scenario-mining/dataset.json (no LLM)
 *   split    — seeded 70/30 train/test split, stratified by channel
 *   distill  — LLM writes principles/<type>.md from the train split
 *   test     — 3 held-out tests: next-line ranking, coach-swap, outcome
 *   report   — regenerate data/scenario-mining/REPORT.md from state
 *   all      — everything in order
 *
 * Use:
 *   node node_modules/tsx/dist/cli.mjs scripts/scenario-engine/engine.ts extract
 *   node node_modules/tsx/dist/cli.mjs scripts/scenario-engine/engine.ts all
 *   ... engine.ts test --limit 10        (cap held-out items per test, for a cheap smoke run)
 *
 * State: data/scenario-mining/engine-state.json (single state file)
 * Report: data/scenario-mining/REPORT.md (single human-readable output)
 *
 * Fail-closed: any empty/unparseable LLM response is a hard error for that
 * item, recorded as `error` — never converted to a default score (rule 15).
 */

import fs from "fs"
import path from "path"

import {
  buildConversations,
  extractDataset,
  type Dataset,
  type Moment,
  type RawChunkInput,
} from "./lib/extract"
import { splitDataset, type SplitResult } from "./lib/split"
import {
  buildDistillPrompt,
  buildNextLinePrompt,
  buildCoachSwapPrompt,
  buildOutcomePrompt,
  makeNextLineItems,
  makeSwapItems,
  parseRankingResponse,
  parseSwapResponse,
  parseOutcomeResponse,
  scoreNextLine,
  summarizeSwaps,
  scoreOutcomes,
  type NextLineItem,
  type SwapItem,
  type NextLineResult,
  type SwapResult,
  type OutcomeResult,
} from "./lib/evaltests"
import { queryClaudeHeadless } from "../../src/shared/claudeHeadless"

// ---------------------------------------------------------------------------
// Paths + state
// ---------------------------------------------------------------------------

const ROOT = process.cwd()
const CHUNKS_DIR = path.join(ROOT, "data", "09.EXT.chunks")
const VERDICTS_DIR = path.join(ROOT, "data", "validation", "ingest-qa")
const OUT_DIR = path.join(ROOT, "data", "scenario-mining")
const DATASET_PATH = path.join(OUT_DIR, "dataset.json")
const STATE_PATH = path.join(OUT_DIR, "engine-state.json")
const REPORT_PATH = path.join(OUT_DIR, "REPORT.md")
const PRINCIPLES_DIR = path.join(OUT_DIR, "principles")

type EngineState = {
  version: 1
  updatedAt: string
  extract?: { at: string; conversations: number; career: number; coldread: number }
  split?: SplitResult & { at: string }
  distill?: { at: string; types: string[] }
  distractors?: Record<string, string[]> // momentId -> generated nice-guy lines
  tests?: {
    at: string
    nextLine: { career: NextLineResult[]; coldread: NextLineResult[] }
    coachSwap: SwapResult[]
    outcome: OutcomeResult[]
  }
}

function loadState(): EngineState {
  if (fs.existsSync(STATE_PATH)) return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"))
  return { version: 1, updatedAt: new Date().toISOString() }
}

function saveState(state: EngineState) {
  state.updatedAt = new Date().toISOString()
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
}

function loadDataset(): Dataset {
  if (!fs.existsSync(DATASET_PATH)) throw new Error("dataset.json missing — run `extract` first")
  return JSON.parse(fs.readFileSync(DATASET_PATH, "utf-8"))
}

// ---------------------------------------------------------------------------
// Stage: extract
// ---------------------------------------------------------------------------

function loadVerdicts(): Map<string, string> {
  const verdicts = new Map<string, string>()
  if (!fs.existsSync(VERDICTS_DIR)) throw new Error(`verdicts dir missing: ${VERDICTS_DIR}`)
  for (const f of fs.readdirSync(VERDICTS_DIR).filter((f) => f.endsWith(".verdicts.json"))) {
    const doc = JSON.parse(fs.readFileSync(path.join(VERDICTS_DIR, f), "utf-8"))
    for (const v of doc.verdicts ?? []) {
      if (v.videoId) verdicts.set(v.videoId, v.severity)
    }
  }
  return verdicts
}

function* chunkFiles(): Generator<string> {
  for (const source of fs.readdirSync(CHUNKS_DIR)) {
    const dir = path.join(CHUNKS_DIR, source)
    if (!fs.statSync(dir).isDirectory()) continue
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".chunks.json"))) {
      yield path.join(dir, f)
    }
  }
}

function stageExtract(state: EngineState) {
  const verdicts = loadVerdicts()
  const inputs: RawChunkInput[] = []
  let files = 0
  for (const fp of chunkFiles()) {
    const doc = JSON.parse(fs.readFileSync(fp, "utf-8"))
    const severity = verdicts.get(doc.videoId)
    if (severity !== "PASS" && severity !== "REVIEW") continue
    files += 1
    for (const c of doc.chunks ?? []) {
      const m = c.metadata ?? {}
      inputs.push({
        content: c.content,
        segmentType: m.segmentType,
        videoId: m.videoId,
        conversationId: m.conversationId ?? null,
        conversationChunkIndex: m.conversationChunkIndex ?? null,
        channel: m.channel,
        description: m.description,
      })
    }
  }
  const convs = buildConversations(inputs)
  const dataset = extractDataset(convs, new Date().toISOString())
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(DATASET_PATH, JSON.stringify(dataset, null, 2))
  state.extract = {
    at: dataset.generatedAt,
    conversations: dataset.stats.conversationsAfterDedup,
    career: dataset.career.length,
    coldread: dataset.coldread.length,
  }
  // downstream stages are stale now (distractors survive: keyed by stable
  // moment ids, and a nice-guy distractor for a trigger stays valid)
  delete state.split
  delete state.distill
  delete state.tests
  saveState(state)
  console.log(
    `extract: ${files} screened videos -> ${dataset.stats.conversationsAfterDedup} convs ` +
      `(${dataset.stats.conversationsScanned} pre-dedup) -> career ${dataset.career.length}, coldread ${dataset.coldread.length}`
  )
  console.log(`  cold-read confirm rate: ${dataset.stats.coldReadConfirmRate}`)
}

// ---------------------------------------------------------------------------
// Stage: split
// ---------------------------------------------------------------------------

function stageSplit(state: EngineState) {
  const dataset = loadDataset()
  const split = splitDataset(dataset, 0.3, "scenario-engine-v1")
  state.split = { ...split, at: new Date().toISOString() }
  saveState(state)
  console.log(
    `split: career train ${split.career.train.length}/test ${split.career.test.length}, ` +
      `coldread train ${split.coldread.train.length}/test ${split.coldread.test.length}`
  )
}

// ---------------------------------------------------------------------------
// Stage: distill
// ---------------------------------------------------------------------------

function trainMoments(dataset: Dataset, state: EngineState, kind: "career" | "coldread"): Moment[] {
  const ids = new Set(state.split![kind].train)
  return dataset[kind].filter((m) => ids.has(m.id))
}

function testMoments(dataset: Dataset, state: EngineState, kind: "career" | "coldread"): Moment[] {
  const ids = new Set(state.split![kind].test)
  return dataset[kind].filter((m) => ids.has(m.id))
}

async function stageDistill(state: EngineState) {
  if (!state.split) throw new Error("run `split` first")
  const dataset = loadDataset()
  fs.mkdirSync(PRINCIPLES_DIR, { recursive: true })
  for (const kind of ["career", "coldread"] as const) {
    const prompt = buildDistillPrompt(kind, trainMoments(dataset, state, kind), dataset.transcripts ?? {})
    console.log(`distill(${kind}): ${prompt.length} chars prompt...`)
    const out = await queryClaudeHeadless(prompt, { timeoutMs: 300_000 })
    fs.writeFileSync(path.join(PRINCIPLES_DIR, `${kind}.md`), out)
    console.log(`distill(${kind}): wrote principles/${kind}.md (${out.length} chars)`)
  }
  state.distill = { at: new Date().toISOString(), types: ["career", "coldread"] }
  saveState(state)
}

function loadPrinciples(kind: "career" | "coldread"): string {
  const p = path.join(PRINCIPLES_DIR, `${kind}.md`)
  if (!fs.existsSync(p)) throw new Error(`principles/${kind}.md missing — run \`distill\` first`)
  return fs.readFileSync(p, "utf-8")
}

// ---------------------------------------------------------------------------
// Stage: test
// ---------------------------------------------------------------------------

async function generateDistractors(state: EngineState, items: NextLineItem[]): Promise<void> {
  state.distractors ??= {}
  for (const item of items) {
    if (state.distractors[item.moment.id]) continue
    const prompt =
      `You write REALISTIC BUT MEDIOCRE lines for a dating-conversation dataset. ` +
      `A man is talking to a woman he just met on the street. She just said/did this:\n\n` +
      `${item.moment.context.join("\n")}\n${item.moment.trigger}\n\n` +
      `Write exactly 2 short replies a well-meaning but overly polite "nice guy" would give — ` +
      `validating, safe, slightly interview-ish, no teasing, no playfulness. ` +
      `Realistic spoken register, not stilted. Return JSON: ["reply1","reply2"] and nothing else.`
    const raw = await queryClaudeHeadless(prompt, { timeoutMs: 120_000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()
    const arr = JSON.parse(cleaned)
    if (!Array.isArray(arr) || arr.length < 2) throw new Error(`bad distractors for ${item.moment.id}: ${raw.slice(0, 200)}`)
    state.distractors[item.moment.id] = arr.slice(0, 2).map(String)
    saveState(state)
  }
}

async function stageTest(state: EngineState, limit: number | null) {
  if (!state.split) throw new Error("run `split` first")
  const dataset = loadDataset()
  const cap = <T,>(arr: T[]) => (limit ? arr.slice(0, limit) : arr)

  // Per-item cache: successful results from a previous run are kept; only
  // errored/missing items re-run (LLM calls are the expensive part).
  const prev = state.tests
  const prevNextLine = (kind: "career" | "coldread", id: string) =>
    prev?.nextLine[kind].find((r) => r.momentId === id && !r.error)
  const prevSwap = (sitId: string, respId: string, isOriginal: boolean) =>
    prev?.coachSwap.find(
      (r) => r.situationId === sitId && r.responseId === respId && r.isOriginal === isOriginal && !r.error
    )
  const prevOutcome = (id: string) => prev?.outcome.find((r) => r.momentId === id && !r.error)

  const results: NonNullable<EngineState["tests"]> = {
    at: new Date().toISOString(),
    nextLine: { career: [], coldread: [] },
    coachSwap: [],
    outcome: [],
  }

  // ---- Test 1: next-line ranking (both scenario types)
  for (const kind of ["career", "coldread"] as const) {
    const principles = loadPrinciples(kind)
    const held = cap(testMoments(dataset, state, kind).filter((m) => m.coachResponse.length > 0))
    const pool = trainMoments(dataset, state, kind)
    const items = makeNextLineItems(held, pool, "scenario-engine-v1")
    await generateDistractors(state, items)
    for (const item of items) {
      const cached = prevNextLine(kind, item.moment.id)
      if (cached) {
        results.nextLine[kind].push(cached)
        process.stdout.write("c")
        continue
      }
      const distractors = state.distractors![item.moment.id]
      const prompt = buildNextLinePrompt(principles, item, distractors, "scenario-engine-v1")
      try {
        const raw = await queryClaudeHeadless(prompt, { timeoutMs: 120_000 })
        results.nextLine[kind].push(parseRankingResponse(item, distractors, raw, "scenario-engine-v1"))
      } catch (err) {
        results.nextLine[kind].push({ momentId: item.moment.id, error: String(err), pickedReal: false, ranking: [] })
      }
      process.stdout.write(".")
    }
    console.log(` next-line(${kind}): ${results.nextLine[kind].length} items`)
  }

  // ---- Test 2: coach-swap (career only — richest cross-coach pool)
  {
    const principles = loadPrinciples("career")
    const held = cap(testMoments(dataset, state, "career").filter((m) => m.coachResponse.length > 0))
    const swaps = makeSwapItems(held, "scenario-engine-v1")
    for (const swap of swaps) {
      const cached = prevSwap(swap.situation.id, swap.response.id, swap.isOriginal)
      if (cached) {
        results.coachSwap.push(cached)
        process.stdout.write("c")
        continue
      }
      const prompt = buildCoachSwapPrompt(principles, swap)
      try {
        const raw = await queryClaudeHeadless(prompt, { timeoutMs: 120_000 })
        results.coachSwap.push(parseSwapResponse(swap, raw))
      } catch (err) {
        results.coachSwap.push({ situationId: swap.situation.id, responseId: swap.response.id, isOriginal: swap.isOriginal, error: String(err), fitScore: null, reasoning: "" })
      }
      process.stdout.write(".")
    }
    console.log(` coach-swap: ${results.coachSwap.length} pairs`)
  }

  // ---- Test 3: outcome prediction (labeled conversations only)
  {
    const principles = loadPrinciples("career")
    const held = cap(
      [...testMoments(dataset, state, "career"), ...testMoments(dataset, state, "coldread")].filter(
        (m) => m.outcome !== "unknown"
      )
    )
    for (const m of held) {
      const cached = prevOutcome(m.id)
      if (cached) {
        results.outcome.push(cached)
        process.stdout.write("c")
        continue
      }
      const prompt = buildOutcomePrompt(principles, m)
      try {
        const raw = await queryClaudeHeadless(prompt, { timeoutMs: 120_000 })
        results.outcome.push(parseOutcomeResponse(m, raw))
      } catch (err) {
        results.outcome.push({ momentId: m.id, actual: m.outcome as "closed" | "fizzled", predicted: null, error: String(err) })
      }
      process.stdout.write(".")
    }
    console.log(` outcome: ${results.outcome.length} items`)
  }

  state.tests = results
  saveState(state)
}

// ---------------------------------------------------------------------------
// Stage: report
// ---------------------------------------------------------------------------

function stageReport(state: EngineState) {
  const lines: string[] = ["# Scenario Engine Report", "", `Updated: ${state.updatedAt}`, ""]
  if (state.extract) {
    lines.push(
      "## Dataset",
      "",
      `- Conversations (deduped): ${state.extract.conversations}`,
      `- Career moments: ${state.extract.career}`,
      `- Cold-read moments: ${state.extract.coldread}`,
      ""
    )
  }
  if (state.split) {
    lines.push(
      "## Split (seed: scenario-engine-v1, 30% held out, channel-stratified)",
      "",
      `- career: ${state.split.career.train.length} train / ${state.split.career.test.length} test`,
      `- coldread: ${state.split.coldread.train.length} train / ${state.split.coldread.test.length} test`,
      ""
    )
  }
  if (state.tests) {
    const t = state.tests
    lines.push("## Engine validation (held-out set)", "")
    for (const kind of ["career", "coldread"] as const) {
      const r = t.nextLine[kind]
      const s = scoreNextLine(r)
      lines.push(
        `### Next-line ranking — ${kind}`,
        "",
        `- Top-1 accuracy (real coach line ranked #1): **${s.top1Pct}%** (${s.top1}/${s.scored})`,
        `- Real line in top 2: ${s.top2Pct}% | errors: ${s.errors}`,
        `- A REAL coach line (this or another situation) beat both nice-guy distractors for #1: **${s.realishTop1Pct}%**`,
        ""
      )
      const misses = r.filter((x) => !x.error && !x.pickedReal).slice(0, 3)
      if (misses.length) {
        lines.push("Worst misses (judge preferred a distractor):", "")
        for (const miss of misses) lines.push(`- ${miss.momentId}: ranked ${JSON.stringify(miss.ranking)}`)
        lines.push("")
      }
    }
    const swap = summarizeSwaps(t.coachSwap)
    lines.push(
      "### Coach-swap (career)",
      "",
      `- Original-context responses mean fit: **${swap.meanOriginal}** (n=${swap.nOriginal})`,
      `- Swapped-in responses mean fit: **${swap.meanSwapped}** (n=${swap.nSwapped})`,
      `- Separation (original - swapped): **${swap.separation}** — positive = judge notices context fit`,
      `- Errors: ${swap.errors}`,
      ""
    )
    const oc = scoreOutcomes(t.outcome)
    lines.push(
      "### Outcome prediction",
      "",
      `- Accuracy: **${oc.accuracyPct}%** (${oc.correct}/${oc.scored}, base rate closed=${oc.baseRatePct}%)`,
      `- Errors: ${oc.errors}`,
      ""
    )
  }
  lines.push("---", "", "Regenerate with: `node node_modules/tsx/dist/cli.mjs scripts/scenario-engine/engine.ts report`")
  fs.writeFileSync(REPORT_PATH, lines.join("\n"))
  console.log(`report: wrote ${REPORT_PATH}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const stage = args[0] ?? "all"
  const limitIdx = args.indexOf("--limit")
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : null

  const state = loadState()
  const run = async (s: string) => {
    if (s === "extract") stageExtract(state)
    else if (s === "split") stageSplit(state)
    else if (s === "distill") await stageDistill(state)
    else if (s === "test") await stageTest(state, limit)
    else if (s === "report") stageReport(state)
    else throw new Error(`unknown stage: ${s}`)
  }

  if (stage === "all") {
    for (const s of ["extract", "split", "distill", "test", "report"]) await run(s)
  } else {
    await run(stage)
    if (stage !== "report") stageReport(state)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
