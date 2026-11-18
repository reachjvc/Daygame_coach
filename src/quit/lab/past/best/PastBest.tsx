"use client"

import { useEffect, useState } from "react"
import { getAddiction } from "../../../data"
import { Chips } from "../../../components/kit"
import { usable } from "../../../tools/common"
import type { QuitAddictionId, QuitEnding, QuitOption } from "../../../types"
import type { LabProps } from "../../registry"
import { useLabState } from "../../store"
import { ExampleBar } from "../../progress/shared/Bits"
import {
  LEN_UNITS,
  avgShare,
  averageDays,
  bars,
  barShares,
  dangerWindow,
  daysText,
  emptyTry,
  endingCounts,
  exampleTries,
  handoffOf,
  hasContent,
  helpedCounts,
  longestRun,
  topRepeated,
  tryDays,
  usesRoughUnits,
  type Handoff,
  type LenUnit,
  type Option,
  type Try,
} from "./logic"
import { bestText as t } from "./text"

const SWITCH_IDS = ["nicotine", "alcohol", "weed", "porn"] as const satisfies readonly QuitAddictionId[]
const section = "flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
const field = "min-h-11 rounded-md border border-border bg-background px-2 text-base"
const ghost = "inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-4 text-sm"
const uid = () => Math.random().toString(36).slice(2, 10)
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const whenText = (w: string) => {
  const [y, m] = w.split("-")
  return y && m ? `${MONTHS[Number(m) - 1] ?? m} ${y}` : ""
}

