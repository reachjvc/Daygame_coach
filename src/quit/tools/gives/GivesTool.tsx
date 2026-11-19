"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { EvidenceChip, OneQuestion, PrimaryButton, SourcesFold } from "../../components/kit"
import { isLiveTool } from "../../menu"
import { useQuitStore } from "../../store"
import { fill, tooltext as t } from "../../tooltext"
import type { QuitBelief, QuitNeed, QuitSwap, ToolProps } from "../../types"
import { localDate, realRefs, uniqueRefs, usable } from "../common"
import { parseBeliefs, topBeliefs } from "../beliefs/logic"
import { useCarry, useDoneCount, useScreens, useStartCount, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import { SwapBasis } from "./SwapBasis"
import {
  EMPTY_GIVES,
  MAX_NEEDS,
  MAX_OWN_PER_NEED,
  MAX_TEXT,
  OWN,
  RATINGS,
  addOwn,
  addTried,
  cap,
  cleanNeeds,
  firstScreen,
  isDuplicateOwn,
  ALSO,
  isEightyPercent,
  listGroups,
  type ListItem,
  orderSwaps,
  parseGives,
  preselectNeeds,
  quotesFor,
  rate,
  ratingGoogleUrl,
  ratingIcs,
  ratingIndex,
  removeOwn,
  removeTried,
  tidy,
  type GivesState,
} from "./logic"

const fmt = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

/** What it gives you: name 1 to 3 needs, add swaps for each, then rate how close each came. */
export function GivesTool({ addiction, data }: ToolProps) {
  const needs = usable<QuitNeed[]>(data.needs)
  const beliefs = usable<QuitBelief[]>(data.beliefs)
  if (!needs || needs.length === 0) return <NotReady />
  return <Inner addiction={addiction} needs={needs} beliefs={beliefs ?? []} />
}

function Inner({ addiction, needs, beliefs }: { addiction: string; needs: QuitNeed[]; beliefs: QuitBelief[] }) {
  const store = useQuitStore()
  const carry = useCarry()
  const { state, update, clear } = useToolState<GivesState>(addiction, "gives", EMPTY_GIVES, parseGives)
  const known = useMemo(() => needs.map((n) => n.id as string), [needs])

  // The need a link points to travels in the address after the #, which the browser never sends to the server.
  // An old link with ?need= is read once and its address rewritten to the # form.
  const [linkNeed, setLinkNeed] = useState<string | null>(null)
  useEffect(() => {
    const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("need")
    const url = new URL(window.location.href)
    const fromQuery = url.searchParams.get("need")
    const need = fromHash ?? fromQuery
    if (fromQuery !== null) {
      url.searchParams.delete("need")
      window.history.replaceState(null, "", `${url.pathname}${url.search}${need ? `#need=${encodeURIComponent(need)}` : ""}`)
    }
    setLinkNeed(need)
  }, [])

  const ratings = useMemo(() => parseBeliefs(store.get(addiction, "beliefs")).ratings, [store, addiction])
  // The needs picked so far; before any choice, the preselection.
  const pre = useMemo(() => {
    const topNeeds = topBeliefs(ratings, beliefs)
      .map((b) => usable<string>(b.need))
      .filter((n): n is string => n !== null)
    return preselectNeeds(linkNeed, topNeeds, known)
  }, [ratings, beliefs, known, linkNeed])

  const picked = state ? cleanNeeds(state.picked ?? pre, known) : []
  // A link with a need starts the pick again from that need.
  const appliedNeed = useRef<string | null>(null)
  useEffect(() => {
    if (!state || !linkNeed || appliedNeed.current === linkNeed) return
    appliedNeed.current = linkNeed
    const fromLink = cleanNeeds(linkNeed.split(",").filter((x) => x !== OWN), known)
    if (fromLink.length > 0) update((s) => ({ ...s, picked: fromLink, done: 0 }))
  }, [state, linkNeed, known, update])

  const total = 1 + picked.length
  const first = state ? firstScreen(state, picked) : 1
  const { screen, go, back: goBack, reset, isResult } = useScreens(first, total, state !== null)
  const started = useStartCount(addiction, "gives")
  useDoneCount(addiction, "gives", state !== null && isResult)

  // A tap within 250 ms of a screen move is ignored, and a button only moves from the screen it was drawn on.
  const lastMove = useRef(0)
  const shownScreen = useRef(screen)
  useEffect(() => {
    shownScreen.current = screen
  }, [screen])
  const move = (drawn: number, fn: () => void) => {
    const now = Date.now()
    if (now - lastMove.current < 250 || shownScreen.current !== drawn) return
    lastMove.current = now
    fn()
  }

  if (!state) return null
  const back = screen > 1 ? goBack : null
  const today = localDate()
  const needName = (id: string) => (id === OWN ? cap(state.ownNeed ?? t.gives.otherName) : (needs.find((n) => n.id === id)?.name ?? id))

  if (screen === 1) {
    return (
      <>
        <PickScreen
          needs={needs}
          picked={picked}
          ownNeed={state.ownNeed}
          total={total}
          onPick={(next) => {
            started()
            update((s) => ({ ...s, picked: next }))
          }}
          onOwnNeed={(text) => update((s) => ({ ...s, ownNeed: text.slice(0, MAX_TEXT) }))}
          onContinue={() =>
            move(1, () => {
              // The pick screen gets its own address, so browser Back lands on it and not on the furthest screen.
              const u = new URL(window.location.href)
              if (u.searchParams.get("s") === null) {
                u.searchParams.set("s", "1")
                window.history.replaceState(null, "", `${u.pathname}${u.search}${u.hash}`)
              }
              update((s) => ({ ...s, picked, ownNeed: s.ownNeed ? tidy(s.ownNeed) : s.ownNeed, done: Math.max(s.done, 1) }))
              go(2)
            })
          }
        />
        <SourcesFold refs={[]} />
      </>
    )
  }

  if (!isResult) {
    const id = picked[screen - 2]
    if (!id) return null
    const isOwn = id === OWN
    const need = isOwn ? null : needs.find((n) => n.id === id)
    if (!isOwn && !need) return null
    const { lines, people } = need ? quotesFor(beliefs, need.id, ratings) : { lines: [], people: false }
    const swaps = need ? orderSwaps(need.swaps, state.rated) : []
    const own = state.own[id] ?? []
    const last = screen === total
    return (
      <>
        <OneQuestion step={screen} total={total} onBack={back}>
          <header>
            <h2 data-testid="need-heading" className="break-words text-xl font-semibold">
              {needName(id)}
            </h2>
            {need?.line && <p className="text-sm text-muted-foreground">{need.line}</p>}
          </header>
          {lines.length > 0 && (
            <section data-testid="quotes">
              <h3 className="text-sm text-muted-foreground">{people ? t.gives.quotesPeople : t.gives.quotesHeading}</h3>
              <ul className="mt-1 flex flex-col gap-1">
                {lines.map((q) => (
                  <li key={q} className="break-words text-base italic">{`“${q}”`}</li>
                ))}
              </ul>
            </section>
          )}
          {swaps.length > 0 && (
            <section>
              <ul className="flex flex-col gap-3">
                {swaps.map((s) => (
                  <SwapCard
                    key={s.id}
                    swap={s}
                    onList={state.tried[s.id] !== undefined}
                    onToggle={() => {
                      started()
                      update((st) => (st.tried[s.id] ? removeTried(st, s.id) : addTried(st, s.id, today)))
                    }}
                  />
                ))}
              </ul>
            </section>
          )}
          <OwnSwaps
            need={id}
            list={own}
            onAdd={(text) => update((s) => addOwn(s, id, text, today, Date.now()))}
            onRemove={(sid) => update((s) => removeOwn(s, id, sid))}
          />
          <PrimaryButton
            testId="gives-next"
            onClick={() =>
              move(screen, () => {
                update((s) => ({ ...s, done: Math.max(s.done, screen) }))
                go(screen + 1)
              })
            }
          >
            {last ? t.gives.finish : t.gives.nextNeed}
          </PrimaryButton>
        </OneQuestion>
        <SourcesFold refs={uniqueRefs(swaps.flatMap((s) => realRefs(s.refs)))} />
      </>
    )
  }

  return (
    <ResultScreen
      addiction={addiction}
      state={state}
      picked={picked}
      needs={needs}
      needName={needName}
      today={today}
      carry={carry}
      onRate={(sid, value) => update((s) => ({ ...s, rated: rate(s.rated, sid, value) }))}
      onRemove={(it) => update((s) => (it.kind === "own" ? removeOwn(s, it.need, it.id) : removeTried(s, it.id)))}
      onGo={(id) => move(screen, () => go(picked.indexOf(id) + 2))}
      onChange={() => move(screen, () => go(1))}
      onStartAgain={() => {
        clear()
        reset()
      }}
    />
  )
}

/* ---------- screen 1 ---------- */

function PickScreen(props: {
  needs: QuitNeed[]
  picked: string[]
  ownNeed: string | null
  total: number
  onPick: (next: string[]) => void
  onOwnNeed: (text: string) => void
  onContinue: () => void
}) {
  const { needs, picked, ownNeed, total } = props
  const full = picked.length >= MAX_NEEDS
  const ownPicked = picked.includes(OWN)
  const toggle = (id: string) => {
    if (picked.includes(id)) props.onPick(picked.filter((x) => x !== id))
    else if (!full) props.onPick([...picked, id])
  }
  const cards: { id: string; name: string; line: string }[] = [
    ...needs.map((n) => ({ id: n.id as string, name: n.name, line: n.line ?? "" })),
    { id: OWN, name: t.gives.otherName, line: t.gives.otherLine },
  ]
  const needsText = ownPicked && tidy(ownNeed ?? "") === ""
  return (
    <OneQuestion step={1} total={total} onBack={null}>
      <p className="font-medium">{t.gives.pickQuestion}</p>
      <div role="group" aria-label={t.gives.pickQuestion} className="flex flex-col gap-2">
        {cards.map((c) => {
          const on = picked.includes(c.id)
          const locked = !on && full
          return (
            <button
              key={c.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-disabled={locked}
              disabled={locked}
              data-testid={`need-${c.id}`}
              onClick={() => toggle(c.id)}
              className={`flex min-h-16 w-full items-center gap-3 rounded-lg border p-3 text-left disabled:opacity-50 ${on ? "border-primary bg-primary/10" : "border-border bg-card"}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{c.name}</span>
                <span className="block text-sm text-muted-foreground">{c.line}</span>
              </span>
              <span aria-hidden="true" className={`size-5 shrink-0 rounded-md border-2 ${on ? "border-primary bg-primary" : "border-border"}`} />
            </button>
          )
        })}
      </div>
      {ownPicked && (
        <label className="flex flex-col gap-1 text-sm">
          <span>{t.gives.otherLabel}</span>
          <input
            data-testid="own-need"
            type="text"
            value={ownNeed ?? ""}
            maxLength={MAX_TEXT}
            onChange={(e) => props.onOwnNeed(e.target.value)}
            className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-base"
          />
        </label>
      )}
      {needsText && (
        <p data-testid="own-need-hint" className="text-sm text-muted-foreground">
          {t.gives.ownNeedHint}
        </p>
      )}
      {full && <p data-testid="pick-max" className="text-sm text-muted-foreground">{t.gives.pickMax}</p>}
      <PrimaryButton testId="gives-continue" disabled={picked.length === 0 || needsText} onClick={props.onContinue}>
        {t.common.continue}
      </PrimaryButton>
    </OneQuestion>
  )
}

/* ---------- screen 2 ---------- */

function SwapCard({ swap, onList, onToggle }: { swap: QuitSwap; onList: boolean; onToggle: () => void }) {
  return (
    <li data-testid="swap" data-swap={swap.id} className="rounded-lg border border-border bg-card p-3">
      <p className="text-base">{swap.text}</p>
      <div className="mt-1">
        <EvidenceChip evidence={swap.evidence} />
      </div>
      <SwapBasis swap={swap} />
      <button
        type="button"
        data-testid="toggle-swap"
        aria-pressed={onList}
        onClick={onToggle}
        className={`mt-2 inline-flex min-h-11 items-center rounded-md border px-3 ${onList ? "border-primary bg-primary/10 text-foreground" : "border-primary text-primary"}`}
      >
        {onList ? t.gives.onList : t.gives.add}
      </button>
    </li>
  )
}

function OwnSwaps({ need, list, onAdd, onRemove }: { need: string; list: { id: string; text: string }[]; onAdd: (text: string) => void; onRemove: (id: string) => void }) {
  const [text, setText] = useState("")
  const full = list.length >= MAX_OWN_PER_NEED
  const [dup, setDup] = useState(false)
  const submit = () => {
    if (tidy(text) === "" || full) return
    if (isDuplicateOwn(list, text)) {
      setDup(true)
      return
    }
    onAdd(text)
    setText("")
  }
  return (
    <section data-testid="own-swaps" className="flex flex-col gap-2">
      {list.length > 0 && <h3 className="text-sm text-muted-foreground">{t.gives.ownHeading}</h3>}
      {list.length > 0 && (
        <ul className="flex flex-col gap-2">
          {list.map((o) => (
            <li key={o.id} data-testid="own-swap" className="flex items-center gap-2 rounded-lg border border-primary bg-primary/10 p-3">
              <span className="min-w-0 flex-1 break-words">{o.text}</span>
              <button type="button" data-testid="own-remove" aria-label={`${t.gives.ownRemove}: ${o.text}`} onClick={() => onRemove(o.id)} className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm underline">
                {t.gives.ownRemove}
              </button>
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p className="text-sm text-muted-foreground">{t.gives.ownFull}</p>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <label htmlFor={`own-${need}`} className="text-sm">
            {t.gives.ownLabel}
          </label>
          <div className="flex gap-2">
            <input
              id={`own-${need}`}
              data-testid="own-input"
              type="text"
              value={text}
              maxLength={MAX_TEXT}
              onChange={(e) => {
                setText(e.target.value)
                setDup(false)
              }}
              className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-base"
            />
            <button type="submit" data-testid="own-add" disabled={tidy(text) === ""} className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-primary px-4 text-primary disabled:opacity-40">
              {t.gives.ownAdd}
            </button>
          </div>
          {dup && (
            <p data-testid="own-dup" className="text-sm text-muted-foreground">
              {t.gives.ownDuplicate}
            </p>
          )}
        </form>
      )}
    </section>
  )
}

/* ---------- result ---------- */

function ResultScreen(props: {
  addiction: string
  state: GivesState
  picked: string[]
  needs: QuitNeed[]
  needName: (id: string) => string
  today: string
  carry: (path: string) => string
  onRate: (swapId: string, value: number) => void
  onRemove: (item: ListItem) => void
  onGo: (needId: string) => void
  onChange: () => void
  onStartAgain: () => void
}) {
  const { addiction, state, picked, needs, today, carry } = props
  const [asking, setAsking] = useState(false)
  const [origin, setOrigin] = useState("")
  useEffect(() => setOrigin(window.location.origin), [])
  const address = `${origin}/quit/${addiction}/gives`

  // The order is worked out once, when the result shows, so a card does not jump when it is rated.
  const [order] = useState(() => listGroups(state, picked, needs).map((g) => g.items.map((i) => i.id)))
  const live = listGroups(state, picked, needs)
  const rank = new Map(order.flat().map((id, i) => [id, i]))
  const groups = live.map((g) => ({ ...g, items: [...g.items].sort((a, b) => (rank.get(a.id) ?? 1e6) - (rank.get(b.id) ?? 1e6)) }))
  const total = groups.reduce((n, g) => n + g.items.length, 0)
  const allRefs = uniqueRefs(picked.flatMap((id) => (needs.find((n) => n.id === id)?.swaps ?? []).filter((s) => state.tried[s.id]).flatMap((s) => realRefs(s.refs))))

  const download = () => {
    const blob = new Blob([ratingIcs(today, new Date(), address)], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = t.gives.icsFile
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const linkClass = "inline-flex min-h-11 items-center rounded-md border border-border bg-card px-4 text-sm"
  const card = (it: ListItem, removable: boolean) => {
    const sel = ratingIndex(state.rated[it.id])
    return (
      <li key={it.id} data-testid="listed" data-swap={it.id} className="rounded-lg border border-border bg-card p-3">
        <p className="break-words text-base">{it.text}</p>
        {it.since < today && <p className="text-sm text-muted-foreground">{fill(t.gives.since, { day: fmt(it.since) })}</p>}
        <div role="radiogroup" aria-label={t.gives.rateQuestion} className="mt-2 grid grid-cols-5 gap-1">
          {RATINGS.map((r, i) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={sel === i}
              data-testid={`rate-${r.value}`}
              onClick={() => props.onRate(it.id, r.value)}
              className={`inline-flex min-h-11 items-center justify-center rounded-md border px-1 text-center text-sm leading-tight ${sel === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {isEightyPercent(state.rated[it.id]) && (
          <p data-testid="mark-80" className="mt-2 inline-flex rounded-full border border-primary px-2.5 py-0.5 text-xs font-medium text-primary">
            {t.gives.mark80}
          </p>
        )}
        {sel !== null && sel <= 1 && !removable && (
          <p className="mt-1">
            <button type="button" data-testid="try-another" onClick={() => props.onGo(it.need === "own" ? OWN : it.need)} className="inline-flex min-h-11 items-center text-sm text-primary underline">
              {t.gives.another}
            </button>
          </p>
        )}
        {removable && (
          <p className="mt-1">
            <button type="button" data-testid="listed-remove" onClick={() => props.onRemove(it)} className="inline-flex min-h-11 items-center text-sm underline">
              {t.gives.ownRemove}
            </button>
          </p>
        )}
      </li>
    )
  }

  const outlineButton = "inline-flex min-h-11 items-center justify-center rounded-md border border-primary px-4 text-sm font-medium text-primary"
  return (
    <div data-testid="result" className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold">{t.gives.resultHeading}</h2>
      {total > 0 && <p data-testid="rate-question" className="text-sm">{t.gives.rateQuestion}</p>}
      {groups.map((g) => {
        const isAlso = g.id === ALSO
        if (isAlso && g.items.length === 0) return null
        return (
          <section key={g.id} data-testid={isAlso ? "result-also" : "result-need"} data-need={g.id} className="flex flex-col gap-2">
            <h3 className="break-words text-sm font-semibold text-muted-foreground">{isAlso ? t.gives.alsoHeading : props.needName(g.id)}</h3>
            {g.items.length === 0 ? (
              <div data-testid="need-empty" className="flex flex-col items-start gap-2 text-sm">
                <p>{fill(t.gives.emptyNeed, { need: props.needName(g.id) })}</p>
                <button type="button" data-testid="empty-link" onClick={() => props.onGo(g.id)} className={outlineButton}>
                  {t.gives.emptyLink}
                </button>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">{g.items.map((it) => card(it, isAlso))}</ul>
            )}
          </section>
        )
      })}

      {total > 0 && (
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t.gives.remindTitle}</h3>
        <div className="flex flex-wrap gap-2">
          <a data-testid="remind-google" href={ratingGoogleUrl(today, address)} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {t.gives.remindGoogle}
          </a>
          <button type="button" data-testid="remind-ics" onClick={download} className={linkClass}>
            {t.gives.remindIcs}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{t.gives.remindNote}</p>
      </section>
      )}

      {(isLiveTool("sos") || isLiveTool("date")) && (
        <section className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">{t.gives.nextHeading}</h3>
          {isLiveTool("sos") && (
            <Link data-testid="next-sos" href={carry(`/quit/${addiction}/sos`)} className="flex min-h-12 flex-col justify-center rounded-lg border border-border bg-card px-3 py-2">
              <span className="font-medium">{t.gives.nextSos}</span>
              <span className="text-sm text-muted-foreground">{t.gives.nextSosLine}</span>
            </Link>
          )}
          {isLiveTool("date") && (
            <Link data-testid="next-date" href={carry(`/quit/${addiction}/date`)} className="flex min-h-12 flex-col justify-center rounded-lg border border-border bg-card px-3 py-2">
              <span className="font-medium">{t.gives.nextDate}</span>
              <span className="text-sm text-muted-foreground">{t.gives.nextDateLine}</span>
            </Link>
          )}
        </section>
      )}

      <div className="flex flex-col gap-2">
        <button type="button" data-testid="change-needs" onClick={props.onChange} className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-primary px-4 font-medium text-primary">
          {t.gives.change}
        </button>
        <Link data-testid="to-menu" href={carry(`/quit/${addiction}`)} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground">
          {t.gives.toMenu}
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {asking ? (
          <div data-testid="start-again-ask" className="rounded-md border border-border bg-card p-3 text-sm">
            <p>{t.gives.startAgainAsk}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" data-testid="start-again-clear" onClick={props.onStartAgain} className="inline-flex min-h-11 items-center rounded-md border border-border px-4">
                {t.gives.clear}
              </button>
              <button type="button" data-testid="start-again-keep" onClick={() => setAsking(false)} className="inline-flex min-h-11 items-center rounded-md border border-primary px-4 text-primary">
                {t.gives.keep}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" data-testid="start-again" onClick={() => setAsking(true)} className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline">
            {t.gives.startAgain}
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t.gives.kept}</p>
      <SourcesFold refs={allRefs} />
    </div>
  )
}
