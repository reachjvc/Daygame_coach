"use client"

/**
 * Free-text goal intake — "come in as you are". The user types what they want in
 * their own words (any language); we embed it IN THE BROWSER with a small
 * multilingual model (transformers.js, $0, no API) and cosine-match it against the
 * pillar/objective taxonomy, then suggest the areas + goals it maps to. The user
 * confirms/deselects and we route them into the flow with those pre-selected.
 *
 * Model + taxonomy embeddings are computed locally and cached (model in the browser
 * Cache API, taxonomy vectors in localStorage), so repeat use is instant and free.
 */

import { useState, useCallback } from "react"
import { buildTaxonomyItems, taxonomyVersion, matchTaxonomy, pickSuggestions, effectivePillarScores } from "@/src/goals/intakeService"
import type { IntakeMatches } from "@/src/goals/intakeService"
import { PILLARS } from "@/src/goals/data/newGoalFramework"
import { Sparkles, Loader2, ArrowRight } from "lucide-react"

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

export function GoalIntake({ onApply }: { onApply: (pillarIds: string[], objectiveIds: string[]) => void }) {
  const [text, setText] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [pct, setPct] = useState(0)
  const [matches, setMatches] = useState<IntakeMatches | null>(null)
  const [selPillars, setSelPillars] = useState<Set<string>>(new Set())
  const [selObjs, setSelObjs] = useState<Set<string>>(new Set())
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
      const s = pickSuggestions(m)
      setMatches(m)
      setSelPillars(new Set(s.pillarIds))
      setSelObjs(new Set(s.objectiveIds))
      setPhase("done")
    } catch (e) {
      console.error("Goal intake failed:", e)
      setErr(e instanceof Error ? e.message : String(e))
      setPhase("error")
    }
  }, [text, ensureTaxonomyVecs])

  const togglePillar = (id: string) => setSelPillars((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleObj = (id: string) => setSelObjs((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const busy = phase === "loading" || phase === "matching"
  const topPillars = matches ? effectivePillarScores(matches).slice(0, 5) : []
  const suggestedObjs = matches ? matches.objectives.filter((o) => selPillars.has(o.pillarId)).slice(0, 8) : []

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="size-4 text-violet-300" />
        <span className="text-sm font-semibold text-white">Just tell us what you want</span>
        <span className="text-[10px] text-zinc-500">— in your own words, any language</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors resize-none"
      />

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={run}
          disabled={busy || !text.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-200 hover:bg-violet-500/30 transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {phase === "loading" ? (pct > 0 ? `Loading model ${pct}%` : "Loading model…") : phase === "matching" ? "Matching…" : "Match my goals"}
        </button>
        <span className="text-[10px] text-zinc-600">Runs locally on your device · no data leaves the browser</span>
      </div>

      {phase === "error" && (
        <p className="text-xs text-red-300 mt-3">Couldn&apos;t run the matcher: {err}</p>
      )}

      {phase === "done" && matches && (
        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs text-zinc-400 mb-2">This sounds like it&apos;s about — tap to keep/drop:</p>
            <div className="flex flex-wrap gap-2">
              {topPillars.map((p) => {
                const pillar = PILLARS.find((x) => x.id === p.id)
                const on = selPillars.has(p.id)
                const color = pillar?.color ?? "#a1a1aa"
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePillar(p.id)}
                    className="text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5"
                    style={on
                      ? { borderColor: color, backgroundColor: color + "22", color }
                      : { borderColor: "rgba(255,255,255,0.1)", color: "#71717a" }}
                  >
                    {pillar?.label ?? p.label}
                    <span className="opacity-50">{Math.round(p.score * 100)}%</span>
                  </button>
                )
              })}
            </div>
          </div>

          {suggestedObjs.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 mb-2">Goals that fit:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedObjs.map((o) => {
                  const on = selObjs.has(o.id)
                  return (
                    <button
                      key={o.id}
                      onClick={() => toggleObj(o.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${on ? "bg-white/10 border-white/30 text-white" : "bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300"}`}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => onApply([...selPillars], [...selObjs])}
            disabled={selPillars.size === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 transition-all text-sm font-semibold disabled:opacity-40"
          >
            Use these <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
