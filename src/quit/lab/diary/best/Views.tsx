"use client"

import { useState } from "react"
import { Card } from "../../progress/shared/Bits"
import { dotDate, keyMs } from "../shared/logic"
import { ContentComing } from "../../sos/best/Tools"
import {
  TIME_BUCKETS,
  bucketRange,
  byMove,
  bySituation,
  byTime,
  byWeekday,
  dayGroups,
  patternMode,
  timeOf,
  type DiaryEntry,
  type Row,
} from "./logic"
import { bestText as t, verbOf } from "./text"

export interface Pieces {
  id: string
  moments: { id: string; label: string }[] | null
  deck: { id: string; text: string }[]
  /** Feeling key to word. */
  words: Record<string, string>
  hasResponses: boolean
}

export function History({ entries, pieces, onEdit, onDelete }: { entries: DiaryEntry[]; pieces: Pieces; onEdit: (e: DiaryEntry) => void; onDelete: (id: string) => void }) {
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [sure, setSure] = useState<string | null>(null)
  const days = dayGroups(entries)
  if (days.length === 0)
    return (
      <p data-testid="history-empty" className="text-sm text-muted-foreground">
        {t.historyEmpty}
      </p>
    )
  const label = (id: string | null) => pieces.moments?.find((m) => m.id === id)?.label
  return (
    <ul data-testid="history" className="flex flex-col gap-2">
      {days.map((d) => {
        const open = openDay === d.date
        return (
          <li key={d.date} data-testid="day-row" data-date={d.date} data-count={d.count} data-slips={d.slips}>
            <Card className="p-0">
              <button
                type="button"
                aria-expanded={open}
                data-testid="day-toggle"
                onClick={() => setOpenDay(open ? null : d.date)}
                className="flex min-h-11 w-full flex-wrap items-center gap-x-3 gap-y-1 p-3 text-left text-sm"
              >
                <span className="font-medium">
                  {t.weekdays[new Date(keyMs(d.date)).getDay()]} {dotDate(d.date)}
                </span>
                <span data-testid="day-count">{t.dayCravings(d.count)}</span>
                <span data-testid="day-mean" className="text-muted-foreground">
                  {t.dayMean(d.mean === null ? "" : d.mean.toFixed(1))}
                </span>
                {d.slips > 0 && (
                  <span data-testid="day-slip" className="rounded-full border border-border px-2 py-0.5 text-xs">
                    {verbOf(pieces.id).past}
                    {d.slips > 1 ? ` ${d.slips}` : ""}
                  </span>
                )}
              </button>
              {open && (
                <ul className="flex flex-col gap-2 border-t border-border p-3">
                  {d.entries.map((e) => (
                    <li key={e.id} data-testid="entry-row" className="flex flex-col gap-1 text-sm">
                      <span>
                        {timeOf(e.at)} · {t.strengthShort} {e.strength}
                        {label(e.situation) ? ` · ${label(e.situation)}` : ""}
                        {e.used === true ? ` · ${verbOf(pieces.id).past}` : ""}
                      </span>
                      {e.feelings.length > 0 && <span className="text-muted-foreground">{e.feelings.map((f) => pieces.words[f] ?? f).join(", ")}</span>}
                      {e.moves.length > 0 && <span className="text-muted-foreground">{e.moves.map((m) => pieces.deck.find((c) => c.id === m)?.text ?? m).join("; ")}</span>}
                      <div className="flex flex-wrap gap-2">
                        <button type="button" data-testid="entry-edit" onClick={() => onEdit(e)} className="inline-flex min-h-11 items-center rounded-md border border-border px-3">
                          {t.edit}
                        </button>
                        {sure === e.id ? (
                          <>
                            <button
                              type="button"
                              data-testid="entry-delete-sure"
                              onClick={() => {
                                onDelete(e.id)
                                setSure(null)
                              }}
                              className="inline-flex min-h-11 items-center rounded-md border border-primary px-3"
                            >
                              {t.deleteSure}
                            </button>
                            <button type="button" onClick={() => setSure(null)} className="inline-flex min-h-11 items-center px-3 underline">
                              {t.keep}
                            </button>
                          </>
                        ) : (
                          <button type="button" data-testid="entry-delete" onClick={() => setSure(e.id)} className="inline-flex min-h-11 items-center rounded-md border border-border px-3">
                            {t.delete}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </li>
        )
      })}
    </ul>
  )
}

function Bars({ rows, testId }: { rows: Row[]; testId: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <ul data-testid={testId} className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.key} data-testid={`${testId}-row`} data-key={r.key} data-count={r.count} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0">{r.label}</span>
            <span className="shrink-0 tabular-nums">{t.barCount(r.count, r.percent)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Patterns({ entries, pieces }: { entries: DiaryEntry[]; pieces: Pieces }) {
  const n = entries.length
  const mode = patternMode(n)
  if (mode === "none")
    return (
      <p data-testid="patterns-wait" className="text-sm text-muted-foreground">
        {t.patternsWait(n)}
      </p>
    )
  const sit = pieces.moments ? bySituation(entries, pieces.moments) : null
  const labels = Object.fromEntries(TIME_BUCKETS.map((b) => [b.id, `${t.timeLabels[b.id]} ${bucketRange(b)}`])) as Record<(typeof TIME_BUCKETS)[number]["id"], string>
  const moves = byMove(entries, pieces.deck)
  return (
    <div data-testid="patterns" data-mode={mode} className="flex flex-col gap-4">
      <div className="text-sm text-muted-foreground">
        <p data-testid="patterns-basis">{t.patternsBasis(n)}</p>
        {mode === "counts" && <p data-testid="counts-only">{t.countsOnly}</p>}
      </div>
      <section className="flex flex-col gap-2">
        <h3 className="font-medium">{t.bySituation}</h3>
        {!sit ? <ContentComing /> : sit.rows.length === 0 ? <p className="text-sm text-muted-foreground">{t.noSituations}</p> : <Bars rows={sit.rows} testId="by-situation" />}
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="font-medium">{t.byTime}</h3>
        <Bars rows={byTime(entries, labels)} testId="by-time" />
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="font-medium">{t.byWeekday}</h3>
        <Bars rows={byWeekday(entries, t.weekdays)} testId="by-weekday" />
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="font-medium">{t.byMove}</h3>
        {!pieces.hasResponses ? (
          <ContentComing />
        ) : moves.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noMoves}</p>
        ) : (
          <>
            <ul data-testid="by-move" className="flex flex-col gap-2">
              {moves.map((m) => (
                <li key={m.id} data-testid="by-move-row" data-used={m.used} data-through={m.through} className="rounded-lg border border-border bg-card p-3 text-sm">
                  <p>{m.text}</p>
                  <p className="text-muted-foreground">{t.moveLine(m.used, m.through)}</p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">{t.moveNote}</p>
          </>
        )}
      </section>
    </div>
  )
}
