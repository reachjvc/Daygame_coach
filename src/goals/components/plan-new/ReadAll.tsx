"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { readAllCopy } from "@/src/goals/planSteps/copy/home"
import { goalsOfTier, activeSeasonGoals, weeklyItems } from "@/src/goals/planSteps/planFacts"
import { homeHref, screenHref } from "@/src/goals/planSteps/planRoutes"
import { ONE_ANSWERS, COMMIT_KEY } from "@/src/goals/data/northStarStart"
import { usePlanNew } from "./PlanNewContext"
import { Frame, btnQuiet, card, dateText, linkQuiet } from "./ui"

interface Section {
  key: string
  heading: string
  lines: string[]
  change: string
  add?: string
}

export function ReadAll() {
  const { plan } = usePlanNew()
  const [copied, setCopied] = useState(false)
  const r = readAllCopy
  const areaName = (id: string) => plan.areas.find((a) => a.id === id)?.label ?? ""
  const sections: Section[] = []
  const star = [plan.northStar.trim(), plan.answers.star_why?.trim() ? `${r.north_star_why}: ${plan.answers.star_why.trim()}` : ""].filter(Boolean)
  if (star.length) sections.push({ key: "star", heading: r.north_star, lines: star, change: "direction/picture" })
  const big = goalsOfTier(plan, "life")
  if (big.length) sections.push({ key: "big", heading: r.big_goals, lines: big.map((g) => g.title), change: "direction/big", add: "direction/big" })
  const growth = goalsOfTier(plan, "become")
  if (growth.length) sections.push({ key: "growth", heading: r.growth_goals, lines: growth.map((g) => g.title), change: "direction/become", add: "direction/become" })
  const s = plan.season
  if (s) {
    const lines = [
      s.sentence.trim() && `${r.season_focus}: ${s.sentence}`,
      s.endsOn && `${r.season_ends}: ${dateText(s.endsOn)}`,
      plan.seasonAreaIds.length > 0 && `${r.season_areas}: ${plan.seasonAreaIds.map(areaName).join(", ")}`,
      plan.answers[ONE_ANSWERS.why]?.trim() && `${r.season_why}: ${plan.answers[ONE_ANSWERS.why]}`,
      plan.answers[COMMIT_KEY]?.trim() && `${r.season_yes}: ${plan.answers[COMMIT_KEY]}`,
    ].filter(Boolean) as string[]
    if (lines.length) sections.push({ key: "season", heading: r.season, lines, change: "season/focus" })
  }
  const goals = activeSeasonGoals(plan)
  if (goals.length) {
    sections.push({
      key: "goals", heading: r.season_goals, change: "goals/list", add: "goals/new/what",
      lines: goals.map((g) => `${g.title}${g.type === "milestone_ladder" && g.ladder ? ` (${g.ladder.start} to ${g.ladder.target} ${g.unit})` : g.type === "habit_ramp" ? ` (${g.perWeek ?? g.daysPerWeek}×)` : ""}`),
    })
  }
  const items = weeklyItems(plan)
  if (items.length) sections.push({ key: "systems", heading: r.systems, lines: items.map((i) => i.title), change: "actions/goal", add: "actions/goal" })
  const routines = plan.routines.filter((x) => x.label.trim())
  if (routines.length) sections.push({ key: "routines", heading: r.routines, lines: routines.map((x) => x.label), change: "actions/done" })
  const standing = plan.areas.filter((a) => plan.review[a.id]?.snapshot?.trim())
  if (standing.length) sections.push({ key: "standing", heading: r.standing, lines: standing.map((a) => `${a.label}: ${plan.review[a.id].snapshot}`), change: "areas/done" })
  if (plan.values.length) sections.push({ key: "values", heading: r.values, lines: plan.values, change: "areas/done" })
  if (plan.answers.identity_total?.trim()) sections.push({ key: "identity", heading: r.identity, lines: [plan.answers.identity_total], change: "direction/done" })
  if (plan.experiences.length) sections.push({ key: "things", heading: r.things, lines: plan.experiences.map((e) => e.title), change: "direction/done" })

  const asText = sections.map((x) => `${x.heading}\n${x.lines.map((l) => `- ${l}`).join("\n")}`).join("\n\n")
  const body: ReactNode =
    sections.length === 0 ? (
      <p className="text-sm text-zinc-500">{r.empty}</p>
    ) : (
      sections.map((x) => (
        <section key={x.key} className={`${card} space-y-2`} data-testid={`read-${x.key}`}>
          <h2 className="text-sm font-semibold text-zinc-200">{x.heading}</h2>
          <ul className="space-y-1 text-sm text-zinc-300">
            {x.lines.map((l, i) => <li key={i} className="whitespace-pre-wrap break-words">{l}</li>)}
          </ul>
          <div className="flex gap-4">
            <Link href={screenHref(x.change)} className={linkQuiet}>{r.change}</Link>
            {x.add && <Link href={screenHref(x.add)} className={linkQuiet}>{r.add}</Link>}
          </div>
        </section>
      ))
    )
  return (
    <Frame testId="read-all" title={r.title} back={{ href: homeHref() }}>
      {sections.length > 0 && (
        <button
          type="button"
          className={btnQuiet}
          data-testid="read-copy"
          onClick={() => {
            void navigator.clipboard?.writeText(asText).catch(() => {})
            setCopied(true)
          }}
        >
          {copied ? r.copied : r.copy_button}
        </button>
      )}
      {body}
    </Frame>
  )
}
