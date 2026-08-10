"use client"

/**
 * The nine-stage prototype from docs/research/change-your-life/03-flow-design.md.
 *
 * Each stage exists because the corpus proves a specific gap, and the panel says
 * which one. The three places this flow says *no* are the point of it:
 *
 *  - Stage 0 can end the flow instead of prescribing (crisis, or circumstances).
 *  - Stage 4 refuses a rep that costs more hours than the user said they have.
 *  - Stage 7 will not let a user routed here by the crisis answer choose to keep
 *    it to themselves.
 *
 * localStorage only. No API, no database, no LLM.
 */

import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  CYL_CANDIDATE_PROMPTS,
  CYL_CONSTRAINTS,
  CYL_DIFFERENTIAL,
  CYL_STAGES,
} from "@/src/goals/data/changeYourLife"
import {
  addRung,
  answerDifferential,
  candidateLines,
  checkFit,
  chooseOne,
  completedStages,
  defaultEndDate,
  emptyPlan,
  filledRungs,
  loadPlan,
  scoreDifferential,
  serializePlan,
  setCandidate,
  setCommitment,
  setConstraint,
  setDeferralDate,
  setRelapse,
  setRep,
  setRung,
  stageComplete,
  toggleShortlist,
  visibilityAllowed,
  weeklyHours,
  type CylCommitment,
  type CylPlan,
} from "@/src/goals/changeYourLifeService"

import { Callout, LabHeader, SectionHeading } from "./shared"

const STORAGE_KEY = "cyl-proto-v1"

