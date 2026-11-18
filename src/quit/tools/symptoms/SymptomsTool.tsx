"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { EvidenceChip, SourceTap, SourcesFold } from "../../components/kit"
import { count } from "../../count"
import { fill, tooltext as t } from "../../tooltext"
import type { QuitSymptomCourse, QuitSymptomHelp, ToolProps } from "../../types"
import { realRefs, uniqueRefs, usable } from "../common"
import { NotReady } from "../NotReady"
import { helpFor, listable, symptomLabel } from "./logic"

const FALLBACK_WORDS: Record<string, string> = { "cue-craving": t.symptoms.cueCraving }

/** Symptom guide: when each one is worst, when it eases, what helps. Timing from studies. */
export function SymptomsTool({ addiction, data }: ToolProps) {
  const course = usable<QuitSymptomCourse[]>(data.symptomCourse)
  const help = usable<QuitSymptomHelp[]>(data.symptomHelp)
  const words = usable<Record<string, string>>(data.symptomWords)
  const rows = course ? listable(course) : []
  if (rows.length === 0 || !words) return <NotReady />
  return <Inner addiction={addiction} rows={rows} help={help ?? []} words={words} note={usable<string>(data.symptomCourseNote) ?? ""} />
}

interface InnerProps {
  addiction: string
  rows: QuitSymptomCourse[]
  help: QuitSymptomHelp[]
  words: Record<string, string>
  note: string
}

function Inner({ addiction, rows, help, words, note }: InnerProps) {
  const sp = useSearchParams()
  const key = sp.get("symptom")
  const row = rows.find((r) => r.symptom === key) ?? null
  const pushed = useRef(false)
  const sent = useRef(false)

  useEffect(() => {
    if (!row) return
    if (!sent.current) {
      sent.current = true
      count(addiction, "symptoms", "start")
    }
    count(addiction, "symptoms", "done")
  }, [addiction, row])

  const open = (symptom: string) => {
    const p = new URLSearchParams(window.location.search)
    p.set("symptom", symptom)
    window.history.pushState(null, "", `${window.location.pathname}?${p.toString()}`)
    pushed.current = true
  }
  const close = () => {
    if (pushed.current) {
      window.history.back()
      return
    }
    const p = new URLSearchParams(window.location.search)
    p.delete("symptom")
    const q = p.toString()
    window.history.replaceState(null, "", q ? `${window.location.pathname}?${q}` : window.location.pathname)
  }

  const label = (k: string) => symptomLabel(k, words, FALLBACK_WORDS)

  if (!row) {
    return (
      <>
        <p className="text-muted-foreground">{t.symptoms.intro}</p>
        <ul data-testid="symptom-list" className="mt-3 flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.symptom}>
              <button
                type="button"
                data-testid={`symptom-${r.symptom}`}
                onClick={() => open(r.symptom)}
                className="flex min-h-12 w-full items-center rounded-lg border border-border bg-card px-4 text-left text-base"
              >
                {label(r.symptom)}
              </button>
            </li>
          ))}
        </ul>
        {note && <p className="mt-6 text-sm text-muted-foreground">{note}</p>}
        <SourcesFold refs={uniqueRefs(rows.flatMap((r) => realRefs(r.refs)))} />
      </>
    )
  }

  // The four-rule sleep card below answers sleep, so the single help row for it stays hidden.
  const rowHelp = row.symptom === "sleep" ? [] : helpFor(row.symptom, help)
  const refs = uniqueRefs([...realRefs(row.refs), ...rowHelp.flatMap((h) => realRefs(h.refs))])
  return (
    <div data-testid="symptom-detail" className="flex flex-col gap-4">
      <button type="button" data-testid="symptom-back" onClick={close} className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline">
        {t.symptoms.backToList}
      </button>
      <h2 className="text-xl font-semibold">{label(row.symptom)}</h2>
      <section className="rounded-lg border border-border bg-card p-4">
        <p data-testid="symptom-worst" className="font-medium">
          {fill(t.symptoms.worst, { peak: row.peak ?? t.symptoms.noPeak })}
        </p>
        <p data-testid="symptom-eases" className="mt-1 font-medium">
          {fill(t.symptoms.eases, { lasts: row.lasts })}
        </p>
        <div className="mt-2">
          <EvidenceChip evidence={row.evidence} />
        </div>
        <SourceTap refs={realRefs(row.refs)} />
      </section>
      {rowHelp.length > 0 && (
        <section>
          <h3 className="text-sm text-muted-foreground">{t.symptoms.helpHeading}</h3>
          <ul className="mt-2 flex flex-col gap-3">
            {rowHelp.map((h) => (
              <li key={h.text} data-testid="symptom-help" className="rounded-lg border border-border bg-card p-3">
                <p className="text-base">{h.text}</p>
                <div className="mt-1">
                  <EvidenceChip evidence={h.evidence} />
                </div>
                <SourceTap refs={realRefs(h.refs)} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {row.symptom === "sleep" && (
        <section data-testid="sleep-rules" className="rounded-lg border border-primary p-4">
          <h3 className="font-medium">{t.symptoms.sleepHeading}</h3>
          <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5">
            {t.symptoms.sleepRules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </section>
      )}
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      <SourcesFold refs={refs} />
    </div>
  )
}
