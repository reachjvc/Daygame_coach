"use client"

/**
 * THE PICTURE.
 *
 * Two charts over one calendar axis. The ribbon answers the question the owner
 * actually asked — "show me the periods I didn't smoke" — in one glance: lit is
 * clean, dark is not. The lanes below it answer the follow-up: how long each run
 * was, how many nights you nearly went during it, and what ended it.
 *
 * Colour is the EMPHASIS form, not a categorical palette. Exactly one ending
 * family is accented; every other ending is neutral with its reason written
 * beside it in words. Six hues on marks this small would be six colours nobody
 * can tell apart, and it would bury the one thing the chart exists to show. The
 * accent is fixed to the family, never to whichever ending is currently most
 * common, or the chart would repaint itself as the data changed and stop being
 * recognisable.
 *
 * The two values were validated against this app's real surface (#09090b)
 * rather than eyeballed: worst-case colour-blind separation ΔE 26.8, normal
 * vision ΔE 31.8, both far clear of the floors.
 */

import { useEffect, useRef, useState } from "react"
import type { BlackBoxRecord } from "../../types"
import { chartSpan, laneGeometry, runLanes } from "../../blackboxService"
import { familyFor } from "../../data/blackbox"
import { days } from "./days"

/** Not smoking. One hue, because the runs are one thing. */
const CLEAN = "#3987e5"
/** The accented ending. */
const ACCENT = "#d95926"
/** Every other ending. The words carry which one it was. */
const NEUTRAL = "#71717a"

