"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { BlackBoxBridge } from "../../components/BlackBoxBridge"
import { Chips, ClearAnswers, OneQuestion, PrimaryButton, SourcesFold } from "../../components/kit"
import { nowInBrowser, useSignedIn, type QuitBlackBoxApi } from "../../blackbox"
import { endingForEnding, reportAt, shiftDay, slipDay, slipThought } from "../../blackboxLogic"
import { ROUTES } from "@/src/shared/routes"
import { useQuitStore } from "../../store"
import { fill, tooltext as t } from "../../tooltext"
import type { QuitBelief, QuitEnding, QuitNeed, QuitPlanStep, ToolProps } from "../../types"
import { localDate, usable } from "../common"
import { parseBeliefs, topBeliefs } from "../beliefs/logic"
import { parseGives } from "../gives/logic"
import { useCarry, useDoneCount, useScreens, useStartCount, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import { EMPTY_SLIP, firstUnanswered, keepLine, MAX_OWN, OTHER, parseSlip, SLIP_WHEN, type SlipState } from "./logic"

/** Slipped? Three taps, then back through steps 1 to 3 with a new day 1. */
export function SlipTool({ addiction, data }: ToolProps) {
  const beliefs = usable<QuitBelief[]>(data.beliefs)
  const endings = usable<QuitEnding[]>(data.endings)
  if (!beliefs || !endings) return <NotReady />
  return (
    <Inner
      addiction={addiction}
      beliefs={beliefs}
      endings={endings}
      needs={usable<QuitNeed[]>(data.needs) ?? []}
      planSteps={usable<QuitPlanStep[]>(data.planSteps)}
    />
  )
}

interface InnerProps {
  addiction: string
  beliefs: QuitBelief[]
  endings: QuitEnding[]
  needs: QuitNeed[]
  planSteps: QuitPlanStep[] | null
}

function Inner(props: InnerProps) {
  const signedIn = useSignedIn()
  const [bb, setBb] = useState<QuitBlackBoxApi | null>(null)
  const onApi = useCallback((api: QuitBlackBoxApi | null) => setBb(api), [])
  // The Black Box bridge sits at one fixed place, so moving between screens never remounts it.
  return (
    <>
      {signedIn ? <BlackBoxBridge viceId={props.addiction} onApi={onApi} /> : null}
      <Screens {...props} signedIn={signedIn} bb={bb} />
    </>
  )
}

function Screens({ addiction, beliefs, endings, needs, planSteps, signedIn, bb }: InnerProps & { signedIn: boolean | null; bb: QuitBlackBoxApi | null }) {
  const store = useQuitStore()
  const carry = useCarry()
  const { state, update, clear } = useToolState<SlipState>(addiction, "slip", EMPTY_SLIP, parseSlip)
  const [undone, setUndone] = useState(false)
  const [refused, setRefused] = useState(false)
  const [datedToday, setDatedToday] = useState(false)
  // One tap on Continue per visit to the last question: a double tap files one lapse.
  const filing = useRef(false)

  const first = state ? firstUnanswered(state) : 1
  const { screen, go, back: goBack, reset, isResult } = useScreens(first, 3, state !== null)
  const started = useStartCount(addiction, "slip")
  useDoneCount(addiction, "slip", state !== null && isResult)

  useEffect(() => {
    if (screen !== 3) filing.current = false
  }, [screen])

  // A signed-in visitor waits the moment it takes the Black Box to load before filing or undoing.
  const bbLoading = signedIn === null || (signedIn && !(bb && bb.ready))
  if (!state) return null
  const back = screen > 1 ? goBack : null

  const pass = (patch: Partial<SlipState> = {}) => {
    update((s) => ({ ...s, ...patch, done: Math.max(s.done, screen) }))
    go(screen + 1)
  }

  if (screen === 1) {
    return (
      <>
        <OneQuestion step={1} total={3} onBack={null}>
          <p className="font-medium">{t.slip.whenQuestion}</p>
          <Chips
            label={t.slip.whenQuestion}
            options={SLIP_WHEN.map((w) => ({ id: w, label: t.slip.when[w] }))}
            value={state.when ? [state.when] : []}
            onChange={(next) => {
              started()
              update((s) => ({ ...s, when: next[0] as SlipState["when"] }))
            }}
          />
          <PrimaryButton testId="slip-continue" disabled={state.when === null} onClick={() => pass()}>
            {t.common.continue}
          </PrimaryButton>
        </OneQuestion>
        <SourcesFold refs={[]} />
      </>
    )
  }

  if (screen === 2) {
    return (
      <>
        <OneQuestion step={2} total={3} onBack={back}>
          <p className="font-medium">{t.slip.wentQuestion}</p>
          <Chips
            label={t.slip.wentQuestion}
            options={endings.map((e) => ({ id: e.id, label: e.label }))}
            value={state.ending ? [state.ending] : []}
            onChange={(next) => update((s) => ({ ...s, ending: next[0] }))}
          />
          <PrimaryButton testId="slip-continue" disabled={state.ending === null} onClick={() => pass()}>
            {t.common.continue}
          </PrimaryButton>
        </OneQuestion>
        <SourcesFold refs={[]} />
      </>
    )
  }

  if (screen === 3) {
    const options = [
      ...beliefs.map((b) => ({ id: b.id, label: usable<string>(b.short) ?? b.id })),
      { id: OTHER, label: t.slip.somethingElse },
    ]
    const finish = () => {
      if (filing.current) return
      filing.current = true
      let reportId: string | null = null
      let failed = false
      let moved = false
      // A lapse already filed from this run and not taken back is not filed twice.
      if (bb && bb.run && state.when && !(state.reportId !== null && bb.has(state.reportId))) {
        const today = localDate()
        moved = bb.run.startedOn === today && slipDay(state.when, today) < today
        const told = beliefs.find((b) => b.id === state.told)
        reportId = bb.fileSlip({
          at: reportAt(slipDay(state.when, today), today, nowInBrowser()),
          thought: slipThought(told ? usable<string>(told.short) : null, state.ownWords),
          ending: endingForEnding(state.ending, endings),
        })
        failed = reportId === null
      }
      setRefused(failed)
      setDatedToday(moved && !failed)
      setUndone(false)
      pass(reportId === null && state.reportId !== null && bb?.has(state.reportId) ? {} : { reportId })
    }
    return (
      <>
        <OneQuestion step={3} total={3} onBack={back}>
          <p className="font-medium">{t.slip.toldQuestion}</p>
          <Chips
            label={t.slip.toldQuestion}
            options={options}
            value={state.told ? [state.told] : []}
            onChange={(next) => update((s) => ({ ...s, told: next[0] }))}
          />
          {state.told === OTHER && (
            <input
              type="text"
              data-testid="slip-own"
              maxLength={MAX_OWN}
              aria-label={t.slip.ownWords}
              value={state.ownWords}
              onChange={(e) => update((s) => ({ ...s, ownWords: e.target.value.slice(0, MAX_OWN) }))}
              className="min-h-12 w-full rounded-md border border-border bg-card px-3 text-base"
            />
          )}
          <PrimaryButton testId="slip-finish" disabled={state.told === null || bbLoading} onClick={finish}>
            {t.common.continue}
          </PrimaryButton>
        </OneQuestion>
        <SourcesFold refs={[]} />
      </>
    )
  }

  const top = topBeliefs(parseBeliefs(store.get(addiction, "beliefs")).ratings, beliefs)
  const tried = parseGives(store.get(addiction, "gives")).tried
  const swaps = needs.flatMap((n) => n.swaps).filter((s) => tried[s.id])
  const today = localDate()
  // The date is fixed when the reader chooses; an older save without one falls back to the choice read today.
  const day1 = state.newDay1On ?? (state.newDay1 === "today" ? today : state.newDay1 === "tomorrow" ? shiftDay(today, 1) : null)
  const keep = keepLine(planSteps)
  const filed = state.reportId !== null && !undone

  return (
    <div data-testid="result" className="flex flex-col gap-5">
      {filed && (
        <div data-testid="slip-saved" className="rounded-lg border border-primary p-4">
          <p data-testid="slip-saved-text" className="font-medium">
            {state.reportId && bb ? (bb.status(state.reportId) === "saved" ? t.slip.saved : bb.status(state.reportId) === "local" ? t.blackbox.localOnly : t.blackbox.saving) : t.blackbox.saving}
          </p>
          {datedToday && (
            <p data-testid="slip-dated-today" className="mt-1 text-sm">
              {t.slip.datedToday}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-4">
            <button
              type="button"
              data-testid="slip-undo"
              disabled={bbLoading}
              onClick={() => {
                if (bb && state.reportId && bb.undo(state.reportId)) {
                  setUndone(true)
                  update((s) => ({ ...s, reportId: null }))
                }
              }}
              className="inline-flex min-h-11 items-center text-primary underline disabled:opacity-40"
            >
              {t.blackbox.undo}
            </button>
            <Link href={ROUTES.quitVice} data-testid="slip-new-run" className="inline-flex min-h-11 items-center text-primary underline">
              {t.slip.startNew}
            </Link>
          </div>
        </div>
      )}
      {undone && <p data-testid="slip-undone">{t.blackbox.undone}</p>}
      {refused && <p>{t.blackbox.notSaved}</p>}
      {!filed && !undone && !refused && signedIn === true && bb && !bb.run && (
        <Link href={ROUTES.quitVice} data-testid="slip-keep-record" className="inline-flex min-h-11 items-center text-primary underline">
          {t.blackbox.keepRecord}
        </Link>
      )}
      <h2 className="text-lg font-semibold">{t.slip.resultHeading}</h2>
      <section data-testid="slip-step1">
        <h3 className="text-sm text-muted-foreground">{`1. ${t.slip.step1}`}</h3>
        {top.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-2">
            {top.map((b) => (
              <li key={b.id} className="rounded-md border border-border bg-card px-3 py-2">
                {b.counterpart}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1">
            {t.slip.step1None}{" "}
            <Link href={carry(`/quit/${addiction}/beliefs`)} className="text-primary underline">
              {t.slip.step1Link}
            </Link>
          </p>
        )}
      </section>
      <section data-testid="slip-step2">
        <h3 className="text-sm text-muted-foreground">{`2. ${t.slip.step2}`}</h3>
        {swaps.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-2">
            {swaps.map((s) => (
              <li key={s.id} className="rounded-md border border-border bg-card px-3 py-2">
                {s.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1">
            {t.slip.step2None}{" "}
            <Link href={carry(`/quit/${addiction}/gives`)} className="text-primary underline">
              {t.slip.step2Link}
            </Link>
          </p>
        )}
      </section>
      <section data-testid="slip-step3">
        <h3 className="text-sm text-muted-foreground">{`3. ${t.slip.step3}`}</h3>
        <div className="mt-2">
          <Chips
            label={t.slip.step3}
            options={[
              { id: "today", label: t.slip.day1Today },
              { id: "tomorrow", label: t.slip.day1Tomorrow },
            ]}
            value={state.newDay1 ? [state.newDay1] : []}
            onChange={(next) =>
              update((s) => ({
                ...s,
                newDay1: next[0] as SlipState["newDay1"],
                newDay1On: next[0] === "tomorrow" ? shiftDay(localDate(), 1) : localDate(),
              }))
            }
          />
        </div>
        {day1 && (
          <p data-testid="slip-day1" className="mt-2 font-medium">
            {fill(t.slip.day1Set, { day: day1 })}
          </p>
        )}
      </section>
      {keep && (
        <p data-testid="slip-keep" className="text-lg font-medium">
          {keep}
        </p>
      )}
      <Link href={carry(`/quit/${addiction}`)} className="inline-flex min-h-11 items-center text-primary underline">
        {t.slip.toMenu}
      </Link>
      <ClearAnswers
        onClear={() => {
          clear()
          reset()
          setUndone(false)
          setRefused(false)
          setDatedToday(false)
        }}
      />
      <SourcesFold refs={[]} />
    </div>
  )
}
