"use client"

import { useState } from "react"
import { InferredTag, NotSourced, PlaceholderScreen } from "../../progress/shared/Bits"
import { Sheet } from "../../lessons/shared/Bits"
import { useLabState } from "../../store"
import { ArticleTile, BackBtn, LabInferredLinks, Pic } from "../shared/Bits"
import { lcText } from "./text"

interface CState {
  seen: boolean
  done: number[]
  comments: string[]
}
const INITIAL: CState = { seen: false, done: [], comments: [] }

type View =
  | { k: "root" }
  | { k: "journey" }
  | { k: "day"; n: number }
  | { k: "med"; i: number }
  | { k: "locked"; i: number }
  | { k: "other"; title: string }

/** Copy C: Learn with Journeys (current journey, list, locked cards, day list, day page with comments) and Meditations (card grid, player). */
export function LibraryC() {
  const [st, setSt] = useLabState<CState>("library", "c", "st", INITIAL)
  const [sub, setSub] = useState(0)
  const [view, setView] = useState<View>({ k: "root" })
  const [text, setText] = useState("")
  const [playing, setPlaying] = useState(false)
  const root = () => setView({ k: "root" })
  const update = (p: Partial<CState>) => setSt({ ...st, ...p })
  const nextDay = Math.min(7, st.done.length + 1)

  let body: React.ReactNode
  if (view.k === "journey") {
    body = (
      <section data-testid="c-journey" className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm">
          <BackBtn onClick={root} />
          <button type="button" data-testid="c-crumb" onClick={root} className="min-h-11 text-sky-300 underline">{lcText.crumbJourneys}</button>
          <span aria-hidden="true">{"/"}</span>
          <span className="truncate font-medium">{lcText.journeyName}</span>
        </div>
        <Pic tone={0} className="h-36" />
        <div className="rounded-xl border border-border bg-card p-3">
          <h2 className="text-xl font-bold">{lcText.journeyName}</h2>
          <p className="text-sm text-muted-foreground">{lcText.journeySub}</p>
          <div className="mt-2 h-2 rounded bg-border"><div className="h-2 rounded bg-sky-400" style={{ width: `${(st.done.length / 7) * 100}%` }} /></div>
          <p data-testid="c-progress" className="mt-1 text-sm">{lcText.progress(st.done.length)}</p>
        </div>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => {
          const fin = st.done.includes(n)
          const open = n <= nextDay
          return (
            <button key={n} type="button" data-testid={`c-day-${n}`} data-state={fin ? "done" : open ? "open" : "locked"} disabled={!open} onClick={() => setView({ k: "day", n })} className={`flex min-h-16 items-center gap-3 rounded-lg border border-border p-3 text-left ${open ? "bg-card" : "opacity-60"}`}>
              <span className="w-12 shrink-0 text-xs text-muted-foreground">{fin ? `✔ ${lcText.dayLabel(n)}` : lcText.dayLabel(n)}</span>
              <span className="min-w-0 flex-1">
                {n === 1 ? (
                  <>
                    <span className="block font-medium">{lcText.dayTitle1}</span>
                    <span className="block text-xs text-muted-foreground">{lcText.dayTypes[0]}</span>
                  </>
                ) : (
                  <span className="block rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground">{lcText.dayTypeUnseen}</span>
                )}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1"><NotSourced /><span className="flex items-center gap-1 text-xs"><span aria-hidden="true">{"💬"}</span><NotSourced /></span></span>
            </button>
          )
        })}
      </section>
    )
  } else if (view.k === "day") {
    const n = view.n
    const fin = st.done.includes(n)
    body = (
      <section data-testid="c-day" data-day={n} className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm">
          <BackBtn onClick={() => setView({ k: "journey" })} />
          <span className="truncate">{`${lcText.journeyName} / ${n === 1 ? lcText.dayTitle1 : lcText.dayLabel(n)}`}</span>
          {n !== 1 && <InferredTag />}
        </div>
        <Pic tone={1} className="h-36" />
        <h2 className="text-2xl font-bold">{n === 1 ? lcText.dayTitle1 : lcText.dayLabel(n)}</h2>
        {n === 1 && <p className="text-sm text-muted-foreground">{`${lcText.typeLine} · ${lcText.tag}`}</p>}
        <ArticleTile text={lcText.videoTile} />
        {n === 1 && <ArticleTile text={lcText.talkTile} />}
        {n === 1 && (
          <div data-testid="c-comments" className="flex flex-col gap-2">
            <h3 className="font-semibold">{lcText.commentsHead}</h3>
            {st.comments.map((c, i) => (
              <p key={`${c}-${i}`} data-testid="c-comment" className="rounded-lg border border-border bg-card p-2 text-sm">{c}</p>
            ))}
            <div className="flex gap-2">
              <input data-testid="c-comment-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={lcText.commentPlaceholder} aria-label={lcText.commentPlaceholder} className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-2" />
              <button type="button" data-testid="c-comment-post" disabled={!text.trim()} onClick={() => { update({ comments: [...st.comments, text.trim()] }); setText("") }} className="min-h-11 rounded-full border border-border px-4 text-sm disabled:opacity-40">{lcText.commentPost}</button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button type="button" data-testid="c-day-complete" disabled={fin} onClick={() => { update({ done: [...new Set([...st.done, n])] }); setView({ k: "journey" }) }} className="min-h-12 flex-1 rounded-full bg-indigo-700 px-4 font-medium text-white disabled:opacity-40">{lcText.complete}</button>
          <InferredTag />
        </div>
      </section>
    )
  } else if (view.k === "med") {
    const m = lcText.meds[view.i]
    body = (
      <section data-testid="c-med" className="flex flex-col gap-3">
        <div className="flex items-center gap-2"><BackBtn onClick={root} /><h2 className="flex-1 text-lg font-semibold">{m.title}</h2><InferredTag /></div>
        <Pic tone={view.i} className="h-36" />
        <p className="text-sm text-muted-foreground">{m.sub}</p>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <button type="button" data-testid="c-play" aria-pressed={playing} aria-label={playing ? lcText.pause : lcText.play} onClick={() => setPlaying(!playing)} className="inline-flex size-12 items-center justify-center rounded-full bg-indigo-700 text-white">{playing ? "❚❚" : "▶"}</button>
          <NotSourced />
        </div>
      </section>
    )
  } else if (view.k === "locked") {
    const j = lcText.journeys[view.i]
    body = (
      <section data-testid="c-locked" className="flex flex-col gap-3">
        <div className="flex items-center gap-2"><BackBtn onClick={root} /><h2 className="flex-1 text-lg font-semibold">{lcText.lockedTitle}</h2></div>
        <Pic tone={view.i} className="h-28" />
        <p className="font-semibold">{j.title}</p>
        <ArticleTile text={lcText.notBuilt} />
      </section>
    )
  } else if (view.k === "other") {
    body = <PlaceholderScreen title={view.title} onBack={root} />
  } else {
    body = (
      <section data-testid="c-learn" className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">{lcText.learn}</h1>
        <div role="tablist" className="flex gap-4 border-b border-border">
          {lcText.subTabs.map((t, i) => (
            <button key={t} type="button" role="tab" aria-selected={sub === i} data-testid={`c-sub-${i}`} onClick={() => setSub(i)} className={`min-h-11 border-b-2 px-1 text-sm ${sub === i ? "border-sky-400 font-semibold text-sky-300" : "border-transparent text-muted-foreground"}`}>
              <span aria-hidden="true">{i === 0 ? "🧭 " : "🎧 "}</span>{t}
            </button>
          ))}
        </div>
        {sub === 0 ? (
          <>
            <h2 className="font-semibold">{lcText.currentHead}</h2>
            <button type="button" data-testid="c-current" onClick={() => setView({ k: "journey" })} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-2 text-left">
              <Pic tone={0} className="h-28 w-full" />
              <span className="font-bold">{lcText.journeys[0].title}</span>
              <span className="text-sm text-muted-foreground">{lcText.journeys[0].sub}</span>
            </button>
            <h2 className="font-semibold">{lcText.listHead}</h2>
            <p className="text-xs text-muted-foreground">{lcText.recommended}</p>
            <div className="grid grid-cols-2 gap-3">
              {lcText.journeys.map((j, i) => (
                <button key={j.title} type="button" data-testid={`c-journey-${i}`} data-locked={!j.free} onClick={() => setView(j.free ? { k: "journey" } : { k: "locked", i })} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-2 text-left">
                  <Pic tone={i} className="h-20 w-full" />
                  <span className="text-xs text-muted-foreground">{lcText.tag}</span>
                  <span className="font-semibold">{j.title}</span>
                  {j.sub ? <span className="text-xs text-muted-foreground">{j.sub}</span> : <span className="flex flex-wrap items-center gap-1"><span className="rounded border border-dashed border-border px-1 py-0.5 text-xs text-muted-foreground">{lcText.subTile}</span><InferredTag /></span>}
                  {!j.free && (
                    <span className="flex flex-wrap items-center gap-1 text-xs"><span aria-hidden="true">{"🔒"}</span>{lcText.lockedLabel}<InferredTag /></span>
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="font-semibold">{lcText.medHead}</h2>
            <p className="text-sm text-muted-foreground">{lcText.medLine}</p>
            <div className="grid grid-cols-2 gap-3">
              {lcText.meds.map((m, i) => (
                <button key={m.title} type="button" data-testid={`c-med-${i}`} onClick={() => { setPlaying(false); setView({ k: "med", i }) }} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-2 text-left">
                  <Pic tone={i} className="h-20 w-full" />
                  <span className="font-semibold">{m.title}</span>
                  <span className="text-xs text-muted-foreground">{m.sub}</span>
                  <NotSourced />
                </button>
              ))}
            </div>
          </>
        )}
        <LabInferredLinks onSearch={() => setView({ k: "other", title: lcText.searchTitle })} onSaved={() => setView({ k: "other", title: lcText.savedTitle })} />
      </section>
    )
  }

  return (
    <div data-testid="library-c" className="flex flex-col gap-3 pb-4">
      {body}
      {!st.seen && (
        <Sheet testId="c-first" onClose={() => update({ seen: true })}>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-sky-900/50 text-3xl">{"💡"}</span>
            <h2 className="text-xl font-bold">{lcText.sheetTitle}</h2>
            <p className="text-sm">{lcText.sheetBody}</p>
            <button type="button" data-testid="c-first-finish" onClick={() => update({ seen: true })} className="min-h-12 rounded-full bg-indigo-700 px-8 font-medium text-white">{lcText.sheetBtn}</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
