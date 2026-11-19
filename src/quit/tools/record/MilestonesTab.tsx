"use client"

import { Check, Circle } from "lucide-react"
import { amountPerDay, fmtMoney } from "../../money"
import type { RecordCtx } from "./ctx"
import { fmtDay } from "./fmt"
import { dayMilestones, moneyMilestones, moneyRuns } from "./logic"
import { recordText as t } from "./text"

function Row({ id, label, line, done }: { id: string; label: string; line: string; done: boolean }) {
  return (
    <li data-testid={`step-${id}`} data-reached={done ? "true" : "false"} className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-card p-3">
      {done ? <Check className="size-5 shrink-0 text-primary" aria-hidden /> : <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
      <div className="min-w-0">
        <p className="break-words font-medium">{label}</p>
        <p className="break-words text-sm text-muted-foreground">{line}</p>
      </div>
    </li>
  )
}

export function MilestonesTab({ ctx }: { ctx: RecordCtx }) {
  const { view, today, nowMs, unit } = ctx
  const days = dayMilestones(view, today)
  const runs = moneyRuns(view.runs)
  const money = moneyMilestones(runs, ctx.spends, unit?.perDay ?? null, unit?.priceUsd ?? null, today, nowMs)
  const rate = amountPerDay(unit?.perDay, unit?.priceUsd)
  return (
    <div className="flex flex-col gap-5">
      <section aria-label={t.daysLadder} className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.daysLadder}</h2>
        <p className="text-sm text-muted-foreground">{t.daysLadderLine}</p>
        <ul className="flex flex-col gap-2">
          {days.map((s) => (
            <Row key={s.threshold} id={`day-${s.threshold}`} label={s.threshold === 1 ? "1 day" : `${s.threshold} days`} done={s.date !== null} line={s.date ? (s.date === today ? t.reachedToday(fmtDay(s.date)) : t.reachedOn(fmtDay(s.date))) : s.projected ? t.toGoOn(s.toGo, fmtDay(s.projected)) : t.toGoDays(s.toGo)} />
          ))}
        </ul>
      </section>
      <section aria-label={t.moneyLadder} className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.moneyLadder}</h2>
        <p className="text-sm text-muted-foreground">{t.moneyLadderLine}</p>
        <ul className="flex flex-col gap-2">
          {money.map((s) => (
            <Row
              key={s.threshold}
              id={`money-${s.threshold}`}
              label={fmtMoney(s.threshold).replace(".00", "")}
              done={s.reachedOn !== null}
              line={s.reachedOn ? (s.reachedOn === today ? t.reachedToday(fmtDay(s.reachedOn)) : t.reachedOn(fmtDay(s.reachedOn))) : s.daysAtRate !== null && rate !== null ? `${t.atRate(s.daysAtRate)}: ${fmtMoney(rate)} a day` : t.noRateMilestone}
            />
          ))}
        </ul>
      </section>
    </div>
  )
}
