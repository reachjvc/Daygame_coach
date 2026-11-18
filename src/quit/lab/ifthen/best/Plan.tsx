"use client"

import { useState } from "react"
import { EVIDENCE } from "./evidence"
import { buildSentence, hasNegation, isDue, movePair, reviewCounts, type Pair, type Settings } from "./logic"
import { EvidenceLine, Nudge } from "./Parts"
import { bestText as t } from "./text"

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""))
const fmtDate = (key: string) => new Date(`${key}T00:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
const btn = "inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-sm"

interface PlanProps {
  addiction: string
  all: Pair[]
  setAll: (next: Pair[]) => void
  settings: Settings
  setSettings: (next: Settings) => void
  today: string
  onAdd: () => void
}

function Scale({ id, label, value, onPick }: { id: string; label: string; value: string; onPick: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-1">
      <span className="text-sm">{label}</span>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            data-testid={`${id}-${n}`}
            onClick={() => onPick(value === n ? "" : n)}
            className={`inline-flex min-h-11 items-center justify-center rounded-md border text-base tabular-nums ${value === n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function Card({ pair, index, count, due, answer, onChange, onMove, onRemove, onAnswer, addiction, openEdit }: {
  pair: Pair
  index: number
  count: number
  due: boolean
  answer: "kept" | "change" | undefined
  onChange: (then: string) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onAnswer: (a: "kept" | "change") => void
  addiction: string
  openEdit: boolean
}) {
  const [editing, setEditing] = useState(openEdit)
  return (
    <li data-testid={`card-${index}`} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <p data-testid={`card-text-${index}`} className="text-lg">
        {buildSentence(pair.situation, pair.custom, pair.then)}
      </p>
      {editing && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            {t.editLabel}
            <input
              data-testid={`card-input-${index}`}
              value={pair.then}
              maxLength={160}
              onChange={(e) => onChange(e.target.value)}
              className="min-h-11 rounded-md border border-border bg-background px-3 text-base"
            />
          </label>
          {hasNegation(pair.then) && <Nudge addiction={addiction} testId={`card-nudge-${index}`} negation={EVIDENCE.negation} />}
        </div>
      )}
      {due && (
        <div role="group" aria-label={t.dueTitle} className="flex gap-2">
          {(["kept", "change"] as const).map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={answer === a}
              data-testid={`${a}-${index}`}
              onClick={() => {
                onAnswer(a)
                if (a === "change") setEditing(true)
              }}
              className={`${btn} flex-1 ${answer === a ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}
            >
              {a === "kept" ? t.kept : t.change}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid={`card-edit-${index}`} aria-expanded={editing} onClick={() => setEditing(!editing)} className={btn}>
          {editing ? t.editDone : t.edit}
        </button>
        <button type="button" data-testid={`card-up-${index}`} aria-label={t.up} disabled={index === 0} onClick={() => onMove(-1)} className={`${btn} w-11 disabled:opacity-40`}>
          {"↑"}
        </button>
        <button type="button" data-testid={`card-down-${index}`} aria-label={t.down} disabled={index === count - 1} onClick={() => onMove(1)} className={`${btn} w-11 disabled:opacity-40`}>
          {"↓"}
        </button>
        <button type="button" data-testid={`card-remove-${index}`} onClick={onRemove} className={btn}>
          {t.remove}
        </button>
      </div>
    </li>
  )
}

/** The plan: cards, importance and confidence, check-in date, "Did these work?", the SOS line and the print view. */
export function PlanScreen({ addiction, all, setAll, settings, setSettings, today, onAdd }: PlanProps) {
  const [printing, setPrinting] = useState(false)
  const mine = all.filter((p) => p.addiction === addiction)
  const due = isDue(settings.checkin, today) && mine.length > 0
  const counts = reviewCounts(mine, settings.reviews)
  const patch = (p: Partial<Settings>) => setSettings({ ...settings, ...p })

  if (printing) return <PrintView addiction={addiction} pairs={mine} settings={settings} onClose={() => setPrinting(false)} />

  return (
    <section data-testid="step-plan" className="flex flex-col gap-4">
      <header>
        <h2 className="text-xl font-semibold">{t.planTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.planLine}</p>
      </header>

      {due && (
        <div data-testid="due-banner" className="rounded-lg border border-primary bg-card p-3">
          <h3 className="text-base font-semibold">{t.dueTitle}</h3>
          <p className="text-sm text-muted-foreground">{t.dueLine}</p>
          <p data-testid="due-summary" className="mt-1 text-sm">
            {fill(t.dueSummary, counts)}
          </p>
          {counts.open === 0 && (
            <button type="button" data-testid="due-new" onClick={() => patch({ checkin: "", reviews: {} })} className={`${btn} mt-2`}>
              {t.dueNew}
            </button>
          )}
        </div>
      )}

      {mine.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.planEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {mine.map((p, i) => (
            <Card
              key={p.id}
              pair={p}
              index={i}
              count={mine.length}
              due={due}
              answer={settings.reviews[p.id]}
              addiction={addiction}
              openEdit={false}
              onChange={(then) => setAll(all.map((q) => (q.id === p.id ? { ...q, then, own: true, swapId: null } : q)))}
              onMove={(dir) => setAll(movePair(all, p.id, dir))}
              onRemove={() => setAll(all.filter((q) => q.id !== p.id))}
              onAnswer={(a) => patch({ reviews: { ...settings.reviews, [p.id]: a } })}
            />
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="add-more" onClick={onAdd} className={btn}>
          {t.addMore}
        </button>
        {mine.length > 0 && (
          <button type="button" data-testid="print-open" onClick={() => setPrinting(true)} className={btn}>
            {t.printOpen}
          </button>
        )}
      </div>

      {mine.length > 0 && (
        <>
          <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
            <h3 className="text-base font-semibold">{t.scaleTitle}</h3>
            <Scale id="imp" label={t.importance} value={settings.importance} onPick={(v) => patch({ importance: v })} />
            <Scale id="conf" label={t.confidence} value={settings.confidence} onPick={(v) => patch({ confidence: v })} />
          </section>

          <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
            <h3 className="text-base font-semibold">{t.checkinTitle}</h3>
            <p className="text-sm text-muted-foreground">{t.checkinLine}</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                data-testid="checkin-date"
                aria-label={t.checkinTitle}
                value={settings.checkin}
                onChange={(e) => patch({ checkin: e.target.value, reviews: {} })}
                className="min-h-11 rounded-md border border-border bg-background px-3 text-base"
              />
              <button type="button" data-testid="checkin-today" disabled={!today} onClick={() => patch({ checkin: today, reviews: {} })} className={btn}>
                {t.checkinToday}
              </button>
              <button type="button" data-testid="checkin-clear" onClick={() => patch({ checkin: "", reviews: {} })} className={btn}>
                {t.checkinClear}
              </button>
            </div>
            {settings.checkin && (
              <p data-testid="checkin-shown" className="text-sm">
                {fmtDate(settings.checkin)}
              </p>
            )}
            <p className="text-sm text-muted-foreground">{t.planNote}</p>
          </section>

          <section className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
            <button
              type="button"
              role="switch"
              aria-checked={settings.sos}
              data-testid="sos-toggle"
              onClick={() => patch({ sos: !settings.sos })}
              className="flex min-h-11 items-center justify-between gap-3 text-left text-base"
            >
              <span>{t.sosToggle}</span>
              <span className={`rounded-full border px-3 py-0.5 text-sm ${settings.sos ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{settings.sos ? t.usedInOn : t.usedInOff}</span>
            </button>
            <p data-testid="used-in" className="text-sm text-muted-foreground">
              {t.usedIn}. {t.usedInLine}
            </p>
          </section>

          <EvidenceLine ev={EVIDENCE.paper} addiction={addiction} testId="ev-paper" />
        </>
      )}
    </section>
  )
}

/** Plain cards for paper or a photo; everything else is hidden when printing. */
function PrintView({ addiction, pairs, settings, onClose }: { addiction: string; pairs: Pair[]; settings: Settings; onClose: () => void }) {
  return (
    <section data-testid="print-view" data-print-root className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-foreground print:border-0 print:bg-white print:text-black">
      <style>{"@media print{body *{visibility:hidden}[data-print-root],[data-print-root] *{visibility:visible}[data-print-root]{position:absolute;left:0;top:0;width:100%}[data-no-print]{display:none}}"}</style>
      <h2 className="text-xl font-semibold">{t.printTitle}</h2>
      <p className="text-sm text-muted-foreground print:text-neutral-700">{t.addictions[addiction] ?? addiction}</p>
      <ol className="flex flex-col gap-3">
        {pairs.map((p, i) => (
          <li key={p.id} data-testid={`print-card-${i}`} className="rounded-md border border-border p-3 text-lg print:border-neutral-400">
            {buildSentence(p.situation, p.custom, p.then)}
          </li>
        ))}
      </ol>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-base">
        <dt className="font-semibold">{t.printImportance}</dt>
        <dd>{settings.importance ? `${settings.importance} / 10` : t.printNone}</dd>
        <dt className="font-semibold">{t.printConfidence}</dt>
        <dd>{settings.confidence ? `${settings.confidence} / 10` : t.printNone}</dd>
        <dt className="font-semibold">{t.printCheckin}</dt>
        <dd>{settings.checkin ? fmtDate(settings.checkin) : t.printNone}</dd>
      </dl>
      <p className="text-sm text-muted-foreground print:text-neutral-700">{t.printNote}</p>
      <button type="button" data-testid="print-close" data-no-print onClick={onClose} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-sm">
        {t.printClose}
      </button>
    </section>
  )
}
