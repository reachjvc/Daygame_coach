"use client"

import { useState } from "react"
import { FixedNav, NavSpace } from "../../lessons/shared/Bits"
import { FadeRow, InferredTag, NotSourced, Placeholder, PlaceholderScreen } from "../../progress/shared/Bits"
import { ArticleTile, BackBtn, ItemPage, LabInferredLinks, Pic } from "../shared/Bits"
import { ldText } from "./text"

type Screen =
  | { k: "tabs" }
  | { k: "group"; i: number }
  | { k: "item"; title: string }
  | { k: "detail"; title: string }
  | { k: "tips" }
  | { k: "article"; title: string }
  | { k: "other"; title: string }

const TABS: Screen = { k: "tabs" }

/** Copy D: Milestones (health rings, most recent, upcoming), a health category page, a health item article, and the Recovery phase pages with tips. */
export function LibraryD() {
  const [tab, setTab] = useState(1)
  const [phase, setPhase] = useState(2)
  const [screen, setScreen] = useState<Screen>(TABS)
  const [sources, setSources] = useState(false)
  const go = (s: Screen) => setScreen(s)
  const home = () => go(TABS)

  let body: React.ReactNode
  if (screen.k === "group") {
    const name = ldText.groups[screen.i]
    body = (
      <section data-testid="d-group" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BackBtn onClick={home} />
          <h2 className="flex-1 text-xl font-bold">{name}</h2>
          <span aria-hidden="true">{"📖"}</span>
          <NotSourced />
        </div>
        <div className="flex items-center gap-3"><span className="text-3xl font-bold"><NotSourced /></span></div>
        <div className="h-2 rounded bg-border" />
        <ArticleTile text={ldText.bodyIntro} />
        {screen.i === 1 ? (
          ldText.rows.map((r, i) => (
            <button key={r} type="button" data-testid={`d-row-${i}`} onClick={() => go({ k: "item", title: r })} className="flex min-h-16 items-center gap-3 rounded-xl bg-emerald-900/50 p-3 text-left">
              <Pic tone={2} className="size-12" />
              <span className="flex-1 text-center font-medium">{r}</span>
              <span aria-hidden="true">{"✔ ›"}</span>
            </button>
          ))
        ) : (
          <>
            <InferredTag />
            <Placeholder />
            <Placeholder />
          </>
        )}
      </section>
    )
  } else if (screen.k === "item") {
    body = (
      <section data-testid="d-item" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <BackBtn onClick={() => { setSources(false); home() }} />
          <button type="button" data-testid="d-sources" onClick={() => setSources(!sources)} className="min-h-11 rounded-full border border-border bg-card px-4 text-sm">{ldText.sources}</button>
        </div>
        {sources && (
          <div data-testid="d-sources-panel" className="flex flex-col gap-2">
            <InferredTag />
            <Placeholder />
          </div>
        )}
        <Pic tone={2} className="h-44" />
        <h2 className="text-center text-2xl font-bold">{screen.title}</h2>
        <ArticleTile />
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><span aria-hidden="true" className="text-emerald-400">{"✔"}</span>{ldText.itemUnlocked}<NotSourced /></p>
      </section>
    )
  } else if (screen.k === "detail") {
    body = <ItemPage title={screen.title} onBack={home} inferred testId="d-detail" />
  } else if (screen.k === "article") {
    body = <ItemPage title={screen.title} onBack={() => go({ k: "tips" })} inferred testId="d-article" />
  } else if (screen.k === "tips") {
    body = (
      <section data-testid="d-tips" className="flex flex-col gap-3">
        <div className="flex items-center gap-2"><BackBtn onClick={home} /><h2 className="text-lg font-semibold">{ldText.tipsTitle}</h2></div>
        <ArticleTile text={ldText.tipsFirst} />
        <h3 className="text-lg font-bold">{ldText.routines}</h3>
        <ArticleTile text={ldText.routinesTile} />
        <h3 className="text-lg font-bold">{ldText.practices}</h3>
        <p className="text-sm text-muted-foreground">{ldText.practicesSub}</p>
        <FadeRow className="gap-3">
          {ldText.practiceCards.map((c, i) => (
            <button key={c} type="button" data-testid={`d-practice-${i}`} onClick={() => go({ k: "article", title: c })} className="relative h-28 w-36 shrink-0 overflow-hidden rounded-xl text-left">
              <Pic tone={i} className="absolute inset-0 h-full w-full" />
              <span className="absolute inset-x-0 bottom-0 bg-black/50 p-2 text-sm font-medium text-white">{c}</span>
            </button>
          ))}
        </FadeRow>
        <h3 className="text-lg font-bold">{ldText.bySymptom}</h3>
        <p className="text-sm text-muted-foreground">{ldText.bySymptomSub}</p>
        <div className="flex flex-wrap gap-2">
          {ldText.symptoms.map((s, i) => (
            <button key={s.t} type="button" data-testid={`d-symptom-${i}`} onClick={() => go({ k: "article", title: s.t })} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-card px-3 text-sm">
              <span aria-hidden="true">{s.e}</span>{s.t}
            </button>
          ))}
        </div>
      </section>
    )
  } else if (screen.k === "other") {
    body = <PlaceholderScreen title={screen.title} onBack={home} />
  } else if (tab === 1) {
    body = (
      <section data-testid="d-milestones" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{ldText.milestones}</h1>
          <div className="flex gap-1">
            <span aria-hidden="true" className="inline-flex size-11 items-center justify-center">{"📖"}</span>
            <button type="button" data-testid="d-settings" aria-label={ldText.settings} onClick={() => go({ k: "other", title: ldText.settings })} className="inline-flex size-11 items-center justify-center">{"⚙"}</button>
          </div>
        </div>
        <div className="flex items-center gap-2"><h2 className="font-semibold">{ldText.healthHead}</h2><span aria-label={ldText.info} className="text-muted-foreground">{"ⓘ"}</span><NotSourced /></div>
        <div className="grid grid-cols-4 gap-2">
          {ldText.groups.map((g, i) => (
            <button key={g} type="button" data-testid={`d-ring-${i}`} onClick={() => go({ k: "group", i })} className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card p-1 text-xs">
              <span className="flex size-12 items-center justify-center rounded-full border-4 border-border" aria-hidden="true" />
              <span>{g}</span>
              <NotSourced />
            </button>
          ))}
        </div>
        <button type="button" data-testid="d-timeline" onClick={() => go({ k: "other", title: ldText.timelineTitle })} className="min-h-12 rounded-lg bg-emerald-800 px-4 font-medium text-white">{ldText.viewTimeline}</button>
        <h2 className="font-semibold">{ldText.mostRecent}</h2>
        <button type="button" data-testid="d-recent" onClick={() => go({ k: "item", title: ldText.recentTitle })} className="flex min-h-16 items-center gap-3 rounded-xl bg-emerald-900/50 p-3 text-left">
          <Pic tone={2} className="size-12" />
          <span className="flex-1"><span className="block font-semibold">{ldText.recentTitle}</span><span className="block text-xs text-muted-foreground">{ldText.groups[0]}</span></span>
          <span aria-hidden="true">{"✔"}</span>
        </button>
        <h2 className="font-semibold">{ldText.upcoming}</h2>
        <FadeRow className="gap-2">
          {ldText.upcomingTitles.map((u, i) => (
            <button key={u} type="button" data-testid={`d-upcoming-${i}`} onClick={() => go({ k: "item", title: u })} className="flex w-32 shrink-0 flex-col gap-1 rounded-xl border border-border bg-card p-2 text-left">
              <Pic tone={i} className="h-14 w-full" />
              <span className="text-sm font-medium">{u}</span>
              <NotSourced />
            </button>
          ))}
        </FadeRow>
        <div className="flex items-center gap-2"><h2 className="flex-1 font-semibold">{ldText.achievements}</h2><NotSourced /><button type="button" data-testid="d-all-ach" onClick={() => go({ k: "other", title: ldText.achievementsTitle })} className="min-h-11 text-sm text-sky-300 underline">{ldText.viewAll}</button></div>
        <div className="rounded-xl bg-emerald-900/50 p-3 font-semibold">{ldText.achievementCard}</div>
        <LabInferredLinks onSearch={() => go({ k: "other", title: ldText.searchTitle })} onSaved={() => go({ k: "other", title: ldText.savedTitle })} />
      </section>
    )
  } else if (tab === 2) {
    body = (
      <section data-testid="d-recovery" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{ldText.recovery}</h1>
          <div className="flex items-center gap-1">
            <button type="button" data-testid="d-sos" onClick={() => go({ k: "other", title: ldText.sosTitle })} className="min-h-11 rounded-full bg-red-700 px-4 text-sm font-bold text-white">{ldText.sos}</button>
            <button type="button" data-testid="d-settings-r" aria-label={ldText.settings} onClick={() => go({ k: "other", title: ldText.settings })} className="inline-flex size-11 items-center justify-center">{"⚙"}</button>
          </div>
        </div>
        <div data-testid="d-phase" data-phase={phase} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{ldText.phases[phase]}</h2>
          <div className="flex items-center gap-2 text-sm"><span>{ldText.dayOf}</span><NotSourced /><NotSourced /></div>
          <div className="h-2 rounded bg-border"><div className="h-2 w-0 rounded bg-lime-700" /></div>
          <ArticleTile />
          {ldText.phaseRows.map((r, i) => (
            <button key={r} type="button" data-testid={`d-phase-row-${i}`} onClick={() => go(i === 2 ? { k: "tips" } : { k: "detail", title: r })} className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card p-2 text-left">
              <Pic tone={i} className="size-10" />
              <span className="flex-1 font-medium">{r}</span>
              <span aria-hidden="true">{"›"}</span>
            </button>
          ))}
          <div className="flex items-center gap-2"><h3 className="font-semibold">{ldText.inPhase}</h3><NotSourced /></div>
          <FadeRow className="gap-2">
            {ldText.phasePills.map((p) => (
              <span key={p} className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-emerald-800 px-4 text-sm text-white">{p}</span>
            ))}
          </FadeRow>
        </div>
        <div className="flex justify-center gap-2">
          {ldText.phases.map((p, i) => (
            <button key={p} type="button" data-testid={`d-dot-${i}`} aria-label={ldText.phaseDot(i + 1)} aria-current={phase === i} onClick={() => setPhase(i)} className="inline-flex size-11 items-center justify-center"><span className={`size-2.5 rounded-full ${phase === i ? "bg-foreground" : "bg-border"}`} /></button>
          ))}
          <InferredTag />
        </div>
      </section>
    )
  } else {
    body = <PlaceholderScreen title={ldText.overview} onBack={null} />
  }

  const showNav = screen.k === "tabs"
  return (
    <div data-testid="library-d" className="flex flex-col gap-3">
      {body}
      {showNav && <FixedNav items={ldText.tabs} value={tab} onChange={setTab} id="d-tab" />}
      {showNav && <NavSpace />}
    </div>
  )
}
