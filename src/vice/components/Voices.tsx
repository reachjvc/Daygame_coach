"use client"

/**
 * Other people's accounts.
 *
 * Two surfaces from one set. `OneVoice` is the acute one — a single account
 * dropped into the ninety seconds of the urge tool, chosen for the moment the
 * person is actually in. `VoicesDialog` is the browsable one.
 *
 * The acute use is the point. "Read other people's accounts at the moment of
 * craving" turns up as a named technique among people recovering from opioid
 * use, and reading other people's stories was the most-valued feature (80.8%)
 * in the one online quitting community with good measured outcomes. It is also
 * the only thing in this module that works on a first visit: every other tool
 * needs the person to have written something first, which is why somebody's
 * first bad night currently gets a bare countdown.
 *
 * Every quote carries its handle and a link out. That is not decoration — an
 * unattributed quote about somebody's drinking is indistinguishable from one a
 * marketing team wrote, and the reader is right to discount it.
 */

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Testimonial, TestimonialStage } from "../data/testimonials"
import { SURVIVORSHIP, TESTIMONIALS, testimonialsFor } from "../data/testimonials"
import { TECHNIQUES } from "../data/techniques"
import { Panel, QuietButton } from "./Ui"

const STAGE_LABELS: Record<TestimonialStage, string> = {
  deciding: "Still deciding",
  early: "The first weeks",
  urge: "During an urge",
  lapse: "After it happened",
  goodStretch: "When it is going well",
  long: "Further out",
}

/** Attribution line. Rendered under every quote, everywhere, without exception. */
function Attribution({ t }: { t: Testimonial }) {
  return (
    <p className="text-[11px] text-zinc-600 mt-1.5 leading-relaxed">
      {t.handle ?? "account since deleted"} · {t.source} · {t.date}
      {" · "}
      <a
        href={t.url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 decoration-white/20 hover:text-zinc-400 transition-colors"
      >
        source
      </a>
    </p>
  )
}

/**
 * One account, for the ninety seconds.
 *
 * Deterministic by `rotate` rather than random: a cue that changes on every
 * render is unreadable, and rotating by episode count means the same sentence
 * does not go stale by March.
 */
export function OneVoice({ stage, viceId, rotate, heading }: {
  stage: TestimonialStage
  viceId: string | null
  rotate: number
  heading?: string
}) {
  const pool = testimonialsFor(stage, viceId)
  if (pool.length === 0) return null
  const t = pool[rotate % pool.length]

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
      <p className="text-[11px] text-zinc-500">{heading ?? "Somebody else, in the same spot"}</p>
      <p className="text-[13.5px] text-zinc-100 mt-1.5 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
      <Attribution t={t} />
    </div>
  )
}

/**
 * What people did, as opposed to what they said.
 *
 * Ordered by how many independent sources name the same move, because that is
 * the only ranking this corpus can honestly support. The count is shown rather
 * than hidden so a reader can discount a one-source idea themselves.
 *
 * Backfires are listed in the same place as the techniques, never filtered
 * into a separate optional section. A list of things that work, with the
 * things that failed tucked away elsewhere, is an advert.
 */
