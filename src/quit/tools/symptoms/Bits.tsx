"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { EvidenceChip, SourceTap } from "../../components/kit"
import { tooltext as tt } from "../../tooltext"
import type { Evidence, QuitRef } from "../../types"
import { BAND_DAYS, type Band } from "./bands"
import { CRAVING_MARK_DAYS, cravingPosition, dayPosition, span } from "./bandMath"
import type { Basis } from "./content"
import { symptomsText as t } from "./text"

const ROWS = ["who", "n", "design", "where", "when", "caveat"] as const

/** One basis as a small who / how many / design / where / when / caveat list; rows that are empty are left out. */
export function BasisDl({ basis, label }: { basis: Partial<Basis>; label?: string }) {
  return (
    <div>
      {label && <p className="font-medium">{label}</p>}
      <dl className="flex flex-col gap-1">
        {ROWS.filter((k) => basis[k]).map((k) => (
          <div key={k}>
            <dt className="text-muted-foreground">{tt.common.basis[k]}</dt>
            <dd className="break-words">{basis[k]}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export interface BasisPart {
  label?: string
  basis: Partial<Basis>
}

/** "Based on": a fold with the basis (one or more parts), how well tested, and the sources one tap away. */
export function BasedOn({ parts, refs, evidence, testId }: { parts: BasisPart[]; refs: QuitRef[]; evidence?: Evidence; testId: string }) {
  return (
    <details data-testid={testId} className="mt-1 text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium">{tt.common.basedOn}</summary>
      <div className="flex flex-col gap-3 pb-1">
        {evidence && (
          <div>
            <EvidenceChip evidence={evidence} />
          </div>
        )}
        {parts.map((p, i) => (
          <BasisDl key={i} basis={p.basis} label={p.label} />
        ))}
        <SourceTap refs={refs} />
      </div>
    </details>
  )
}

/** "What helps": folded; open from the start on a phone for the card his day is in. */
export function HelpFold({ testId, startOpen, children }: { testId: string; startOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (startOpen && window.matchMedia("(max-width: 767px)").matches) setOpen(true)
  }, [startOpen])
  return (
    <details data-testid={testId} open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)} className="mt-1 text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium">{t.whatHelps}</summary>
      <div className="flex flex-col gap-3 pb-1">{children}</div>
    </details>
  )
}

/** A link to a tool that is live, else the same words as plain text. */
export function ToolLink({ href, live, testId, children }: { href: string; live: boolean; testId: string; children: React.ReactNode }) {
  if (!live) return <span data-testid={testId}>{children}</span>
  return (
    <Link href={href} data-testid={testId} className="inline-flex min-h-11 items-center text-primary underline">
      {children}
    </Link>
  )
}

export function NowPill({ id }: { id: string }) {
  return (
    <span data-testid={`now-${id}`} className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
      {t.now}
    </span>
  )
}

const FADE = { maskImage: "linear-gradient(to right, black, transparent)", WebkitMaskImage: "linear-gradient(to right, black, transparent)" }
const HATCH = { backgroundImage: "repeating-linear-gradient(135deg, transparent 0 4px, rgba(0,0,0,0.25) 4px 6px)" }

/** The 42-day band of one card. His day is a marker; the open end of the cue band is a flat dashed bar, not a fade. */
export function BandView({ id, band, day, caption }: { id: string; band: Band; day: number | null; caption: string }) {
  const peak = band.peak ? span(band.peak[0], band.peak[1]) : null
  const gone = band.gone ? span(band.gone[0], band.gone[1]) : null
  const open = band.openFrom !== null && band.openFrom < BAND_DAYS ? span(band.openFrom + 1, BAND_DAYS) : null
  const tested = band.tested ? span(band.tested[0], band.tested[1]) : null
  return (
    <div className="mt-3" data-testid={`band-${id}`}>
      <div className="relative h-8 rounded-md bg-muted" role="img" aria-label={t.bandLabel}>
        {gone && <div data-testid={`band-gone-${id}`} className="absolute inset-y-1 rounded-sm border border-dashed border-primary bg-primary/40" style={{ left: `${gone.left}%`, width: `${gone.width}%`, ...FADE }} />}
        {peak && <div data-testid={`band-peak-${id}`} className="absolute inset-y-1 rounded-sm bg-primary" style={{ left: `${peak.left}%`, width: `${peak.width}%` }} />}
        {tested && <div data-testid={`band-tested-${id}`} className="absolute inset-y-1 rounded-sm bg-primary/70" style={{ left: `${tested.left}%`, width: `${tested.width}%`, ...HATCH }} />}
        {open && <div data-testid={`band-open-${id}`} className="absolute inset-y-1 rounded-sm border border-dashed border-primary bg-primary/20" style={{ left: `${open.left}%`, width: `${open.width}%` }} />}
        {day !== null && <div data-testid={`marker-${id}`} data-day={day} aria-label={t.markerLabel(day)} className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground" style={{ left: `${dayPosition(day)}%` }} />}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{t.axisStart}</span>
        <span>{t.axisEnd}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
    </div>
  )
}

/** The cravings card's own time line: weeks and months, not the 42-day axis. */
export function CravingLine({ day }: { day: number | null }) {
  return (
    <div className="mt-3" data-testid="timeline-craving">
      <div className="relative h-8 rounded-md bg-muted" role="img" aria-label={t.cravingLineLabel}>
        <div className="absolute inset-y-1 left-0 rounded-l-sm bg-primary" style={{ width: "37.5%" }} />
        <div className="absolute inset-y-1 rounded-none bg-primary/60" style={{ left: "37.5%", width: "25%" }} />
        <div className="absolute inset-y-1 rounded-r-sm bg-primary/30" style={{ left: "62.5%", width: "37.5%" }} />
        {day !== null && <div data-testid="marker-craving" data-day={day} aria-label={t.markerLabel(day)} className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground" style={{ left: `${cravingPosition(day)}%` }} />}
      </div>
      <ol className="mt-1 grid grid-cols-4 gap-1 text-xs">
        {t.cravingMarks.map((m, i) => (
          <li key={m.at} data-testid={`craving-mark-${i}`} data-reached={day !== null && day >= CRAVING_MARK_DAYS[i]} className="min-w-0 break-words">
            <span className="block font-medium">{m.at}</span>
            <span className="text-muted-foreground">{m.line}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-3 w-5 rounded-sm bg-primary" />
        {t.legendPeak}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-3 w-5 rounded-sm border border-dashed border-primary bg-primary/40" style={FADE} />
        {t.legendFade}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-3 w-5 rounded-sm bg-primary/70" style={HATCH} />
        {t.legendTested}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-3 w-5 rounded-sm border border-dashed border-primary bg-primary/20" />
        {t.legendOpen}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-4 w-0.5 bg-foreground" />
        {t.legendDay}
      </li>
    </ul>
  )
}