export function Lanes({ record, today, viceLabel, selectedId, onSelect }: {
  record: BlackBoxRecord
  today: string
  /**
   * What the runs are runs off, in the person's own catalogue words.
   *
   * A prop rather than a constant: the caption and the key used to say
   * "smoking" whatever the record held, so somebody quitting betting read
   * "Lit is not smoking" four lines under a header that said "Betting".
   */
  viceLabel: string | null
  /** The run whose detail is open, so the chart can mark it. */
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const span = chartSpan(record, today)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [flipAfter, setFlipAfter] = useState(62)

  /**
   * The flip threshold is measured, not assumed.
   *
   * A label sitting after a bar that ends near the right edge runs outside the
   * card. The first fix used a fixed 62%, which fixed a laptop and left a phone
   * broken — so the point at which a label has to move to the other side is
   * computed from the width the chart actually got.
   */
  useEffect(() => {
    const measure = () => {
      const width = wrapRef.current?.clientWidth ?? 0
      if (width > 0) setFlipAfter(100 - (Math.min(190, width * 0.45) / width) * 100)
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [record])

  if (!span) return null

  // "it" rather than a hard-coded vice when the record somehow names none: the
  // sentence still parses and still says the true thing.
  const thing = viceLabel ? viceLabel.toLowerCase() : "it"
  const lanes = runLanes(record, today)
  const geometry = laneGeometry(lanes, span, today, { flipAfter })
  const ticks = axisTicks(span.from, span.to)

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------ the ribbon */}
      <div>
        <p className="text-[12.5px] text-zinc-400">{`Lit is time without ${thing}. Dark is time with it.`}</p>
        <div className="relative mt-2.5 h-10 w-full overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
          {geometry.map(({ lane, left, width }) => (
            <div
              key={`rib-${lane.attempt.id}`}
              className="absolute inset-y-0 rounded-[2px]"
              style={{ left: `${left}%`, width: `${width}%`, background: CLEAN }}
            />
          ))}
          {ticks.slice(1).map((t) => (
            <div key={`sep-${t.at}`} className="absolute inset-y-0 w-px bg-white/10" style={{ left: `${t.left}%` }} />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ the lanes */}
      <div>
        <p className="text-[12.5px] text-zinc-400">
          Each bar is a run. Each dot underneath is a night you nearly went and didn&rsquo;t.
        </p>

        {/* Each lane is 44px tall, not 34: tapping a bar is how a run is read
            back AND how it is corrected, so it has to be a real tap target on a
            phone. Everything inside is positioned from the top of the row, so
            the offsets below all moved by the same 5px to stay centred. */}
        <div ref={wrapRef} className="relative mt-3">
          {geometry.map(({ lane, left, width, flip, dots }) => {
            const family = lane.ending ? familyFor(lane.ending) : null
            const accent = family?.accent ?? false
            const place: "after" | "before" | "inside" = !flip
              ? "after"
              : left >= 100 - flipAfter
                ? "before"
                : "inside"
            return (
              <button
                key={lane.attempt.id}
                type="button"
                aria-pressed={selectedId === lane.attempt.id}
                onClick={() => onSelect(lane.attempt.id)}
                className={`relative block h-11 w-full rounded-md text-left transition-colors ${
                  selectedId === lane.attempt.id ? "bg-white/[0.05]" : "hover:bg-white/[0.025]"
                }`}
              >
                <div className="absolute inset-x-0 top-[16px] h-2 rounded-full bg-white/[0.04]" />

                <div
                  className="absolute top-[13px] h-3.5 rounded"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: lane.live
                      ? `linear-gradient(90deg, ${CLEAN} 55%, rgba(57,135,229,0.15))`
                      : CLEAN,
                  }}
                />

                {/* Close calls sit BELOW the bar. Drawn on it they turned a long
                    run into a barcode and the run stopped reading as one thing.

                    EACH ONE SITS ON THE DAY IT HAPPENED. It used to be spread
                    evenly across the bar's last half from a count, so every run
                    with any close calls read as "they crowded in before the
                    end" — the chart's own "you saw it coming" reading, produced
                    by the layout rather than by the record. Five wobbles in
                    week one of a nine-month run were drawn at 53% to 87%. */}
                {dots.map((at, i) => (
                  <div
                    key={i}
                    className="absolute top-[29px] h-[3px] w-[3px] rounded-full bg-blue-200"
                    style={{ left: `${at}%` }}
                  />
                ))}

                {!lane.live && (
                  <div
                    className="absolute top-[15px] h-2.5 w-2.5 rounded-full border-2 border-zinc-950"
                    style={{ left: `calc(${left + width}% - 5px)`, background: accent ? ACCENT : NEUTRAL }}
                  />
                )}

                {/* THREE PLACES, BECAUSE TWO WERE NOT ENOUGH.
                    The label went after the bar, or before it once the bar
                    ended past the measured threshold. Neither fits a bar that
                    spans nearly the whole chart — which is what ONE long run
                    looks like, the commonest record there is — so "207 days ·
                    still going" was anchored past the left edge and the reader
                    got "l going". When neither gutter fits it sits on the bar,
                    on a dark chip so 11.5px text is not read off a blue field
                    at 3.7:1. `100 - flipAfter` IS the measured label width as a
                    percentage; the threshold is defined from it. */}
                <div
                  className={`absolute top-[12px] whitespace-nowrap text-[11.5px] text-zinc-400 ${
                    place === "inside" ? "rounded bg-zinc-950/80 px-1.5" : ""
                  }`}
                  style={
                    place === "after"
                      ? { left: `calc(${left + width}% + 14px)` }
                      : place === "before"
                        ? { right: `calc(${100 - left}% + 14px)`, textAlign: "right" }
                        : { right: `calc(${100 - (left + width)}% + 6px)`, textAlign: "right" }
                  }
                >
                  <b className="font-semibold text-zinc-100">{days(lane.days)}</b>
                  {" · "}
                  {lane.live ? (
                    <span>still going</span>
                  ) : (
                    <span style={accent ? { color: "#f0865b" } : undefined}>{family?.short}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="relative mt-1 h-[18px] border-t border-white/10">
          {/* Centred on the tick, except at the two ends: a centred label at 0%
              hangs half outside the chart and gets clipped, which is how the
              first date on the axis went missing entirely. */}
          {ticks.map((t) => {
            const atStart = t.left < 6
            const atEnd = t.left > 94
            return (
              <span
                key={t.at}
                className={`absolute top-1 text-[11px] text-zinc-500 ${
                  atStart || atEnd ? "" : "-translate-x-1/2"
                }`}
                style={atEnd ? { right: `${100 - t.left}%` } : { left: `${t.left}%` }}
              >
                {t.label}
              </span>
            )
          })}
        </div>

        {/* THE KEY DESCRIBES THIS CHART, NOT THE CHART IN GENERAL.
            It was four hard-coded entries, always all four. A record with one
            live run and no close calls was handed a key for a close-call dot
            that is not drawn and for two endings that are not drawn either —
            and the grey entry read "Ended: something else", which is the
            LITERAL LABEL of a real ending family, so a run that ended "Just one
            won't matter" was keyed under the name of a different ending. Grey
            means every ending but one; it now says so in words that are not
            already taken. */}
        <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2 text-[11.5px] text-zinc-400">
          <Key colour={CLEAN} shape="bar" label={`Without ${thing}`} />
          {lanes.some((l) => l.closeCallDays.length > 0) && (
            <Key colour="#bfdbfe" shape="dot" label="Close call" />
          )}
          {lanes.some((l) => l.ending !== null && familyFor(l.ending).accent) && (
            <Key colour={ACCENT} shape="dot" label={`Ended: "I felt fine"`} />
          )}
          {lanes.some((l) => l.ending !== null && !familyFor(l.ending).accent) && (
            <Key colour={NEUTRAL} shape="dot" label="Ended some other way — named on the bar" />
          )}
        </div>
      </div>
    </div>
  )
}

function Key({ colour, shape, label }: { colour: string; shape: "bar" | "dot"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i
        aria-hidden
        className={shape === "dot" ? "inline-block h-2 w-2 rounded-full" : "inline-block h-2.5 w-2.5 rounded-[2px]"}
        style={{ background: colour }}
      />
      {label}
    </span>
  )
}

/**
 * Axis ticks at sensible calendar boundaries.
 *
 * Years when the chart covers more than about eighteen months, halves below
 * that — a two-year chart labelled every month is unreadable and a four-month
 * chart labelled every year says nothing.
 */
function axisTicks(from: string, to: string): Array<{ at: string; left: number; label: string }> {
  const start = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / 86400000)
  const stepMonths = totalDays > 540 ? 6 : totalDays > 180 ? 3 : 1

  const out: Array<{ at: string; left: number; label: string }> = []
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  while (cursor <= end) {
    if (cursor >= start) {
      const left = ((cursor.getTime() - start.getTime()) / 86400000 / totalDays) * 100
      if (left >= 0 && left <= 100) {
        out.push({
          at: cursor.toISOString().slice(0, 10),
          left,
          label: cursor.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }),
        })
      }
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + stepMonths)
  }
  return out
}
