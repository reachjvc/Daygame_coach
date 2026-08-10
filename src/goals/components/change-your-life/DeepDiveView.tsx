"use client"

/**
 * The backend tab: everything the showcase deliberately leaves out.
 *
 * Named creators, attributed quotes with their like counts, the contradictions
 * table, all 93 videos with their metrics, and the caveats. This is the working
 * record — it is for reading, not for filming.
 *
 * Two things it refuses to do, both because a number that looks solid and isn't
 * is worse than no number:
 *  - It never prints a performance multiplier for the 19 videos that had no
 *    same-era peers to compare against.
 *  - It states the selection bias next to the tier counts rather than in a
 *    footnote, because the tier distribution is a property of how the corpus
 *    was picked.
 */

import { useMemo, useState } from "react"

import {
  CYL_CONSENSUS,
  CYL_CONVERGENCE,
  CYL_DIVERGENCES,
  CYL_GAPS,
  CYL_IMPROVISED,
  CYL_TOP_COMMENTS,
  CYL_TOTALS,
} from "@/src/goals/data/changeYourLife"
import { CYL_CORPUS, type CylCategory } from "@/src/goals/data/changeYourLifeCorpus"
import {
  describeMultiplier,
  filterCorpus,
  formatCount,
  sortCorpus,
  tierCounts,
  type CylSortKey,
} from "@/src/goals/changeYourLifeService"

import { Callout, ClaimGap, SectionHeading, Specimen, StatTile } from "./shared"

const CATEGORIES: { id: CylCategory | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "DATE", label: "Dating (men)" },
  { id: "GEN", label: "General" },
  { id: "MEN", label: "Masculine" },
  { id: "SCI", label: "Science" },
  { id: "ANTI", label: "Anti-self-help" },
]

const SORTS: { id: CylSortKey; label: string }[] = [
  { id: "views", label: "Views" },
  { id: "likeRate", label: "Like rate" },
  { id: "multiplier", label: "Multiplier" },
  { id: "viewsPerSub", label: "Views / sub" },
  { id: "commentRate", label: "Comment rate" },
  { id: "subs", label: "Subscribers" },
]

const TIER_STYLES: Record<string, string> = {
  breakout: "bg-primary/15 text-primary border-primary/30",
  strong: "bg-primary/10 text-primary/90 border-primary/20",
  "above baseline": "bg-muted text-foreground border-border",
  "on baseline": "bg-muted text-muted-foreground border-border",
  underperformed: "bg-destructive/10 text-destructive border-destructive/30",
  "no baseline": "bg-transparent text-muted-foreground border-dashed border-border",
}

