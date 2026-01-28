"use client"

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { QAResponse, Source, ConfidenceResult, MetaCognition } from "../types"

type Message = {
  role: "user" | "assistant"
  text: string
  sources?: Source[]
  metaCognition?: MetaCognition
  confidence?: ConfidenceResult
}

const SAMPLE_QUESTIONS = [
  "What should I say when a girl says she studies medicine?",
  "How do I transition from opener to conversation?",
  "What body language should I use during the approach?",
]

export function QAPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Ask anything about daygame and I will draw on our training transcripts to answer.",
    },
  ])
  const [latestSources, setLatestSources] = useState<Source[]>([])
  const [latestMetaCognition, setLatestMetaCognition] = useState<MetaCognition | null>(null)
  const [latestConfidence, setLatestConfidence] = useState<ConfidenceResult | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSamples, setShowSamples] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const statusMessage = useMemo(() => {
    if (isLoading) return "Thinking..."
    if (error) return error
    if (messages.length > 1) return "Answers are grounded in our training data."
    return "Try one of the example prompts."
  }, [isLoading, error, messages.length])

  const getConfidenceLabel = (score: number): { label: string; color: string } => {
    if (score >= 0.8) return { label: "High confidence", color: "bg-green-100 text-green-800" }
    if (score >= 0.5) return { label: "Medium confidence", color: "bg-yellow-100 text-yellow-800" }
    return { label: "Low confidence", color: "bg-orange-100 text-orange-800" }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    setError(null)
    setMessages((prev) => [...prev, { role: "user", text: trimmed }])
    setIsLoading(true)
    setLatestSources([])
    setLatestMetaCognition(null)
    setLatestConfidence(null)
    setInput("")

    try {
      const response = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(
          errorData?.error ?? `Request failed (status ${response.status})`
        )
      }

      const data = (await response.json()) as QAResponse

      if (!data.answer) {
        throw new Error("No answer received")
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer,
          sources: data.sources,
          metaCognition: data.metaCognition,
          confidence: data.confidence,
        },
      ])
      setLatestSources(data.sources || [])
      setLatestMetaCognition(data.metaCognition || null)
      setLatestConfidence(data.confidence || null)
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Unexpected error"
      setError(message)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Error: ${message}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleExampleClick = (example: string) => {
    setInput(example)
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Q&A Coach</p>
        <h1 className="text-4xl font-semibold text-foreground">Ask the Coach</h1>
        <p className="mx-auto max-w-3xl text-base text-muted-foreground">
          Ask for advice grounded in real coaching transcripts. Each answer includes sources and confidence scoring.
        </p>
      </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] h-[calc(100vh-280px)]">
          {/* Left column: Chat */}
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle>Live coaching</CardTitle>
                  <CardDescription>{statusMessage}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSamples(!showSamples)}
                  className="text-xs"
                >
                  {showSamples ? "Hide" : "Show"} samples
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4 px-0 pb-6 overflow-hidden">
              {showSamples && (
                <div className="px-6 pb-4 border-b border-border">
                  <p className="text-xs font-medium text-foreground mb-2">Sample prompts:</p>
                  <div className="space-y-2">
                    {SAMPLE_QUESTIONS.map((example) => (
                      <div key={example} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
                        <span className="text-xs text-foreground flex-1">{example}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleExampleClick(example)}
                          className="flex-shrink-0"
                        >
                          Use
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-1 flex-col gap-4 px-6 overflow-y-auto" aria-live="polite">
                {messages.length === 1 ? (
                  <div className="flex flex-1 flex-col items-center justify-center text-center space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">AI Coach Powered by Real Training Data</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Ask anything about conversations, approaches, and interactions. Your answers are grounded in real coaching transcripts.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div key={`${message.role}-${index}`}>
                      <div
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-2`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {message.text}
                        </div>
                      </div>
                      {message.confidence && message.role === "assistant" && (
                        <div className="flex justify-start mb-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getConfidenceLabel(message.confidence.score).color}`}>
                            {getConfidenceLabel(message.confidence.score).label} ({Math.round(message.confidence.score * 100)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>

              <form className="px-6" aria-label="Send question" onSubmit={handleSubmit}>
                <label htmlFor="qa-question" className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Question
                </label>
                <textarea
                  id="qa-question"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Example: What should I say when a girl says she studies medicine?"
                  className="min-h-[96px] w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isLoading}
                />
                <div className="mt-4 flex items-center gap-3">
                  <Button type="submit" disabled={isLoading || !input.trim()}>
                    {isLoading ? "Thinking..." : "Ask the coach"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Right column: Meta-cognition + Sources */}
          <div className="flex flex-col gap-6 h-full overflow-y-auto">
            {/* Confidence Details */}
            {latestConfidence && (
              <Card className="border-primary/20 overflow-hidden flex flex-col flex-shrink-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Confidence Details</CardTitle>
                  <CardDescription className="text-xs">
                    Overall: {Math.round(latestConfidence.score * 100)}%
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Retrieval Strength</span>
                    <span className="text-foreground">{Math.round(latestConfidence.factors.retrievalStrength * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Source Consistency</span>
                    <span className="text-foreground">{Math.round(latestConfidence.factors.sourceConsistency * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Policy Compliance</span>
                    <span className="text-foreground">{Math.round(latestConfidence.factors.policyCompliance * 100)}%</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Meta-Cognition */}
            {latestMetaCognition && (
              <Card className="border-primary/20 overflow-hidden flex flex-col flex-shrink-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Meta-Cognition</CardTitle>
                  <CardDescription className="text-xs">How this answer was formed</CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-3 overflow-y-auto max-h-[200px]">
                  <div>
                    <p className="font-semibold text-foreground mb-1">Reasoning</p>
                    <p className="text-muted-foreground">{latestMetaCognition.reasoning}</p>
                  </div>
                  {latestMetaCognition.limitations && (
                    <div>
                      <p className="font-semibold text-foreground mb-1">Limitations</p>
                      <p className="text-muted-foreground">{latestMetaCognition.limitations}</p>
                    </div>
                  )}
                  {latestMetaCognition.suggestedFollowUps.length > 0 && (
                    <div>
                      <p className="font-semibold text-foreground mb-1">Suggested Follow-ups</p>
                      <ul className="list-disc list-inside text-muted-foreground">
                        {latestMetaCognition.suggestedFollowUps.map((q, i) => (
                          <li key={i} className="cursor-pointer hover:text-foreground" onClick={() => setInput(q)}>
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sources */}
            {(messages.length > 1 || isLoading) && (
              <Card className="border-primary/20 overflow-hidden flex flex-col flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Sources</CardTitle>
                  <CardDescription className="text-xs">
                    {isLoading
                      ? "Searching training data..."
                      : latestSources.length > 0
                      ? `${latestSources.length} relevant sources found`
                      : "No relevant sources found"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground overflow-y-auto flex-1">
                  {isLoading ? (
                    <div className="flex flex-col gap-2">
                      <div className="h-12 w-full animate-pulse rounded-lg bg-muted/50" />
                      <div className="h-12 w-full animate-pulse rounded-lg bg-muted/50" />
                    </div>
                  ) : latestSources.length > 0 ? (
                    latestSources.map((source, i) => (
                      <div key={i} className="rounded-lg border bg-muted/50 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-foreground">
                            Source {i + 1}: {source.metadata.coach || "Unknown Coach"}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(source.relevanceScore * 100)}% match
                          </span>
                        </div>
                        {source.metadata.topic && (
                          <p className="text-xs text-primary mb-1">{source.metadata.topic}</p>
                        )}
                        {source.metadata.source && (
                          <p className="text-[11px] text-muted-foreground mb-2 break-all">
                            {source.metadata.source} • chunk {source.chunkId}
                          </p>
                        )}
                        <div className="max-h-[260px] overflow-y-auto rounded-md bg-background/40 p-2">
                          <p className="whitespace-pre-wrap">{source.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="italic">No specific sources found for this question.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
  )
}
