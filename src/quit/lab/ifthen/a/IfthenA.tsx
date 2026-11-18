"use client"

import { useEffect, useState } from "react"
import { Head, InferredTag, Placeholder, PlaceholderScreen, Tabs } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import type { ToolProps as LabProps } from "../../../types"
import { Builder, type Ns } from "../../quitdate/e/QuitdateE"
import { quitDateFor, type DateChoice } from "../../quitdate/shared/logic"
import { iaText } from "./text"

const NS: Ns = ["ifthen", "a"]
const BTN_COLORS = ["bg-purple-600", "bg-red-600", "bg-blue-600", "bg-orange-500", "bg-green-600"]
const fmtDate = (key: string | null) => (key ? new Date(`${key}T00:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : iaText.notSet)
const LABELS = { needOne: iaText.needOne, viewPlan: iaText.viewPlan, planTitle: iaText.planTitle, print: iaText.print, back: iaText.planBack }

/** Copy A: the five-step plan builder with its results page, then the app that shows the plan later. */
export function IfthenA({ data }: LabProps) {
  const [view, setView] = useState(0)
  return (
    <div data-testid="ifthen-a" className="pb-6">
      <div className="mb-3">
        <Tabs id="a-view" items={iaText.views} value={view} onChange={setView} />
      </div>
      {view === 0 ? <Builder data={data} ns={NS} extras={{ needEachGroup: true, printView: true, labels: LABELS }} /> : <AppA onBuilder={() => setView(0)} />}
    </div>
  )
}

type Screen = { name: "tab" } | { name: "other"; title: string }

function AppA({ onBuilder }: { onBuilder: () => void }) {
  const [tab, setTab] = useState(2)
  const [screen, setScreen] = useState<Screen>({ name: "tab" })
  const [exploreTab, setExploreTab] = useState(0)
  const [added, setAdded] = useState<boolean[]>([false, false, false, false])
  const [dot, setDot] = useState(0)
  const [choice] = useLabState<DateChoice | null>(NS[0], NS[1], "choice", null)
  const [picked] = useLabState<string>(NS[0], NS[1], "picked", "")
  const [reasons] = useLabState<string[]>(NS[0], NS[1], "reasons", [])
  const [trig] = useLabState<string[]>(NS[0], NS[1], "triggers", [])
  const [now, setNow] = useState(0)
  const [start] = useState(() => Date.now())
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const dateKey = now ? quitDateFor(choice, picked, now) : null
  const t = Math.max(0, Math.floor((now - start) / 1000))
  const joinedText = `${iaText.joined} ${Math.floor(t / 86400)} d, ${Math.floor((t % 86400) / 3600)} h ${Math.floor((t % 3600) / 60)} m ${t % 60} s`
  const back = () => setScreen({ name: "tab" })

  if (screen.name === "other") return <PlaceholderScreen title={screen.title} onBack={back} />

  let page: React.ReactNode
  if (tab === 2) {
    page = (
      <section data-testid="a-home" className="flex flex-col gap-3">
        <div data-testid="a-joined" className="rounded-md bg-card px-3 py-2 text-sm tabular-nums">
          {joinedText}
        </div>
        <h2 className="text-lg font-semibold">{iaText.whatsUp}</h2>
        <div className="grid grid-cols-5 gap-1">
          {iaText.homeButtons.map((b, i) => (
            <button key={b} type="button" data-testid={`a-home-btn-${i}`} onClick={() => setScreen({ name: "other", title: b })} className="flex min-h-16 flex-col items-center gap-1 text-center text-[11px] leading-tight">
              <span aria-hidden="true" className={`inline-flex size-11 items-center justify-center rounded-full text-white ${BTN_COLORS[i]}`}>
                {i + 1}
              </span>
              {b}
            </button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">{iaText.didYouKnow}</div>
        <Placeholder />
      </section>
    )
  } else if (tab === 0) {
    page = (
      <section data-testid="a-kit" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 flex-1 text-lg font-semibold">{iaText.kitHead}</h2>
          <button type="button" data-testid="a-edit-profile" onClick={() => setTab(4)} className="inline-flex min-h-11 shrink-0 items-center text-sm underline">
            {iaText.editProfile}
          </button>
        </div>
        <Placeholder />
        <div data-testid="a-pager" data-index={dot} className="flex justify-center gap-1">
          {Array.from({ length: 6 }, (_, i) => (
            <button key={i} type="button" data-testid={`a-dot-${i}`} aria-label={`${iaText.pagerDot} ${i + 1}`} onClick={() => setDot(i)} className="inline-flex size-11 items-center justify-center">
              <span className={`size-2.5 rounded-full ${i === dot ? "bg-primary" : "bg-border"}`} />
            </button>
          ))}
        </div>
        <h3 className="font-semibold">{iaText.favorites}</h3>
        {iaText.favRows.map((r, i) => (
          <button key={r} type="button" data-testid={`a-fav-${i}`} onClick={() => setScreen({ name: "other", title: r })} className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-card px-3 text-left text-sm">
            <span className="min-w-0 flex-1">{r}</span>
            <span className="tabular-nums">0</span>
            <span aria-hidden="true" className="text-orange-400">
              {"›"}
            </span>
          </button>
        ))}
        <button type="button" data-testid="a-view-favorites" onClick={() => setScreen({ name: "other", title: iaText.favoritesTitle })} className="min-h-12 rounded-md bg-primary px-4 font-medium text-primary-foreground">
          {iaText.viewFavorites}
        </button>
      </section>
    )
  } else if (tab === 1) {
    page = (
      <section data-testid="a-explore" className="flex flex-col gap-3">
        <Tabs id="a-explore-tab" items={iaText.exploreTabs} value={exploreTab} onChange={setExploreTab} scroll />
        <Placeholder className="min-h-40" />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" data-testid="a-add-kit" aria-pressed={added[exploreTab]} onClick={() => setAdded(added.map((x, i) => (i === exploreTab ? !x : x)))} className="min-h-11 rounded-md border border-border bg-card px-3 text-sm">
            {added[exploreTab] ? iaText.added : iaText.addToKit}
          </button>
          <InferredTag />
          <button type="button" data-testid="a-share" onClick={() => setScreen({ name: "other", title: iaText.share })} className="min-h-11 rounded-md border border-border bg-card px-3 text-sm">
            {iaText.share}
          </button>
        </div>
      </section>
    )
  } else if (tab === 3) {
    page = <PlaceholderScreen title={iaText.progress} onBack={null} />
  } else {
    const values = [fmtDate(dateKey), iaText.notSet, trig.length ? `${trig.length} ${iaText.picked}` : iaText.notSet, reasons.length ? `${reasons.length} ${iaText.picked}` : iaText.notSet, iaText.notSet]
    page = (
      <section data-testid="a-profile" className="flex flex-col gap-3">
        <Head title={iaText.profile} />
        <button type="button" data-testid="a-age" onClick={() => setScreen({ name: "other", title: iaText.age })} className="flex min-h-11 items-center justify-between rounded-md border border-border bg-card px-3 text-sm">
          <span>{iaText.age}</span>
          <span aria-hidden="true">{"›"}</span>
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex-1">{iaText.tapEdit}</span>
          <InferredTag />
        </div>
        {iaText.profileRows.map((r, i) => (
          <button key={r} type="button" data-testid={`a-prof-${i}`} onClick={onBuilder} className="flex min-h-14 items-center gap-3 rounded-md border border-border bg-card px-3 text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-sm">{r}</span>
              <span className="block text-sm font-semibold">{values[i]}</span>
            </span>
            <span aria-hidden="true" className="text-orange-400">
              {"›"}
            </span>
          </button>
        ))}
      </section>
    )
  }
  return (
    <div data-testid="a-app" className="flex flex-col">
      {page}
      <nav className="sticky bottom-0 z-10 mt-4 grid grid-cols-5 items-end border-t border-border bg-background">
        {iaText.appTabs.map((label, i) => (
          <button
            key={label}
            type="button"
            data-testid={`a-nav-${i}`}
            aria-current={i === tab}
            onClick={() => {
              setTab(i)
              setScreen({ name: "tab" })
            }}
            className={`flex min-h-12 flex-col items-center justify-end gap-0.5 break-words px-0.5 pb-1 text-[11px] leading-tight ${i === tab ? "font-semibold text-primary" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