/** Improved Past attempts: a list of tries, the pattern with counts, a lengths chart, handoffs to other tools. */
export function PastBest({ addiction: initial }: LabProps) {
  const [chosen, setChosen] = useLabState<string>("past", "best", "addiction", initial)
  const id: QuitAddictionId = (SWITCH_IDS as readonly string[]).includes(chosen) ? (chosen as QuitAddictionId) : "nicotine"
  const data = getAddiction(id)
  const endings = (usable<QuitEnding[]>(data?.endings) ?? []).map((e): Option => ({ id: e.id, label: e.label }))
  const helped = (usable<QuitOption[]>(data?.helped) ?? []).map((h): Option => ({ id: h.id, label: h.label }))
  return (
    <div data-testid="past-best" className="flex flex-col gap-4">
      <div role="radiogroup" aria-label={t.addictionLabel} className="flex flex-wrap gap-2">
        {SWITCH_IDS.map((x) => (
          <button
            key={x}
            type="button"
            role="radio"
            aria-checked={id === x}
            data-testid={`switch-${x}`}
            onClick={() => setChosen(x)}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${id === x ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {t.addictions[x]}
          </button>
        ))}
      </div>
      <Gate key={id} id={id} endings={endings} helped={helped} />
    </div>
  )
}

function Gate({ id, endings, helped }: { id: string; endings: Option[]; helped: Option[] }) {
  const [tries, setTries] = useLabState<Try[]>("past", "best", `${id}/tries`, [])
  const [example, setExample] = useLabState<boolean>("past", "best", `${id}/example`, true)
  const [, setHEndings] = useLabState<unknown>("past", "best", "handoff-endings", null)
  const [, setHWindow] = useLabState<unknown>("past", "best", "handoff-window", null)
  const [, setHHelped] = useLabState<unknown>("past", "best", "handoff-helped", null)
  const [form, setForm] = useState<Try | "new" | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const shown = example ? exampleTries(endings.length > 0 && helped.length > 0) : tries
  const handoff: Handoff = handoffOf(shown, endings, helped)
  const handoffKey = JSON.stringify(handoff)
  useEffect(() => {
    if (!mounted || example) return
    setHEndings({ addiction: id, items: handoff.endings })
    setHWindow(handoff.window ? { addiction: id, ...handoff.window } : null)
    setHHelped({ addiction: id, items: handoff.helped })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, example, handoffKey, id])
  if (!mounted) return null

  const clearExample = () => {
    setExample(false)
    setTries([])
  }
  const save = (x: Try) => {
    const base = example ? [] : tries
    if (example) setExample(false)
    setTries(base.some((o) => o.id === x.id) ? base.map((o) => (o.id === x.id ? x : o)) : [...base, x])
    setForm(null)
  }
  const remove = (tid: string) => {
    if (example) return
    setTries(tries.filter((o) => o.id !== tid))
    setConfirm(null)
  }

  if (form) {
    return <Form key={form === "new" ? "new" : form.id} initial={form === "new" ? emptyTry(uid()) : form} endings={endings} helped={helped} onSave={save} onCancel={() => setForm(null)} />
  }

  const list = shown
  const hasHandoff = handoff.endings.length > 0 || handoff.window !== null || handoff.helped.length > 0
  return (
    <>
      {example && <ExampleBar onClear={clearExample} />}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
      <button type="button" data-testid="add-try" onClick={() => setForm("new")} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground">
        {t.add}
      </button>
      <Pattern tries={list} endings={endings} helped={helped} hasHandoff={hasHandoff && !example} />
      <Chart tries={list} />
      <section data-testid="try-list" className={section}>
        <h3 className="text-base font-semibold">{t.listTitle}</h3>
        {list.length === 0 && <p className="text-sm text-muted-foreground">{t.empty}</p>}
        <ol className="flex flex-col gap-2">
          {list.map((x, i) => (
            <li key={x.id} data-testid={`try-${i}`} className="flex flex-col gap-1 rounded-md border border-border p-2">
              <p className="text-sm font-semibold">
                {t.tryLabel(i + 1)}
                {x.when && <span className="font-normal text-muted-foreground">{` · ${whenText(x.when)}`}</span>}
              </p>
              <p className="text-sm" data-testid={`try-${i}-len`}>
                {tryDays(x) !== null ? `${x.len} ${t.lenUnits[x.unit]}` : t.noLength}
              </p>
              <TryLines x={x} endings={endings} helped={helped} />
              {!example && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" data-testid={`try-${i}-edit`} onClick={() => setForm(x)} className={ghost}>
                    {t.edit}
                  </button>
                  {confirm === x.id ? (
                    <>
                      <button type="button" data-testid={`try-${i}-confirm`} onClick={() => remove(x.id)} className={`${ghost} border-primary`}>
                        {t.removeConfirm}
                      </button>
                      <button type="button" onClick={() => setConfirm(null)} className={ghost}>
                        {t.keep}
                      </button>
                    </>
                  ) : (
                    <button type="button" data-testid={`try-${i}-delete`} onClick={() => setConfirm(x.id)} className={ghost}>
                      {t.remove}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>
      <p className="text-xs text-muted-foreground">{t.labTag}</p>
    </>
  )
}

function TryLines({ x, endings, helped }: { x: Try; endings: Option[]; helped: Option[] }) {
  const lab = (ids: string[], opts: Option[], text: string) => [...ids.map((i) => opts.find((o) => o.id === i)?.label ?? i), ...(text.trim() ? [text.trim()] : [])]
  const how = x.how.map((i) => t.hows.find((h) => h.id === i)?.label ?? i)
  const rows: [string, string[]][] = [
    [t.howLabel, how],
    [t.endedLabel, lab(x.ended, endings, x.endedText)],
    [t.helpedLabel, lab(x.helped, helped, x.helpedText)],
  ]
  return (
    <>
      {rows
        .filter(([, v]) => v.length > 0)
        .map(([k, v]) => (
          <p key={k} className="text-sm text-muted-foreground">
            {`${k}: ${v.join(", ")}`}
          </p>
        ))}
    </>
  )
}

function Pattern({ tries, endings, helped, hasHandoff }: { tries: Try[]; endings: Option[]; helped: Option[]; hasHandoff: boolean }) {
  const longest = longestRun(tries)
  const e = endingCounts(tries, endings)
  const h = helpedCounts(tries, helped)
  const w = dangerWindow(tries)
  const topE = topRepeated(e.items)
  const topH = topRepeated(h.items)
  const [why, setWhy] = useState(false)
  const empty = !longest && e.items.length === 0 && h.items.length === 0
  return (
    <section data-testid="pattern" className={section}>
      <h3 className="text-base font-semibold">{t.patternTitle}</h3>
      {empty && <p className="text-sm text-muted-foreground">{t.patternNone}</p>}
      {longest && (
        <p data-testid="pattern-longest" className="text-sm">
          {t.longest(daysText(longest.days), longest.of)}
        </p>
      )}
      {topE ? (
        <p data-testid="pattern-ending" className="text-sm">
          {t.commonEnding(topE.labels, topE.count, e.triesNaming)}
        </p>
      ) : (
        e.triesNaming >= 2 && (
          <p data-testid="pattern-ending" className="text-sm">
            {t.noRepeatEnding}
          </p>
        )
      )}
      {topH && (
        <p data-testid="pattern-helped" className="text-sm">
          {t.commonHelped(topH.labels, topH.count, h.triesNaming)}
        </p>
      )}
      {w ? (
        <div className="flex flex-col">
          <p data-testid="pattern-window" className="text-sm font-medium">
            {t.windowLine(w.from, w.to, w.count, w.of)}
          </p>
          <button type="button" data-testid="window-how" aria-expanded={why} onClick={() => setWhy(!why)} className="inline-flex min-h-11 items-center self-start text-sm text-primary underline">
            {t.windowHow}
          </button>
          {why && <p data-testid="window-why" className="text-xs text-muted-foreground">{t.windowWhy}</p>}
        </div>
      ) : (
        longest && <p className="text-sm text-muted-foreground">{t.windowNeed}</p>
      )}
      {usesRoughUnits(tries) && <p className="text-xs text-muted-foreground">{t.roughNote}</p>}
      {hasHandoff && (
        <div data-testid="used-in" className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
          <p className="text-sm">{t.usedIn}</p>
          <p className="text-xs text-muted-foreground">{t.usedInNote}</p>
        </div>
      )}
    </section>
  )
}

function Chart({ tries }: { tries: Try[] }) {
  const list = bars(tries)
  if (list.length === 0) return null
  const shares = barShares(list)
  const avg = averageDays(tries) ?? 0
  return (
    <section data-testid="chart" className={section}>
      <h3 className="text-base font-semibold">{t.chartTitle}</h3>
      <p data-testid="chart-avg" className="text-xs text-muted-foreground">
        {`${t.avg(daysText(Math.round(avg * 10) / 10))} · ${t.chartBasis(list.length)}`}
      </p>
      <div className="overflow-x-auto">
        <div className="relative flex h-40 items-end" style={{ minWidth: list.length * 44 }} data-count={list.length}>
          <div aria-hidden="true" data-testid="avg-line" className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground" style={{ bottom: `${(avgShare(list) ?? 0) * 98}%` }} />
          {list.map((b, k) => (
            <div key={b.id} role="img" data-testid={`bar-${k}`} aria-label={t.barLabel(k + 1, daysText(b.days))} className="flex h-full w-11 shrink-0 flex-col items-center justify-end">
              <span className="text-[10px] text-muted-foreground">{b.days}</span>
              <span className="block w-6 rounded-t bg-primary" style={{ height: `${Math.max(2, shares[k] * 90)}%` }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Form({ initial, endings, helped, onSave, onCancel }: { initial: Try; endings: Option[]; helped: Option[]; onSave: (x: Try) => void; onCancel: () => void }) {
  const [x, setX] = useState<Try>(initial)
  const [len, setLen] = useState(initial.len === null ? "" : String(initial.len))
  const set = (p: Partial<Try>) => setX((o) => ({ ...o, ...p }))
  const n = Number(len)
  const out: Try = { ...x, len: len.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null }
  const ok = hasContent(out)
  return (
    <div data-testid="try-form" className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{initial.when || initial.len !== null || hasContent(initial) ? t.formEdit : t.formNew}</h2>
      <label className="flex flex-col gap-1 text-sm">
        {t.whenLabel}
        <input type="month" data-testid="f-when" value={x.when} onChange={(e) => set({ when: e.target.value })} className={field} />
      </label>
      <div className="flex flex-col gap-1 text-sm">
        <span>{t.lenLabel}</span>
        <div className="flex gap-2">
          <input type="number" inputMode="decimal" min="0" data-testid="f-len" aria-label={t.lenNumber} value={len} onChange={(e) => setLen(e.target.value)} className={`${field} w-28`} />
          <select data-testid="f-unit" aria-label={t.unitLabel} value={x.unit} onChange={(e) => set({ unit: e.target.value as LenUnit })} className={`${field} flex-1`}>
            {LEN_UNITS.map((u) => (
              <option key={u} value={u}>
                {t.lenUnits[u]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div data-testid="f-how" className="flex flex-col gap-1 text-sm">
        <span>{t.howLabel}</span>
        <Chips options={[...t.hows]} value={x.how} onChange={(how) => set({ how })} max={t.hows.length} label={t.howLabel} />
      </div>
      <div data-testid="f-ended" className="flex flex-col gap-2 text-sm">
        <span>{t.endedLabel}</span>
        {endings.length > 0 ? <Chips options={endings} value={x.ended} onChange={(ended) => set({ ended })} max={endings.length} label={t.endedLabel} /> : <p data-testid="chips-coming" className="text-xs text-muted-foreground">{t.chipsComing}</p>}
        <input type="text" data-testid="f-ended-text" aria-label={t.endedText} placeholder={t.endedText} value={x.endedText} onChange={(e) => set({ endedText: e.target.value })} className={field} />
      </div>
      <div data-testid="f-helped" className="flex flex-col gap-2 text-sm">
        <span>{t.helpedLabel}</span>
        {helped.length > 0 && <Chips options={helped} value={x.helped} onChange={(h) => set({ helped: h })} max={helped.length} label={t.helpedLabel} />}
        <input type="text" data-testid="f-helped-text" aria-label={t.helpedText} placeholder={t.helpedText} value={x.helpedText} onChange={(e) => set({ helpedText: e.target.value })} className={field} />
      </div>
      {!ok && <p className="text-xs text-muted-foreground">{t.needOne}</p>}
      <div className="flex gap-2">
        <button type="button" data-testid="f-save" disabled={!ok} onClick={() => onSave(out)} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground disabled:opacity-40">
          {t.save}
        </button>
        <button type="button" data-testid="f-cancel" onClick={onCancel} className={ghost}>
          {t.cancel}
        </button>
      </div>
    </div>
  )
}
