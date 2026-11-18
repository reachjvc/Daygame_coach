"use client"

import { useState } from "react"
import { ExampleBar, Head, InferredTag, Placeholder } from "../../progress/shared/Bits"
import { Context, Panel, StrengthFeeling } from "../../sos/d/SosD"
import { dText } from "../../sos/d/text"
import { useDiary } from "../shared/hooks"
import { dayKey, dotDate } from "../shared/logic"
import { dyText } from "../shared/text"
import { type LogEntry, seedLog } from "./logic"
import { ddText } from "./text"

type Screen = "panel" | "strength" | "context" | "saved" | "history" | "other"

/** Copy D: the six-tile panel, then strength, feeling and context; the diary's own save and log screens are inferred. */
export function DiaryD() {
  const diary = useDiary<LogEntry>("d", seedLog)
  const [screen, setScreen] = useState<Screen>("panel")
  const [mode, setMode] = useState<"overcame" | "smoked">("overcame")
  const [strength, setStrength] = useState(5)
  const [feeling, setFeeling] = useState<number | null>(null)
  const [context, setContext] = useState<number | null>(null)
  if (!diary.ready) return null
  const begin = (m: string) => {
    setMode(m === "smoked" ? "smoked" : "overcame")
    setStrength(5)
    setFeeling(null)
    setContext(null)
    setScreen("strength")
  }
  const save = () => {
    if (feeling === null || context === null) return
    const at = Date.now()
    diary.save([...diary.items, { at, date: dayKey(at), mode, strength, feeling, context }])
    setScreen("saved")
  }
  const toPanel = () => setScreen("panel")
  const log = [...diary.items].sort((a, b) => b.at - a.at)

  let body: React.ReactNode
  if (screen === "panel")
    body = (
      <div className="flex flex-col gap-3">
        <Panel onBegin={begin} onOpen={() => setScreen("other")} />
        <button type="button" data-testid="d-to-log" onClick={() => setScreen("history")} className="inline-flex min-h-11 items-center justify-center text-sm text-muted-foreground underline">
          {ddText.toLog}
        </button>
      </div>
    )
  else if (screen === "strength") body = <StrengthFeeling strength={strength} setStrength={setStrength} feeling={feeling} setFeeling={setFeeling} onBack={toPanel} onNext={() => setScreen("context")} />
  else if (screen === "context") body = <Context context={context} setContext={setContext} onBack={() => setScreen("strength")} onNext={save} />
  else if (screen === "other")
    body = (
      <div className="flex flex-col gap-3">
        <button type="button" data-testid="back" onClick={toPanel} className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline">
          {dText.back}
        </button>
        <div className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">{dyText.otherTool}</div>
      </div>
    )
  else if (screen === "saved")
    body = (
      <section data-testid="d-saved" className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-xl font-semibold">{ddText.savedTitle}</h2>
          <InferredTag />
        </div>
        <p className="text-sm text-muted-foreground">{ddText.savedLine}</p>
        <button type="button" data-testid="d-saved-log" onClick={() => setScreen("history")} className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground">
          {ddText.toLog}
        </button>
        <button type="button" data-testid="d-saved-panel" onClick={toPanel} className="min-h-12 rounded-md border border-border px-4">
          {ddText.toPanel}
        </button>
      </section>
    )
  else
    body = (
      <section data-testid="d-history" className="flex flex-col gap-3">
        <Head title={ddText.logTitle} onBack={toPanel} inferred />
        <Placeholder />
        <ul className="flex flex-col gap-2" data-testid="d-log">
          {log.map((e) => (
            <li key={e.at} data-testid="d-log-row" data-mode={e.mode} className="flex flex-col gap-0.5 rounded-lg border border-border bg-card p-3 text-sm">
              <span className="font-medium">
                {dotDate(e.date)} · {e.mode === "smoked" ? ddText.smoked : ddText.overcame}
              </span>
              <span className="text-muted-foreground">
                {ddText.strength} {e.strength} · {dText.feelings[e.feeling]} · {dText.contexts[e.context]}
              </span>
            </li>
          ))}
        </ul>
      </section>
    )

  return (
    <div data-testid="diary-d" data-screen={screen}>
      {diary.hasExample && <ExampleBar onClear={diary.clearExample} />}
      {body}
    </div>
  )
}
