"use client"

import { useEffect, useState } from "react"
import { getAddiction } from "../../../data"
import { EvidenceChip, PrimaryButton, SourceTap, SourcesFold } from "../../../components/kit"
import { tooltext } from "../../../tooltext"
import { realRefs, uniqueRefs, usable } from "../../../tools/common"
import { listable, symptomLabel } from "../../../tools/symptoms/logic"
import type { QuitAddictionId, QuitSymptomCourse } from "../../../types"
import type { LabProps } from "../../registry"
import { ExampleBar } from "../../progress/shared/Bits"
import { dayKey, keyToMs } from "../../progress/shared/calc"
import { labStore, useLabState } from "../../store"
import { seedStart, type TimelineSetup } from "../shared/logic"
import { BAND_DAYS, bandFor, type Band } from "./bands"
import { dayNumber, dayPosition, pastEndCount, phaseOf, span, weeks } from "./logic"
import { bestText as t } from "./text"

const SWITCH_IDS = ["nicotine", "alcohol", "weed", "porn"] as const satisfies readonly QuitAddictionId[]
const FALLBACK_WORDS: Record<string, string> = { "cue-craving": tooltext.symptoms.cueCraving }

const ContentComing = () => (
  <p data-testid="content-coming" className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
    {t.contentComing}
  </p>
)

/** Improved Health timeline: withdrawal ranges from studies, his day on them, a six-week strip. */
export function TimelineBest({ addiction: initial }: LabProps) {
  const [chosen, setChosen] = useLabState<string>("timeline", "best", "addiction", initial)
  const id: QuitAddictionId = (SWITCH_IDS as readonly string[]).includes(chosen) ? (chosen as QuitAddictionId) : "nicotine"
  const data = getAddiction(id)
  const course = usable<QuitSymptomCourse[]>(data?.symptomCourse)
  const rows = course ? listable(course) : []
  const words = usable<Record<string, string>>(data?.symptomWords) ?? {}
  const note = usable<string>(data?.symptomCourseNote) ?? ""
  return (
    <div data-testid="timeline-best" className="flex flex-col gap-4">
      <Switcher value={id} onChange={setChosen} />
      {rows.length === 0 ? (
        <ContentComing />
      ) : (
        <Gate>{(setup, now) => <Body id={id} rows={rows} words={words} note={note} setup={setup} now={now} />}</Gate>
      )}
    </div>
  )
}

function Switcher({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label={t.addictionLabel} className="flex flex-wrap gap-2">
      {SWITCH_IDS.map((x) => (
        <button
          key={x}
          type="button"
          role="radio"
          aria-checked={value === x}
          data-testid={`switch-${x}`}
          onClick={() => onChange(x)}
          className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${value === x ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
        >
          {t.addictions[x]}
        </button>
      ))}
    </div>
  )
}

/** Quit date set once (or example data); the children get it and the current time. */
function Gate({ children }: { children: (setup: TimelineSetup, now: number) => React.ReactNode }) {
  const [setup, setSetup] = useLabState<TimelineSetup | null>("timeline", "best", "setup", null)
  const [mounted, setMounted] = useState(false)
  const [own, setOwn] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  if (!mounted) return null
  const clear = () => {
    labStore().set("timeline", "best", "setup", undefined)
    setSetup(null)
    setOwn(null)
  }
  if (setup) {
    return (
      <>
        {setup.seeded === 1 && <ExampleBar onClear={clear} />}
        {children(setup, now)}
        <button type="button" data-testid="start-over" onClick={clear} className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline">
          {t.change}
        </button>
      </>
    )
  }
  if (own !== null) {
    return (
      <section data-testid="setup-own" className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.setupTitle}</h2>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>{t.dateLabel}</span>
          <input type="date" data-testid="setup-startMs" value={dayKey(own)} onChange={(e) => e.target.value && setOwn(keyToMs(e.target.value))} className="min-h-11 rounded-md border border-border bg-background px-2" />
        </label>
        <PrimaryButton testId="setup-save" onClick={() => setSetup({ startMs: own, seeded: 0 })}>
          {t.save}
        </PrimaryButton>
      </section>
    )
  }
  return (
    <section data-testid="setup-choice" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t.setupTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.setupLine}</p>
      <PrimaryButton testId="setup-seed" onClick={() => setSetup({ startMs: seedStart(Date.now()), seeded: 1 })}>
        {t.seedBtn}
      </PrimaryButton>
      <button type="button" data-testid="setup-own-btn" onClick={() => setOwn(Date.now())} className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-base">
        {t.ownBtn}
      </button>
    </section>
  )
}

