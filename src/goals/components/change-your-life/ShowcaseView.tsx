"use client"

/**
 * The findings, written to be read aloud and filmed.
 *
 * This page can be the short. It gets scrolled on camera and the copy gets read
 * off it, so it is built against different constraints from the deep-dive tab.
 *
 *  - **It gives the method away.** An earlier draft spent its whole length
 *    saying nobody tells you what to do, and then did not tell you what to do.
 *    That shape refutes its own argument. The bulk of the page is now substance;
 *    the gap in the genre appears once, and only to introduce the part handed
 *    over next.
 *  - First person, one claim per panel, said once. If a line can't be spoken in
 *    one breath it isn't here.
 *  - It ends on something doable in two minutes, not on a list of product
 *    features that mean nothing to someone seeing them cold.
 *  - Few boxes. Type and space do the work, because a screen of bordered cards
 *    reads as a dashboard rather than as somebody talking.
 *  - No creator names and no attributed quotes. On camera those become callouts
 *    of specific people.
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
  CYL_LOOP,
  CYL_LOOP_MISS,
  CYL_RELAPSE_RULES,
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
        className={`${p.eyebrow ? "mt-3" : ""} max-w-3xl font-semibold leading-[1.08] tracking-tight text-foreground text-balance ${
          first ? "text-4xl md:text-6xl" : "text-3xl md:text-5xl"
        }`}
      >
        {p.headline}
      </h2>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">{p.body}</p>
      {children ? <div className="mt-10">{children}</div> : null}
    </section>
  )
}

/** A numbered piece of the method. The number is real sequence or real count. */
function Item({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-4 py-6 md:grid-cols-[3rem_1fr] md:gap-6">
      <span className="font-mono text-lg tabular-nums text-primary md:text-xl">{n}</span>
      <div>
        <h3 className="text-xl font-semibold leading-snug text-foreground text-balance md:text-2xl">{title}</h3>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">{body}</p>
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
  const [words, setWords] = useState(0)

  // Measure what is actually on screen rather than tracking a number by hand,
  // so the read time stays honest when the copy changes. Runs once: the copy is
  // static and the frame toggle only changes the column width.
  useEffect(() => {
    const text = column.current?.innerText ?? ""
    setWords(text.split(/\s+/).filter(Boolean).length)
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
        {words > 0 ? (
          <span
            className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground"
            title={`${words} words. This genre reads at 188 wpm median, measured across the 91 videos; the fast end runs 240+.`}
          >
            {words}w · {mmss((words / CYL_GENRE_WPM.median) * 60)} read ·{" "}
            {mmss((words / CYL_GENRE_WPM.p90) * 60)} fast
          </span>
        ) : null}
      </div>

      <div
        ref={column}
        className={`${frame === "vertical" ? "max-w-[560px]" : "max-w-4xl"} transition-[max-width] duration-300`}
      >
        <Block k="already-know" first>
          <figure>
            <blockquote className="border-l-2 border-primary pl-5 text-2xl font-medium leading-snug text-foreground text-balance md:text-3xl">
              “Stop watching these videos. You already know what to do.”
            </blockquote>
            <figcaption className="mt-4 pl-5 text-sm text-muted-foreground">
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

        <Block k="relapse">
          <div className="mb-10">
            <DotGrid total={MISSED_DAY.total} filled={MISSED_DAY.filled} size="large" />
            <p className="mt-3 font-mono text-sm tabular-nums text-primary">
              1 <span className="text-muted-foreground">of 91</span>
            </p>
          </div>
          <ol className="divide-y divide-border border-y border-border">
            {CYL_RELAPSE_RULES.map((r, i) => (
              <Item key={r.title} n={String(i + 1).padStart(2, "0")} title={r.title} body={r.body} />
            ))}
          </ol>
        </Block>

        <Block k="duration">
          <DurationChart rows={CYL_DURATIONS} />
          <p className="mt-10 max-w-2xl border-l-2 border-primary pl-5 text-xl leading-snug text-foreground md:text-2xl">
            {CYL_DURATION_ANSWER}
          </p>
        </Block>

        <Block k="loop">
          <MethodLoop steps={CYL_LOOP} miss={CYL_LOOP_MISS} />
        </Block>

        <Block k="areas">
          <AreaMatrix rows={CYL_AREAS} headings={["The one thing", "The rep", "It counts when"]} />

          <div className="mt-14 border-t border-border pt-10">
            <p className="max-w-2xl text-xl leading-relaxed text-foreground md:text-2xl">
              None of that needs an app, and I'd rather you started this afternoon on paper than waited for anything
              from me.
            </p>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              What paper won't do is keep the letter where you'll find it on the bad day, remember what you decided
              counted, or tell you that you're four months into a two-year thing at the exact moment you're about to
              call it off. That part I built, and it's free.
            </p>
            <div className="mt-7">
              <Button asChild>
                <Link href="/test/change-your-life/flow">Set it up</Link>
              </Button>
            </div>
          </div>
        </Block>

      </div>
    </div>
  )
}
