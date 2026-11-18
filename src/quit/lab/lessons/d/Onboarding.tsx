"use client"

import { useEffect, useState } from "react"
import { Sheet } from "../shared/Bits"
import { dateToMs, msToDate } from "../shared/logic"
import { dText } from "./text"
import type { DState } from "./state"

function share(text: string) {
  try {
    if (typeof navigator !== "undefined" && navigator.share) void navigator.share({ text }).catch(() => undefined)
  } catch {
    // no share sheet here
  }
}

const btn = "inline-flex min-h-12 w-full items-center justify-center rounded-md bg-sky-600 px-4 font-medium text-white disabled:opacity-40"
const ghost = "inline-flex min-h-12 w-full items-center justify-center rounded-md border border-sky-400 px-4 font-medium"
const input = "min-h-11 w-full rounded-md border border-border bg-background px-3"

/** Splash and three swipe cards. */
export function Welcome({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(-1)
  if (i < 0) {
    return (
      <section data-testid="d-splash" className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 rounded-2xl bg-teal-900/50 p-6 text-center">
        <svg width="110" height="110" viewBox="0 0 110 110" aria-hidden="true">
          <rect x="15" y="62" width="80" height="14" rx="4" fill="#e2e8f0" transform="rotate(-18 55 69)" />
          <rect x="50" y="62" width="40" height="14" rx="4" fill="#fb923c" transform="rotate(14 70 69)" />
        </svg>
        <h2 className="text-3xl font-bold">{dText.splashTitle}</h2>
        <p className="text-sm text-muted-foreground">{dText.splashLine}</p>
        <button type="button" data-testid="d-splash-go" onClick={() => setI(0)} className={ghost}>
          {dText.continue}
        </button>
      </section>
    )
  }
  const c = dText.welcome[i]
  const last = i === dText.welcome.length - 1
  return (
    <section data-testid="d-welcome" data-card={i} className="flex flex-col overflow-hidden rounded-2xl border border-border">
      <div className="h-48 bg-gradient-to-b from-teal-700 to-sky-800" aria-hidden="true" />
      <div className="flex flex-col gap-3 bg-sky-800 p-5 text-white">
        <h2 className="text-2xl font-bold">{c.title}</h2>
        {c.lines.map((l) => (
          <p key={l} className="text-sm">{l}</p>
        ))}
        <div className="flex justify-center gap-2" aria-hidden="true">
          {dText.welcome.map((x, k) => (
            <span key={x.title} className={`size-2 rounded-full ${k === i ? "bg-white" : "bg-white/40"}`} />
          ))}
        </div>
        <button type="button" data-testid="d-welcome-next" onClick={() => (last ? onDone() : setI(i + 1))} className={ghost}>
          {last ? dText.startBtn : dText.continue}
        </button>
      </div>
    </section>
  )
}

/** Sign-up steps: terms, profile, kind, habits, reminders, buddy, reasons, other nicotine. */
export function Signup({ s, update, onDone }: { s: DState; update: (p: Partial<DState>) => void; onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [agree, setAgree] = useState(false)
  const [sub, setSub] = useState<"ask" | "share" | "done">("ask")
  const next = () => (step === 7 ? onDone() : setStep(step + 1))
  const title = [dText.readyTitle, dText.aboutTitle, dText.kindTitle, dText.habitsTitle, dText.notifTitle, dText.buddyTitle, dText.motivTitle, dText.ecigTitle][step]
  return (
    <section data-testid="d-signup" data-step={step} className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      {step === 0 && (
        <>
          <p className="text-sm">{dText.readyLine}</p>
          <p className="text-sm underline">{dText.terms}</p>
          <p className="text-sm underline">{dText.privacy}</p>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" data-testid="d-agree" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="size-5" />
            {dText.agree}
          </label>
          <button type="button" data-testid="d-step-next" disabled={!agree} onClick={next} className={btn}>{dText.continue}</button>
        </>
      )}
      {step === 1 && (
        <>
          <input data-testid="d-name" aria-label={dText.nameField} placeholder={dText.nameField} value={s.name} onChange={(e) => update({ name: e.target.value })} className={input} />
          <div role="radiogroup" aria-label={dText.sexField} className="flex flex-col gap-2">
            {dText.sexOptions.map((o) => (
              <label key={o} className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3 text-sm">
                <input type="radio" name="sex" checked={s.sex === o} onChange={() => update({ sex: o })} className="size-5" />
                {o}
              </label>
            ))}
          </div>
          <input data-testid="d-age" inputMode="numeric" aria-label={dText.ageField} placeholder={dText.ageField} value={s.age} onChange={(e) => update({ age: e.target.value })} className={input} />
          <button type="button" data-testid="d-step-next" onClick={next} className={btn}>{dText.continue}</button>
          <button type="button" data-testid="d-step-skip" onClick={next} className={ghost}>{dText.skip}</button>
        </>
      )}
      {step === 2 && (
        <>
          <div role="radiogroup" className="flex flex-col gap-2">
            {dText.kinds.map((o) => (
              <label key={o} className="flex min-h-12 items-center gap-3 rounded-md border border-border px-3">
                <input type="radio" name="kind" checked={s.kind === o} onChange={() => update({ kind: o })} className="size-5" />
                {o}
              </label>
            ))}
          </div>
          <button type="button" data-testid="d-step-next" onClick={next} className={btn}>{dText.continue}</button>
        </>
      )}
      {step === 3 && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            {dText.perDayField}
            <input data-testid="d-perday" type="number" inputMode="numeric" min={0} value={s.perDay ?? ""} onChange={(e) => update({ perDay: e.target.value === "" ? null : Number(e.target.value) })} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {dText.costField}
            <input data-testid="d-cost" type="number" inputMode="decimal" min={0} step="0.01" value={s.packCost ?? ""} onChange={(e) => update({ packCost: e.target.value === "" ? null : Number(e.target.value) })} className={input} />
          </label>
          <button type="button" data-testid="d-step-next" onClick={next} className={btn}>{dText.continue}</button>
        </>
      )}
      {step === 4 && (
        <>
          <p className="text-sm">{dText.notifLine}</p>
          <button type="button" data-testid="d-notif-on" onClick={() => { update({ notif: true }); next() }} className={btn}>{dText.notifOn}</button>
          <button type="button" data-testid="d-step-skip" onClick={next} className={ghost}>{dText.skip}</button>
        </>
      )}
      {step === 5 && (
        <>
          <input data-testid="d-buddy" aria-label={dText.buddyField} placeholder={dText.buddyField} value={s.buddy} onChange={(e) => update({ buddy: e.target.value })} className={input} />
          <button type="button" data-testid="d-buddy-set" onClick={() => setSub("share")} className={btn}>{dText.buddySetup}</button>
          <button type="button" data-testid="d-step-skip" onClick={next} className={ghost}>{dText.skip}</button>
          {sub === "share" && (
            <Sheet testId="d-buddy-share" onClose={() => setSub("done")} closeLabel={dText.close}>
              <div className="flex flex-col gap-3 pt-8">
                <h3 className="font-semibold">{dText.shareTitle}</h3>
                <p className="rounded-md border border-border p-3 text-sm">{dText.shareMessage}</p>
                <button type="button" data-testid="d-buddy-share-go" onClick={() => share(dText.shareMessage)} className={btn}>{dText.shareBuddy}</button>
                <button type="button" data-testid="d-buddy-share-end" onClick={() => setSub("done")} className={ghost}>{dText.close}</button>
              </div>
            </Sheet>
          )}
          {sub === "done" && (
            <Sheet testId="d-buddy-done">
              <div className="flex flex-col gap-3 pt-4">
                <h3 className="font-semibold">{dText.buddyDoneTitle}</h3>
                <button type="button" data-testid="d-buddy-done-share" onClick={() => share(dText.shareMessage)} className={btn}>{dText.share}</button>
                <button type="button" data-testid="d-buddy-done-later" onClick={() => { setSub("ask"); next() }} className={ghost}>{dText.later}</button>
              </div>
            </Sheet>
          )}
        </>
      )}
      {step === 6 && (
        <>
          {dText.motivOptions.map((o, i) => (
            <label key={o} className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3 text-sm">
              <input type="checkbox" checked={s.motiv.includes(i)} onChange={(e) => update({ motiv: e.target.checked ? [...s.motiv, i] : s.motiv.filter((x) => x !== i) })} className="size-5" />
              {o}
            </label>
          ))}
          <textarea data-testid="d-motiv-text" aria-label={dText.motivText} placeholder={dText.motivText} rows={3} value={s.motivText} onChange={(e) => update({ motivText: e.target.value })} className="rounded-md border border-border bg-background p-3" />
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border px-4 text-sm">
            {dText.addPhoto}
            <input type="file" accept="image/*" aria-label={dText.photoLabel} className="sr-only" />
          </label>
          <button type="button" data-testid="d-step-next" onClick={next} className={btn}>{dText.addMotiv}</button>
        </>
      )}
      {step === 7 && (
        <div className="flex flex-col gap-2">
          {dText.ecigOptions.map((o) => (
            <button key={o} type="button" data-testid="d-ecig" onClick={() => { update({ ecig: o }); next() }} className={ghost}>{o}</button>
          ))}
        </div>
      )}
    </section>
  )
}

/** First-run questions: congratulations, smoked today, date, day one, first badge. */
export function DayOne({ update, onAsk, onDone }: { update: (p: Partial<DState>) => void; onAsk: () => void; onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [ready, setReady] = useState(false)
  const [date, setDate] = useState(msToDate(Date.now()))
  useEffect(() => {
    if (step !== 0) return
    const id = setTimeout(() => setReady(true), 900)
    return () => clearTimeout(id)
  }, [step])
  return (
    <div data-testid="d-dayone" data-step={step}>
      <section className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 rounded-2xl bg-amber-500/30 p-6 text-center">
        <h2 className="text-3xl font-bold">{dText.congrats}</h2>
        <p>{dText.congratsLine}</p>
        <button type="button" data-testid="d-letsgo" disabled={!ready} onClick={() => setStep(1)} className={btn}>{dText.letsGo}</button>
      </section>
      {step === 1 && (
        <Sheet testId="d-smoked">
          <div className="flex flex-col gap-3 pt-2 text-center">
            <h3 className="text-lg font-semibold">{dText.smokedToday}</h3>
            <div className="flex gap-3">
              <button type="button" data-testid="d-smoked-no" onClick={() => { update({ askedDay: 1 }); setStep(2) }} className={btn}>{dText.no}</button>
              <button type="button" data-testid="d-smoked-yes" onClick={() => { update({ askedDay: 1 }); onAsk() }} className={btn}>{dText.yes}</button>
            </div>
          </div>
        </Sheet>
      )}
      {step === 2 && (
        <Sheet testId="d-date">
          <div className="flex flex-col gap-3 pt-2">
            <h3 className="text-lg font-semibold">{dText.dateTitle}</h3>
            <input data-testid="d-date-input" type="date" aria-label={dText.dateTitle} value={date} onChange={(e) => setDate(e.target.value)} className={input} />
            <button type="button" data-testid="d-date-go" disabled={!dateToMs(date)} onClick={() => { update({ quitMs: dateToMs(date) }); setStep(3) }} className={btn}>{dText.continue}</button>
          </div>
        </Sheet>
      )}
      {step === 3 && (
        <Sheet testId="d-dayone-sheet">
          <div className="flex flex-col items-center gap-3 pt-2 text-center">
            <span className="text-4xl" aria-hidden="true">{"🔥"}</span>
            <h3 className="text-lg font-semibold">{dText.dayOneTitle}</h3>
            <p className="text-sm">{dText.dayOneLine}</p>
            <button type="button" data-testid="d-dayone-go" onClick={() => setStep(4)} className={btn}>{dText.continue}</button>
          </div>
        </Sheet>
      )}
      {step === 4 && (
        <Sheet testId="d-badge-sheet">
          <div className="flex flex-col items-center gap-3 pt-2 text-center">
            <span className="text-4xl" aria-hidden="true">{"🏅"}</span>
            <h3 className="text-lg font-semibold">{dText.badgeTitle}</h3>
            <p className="text-sm">{dText.badgeLine}</p>
            <button type="button" data-testid="d-badge-share" onClick={() => share(dText.badgeLine)} className={ghost}>{dText.shareThis}</button>
            <button type="button" data-testid="d-badge-close" onClick={onDone} className={btn}>{dText.close}</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
