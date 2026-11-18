"use client"

import { useState } from "react"
import { ExampleBar, Head, InferredTag, Placeholder, PlaceholderScreen, Tabs } from "../../progress/shared/Bits"
import { Donut } from "../shared/Bits"
import { useDiary } from "../shared/hooks"
import { dayKey, dotDate, pctText, sum } from "../shared/logic"
import { type Craving, type Note, TRIGGER_CATEGORY, TRIGGER_COUNT, seedCravings, seedNotes, triggerShares } from "./logic"
import { eText } from "./text"

type Screen = "stats" | "history" | "add" | "diary" | "new" | "relapse"

const COLORS = ["#c2fb87", "#fff48a", "#ffd08a", "#8ae8ff", "#ff8fa3", "#c9b6ff", "#a5f0c4", "#ffb48a", "#9ec5ff", "#f5e1a0", "#d6f08a", "#ffc2e0"]
const makeNotes = (now: number) => seedNotes(now, eText.seedTitles, eText.seedBodies)

function MoodFace({ mood }: { mood: "neutral" | "smile" }) {
  return (
    <svg viewBox="0 0 40 40" className="size-11 shrink-0" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill={mood === "smile" ? "#b8f58a" : "#fff48a"} />
      <circle cx="14" cy="16" r="2" fill="#222" />
      <circle cx="26" cy="16" r="2" fill="#222" />
      {mood === "smile" ? <path d="M11 24 Q20 34 29 24" fill="none" stroke="#222" strokeWidth="2.5" strokeLinecap="round" /> : <path d="M13 27 H27" stroke="#222" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  )
}

/** Copy E: trigger donut with category tabs and an Add Craving form, craving history, and a mood diary. */
export function DiaryE() {
  const cr = useDiary<Craving>("e", seedCravings)
  const nt = useDiary<Note>("e", makeNotes, "notes")
  const [screen, setScreen] = useState<Screen>("stats")
  const [cat, setCat] = useState(0)
  const [picked, setPicked] = useState<number[]>([])
  const [menu, setMenu] = useState(false)
  const [mood, setMood] = useState<"neutral" | "smile">("neutral")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  if (!cr.ready || !nt.ready) return null
  const hasExample = cr.hasExample || nt.hasExample
  const switchIndex = screen === "diary" || screen === "new" ? 1 : screen === "relapse" ? 2 : 0
  const goSwitch = (i: number) => setScreen(i === 0 ? "stats" : i === 1 ? "diary" : "relapse")

  const shares = triggerShares(cr.items, cat)
  const total = sum(shares)
  const toggle = (t: number) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
  const saveCraving = () => {
    if (picked.length === 0) return
    const at = Date.now()
    cr.save([...cr.items, { at, date: dayKey(at), tags: [...picked].sort((a, b) => a - b) }])
    setPicked([])
    setScreen("stats")
  }
  const saveNote = () => {
    if (title.trim() === "" && body.trim() === "") return
    const at = Date.now()
    nt.save([...nt.items, { at, date: dayKey(at), mood, title: title.trim(), body: body.trim() }])
    setTitle("")
    setBody("")
    setScreen("diary")
  }

  let content: React.ReactNode
  if (screen === "stats" || screen === "history") {
    const hist = [...cr.items].sort((a, b) => b.at - a.at)
    content = (
      <div className="flex flex-col gap-3" data-testid="e-stats-page">
        <Tabs items={eText.tabs} value={screen === "stats" ? 0 : 1} onChange={(i) => setScreen(i === 0 ? "stats" : "history")} id="e-tab" />
        {screen === "stats" ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{eText.topTriggersLabel}</span>
              <button type="button" data-testid="e-list-icon" aria-label={eText.historyIcon} onClick={() => setScreen("history")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
                {"☰"}
              </button>
            </div>
            <Donut
              testId="e-donut"
              slices={shares.map((s) => ({ key: s.key, label: eText.triggers[Number(s.key)], count: s.count, color: COLORS[Number(s.key)], value: `${pctText(s.count, total, 1)}%` }))}
              centre={
                <span>
                  <span className="block font-semibold">{eText.topTriggers}</span>
                  <span data-testid="e-cat-name" className="block text-muted-foreground">
                    {eText.categories[cat]}
                  </span>
                </span>
              }
            />
            {total === 0 && <p className="text-center text-sm text-muted-foreground">{eText.emptyChart}</p>}
            <div role="tablist" className="grid grid-cols-4 gap-1.5" data-testid="e-cats">
              {eText.categories.map((c, i) => (
                <button key={c} type="button" role="tab" aria-selected={cat === i} data-testid={`e-cat-${i}`} onClick={() => setCat(i)} className={`min-h-11 rounded-full border px-1 text-xs ${i >= 4 ? "col-span-1" : ""} ${cat === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                  {c}
                </button>
              ))}
            </div>
            <button type="button" data-testid="e-add" onClick={() => setScreen("add")} className="min-h-12 self-center rounded-full bg-orange-500 px-10 text-base font-semibold text-black">
              {eText.addCraving}
            </button>
          </>
        ) : (
          <section data-testid="e-history" className="flex flex-col gap-2">
            <div>
              <InferredTag />
            </div>
            {hist.length === 0 && <p className="text-sm text-muted-foreground">{eText.noCravings}</p>}
            <ul className="flex flex-col gap-2" data-testid="e-history-list">
              {hist.map((c) => (
                <li key={c.at} data-testid="e-history-row" className="rounded-lg border border-border bg-card p-3 text-sm">
                  <span className="font-medium">{dotDate(c.date)}</span>
                  <span className="block text-muted-foreground">{c.tags.map((t) => eText.triggers[t]).join(", ")}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    )
  } else if (screen === "add") {
    content = (
      <section data-testid="e-add-form" className="flex flex-col gap-3">
        <Head title={eText.addTitle} onBack={() => setScreen("stats")} inferred />
        {eText.categories.slice(1).map((c, ci) => (
          <div key={c} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{c}</h3>
            <div className="flex flex-wrap gap-2">
              {[...Array(TRIGGER_COUNT).keys()]
                .filter((t) => TRIGGER_CATEGORY[t] === ci + 1)
                .map((t) => (
                  <button key={t} type="button" role="checkbox" aria-checked={picked.includes(t)} data-testid={`e-pick-${t}`} onClick={() => toggle(t)} className={`min-h-11 rounded-full border px-4 text-sm ${picked.includes(t) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                    {eText.triggers[t]}
                  </button>
                ))}
            </div>
            <Placeholder />
          </div>
        ))}
        <button type="button" data-testid="e-add-save" disabled={picked.length === 0} onClick={saveCraving} className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground disabled:opacity-40">
          {eText.addSave}
        </button>
        {picked.length === 0 && <p className="text-center text-xs text-muted-foreground">{eText.noTags}</p>}
      </section>
    )
  } else if (screen === "diary") {
    const notes = [...nt.items].sort((a, b) => b.at - a.at)
    content = (
      <section data-testid="e-diary" className="flex flex-col gap-3">
        <div className="relative flex items-center gap-2">
          <button type="button" data-testid="screen-back" aria-label={eText.back} onClick={() => setScreen("stats")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
            {"‹"}
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold">{eText.diaryTitle}</h2>
          <button type="button" data-testid="e-menu" aria-label={eText.menu} aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
            {"⋮"}
          </button>
          {menu && (
            <div className="absolute right-0 top-12 z-20 rounded-lg border border-border bg-background p-1 shadow-lg">
              <button
                type="button"
                data-testid="e-menu-add"
                onClick={() => {
                  setMenu(false)
                  setScreen("new")
                }}
                className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md px-4 text-sm"
              >
                {eText.addEntry}
                <InferredTag />
              </button>
            </div>
          )}
        </div>
        <ul className="flex flex-col gap-3" data-testid="e-notes">
          {notes.map((n) => (
            <li key={n.at} data-testid="e-note" className="flex gap-3 border-b border-border pb-3">
              <MoodFace mood={n.mood} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-teal-300">{n.title}</p>
                <p className="mt-1 text-sm">{n.body}</p>
                <p className="mt-2 text-right text-xs text-muted-foreground">{dotDate(n.date)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    )
  } else if (screen === "new") {
    content = (
      <section data-testid="e-new" className="flex flex-col gap-3">
        <Head title={eText.newTitle} onBack={() => setScreen("diary")} inferred />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={eText.newTitle}>
          {(["neutral", "smile"] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mood === m} data-testid={`e-mood-${m}`} aria-label={m === "smile" ? eText.moodSmile : eText.moodNeutral} onClick={() => setMood(m)} className={`inline-flex size-14 items-center justify-center rounded-full border ${mood === m ? "border-primary" : "border-border"}`}>
              <MoodFace mood={m} />
            </button>
          ))}
        </div>
        <Placeholder />
        <input data-testid="e-title" aria-label={eText.titleLabel} placeholder={eText.titleHint} value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-11 rounded-md border border-border bg-background px-3 text-sm" />
        <textarea data-testid="e-body" aria-label={eText.bodyLabel} placeholder={eText.bodyHint} value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="rounded-md border border-border bg-background p-3 text-sm" />
        <button type="button" data-testid="e-note-save" onClick={saveNote} className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground">
          {eText.addSave}
        </button>
      </section>
    )
  } else {
    content = <PlaceholderScreen title={eText.relapseTitle} onBack={() => setScreen("stats")} />
  }

  return (
    <div data-testid="diary-e" data-screen={screen}>
      {hasExample && (
        <ExampleBar
          onClear={() => {
            cr.clearExample()
            nt.clearExample()
          }}
        />
      )}
      {(screen === "stats" || screen === "history" || screen === "diary" || screen === "relapse") && (
        <div className="mb-3">
          <Tabs items={eText.switchItems} value={switchIndex} onChange={goSwitch} id="e-switch" />
        </div>
      )}
      {content}
    </div>
  )
}
