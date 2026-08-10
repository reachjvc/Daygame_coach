"use client"

/**
 * The findings, written and laid out to be **filmed**.
 *
 * This view is B-roll: it gets scrolled through inside the short, so it is built
 * against different constraints from the deep-dive tab.
 *
 *  - Every panel carries one idea and survives being on screen for two seconds
 *    with no narration explaining it.
 *  - Facts are pictures first — dot grids, a shared axis, a chain — because a
 *    paragraph does not read while it is moving.
 *  - No creator names and no attributed quotes. On camera those become callouts
 *    of specific people, and the argument does not need them.
 *  - The width toggle exists because the same scroll has to work cropped to 9:16
 *    and full-width on a desktop capture.
 */

import { useState } from "react"

import {
  CYL_CATEGORY_STATS,
  CYL_COUNT_FACTS,
  CYL_DURATIONS,
  CYL_MEDIAN_LIKE_RATE,
  CYL_SHOWCASE,
  CYL_STAGES,
} from "@/src/goals/data/changeYourLife"

import { Bar, BigStat, Chain, DotGrid, DurationChart, Panel } from "./shared"

const PANELS = Object.fromEntries(CYL_SHOWCASE.map((p) => [p.key, p]))

export function ShowcaseView() {
  const [frame, setFrame] = useState<"wide" | "vertical">("wide")
  const width = frame === "vertical" ? "max-w-[560px]" : "max-w-4xl"

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Frame</span>
        <div className="flex gap-1 rounded-md border border-border bg-card p-0.5">
          {(
            [
              ["wide", "Desktop"],
              ["vertical", "Vertical 9:16"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFrame(id)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                frame === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Scroll this tab on camera. Vertical narrows the column so nothing is lost when the capture is cropped.
        </p>
      </div>

      <div className={`${width} transition-[max-width] duration-300`}>
        {/* ---------------------------------------------------------- scale */}
        <section className="pb-10 md:pb-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">{PANELS.scale.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight text-foreground text-balance md:text-5xl">
            {PANELS.scale.headline}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {PANELS.scale.body}
          </p>
          <div className="mt-9 grid grid-cols-2 gap-8 md:grid-cols-4">
            <BigStat value="91" caption="videos read in full, start to finish" />
            <BigStat value="300k" caption="words of transcript" />
            <BigStat value="474M" caption="times these videos have been watched" />
            <BigStat value="516k" caption="comments underneath them" />
          </div>
        </section>

        {/* ---------------------------------------------------------- shape */}
        <Panel eyebrow={PANELS.shape.eyebrow} headline={PANELS.shape.headline} body={PANELS.shape.body}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                What you are given
              </p>
              <div className="mt-3 h-3 w-full rounded bg-primary" />
              <p className="mt-3 text-sm text-foreground">
                A precise description of why you are stuck, and a way of thinking about it that feels true.
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-border bg-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                What happens on Monday
              </p>
              <div className="mt-3 h-3 w-[4%] rounded bg-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                What you actually do. How you know it counted. What happens when it goes wrong.
              </p>
            </div>
          </div>
        </Panel>

        {/* --------------------------------------------------- already know */}
        <Panel eyebrow={PANELS["already-know"].eyebrow} headline={PANELS["already-know"].headline} body={PANELS["already-know"].body}>
          <figure className="rounded-lg border border-primary/30 bg-primary/5 p-6">
            <blockquote className="text-xl font-medium leading-snug text-foreground text-balance md:text-2xl">
              “Stop watching these videos. You already know what to do.”
            </blockquote>
            <figcaption className="mt-4 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-semibold tabular-nums text-primary">33,000</span>
              <span className="text-sm text-muted-foreground">people agreed with it</span>
            </figcaption>
          </figure>
        </Panel>

        {/* ------------------------------------------------------ the counts */}
        <Panel
          eyebrow="Measured across all ninety-one"
          headline="Three things you would expect to be standard, and almost never are."
        >
          <div className="space-y-10">
            {CYL_COUNT_FACTS.map((f) => (
              <div key={f.headline} className="grid gap-5 md:grid-cols-[auto_1fr] md:items-start md:gap-8">
                <div>
                  <DotGrid total={f.total} filled={f.filled} size="large" />
                  <p className="mt-3 font-mono text-sm tabular-nums text-primary">
                    {f.filled} <span className="text-muted-foreground">of {f.total}</span>
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold leading-snug text-foreground text-balance md:text-xl">
                    {f.headline}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* -------------------------------------------------------- duration */}
        <Panel eyebrow={PANELS.duration.eyebrow} headline={PANELS.duration.headline} body={PANELS.duration.body}>
          <div className="rounded-lg border border-border bg-card p-5 md:p-6">
            <p className="mb-5 text-sm text-muted-foreground">
              Every bar below is one video answering the same question: how long does this take?
            </p>
            <DurationChart rows={CYL_DURATIONS} />
          </div>
        </Panel>

        {/* ----------------------------------------------------- constraints */}
        <Panel eyebrow={PANELS.constraints.eyebrow} headline={PANELS.constraints.headline} body={PANELS.constraints.body}>
          <div className="flex flex-wrap gap-2">
            {[
              "A free evening",
              "A kitchen you control",
              "A room you can be alone in",
              "Money for a gym",
              "Nobody depending on you",
              "A job that ends at five",
            ].map((a) => (
              <span
                key={a}
                className="rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground"
              >
                {a}
              </span>
            ))}
          </div>
          <p className="mt-5 font-mono text-sm text-foreground">
            <span className="text-primary">83,000</span> people liked two comments saying they do not have the third
            one.
          </p>
        </Panel>

        {/* ------------------------------------------------------ improvised */}
        <Panel eyebrow={PANELS.improvised.eyebrow} headline={PANELS.improvised.headline} body={PANELS.improvised.body}>
          <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center md:gap-10">
            <div>
              <DotGrid total={91} filled={41} size="large" />
              <p className="mt-3 font-mono text-sm tabular-nums text-primary">
                41 <span className="text-muted-foreground">of 91 videos</span>
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 font-mono text-sm leading-relaxed text-muted-foreground">
              <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-primary">Typed by a viewer, not the creator</p>
              <p>1. stay clean</p>
              <p>2. clean your ambient</p>
              <p>3. venture yourself</p>
              <p>4. make exercises</p>
              <p>5. take care of your money</p>
              <p className="text-muted-foreground/60">…</p>
            </div>
          </div>
          <div className="mt-8">
            <p className="mb-3 text-sm text-muted-foreground">And underneath others, the same four moves:</p>
            <Chain
              steps={[
                { label: "A start date", sub: "posted publicly, in a comment" },
                { label: "A promise", sub: "written to strangers" },
                { label: "A return", sub: "months or years later" },
                { label: "An edit", sub: "saying what actually happened" },
              ]}
            />
          </div>
        </Panel>

        {/* ------------------------------------------------------- resonance */}
        <Panel eyebrow={PANELS.resonance.eyebrow} headline={PANELS.resonance.headline} body={PANELS.resonance.body}>
          <div className="rounded-lg border border-border bg-card p-5 md:p-6">
            <p className="text-sm font-medium text-foreground">
              How many viewers actively liked the video, by the kind of video it is
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Independent of channel size and of how old the video is, so it measures how much people liked it rather
              than how hard it was pushed. Average across the study: {CYL_MEDIAN_LIKE_RATE}%.
            </p>
            <div className="mt-5 space-y-3">
              {CYL_CATEGORY_STATS.map((s) => (
                <Bar
                  key={s.cat}
                  label={s.label}
                  value={s.medianLikeRate}
                  max={6}
                  suffix="%"
                  wrapLabel
                  emphasis={s.medianLikeRate >= CYL_MEDIAN_LIKE_RATE}
                />
              ))}
            </div>
          </div>
        </Panel>

        {/* ---------------------------------------------------------- answer */}
        <Panel eyebrow={PANELS.answer.eyebrow} headline={PANELS.answer.headline} body={PANELS.answer.body}>
          <ol className="grid gap-3 md:grid-cols-2">
            {CYL_STAGES.map((s) => (
              <li key={s.key} className="flex gap-3 rounded-lg border border-border bg-card p-4">
                <span className="font-mono text-xs tabular-nums text-primary">{String(s.n).padStart(2, "0")}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.summary}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-base text-foreground">
            It is free, and none of it asks you to watch anything.
          </p>
        </Panel>
      </div>
    </div>
  )
}