export function PrototypeFlow() {
  const [plan, setPlan] = useState<CylPlan>(() => emptyPlan())
  const [step, setStep] = useState(0)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const restored = loadPlan(window.localStorage.getItem(STORAGE_KEY))
    if (restored) setPlan(restored)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, serializePlan(plan))
  }, [plan, hydrated])

  const update = useCallback((next: CylPlan) => setPlan(next), [])
  const result = useMemo(() => scoreDifferential(plan), [plan])
  const fit = useMemo(() => checkFit(plan), [plan])
  const done = completedStages(plan)
  const stage = CYL_STAGES[step]

  function reset() {
    window.localStorage.removeItem(STORAGE_KEY)
    setPlan(emptyPlan())
    setStep(0)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-8">
        <LabHeader
          eyebrow="Prototype · nine stages"
          title="The flow the research says to build"
          blurb="Each stage closes a gap the corpus proves. Three of them can refuse you — that is deliberate, and it is the part no video in the study does."
          backHref="/test/change-your-life"
          backLabel="Back to the research"
        >
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(done / CYL_STAGES.length) * 100}%` }}
              />
            </div>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {done} / {CYL_STAGES.length} complete
            </span>
            <Button size="sm" variant="ghost" onClick={reset} className="ml-auto text-muted-foreground">
              Start over
            </Button>
          </div>
        </LabHeader>

        {/* stage rail */}
        <div className="mb-8 flex gap-1.5 overflow-x-auto pb-1">
          {CYL_STAGES.map((s, i) => {
            const complete = stageComplete(plan, s.key)
            const active = i === step
            return (
              <button
                key={s.key}
                onClick={() => setStep(i)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : complete
                      ? "border-border bg-card text-muted-foreground hover:text-foreground"
                      : "border-dashed border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="font-mono tabular-nums text-[10px] text-primary">
                  {String(s.n).padStart(2, "0")}
                </span>
                <span className="whitespace-nowrap">{s.title}</span>
                {complete ? <span className="text-primary">✓</span> : null}
              </button>
            )
          })}
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <SectionHeading
            n={`Stage ${String(stage.n).padStart(2, "0")}`}
            title={stage.title}
            blurb={stage.summary}
          />

          {step === 0 ? <Differential plan={plan} update={update} result={result} /> : null}
          {step === 1 ? <Constraints plan={plan} update={update} /> : null}
          {step === 2 ? <Candidates plan={plan} update={update} /> : null}
          {step === 3 ? <Selection plan={plan} update={update} /> : null}
          {step === 4 ? <Rep plan={plan} update={update} fit={fit} /> : null}
          {step === 5 ? <Ladder plan={plan} update={update} /> : null}
          {step === 6 ? <Relapse plan={plan} update={update} /> : null}
          {step === 7 ? <Commitment plan={plan} update={update} /> : null}
          {step === 8 ? <Readback plan={plan} update={update} result={result} fit={fit} /> : null}

          <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            <p className="max-w-md text-right font-mono text-[10px] leading-relaxed text-muted-foreground">
              {stage.because}
            </p>
            <Button
              size="sm"
              disabled={step === CYL_STAGES.length - 1}
              onClick={() => setStep((s) => s + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ stage 0

function Differential({
  plan,
  update,
  result,
}: {
  plan: CylPlan
  update: (p: CylPlan) => void
  result: ReturnType<typeof scoreDifferential>
}) {
  return (
    <div className="space-y-6">
      {CYL_DIFFERENTIAL.map((q) => (
        <fieldset key={q.id}>
          <legend className="text-sm font-medium text-foreground">{q.question}</legend>
          {q.hint ? <p className="mt-1 text-xs text-muted-foreground">{q.hint}</p> : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {q.options.map((o, i) => {
              const selected = plan.differential[q.id] === i
              return (
                <button
                  key={o.label}
                  onClick={() => update(answerDifferential(plan, q.id, i))}
                  className={`rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                    selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}

      {result.crisis === "stop" && result.primary ? (
        <Callout label="This flow stops here" tone="warn">
          <p className="font-medium">{result.primary.verdict}</p>
          <p className="mt-2">{result.primary.next}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            In the UK: Samaritans, 116 123, free, any time. Elsewhere,{" "}
            <a
              className="underline underline-offset-2"
              href="https://findahelpline.com"
              target="_blank"
              rel="noreferrer"
            >
              findahelpline.com
            </a>
            . Nothing below this point is a substitute for that.
          </p>
        </Callout>
      ) : null}

      {result.crisis === "soft" ? (
        <Callout label="Worth saying out loud" tone="warn">
          You said you have stopped doing things you used to enjoy. That is a real signal, and it is not the same
          problem as being disorganised — this flow can still help, but if it has been weeks rather than days, tell
          someone who can actually assess it.
        </Callout>
      ) : null}

      {result.primary && result.crisis !== "stop" ? (
        <Callout label={result.stops ? "Read this before going on" : "Your primary constraint"}>
          <p className="font-medium">{result.primary.verdict}</p>
          <p className="mt-2">{result.primary.next}</p>
          {result.ranked.length > 1 ? (
            <p className="mt-3 font-mono text-[10px] text-muted-foreground">
              runners-up:{" "}
              {result.ranked
                .slice(1, 4)
                .filter((r) => r.score > 0)
                .map((r) => `${r.layer.label} ${r.score}`)
                .join(" · ") || "none"}
            </p>
          ) : null}
        </Callout>
      ) : null}

      <p className="font-mono text-[10px] text-muted-foreground">
        {result.answered} of {result.total} answered
      </p>
    </div>
  )
}

// ------------------------------------------------------------------ stage 1

