"use client"

import { useEffect, useState } from "react"
import { FixedNav, NavSpace } from "../../lessons/shared/Bits"
import { InferredTag, Placeholder, PlaceholderScreen, ShareBtn, Tabs } from "../../progress/shared/Bits"
import { iaText } from "../../ifthen/a/text"
import { useLabState } from "../../store"
import { ArticleTile, ItemPage, LabInferredLinks, LabOnlyTag, Pic, Row, useSaved } from "../shared/Bits"
import { leText } from "./text"

type Page = { k: "tools" } | { k: "challenges" } | { k: "cravings" } | { k: "article" } | { k: "item"; title: string }

/** Copy E: the app (Explore decks, Quit Kit favourites, Home) and the website (index, category, article, menu drawer). */
export function LibraryE() {
  const [view, setView] = useState(0)
  return (
    <div data-testid="library-e" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1"><Tabs id="e-view" items={leText.views} value={view} onChange={setView} /></div>
        <LabOnlyTag />
      </div>
      {view === 0 ? <AppE /> : <WebE />}
    </div>
  )
}

function AppE() {
  const [tab, setTab] = useState(1)
  const [deck, setDeck] = useState(0)
  const [kitDot, setKitDot] = useState(0)
  const [other, setOther] = useState<string | null>(null)
  const [saved, toggle] = useSaved("e")
  const [start, setStart] = useLabState<number>("library", "e", "start", 0)
  const [now, setNow] = useState(0)
  useEffect(() => {
    if (!start) setStart(Date.now())
  }, [start, setStart])
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const t = start && now ? Math.max(0, Math.floor((now - start) / 1000)) : 0
  const rowCount = (r: number) => saved.filter((id) => Number(id.split("-")[0]) % 3 === r).length

  if (other) return <PlaceholderScreen title={other} onBack={() => setOther(null)} />

  let body: React.ReactNode
  if (tab === 1) {
    body = (
      <section data-testid="e-explore" className="flex flex-col gap-3">
        <h2 className="rounded-md bg-indigo-950 px-3 py-3 text-lg font-bold text-white">{leText.appTitle}</h2>
        <div role="tablist" className="grid grid-cols-4 overflow-hidden rounded-md border border-border">
          {iaText.exploreTabs.map((x, i) => (
            <button key={x} type="button" role="tab" aria-selected={deck === i} data-testid={`e-deck-${i}`} onClick={() => setDeck(i)} className={`min-h-11 text-xs font-semibold ${deck === i ? "bg-sky-700 text-white" : "bg-card"}`}>{x}</button>
          ))}
        </div>
        <Row id="e-cards" key={deck}>
          {Array.from({ length: leText.cardCount }, (_, c) => {
            const id = `${deck}-${c}`
            const on = saved.includes(id)
            return (
              <div key={id} data-testid={`e-card-${c}`} className="flex min-h-80 flex-col justify-between gap-4 rounded-2xl bg-purple-800 p-4">
                <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-white/40 px-3 text-center text-sm text-white/80">{leText.cardTile}</div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" data-testid={`e-add-${c}`} aria-pressed={on} onClick={() => toggle(id)} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-black/30 px-3 text-sm text-white">{on ? leText.added : leText.addToKit}</button>
                  <ShareBtn text={iaText.exploreTabs[deck]} testId={`e-share-${c}`} />
                </div>
              </div>
            )
          })}
        </Row>
      </section>
    )
  } else if (tab === 0) {
    body = (
      <section data-testid="e-kit" className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div data-testid="e-kit-count" className="text-2xl font-bold text-red-400">{iaText.kitCount}</div>
            <div className="text-sm">{iaText.kitHead}</div>
          </div>
          <button type="button" data-testid="e-edit-profile" onClick={() => setOther(leText.otherTitles.profile)} className="min-h-11 shrink-0 text-sm text-sky-400 underline">{iaText.editProfile}</button>
        </div>
        <div className="flex flex-col gap-2 rounded-xl bg-card p-3">
          <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed border-border px-3 text-center text-sm text-muted-foreground">{leText.kitTile}</div>
          <div className="flex justify-center gap-1">
            {Array.from({ length: leText.kitDots }, (_, i) => (
              <button key={i} type="button" data-testid={`e-kit-dot-${i}`} aria-label={leText.kitSwipeDot(i + 1)} aria-current={kitDot === i} onClick={() => setKitDot(i)} className="inline-flex size-11 items-center justify-center"><span className={`size-2.5 rounded-full ${kitDot === i ? "bg-foreground" : "bg-border"}`} /></button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2"><h3 className="font-semibold">{iaText.favorites}</h3><InferredTag /></div>
        {iaText.favRows.map((r, i) => (
          <button key={r} type="button" data-testid={`e-fav-${i}`} onClick={() => setOther(leText.otherTitles.favourites)} className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card p-2 text-left">
            <span aria-hidden="true" className="inline-flex size-10 items-center justify-center rounded-full bg-sky-900/50">{iaText.profileIcons[i]}</span>
            <span className="min-w-0 flex-1 font-medium">{r}</span>
            <span data-testid={`e-fav-count-${i}`} className="text-sm tabular-nums">{rowCount(i)}</span>
            <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-full bg-orange-500 text-white">{"›"}</span>
          </button>
        ))}
        <button type="button" data-testid="e-view-fav" onClick={() => setOther(leText.otherTitles.favourites)} className="min-h-12 rounded-md bg-card px-4 font-medium">{iaText.viewFavorites}</button>
        <LabInferredLinks search={false} onSearch={() => undefined} onSaved={() => setOther(leText.otherTitles.saved)} />
      </section>
    )
  } else if (tab === 2) {
    body = (
      <section data-testid="e-home" className="flex flex-col gap-4">
        <div className="rounded-md bg-card px-3 py-2">
          <div className="text-xs text-sky-400">{iaText.joined}</div>
          <div data-testid="e-joined" className="font-semibold tabular-nums">{leText.joinedTick(Math.floor(t / 86400), Math.floor((t % 86400) / 3600), Math.floor((t % 3600) / 60), t % 60)}</div>
        </div>
        <h2 className="text-center text-xl font-bold">{iaText.whatsUp}</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {iaText.homeButtons.map((b, i) => (
            <button key={b} type="button" data-testid={`e-home-btn-${i}`} onClick={() => setOther(leText.otherTitles.deck)} className="flex size-24 basis-24 items-center justify-center rounded-full border-2 border-sky-500 bg-card p-2 text-center text-sm font-semibold leading-tight">{b}</button>
          ))}
        </div>
        <div className="text-sm font-semibold text-sky-400">{iaText.didYouKnow}</div>
        <div className="rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">{leText.didTile}</div>
      </section>
    )
  } else {
    body = <PlaceholderScreen title={iaText.appTabs[tab]} onBack={null} />
  }
  return (
    <div data-testid="e-app">
      {body}
      <FixedNav items={iaText.appTabs} value={tab} onChange={setTab} id="e-tab" />
      <NavSpace />
    </div>
  )
}

function WebE() {
  const [page, setPage] = useState<Page>({ k: "tools" })
  const [menu, setMenu] = useState<null | number | "root">(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [other, setOther] = useState<string | null>(null)
  const [notes, setNotes] = useLabState<string[]>("library", "e", "notes", ["", "", ""])

  const pick = (kid: string) => {
    setMenu(null)
    if (kid === leText.cravingsTitle) setPage({ k: "cravings" })
    else setPage({ k: "item", title: kid })
  }

  if (other) return <PlaceholderScreen title={other} onBack={() => setOther(null)} />

  let body: React.ReactNode
  if (page.k === "tools") {
    body = (
      <section data-testid="e-tools" className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">{leText.toolsTitle}</h1>
        <ArticleTile text={leText.introTile} />
        <Pic tone={0} className="h-32" />
        {leText.tools.map((c, i) => (
          <button key={c} type="button" data-testid={`e-tool-${i}`} onClick={() => setPage({ k: "item", title: c })} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-2 text-left">
            <Pic tone={i} className="h-24 w-full" />
            <span className="font-bold text-sky-300 underline">{c}</span>
            <ArticleTile text={leText.summaryTile} />
          </button>
        ))}
      </section>
    )
  } else if (page.k === "challenges") {
    body = (
      <section data-testid="e-challenges" className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">{leText.challengesTitle}</h1>
        <ArticleTile text={leText.introTile} />
        <Pic tone={1} className="h-32" />
        {leText.challenges.map((c, i) => (
          <button key={c} type="button" data-testid={`e-chal-${i}`} onClick={() => (c === leText.cravingsTitle ? setPage({ k: "cravings" }) : setPage({ k: "item", title: c }))} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-2 text-left">
            <Pic tone={i} className="h-24 w-full" />
            <span className="font-bold text-sky-300 underline">{c}</span>
            <ArticleTile text={leText.summaryTile} />
          </button>
        ))}
      </section>
    )
  } else if (page.k === "cravings") {
    body = (
      <section data-testid="e-category" className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">{leText.cravingsTitle}</h1>
        <ArticleTile text={leText.introTile} />
        <Pic tone={2} className="h-32" />
        {leText.cravingArticles.map((c, i) => (
          <button key={c} type="button" data-testid={`e-cat-${i}`} onClick={() => (i === 1 ? setPage({ k: "article" }) : setPage({ k: "item", title: c }))} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-2 text-left">
            <Pic tone={i} className="h-24 w-full" />
            <span className="font-bold text-sky-300 underline">{c}</span>
            <ArticleTile text={leText.summaryTile} />
          </button>
        ))}
      </section>
    )
  } else if (page.k === "article") {
    body = (
      <article data-testid="e-article" className="flex flex-col gap-3">
        <nav aria-label={leText.crumbs[0]} className="flex flex-wrap items-center gap-1 text-sm">
          <button type="button" data-testid="e-crumb-0" onClick={() => setPage({ k: "challenges" })} className="min-h-11 text-sky-300 underline">{leText.crumbs[0]}</button>
          <span aria-hidden="true">{"/"}</span>
          <button type="button" data-testid="e-crumb-1" onClick={() => setPage({ k: "cravings" })} className="min-h-11 text-sky-300 underline">{leText.crumbs[1]}</button>
          <span aria-hidden="true">{"/"}</span>
          <span>{leText.articleTitle}</span>
        </nav>
        <h1 className="text-2xl font-bold">{leText.articleTitle}</h1>
        <div className="flex items-center gap-2">
          <button type="button" data-testid="e-lang" onClick={() => setOther(leText.otherTitles.lang)} className="min-h-11 rounded-md bg-sky-700 px-4 text-sm text-white">{leText.lang}</button>
          <InferredTag />
        </div>
        <h2 className="text-lg font-bold">{leText.keyPoints}</h2>
        <ArticleTile />
        <Pic tone={2} className="h-36" />
        <ArticleTile text={leText.introTile} />
        {leText.sections.map((s) => (
          <div key={s} className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">{s}</h2>
            <ArticleTile />
          </div>
        ))}
        <div data-testid="e-teasers" className="flex flex-col gap-2">
          {leText.teasers.map((s, i) => (
            <button key={s} type="button" data-testid={`e-teaser-${i}`} onClick={() => setPage({ k: "item", title: s })} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 text-left">
              <span className="font-bold text-sky-300 underline">{s}</span>
              <ArticleTile text={leText.summaryTile} />
            </button>
          ))}
        </div>
        <div data-testid="e-notes" className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
          <h3 className="font-bold">{leText.quitNotes}</h3>
          <div className="grid grid-cols-3 gap-2">
            {leText.noteBoxes.map((l, i) => (
              <input key={l} data-testid={`e-note-${i}`} aria-label={l} value={notes[i] ?? ""} onChange={(e) => setNotes(notes.map((n, k) => (k === i ? e.target.value : n)))} className="min-h-11 min-w-0 rounded-md border border-border bg-background px-2" />
            ))}
          </div>
          <ArticleTile text={leText.summaryTile} />
          <div className="flex flex-wrap gap-2">
            <ShareBtn text={leText.quitNotes} testId="e-note-share" />
            <a data-testid="e-note-email" href={`mailto:?subject=${encodeURIComponent(leText.emailSubject)}&body=${encodeURIComponent(notes.join("\n"))}`} className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm">{leText.email}</a>
          </div>
        </div>
        <h2 className="text-lg font-bold">{leText.more}</h2>
        <Placeholder />
        <Placeholder />
      </article>
    )
  } else {
    body = <ItemPage title={page.title} onBack={() => setPage({ k: "tools" })} inferred testId="e-item" />
  }

  return (
    <div data-testid="e-web" className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-md bg-neutral-800 px-2 text-white">
        <button type="button" data-testid="e-menu-open" onClick={() => setMenu("root")} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><span aria-hidden="true">{"☰"}</span>{leText.menu}</button>
        <button type="button" data-testid="e-search-open" aria-label={leText.menuSearch} aria-expanded={searchOpen} onClick={() => setSearchOpen(!searchOpen)} className="inline-flex size-11 items-center justify-center">{"⌕"}</button>
      </div>
      {searchOpen && (
        <div data-testid="e-search-panel" className="flex flex-col gap-2">
          <InferredTag />
          <Placeholder />
        </div>
      )}
      {body}
      {menu !== null && (
        <div data-testid="e-drawer" className="fixed inset-0 z-50 flex">
          <div className="flex h-full w-[85%] max-w-sm flex-col overflow-y-auto bg-neutral-900 text-white">
            <div className="flex items-center justify-between border-b border-white/20">
              {menu === "root" ? <span /> : <button type="button" data-testid="e-menu-back" onClick={() => setMenu("root")} className="min-h-11 px-3 text-sm font-semibold">{`‹ ${leText.menuBack}`}</button>}
              <button type="button" data-testid="e-menu-close" onClick={() => setMenu(null)} className="min-h-11 px-3 text-sm font-semibold">{`${leText.closeMenu} ✕`}</button>
            </div>
            {menu === "root" ? (
              <>
                <button type="button" data-testid="e-menu-home" onClick={() => { setMenu(null); setPage({ k: "tools" }) }} className="min-h-12 bg-sky-700 px-3 text-left text-sm font-bold">{leText.menuHome}</button>
                {leText.menuRows.map((r, i) => (
                  <div key={r.t} className="flex items-center border-b border-white/10">
                    <button type="button" data-testid={`e-menu-row-${i}`} onClick={() => { if (i === 0) { setMenu(null); setPage({ k: "tools" }) } else if (i === 2) { setMenu(null); setPage({ k: "challenges" }) } else setMenu(i) }} className="min-h-12 flex-1 px-3 text-left text-sm font-bold">{r.t}</button>
                    <button type="button" data-testid={`e-menu-chev-${i}`} aria-label={r.t} onClick={() => setMenu(i)} className="inline-flex size-12 items-center justify-center">{"›"}</button>
                  </div>
                ))}
              </>
            ) : (
              leText.menuRows[menu].kids.map((k, i) => (
                <button key={k} type="button" data-testid={`e-menu-kid-${i}`} onClick={() => pick(k)} className="min-h-12 border-b border-white/10 px-3 text-left text-sm">{k}</button>
              ))
            )}
          </div>
          <button type="button" aria-label={leText.closeMenu} onClick={() => setMenu(null)} className="h-full flex-1 bg-black/60" />
        </div>
      )}
    </div>
  )
}
