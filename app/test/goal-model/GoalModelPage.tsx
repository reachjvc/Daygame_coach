"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, MessageCircle, AlertTriangle, Activity, Brain, Battery, Zap, Trophy, Flame, Crown, PartyPopper, ArrowRight, Gift, Star, ShieldCheck, TrendingUp, Check, X as XIcon, HelpCircle } from "lucide-react"

// ─── Data Types ───────────────────────────────────────────────────────────────

type TreeNode = {
  label: string
  children?: TreeNode[]
}

type DebateEntry = {
  speaker: string
  role: string
  avatar: string
  message: string
  stance: "agree" | "disagree" | "nuance" | "pass" | "concede"
  replyTo?: string
  phase?: "opening" | "cross-exam"
}

type TermStatus = "strong" | "warning" | "bottleneck" | "expected-low"

type FormulaTermData = {
  label: string
  value: number
  status: TermStatus
  diagnostic: string
  phaseWeight: string
}

type DomainMapping = {
  domain: string
  goal: string
  phase: string
  inputRate: { label: string; value: string }
  skillLeverage: { label: string; value: string }
  recovery: { label: string; value: string }
}

// ─── Goal Tree Data ───────────────────────────────────────────────────────────

const goalTree: TreeNode = {
  label: "Lose 20 Pounds",
  children: [
    {
      label: "Diet",
      children: [
        { label: "Track macros daily" },
        { label: "Meal prep weekly" },
        { label: "Cut processed sugar" },
      ],
    },
    {
      label: "Exercise",
      children: [
        { label: "Cardio 4x/week" },
        { label: "Strength 3x/week" },
        { label: "Walk 10k steps/day" },
      ],
    },
    {
      label: "Recovery",
      children: [
        { label: "Sleep 8 hours" },
        { label: "Manage stress" },
        { label: "Scheduled rest days" },
      ],
    },
  ],
}

const daygameTree: TreeNode = {
  label: "Get a Girlfriend",
  children: [
    {
      label: "Field Work",
      children: [
        { label: "20 approaches/week" },
        { label: "3 sessions/week" },
        { label: "Solo sessions" },
      ],
    },
    {
      label: "Social Skills",
      children: [
        { label: "Eye contact holds" },
        { label: "Conversation threading" },
        { label: "Phone number closes" },
      ],
    },
    {
      label: "Dating",
      children: [
        { label: "Instant dates" },
        { label: "Date leadership" },
        { label: "Escalation comfort" },
      ],
    },
  ],
}

// ─── Formula Mock Data ───────────────────────────────────────────────────────

const mockFormulaTerms: FormulaTermData[] = [
  {
    label: "Input Rate",
    value: 0.6,
    status: "warning",
    diagnostic: "3 sessions this week vs 5 target",
    phaseWeight: "1.5\u00D7",
  },
  {
    label: "Skill Leverage",
    value: 0.4,
    status: "expected-low",
    diagnostic: "Expected during acquisition \u2014 keep training",
    phaseWeight: "0.5\u00D7",
  },
  {
    label: "Recovery",
    value: 0.9,
    status: "strong",
    diagnostic: "Consistent sleep, no burnout signals",
    phaseWeight: "1.0\u00D7",
  },
]

const domainMappings: DomainMapping[] = [
  {
    domain: "Fitness",
    goal: "Lose 20 Pounds",
    phase: "Acquisition",
    inputRate: { label: "Training sessions/week", value: "4/5" },
    skillLeverage: { label: "Diet adherence rate", value: "62%" },
    recovery: { label: "Sleep quality", value: "7.2h avg" },
  },
  {
    domain: "Daygame",
    goal: "Get a Girlfriend",
    phase: "Acquisition",
    inputRate: { label: "Approaches/week", value: "8/15" },
    skillLeverage: { label: "Conversation conversion", value: "25%" },
    recovery: { label: "Social energy", value: "Good" },
  },
]

const phaseWeights = [
  {
    phase: "Acquisition",
    inputRate: "1.5\u00D7",
    skillLeverage: "0.5\u00D7",
    recovery: "1.0\u00D7",
    note: "Volume is king. Skill leverage expected low.",
    active: true,
  },
  {
    phase: "Consolidation",
    inputRate: "1.0\u00D7",
    skillLeverage: "1.5\u00D7",
    recovery: "1.0\u00D7+",
    note: "Quality over quantity. Stress-test under varied conditions.",
    active: false,
  },
  {
    phase: "Graduated",
    inputRate: "0.5\u00D7",
    skillLeverage: "1.0\u00D7",
    recovery: "1.5\u00D7",
    note: "Maintain baseline. Recovery sustains the system.",
    active: false,
  },
]

// ─── Debate Data (SMAD Protocol #2 — Formula Debate, Feb 2026) ──────────────

