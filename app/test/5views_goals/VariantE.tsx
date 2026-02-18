"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  Flame,
  Plus,
  Scale,
  ShieldCheck,
  X,
} from "lucide-react"

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

type StakeLevel = 1 | 2 | 3 | 4
type Verdict = "PASSED" | "FAILED" | "PENDING"
type VerificationMethod = "self_report" | "photo" | "voice_note" | "buddy"

interface ActiveContract {
  id: string
  title: string
  clause: string
  deliverable: string
  verification: VerificationMethod
  stakeLevel: StakeLevel
  stakeDescription: string
  stakeAmount: string
  progress: number
  target: number
  unit: string
  daysCurrent: number
  daysTotal: number
  trustScore: number
  status: "on_track" | "at_risk" | "behind"
}

interface TribunalVerdict {
  contractTitle: string
  verdict: Verdict
  summary: string
  evidence: string[]
  penalty?: string
  bonus?: string
}

interface FailurePattern {
  pattern: string
  frequency: string
}

interface TrustBreakdown {
  category: string
  score: number
  privilege: string
}

const ACTIVE_CONTRACTS: ActiveContract[] = [
  {
    id: "AC-007",
    title: "Approach Contract #7",
    clause: "The Party of the First Part (hereafter 'You') agrees to initiate no fewer than TEN (10) cold approaches within the CONTRACT PERIOD of seven (7) calendar days.",
    deliverable: "10 approaches this week, logged with voice note",
    verification: "voice_note",
    stakeLevel: 2,
    stakeDescription: "Anti-charity donation",
    stakeAmount: "$25",
    progress: 4,
    target: 10,
    unit: "approaches",
    daysCurrent: 4,
    daysTotal: 7,
    trustScore: 72,
    status: "at_risk",
  },
  {
    id: "AC-008",
    title: "Iron Temple Pact",
    clause: "The Contracting Party hereby commits to FOUR (4) verified gym sessions per week, each lasting no fewer than forty-five (45) minutes, evidenced by photographic documentation.",
    deliverable: "Gym 4x this week, photo check-in required",
    verification: "photo",
    stakeLevel: 3,
    stakeDescription: "Buddy penalty",
    stakeAmount: "$20",
    progress: 3,
    target: 4,
    unit: "sessions",
    daysCurrent: 5,
    daysTotal: 7,
    trustScore: 89,
    status: "on_track",
  },
  {
    id: "AC-009",
    title: "Digital Detox Clause",
    clause: "The Undersigned agrees to COMPLETE ABSTINENCE from pornographic material for a period of THIRTY (30) consecutive days. Accountability buddy shall conduct weekly verification.",
    deliverable: "No porn for 30 days, buddy verified",
    verification: "buddy",
    stakeLevel: 3,
    stakeDescription: "Buddy gets paid",
    stakeAmount: "$50",
    progress: 18,
    target: 30,
    unit: "days clean",
    daysCurrent: 18,
    daysTotal: 30,
    trustScore: 95,
    status: "on_track",
  },
]

const TRIBUNAL_VERDICTS: TribunalVerdict[] = [
  {
    contractTitle: "Approach Contract #6",
    verdict: "PASSED",
    summary: "The defendant EXCEEDED contractual obligations.",
    evidence: [
      "11 of 10 required approaches completed",
      "All voice notes submitted within 24h window",
      "Quality assessment: 3 conversations exceeded 5 minutes",
    ],
    bonus: "+1 Skip Credit earned for over-delivery",
  },
  {
    contractTitle: "Iron Temple Pact (Prior Week)",
    verdict: "FAILED",
    summary: "The defendant FAILED to meet minimum contractual terms.",
    evidence: [
      "3 of 4 required sessions completed",
      "Friday session: NO check-in received",
      "Defendant claimed 'too tired' — inadmissible defense",
    ],
    penalty: "$20 penalty triggered — transferred to accountability buddy",
  },
  {
    contractTitle: "Reading Contract #3",
    verdict: "PASSED",
    summary: "The defendant fulfilled all contractual requirements.",
    evidence: [
      "1 of 1 book completed: 'Models' by Mark Manson",
      "Reading log submitted with chapter summaries",
      "Completed 2 days ahead of deadline",
    ],
  },
]

