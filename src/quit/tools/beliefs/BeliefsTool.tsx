"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { CountedLine, OneQuestion, PrimaryButton, SourcesFold } from "../../components/kit"
import { tooltext as t } from "../../tooltext"
import type { QuitBand, QuitBelief, QuitFact, QuitNeed, ToolProps } from "../../types"
import { realRefs, usable } from "../common"
import { useDoneCount, useScreens, useStartCount, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import { BeliefBasis } from "./BeliefBasis"
import { BeliefsResult } from "./BeliefsResult"
import {
  EMPTY_FULL,
  answerFact,
  deleteResult,
  dropDraft,
  finish,
  firstUnansweredScreen,
  hasAnswers,
  parseFull,
  questionNumber,
  rate,
  screensFor,
  startRetake,
  type BeliefsFull,
  type CanStop,
  CAN_STOP,
} from "./flow"

/** The 12 lies test: 12 ratings (a reply after each 4 or 5), 3 facts, "can you stop?", then the result. */
export function BeliefsTool({ addiction, data, present }: ToolProps) {
  const beliefs = usable<QuitBelief[]>(data.beliefs)
  const facts = usable<QuitFact[]>(data.facts)
  const bands = usable<QuitBand[]>(data.bands)
  const needs = usable<QuitNeed[]>(data.needs)
  const ok =
    beliefs !== null && beliefs.length > 0 && facts !== null && bands !== null && needs !== null &&
    beliefs.every((b) => usable<string>(b.scene) !== null && usable<string>(b.short) !== null)
  if (!ok) return <NotReady />
  return <Inner addiction={addiction} present={present} beliefs={beliefs} facts={facts} bands={bands} needs={needs} />
}

interface InnerProps {
  addiction: string
  /** Present mode is zoomed, so the question is drawn tighter to keep all five answers on one screen. */
  present: boolean
  beliefs: QuitBelief[]
  facts: QuitFact[]
  bands: QuitBand[]
  needs: QuitNeed[]
}

const RATING_WORDS = t.beliefs.ratings

function Inner({ addiction, present, beliefs, facts, bands, needs }: InnerProps) {
  const ids = useMemo(() => beliefs.map((b) => b.id), [beliefs])
  const parse = useCallback((x: unknown) => parseFull(x, ids), [ids])
  const { state, update, clear } = useToolState<BeliefsFull>(addiction, "beliefs", EMPTY_FULL, parse)
  const started = useStartCount(addiction, "beliefs")
  // A tap within 250 ms of a move is ignored, so a double tap moves one screen and saves one answer.
  const lastMove = useRef(0)
  const [confirmStop, setConfirmStop] = useState(false)

  const draft = state?.draft ?? null
  const results = state?.results ?? []
  const list = screensFor(draft?.ratings ?? {}, beliefs, facts.length)
  const total = list.length
  const showResult = state !== null && draft === null && results.length > 0
  const first = !state ? 1 : draft ? firstUnansweredScreen(draft, beliefs, facts) : results.length > 0 ? total + 1 : 1
  const { screen, go, back: goBack, reset } = useScreens(first, total, state !== null)
  useDoneCount(addiction, "beliefs", showResult)

  if (!state) return null

  const move = (fn: () => void) => {
    const now = Date.now()
    if (now - lastMove.current < 250) return
    lastMove.current = now
    fn()
  }
  const now = () => new Date().toISOString()

  if (showResult) {
    return (
      <BeliefsResult
        addiction={addiction}
        beliefs={beliefs}
        facts={facts}
        bands={bands}
        needs={needs}
        results={results}
        onRetake={() =>
          move(() => {
            update((s) => startRetake(s, now()))
            go(1)
          })
        }
        onDelete={(i) => update((s) => deleteResult(s, i))}
        onClear={() => {
          clear()
          reset()
        }}
      />
    )
  }

  const here = Math.min(screen, total)
  const cur = list[here - 1]
  const qn = questionNumber(list, here)
  const qTotal = beliefs.length + facts.length + 1
  const back = here > 1 ? goBack : null
  const retaking = results.length > 0

  const stop = () => {
    update(dropDraft)
    setConfirmStop(false)
    reset()
  }
  const stopControl = retaking && (
    <div className="mt-2">
      {!confirmStop ? (
        <button
          type="button"
          data-testid="stop-retake"
          onClick={() => (hasAnswers(draft) ? setConfirmStop(true) : stop())}
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline"
        >
          {t.beliefs.stopKeep}
        </button>
      ) : (
        <div data-testid="stop-confirm" role="alertdialog" aria-label={t.beliefs.stopAsk} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
          <p>{t.beliefs.stopAsk}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" data-testid="stop-yes" onClick={stop} className="min-h-12 rounded-md border border-border">
              {t.beliefs.stopYes}
            </button>
            <button type="button" data-testid="stop-no" onClick={() => setConfirmStop(false)} className="min-h-12 rounded-md bg-primary text-primary-foreground">
              {t.beliefs.keepGoing}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  if (cur.kind === "q" || cur.kind === "reply") {
    const b = beliefs[cur.i]
    if (cur.kind === "reply") {
      return (
        <>
          <OneQuestion step={qn} total={qTotal} onBack={back}>
            <section data-testid="reply" className="flex flex-col gap-2">
              <h2 className="text-sm text-muted-foreground">{t.beliefs.replyTitle}</h2>
              <p data-testid="reply-counterpart" className="text-xl font-medium leading-snug">
                {b.counterpart}
              </p>
              <p data-testid="reply-proof">{b.proof}</p>
              <CountedLine text={b.counted} />
              <BeliefBasis item={b} />
              <div className="mt-3">
                <PrimaryButton testId="reply-next" onClick={() => move(() => go(here + 1))}>
                  {t.common.continue}
                </PrimaryButton>
              </div>
            </section>
          </OneQuestion>
          {stopControl}
          <SourcesFold refs={realRefs(b.refs)} />
        </>
      )
    }
    const current = draft?.ratings[b.id]
    return (
      <>
        <OneQuestion step={qn} total={qTotal} onBack={back} showStep>
          <p data-testid="scene" className={`text-muted-foreground ${present ? "text-xs leading-snug" : "text-sm"}`}>
            {usable<string>(b.scene)}
          </p>
          <blockquote data-testid="limiting" className={`font-medium leading-snug ${present ? "text-lg" : "text-2xl"}`}>{`“${b.limiting}”`}</blockquote>
          <p className={`font-medium ${present ? "-mb-1 text-sm" : ""}`}>{t.beliefs.rateQuestion}</p>
          <div role="radiogroup" aria-label={t.beliefs.rateQuestion} className={`flex flex-col ${present ? "gap-1" : "gap-2"}`}>
            {RATING_WORDS.map((label, i) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={current === i + 1}
                data-testid={`rate-${i + 1}`}
                onClick={() =>
                  move(() => {
                    started()
                    const at = now()
                    update((s) => rate(s, b.id, i + 1, at))
                    // the next screen is worked out from the new ratings: a 4 or 5 adds a reply screen after this one
                    const next = screensFor({ ...(draft?.ratings ?? {}), [b.id]: i + 1 }, beliefs, facts.length)
                    go(next.findIndex((x) => x.kind === "q" && x.i === cur.i) + 2)
                  })
                }
                className={`rounded-md border px-4 text-left text-base ${present ? "min-h-11" : "min-h-12"} ${current === i + 1 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </OneQuestion>
        {stopControl}
      </>
    )
  }

  if (cur.kind === "fact") {
    const f = facts[cur.i]
    const answered = draft?.facts[f.id]
    return (
      <>
        <OneQuestion step={qn} total={qTotal} onBack={back} showStep>
          <p data-testid="fact-statement" className="rounded-lg border border-border bg-card p-4 text-lg leading-snug">
            {f.statement}
          </p>
          {typeof answered !== "boolean" ? (
            <div className="grid grid-cols-2 gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  data-testid={v ? "fact-true" : "fact-false"}
                  onClick={() =>
                    move(() => {
                      started()
                      const at = now()
                      update((s) => answerFact(s, f.id, v, at))
                    })
                  }
                  className="min-h-12 rounded-md border border-border bg-card text-base"
                >
                  {v ? t.beliefs.factTrue : t.beliefs.factFalse}
                </button>
              ))}
            </div>
          ) : (
            <div data-testid="fact-answer" className="flex flex-col gap-1">
              <p className="font-semibold">{answered === f.answer ? t.beliefs.factRight : t.beliefs.factWrong}</p>
              <p>{f.explain}</p>
              <CountedLine text={f.counted} />
              <BeliefBasis item={f} caveat={false} />
              <div className="mt-3">
                <PrimaryButton testId="fact-next" onClick={() => move(() => go(here + 1))}>
                  {t.common.next}
                </PrimaryButton>
              </div>
            </div>
          )}
        </OneQuestion>
        {stopControl}
        <SourcesFold refs={typeof answered === "boolean" ? realRefs(f.refs) : []} />
      </>
    )
  }

  return (
    <>
      <OneQuestion step={qn} total={qTotal} onBack={back} showStep>
        <h2 data-testid="canstop-question" className="text-2xl font-medium leading-snug">
          {t.beliefs.canStopQuestion}
        </h2>
        <div className="flex flex-col gap-2">
          {CAN_STOP.map((c: CanStop) => (
            <button
              key={c}
              type="button"
              data-testid={`canstop-${c}`}
              onClick={() =>
                move(() => {
                  const at = now()
                  update((s) => finish(s, c, at))
                  reset()
                })
              }
              className="min-h-12 rounded-md border border-border bg-card px-4 text-left text-base"
            >
              {t.beliefs.canStopOptions[c]}
            </button>
          ))}
        </div>
      </OneQuestion>
      {stopControl}
    </>
  )
}
