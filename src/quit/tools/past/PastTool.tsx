"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Chips, CountedLine, SourceTap } from "../../components/kit"
import { isLiveTool } from "../../menu"
import { todayIso } from "../../record"
import type { QuitBelief, QuitEnding, QuitNumber, QuitOption, ToolProps } from "../../types"
import { uniqueRefs, usable } from "../common"
import { useCarry, useDoneCount, useStartCount, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import { BasisBox } from "../date/Bits"
import {
  AFTER_SLIP,
  COUNTS,
  EMPTY_PAST,
  LEN_UNITS,
  MAX_FREE,
  MAX_LEN,
  WINDOW_MIN,
  avgShare,
  averageDays,
  bars,
  barShares,
  barText,
  dangerWindow,
  emptyTry,
  endingCounts,
  exampleTries,
  hasContent,
  helpedCounts,
  lengthText,
  longestRun,
  monthAllowed,
  monthLong,
  monthOf,
  monthShort,
  newestFirst,
  parseLength,
  parsePast,
  showsMore,
  topRepeated,
  triesBehind,
  tryDays,
  usesRoughUnits,
  FIRST_MONTH,
  type AfterSlip,
  type Count,
  type LenUnit,
  type Option,
  type PastState,
  type Try,
} from "./logic"
import { pastText as t } from "./text"

const section = "flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
const field = "min-h-11 min-w-0 rounded-md border border-border bg-background px-2 text-base"
const ghost = "inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-4 text-sm"
const wrap = "[overflow-wrap:anywhere]"
const uid = () => Math.random().toString(36).slice(2, 10)

/** Your past attempts: tries before this quit, the pattern in them, and what to do with it. */
export function PastTool({ addiction, data }: ToolProps) {
  const endings = usable<QuitEnding[]>(data.endings)
  const helped = usable<QuitOption[]>(data.helped)
  if (!endings || !helped) return <NotReady />
  const beliefs = usable<QuitBelief[]>(data.beliefs) ?? []
  const numbers = usable<QuitNumber[]>(data.numbers) ?? []
  return (
    <Inner
      addiction={addiction}
      endings={endings.map((e): Option => ({ id: e.id, label: e.label }))}
      helped={helped.map((h): Option => ({ id: h.id, label: h.label }))}
      belief={beliefs.find((b) => b.id === "b4") ?? null}
      number={numbers.find((n) => n.kind === "how-tries") ?? null}
    />
  )
}

interface InnerProps {
  addiction: string
  endings: Option[]
  helped: Option[]
  belief: QuitBelief | null
  number: QuitNumber | null
}

interface Removed {
  at: number
  x: Try
}

function Inner({ addiction, endings, helped, belief, number }: InnerProps) {
  const carry = useCarry()
  const pathname = usePathname()
  const sp = useSearchParams()
  const { state, update } = useToolState<PastState>(addiction, "past", EMPTY_PAST, parsePast)
  const started = useStartCount(addiction, "past")
  useDoneCount(addiction, "past", state !== null)
  const [example, setExample] = useState<PastState | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [removed, setRemoved] = useState<Removed | null>(null)
  const [today] = useState(() => todayIso())
  // True when the open form was put on the history stack in this visit, so Back is a real step back.
  const pushed = useRef(false)
  const lastMove = useRef(0)

  const formParam = sp.get("try")
  const view = example ?? state
  const hrefWith = useCallback(
    (tryId: string | null) => {
      const p = new URLSearchParams(sp.toString())
      if (tryId === null) p.delete("try")
      else p.set("try", tryId)
      const q = p.toString()
      return q ? `${pathname}?${q}` : pathname
    },
    [sp, pathname],
  )
  const openForm = (id: string) => {
    const now = Date.now()
    if (now - lastMove.current < 250) return
    lastMove.current = now
    pushed.current = true
    window.history.pushState(null, "", hrefWith(id))
  }
  const closeForm = () => {
    if (pushed.current) {
      pushed.current = false
      window.history.back()
    } else window.history.replaceState(null, "", hrefWith(null))
  }

  const formTry = state && formParam ? (formParam === "new" ? "new" : (state.tries.find((x) => x.id === formParam) ?? null)) : null
  useEffect(() => {
    if (formParam !== null) window.scrollTo(0, 0)
  }, [formParam])
  // An address naming a try that is not there shows the page.
  useEffect(() => {
    if (state && formParam && formParam !== "new" && formTry === null) window.history.replaceState(null, "", hrefWith(null))
  }, [state, formParam, formTry, hrefWith])

  if (!state || !view) return null

  const shown = example ? example.tries : state.tries
  const inExample = example !== null
  const setCount = (count: Count | null) => {
    if (inExample) setExample({ ...example, count })
    else {
      started()
      update((s) => ({ ...s, count }))
    }
  }
  const setSlip = (afterSlip: AfterSlip | null) => {
    if (inExample) setExample({ ...example, afterSlip })
    else {
      started()
      update((s) => ({ ...s, afterSlip }))
    }
  }
  const save = (x: Try) => {
    started()
    update((s) => ({ ...s, tries: s.tries.some((o) => o.id === x.id) ? s.tries.map((o) => (o.id === x.id ? x : o)) : [...s.tries, x] }))
    setRemoved(null)
    closeForm()
  }
  const remove = (id: string) => {
    const at = state.tries.findIndex((x) => x.id === id)
    if (at === -1) return
    setRemoved({ at, x: state.tries[at] })
    setConfirm(null)
    update((s) => ({ ...s, tries: s.tries.filter((x) => x.id !== id) }))
  }
  const undo = () => {
    if (!removed) return
    const r = removed
    setRemoved(null)
    update((s) => (s.tries.some((x) => x.id === r.x.id) ? s : { ...s, tries: [...s.tries.slice(0, r.at), r.x, ...s.tries.slice(r.at)] }))
  }

  if (formTry !== null) {
    return <Form key={formTry === "new" ? "new" : formTry.id} initial={formTry === "new" ? emptyTry(uid()) : formTry} endings={endings} helped={helped} today={today} onSave={save} onCancel={closeForm} />
  }

  const never = view.count === "never" && shown.length === 0
  const more = showsMore(view.count, shown.length)
  return (
    <div data-testid="past-page" className="flex w-full flex-col gap-4">
      {inExample && (
        <div data-testid="example-bar" className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
          <span>{t.exampleLabel}</span>
          <button type="button" data-testid="example-clear" onClick={() => setExample(null)} className="inline-flex min-h-11 items-center underline">
            {t.leaveExample}
          </button>
        </div>
      )}
      <p className="text-sm text-muted-foreground">{t.intro}</p>

      <section data-testid="count" className="flex flex-col gap-2">
        <p className="font-medium">{t.countQuestion}</p>
        <Chips
          label={t.countQuestion}
          options={COUNTS.map((id) => ({ id, label: t.counts[id] }))}
          value={view.count ? [view.count] : []}
          onChange={([id]) => setCount(view.count === id ? null : (id as Count))}
        />
        <p className="text-xs text-muted-foreground">{t.countNote}</p>
        {never && (
          <p data-testid="no-tries" className="text-sm">
            {isLiveTool("date") ? (
              <>
                {t.noTriesPre}
                <Link href={carry(`/quit/${addiction}/date`)} className="text-primary underline">
                  {t.noTriesName}
                </Link>
                {t.noTriesPost}
              </>
            ) : (
              `${t.noTriesPre}${t.noTriesName}${t.noTriesPost}`
            )}
          </p>
        )}
      </section>

      {!inExample && (
        <div className="flex flex-col gap-2">
          <button type="button" data-testid="add-try" onClick={() => openForm("new")} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground">
            {t.add}
          </button>
          {shown.length === 0 && (
            <button
              type="button"
              data-testid="see-example"
              onClick={() => setExample({ v: 2, count: "4-9", tries: exampleTries(today), afterSlip: null })}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-base"
            >
              {t.seeExample}
            </button>
          )}
        </div>
      )}

      <Pattern tries={shown} endings={endings} helped={helped} />

      {more && <AfterSlipBlock addiction={addiction} value={view.afterSlip} onChange={setSlip} belief={belief} carry={carry} />}
      {more && <ManyTries count={view.count} listed={shown.length} number={number} />}

      <Chart tries={shown} />

      <section data-testid="try-list" className={section}>
        <h3 className="text-base font-semibold">{t.listTitle}</h3>
        {removed && (
          <p data-testid="removed" className="flex flex-wrap items-center gap-2 text-sm">
            <span>{t.removed}</span>
            <button type="button" data-testid="undo" onClick={undo} className="inline-flex min-h-11 items-center text-primary underline">
              {t.undo}
            </button>
          </p>
        )}
        {shown.length === 0 && <p data-testid="list-empty" className="text-sm text-muted-foreground">{t.listEmpty}</p>}
        <ol className="flex flex-col gap-2">
          {newestFirst(shown).map((x, i) => (
            <li key={x.id} data-testid={`try-${i}`} className="flex min-w-0 flex-col gap-1 rounded-md border border-border p-2">
              <p className="text-sm font-semibold" data-testid={`try-${i}-head`}>
                {`${monthLong(x.when) || t.dateNone} · ${tryDays(x) !== null ? lengthText(tryDays(x) as number) : t.lenNone}`}
              </p>
              <TryLines x={x} endings={endings} helped={helped} />
              {!inExample && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" data-testid={`try-${i}-edit`} onClick={() => openForm(x.id)} className={ghost}>
                    {t.edit}
                  </button>
                  {confirm === x.id ? (
                    <>
                      <button type="button" data-testid={`try-${i}-confirm`} onClick={() => remove(x.id)} className={`${ghost} border-primary`}>
                        {t.removeConfirm}
                      </button>
                      <button type="button" data-testid={`try-${i}-keep`} onClick={() => setConfirm(null)} className={ghost}>
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

      <Next addiction={addiction} carry={carry} />
      <p data-testid="saved-line" className="text-xs text-muted-foreground">
        {t.saved}
      </p>
    </div>
  )
}

function TryLines({ x, endings, helped }: { x: Try; endings: Option[]; helped: Option[] }) {
  const lab = (ids: string[], opts: Option[], text: string) => [...ids.map((i) => opts.find((o) => o.id === i)?.label ?? i), ...(text.trim() ? [text.trim()] : [])]
  const rows: [string, string[]][] = [
    [t.howLabel, x.how.map((i) => t.hows.find((h) => h.id === i)?.label ?? i)],
    [t.endedLabel, lab(x.ended, endings, x.endedText)],
    [t.helpedLabel, lab(x.helped, helped, x.helpedText)],
  ]
  return (
    <>
      {rows
        .filter(([, v]) => v.length > 0)
        .map(([k, v]) => (
          <p key={k} className={`text-sm text-muted-foreground ${wrap}`}>
            {`${k}: ${v.join(", ")}`}
          </p>
        ))}
    </>
  )
}

function Pattern({ tries, endings, helped }: { tries: Try[]; endings: Option[]; helped: Option[] }) {
  const longest = longestRun(tries)
  const e = endingCounts(tries, endings)
  const h = helpedCounts(tries, helped)
  const w = dangerWindow(tries)
  const topE = topRepeated(e.items)
  const topH = topRepeated(h.items)
  const [why, setWhy] = useState(false)
  const empty = !longest && e.items.length === 0 && h.items.length === 0
  const windowLine = w
    ? w.to < 60
      ? t.windowDays(w.from, w.to, w.count, w.of)
      : w.from === w.to
        ? t.windowOne(lengthText(w.from), w.count, w.of)
        : t.windowIn(lengthText(w.from), lengthText(w.to), w.count, w.of)
    : null
  return (
    <section data-testid="pattern" className={section}>
      <h3 className="text-base font-semibold">{t.patternTitle}</h3>
      {empty && <p className="text-sm text-muted-foreground">{t.patternNone}</p>}
      {longest && (
        <p data-testid="pattern-longest" className="text-sm">
          {t.longest(lengthText(longest.days), longest.of)}
        </p>
      )}
      {topE ? (
        <p data-testid="pattern-ending" className={`text-sm ${wrap}`}>
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
        <p data-testid="pattern-helped" className={`text-sm ${wrap}`}>
          {t.commonHelped(topH.labels, topH.count, h.triesNaming)}
        </p>
      )}
      {windowLine ? (
        <div className="flex flex-col">
          <p data-testid="pattern-window" className="text-sm font-medium">
            {windowLine}
          </p>
          <button type="button" data-testid="window-how" aria-expanded={why} onClick={() => setWhy(!why)} className="inline-flex min-h-11 items-center self-start text-sm text-primary underline">
            {t.windowHow}
          </button>
          {why && (
            <p data-testid="window-why" className="text-xs text-muted-foreground">
              {t.windowWhy}
            </p>
          )}
        </div>
      ) : (
        longest && longest.of < WINDOW_MIN && <p className="text-sm text-muted-foreground">{t.windowNeed}</p>
      )}
      {usesRoughUnits(tries) && (
        <p data-testid="rough-note" className="text-xs text-muted-foreground">
          {t.roughNote}
        </p>
      )}
    </section>
  )
}

/** One fact card from belief b4 (the "just this once" lie): proof, who was counted, how weak, the source. */
function FactCard({ belief }: { belief: QuitBelief }) {
  return (
    <div data-testid="fact-card" className="rounded-lg border border-border bg-card p-3">
      <p className="text-sm">{belief.proof}</p>
      <CountedLine text={belief.counted} />
      {belief.weak && <p className="mt-1 text-sm text-muted-foreground">{belief.weak}</p>}
      <SourceTap refs={uniqueRefs(belief.refs ?? [])} />
    </div>
  )
}

function AfterSlipBlock({ addiction, value, onChange, belief, carry }: { addiction: string; value: AfterSlip | null; onChange: (v: AfterSlip | null) => void; belief: QuitBelief | null; carry: (p: string) => string }) {
  const lies = (
    <>
      {isLiveTool("beliefs") ? (
        <Link href={carry(`/quit/${addiction}/beliefs`)} className="text-primary underline">
          {t.slipJustOnceName}
        </Link>
      ) : (
        t.slipJustOnceName
      )}
    </>
  )
  return (
    <section data-testid="after-slip" className={section}>
      <h3 className="text-base font-semibold">{t.slipTitle}</h3>
      <p className="font-medium">{t.slipQuestion}</p>
      <Chips label={t.slipQuestion} options={AFTER_SLIP.map((id) => ({ id, label: t.slip[id] }))} value={value ? [value] : []} onChange={([id]) => onChange(value === id ? null : (id as AfterSlip))} />
      {value && (
        <div data-testid={`slip-reply-${value}`} className="flex flex-col gap-1 text-sm">
          {value === "gaveUp" && (
            <p>
              {`${t.slipGaveUp} `}
              {isLiveTool("slip") ? (
                <Link href={carry(`/quit/${addiction}/slip`)} className="text-primary underline">
                  {t.slipGaveUpLink}
                </Link>
              ) : (
                t.slipGaveUpPlain
              )}
            </p>
          )}
          {value === "restarted" && <p>{t.slipRestarted}</p>}
          {value === "justOnce" && (
            <p>
              {t.slipJustOncePre}
              {lies}
              {t.slipJustOncePost}
              {belief ? ` ${belief.counterpart}` : ""}
            </p>
          )}
          {value === "dontRemember" && <p>{t.slipDontRemember}</p>}
        </div>
      )}
      {value && belief && <FactCard belief={belief} />}
    </section>
  )
}

function ManyTries({ count, listed, number }: { count: Count | null; listed: number; number: QuitNumber | null }) {
  const what = triesBehind(count, listed)
  if (!what) return null
  const b = number?.basis
  return (
    <section data-testid="many-tries" className={section}>
      <h3 className="text-base font-semibold">{t.manyTitle}</h3>
      <p className="text-sm">{t.manyYouHave(what)}</p>
      {number && (
        <>
          <p className="text-sm">{t.manyStudy}</p>
          <p className="text-sm text-muted-foreground">{t.manyNote}</p>
          {b && (
            <BasisBox
              testId="many-basis"
              basis={{ who: b.who, n: b.n, design: `${b.design}. ${b.measured}`, when: `${b.when} (${b.where})`, caveat: number.caveat }}
              refs={uniqueRefs([number.ref, ...(number.alsoRef ?? [])])}
            />
          )}
        </>
      )}
    </section>
  )
}

const BAR_AREA = 144
const BAR_MAX = 116

function Chart({ tries }: { tries: Try[] }) {
  const list = bars(tries)
  if (list.length < 2) return null
  const shares = barShares(list)
  const avg = averageDays(tries) ?? 0
  const line = (avgShare(list) ?? 0) * BAR_MAX
  return (
    <section data-testid="chart" className={section}>
      <h3 className="text-base font-semibold">{t.chartTitle}</h3>
      <p data-testid="chart-avg" className="text-sm text-muted-foreground">
        {`${t.avg(lengthText(avg))} · ${t.chartBasis(list.length)}`}
      </p>
      <div data-testid="chart-scroll" className="overflow-x-auto">
        <div style={{ minWidth: list.length * 48 }}>
          <div className="relative flex items-end" style={{ height: BAR_AREA }}>
            <div aria-hidden="true" data-testid="avg-line" className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground" style={{ bottom: line }} />
            {list.map((b, k) => (
              <div key={b.id} role="img" data-testid={`bar-${k}`} aria-label={`${monthShort(b.when) || t.dateNone}: ${lengthText(b.days)}`} className="flex h-full min-w-12 flex-1 flex-col items-center justify-end">
                <span data-testid={`bar-${k}-top`} className="text-xs text-muted-foreground">
                  {barText(b.days)}
                </span>
                <span className="block w-6 rounded-t bg-primary" style={{ height: Math.max(2, shares[k] * BAR_MAX) }} />
              </div>
            ))}
          </div>
          <div className="flex border-t border-border">
            {list.map((b, k) => (
              <span key={b.id} data-testid={`bar-${k}-month`} className="min-w-12 flex-1 pt-1 text-center text-xs text-muted-foreground">
                {monthShort(b.when) || t.noMonth}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t.chartNote}</p>
    </section>
  )
}

function Next({ addiction, carry }: { addiction: string; carry: (p: string) => string }) {
  const link = (tool: string, label: string) => (
    <li key={tool}>
      <Link href={carry(`/quit/${addiction}/${tool}`)} data-testid={`next-${tool}`} className="inline-flex min-h-11 items-center text-primary underline">
        {label}
      </Link>
    </li>
  )
  const record = isLiveTool("record") ? (
    <Link href={carry(`/quit/${addiction}/record`)} className="text-primary underline">
      {t.nextRecordName}
    </Link>
  ) : (
    t.nextRecordName
  )
  return (
    <section data-testid="next" className={section}>
      <h3 className="text-base font-semibold">{t.nextTitle}</h3>
      <ul className="flex flex-col">
        {isLiveTool("date") && link("date", t.nextDate)}
        {isLiveTool("ifthen") && link("ifthen", t.nextIfthen)}
      </ul>
      <p className="text-sm">
        {t.nextRecordPre}
        {record}
        {t.nextRecordPost}
      </p>
    </section>
  )
}

function Form({ initial, endings, helped, today, onSave, onCancel }: { initial: Try; endings: Option[]; helped: Option[]; today: string; onSave: (x: Try) => void; onCancel: () => void }) {
  const [x, setX] = useState<Try>(initial)
  const [len, setLen] = useState(initial.len === null ? "" : String(initial.len).replace(".", ","))
  const [lenTouched, setLenTouched] = useState(false)
  const saved = useRef(false)
  const set = (p: Partial<Try>) => setX((o) => ({ ...o, ...p }))
  const typed = parseLength(len)
  const lenBad = typed.kind === "bad"
  const whenOk = monthAllowed(x.when, today)
  const out: Try = { ...x, len: typed.kind === "ok" ? typed.value : null }
  const ok = hasContent(out) && !lenBad && whenOk
  const editing = hasContent(initial)
  const maxMonth = monthOf(today)
  return (
    <div data-testid="try-form" className="flex w-full flex-col gap-4">
      <h2 className="text-lg font-semibold">{editing ? t.formEdit : t.formNew}</h2>
      <label className="flex flex-col gap-1 text-sm">
        {t.whenLabel}
        <input type="month" data-testid="f-when" min={FIRST_MONTH} max={maxMonth} value={x.when} onChange={(e) => set({ when: e.target.value })} className={`${field} w-full`} />
        {!whenOk && (
          <span data-testid="f-when-error" role="alert" className="text-xs text-destructive">
            {t.whenOut}
          </span>
        )}
      </label>
      <div className="flex flex-col gap-1 text-sm">
        <span>{t.lenLabel}</span>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            data-testid="f-len"
            aria-label={t.lenNumber}
            aria-invalid={lenBad}
            maxLength={8}
            value={len}
            onChange={(e) => setLen(e.target.value)}
            onBlur={() => setLenTouched(true)}
            className={`${field} w-28 shrink-0`}
          />
          <select data-testid="f-unit" aria-label={t.unitLabel} value={x.unit} onChange={(e) => set({ unit: e.target.value as LenUnit })} className={`${field} flex-1`}>
            {LEN_UNITS.map((u) => (
              <option key={u} value={u}>
                {t.units[u]}
              </option>
            ))}
          </select>
        </div>
        {lenBad && (lenTouched || len.length > 0) && (
          <span data-testid="f-len-error" role="alert" className="text-xs text-destructive">
            {t.lenBad}
          </span>
        )}
        <span className="sr-only">{`1 to ${MAX_LEN}`}</span>
      </div>
      <div data-testid="f-how" className="flex flex-col gap-2 text-sm">
        <span>{t.howLabel}</span>
        <Chips options={[...t.hows]} value={x.how} onChange={(how) => set({ how })} max={t.hows.length} label={t.howLabel} />
      </div>
      <div data-testid="f-ended" className="flex flex-col gap-2 text-sm">
        <span>{t.endedLabel}</span>
        <Chips options={endings} value={x.ended} onChange={(ended) => set({ ended })} max={endings.length} label={t.endedLabel} />
        <label className="flex flex-col gap-1">
          {t.endedText}
          <input type="text" data-testid="f-ended-text" maxLength={MAX_FREE} value={x.endedText} onChange={(e) => set({ endedText: e.target.value.slice(0, MAX_FREE) })} className={`${field} w-full`} />
        </label>
      </div>
      <div data-testid="f-helped" className="flex flex-col gap-2 text-sm">
        <span>{t.helpedLabel}</span>
        <Chips options={helped} value={x.helped} onChange={(h) => set({ helped: h })} max={helped.length} label={t.helpedLabel} />
        <label className="flex flex-col gap-1">
          {t.helpedText}
          <input type="text" data-testid="f-helped-text" maxLength={MAX_FREE} value={x.helpedText} onChange={(e) => set({ helpedText: e.target.value.slice(0, MAX_FREE) })} className={`${field} w-full`} />
        </label>
      </div>
      {!ok && !lenBad && whenOk && <p className="text-xs text-muted-foreground">{t.needOne}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="f-save"
          disabled={!ok}
          onClick={() => {
            if (saved.current) return
            saved.current = true
            onSave(out)
          }}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground disabled:opacity-40"
        >
          {t.save}
        </button>
        <button type="button" data-testid="f-cancel" onClick={onCancel} className={ghost}>
          {t.cancel}
        </button>
      </div>
    </div>
  )
}
