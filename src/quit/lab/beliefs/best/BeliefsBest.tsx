"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getAddiction } from "../../../data"
import { CountedLine, PrimaryButton, SourceTap } from "../../../components/kit"
import { fill, tooltext as tt } from "../../../tooltext"
import { isFreePlanLink, localDate, realRefs, usable } from "../../../tools/common"
import { useCarry } from "../../../tools/hooks"
import type { QuitAddictionId, QuitBand, QuitBelief, QuitNeed } from "../../../types"
import type { LabProps } from "../../registry"
import { useLabState } from "../../store"
import {
  CAN_STOP,
  addResult,
  fearCandidates,
  freshDraft,
  parseResults,
  summarize,
  toResult,
  toggleFear,
  totalSteps,
  wantsReply,
  type BeliefResult,
  type Draft,
} from "./logic"
import { bestText as t } from "./text"

const SWITCH_IDS = ["nicotine", "alcohol", "weed", "porn"] as const satisfies readonly QuitAddictionId[]

const fmtDay = (key: string) => new Date(`${key}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

/** Improved Belief test: no gate, one belief a screen, a reply to each agreed one, fears, one last question, the result on the page. */
export function BeliefsBest({ addiction: initial }: LabProps) {
  const [chosen, setChosen] = useLabState<string>("beliefs", "best", "addiction", initial)
  const id: QuitAddictionId = (SWITCH_IDS as readonly string[]).includes(chosen) ? (chosen as QuitAddictionId) : "nicotine"
  return (
    <div data-testid="beliefs-best" className="flex flex-col gap-4">
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
      <Flow key={id} id={id} />
    </div>
  )
}

function Flow({ id }: { id: QuitAddictionId }) {
  const data = getAddiction(id)
  const beliefs = usable<QuitBelief[]>(data?.beliefs)
  const bands = usable<QuitBand[]>(data?.bands)
  const needs = usable<QuitNeed[]>(data?.needs)
  const ok =
    beliefs !== null && beliefs.length > 0 && bands !== null && needs !== null &&
    beliefs.every((b) => usable<string>(b.scene) !== null && usable<string>(b.short) !== null && usable<string>(b.test) !== null && usable<string>(b.need) !== null)
  if (!ok) return <p data-testid="content-coming" className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">{t.contentComing}</p>
  return <Test id={id} beliefs={beliefs} bands={bands} needs={needs} />
}

function Test({ id, beliefs, bands, needs }: { id: QuitAddictionId; beliefs: QuitBelief[]; bands: QuitBand[]; needs: QuitNeed[] }) {
  const [draft, setDraft] = useLabState<Draft | null>("beliefs", "best", `draft-${id}`, null)
  const [saved, setSaved] = useLabState<unknown>("beliefs", "best", `results-${id}`, [])
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  const results = parseResults(saved)
  if (draft === null && results.length > 0) {
    return <Result id={id} beliefs={beliefs} bands={bands} needs={needs} results={results} onAgain={() => setDraft(freshDraft())} />
  }
  const d = draft ?? freshDraft()
  const total = totalSteps(beliefs.length)
  const set = (p: Partial<Draft>) => setDraft({ ...d, ...p })
  const back = () => {
    if (d.reply) return set({ reply: false })
    if (d.step > 1) set({ step: d.step - 1 })
  }
  const finish = (canStop: Draft["canStop"]) => {
    const done = { ...d, canStop }
    setSaved(addResult(results, toResult(done, localDate())))
    setDraft(null)
  }

  return (
    <section data-testid="question" data-step={d.step} className="flex flex-col gap-4">
      <div
        role="progressbar"
        aria-label={fill(tt.common.stepLabel, { n: d.step, total })}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={d.step}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full bg-primary" style={{ width: `${(d.step / total) * 100}%` }} />
      </div>
      {d.step <= beliefs.length && !d.reply && (
        <BeliefQuestion
          b={beliefs[d.step - 1]}
          current={d.ratings[beliefs[d.step - 1].id]}
          onPick={(r) => {
            const ratings = { ...d.ratings, [beliefs[d.step - 1].id]: r }
            if (wantsReply(r)) set({ ratings, reply: true })
            else set({ ratings, reply: false, step: d.step + 1 })
          }}
        />
      )}
      {d.step <= beliefs.length && d.reply && (
        <Reply b={beliefs[d.step - 1]} onNext={() => set({ reply: false, step: d.step + 1 })} />
      )}
      {d.step === beliefs.length + 1 && (
        <Fears beliefs={beliefs} d={d} onChange={(p) => set(p)} onNext={() => set({ step: d.step + 1 })} />
      )}
      {d.step === beliefs.length + 2 && (
        <div data-testid="step-canstop" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t.canStopTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.canStopLine}</p>
          <div className="grid grid-cols-3 gap-2">
            {CAN_STOP.map((c) => (
              <button key={c} type="button" data-testid={`canstop-${c}`} onClick={() => finish(c)} className="min-h-12 rounded-md border border-border bg-card px-2 text-base">
                {t.canStop[c]}
              </button>
            ))}
          </div>
        </div>
      )}
      {(d.step > 1 || d.reply) && (
        <button type="button" data-testid="screen-back" onClick={back} className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline">
          {t.back}
        </button>
      )}
    </section>
  )
}

function BeliefQuestion({ b, current, onPick }: { b: QuitBelief; current: number | undefined; onPick: (r: number) => void }) {
  return (
    <div data-testid="belief-question" className="flex flex-col gap-4">
      <p data-testid="scene" className="text-sm text-muted-foreground">
        {usable<string>(b.scene)}
      </p>
      <blockquote data-testid="limiting" className="rounded-lg border border-border bg-card p-4 text-lg leading-snug">
        {`“${b.limiting}”`}
      </blockquote>
      <p className="font-medium">{tt.beliefs.rate}</p>
      <div role="radiogroup" aria-label={tt.beliefs.rate} className="grid grid-cols-5 gap-2">
        {tt.beliefs.ratings.map((label, i) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={current === i + 1}
            aria-label={label}
            data-testid={`rate-${i + 1}`}
            onClick={() => onPick(i + 1)}
            className={`min-h-12 rounded-md border text-base ${current === i + 1 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{t.scaleLow}</span>
        <span>{t.scaleHigh}</span>
      </div>
    </div>
  )
}

