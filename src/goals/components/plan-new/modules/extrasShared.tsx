"use client"

import { useSearchParams } from "next/navigation"
import type { NsPlan } from "@/src/goals/types"
import { questionsCopy } from "@/src/goals/planSteps/copy/questions"
import { Chip, ChipRow, Pick } from "../ui"
import { useNav } from "../nav"

/** The ids still to come in a loop, kept in the address (`?rest=a,b`) so a reload keeps the place. */
export function useRest(): string[] {
  const sp = useSearchParams()
  return (sp.get("rest") ?? "").split(",").filter(Boolean)
}

/** Go to a screen of a loop, carrying what is left of it (a Change link's `from` wins). */
export function useGoLoop(summary: string) {
  const nav = useNav(summary)
  return (target: string, rest: string[]) => {
    if (rest.length === 0) return nav.go(target)
    return nav.go(`${target}?rest=${rest.join(",")}`)
  }
}

/** Everything a question can hang under: routine steps and active goals. */
export function rowOptions(plan: NsPlan): { id: string; label: string }[] {
  return [
    ...plan.routines.flatMap((r) => r.steps.map((s) => ({ id: s.id, label: s.title }))),
    ...plan.goals.filter((g) => g.status === "active").map((g) => ({ id: g.id, label: g.title })),
  ]
}

/** "On the day" or "Under an action or step", and which one. `value` null = the day. */
export function WhereChoice({
  plan, value, onChange, dayLabel, rowLabel, testPrefix,
}: { plan: NsPlan; value: string | null; onChange: (v: string | null) => void; dayLabel: string; rowLabel: string; testPrefix: string }) {
  const rows = rowOptions(plan)
  const underRow = value !== null
  return (
    <div className="space-y-3">
      <ChipRow>
        <Chip on={!underRow} testId={`${testPrefix}-day`} onClick={() => onChange(null)}>{dayLabel}</Chip>
        <Chip on={underRow} testId={`${testPrefix}-row`} disabled={rows.length === 0} onClick={() => onChange(value ?? rows[0]?.id ?? null)}>{rowLabel}</Chip>
      </ChipRow>
      {underRow && (
        <>
          <p className="text-sm font-medium text-zinc-200">{questionsCopy.where.pick_row}</p>
          <Pick options={rows} value={value ? [value] : []} onChange={(v) => onChange(v[0] ?? null)} testPrefix={`${testPrefix}-target`} />
        </>
      )}
    </div>
  )
}

/** The words for where a question or rating shows. */
export function whereText(plan: NsPlan, targetId: string | null, day: string, under: string): string {
  if (targetId === null) return day
  const label = rowOptions(plan).find((r) => r.id === targetId)?.label ?? ""
  return under.replace("{row}", label)
}
