"use client"

/**
 * Intake step — "come in as you are". The user types what they want in their own words
 * (any language) + an overall target date; we embed it IN THE BROWSER with a small
 * multilingual model (transformers.js, $0, no API) and cosine-match it against the
 * pillar/objective taxonomy. The user confirms/disambiguates the matched AREAS, then we
 * hand the match up so the Plan step can show the relevant TEMPLATES (ranked + pre-picked).
 *
 * Model + taxonomy embeddings are computed locally and cached (model in the browser Cache
 * API, taxonomy vectors in localStorage), so repeat use is instant and free.
 */

import { useState, useCallback } from "react"
import { buildTaxonomyItems, taxonomyVersion, matchTaxonomy, resolveIntake } from "@/src/goals/intakeService"
import type { IntakeMatches, IntakeResolution } from "@/src/goals/intakeService"
import { PILLARS } from "@/src/goals/data/newGoalFramework"
import { Sparkles, Loader2 } from "lucide-react"

// Multilingual so e.g. Danish input ("jeg vil have det godt") maps onto the
// English taxonomy. 384-dim, downloads once then cached by the browser.
const MODEL_ID = "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
const CACHE_KEY = "goalIntakeTaxEmb_v1"

// Module-scope singleton so the model loads at most once per session.
let extractorPromise: Promise<unknown> | null = null
async function getExtractor(onProgress?: (pct: number) => void): Promise<(t: string[], o: object) => Promise<{ tolist: () => number[][] }>> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers")
      return pipeline("feature-extraction", MODEL_ID, {
        progress_callback: (e: { progress?: number }) => { if (typeof e?.progress === "number") onProgress?.(Math.round(e.progress)) },
      })
    })()
  }
  return extractorPromise as Promise<(t: string[], o: object) => Promise<{ tolist: () => number[][] }>>
}
async function embed(texts: string[], onProgress?: (pct: number) => void): Promise<number[][]> {
  const extractor = await getExtractor(onProgress)
  const out = await extractor(texts, { pooling: "mean", normalize: true })
  return out.tolist()
}

type Phase = "idle" | "loading" | "matching" | "done" | "error"

const PLACEHOLDER = "e.g. I want to feel good in my everyday life, wake up next to someone I like, stop a bad habit, and get my business going again…"

export function GoalIntake({
  onMatched,
  date,
  onChangeDate,
  matched,
}: {
  /** Hand the match up immediately: full matches + the resolution (kept areas, auto-selected
   * objectives, clarifying questions). The Plan step turns the resolution into the question tree. */
  onMatched: (matches: IntakeMatches, resolution: IntakeResolution) => void
  /** Overall "achieve by" anchor date (YYYY-MM-DD), threaded from the flow. */
  date: string
  onChangeDate: (d: string) => void
  /** True once the flow has a match — shows the "plan is below" confirmation. */
  matched?: boolean
}) {
  const [text, setText] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [pct, setPct] = useState(0)
  const [matchedAreas, setMatchedAreas] = useState<string[]>([])
  const [editing, setEditing] = useState(true) // collapse to a slim bar once matched
  const [err, setErr] = useState("")

  const ensureTaxonomyVecs = useCallback(async (onProgress: (p: number) => void) => {
    const items = buildTaxonomyItems()
    const version = taxonomyVersion(items)
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null")
      if (cached?.version === version && Array.isArray(cached.vecs) && cached.vecs.length === items.length) {
        return { items, vecs: cached.vecs as number[][] }
      }
    } catch { /* ignore corrupt cache */ }
    const vecs = await embed(items.map((i) => i.text), onProgress)
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ version, vecs: vecs.map((v) => v.map((x) => +x.toFixed(5))) })) } catch { /* quota */ }
    return { items, vecs }
  }, [])

  const run = useCallback(async () => {
    const q = text.trim()
    if (!q) return
    setPhase("loading"); setErr(""); setPct(0)
    try {
      const { items, vecs } = await ensureTaxonomyVecs(setPct)
      setPhase("matching")
      const [qVec] = await embed([q])
      const m = matchTaxonomy(qVec, items, vecs)
      const res = resolveIntake(m)
      setMatchedAreas(res.pillarIds.map((id) => PILLARS.find((p) => p.id === id)?.label ?? id))
      // Hand up immediately → the plan (areas → objective questions → priority) renders below.
      onMatched(m, res)
      setPhase("done")
      setEditing(false) // collapse the matcher so the plan is the focus
    } catch (e) {
      console.error("Goal intake failed:", e)
      setErr(e instanceof Error ? e.message : String(e))
      setPhase("error")
    }
  }, [text, ensureTaxonomyVecs, onMatched])

  const busy = phase === "loading" || phase === "matching"

  // Collapsed view once matched — a slim bar so the plan below is the focus.
  if (matched && !editing) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 mb-6 flex items-center gap-3">
        <Sparkles className="size-4 text-violet-300 shrink-0" />
        <span className="text-sm text-zinc-300 truncate flex-1" title={text}>{text || "Your goal"}</span>
        <span className="text-[10px] text-emerald-300/90 shrink-0">✓ {matchedAreas.length} area{matchedAreas.length === 1 ? "" : "s"}</span>
        <button onClick={() => setEditing(true)} className="text-xs text-zinc-400 hover:text-white shrink-0 transition-colors">Edit</button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">What do you want?</h2>
      <p className="text-zinc-400 text-center mb-6">Tell us in your own words — your plan builds below as we match.</p>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="size-4 text-violet-300" />
          <span className="text-sm font-semibold text-white">Your goal</span>
          <span className="text-[10px] text-zinc-500">— in your own words, any language</span>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors resize-none"
        />

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <button
            onClick={run}
            disabled={busy || !text.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-200 hover:bg-violet-500/30 transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {phase === "loading" ? (pct > 0 ? `Loading model ${pct}%` : "Loading model…") : phase === "matching" ? "Matching…" : matched ? "Re-match" : "Match my goals"}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 ml-auto">
            Achieve by
            <input
              type="date"
              value={date}
              onChange={(e) => onChangeDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
              aria-label="Overall target date"
            />
          </label>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2">Runs locally on your device · no data leaves the browser</p>

        {phase === "error" && <p className="text-xs text-red-300 mt-3">Couldn&apos;t run the matcher: {err}</p>}

        {phase === "done" && matched && (
          <p className="text-xs text-emerald-300/90 mt-3">
            ✓ Matched {matchedAreas.length} area{matchedAreas.length === 1 ? "" : "s"}{matchedAreas.length ? ` (${matchedAreas.join(", ")})` : ""} — your plan is below ↓
          </p>
        )}
      </div>
    </div>
  )
}
