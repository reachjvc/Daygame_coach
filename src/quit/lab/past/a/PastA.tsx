"use client"

import { useEffect, useState } from "react"
import { InferredTag, NotSourced, Placeholder } from "../../progress/shared/Bits"
import { NotCopied } from "../../beliefs/shared/Bits"
import { useLabState } from "../../store"
import { barPercent, canContinue, dateKey, EMPTY_ANSWERS, sequence, type Answers, type StepId } from "./logic"
import { paText } from "./text"

const CHOICE_TEXT: Partial<Record<StepId, { q: string; help?: string; options: readonly string[] }>> = {
  howlong: { q: paText.howLongQ, options: paText.howLong },
  therapist: { q: paText.therapistQ, options: paText.therapist },
  told: { q: paText.toldQ, options: paText.told },
  who: { q: paText.whoQ, help: paText.whoHelp, options: paText.who },
  open: { q: paText.openQ, help: paText.openHelp, options: paText.open },
  acct: { q: paText.acctQ, options: paText.acct },
  group: { q: paText.groupQ, help: paText.groupHelp, options: paText.group },
  time: { q: paText.timeQ, help: paText.timeHelp, options: paText.time },
  zoom: { q: paText.zoomQ, help: paText.zoomHelp, options: paText.zoom },
  status: { q: paText.statusQ, help: paText.statusHelp, options: paText.status },
  age: { q: paText.ageQ, options: paText.age },
}