const debateEntries: DebateEntry[] = [
  // ── Opening Statements (Phase 1) ──
  {
    speaker: "Tony Robbins",
    role: "Life Coach (Emotional/Motivational Lens)",
    avatar: "\u{1F525}",
    stance: "nuance",
    phase: "opening",
    message:
      "The formula is missing the most important variable in human performance. The single greatest predictor of whether someone loses 20 pounds or gets a girlfriend isn\u2019t their diet macros or approach count \u2014 it\u2019s their identity. Do they see themselves as someone who IS fit? Action flows from identity. Any formula that omits emotional state will produce accurate predictions in spreadsheets and catastrophic failures in real life. The Will Gate is essentially a motivation proxy \u2014 you\u2019re measuring the output of motivation, not modeling it. Bottleneck detection should be the centerpiece of visualization, not buried in computation.",
  },
  {
    speaker: "Alex Hormozi",
    role: "Entrepreneur (ROI/Leverage Lens)",
    avatar: "\u{1F4C8}",
    stance: "disagree",
    phase: "opening",
    message:
      "Goal Achievement = Action + Skills is wrong. Additive means you can compensate for zero skill with infinite action. That\u2019s not reality. Achievement = Constraint \u00D7 (Action \u00D7 Skill), where Constraint is a multiplier between 0 and 1 representing how unclogged your critical path is. Fix the constraint and you get multiplicative gains everywhere. The WillGate gates diagnostics, withholding feedback from beginners \u2014 that\u2019s backwards. Beginners need the most diagnostic signal.",
  },
  {
    speaker: "David Goggins",
    role: "Discipline (Willpower/Volume Lens)",
    avatar: "\u{1F480}",
    stance: "disagree",
    phase: "opening",
    message:
      "Achievement = Action \u00D7 Skill Execution. If action is zero, the whole product is zero. No exceptions. No partial credit. The bottleneck detection needs to distinguish between a willpower bottleneck and a competence bottleneck. A man not losing weight because he trains 2x/week needs discipline, not technique advice. The visualization must show the user their specific failure point.",
  },
  {
    speaker: "Jake",
    role: "Natural Game (Field Experience Lens)",
    avatar: "\u{1F60E}",
    stance: "disagree",
    phase: "opening",
    message:
      "Action and Skills aren\u2019t separate inputs you sum \u2014 they\u2019re entangled. The guy doing 5 quality approaches with solid eye contact outperforms the guy doing 20 mechanical ones. The relationship is multiplicative: f(Action) \u00D7 f(Skills). Skills aren\u2019t a stockpile \u2014 they\u2019re a state. Your vibe, social momentum, reference points from last week \u2014 these decay. A graduated skill isn\u2019t worth its full weight if you haven\u2019t used it in three weeks.",
  },
  {
    speaker: "Marco",
    role: "Structured Game (Systems Thinker Lens)",
    avatar: "\u{1F3AD}",
    stance: "nuance",
    phase: "opening",
    message:
      "The formula conflates process with outcome. What we want isn\u2019t calculating achievement \u2014 it\u2019s predicting trajectory. Progress Velocity = f(Input Rate, Skill Leverage, Recovery Capacity). Volume without skill leverage produces diminishing returns. Recovery acts as a ceiling constraint. This generalizes cleanly: for fitness, input rate is caloric deficit consistency, skill leverage is nutritional knowledge, recovery limits training load. For daygame, input rate is approaches/week, skill leverage is conversation quality, social recovery limits sustainable output.",
  },
  {
    speaker: "Robert",
    role: "Family Man (Maintenance Perspective Lens)",
    avatar: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}",
    stance: "nuance",
    phase: "opening",
    message:
      "The formula treats achievement as a destination rather than a system that has to keep running. The additive structure is wrong \u2014 multiplicative is correct. But the current system has graduation lifecycle with no maintenance state. \u2018Lose 20 pounds\u2019 doesn\u2019t end when you hit the number \u2014 that\u2019s where it begins. Without a maintenance phase with its own leading indicators, the framework optimizes for hitting the line and walks away. The will gate threshold is a pure acquisition metric \u2014 it should be phase-aware.",
  },
  {
    speaker: "Angela",
    role: "Olympic Swimmer (Athletic Performance Lens)",
    avatar: "\u{1F3CA}\u200D\u2640\uFE0F",
    stance: "nuance",
    phase: "opening",
    message:
      "The formula conflates input quality with output. What\u2019s missing is a time-dependency term. In periodized training, the same action produces radically different adaptations depending on training phase. The formula must account for phase \u2014 the existing graduation lifecycle should be exposed explicitly. Recovery is the mechanism by which adaptation happens \u2014 you improve during recovery, not during training. Universal formulas risk being universally useless \u2014 the visualization should show the formula instantiated with real user data, not abstract algebra.",
  },
  {
    speaker: "Chris",
    role: "Tech CEO (Systems Architecture Lens)",
    avatar: "\u{1F4BB}",
    stance: "nuance",
    phase: "opening",
    message:
      "The formula isn\u2019t wrong \u2014 it\u2019s not operational. It doesn\u2019t compute against real data. The multiplicative structure for Action is correct but incomplete: leading and lagging indicators aren\u2019t the same kind of action. Skills weights can\u2019t be static \u2014 they should derive from the bottleneck computation dynamically. You don\u2019t need a new formula widget \u2014 expose the systems you\u2019ve already built: pacingRatio, willGate status, bottleneck identification. Those are computed today and invisible to the user.",
  },

  // ── Cross-Examination (Phase 3) ──
  {
    speaker: "Alex Hormozi",
    role: "Entrepreneur (ROI/Leverage Lens)",
    avatar: "\u{1F4C8}",
    stance: "nuance",
    phase: "cross-exam",
    replyTo: "Marco",
    message:
      "Marco\u2019s Recovery and my Constraint overlap but aren\u2019t the same thing. Recovery is one specific constraint. Low input rate can come from scheduling, geography, or approach anxiety \u2014 not just burnout. Marco\u2019s model conflates the output of the constraint with the constraint itself. BUT \u2014 I\u2019ll concede Marco\u2019s three-term structure is more intuitive for visualization. The right answer: Marco\u2019s three terms as the display layer, constraint identification as the computation underneath. Show Input Rate \u00D7 Skill Leverage \u00D7 Recovery. Run the constraint engine to tell them WHY Input Rate is low.",
  },
  {
    speaker: "Marco",
    role: "Structured Game (Systems Thinker Lens)",
    avatar: "\u{1F3AD}",
    stance: "agree",
    phase: "cross-exam",
    replyTo: "Hormozi",
    message:
      "Hormozi\u2019s synthesis is correct. My model does NOT distinguish root causes on its own \u2014 \u2018Input Rate is declining\u2019 is useful signal but incomplete diagnosis. A declining rate from burnout requires rest, from scheduling requires calendar restructuring, from approach anxiety requires exposure protocols. Same display number, three different fixes. My model produces the WHAT (which term is low). Hormozi\u2019s produces the WHY. Keep constraint taxonomy per-term, not as a global multiplier.",
  },
  {
    speaker: "David Goggins",
    role: "Discipline (Willpower/Volume Lens)",
    avatar: "\u{1F480}",
    stance: "concede",
    phase: "cross-exam",
    replyTo: "Marco, Hormozi",
    message:
      "Willpower lives in Input Rate. Full stop. When a guy doesn\u2019t show up, that\u2019s not a skill problem or a recovery problem. I accept the three-term framework with one demand: Input Rate diagnostics must separate willpower failure from legitimate fatigue. Otherwise you\u2019ve built a beautiful dashboard that lets soft people feel justified. \u2018Recovery\u2019 is a comfortable lie for quitting. The system must tell them apart.",
  },
  {
    speaker: "Jake",
    role: "Natural Game (Field Experience Lens)",
    avatar: "\u{1F60E}",
    stance: "nuance",
    phase: "cross-exam",
    replyTo: "Marco",
    message:
      "Skill Leverage captures decay implicitly IF computed from recent performance. But in practice: a guy off the field for three weeks still has a \u2018graduated\u2019 badge. His mindset hasn\u2019t caught up to his actual state. Graduation needs a recency flag: graduated+active vs graduated+dormant. Dormant skills get a penalty coefficient. No fourth formula term \u2014 but the graduation lifecycle must feed recency into how Skill Leverage is computed. \u2018Your Skill Leverage is down \u2014 you haven\u2019t logged a set in 18 days\u2019 is different from \u2018your Input Rate is the bottleneck.\u2019",
  },
  {
    speaker: "Tony Robbins",
    role: "Life Coach (Emotional/Motivational Lens)",
    avatar: "\u{1F525}",
    stance: "concede",
    phase: "cross-exam",
    replyTo: "Goggins",
    message:
      "Identity lives inside Input Rate. I concede. But the diagnostic taxonomy under Input Rate needs a fourth lane: identity suppression. You detect it by pattern \u2014 Input Rate that recovers during high-accountability periods (challenges, streaks) but collapses when external structure disappears. That signature is identity, not fatigue. Not asking for a new variable \u2014 asking for the Input Rate diagnostic to be honest about what it\u2019s measuring.",
  },
  {
    speaker: "Angela",
    role: "Olympic Swimmer (Athletic Performance Lens)",
    avatar: "\u{1F3CA}\u200D\u2640\uFE0F",
    stance: "nuance",
    phase: "cross-exam",
    replyTo: "All",
    message:
      "Three-term model captures phase partially but not sufficiently. In acquisition, Input Rate is primary and low Skill Leverage is EXPECTED. In consolidation, Recovery elevates. Proposal: phase-gated weighting where the weight on each term shifts per phase. Without this, bottleneck detection tells an acquisition-phase learner their Skill Leverage is the problem when the correct answer is: it\u2019s supposed to be low right now. Keep training. Also: visualization color-coding needs a fourth state \u2014 \u2018intentional suppression\u2019 (grey) \u2014 for terms that are low by design during certain phases.",
  },
  {
    speaker: "Robert",
    role: "Family Man (Maintenance Perspective Lens)",
    avatar: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}",
    stance: "agree",
    phase: "cross-exam",
    replyTo: "Angela",
    message:
      "The synthesis handles acquisition and consolidation. It does not handle keeping. After graduation, Input Rate should be computed against a maintenance baseline \u2014 not \u2018how close are you to the goal\u2019 but \u2018how far are you drifting from your established norm.\u2019 Recovery Capacity becomes the leading indicator in maintenance because what degrades first is not skill but the systems that sustain input without conscious effort. Same three terms, but a third weighting profile where Recovery is primary.",
  },
]

