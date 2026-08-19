"use client"

/**
 * The one button on this page that leaves the browser.
 *
 * Everything else here is deterministic — the 10 split on punctuation, a day
 * read with a regex, a number turned into rungs. That is the right default, and
 * it has one hard limit: it can only ever rearrange what somebody already
 * typed. This is for the case the whole screen exists to serve, where they have
 * a paragraph and cannot see the goals in it.
 *
 * What comes back arrives UNTICKED, exactly like the other doors' candidates,
 * with one line saying what in their own text it came from. Nothing enters the
 * plan without a tick.
 *
 * IT SAYS SO BEFORE IT SENDS. The rest of the page runs on localStorage and
 * calls nothing, so "this sends what you wrote to Anthropic" is a genuine change
 * in what the page does, and it belongs on the button rather than in a privacy
 * policy nobody opens.
 */

import { useEffect, useState } from "react"
import { Check, Sparkles, Square } from "lucide-react"
import type { NsPlan } from "@/src/goals/types"
import { GENERATE_COPY } from "@/src/goals/data/northStarStart"
import type { Generated } from "@/src/goals/northStarGenerateService"

export interface GenerateHandlers {
  onAddDump: (areaId: string, text: string) => void
  onAddExperiences: (text: string, areaId: string | null) => void
}

export function GeneratePanel({
  plan,
  text,
  areaId,
  areaLabel,
  ten,
  mode,
  label,
  handlers,
}: {
  plan: NsPlan
  /** What they wrote, whichever door this is sitting in. */
  text: string
  /** The area anything generated lands in, when the door is scoped to one. */
  areaId: string | null
  areaLabel?: string
  ten?: string
  /** `actions` asks what to DO about a 10, which is written as a state. */
  mode?: "candidates" | "actions"
  label?: string
  handlers: GenerateHandlers
}) {
  const [state, setState] = useState<"idle" | "running" | "failed">("idle")
  const [result, setResult] = useState<Generated | null>(null)
  /** What actually went wrong, shown rather than swallowed. */
  const [reason, setReason] = useState<string | null>(null)
  /**
   * Seconds on the clock while it runs.
   *
   * The call goes through the Claude CLI and takes half a minute on a real
   * plan. A button that says "Reading your notes…" for that long with nothing
   * moving is indistinguishable from a button that is broken — which is exactly
   * what got reported: "it just doesn't work at all, doesn't give me any
   * output".
   */
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (state !== "running") return
    setElapsed(0)
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [state])
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const enough = text.trim().length >= 30

  const toggle = (key: string) =>
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const run = async () => {
    setState("running")
    setResult(null)
    setPicked(new Set())
    try {
      const response = await fetch("/api/test/north-star-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          text,
          area: areaLabel,
          ten,
          // So it cannot hand back what is already there. Titles only — the
          // whys, the dates and the ratings are none of its business.
          existing: [...plan.goals.map((g) => g.title), ...plan.experiences.map((e) => e.title)],
        }),
      })
      if (!response.ok) {
        // Carry the server's reason to the surface. A failure a person cannot
        // read is a failure they can only respond to by pressing again.
        const body = await response.json().catch(() => null)
        throw new Error(body?.reason || body?.error || `HTTP ${response.status}`)
      }
      setResult(await response.json())
      setState("idle")
    } catch (error) {
      setReason(error instanceof Error ? error.message : String(error))
      setState("failed")
    }
  }

  const add = () => {
    if (!result) return
    const goals = result.goals.filter((g) => picked.has(`g:${g.title}`)).map((g) => g.title)
    const experiences = result.experiences.filter((e) => picked.has(`x:${e.title}`)).map((e) => e.title)
    /**
     * BOTH KINDS LAND IN THE AREA, as goals.
     *
     * The second list used to be written to `plan.experiences`, which had its
     * own surface — "Things to experience" — and that surface is gone: the step
     * is called Experiences now and its box asks for exactly this. So ticking
     * one was a write into a store nothing reads, which is worse than not
     * offering it. A trip or a night you want to have had is a one-off, and the
     * builder already has a shape for that.
     */
    const lines = [...goals, ...experiences]
    if (lines.length > 0 && areaId) handlers.onAddDump(areaId, lines.join("\n"))
    setPicked(new Set())
  }

  const rows: Array<{ key: string; title: string; because: string; kind: "goal" | "experience" }> = [
    ...(result?.goals ?? []).map((g) => ({ key: `g:${g.title}`, title: g.title, because: g.because, kind: "goal" as const })),
    ...(result?.experiences ?? []).map((e) => ({ key: `x:${e.title}`, title: e.title, because: e.because, kind: "experience" as const })),
  ]

  return (
    <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/[0.04] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={run}
          disabled={!enough || state === "running"}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Sparkles className="size-3.5" />
          {state === "running" ? `${GENERATE_COPY.running}${elapsed > 2 ? ` ${elapsed}s` : ""}` : label ?? GENERATE_COPY.button}
        </button>
        <span className="text-[10.5px] text-zinc-500 min-w-0 flex-1 leading-relaxed">
          {!enough ? GENERATE_COPY.needMore : GENERATE_COPY.sends}
        </span>
      </div>

      {state === "failed" && (
        <p className="text-[11px] text-amber-200/80 mt-2 leading-relaxed">
          {GENERATE_COPY.failed}
          {reason && <span className="block text-zinc-500 mt-0.5">{reason}</span>}
        </p>
      )}

      {result && rows.length === 0 && <p className="text-[11.5px] text-zinc-500 mt-2">{GENERATE_COPY.nothing}</p>}

      {rows.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600 mt-3">{GENERATE_COPY.picked}</p>
          <ul className="mt-1.5 space-y-1">
            {rows.map((row) => {
              const on = picked.has(row.key)
              return (
                <li key={row.key}>
                  <button
                    onClick={() => toggle(row.key)}
                    aria-pressed={on}
                    className={`w-full flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                      on ? "border-violet-400/40 bg-violet-500/10" : "border-white/[0.07] bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    {on ? (
                      <span className="size-3.5 shrink-0 mt-0.5 rounded-[3px] bg-violet-500/30 border border-violet-400/50 inline-flex items-center justify-center">
                        <Check className="size-2.5 text-violet-100" />
                      </span>
                    ) : (
                      <Square className="size-3.5 shrink-0 mt-0.5 text-zinc-700" />
                    )}
                    <span className="min-w-0">
                      <span className={`block text-[12.5px] leading-snug ${on ? "text-white" : "text-zinc-300"}`}>
                        {row.title}
                        <span className="text-[10px] text-zinc-600 ml-1.5">
                          {row.kind === "goal" ? GENERATE_COPY.asGoal : GENERATE_COPY.asExperience}
                        </span>
                      </span>
                      {/* What in their own writing it came from. Without this the
                          list is an oracle, and an oracle is not something you
                          can disagree with. */}
                      <span className="block text-[10.5px] text-zinc-500 mt-0.5 leading-relaxed">{row.because}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center gap-3 mt-2.5">
            <span className="text-[11px] text-zinc-600">
              {picked.size === 0 ? GENERATE_COPY.none : `${picked.size} ticked`}
            </span>
            <button
              onClick={add}
              disabled={picked.size === 0}
              className="ml-auto text-[12px] font-medium px-3 py-1 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {GENERATE_COPY.add}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
