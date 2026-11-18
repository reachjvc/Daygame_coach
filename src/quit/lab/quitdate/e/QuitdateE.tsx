"use client"

import { useEffect, useState } from "react"
import { PrimaryButton } from "../../../components/kit"
import { fmtMoney } from "../../progress/shared/calc"
import { Card, Head, InferredTag, Placeholder, PlaceholderScreen, Tabs } from "../../progress/shared/Bits"
import { OtherToolScreen } from "../../timeline/shared/Bits"
import { useLabState } from "../../store"
import type { ToolProps as LabProps } from "../../../types"
import { CheckRow } from "../shared/Bits"
import { googleCalendarUrl, icsFor, quitDateFor, savingsFor, type DateChoice } from "../shared/logic"
import { eText } from "./text"

type Type = "cig" | "vape"
const CHOICES: DateChoice[] = ["today", "tomorrow", "pick", "later"]

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
const fmtDate = (key: string | null) => (key ? new Date(`${key}T00:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : eText.noDate)

/** Copy E: quit date picker and the five-step plan builder with its results page, plus the app's progress, profile and home. */
export function QuitdateE({ data }: LabProps) {
  const [view, setView] = useState(0)
  return (
    <div data-testid="quitdate-e">
      <div className="mb-3">
        <Tabs id="e-view" items={eText.views} value={view} onChange={setView} />
      </div>
      {view === 0 ? <Builder data={data} /> : <App onBuilder={() => setView(0)} />}
    </div>
  )
}

export function CalendarMenu({ dateKey }: { dateKey: string | null }) {
  const [open, setOpen] = useState(false)
  const ics = dateKey ? `data:text/calendar;charset=utf-8,${encodeURIComponent(icsFor(dateKey, eText.calTitle))}` : ""
  return (
    <div className="relative">
      <button type="button" data-testid="e-cal-btn" disabled={!dateKey} onClick={() => setOpen(!open)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40">
        {eText.addCal} <span aria-hidden="true">{"▾"}</span>
      </button>
      {open && dateKey && (
        <ul data-testid="e-cal-menu" className="mt-1 flex flex-col rounded-md border border-border bg-card">
          <li>
            <a data-testid="e-cal-google" href={googleCalendarUrl(dateKey, eText.calTitle)} target="_blank" rel="noreferrer" className="flex min-h-11 items-center px-3 text-sm">
              {eText.calMenu.google}
            </a>
          </li>
          <li>
            <a data-testid="e-cal-apple" href={ics} download="quit-date.ics" className="flex min-h-11 items-center px-3 text-sm">
              {eText.calMenu.apple}
            </a>
          </li>
          <li>
            <a data-testid="e-cal-outlook" href={ics} download="quit-date.ics" className="flex min-h-11 items-center px-3 text-sm">
              {eText.calMenu.outlook}
            </a>
          </li>
        </ul>
      )}
    </div>
  )
}

function Section({ n, children, testId }: { n: number; children: React.ReactNode; testId: string }) {
  return (
    <section data-testid={testId} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="text-xs font-semibold uppercase text-primary">{eText.stepWord(n)}</div>
      <h2 className="text-lg font-semibold">{eText.stepTitles[n - 1]}</h2>
      {children}
    </section>
  )
}

export type Ns = readonly [string, string]
const E_NS: Ns = ["quitdate", "e"]
export type BuilderExtras = {
  /** Needs one pick in each strategy group before the plan opens (copy of a different product's rule). */
  needEachGroup?: boolean
  /** Adds a printable plan screen. */
  printView?: boolean
  labels?: { needOne: string; viewPlan: string; planTitle: string; print: string; back: string }
  /** Neutral line under the landing heading, in place of the default. */
  landText?: string
  /** Shown instead of "-" for amounts nothing was typed for. */
  dash?: string
  /** Small inferred tag next to navigation that this copy added and the product never showed, and on the vape path. */
  tagNav?: string
  /** More results sections (tips link, contact placeholders, setback steps, edit link). */
  more?: { tips: string; contactNote: string; stepsTitle: string; steps: readonly string[]; edit: string }
}

export function Builder({ data, ns = E_NS, extras = {} }: { data: LabProps["data"]; ns?: Ns; extras?: BuilderExtras }) {
  const [type, setType] = useLabState<Type | null>(ns[0], ns[1], "type", null)
  const [choice, setChoice] = useLabState<DateChoice | null>(ns[0], ns[1], "choice", null)
  const [picked, setPicked] = useLabState<string>(ns[0], ns[1], "picked", "")
  const [cigs, setCigs] = useLabState<string>(ns[0], ns[1], "cigs", "")
  const [price, setPrice] = useLabState<string>(ns[0], ns[1], "price", "")
  const [reasons, setReasons] = useLabState<string[]>(ns[0], ns[1], "reasons", [])
  const [trig, setTrig] = useLabState<string[]>(ns[0], ns[1], "triggers", [])
  const [sup, setSup] = useLabState<string[]>(ns[0], ns[1], "support", [])
  const [exp, setExp] = useLabState<string[]>(ns[0], ns[1], "experts", [])
  const [dis, setDis] = useLabState<string[]>(ns[0], ns[1], "distract", [])
  const [other, setOther] = useLabState<string>(ns[0], ns[1], "otherWay", "")
  const [ticks, setTicks] = useLabState<boolean[]>(ns[0], ns[1], "ticks", [true, false, false, false, false, false, false, false])
  const [results, setResults] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [err, setErr] = useState(false)
  const [tips, setTips] = useState(false)
  const [src, setSrc] = useState(false)
  const [card, setCard] = useState(0)
  const [now, setNow] = useState(0)
  useEffect(() => setNow(Date.now()), [])

  const dateKey = now ? quitDateFor(choice, picked, now) : null
  const typed = cigs !== "" && price !== ""
  const sav = savingsFor(Number(cigs) || 0, Number(price) || 0)
  const packRef = (Array.isArray(data.units) ? data.units : []).find((u) => u.id === "cigarettes")?.priceRefs.find((r) => /20-cigarette/.test(r.quote ?? ""))
  const money = (n: number) => (typed ? fmtMoney(n) : (extras.dash ?? "-"))
  const groupsPicked = eText.groups.map((g, gi) => ({ title: g.title, items: g.items.filter((_, i) => trig.includes(`${gi}-${i}`)) })).filter((g) => g.items.length > 0)
  const distractList = [...eText.distract.items.filter((_, i) => dis.includes(String(i))), ...(dis.includes("other") ? [other || eText.distract.other] : [])]
  const supList = eText.support.items.filter((_, i) => sup.includes(String(i)))
  const expList = eText.experts.items.filter((_, i) => exp.includes(String(i)))
  const reasonList = eText.reasons.filter((_, i) => reasons.includes(String(i)))

  const planText = () =>
    [eText.resultsTitle, `${eText.myDate}: ${fmtDate(dateKey)}`, `${eText.savingsTitle}: ${sav.week} / ${sav.month} / ${sav.year}`, `${eText.reasonsReminder}: ${reasonList.join("; ")}`, `${eText.myTriggers}: ${groupsPicked.flatMap((g) => g.items).join("; ")}`, `${eText.myStrategies}: ${distractList.join("; ")}`, `${eText.supportTitle}: ${supList.join("; ")}`, `${eText.expertTitle}: ${expList.join("; ")}`].join("\n")

  if (results && printing && extras.labels) {
    const L = extras.labels
    return (
      <article data-testid="e-print" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button type="button" data-testid="e-print-back" onClick={() => setPrinting(false)} className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
            {L.back}
          </button>
          <InferredTag />
        </div>
        <h2 className="text-lg font-semibold">{L.planTitle}</h2>
        <div data-testid="e-print-page" className="whitespace-pre-wrap break-words rounded-md border border-border bg-card p-3 text-sm">
          {planText()}
        </div>
        <PrimaryButton testId="e-print-go" onClick={() => window.print()}>
          {L.print}
        </PrimaryButton>
      </article>
    )
  }

  if (results) {
    const cur = groupsPicked[Math.min(card, Math.max(0, groupsPicked.length - 1))]
    return (
      <article data-testid="e-results" className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button type="button" data-testid="screen-back" onClick={() => setResults(false)} className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
            {eText.backToAnswers}
          </button>
          {extras.tagNav && <InferredTag />}
        </div>
        <h2 className="text-xl font-semibold">{eText.resultsTitle}</h2>
        <section data-testid="e-res-date" className="flex flex-col gap-2">
          <h3 className="font-semibold">{eText.myDate}</h3>
          <div data-testid="e-res-date-value" className="text-lg">
            {fmtDate(dateKey)}
          </div>
          <CalendarMenu dateKey={dateKey} />
        </section>
        <Card testId="e-savings">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="flex-1 font-semibold">{eText.savingsTitle}</h3>
          </div>
          <p className="mb-2 text-sm text-muted-foreground">{eText.savingsText}</p>
          <ul className="flex flex-col gap-1 text-sm">
            {eText.saveRows.map((r, i) => (
              <li key={r} className="flex justify-between">
                <span>{r}</span>
                <span data-testid={`e-save-${i}`} className="tabular-nums">
                  {money([sav.week, sav.month, sav.year][i])}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" data-testid="e-source-btn" aria-expanded={src} onClick={() => setSrc(!src)} className="mt-2 inline-flex min-h-11 items-center text-xs underline">
            {eText.sourceBtn}
          </button>
          {src && (
            <p data-testid="e-source" className="text-xs text-muted-foreground">
              {eText.sourceLine} {packRef ? `${packRef.cite}: "${packRef.quote}"` : ""}
            </p>
          )}
        </Card>
        <section data-testid="e-getready" className="flex flex-col gap-2 rounded-lg bg-primary/10 p-3">
          <h3 className="font-semibold">{eText.readyTo}</h3>
          {eText.checks.map((c, i) => (
            <div key={c.t} className="flex flex-col gap-0.5">
              <CheckRow testId={`e-check-${i}`} label={c.t} on={ticks[i]} onClick={() => setTicks(ticks.map((t, k) => (k === i ? !t : t)))} />
              <p className="px-1 text-xs text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </section>
        <section data-testid="e-understand" className="flex flex-col gap-2">
          <h3 className="font-semibold">{eText.understand}</h3>
          <p className="text-sm text-muted-foreground">{eText.understandText}</p>
          <ul className="list-disc pl-5 text-sm">
            {eText.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <h4 className="font-medium">{eText.myTriggers}</h4>
          <div className="flex items-center gap-2">
            <button type="button" data-testid="e-prev" aria-label={eText.prevCard} disabled={card === 0} onClick={() => setCard(card - 1)} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card disabled:opacity-40">
              {"‹"}
            </button>
            <Card testId="e-trigger-card" className="min-w-0 flex-1">
              {cur ? (
                <>
                  <div className="font-semibold">{cur.title}</div>
                  <ul className="list-disc pl-5 text-sm">
                    {cur.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">{eText.none}</div>
              )}
            </Card>
            <button type="button" data-testid="e-next" aria-label={eText.nextCard} disabled={card >= groupsPicked.length - 1} onClick={() => setCard(card + 1)} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card disabled:opacity-40">
              {"›"}
            </button>
          </div>
        </section>
        <PlanList testId="e-cravings" title={eText.cravings} line={eText.cravingsText} sub={eText.myStrategies} items={distractList} />
        {extras.more && (
          <div className="flex flex-col gap-2">
            <button type="button" data-testid="e-more-tips" aria-expanded={tips} onClick={() => setTips(!tips)} className="inline-flex min-h-11 items-center self-start text-sm text-sky-400 underline">
              {extras.more.tips}
            </button>
            {tips && <Placeholder />}
          </div>
        )}
        <PlanList testId="e-team" title={eText.supportTitle} items={supList} />
        {extras.more ? (
          <section data-testid="e-experts" className="flex flex-col gap-1">
            <h3 className="font-semibold">{eText.expertTitle}</h3>
            {expList.length === 0 && <p className="text-sm text-muted-foreground">{eText.none}</p>}
            {expList.map((x) => (
              <div key={x} data-testid="e-expert-row" className="flex flex-col gap-1 rounded-md border border-border bg-card p-2 text-sm">
                <span>{x}</span>
                <span className="rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground">{extras.more?.contactNote}</span>
              </div>
            ))}
          </section>
        ) : (
          <PlanList testId="e-experts" title={eText.expertTitle} items={expList} />
        )}
        <PlanList testId="e-reasons" title={eText.reasonsReminder} items={reasonList} />
        <section className="flex flex-col gap-1">
          <h3 className="font-semibold">{eText.setbacks}</h3>
          <p className="text-sm text-muted-foreground">{eText.setbackText}</p>
          {extras.more && (
            <div data-testid="e-setback-steps">
              <p className="text-sm font-medium">{extras.more.stepsTitle}</p>
              <ul className="list-disc pl-5 text-sm">
                {extras.more.steps.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
        {extras.printView && extras.labels && (
          <button type="button" data-testid="e-view-plan" onClick={() => setPrinting(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 font-medium">
            {extras.labels.viewPlan} <InferredTag />
          </button>
        )}
        <a data-testid="e-download" href={`data:text/plain;charset=utf-8,${encodeURIComponent(planText())}`} download="my-quit-plan.txt" className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground">
          {eText.download}
        </a>
        {extras.more && (
          <button type="button" data-testid="e-edit-plan" onClick={() => setResults(false)} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-card px-4 font-medium">
            {extras.more.edit}
          </button>
        )}
      </article>
    )
  }

  return (
    <div data-testid="e-builder" className="flex flex-col gap-4">
      <section data-testid="e-landing" className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">{eText.landTitle}</h1>
        <Card>
          <p className="mb-3 text-sm">{extras.landText ?? eText.landText}</p>
          <p className="mb-2 font-medium">{eText.typeQ}</p>
          <div role="radiogroup" className="flex flex-col gap-2">
            {(["cig", "vape"] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={type === t} data-testid={`e-type-${t}`} onClick={() => setType(t)} className={`min-h-12 rounded-md border px-4 font-medium ${type === t ? "border-teal-500 bg-teal-600 text-white" : "border-border bg-card"}`}>
                {eText.types[t]}
                {t === "vape" && extras.tagNav && (
                  <span className="ml-2">
                    <InferredTag />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>
        {!type && (
          <ol data-testid="e-step-cards" className="flex flex-col gap-2">
            {eText.stepTitles.map((s, i) => (
              <li key={s} className="rounded-md border border-border bg-card p-3 text-sm">
                <span className="block text-xs text-muted-foreground">{eText.stepWord(i + 1)}</span>
                {s}
              </li>
            ))}
          </ol>
        )}
      </section>
      {type && (
        <>
          <Section n={1} testId="e-step-1">
            <p className="text-sm text-muted-foreground">{eText.dateText}</p>
            <p className="font-medium">{eText.dateQ}</p>
            <div role="radiogroup" className="flex flex-col">
              {CHOICES.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={choice === c} data-testid={`e-date-${c}`} onClick={() => setChoice(c)} className="flex min-h-11 items-center gap-3 text-left">
                  <span aria-hidden="true" className={`size-5 shrink-0 rounded-full border-2 ${choice === c ? "border-teal-500 bg-teal-500" : "border-border"}`} />
                  {eText.dates[c]}
                </button>
              ))}
            </div>
            {choice === "pick" && (
              <div data-testid="e-pick" className="flex flex-col gap-2">
                <input type="date" data-testid="e-date-input" aria-label={eText.dateField} value={picked} onChange={(e) => setPicked(e.target.value)} className="min-h-11 rounded-md border border-border bg-background px-2" />
                <CalendarMenu dateKey={dateKey} />
              </div>
            )}
            <p className="text-xs text-muted-foreground">{eText.laterNote}</p>
          </Section>
          <Section n={2} testId="e-step-2">
            <p className="text-sm text-muted-foreground">{eText.costText}</p>
            {type === "vape" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex-1">{eText.vapeCostNote}</span>
                <InferredTag />
              </div>
            )}
            <div className="flex flex-col gap-2 rounded-md bg-background p-3 text-sm">
              <label className="flex flex-wrap items-center gap-2">
                {eText.cigsPre}
                <input type="number" inputMode="numeric" min={0} data-testid="e-cigs" placeholder="0" value={cigs} onChange={(e) => setCigs(e.target.value)} className="min-h-11 w-20 rounded-md border border-border bg-card px-2 text-right" />
                {eText.cigsPost}
              </label>
              <label className="flex flex-wrap items-center gap-2">
                {eText.pricePre}
                <input type="number" inputMode="decimal" min={0} step="0.01" data-testid="e-price" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} className="min-h-11 w-24 rounded-md border border-border bg-card px-2 text-right" />
                {eText.pricePost}
              </label>
            </div>
          </Section>
          <Section n={3} testId="e-step-3">
            <p className="text-sm text-muted-foreground">{eText.reasonsText}</p>
            <p className="font-medium">{eText.reasonsLabel}</p>
            <div className="flex flex-col gap-1.5">
              {eText.reasons.map((r, i) => (
                <CheckRow key={r} testId={`e-reason-${i}`} label={r} on={reasons.includes(String(i))} onClick={() => setReasons(toggle(reasons, String(i)))} />
              ))}
              <Placeholder />
            </div>
          </Section>
          <Section n={4} testId="e-step-4">
            <p className="text-sm text-muted-foreground">{eText.triggersText}</p>
            {eText.groups.map((g, gi) => (
              <div key={g.title} className="flex flex-col gap-1.5 rounded-md bg-background p-2">
                <h3 className="font-semibold">{g.title}</h3>
                {g.items.map((it, i) => (
                  <CheckRow key={it} testId={`e-trig-${gi}-${i}`} label={it} on={trig.includes(`${gi}-${i}`)} onClick={() => setTrig(toggle(trig, `${gi}-${i}`))} />
                ))}
              </div>
            ))}
          </Section>
          <Section n={5} testId="e-step-5">
            <p className="text-sm text-muted-foreground">{eText.setupText}</p>
            {err && extras.labels && (
              <p data-testid="e-need-one" role="alert" className="rounded-md border border-red-500 bg-red-950/40 p-3 text-sm">
                {extras.labels.needOne}
              </p>
            )}
            {(
              [
                ["sup", eText.support, sup, setSup],
                ["exp", eText.experts, exp, setExp],
              ] as const
            ).map(([id, grp, val, set]) => (
              <div key={id} className="flex flex-col gap-1.5 rounded-md bg-background p-2">
                <h3 className="font-semibold">{grp.title}</h3>
                <p className="text-xs italic text-muted-foreground">{eText.selectOne}</p>
                {grp.items.map((it, i) => (
                  <CheckRow key={it} testId={`e-${id}-${i}`} label={it} on={val.includes(String(i))} onClick={() => set(toggle(val, String(i)))} />
                ))}
              </div>
            ))}
            <div className="flex flex-col gap-1.5 rounded-md bg-background p-2">
              <h3 className="font-semibold">{eText.distract.title}</h3>
              <p className="text-xs italic text-muted-foreground">{eText.selectOne}</p>
              {eText.distract.items.map((it, i) => (
                <CheckRow key={it} testId={`e-dis-${i}`} label={it} on={dis.includes(String(i))} onClick={() => setDis(toggle(dis, String(i)))} />
              ))}
              <CheckRow testId="e-dis-other" label={eText.distract.other} on={dis.includes("other")} onClick={() => setDis(toggle(dis, "other"))} />
              {dis.includes("other") && <input data-testid="e-dis-other-input" aria-label={eText.distract.otherField} value={other} onChange={(e) => setOther(e.target.value)} className="min-h-11 rounded-md border border-border bg-card px-2" />}
            </div>
          </Section>
          <section data-testid="e-ready" className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4 text-center">
            <h2 className="text-lg font-semibold">{eText.readyTitle}</h2>
            <PrimaryButton
              testId="e-letsgo"
              onClick={() => {
                if (extras.needEachGroup && (sup.length === 0 || exp.length === 0 || dis.length === 0)) return setErr(true)
                setErr(false)
                setResults(true)
              }}
            >
              {eText.letsGo}
            </PrimaryButton>
          </section>
        </>
      )}
    </div>
  )
}

function PlanList({ testId, title, line, sub, items }: { testId: string; title: string; line?: string; sub?: string; items: string[] }) {
  return (
    <section data-testid={testId} className="flex flex-col gap-1">
      <h3 className="font-semibold">{title}</h3>
      {line && <p className="text-sm text-muted-foreground">{line}</p>}
      {sub && <h4 className="text-sm font-medium">{sub}</h4>}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{eText.none}</p>
      ) : (
        <ul className="list-disc pl-5 text-sm">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

type AppScreen = { name: "tab" } | { name: "other"; title: string } | { name: "badge" } | { name: "age" }

export function App({ onBuilder, ns = E_NS }: { onBuilder: () => void; ns?: Ns }) {
  const [tab, setTab] = useState(3)
  const [screen, setScreen] = useState<AppScreen>({ name: "tab" })
  const [choice] = useLabState<DateChoice | null>(ns[0], ns[1], "choice", null)
  const [picked] = useLabState<string>(ns[0], ns[1], "picked", "")
  const [own, setOwn] = useLabState<string>(ns[0], ns[1], "appDate", "")
  const [reasons] = useLabState<string[]>(ns[0], ns[1], "reasons", [])
  const [trig] = useLabState<string[]>(ns[0], ns[1], "triggers", [])
  const [now, setNow] = useState(0)
  const [editing, setEditing] = useState(false)
  const [start] = useState(() => Date.now())
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const since = start
  const dateKey = own || (now ? quitDateFor(choice, picked, now) : null)
  const t = Math.max(0, Math.floor((now - since) / 1000))
  const joinedText = `${eText.joined} ${Math.floor(t / 86400)} d, ${Math.floor((t % 86400) / 3600)} h ${Math.floor((t % 3600) / 60)} m ${t % 60} s`
  const bar = (
    <div data-testid="e-joined" className="mb-3 rounded-md bg-card px-3 py-2 text-sm tabular-nums">
      {joinedText}
    </div>
  )
  const back = () => setScreen({ name: "tab" })

  if (screen.name === "other") return <OtherToolScreen title={screen.title} onBack={back} />
  if (screen.name === "badge") return <PlaceholderScreen title={eText.badgeTitle} onBack={back} />
  if (screen.name === "age") return <PlaceholderScreen title={eText.profileAge} onBack={back} />

  let page: React.ReactNode
  if (tab === 3) {
    page = (
      <section data-testid="e-progress" className="flex flex-col gap-3">
        {bar}
        <div className="grid grid-cols-2 gap-2">
          <Card testId="e-tile-date">
            <div className="text-xs text-muted-foreground">{eText.quitDateTile}</div>
            <button type="button" data-testid="e-edit-date" onClick={() => setEditing(!editing)} aria-label={eText.editDate} className="min-h-11 text-left font-semibold text-sky-400">
              {dateKey ?? eText.noDate}
            </button>
            {editing && (
              <div className="mt-1 flex items-center gap-2">
                <input type="date" data-testid="e-app-date" aria-label={eText.editDate} value={own} onChange={(e) => setOwn(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-2" />
                <InferredTag />
              </div>
            )}
          </Card>
          <button type="button" data-testid="e-tile-red" onClick={() => setScreen({ name: "other", title: eText.cravingsTile })} className="min-h-24 rounded-lg bg-red-700 p-3 text-left text-white">
            <div className="text-sm">
              {eText.cravingsTile} <b>0</b>
            </div>
            <div className="text-sm">
              {eText.slipsTile} <b>0</b>
            </div>
          </button>
          <div data-testid="e-tile-money" className="min-h-24 rounded-lg bg-green-700 p-3 text-white">
            <div className="text-xs">{eText.dollarsTile}</div>
            <div className="text-lg font-semibold">{"$0"}</div>
          </div>
          <Card testId="e-tile-great">
            <div className="text-sm">{eText.greatTile}</div>
            <div className="text-lg font-semibold">
              0 <span className="text-xs font-normal text-muted-foreground">{eText.entries}</span>
            </div>
          </Card>
        </div>
        <div className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
        <button type="button" data-testid="e-badge-row" onClick={() => setScreen({ name: "badge" })} className="flex min-h-11 items-center justify-between rounded-md border border-border bg-card px-3 text-sm">
          <span>{eText.badge}</span>
          <span aria-hidden="true">{"›"}</span>
        </button>
      </section>
    )
  } else if (tab === 2) {
    page = (
      <section data-testid="e-home" className="flex flex-col gap-3">
        {bar}
        <h2 className="text-lg font-semibold">{eText.whatsUp}</h2>
        <div className="grid grid-cols-5 gap-1">
          {eText.homeButtons.map((b, i) => (
            <button key={b} type="button" data-testid={`e-home-btn-${i}`} onClick={() => setScreen({ name: "other", title: b })} className="flex min-h-16 flex-col items-center gap-1 text-center text-[11px] leading-tight">
              <span aria-hidden="true" className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {i + 1}
              </span>
              {b}
            </button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">{eText.didYouKnow}</div>
        <Placeholder />
      </section>
    )
  } else if (tab === 0) {
    page = <OtherToolScreen title={eText.kitTitle} onBack={() => setTab(2)} />
  } else if (tab === 1) {
    page = <PlaceholderScreen title={eText.exploreTitle} onBack={null} />
  } else {
    const values = [dateKey ? fmtDate(dateKey) : eText.notSet, eText.notSet, trig.length ? `${trig.length} ${eText.picked}` : eText.notSet, reasons.length ? `${reasons.length} ${eText.picked}` : eText.notSet, eText.notSet]
    page = (
      <section data-testid="e-profile" className="flex flex-col gap-3">
        <Head title={eText.moreTitle} />
        <button type="button" data-testid="e-age" onClick={() => setScreen({ name: "age" })} className="flex min-h-11 items-center justify-between rounded-md border border-border bg-card px-3 text-sm">
          <span>{eText.profileAge}</span>
          <span aria-hidden="true">{"›"}</span>
        </button>
        <p className="text-xs text-muted-foreground">{eText.tapEdit}</p>
        {eText.profileRows.map((r, i) => (
          <button key={r.t} type="button" data-testid={`e-prof-${i}`} onClick={i === 0 ? () => { setTab(3); setEditing(true) } : onBuilder} className="flex min-h-14 items-center gap-3 rounded-md border border-border bg-card px-3 text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-sm">{r.d}</span>
              <span className="block text-sm font-semibold">{values[i]}</span>
            </span>
            <span aria-hidden="true" className="text-orange-400">
              {"›"}
            </span>
          </button>
        ))}
      </section>
    )
  }
  return (
    <div data-testid="e-app" className="flex flex-col">
      {page}
      <nav className="sticky bottom-0 z-10 mt-4 grid grid-cols-5 items-end border-t border-border bg-background">
        {eText.appTabs.map((label, i) => (
          <button key={label} type="button" data-testid={`e-nav-${i}`} aria-current={i === tab} onClick={() => setTab(i)} className={`flex min-h-12 flex-col items-center justify-end gap-0.5 break-words px-0.5 pb-1 text-[11px] leading-tight ${i === tab ? "font-semibold text-primary" : "text-muted-foreground"}`}>
            {i === 2 && (
              <span data-testid="e-home-alert" aria-hidden="true" className="-mt-5 inline-flex size-11 items-center justify-center rounded-full bg-red-600 text-lg text-white">
                {"⚠"}
              </span>
            )}
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

