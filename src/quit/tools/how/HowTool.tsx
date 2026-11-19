"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
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
  const tag = checkedTag(n)
  const id = `basis-${n.kind}-${n.big.replace(/\W+/g, "")}`
  return (
    <article data-testid={`number-${n.kind}`} className="rounded-lg border border-border bg-card px-4 pb-1 pt-3">
      <Figure n={n} hero={hero} />
      <CountedLine text={n.counted} />
      <button
        type="button"
        data-testid="details"
        aria-expanded={open}
        aria-controls={id}
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
                <dd className="break-words">{n.basis[k]}</dd>
              </div>
            ))}
            {n.caveat && (
              <div>
                <dt className="text-muted-foreground">{t.common.basis.caveat}</dt>
                <dd className="break-words">{n.caveat}</dd>
              </div>
            )}
          </dl>
          <SourceTap refs={[n.ref, ...(n.alsoRef ?? [])]} />
        </div>
      )}
    </article>
  )
}

/** "True or not?": he guesses, then sees the answer, why, who was counted and the source. Nothing is saved. */
function FactCard({ f }: { f: QuitFact }) {
  const [guess, setGuess] = useState<boolean | null>(null)
  const refs = realRefs(f.refs)
  const btn = "inline-flex min-h-11 flex-1 items-center justify-center rounded-md border px-4 text-sm font-medium"
  return (
    <article data-testid={`fact-${f.id}`} className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.how.trueOrNot}</p>
      <p className="mt-1 text-base font-medium leading-snug">{f.statement}</p>
      {guess === null ? (
        <div className="mt-3 flex gap-2">
          <button type="button" data-testid="guess-true" onClick={() => setGuess(true)} className={`${btn} border-border`}>
            {t.how.guessTrue}
          </button>
          <button type="button" data-testid="guess-false" onClick={() => setGuess(false)} className={`${btn} border-border`}>
            {t.how.guessFalse}
          </button>
        </div>
      ) : (
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
    </article>
  )
}

/** One outside service: its line, then "Open the site" and "Source" side by side; the source opens full width below. */
function OutsideRow({ b }: { b: QuitBesides }) {
  const [open, setOpen] = useState(false)
  const refs = realRefs(b.refs)
  return (
    <li data-testid={`outside-${b.id}`} className="rounded-lg border border-border bg-card px-4 pb-1 pt-3">
      <p className="text-base">{b.text}</p>
      <div className="flex flex-wrap gap-x-6">
        {b.link && (
          <a href={b.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-primary underline">
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
          {refs.map((r, i) => (
            <li key={`${r.url}-${i}`}>
              <p>{r.cite}</p>
              {r.quote && <p className="mt-1 italic text-muted-foreground">{`“${r.quote}”`}</p>}
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
  const endRef = useRef<HTMLDivElement>(null)

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
  const all = uniqueRefs([
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
                <p data-testid="sos-line" className="text-sm">
                  {t.how.cravingLine}{" "}
                  <Link href={carry(`/quit/${addiction}/sos`)} className="inline-flex min-h-11 items-center text-primary underline">
                    {t.how.cravingLink}
                  </Link>
                </p>
              )}
            </div>
          </section>
        ))}

        {outside.length > 0 && (
          <section id={SECTION_ID("outside")} data-testid="group-outside" className="scroll-mt-4">
            <h2 className="text-lg font-semibold">{t.how.outside}</h2>
            <ul className="mt-2 flex flex-col gap-3">
              {outside.map((b) => (
                <OutsideRow key={b.id} b={b} />
              ))}
            </ul>
          </section>
        )}

        <div ref={endRef} className="flex flex-col gap-4">
          {feelTool && feelId && (
            <p data-testid="feel-line" className="text-sm">
              {t.how.feelLine}{" "}
              <Link href={carry(`/quit/${addiction}/${feelId}`)} className="text-primary underline">
                {toolName(feelTool, addiction)}
              </Link>
            </p>
          )}
          {note && (
            <div data-testid="footer-note" className="rounded-lg border border-border p-4">
              <p className="text-sm">{note.text}</p>
              <SourceTap refs={noteRefs} />
            </div>
          )}
        </div>
      </div>
      <SourcesFold refs={all} />
    </>
  )
}
