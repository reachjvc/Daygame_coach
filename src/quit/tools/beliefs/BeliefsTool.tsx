"use client"

import { useMemo, useState } from "react"
import { useSignedIn } from "../../blackbox"
import Link from "next/link"
import { ClearAnswers, CountedLine, OneQuestion, PrimaryButton, SourceTap, SourcesFold } from "../../components/kit"
import { fill, tooltext as t } from "../../tooltext"
import type { QuitBand, QuitBelief, QuitFact, QuitNeed, ToolProps } from "../../types"
import { realRefs, uniqueRefs, usable } from "../common"
import { useCarry, useDoneCount, useScreens, useStartCount, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import { bandFor, EMPTY_BELIEFS, firstUnanswered, heldCount, parseBeliefs, seeThrough, shareUrl, topBeliefs, type BeliefsState } from "./logic"

/** The 12 lies test: 12 ratings, 3 facts, then the result. */
export function BeliefsTool({ addiction, data }: ToolProps) {
  const beliefs = usable<QuitBelief[]>(data.beliefs)
  const facts = usable<QuitFact[]>(data.facts)
  const bands = usable<QuitBand[]>(data.bands)
  const needs = usable<QuitNeed[]>(data.needs)
  const ok =
    beliefs !== null && beliefs.length > 0 && facts !== null && bands !== null && needs !== null &&
    beliefs.every((b) => usable<string>(b.scene) !== null && usable<string>(b.short) !== null)
  if (!ok) return <NotReady />
  return <Inner addiction={addiction} name={data.name} beliefs={beliefs} facts={facts} bands={bands} needs={needs} />
}

interface InnerProps {
  addiction: string
  name: string
  beliefs: QuitBelief[]
  facts: QuitFact[]
  bands: QuitBand[]
  needs: QuitNeed[]
}

function Inner({ addiction, name, beliefs, facts, bands, needs }: InnerProps) {
  const { state, update, clear } = useToolState<BeliefsState>(addiction, "beliefs", EMPTY_BELIEFS, parseBeliefs)
  const total = beliefs.length + facts.length
  const first = state ? firstUnanswered(state, beliefs, facts) : 1
  const { screen, go, back: goBack, reset, isResult } = useScreens(first, total, state !== null)
  const started = useStartCount(addiction, "beliefs")
  useDoneCount(addiction, "beliefs", state !== null && isResult)

  if (!state) return null

  if (isResult) {
    return (
      <Result
        addiction={addiction}
        name={name}
        state={state}
        beliefs={beliefs}
        bands={bands}
        needs={needs}
        onClear={() => {
          clear()
          reset()
        }}
      />
    )
  }

  const back = screen > 1 ? goBack : null

  if (screen <= beliefs.length) {
    const b = beliefs[screen - 1]
    const current = state.ratings[b.id]
    return (
      <>
        <OneQuestion step={screen} total={total} onBack={back}>
          <blockquote data-testid="scene" className="rounded-lg border border-border bg-card p-4 text-lg leading-snug">
            {usable<string>(b.scene)}
          </blockquote>
          <p className="font-medium">{t.beliefs.rate}</p>
          <div role="radiogroup" aria-label={t.beliefs.rate} className="flex flex-col gap-2">
            {t.beliefs.ratings.map((label, i) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={current === i + 1}
                data-testid={`rate-${i + 1}`}
                onClick={() => {
                  started()
                  update((s) => ({ ...s, ratings: { ...s.ratings, [b.id]: i + 1 } }))
                  go(screen + 1)
                }}
                className={`min-h-12 rounded-md border px-4 text-left text-base ${current === i + 1 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </OneQuestion>
        <SourcesFold refs={[]} />
      </>
    )
  }

  const f = facts[screen - beliefs.length - 1]
  const answered = state.facts[f.id]
  const refs = realRefs(f.refs)
  return (
    <>
      <OneQuestion step={screen} total={total} onBack={back}>
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
                onClick={() => {
                  started()
                  update((s) => ({ ...s, facts: { ...s.facts, [f.id]: v } }))
                }}
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
            <SourceTap refs={refs} />
            <div className="mt-3">
              <PrimaryButton testId="fact-next" onClick={() => go(screen + 1)}>
                {t.common.next}
              </PrimaryButton>
            </div>
          </div>
        )}
      </OneQuestion>
      <SourcesFold refs={typeof answered === "boolean" ? refs : []} />
    </>
  )
}

interface ResultProps {
  addiction: string
  name: string
  state: BeliefsState
  beliefs: QuitBelief[]
  bands: QuitBand[]
  needs: QuitNeed[]
  onClear: () => void
}

function Result({ addiction, name, state, beliefs, bands, needs, onClear }: ResultProps) {
  const carry = useCarry()
  const [copied, setCopied] = useState(false)
  const seen = useMemo(() => seeThrough(state.ratings, beliefs), [state.ratings, beliefs])
  const top = useMemo(() => topBeliefs(state.ratings, beliefs), [state.ratings, beliefs])
  const held = heldCount(state.ratings, beliefs)
  const band = bandFor(held, bands)
  const refs = uniqueRefs(top.flatMap((b) => realRefs(b.refs)))
  const slots = { n: held, total: beliefs.length, name }

  const share = async () => {
    const url = shareUrl(window.location.origin, addiction)
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: fill(t.beliefs.shareTitle, slots), text: fill(t.beliefs.shareText, slots), url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // the reader closed the share sheet, or the clipboard is blocked
    }
  }

  return (
    <>
      <div data-testid="result" className="flex flex-col gap-6">
        {seen.length > 0 && (
          <section data-testid="see-through">
            <h2 className="text-lg font-semibold">{t.beliefs.seeThrough}</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {seen.map((b) => (
                <li key={b.id} className="rounded-md border border-border bg-card px-3 py-2">
                  {usable<string>(b.short)}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h2 className="text-lg font-semibold">{t.beliefs.topHeading}</h2>
          {top.length === 0 && <p className="mt-2 text-muted-foreground">{t.beliefs.noTop}</p>}
          <div className="mt-2 flex flex-col gap-4">
            {top.map((b) => {
              const need = needs.find((n) => n.id === usable<string>(b.need))
              return (
                <article key={b.id} data-testid="top-belief" className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{t.beliefs.thoughtLabel}</p>
                  <p className="text-lg leading-snug">{`“${b.limiting}”`}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{t.beliefs.counterLabel}</p>
                  <p className="font-medium">{b.counterpart}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{t.beliefs.proofLabel}</p>
                  <p>{b.proof}</p>
                  <CountedLine text={b.counted} />
                  <SourceTap refs={realRefs(b.refs)} />
                  <p className="mt-3 text-sm text-muted-foreground">{t.beliefs.whenLabel}</p>
                  <p>{b.whenThought}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{t.beliefs.testLabel}</p>
                  <p>{usable<string>(b.test)}</p>
                  {need && (
                    <Link
                      href={`${carry(`/quit/${addiction}/gives`)}#need=${encodeURIComponent(need.id)}`}
                      className="mt-3 inline-flex min-h-11 items-center text-primary underline"
                    >
                      {fill(t.beliefs.needLink, { need: need.name })}
                    </Link>
                  )}
                </article>
              )
            })}
          </div>
        </section>
        {band && (
          <section data-testid="band" className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-lg font-semibold">{t.beliefs.bandHeading}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{fill(t.beliefs.heldLine, slots)}</p>
            <p className="mt-2 text-xl font-semibold text-primary">{band.label}</p>
            <p>{band.text}</p>
            {band.link && <BandLink link={band.link} carryTo={carry} />}
          </section>
        )}
        <section className="flex flex-col gap-2">
          <button
            type="button"
            data-testid="share"
            onClick={share}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-card px-4"
          >
            {t.beliefs.share}
          </button>
          {copied && (
            <p role="status" data-testid="link-copied" className="text-sm text-muted-foreground">
              {t.beliefs.linkCopied}
            </p>
          )}
          <a
            data-testid="save-image"
            href={carry(`/quit/${addiction}/card`, { held: String(held) })}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-card px-4"
          >
            {t.beliefs.saveImage}
          </a>
        </section>
        <Link
          href={carry(`/quit/${addiction}/gives`)}
          data-testid="next-gives"
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground"
        >
          {t.beliefs.next}
        </Link>
        <ClearAnswers onClear={onClear} />
      </div>
      <SourcesFold refs={refs} />
    </>
  )
}

const SIGN_UP = "/auth/sign-up?next=/plan"

/** The band's way on. The free plan link goes to sign-up for a signed-out reader, to the plan for a signed-in one. */
function BandLink({ link, carryTo }: { link: string; carryTo: (path: string) => string }) {
  if (link === "/plan") return <FreePlanLink />
  return (
    <Link href={link.startsWith("/quit") ? carryTo(link) : link} className="mt-2 inline-flex min-h-11 items-center text-primary underline">
      {t.beliefs.bandLink}
    </Link>
  )
}

function FreePlanLink() {
  const signedIn = useSignedIn()
  return (
    <Link href={signedIn === true ? "/plan" : SIGN_UP} data-testid="band-free-link" className="mt-2 inline-flex min-h-11 items-center text-primary underline">
      {t.beliefs.bandFreeLink}
    </Link>
  )
}
