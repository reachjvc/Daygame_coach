"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, Phone, X } from "lucide-react"
import { count } from "../../count"
import { CountedLine, SourceTap, SourcesFold } from "../../components/kit"
import { findMenuTool, isLiveTool, toolName } from "../../menu"
import { fill, tooltext as t } from "../../tooltext"
import type { QuitBesides, QuitFact, QuitNumber, QuitRef, ToolProps } from "../../types"
import { checkedTag, realRefs, uniqueRefs, usable } from "../common"
import { useCarry } from "../hooks"
import { NotReady } from "../NotReady"
import { buildSections, headlineAfterBig, outsideHelp, type HowSection } from "./logic"

const BASIS_KEYS = ["design", "who", "n", "where", "when", "measured"] as const
const capital = (x: string) => (x ? x[0].toUpperCase() + x.slice(1) : x)
/** Tool 6 ("What you'll feel, and when"): the first of these ids that is live is linked; none live, no line. */
const FEEL_TOOL_IDS = ["timeline", "symptoms"] as const

function Figure({ n, hero }: { n: QuitNumber; hero?: boolean }) {
  return (
    <>
      <p className={`${hero ? "text-4xl sm:text-5xl" : "text-3xl"} font-semibold leading-tight text-primary`}>{n.big}</p>
      <p data-testid="headline" className={`mt-1 ${hero ? "text-lg" : "text-base"} leading-snug`}>
        {headlineAfterBig(n.headline, n.big)}
      </p>
    </>
  )
}

/** One checked number, closed: figure, headline, who was counted, Details (tags, basis, caveat, source). */
function NumberRow({ n, hero = false }: { n: QuitNumber; hero?: boolean }) {
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const tag = checkedTag(n)
  /** "Hide details" at the foot: close, then bring the card's Details button back into view with focus on it. */
  const hide = () => {
    setOpen(false)
    requestAnimationFrame(() => {
      toggle.current?.focus({ preventScroll: true })
      toggle.current?.scrollIntoView({ block: "nearest" })
    })
  }
  const id = `basis-${n.kind}-${n.big.replace(/\W+/g, "")}`
  return (
    <article data-testid={`number-${n.kind}`} className="rounded-lg border border-border bg-card px-4 pb-1 pt-3">
      <Figure n={n} hero={hero} />
      <CountedLine text={n.counted} />
      <button
        type="button"
        ref={toggle}
        data-testid="details"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary"
      >
        {t.how.details}
        <ChevronDown aria-hidden className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={id} data-testid="basis" className="flex flex-col gap-2 pb-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <span data-testid="tag-checked" className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">
              {t.tags[tag]}
            </span>
            {n.projection && <span className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{t.chips.projection}</span>}
            {n.pooled && <span className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{t.chips.pooled}</span>}
          </div>
          {n.weak && <p className="text-muted-foreground">{n.weak}</p>}
          <dl className="flex flex-col gap-2">
            {BASIS_KEYS.map((k) => (
              <div key={k}>
                <dt className="text-muted-foreground">{t.common.basis[k]}</dt>
                <dd className="break-words">{capital(n.basis[k])}</dd>
              </div>
            ))}
            {n.caveat && (
              <div>
                <dt className="text-muted-foreground">{t.common.basis.caveat}</dt>
                <dd className="break-words">{capital(n.caveat)}</dd>
              </div>
            )}
          </dl>
          <SourceTap refs={[n.ref, ...(n.alsoRef ?? [])]} />
          <button
            type="button"
            data-testid="hide-details"
            aria-controls={id}
            onClick={hide}
            className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-primary"
          >
            {t.how.hideDetails}
            <ChevronDown aria-hidden className="size-4 rotate-180" />
          </button>
        </div>
      )}
    </article>
  )
}

