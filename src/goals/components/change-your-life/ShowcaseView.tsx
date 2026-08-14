"use client"

/**
 * The findings, written to be read aloud and filmed.
 *
 * This page can be the short. It gets scrolled on camera and the copy gets read
 * off it, so it is built against different constraints from the deep-dive tab.
 *
 *  - **It gives the method away.** An earlier draft spent its whole length
 *    saying nobody tells you what to do, and then did not tell you what to do.
 *    That shape refutes its own argument.
 *  - Varied sentence length. An earlier fix for "sounds like AI" cut every line
 *    short, which is just a different tell — nobody writes in uniform beats.
 *  - It ends on something doable, not on a list of product features that mean
 *    nothing to someone seeing them cold.
 *  - Few boxes. Type and space do the work, because a screen of bordered cards
 *    reads as a dashboard rather than as somebody talking.
 *  - No creator names and no attributed quotes. On camera those become callouts
 *    of specific people.
 *  - The CTA may only promise what the tool actually does today.
 */

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  CYL_AREAS,
  CYL_COUNT_FACTS,
  CYL_DURATIONS,
  CYL_DURATION_ANSWER,
  CYL_GENRE_WPM,
  CYL_LETTER,
  CYL_LOOP,
  CYL_LOOP_MISS,
  CYL_SHOWCASE,
  CYL_WORKS,
} from "@/src/goals/data/changeYourLife"

import { AreaMatrix, DotGrid, DurationChart, MethodLoop } from "./shared"

const P = Object.fromEntries(CYL_SHOWCASE.map((p) => [p.key, p]))
const MISSED_DAY = CYL_COUNT_FACTS.find((f) => f.filled === 1)!

function Block({
  k,
  children,
  first = false,
}: {
  k: string
  children?: React.ReactNode
  first?: boolean
}) {
  const p = P[k]
  return (
    <section className={first ? "pb-12" : "border-t border-border py-12 md:py-16"}>
      {p.eyebrow ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">{p.eyebrow}</p>
      ) : null}
      <h2
        data-spoken
        className={`${p.eyebrow ? "mt-3" : ""} max-w-3xl font-semibold leading-[1.08] tracking-tight text-foreground text-balance ${
          first ? "text-4xl md:text-6xl" : "text-3xl md:text-5xl"
        }`}
      >
        {p.headline}
      </h2>
      <p data-spoken className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
        {p.body}
      </p>
      {children ? <div className="mt-10">{children}</div> : null}
    </section>
  )
}

/** A numbered piece of the method. The number is a real sequence, not decoration. */
function Item({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-4 py-6 md:grid-cols-[3rem_1fr] md:gap-6">
      <span className="font-mono text-lg tabular-nums text-primary md:text-xl">{n}</span>
      <div>
        <h3 data-spoken className="text-xl font-semibold leading-snug text-foreground text-balance md:text-2xl">
          {title}
        </h3>
        <p data-spoken className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {body}
        </p>
      </div>
    </li>
  )
}

