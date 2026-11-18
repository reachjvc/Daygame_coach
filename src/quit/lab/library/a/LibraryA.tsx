"use client"

import { useState } from "react"
import { FixedNav, NavSpace } from "../../lessons/shared/Bits"
import { FadeRow, InferredTag, NotSourced, Placeholder, PlaceholderScreen, ShareBtn } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import { ArticleTile, BackBtn, ItemPage, LabInferredLinks, NameTile, Pic, SaveBtn, useSaved } from "../shared/Bits"
import { lbText } from "../shared/text"
import { laText } from "./text"

interface AState {
  done: number[]
  bannerGone: boolean
  collapsed: boolean
  begun: boolean
  courseDone: number[]
  cal: number[]
  thumb: "up" | "down" | null
}
const INITIAL: AState = { done: [], bannerGone: false, collapsed: false, begun: false, courseDone: [], cal: [], thumb: null }

type Screen =
  | { k: "tabs" }
  | { k: "reading" }
  | { k: "task"; i: number }
  | { k: "course" }
  | { k: "courseday"; n: number }
  | { k: "guide" }
  | { k: "item"; id: string; title: string }
  | { k: "other"; title: string }
const TABS: Screen = { k: "tabs" }

const greeting = () => {
  const h = new Date().getHours()
  return laText.greeting[h < 12 ? 0 : h < 18 ? 1 : 2]
}