/** "True or not?": he guesses, then sees which was right, why, who was counted and the source. Nothing is saved. */
function FactCard({ f }: { f: QuitFact }) {
  const [guess, setGuess] = useState<boolean | null>(null)
  const refs = realRefs(f.refs)
  const choice = (value: boolean) => {
    const picked = guess === value
    const correct = guess !== null && f.answer === value
    // once answered, the right answer stands out (thick accent border, tick); a wrong pick is thin and dashed with a cross
    const tone =
      guess === null
        ? "border-border"
        : correct
          ? "border-2 border-primary text-primary"
          : picked
            ? "border-dashed border-foreground"
            : "border-border opacity-60"
    return (
      <button
        type="button"
        data-testid={value ? "guess-true" : "guess-false"}
        aria-pressed={picked}
        onClick={() => setGuess(value)}
        className={`inline-flex min-h-11 min-w-32 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 text-center text-sm font-medium ${tone}`}
      >
        {guess !== null && correct && <Check aria-hidden className="size-4" />}
        {guess !== null && picked && !correct && <X aria-hidden className="size-4" />}
        {value ? t.how.guessTrue : t.how.guessFalse}
      </button>
    )
  }
  return (
    <article data-testid={`fact-${f.id}`} className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase text-primary">{t.how.trueOrNot}</p>
      <p className="mt-1 text-base font-medium leading-snug">{f.statement}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {choice(true)}
        {choice(false)}
      </div>
      <div aria-live="polite">
        {guess !== null && (
          <div data-testid="answer" className="mt-3">
            <p className="text-base font-semibold">
              {guess === f.answer ? t.how.right : t.how.notQuite}{" "}
              {fill(t.how.answerIs, { answer: f.answer ? t.how.guessTrue : t.how.guessFalse })}
            </p>
            <p className="mt-1 text-base">{f.explain}</p>
            <CountedLine text={f.counted} />
            <SourceTap refs={refs} />
          </div>
        )}
      </div>
    </article>
  )
}

