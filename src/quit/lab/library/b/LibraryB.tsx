"use client"

import { useState } from "react"
import { FixedNav, NavSpace } from "../../lessons/shared/Bits"
import { InferredTag, Placeholder, PlaceholderScreen, ShareBtn } from "../../progress/shared/Bits"
import { SnakeGame } from "../../sos/c/SnakeGame"
import { useLabState } from "../../store"
import { ArticleTile, BackBtn, ItemPage, LabInferredLinks, Pic, Row } from "../shared/Bits"
import { lbText } from "../shared/text"
import { lbbText } from "./text"

type Cat = keyof typeof lbbText.cats
type Screen =
  | { k: "tabs" }
  | { k: "article"; title: string; cat: Cat }
  | { k: "weekly" }
  | { k: "craving"; i: number }
  | { k: "game" }
  | { k: "stories" }
  | { k: "tipform" }
  | { k: "other"; title: string }
  | { k: "search"; q: string }
const TABS: Screen = { k: "tabs" }
interface Tip { title: string; text: string }

function ArtCard({ title, cat, onOpen, testId }: { title: string; cat: Cat; onOpen: () => void; testId: string }) {
  return (
    <button type="button" data-testid={testId} onClick={onOpen} className="flex w-full flex-col gap-1 rounded-xl border border-border bg-card p-2 text-left">
      <Pic tone={title.length} className="h-36 w-full" />
      <span className="text-xs text-muted-foreground">{lbbText.cats[cat]}</span>
      <span className="font-bold">{title}</span>
      <span className="rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground">{lbbText.summaryTile}</span>
    </button>
  )
}

function Box({ children, head, testId }: { children: React.ReactNode; head: string; testId?: string }) {
  return (
    <section data-testid={testId} className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-3">
      <h3 className="text-lg font-bold">{head}</h3>
      {children}
    </section>
  )
}