export function DeepDiveView() {
  const [cat, setCat] = useState<CylCategory | "ALL">("ALL")
  const [sort, setSort] = useState<CylSortKey>("views")
  const [query, setQuery] = useState("")

  const rows = useMemo(() => sortCorpus(filterCorpus(CYL_CORPUS, cat, query), sort), [cat, sort, query])
  const tiers = useMemo(() => tierCounts(), [])

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile value={String(CYL_TOTALS.transcripts)} label="transcripts read" />
        <StatTile value={CYL_TOTALS.words.toLocaleString()} label="words" />
        <StatTile value={CYL_TOTALS.comments.toLocaleString()} label="top comments" />
        <StatTile value="474M" label="views covered" />
        <StatTile value={CYL_TOTALS.commentsBehind.toLocaleString()} label="comments behind them" />
      </div>

      <section className="mt-12">
        <SectionHeading n="01 — The finding" title="They already know. That was never the problem." />
        <div className="grid gap-6 lg:grid-cols-2">
          <Specimen
            size="hero"
            likes={33000}
            text="Step 9: Stop watching these videos. You already know what to do."
            source="Top comment · Better Ideas, “8 steps to unf*** your life” · 6.8M views"
          />
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Ninety-one videos, half a billion views, and the genre has converged on{" "}
              <strong className="text-foreground">excellent diagnosis and absent execution</strong>. It names your
              problem with uncomfortable precision, delivers a reframe, and stops.
            </p>
            <p>
              So the opportunity is not information. It is the execution layer between the reframe and Monday
              morning — and the audience is so starved of it that it improvises the thing by hand, on videos that are
              ten years old.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading
          n="02 — The product spec nobody wrote"
          title="What the audience built for itself"
          blurb="Dated pledge → scheduled return → visible log → an audience of strangers. Individually striking, and this is the layer that most needs the sanity check in section 03: the pledge-and-return loop is measurable under five channels, not the whole genre. The like counts below say how hard each one landed, not how common it is."
        />
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-20 px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  Likes
                </th>
                <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  What they improvised
                </th>
                <th className="w-48 px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  Where
                </th>
              </tr>
            </thead>
            <tbody>
              {CYL_IMPROVISED.map((row, i) => (
                <tr key={`${row.where}-${i}`} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-mono font-semibold tabular-nums text-primary">
                    {row.likes.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-foreground">{row.what}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading
          n="03 — How much weight the comment evidence carries"
          title="Ranked by how widely it appears, not by likes"
          blurb="The first pass ranked this by like count. That was wrong: of the 100 most-liked comments in the corpus, zero report anything that actually happened. Likes measure wit and recognition inside one video’s audience — the right test for a hook, the wrong one for a finding."
        />
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Finding", "Videos", "Channels", "Median likes", "Weight"].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CYL_CONVERGENCE.map((c) => (
                <tr key={c.finding} className="border-b border-border/60 align-top last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{c.finding}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold tabular-nums text-primary">{c.videos}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">{c.channels}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                    {c.medianLikes.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${
                        c.strength === "strong"
                          ? "border-primary/30 bg-primary/15 text-primary"
                          : c.strength === "moderate"
                            ? "border-border bg-muted text-foreground"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                      }`}
                    >
                      {c.strength}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Every count is a <strong className="text-foreground">lower bound</strong> — these are regexes over free
          text and they catch a fraction of how people phrase things. A low count means “not demonstrated”, never
          “does not happen”. Reproduce with <code className="font-mono">~/.cache/cyl-corpus/convergence.py</code>.
        </p>
      </section>

      <section className="mt-12">
        <SectionHeading n="04 — The pattern" title="Seven things every video assumes and none provides" />
        <div className="grid gap-5 md:grid-cols-2">
          {CYL_GAPS.map((g) => (
            <ClaimGap key={g.n} title={`${g.n}. ${g.title}`} said={g.said} gap={g.gap} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading
          n="05 — Consensus"
          title="Five claims almost everyone makes"
          blurb="The parts the genre gets right. They cross every category."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CYL_CONSENSUS.map((c) => (
            <div key={c.title} className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground text-balance">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading
          n="06 — The valuable part"
          title="Where they genuinely disagree"
          blurb="Unacknowledged, high-stakes conflicts. Each is a design decision the product has to make deliberately rather than inherit."
        />
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-44 px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  The split
                </th>
                <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  Side A
                </th>
                <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  Side B
                </th>
              </tr>
            </thead>
            <tbody>
              {CYL_DIVERGENCES.map((d) => (
                <tr key={d.split} className="border-b border-border/60 align-top last:border-0">
                  <td className="px-4 py-3 font-semibold text-foreground">{d.split}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.a}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Callout label="Not a preference" tone="warn">
            {CYL_DIVERGENCES[0].risk}
          </Callout>
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading
          n="07 — The corpus"
          title="All 93 videos, ranked"
          blurb="Multiplier is views-per-day ÷ the median for that channel’s uploads from the same era. Nineteen videos had fewer than six same-era peers, so they show the reason instead of a number."
        />

        <div className="mb-4 grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  cat === c.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by title or channel…"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring md:w-64"
          />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Sort by</span>
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
                sort === s.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
          <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
            {rows.length} of {CYL_CORPUS.length}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                {["Tier", "Mult", "Cat", "Channel", "Subs", "Views", "V/sub", "Like %", "Cmt %", "Title"].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${TIER_STYLES[v.tier]}`}>
                      {v.tier}
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-2 font-mono tabular-nums ${
                      v.multiplier == null ? "text-[10px] text-muted-foreground" : "font-semibold text-primary"
                    }`}
                  >
                    {describeMultiplier(v)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{v.cat}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-foreground">{v.channel}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-muted-foreground">{formatCount(v.subs)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-foreground">{formatCount(v.views)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-muted-foreground">{v.viewsPerSub ?? "—"}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-muted-foreground">{v.likeRate ?? "—"}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-muted-foreground">{v.commentRate ?? "—"}</td>
                  <td className="px-3 py-2">
                    <a
                      href={`https://youtu.be/${v.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground underline-offset-2 hover:text-primary hover:underline"
                    >
                      {v.title}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex flex-wrap gap-2">
            {Object.entries(tiers).map(([tier, n]) => (
              <span key={tier} className={`rounded border px-2 py-1 font-mono text-[10px] ${TIER_STYLES[tier]}`}>
                {tier} {n}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Selection bias, stated plainly: videos were chosen for high view counts, so this corpus studies{" "}
            <em>what worked</em>. The near-absence of underperformers is a property of the selection, not a finding.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading
          n="08 — The audience in its own words"
          title="Write in these words, not the creators’ words"
          blurb="Sorted by likes, which is the right sort key for this one job: these are lines proven to land with this audience, so they are a source of phrasing for hooks. They are not evidence of what is true — see section 03."
        />
        <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          {CYL_TOP_COMMENTS.map((c, i) => (
            <Specimen key={i} likes={c.likes} text={c.text} source={c.source} />
          ))}
        </div>
      </section>

      <footer className="mt-12 border-t border-border pt-5 text-xs text-muted-foreground">
        Full write-up in <code className="font-mono">docs/research/change-your-life/</code> — synthesis, ranked corpus
        table, comment language bank, flow design, short playbook, and per-video extracts for all 91. Raw transcripts
        and the rerunnable harvest rig in <code className="font-mono">~/.cache/cyl-corpus/</code>.
      </footer>
    </div>
  )
}