const FAILURE_PATTERNS: FailurePattern[] = [
  { pattern: "Friday evening commitments fail 80% of the time", frequency: "4/5 Fridays" },
  { pattern: "Overcommitting in Week 1 of new contracts", frequency: "3/4 new contracts" },
  { pattern: "Self-reported sessions have 29% lower verification rate", frequency: "Ongoing" },
  { pattern: "Social events correlate with next-day missed sessions", frequency: "67% correlation" },
]

const TRUST_BREAKDOWN: TrustBreakdown[] = [
  { category: "Gym Sessions", score: 89, privilege: "Self-report allowed" },
  { category: "Approaches", score: 65, privilege: "Voice note required" },
  { category: "Reading", score: 92, privilege: "Self-report allowed" },
  { category: "Abstinence", score: 95, privilege: "Weekly buddy check" },
  { category: "Self-Report Accuracy", score: 71, privilege: "Under review" },
]

const STAKE_LABELS: Record<StakeLevel, { label: string; color: string }> = {
  1: { label: "LVL 1 — Public Shame", color: "text-yellow-500" },
  2: { label: "LVL 2 — Anti-Charity", color: "text-orange-500" },
  3: { label: "LVL 3 — Buddy Penalty", color: "text-red-500" },
  4: { label: "LVL 4 — Nuclear", color: "text-red-700" },
}

const VERIFICATION_LABELS: Record<VerificationMethod, string> = {
  self_report: "Self-Report",
  photo: "Photo Proof",
  voice_note: "Voice Note",
  buddy: "Buddy Verified",
}

// ─── CONTRACT CREATION FLOW ─────────────────────────────────────────────────

type CreationStep = "terms" | "stakes" | "verification" | "sign"

