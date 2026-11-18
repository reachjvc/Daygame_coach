"use client"

import { useMemo } from "react"
import { NumberCard } from "../../components/NumberCard"
import { Chips, ClearAnswers, OneQuestion, PrimaryButton, SourcesFold, Stepper } from "../../components/kit"
import { fill, tooltext as t } from "../../tooltext"
import type { QuitEnding, QuitNumber, QuitOption, QuitPlanStep, ToolProps } from "../../types"
import { uniqueRefs, usable } from "../common"
import { useDoneCount, useScreens, useStartCount, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import {
  AFTER_SLIP,
  buildResult,
  EMPTY_PAST,
  firstScreenComplete,
  firstUnanswered,
  LAST_ENDED,
  MAX_ENDINGS,
  slipLine,
  STRETCH_UNITS,
  totalScreens,
  TRIES,
  type PastState,
} from "./logic"

/** Your past attempts: what ended each try and what helped. */
export function PastTool({ addiction, data }: ToolProps) {
  const endings = usable<QuitEnding[]>(data.endings)
  const helped = usable<QuitOption[]>(data.helped)
  if (!endings || !helped) return <NotReady />
  const numbers = usable<QuitNumber[]>(data.numbers) ?? []
  return (
    <Inner
      addiction={addiction}
      endings={endings}
      helped={helped}
      tries={numbers.find((n) => n.kind === "how-tries") ?? null}
      planSteps={usable<QuitPlanStep[]>(data.planSteps)}
    />
  )
}

interface InnerProps {
  addiction: string
  endings: QuitEnding[]
  helped: QuitOption[]
  tries: QuitNumber | null
  planSteps: QuitPlanStep[] | null
}

function Inner({ addiction, endings, helped, tries, planSteps }: InnerProps) {
  const { state, update, clear } = useToolState<PastState>(addiction, "past", EMPTY_PAST)
  const total = totalScreens(state?.tries ?? null)
  const first = state ? firstUnanswered(state) : 1
  const { screen, go, back: goBack, reset, isResult } = useScreens(first, total)
  const started = useStartCount(addiction, "past")
  useDoneCount(addiction, "past", state !== null && isResult)
  const slip = useMemo(() => slipLine(planSteps), [planSteps])

  if (!state) return null
  const back = screen > 1 ? goBack : null

  const pass = (patch: Partial<PastState> = {}, last = false) => {
    update((s) => {
      const next = { ...s, ...patch, done: Math.max(s.done, screen) }
      return last || (screen === 1 && next.tries === "0") ? { ...next, result: buildResult(next) } : next
    })
    go(screen + 1)
  }

  if (isResult) {
    const r = state.result ?? buildResult(state)
    const risky = r.riskyEndings.map((id) => endings.find((e) => e.id === id)?.label).filter((x): x is string => !!x)
    const keep = r.keep.map((id) => helped.find((h) => h.id === id)?.label).filter((x): x is string => !!x)
    return (
      <div data-testid="result" className="flex flex-col gap-6">
        {state.tries === "0" && <p className="text-muted-foreground">{t.past.noTries}</p>}
        {tries && <NumberCard n={tries} />}
        {r.longestDays !== null && (
          <section data-testid="longest" className="rounded-lg border border-border bg-card p-4">
            <p className="text-lg font-semibold">{fill(t.past.longestEnded, { n: r.longestDays })}</p>
            {r.dangerWindow && <p className="mt-1">{fill(t.past.window, r.dangerWindow)}</p>}
          </section>
        )}
        {risky.length > 0 && (
          <section data-testid="risky">
            <h2 className="text-lg font-semibold">{t.past.riskyHeading}</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {risky.map((l) => (
                <li key={l} className="rounded-md border border-border bg-card px-3 py-2">
                  {l}
                </li>
              ))}
            </ul>
          </section>
        )}
        {keep.length > 0 && (
          <section data-testid="keep">
            <h2 className="text-lg font-semibold">{t.past.keepHeading}</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {keep.map((l) => (
                <li key={l} className="rounded-md border border-border bg-card px-3 py-2">
                  {l}
                </li>
              ))}
            </ul>
          </section>
        )}
        {state.afterSlip === "gaveUp" && slip && (
          <p data-testid="slip-line" className="rounded-lg border border-primary p-4 text-base font-medium">
            {slip}
          </p>
        )}
        <ClearAnswers
          onClear={() => {
            clear()
            reset()
          }}
        />
        <SourcesFold refs={tries ? uniqueRefs([tries.ref, ...(tries.alsoRef ?? [])]) : []} />
      </div>
    )
  }

  if (screen === 1) {
    return (
      <>
        <OneQuestion step={1} total={total} onBack={null}>
          <p className="font-medium">{t.past.triesQuestion}</p>
          <Chips
            label={t.past.triesQuestion}
            options={TRIES.map((id) => ({ id, label: t.past.tries[id] }))}
            value={state.tries ? [state.tries] : []}
            onChange={([id]) => {
              started()
              update((s) => ({ ...s, tries: id as PastState["tries"] }))
            }}
          />
          {state.tries !== null && state.tries !== "0" && (
            <>
              <p className="mt-2 font-medium">{t.past.stretchQuestion}</p>
              <Stepper
                label={t.past.stretchQuestion}
                value={state.stretchN}
                min={1}
                max={99}
                onChange={(n) => update((s) => ({ ...s, stretchN: n }))}
              />
              <Chips
                label={t.past.stretchQuestion}
                options={STRETCH_UNITS.map((id) => ({ id, label: t.past.stretchUnits[id] }))}
                value={state.stretchUnit ? [state.stretchUnit] : []}
                onChange={([id]) => update((s) => ({ ...s, stretchUnit: id as PastState["stretchUnit"] }))}
              />
              <p className="mt-2 font-medium">{t.past.lastQuestion}</p>
              <Chips
                label={t.past.lastQuestion}
                options={LAST_ENDED.map((id) => ({ id, label: t.past.lastEnded[id] }))}
                value={state.lastEnded ? [state.lastEnded] : []}
                onChange={([id]) => update((s) => ({ ...s, lastEnded: id as PastState["lastEnded"] }))}
              />
            </>
          )}
          <PrimaryButton testId="past-continue" disabled={!firstScreenComplete(state)} onClick={() => pass()}>
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
        <OneQuestion step={2} total={total} onBack={back}>
          <p className="font-medium">{t.past.endingsQuestion}</p>
          <Chips
            label={t.past.endingsQuestion}
            max={MAX_ENDINGS}
            options={endings.map((e) => ({ id: e.id, label: e.label }))}
            value={state.endings}
            onChange={(next) => update((s) => ({ ...s, endings: next }))}
          />
          <PrimaryButton testId="past-continue" onClick={() => pass()}>
            {t.common.continue}
          </PrimaryButton>
        </OneQuestion>
        <SourcesFold refs={[]} />
      </>
    )
  }

  if (screen === 3) {
    return (
      <>
        <OneQuestion step={3} total={total} onBack={back}>
          <p className="font-medium">{t.past.helpedQuestion}</p>
          <Chips
            label={t.past.helpedQuestion}
            max={helped.length}
            options={helped.map((h) => ({ id: h.id, label: h.label }))}
            value={state.helped}
            onChange={(next) => update((s) => ({ ...s, helped: next }))}
          />
          <PrimaryButton testId="past-continue" onClick={() => pass()}>
            {t.common.continue}
          </PrimaryButton>
        </OneQuestion>
        <SourcesFold refs={[]} />
      </>
    )
  }

  return (
    <>
      <OneQuestion step={4} total={total} onBack={back}>
        <p className="font-medium">{t.past.slipQuestion}</p>
        <Chips
          label={t.past.slipQuestion}
          options={AFTER_SLIP.map((id) => ({ id, label: t.past.slip[id] }))}
          value={state.afterSlip ? [state.afterSlip] : []}
          onChange={([id]) => update((s) => ({ ...s, afterSlip: id as PastState["afterSlip"] }))}
        />
        <PrimaryButton testId="past-continue" disabled={state.afterSlip === null} onClick={() => pass({}, true)}>
          {t.common.done}
        </PrimaryButton>
      </OneQuestion>
      <SourcesFold refs={[]} />
    </>
  )
}
