"use client"

/**
 * The 3-minute vertical, beat by beat.
 *
 * Two views of the same data: the shot list (every line with the visual that
 * runs under exactly that line) and the plain transcript (what a viewer hears).
 * They come from one array, so the two cannot drift apart.
 */

import { useMemo, useState } from "react"

import { CYL_SCRIPT, CYL_SCRIPT_NOTES, type CylScriptBeat } from "@/src/goals/data/changeYourLife"

import { Callout, LabHeader, SectionHeading } from "./shared"

function timecode(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

/** A beat runs until the next one starts; the last is held for a beat. */
function durations(beats: readonly CylScriptBeat[]): number[] {
  return beats.map((b, i) => (i === beats.length - 1 ? 5 : beats[i + 1].at - b.at))
}

export function ShortScript() {
  const [mode, setMode] = useState<"shots" | "transcript">("shots")
  const beats = CYL_SCRIPT
  const spans = useMemo(() => durations(beats), [beats])
  const runtime = beats[beats.length - 1].at + spans[spans.length - 1]

  const sections = useMemo(() => {
    const seen: string[] = []
    for (const b of beats) if (!seen.includes(b.section)) seen.push(b.section)
    return seen
  }, [beats])

  const words = beats.reduce((n, b) => n + (b.line ? b.line.trim().split(/\s+/).length : 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-8">
        <LabHeader
          eyebrow="Script · 9:16 vertical"
          title="You already know what to do"
          blurb="One mechanism, one turn, and an opening frame that is a comment rather than a claim — because in this corpus, resonance tracks recognition and tactical listicles are the worst-performing shape there is."
          backHref="/test/change-your-life"
          backLabel="Back to the research"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 rounded-md border border-border bg-card p-0.5">
              {(["shots", "transcript"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "shots" ? "Shot list" : "Transcript"}
                </button>
              ))}
            </div>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {timecode(runtime)} · {beats.length} beats · {words} spoken words
            </span>
          </div>
        </LabHeader>

        <div className="mb-8 flex flex-wrap gap-1.5">
          {sections.map((s, i) => (
            <span
              key={s}
              className="rounded border border-border bg-card px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
            >
              {String(i + 1).padStart(2, "0")} {s}
            </span>
          ))}
        </div>

        {mode === "transcript" ? (
          <div className="rounded-lg border border-border bg-card p-6">
            <SectionHeading title="What a viewer hears" blurb="No visuals, no timings — the spoken line only." />
            <div className="space-y-4">
              {sections.map((s) => (
                <div key={s}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary">{s}</p>
                  <p className="mt-1.5 text-[17px] leading-relaxed text-foreground">
                    {beats
                      .filter((b) => b.section === s && b.line)
                      .map((b) => b.line)
                      .join(" ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {beats.map((b, i) => {
              const isNewSection = i === 0 || beats[i - 1].section !== b.section
              return (
                <div key={i}>
                  {isNewSection ? (
                    <div className="border-b border-border bg-muted/40 px-4 py-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
                        {b.section}
                      </span>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-[56px_1fr] gap-3 border-b border-border/50 px-4 py-3 last:border-0 md:grid-cols-[56px_1.1fr_1fr]">
                    <div className="pt-0.5">
                      <div className="font-mono text-xs tabular-nums text-foreground">{timecode(b.at)}</div>
                      <div className="font-mono text-[10px] tabular-nums text-muted-foreground">+{spans[i]}s</div>
                    </div>
                    <div>
                      {b.line ? (
                        <p className="text-sm text-foreground">{b.line}</p>
                      ) : (
                        <p className="font-mono text-xs italic text-muted-foreground">[silence]</p>
                      )}
                      {b.onScreen !== undefined && b.onScreen !== "" ? (
                        <p className="mt-1.5 rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground">
                          {b.onScreen}
                        </p>
                      ) : null}
                      {b.source ? (
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">source: {b.source}</p>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground md:border-l md:border-border md:pl-3">{b.visual}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <Callout label="The hook rule">{CYL_SCRIPT_NOTES.hookRule}</Callout>
          <Callout label="One mechanism">{CYL_SCRIPT_NOTES.oneMechanism}</Callout>
          <Callout label="Cutdowns">{CYL_SCRIPT_NOTES.cutdowns}</Callout>
          <Callout label="Do not use" tone="warn">
            {CYL_SCRIPT_NOTES.avoid}
          </Callout>
        </section>

        <p className="mt-6 text-xs text-muted-foreground">{CYL_SCRIPT_NOTES.runtime}</p>
      </div>
    </div>
  )
}
