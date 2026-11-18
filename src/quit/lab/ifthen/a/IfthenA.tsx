"use client"

import { useEffect, useState } from "react"
import { Head, InferredTag, Placeholder, PlaceholderScreen, Tabs } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import type { ToolProps as LabProps } from "../../../types"
import { Builder, type BuilderExtras, type Ns } from "../../quitdate/e/QuitdateE"
import { eText } from "../../quitdate/e/text"
import { quitDateFor, type DateChoice } from "../../quitdate/shared/logic"
import { iaText } from "./text"

const NS: Ns = ["ifthen", "a"]
const RING_COLORS = ["border-purple-500 text-purple-300", "border-red-500 text-red-300", "border-blue-500 text-blue-300", "border-orange-500 text-orange-300", "border-lime-500 text-lime-300"]
const fmtDate = (key: string | null) => (key ? new Date(`${key}T00:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null)
const EXTRAS: BuilderExtras = {
  needEachGroup: true,
  printView: true,
  landText: iaText.landText,
  dash: iaText.dash,
  tagNav: iaText.views[0],
  more: iaText.more,
  labels: { needOne: iaText.needOne, viewPlan: iaText.viewPlan, planTitle: iaText.planTitle, print: iaText.print, back: iaText.planBack },
}

/** Copy A: the five-step plan builder with its results page, then the app that shows the plan later. */
export function IfthenA({ data }: LabProps) {
  const [view, setView] = useState(0)
  return (
    <div data-testid="ifthen-a" className="pb-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Tabs id="a-view" items={iaText.views} value={view} onChange={setView} />
        </div>
        <InferredTag />
      </div>
      {view === 0 ? <Builder data={data} ns={NS} extras={EXTRAS} /> : <AppA onBuilder={() => setView(0)} />}
    </div>
  )
}

type Screen = { name: "tab" } | { name: "other"; title: string }

function Slot({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-sky-400 underline decoration-dashed">{children}</span>
}

function AppA({ onBuilder }: { onBuilder: () => void }) {
  const [tab, setTab] = useState(2)
  const [screen, setScreen] = useState<Screen>({ name: "tab" })
  const [exploreTab, setExploreTab] = useState(0)
  const [added, setAdded] = useState<boolean[]>([false, false, false, false])
  const [dot, setDot] = useState(0)
  const [open, setOpen] = useState(false)
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
  const joinedText = `${Math.floor(t / 86400)} days, ${Math.floor((t % 86400) / 3600)} hr ${Math.floor((t % 3600) / 60)} m ${t % 60} s`
  const back = () => setScreen({ name: "tab" })

  if (screen.name === "other") return <PlaceholderScreen title={screen.title} onBack={back} />

  let page: React.ReactNode
  if (tab === 2) {
    page = (
      <section data-testid="a-home" className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-md bg-card px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-sky-400">{iaText.joined}</div>
            <div data-testid="a-joined" className="text-base font-semibold tabular-nums">
              {joinedText}
            </div>
          </div>
          <button type="button" data-testid="a-toggle" aria-label={iaText.toggle} aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-lg text-white">
            {open ? "⌃" : "⌄"}
          </button>
        </div>
        {open && (
          <div data-testid="a-toggle-body" className="flex flex-col gap-2">
            <InferredTag />
            <Placeholder />
          </div>
        )}
        <h2 className="text-center text-xl font-bold">{iaText.whatsUp}</h2>
        <div data-testid="a-state-buttons" className="flex flex-wrap justify-center gap-3">
          {iaText.homeButtons.map((b, i) => (
            <button
              key={b}
              type="button"
              data-testid={`a-home-btn-${i}`}
              onClick={() => setScreen({ name: "other", title: b })}
              className={`flex size-24 basis-24 items-center justify-center rounded-full border-2 bg-card p-2 text-center text-sm font-semibold leading-tight ${RING_COLORS[i]}`}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="text-sm font-semibold text-sky-400">{iaText.didYouKnow}</div>
        <Placeholder />
      </section>
    )
  } else if (tab === 0) {
    page = (
      <section data-testid="a-kit" className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-bold text-red-400">{iaText.kitCount}</div>
            <div className="text-sm">{iaText.kitHead}</div>
          </div>
          <button type="button" data-testid="a-edit-profile" onClick={() => setTab(4)} className="inline-flex min-h-11 shrink-0 items-center text-sm text-sky-400 underline">
            {iaText.editProfile}
          </button>
        </div>
        {dot === 0 ? (
          <div data-testid="a-kit-card" className="rounded-md bg-card px-4 py-6 text-center">
            {iaText.kitAction}
          </div>
        ) : (
          <Placeholder className="min-h-32" />
        )}
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
            <span className="tabular-nums font-semibold">0</span>
            <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-full bg-orange-500 text-white">
              {"»"}
            </span>
          </button>
        ))}
        <button type="button" data-testid="a-view-favorites" onClick={() => setScreen({ name: "other", title: iaText.favoritesTitle })} className="min-h-12 self-center rounded-md border border-border bg-card px-6 font-medium">
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
          <button type="button" data-testid="a-add-kit" aria-pressed={added[exploreTab]} onClick={() => setAdded(added.map((x, i) => (i === exploreTab ? true : x)))} className="min-h-11 rounded-md border border-border bg-card px-3 text-sm">
            {added[exploreTab] ? iaText.added : iaText.addToKit}
          </button>
          <button type="button" data-testid="a-share" onClick={() => setScreen({ name: "other", title: iaText.share })} className="min-h-11 rounded-md border border-border bg-card px-3 text-sm">
            {iaText.share}
          </button>
        </div>
      </section>
    )
  } else if (tab === 3) {
    page = <PlaceholderScreen title={iaText.progress} onBack={null} />
  } else {
    const date = fmtDate(dateKey)
    const reason = eText.reasons[Number(reasons[0])]
    const slot = (v: string | null | undefined) => <Slot>{v ?? iaText.notSet}</Slot>
    const rows: React.ReactNode[] = [
      <>
        {iaText.profile1} {slot(date)}
      </>,
      <>
        {iaText.profile2} {slot(null)}
        {iaText.profile2b}
      </>,
      <>
        {iaText.profile3a} {slot(trig.length ? String(trig.length) : null)} {iaText.profile3b}
      </>,
      <>
        {iaText.profile4} {slot(reason?.toLowerCase())} {iaText.profile4b}
      </>,
      <>
        {iaText.profile5} {slot(null)}.
      </>,
    ]
    page = (
      <section data-testid="a-profile" className="flex flex-col gap-3">
        <Head title={iaText.profile} />
        <button type="button" data-testid="a-age" onClick={() => setScreen({ name: "other", title: iaText.age })} className="flex min-h-14 items-center gap-3 rounded-md border border-border bg-card px-3 text-left">
          <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            {"▤"}
          </span>
          <span className="flex-1 font-semibold text-sky-400">
            {iaText.age}: {iaText.notSet}
          </span>
          <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-full bg-orange-500 text-white">
            {"»"}
          </span>
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex-1">{iaText.tapEdit}</span>
          <InferredTag />
        </div>
        {rows.map((r, i) => (
          <button key={i} type="button" data-testid={`a-prof-${i}`} onClick={onBuilder} className="flex min-h-14 items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-left">
            <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center text-xl text-muted-foreground">
              {iaText.profileIcons[i]}
            </span>
            <span className="min-w-0 flex-1 text-sm">{r}</span>
            <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
              {"»"}
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