/** One outside service: its line, then "Open the site" and "Source" side by side; the source opens full width below. */
function OutsideRow({ b }: { b: QuitBesides }) {
  const [open, setOpen] = useState(false)
  const refs = sourcesByAddress(realRefs(b.refs))
  const textId = `outside-text-${b.id}`
  return (
    <li data-testid={`outside-${b.id}`} className="rounded-lg border border-border bg-card px-4 pb-1 pt-3">
      <p id={textId} className="text-base">
        {b.text}
      </p>
      <div className="flex flex-wrap items-center gap-x-6">
        {b.tel && (
          <a href={`tel:${b.tel}`} data-testid="call" aria-describedby={textId} className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            <Phone aria-hidden className="size-4" />
            {t.how.call}
          </a>
        )}
        {b.link && (
          <a href={b.link} target="_blank" rel="noopener noreferrer" aria-describedby={textId} className="inline-flex min-h-11 items-center text-sm text-primary underline">
            {t.how.openSite}
          </a>
        )}
        {refs.length > 0 && (
          <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex min-h-11 items-center text-sm text-primary underline">
            {open ? t.common.hideSource : t.common.source}
          </button>
        )}
      </div>
      {open && (
        <ul className="mb-3 flex flex-col gap-3 rounded-md border border-border p-3 text-sm">
          {refs.map((r) => (
            <li key={r.url || r.cite}>
              <p>{r.cite}</p>
              {r.quotes.map((q) => (
                <p key={q} className="mt-1 italic text-muted-foreground">{`“${q}”`}</p>
              ))}
              {r.url && (
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center break-all text-primary underline">
                  {t.common.openSource}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** Refs to one address shown once, with all their quotes. */
function sourcesByAddress(refs: QuitRef[]): { cite: string; url?: string; quotes: string[] }[] {
  const out: { cite: string; url?: string; quotes: string[] }[] = []
  for (const r of refs) {
    const key = r.url || r.cite
    const hit = out.find((x) => (x.url || x.cite) === key)
    if (hit) {
      if (r.quote && !hit.quotes.includes(r.quote)) hit.quotes.push(r.quote)
    } else out.push({ cite: r.cite, url: r.url, quotes: r.quote ? [r.quote] : [] })
  }
  return out
}

/** The page's Sources list: one entry per address (two cites of one paper show once). */
function onePerUrl(refs: QuitRef[]): QuitRef[] {
  const seen = new Set<string>()
  return uniqueRefs(refs).filter((r) => {
    const key = r.url || r.cite
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const SECTION_ID = (s: string) => `how-${s}`

function jump(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
}

/** How people quit: checked numbers, three true-or-not facts, free outside help. Asks nothing, saves nothing. */
export function HowTool({ addiction, data }: ToolProps) {
  const carry = useCarry()
  const numbers = usable<QuitNumber[]>(data.numbers)
  const hope = usable<QuitNumber>(data.hope)
  const facts = (usable<QuitFact[]>(data.facts) ?? []).filter((f) => realRefs(f.refs).length > 0)
  const outside = outsideHelp(usable<QuitBesides[]>(data.besides) ?? []).filter((b) => realRefs(b.refs).length > 0)
  const note = data.footerNote && typeof data.footerNote === "object" ? data.footerNote : null
  const endRef = useRef<HTMLElement>(null)

  useEffect(() => {
    count(addiction, "how", "start")
  }, [addiction])
  useEffect(() => {
    const el = endRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    let sent = false
    const io = new IntersectionObserver((entries) => {
      if (!sent && entries.some((e) => e.isIntersecting)) {
        sent = true
        count(addiction, "how", "done")
        io.disconnect()
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [addiction])

  if (!numbers || numbers.length === 0) return <NotReady />
  const sections = buildSections(numbers, hope, facts)
  const groupName = (s: HowSection) => t.how.groups[s]
  const noteRefs: QuitRef[] = note ? realRefs(note.refs) : []
  const all = onePerUrl([
    ...(hope ? [hope.ref, ...(hope.alsoRef ?? [])] : []),
    ...numbers.flatMap((n) => [n.ref, ...(n.alsoRef ?? [])]),
    ...facts.flatMap((f) => realRefs(f.refs)),
    ...outside.flatMap((b) => realRefs(b.refs)),
    ...noteRefs,
  ])
  const jumps = [
    ...sections.map((s) => ({ id: SECTION_ID(s.section), label: groupName(s.section), n: s.items.length })),
    ...(outside.length ? [{ id: SECTION_ID("outside"), label: t.how.outside, n: outside.length }] : []),
  ]
  const feelId = FEEL_TOOL_IDS.find((x) => isLiveTool(x) && findMenuTool(x))
  const feelTool = feelId ? findMenuTool(feelId) : null
  const sosLive = isLiveTool("sos")

  return (
    <>
      <div data-testid="how" className="flex flex-col gap-6">
        <p data-testid="intro" className="-mt-2 text-base text-muted-foreground">
          {t.how.intro}
        </p>
        {hope && (
          <div className="flex flex-col gap-2">
            <NumberRow n={hope} hero />
            <p data-testid="studies-line" className="text-sm text-muted-foreground">
              {t.how.studiesLine}
            </p>
          </div>
        )}

        <nav aria-label={t.how.onThisPage} data-testid="jumps">
          <h2 className="text-sm font-semibold text-muted-foreground">{t.how.onThisPage}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {jumps.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  data-testid={`jump-${j.id}`}
                  onClick={() => jump(j.id)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm"
                >
                  {j.label}
                  <span className="text-muted-foreground">{j.n}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {sections.map((s) => (
          <section key={s.section} id={SECTION_ID(s.section)} data-testid={`group-${s.section}`} className="scroll-mt-4">
            <h2 className="text-lg font-semibold">{groupName(s.section)}</h2>
            <div className="mt-2 flex flex-col gap-3">
              {s.items.map((it, i) =>
                it.type === "number" ? <NumberRow key={`${it.n.kind}-${i}`} n={it.n} /> : <FactCard key={it.f.id} f={it.f} />,
              )}
              {s.section === "helps" && sosLive && (
                <p className="text-sm">
                  {t.how.cravingLine}{" "}
                  <Link data-testid="sos-line" href={carry(`/quit/${addiction}/sos`)} className="inline-flex min-h-11 items-center text-primary underline">
                    {t.how.cravingTool}
                  </Link>{" "}
                  {t.how.cravingAfter}
                </p>
              )}
            </div>
          </section>
        ))}

        {outside.length > 0 && (
          <section ref={endRef} id={SECTION_ID("outside")} data-testid="group-outside" className="scroll-mt-4">
            <h2 className="text-lg font-semibold">{t.how.outside}</h2>
            <ul className="mt-2 flex flex-col gap-3">
              {outside.map((b) => (
                <OutsideRow key={b.id} b={b} />
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col gap-4">
          {feelTool && feelId && (
            <p data-testid="feel-line" className="text-sm">
              {t.how.feelLine}{" "}
              <Link href={carry(`/quit/${addiction}/${feelId}`)} className="text-primary underline">
                {toolName(feelTool, addiction)}
              </Link>
            </p>
          )}
          {note && (
            <div data-testid="footer-note" className="rounded-lg border border-border bg-card px-4 pb-1 pt-3">
              <h2 className="text-base font-semibold">{t.how.medicineTitle}</h2>
              <p className="mt-1 text-sm">{note.text}</p>
              <SourceTap refs={noteRefs} />
            </div>
          )}
        </div>
      </div>
      <SourcesFold refs={all} />
    </>
  )
}
