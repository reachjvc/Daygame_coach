"use client"

import { useState, useCallback } from "react"
import {
  Target,
  Lock,
  Trophy,
  Flame,
  Clock,
  Plus,
  ChevronRight,
  ShieldAlert,
  Skull,
  Heart,
  Zap,
  X,
  AlertTriangle,
  CheckCircle2,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

// ─── Mock Data ──────────────────────────────────────────────────────────────

interface ActiveGoal {
  id: string
  title: string
  subtitle: string
  daysActive: number
  weeklyTarget: number
  weeklyActual: number
  streakWeeks: number
  focusScore: number
  dailyActions: boolean[] // last 7 days
}

interface QueuedGoal {
  id: string
  title: string
  reason: string
  position: number
}

interface CompletedGoal {
  id: string
  title: string
  completedDate: string
  daysToComplete: number
}

interface AbandonedGoal {
  id: string
  title: string
  abandonedDate: string
  reason: string
  daysActive: number
}

const ACTIVE_GOAL: ActiveGoal = {
  id: "active-1",
  title: "10 approaches per week",
  subtitle: "Build momentum through consistent action",
  daysActive: 23,
  weeklyTarget: 10,
  weeklyActual: 7,
  streakWeeks: 3,
  focusScore: 84,
  dailyActions: [true, true, false, true, true, true, false],
}

const QUEUED_GOALS: QueuedGoal[] = [
  {
    id: "q1",
    title: "Gym 4x/week",
    reason: "Physical confidence supports social confidence",
    position: 1,
  },
  {
    id: "q2",
    title: "Read 1 book/month",
    reason: "Expand conversation topics and depth",
    position: 2,
  },
  {
    id: "q3",
    title: "Save $500/month",
    reason: "Financial stability reduces anxiety",
    position: 3,
  },
  {
    id: "q4",
    title: "Learn cooking basics",
    reason: "Date-night hosting capability",
    position: 4,
  },
]

const COMPLETED_CHAIN: CompletedGoal[] = [
  {
    id: "c1",
    title: "Overcome approach anxiety",
    completedDate: "2024-11-15",
    daysToComplete: 45,
  },
  {
    id: "c2",
    title: "Build opening routine",
    completedDate: "2024-12-28",
    daysToComplete: 32,
  },
  {
    id: "c3",
    title: "Get first number",
    completedDate: "2025-01-10",
    daysToComplete: 13,
  },
]

const GRAVEYARD: AbandonedGoal[] = [
  {
    id: "g1",
    title: "Learn guitar",
    abandonedDate: "2024-10-05",
    reason: "Not aligned with dating goals right now",
    daysActive: 18,
  },
  {
    id: "g2",
    title: "Run a marathon",
    abandonedDate: "2024-09-20",
    reason: "Gym lifting serves me better",
    daysActive: 34,
  },
]

// ─── Sub-components ─────────────────────────────────────────────────────────

function FocusScore({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (score / 100) * circumference
  const color =
    score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-red-500"

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted/30"
        />
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-1000`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${color}`}>{score}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Focus
        </span>
      </div>
    </div>
  )
}

function DayDot({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`size-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
          active
            ? "bg-emerald-500/20 text-emerald-500 ring-2 ring-emerald-500/40"
            : "bg-muted/30 text-muted-foreground"
        }`}
      >
        {active ? <CheckCircle2 className="size-4" /> : <X className="size-3 opacity-40" />}
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}

function DominoCard({
  goal,
  index,
  isLast,
}: {
  goal: CompletedGoal
  index: number
  isLast: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex flex-col items-center">
        {/* Domino piece */}
        <div className="w-10 h-16 rounded-lg border-2 border-emerald-500/40 bg-emerald-500/10 flex flex-col items-center justify-center gap-1 shadow-sm">
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(index + 1, 3) }).map((_, i) => (
              <div key={i} className="size-1.5 rounded-full bg-emerald-500" />
            ))}
          </div>
          <div className="w-5 h-px bg-emerald-500/40" />
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(index + 2, 4) }).map((_, i) => (
              <div key={i} className="size-1.5 rounded-full bg-emerald-500/60" />
            ))}
          </div>
        </div>
        {/* Connector */}
        {!isLast && (
          <div className="w-px h-4 bg-emerald-500/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{goal.title}</p>
        <p className="text-xs text-muted-foreground">
          {goal.daysToComplete} days &middot; {goal.completedDate}
        </p>
      </div>
      <Trophy className="size-4 text-emerald-500/60 shrink-0" />
    </div>
  )
}