interface DraftContract {
  title: string
  deliverable: string
  duration: string
  stakeLevel: StakeLevel
  verification: VerificationMethod
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function getTrustColor(score: number): string {
  if (score >= 85) return "text-emerald-400"
  if (score >= 70) return "text-yellow-400"
  if (score >= 50) return "text-orange-400"
  return "text-red-400"
}

function getTrustBgColor(score: number): string {
  if (score >= 85) return "bg-emerald-500/20 border-emerald-500/30"
  if (score >= 70) return "bg-yellow-500/20 border-yellow-500/30"
  if (score >= 50) return "bg-orange-500/20 border-orange-500/30"
  return "bg-red-500/20 border-red-500/30"
}

function getStatusBadge(status: ActiveContract["status"]) {
  switch (status) {
    case "on_track":
      return <Badge className="bg-emerald-900/50 text-emerald-300 border-emerald-700 font-mono text-[10px]">ON TRACK</Badge>
    case "at_risk":
      return <Badge className="bg-amber-900/50 text-amber-300 border-amber-700 font-mono text-[10px]">AT RISK</Badge>
    case "behind":
      return <Badge className="bg-red-900/50 text-red-300 border-red-700 font-mono text-[10px]">BEHIND</Badge>
  }
}

function getVerdictStyle(verdict: Verdict) {
  switch (verdict) {
    case "PASSED":
      return "text-emerald-400 border-emerald-600 bg-emerald-950/50"
    case "FAILED":
      return "text-red-400 border-red-600 bg-red-950/50"
    case "PENDING":
      return "text-yellow-400 border-yellow-600 bg-yellow-950/50"
  }
}

function ProgressBar({ current, total, status }: { current: number; total: number; status: ActiveContract["status"] }) {
  const pct = Math.min(100, Math.round((current / total) * 100))
  const barColor =
    status === "on_track" ? "bg-emerald-500" :
    status === "at_risk" ? "bg-amber-500" :
    "bg-red-500"

  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
        <span>{current}/{total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-sm overflow-hidden border border-zinc-700">
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function TrustScoreGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-800" />
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={getTrustColor(score)}
          stroke="currentColor"
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold font-mono ${getTrustColor(score)}`}>{score}</span>
        <span className="text-[10px] font-mono text-muted-foreground tracking-widest">TRUST</span>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

type TabId = "contracts" | "tribunal" | "record" | "trust"

export default function VariantE() {
  const [activeTab, setActiveTab] = useState<TabId>("contracts")
  const [expandedContract, setExpandedContract] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creationStep, setCreationStep] = useState<CreationStep>("terms")
  const [draft, setDraft] = useState<DraftContract>({
    title: "",
    deliverable: "",
    duration: "7 days",
    stakeLevel: 1,
    verification: "self_report",
  })
  const [signed, setSigned] = useState(false)

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "contracts", label: "ACTIVE CONTRACTS", count: ACTIVE_CONTRACTS.length },
    { id: "tribunal", label: "THE TRIBUNAL", count: TRIBUNAL_VERDICTS.length },
    { id: "record", label: "FAILURE RECORD" },
    { id: "trust", label: "TRUST SCORE" },
  ]

  function resetCreation() {
    setCreationStep("terms")
    setDraft({ title: "", deliverable: "", duration: "7 days", stakeLevel: 1, verification: "self_report" })
    setSigned(false)
  }

  // ── RENDER: Active Contracts ──────────────────────────────────────────────

  function renderContracts() {
    return (
      <div className="space-y-3">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="size-4 text-zinc-400" />
            <span className="text-xs font-mono text-zinc-400 tracking-wider">
              {ACTIVE_CONTRACTS.length} BINDING AGREEMENT{ACTIVE_CONTRACTS.length !== 1 ? "S" : ""} IN EFFECT
            </span>
          </div>
          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreation() }}>
            <DialogTrigger asChild>
              <Button size="sm" className="font-mono text-xs gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200">
                <Plus className="size-3" />
                NEW CONTRACT
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg bg-zinc-950 border-zinc-700">
              <DialogHeader>
                <DialogTitle className="font-mono text-sm tracking-wider text-zinc-300">
                  {creationStep === "terms" && "SECTION I: TERMS & DELIVERABLES"}
                  {creationStep === "stakes" && "SECTION II: STAKES & CONSEQUENCES"}
                  {creationStep === "verification" && "SECTION III: VERIFICATION METHOD"}
                  {creationStep === "sign" && "SECTION IV: BINDING SIGNATURE"}
                </DialogTitle>
              </DialogHeader>
              {renderCreationFlow()}
            </DialogContent>
          </Dialog>
        </div>

        {/* Contract cards */}
        {ACTIVE_CONTRACTS.map((c) => {
          const isExpanded = expandedContract === c.id
          return (
            <Card
              key={c.id}
              className="bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] text-zinc-500">{c.id}</span>
                      {getStatusBadge(c.status)}
                    </div>
                    <CardTitle className="text-base font-semibold">{c.title}</CardTitle>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-lg font-bold font-mono ${STAKE_LABELS[c.stakeLevel].color}`}>
                      {c.stakeAmount}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      {STAKE_LABELS[c.stakeLevel].label}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Progress */}
                <ProgressBar current={c.progress} total={c.target} status={c.status} />

                {/* Timeline */}
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span>Day {c.daysCurrent} of {c.daysTotal}</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="size-3" />
                    Trust: <span className={getTrustColor(c.trustScore)}>{c.trustScore}%</span>
                  </span>
                </div>

                {/* Expandable clause */}
                <button
                  onClick={() => setExpandedContract(isExpanded ? null : c.id)}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                  <span className="font-mono tracking-wide">VIEW FULL CONTRACT</span>
                </button>