// ─── Moderator Summary ───────────────────────────────────────────────────────

const moderatorSummary = {
  consensus: [
    "Multiplicative, not additive \u2014 all 8 panelists agree the top-level relationship must be \u00D7, not +. If either term is zero, output is zero.",
    "Three-term formula: Progress Velocity = Input Rate \u00D7 Skill Leverage \u00D7 Recovery Capacity \u2014 Marco proposed, all 8 accepted. Three diagnostic lanes, independently measurable.",
    "Display layer + diagnostic engine \u2014 Hormozi/Marco synthesis. Three terms show WHAT is low. Per-term constraint identification shows WHY it\u2019s low. Two separate layers.",
    "Phase-gated weighting \u2014 term importance shifts per lifecycle phase. Acquisition: Input Rate 1.5\u00D7, Skill Leverage 0.5\u00D7 (expected low). Consolidation: Skill Leverage 1.5\u00D7 (stress-test). Graduated: Recovery 1.5\u00D7 (sustaining systems), Input Rate measured as baseline deviation.",
    "Skill decay via recency \u2014 graduated skills need active/dormant flag. Dormant graduated skills get penalty coefficient in Skill Leverage. No fourth formula term needed.",
    "Input Rate diagnostic taxonomy \u2014 when low, system must distinguish: willpower failure, legitimate fatigue, identity suppression, environmental constraint. v1 shows bottleneck; v2 adds root-cause classification.",
    "Maintenance = same formula, different weighting \u2014 after graduation, Input Rate switches from \u2018progress toward target\u2019 to \u2018deviation from personal baseline.\u2019 Recovery becomes leading indicator.",
    "Visualization: four zones \u2014 (1) live formula bar with phase-context-aware coloring, (2) side-by-side domain cards, (3) collapsible phase-weight table, (4) drill-down per cell.",
  ],
  unresolved: [
    "Willpower vs fatigue classification \u2014 Goggins/Tony demand it, Chris says it\u2019s not buildable from existing data alone. Requires subjective session ratings or user tagging. Deferred to v2.",
    "Identity suppression detection \u2014 Tony\u2019s pattern: Input Rate recovers during high-accountability periods but collapses when external structure disappears. Requires time-series analysis. v2.",
  ],
  verdict:
    "Full convergence on formula structure: Progress Velocity = Input Rate \u00D7 Skill Leverage \u00D7 Recovery Capacity. All 8 panelists accepted. Phase-gated weighting and visualization design also converged. Two diagnostic refinements deferred to v2 (require new data collection).",
}

// ─── Panelists ───────────────────────────────────────────────────────────────

const panelists = [
  { name: "Tony Robbins", role: "Emotional/Motivational Lens", avatar: "\u{1F525}" },
  { name: "Alex Hormozi", role: "ROI/Leverage Lens", avatar: "\u{1F4C8}" },
  { name: "David Goggins", role: "Willpower/Volume Lens", avatar: "\u{1F480}" },
  { name: "Jake", role: "Field Experience Lens", avatar: "\u{1F60E}" },
  { name: "Marco", role: "Systems Thinker Lens", avatar: "\u{1F3AD}" },
  { name: "Robert", role: "Maintenance Perspective Lens", avatar: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}" },
  { name: "Angela", role: "Athletic Performance Lens", avatar: "\u{1F3CA}\u200D\u2640\uFE0F" },
  { name: "Chris", role: "Systems Architecture Lens", avatar: "\u{1F4BB}" },
]

// ─── Components ──────────────────────────────────────────────────────────────

// Zone 1: Live Formula Bar

function getStatusColor(status: TermStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case "strong":
      return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/25" }
    case "warning":
      return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/25" }
    case "bottleneck":
      return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/25" }
    case "expected-low":
      return { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/25" }
  }
}