/** Copy A: daily reading, Discover (community, courses), course path, guide article, Toolkit, bookmarks. */
export function LibraryA() {
  const [st, setSt] = useLabState<AState>("library", "a", "st", INITIAL)
  const [saved, toggle] = useSaved("a")
  const [tab, setTab] = useState(0)
  const [dTab, setDTab] = useState(0)
  const [screen, setScreen] = useState<Screen>(TABS)
  const [page, setPage] = useState(0)
  const update = (p: Partial<AState>) => setSt({ ...st, ...p })
  const go = (s: Screen) => setScreen(s)
  const home = () => go(TABS)

  const finishTask = (i: number) => {
    update({ done: [...new Set([...st.done, i])] })
    setPage(0)
    home()
  }

  let body: React.ReactNode
  if (screen.k === "reading") {
    const last = page === 2
    body = (
      <section data-testid="a-reading" data-page={page} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BackBtn onClick={() => { setPage(0); home() }} />
          <h2 className="min-w-0 flex-1 text-center text-base font-semibold">{laText.readingBar}</h2>
          <SaveBtn on={saved.includes("reading")} onClick={() => toggle("reading")} testId="a-reading-save" />
        </div>
        <h3 className="text-center text-xl font-bold">{laText.readingTitle}</h3>
        <p className="flex justify-center"><NotSourced /></p>
        <Pic tone={0} className="h-36" />
        <ArticleTile />
        <button type="button" data-testid="a-reading-next" onClick={() => (last ? finishTask(0) : setPage(page + 1))} className="min-h-12 rounded-full bg-indigo-700 px-4 font-medium text-white">
          {last ? laText.complete : laText.next}
        </button>
        <div className="flex justify-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((d) => (
            <span key={d} className={`size-2 rounded-full ${d === page ? "bg-sky-300" : "bg-border"}`} />
          ))}
        </div>
        {last && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">{laText.howFind}</p>
            <div className="flex gap-4">
              <button type="button" data-testid="a-thumb-up" aria-label={laText.thumbsUp} aria-pressed={st.thumb === "up"} onClick={() => update({ thumb: "up" })} className={`inline-flex size-11 items-center justify-center rounded-full border border-border text-xl ${st.thumb === "up" ? "bg-primary/30" : ""}`}>{"👍"}</button>
              <button type="button" data-testid="a-thumb-down" aria-label={laText.thumbsDown} aria-pressed={st.thumb === "down"} onClick={() => update({ thumb: "down" })} className={`inline-flex size-11 items-center justify-center rounded-full border border-border text-xl ${st.thumb === "down" ? "bg-primary/30" : ""}`}>{"👎"}</button>
            </div>
          </div>
        )}
      </section>
    )
  } else if (screen.k === "task") {
    const i = screen.i
    body = (
      <ItemPage title={laText.tasks[i].title} onBack={home} inferred testId="a-task">
        <ArticleTile />
        <button type="button" data-testid="a-task-complete" onClick={() => finishTask(i)} className="min-h-12 rounded-full bg-indigo-700 px-4 font-medium text-white">
          {laText.complete}
        </button>
      </ItemPage>
    )
  } else if (screen.k === "course") {
    const n = st.courseDone.length
    body = (
      <section data-testid="a-course" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <BackBtn onClick={() => { setTab(3); setDTab(1); home() }} />
          <span data-testid="a-course-coins" className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-card px-3 text-sm" aria-label={laText.coins}><span className="text-amber-400">{"●"}</span><NotSourced /></span>
        </div>
        {!st.begun ? (
          <>
            <Pic tone={3} className="h-44" />
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">{laText.courseCategory}</p>
            <h2 className="text-2xl font-bold text-sky-200">{laText.courseTitle}</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm"><NotSourced /><span>{laText.usersDone}</span></div>
            <div className="flex flex-wrap items-center gap-3 text-sm"><span>{`⏱ 5 ${laText.courseDays}`}</span><span className="inline-flex items-center gap-1" aria-label={laText.rating}><span aria-hidden="true" className="text-amber-400">{"★"}</span><NotSourced /></span></div>
            <button type="button" data-testid="a-course-begin" onClick={() => update({ begun: true })} className="min-h-12 rounded-full bg-indigo-700 px-4 font-medium text-white">{laText.beginCourse}</button>
            <h3 className="font-semibold">{laText.aboutCourse}</h3>
            <ArticleTile />
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Pic tone={3} className="size-12" round />
              <h2 className="min-w-0 flex-1 text-lg font-semibold">{laText.courseTitle}</h2>
            </div>
            <div>
              <p data-testid="a-course-progress" className="text-sm">{laText.courseProgress(n)}</p>
              <div className="mt-1 h-2 rounded bg-border"><div className="h-2 rounded bg-sky-400" style={{ width: `${(n / 5) * 100}%` }} /></div>
            </div>
            <h3 className="font-semibold">{laText.courseHead}</h3>
            <p className="text-sm text-muted-foreground">{laText.courseLine}</p>
            {[1, 2, 3, 4, 5].map((k) => {
              const fin = st.courseDone.includes(k)
              const open = !fin && (k === 1 || st.courseDone.includes(k - 1))
              return (
                <div key={k} className="flex flex-col gap-1">
                  {k > 1 && <span aria-hidden="true" className="mx-auto h-4 border-l-2 border-dotted border-muted-foreground" />}
                  <div data-testid={`a-module-${k}`} data-state={fin ? "done" : open ? "open" : "locked"} className="flex min-h-16 items-center justify-between gap-2 rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{laText.moduleDay(k)}</p>
                      {k <= 3 ? <p className="font-medium">{laText.dayTitles[k - 1]}</p> : <Placeholder />}
                    </div>
                    {fin ? (
                      <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs text-white">{laText.completed}</span>
                    ) : open ? (
                      <button type="button" data-testid={`a-module-begin-${k}`} onClick={() => go({ k: "courseday", n: k })} className="min-h-11 rounded-full bg-indigo-700 px-4 text-sm text-white">{laText.begin}</button>
                    ) : (
                      <span className="text-xs text-muted-foreground">{`🔒 ${laText.locked}`}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </section>
    )
  } else if (screen.k === "courseday") {
    const n = screen.n
    const id = `day-${n}`
    body = (
      <section data-testid="a-courseday" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BackBtn onClick={() => go({ k: "course" })} />
          <h2 className="min-w-0 flex-1 truncate text-center text-base font-semibold">{laText.dayTitles[n - 1] ?? laText.courseDayBar}</h2>
          <SaveBtn on={saved.includes(id)} onClick={() => toggle(id)} testId="a-courseday-save" />
        </div>
        <p className="flex justify-center"><NotSourced /></p>
        <Pic tone={1} className="h-36" />
        <ArticleTile />
        <div className="flex items-center gap-2"><button type="button" data-testid="a-courseday-complete" onClick={() => { update({ courseDone: [...new Set([...st.courseDone, n])] }); go({ k: "course" }) }} className="min-h-12 flex-1 rounded-full bg-indigo-700 px-4 font-medium text-white">{laText.complete}</button><InferredTag /></div>
      </section>
    )
  } else if (screen.k === "guide") {
    body = (
      <section data-testid="a-guide" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button type="button" data-testid="a-guide-close" aria-label={laText.guideClose} onClick={home} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">{"✕"}</button>
          <ShareBtn text={laText.guideTitle} testId="a-guide-share" />
        </div>
        <div className="rounded-lg bg-gradient-to-br from-pink-700/60 to-purple-800/60 p-4">
          <span className="rounded-full bg-purple-700 px-2 py-0.5 text-xs text-white">{laText.guideTag}</span>
          <h2 className="mt-3 text-3xl font-bold">{laText.guideTitle}</h2>
          <p className="mt-2 text-xs text-white/80">{laText.guideBy}</p>
        </div>
        <ArticleTile />
        <ArticleTile />
        <div className="flex items-center justify-end gap-2">
          <InferredTag />
          <button type="button" data-testid="a-guide-contents" aria-label={laText.guideContents} onClick={() => go({ k: "other", title: laText.guideContents })} className="inline-flex size-12 items-center justify-center rounded-full bg-indigo-700 text-white">{"≡"}</button>
        </div>
      </section>
    )
  } else if (screen.k === "item") {
    body = (
      <ItemPage title={screen.title} onBack={() => { setTab(1); home() }} inferred right={<SaveBtn on={saved.includes(screen.id)} onClick={() => toggle(screen.id)} testId="a-item-save" />} />
    )
  } else if (screen.k === "other") {
    body = <PlaceholderScreen title={screen.title} onBack={home} />
  } else {
    const allDone = st.done.length >= laText.tasks.length
    const hide = st.collapsed || allDone
    const open = (i: number) => (i === 0 || st.done.includes(i - 1)) && !st.done.includes(i)
    let tabBody: React.ReactNode
    if (tab === 0) {
      tabBody = (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button type="button" data-testid="a-chip-courses" aria-label={laText.courseListChip} onClick={() => { setTab(3); setDTab(1) }} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">{"📖"}</button>
              <button type="button" data-testid="a-chip-saved" aria-label={laText.bookmarksChip} onClick={() => go({ k: "other", title: laText.savedTitle })} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">{"🔖"}</button>
              <InferredTag />
            </div>
            <span data-testid="a-coins" className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-card px-3 text-sm" aria-label={laText.coins}><span className="text-amber-400">{"●"}</span><NotSourced /></span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">{greeting()}</h2>
            <div data-testid="a-streak" data-days={allDone ? 1 : 0} className="flex size-24 shrink-0 flex-col items-center justify-center rounded-[40%] bg-indigo-800 text-white">
              <span className="text-3xl font-bold">{allDone ? 1 : 0}</span>
              <span className="text-xs">{laText.streak}</span>
            </div>
          </div>
          <FadeRow className="gap-2 py-1">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button key={n} type="button" data-testid={`a-chip-${n}`} onClick={() => go({ k: "other", title: laText.dayChip(n) })} className="flex min-h-16 min-w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-card text-sm">
                <span aria-hidden="true">{"🔥"}</span>
                {laText.dayChip(n)}
              </button>
            ))}
          </FadeRow>
          <div data-testid="a-tasks" className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
            <button type="button" data-testid="a-tasks-head" aria-label={laText.collapse} onClick={() => update({ collapsed: !st.collapsed })} className="flex min-h-11 w-full items-center justify-between text-left font-semibold">
              <span>{allDone ? laText.tasksDone : laText.tasksTitle}</span>
              <span aria-hidden="true">{hide ? "▾" : "▴"}</span>
            </button>
            {allDone && (
              <button type="button" data-testid="a-bonus" onClick={() => go({ k: "other", title: laText.bonus })} className="min-h-11 rounded-full border border-border px-3 text-sm">{laText.bonus}</button>
            )}
            {!hide &&
              laText.tasks.map((t, i) => {
                const fin = st.done.includes(i)
                const cur = open(i)
                return (
                  <button
                    key={t.title}
                    type="button"
                    data-testid={`a-task-${i}`}
                    data-state={fin ? "done" : cur ? "current" : "locked"}
                    disabled={!cur}
                    onClick={() => go(i === 0 ? { k: "reading" } : { k: "task", i })}
                    className={`flex min-h-16 w-full items-center gap-3 rounded-lg border border-border p-3 text-left ${cur ? "" : "opacity-70"}`}
                  >
                    <span aria-hidden="true" className="w-6 text-center">{fin ? "✔" : cur ? "◉" : "🔒"}</span>
                    <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-900/50">{t.icon}</span>
                    <span className="min-w-0">
                      <span className="block font-medium">{t.title}</span>
                      <span className="block text-xs text-muted-foreground">{cur || fin ? <NotSourced /> : laText.lockedRow}</span>
                    </span>
                  </button>
                )
              })}
          </div>
          {!st.bannerGone && (
            <div data-testid="a-banner" className="relative rounded-lg bg-gradient-to-br from-orange-700/60 to-red-900/60 p-4 pr-12">
              <p className="text-lg font-semibold">{laText.bannerTitle}</p>
              <button type="button" data-testid="a-banner-go" onClick={() => go({ k: "guide" })} className="mt-2 inline-flex min-h-11 items-center rounded-full bg-black/40 px-4 text-sm">{laText.bannerBtn}</button>
              <button type="button" data-testid="a-banner-x" aria-label={laText.dismiss} onClick={() => update({ bannerGone: true })} className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-full">{"✕"}</button>
            </div>
          )}
        </div>
      )
    } else if (tab === 1) {
      tabBody = (
        <section data-testid="a-toolkit" className="flex flex-col gap-3">
          <h2 className="text-center text-xl font-bold">{laText.toolkit}</h2>
          <button type="button" data-testid="a-craving" onClick={() => go({ k: "other", title: laText.cravingScreen })} className="flex min-h-16 items-center justify-between rounded-lg bg-indigo-700 p-4 text-left text-white">
            <span><span className="block font-semibold">{laText.cravingCard}</span><span className="block text-sm text-white/80">{laText.cravingSub}</span></span>
            <span aria-hidden="true">{"›"}</span>
          </button>
          <h3 className="font-semibold">{laText.cravingsHead}</h3>
          <p className="text-sm text-muted-foreground">{laText.cravingsLine}</p>
          <FadeRow className="gap-3">
            {laText.cravingCards.map((c, i) => (
              <button key={c} type="button" data-testid={`a-tk-craving-${i}`} onClick={() => go({ k: "item", id: `tk-c-${i}`, title: c })} className="flex w-60 shrink-0 flex-col gap-1 text-left">
                <Pic tone={i} className="h-28 w-60" />
                <span className="text-sm font-medium">{c}</span>
              </button>
            ))}
          </FadeRow>
          <h3 className="font-semibold">{laText.mindHead}</h3>
          <p className="text-sm text-muted-foreground">{laText.mindLine}</p>
          <FadeRow className="gap-3">
            {laText.mindCards.map((c, i) => (
              <button key={c} type="button" data-testid={`a-tk-mind-${i}`} onClick={() => go({ k: "item", id: `tk-m-${i}`, title: c })} className="flex w-60 shrink-0 flex-col gap-1 text-left">
                <Pic tone={i + 2} className="h-28 w-60" />
                <span className="text-sm font-medium">{c}</span>
              </button>
            ))}
          </FadeRow>
        </section>
      )
    } else if (tab === 3) {
      tabBody = (
        <section data-testid="a-discover" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="flex-1 text-center text-xl font-bold">{laText.discover}</h2>
            <span className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-card px-3 text-sm"><span className="text-amber-400">{"●"}</span><NotSourced /></span>
          </div>
          <FadeRow role="tablist" className="gap-4 border-b border-border">
            {[...laText.discoverTabs, lbText.dashTab].map((t, i) => (
              <button key={`${t}-${i}`} type="button" role="tab" aria-selected={dTab === i} data-testid={`a-dtab-${i}`} onClick={() => setDTab(i)} className={`min-h-11 shrink-0 border-b-2 px-1 text-sm ${dTab === i ? "border-sky-400 font-semibold text-sky-300" : "border-transparent text-muted-foreground"} ${i === 3 ? "min-w-14 border-dashed border-border" : ""}`}>{t}</button>
            ))}
          </FadeRow>
          {dTab === 0 && (
            <div data-testid="a-community" className="flex flex-col gap-3">
              <h3 className="font-semibold">{laText.communityHead}</h3>
              <p className="text-sm text-muted-foreground">{laText.communityLine}</p>
              <FadeRow className="gap-3">
                {laText.meetings.map((m, i) => (
                  <div key={m} className="flex w-52 shrink-0 flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-center">
                    <div className="flex w-full justify-start"><NotSourced /></div>
                    <Pic tone={i} className="size-14" round />
                    <NameTile text={lbText.hostTile} />
                    <NotSourced />
                    <span className="font-medium">{m}</span>
                    <span className="text-xs text-muted-foreground">{laText.virtual}</span>
                    <button type="button" data-testid={`a-cal-${i}`} aria-pressed={st.cal.includes(i)} onClick={() => update({ cal: st.cal.includes(i) ? st.cal.filter((x) => x !== i) : [...st.cal, i] })} className="min-h-11 rounded-full bg-indigo-700 px-4 text-sm text-white">{st.cal.includes(i) ? laText.addedCal : laText.addCal}</button>
                  </div>
                ))}
              </FadeRow>
              <h3 className="font-semibold">{laText.checkinHead}</h3>
              <p className="text-sm text-muted-foreground">{laText.checkinLine}</p>
              <div className="flex w-52 flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-center">
                <div className="flex w-full justify-start"><NotSourced /></div>
                <Pic tone={4} className="h-16 w-full" />
                <span className="font-medium">{laText.checkinCard}</span>
              </div>
            </div>
          )}
          {dTab === 1 && (
            <div data-testid="a-courses" className="flex flex-col gap-3">
              <div className="flex items-center gap-2"><InferredTag /></div>
              <button type="button" data-testid="a-course-card" onClick={() => go({ k: "course" })} className="flex flex-col gap-1 rounded-lg border border-border bg-card p-2 text-left">
                <Pic tone={3} className="h-28" />
                <span className="text-xs text-muted-foreground">{laText.courseCategory}</span>
                <span className="font-semibold">{laText.courseTitle}</span>
                <span className="flex gap-2"><span className="text-sm">{`5 ${laText.courseDays}`}</span><NotSourced /></span>
              </button>
              <Placeholder />
            </div>
          )}
          {dTab >= 2 && (
            <div className="flex flex-col gap-2">
              <InferredTag />
              <Placeholder />
              <Placeholder />
            </div>
          )}
        </section>
      )
    } else {
      tabBody = (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{laText.tabs[tab]}</h2>
          <InferredTag />
          <Placeholder />
        </div>
      )
    }
    body = (
      <>
        {tabBody}
        {tab === 0 && <LabInferredLinks search={false} onSearch={() => undefined} onSaved={() => go({ k: "other", title: laText.savedTitle })} />}
      </>
    )
  }

  const showNav = screen.k === "tabs"
  return (
    <div data-testid="library-a" className="flex flex-col gap-3">
      {body}
      {showNav && <FixedNav items={laText.tabs} value={tab} onChange={setTab} id="a-tab" />}
      {showNav && <NavSpace />}
    </div>
  )
}
