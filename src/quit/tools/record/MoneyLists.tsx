"use client"

import { useState } from "react"
import { amountPerDay, fmtMoney } from "../../money"
import type { Gone, RecordCtx } from "./ctx"
import { fmtShort } from "./fmt"
import { MAX_NOTE, MAX_SPEND, MAX_TARGET, fillTargets, moneyFor, moneyRuns, parseAmount, toCents, type FilledTarget, type Spend } from "./logic"
import { newId } from "./state"
import { recordText as t } from "./text"

const inputClass = "min-h-12 w-full rounded-md border border-border bg-background px-3 text-base"
const smallButton = "inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-sm"
const openButton = "inline-flex min-h-11 items-center self-start rounded-md border border-border px-4 text-sm font-medium"

type Row<T> = { kind: "item"; item: T } | { kind: "gone"; gone: Gone<{ id: string }> & { label: string } }

/** The list with each removed row put back where it was, as its "Removed ... Undo" line (nothing shifts under the finger). */
function rowsWithGone<T extends { id: string }>(list: T[], gone: (Gone<{ id: string }> & { label: string })[]): Row<T>[] {
  const rows: Row<T>[] = list.map((item) => ({ kind: "item", item }))
  for (const g of [...gone].reverse()) rows.splice(Math.min(g.index, rows.length), 0, { kind: "gone", gone: g })
  return rows
}

function UndoRow({ what, onUndo }: { what: string; onUndo: () => void }) {
  return (
    <li data-testid="removed-row" className="flex min-h-14 items-center justify-between gap-2 break-words rounded-lg border border-dashed border-border p-2 pl-3 text-sm text-muted-foreground">
      <span className="min-w-0 break-words">{t.removed(what)}</span>
      <button type="button" data-testid="undo" onClick={onUndo} className="inline-flex min-h-11 shrink-0 items-center px-3 text-primary underline">
        {t.undo}
      </button>
    </li>
  )
}

