import {
  ListChecks,
  TrendingUp,
  Repeat,
  CircleHelp,
  Trophy,
  ShieldCheck,
  Scale,
} from "lucide-react"
import type { KeyStat } from "../types"

/**
 * Research-backed key statistics for field report education
 * Each stat includes:
 * - Primary research finding
 * - Full description for expanded view
 * - "Nerd box" with detailed research citations
 */
export const KEY_STATS_DATA: KeyStat[] = [
  {
    id: "implementation-intentions",
    value: "3x",
    label: "Success Rate",
    detail: "with implementation intentions",
    hoverPreview: "Pre-planning 'If X, then Y' triggers triples goal completion",
    fullDescription: "\"Difficult goal intentions were completed about 3 times more often when participants had furnished them with implementation intentions.\" The 'If X, then Y' format creates automatic triggers that reduce the need for conscious effort in the moment.",
    icon: <ListChecks className="size-5" />,
    nerdBox: {
      primaryStudy: "Gollwitzer's meta-analysis (94 studies, 8,000+ participants) with effect size d=0.65",
      keyQuote: "Difficult goal intentions were completed about 3 times more often when participants had furnished them with implementation intentions.",
      whyItWorks: [
        "Mental representation of the situation becomes highly accessible",
        "Strong associative link between situation and action is established",
        "Behavior becomes automatically triggered by the situational cue",
        "Reduces need for conscious effort and willpower in the moment",
      ],
      alsoSupportedBy: [
        "Sports psychology: Pre-race visualization and contingency planning",
        "Military training: If-then rules for high-pressure decisions",
        "Trading psychology: Pre-planned exit strategies reduce emotional decisions",
      ],
      topPerformers: "Elite athletes, military special forces, and professional traders all use if-then planning to automate high-pressure decisions.",
    },
  },
  {
    id: "habit-tracking",
    value: "40%",
    label: "Higher Adherence",
    detail: "with habit tracking",
    hoverPreview: "Simply tracking behavior dramatically increases consistency",
    fullDescription: "Multiple studies confirm that the act of tracking itself creates accountability. \"Tracking increases success by 40%\" (APA). When combined with identity-based framing ('I am someone who reflects') and habit stacking, effects compound significantly.",
    icon: <TrendingUp className="size-5" />,
    nerdBox: {
      primaryStudy: "APA research + 2025 Journal of Applied Psychology meta-analysis",
      whyItWorks: [
        "Tracking creates automatic accountability loops",
        "Visual progress reinforces the behavior",
        "Streaks activate loss aversion (you don't want to break the chain)",
        "Data reveals patterns invisible to memory alone",
      ],
      alsoSupportedBy: [
        "Habit stacking increases success by 64% (2025 JAP study)",
        "Identity-based framing adds +32% adherence (JPSP study)",
        "Environmental cues increase adherence by 58% (2018 review)",
        "Habit formation takes 59-66 days median, up to 254 days",
      ],
      topPerformers: "The most consistent performers in any field—from elite athletes to successful writers—track their key behaviors religiously.",
    },
  },
  {
    id: "spaced-retrieval",
    value: "200-300%",
    label: "Better Retention",
    detail: "with spaced retrieval",
    hoverPreview: "Reviewing insights over time beats one-time analysis",
    fullDescription: "The Spacing Effect is one of the most replicated findings in cognitive psychology. \"Spaced repetition increases long-term retention by 200-300% compared to cramming.\" Your old field reports are goldmines waiting to be revisited.",
    icon: <Repeat className="size-5" />,
    nerdBox: {
      primaryStudy: "The Spacing Effect—one of the most replicated findings in cognitive psychology, validated across 100+ years of research",
      keyQuote: "Students using spaced repetition retain 80-90% after six months vs. 20-30% with cramming.",
      whyItWorks: [
        "Each retrieval strengthens the memory trace",
        "Forgetting and re-learning builds stronger connections than constant review",
        "Spacing forces effortful recall, which is more effective than passive re-reading",
        "The struggle to remember is where learning happens",
      ],
      alsoSupportedBy: [
        "Medical students using spaced repetition outperform peers consistently",
        "Language learning apps (Duolingo, Anki) built entirely on this principle",
        "BJJ practitioners who review old rolls improve faster than those who don't",
      ],
      topPerformers: "Medical students, language learners, and competitive memory athletes all rely on spaced retrieval as their core learning strategy.",
    },
  },
  {
    id: "analyzing-endings",
    value: "80%",
    label: "Of Insights",
    detail: "come from analyzing endings",
    hoverPreview: "Focus on why it ended, not what happened",
    fullDescription: "\"Why did the interaction end?\" and \"What happened in the 3 minutes before you lost her?\" These questions produce the most actionable insights. Like BJJ fighters reviewing 'what happened before the submission'—the ending reveals the leverage point.",
    icon: <CircleHelp className="size-5" />,
    nerdBox: {
      primaryStudy: "80/20 Field Report Method (community-derived) + BJJ Scout analysis methodology",
      keyQuote: "The 3 minutes leading up to where you lost her contain 80% of the actionable lessons.",
      whyItWorks: [
        "Endings reveal the critical decision points",
        "The 'lead-up' shows what actually triggered the outcome",
        "Focusing on fewer moments allows deeper analysis",
        "Pareto principle: 20% of moments contain 80% of lessons",
      ],
      alsoSupportedBy: [
        "BJJ Scout method: Study what happens BEFORE the submission, not just the finish",
        "Aviation incident analysis: Focus on the decision chain, not the crash",
        "Poker hand review: The mistake was made before the river card",
      ],
      topPerformers: "Elite BJJ competitors, poker professionals, and aviation safety experts all focus their analysis on the lead-up, not the outcome.",
    },
  },
  {
    id: "goal-setting",
    value: "90%",
    label: "Success Rate",
    detail: "with specific, challenging goals",
    hoverPreview: "Vague goals fail. Specific challenging goals succeed 90% of the time.",
    fullDescription: "35 years of research across 40,000+ participants shows that specific, challenging goals lead to higher performance 90% of the time. \"Practice one cold read per approach\" beats \"be better at conversation\" every time.",
    icon: <Trophy className="size-5" />,
    nerdBox: {
      primaryStudy: "Locke & Latham goal-setting research (35 years, 40,000+ participants, multiple countries)",
      keyQuote: "Specific, challenging goals led to higher performance 90% of the time compared to vague 'do your best' goals.",
      whyItWorks: [
        "Specificity creates focus—you know exactly what to work on",
        "Challenge creates engagement—easy goals don't activate effort",
        "Clear targets allow accurate self-assessment",
        "For new skills: learning goals ('practice X') beat performance goals ('achieve Y')",
      ],
      alsoSupportedBy: [
        "MBA students with learning goals had higher GPAs AND satisfaction",
        "Participants with difficult goals performed 250% higher than those with easy goals",
        "Commitment is key—uncommitted goals don't work regardless of specificity",
      ],
      topPerformers: "Every elite performer—from Olympic athletes to concert pianists—sets specific session goals, not vague aspirations.",
    },
  },
  {
    id: "psychological-safety",
    value: "2x",
    label: "More Effective",
    detail: "with honest self-assessment",
    hoverPreview: "You can't learn from what you can't admit.",
    fullDescription: "Google's Project Aristotle found psychological safety was the #1 factor behind high-performing teams—they were rated 2x more effective. For solo reflection: you need safety with YOURSELF to honestly assess. Self-judgment blocks learning.",
    icon: <ShieldCheck className="size-5" />,
    nerdBox: {
      primaryStudy: "Google Project Aristotle + Edmondson's research on psychological safety",
      keyQuote: "Higher-performing hospital teams reported MORE errors, not fewer. Safety enabled honest reporting, which enabled learning.",
      whyItWorks: [
        "You can't learn from what you can't admit to yourself",
        "Self-judgment activates defense mechanisms that block honest analysis",
        "Shame inhibits the reflection process entirely",
        "Normalizing mistakes creates space for genuine insight",
      ],
      alsoSupportedBy: [
        "Improv comedy (Second City): 'You cannot be creative when you're in judgment of self'",
        "Blameless postmortems in software: Focus on WHAT happened, not WHO caused it",
        "Self-compassion research: Less rumination and fear of failure with self-kindness",
      ],
      topPerformers: "Elite teams in tech, aviation, and healthcare all cultivate blameless cultures—because blame blocks learning.",
    },
  },
  {
    id: "feedback-paradox",
    value: "1 in 3",
    label: "Reflections",
    detail: "hurt instead of help",
    hoverPreview: "Not all reflection helps. Some makes you worse.",
    fullDescription: "A landmark meta-analysis of 607 studies found that 1/3 of the time, feedback actually DECREASES performance. Feedback harms when it shifts attention to ego instead of the task, or when you're already anxious. That's why process-focused reflection matters.",
    icon: <Scale className="size-5" />,
    nerdBox: {
      primaryStudy: "Kluger & DeNisi meta-analysis (607 studies) on feedback interventions",
      keyQuote: "Providing feedback is like gambling: on average you gain, but there's a 40% chance of actually hurting performance.",
      whyItWorks: [
        "Feedback harms when attention shifts to self/ego instead of task",
        "Complex, unfamiliar tasks + high cognitive load = feedback backfires",
        "Feedback for already-anxious people often makes things worse",
        "Person-focused feedback ('you are...') harms more than task-focused ('this approach...')",
      ],
      alsoSupportedBy: [
        "Sports psychology: Gentler feedback when struggling, direct feedback when confident",
        "Trading psychology: Judge decisions, not outcomes—good process can have bad results",
        "Self-compassion research: Self-criticism doesn't motivate, it paralyzes",
      ],
      topPerformers: "The best coaches calibrate feedback intensity to the athlete's current state—pushing hard when confident, supporting gently when struggling.",
    },
  },
]
