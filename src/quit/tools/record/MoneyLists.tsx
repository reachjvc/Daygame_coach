"use client"

import { useState } from "react"
import { amountPerDay, fmtMoney } from "../../money"
import { parseTyped } from "../date/logic"
import type { RecordCtx } from "./ctx"
import { fmtShort } from "./fmt"
import { MAX_NOTE, MAX_SPEND, MAX_TARGET, fillTargets, moneyFor, type Spend, type Target, moneyRuns } from "./logic"
import { newId } from "./state"
import { recordText as t } from "./text"

const inputClass = "min-h-12 w-full rounded-md border border-border bg-background px-3 text-base"
const smallButton = "inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-sm"

/** A removal that can still be taken back while the screen is open. */
function UndoRow({ what, onUndo }: { what: string; onUndo: () => void }) {
  return (
    <li data-testid="removed-row" className="flex min-h-11 items-center justify-between gap-2 break-words rounded-lg border border-dashed border-border p-2 text-sm text-muted-foreground">
      <span className="min-w-0 break-words">{t.removed(what)}</span>
      <button type="button" data-testid="undo" onClick={onUndo} className="inline-flex min-h-11 shrink-0 items-center px-2 text-primary underline">
        {t.undo}
      </button>
    </li>
  )
}

interface Gone<T> {
  item: T
  index: number
}

export function SpendBlock({ ctx }: { ctx: RecordCtx }) {
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState(false)
  const [gone, setGone] = useState<Gone<Spend>[]>([])
  const thisYear = Number(ctx.today.slice(0, 4))
  const add = () => {
    const p = parseTyped(amount, MAX_SPEND)
    if (p.kind !== "ok" || p.value <= 0) return setError(true)
    ctx.actions.addSpend({ id: newId(), day: ctx.today, amount: Math.round(p.value * 100) / 100, note: note.trim().slice(0, MAX_NOTE) })
    setAmount("")
    setNote("")
    setError(false)
  }
  return (
    <section aria-label={t.spendTitle} data-testid="spend-block" className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{t.spendTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.spendLine}</p>
      {!ctx.readOnly && (
        <form
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t.spendAmount}</span>
            <input type="text" inputMode="decimal" data-testid="spend-amount" value={amount} maxLength={10} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t.spendNote}</span>
            <input type="text" data-testid="spend-note" value={note} maxLength={MAX_NOTE} onChange={(e) => setNote(e.target.value)} className={inputClass} />
            <span className="text-muted-foreground">{t.spendNoteHelp}</span>
          </label>
          {error && (
            <p data-testid="spend-error" role="alert" className="text-sm">
              {t.badNumber}
            </p>
          )}
          <button type="submit" data-testid="spend-add" className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground">
            {t.spendAdd}
          </button>
        </form>
      )}
      <ul className="flex flex-col gap-2">
        {ctx.spends.map((s) => (
          <li key={s.id} data-testid="spend-row" className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2 pl-3">
            <span className="min-w-0 break-words">{t.spendRow(s.note, fmtMoney(s.amount), fmtShort(s.day, thisYear))}</span>
            {!ctx.readOnly && (
              <button
                type="button"
                data-testid="spend-remove"
                onClick={() => {
                  setGone((g) => [...g, { item: s, index: ctx.spends.findIndex((x) => x.id === s.id) }])
                  ctx.actions.removeSpend(s.id)
                }}
                className={`${smallButton} shrink-0`}
              >
                {t.remove}
              </button>
            )}
          </li>
        ))}
        {gone.map((g) => (
          <UndoRow
            key={g.item.id}
            what={g.item.note}
            onUndo={() => {
              ctx.actions.restoreSpend(g.item, g.index)
              setGone((list) => list.filter((x) => x.item.id !== g.item.id))
            }}
          />
        ))}
      </ul>
      {ctx.spends.length === 0 && gone.length === 0 && <p className="text-sm text-muted-foreground">{t.spendNone}</p>}
    </section>
  )
}

export function TargetsBlock({ ctx }: { ctx: RecordCtx }) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [error, setError] = useState<"name" | "price" | null>(null)
  const [gone, setGone] = useState<Gone<Target>[]>([])
  const runs = moneyRuns(ctx.view.runs)
  const pm = moneyFor(runs, ctx.unit, ctx.spends, ctx.nowMs, null)
  const rate = amountPerDay(ctx.unit?.perDay, ctx.unit?.priceUsd)
  const filled = fillTargets(ctx.targets, pm.money ?? 0, rate)
  const add = () => {
    const p = parseTyped(price, MAX_TARGET)
    if (name.trim() === "") return setError("name")
    if (p.kind !== "ok" || p.value <= 0) return setError("price")
    ctx.actions.addTarget({ id: newId(), name: name.trim().slice(0, MAX_NOTE), price: Math.round(p.value * 100) / 100 })
    setName("")
    setPrice("")
    setError(null)
  }
  return (
    <section aria-label={t.targetsTitle} data-testid="targets-block" className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{t.targetsTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.targetsLine}</p>
      {!ctx.readOnly && (
        <form
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t.targetName}</span>
            <input type="text" data-testid="target-name" value={name} maxLength={MAX_NOTE} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t.targetPrice}</span>
            <input type="text" inputMode="decimal" data-testid="target-price" value={price} maxLength={10} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
          </label>
          {error && (
            <p data-testid="target-error" role="alert" className="text-sm">
              {error === "name" ? t.targetNameError : t.badNumber}
            </p>
          )}
          <button type="submit" data-testid="target-add" className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground">
            {t.targetAdd}
          </button>
        </form>
      )}
      <ul className="flex flex-col gap-2">
        {filled.map((f) => (
          <li key={f.target.id} data-testid="target-row" className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <p data-testid="target-title" className="min-w-0 break-words font-medium">
                {f.target.name}
              </p>
              {!ctx.readOnly && (
                <button
                  type="button"
                  data-testid="target-remove"
                  onClick={() => {
                    setGone((g) => [...g, { item: f.target, index: ctx.targets.findIndex((x) => x.id === f.target.id) }])
                    ctx.actions.removeTarget(f.target.id)
                  }}
                  className={`${smallButton} shrink-0`}
                >
                  {t.remove}
                </button>
              )}
            </div>
            <div role="progressbar" aria-label={f.target.name} aria-valuemin={0} aria-valuemax={f.target.price} aria-valuenow={f.funded} className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, (f.funded / f.target.price) * 100)}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">{t.targetFunded(fmtMoney(f.funded), fmtMoney(f.target.price))}</p>
            <p data-testid="target-days" className="break-words text-sm text-muted-foreground">
              {f.done ? t.targetDone : f.daysToGo !== null && rate !== null ? t.targetDays(f.daysToGo, fmtMoney(f.missing), fmtMoney(rate)) : t.targetNoRate}
            </p>
          </li>
        ))}
        {gone.map((g) => (
          <UndoRow
            key={g.item.id}
            what={g.item.name}
            onUndo={() => {
              ctx.actions.restoreTarget(g.item, g.index)
              setGone((list) => list.filter((x) => x.item.id !== g.item.id))
            }}
          />
        ))}
      </ul>
      {ctx.targets.length === 0 && gone.length === 0 && <p className="text-sm text-muted-foreground">{t.targetNone}</p>}
    </section>
  )
}