function Reply({ b, onNext }: { b: QuitBelief; onNext: () => void }) {
  return (
    <div data-testid="reply" className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{t.replyTitle}</p>
      <p data-testid="reply-counterpart" className="text-lg font-medium leading-snug">{b.counterpart}</p>
      <p data-testid="reply-proof">{b.proof}</p>
      <CountedLine text={b.counted} />
      <SourceTap refs={realRefs(b.refs)} />
      <div className="mt-3">
        <PrimaryButton testId="reply-next" onClick={onNext}>
          {t.continue}
        </PrimaryButton>
      </div>
    </div>
  )
}

function Fears({ beliefs, d, onChange, onNext }: { beliefs: QuitBelief[]; d: Draft; onChange: (p: Partial<Draft>) => void; onNext: () => void }) {
  const fears = fearCandidates(beliefs)
  return (
    <div data-testid="step-fears" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t.fearsTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.fearsLine}</p>
      {fears.map((b) => {
        const on = d.fears.includes(b.id)
        return (
          <button
            key={b.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            data-testid={`fear-${b.id}`}
            onClick={() => onChange({ fears: toggleFear(d.fears, b.id), noneOfThese: false })}
            className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-base ${on ? "border-primary bg-primary/10" : "border-border bg-card"}`}
          >
            <span>{usable<string>(b.short)}</span>
            <span aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center rounded border ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
              {on ? "✓" : ""}
            </span>
          </button>
        )
      })}
      <button
        type="button"
        role="checkbox"
        aria-checked={d.noneOfThese}
        data-testid="fear-none"
        onClick={() => onChange({ fears: [], noneOfThese: !d.noneOfThese })}
        className={`min-h-12 rounded-xl border px-3 text-left text-base ${d.noneOfThese ? "border-primary bg-primary/10" : "border-border bg-card"}`}
      >
        {t.noneOfThese}
      </button>
      {d.noneOfThese && (
        <p data-testid="fear-none-reply" className="text-sm text-muted-foreground">
          {t.noneReply}
        </p>
      )}
      <PrimaryButton testId="fears-next" onClick={onNext}>
        {t.continue}
      </PrimaryButton>
    </div>
  )
}

function Result({ id, beliefs, bands, needs, results, onAgain }: { id: QuitAddictionId; beliefs: QuitBelief[]; bands: QuitBand[]; needs: QuitNeed[]; results: BeliefResult[]; onAgain: () => void }) {
  const carry = useCarry()
  const latest = results[results.length - 1]
  const earlier = results.slice(0, -1).reverse()
  return (
    <div data-testid="result" className="flex flex-col gap-6">
      <div className={earlier.length > 0 ? "grid gap-6 md:grid-cols-2" : ""}>
        <ResultBody id={id} beliefs={beliefs} bands={bands} needs={needs} r={latest} carry={carry} testId="result-latest" title={t.resultTitle} />
        {earlier.map((r, i) => (
          <ResultBody key={`${r.on}-${i}`} id={id} beliefs={beliefs} bands={bands} needs={needs} r={r} carry={carry} testId="result-earlier" title={t.earlierTitle} compact />
        ))}
      </div>
      <button type="button" data-testid="again" onClick={onAgain} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-card px-4 font-medium">
        {t.again}
      </button>
      <Link href={carry(`/quit/${id}/gives`)} data-testid="next-gives" className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground">
        {t.gives}
      </Link>
    </div>
  )
}

function ResultBody({
  id,
  beliefs,
  bands,
  needs,
  r,
  carry,
  testId,
  title,
  compact,
}: {
  id: QuitAddictionId
  beliefs: QuitBelief[]
  bands: QuitBand[]
  needs: QuitNeed[]
  r: BeliefResult
  carry: (path: string) => string
  testId: string
  title: string
  compact?: boolean
}) {
  const { held, band, top } = summarize(r.ratings, beliefs, bands)
  const named = beliefs.filter((b) => r.fears.includes(b.id))
  const slots = { n: held, total: beliefs.length, name: "" }
  return (
    <section data-testid={testId} data-on={r.on} data-held={held} className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p data-testid="taken-on" className="text-sm text-muted-foreground">
        {t.tookOn(fmtDay(r.on))}
      </p>
      <p data-testid="held-line" className="text-lg font-semibold">
        {fill(tt.beliefs.heldLine, slots)}
      </p>
      {band && (
        <div data-testid="band">
          <p>{band.text}</p>
          {band.link && !compact && <BandLink link={band.link} carry={carry} />}
        </div>
      )}
      {r.canStop && (
        <p data-testid="canstop-answer" className="rounded-md border border-border bg-card px-3 py-2 text-sm">
          {t.yourAnswer}: <span className="font-semibold">{t.canStop[r.canStop]}</span>
        </p>
      )}
      <div>
        <h3 className="text-sm text-muted-foreground">{tt.beliefs.topHeading}</h3>
        {top.length === 0 && <p className="mt-1">{tt.beliefs.noTop}</p>}
        <div className="mt-2 flex flex-col gap-4">
          {top.map((b) =>
            compact ? (
              <p key={b.id} data-testid="earlier-top" className="rounded-md border border-border bg-card px-3 py-2 text-sm">
                {`“${b.limiting}”`}
              </p>
            ) : (
              <TopCard key={b.id} b={b} id={id} needs={needs} carry={carry} />
            ),
          )}
        </div>
      </div>
      {!compact && (
        <div data-testid="named-fears">
          <h3 className="text-sm text-muted-foreground">{t.fearsNamed}</h3>
          {named.length === 0 ? (
            <p className="mt-1 text-sm">{t.noneNamed}</p>
          ) : (
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {named.map((b) => (
                <li key={b.id} className="rounded-md border border-border bg-card px-3 py-2">
                  {usable<string>(b.short)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div data-testid="answers">
        <h3 className="text-sm text-muted-foreground">{t.answersTitle}</h3>
        <ul className="mt-1 flex flex-col gap-1 text-sm">
          {beliefs.map((b) => (
            <li key={b.id} className="flex items-start justify-between gap-3 border-b border-border py-1.5">
              <span className="min-w-0">{usable<string>(b.short)}</span>
              <span className="shrink-0 text-muted-foreground">{r.ratings[b.id] ?? ""}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function TopCard({ b, id, needs, carry }: { b: QuitBelief; id: QuitAddictionId; needs: QuitNeed[]; carry: (path: string) => string }) {
  const need = needs.find((n) => n.id === usable<string>(b.need))
  return (
    <article data-testid="top-belief" className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{tt.beliefs.thoughtLabel}</p>
      <p className="text-lg leading-snug">{`“${b.limiting}”`}</p>
      <p className="mt-3 text-sm text-muted-foreground">{tt.beliefs.counterLabel}</p>
      <p className="font-medium">{b.counterpart}</p>
      <p className="mt-3 text-sm text-muted-foreground">{tt.beliefs.whenLabel}</p>
      <p>{b.whenThought}</p>
      <p className="mt-3 text-sm text-muted-foreground">{tt.beliefs.testLabel}</p>
      <p>{usable<string>(b.test)}</p>
      <p className="mt-3 text-sm text-muted-foreground">{tt.beliefs.proofLabel}</p>
      <p>{b.proof}</p>
      <CountedLine text={b.counted} />
      <SourceTap refs={realRefs(b.refs)} />
      {need && (
        <Link href={`${carry(`/quit/${id}/gives`)}#need=${encodeURIComponent(need.id)}`} data-testid="need-link" className="mt-3 inline-flex min-h-11 items-center text-primary underline">
          {fill(tt.beliefs.needLink, { need: need.name })}
        </Link>
      )}
    </article>
  )
}

function BandLink({ link, carry }: { link: string; carry: (path: string) => string }) {
  const free = isFreePlanLink(link)
  return (
    <Link href={link.startsWith("/quit") ? carry(link) : link} className="mt-1 inline-flex min-h-11 items-center text-primary underline">
      {free ? tt.beliefs.bandFreeLink : tt.beliefs.bandLink}
    </Link>
  )
}
