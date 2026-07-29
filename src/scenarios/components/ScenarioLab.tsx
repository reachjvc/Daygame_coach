"use client"

import { useState } from "react"
import { ArrowUp, Loader2, MessageSquare, RefreshCw, ScanFace, Square } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type {
  LabChatMessage,
  LabDebriefResult,
  LabKind,
  LabRespondResult,
  LabStartResult,
} from "@/src/scenarios/types"

type Phase = "idle" | "starting" | "chat" | "debriefing" | "debrief"

async function labPost<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/scenarios/lab", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data as T
}

const KIND_META: Record<LabKind, { title: string; blurb: string }> = {
  coldread: {
    title: "Cold Read",
    blurb: "You see her. Commit to a specific guess about her — job, origin, personality — then play whatever comes back.",
  },
  career: {
    title: "Career Response",
    blurb: "She reveals what she does. Don't interview, don't just validate — do something with it.",
  },
}

export function ScenarioLab() {
  const [kind, setKind] = useState<LabKind>("coldread")
  const [phase, setPhase] = useState<Phase>("idle")
  const [session, setSession] = useState<LabStartResult | null>(null)
  const [history, setHistory] = useState<LabChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [debrief, setDebrief] = useState<LabDebriefResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const start = async (k: LabKind) => {
    setKind(k)
    setPhase("starting")
    setError(null)
    setDebrief(null)
    setHistory([])
    try {
      const result = await labPost<LabStartResult>({
        action: "start",
        kind: k,
        seed: `lab-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      })
      setSession(result)
      setHistory(result.openingLine ? [{ role: "girl", text: result.openingLine }] : [])
      setPhase("chat")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start")
      setPhase("idle")
    }
  }

  const send = async () => {
    if (!session || !draft.trim() || sending) return
    const message = draft.trim()
    setSending(true)
    setError(null)
    try {
      const result = await labPost<LabRespondResult>({
        action: "respond",
        kind,
        momentId: session.momentId,
        history,
        message,
      })
      const next: LabChatMessage[] = [
        ...history,
        { role: "user", text: message },
        { role: "girl", text: result.reply },
      ]
      setHistory(next)
      setDraft("")
      if (result.done) await runDebrief(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed")
    } finally {
      setSending(false)
    }
  }

  const runDebrief = async (finalHistory?: LabChatMessage[]) => {
    if (!session) return
    setPhase("debriefing")
    setError(null)
    try {
      const result = await labPost<LabDebriefResult>({
        action: "debrief",
        kind,
        momentId: session.momentId,
        history: finalHistory ?? history,
      })
      setDebrief(result)
      setPhase("debrief")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Debrief failed")
      setPhase("chat")
    }
  }

  const userTurns = history.filter((h) => h.role === "user").length

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Scenario Lab</h1>
        <p className="text-sm text-muted-foreground">
          Corpus-grounded practice — every round is seeded by a real infield moment, and the debrief shows you the tape.
        </p>
      </div>

      <div className="flex gap-3">
        {(Object.keys(KIND_META) as LabKind[]).map((k) => (
          <Button
            key={k}
            variant={kind === k && phase !== "idle" ? "default" : "outline"}
            onClick={() => start(k)}
            disabled={phase === "starting" || phase === "debriefing" || sending}
          >
            {phase === "starting" && kind === k ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : k === "coldread" ? (
              <ScanFace className="mr-2 size-4" />
            ) : (
              <MessageSquare className="mr-2 size-4" />
            )}
            {KIND_META[k].title}
          </Button>
        ))}
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {phase === "idle" && !error && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Pick a scenario to start. {KIND_META.coldread.blurb}
          </CardContent>
        </Card>
      )}

      {session && (phase === "chat" || phase === "debriefing" || phase === "debrief") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">The scene</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="whitespace-pre-wrap">{session.scene}</p>
            <p className="text-xs text-muted-foreground">{KIND_META[kind].blurb}</p>
          </CardContent>
        </Card>
      )}

      {session && phase !== "idle" && phase !== "starting" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Conversation</CardTitle>
            {phase === "chat" && userTurns > 0 && (
              <Button size="sm" variant="outline" onClick={() => runDebrief()} disabled={sending}>
                <Square className="mr-2 size-3" /> End &amp; debrief
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {history.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <span
                  className={
                    m.role === "user"
                      ? "inline-block rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "inline-block rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
                  }
                >
                  {m.text}
                </span>
              </div>
            ))}
            {phase === "chat" && (
              <div className="flex gap-2 pt-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      void send()
                    }
                  }}
                  placeholder={
                    kind === "coldread" && userTurns === 0
                      ? "Commit to a read — what's your guess about her?"
                      : "Your line..."
                  }
                  rows={2}
                  disabled={sending}
                />
                <Button onClick={() => void send()} disabled={sending || !draft.trim()}>
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                </Button>
              </div>
            )}
            {phase === "debriefing" && (
              <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Scoring against the corpus principles...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {phase === "debrief" && debrief && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Debrief</CardTitle>
              <Badge variant={debrief.score >= 7 ? "default" : "secondary"}>{debrief.score}/10</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{debrief.feedback}</p>
              <div>
                <span className="font-semibold">Best move:</span> {debrief.bestMove}
              </div>
              <div>
                <span className="font-semibold">Weakest line:</span>{" "}
                <span className="italic">&ldquo;{debrief.weakestLine}&rdquo;</span>
              </div>
              <div>
                <span className="font-semibold">Stronger version:</span>{" "}
                <span className="italic">&ldquo;{debrief.rewrite}&rdquo;</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                The receipt — what actually happened ({debrief.receipt.channel},{" "}
                {debrief.receipt.outcome === "closed" ? "ended in a close" : debrief.receipt.outcome})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {debrief.receipt.situation.map((l, i) => (
                <p key={`s${i}`} className="text-muted-foreground">
                  {l}
                </p>
              ))}
              {debrief.receipt.coachResponse.map((l, i) => (
                <p key={`c${i}`} className="font-medium">
                  Coach: {l}
                </p>
              ))}
              {debrief.receipt.girlReaction.map((l, i) => (
                <p key={`g${i}`} className="text-muted-foreground">
                  Girl: {l}
                </p>
              ))}
            </CardContent>
          </Card>

          <Button variant="outline" onClick={() => start(kind)}>
            <RefreshCw className="mr-2 size-4" /> New round ({KIND_META[kind].title})
          </Button>
        </>
      )}
    </div>
  )
}