                {isExpanded && (
                  <div className="border border-zinc-800 rounded bg-zinc-900/50 p-3 space-y-2">
                    <p className="text-xs text-zinc-400 leading-relaxed font-serif italic">
                      &ldquo;{c.clause}&rdquo;
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                      <div>
                        <span className="text-[10px] font-mono text-zinc-600 block">DELIVERABLE</span>
                        <span className="text-[11px] text-zinc-300">{c.deliverable}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-zinc-600 block">VERIFICATION</span>
                        <span className="text-[11px] text-zinc-300">
                          <Eye className="size-3 inline mr-1" />
                          {VERIFICATION_LABELS[c.verification]}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // ── RENDER: The Tribunal ──────────────────────────────────────────────────

  function renderTribunal() {
    return (
      <div className="space-y-4">
        <div className="text-center border border-zinc-800 rounded bg-zinc-950 py-4 mb-4">
          <Scale className="size-6 mx-auto text-zinc-400 mb-2" />
          <h3 className="font-mono text-sm tracking-[0.2em] text-zinc-300">THE WEEKLY TRIBUNAL</h3>
          <p className="text-[11px] text-zinc-500 font-mono mt-1">Week of Feb 10 &mdash; Feb 16, 2026</p>
        </div>

        {TRIBUNAL_VERDICTS.map((v, i) => (
          <Card key={i} className="bg-zinc-950 border-zinc-800">
            <CardContent className="pt-4 space-y-3">
              {/* Verdict header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-600 block mb-1">CASE #{String(i + 1).padStart(3, "0")}</span>
                  <span className="text-sm font-semibold">{v.contractTitle}</span>
                </div>
                <div className={`px-3 py-1 border rounded font-mono text-xs font-bold tracking-wider ${getVerdictStyle(v.verdict)}`}>
                  {v.verdict}
                </div>
              </div>

              {/* Summary */}
              <p className="text-xs text-zinc-400 font-serif italic border-l-2 border-zinc-700 pl-3">
                {v.summary}
              </p>

              {/* Evidence */}
              <div>
                <span className="text-[10px] font-mono text-zinc-600 tracking-wider block mb-1.5">EVIDENCE PRESENTED</span>
                <ul className="space-y-1">
                  {v.evidence.map((e, ei) => (
                    <li key={ei} className="flex items-start gap-2 text-[11px] text-zinc-400">
                      <span className="text-zinc-600 mt-0.5 shrink-0 font-mono">{String(ei + 1).padStart(2, "0")}.</span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Penalty or bonus */}
              {v.penalty && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded px-3 py-2">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span className="font-mono">{v.penalty}</span>
                </div>
              )}
              {v.bonus && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded px-3 py-2">
                  <Check className="size-3.5 shrink-0" />
                  <span className="font-mono">{v.bonus}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // ── RENDER: Failure Record ────────────────────────────────────────────────

  function renderFailureRecord() {
    const total = 24
    const passed = 18
    const failed = 6
    const successRate = Math.round((passed / total) * 100)
    const skipCredits = 2

    return (
      <div className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "TOTAL", value: total, color: "text-zinc-300" },
            { label: "PASSED", value: passed, color: "text-emerald-400" },
            { label: "FAILED", value: failed, color: "text-red-400" },
            { label: "RATE", value: `${successRate}%`, color: successRate >= 75 ? "text-emerald-400" : "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="text-center border border-zinc-800 rounded bg-zinc-950 py-3">
              <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] font-mono text-zinc-600 tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Skip credits */}
        <div className="flex items-center justify-between border border-zinc-800 rounded bg-zinc-950 px-4 py-3">
          <div className="flex items-center gap-2">
            <Flame className="size-4 text-amber-500" />
            <span className="text-xs font-mono text-zinc-400">SKIP CREDITS AVAILABLE</span>
          </div>
          <span className="text-sm font-bold font-mono text-amber-400">{skipCredits}</span>
        </div>

        {/* Failure timeline (visual) */}
        <div>
          <span className="text-[10px] font-mono text-zinc-600 tracking-wider block mb-2">
            CONTRACT HISTORY (LAST 24)
          </span>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: total }, (_, i) => {
              const didPass = i < 5 || (i >= 6 && i < 9) || (i >= 10 && i < 14) || (i >= 15 && i < 18) || i >= 19
              return (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-sm border text-[9px] font-mono flex items-center justify-center ${
                    didPass
                      ? "bg-emerald-950/50 border-emerald-800 text-emerald-500"
                      : "bg-red-950/50 border-red-800 text-red-500"
                  }`}
                  title={`Contract #${i + 1}: ${didPass ? "PASSED" : "FAILED"}`}
                >
                  {didPass ? <Check className="size-2.5" /> : <X className="size-2.5" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Detected patterns */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono tracking-wider text-zinc-400 flex items-center gap-2">
              <AlertTriangle className="size-3.5 text-amber-500" />
              DETECTED FAILURE PATTERNS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {FAILURE_PATTERNS.map((p, i) => (
                <div key={i} className="flex items-start justify-between gap-4 py-2 border-b border-zinc-900 last:border-0">
                  <span className="text-xs text-zinc-400">{p.pattern}</span>
                  <Badge variant="outline" className="shrink-0 text-[10px] font-mono border-zinc-700 text-zinc-500">
                    {p.frequency}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cold insight */}
        <div className="border border-zinc-800 rounded bg-zinc-900/30 p-4">
          <p className="text-xs text-zinc-500 font-mono leading-relaxed">
            <span className="text-zinc-400 font-bold">SYSTEM NOTE:</span> Your data shows a clear pattern of Friday evening failures
            and first-week overcommitment. The Tribunal recommends: (1) avoid scheduling commitments
            on Friday evenings, (2) start new contracts at 60% of intended difficulty, scale up in week 2.
            Your excuses are statistically predictable. The system has heard them before.
          </p>
        </div>
      </div>
    )
  }

  // ── RENDER: Trust Score ───────────────────────────────────────────────────

  function renderTrustScore() {
    const overallScore = 78

    return (
      <div className="space-y-4">
        {/* Main gauge */}
        <div className="flex flex-col items-center border border-zinc-800 rounded bg-zinc-950 py-6">
          <TrustScoreGauge score={overallScore} />
          <p className="text-[11px] text-zinc-500 font-mono mt-3 tracking-wider">COMPOSITE TRUST RATING</p>
          <p className="text-[10px] text-zinc-600 mt-1">
            {overallScore >= 85 ? "HIGH TRUST — Self-report privileges granted" :
             overallScore >= 70 ? "MODERATE TRUST — Additional verification may apply" :
             overallScore >= 50 ? "LOW TRUST — Mandatory external verification" :
             "CRITICAL — All contracts require buddy verification"}
          </p>
        </div>

        {/* Category breakdown */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono tracking-wider text-zinc-400">
              TRUST BREAKDOWN BY CATEGORY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {TRUST_BREAKDOWN.map((t) => (
                <div key={t.category} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-300">{t.category}</span>
                    <span className={`text-xs font-mono font-bold ${getTrustColor(t.score)}`}>{t.score}/100</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-sm overflow-hidden">
                      <div
                        className={`h-full rounded-sm ${
                          t.score >= 85 ? "bg-emerald-500" :
                          t.score >= 70 ? "bg-yellow-500" :
                          t.score >= 50 ? "bg-orange-500" :
                          "bg-red-500"
                        }`}
                        style={{ width: `${t.score}%` }}
                      />
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono shrink-0 border-zinc-700 ${
                        t.score >= 85 ? "text-emerald-400" : "text-zinc-500"
                      }`}
                    >
                      {t.privilege}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trust rules */}
        <div className="border border-zinc-800 rounded bg-zinc-900/30 p-4 space-y-2">
          <h4 className="text-[11px] font-mono text-zinc-400 tracking-wider flex items-center gap-2">
            <ShieldCheck className="size-3.5" />
            TRUST PROTOCOL
          </h4>
          <ul className="space-y-1.5">
            {[
              "Score above 85 in a category: Self-report accepted",
              "Score 70-84: Requires one form of evidence",
              "Score 50-69: Requires photo or voice note proof",
              "Score below 50: Mandatory buddy verification on all contracts",
              "Caught lying on self-report: -15 points, 30-day probation",
              "Consecutive over-delivery: +3 points per streak week",
            ].map((rule, i) => (
              <li key={i} className="text-[11px] text-zinc-500 flex items-start gap-2">
                <span className="text-zinc-700 font-mono shrink-0">{String.fromCharCode(167)}{i + 1}</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  // ── RENDER: Contract Creation Flow ────────────────────────────────────────

  function renderCreationFlow() {
    const stepIndicator = (
      <div className="flex items-center gap-1 mb-4">
        {(["terms", "stakes", "verification", "sign"] as CreationStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-mono border ${
              s === creationStep
                ? "bg-zinc-700 border-zinc-500 text-zinc-200"
                : (["terms", "stakes", "verification", "sign"].indexOf(creationStep) > i
                  ? "bg-emerald-950 border-emerald-700 text-emerald-400"
                  : "bg-zinc-900 border-zinc-800 text-zinc-600")
            }`}>
              {["terms", "stakes", "verification", "sign"].indexOf(creationStep) > i ? (
                <Check className="size-3" />
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && <div className="w-6 h-px bg-zinc-800" />}
          </div>
        ))}
      </div>
    )

    if (creationStep === "terms") {
      return (
        <div className="space-y-4">
          {stepIndicator}
          <div className="border border-zinc-800 rounded p-3 bg-zinc-900/30">
            <p className="text-[10px] font-mono text-zinc-600 mb-3 tracking-wider">
              WHEREAS, the Party of the First Part desires to enter into a binding commitment...
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-zinc-500 block mb-1">CONTRACT TITLE</label>
                <input
                  type="text"
                  placeholder='e.g., "Morning Warrior Pact"'
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 font-mono focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-zinc-500 block mb-1">SPECIFIC DELIVERABLE</label>
                <input
                  type="text"
                  placeholder='e.g., "5 gym sessions, 45 min minimum each"'
                  value={draft.deliverable}
                  onChange={(e) => setDraft({ ...draft, deliverable: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 font-mono focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-zinc-500 block mb-1">CONTRACT DURATION</label>
                <div className="flex gap-2">
                  {["7 days", "14 days", "30 days"].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDraft({ ...draft, duration: d })}
                      className={`flex-1 py-2 rounded border text-xs font-mono transition-colors cursor-pointer ${
                        draft.duration === d
                          ? "bg-zinc-700 border-zinc-500 text-zinc-200"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setCreationStep("stakes")}
            disabled={!draft.title || !draft.deliverable}
            className="w-full font-mono text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
          >
            PROCEED TO STAKES
          </Button>
        </div>
      )
    }

    if (creationStep === "stakes") {
      return (
        <div className="space-y-4">
          {stepIndicator}
          <div className="border border-zinc-800 rounded p-3 bg-zinc-900/30">
            <p className="text-[10px] font-mono text-zinc-600 mb-3 tracking-wider">
              SELECT THE CONSEQUENCES OF NON-COMPLIANCE:
            </p>
            <div className="space-y-2">
              {([1, 2, 3, 4] as StakeLevel[]).map((level) => {
                const { label, color } = STAKE_LABELS[level]
                const descriptions: Record<StakeLevel, string> = {
                  1: "Your failure is posted publicly. Everyone sees.",
                  2: "Money goes to a cause you despise. Pain is the point.",
                  3: "Your buddy gets paid when you fail. Skin in their game too.",
                  4: "Custom nuclear option. You define the punishment.",
                }
                return (
                  <button
                    key={level}
                    onClick={() => setDraft({ ...draft, stakeLevel: level })}
                    className={`w-full text-left p-3 rounded border transition-colors cursor-pointer ${
                      draft.stakeLevel === level
                        ? "bg-zinc-800 border-zinc-600"
                        : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-bold ${color}`}>{label}</span>
                      {draft.stakeLevel === level && <Check className="size-3 text-zinc-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">{descriptions[level]}</p>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCreationStep("terms")}
              className="flex-1 font-mono text-xs border-zinc-700 text-zinc-400"
            >
              BACK
            </Button>
            <Button
              onClick={() => setCreationStep("verification")}
              className="flex-1 font-mono text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
            >
              SET VERIFICATION
            </Button>
          </div>
        </div>
      )
    }

    if (creationStep === "verification") {
      const verificationOptions: { method: VerificationMethod; label: string; description: string; trustRequired: number }[] = [
        { method: "self_report", label: "Self-Report", description: "You mark it done. Requires trust score above 85.", trustRequired: 85 },
        { method: "photo", label: "Photo Proof", description: "Upload photographic evidence within 24h window.", trustRequired: 50 },
        { method: "voice_note", label: "Voice Note", description: "Record a voice note describing what you did.", trustRequired: 65 },
        { method: "buddy", label: "Buddy Verification", description: "An accountability partner confirms completion.", trustRequired: 0 },
      ]

      return (
        <div className="space-y-4">
          {stepIndicator}
          <div className="border border-zinc-800 rounded p-3 bg-zinc-900/30">
            <p className="text-[10px] font-mono text-zinc-600 mb-3 tracking-wider">
              HOW SHALL COMPLIANCE BE VERIFIED?
            </p>
            <div className="space-y-2">
              {verificationOptions.map((v) => {
                const trustOk = 78 >= v.trustRequired
                return (
                  <button
                    key={v.method}
                    onClick={() => trustOk && setDraft({ ...draft, verification: v.method })}
                    disabled={!trustOk}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      !trustOk
                        ? "bg-zinc-900/30 border-zinc-900 opacity-50 cursor-not-allowed"
                        : draft.verification === v.method
                          ? "bg-zinc-800 border-zinc-600 cursor-pointer"
                          : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-300">{v.label}</span>
                      <div className="flex items-center gap-2">
                        {!trustOk && (
                          <span className="text-[9px] font-mono text-red-500">TRUST {v.trustRequired}+ REQ</span>
                        )}
                        {draft.verification === v.method && trustOk && <Check className="size-3 text-zinc-400" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">{v.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCreationStep("stakes")}
              className="flex-1 font-mono text-xs border-zinc-700 text-zinc-400"
            >
              BACK
            </Button>
            <Button
              onClick={() => setCreationStep("sign")}
              className="flex-1 font-mono text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
            >
              REVIEW & SIGN
            </Button>
          </div>
        </div>
      )
    }

    // Sign step
    return (
      <div className="space-y-4">
        {stepIndicator}
        {!signed ? (
          <>
            <ScrollArea className="h-64">
              <div className="border border-zinc-800 rounded bg-zinc-900/30 p-4 space-y-3">
                <div className="text-center border-b border-zinc-800 pb-3">
                  <h4 className="font-mono text-xs tracking-[0.15em] text-zinc-300">COMMITMENT CONTRACT</h4>
                  <p className="text-[10px] text-zinc-600 font-mono mt-1">EFFECTIVE IMMEDIATELY UPON SIGNATURE</p>
                </div>
                <div className="space-y-2 text-[11px] text-zinc-400 leading-relaxed">
                  <p>
                    <span className="font-mono text-zinc-600">1. </span>
                    The Contracting Party (&ldquo;You&rdquo;) hereby commits to the following deliverable:
                    <span className="text-zinc-200 font-semibold"> {draft.deliverable || "[NOT SPECIFIED]"}</span>
                  </p>
                  <p>
                    <span className="font-mono text-zinc-600">2. </span>
                    This contract shall remain in effect for a period of
                    <span className="text-zinc-200 font-semibold"> {draft.duration}</span>,
                    commencing on the date of signature.
                  </p>
                  <p>
                    <span className="font-mono text-zinc-600">3. </span>
                    Failure to meet the stated deliverable shall result in the activation of
                    <span className={`font-semibold ${STAKE_LABELS[draft.stakeLevel].color}`}> {STAKE_LABELS[draft.stakeLevel].label}</span> consequences.
                  </p>
                  <p>
                    <span className="font-mono text-zinc-600">4. </span>
                    Compliance shall be verified by:
                    <span className="text-zinc-200 font-semibold"> {VERIFICATION_LABELS[draft.verification]}</span>.
                    Failure to provide verification within the prescribed window shall be treated as non-compliance.
                  </p>
                  <p>
                    <span className="font-mono text-zinc-600">5. </span>
                    No modifications to this contract shall be permitted after signature.
                    The Contracting Party acknowledges that excuses including but not limited to
                    &ldquo;I was tired,&rdquo; &ldquo;something came up,&rdquo; and &ldquo;I forgot&rdquo;
                    are explicitly inadmissible.
                  </p>
                  <p>
                    <span className="font-mono text-zinc-600">6. </span>
                    By signing below, the Contracting Party affirms full understanding of the terms,
                    consequences, and the irrevocable nature of this commitment.
                  </p>
                </div>
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCreationStep("verification")}
                className="flex-1 font-mono text-xs border-zinc-700 text-zinc-400"
              >
                BACK
              </Button>
              <Button
                onClick={() => setSigned(true)}
                disabled={!draft.title || !draft.deliverable}
                className="flex-1 font-mono text-xs bg-red-900/80 hover:bg-red-800 border border-red-700 text-red-200"
              >
                I SIGN THIS CONTRACT
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center space-y-3 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-700 flex items-center justify-center mx-auto">
              <Check className="size-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-mono text-sm text-zinc-200 tracking-wider">CONTRACT EXECUTED</h4>
              <p className="text-[11px] text-zinc-500 font-mono mt-1">
                &ldquo;{draft.title}&rdquo; is now legally binding.
              </p>
            </div>
            <div className={`inline-block px-3 py-1.5 rounded border ${getTrustBgColor(78)}`}>
              <span className="text-[10px] font-mono text-zinc-400">
                TRUST IMPACT: No change (new contract)
              </span>
            </div>
            <p className="text-[10px] text-zinc-600 font-mono">
              The clock starts now. No backsies.
            </p>
            <Button
              onClick={() => { setCreateOpen(false); resetCreation() }}
              className="font-mono text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
            >
              CLOSE
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Title plate */}
      <div className="border border-zinc-800 rounded bg-zinc-950 p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="h-px flex-1 bg-zinc-800" />
          <Scale className="size-5 text-zinc-500" />
          <div className="h-px flex-1 bg-zinc-800" />
        </div>
        <h2 className="font-mono text-sm tracking-[0.25em] text-zinc-300 mt-2">
          COMMITMENT CONTRACT SYSTEM
        </h2>
        <p className="text-[11px] text-zinc-600 font-mono mt-1">
          Pre-commitment with consequences. No coddling. Binary outcomes.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex border border-zinc-800 rounded overflow-hidden bg-zinc-950">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-[10px] font-mono tracking-wider transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "bg-zinc-800 text-zinc-200 border-b-2 border-zinc-400"
                : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1 text-zinc-500">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "contracts" && renderContracts()}
        {activeTab === "tribunal" && renderTribunal()}
        {activeTab === "record" && renderFailureRecord()}
        {activeTab === "trust" && renderTrustScore()}
      </div>

      {/* Footer warning */}
      <div className="text-center py-3 border-t border-zinc-800">
        <p className="text-[10px] font-mono text-zinc-700 tracking-wider">
          SYSTEM v0.7 &mdash; CONTRACTS ARE SIMULATED &mdash; NO REAL MONEY IS AT STAKE (YET)
        </p>
      </div>
    </div>
  )
}
