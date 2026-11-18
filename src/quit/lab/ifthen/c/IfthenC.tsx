"use client"

import { useState } from "react"
import { InferredTag, Placeholder, PlaceholderScreen, Tabs } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import { EMPTY_PLAN, parseScale, type Plan } from "./logic"
import { icText } from "./text"

type Screen = "list" | "form" | "saved" | "cba" | "urge" | "urge-flow"

const area = "min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
const box = "min-h-11 w-full min-w-0 rounded-md border border-border bg-background px-2"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 border-t border-border p-3 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  )
}

/** Copy C: the toolkit list, the change-plan worksheet as a form (every field free text or a 1 to 10 number), and the urges screen. */
export function IfthenC() {
  const [tab, setTab] = useState(0)
  const [screen, setScreen] = useState<Screen>("list")
  const [plan, setPlan] = useLabState<Plan>("ifthen", "c", "plan", EMPTY_PLAN)
  const patch = (p: Partial<Plan>) => setPlan({ ...plan, ...p })
  const setHelper = (i: number, k: "person" | "help", v: string) => patch({ helpers: plan.helpers.map((h, j) => (j === i ? { ...h, [k]: v } : h)) })

  const go = (i: number) => {
    setTab(i)
    setScreen(i === 0 ? "list" : "urge")
  }
  const tabs = (
    <div className="mb-3">
      <Tabs id="c-tab" items={icText.screens} value={tab} onChange={go} />
    </div>
  )

  let body: React.ReactNode
  if (screen === "form") {
    body = (
      <form data-testid="c-form" onSubmit={(e) => { e.preventDefault(); setScreen("saved") }} className="flex flex-col gap-3 pb-6">
        <div className="flex items-center gap-2">
          <button type="button" data-testid="screen-back" aria-label={icText.back} onClick={() => setScreen("list")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
            {"‹"}
          </button>
          <h2 className="min-w-0 flex-1 text-lg font-semibold">{icText.formTitle}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{icText.formIntro}</p>
        <div className="rounded-lg border border-border bg-card">
          <label className="flex items-center gap-3 p-3 text-sm">
            <span className="flex-1 font-semibold">{icText.planHeader}</span>
            <span>{icText.date}</span>
            <input type="date" data-testid="c-date" aria-label={icText.date} value={plan.date} onChange={(e) => patch({ date: e.target.value })} className={`${box} w-36 px-1 text-sm`} />
          </label>
          <Field label={icText.changes}>
            <textarea data-testid="c-changes" value={plan.changes} onChange={(e) => patch({ changes: e.target.value })} className={area} />
          </Field>
          <Field label={icText.importance}>
            <input data-testid="c-importance" inputMode="numeric" value={plan.importance} onChange={(e) => patch({ importance: parseScale(e.target.value, plan.importance) })} className={`${box} w-24`} />
          </Field>
          <Field label={icText.confidence}>
            <input data-testid="c-confidence" inputMode="numeric" value={plan.confidence} onChange={(e) => patch({ confidence: parseScale(e.target.value, plan.confidence) })} className={`${box} w-24`} />
          </Field>
          <Field label={icText.reasons}>
            <textarea data-testid="c-reasons" value={plan.reasons} onChange={(e) => patch({ reasons: e.target.value })} className={area} />
          </Field>
          <Field label={icText.steps}>
            <textarea data-testid="c-steps" value={plan.steps} onChange={(e) => patch({ steps: e.target.value })} className={area} />
          </Field>
          <div data-testid="c-helpers" className="flex flex-col gap-2 border-t border-border p-3 text-sm">
            <span className="font-semibold">{icText.helpTitle}</span>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-muted-foreground">
              <span>{icText.person}</span>
              <span>{icText.kind}</span>
            </div>
            {plan.helpers.map((h, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input data-testid={`c-person-${i}`} aria-label={`${icText.personRow} ${i + 1}`} value={h.person} onChange={(e) => setHelper(i, "person", e.target.value)} className={box} />
                <input data-testid={`c-help-${i}`} aria-label={`${icText.kindRow} ${i + 1}`} value={h.help} onChange={(e) => setHelper(i, "help", e.target.value)} className={box} />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <button type="button" data-testid="c-add-row" onClick={() => patch({ helpers: [...plan.helpers, { person: "", help: "" }] })} className="min-h-11 rounded-md border border-border px-3">
                {icText.addRow}
              </button>
              <InferredTag />
            </div>
          </div>
          <Field label={icText.working}>
            <textarea data-testid="c-working" value={plan.working} onChange={(e) => patch({ working: e.target.value })} className={area} />
          </Field>
          <Field label={icText.interfere}>
            <textarea data-testid="c-interfere" value={plan.interfere} onChange={(e) => patch({ interfere: e.target.value })} className={area} />
          </Field>
          <label className="flex flex-col gap-1.5 border-t border-border p-3 text-sm">
            <span className="font-semibold">{icText.checkin}</span>
            <input type="date" data-testid="c-checkin" value={plan.checkin} onChange={(e) => patch({ checkin: e.target.value })} className={`${box} w-44`} />
          </label>
          <p data-testid="c-note" className="border-t border-border p-3 text-sm text-muted-foreground">
            {icText.checkinNote}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" data-testid="c-save" className="min-h-12 flex-1 rounded-md bg-primary px-4 font-medium text-primary-foreground">
            {icText.save}
          </button>
          <InferredTag />
        </div>
      </form>
    )
  } else if (screen === "saved") {
    body = <PlaceholderScreen title={icText.savedTitle} onBack={() => setScreen("form")} />
  } else if (screen === "cba") {
    body = <PlaceholderScreen title={icText.cards[1].title} onBack={() => setScreen("list")} />
  } else if (screen === "urge") {
    body = (
      <section data-testid="c-urges" className="flex flex-col gap-3">
        <div className="rounded-lg bg-blue-950 p-4 text-blue-50">
          <h2 className="mb-1 text-lg font-semibold">{icText.urgesTitle}</h2>
          <p className="mb-3 text-sm">{icText.urgesLine}</p>
          <button type="button" data-testid="c-urge-btn" onClick={() => setScreen("urge-flow")} className="min-h-12 w-full rounded-md bg-red-600 px-4 font-semibold text-white">
            {icText.urgesButton}
          </button>
        </div>
        <div className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">{icText.urgesPhoto}</div>
        <div className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">{icText.urgesArticle}</div>
      </section>
    )
  } else {
    body = (
      <section data-testid="c-list" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{icText.toolkitTitle}</h2>
        {icText.cards.map((c) => (
          <div key={c.title} data-testid={`c-card-${c.testId}`} className="flex flex-col gap-2 rounded-xl bg-blue-950 p-4 text-blue-50">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-blue-100">{c.line}</p>
            <button type="button" data-testid={`c-learn-${c.testId}`} onClick={() => setScreen(c.testId === "plan" ? "form" : "cba")} className="min-h-11 self-start rounded-md border border-blue-200 px-4 text-sm">
              {icText.learnMore} {"›"}
            </button>
          </div>
        ))}
        <Placeholder />
      </section>
    )
  }

  return (
    <div data-testid="ifthen-c" data-screen={screen} className="pb-6">
      {tabs}
      {screen === "urge-flow" ? <PlaceholderScreen title={icText.urgeFlow} onBack={() => setScreen("urge")} /> : body}
    </div>
  )
}