export function SpendBlock({ ctx }: { ctx: RecordCtx }) {
  const { ui } = ctx
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<"bad" | "big" | null>(null)
  const thisYear = Number(ctx.today.slice(0, 4))
  const add = () => {
    const p = parseAmount(amount, MAX_SPEND)
    const cents = p.kind === "ok" ? toCents(p.value) : null
    if (cents === null) return setError(p.kind === "big" ? "big" : "bad")
    ctx.actions.addSpend({ id: newId(), day: ctx.today, amount: cents, note: note.trim().slice(0, MAX_NOTE) })
    setAmount("")
    setNote("")
    setError(null)
    ui.setSpendOpen(false)
  }
  const gone = ui.goneSpends.map((g) => ({ item: g.item, index: g.index, label: g.item.note }))
  const rows = rowsWithGone<Spend>(ctx.spends, gone)
  return (
    <section aria-label={t.spendTitle} data-testid="spend-block" className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{t.spendTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.spendLine}</p>
      <ul className="flex flex-col gap-2">
        {rows.map((r) =>
          r.kind === "item" ? (
            <li key={r.item.id} data-testid="spend-row" className="flex min-h-14 items-center justify-between gap-2 rounded-lg border border-border bg-card p-2 pl-3">
              <span className="min-w-0 break-words">{t.spendRow(r.item.note, fmtMoney(r.item.amount), fmtShort(r.item.day, thisYear))}</span>
              {!ctx.readOnly && (
                <button
                  type="button"
                  data-testid="spend-remove"
                  onClick={() =>
                    ui.tap(`row-${r.item.id}`, () => {
                      const s = r.item
                      ui.setGoneSpends((g) => (g.some((x) => x.item.id === s.id) ? g : [...g, { item: s, index: ctx.spends.findIndex((x) => x.id === s.id) }]))
                      ctx.actions.removeSpend(s.id)
                    })
                  }
                  className={`${smallButton} shrink-0`}
                >
                  {t.remove}
                </button>
              )}
            </li>
          ) : (
            <UndoRow
              key={`gone-${r.gone.item.id}`}
              what={r.gone.label}
              onUndo={() =>
                ui.tap(`row-${r.gone.item.id}`, () => {
                  const g = ui.goneSpends.find((x) => x.item.id === r.gone.item.id)
                  if (!g) return
                  ctx.actions.restoreSpend(g.item, g.index)
                  ui.setGoneSpends((list) => list.filter((x) => x.item.id !== g.item.id))
                })
              }
            />
          ),
        )}
      </ul>
      {ctx.spends.length === 0 && gone.length === 0 && <p className="text-sm text-muted-foreground">{t.spendNone}</p>}
      {!ctx.readOnly &&
        (ui.spendOpen ? (
          <form
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
            onSubmit={(e) => {
              e.preventDefault()
              ui.tap("spend-add", add)
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
                {error === "big" ? t.bigAmount : t.badNumber}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" data-testid="spend-add" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground">
                {t.spendAdd}
              </button>
              <button type="button" onClick={() => ui.setSpendOpen(false)} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border px-4">
                {t.cancel}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" data-testid="spend-open" onClick={() => ui.setSpendOpen(true)} className={openButton}>
            {t.spendAddOpen}
          </button>
        ))}
    </section>
  )
}

export function TargetsBlock({ ctx }: { ctx: RecordCtx }) {
  const { ui } = ctx
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [error, setError] = useState<"name" | "price" | "big" | null>(null)
  const runs = moneyRuns(ctx.view.runs)
  const pm = moneyFor(runs, ctx.unit, ctx.spends, ctx.nowMs, null)
  const rate = amountPerDay(ctx.unit?.perDay, ctx.unit?.priceUsd)
  const filled = fillTargets(ctx.targets, pm.money ?? 0, rate)
  const add = () => {
    const p = parseAmount(price, MAX_TARGET)
    if (name.trim() === "") return setError("name")
    const cents = p.kind === "ok" ? toCents(p.value) : null
    if (cents === null) return setError(p.kind === "big" ? "big" : "price")
    ctx.actions.addTarget({ id: newId(), name: name.trim().slice(0, MAX_NOTE), price: cents })
    setName("")
    setPrice("")
    setError(null)
    ui.setTargetOpen(false)
  }
  const gone = ui.goneTargets.map((g) => ({ item: g.item, index: g.index, label: g.item.name }))
  const rows = rowsWithGone<FilledTarget & { id: string }>(
    filled.map((f) => ({ ...f, id: f.target.id })),
    gone,
  )
  return (
    <section aria-label={t.targetsTitle} data-testid="targets-block" className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{t.targetsTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.targetsLine}</p>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          if (r.kind === "gone") {
            return (
              <UndoRow
                key={`gone-${r.gone.item.id}`}
                what={r.gone.label}
                onUndo={() =>
                  ui.tap(`row-${r.gone.item.id}`, () => {
                    const g = ui.goneTargets.find((x) => x.item.id === r.gone.item.id)
                    if (!g) return
                    ctx.actions.restoreTarget(g.item, g.index)
                    ui.setGoneTargets((list) => list.filter((x) => x.item.id !== g.item.id))
                  })
                }
              />
            )
          }
          const f = r.item
          return (
            <li key={f.target.id} data-testid="target-row" className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <p data-testid="target-title" className="min-w-0 break-words font-medium">
                  {f.target.name}
                </p>
                {!ctx.readOnly && (
                  <button
                    type="button"
                    data-testid="target-remove"
                    onClick={() =>
                      ui.tap(`row-${f.target.id}`, () => {
                        const x = f.target
                        ui.setGoneTargets((g) => (g.some((y) => y.item.id === x.id) ? g : [...g, { item: x, index: ctx.targets.findIndex((y) => y.id === x.id) }]))
                        ctx.actions.removeTarget(x.id)
                      })
                    }
                    className={`${smallButton} shrink-0`}
                  >
                    {t.remove}
                  </button>
                )}
              </div>
              <div role="progressbar" aria-label={f.target.name} aria-valuemin={0} aria-valuemax={f.target.price} aria-valuenow={f.funded} className="h-2 w-full overflow-hidden rounded-full bg-foreground/15">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, (f.funded / f.target.price) * 100)}%` }} />
              </div>
              <p className="text-sm text-muted-foreground">{t.targetFunded(fmtMoney(f.funded), fmtMoney(f.target.price))}</p>
              <p data-testid="target-days" className="break-words text-sm text-muted-foreground">
                {f.done ? t.targetDone : f.daysToGo !== null && rate !== null ? t.targetDays(f.daysToGo, fmtMoney(f.missing), fmtMoney(rate), ctx.view.runs.some((x) => x.live)) : t.targetNoRate}
              </p>
            </li>
          )
        })}
      </ul>
      {ctx.targets.length === 0 && gone.length === 0 && <p className="text-sm text-muted-foreground">{t.targetNone}</p>}
      {!ctx.readOnly &&
        (ui.targetOpen ? (
          <form
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
            onSubmit={(e) => {
              e.preventDefault()
              ui.tap("target-add", add)
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
                {error === "name" ? t.targetNameError : error === "big" ? t.bigAmount : t.badNumber}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" data-testid="target-add" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground">
                {t.targetAdd}
              </button>
              <button type="button" onClick={() => ui.setTargetOpen(false)} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border px-4">
                {t.cancel}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" data-testid="target-open" onClick={() => ui.setTargetOpen(true)} className={openButton}>
            {t.targetAddOpen}
          </button>
        ))}
    </section>
  )
}