function TechniqueList({ viceId, stage }: { viceId: string | null; stage: TestimonialStage | "all" }) {
  const relevant = TECHNIQUES.filter(
    (t) =>
      (t.vices.length === 0 || viceId === null || t.vices.includes(viceId)) &&
      (stage === "all" || t.stages.includes(stage)),
  ).sort((a, b) => b.recurrence - a.recurrence || a.name.localeCompare(b.name))

  if (relevant.length === 0) {
    return <p className="text-[12.5px] text-zinc-500 leading-relaxed">Nothing catalogued for that combination yet.</p>
  }

  return (
    <ul className="space-y-2.5">
      {relevant.map((t) => (
        <li
          key={t.id}
          className={`rounded-xl border p-3.5 ${
            t.kind === "backfire"
              ? "border-amber-400/25 bg-amber-500/[0.05]"
              : "border-white/10 bg-white/[0.02]"
          }`}
        >
          <div className="flex items-baseline gap-2">
            <p className={`text-[13.5px] font-medium ${t.kind === "backfire" ? "text-amber-100" : "text-zinc-100"}`}>
              {t.name}
            </p>
            <span className="ml-auto shrink-0 text-[10.5px] text-zinc-600 tabular-nums">
              {t.kind === "backfire" ? "reported backfire" : t.recurrence > 1 ? `${t.recurrence} sources` : "1 source"}
            </span>
          </div>
          <p className="text-[12.5px] text-zinc-400 mt-1 leading-relaxed">{t.does}</p>
          {t.quote && (
            <p className="text-[12.5px] text-zinc-300 mt-2 leading-relaxed italic">
              &ldquo;{t.quote}&rdquo;
              {t.quoteUrl && (
                <>
                  {" "}
                  <a
                    href={t.quoteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="not-italic text-[11px] text-zinc-600 underline underline-offset-2 decoration-white/20 hover:text-zinc-400 transition-colors"
                  >
                    source
                  </a>
                </>
              )}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

/** The browsable set, grouped by the moment each account speaks to. */
export function VoicesDialog({ viceId, onClose }: { viceId: string | null; onClose: () => void }) {
  const [stage, setStage] = useState<TestimonialStage | "all">("all")
  const [tab, setTab] = useState<"said" | "did">("said")
  const shown =
    stage === "all"
      ? TESTIMONIALS.filter((t) => t.vices.length === 0 || viceId === null || t.vices.includes(viceId))
      : testimonialsFor(stage, viceId)

  const stages = Object.keys(STAGE_LABELS) as TestimonialStage[]

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">What other people said, and did</DialogTitle>
        </DialogHeader>

        {/* Stated up front rather than buried. A collection like this one is
            tilted by construction and saying so is the only honest option. */}
        <Panel tone="quiet">
          <p className="text-[12px] text-zinc-400 leading-relaxed">{SURVIVORSHIP}</p>
        </Panel>

        <div role="group" aria-label="What to show" className="flex gap-1.5">
          {([["said", `Said (${TESTIMONIALS.length})`], ["did", `Did (${TECHNIQUES.length})`]] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
              className={`text-[12.5px] px-3.5 py-1.5 rounded-lg border transition-colors ${
                tab === id
                  ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                  : "border-white/10 text-zinc-400 hover:border-white/30 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={stage === "all"}
            onClick={() => setStage("all")}
            className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
              stage === "all"
                ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                : "border-white/10 text-zinc-400 hover:border-white/30 hover:text-zinc-200"
            }`}
          >
            All
          </button>
          {stages.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={stage === s}
              onClick={() => setStage(s)}
              className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
                stage === s
                  ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                  : "border-white/10 text-zinc-400 hover:border-white/30 hover:text-zinc-200"
              }`}
            >
              {STAGE_LABELS[s]}
            </button>
          ))}
        </div>

        {tab === "did" ? (
          <TechniqueList viceId={viceId} stage={stage} />
        ) : (
          <>
            <ul className="space-y-2.5 mt-1">
              {shown.map((t) => (
                <li key={t.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                  <p className="text-[13.5px] text-zinc-100 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <Attribution t={t} />
                </li>
              ))}
            </ul>
            {shown.length === 0 && (
              <p className="text-[12.5px] text-zinc-500 leading-relaxed">
                Nothing collected for that moment and that vice yet. The other filters have more.
              </p>
            )}
          </>
        )}

        <p className="text-[11px] text-zinc-600 leading-relaxed">
          Every quote here is verbatim from the link beside it, checked against the raw page rather than a summary.
          Handles are as published; where an account has since been deleted the handle is withheld and the link kept.
        </p>

        <div className="mt-2">
          <QuietButton onClick={onClose}>close</QuietButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
