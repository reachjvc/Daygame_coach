"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Chips, ClearAnswers, EvidenceChip, OneQuestion, PrimaryButton, SourceTap, SourcesFold } from "../../components/kit"
import { useQuitStore } from "../../store"
import { fill, tooltext as t } from "../../tooltext"
import type { QuitBelief, QuitNeed, QuitSwap, ToolProps } from "../../types"
import { localDate, realRefs, uniqueRefs, usable } from "../common"
import { topBeliefs, type BeliefsState } from "../beliefs/logic"
import { useCarry, useDoneCount, useScreens, useStartCount, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import { cleanNeeds, EMPTY_GIVES, MAX_NEEDS, needsRating, orderSwaps, preselectNeeds, type GivesState } from "./logic"

/** What it gives you: pick 1 to 3 needs, then three swaps for each. */
export function GivesTool({ addiction, data }: ToolProps) {
  const needs = usable<QuitNeed[]>(data.needs)
  const beliefs = usable<QuitBelief[]>(data.beliefs)
  if (!needs || needs.length === 0) return <NotReady />
  return <Inner addiction={addiction} needs={needs} beliefs={beliefs ?? []} />
}

function Inner({ addiction, needs, beliefs }: { addiction: string; needs: QuitNeed[]; beliefs: QuitBelief[] }) {
  const store = useQuitStore()
  const sp = useSearchParams()
  const carry = useCarry()
  const { state, update, clear } = useToolState<GivesState>(addiction, "gives", EMPTY_GIVES)
  const known = useMemo(() => needs.map((n) => n.id as string), [needs])

  // The needs picked so far; before any choice, the preselection.
  const pre = useMemo(() => {
    const stored = store.get(addiction, "beliefs") as Partial<BeliefsState> | undefined
    const ratings = stored && typeof stored === "object" && stored.ratings ? stored.ratings : {}
    const topNeeds = topBeliefs(ratings, beliefs)
      .map((b) => usable<string>(b.need))
      .filter((n): n is string => n !== null)
    return preselectNeeds(sp.get("need"), topNeeds, known)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, addiction, beliefs, known, sp.get("need")])

  const picked = state ? cleanNeeds(state.picked ?? pre, known) : []
  const total = 1 + picked.length
  const first = (state?.done ?? 0) + 1
  const { screen, go, reset, isResult } = useScreens(first, total)
  const started = useStartCount(addiction, "gives")
  useDoneCount(addiction, "gives", state !== null && isResult)

  if (!state) return null
  const back = screen > 1 ? () => go(screen - 1) : null
  const today = localDate()

  if (screen === 1) {
    return (
      <>
        <OneQuestion step={1} total={total} onBack={null}>
          <p className="font-medium">{t.gives.pickQuestion}</p>
          <Chips
            label={t.gives.pickQuestion}
            max={MAX_NEEDS}
            options={needs.map((n) => ({ id: n.id, label: n.name }))}
            value={picked}
            onChange={(next) => {
              started()
              update((s) => ({ ...s, picked: next }))
            }}
          />
          {picked.length >= MAX_NEEDS && <p className="text-sm text-muted-foreground">{t.gives.pickMax}</p>}
          <PrimaryButton
            testId="gives-continue"
            disabled={picked.length === 0}
            onClick={() => {
              update((s) => ({ ...s, picked, done: Math.max(s.done, 1) }))
              go(2)
            }}
          >
            {t.common.continue}
          </PrimaryButton>
        </OneQuestion>
        <SourcesFold refs={[]} />
      </>
    )
  }

  if (!isResult) {
    const need = needs.find((n) => n.id === picked[screen - 2])
    if (!need) return null
    const quotes = beliefs.filter((b) => usable<string>(b.need) === need.id).map((b) => b.limiting)
    const swaps = orderSwaps(need.swaps, state.rated)
    const last = screen === total
    return (
      <>
        <OneQuestion step={screen} total={total} onBack={back}>
          <h2 className="text-xl font-semibold">{need.name}</h2>
          {quotes.length > 0 && (
            <section>
              <h3 className="text-sm text-muted-foreground">{t.gives.quotesHeading}</h3>
              <ul className="mt-1 flex flex-col gap-1">
                {quotes.map((q) => (
                  <li key={q} className="text-base italic">{`“${q}”`}</li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h3 className="text-sm text-muted-foreground">{t.gives.swapsHeading}</h3>
            <ul className="mt-2 flex flex-col gap-3">
              {swaps.map((s) => (
                <SwapRow
                  key={s.id}
                  swap={s}
                  triedOn={state.tried[s.id]?.triedOn}
                  rating={state.rated[s.id]}
                  today={today}
                  onTry={() => {
                    started()
                    update((st) => ({ ...st, tried: { ...st.tried, [s.id]: { swapId: s.id, triedOn: today } } }))
                  }}
                  onSave={(pct) => update((st) => ({ ...st, rated: { ...st.rated, [s.id]: pct } }))}
                />
              ))}
            </ul>
          </section>
          <PrimaryButton testId="gives-next" onClick={() => {
              update((s) => ({ ...s, done: Math.max(s.done, screen) }))
              go(screen + 1)
            }}>
            {last ? t.gives.finish : t.gives.nextNeed}
          </PrimaryButton>
        </OneQuestion>
        <SourcesFold refs={uniqueRefs(swaps.flatMap((s) => realRefs(s.refs)))} />
      </>
    )
  }

  const chosen = picked
    .flatMap((id) => needs.find((n) => n.id === id)?.swaps ?? [])
    .filter((s) => state.tried[s.id])
  return (
    <div data-testid="result" className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{t.gives.resultHeading}</h2>
      {chosen.length === 0 ? (
        <p className="text-muted-foreground">{t.gives.emptyResult}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {chosen.map((s) => (
            <li key={s.id} className="rounded-md border border-border bg-card px-3 py-2">
              {s.text}
            </li>
          ))}
        </ul>
      )}
      <Link href={carry(`/quit/${addiction}`)} className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground">
        {t.gives.toMenu}
      </Link>
      <ClearAnswers
        onClear={() => {
          clear()
          reset()
        }}
      />
      <SourcesFold refs={uniqueRefs(chosen.flatMap((s) => realRefs(s.refs)))} />
    </div>
  )
}

interface SwapRowProps {
  swap: QuitSwap
  triedOn: string | undefined
  rating: number | undefined
  today: string
  onTry: () => void
  onSave: (pct: number) => void
}

function SwapRow({ swap, triedOn, rating, today, onTry, onSave }: SwapRowProps) {
  const [value, setValue] = useState(rating ?? 50)
  const showSlider = needsRating(triedOn, today)
  return (
    <li data-testid="swap" data-swap={swap.id} className="rounded-lg border border-border bg-card p-3">
      <p className="text-base">{swap.text}</p>
      <div className="mt-1">
        <EvidenceChip evidence={swap.evidence} />
      </div>
      <SourceTap refs={realRefs(swap.refs)} />
      {triedOn === undefined ? (
        <button type="button" data-testid="try-swap" onClick={onTry} className="mt-2 inline-flex min-h-11 items-center rounded-md border border-primary px-3 text-primary">
          {t.gives.tryIt}
        </button>
      ) : (
        <p className="mt-2 text-sm text-primary">{t.gives.tried}</p>
      )}
      {showSlider && (
        <div className="mt-2 flex flex-col gap-2">
          <label className="text-sm" htmlFor={`rate-${swap.id}`}>
            {t.gives.rateQuestion}
          </label>
          <input
            id={`rate-${swap.id}`}
            data-testid="rate-slider"
            type="range"
            min={0}
            max={100}
            step={10}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="h-11 w-full"
          />
          <p className="text-sm tabular-nums">{fill(t.gives.ratingValue, { n: value })}</p>
          <button type="button" data-testid="rate-save" onClick={() => onSave(value)} className="inline-flex min-h-11 items-center self-start rounded-md border border-border px-3">
            {t.gives.save}
          </button>
          {rating !== undefined && <p className="text-sm text-muted-foreground">{fill(t.gives.saved, { n: rating })}</p>}
        </div>
      )}
    </li>
  )
}
