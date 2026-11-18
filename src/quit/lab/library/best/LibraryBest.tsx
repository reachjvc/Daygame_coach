"use client"

import { useMemo, useState } from "react"
import { NumberCard } from "../../../components/NumberCard"
import { getAddiction } from "../../../data"
import { EvidenceChip, SourceTap } from "../../../components/kit"
import type { QuitAddictionId } from "../../../types"
import type { LabProps } from "../../registry"
import { Tabs } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import { allItems, buildItems, parseMarks, readMinutes, savedItems, searchItems, SECTION_ORDER, toggleMark, type LibItem, type SectionId } from "./logic"
import { bestText as t } from "./text"

const SWITCH_IDS = ["nicotine", "alcohol", "weed", "porn"] as const satisfies readonly QuitAddictionId[]

function ContentComing() {
  return (
    <p data-testid="content-coming" className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
      {t.contentComing}
    </p>
  )
}

function Switcher({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label={t.addictionLabel} className="flex flex-wrap gap-2">
      {SWITCH_IDS.map((x) => (
        <button
          key={x}
          type="button"
          role="radio"
          aria-checked={value === x}
          data-testid={`switch-${x}`}
          onClick={() => onChange(x)}
          className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${value === x ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
        >
          {t.addictions[x]}
        </button>
      ))}
    </div>
  )
}

interface Marks {
  saved: string[]
  read: string[]
  toggleSaved: (id: string) => void
  toggleRead: (id: string) => void
}

function ItemCard({ item, marks }: { item: LibItem; marks: Marks }) {
  const [shown, setShown] = useState(false)
  const isSaved = marks.saved.includes(item.id)
  const isRead = marks.read.includes(item.id)
  const isFact = item.section === "true"
  const footer = (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
      <span data-testid="read-time" className="mr-auto text-xs text-muted-foreground">
        {t.readTime(readMinutes(item))}
      </span>
      <button type="button" data-testid="read-btn" aria-pressed={isRead} onClick={() => marks.toggleRead(item.id)} className={`min-h-11 rounded-full border px-3 text-sm ${isRead ? "border-primary bg-primary/30" : "border-border"}`}>
        {isRead ? t.read : t.markRead}
      </button>
      <button type="button" data-testid="save-btn" aria-pressed={isSaved} aria-label={isSaved ? t.unsave : t.save} onClick={() => marks.toggleSaved(item.id)} className={`inline-flex size-11 items-center justify-center rounded-full border border-border text-lg ${isSaved ? "bg-primary/40" : "bg-card"}`}>
        {"🔖"}
      </button>
    </div>
  )
  if (item.number) {
    return (
      <div data-testid="item-numbers" data-item-id={item.id} className="flex flex-col gap-2">
        <NumberCard n={item.number} />
        {footer}
      </div>
    )
  }
  return (
    <article data-testid={`item-${item.section}`} data-item-id={item.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      {item.section === "helps" && <h3 className="text-sm text-muted-foreground">{item.title}</h3>}
      {item.section === "expect" && <h3 className="text-base font-semibold">{item.title}</h3>}
      {isFact ? (
        <>
          <p className="text-base font-medium">{item.title}</p>
          {!shown ? (
            <button type="button" data-testid="reveal" onClick={() => setShown(true)} className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary px-4 text-sm text-primary">
              {t.showAnswer}
            </button>
          ) : (
            <div data-testid="answer">
              <p className="text-sm font-semibold">{item.answer ? t.isTrue : t.isFalse}</p>
              <p className="mt-1 text-base">{item.explain}</p>
              <SourceTap refs={item.refs} />
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-base">{item.text}</p>
          {item.section === "expect" && (item.peak || item.lasts) && (
            <p className="text-sm text-muted-foreground">
              {item.peak ? `${t.peak}: ${item.peak}. ` : ""}
              {item.lasts ? `${t.lasts}: ${item.lasts}.` : ""}
            </p>
          )}
          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center break-all text-sm text-primary underline">
              {t.link}
            </a>
          )}
          {item.evidence && !item.idea && (
            <div>
              <EvidenceChip evidence={item.evidence} />
            </div>
          )}
          {!item.idea && <SourceTap refs={item.refs} />}
        </>
      )}
      {footer}
    </article>
  )
}

function Carousel({ items, marks }: { items: LibItem[]; marks: Marks }) {
  const [i, setI] = useState(0)
  const n = items.length
  const at = Math.min(i, n - 1)
  return (
    <div data-testid="true-carousel" className="flex flex-col gap-2">
      <ItemCard key={items[at].id} item={items[at]} marks={marks} />
      <div className="flex items-center justify-center gap-3 text-sm">
        <button type="button" data-testid="true-prev" aria-label={t.prev} disabled={at === 0} onClick={() => setI(at - 1)} className="inline-flex size-11 items-center justify-center disabled:opacity-30">{"‹"}</button>
        <span data-testid="true-count">{t.of(at + 1, n)}</span>
        <button type="button" data-testid="true-next" aria-label={t.next} disabled={at === n - 1} onClick={() => setI(at + 1)} className="inline-flex size-11 items-center justify-center disabled:opacity-30">{"›"}</button>
      </div>
    </div>
  )
}

/** Improved Library: four sourced sections, search, saved items, read marks. */
export function LibraryBest({ addiction: initial }: LabProps) {
  const [chosen, setChosen] = useLabState<string>("library", "best", "addiction", initial)
  const id: QuitAddictionId = (SWITCH_IDS as readonly string[]).includes(chosen) ? (chosen as QuitAddictionId) : "nicotine"
  const data = getAddiction(id)
  const [savedRaw, setSaved] = useLabState<string[]>("library", "best", "saved", [])
  const [readRaw, setRead] = useLabState<string[]>("library", "best", "read", [])
  const saved = parseMarks(savedRaw)
  const read = parseMarks(readRaw)
  const marks: Marks = { saved, read, toggleSaved: (x) => setSaved(toggleMark(saved, x)), toggleRead: (x) => setRead(toggleMark(read, x)) }
  const [tab, setTab] = useState(0)
  const [query, setQuery] = useState("")
  const [section, setSection] = useState<SectionId | "all">("all")
  const [open, setOpen] = useState<string | null>(null)

  const built = useMemo(() => (data ? buildItems(data) : null), [data])
  const items = useMemo(() => (built ? allItems(built) : []), [built])
  const openItem = open ? items.find((x) => x.id === open) ?? null : null
  const results = searchItems(items, query)
  const searching = query.trim() !== ""
  const shownSections = SECTION_ORDER.filter((s) => section === "all" || section === s)

  let body: React.ReactNode
  if (!data || !built) {
    body = <ContentComing />
  } else if (openItem) {
    body = (
      <div data-testid="item-view" className="flex flex-col gap-3">
        <button type="button" data-testid="item-back" onClick={() => setOpen(null)} className="inline-flex min-h-11 items-center self-start rounded-full border border-border px-4 text-sm">
          {"‹ "}
          {t.back}
        </button>
        <ItemCard item={openItem} marks={marks} />
      </div>
    )
  } else if (tab === 1) {
    const list = savedItems(items, saved)
    body = (
      <section data-testid="saved-list" aria-label={t.savedLabel} className="flex flex-col gap-3">
        {list.length === 0 ? <p data-testid="saved-empty" className="text-sm text-muted-foreground">{t.savedEmpty}</p> : list.map((x) => <ItemCard key={x.id} item={x} marks={marks} />)}
      </section>
    )
  } else if (searching) {
    body = (
      <section data-testid="results" aria-label={t.resultsLabel} className="flex flex-col gap-2">
        {results.length === 0 ? (
          <p data-testid="no-results" className="text-sm text-muted-foreground">{t.noResults}</p>
        ) : (
          results.map((x) => (
            <button key={x.id} type="button" data-testid="result" onClick={() => setOpen(x.id)} className="flex min-h-11 flex-col items-start gap-1 rounded-lg border border-border bg-card p-3 text-left">
              <span className="text-xs text-muted-foreground">{t.sections[x.section]}</span>
              <span className="text-base">{x.title}</span>
              <span className="text-xs text-muted-foreground">{t.readTime(readMinutes(x))}</span>
            </button>
          ))
        )}
      </section>
    )
  } else {
    body = (
      <div className="flex flex-col gap-5">
        <div role="group" aria-label={t.categories} className="flex flex-wrap gap-2">
          {(["all", ...SECTION_ORDER] as const).map((s) => (
            <button key={s} type="button" data-testid={`cat-${s}`} aria-pressed={section === s} onClick={() => setSection(s)} className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${section === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
              {s === "all" ? t.all : t.sections[s]}
            </button>
          ))}
        </div>
        {shownSections.map((s) => {
          const list = built[s]
          const facts = list ?? []
          const ideas = facts.filter((x) => x.idea)
          const rest = facts.filter((x) => !x.idea)
          return (
            <section key={s} data-testid={`section-${s}`} className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">{t.sections[s]}</h2>
              {!list ? (
                <ContentComing />
              ) : s === "true" ? (
                <Carousel items={list} marks={marks} />
              ) : (
                <>
                  {rest.map((x) => <ItemCard key={x.id} item={x} marks={marks} />)}
                  {s === "expect" && built.expectNote && <p data-testid="expect-note" className="text-sm text-muted-foreground">{built.expectNote}</p>}
                  {ideas.length > 0 && (
                    <div data-testid={`ideas-${s}`} className="flex flex-col gap-3">
                      <h3 className="text-base font-semibold">{t.ideas}</h3>
                      <p className="text-sm text-muted-foreground">{t.ideasNote}</p>
                      {ideas.map((x) => <ItemCard key={x.id} item={x} marks={marks} />)}
                    </div>
                  )}
                </>
              )}
            </section>
          )
        })}
      </div>
    )
  }

  return (
    <div data-testid="library-best" className="flex flex-col gap-4">
      <Switcher value={id} onChange={(next) => { setChosen(next); setOpen(null); setQuery("") }} />
      <Tabs id="lib-tab" items={t.tabs} value={tab} onChange={(i) => { setTab(i); setOpen(null) }} />
      {tab === 0 && !openItem && (
        <div className="flex items-center gap-2">
          <input
            type="search"
            data-testid="search"
            aria-label={t.searchLabel}
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-card px-3 text-base"
          />
          {query && (
            <button type="button" data-testid="search-clear" aria-label={t.searchClear} onClick={() => setQuery("")} className="inline-flex size-11 items-center justify-center rounded-full border border-border">
              {"×"}
            </button>
          )}
        </div>
      )}
      {body}
    </div>
  )
}