function mmss(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`
}

export function ShowcaseView() {
  const [frame, setFrame] = useState<"wide" | "vertical">("wide")
  const column = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState({ spoken: 0, onPage: 0 })

  // Measured from the DOM rather than tracked by hand, so it stays honest when
  // the copy changes. Only [data-spoken] counts toward the read time: the
  // matrix, the loop cards and the chart get shown while you talk over them,
  // and counting those made the estimate almost twice the real length.
  useEffect(() => {
    const root = column.current
    if (!root) return
    const words = (t: string) => t.split(/\s+/).filter(Boolean).length
    const spoken = [...root.querySelectorAll<HTMLElement>("[data-spoken]")].reduce(
      (n, el) => n + words(el.innerText),
      0,
    )
    setCount({ spoken, onPage: words(root.innerText) })
  }, [])

  return (
    <div>
      <div className="mb-8 flex items-center gap-2">
        {(
          [
            ["wide", "Desktop"],
            ["vertical", "9:16"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFrame(id)}
            className={`rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
              frame === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground">Scroll this on camera.</span>
        {count.spoken > 0 ? (
          <span
            className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground"
            title={`${count.spoken} spoken words of ${count.onPage} on the page. The rest is the matrix, the loop and the chart, which you show rather than read. This genre reads at 188 wpm median across the 91 videos; the fast end runs 240+.`}
          >
            {mmss((count.spoken / CYL_GENRE_WPM.median) * 60)} spoken ·{" "}
            {mmss((count.spoken / CYL_GENRE_WPM.p90) * 60)} fast · {count.spoken}/{count.onPage}w
          </span>
        ) : null}
      </div>

      <div
        ref={column}
        className={`${frame === "vertical" ? "max-w-[560px]" : "max-w-4xl"} transition-[max-width] duration-300`}
      >
        <Block k="already-know" first>
          <figure>
            <blockquote
              data-spoken
              className="border-l-2 border-primary pl-5 text-2xl font-medium leading-snug text-foreground text-balance md:text-3xl"
            >
              “Stop watching these videos. You already know what to do.”
            </blockquote>
            <figcaption data-spoken className="mt-4 pl-5 text-sm text-muted-foreground">
              Top comment on one of them, and thirty-three thousand people agreed with it.
            </figcaption>
          </figure>
        </Block>

        {/* The substance. This is most of the page on purpose. */}
        <Block k="works">
          <ol className="divide-y divide-border border-y border-border">
            {CYL_WORKS.map((w, i) => (
              <Item key={w.title} n={String(i + 1).padStart(2, "0")} title={w.title} body={w.body} />
            ))}
          </ol>
        </Block>

        <Block k="loop">
          <MethodLoop steps={CYL_LOOP} miss={CYL_LOOP_MISS} />
        </Block>

        <Block k="relapse">
          <div className="mb-10">
            <DotGrid total={MISSED_DAY.total} filled={MISSED_DAY.filled} size="large" />
            <p className="mt-3 font-mono text-sm tabular-nums text-primary">
              1 <span className="text-muted-foreground">of 91</span>
            </p>
          </div>
          <div className="max-w-2xl space-y-5 rounded-lg border border-primary/40 bg-primary/5 p-6">
            <p data-spoken className="text-lg leading-relaxed text-foreground">
              {CYL_LETTER.instruction}
            </p>
            <p data-spoken className="text-lg leading-relaxed text-foreground">
              {CYL_LETTER.turn}
            </p>
            <p data-spoken className="text-base leading-relaxed text-muted-foreground">
              {CYL_LETTER.why}
            </p>
          </div>
        </Block>

        <Block k="areas">
          <AreaMatrix rows={CYL_AREAS} headings={["The one thing", "The rep", "It counts when"]} />
        </Block>

        <Block k="duration">
          <DurationChart rows={CYL_DURATIONS} />
          <p
            data-spoken
            className="mt-10 max-w-2xl border-l-2 border-primary pl-5 text-xl leading-snug text-foreground md:text-2xl"
          >
            {CYL_DURATION_ANSWER}
          </p>

          {/* Only what the tool actually does today. It hands over the ladder and
              one rung; it does not resurface the letter on a schedule or track
              you against a horizon, so it must not claim to. */}
          <div className="mt-14 border-t border-border pt-10">
            <p data-spoken className="max-w-2xl text-xl leading-relaxed text-foreground md:text-2xl">
              None of that needs an app, and I'd rather you did it on paper this afternoon than waited for anything
              from me.
            </p>
            <p data-spoken className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              If you'd rather not work out the rungs yourself, this hands them to you. Two questions, then it shows
              you one thing to do today and gets out of the way. Tomorrow it shows you the next one.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <Link href="/test/change-your-life/start">Give me today&apos;s one thing</Link>
              </Button>
              <span className="text-sm text-muted-foreground">Free, no account, setup is under a minute.</span>
            </div>
          </div>
        </Block>
      </div>
    </div>
  )
}