function GravestoneCard({ goal }: { goal: AbandonedGoal }) {
  return (
    <div className="group flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-muted/30 hover:border-muted/50 transition-colors">
      <div className="mt-0.5 rounded-md bg-muted/40 p-1.5">
        <Heart className="size-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground line-through decoration-muted-foreground/40">
          {goal.title}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5 italic">
          &ldquo;{goal.reason}&rdquo;
        </p>
        <p className="text-[10px] text-muted-foreground/50 mt-1">
          {goal.daysActive} days &middot; Let go {goal.abandonedDate}
        </p>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function VariantB() {
  const [showDistraction, setShowDistraction] = useState(false)
  const [clickedQueueGoal, setClickedQueueGoal] = useState<QueuedGoal | null>(null)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [activeSection, setActiveSection] = useState<"queue" | "chain" | "graveyard">("queue")

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const weeklyProgress = Math.round(
    (ACTIVE_GOAL.weeklyActual / ACTIVE_GOAL.weeklyTarget) * 100
  )

  const handleQueuedGoalClick = useCallback((goal: QueuedGoal) => {
    setClickedQueueGoal(goal)
    setShowDistraction(true)
  }, [])

  const handleAddGoal = useCallback(() => {
    setShowAddGoal(true)
  }, [])

  return (
    <div className="space-y-8">
      {/* ── The Domino: Active Goal ── */}
      <section className="relative">
        {/* Zen background accent */}
        <div className="absolute inset-0 -m-4 rounded-2xl bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

        <div className="relative text-center py-12 px-4">
          {/* Status pill */}
          <div className="flex justify-center mb-6">
            <Badge
              variant="outline"
              className="gap-1.5 px-3 py-1 text-xs border-primary/30 text-primary"
            >
              <Flame className="size-3" />
              {ACTIVE_GOAL.streakWeeks}-week streak
            </Badge>
          </div>

          {/* THE goal — massive typography */}
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-2">
            {ACTIVE_GOAL.title}
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
            {ACTIVE_GOAL.subtitle}
          </p>

          {/* War Room stats */}
          <div className="flex items-center justify-center gap-8 sm:gap-12 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">
                {ACTIVE_GOAL.daysActive}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                Days Active
              </div>
            </div>

            <FocusScore score={ACTIVE_GOAL.focusScore} />

            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">
                {ACTIVE_GOAL.weeklyActual}
                <span className="text-lg text-muted-foreground font-normal">
                  /{ACTIVE_GOAL.weeklyTarget}
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                This Week
              </div>
            </div>
          </div>

          {/* Weekly progress bar */}
          <div className="max-w-xs mx-auto mb-6">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>Weekly Progress</span>
              <span>{weeklyProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
                style={{ width: `${weeklyProgress}%` }}
              />
            </div>
          </div>

          {/* Daily action dots */}
          <div className="flex justify-center gap-3">
            {ACTIVE_GOAL.dailyActions.map((active, i) => (
              <DayDot key={i} active={active} label={dayLabels[i]} />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-3 mt-8">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setShowAbandonConfirm(true)}
            >
              <Skull className="size-3.5" />
              Abandon
            </Button>
            <Button
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => setShowCompleteConfirm(true)}
            >
              <Trophy className="size-3.5" />
              Mark Complete
            </Button>
          </div>
        </div>
      </section>

      {/* ── Section Tabs ── */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/30">
        {(
          [
            { key: "queue", label: "The Queue", icon: Lock, count: QUEUED_GOALS.length },
            { key: "chain", label: "Domino Chain", icon: Trophy, count: COMPLETED_CHAIN.length },
            { key: "graveyard", label: "Graveyard", icon: Heart, count: GRAVEYARD.length },
          ] as const
        ).map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
              activeSection === key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
            <span className="text-muted-foreground/60">({count})</span>
          </button>
        ))}
      </div>

      {/* ── The Queue (Locked Goals) ── */}
      {activeSection === "queue" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">
                These goals are <strong>blocked</strong> until your active goal is completed or
                abandoned.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1 shrink-0"
              onClick={handleAddGoal}
            >
              <Plus className="size-3" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {QUEUED_GOALS.map((goal) => (
              <button
                key={goal.id}
                onClick={() => handleQueuedGoalClick(goal)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-muted/40 bg-muted/10 opacity-60 hover:opacity-80 hover:border-amber-500/30 transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2 shrink-0">
                  <GripVertical className="size-3.5 text-muted-foreground/40" />
                  <div className="size-8 rounded-md bg-muted/30 flex items-center justify-center">
                    <Lock className="size-3.5 text-muted-foreground/50 group-hover:text-amber-500/70 transition-colors" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate">
                    {goal.title}
                  </p>
                  <p className="text-xs text-muted-foreground/60 truncate">
                    {goal.reason}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] shrink-0 bg-muted/30 text-muted-foreground/50"
                >
                  #{goal.position}
                </Badge>
                <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Domino Chain (Completed) ── */}
      {activeSection === "chain" && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="size-4 text-emerald-500" />
            <p className="text-xs text-muted-foreground">
              Sequential momentum &mdash; each domino knocked down the next.
            </p>
          </div>

          <Card className="border-emerald-500/20">
            <CardContent className="pt-4 space-y-2">
              {COMPLETED_CHAIN.map((goal, i) => (
                <DominoCard
                  key={goal.id}
                  goal={goal}
                  index={i}
                  isLast={i === COMPLETED_CHAIN.length - 1}
                />
              ))}

              {/* Current goal indicator at the end of the chain */}
              <div className="flex items-center gap-3 pt-2 border-t border-dashed border-primary/20">
                <div className="relative flex flex-col items-center">
                  <div className="w-10 h-16 rounded-lg border-2 border-primary/60 bg-primary/10 flex items-center justify-center shadow-sm ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                    <Target className="size-5 text-primary animate-pulse" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary">
                    {ACTIVE_GOAL.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    In progress &middot; Day {ACTIVE_GOAL.daysActive}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Chain stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <div className="text-lg font-bold text-emerald-600">
                {COMPLETED_CHAIN.length}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Dominoes Fallen
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <div className="text-lg font-bold text-emerald-600">
                {COMPLETED_CHAIN.reduce((sum, g) => sum + g.daysToComplete, 0)}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total Days
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <div className="text-lg font-bold text-emerald-600">
                {Math.round(
                  COMPLETED_CHAIN.reduce((sum, g) => sum + g.daysToComplete, 0) /
                    COMPLETED_CHAIN.length
                )}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Avg Days/Goal
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── The Graveyard ── */}
      {activeSection === "graveyard" && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="size-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Conscious abandonment is a <strong>strength</strong>, not a failure. These goals were
              released with intention.
            </p>
          </div>

          <div className="space-y-2">
            {GRAVEYARD.map((goal) => (
              <GravestoneCard key={goal.id} goal={goal} />
            ))}
          </div>

          {GRAVEYARD.length === 0 && (
            <div className="text-center py-8 text-muted-foreground/50 text-sm">
              No abandoned goals yet. That is fine too.
            </div>
          )}
        </section>
      )}

      {/* ── Anti-Distraction Shield Dialog ── */}
      <Dialog open={showDistraction} onOpenChange={setShowDistraction}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="size-5" />
              Focus Warning
            </DialogTitle>
            <DialogDescription>
              You are trying to switch to a queued goal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
              <p className="text-sm text-foreground font-medium mb-2">
                Your current goal is only{" "}
                <span className="text-amber-600 font-bold">{weeklyProgress}%</span> done this
                week.
              </p>
              <p className="text-xs text-muted-foreground">
                Switching now means resetting your {ACTIVE_GOAL.streakWeeks}-week streak and
                starting over on focus. The &ldquo;{ACTIVE_GOAL.title}&rdquo; goal has{" "}
                {ACTIVE_GOAL.daysActive} days of momentum.
              </p>
            </div>

            {clickedQueueGoal && (
              <div className="rounded-lg bg-muted/30 p-3 flex items-center gap-3">
                <Lock className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{clickedQueueGoal.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Queue position: #{clickedQueueGoal.position}
                  </p>
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-3 italic">
                &ldquo;What&apos;s the ONE Thing you can do such that by doing it everything else
                will be easier or unnecessary?&rdquo;
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setShowDistraction(false)}
                >
                  Stay Focused
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setShowDistraction(false)}
                >
                  Switch Anyway
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Goal Warning Dialog ── */}
      <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-amber-500" />
              Are You Sure?
            </DialogTitle>
            <DialogDescription>
              You already have an active goal and {QUEUED_GOALS.length} goals in the queue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-muted/30 p-4 space-y-2">
              <p className="text-sm text-foreground">
                Adding more goals dilutes your focus. Every goal you add makes every other goal
                harder to achieve.
              </p>
              <p className="text-xs text-muted-foreground">
                Before adding a new goal, consider: Is anything in your queue no longer relevant?
                Could you abandon something instead?
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Current Queue
              </p>
              {QUEUED_GOALS.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-2 text-xs text-muted-foreground py-1"
                >
                  <span className="text-muted-foreground/40">#{g.position}</span>
                  <span>{g.title}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setShowAddGoal(false)}
              >
                Nevermind
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setShowAddGoal(false)}
              >
                Add to Queue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Abandon Confirmation Dialog ── */}
      <Dialog open={showAbandonConfirm} onOpenChange={setShowAbandonConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Skull className="size-5" />
              Abandon &ldquo;{ACTIVE_GOAL.title}&rdquo;?
            </DialogTitle>
            <DialogDescription>
              This goal will move to the Graveyard. The next goal in your queue will become
              active.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-4">
              <p className="text-sm text-foreground mb-2">You will lose:</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Clock className="size-3 shrink-0" />
                  {ACTIVE_GOAL.daysActive} days of progress
                </li>
                <li className="flex items-center gap-2">
                  <Flame className="size-3 shrink-0" />
                  {ACTIVE_GOAL.streakWeeks}-week streak
                </li>
                <li className="flex items-center gap-2">
                  <Target className="size-3 shrink-0" />
                  {ACTIVE_GOAL.focusScore}% focus score
                </li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">
                Next in queue:
              </p>
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/20">
                <ArrowUp className="size-3.5 text-primary" />
                <span className="text-sm font-medium">{QUEUED_GOALS[0]?.title}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setShowAbandonConfirm(false)}
              >
                Keep Going
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setShowAbandonConfirm(false)}
              >
                Abandon Goal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Complete Confirmation Dialog ── */}
      <Dialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Trophy className="size-5" />
              Complete &ldquo;{ACTIVE_GOAL.title}&rdquo;?
            </DialogTitle>
            <DialogDescription>
              This domino falls. The next one rises.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-4">
              <p className="text-sm text-foreground mb-2">Achievement unlocked:</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Clock className="size-3 shrink-0 text-emerald-500" />
                  Completed in {ACTIVE_GOAL.daysActive} days
                </li>
                <li className="flex items-center gap-2">
                  <Flame className="size-3 shrink-0 text-emerald-500" />
                  {ACTIVE_GOAL.streakWeeks}-week streak maintained
                </li>
                <li className="flex items-center gap-2">
                  <Target className="size-3 shrink-0 text-emerald-500" />
                  Focus score: {ACTIVE_GOAL.focusScore}%
                </li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">
                Next domino in the chain:
              </p>
              <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/10">
                <ChevronRight className="size-3.5 text-primary" />
                <span className="text-sm font-medium">{QUEUED_GOALS[0]?.title}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setShowCompleteConfirm(false)}
              >
                Not Yet
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setShowCompleteConfirm(false)}
              >
                Complete &amp; Advance
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Philosophy Footer ── */}
      <div className="text-center pt-4 pb-2 border-t border-muted/20">
        <p className="text-xs text-muted-foreground/50 italic max-w-sm mx-auto">
          &ldquo;It is not that we have a short time to live, but that we waste a great deal of
          it.&rdquo; &mdash; Seneca
        </p>
      </div>
    </div>
  )
}
