"use client"

import { useState } from "react"
import { BottomNav, InferredTag, Placeholder, PlaceholderScreen } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import { NotCopied, toggled } from "../shared/Bits"
import { bsText } from "../shared/text"
import { CONTEXTS, FEELINGS, OPEN_AT, PRESETS, QUESTIONS, SLIDER_STEPS, VOICE_GIVES, clampStep, clock, insightKey, insightSeen, persona, presetStep } from "./logic"
import { cText } from "./text"

type Screen = "intro" | "quiz" | "result" | "moment" | "confirm" | "app"

const MOMENT_POINTS = 15

/** Copy C: a nine-question quiz with a persona result, then "your moment", the Voice flow and the belief task. */
export function BeliefsC() {
  const [screen, setScreen] = useLabState<Screen>("beliefs", "c", "screen", "intro")
  const [q, setQ] = useLabState<number>("beliefs", "c", "q", 0)
  const [answers, setAnswers] = useLabState<(number | null)[]>("beliefs", "c", "answers", Array(QUESTIONS).fill(null))
  const [step, setStep] = useLabState<number>("beliefs", "c", "moment", OPEN_AT)
  const [tab, setTab] = useState(0)
  const [pull, setPull] = useState(false)
  const [voiceCount, setVoiceCount] = useLabState<number>("beliefs", "c", "voiceCount", 0)
  const [learned, setLearned] = useLabState<string>("beliefs", "c", "learned", "")
  const [where, setWhere] = useLabState<string>("beliefs", "c", "where", "")
  const [why, setWhy] = useLabState<string>("beliefs", "c", "why", "")
  const [beliefSaved, setBeliefSaved] = useLabState<boolean>("beliefs", "c", "beliefSaved", false)
  const [whySaved, setWhySaved] = useLabState<boolean>("beliefs", "c", "whySaved", false)
  const points = (screen === "app" || screen === "confirm" ? MOMENT_POINTS * 2 : 0) + (beliefSaved ? MOMENT_POINTS : 0) + (whySaved ? MOMENT_POINTS : 0)

  const pick = (i: number) => {
    const next = [...answers]
    next[q] = i
    setAnswers(next)
    if (q + 1 < QUESTIONS) setQ(q + 1)
    else setScreen("result")
  }
  const restart = () => {
    setAnswers(Array(QUESTIONS).fill(null))
    setQ(0)
    setScreen("intro")
  }

  if (screen === "intro") {
    return (
      <div data-testid="beliefs-c" data-screen="intro" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-2xl font-semibold">{cText.introTitle}</h2>
        <p className="text-sm text-muted-foreground">{cText.introLine}</p>
        <button type="button" data-testid="c-intro-cta" onClick={() => setScreen("quiz")} className="min-h-12 rounded-md bg-orange-500 px-4 text-base font-semibold text-white">
          {cText.introCta}
        </button>
      </div>
    )
  }

  if (screen === "quiz") {
    const item = cText.questions[q]
    return (
      <div data-testid="beliefs-c" data-screen={`q${q + 1}`} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="h-1 w-full overflow-hidden rounded-full bg-border">
          <div data-testid="c-progress" data-value={q + 1} className="h-full bg-green-600" style={{ width: `${((q + 1) / QUESTIONS) * 100}%` }} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <button type="button" data-testid="screen-back" onClick={() => (q === 0 ? setScreen("intro") : setQ(q - 1))} className="inline-flex min-h-11 items-center text-muted-foreground underline">
            {cText.back}
          </button>
          <span data-testid="c-qcount">{cText.questionOf(q + 1, QUESTIONS)}</span>
        </div>
        <h2 className="font-serif text-xl text-green-300">{item.q}</h2>
        <div className="flex flex-col gap-2" role="radiogroup">
          {item.a.map((a, i) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={answers[q] === i}
              data-testid={`c-answer-${i}`}
              onClick={() => pick(i)}
              className={`min-h-14 rounded-lg border px-3 py-2 text-left text-sm ${answers[q] === i ? "border-green-500" : "border-border"}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (screen === "result") {
    const p = persona(answers.map((a) => (a === null ? undefined : a)))
    const info = cText.personas[p]
    return (
      <div data-testid="beliefs-c" data-screen="result" data-persona={p} className="flex flex-col gap-3 text-center">
        <button type="button" data-testid="screen-back" onClick={() => { setQ(QUESTIONS - 1); setScreen("quiz") }} className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline">
          {cText.back}
        </button>
        <p className="font-serif text-2xl italic text-orange-400">{info.name}</p>
        {p !== cText.personaSeen && <InferredTag />}
        {p === cText.personaSeen ? (
          <>
            <p className="font-semibold">{info.line}</p>
            <p className="text-sm text-muted-foreground">{info.body}</p>
          </>
        ) : (
          <Placeholder />
        )}
        <p className="text-sm font-semibold">{cText.resultNote}</p>
        {cText.resultCards.map((c, i) => (
          <div key={c} className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-left text-sm">
            {c}
            <NotCopied label={bsText.notCopiedSales} testId={`c-sales-${i}`} />
          </div>
        ))}
        <button type="button" data-testid="c-to-moment" onClick={() => setScreen("moment")} className="min-h-12 rounded-md bg-primary px-4 text-base font-semibold text-primary-foreground">
          {cText.toMoment}
        </button>
        <button type="button" data-testid="c-retake" onClick={restart} className="inline-flex min-h-11 items-center justify-center text-sm text-muted-foreground underline">
          {cText.tryAgain}
        </button>
      </div>
    )
  }

  if (screen === "moment") {
    const t = clock(step)
    const key = insightKey(step)
    return (
      <div data-testid="beliefs-c" data-screen="moment" className="flex flex-col gap-4 rounded-xl bg-gradient-to-b from-green-900/70 to-green-950 p-4 text-green-50">
        <div className="flex items-center gap-3">
          <button type="button" data-testid="screen-back" aria-label={cText.back} onClick={() => setScreen("result")} className="inline-flex size-11 items-center justify-center rounded-full bg-background/80 text-lg text-foreground">
            {"←"}
          </button>
          <span className="font-mono text-xs text-yellow-200">{cText.momentTag}</span>
        </div>
        <p className="font-mono text-xs text-yellow-200">{cText.noticing}</p>
        <h2 className="font-serif text-3xl">{cText.momentTitle}</h2>
        <p className="font-semibold">{cText.momentQ}</p>
        <p className="text-sm text-green-100/80">{cText.momentLine}</p>
        <p data-testid="c-time" className="text-center font-serif text-5xl text-yellow-200">
          {t}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" data-testid="c-minus" aria-label={`-${cText.minus15}`} onClick={() => setStep(clampStep(step - 1))} className="min-h-11 shrink-0 rounded-full bg-background/80 px-3 text-sm text-foreground">
            {"−"} {cText.minus15}
          </button>
          <input type="range" data-testid="c-slider" min={0} max={SLIDER_STEPS} step={1} value={step} onChange={(e) => setStep(Number(e.target.value))} aria-label={cText.momentTitle} className="h-11 min-w-0 flex-1 accent-yellow-300" />
          <button type="button" data-testid="c-plus" aria-label={`+${cText.plus15}`} onClick={() => setStep(clampStep(step + 1))} className="min-h-11 shrink-0 rounded-full bg-background/80 px-3 text-sm text-foreground">
            {"+"} {cText.plus15}
          </button>
        </div>
        <div className="flex justify-between text-sm text-green-100/80">
          <span>{cText.startEnd[0]}</span>
          <span>{cText.startEnd[1]}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              data-testid={`c-chip-${p.key}`}
              aria-pressed={step === presetStep(p.at)}
              onClick={() => setStep(presetStep(p.at))}
              className={`flex min-h-14 flex-col items-center justify-center rounded-full px-2 text-center text-sm ${step === presetStep(p.at) ? "bg-yellow-200 text-green-950" : "bg-background/90 text-foreground"} ${p.key === "lateNight" ? "col-span-2" : ""}`}
            >
              <span>{cText.presets[p.key]}</span>
              <span className="text-xs">({cText.presetTimes[p.key]})</span>
            </button>
          ))}
        </div>
        <div data-testid="c-insight" data-key={key} className="flex flex-col gap-1 text-sm">
          <span>{t}</span>
          {insightSeen(step) ? <span>{cText.insights[key as "afterWork" | "six"]}</span> : <Placeholder />}
        </div>
        {!insightSeen(step) && (
          <p className="flex items-center gap-2 text-xs text-green-100/80">
            <InferredTag />
            {cText.insightInferred}
          </p>
        )}
        <p className="flex items-center gap-2 text-xs text-green-100/80">
          <InferredTag />
          {cText.saveMomentInferred}
        </p>
        <button type="button" data-testid="c-save-moment" onClick={() => setScreen("confirm")} className="min-h-12 rounded-full bg-yellow-200 px-4 text-base font-semibold text-green-950">
          {cText.saveMoment}
        </button>
      </div>
    )
  }

  if (screen === "confirm") {
    return (
      <div data-testid="beliefs-c" data-screen="confirm" className="flex flex-col gap-4 rounded-xl bg-gradient-to-b from-green-900/70 to-green-950 p-4 text-green-50">
        <p data-testid="c-points" data-value={points} className="self-end rounded-full bg-background/80 px-3 py-1 text-sm text-foreground">
          {cText.pointsTotal(points)}
        </p>
        <h2 className="font-serif text-2xl">{cText.onceMore}</h2>
        <NotCopied label={bsText.otherTool} testId="c-group" />
        <p className="text-sm">{cText.groupLine}</p>
        <button type="button" data-testid="c-skip" onClick={() => setScreen("app")} className="min-h-12 rounded-full bg-background/90 px-4 text-sm font-semibold text-foreground">
          {cText.skip}
        </button>
        {[cText.tick1, cText.tick2].map((l) => (
          <div key={l} className="flex flex-col gap-1 text-sm">
            <span>
              {"✓"} {l}
            </span>
            <span className="font-semibold text-yellow-200">{cText.points(MOMENT_POINTS)}</span>
          </div>
        ))}
        <p className="text-sm">{cText.reminder(clock(step))}</p>
        <p className="text-xs text-green-100/80">{cText.reminderNote}</p>
      </div>
    )
  }

  return (
    <div data-testid="beliefs-c" data-screen={`app-${tab}`} className="flex flex-col gap-3">
      <p data-testid="c-points" data-value={points} className="self-end rounded-full border border-border bg-card px-3 py-1 text-sm">
        {cText.pointsTotal(points)}
      </p>
      {tab === 0 && (
        <section data-testid="c-home" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-lg font-semibold">{cText.homeTitle}</h2>
            <InferredTag />
          </div>
          <p className="text-xs text-muted-foreground">{cText.homeInferred}</p>
          <div className="rounded-xl border border-border bg-card p-3 text-sm">
            <p>
              {cText.heardTimes}: <span data-testid="c-count">{voiceCount}</span>
            </p>
            {voiceCount > 0 && <p className="font-semibold">{cText.noticedToday}</p>}
          </div>
          <button type="button" data-testid="c-pull" onClick={() => setPull(true)} className="min-h-12 rounded-full bg-primary px-4 text-base font-semibold text-primary-foreground">
            {cText.pullBtn}
          </button>
          <div data-testid="c-why-card" className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="font-semibold">{cText.yourWhy}</p>
            <Placeholder />
          </div>
        </section>
      )}
      {tab === 1 && (
        <section data-testid="c-moves" className="flex flex-col gap-3">
          <div className="rounded-xl bg-green-800 p-4 text-white">
            <p className="font-semibold">{cText.movesHero}</p>
            <p className="text-sm">{cText.movesLine}</p>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <InferredTag />
            {cText.pointsInferred}
          </p>
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
            <p className="flex justify-between font-semibold">
              {cText.moveBelief} <span className="text-sm text-yellow-300">{cText.movePoints(MOMENT_POINTS)}</span>
            </p>
            <label className="flex flex-col gap-1 text-sm">
              {cText.beliefPrompt}
              <textarea data-testid="c-learned" value={learned} onChange={(e) => setLearned(e.target.value)} rows={2} className="rounded-md border border-border bg-background p-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {cText.beliefWhere}
              <textarea data-testid="c-where" value={where} onChange={(e) => setWhere(e.target.value)} rows={2} className="rounded-md border border-border bg-background p-2" />
            </label>
            <button type="button" data-testid="c-belief-save" disabled={!learned.trim()} onClick={() => setBeliefSaved(true)} className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40">
              {beliefSaved ? cText.saved : cText.save}
            </button>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
            <p className="flex justify-between font-semibold">
              {cText.moveWhy} <span className="text-sm text-yellow-300">{cText.movePoints(MOMENT_POINTS)}</span>
            </p>
            <label className="flex flex-col gap-1 text-sm">
              {cText.whyPrompt}
              <textarea data-testid="c-why" value={why} onChange={(e) => setWhy(e.target.value)} rows={2} className="rounded-md border border-border bg-background p-2" />
            </label>
            <button type="button" data-testid="c-why-save" disabled={!why.trim()} onClick={() => setWhySaved(true)} className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40">
              {whySaved ? cText.saved : cText.save}
            </button>
          </div>
        </section>
      )}
      {tab >= 2 && <PlaceholderScreen title={cText.tabs[tab]} onBack={null} />}
      <BottomNav id="c-tab" items={cText.tabs} value={tab} onChange={setTab} />
      {pull && <Sheet time={clock(step)} onClose={() => setPull(false)} count={voiceCount} onSave={() => setVoiceCount(voiceCount + 1)} />}
    </div>
  )
}

function Sheet({ time, onClose, count, onSave }: { time: string; onClose: () => void; count: number; onSave: () => void }) {
  const [voice, setVoice] = useState("")
  const [gives, setGives] = useState<string | null>(null)
  const [feeling, setFeeling] = useState<string | null>(null)
  const [ctx, setCtx] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const save = () => {
    onSave()
    setSaved(true)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" data-testid="c-sheet">
      <div className="flex max-h-[92vh] w-full flex-col gap-3 overflow-y-auto rounded-t-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <h2 className="font-serif text-2xl">{cText.sheetTitle}</h2>
            <p className="text-sm text-muted-foreground">{cText.sheetLine}</p>
          </div>
          <button type="button" data-testid="c-sheet-close" aria-label={cText.close} onClick={onClose} className="inline-flex size-11 items-center justify-center rounded-full border border-border text-lg">
            {"×"}
          </button>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-violet-400/50 p-3 text-sm">
          <p>
            {cText.heardTimes}: <span data-testid="c-sheet-count">{count}</span>
          </p>
          {saved && <p data-testid="c-sheet-noticed" className="font-semibold">{cText.noticedToday}</p>}
          <p className="font-mono text-xs">{cText.voiceLabel}</p>
          <p>{cText.voiceAround(time)}</p>
        </div>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {cText.nameIt}
          <textarea data-testid="c-voice" value={voice} onChange={(e) => setVoice(e.target.value)} rows={3} className="rounded-md border border-border bg-background p-2 font-normal focus:ring-2 focus:ring-green-500" />
        </label>
        <p className="text-sm text-muted-foreground">{cText.tryingToGive}</p>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {VOICE_GIVES.map((g) => (
            <Chip key={g} testId={`c-gives-${g}`} on={gives === g} onClick={() => setGives(g)}>
              {cText.gives[g]}
            </Chip>
          ))}
          <Chip
            testId="c-noticed"
            on={gives === "noticed"}
            onClick={() => {
              setGives("noticed")
              save()
            }}
          >
            {cText.noticed}
          </Chip>
        </div>
        <h3 className="font-semibold">{cText.feelingTitle}</h3>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {FEELINGS.map((f) => (
            <Chip key={f} testId={`c-feeling-${f}`} on={feeling === f} onClick={() => setFeeling(f)}>
              {cText.feelings[f]}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {CONTEXTS.map((c) => (
            <Chip key={c} testId={`c-ctx-${c}`} on={ctx.includes(c)} onClick={() => setCtx(toggled(ctx, c))}>
              {cText.contexts[c]}
            </Chip>
          ))}
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <InferredTag />
          {cText.saveInferred}
        </p>
        <button type="button" data-testid="c-sheet-save" onClick={save} className="min-h-12 rounded-md bg-primary px-4 text-base font-semibold text-primary-foreground">
          {cText.save}
        </button>
        <NotCopied label={`${cText.talkHelper}: ${bsText.otherTool}`} testId="c-helper" />
      </div>
    </div>
  )
}

function Chip({ children, on, onClick, testId }: { children: React.ReactNode; on: boolean; onClick: () => void; testId: string }) {
  return (
    <button type="button" data-testid={testId} aria-pressed={on} onClick={onClick} className={`inline-flex min-h-11 items-center justify-center rounded-full border px-3 text-sm ${on ? "border-green-500 bg-green-500/20" : "border-border bg-background"}`}>
      {children}
    </button>
  )
}