/** Copy B: the Discover tab (search, strip, featured cards, themed carousels with "n of N") and the Home rows (weekly guide, missions, cravings, stories, tips). */
export function LibraryB() {
  const [tab, setTab] = useState(3)
  const [strip, setStrip] = useState(0)
  const [screen, setScreen] = useState<Screen>(TABS)
  const [q, setQ] = useState("")
  const [tips, setTips] = useLabState<Tip[]>("library", "b", "tips", [])
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [photo, setPhoto] = useState("")
  const go = (s: Screen) => setScreen(s)
  const home = () => go(TABS)
  const open = (t: string, c: Cat) => go({ k: "article", title: t, cat: c })

  const missionRow = () =>
    Array.from({ length: lbbText.missionCount }, (_, i) =>
      i < lbbText.missions.length ? (
        <ArtCard key={i} testId={`b-mission-${i}`} title={lbbText.missions[i]} cat="missions" onOpen={() => open(lbbText.missions[i], "missions")} />
      ) : (
        <Placeholder key={i} className="h-40" />
      ),
    )

  let body: React.ReactNode
  if (screen.k === "article") {
    body = (
      <ItemPage title={screen.title} onBack={home} inferred testId="b-article">
        <p className="text-xs text-muted-foreground">{lbbText.cats[screen.cat]}</p>
        <ArticleTile />
      </ItemPage>
    )
  } else if (screen.k === "weekly") {
    body = (
      <section data-testid="b-weekly" className="flex flex-col gap-3">
        <div className="flex items-center gap-2"><BackBtn onClick={home} /></div>
        <div className="relative flex h-24 overflow-hidden rounded-lg text-sm font-bold text-white">
          <div className="flex flex-1 items-start bg-sky-800 p-2">{lbbText.past}</div>
          <div className="flex flex-1 items-start justify-end bg-orange-700 p-2">{lbbText.future}</div>
          <span className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl text-black">{"1"}</span>
        </div>
        <p className="text-xs text-muted-foreground">{lbbText.weeklyGuide}</p>
        <h2 className="text-2xl font-bold">{lbbText.weekTitle}</h2>
        <ArticleTile />
        <h3 className="font-bold">{lbbText.weeklyMissions}</h3>
        <Row id="b-weekly-row">{missionRow()}</Row>
      </section>
    )
  } else if (screen.k === "craving") {
    const c = lbbText.cravingCards[screen.i]
    body = (
      <ItemPage title={c.title} onBack={home} inferred testId="b-craving">
        <p className="text-xs text-muted-foreground">{lbbText.cats.cravings}</p>
        <ArticleTile />
        <div className="flex flex-wrap items-center gap-2">
          <ShareBtn text={c.title} testId="b-craving-share" />
          {c.game && <button type="button" data-testid="b-play" onClick={() => go({ k: "game" })} className="min-h-11 rounded-full bg-indigo-700 px-4 text-sm text-white">{lbbText.playGame}</button>}
        </div>
      </ItemPage>
    )
  } else if (screen.k === "game") {
    body = <SnakeGame onBack={home} />
  } else if (screen.k === "stories") {
    body = (
      <section data-testid="b-stories-page" className="flex flex-col gap-3">
        <div className="flex items-center gap-2"><BackBtn onClick={home} /><h2 className="text-lg font-semibold">{lbbText.storiesPage}</h2></div>
        {Array.from({ length: lbbText.storyCount }, (_, i) => (i < lbbText.stories.length ? <Story key={i} i={i} /> : <Placeholder key={i} className="h-24" />))}
      </section>
    )
  } else if (screen.k === "tipform") {
    body = (
      <section data-testid="b-tipform" className="flex flex-col gap-3">
        <div className="flex items-center gap-2"><BackBtn onClick={home} /><h2 className="text-lg font-semibold">{lbbText.addTip}</h2></div>
        <label className="flex flex-col gap-1 text-sm">
          {lbbText.tipTitleLabel}
          <input data-testid="b-tip-title" value={title} maxLength={lbbText.tipTitleMax} onChange={(e) => setTitle(e.target.value)} className="min-h-11 rounded-md border border-border bg-background px-2" />
          <span className="text-xs text-muted-foreground">{`${title.length}/${lbbText.tipTitleMax}`}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {lbbText.tipTextLabel}
          <textarea data-testid="b-tip-text" value={text} maxLength={lbbText.tipTextMax} rows={6} onChange={(e) => setText(e.target.value)} className="rounded-md border border-border bg-background p-2" />
          <span className="text-xs text-muted-foreground">{`${text.length}/${lbbText.tipTextMax}`}</span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-border px-4 text-sm">
          {photo || lbbText.addPhoto}
          <input type="file" accept="image/*" data-testid="b-tip-photo" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0]?.name ?? "")} />
        </label>
        <button
          type="button"
          data-testid="b-tip-save"
          disabled={!title.trim() || !text.trim()}
          onClick={() => { setTips([...tips, { title: title.trim(), text: text.trim() }]); setTitle(""); setText(""); setPhoto(""); setTab(1); home() }}
          className="min-h-12 rounded-full bg-indigo-700 px-4 font-medium text-white disabled:opacity-40"
        >
          {lbbText.addTips}
        </button>
      </section>
    )
  } else if (screen.k === "search") {
    body = (
      <section data-testid="b-search" className="flex flex-col gap-3">
        <div className="flex items-center gap-2"><BackBtn onClick={home} /><h2 className="flex-1 text-lg font-semibold">{lbbText.searchTitle}</h2><InferredTag /></div>
        <p className="text-sm text-muted-foreground">{screen.q || lbbText.searchEmpty}</p>
        <Placeholder />
      </section>
    )
  } else if (screen.k === "other") {
    body = <PlaceholderScreen title={screen.title} onBack={home} />
  } else if (tab === 3) {
    body = (
      <div data-testid="b-discover" className="flex flex-col gap-3">
        <div className="-mx-1 flex items-center justify-between rounded-lg bg-sky-800 p-3 text-white">
          <h2 className="text-2xl font-bold">{lbbText.discover}</h2>
          <button type="button" data-testid="b-settings" onClick={() => go({ k: "other", title: lbbText.settings })} className="inline-flex min-h-11 items-center gap-1 text-sm">{"⚙ "}{lbbText.settings}</button>
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); go({ k: "search", q }) }}>
          <input data-testid="b-search-field" value={q} onChange={(e) => setQ(e.target.value)} placeholder={lbbText.searchPlaceholder} aria-label={lbbText.searchPlaceholder} className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3" />
          <button type="submit" data-testid="b-search-go" aria-label={lbbText.searchGo} className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-sky-700 text-white">{"⌕"}</button>
        </form>
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]">
          {lbbText.strip.map((s, i) => (
            <button key={s} type="button" role="tab" aria-selected={strip === i} data-testid={`b-strip-${i}`} onClick={() => setStrip(i)} className={`min-h-11 shrink-0 border-b-2 px-2 text-xs font-semibold ${strip === i ? "border-sky-400 text-sky-300" : "border-transparent text-muted-foreground"}`}>{s}</button>
          ))}
        </div>
        {strip === 0 && (
          <>
            <Box head={lbbText.featuredHead} testId="b-featured">
              {lbbText.featured.map((f, i) => (
                <ArtCard key={f.title} testId={`b-feat-${i}`} title={f.title} cat={f.cat as Cat} onOpen={() => open(f.title, f.cat as Cat)} />
              ))}
            </Box>
            {lbbText.sections.map((s, si) => (
              <Box key={s.head} head={s.head} testId={`b-section-${si}`}>
                <Row id={`b-sec-${si}`}>
                  {Array.from({ length: s.count }, (_, i) =>
                    i === 0 ? <ArtCard key={i} testId={`b-sec-${si}-first`} title={s.first.title} cat={s.first.cat as Cat} onOpen={() => open(s.first.title, s.first.cat as Cat)} /> : <Placeholder key={i} className="h-40" />,
                  )}
                </Row>
              </Box>
            ))}
          </>
        )}
        {strip === 1 && <div className="flex flex-col gap-2"><InferredTag /><Placeholder /><Placeholder /></div>}
        {strip === 2 && <div className="flex flex-col gap-2"><InferredTag /><Placeholder /><Placeholder /></div>}
        {strip === 3 && (
          <div data-testid="b-strip-cravings" className="flex flex-col gap-2">
            <InferredTag />
            <Placeholder />
          </div>
        )}
        <LabInferredLinks search={false} onSearch={() => undefined} onSaved={() => go({ k: "other", title: lbText.labSaved })} />
      </div>
    )
  } else if (tab === 0) {
    body = (
      <div data-testid="b-home" className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">{lbbText.homeTitle}</h2>
        <button type="button" data-testid="b-weekly-open" onClick={() => go({ k: "weekly" })} className="flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card p-3 text-left">
          <Pic tone={2} className="size-16" />
          <span className="min-w-0 flex-1"><span className="block font-bold">{lbbText.weeklyGuide}</span><span className="block text-sm text-muted-foreground">{lbbText.weeklyGuideLine}</span></span>
          <span aria-hidden="true">{"›"}</span>
        </button>
        <Box head={lbbText.missionsHead} testId="b-missions">
          <p className="text-sm text-muted-foreground">{lbbText.missionsLine}</p>
          <Row id="b-mis">{missionRow()}</Row>
          <button type="button" data-testid="b-all-missions" onClick={() => go({ k: "other", title: lbbText.allMissionsPage })} className="min-h-11 self-start text-sm text-sky-300 underline">{lbbText.viewAllMissions}</button>
        </Box>
        <Box head={lbbText.cravingsHead} testId="b-cravings">
          <p className="text-sm text-muted-foreground">{lbbText.cravingsLine}</p>
          <Row id="b-crv">
            {Array.from({ length: lbbText.cravingCount }, (_, i) =>
              i < lbbText.cravingCards.length ? (
                <button key={i} type="button" data-testid={`b-crv-${i}`} onClick={() => go({ k: "craving", i })} className="flex w-full flex-col gap-1 rounded-xl border border-border bg-card p-2 text-left">
                  <Pic tone={i + 3} className="h-28 w-full" />
                  <span className="text-xs text-muted-foreground">{lbbText.cats.cravings}</span>
                  <span className="font-bold">{lbbText.cravingCards[i].title}</span>
                </button>
              ) : (
                <Placeholder key={i} className="h-40" />
              ),
            )}
          </Row>
        </Box>
        <Box head={lbbText.storiesHead} testId="b-stories">
          <Row id="b-sto">
            {Array.from({ length: lbbText.storyCount }, (_, i) => (i < lbbText.stories.length ? <Story key={i} i={i} /> : <Placeholder key={i} className="h-28" />))}
          </Row>
          <button type="button" data-testid="b-all-stories" onClick={() => go({ k: "stories" })} className="min-h-11 self-start text-sm text-sky-300 underline">{lbbText.viewAllStories}</button>
        </Box>
        <Box head={lbbText.tipsHead} testId="b-tips">
          <p className="text-sm text-muted-foreground">{lbbText.tipsLine}</p>
          <div className="flex h-20 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-700/60 to-teal-900/60 font-bold uppercase">{lbbText.tipsBanner}</div>
          <div className="rounded-xl border border-border bg-card p-3 font-semibold">{lbbText.writeFirst}</div>
          <button type="button" data-testid="b-add-tip" onClick={() => go({ k: "tipform" })} className="min-h-11 rounded-full border border-border px-4 text-sm">{lbbText.addTip}</button>
        </Box>
      </div>
    )
  } else if (tab === 1) {
    body = (
      <div data-testid="b-progress" className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">{lbbText.tipsListHead}</h2>
        {tips.map((t, i) => (
          <div key={`${t.title}-${i}`} data-testid="b-my-tip" className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{lbbText.cats.tips}</p>
            <p className="font-bold">{t.title}</p>
          </div>
        ))}
        {lbbText.tipCards.map((t, i) => (
          <button key={t} type="button" data-testid={`b-tipcard-${i}`} onClick={() => open(t, "tips")} className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card p-2 text-left">
            <Pic tone={i} className="size-14" />
            <span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">{lbbText.cats.tips}</span><span className="block font-bold">{t}</span></span>
            <span aria-hidden="true">{"›"}</span>
          </button>
        ))}
      </div>
    )
  } else {
    body = <PlaceholderScreen title={lbbText.tabs[tab]} onBack={null} />
  }

  const showNav = screen.k === "tabs"
  return (
    <div data-testid="library-b" className="flex flex-col gap-3">
      {body}
      {showNav && <FixedNav items={lbbText.tabs} value={tab} onChange={setTab} id="b-tab" />}
      {showNav && <NavSpace />}
    </div>
  )
}

function Story({ i }: { i: number }) {
  return (
    <div data-testid="b-story" className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2"><Pic tone={i} className="size-10" round /><span className="text-xs text-muted-foreground">{lbbText.storyName}</span></div>
      <p className="font-bold">{lbbText.stories[i]}</p>
      <ArticleTile text={lbText.textTile} />
    </div>
  )
}
