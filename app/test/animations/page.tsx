"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  MessageCircle,
  Dumbbell,
  Sprout,
  Flame,
  Footprints,
  TrendingUp,
  Calendar,
  Crown,
  Compass,
  Eye,
  CircleDot,
  Sparkles,
  Trophy,
  Check,
  Lock,
  PartyPopper,
  Play,
  Square,
  BookOpen,
  Users,
  Target,
  Swords,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// ─── Hooks ─────────────────────────────────────────────────────────────────

function useIsVisible(rootMargin = "0px") {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { rootMargin, threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])
  return { ref, isVisible }
}

function useAnimationLoop(isVisible: boolean, totalDurationMs: number) {
  const [cycle, setCycle] = useState(0)
  useEffect(() => {
    if (!isVisible) return
    const id = setInterval(() => setCycle((c) => c + 1), totalDurationMs)
    return () => clearInterval(id)
  }, [isVisible, totalDurationMs])
  return cycle
}

// ─── Section Wrapper ───────────────────────────────────────────────────────

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, isVisible } = useIsVisible("-50px")
  return (
    <section
      ref={ref}
      className={`transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </section>
  )
}

// ─── Hero Section ──────────────────────────────────────────────────────────

const HERO_PHRASES = [
  "Practice real conversations",
  "Track your progress",
  "Master the approach",
]

function HeroSection() {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const phrase = HERO_PHRASES[phraseIndex]
    if (!isDeleting && charIndex < phrase.length) {
      const id = setTimeout(() => setCharIndex((c) => c + 1), 60)
      return () => clearTimeout(id)
    }
    if (!isDeleting && charIndex === phrase.length) {
      const id = setTimeout(() => setIsDeleting(true), 2000)
      return () => clearTimeout(id)
    }
    if (isDeleting && charIndex > 0) {
      const id = setTimeout(() => setCharIndex((c) => c - 1), 30)
      return () => clearTimeout(id)
    }
    if (isDeleting && charIndex === 0) {
      setIsDeleting(false)
      setPhraseIndex((i) => (i + 1) % HERO_PHRASES.length)
    }
  }, [charIndex, isDeleting, phraseIndex])

  return (
    <div className="relative flex flex-col items-center text-center py-16">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,107,53,0.12) 0%, transparent 70%)",
        }}
      />
      <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-4 relative">
        Daygame Coach
      </h1>
      <div className="h-12 flex items-center relative">
        <span className="text-2xl md:text-3xl text-primary font-medium">
          {HERO_PHRASES[phraseIndex].slice(0, charIndex)}
        </span>
        <span className="inline-block w-[2px] h-8 bg-primary ml-0.5 animate-pulse" />
      </div>
      <p className="text-muted-foreground mt-6 text-lg max-w-xl">
        AI-powered practice, goal tracking, and personalized coaching for men who approach.
      </p>
    </div>
  )
}

// ─── Voice Chat Section ────────────────────────────────────────────────────

const MOCK_CHAT = [
  { sender: "ai" as const, text: "*A woman at a bookstore picks up a novel, glances at the cover, then notices you.*\n\"Can I help you?\" *slight smile*", delay: 0 },
  { sender: "user" as const, text: "That book any good? You look like someone who actually reads the back cover before committing.", delay: 2500 },
  { sender: "coach" as const, text: "Score 7/10 — Good observational opener. Natural energy, non-needy.", delay: 4000 },
  { sender: "ai" as const, text: "\"Haha, guilty. It's about behavioral psychology — why people do weird things. You read?\"", delay: 6000 },
  { sender: "user" as const, text: "Only the back covers. That's why I need someone who reads the whole thing to tell me if it's worth it.", delay: 8500 },
  { sender: "coach" as const, text: "Score 8/10 — Great callback humor. She's engaged. Push for the assumption stack next.", delay: 10500 },
]

const SCENARIO_BADGES = [
  { label: "Bookstore", active: true },
  { label: "Coffee Shop", active: false },
  { label: "Street", active: false },
  { label: "Park", active: false },
]

function VoiceChatSection() {
  const { ref, isVisible } = useIsVisible("-50px")
  const cycle = useAnimationLoop(isVisible, 16000)
  const [visibleMessages, setVisibleMessages] = useState<number>(0)
  const [showThinking, setShowThinking] = useState(false)

  useEffect(() => {
    if (!isVisible) return
    setVisibleMessages(0)
    setShowThinking(false)

    const timeouts: ReturnType<typeof setTimeout>[] = []

    MOCK_CHAT.forEach((msg, i) => {
      // Show thinking before AI messages
      if (msg.sender === "ai" && i > 0) {
        timeouts.push(setTimeout(() => setShowThinking(true), msg.delay - 1200))
      }
      timeouts.push(
        setTimeout(() => {
          setShowThinking(false)
          setVisibleMessages(i + 1)
        }, msg.delay)
      )
    })

    return () => timeouts.forEach(clearTimeout)
  }, [isVisible, cycle])

  return (
    <AnimatedSection>
      <div ref={ref} className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <Badge variant="outline" className="text-primary border-primary/30 mb-2">
            <Swords className="size-3 mr-1" /> Flagship Feature
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Practice Real Conversations With AI</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Choose a scenario. Pick a location. Our AI plays the woman — you practice being smooth. Get scored on every response with instant coaching feedback.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {SCENARIO_BADGES.map((b) => (
              <span
                key={b.label}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  b.active
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted/50 text-muted-foreground border border-border"
                }`}
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* Mock chat window */}
        <div className="rounded-lg border-2 border-border bg-card shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Keep It Going</h3>
              <p className="text-xs text-muted-foreground">
                Practicing with: <span className="text-primary font-semibold">The Bookworm</span>
              </p>
            </div>
            <div className="size-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <div className="size-2 rounded-full bg-green-500" />
            </div>
          </div>
          <div className="p-4 space-y-3 min-h-[320px] max-h-[320px] overflow-hidden">
            {MOCK_CHAT.slice(0, visibleMessages).map((msg, i) => (
              <div
                key={`${cycle}-${i}`}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                style={{ animation: "fadeSlideUp 0.3s ease-out" }}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground font-medium"
                      : msg.sender === "coach"
                        ? "bg-muted/60 border border-border text-foreground text-sm"
                        : "bg-card border border-border text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            {showThinking && (
              <div className="flex justify-start">
                <div className="max-w-[75%] rounded-lg px-4 py-2.5 bg-card border border-border text-foreground">
                  <p className="animate-pulse text-sm italic text-muted-foreground">*thinking...*</p>
                </div>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <div className="flex-1 h-10 rounded-md bg-background border border-border px-3 flex items-center text-sm text-muted-foreground">
              Type what you&apos;d say...
            </div>
            <div className="size-10 rounded-md bg-primary flex items-center justify-center">
              <svg className="size-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AnimatedSection>
  )
}

// ─── Goals Section ─────────────────────────────────────────────────────────

const MOCK_GOALS = [
  { title: "10 approaches per week", area: "Dating & Daygame", icon: MessageCircle, hex: "#f97316", current: 7, target: 10, streak: 3 },
  { title: "Gym 4x per week", area: "Health & Appearance", icon: Dumbbell, hex: "#22c55e", current: 3, target: 4, streak: 12 },
  { title: "Meditate 10 mins daily", area: "Personal Growth", icon: Sprout, hex: "#eab308", current: 9, target: 10, streak: 5 },
]

function GoalsSection() {
  const { ref, isVisible } = useIsVisible("-50px")
  const cycle = useAnimationLoop(isVisible, 12000)
  const [progressValues, setProgressValues] = useState([0, 0, 0])
  const [showCelebration, setShowCelebration] = useState(false)
  const [thirdGoalComplete, setThirdGoalComplete] = useState(false)

  useEffect(() => {
    if (!isVisible) return
    setProgressValues([0, 0, 0])
    setShowCelebration(false)
    setThirdGoalComplete(false)

    const t1 = setTimeout(() => setProgressValues([70, 75, 90]), 300)
    const t2 = setTimeout(() => {
      setProgressValues([70, 75, 100])
      setThirdGoalComplete(true)
    }, 4000)
    const t3 = setTimeout(() => setShowCelebration(true), 4500)
    const t4 = setTimeout(() => setShowCelebration(false), 7500)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [isVisible, cycle])

  return (
    <AnimatedSection>
      <div ref={ref} className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Goals animation */}
        <div className="relative order-2 lg:order-1">
          <div className="space-y-3">
            {MOCK_GOALS.map((goal, i) => {
              const Icon = goal.icon
              const pct = progressValues[i]
              const isComplete = i === 2 && thirdGoalComplete
              return (
                <div
                  key={goal.title}
                  className={`rounded-lg border border-border bg-card p-3 transition-colors ${isComplete ? "border-green-500/40" : ""}`}
                  style={{ borderLeftColor: goal.hex, borderLeftWidth: 3 }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 rounded-md p-1.5 flex-shrink-0"
                      style={{ backgroundColor: `${goal.hex}15`, color: goal.hex }}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">{goal.title}</h3>
                        {isComplete && (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                            Done
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: goal.hex,
                              width: `${pct}%`,
                              transition: "width 1.5s ease-out",
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
                          {isComplete ? goal.target : goal.current}/{goal.target}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Flame className="size-3 text-orange-500" />
                          {goal.streak} day streak
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Celebration toast */}
          {showCelebration && (
            <div
              className="absolute bottom-[-60px] right-0 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-lg"
              style={{ animation: "fadeSlideUp 0.4s ease-out" }}
            >
              <PartyPopper className="size-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-foreground">Goal Complete!</p>
                <p className="text-xs text-muted-foreground">Meditate 10 mins daily</p>
              </div>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="space-y-4 order-1 lg:order-2">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Set Goals. Track Habits. Celebrate Progress.</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Hierarchical goals across 6 life areas. Habit ramps that adapt to your pace. Milestone ladders that mark your journey. Confetti when you crush it.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {["Dating & Daygame", "Health", "Career", "Social", "Growth", "Lifestyle"].map((area) => (
              <span key={area} className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-border">
                {area}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AnimatedSection>
  )
}

// ─── Progress Dashboard Section ────────────────────────────────────────────

const MOCK_STATS = [
  { label: "Approaches", value: 247, icon: Footprints, hex: "#ff6b35" },
  { label: "Numbers", value: 34, icon: TrendingUp, hex: "#22c55e" },
  { label: "Week Streak", value: 8, icon: Flame, hex: "#f97316" },
  { label: "Sessions", value: 52, icon: Calendar, hex: "#a855f7" },
]

function useCountUp(target: number, isActive: boolean, duration = 2000) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!isActive) {
      setValue(0)
      return
    }
    let start: number | null = null
    let raf: number
    const step = (ts: number) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [isActive, target, duration])
  return value
}

function ProgressSection() {
  const { ref, isVisible } = useIsVisible("-50px")
  const [timerSecs, setTimerSecs] = useState(2723) // 45:23
  const [showApproach, setShowApproach] = useState(false)

  useEffect(() => {
    if (!isVisible) return
    const id = setInterval(() => setTimerSecs((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return
    const t = setTimeout(() => setShowApproach(true), 3000)
    return () => clearTimeout(t)
  }, [isVisible])

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  return (
    <AnimatedSection>
      <div ref={ref} className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Track Every Session. See Every Stat.</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Live session timer. Voice notes with auto-transcription. Weekly reviews that actually help you improve. Watch your numbers climb.
          </p>
        </div>

        <div className="space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {MOCK_STATS.map((stat) => {
              const Icon = stat.icon
              const count = useCountUp(stat.value, isVisible)
              return (
                <div key={stat.label} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="rounded-md p-1.5"
                      style={{ backgroundColor: `${stat.hex}15`, color: stat.hex }}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {count}
                    {stat.label === "Week Streak" ? "wk" : ""}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Session timer */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-green-500/15 flex items-center justify-center">
                  <Square className="size-4 text-green-500 fill-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Session Active</p>
                  <p className="text-2xl font-mono font-bold text-foreground tabular-nums">{formatTime(timerSecs)}</p>
                </div>
              </div>
              <div className="size-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>

          {/* Approach entry slide-in */}
          <div
            className={`rounded-lg border border-border bg-card p-3 transition-all duration-500 ${
              showApproach ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <p className="text-xs text-muted-foreground mb-1.5">New approach logged</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-xs bg-primary/15 text-primary border border-primary/30">Coffee shop</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/15 text-green-500 border border-green-500/30">Got number</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30">Confident</span>
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  )
}

// ─── Ask Your Coach Section ────────────────────────────────────────────────

const MOCK_QA_QUESTION = "What should I say when she mentions her job?"
const MOCK_QA_ANSWER = "Use her career as a springboard for assumption stacking. If she says 'I'm a nurse', don't interview her about it. Instead, make a playful assumption: 'You look more like an off-duty spy than a nurse.' This creates intrigue and shows you're not like every other guy who asks 'oh what ward do you work on?' The key is treating her job as a launching pad, not a destination."
const MOCK_SOURCES = [
  { coach: "Marcus", topic: "Career Responses", match: 92 },
  { coach: "Erik", topic: "Assumption Stacking", match: 85 },
]

function CoachQASection() {
  const { ref, isVisible } = useIsVisible("-50px")
  const cycle = useAnimationLoop(isVisible, 18000)
  const [phase, setPhase] = useState<"idle" | "question" | "thinking" | "streaming" | "sources">("idle")
  const [streamedChars, setStreamedChars] = useState(0)

  useEffect(() => {
    if (!isVisible) return
    setPhase("idle")
    setStreamedChars(0)

    const t1 = setTimeout(() => setPhase("question"), 500)
    const t2 = setTimeout(() => setPhase("thinking"), 1500)
    const t3 = setTimeout(() => setPhase("streaming"), 3000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [isVisible, cycle])

  useEffect(() => {
    if (phase !== "streaming") return
    if (streamedChars >= MOCK_QA_ANSWER.length) {
      const t = setTimeout(() => setPhase("sources"), 500)
      return () => clearTimeout(t)
    }
    const id = setInterval(() => setStreamedChars((c) => Math.min(c + 2, MOCK_QA_ANSWER.length)), 20)
    return () => clearInterval(id)
  }, [phase, streamedChars])

  useEffect(() => {
    if (phase === "streaming" && streamedChars === 0) {
      setStreamedChars(1)
    }
  }, [phase, streamedChars])

  return (
    <AnimatedSection>
      <div ref={ref} className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Mock QA chat */}
        <div className="rounded-lg border-2 border-border bg-card shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">Ask Your Coach</h3>
            <p className="text-xs text-muted-foreground">Answers grounded in training transcripts</p>
          </div>
          <div className="p-4 space-y-3 min-h-[300px]">
            {/* User question */}
            {(phase === "question" || phase === "thinking" || phase === "streaming" || phase === "sources") && (
              <div className="flex justify-end" style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
                <div className="max-w-[75%] rounded-lg px-4 py-2.5 bg-primary text-primary-foreground font-medium">
                  <p className="text-sm">{MOCK_QA_QUESTION}</p>
                </div>
              </div>
            )}

            {/* Thinking */}
            {phase === "thinking" && (
              <div className="flex justify-start">
                <div className="rounded-lg px-4 py-2.5 bg-card border border-border">
                  <p className="animate-pulse text-sm text-muted-foreground">Thinking...</p>
                </div>
              </div>
            )}

            {/* Streaming answer */}
            {(phase === "streaming" || phase === "sources") && (
              <div className="flex justify-start" style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
                <div className="max-w-[85%] rounded-lg px-4 py-2.5 bg-card border border-border text-foreground">
                  <p className="text-sm whitespace-pre-wrap">
                    {MOCK_QA_ANSWER.slice(0, streamedChars)}
                    {phase === "streaming" && <span className="inline-block w-[2px] h-4 bg-primary ml-0.5 animate-pulse" />}
                  </p>
                </div>
              </div>
            )}

            {/* Confidence + Sources */}
            {phase === "sources" && (
              <div className="space-y-2" style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
                <div className="flex items-center gap-2 ml-1">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30">
                    High confidence (87%)
                  </span>
                </div>
                <div className="flex gap-2">
                  {MOCK_SOURCES.map((src) => (
                    <div key={src.topic} className="flex-1 rounded-lg border bg-muted/30 p-2.5">
                      <p className="text-xs font-medium text-foreground">{src.coach}</p>
                      <p className="text-xs text-muted-foreground">{src.topic}</p>
                      <p className="text-xs text-primary mt-1">{src.match}% match</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Text */}
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">AI Coaching Grounded in Real Training Data</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Ask anything about approaches, conversation flow, or social dynamics. Get answers backed by source transcripts with confidence scores — not generic advice.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {["Source Citations", "Confidence Scores", "Real Transcripts"].map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-border">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AnimatedSection>
  )
}

// ─── Inner Game Section ────────────────────────────────────────────────────

const MOCK_STEPS = [
  { title: "Discover Values", subtitle: "Explore 11 life domains", icon: Compass },
  { title: "Shadow Self", subtitle: "Values through fears", icon: Eye },
  { title: "Peak Experience", subtitle: "Meaningful moments", icon: Flame },
  { title: "Growth Edges", subtitle: "Values through challenges", icon: CircleDot },
  { title: "Prioritize", subtitle: "Find your core 5", icon: Sparkles },
  { title: "Your Core Values", subtitle: "Summary & integration", icon: Trophy },
]

function InnerGameSection() {
  const { ref, isVisible } = useIsVisible("-50px")
  const cycle = useAnimationLoop(isVisible, 14000)
  const [completedSteps, setCompletedSteps] = useState(0)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    if (!isVisible) return
    setCompletedSteps(0)
    setActiveStep(0)

    let step = 0
    const id = setInterval(() => {
      step++
      if (step <= 6) {
        setActiveStep(step)
        setCompletedSteps(step - 1)
      }
      if (step === 7) {
        setCompletedSteps(6)
        setActiveStep(-1)
      }
    }, 1500)

    return () => clearInterval(id)
  }, [isVisible, cycle])

  return (
    <AnimatedSection>
      <div ref={ref} className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Discover Your Core Values</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A guided 6-step journey of self-discovery. From shadow self to peak experiences — uncover what drives you and align your actions with your identity.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-2 gap-3">
          {MOCK_STEPS.map((step, i) => {
            const Icon = step.icon
            const isComplete = i < completedSteps
            const isActive = i + 1 === activeStep
            const isLocked = !isComplete && !isActive

            return (
              <div
                key={step.title}
                className={`rounded-lg border p-4 transition-all duration-500 ${
                  isComplete
                    ? "border-green-500/40 bg-green-500/5"
                    : isActive
                      ? "border-primary/60 bg-primary/5 shadow-[0_0_15px_rgba(255,107,53,0.15)]"
                      : "border-border bg-card opacity-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-md p-2 transition-colors duration-500 ${
                      isComplete
                        ? "bg-green-500/15 text-green-500"
                        : isActive
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isComplete ? <Check className="size-4" /> : isLocked ? <Lock className="size-4" /> : <Icon className="size-4" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isLocked ? "text-muted-foreground" : "text-foreground"}`}>{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AnimatedSection>
  )
}

// ─── Level Progression Section ─────────────────────────────────────────────

const LEVEL_TITLES = ["Rookie", "Practitioner", "Confident", "Advanced", "Expert", "Master"]

function LevelSection() {
  const { ref, isVisible } = useIsVisible("-50px")
  const cycle = useAnimationLoop(isVisible, 10000)
  const [xpPercent, setXpPercent] = useState(0)
  const [level, setLevel] = useState(3)
  const [showFlash, setShowFlash] = useState(false)

  useEffect(() => {
    if (!isVisible) return
    setXpPercent(0)
    setLevel(3)
    setShowFlash(false)

    const t1 = setTimeout(() => setXpPercent(85), 500)
    const t2 = setTimeout(() => setXpPercent(100), 3000)
    const t3 = setTimeout(() => {
      setShowFlash(true)
      setTimeout(() => setShowFlash(false), 400)
      setLevel(4)
      setXpPercent(5)
    }, 4500)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [isVisible, cycle])

  return (
    <AnimatedSection className="max-w-2xl mx-auto">
      <div ref={ref} className="text-center space-y-6">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">Level Up as You Practice</h2>
        <p className="text-lg text-muted-foreground">
          Earn XP from approaches, sessions, and completed goals. Watch your rank evolve.
        </p>

        {/* Level display */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div
              className={`size-14 rounded-full bg-primary/15 flex items-center justify-center transition-transform duration-300 ${
                showFlash ? "scale-125" : "scale-100"
              }`}
            >
              <Crown className="size-7 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Level {level + 1}</p>
              <p className="text-xl font-bold text-foreground transition-all duration-300">
                {LEVEL_TITLES[level]}
              </p>
            </div>
          </div>

          {/* XP bar */}
          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full relative ${showFlash ? "bg-white" : "bg-primary"}`}
              style={{ width: `${xpPercent}%`, transition: "width 1.5s ease-out" }}
            >
              <div className="absolute inset-0 animate-shimmer" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)", backgroundSize: "200% 100%" }} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 tabular-nums">
            {xpPercent === 100 ? "LEVEL UP!" : `${Math.round(xpPercent * 5)} / 500 XP to Level ${level + 2}`}
          </p>
        </div>

        {/* Level badges */}
        <div className="flex justify-center gap-2 flex-wrap">
          {LEVEL_TITLES.map((title, i) => (
            <span
              key={title}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-300 ${
                i <= level
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/50 text-muted-foreground border border-border"
              }`}
            >
              {title}
            </span>
          ))}
        </div>
      </div>
    </AnimatedSection>
  )
}

// ─── Onboarding Section ────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  {
    title: "Your Age Range",
    content: (
      <div className="space-y-3">
        <div className="flex gap-2">
          {["18-21", "22-25", "26-30", "31-35", "36+"].map((r) => (
            <span
              key={r}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                r === "22-25" ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/50 text-muted-foreground border-border"
              }`}
            >
              {r}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Your Region",
    content: (
      <div className="flex items-center justify-center h-24">
        <div className="relative">
          <div className="text-4xl opacity-30">🌍</div>
          <div className="absolute top-0 right-0 px-2 py-0.5 rounded-full text-xs bg-primary/15 text-primary border border-primary/30">
            Scandinavia
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Your Archetype",
    content: (
      <div className="space-y-2">
        {["The Instagram Girl", "The Intellectual", "The Party Girl"].map((a, i) => (
          <div
            key={a}
            className={`px-3 py-2 rounded-lg text-sm border ${
              i === 0 ? "bg-primary/10 text-primary border-primary/30 font-medium" : "bg-muted/30 text-muted-foreground border-border"
            }`}
          >
            {a}
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Experience Level",
    content: (
      <div className="space-y-2">
        {["Beginner", "Intermediate", "Advanced", "Expert"].map((l, i) => (
          <div
            key={l}
            className={`px-3 py-2 rounded-lg text-sm border ${
              i === 1 ? "bg-primary/10 text-primary border-primary/30 font-medium" : "bg-muted/30 text-muted-foreground border-border"
            }`}
          >
            {l}
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Primary Goal",
    content: (
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Get More Numbers", icon: TrendingUp },
          { label: "Better Conversations", icon: MessageCircle },
          { label: "Build Confidence", icon: Target },
          { label: "Go on Dates", icon: Users },
        ].map((g, i) => {
          const Icon = g.icon
          return (
            <div
              key={g.label}
              className={`px-3 py-2 rounded-lg text-xs border flex items-center gap-2 ${
                i === 0 ? "bg-primary/10 text-primary border-primary/30 font-medium" : "bg-muted/30 text-muted-foreground border-border"
              }`}
            >
              <Icon className="size-3.5" />
              {g.label}
            </div>
          )
        })}
      </div>
    ),
  },
]

function OnboardingSection() {
  const { ref, isVisible } = useIsVisible("-50px")
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!isVisible) return
    const id = setInterval(() => setStepIndex((i) => (i + 1) % ONBOARDING_STEPS.length), 2500)
    return () => clearInterval(id)
  }, [isVisible])

  const step = ONBOARDING_STEPS[stepIndex]

  return (
    <AnimatedSection>
      <div ref={ref} className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Animated carousel */}
        <div className="rounded-lg border-2 border-border bg-card shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Step {stepIndex + 1} of 5</p>
              <p className="text-xs text-primary font-medium">{Math.round(((stepIndex + 1) / 5) * 100)}%</p>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${((stepIndex + 1) / 5) * 100}%`,
                  transition: "width 0.5s ease-out",
                }}
              />
            </div>
          </div>
          <div className="p-5">
            <h3 className="font-semibold text-foreground mb-4">{step.title}</h3>
            <div className="min-h-[140px]">{step.content}</div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Personalized From Day One</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            5 steps. Your age, region, archetype, experience, and goals. We tailor scenarios, difficulty, and coaching to who you are.
          </p>
        </div>
      </div>
    </AnimatedSection>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AnimationsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-8 py-12">
        <Button asChild variant="ghost" size="sm" className="mb-8">
          <Link href="/test">
            <ArrowLeft className="size-4 mr-2" />
            Back to Test Pages
          </Link>
        </Button>

        <div className="space-y-32">
          <HeroSection />
          <VoiceChatSection />
          <GoalsSection />
          <ProgressSection />
          <CoachQASection />
          <InnerGameSection />
          <LevelSection />
          <OnboardingSection />
        </div>

        {/* Footer */}
        <div className="mt-32 pb-12 text-center">
          <p className="text-muted-foreground text-sm">
            Daygame Coach — MVP Product Review
          </p>
        </div>
      </div>
    </div>
  )
}
