"use client"

import Link from "next/link"
import { CountedLine, EvidenceChip, SourceTap } from "../../components/kit"
import { isLiveTool } from "../../menu"
import { fill, tooltext } from "../../tooltext"
import type { QuitBelief, QuitMomentSwap, QuitNeed, QuitOption, QuitPlanStep } from "../../types"
import { realRefs, usable } from "../common"
import { dayWords, daysWord, type DaysCard, type Day1 } from "./logic"

const t = tooltext.slip
const tt = tooltext

/** Tool names inside a plan step: a link only when that tool is finished, plain text until then. */
function Linked({ text, href }: { text: string; href: (tool: string) => string }) {
  const name = "the 12 lies test"
  const at = text.indexOf(name)
  if (at === -1 || !isLiveTool("beliefs")) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <Link href={href("beliefs")} className="text-primary underline">
        {name}
      </Link>
      {text.slice(at + name.length)}
    </>
  )
}

export interface ResultProps {
  /** Case B: the slip that was already in the record. */
  inRecord: string | null
  /** Case C: no run, nothing saved. */
  noRun: boolean
  card: DaysCard | null
  status: string | null
  canUndo: boolean
  onUndo: () => void
  refused: boolean
  ownWords: string | null
  lie: QuitBelief | null
  top: QuitBelief[]
  place: QuitOption | null
  placeCards: QuitMomentSwap["cards"]
  need: QuitNeed | null
  tried: { id: string; text: string }[]
  planSteps: QuitPlanStep[]
  day1Options: Day1[]
  day1: Day1 | null
  day1On: string | null
  /** The day shown as step 3: the one chosen, or tomorrow when it is the only one possible. */
  step3Day: string | null
  /** Tomorrow's day, set when only Tomorrow is possible (shown as a statement, not a chip). */
  forcedDay: string | null
  onDay1: (d: Day1) => void
  switchRefused: boolean
  startRefused: boolean
  href: (path: string) => string
  addiction: string
}

const H = "mt-4 text-lg font-semibold"