/** Copy A: the history and support questions of a sign-up questionnaire, one question per screen. */
export function PastA() {
  const [step, setStep] = useLabState<number>("past", "a", "step", 0)
  const [answers, setAnswers] = useLabState<Answers>("past", "a", "answers", EMPTY_ANSWERS)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const seq = sequence(answers)
  const index = Math.min(step, seq.length - 1)
  const id = seq[index]
  const patch = (p: Partial<Answers>) => setAnswers({ ...answers, ...p })
  const pick = (i: number) => patch({ choice: { ...answers.choice, [id]: i } })
  const back = () => {
    if (index > 0) setStep(index - 1)
    else window.history.back()
  }
  const last = index === seq.length - 1
  const ok = canContinue(id, answers)
  const pct = barPercent(index, seq.length)
  const choice = CHOICE_TEXT[id]

  return (
    <div data-testid="past-a" data-screen={id} className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="flex items-center">
        <button type="button" data-testid="a-back" aria-label={paText.back} onClick={back} className="inline-flex size-11 items-center justify-center text-xl">
          {"←"}
        </button>
      </div>
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted" data-testid="a-bar" data-value={pct}>
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {choice && (
          <section data-testid={`a-q-${id}`} className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">{choice.q}</h2>
            {choice.help && <p className="text-sm text-muted-foreground">{choice.help}</p>}
            <div role="radiogroup" className="flex flex-col gap-3">
              {choice.options.map((o, i) => {
                const on = answers.choice[id] === i
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    data-testid={`a-opt-${i}`}
                    onClick={() => pick(i)}
                    className={`min-h-14 w-full rounded-xl border px-4 py-3 text-left text-sm ${on ? "border-primary bg-primary/15" : "border-border bg-card"}`}
                  >
                    {o}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {(id === "review1" || id === "review2") && (
          <section data-testid="a-review" className="flex flex-col gap-3 pt-4">
            <NotCopied label={paText.notCopiedSales} />
          </section>
        )}

        {id === "freq" && (
          <CountScreen
            q={paText.freqQ}
            help={paText.freqHelp}
            value={answers.freq}
            onChange={(v) => patch({ freq: v })}
            unit={paText.unitPerWeek}
            testId="a-freq"
          />
        )}

        {id === "mirror" && (
          <section data-testid="a-mirror" className="flex flex-col gap-4">
            <div className="border-b border-border pb-4">
              <p className="text-xs uppercase text-muted-foreground">{paText.mirrorLabel}</p>
              <p data-testid="a-mirror-value" className="mt-1 text-lg font-bold">
                {`${answers.freq.trim()} ${paText.unitPerWeek}`}
              </p>
            </div>
            <p className="text-base">{paText.mirror1}</p>
            <p className="text-base">{paText.mirror2}</p>
            <div className="flex min-h-14 items-center gap-3 rounded-xl bg-primary/15 px-4 py-3">
              <span aria-hidden="true">{"💡"}</span>
              <NotSourced />
            </div>
          </section>
        )}

        {id === "last" && (
          <section data-testid="a-last" className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">{paText.lastQ}</h2>
            <p className="text-sm text-muted-foreground">{paText.lastHelp}</p>
            <div className="flex flex-col items-center gap-2 pt-8">
              <input
                type="date"
                data-testid="a-date"
                aria-label={paText.lastQ}
                value={answers.last ?? dateKey(new Date())}
                onChange={(e) => patch({ last: e.target.value || dateKey(new Date()) })}
                className="min-h-12 rounded-xl border border-border bg-background px-4 text-base"
              />
              <button type="button" data-testid="a-today" onClick={() => patch({ last: dateKey(new Date()) })} className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-primary">
                {paText.today}
              </button>
            </div>
          </section>
        )}

        {id === "longest" && (
          <CountScreen
            q={paText.longestQ}
            help={paText.longestHelp}
            value={answers.longest}
            onChange={(v) => patch({ longest: v })}
            unit={paText.unitWeeks}
            testId="a-longest"
          />
        )}

        {id === "pain" && (
          <section data-testid="a-pain" className="flex flex-col gap-3">
            <h2 className="text-2xl font-bold">{paText.painTitle}</h2>
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl bg-black text-sm text-white" data-testid="a-video">
              <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {paText.videoLoading}
            </div>
            <p className="text-base font-semibold">{paText.painLine}</p>
            <p className="text-sm text-muted-foreground">{paText.painLine2}</p>
            <svg viewBox="0 0 200 110" role="img" aria-label={paText.iceLabel} className="h-28 w-full" data-testid="a-iceberg">
              <line x1="0" y1="40" x2="200" y2="40" className="stroke-border" strokeWidth="1" strokeDasharray="4 3" />
              <path d="M85 40 L100 12 L115 40 Z" className="fill-muted stroke-border" strokeWidth="1" />
              <path d="M70 40 L130 40 L150 75 L120 104 L80 100 L52 72 Z" className="fill-muted/50 stroke-border" strokeWidth="1" />
              <text x="130" y="30" className="fill-muted-foreground" fontSize="11">
                {paText.iceTip}
              </text>
              <text x="86" y="76" className="fill-muted-foreground" fontSize="11">
                {paText.iceBelow}
              </text>
            </svg>
          </section>
        )}

        {id === "consider" && (
          <section data-testid="a-consider" className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="flex-1 text-lg font-semibold">{paText.considerTitle}</h2>
              <InferredTag />
            </div>
            <Placeholder />
            <Placeholder />
          </section>
        )}

        {id === "name" && (
          <section data-testid="a-name" className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">{paText.nameQ}</h2>
            <p className="text-sm text-muted-foreground">{paText.nameHelp}</p>
            <input
              data-testid="a-name-input"
              aria-label={paText.nameQ}
              placeholder={paText.namePlaceholder}
              value={answers.name}
              onChange={(e) => patch({ name: e.target.value })}
              className="min-h-12 rounded-xl border border-border bg-card px-4 text-base"
            />
            <button
              type="button"
              data-testid="a-anonymous"
              onClick={() => patch({ name: paText.nicknames[Math.floor(Math.random() * paText.nicknames.length)] })}
              className="inline-flex min-h-11 items-center self-end px-2 text-sm text-muted-foreground"
            >
              {"↻ "}
              {paText.anonymous}
            </button>
          </section>
        )}

        {id === "gate" && (
          <section data-testid="a-gate" className="flex flex-col gap-3 pt-4">
            <NotCopied label={paText.notCopiedGate} testId="a-gate-signup" />
            <NotCopied label={paText.notCopiedPayment} testId="a-gate-payment" />
          </section>
        )}
      </div>

      {!last && (
        <div className="sticky bottom-0 mt-4 flex flex-col gap-2 bg-background pb-3 pt-2">
          <button
            type="button"
            data-testid="a-continue"
            disabled={!ok}
            onClick={() => setStep(index + 1)}
            className={`min-h-14 w-full rounded-full text-base font-semibold ${ok ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {id === "name" ? paText.complete : paText.continue}
          </button>
          {id === "name" && <PrivacyPledge />}
        </div>
      )}
    </div>
  )
}

/** The pledge link: its page was never shown, so it opens a dashed tile. */
function PrivacyPledge() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" data-testid="a-pledge" onClick={() => setOpen(!open)} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
        {paText.privacy}
      </button>
      {open && <Placeholder />}
    </>
  )
}

/** A number field and a unit dropdown whose only seen option is `unit`; the rest of the list was never opened. */
function CountScreen({ q, help, value, onChange, unit, testId }: { q: string; help: string; value: string; onChange: (v: string) => void; unit: string; testId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <section data-testid={testId} className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">{q}</h2>
      <p className="text-sm text-muted-foreground">{help}</p>
      <div className="flex items-start justify-center gap-3 pt-8">
        <input
          type="text"
          inputMode="decimal"
          data-testid={`${testId}-number`}
          aria-label={q}
          placeholder={paText.numberPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-14 w-24 rounded-xl bg-muted px-2 text-center text-lg"
        />
        <div className="flex w-48 flex-col gap-2">
          <button type="button" data-testid={`${testId}-unit`} aria-label={paText.unitLabel} aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-14 items-center justify-between rounded-xl bg-muted px-4 text-lg font-semibold">
            {unit}
            <span aria-hidden="true">{"⌄"}</span>
          </button>
          {open && (
            <div data-testid={`${testId}-list`} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2">
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-md px-2 text-left text-sm font-semibold">
                {unit}
              </button>
              <Placeholder />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