function getStatusLabel(status: TermStatus): string {
  switch (status) {
    case "strong": return "Strong"
    case "warning": return "Warning"
    case "bottleneck": return "Bottleneck"
    case "expected-low": return "Expected low"
  }
}

const termIcons: Record<string, typeof Activity> = {
  "Input Rate": Activity,
  "Skill Leverage": Brain,
  "Recovery": Battery,
}

function FormulaBar() {
  const velocity = mockFormulaTerms.reduce((acc, t) => acc * t.value, 1)

  return (
    <div className="space-y-4">
      {/* Phase badge */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/25">
          Phase: Acquisition
        </span>
        <span className="text-xs text-muted-foreground">
          Weights adjust per phase
        </span>
      </div>

      {/* Formula cells */}
      <div className="flex items-stretch gap-2">
        {mockFormulaTerms.map((term, i) => {
          const colors = getStatusColor(term.status)
          const Icon = termIcons[term.label] ?? Activity
          return (
            <div key={term.label} className="flex items-stretch gap-2">
              {i > 0 && (
                <div className="flex items-center">
                  <span className="text-lg text-muted-foreground font-light">{"\u00D7"}</span>
                </div>
              )}
              <div className={`flex-1 min-w-[140px] rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`size-4 ${colors.text}`} />
                  <span className="text-sm font-semibold">{term.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} ml-auto font-mono`}>
                    {term.phaseWeight}
                  </span>
                </div>
                <div className={`text-2xl font-bold tabular-nums ${colors.text}`}>
                  {term.value.toFixed(1)}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
                    {getStatusLabel(term.status)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {term.diagnostic}
                </p>
              </div>
            </div>
          )
        })}

        {/* = Velocity */}
        <div className="flex items-stretch gap-2">
          <div className="flex items-center">
            <span className="text-lg text-muted-foreground font-light">=</span>
          </div>
          <div className="min-w-[100px] rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col items-center justify-center">
            <Zap className="size-4 text-primary mb-1" />
            <span className="text-xs text-muted-foreground">Velocity</span>
            <span className="text-2xl font-bold tabular-nums text-primary">
              {velocity.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Equation label */}
      <p className="text-center text-xs text-muted-foreground">
        Progress Velocity = Input Rate {"\u00D7"} Skill Leverage {"\u00D7"} Recovery Capacity
        <span className="text-muted-foreground/50 ml-1">(multiplicative \u2014 if any term is zero, velocity is zero)</span>
      </p>
    </div>
  )
}

// Zone 2: Domain Instantiation Cards

function DomainCard({ mapping }: { mapping: DomainMapping }) {
  const rows = [
    { icon: Activity, label: "Input Rate", ...mapping.inputRate },
    { icon: Brain, label: "Skill Leverage", ...mapping.skillLeverage },
    { icon: Battery, label: "Recovery", ...mapping.recovery },
  ]

  return (
    <div className="rounded-xl border border-border bg-card/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-bold text-sm">{mapping.domain}</h4>
          <p className="text-xs text-muted-foreground">{mapping.goal}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/25">
          {mapping.phase}
        </span>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <row.icon className="size-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <p className="text-sm font-medium">{row.label === "Input Rate" ? mapping.inputRate.label : row.label === "Skill Leverage" ? mapping.skillLeverage.label : mapping.recovery.label}</p>
            </div>
            <span className="text-sm font-bold tabular-nums">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Zone 3: Phase-Weight Table

function PhaseWeightTable() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        Phase-Gated Weighting Table
      </button>
      {expanded && (
        <div className="mt-3 rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground">
                <th className="text-left px-4 py-2 font-medium">Phase</th>
                <th className="text-center px-4 py-2 font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <Activity className="size-3" /> Input Rate
                  </div>
                </th>
                <th className="text-center px-4 py-2 font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <Brain className="size-3" /> Skill Leverage
                  </div>
                </th>
                <th className="text-center px-4 py-2 font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <Battery className="size-3" /> Recovery
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {phaseWeights.map((pw) => (
                <tr
                  key={pw.phase}
                  className={pw.active ? "bg-blue-500/5 border-l-2 border-l-blue-400" : ""}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pw.phase}</span>
                      {pw.active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                          current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{pw.note}</p>
                  </td>
                  <td className={`text-center px-4 py-3 font-mono font-bold ${pw.inputRate === "1.5\u00D7" ? "text-blue-400" : "text-muted-foreground"}`}>
                    {pw.inputRate}
                  </td>
                  <td className={`text-center px-4 py-3 font-mono font-bold ${pw.skillLeverage === "1.5\u00D7" ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {pw.skillLeverage}
                  </td>
                  <td className={`text-center px-4 py-3 font-mono font-bold ${pw.recovery === "1.5\u00D7" ? "text-amber-400" : "text-muted-foreground"}`}>
                    {pw.recovery}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Tree visualization (kept from original)

function TreeNodeCard({ node, depth }: { node: TreeNode; depth: number }) {
  const isRoot = depth === 0
  const isLeaf = !node.children || node.children.length === 0

  return (
    <div
      className={`
      px-3 py-2 rounded-lg text-sm font-medium border whitespace-nowrap
      ${
        isRoot
          ? "bg-primary text-primary-foreground border-primary text-base px-5 py-3 font-bold"
          : isLeaf
            ? "bg-muted/40 border-border/60 text-muted-foreground text-xs"
            : "bg-card border-border text-foreground"
      }
    `}
    >
      {node.label}
    </div>
  )
}

function BranchGroup({ subgoal, subsubgoals }: { subgoal: string; subsubgoals: string[] }) {
  return (
    <div className="flex items-center gap-0">
      <div className="flex flex-col gap-1">
        {subsubgoals.map((ss, i) => (
          <div key={i} className="flex items-center">
            <TreeNodeCard node={{ label: ss }} depth={2} />
            <div className="w-6 border-t border-dashed border-border/50" />
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center self-stretch py-3">
        <div className="flex-1 w-px bg-border/50" />
      </div>
      <div className="w-4 border-t border-dashed border-border/50" />
      <TreeNodeCard node={{ label: subgoal }} depth={1} />
    </div>
  )
}

function GoalTreeVisualization({ tree }: { tree: TreeNode }) {
  const branches = tree.children || []

  return (
    <div className="flex items-center justify-center gap-0 py-8 overflow-x-auto">
      <div className="flex flex-col gap-6">
        {branches.map((branch) => (
          <BranchGroup
            key={branch.label}
            subgoal={branch.label}
            subsubgoals={(branch.children || []).map((c) => c.label)}
          />
        ))}
      </div>
      <div className="flex flex-col items-center mx-1">
        <div className="w-px h-full bg-border/50 absolute" />
      </div>
      <div className="flex flex-col items-center self-stretch py-6">
        <div className="flex-1 w-px bg-border/50" />
      </div>
      <div className="w-6 border-t border-dashed border-border/50" />
      <TreeNodeCard node={tree} depth={0} />
    </div>
  )
}

// Debate components

const stanceColors = {
  agree: "border-emerald-500/30 bg-emerald-500/5",
  disagree: "border-red-500/30 bg-red-500/5",
  nuance: "border-amber-500/30 bg-amber-500/5",
  concede: "border-blue-500/30 bg-blue-500/5",
  pass: "border-border bg-muted/20",
}

const stanceLabels = {
  agree: "Agrees",
  disagree: "Disagrees",
  nuance: "Nuance",
  concede: "Concedes",
  pass: "Passes",
}

const stancePillColors = {
  agree: "bg-emerald-500/20 text-emerald-400",
  disagree: "bg-red-500/20 text-red-400",
  nuance: "bg-amber-500/20 text-amber-400",
  concede: "bg-blue-500/20 text-blue-400",
  pass: "bg-muted text-muted-foreground",
}

function DebateMessage({ entry }: { entry: DebateEntry }) {
  return (
    <div className={`rounded-xl border p-4 ${stanceColors[entry.stance]}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{entry.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-sm">{entry.speaker}</span>
            <span className="text-xs text-muted-foreground">{entry.role}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${stancePillColors[entry.stance]}`}>
              {stanceLabels[entry.stance]}
            </span>
            {entry.phase && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                entry.phase === "opening" ? "bg-purple-500/20 text-purple-400" : "bg-cyan-500/20 text-cyan-400"
              }`}>
                {entry.phase === "opening" ? "Opening" : "Cross-Exam"}
              </span>
            )}
            {entry.replyTo && (
              <span className="text-xs text-muted-foreground">
                replying to {entry.replyTo}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed">{entry.message}</p>
        </div>
      </div>
    </div>
  )
}

function DebatePanel() {
  const [expanded, setExpanded] = useState(true)
  const openings = debateEntries.filter((e) => e.phase === "opening")
  const crossExam = debateEntries.filter((e) => e.phase === "cross-exam")

  if (debateEntries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
        <MessageCircle className="size-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Debate transcript will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        Panel Discussion ({debateEntries.length} messages: {openings.length} openings + {crossExam.length} cross-exam)
      </button>
      {expanded && (
        <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2">
          {openings.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Opening Statements</h4>
              {openings.map((entry, i) => (
                <DebateMessage key={`opening-${i}`} entry={entry} />
              ))}
            </div>
          )}
          {crossExam.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Cross-Examination</h4>
              {crossExam.map((entry, i) => (
                <DebateMessage key={`cross-${i}`} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PanelistsBar() {
  return (
    <div className="flex flex-wrap gap-3">
      {panelists.map((p) => (
        <div
          key={p.name}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/40 border border-border/60 text-xs"
        >
          <span>{p.avatar}</span>
          <span className="font-medium">{p.name}</span>
          <span className="text-muted-foreground hidden sm:inline">{p.role}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs">
        <span>{"\u2696\uFE0F"}</span>
        <span className="font-medium text-primary">Moderator</span>
      </div>
    </div>
  )
}

function ModeratorSummarySection() {
  return (
    <div className="space-y-5 rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{"\u2696\uFE0F"}</span>
        <h3 className="font-bold text-lg">Moderator&apos;s Summary</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          8 openings + 7 cross-exam exchanges
        </span>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-emerald-400 mb-2">
          Consensus ({moderatorSummary.consensus.length})
        </h4>
        <ul className="space-y-1.5">
          {moderatorSummary.consensus.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-emerald-400 flex-shrink-0">{"\u2713"}</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
          <AlertTriangle className="size-3.5" />
          Deferred to v2 ({moderatorSummary.unresolved.length})
        </h4>
        <ul className="space-y-1.5">
          {moderatorSummary.unresolved.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-amber-400 flex-shrink-0">{"\u26A0"}</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-3 border-t border-primary/20">
        <p className="text-sm font-medium">
          <span className="text-primary">Verdict:</span>{" "}
          <span className="text-muted-foreground">{moderatorSummary.verdict}</span>
        </p>
      </div>
    </div>
  )
}

// ─── Section 5: Gamification Inventory ────────────────────────────────────────

type SystemStatus = "wired" | "partial" | "disconnected"

type GamificationSystem = {
  name: string
  icon: typeof Trophy
  description: string
  triggers: string
  awards: string
  status: SystemStatus
  gap: string | null
  location: string
}

const gamificationSystems: GamificationSystem[] = [
  {
    name: "Badge Engine",
    icon: Trophy,
    description: "5 tiers (none → bronze → silver → gold → diamond) per L2 achievement. Weighted from L3 goal progress. Phase-aware: consolidation/graduated = 100% contribution.",
    triggers: "L3 goal progress crosses tier threshold",
    awards: "Badge tier label, shown in weekly review as tier upgrade",
    status: "partial",
    gap: "Tier upgrades shown in review but don't generate XP or unlock anything persistent",
    location: "badgeEngineService.ts",
  },
  {
    name: "Celebrations",
    icon: PartyPopper,
    description: "5 tiers from subtle toast to epic confetti (250+ particles). Tier determined by goal time horizon.",
    triggers: "Goal completion",
    awards: "Visual celebration (confetti, toast, modal) — ephemeral only",
    status: "disconnected",
    gap: "Fire-and-forget. No persistent reward. Completing a multi-year goal gives confetti and nothing else",
    location: "CelebrationOverlay.tsx",
  },
  {
    name: "Streaks",
    icon: Flame,
    description: "Current streak, best streak, streak freezes. Displayed on GoalCard meta row and Lair streak widget.",
    triggers: "Daily/weekly goal completion continuity",
    awards: "Streak count display, flame icon",
    status: "partial",
    gap: "Streak milestones (7, 30, 100 days) not detected as events. No XP or rewards for streak maintenance",
    location: "GoalCard.tsx, StreakWidget.tsx",
  },
  {
    name: "XP / Levels",
    icon: Crown,
    description: "Rookie → Practitioner → Confident → Advanced → Expert → Master. XP = 100 × level. Progress bar in Lair.",
    triggers: "Scenario completion only",
    awards: "Level number, title, progress bar",
    status: "disconnected",
    gap: "Goals don't generate XP. The entire goal system is invisible to the level system. A user doing 50 approaches/week stays 'Rookie' if they haven't done scenarios",
    location: "LevelProgressBar.tsx, profile/config.ts",
  },
  {
    name: "Phase Lifecycle",
    icon: TrendingUp,
    description: "acquisition → consolidation → graduated. Detected via weekly snapshot analysis. Shown as badge on L3 habit_ramp GoalCards.",
    triggers: "4+ on-pace weeks → consolidation. 8+ perfect weeks → graduated. 2+ below 50% → regression",
    awards: "Phase badge on GoalCard, transition shown in weekly review",
    status: "wired",
    gap: "Per-goal only. No aggregate identity. Phase transitions don't generate XP",
    location: "goalsService.ts, GoalCard.tsx",
  },
  {
    name: "Weekly Review",
    icon: Star,
    description: "Momentum score (0-100), per-goal breakdown with leading/lagging tags, tier upgrades, phase transitions.",
    triggers: "User opens weekly review dialog",
    awards: "Summary view — informational only",
    status: "wired",
    gap: "Natural aggregation point for rewards but awards nothing. Could batch XP + loot drops here",
    location: "WeeklyReviewDialog.tsx",
  },
]

const statusConfig: Record<SystemStatus, { label: string; color: string; icon: typeof Check }> = {
  wired: { label: "Wired", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25", icon: Check },
  partial: { label: "Partial", color: "text-amber-400 bg-amber-500/10 border-amber-500/25", icon: HelpCircle },
  disconnected: { label: "Disconnected", color: "text-red-400 bg-red-500/10 border-red-500/25", icon: XIcon },
}

function GamificationInventory() {
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      {gamificationSystems.map((sys) => {
        const isExpanded = expandedSystem === sys.name
        const status = statusConfig[sys.status]
        const StatusIcon = status.icon
        const SysIcon = sys.icon
        return (
          <div
            key={sys.name}
            className="rounded-xl border border-border bg-card/50 overflow-hidden"
          >
            <button
              onClick={() => setExpandedSystem(isExpanded ? null : sys.name)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <SysIcon className="size-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-sm flex-1">{sys.name}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${status.color}`}>
                <StatusIcon className="size-3" />
                {status.label}
              </span>
              {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground leading-relaxed">{sys.description}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">Triggers</p>
                    <p className="text-xs text-muted-foreground">{sys.triggers}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">Awards</p>
                    <p className="text-xs text-muted-foreground">{sys.awards}</p>
                  </div>
                </div>
                {sys.gap && (
                  <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-red-400/60 mb-1">Gap</p>
                    <p className="text-xs text-red-300/80">{sys.gap}</p>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground/40 font-mono">{sys.location}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Section 6: Blended Level ─────────────────────────────────────────────────

type MockGoalPhaseEntry = {
  title: string
  phase: "acquisition" | "consolidation" | "graduated"
  domain: string
}

const mockGoalPhases: MockGoalPhaseEntry[] = [
  { title: "20 approaches/week", phase: "consolidation", domain: "Daygame" },
  { title: "3 sessions/week", phase: "graduated", domain: "Daygame" },
  { title: "Conversation threading", phase: "acquisition", domain: "Daygame" },
  { title: "Phone number closes", phase: "acquisition", domain: "Daygame" },
  { title: "Cardio 4x/week", phase: "consolidation", domain: "Fitness" },
  { title: "Track macros daily", phase: "acquisition", domain: "Fitness" },
]

function computeBlendedLevel(goals: MockGoalPhaseEntry[]): { label: string; score: number; distribution: Record<string, number> } {
  const weights = { acquisition: 0, consolidation: 1, graduated: 2 }
  const total = goals.length
  if (total === 0) return { label: "Newcomer", score: 0, distribution: { acquisition: 0, consolidation: 0, graduated: 0 } }

  const distribution = { acquisition: 0, consolidation: 0, graduated: 0 }
  let weightedSum = 0
  for (const g of goals) {
    distribution[g.phase]++
    weightedSum += weights[g.phase]
  }
  const score = weightedSum / (total * 2) // normalize to 0-1

  // Thresholds for identity labels
  let label: string
  if (score >= 0.8) label = "Natural"
  else if (score >= 0.6) label = "Practitioner"
  else if (score >= 0.35) label = "Explorer"
  else label = "Newcomer"

  return { label, score, distribution }
}

const phaseColors = {
  acquisition: { bg: "bg-slate-500/20", text: "text-slate-400", label: "Learning" },
  consolidation: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Consolidating" },
  graduated: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Graduated" },
}

function BlendedLevelMockup() {
  const { label, score, distribution } = computeBlendedLevel(mockGoalPhases)
  const total = mockGoalPhases.length

  return (
    <div className="space-y-6">
      {/* Identity card */}
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 text-center">
        <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary mx-auto mb-3">
          <Crown className="size-8 text-primary" />
        </div>
        <p className="text-2xl font-bold">{label}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Composite identity from {total} active goals
        </p>
        <div className="mt-3 flex items-center justify-center gap-1">
          <div className="w-48 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${score * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground ml-2">{Math.round(score * 100)}%</span>
        </div>
      </div>

      {/* Phase distribution bar */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Phase distribution across all goals:</p>
        <div className="flex rounded-full overflow-hidden h-6 border border-border">
          {(["acquisition", "consolidation", "graduated"] as const).map((phase) => {
            const count = distribution[phase]
            const pct = total > 0 ? (count / total) * 100 : 0
            if (pct === 0) return null
            const colors = phaseColors[phase]
            return (
              <div
                key={phase}
                className={`${colors.bg} flex items-center justify-center text-[10px] font-medium ${colors.text} transition-all`}
                style={{ width: `${pct}%` }}
                title={`${colors.label}: ${count} goals`}
              >
                {pct >= 20 && `${colors.label} (${count})`}
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-goal breakdown */}
      <div className="space-y-1.5">
        {mockGoalPhases.map((g) => {
          const colors = phaseColors[g.phase]
          return (
            <div key={g.title} className="flex items-center gap-2 text-xs">
              <span className={`px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} text-[10px] font-medium min-w-[80px] text-center`}>
                {colors.label}
              </span>
              <span className="text-muted-foreground truncate">{g.title}</span>
              <span className="text-muted-foreground/40 ml-auto text-[10px]">{g.domain}</span>
            </div>
          )
        })}
      </div>

      {/* Level thresholds */}
      <div className="rounded-lg border border-border p-4">
        <p className="text-xs font-medium mb-2">Identity ladder (derived from phase distribution):</p>
        <div className="space-y-1">
          {[
            { label: "Newcomer", range: "0-34%", desc: "Mostly acquisition" },
            { label: "Explorer", range: "35-59%", desc: "First skills consolidating" },
            { label: "Practitioner", range: "60-79%", desc: "Majority consolidation+" },
            { label: "Natural", range: "80-100%", desc: "Most skills graduated" },
          ].map((tier) => (
            <div key={tier.label} className={`flex items-center gap-3 text-xs px-2 py-1 rounded ${tier.label === label ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}>
              <span className="font-mono w-12">{tier.range}</span>
              <span className="font-semibold w-24">{tier.label}</span>
              <span className="text-muted-foreground/60">{tier.desc}</span>
              {tier.label === label && <span className="ml-auto text-[10px] text-primary">current</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Section 7: Reward Loop ──────────────────────────────────────────────────

type LoopStep = {
  label: string
  icon: typeof Activity
  status: "exists" | "broken" | "missing"
  detail: string
}

const currentLoop: LoopStep[] = [
  { label: "Action", icon: Activity, status: "exists", detail: "User logs approaches, sessions, completions" },
  { label: "Progress", icon: TrendingUp, status: "exists", detail: "Goal progress tracked, streaks increment" },
  { label: "Feedback", icon: Star, status: "exists", detail: "Celebration fires, weekly review aggregates" },
  { label: "Reward", icon: Gift, status: "broken", detail: "Celebration is ephemeral. Nothing persists. No XP from goals" },
  { label: "Motivation", icon: Flame, status: "missing", detail: "No tangible reason to come back except intrinsic drive" },
  { label: "Next Action", icon: ArrowRight, status: "missing", detail: "Loop breaks — user must self-motivate from scratch" },
]

function RewardLoopDiagram() {
  return (
    <div className="space-y-6">
      {/* Current loop */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-3">CURRENT REWARD LOOP</p>
        <div className="flex flex-wrap items-center gap-2">
          {currentLoop.map((step, i) => {
            const Icon = step.icon
            const colors = step.status === "exists"
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
              : step.status === "broken"
                ? "border-red-500/30 bg-red-500/5 text-red-400"
                : "border-muted bg-muted/20 text-muted-foreground/50 border-dashed"
            return (
              <div key={step.label} className="flex items-center gap-2">
                <div className={`rounded-xl border p-3 min-w-[120px] ${colors}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="size-3.5" />
                    <span className="text-xs font-semibold">{step.label}</span>
                  </div>
                  <p className="text-[10px] leading-tight opacity-80">{step.detail}</p>
                </div>
                {i < currentLoop.length - 1 && (
                  <ArrowRight className={`size-3.5 flex-shrink-0 ${step.status === "broken" || currentLoop[i + 1].status === "missing" ? "text-red-400/50" : "text-emerald-400/50"}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Proposed fix */}
      <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5">
        <p className="text-xs font-semibold text-primary mb-3">PROPOSED: CLOSE THE LOOP</p>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="text-primary font-mono w-4">1.</span>
            <p><strong className="text-foreground">Wire goal events to XP.</strong> Milestone hits, tier upgrades, phase transitions, streak milestones all generate XP. Level system already exists — just needs input.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-mono w-4">2.</span>
            <p><strong className="text-foreground">Batch rewards in weekly review.</strong> Natural aggregation point. Show XP earned this week + any loot drops alongside momentum score.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-mono w-4">3.</span>
            <p><strong className="text-foreground">Blended identity evolves.</strong> As phase distribution shifts, title changes from Explorer to Practitioner. Visible, persistent, identity-reinforcing.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-mono w-4">4.</span>
            <p><strong className="text-foreground">Loot drops on milestone events.</strong> Map celebration tiers to reward rarity. Epic confetti = rare drop. What the drops ARE is a design decision (cosmetics, unlockable content, streak freezes, etc).</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section 8: Event-to-Reward Mapping ──────────────────────────────────────

type EventRewardRow = {
  event: string
  frequency: string
  currentAward: string
  currentAwardExists: boolean
  proposedXP: string
  proposedLoot: string
}

const eventRewardMapping: EventRewardRow[] = [
  {
    event: "Daily goal completion",
    frequency: "Daily",
    currentAward: "Subtle celebration (toast)",
    currentAwardExists: true,
    proposedXP: "+10 XP",
    proposedLoot: "None (too frequent)",
  },
  {
    event: "Streak milestone (7, 30, 100)",
    frequency: "Rare",
    currentAward: "Flame icon + count",
    currentAwardExists: true,
    proposedXP: "+50 / +150 / +500 XP",
    proposedLoot: "Streak freeze earned (30+), cosmetic (100+)",
  },
  {
    event: "Milestone ladder hit",
    frequency: "Periodic",
    currentAward: "Celebration (tier by horizon)",
    currentAwardExists: true,
    proposedXP: "+25-100 XP (by ladder position)",
    proposedLoot: "Random drop on quarter/year milestones",
  },
  {
    event: "Badge tier upgrade",
    frequency: "Rare",
    currentAward: "Shown in weekly review",
    currentAwardExists: true,
    proposedXP: "+100 (bronze) → +500 (diamond)",
    proposedLoot: "Profile badge, cosmetic unlock",
  },
  {
    event: "Phase transition",
    frequency: "Rare",
    currentAward: "Shown in weekly review + GoalCard badge",
    currentAwardExists: true,
    proposedXP: "+200 (consolidation), +500 (graduated)",
    proposedLoot: "Identity title change, archetype unlock",
  },
  {
    event: "Weekly momentum > 80",
    frequency: "Weekly",
    currentAward: "Score shown in review",
    currentAwardExists: true,
    proposedXP: "+30 XP bonus",
    proposedLoot: "None (natural reward is momentum itself)",
  },
  {
    event: "Goal fully completed",
    frequency: "Rare",
    currentAward: "Celebration (tier by horizon)",
    currentAwardExists: true,
    proposedXP: "+50-1000 XP (by goal scope)",
    proposedLoot: "Guaranteed drop for quarterly+ goals",
  },
  {
    event: "Blended level up",
    frequency: "Very rare",
    currentAward: "Does not exist yet",
    currentAwardExists: false,
    proposedXP: "+300 XP",
    proposedLoot: "New identity title + celebration event",
  },
]

function EventRewardTable() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/30 text-muted-foreground">
            <th className="text-left px-3 py-2 font-medium">Event</th>
            <th className="text-left px-3 py-2 font-medium">Frequency</th>
            <th className="text-left px-3 py-2 font-medium">Current</th>
            <th className="text-left px-3 py-2 font-medium">Proposed XP</th>
            <th className="text-left px-3 py-2 font-medium">Proposed Loot</th>
          </tr>
        </thead>
        <tbody>
          {eventRewardMapping.map((row) => (
            <tr key={row.event} className="border-t border-border/50">
              <td className="px-3 py-2.5 font-medium text-foreground">{row.event}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{row.frequency}</td>
              <td className="px-3 py-2.5">
                <span className={row.currentAwardExists ? "text-muted-foreground" : "text-red-400"}>
                  {row.currentAward}
                </span>
              </td>
              <td className="px-3 py-2.5 text-primary font-mono">{row.proposedXP}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{row.proposedLoot}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GoalModelPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-12">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Goal Achievement Model</h1>
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
            Progress Velocity = <strong>Input Rate</strong> {"\u00D7"}{" "}
            <strong>Skill Leverage</strong> {"\u00D7"}{" "}
            <strong>Recovery Capacity</strong>.
            Multiplicative {"\u2014"} if any term is zero, velocity is zero.
            Term weights shift per lifecycle phase.
          </p>
        </div>

        {/* Section 1: Live Formula (Zone 1) */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">
            The Formula {"\u2014"} Live Diagnostic
          </h2>
          <p className="text-xs text-muted-foreground">
            Each cell shows a formula term with its current value, phase weight, and status.
            Colors are phase-context-aware: grey means {"\u201C"}expected low{"\u201D"} at this phase, not a problem.
          </p>
          <div className="rounded-xl border border-border bg-card/50 p-6">
            <FormulaBar />
          </div>
        </section>

        {/* Section 2: Domain Cards (Zone 2) */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">
            Same Formula, Different Domains
          </h2>
          <p className="text-xs text-muted-foreground">
            The three terms instantiate with domain-specific metrics.
            The structure is isomorphic {"\u2014"} the formula is universal, the labels change.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {domainMappings.map((dm) => (
              <DomainCard key={dm.domain} mapping={dm} />
            ))}
          </div>
        </section>

        {/* Section 3: Phase-Weight Table (Zone 3) */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">
            Phase-Gated Weighting
          </h2>
          <p className="text-xs text-muted-foreground">
            Which term matters most depends on where you are in the journey.
            The system adjusts bottleneck detection accordingly.
          </p>
          <div className="rounded-xl border border-border bg-card/50 p-6">
            <PhaseWeightTable />
          </div>
        </section>

        {/* Section 4: Goal Decomposition Trees */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">
            Goal Decomposition Tree
          </h2>
          <p className="text-xs text-muted-foreground">
            Any goal breaks into subgoals, which break into actionable sub-subgoals.
            Each L3 leaf maps to one of the three formula terms.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card/50 p-6 overflow-x-auto">
              <p className="text-xs text-muted-foreground mb-2 text-center">Fitness example</p>
              <GoalTreeVisualization tree={goalTree} />
            </div>
            <div className="rounded-xl border border-border bg-card/50 p-6 overflow-x-auto">
              <p className="text-xs text-muted-foreground mb-2 text-center">Daygame example</p>
              <GoalTreeVisualization tree={daygameTree} />
            </div>
          </div>
        </section>

        {/* Section 5: Gamification Inventory */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">
            Gamification Inventory {"\u2014"} What Exists
          </h2>
          <p className="text-xs text-muted-foreground">
            Six gamification systems exist in the codebase. Three are fully wired, two are partial,
            one is completely disconnected from goals. Click each to see triggers, awards, and gaps.
          </p>
          <GamificationInventory />
        </section>

        {/* Section 6: Blended Level */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">
            Blended Identity Level {"\u2014"} Concept
          </h2>
          <p className="text-xs text-muted-foreground">
            Per-goal phases exist but there{"\u2019"}s no aggregate identity. A blended level would derive
            a single evolving title from the distribution of all goal phases {"\u2014"} answering
            {"\u201C"}overall, who am I becoming?{"\u201D"}
          </p>
          <div className="rounded-xl border border-border bg-card/50 p-6">
            <BlendedLevelMockup />
          </div>
        </section>

        {/* Section 7: Reward Loop */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">
            Reward Loop {"\u2014"} Where It Breaks
          </h2>
          <p className="text-xs text-muted-foreground">
            The current loop goes: action {"\u2192"} progress {"\u2192"} feedback {"\u2192"} nothing.
            The chain breaks after celebration. No persistent reward, no extrinsic reason to return.
          </p>
          <RewardLoopDiagram />
        </section>

        {/* Section 8: Event-to-Reward Mapping */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">
            Event-to-Reward Mapping {"\u2014"} Design Surface
          </h2>
          <p className="text-xs text-muted-foreground">
            Every gamification event that currently fires, what it awards today, and what it could award.
            This is the design surface for wiring XP and loot into the existing event infrastructure.
          </p>
          <EventRewardTable />
        </section>

        {/* Section 9: Debate */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">
            Panel Debate #2: Formula {"\u0026"} Visualization (SMAD Protocol, Feb 2026)
          </h2>
          <p className="text-xs text-muted-foreground">
            Eight panelists debated the formula structure, visualization design, and connection
            to existing systems. Full convergence on 3-term multiplicative model with phase-gated weighting.
          </p>

          <PanelistsBar />
          <ModeratorSummarySection />

          <div className="rounded-xl border border-border bg-card/50 p-6">
            <DebatePanel />
          </div>
        </section>
      </div>
    </div>
  )
}