/** What a slip leads to: the days that stay, a new day 1, then back through steps 1 to 3. */
export function Result(p: ResultProps) {
  const toolHref = (tool: string) => p.href(`/quit/${p.addiction}/${tool}`)
  const oneLie = (p.lie ? 1 : 0) + p.top.length === 1
  return (
    <div data-testid="result" className="flex flex-col gap-4">
      {p.inRecord && (
        <p data-testid="slip-in-record" className="text-sm text-muted-foreground">
          {p.inRecord}
        </p>
      )}
      <h2 className="text-xl font-semibold">{p.noRun ? t.pickDay1 : t.resultHeading}</h2>
      {p.noRun && (
        <p data-testid="no-run" className="rounded-lg border border-border bg-card p-4">
          {t.noRunLine}
        </p>
      )}

      {p.card && (
        <section data-testid="days-card" className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
          <p data-testid="days-line" className="text-lg font-semibold">
            {p.card.start === p.card.end
              ? fill(t.daysSame, { day: dayWords(p.card.start) })
              : fill(t.daysLine, { start: dayWords(p.card.start), end: dayWords(p.card.end), days: daysWord(p.card.days) })}
          </p>
          <p data-testid="days-basis" className="text-sm text-muted-foreground">
            {t.daysBasis}
          </p>
          {p.card.all !== null && (
            <p data-testid="days-all" className="mt-1 font-medium">
              {fill(t.allRuns, { days: daysWord(p.card.all) })}
            </p>
          )}
          {p.status && (
            <p data-testid="slip-saved-text" className="mt-2 text-sm">
              {p.status}
            </p>
          )}
          {p.canUndo && (
            <button type="button" data-testid="slip-undo" onClick={p.onUndo} className="inline-flex min-h-11 min-w-11 items-center self-start px-1 text-primary underline">
              {t.undo}
            </button>
          )}
        </section>
      )}
      {p.refused && <p data-testid="slip-refused">{tt.blackbox.notSaved}</p>}

      <section data-testid="step-day1" className="flex flex-col gap-3">
        {p.forcedDay ? (
          <>
            <h3 className={H}>{t.day1Heading}</h3>
            <p data-testid="day1-forced">{fill(t.day1Forced, { day: dayWords(p.forcedDay) })}</p>
          </>
        ) : (
          <>
            {!p.noRun && <h3 className={H}>{t.day1Question}</h3>}
            <div role="radiogroup" aria-label={t.day1Question} className="flex flex-wrap gap-2">
              {p.day1Options.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={p.day1 === d}
                  data-testid={`day1-${d}`}
                  onClick={() => p.onDay1(d)}
                  className={`inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-base ${p.day1 === d ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
                >
                  {d === "today" ? t.day1Today : t.day1Tomorrow}
                </button>
              ))}
            </div>
          </>
        )}
        {p.day1 && p.day1On && (
          <div>
            {!p.forcedDay && (
              <p data-testid="day1-line" className="font-medium">
                {fill(t.day1Set, { day: dayWords(p.day1On) })}
              </p>
            )}
            {p.day1 === "today" ? (
              <p data-testid="day1-note" className="text-sm">
                {t.startedToday}
              </p>
            ) : (
              <p data-testid="day1-note" className="text-sm">
                {t.startsPre}
                {isLiveTool("date") ? (
                  <Link href={toolHref("date")} className="text-primary underline">
                    {t.startsLink}
                  </Link>
                ) : (
                  t.startsLink
                )}
                {t.startsPost}
              </p>
            )}
          </div>
        )}
        {p.switchRefused && <p className="text-sm">{t.switchRefused}</p>}
        {p.startRefused && <p className="text-sm">{tt.blackbox.notSaved}</p>}
      </section>

      <h3 className={H}>{t.backThrough}</h3>

      <section data-testid="step-lies" className="flex flex-col gap-3">
        <h4 className="text-lg font-semibold">{`1. ${oneLie ? t.step1One : t.step1}`}</h4>
        {p.ownWords && (
          <p data-testid="own-words" className="text-base">
            {fill(t.toldYourself, { words: p.ownWords })}
          </p>
        )}
        {p.lie && (
          <div data-testid="lie-card" className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
            <h5 className="text-sm text-muted-foreground">{t.lieLabel}</h5>
            <p>{p.lie.limiting}</p>
            <h5 className="mt-3 text-sm text-muted-foreground">{tt.sos.otherSide}</h5>
            <p data-testid="lie-counterpart" className="text-lg font-medium">
              {p.lie.counterpart}
            </p>
            <h5 className="mt-3 text-sm text-muted-foreground">{tt.sos.proofLabel}</h5>
            <p data-testid="lie-proof">{p.lie.proof}</p>
            <CountedLine text={p.lie.counted} />
            <SourceTap refs={realRefs(p.lie.refs)} />
          </div>
        )}
        {p.top.length > 0 && (
          <div data-testid="top-lies">
            <p className="text-sm font-medium">{t.fromTest}</p>
            <ul className="mt-2 flex flex-col gap-2">
              {p.top.map((b) => (
                <li key={b.id} data-testid="top-lie" className="rounded-md border border-border bg-card px-3 py-2">
                  <p className="text-xs text-muted-foreground">{usable<string>(b.short)}</p>
                  <p>{b.counterpart}</p>
                  <details className="mt-1">
                    <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">{t.proofToggle}</summary>
                    <p>{b.proof}</p>
                    <CountedLine text={b.counted} />
                    <SourceTap refs={realRefs(b.refs)} />
                  </details>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!p.lie && p.top.length === 0 && (
          <div data-testid="lies-plan">
            <p className="font-medium">{p.planSteps[0].title}</p>
            <p>
              <Linked text={p.planSteps[0].text} href={toolHref} />
            </p>
          </div>
        )}
      </section>

      <section data-testid="step-swaps" className="flex flex-col gap-3">
        <h4 className="text-lg font-semibold">{`2. ${t.step2}`}</h4>
        {p.place ? (
          <div data-testid="swaps-place">
            <p className="text-sm font-medium">{fill(t.nextTime, { place: p.place.label })}</p>
            <ul className="mt-2 flex flex-col gap-2">
              {p.placeCards.map((c) => (
                <li key={c} data-testid="swap-card" className="rounded-md border border-border bg-card px-3 py-2">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          p.need && (
            <div data-testid="swaps-need">
              <p className="text-sm font-medium">{fill(t.forNeed, { need: p.need.name.toLowerCase() })}</p>
              <ul className="mt-2 flex flex-col gap-2">
                {p.need.swaps.map((s) => (
                  <li key={s.id} data-testid="swap-card" className="flex flex-col items-start gap-1 rounded-md border border-border bg-card px-3 py-2">
                    <span>{s.text}</span>
                    <EvidenceChip evidence={s.evidence} />
                    <SourceTap refs={realRefs(s.refs)} />
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
        {p.tried.length > 0 && (
          <div data-testid="swaps-tried">
            <p className="text-sm font-medium">{t.triedHead}</p>
            <ul className="mt-2 flex flex-col gap-2">
              {p.tried.map((s) => (
                <li key={s.id} className="rounded-md border border-border bg-card px-3 py-2">
                  {s.text}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!p.place && !p.need && p.tried.length === 0 && (
          <div data-testid="swaps-plan">
            <p className="font-medium">{p.planSteps[1].title}</p>
            <p>{p.planSteps[1].text}</p>
          </div>
        )}
      </section>

      <h4 data-testid="step-day1-line" className="text-lg font-semibold">
        {`3. ${p.step3Day ? fill(t.step3Line, { day: dayWords(p.step3Day) }) : t.step3Pick}`}
      </h4>

      <Link href={p.href(`/quit/${p.addiction}`)} data-testid="to-menu" className="inline-flex min-h-11 items-center text-primary underline">
        {t.toMenu}
      </Link>
    </div>
  )
}
