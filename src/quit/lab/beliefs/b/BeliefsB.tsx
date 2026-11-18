"use client"

import { useState } from "react"
import type { LabProps } from "../../registry"
import type { QuitUnit } from "../../../types"
import { usable } from "../../../tools/common"
import { InferredTag, NotSourced } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import { NotCopied } from "../shared/Bits"
import { bsText } from "../shared/text"
import { BELIEFS, BELIEF_PAGES, KNOW, KNOW_PAGES, STEPS, barPercent, knowMark, stepComplete, yearCostUsd, type BeliefId, type Form, type KnowId } from "./logic"
import { bText } from "./text"

const EMPTY: Form = { ratings: {}, know: {} }

/** Copy B: nine ratings on a 1 to 5 scale and six knowledge questions, with the result on the page. */
export function BeliefsB({ data }: LabProps) {
  const [step, setStep] = useLabState<number>("beliefs", "b", "step", 1)
  const [form, setForm] = useLabState<Form>("beliefs", "b", "form", EMPTY)
  const [robot, setRobot] = useState(false)
  const [error, setError] = useState(false)
  const [done, setDone] = useLabState<boolean>("beliefs", "b", "done", false)
  const price = usable<QuitUnit[]>(data.units)?.find((u) => u.id === "cigarettes")?.defaultPriceUsd ?? 0
  const patch = (p: Partial<Form>) => setForm({ ...form, ...p })

  const go = (n: number) => {
    setError(false)
    setStep(n)
  }
  const next = () => {
    if (!stepComplete(step, form)) return setError(true)
    go(step + 1)
  }

  if (done) {
    return (
      <div data-testid="beliefs-b" data-screen="result">
        <Result form={form} price={price} onRestart={() => {
          setForm(EMPTY)
          setDone(false)
          setRobot(false)
          go(1)
        }} />
      </div>
    )
  }

  return (
    <div data-testid="beliefs-b" data-screen={`step-${step}`} className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        <p data-testid="b-step" className="text-sm font-semibold">
          {bText.stepOf(step, STEPS)}
        </p>
        <div className="flex h-5 w-full overflow-hidden rounded-full bg-teal-700/60">
          <div data-testid="b-bar" data-value={barPercent(step)} className="flex items-center justify-end bg-rose-600 pr-1.5 text-xs text-white transition-[width]" style={{ width: `${barPercent(step)}%` }}>
            {barPercent(step)}%
          </div>
        </div>
      </div>

      {step === 1 && (
        <section data-testid="b-intro" className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold">{bText.introTitle}</h2>
          <p className="text-sm">{bText.intro1}</p>
          <p className="text-sm">{bText.intro2}</p>
        </section>
      )}

      {step === 2 && (
        <section data-testid="b-details" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-lg font-semibold">{bText.detailsTitle}</h2>
            <InferredTag />
          </div>
          <p className="text-xs text-muted-foreground">{bText.inferredNote}</p>
          {(Object.keys(bText.detailsFields) as (keyof typeof bText.detailsFields)[]).map((k) => (
            <label key={k} className="flex flex-col gap-1 text-sm">
              {bText.detailsFields[k]}
              <input data-testid={`b-details-${k}`} className="min-h-11 rounded-md border border-border bg-background px-2" />
            </label>
          ))}
          <p className="text-sm text-muted-foreground">{bText.detailsGate}</p>
          <NotCopied label={bsText.notCopiedGate} testId="b-gate" />
        </section>
      )}

      {step === 3 && (
        <section data-testid="b-history" className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{bText.historyTitle}</h2>
          <Radios id="amount" label={bText.amountLabel} required options={bText.amounts} value={form.amount} onPick={(i) => patch({ amount: i })} />
          <Radios id="tried" label={bText.triedLabel} required options={[bText.yes, bText.no]} value={form.tried === undefined ? undefined : form.tried ? 0 : 1} onPick={(i) => patch({ tried: i === 0 })} />
          {form.tried && (
            <div data-testid="b-follow" className="flex flex-col gap-3 rounded-md border border-dashed border-border p-3">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <InferredTag />
                {bText.followInferred}
              </p>
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
                {bText.triesLabel}
                <input type="number" min={1} data-testid="b-tries" value={form.tries ?? ""} onChange={(e) => patch({ tries: e.target.value === "" ? undefined : Number(e.target.value) })} className="min-h-11 w-24 rounded-md border border-border bg-background px-2" />
              </label>
              <Radios id="best" label={bText.bestLabel} options={bText.bests} value={form.best} onPick={(i) => patch({ best: i })} />
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {bText.brandLabel}
            <input data-testid="b-brand" value={form.brand ?? ""} onChange={(e) => patch({ brand: e.target.value })} className="min-h-11 rounded-md border border-border bg-background px-2 font-normal" />
          </label>
        </section>
      )}

      {step >= 4 && step <= 6 && (
        <section data-testid={`b-beliefs-${step - 3}`} className="flex flex-col gap-4">
          <p className="text-center text-sm">{bText.rankLine}</p>
          <p className="border-b border-border pb-3 text-center text-sm font-semibold">{bText.legend}</p>
          {BELIEF_PAGES[step - 4].map((b) => (
            <Radios key={b} id={`belief-${b}`} label={bText.beliefs[b]} required options={["1", "2", "3", "4", "5"]} value={form.ratings[b] === undefined ? undefined : form.ratings[b]! - 1} onPick={(i) => patch({ ratings: { ...form.ratings, [b]: i + 1 } })} />
          ))}
        </section>
      )}

      {(step === 7 || step === 8) && (
        <section data-testid={`b-know-${step - 6}`} className="flex flex-col gap-4">
          {KNOW_PAGES[step - 7].map((k) => (
            <Radios key={k} id={`know-${k}`} label={bText.know[k].q} required options={bText.know[k].opts} value={form.know[k]} onPick={(i) => patch({ know: { ...form.know, [k]: i } })} />
          ))}
        </section>
      )}

      {step === 9 && (
        <section data-testid="b-submit" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{bText.submitTitle}</h2>
          <p className="text-sm">{bText.submitLine}</p>
          <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-card px-3 text-sm">
            <input type="checkbox" data-testid="b-captcha" checked={robot} onChange={(e) => setRobot(e.target.checked)} className="size-5" />
            {bText.captcha}
          </label>
          <p className="text-xs text-muted-foreground">{bText.captchaNote}</p>
        </section>
      )}

      {error && (
        <p data-testid="b-error" className="flex items-center gap-2 text-sm text-red-400">
          {bsText.required}
          <InferredTag />
        </p>
      )}
      <div className="flex justify-between gap-3">
        {step > 1 ? (
          <button type="button" data-testid="b-prev" onClick={() => go(step - 1)} className="min-h-12 rounded-md border border-border bg-card px-5 text-sm font-semibold">
            {bText.previous}
          </button>
        ) : (
          <span />
        )}
        {step < STEPS ? (
          <button type="button" data-testid="b-next" onClick={next} className="min-h-12 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
            {bText.next}
          </button>
        ) : (
          <button type="button" data-testid="b-submit-btn" disabled={!robot} onClick={() => setDone(true)} className="min-h-12 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
            {bText.submit}
          </button>
        )}
      </div>
    </div>
  )
}

function Radios({ id, label, options, value, onPick, required }: { id: string; label: string; options: readonly string[]; value: number | undefined; onPick: (i: number) => void; required?: boolean }) {
  return (
    <fieldset data-testid={`b-q-${id}`} className="flex flex-col">
      <legend className="mb-1 text-sm font-semibold">
        {label}
        {required && (
          <span className="text-rose-500" aria-label={bText.required}>
            {" *"}
          </span>
        )}
      </legend>
      {options.map((o, i) => (
        <label key={o} className="flex min-h-11 items-center gap-3 text-sm">
          <input type="radio" name={id} data-testid={`b-opt-${id}-${i}`} checked={value === i} onChange={() => onPick(i)} className="size-5 accent-rose-600" />
          {o}
        </label>
      ))}
    </fieldset>
  )
}

function Result({ form, price, onRestart }: { form: Form; price: number; onRestart: () => void }) {
  const [copied, setCopied] = useState(false)
  const cost = yearCostUsd(form.amount, price)
  const text = () =>
    [bText.resultTitle, ...BELIEFS.map((b) => `${bText.beliefs[b]} ${bText.yourAnswer} ${form.ratings[b] ?? "-"}. ${bText.rebuttals[b]}`)].join("\n")
  return (
    <section data-testid="b-result" className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">{bText.resultTitle}</h2>
      <p data-testid="b-email-note" className="text-xs text-muted-foreground">
        {bText.emailNote}
      </p>
      <div className="flex flex-col gap-3">
        {BELIEFS.map((b: BeliefId) => (
          <div key={b} data-testid={`b-res-${b}`} data-rating={form.ratings[b] ?? ""} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 text-sm">
            <span className="font-semibold">{bText.beliefs[b]}</span>
            <span className="text-muted-foreground">
              {bText.yourAnswer} {form.ratings[b] ?? "-"}
            </span>
            <span>{bText.rebuttals[b]}</span>
          </div>
        ))}
      </div>
      <h3 className="text-lg font-semibold">{bText.knowTitle}</h3>
      <div className="flex flex-col gap-3">
        {KNOW.map((k: KnowId) => {
          const mark = knowMark(k, form.know[k])
          const pick = form.know[k]
          return (
            <div key={k} data-testid={`b-res-${k}`} data-mark={mark} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 text-sm">
              <span className="font-semibold">{bText.know[k].q}</span>
              <span className="text-muted-foreground">
                {bText.yourAnswer} {pick === undefined ? "-" : bText.know[k].opts[pick]}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {bText.rightAnswer}:{" "}
                {k === "when" ? bText.rightWhen : <NotSourced />}
                {k === "stimulant" && <InferredTag />}
              </span>
              <span className="text-xs text-muted-foreground">{bText.marks[mark]}</span>
            </div>
          )
        })}
      </div>
      <div data-testid="b-cost" className="rounded-xl border border-border bg-card p-3 text-sm">
        {cost === undefined ? bText.costNone : <p className="font-semibold">{bText.costLine(`$${cost.toLocaleString("en-US")}`)}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{bText.costBasis}</p>
      </div>
      <NotCopied label={bsText.notCopiedSales} testId="b-sales" />
      <button
        type="button"
        data-testid="b-copy"
        onClick={() => {
          navigator.clipboard?.writeText(text()).catch(() => undefined)
          setCopied(true)
        }}
        className="min-h-12 rounded-md border border-border bg-card px-4 text-sm font-semibold"
      >
        {copied ? bText.copied : bText.copyBtn}
      </button>
      <button type="button" data-testid="b-restart" onClick={onRestart} className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline">
        {bText.startOver}
      </button>
    </section>
  )
}
