"use client"

import { useState } from "react"
import Link from "next/link"
import { getAddiction } from "../../../data"
import { usable } from "../../../tools/common"
import { useCarry } from "../../../tools/hooks"
import type { QuitAddiction, QuitAddictionId, QuitOption } from "../../../types"
import type { LabProps } from "../../registry"
import { useLabState } from "../../store"
import { useInterval } from "../shared/hooks"
import { Blocks, Breathe, Bubbles, ContentComing, Help, Move, Reasons } from "./Tools"
import { addLog, DEFAULT_WAIT, minutesWaited, parseLogs, parseWait, ringClock, ringView, situationBars, WAIT_CHOICES, type LogEntry, type Wait } from "./logic"
import { bestText as t } from "./text"

const SWITCH_IDS = ["nicotine", "alcohol", "weed", "porn"] as const satisfies readonly QuitAddictionId[]
type ToolId = keyof typeof t.tools
const TOOL_ORDER: ToolId[] = ["breathe", "bubbles", "blocks", "move", "help", "reasons"]
const TOOL_GLYPH: Record<ToolId, string> = { breathe: "◯", bubbles: "●", blocks: "▦", move: "↗", help: "☰", reasons: "♡" }

type Screen = { kind: "shelf" } | { kind: "tool"; id: ToolId } | { kind: "ask" } | { kind: "result"; passed: boolean; minutes: number }

const RADIUS = 44
const CIRC = 2 * Math.PI * RADIUS

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""))

/** Improved Craving SOS: tools at once, a wait he chooses, two taps afterwards, his own pattern. */
export function SosBest({ addiction: initial }: LabProps) {
  const [chosen, setChosen] = useLabState<string>("sos", "best", "addiction", initial)
  const id: QuitAddictionId = (SWITCH_IDS as readonly string[]).includes(chosen) ? (chosen as QuitAddictionId) : "nicotine"
  const data = getAddiction(id)
  const [screen, setScreen] = useState<Screen>({ kind: "shelf" })
  const [used, setUsed] = useState<ToolId[]>([])
  const [wait, setWaitRaw] = useLabState<Wait>("sos", "best", "wait", { minutes: DEFAULT_WAIT, startedAt: null })
  const w = parseWait(wait)
  const [now, setNow] = useState(() => Date.now())
  useInterval(() => setNow(Date.now()), w.startedAt === null ? null : 500)
  const ring = ringView(w, w.startedAt === null ? now : Math.max(now, w.startedAt))

  const openTool = (tool: ToolId) => {
    setUsed((u) => (u.includes(tool) ? u : [...u, tool]))
    setScreen({ kind: "tool", id: tool })
  }
  const toShelf = () => setScreen({ kind: "shelf" })

  return (
    <div data-testid="sos-best" className="flex flex-col gap-4">
      <Switcher value={id} onChange={(next) => setChosen(next)} />
      {!data ? (
        <ContentComing />
      ) : screen.kind === "tool" ? (
        <>
          {ring.running && (
            <p data-testid="ring-mini" className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              {t.ringMini} <span className="font-semibold tabular-nums text-foreground">{ringClock(ring.leftMs)}</span>
            </p>
          )}
          <ToolScreen tool={screen.id} id={id} data={data} onBack={toShelf} />
        </>
      ) : screen.kind === "ask" ? (
        <Ask
          id={id}
          onAnswer={(passed) => setScreen({ kind: "result", passed, minutes: minutesWaited(w, Date.now()) })}
        />
      ) : screen.kind === "result" ? (
        <Result
          id={id}
          data={data}
          passed={screen.passed}
          minutes={screen.minutes}
          used={used}
          onAgain={() => {
            setUsed([])
            toShelf()
          }}
        />
      ) : (
        <>
          <header>
            <h2 className="text-xl font-semibold">{t.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.line}</p>
          </header>
          <RingCard wait={w} ring={ring} onChange={(next) => setWaitRaw(next)} />
          <Shelf onOpen={openTool} />
          <button type="button" data-testid="finish" onClick={() => setScreen({ kind: "ask" })} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border px-4 text-base">
            {t.done}
          </button>
          <Pattern id={id} data={data} />
        </>
      )}
    </div>
  )
}

