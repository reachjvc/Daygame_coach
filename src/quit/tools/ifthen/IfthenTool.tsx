"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { BlackBoxBridge } from "../../components/BlackBoxBridge"
import { LocalBlackBoxBridge } from "../../components/LocalBlackBoxBridge"
import { OneQuestion, PrimaryButton } from "../../components/kit"
import { useSignedIn, type QuitBlackBoxApi } from "../../blackbox"
import { isLiveTool } from "../../menu"
import { addDays, todayIso } from "../../record"
import type { QuitMomentSwap, QuitOption, QuitResponse, ToolProps } from "../../types"
import { usable } from "../common"
import { useCarry, useDoneCount, useScreens, useStartCount, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import { InfoLine } from "../date/Bits"
import { EVIDENCE } from "./evidence"
import {
  addRemoved,
  addToDraft,
  applyDraft,
  dropFromDraft,
  cleanState,
  draftFromLines,
  EMPTY_IFTHEN,
  firstOpenMoment,
  ideasFor,
  firstUnanswered,
  dayLabel,
  isDue,
  matchMoment,
  MAX_OWN_MOMENT,
  moveLine,
  parseIfthen,
  preTicks,
  reachedTo,
  restore,
  shownTotal,
  reviewCounts,
  thenOk,
  toggleTick,
  totalScreens,
  withOwn,
  type Choice,
  type Draft,
  type IfthenState,
  type Removed,
} from "./logic"
import { Choices, LineCard, PlanCard, PrintView } from "./Parts"
import { ifthenText as t } from "./text"

const btn = "inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-sm"
/** Responses that are not something to do at the moment (they need his numbers or point back at the SOS tool). */
const NOT_A_MOMENT_IDEA = ["reasons", "craving"]

/** Today as an ISO day, refreshed so a tab left open over midnight changes day. */
function useToday(): string {
  const [today, setToday] = useState(() => todayIso())
  useEffect(() => {
    const tick = () => setToday(todayIso())
    const id = setInterval(tick, 30_000)
    document.addEventListener("visibilitychange", tick)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [])
  return today
}

/** If-then plan: tick the moments, pick one thing to do at each, then a plan he can change, move, print and check back on. */
export function IfthenTool({ addiction, data }: ToolProps) {
  const moments = usable<QuitOption[]>(data.riskyMoments)
  const swaps = usable<QuitMomentSwap[]>(data.momentSwaps)
  const responses = usable<QuitResponse[]>(data.responses)
  if (!moments || moments.length === 0 || !swaps || !responses) return <NotReady />
  return <Inner addiction={addiction} moments={moments} swaps={swaps} ideas={responses.filter((r) => !NOT_A_MOMENT_IDEA.includes(r.id))} />
}

interface InnerProps {
  addiction: string
  moments: QuitOption[]
  swaps: QuitMomentSwap[]
  ideas: QuitResponse[]
}

function Inner(props: InnerProps) {
  const signedIn = useSignedIn(true, true)
  const [bb, setBb] = useState<QuitBlackBoxApi | null>(null)
  const onApi = useCallback((api: QuitBlackBoxApi | null) => setBb(api), [])
  // The Black Box is only read here: signed in it is the account's copy, otherwise the one in this browser.
  return (
    <div className="w-full">
      {signedIn === true ? <BlackBoxBridge key="in" viceId={props.addiction} onApi={onApi} /> : null}
      {signedIn === false ? <LocalBlackBoxBridge key="out" viceId={props.addiction} onApi={onApi} /> : null}
      <Screens {...props} bb={bb} />
    </div>
  )
}

function Screens({ addiction, moments, swaps, ideas, bb }: InnerProps & { bb: QuitBlackBoxApi | null }) {
  const carry = useCarry()
  const pathname = usePathname()
  const sp = useSearchParams()
  const today = useToday()
  const { state, update } = useToolState<IfthenState>(addiction, "ifthen", EMPTY_IFTHEN, parseIfthen)
  const started = useStartCount(addiction, "ifthen")
  const lastMove = useRef(0)
  const [removed, setRemoved] = useState<Removed[]>([])
  const [own, setOwn] = useState("")
  const preDone = useRef(false)
  const printPushed = useRef(false)

  const draft = state
    ? cleanState(state, moments).draft
    : null
  const total = totalScreens(draft)
  const { screen, go, back: goBack, isResult } = useScreens(firstUnanswered(draft), total, state !== null)
  useDoneCount(addiction, "ifthen", state !== null && isResult)

  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const m of moments) out[m.id] = (bb?.reports ?? []).filter((r) => r.where === m.id).length
    return out
  }, [bb?.reports, moments])

  // A first visit: once the Black Box is read, tick the moments his saves name (most often first, at most three).
  useEffect(() => {
    if (!state || preDone.current || !bb || !bb.ready || !bb.settled) return
    preDone.current = true
    if (state.draft || state.lines.length > 0) return
    const ticks = preTicks(bb.reports, moments)
    if (ticks.length === 0) return
    update((s) =>
      s.draft || s.lines.length > 0
        ? s
        : {
            ...s,
            draft: {
              ticked: ticks.map((x) => x.id),
              choices: {},
              pre: true,
              reached: 1,
            },
          },
    )
  }, [state, bb, moments, update])

  // A double tap on Continue / Next must not pick a card on the next screen: option taps wait 400 ms after a screen change.
  const changedAt = useRef(0)
  useEffect(() => {
    changedAt.current = Date.now()
  }, [screen, isResult])
  const settled = () => Date.now() - changedAt.current >= 400

  // Keeps stored labels in step and moves lines of a moment the data file lost to "Other moment" (never deletes them).
  const dirty = state !== null && cleanState(state, moments) !== state
  useEffect(() => {
    if (dirty) update((s) => cleanState(s, moments))
  }, [dirty, update, moments])

  if (!state) return null
  const st = cleanState(state, moments)

  const move = (fn: () => void) => {
    const now = Date.now()
    if (now - lastMove.current < 250) return
    lastMove.current = now
    fn()
  }
  const labelOf = (key: string) => moments.find((m) => m.id === key)?.label ?? key.replace(/^own:/, "")
  const swapsOf = (momentId: string | null) => (momentId ? (swaps.find((s) => s.momentId === momentId)?.cards ?? []) : [])
  const setDraft = (fn: (d: Draft | null) => Draft) => update((s) => ({ ...s, draft: fn(s.draft) }))
  const back = screen > 1 ? goBack : null
  /** Applies the draft to the plan and shows the plan. */
  const finish = (d: Draft) => {
    const res = applyDraft(st.lines, d)
    setRemoved(res.removed)
    update((s) => ({
      ...s,
      lines: res.lines,
      draft: reachedTo(d, totalScreens(d) + 1),
    }))
    go(totalScreens(d) + 1)
  }

  if (!isResult && screen === 1) {
    const ticked = draft?.ticked ?? []
    const customs = ticked.filter((k) => k.startsWith("own:"))
    const bannerList = ticked
      .filter((k) => counts[k] > 0)
      .sort((a, b) => counts[b] - counts[a])
      .map((k) => `${labelOf(k)} (${t.times(counts[k])})`)
    const addOwn = () => {
      if (own.trim() === "") return
      started()
      const hit = matchMoment(own, moments)
      if (hit) setDraft((d) => (d?.ticked.includes(hit.id) ? d : toggleTick(d, hit.id)))
      else setDraft((d) => withOwn(d, own))
      setOwn("")
    }
    return (
      <OneQuestion step={1} total={shownTotal(draft)} onBack={null} hideBar>
        <h2 className="text-lg font-semibold">{t.pickTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.pickLine}</p>
        {draft?.pre && bannerList.length > 0 && (
          <p data-testid="banner" className="rounded-md border border-border bg-card px-3 py-2 text-sm">
            {t.banner(bannerList.join(", "))}
          </p>
        )}
        <div role="group" aria-label={t.pickGroup} className="flex flex-wrap gap-2">
          {moments.map((m) => {
            const on = ticked.includes(m.id)
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                data-testid={`moment-${m.id}`}
                onClick={() => {
                  started()
                  setDraft((d) => toggleTick(d, m.id))
                }}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-base ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
              >
                {m.label}
              </button>
            )
          })}
          {customs.map((k, i) => (
            <button
              key={k}
              type="button"
              aria-pressed
              data-testid={`moment-own-${i}`}
              onClick={() => setDraft((d) => toggleTick(d, k))}
              className="inline-flex min-h-11 max-w-full items-center rounded-full border border-primary bg-primary px-4 text-left text-base text-primary-foreground [overflow-wrap:anywhere]"
            >
              {labelOf(k)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">{t.customLabel}</span>
            <input
              data-testid="own-moment"
              value={own}
              maxLength={MAX_OWN_MOMENT}
              placeholder={t.customPlaceholder}
              onChange={(e) => setOwn(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addOwn()
                }
              }}
              className="min-h-12 min-w-0 rounded-md border border-border bg-card px-3 text-base"
            />
          </label>
          <button type="button" data-testid="own-moment-add" onClick={addOwn} className={`${btn} min-h-12 self-end`}>
            {t.customAdd}
          </button>
        </div>
        <PrimaryButton
          testId="pick-next"
          disabled={ticked.length === 0}
          onClick={() =>
            move(() => {
              // The first screen gets its own address, so browser Back lands on it and not on the furthest screen.
              if (sp.get("s") === null) {
                const p = new URLSearchParams(sp.toString())
                p.set("s", "1")
                window.history.replaceState(null, "", `${pathname}?${p.toString()}`)
              }
              const at = firstOpenMoment(draft as Draft)
              if (at === -1) {
                // Every ticked moment has its answer: straight to the plan.
                finish(draft as Draft)
                return
              }
              setDraft((d) => reachedTo(d as Draft, at + 2))
              go(at + 2)
            })
          }
        >
          {t.continue}
        </PrimaryButton>
        {ticked.length === 0 && <p className="text-sm text-muted-foreground">{t.pickNone}</p>}
        {st.lines.length > 0 && (
          <button
            type="button"
            data-testid="to-plan"
            onClick={() =>
              move(() => {
                const d = draftFromLines(st.lines)
                update((s) => ({ ...s, draft: d }))
                go(totalScreens(d) + 1)
              })
            }
            className="inline-flex min-h-11 items-center justify-center self-center text-sm text-muted-foreground underline"
          >
            {t.toPlan}
          </button>
        )}
        <InfoLine text={EVIDENCE.quitting.text} basis={EVIDENCE.quitting.basis} refs={[...EVIDENCE.quitting.refs]} testId="ev-quitting" />
      </OneQuestion>
    )
  }

  if (!isResult && draft) {
    const i = screen - 2
    const key = draft.ticked[i]
    const choice = draft.choices[key]
    const last = i === draft.ticked.length - 1
    const momentId = key.startsWith("own:") ? null : key
    return (
      <OneQuestion step={screen} total={shownTotal(draft)} onBack={back}>
        <h2 className="text-lg font-semibold">{t.thenTitle}</h2>
        <p data-testid="moment-of" className="text-sm text-muted-foreground">
          {t.momentOf(i + 1, draft.ticked.length)}
        </p>
        <div className="rounded-lg border border-border bg-card p-4">
          <PlanCard label={labelOf(key)} then={choice?.then ?? ""} testId="live-card" />
        </div>
        <Choices
          key={key}
          swaps={swapsOf(momentId)}
          ideas={ideasFor(momentId, ideas)}
          value={choice}
          onChange={(c) =>
            settled() &&
            setDraft((d) => ({
              ...(d as Draft),
              choices: { ...(d as Draft).choices, [key]: c },
            }))
          }
          prefix=""
        />
        <PrimaryButton
          testId={last ? "see-plan" : "then-next"}
          disabled={!thenOk(choice)}
          onClick={() =>
            move(() => {
              if (!last) {
                setDraft((d) => reachedTo(d as Draft, screen + 1))
                go(screen + 1)
                return
              }
              finish(draft)
            })
          }
        >
          {last ? t.makePlan : t.next}
        </PrimaryButton>
        {!thenOk(choice) && <p className="text-sm text-muted-foreground">{t.needThen}</p>}
        {i === 0 && <InfoLine text={EVIDENCE.list.text} basis={EVIDENCE.list.basis} refs={[...EVIDENCE.list.refs]} testId="ev-list" />}
      </OneQuestion>
    )
  }

  // The plan
  const lines = st.lines
  const due = isDue(st.checkin, today) && lines.length > 0
  const rc = reviewCounts(lines, st.reviews)
  const setCheck = (days: number | null) =>
    update((s) => ({
      ...s,
      checkin: days === null ? "" : addDays(today, days),
      reviews: {},
    }))
  const cardInfo = lines.map((l) => ({
    id: l.id,
    label: l.momentId ? labelOf(l.momentId) : l.ownMoment,
    then: l.then,
  }))

  // The print view is its own history entry (?print=1), so browser Back closes it and reload keeps it.
  const printing = sp.get("print") === "1"
  const printHref = (on: boolean) => {
    const p = new URLSearchParams(sp.toString())
    if (on) p.set("print", "1")
    else p.delete("print")
    const q = p.toString()
    return q ? `${pathname}?${q}` : pathname
  }
  const openPrint = () => {
    printPushed.current = true
    window.history.pushState(null, "", printHref(true))
    window.scrollTo?.({ top: 0 })
  }
  const closePrint = () => {
    if (printPushed.current) {
      printPushed.current = false
      window.history.back()
    } else window.history.replaceState(null, "", printHref(false))
    window.scrollTo?.({ top: 0 })
  }
  if (printing) {
    return <PrintView cards={cardInfo} checkText={st.checkin ? dayLabel(st.checkin) : t.printNone} onClose={closePrint} />
  }

  /** The plan is the screen after the last moment: when the draft's moments change, this entry keeps showing the plan. */
  const stayOnPlan = (d: Draft | null) => {
    if (!d) return
    const p = new URLSearchParams(sp.toString())
    p.set("s", String(totalScreens(d) + 1))
    window.history.replaceState(null, "", `${pathname}?${p.toString()}`)
  }
  const remove = (id: string) => {
    const index = lines.findIndex((l) => l.id === id)
    if (index < 0) return
    const line = lines[index]
    const nd = dropFromDraft(st.draft, line)
    setRemoved((r) => addRemoved(r, line, index))
    update((s) => ({ ...s, lines: s.lines.filter((l) => l.id !== id), draft: nd }))
    stayOnPlan(nd)
  }
  const undo = () => {
    const back = removed
    const nd = back.reduce((d, r) => addToDraft(d, r.line), st.draft)
    setRemoved([])
    update((s) => ({
      ...s,
      lines: restore(
        s.lines.filter((l) => !back.some((r) => r.line.id === l.id)),
        back,
      ),
      draft: nd,
    }))
    stayOnPlan(nd)
  }
  const removedNames = removed.map((r) => (r.line.momentId ? labelOf(r.line.momentId) : r.line.ownMoment)).join(", ")

  const chips = (
    <div role="group" aria-label={t.checkTitle} className="flex flex-wrap gap-2">
      {(
        [
          ["check-1w", t.in1, 7],
          ["check-2w", t.in2, 14],
          ["check-none", t.noDate, null],
        ] as const
      ).map(([id, label, days]) => {
        // "No date" is never shown as picked: an empty day is the start, not a choice he made.
        const on = days !== null && st.checkin === addDays(today, days)
        return (
          <button
            key={id}
            type="button"
            data-testid={id}
            aria-pressed={on}
            onClick={() => setCheck(days)}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )

  return (
    <section data-testid="result" className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{t.planTitle}</h2>

      {removed.length > 0 && (
        <div data-testid="removed" role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-1 text-sm">
          <span className="[overflow-wrap:anywhere]">{t.removed(removedNames)}</span>
          <button type="button" data-testid="undo" onClick={undo} className="inline-flex min-h-11 items-center px-2 font-medium text-primary underline">
            {t.undo}
          </button>
        </div>
      )}

      {due && (
        <div data-testid="due-banner" className="rounded-lg border border-primary bg-card p-4">
          <h3 className="text-base font-semibold">{t.dueTitle}</h3>
          <p className="text-sm text-muted-foreground">{t.dueLine}</p>
          {rc.open === 0 && (
            <div className="mt-2 flex flex-col gap-2">
              <p data-testid="due-summary" className="text-sm">
                {t.dueSummary(rc.kept, rc.change, rc.open)}
              </p>
              <p className="text-sm">{t.dueNewLine}</p>
              {chips}
            </div>
          )}
        </div>
      )}

      {lines.length === 0 ? (
        <p data-testid="plan-empty" className="text-sm text-muted-foreground">
          {t.planEmpty}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lines.map((l, i) => (
            <LineCard
              key={l.id}
              line={l}
              label={cardInfo[i].label}
              index={i}
              count={lines.length}
              swaps={swapsOf(l.momentId)}
              ideas={ideasFor(l.momentId, ideas)}
              due={due}
              answer={st.reviews[l.id]}
              onSave={(c: Choice) =>
                update((s) => ({
                  ...s,
                  lines: s.lines.map((q) => (q.id === l.id ? { ...q, then: c.then, from: c.from } : q)),
                }))
              }
              onMove={(dir) => update((s) => ({ ...s, lines: moveLine(s.lines, l.id, dir) }))}
              onRemove={() => remove(l.id)}
              onAnswer={(a) =>
                update((s) => {
                  const reviews = { ...s.reviews }
                  if (a === null) delete reviews[l.id]
                  else reviews[l.id] = a
                  return { ...s, reviews }
                })
              }
            />
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="add-more"
          onClick={() =>
            move(() => {
              const d = draftFromLines(lines, "pick")
              setRemoved([])
              update((s) => ({ ...s, draft: d }))
              go(1)
            })
          }
          className={`${btn} min-h-12`}
        >
          {t.addMore}
        </button>
        {lines.length > 0 && (
          <button type="button" data-testid="print-open" onClick={openPrint} className={`${btn} min-h-12`}>
            {t.print}
          </button>
        )}
      </div>

      {lines.length > 0 && !due && (
        <section data-testid="check-back" className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <h3 className="text-base font-semibold">{t.checkTitle}</h3>
          <p className="text-sm text-muted-foreground">{t.checkLine}</p>
          {chips}
          <p data-testid="check-shown" className="text-sm">
            {st.checkin ? t.checkSet(dayLabel(st.checkin)) : t.checkNone}
          </p>
          <p className="text-sm text-muted-foreground">{t.planNote}</p>
        </section>
      )}

      <div data-testid="used-in" className="flex flex-col gap-1 text-sm text-muted-foreground">
        <p>{t.keptHere}</p>
        <p>
          {t.usedIn}{" "}
          {isLiveTool("sos") ? (
            <Link href={carry(`/quit/${addiction}/sos`)} className="text-primary underline underline-offset-4 [padding-block:0.875rem]">
              {t.usedInSos}
            </Link>
          ) : (
            t.usedInSos
          )}
          {t.usedInEnd}
        </p>
      </div>
      <Link href={carry(`/quit/${addiction}`)} data-testid="to-menu" className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline">
        {t.toMenu}
      </Link>
    </section>
  )
}