interface BodyProps {
  id: string
  rows: QuitSymptomCourse[]
  words: Record<string, string>
  note: string
  setup: TimelineSetup
  now: number
}

function Body({ id, rows, words, note, setup, now }: BodyProps) {
  const day = dayNumber(setup.startMs, now)
  const bands = rows.map((r) => bandFor(id, r.symptom)).filter((b): b is Band => b !== null)
  const { past, total } = pastEndCount(bands, day)
  const ahead = day < 1
  return (
    <>
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.line}</p>
      </header>
      <section data-testid="best-header" className="rounded-lg border border-border bg-card p-4">
        {ahead ? (
          <p data-testid="best-ahead" className="text-base font-medium">
            {t.aheadLine(1 - day)}
          </p>
        ) : (
          <>
            <p className="flex items-baseline gap-2">
              <span className="text-sm text-muted-foreground">{t.dayLabel}</span>
              <span data-testid="best-day" className="text-4xl font-semibold tabular-nums">
                {day}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">{t.dayLine}</p>
            {total > 0 && (
              <>
                <p data-testid="best-count" data-past={past} data-total={total} className="mt-3 text-base">
                  {t.count(past, total)}
                </p>
                <p className="text-sm text-muted-foreground">{t.countNote}</p>
              </>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">{t.listTitle}</h3>
        <Legend />
        <ul data-testid="symptom-cards" className="flex flex-col gap-3">
          {rows.map((r) => (
            <Card key={r.symptom} id={id} row={r} label={symptomLabel(r.symptom, words, FALLBACK_WORDS)} day={day} />
          ))}
        </ul>
        {note && (
          <p data-testid="course-note" className="text-sm text-muted-foreground">
            {note}
          </p>
        )}
      </section>

      <Strip day={day} />

      <section data-testid="recovery" className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t.recoveryTitle}</h3>
        <p data-testid="recovery-coming" className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          {t.recoveryComing}
        </p>
      </section>

      <SourcesFold refs={uniqueRefs(rows.flatMap((r) => realRefs(r.refs)))} />
    </>
  )
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-3 w-5 rounded-sm bg-primary" />
        {t.legendPeak}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-3 w-5 rounded-sm border border-dashed border-primary bg-primary/30" />
        {t.legendGone}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-3 w-5 rounded-sm bg-primary/70" style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 4px, rgba(0,0,0,0.25) 4px 6px)" }} />
        {t.legendTested}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-4 w-0.5 bg-foreground" />
        {t.legendDay}
      </li>
    </ul>
  )
}

function Card({ id, row, label, day }: { id: string; row: QuitSymptomCourse; label: string; day: number }) {
  const band = bandFor(id, row.symptom)
  const refs = realRefs(row.refs)
  return (
    <li data-testid={`card-${row.symptom}`} className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-base font-semibold">{label}</h4>
        <EvidenceChip evidence={row.evidence} />
      </div>
      {band ? <BandView symptom={row.symptom} band={band} day={day} /> : <p className="mt-2 text-sm text-muted-foreground">{t.noBand}</p>}
      <p className="mt-2 text-base">{row.text}</p>
      <SourceTap refs={refs} />
    </li>
  )
}