function Switcher({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label={t.addictionLabel} className="flex flex-wrap gap-2">
      {SWITCH_IDS.map((x) => (
        <button
          key={x}
          type="button"
          role="radio"
          aria-checked={value === x}
          data-testid={`switch-${x}`}
          onClick={() => onChange(x)}
          className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${value === x ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
        >
          {t.addictions[x]}
        </button>
      ))}
    </div>
  )
}

function RingCard({ wait, ring, onChange }: { wait: Wait; ring: ReturnType<typeof ringView>; onChange: (w: Wait) => void }) {
  return (
    <section data-testid="ring-card" className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="relative size-24 shrink-0">
        <svg viewBox="0 0 100 100" className="size-24 -rotate-90" aria-hidden>
          <circle cx={50} cy={50} r={RADIUS} fill="none" strokeWidth={6} className="stroke-muted" />
          <circle
            data-testid="ring-arc"
            cx={50}
            cy={50}
            r={RADIUS}
            fill="none"
            strokeWidth={6}
            strokeLinecap="round"
            className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-linear motion-reduce:transition-none"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - ring.fraction)}
          />
        </svg>
        <span role="timer" aria-label={t.ringLabel} data-testid="ring-clock" className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums">
          {ringClock(ring.leftMs)}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm font-medium">{t.ringTitle}</p>
        <div role="radiogroup" aria-label={t.ringChoices} className="flex gap-2">
          {WAIT_CHOICES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={wait.minutes === m}
              disabled={ring.running}
              data-testid={`wait-${m}`}
              onClick={() => onChange({ minutes: m, startedAt: null })}
              className={`min-h-11 min-w-11 flex-1 rounded-md border px-2 text-sm disabled:opacity-50 ${wait.minutes === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
            >
              {m} {t.minutes}
            </button>
          ))}
        </div>
        {ring.running ? (
          <button type="button" data-testid="wait-stop" onClick={() => onChange({ minutes: wait.minutes, startedAt: null })} className="min-h-11 rounded-md border border-border px-3 text-sm">
            {t.stop}
          </button>
        ) : (
          <button type="button" data-testid="wait-start" onClick={() => onChange({ minutes: wait.minutes, startedAt: Date.now() })} className="min-h-11 rounded-md border border-primary px-3 text-sm text-primary">
            {t.start}
          </button>
        )}
        {ring.over && (
          <p data-testid="wait-over" className="text-sm">
            {t.ringOver}
          </p>
        )}
      </div>
    </section>
  )
}

function Shelf({ onOpen }: { onOpen: (tool: ToolId) => void }) {
  return (
    <ul data-testid="shelf" aria-label={t.shelfLabel} className="grid grid-cols-2 gap-3">
      {TOOL_ORDER.map((tool) => (
        <li key={tool} className="flex">
          <button
            type="button"
            data-testid={`tile-${tool}`}
            onClick={() => onOpen(tool)}
            className="flex min-h-24 w-full flex-1 flex-col items-start justify-between gap-2 rounded-lg border border-border bg-card p-3 text-left"
          >
            <span aria-hidden="true" className="text-2xl text-primary">
              {TOOL_GLYPH[tool]}
            </span>
            <span className="text-sm font-medium">{t.tools[tool]}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function ToolScreen({ tool, id, data, onBack }: { tool: ToolId; id: QuitAddictionId; data: QuitAddiction; onBack: () => void }) {
  switch (tool) {
    case "breathe":
      return <Breathe onBack={onBack} />
    case "bubbles":
      return <Bubbles onBack={onBack} />
    case "blocks":
      return <Blocks onBack={onBack} />
    case "move":
      return <Move data={data} onBack={onBack} />
    case "help":
      return <Help data={data} onBack={onBack} />
    case "reasons":
      return <Reasons addiction={id} onBack={onBack} />
  }
}

function Ask({ id, onAnswer }: { id: string; onAnswer: (passed: boolean) => void }) {
  const verb = t.verbs[id]?.[0] ?? t.verbs.nicotine[0]
  return (
    <section data-testid="ask" className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{fill(t.askTitle, { verb })}</h2>
      <button type="button" data-testid="ask-yes" onClick={() => onAnswer(false)} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border px-4 text-base">
        {t.yes}
      </button>
      <button type="button" data-testid="ask-no" onClick={() => onAnswer(true)} className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground">
        {t.no}
      </button>
    </section>
  )
}

/** `passed` is true when he did not use. */
function Result({ id, data, passed, minutes, used, onAgain }: { id: QuitAddictionId; data: QuitAddiction; passed: boolean; minutes: number; used: ToolId[]; onAgain: () => void }) {
  const carry = useCarry()
  const [verb, past] = t.verbs[id] ?? t.verbs.nicotine
  return (
    <section data-testid="result" className="flex flex-col gap-4">
      {passed ? (
        <div data-testid="result-plain" className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
          <p className="text-lg">{fill(t.resultNo, { verb })}</p>
          <p className="text-sm text-muted-foreground">{used.length > 0 ? `${t.resultTools}: ${used.map((u) => t.tools[u]).join(", ")}.` : t.resultNoTools}</p>
          {minutes > 0 && <p className="text-sm text-muted-foreground">{minutes === 1 ? t.resultWaitedOne : fill(t.resultWaited, { n: minutes })}</p>}
        </div>
      ) : (
        <div data-testid="result-note" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <p className="text-base">{fill(t.resultYes, { past })}</p>
          <Link href={carry(`/quit/${id}/slip`)} data-testid="diary-link" className="inline-flex min-h-11 items-center text-primary underline">
            {t.diaryLink}
          </Link>
        </div>
      )}
      <LogRow id={id} data={data} />
      <button type="button" data-testid="again" onClick={onAgain} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border px-4 text-base">
        {t.again}
      </button>
    </section>
  )
}

function LogRow({ id, data }: { id: QuitAddictionId; data: QuitAddiction }) {
  const [raw, setLogs] = useLabState<LogEntry[]>("sos", "best", `logs-${id}`, [])
  const logs = parseLogs(raw)
  const moments = usable<QuitOption[]>(data.riskyMoments)
  const [strength, setStrength] = useState<number | null>(null)
  const [situation, setSituation] = useState<string | null>(null)
  const [msg, setMsg] = useState<"saved" | "updated" | null>(null)
  const save = () => {
    const r = addLog(logs, { at: 0, strength, situation }, Date.now())
    setLogs(r.logs)
    setMsg(r.updated ? "updated" : "saved")
  }
  return (
    <section data-testid="log-row" className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h3 className="text-base font-semibold">{t.logTitle}</h3>
      <p className="text-sm text-muted-foreground">{t.logLine}</p>
      <div role="radiogroup" aria-label={t.strengthLabel} className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={strength === n}
            data-testid={`strength-${n}`}
            onClick={() => setStrength(n)}
            className={`min-h-11 rounded-md border text-base ${strength === n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {n}
          </button>
        ))}
      </div>
      {moments ? (
        <div role="radiogroup" aria-label={t.situationLabel} className="flex flex-wrap gap-2">
          {moments.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={situation === m.id}
              data-testid={`log-situation-${m.id}`}
              onClick={() => setSituation(m.id)}
              className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${situation === m.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      ) : (
        <ContentComing />
      )}
      <button type="button" data-testid="log-save" disabled={strength === null && situation === null} onClick={save} className="inline-flex min-h-12 items-center justify-center rounded-md border border-primary px-4 text-primary disabled:opacity-40">
        {t.logSave}
      </button>
      {msg && (
        <p data-testid="log-msg" role="status" className="text-sm">
          {msg === "saved" ? t.logSaved : t.logUpdated}
        </p>
      )}
      <span data-testid="log-count" className="sr-only">
        {logs.length}
      </span>
    </section>
  )
}

function Pattern({ id, data }: { id: QuitAddictionId; data: QuitAddiction }) {
  const [raw] = useLabState<LogEntry[]>("sos", "best", `logs-${id}`, [])
  const moments = usable<QuitOption[]>(data.riskyMoments)
  const p = situationBars(parseLogs(raw), moments ?? [])
  return (
    <section data-testid="pattern" className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <h3 className="text-base font-semibold">{t.patternTitle}</h3>
      {!moments ? (
        <ContentComing />
      ) : !p.ready ? (
        <p data-testid="pattern-wait" className="text-sm text-muted-foreground">
          {t.patternWait}
        </p>
      ) : (
        <>
          <ul data-testid="pattern-bars" aria-label={t.patternBar} className="flex flex-col gap-3">
            {p.bars.map((b) => (
              <li key={b.id} data-testid="pattern-bar">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="min-w-0">{b.label}</span>
                  <span className="shrink-0 tabular-nums">
                    {b.count} · {b.percent} %
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${b.percent}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{fill(t.patternBasis, { n: p.total })}</p>
        </>
      )}
    </section>
  )
}
