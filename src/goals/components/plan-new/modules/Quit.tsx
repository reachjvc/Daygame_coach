"use client"

import Link from "next/link"
import { useState } from "react"
import { quitCopy } from "@/src/goals/planSteps/copy/quit"
import { commonCopy } from "@/src/goals/planSteps/copy/common"
import { quitGoals } from "@/src/goals/planSteps/planFacts"
import { homeHref } from "@/src/goals/planSteps/planRoutes"
import { cleanDaysThisWeek, habitOf, longestRun, setQuitDays, setQuitHabit, setQuitUrge } from "@/src/goals/planSteps/extras/quitChanges"
import { fill, plural } from "@/src/goals/planSteps/text"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen } from "../shared"
import { Chip, ChipRow, Frame, GrownText, Line, linkQuiet, card } from "../ui"

export function QuitModule({ segs }: { segs: string[] }) {
  const { plan, status } = usePlanNew()
  const first = segs[0] ?? (status.extras.quit.started ? "done" : "what")
  const goal = quitGoals(plan)[0]
  if (first === "done") return <Done />
  // The days and the urge belong to a quit goal: without one the first question comes first.
  if (!goal) return <What />
  if (first === "days") return <Days />
  if (first === "urge") return <Urge />
  return <What />
}

const CHIPS = [
  quitCopy.what.chip_porn, quitCopy.what.chip_smoking, quitCopy.what.chip_vaping, quitCopy.what.chip_pouches, quitCopy.what.chip_alcohol,
  quitCopy.what.chip_weed, quitCopy.what.chip_gaming, quitCopy.what.chip_social, quitCopy.what.chip_gambling, quitCopy.what.chip_sugar,
]

function What() {
  const { plan, change } = usePlanNew()
  const nav = useNav("quit/done")
  const existing = quitGoals(plan)[0]
  const was = existing ? habitOf(existing) : ""
  const [pick, setPick] = useState(CHIPS.includes(was as (typeof CHIPS)[number]) ? was : "")
  const [own, setOwn] = useState(was && !CHIPS.includes(was as (typeof CHIPS)[number]) ? was : "")
  const habit = (own.trim() || pick).trim()
  const commit = () => habit && change((p) => setQuitHabit(p, habit)?.plan ?? p)
  return (
    <Frame
      testId="quit-what"
      eyebrow={quitCopy.name}
      title={quitCopy.what.title}
      back={{ href: nav.back(null), onClick: commit }}
      next={{ disabled: !habit, onClick: () => { commit(); nav.go("quit/days") } }}
      later={{ href: homeHref() }}
    >
      <ChipRow>
        {CHIPS.map((c) => (
          <Chip key={c} on={!own.trim() && pick === c} testId={`quit-chip-${c}`} onClick={() => { setPick(c); setOwn("") }}>{c}</Chip>
        ))}
      </ChipRow>
      <Line label={quitCopy.what.own_label} value={own} onChange={setOwn} placeholder={quitCopy.what.own_placeholder} max={60} testId="quit-own" />
      {!habit && <p className="text-sm text-zinc-500">{quitCopy.what.error_empty}</p>}
    </Frame>
  )
}

function Days() {
  const { plan, change } = usePlanNew()
  const nav = useNav("quit/done")
  const goal = quitGoals(plan)[0]
  const [days, setDays] = useState(goal.daysPerWeek >= 1 ? goal.daysPerWeek : 7)
  const [build, setBuild] = useState(goal.rampSteps != null)
  const commit = () => change((p) => setQuitDays(p, goal.id, days, build))
  return (
    <Frame
      testId="quit-days"
      eyebrow={quitCopy.name}
      title={quitCopy.days.title}
      help={quitCopy.days.help}
      back={{ href: nav.back("quit/what"), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("quit/urge") } }}
      later={{ href: homeHref() }}
    >
      <ChipRow>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Chip key={n} on={days === n} testId={`quit-days-${n}`} onClick={() => setDays(n)}>{n}</Chip>
        ))}
      </ChipRow>
      {days < 7 && <Chip on={build} testId="quit-build" onClick={() => setBuild(!build)}>{quitCopy.days.build_up}</Chip>}
    </Frame>
  )
}

function Urge() {
  const { plan, change } = usePlanNew()
  const nav = useNav("quit/done")
  const goal = quitGoals(plan)[0]
  const [then, setThen] = useState(goal.obstacles[0]?.counter ?? "")
  const commit = () => then.trim() && change((p) => setQuitUrge(p, goal.id, then))
  return (
    <Frame
      testId="quit-urge"
      eyebrow={quitCopy.name}
      title={quitCopy.urge.title}
      back={{ href: nav.back("quit/days"), onClick: commit }}
      next={{ disabled: !then.trim(), onClick: () => { commit(); nav.go("quit/done") } }}
      later={{ href: homeHref() }}
    >
      <GrownText label={quitCopy.urge.field_label} value={then} onChange={setThen} placeholder={quitCopy.urge.placeholder} max={500} rows={2} testId="quit-urge-text" />
      {!then.trim() && <p className="text-sm text-zinc-500">{quitCopy.urge.error_empty}</p>}
    </Frame>
  )
}

function Done() {
  const { plan, today } = usePlanNew()
  const nav = useNav("quit/done")
  const goals = quitGoals(plan)
  const d = quitCopy.done
  return (
    <DoneScreen module="quit" eyebrow={quitCopy.name} title={goals[0] ? fill(d.title, { habit: habitOf(goals[0]) }) : quitCopy.name}>
      {goals.map((g) => {
        const then = g.obstacles.find((o) => o.counter.trim())?.counter
        return (
          <section key={g.id} className={`${card} space-y-1`} data-testid={`quit-${g.id}`}>
            {goals.length > 1 && <p className="text-sm font-medium text-zinc-100">{fill(d.title, { habit: habitOf(g) })}</p>}
            <p className="text-sm text-zinc-200" data-testid="quit-week">{fill(d.week_line, { n: cleanDaysThisWeek(plan, g.id, today), target: g.daysPerWeek })}</p>
            <p className="text-sm text-zinc-200">{plural(d, "longest_line", longestRun(plan, g.id))}</p>
            {then && <p className="break-words text-sm text-zinc-200">{fill(d.fallback_line, { then })}</p>}
          </section>
        )
      })}
      <div className="flex flex-wrap gap-4">
        <Link href={nav.change("quit/what")} className={linkQuiet}>{quitCopy.what.title}</Link>
        <Link href={nav.change("quit/days")} className={linkQuiet}>{quitCopy.days.title}</Link>
        <Link href={nav.change("quit/urge")} className={linkQuiet}>{commonCopy.change}: {quitCopy.urge.field_label}</Link>
      </div>
    </DoneScreen>
  )
}