function Constraints({ plan, update }: { plan: CylPlan; update: (p: CylPlan) => void }) {
  return (
    <div className="space-y-5">
      {CYL_CONSTRAINTS.map((f) => (
        <div key={f.id}>
          <label className="text-sm font-medium text-foreground">{f.label}</label>
          <p className="mt-0.5 text-xs text-muted-foreground">{f.hint}</p>
          {f.kind === "number" ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={plan.constraints[f.id] ?? ""}
                onChange={(e) => update(setConstraint(plan, f.id, e.target.value))}
                className="w-28 rounded-md border border-border bg-background px-3 py-1.5 text-sm tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="font-mono text-xs text-muted-foreground">{f.suffix}</span>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.choices?.map((c) => (
                <button
                  key={c}
                  onClick={() => update(setConstraint(plan, f.id, c))}
                  className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                    plan.constraints[f.id] === c
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      <Callout label="Why this comes before goals">
        Every framework in the study starts one step past where you are standing. The clearest measurement of it: a
        video whose whole method is “purge your kitchen” has 83,000 likes across two comments from people who do not
        control their kitchen.
      </Callout>
    </div>
  )
}

// ------------------------------------------------------------------ stage 2

function Candidates({ plan, update }: { plan: CylPlan; update: (p: CylPlan) => void }) {
  return (
    <div className="space-y-5">
      <Callout label="What this deliberately doesn’t ask">
        It never asks what your purpose is. That question formats an answer you already have and cannot produce one —
        which is where 20.4 million viewers of the best-known purpose framework stall. Every prompt below asks about
        something that already happened.
      </Callout>
      {CYL_CANDIDATE_PROMPTS.map((p) => (
        <div key={p.id}>
          <label className="text-sm font-medium text-foreground">{p.question}</label>
          <p className="mt-0.5 text-xs text-muted-foreground">{p.hint}</p>
          <textarea
            rows={2}
            value={plan.candidates[p.id] ?? ""}
            onChange={(e) => update(setCandidate(plan, p.id, e.target.value))}
            className="mt-2 w-full rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ stage 3

function Selection({ plan, update }: { plan: CylPlan; update: (p: CylPlan) => void }) {
  const lines = candidateLines(plan)

  if (lines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing to choose between yet — write at least one answer in stage 02 first.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-foreground">Shortlist what’s actually live</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Tap to add or remove. Three or fewer.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {lines.map((l) => (
            <button
              key={l}
              onClick={() => update(toggleShortlist(plan, l))}
              className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                plan.shortlist.includes(l)
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {plan.shortlist.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-foreground">
            If you could only move one forward in the next 90 days
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ninety days, because past that nobody can see the shape of their year.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {plan.shortlist.map((l) => (
              <button
                key={l}
                onClick={() => update(chooseOne(plan, l))}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  plan.chosen === l
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {plan.deferred.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-foreground">What you are choosing not to do</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Each one gets a date you will look at it again. A cut with no return date is why people keep all six.
          </p>
          <div className="mt-2 space-y-2">
            {plan.deferred.map((d) => (
              <div key={d.text} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-muted-foreground line-through">{d.text}</span>
                <input
                  type="date"
                  value={d.until}
                  onChange={(e) => update(setDeferralDate(plan, d.text, e.target.value))}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ------------------------------------------------------------------ stage 4

function Rep({
  plan,
  update,
  fit,
}: {
  plan: CylPlan
  update: (p: CylPlan) => void
  fit: ReturnType<typeof checkFit>
}) {
  return (
    <div className="space-y-5">
      {plan.chosen ? (
        <p className="text-sm text-muted-foreground">
          For: <span className="font-medium text-foreground">{plan.chosen}</span>
        </p>
      ) : null}

      <div>
        <label className="text-sm font-medium text-foreground">
          The smallest version you could do on your worst day of the last month
        </label>
        <input
          value={plan.rep.action}
          onChange={(e) => update(setRep(plan, { action: e.target.value }))}
          placeholder="e.g. put my running shoes on and step outside"
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">A rep is done when…</label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The corpus never writes this down. Without it you will argue with yourself about whether it counted.
        </p>
        <input
          value={plan.rep.counts}
          onChange={(e) => update(setRep(plan, { counts: e.target.value }))}
          placeholder="e.g. both feet are on the pavement"
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">What already happens right before it</label>
        <input
          value={plan.rep.anchor}
          onChange={(e) => update(setRep(plan, { anchor: e.target.value }))}
          placeholder="e.g. I finish my coffee"
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground">Minutes a day</label>
          <input
            type="number"
            min={1}
            value={plan.rep.minutesPerDay}
            onChange={(e) => update(setRep(plan, { minutesPerDay: Number(e.target.value) || 0 }))}
            className="mt-2 w-24 rounded-md border border-border bg-background px-3 py-1.5 text-sm tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Days a week</label>
          <input
            type="number"
            min={1}
            max={7}
            value={plan.rep.daysPerWeek}
            onChange={(e) => update(setRep(plan, { daysPerWeek: Number(e.target.value) || 0 }))}
            className="mt-2 w-24 rounded-md border border-border bg-background px-3 py-1.5 text-sm tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <Callout label={fit.ok ? "The fit test" : "The fit test says no"} tone={fit.ok ? "primary" : "warn"}>
        {fit.message}
        {weeklyHours(plan) === 0 ? null : (
          <span className="mt-2 block font-mono text-[10px] text-muted-foreground">
            {fit.needed}h needed · {fit.available}h available
          </span>
        )}
      </Callout>
    </div>
  )
}

// ------------------------------------------------------------------ stage 5

function Ladder({ plan, update }: { plan: CylPlan; update: (p: CylPlan) => void }) {
  return (
    <div className="space-y-5">
      <Callout label="The one mechanism that moved people at the floor">
        Every rung ends with explicit permission to walk away. That is what removes the outcome from the rep — the
        action is complete on execution, not on result. It is the only mechanism in 91 videos with reported behaviour
        change from people who described themselves as starting below zero.
      </Callout>

      <div className="space-y-3">
        {plan.ladder.map((rung, i) => (
          <div key={i} className="grid grid-cols-[28px_1fr] items-center gap-3">
            <span className="font-mono text-xs tabular-nums text-primary">{i + 1}</span>
            <div className="flex items-center gap-2">
              <input
                value={rung}
                onChange={(e) => update(setRung(plan, i, e.target.value))}
                placeholder={
                  i === 0 ? "the easiest possible version — barely counts" : "barely harder than the one above"
                }
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:inline">
                …then you’re free to go
              </span>
            </div>
          </div>
        ))}
      </div>

      <Button size="sm" variant="outline" onClick={() => update(addRung(plan))}>
        Add a rung
      </Button>

      <p className="text-xs text-muted-foreground">
        Advance when the current rung feels easy — an ease criterion, not a calendar. {filledRungs(plan).length} of{" "}
        {plan.ladder.length} written.
      </p>
    </div>
  )
}

// ------------------------------------------------------------------ stage 6

function Relapse({ plan, update }: { plan: CylPlan; update: (p: CylPlan) => void }) {
  return (
    <div className="space-y-5">
      <Callout label="Write this now, while nothing has gone wrong">
        The largest unserved gap in the whole study. One video names the exact day people collapse — day four — and
        then never says what to do about it. A challenge that makes you restart from day one on any miss produces a
        comment section full of day-one pledges and essentially no finishers.
      </Callout>

      <div>
        <label className="text-sm font-medium text-foreground">
          Write what you’d say to someone you love who fell off track
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Use their name. When you’re done, cross it out and write your own — that is the whole exercise.
        </p>
        <textarea
          rows={6}
          value={plan.relapse.letter}
          onChange={(e) => update(setRelapse(plan, { letter: e.target.value }))}
          className="mt-2 w-full rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-foreground">Where it will break</label>
          <input
            value={plan.relapse.trigger}
            onChange={(e) => update(setRelapse(plan, { trigger: e.target.value }))}
            placeholder="e.g. the first week I travel"
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">What you’ll do instead</label>
          <input
            value={plan.relapse.instead}
            onChange={(e) => update(setRelapse(plan, { instead: e.target.value }))}
            placeholder="e.g. the one-minute version, in the hotel room"
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">The rules, stated up front</p>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
          <li>Never miss twice.</li>
          <li>A miss resets nothing. Day 34 is never worth the same as day 0.</li>
          <li>The miss is data: what set it off, what you told yourself, what changes next time.</li>
        </ul>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ stage 7

function Commitment({ plan, update }: { plan: CylPlan; update: (p: CylPlan) => void }) {
  const options: { id: CylCommitment["visibility"]; label: string; blurb: string }[] = [
    { id: "private", label: "Just me", blurb: "Nobody sees it." },
    { id: "partner", label: "One person", blurb: "Someone you name gets the check-in." },
    { id: "public", label: "Strangers", blurb: "A visible log, like the comment sections do it." },
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-foreground">Start</label>
          <input
            type="date"
            value={plan.commitment.startDate}
            onChange={(e) => {
              const startDate = e.target.value
              const endDate = plan.commitment.endDate || defaultEndDate(startDate)
              update(setCommitment(plan, { startDate, endDate }))
            }}
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Come back on</label>
          <input
            type="date"
            value={plan.commitment.endDate}
            onChange={(e) => update(setCommitment(plan, { endDate: e.target.value }))}
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">Who sees this</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The study genuinely disagrees on this one, so it is your call — with one floor.
        </p>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {options.map((o) => {
            const allowed = visibilityAllowed(plan, o.id)
            const selected = plan.commitment.visibility === o.id
            return (
              <button
                key={o.id}
                disabled={!allowed}
                onClick={() => update(setCommitment(plan, { visibility: o.id }))}
                className={`rounded-md border p-3 text-left text-sm transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : allowed
                      ? "border-border bg-background text-muted-foreground hover:text-foreground"
                      : "cursor-not-allowed border-dashed border-border text-muted-foreground/50"
                }`}
              >
                <span className="font-medium">{o.label}</span>
                <span className="mt-0.5 block text-xs">{allowed ? o.blurb : "Not available on this route."}</span>
              </button>
            )
          })}
        </div>
      </div>

      {!visibilityAllowed(plan, "private") ? (
        <Callout label="Why that option is off" tone="warn">
          You told us something in stage 00 that makes going it alone the wrong default. Low social support and an
          aversion to telling anyone are exactly what makes that state dangerous — so this flow will not help you keep
          it to yourself.
        </Callout>
      ) : null}

      {plan.commitment.visibility === "partner" ? (
        <div>
          <label className="text-sm font-medium text-foreground">Who</label>
          <input
            value={plan.commitment.partnerName}
            onChange={(e) => update(setCommitment(plan, { partnerName: e.target.value }))}
            placeholder="A name, not a category"
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      ) : null}
    </div>
  )
}

// ------------------------------------------------------------------ stage 8

function Readback({
  plan,
  update,
  result,
  fit,
}: {
  plan: CylPlan
  update: (p: CylPlan) => void
  result: ReturnType<typeof scoreDifferential>
  fit: ReturnType<typeof checkFit>
}) {
  const rows: [string, string][] = [
    ["Your constraint", result.primary?.verdict ?? "not established yet"],
    ["The one thing", plan.chosen || "not chosen yet"],
    ["The rep", plan.rep.action || "not written yet"],
    ["It counts when", plan.rep.counts || "not defined yet"],
    ["Costs", `${fit.needed}h a week of the ${fit.available}h you have`],
    ["First rung", filledRungs(plan)[0] ?? "not written yet"],
    ["When you miss", plan.relapse.instead || "not written yet"],
    [
      "Running",
      plan.commitment.startDate && plan.commitment.endDate
        ? `${plan.commitment.startDate} → ${plan.commitment.endDate}`
        : "no dates yet",
    ],
    ["Seen by", plan.commitment.visibility],
  ]

  return (
    <div className="space-y-5">
      <Callout label="The thing one video in 91 says out loud">
        Nobody tells you how long it takes. The estimates in this study span thirty days to fifteen years for the same
        request — so people quit at month three of a three-year process and conclude it works for other people. Write
        your honest horizon here, even if the honest answer is that you don’t know.
      </Callout>

      <div>
        <label className="text-sm font-medium text-foreground">How long do you actually think this takes?</label>
        <input
          value={plan.horizon}
          onChange={(e) => update({ ...plan, horizon: e.target.value })}
          placeholder="e.g. two years before it feels normal, and I won’t judge it before month six"
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-border/60 last:border-0">
                <td className="w-40 bg-muted/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {k}
                </td>
                <td className="px-3 py-2 text-foreground">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plan.deferred.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Coming back up:{" "}
          {plan.deferred.map((d) => `${d.text}${d.until ? ` (${d.until})` : " (no date yet)"}`).join(" · ")}
        </p>
      ) : null}
    </div>
  )
}