function BandView({ symptom, band, day }: { symptom: string; band: Band; day: number }) {
  const phase = phaseOf(band, day)
  const peak = band.peak ? span(band.peak[0], band.peak[1]) : null
  const gone = band.gone ? span(band.gone[0], band.gone[1]) : null
  const open = band.openFrom !== null && band.openFrom < BAND_DAYS ? span(band.openFrom + 1, BAND_DAYS) : null
  const tested = band.tested ? span(band.tested[0], band.tested[1]) : null
  return (
    <div className="mt-3" data-testid={`band-${symptom}`} data-phase={phase}>
      <div className="relative h-8 rounded-md bg-muted" role="img" aria-label={t.bandLabel}>
        {gone && (
          <div
            data-testid={`band-gone-${symptom}`}
            className="absolute inset-y-1 rounded-sm border border-dashed border-primary bg-primary/40"
            style={{ left: `${gone.left}%`, width: `${gone.width}%`, maskImage: "linear-gradient(to right, black, transparent)", WebkitMaskImage: "linear-gradient(to right, black, transparent)" }}
          />
        )}
        {peak && <div data-testid={`band-peak-${symptom}`} className="absolute inset-y-1 rounded-sm bg-primary" style={{ left: `${peak.left}%`, width: `${peak.width}%` }} />}
        {tested && (
          <div
            data-testid={`band-tested-${symptom}`}
            className="absolute inset-y-1 rounded-sm bg-primary/70"
            style={{ left: `${tested.left}%`, width: `${tested.width}%`, backgroundImage: "repeating-linear-gradient(135deg, transparent 0 4px, rgba(0,0,0,0.25) 4px 6px)" }}
          />
        )}
        {open && (
          <div
            data-testid={`band-open-${symptom}`}
            className="absolute inset-y-1 rounded-sm border border-dashed border-primary bg-primary/60"
            style={{ left: `${open.left}%`, width: `${open.width}%`, maskImage: "linear-gradient(to right, black, black 60%, transparent)", WebkitMaskImage: "linear-gradient(to right, black, black 60%, transparent)" }}
          />
        )}
        {day >= 1 && (
          <div data-testid={`marker-${symptom}`} data-day={day} aria-label={t.markerLabel(day)} className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground" style={{ left: `${dayPosition(day)}%` }} />
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{t.axisStart}</span>
        <span>{t.axisEnd}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {band.peak ? t.peakLine(band.peak[0], band.peak[1]) : t.noPeak}{" "}
        {band.gone && (band.diaryNoChange ? t.goneLineReview(band.gone[0], band.gone[1]) : band.moodScore ? t.goneLineMood(band.gone[0], band.gone[1]) : t.goneLine(band.gone[0], band.gone[1]))}
        {band.diaryNoChange && ` ${t.diaryNoChange}`}
        {band.openFrom !== null && t.openLine(band.openFrom)}
      </p>
      <p data-testid={`phase-${symptom}`} className="mt-1 text-sm">
        {day >= 1 && `${t.youAre(day)} `}
        {t.phase[phase]}
      </p>
    </div>
  )
}

function Strip({ day }: { day: number }) {
  return (
    <section data-testid="strip" className="flex flex-col gap-2">
      <h3 className="text-base font-semibold">{t.stripTitle}</h3>
      <p className="text-sm text-muted-foreground">{t.stripLine}</p>
      <div className="flex flex-col gap-1">
        {weeks().map((wk, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">{t.week(i + 1)}</span>
            <div className="grid min-w-0 flex-1 grid-cols-7 gap-1">
              {wk.map((n) => {
                const mine = n === day
                const peak = i === 0
                return (
                  <span
                    key={n}
                    data-testid={`strip-day-${n}`}
                    data-peak={peak}
                    data-today={mine}
                    aria-label={t.stripDay(n)}
                    aria-current={mine ? "date" : undefined}
                    className={`flex h-10 items-center justify-center rounded-md border text-sm tabular-nums ${mine ? "border-foreground bg-foreground text-background font-semibold" : peak ? "border-primary bg-primary/30" : "border-border bg-card text-muted-foreground"}`}
                  >
                    {n}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
