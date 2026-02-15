"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Loader2,
  FileText,
  ArrowLeft,
  Check,
  Settings2,
  ArrowRight,
  Star,
  Heart,
  Zap,
  Microscope,
  Flame,
  // Icons for ultra-short templates
  RefreshCw,
  Activity,
  HelpCircle,
  Trophy,
  CircleDot,
  // Icons for research-backed templates
  Mic,
  ListChecks,
  BarChart3,
  Lightbulb,
  // Icons for deep dive templates
  Layers,
  Crosshair,
  Brain,
  Search,
  HeartHandshake,
  // Icons for quick intervention templates (Section 4)
  Plane,
  PlaySquare,
  AlertTriangle,
  Users,
  GitBranch,
  // Icons for focused reflection templates (Section 5)
  LayoutGrid,
  Rewind,
  Award,
  MapPin,
  Sparkles,
  // Icons for emotional processing templates (Section 6)
  Angry,
  Globe,
  Clock,
  Shuffle,
  PenTool,
  // Icons for skill & strategy templates (Section 7)
  Crosshair as CrosshairIcon,
  Focus,
  Eye,
  FlaskConical,
  Calendar,
} from "lucide-react"
import Link from "next/link"
import type { FieldReportTemplateRow, TemplateField } from "@/src/db/trackingTypes"
import { TEMPLATE_COLORS, TEMPLATE_TAGLINES, type TemplateSlug } from "@/src/tracking/data"

// ============================================================================
// ULTRA-SHORT TEMPLATES (the 5 proposed templates)
// ============================================================================

interface UltraShortTemplate {
  id: string
  slug: string
  name: string
  description: string
  tagline: string
  icon: React.ReactNode
  time: string
  fields: TemplateField[]
  color: {
    bg: string
    icon: string
    gradient: string
    border: string
  }
}

// ============================================================================
// SECTION 1: Original Ultra-Short Templates
// ============================================================================
const ULTRA_SHORT_TEMPLATES: UltraShortTemplate[] = [
  {
    id: "ultra-driscoll",
    slug: "driscoll",
    name: "The Driscoll",
    description: "Complete learning cycle in 3 questions",
    tagline: "What? So What? Now What?",
    icon: <RefreshCw className="size-5" />,
    time: "~45s",
    color: {
      bg: "bg-cyan-500/10",
      icon: "bg-cyan-500 text-white",
      gradient: "from-cyan-500/30 via-cyan-500/10 to-blue-500/20",
      border: "border-cyan-500/50 hover:border-cyan-500",
    },
    fields: [
      { id: "what_happened", type: "text", label: "What happened?", placeholder: "Brief description", required: true },
      { id: "what_learned", type: "text", label: "What did you learn?", placeholder: "Key insight", required: true },
      { id: "what_differently", type: "text", label: "What will you do differently?", placeholder: "Next time...", required: true },
    ],
  },
  {
    id: "ultra-pulse",
    slug: "pulse",
    name: "The Pulse",
    description: "Fastest capture - just mood + win",
    tagline: "Emotional check-in",
    icon: <Activity className="size-5" />,
    time: "~15s",
    color: {
      bg: "bg-pink-500/10",
      icon: "bg-pink-500 text-white",
      gradient: "from-pink-500/30 via-pink-500/10 to-rose-500/20",
      border: "border-pink-500/50 hover:border-pink-500",
    },
    fields: [
      { id: "mood", type: "select", label: "How do you feel?", options: ["😤", "😐", "😊", "🔥"], required: true },
      { id: "best_moment", type: "text", label: "Best moment in one sentence", placeholder: "The highlight was..." },
    ],
  },
  {
    id: "ultra-critical",
    slug: "critical-question",
    name: "The Critical Question",
    description: "The two most diagnostic questions",
    tagline: "80/20 of learning",
    icon: <HelpCircle className="size-5" />,
    time: "~1-2m",
    color: {
      bg: "bg-orange-500/10",
      icon: "bg-orange-500 text-white",
      gradient: "from-orange-500/30 via-orange-500/10 to-amber-500/20",
      border: "border-orange-500/50 hover:border-orange-500",
    },
    fields: [
      { id: "why_ended", type: "textarea", label: "Why did it end?", placeholder: "What caused the interaction to stop?", rows: 2, required: true },
      { id: "do_differently", type: "text", label: "What would you do differently?", placeholder: "If I could replay it..." },
    ],
  },
  {
    id: "ultra-win",
    slug: "win",
    name: "The Win",
    description: "Pure positive capture",
    tagline: "Celebrate wins",
    icon: <Trophy className="size-5" />,
    time: "~20-30s",
    color: {
      bg: "bg-emerald-500/10",
      icon: "bg-emerald-500 text-white",
      gradient: "from-emerald-500/30 via-emerald-500/10 to-green-500/20",
      border: "border-emerald-500/50 hover:border-emerald-500",
    },
    fields: [
      { id: "what_went_well", type: "textarea", label: "What went well today?", placeholder: "Celebrate something...", rows: 2, required: true },
    ],
  },
  {
    id: "ultra-intention",
    slug: "intention-check",
    name: "The Intention Check",
    description: "Compare intended vs actual",
    tagline: "AAR style accountability",
    icon: <CircleDot className="size-5" />,
    time: "~20s",
    color: {
      bg: "bg-violet-500/10",
      icon: "bg-violet-500 text-white",
      gradient: "from-violet-500/30 via-violet-500/10 to-purple-500/20",
      border: "border-violet-500/50 hover:border-violet-500",
    },
    fields: [
      { id: "intention", type: "text", label: "What was your intention?", placeholder: "I wanted to...", required: true },
      { id: "fulfilled", type: "select", label: "Did you fulfill it?", options: ["Yes", "Partially", "No"], required: true },
    ],
  },
]

// ============================================================================
// SECTION 2: Research-Backed Short Templates
// Based on field report research from sports psychology, healthcare, sales, and poker/trading
// ============================================================================

interface ResearchTemplate extends UltraShortTemplate {
  origin: string
  citation: string
}

const RESEARCH_BACKED_TEMPLATES: ResearchTemplate[] = [
  {
    id: "research-voice-memo",
    slug: "voice-memo",
    name: "The Voice Memo",
    description: "Fastest capture - record immediately after, transcribe later",
    tagline: "Capture before it fades",
    icon: <Mic className="size-5" />,
    time: "30s-2m",
    origin: "Community Practice",
    citation: "One Man's Life Mission: 'Record audio voice memos at end of each approach while fresh.'",
    color: {
      bg: "bg-red-500/10",
      icon: "bg-red-500 text-white",
      gradient: "from-red-500/30 via-red-500/10 to-orange-500/20",
      border: "border-red-500/50 hover:border-red-500",
    },
    fields: [
      { id: "went_well", type: "text", label: "One thing that went well", placeholder: "The best part was...", required: true },
      { id: "try_differently", type: "text", label: "One thing to try differently", placeholder: "Next time I'll...", required: true },
      { id: "feeling_now", type: "select", label: "How are you feeling?", options: ["Energized", "Neutral", "Drained", "Frustrated"], required: true },
    ],
  },
  {
    id: "research-driscoll",
    slug: "driscoll-healthcare",
    name: "The Driscoll Model",
    description: "Complete learning cycle in 3 questions - used by 63% of healthcare professionals",
    tagline: "What? So What? Now What?",
    icon: <RefreshCw className="size-5" />,
    time: "~5m",
    origin: "Healthcare Reflection",
    citation: "Driscoll's Model of Reflection - standard in nursing and medical education",
    color: {
      bg: "bg-teal-500/10",
      icon: "bg-teal-500 text-white",
      gradient: "from-teal-500/30 via-teal-500/10 to-cyan-500/20",
      border: "border-teal-500/50 hover:border-teal-500",
    },
    fields: [
      { id: "what", type: "textarea", label: "What happened?", placeholder: "Describe the situation factually...", rows: 2, required: true },
      { id: "so_what", type: "textarea", label: "So what? (What was significant?)", placeholder: "What did you learn? What stood out?", rows: 2, required: true },
      { id: "now_what", type: "text", label: "Now what? (What will you do differently?)", placeholder: "Next time I will...", required: true },
    ],
  },
  {
    id: "research-well-better-how",
    slug: "well-better-how",
    name: "Well, Better, How",
    description: "Sports psychology standard - helps 'let the game go'",
    tagline: "Three sentences to growth",
    icon: <ListChecks className="size-5" />,
    time: "~5m",
    origin: "Sports Psychology",
    citation: "Brian Cain Peak Performance: 'Writing down your well, better, how notes post-training helps you to let the game go.'",
    color: {
      bg: "bg-blue-500/10",
      icon: "bg-blue-500 text-white",
      gradient: "from-blue-500/30 via-blue-500/10 to-indigo-500/20",
      border: "border-blue-500/50 hover:border-blue-500",
    },
    fields: [
      { id: "well", type: "textarea", label: "What did I do WELL?", placeholder: "I did well at...", rows: 2, required: true },
      { id: "better", type: "textarea", label: "What can I do BETTER?", placeholder: "I could improve...", rows: 2, required: true },
      { id: "how", type: "text", label: "HOW am I going to get better?", placeholder: "Specific action: I will...", required: true },
    ],
  },
  {
    id: "research-321",
    slug: "three-two-one",
    name: "The 3-2-1",
    description: "Balanced ratio of positives to improvements - structured but fast",
    tagline: "3 highlights, 2 lowlights, 1 forward",
    icon: <BarChart3 className="size-5" />,
    time: "~4-5m",
    origin: "Sports Psychology",
    citation: "Bridge Athletic: 3 Highlights, 2 Lowlights, 1 Forward - the skill of reflecting",
    color: {
      bg: "bg-purple-500/10",
      icon: "bg-purple-500 text-white",
      gradient: "from-purple-500/30 via-purple-500/10 to-fuchsia-500/20",
      border: "border-purple-500/50 hover:border-purple-500",
    },
    fields: [
      { id: "highlight_1", type: "text", label: "Highlight 1", placeholder: "Something positive...", required: true },
      { id: "highlight_2", type: "text", label: "Highlight 2", placeholder: "Another positive...", required: true },
      { id: "highlight_3", type: "text", label: "Highlight 3", placeholder: "One more positive...", required: true },
      { id: "lowlight_1", type: "text", label: "Lowlight 1", placeholder: "Area for improvement...", required: true },
      { id: "lowlight_2", type: "text", label: "Lowlight 2", placeholder: "Another area...", required: true },
      { id: "forward", type: "text", label: "1 Forward - Lesson to carry", placeholder: "The key takeaway is...", required: true },
    ],
  },
  {
    id: "research-decision-quality",
    slug: "decision-quality",
    name: "One Takeaway + Decision",
    description: "Separates decision quality from outcomes - critical for skill development",
    tagline: "Good decisions can have bad outcomes",
    icon: <Lightbulb className="size-5" />,
    time: "~5-7m",
    origin: "Sales + Poker/Trading",
    citation: "Jared Tendler (Poker): 'Focus on decision quality, not outcome. Good decisions can have bad outcomes (variance).'",
    color: {
      bg: "bg-amber-500/10",
      icon: "bg-amber-500 text-white",
      gradient: "from-amber-500/30 via-amber-500/10 to-yellow-500/20",
      border: "border-amber-500/50 hover:border-amber-500",
    },
    fields: [
      { id: "pre_state", type: "select", label: "Pre-state: Mindset/energy going in?", options: ["1-3 Low", "4-6 Medium", "7-10 High"], required: true },
      { id: "key_decision", type: "textarea", label: "Key decision: One moment where you made a choice", placeholder: "I decided to...", rows: 2, required: true },
      { id: "decision_quality", type: "select", label: "Was it a GOOD decision (regardless of outcome)?", options: ["Yes - right call", "Unsure", "No - wrong call"], required: true },
      { id: "why_quality", type: "text", label: "Why was it good/bad?", placeholder: "Because..." },
      { id: "one_takeaway", type: "text", label: "One takeaway to remember", placeholder: "The insight is...", required: true },
    ],
  },
]

// ============================================================================
// SECTION 3: Deep Dive Templates (15-30 minutes)
// For thorough reflection when you have time and want maximum learning extraction
// ============================================================================

const DEEP_DIVE_TEMPLATES: ResearchTemplate[] = [
  {
    id: "deep-gibbs",
    slug: "gibbs-cycle",
    name: "Gibbs' Full Cycle",
    description: "Complete 6-stage reflective cycle used by 63% of healthcare professionals",
    tagline: "The gold standard of reflection",
    icon: <Layers className="size-5" />,
    time: "15-20m",
    origin: "Healthcare Reflection",
    citation: "Gibbs' Reflective Cycle (1988) - standard in nursing education and medical training worldwide",
    color: {
      bg: "bg-emerald-600/10",
      icon: "bg-emerald-600 text-white",
      gradient: "from-emerald-600/30 via-emerald-600/10 to-teal-600/20",
      border: "border-emerald-600/50 hover:border-emerald-600",
    },
    fields: [
      { id: "description", type: "textarea", label: "1. Description: What happened?", placeholder: "Describe the situation factually...", rows: 3, required: true },
      { id: "feelings", type: "textarea", label: "2. Feelings: What were you thinking and feeling?", placeholder: "During the interaction I felt...", rows: 2, required: true },
      { id: "evaluation_good", type: "textarea", label: "3a. Evaluation: What was good?", placeholder: "The positive aspects were...", rows: 2, required: true },
      { id: "evaluation_bad", type: "textarea", label: "3b. Evaluation: What was bad?", placeholder: "The challenging aspects were...", rows: 2, required: true },
      { id: "analysis", type: "textarea", label: "4. Analysis: What sense can you make of the situation?", placeholder: "Looking deeper, I think this happened because...", rows: 3, required: true },
      { id: "conclusion", type: "textarea", label: "5. Conclusion: What else could you have done?", placeholder: "Alternative approaches could have been...", rows: 2, required: true },
      { id: "action_plan", type: "textarea", label: "6. Action Plan: If this arose again, what would you do?", placeholder: "Next time I will specifically...", rows: 2, required: true },
    ],
  },
  {
    id: "deep-aar",
    slug: "strategic-aar",
    name: "The Strategic AAR",
    description: "Military After Action Review - comparing intended vs. actual execution",
    tagline: "What did we plan? What actually happened?",
    icon: <Crosshair className="size-5" />,
    time: "15-20m",
    origin: "US Military",
    citation: "US Army FM 7-0: 'One of the most successful organizational learning methods yet devised.'",
    color: {
      bg: "bg-slate-600/10",
      icon: "bg-slate-600 text-white",
      gradient: "from-slate-600/30 via-slate-600/10 to-zinc-600/20",
      border: "border-slate-600/50 hover:border-slate-600",
    },
    fields: [
      { id: "intended", type: "textarea", label: "Pre-Session Goal: What did you intend to accomplish?", placeholder: "My plan/goal was to...", rows: 2, required: true },
      { id: "actual", type: "textarea", label: "Execution Summary: What actually happened?", placeholder: "What actually occurred was...", rows: 3, required: true },
      { id: "gap_analysis", type: "textarea", label: "Gap Analysis: Where did intended ≠ actual? Why?", placeholder: "The gaps between plan and reality were...", rows: 3, required: true },
      { id: "what_worked", type: "textarea", label: "What Worked: What contributed to success?", placeholder: "Things that helped were...", rows: 2, required: true },
      { id: "what_didnt", type: "textarea", label: "What Didn't Work: What hindered you?", placeholder: "Things that got in the way were...", rows: 2, required: true },
      { id: "root_cause", type: "textarea", label: "Root Cause: Why did it happen that way? (dig deeper)", placeholder: "The underlying reason was...", rows: 2, required: true },
      { id: "adaptation", type: "textarea", label: "Adaptation: What specific changes will you make?", placeholder: "Next time I will change...", rows: 2, required: true },
      { id: "carry_forward", type: "text", label: "Carry Forward: One lesson to internalize", placeholder: "The key insight is...", required: true },
    ],
  },
  {
    id: "deep-cbt",
    slug: "cbt-thought-diary",
    name: "CBT Thought Diary",
    description: "Cognitive Behavioral Therapy technique to identify and reframe negative thought patterns",
    tagline: "Challenge your automatic thoughts",
    icon: <Brain className="size-5" />,
    time: "20-30m",
    origin: "Cognitive Behavioral Therapy",
    citation: "Based on Beck's Cognitive Therapy - 'Thoughts influence emotions, which influence behavior.'",
    color: {
      bg: "bg-indigo-600/10",
      icon: "bg-indigo-600 text-white",
      gradient: "from-indigo-600/30 via-indigo-600/10 to-violet-600/20",
      border: "border-indigo-600/50 hover:border-indigo-600",
    },
    fields: [
      { id: "situation", type: "textarea", label: "1. Situation: What happened? (objective facts only)", placeholder: "The factual situation was...", rows: 2, required: true },
      { id: "automatic_thoughts", type: "textarea", label: "2. Automatic Thoughts: What went through your mind?", placeholder: "I thought to myself...", rows: 2, required: true },
      { id: "emotions", type: "text", label: "3. Emotions: What did you feel? Rate intensity (0-100)", placeholder: "e.g., Anxious (70), Embarrassed (50)", required: true },
      { id: "distortions", type: "select", label: "4. Cognitive Distortions: Which apply?", options: ["All-or-nothing", "Catastrophizing", "Mind-reading", "Overgeneralization", "Discounting positives", "Multiple/Other"], required: true },
      { id: "evidence_for", type: "textarea", label: "5. Evidence FOR the thought: What supports it being true?", placeholder: "Evidence that supports this thought...", rows: 2, required: true },
      { id: "evidence_against", type: "textarea", label: "6. Evidence AGAINST: What contradicts it? What would you tell a friend?", placeholder: "Evidence against this thought / what I'd tell a friend...", rows: 2, required: true },
      { id: "balanced_thought", type: "textarea", label: "7. Balanced Thought: More realistic perspective", placeholder: "A more balanced way to see this is...", rows: 2, required: true },
      { id: "outcome", type: "text", label: "8. Outcome: How do you feel now? (0-100)", placeholder: "e.g., Anxious (30), Hopeful (60)", required: true },
    ],
  },
  {
    id: "deep-pattern-hunter",
    slug: "pattern-hunter",
    name: "The Pattern Hunter",
    description: "Multi-moment analysis separating decision quality from outcomes",
    tagline: "Find the patterns across your decisions",
    icon: <Search className="size-5" />,
    time: "20-25m",
    origin: "Poker/Trading + Community",
    citation: "Jared Tendler: 'Emotions are signals, not obstacles. They point to deeper patterns.'",
    color: {
      bg: "bg-orange-600/10",
      icon: "bg-orange-600 text-white",
      gradient: "from-orange-600/30 via-orange-600/10 to-red-600/20",
      border: "border-orange-600/50 hover:border-orange-600",
    },
    fields: [
      { id: "pre_energy", type: "select", label: "Pre-State: Energy level (1-10)", options: ["1-3 Low", "4-6 Medium", "7-10 High"], required: true },
      { id: "pre_mood", type: "select", label: "Pre-State: Mood", options: ["Confident", "Neutral", "Anxious", "Frustrated"], required: true },
      { id: "session_overview", type: "textarea", label: "Session Overview: How many interactions? General vibe?", placeholder: "Overall the session was...", rows: 2, required: true },
      { id: "moment_1", type: "textarea", label: "Key Moment #1: What happened? What did you decide? Good/bad decision?", placeholder: "Moment 1...", rows: 3, required: true },
      { id: "moment_2", type: "textarea", label: "Key Moment #2: What happened? What did you decide? Good/bad decision?", placeholder: "Moment 2...", rows: 3, required: true },
      { id: "moment_3", type: "textarea", label: "Key Moment #3: What happened? What did you decide? Good/bad decision?", placeholder: "Moment 3...", rows: 3 },
      { id: "emotional_tipping", type: "textarea", label: "Emotional Tipping Points: Where did emotions help or hurt you?", placeholder: "Emotions affected my performance when...", rows: 2, required: true },
      { id: "pattern_check", type: "textarea", label: "Pattern Check: Does this connect to patterns from previous sessions?", placeholder: "I'm noticing a pattern of...", rows: 2, required: true },
      { id: "skill_vs_variance", type: "textarea", label: "Skill vs. Variance: What was in your control? What wasn't?", placeholder: "Within my control: ... Outside my control: ...", rows: 2, required: true },
      { id: "one_focus", type: "text", label: "One Focus Area: What ONE thing will you work on next?", placeholder: "Next session I will focus on...", required: true },
    ],
  },
  {
    id: "deep-phoenix",
    slug: "phoenix-protocol",
    name: "The Phoenix Protocol",
    description: "Deep recovery template for processing particularly difficult sessions",
    tagline: "Rise from the ashes",
    icon: <HeartHandshake className="size-5" />,
    time: "25-30m",
    origin: "Psychology + Community",
    citation: "Kristin Neff: 'Self-compassion involves treating yourself with the same kindness you would offer a good friend.'",
    color: {
      bg: "bg-rose-600/10",
      icon: "bg-rose-600 text-white",
      gradient: "from-rose-600/30 via-rose-600/10 to-pink-600/20",
      border: "border-rose-600/50 hover:border-rose-600",
    },
    fields: [
      { id: "acknowledge", type: "textarea", label: "Acknowledge: What happened? (just facts, no judgment)", placeholder: "What happened was...", rows: 3, required: true },
      { id: "feel", type: "textarea", label: "Feel: How are you feeling right now? Name the emotions.", placeholder: "Right now I'm feeling...", rows: 2, required: true },
      { id: "normalize", type: "textarea", label: "Normalize: Remember - this is a moment of difficulty. Struggling is part of learning.", placeholder: "This is difficult, and that's okay because...", rows: 2, required: true },
      { id: "friend_test", type: "textarea", label: "Friend Test: What would you tell a close friend who just experienced this?", placeholder: "I would tell them...", rows: 3, required: true },
      { id: "extract_learning", type: "textarea", label: "Extract Learning: What's one thing you can genuinely learn from this?", placeholder: "The genuine lesson here is...", rows: 2, required: true },
      { id: "reframe", type: "textarea", label: "Reframe: Is there another way to see this? (not toxic positivity - genuine reframe)", placeholder: "Another perspective could be...", rows: 2, required: true },
      { id: "worst_case", type: "textarea", label: "Worst Case Reality: What's the actual worst-case outcome? Is it survivable?", placeholder: "The worst that could happen is... and I can survive that because...", rows: 2, required: true },
      { id: "action_forward", type: "text", label: "Action Forward: One small, concrete action for next time", placeholder: "Next time I will...", required: true },
      { id: "self_compassion", type: "textarea", label: "Self-Compassion Close: Write one kind thing to yourself about this experience", placeholder: "I want to remind myself that...", rows: 2, required: true },
    ],
  },
]

// ============================================================================
// SECTION 4: Quick Interventions (1-3 minutes)
// Targeted tools for specific needs - pre-session, emotional check, behavior change
// ============================================================================

const QUICK_INTERVENTION_TEMPLATES: ResearchTemplate[] = [
  {
    id: "intervention-preflight",
    slug: "pre-flight",
    name: "The Pre-Flight",
    description: "Set your intention before you go out - the only pre-session template",
    tagline: "Set your intention before you go",
    icon: <Plane className="size-5" />,
    time: "~45s-1m",
    origin: "Aviation CRM + Poker",
    citation: "CRM research: 'Pre-flight briefing: Set session goals before going out.' Poker journals emphasize pre-session mindset checks.",
    color: {
      bg: "bg-sky-500/10",
      icon: "bg-sky-500 text-white",
      gradient: "from-sky-500/30 via-sky-500/10 to-blue-500/20",
      border: "border-sky-500/50 hover:border-sky-500",
    },
    fields: [
      { id: "goal", type: "text", label: "What's your goal for today?", placeholder: "Today I want to...", required: true },
      { id: "energy", type: "select", label: "Energy level right now", options: ["1-3 Low", "4-6 Medium", "7-10 High"], required: true },
      { id: "focus", type: "text", label: "One thing you'll focus on", placeholder: "I'll specifically work on...", required: true },
    ],
  },
  {
    id: "intervention-startstop",
    slug: "start-stop-continue",
    name: "Start-Stop-Continue",
    description: "Classic agile format - three buckets for immediate change",
    tagline: "Three buckets for change",
    icon: <PlaySquare className="size-5" />,
    time: "~2m",
    origin: "Agile Retrospectives",
    citation: "Atlassian: 'Start-Stop-Continue - What to start, stop, continue doing.'",
    color: {
      bg: "bg-lime-500/10",
      icon: "bg-lime-500 text-white",
      gradient: "from-lime-500/30 via-lime-500/10 to-green-500/20",
      border: "border-lime-500/50 hover:border-lime-500",
    },
    fields: [
      { id: "start", type: "text", label: "START: One new thing to try", placeholder: "I'll start...", required: true },
      { id: "stop", type: "text", label: "STOP: One thing to drop", placeholder: "I'll stop...", required: true },
      { id: "continue", type: "text", label: "CONTINUE: One thing that's working", placeholder: "I'll keep doing...", required: true },
    ],
  },
  {
    id: "intervention-tilt",
    slug: "tilt-check",
    name: "The Tilt Check",
    description: "Quick emotional interference detector from poker psychology",
    tagline: "Catch emotional interference",
    icon: <AlertTriangle className="size-5" />,
    time: "~1m",
    origin: "Poker/Trading Psychology",
    citation: "Jared Tendler's tilt indicators: 'Frustration beyond normal, Changing approach out of panic, Overconfidence after early success.'",
    color: {
      bg: "bg-red-500/10",
      icon: "bg-red-500 text-white",
      gradient: "from-red-500/30 via-red-500/10 to-orange-500/20",
      border: "border-red-500/50 hover:border-red-500",
    },
    fields: [
      { id: "tilt_signs", type: "select", label: "Did any of these happen?", options: ["Frustration", "Panic-changing", "Overconfidence", "Going through motions", "None"], required: true },
      { id: "when_noticed", type: "text", label: "When did you notice?", placeholder: "I noticed when..." },
      { id: "trigger", type: "text", label: "What triggered it?", placeholder: "It was triggered by..." },
    ],
  },
  {
    id: "intervention-friend",
    slug: "friend-test",
    name: "The Friend Test",
    description: "Quick self-compassion intervention - treat yourself like a friend",
    tagline: "What would you tell a friend?",
    icon: <Users className="size-5" />,
    time: "~2m",
    origin: "Self-Compassion (Kristin Neff)",
    citation: "Neff: 'Self-compassion involves treating yourself with the same kindness you would offer a good friend.'",
    color: {
      bg: "bg-pink-500/10",
      icon: "bg-pink-500 text-white",
      gradient: "from-pink-500/30 via-pink-500/10 to-rose-500/20",
      border: "border-pink-500/50 hover:border-pink-500",
    },
    fields: [
      { id: "what_happened", type: "text", label: "Briefly, what happened?", placeholder: "What happened was...", required: true },
      { id: "self_treatment", type: "text", label: "How are you treating yourself about it?", placeholder: "I'm telling myself...", required: true },
      { id: "friend_advice", type: "textarea", label: "What would you tell a close friend?", placeholder: "I would tell them...", rows: 2, required: true },
      { id: "can_offer", type: "select", label: "Can you offer that same compassion?", options: ["Yes", "Working on it", "It's hard"], required: true },
    ],
  },
  {
    id: "intervention-ifthen",
    slug: "if-then",
    name: "The If-Then",
    description: "Implementation intentions - turn insight into autopilot behavior",
    tagline: "Turn insight into autopilot",
    icon: <GitBranch className="size-5" />,
    time: "~1m",
    origin: "Implementation Intentions (Gollwitzer)",
    citation: "Meta-analysis of 94 studies: d=0.65 effect size. 'Difficult goals completed 3x more often with implementation intentions.'",
    color: {
      bg: "bg-violet-500/10",
      icon: "bg-violet-500 text-white",
      gradient: "from-violet-500/30 via-violet-500/10 to-purple-500/20",
      border: "border-violet-500/50 hover:border-violet-500",
    },
    fields: [
      { id: "situation", type: "text", label: "Situation that challenged you", placeholder: "Today I faced...", required: true },
      { id: "if_clause", type: "text", label: "IF this comes up again...", placeholder: "If I encounter...", required: true },
      { id: "then_clause", type: "text", label: "THEN I will...", placeholder: "Then I will...", required: true },
    ],
  },
]

// ============================================================================
// SECTION 5: Focused Reflections (2-5 minutes)
// Deeper but targeted - specific angles on reflection
// ============================================================================

const FOCUSED_REFLECTION_TEMPLATES: ResearchTemplate[] = [
  {
    id: "focused-4ls",
    slug: "four-ls",
    name: "The 4 Ls",
    description: "Full emotional inventory including what you wished had happened",
    tagline: "Liked, Learned, Lacked, Longed For",
    icon: <LayoutGrid className="size-5" />,
    time: "~5m",
    origin: "Agile Retrospectives",
    citation: "From Agile: '4 Ls - Liked, Learned, Lacked, Longed for' - captures both positive and aspirational thinking.",
    color: {
      bg: "bg-indigo-500/10",
      icon: "bg-indigo-500 text-white",
      gradient: "from-indigo-500/30 via-indigo-500/10 to-blue-500/20",
      border: "border-indigo-500/50 hover:border-indigo-500",
    },
    fields: [
      { id: "liked", type: "textarea", label: "LIKED: What did you enjoy?", placeholder: "I liked...", rows: 2, required: true },
      { id: "learned", type: "textarea", label: "LEARNED: What insight did you gain?", placeholder: "I learned...", rows: 2, required: true },
      { id: "lacked", type: "textarea", label: "LACKED: What was missing?", placeholder: "I lacked...", rows: 2, required: true },
      { id: "longed_for", type: "textarea", label: "LONGED FOR: What do you wish had happened?", placeholder: "I wished...", rows: 2, required: true },
    ],
  },
  {
    id: "focused-rewind",
    slug: "rewind",
    name: "The Rewind",
    description: "Focus on the lead-up - what happened BEFORE the key moment",
    tagline: "What happened BEFORE the moment?",
    icon: <Rewind className="size-5" />,
    time: "~3m",
    origin: "BJJ 'Off the Move' Analysis",
    citation: "BJJ Scout: 'Focus on off the move - what happens BEFORE the technique. You see what really works, the circumstances under which it works.'",
    color: {
      bg: "bg-cyan-600/10",
      icon: "bg-cyan-600 text-white",
      gradient: "from-cyan-600/30 via-cyan-600/10 to-teal-600/20",
      border: "border-cyan-600/50 hover:border-cyan-600",
    },
    fields: [
      { id: "key_moment", type: "text", label: "The key moment", placeholder: "The moment was...", required: true },
      { id: "before", type: "textarea", label: "What happened 30 seconds before?", placeholder: "Before that...", rows: 3, required: true },
      { id: "setup", type: "text", label: "What set you up for success/failure?", placeholder: "The setup was...", required: true },
      { id: "change_setup", type: "text", label: "What would've changed the setup?", placeholder: "Next time I could...", required: true },
    ],
  },
  {
    id: "focused-mastery",
    slug: "mastery-log",
    name: "The Mastery Log",
    description: "Document proof of capability - build self-efficacy through evidence",
    tagline: "Document proof of capability",
    icon: <Award className="size-5" />,
    time: "~3m",
    origin: "Self-Efficacy Theory (Bandura)",
    citation: "Bandura: Mastery experiences are the #1 source of self-efficacy. 'Successfully navigating setbacks can lead to even stronger self-belief.'",
    color: {
      bg: "bg-amber-500/10",
      icon: "bg-amber-500 text-white",
      gradient: "from-amber-500/30 via-amber-500/10 to-yellow-500/20",
      border: "border-amber-500/50 hover:border-amber-500",
    },
    fields: [
      { id: "did_well", type: "text", label: "One thing you did well", placeholder: "I did well at...", required: true },
      { id: "why_worked", type: "text", label: "What made it work?", placeholder: "It worked because...", required: true },
      { id: "challenge", type: "text", label: "One challenge you navigated", placeholder: "I faced...", required: true },
      { id: "how_handled", type: "text", label: "How did you handle it?", placeholder: "I handled it by...", required: true },
      { id: "proves", type: "text", label: "What does this prove about you?", placeholder: "This shows that I...", required: true },
    ],
  },
  {
    id: "focused-context",
    slug: "context-check",
    name: "The Context Check",
    description: "Audit external factors - separate controllables from uncontrollables",
    tagline: "What external factors mattered?",
    icon: <MapPin className="size-5" />,
    time: "~2m",
    origin: "Habit Science + Aviation CRM",
    citation: "Habit science: 'Environmental cues +58% adherence.' Separating controllables from uncontrollables is key in poker/trading and aviation.",
    color: {
      bg: "bg-emerald-500/10",
      icon: "bg-emerald-500 text-white",
      gradient: "from-emerald-500/30 via-emerald-500/10 to-green-500/20",
      border: "border-emerald-500/50 hover:border-emerald-500",
    },
    fields: [
      { id: "location", type: "text", label: "Location today", placeholder: "I was at...", required: true },
      { id: "time_of_day", type: "select", label: "Time of day", options: ["Morning", "Afternoon", "Evening", "Night"], required: true },
      { id: "energy_in", type: "select", label: "Energy level going in", options: ["Low", "Medium", "High"], required: true },
      { id: "helped", type: "text", label: "External factors that helped", placeholder: "Things that helped..." },
      { id: "hurt", type: "text", label: "External factors that hurt", placeholder: "Things that hurt..." },
    ],
  },
  {
    id: "focused-reframe",
    slug: "quick-reframe",
    name: "The Quick Reframe",
    description: "Spot cognitive distortions quickly - lighter version of CBT",
    tagline: "Spot the thought trap",
    icon: <Sparkles className="size-5" />,
    time: "~2m",
    origin: "Cognitive Behavioral Therapy",
    citation: "CBT research on cognitive distortions. This quick version catches distortions without the full 20-30 minute diary process.",
    color: {
      bg: "bg-fuchsia-500/10",
      icon: "bg-fuchsia-500 text-white",
      gradient: "from-fuchsia-500/30 via-fuchsia-500/10 to-purple-500/20",
      border: "border-fuchsia-500/50 hover:border-fuchsia-500",
    },
    fields: [
      { id: "negative_thought", type: "text", label: "A negative thought you had", placeholder: "I thought...", required: true },
      { id: "distortion", type: "select", label: "Which distortion might this be?", options: ["All-or-nothing", "Catastrophizing", "Mind-reading", "Overgeneralization", "Discounting positives"], required: true },
      { id: "evidence_against", type: "text", label: "Evidence against this thought", placeholder: "But actually...", required: true },
      { id: "balanced", type: "text", label: "More balanced take", placeholder: "A more balanced view is...", required: true },
    ],
  },
]

// ============================================================================
// SECTION 6: Emotional Processing Templates (2-5 minutes)
// Templates focused on emotional awareness, perspective, and expression
// ============================================================================

const EMOTIONAL_PROCESSING_TEMPLATES: ResearchTemplate[] = [
  {
    id: "emotional-mad-sad-glad",
    slug: "mad-sad-glad",
    name: "The Mad-Sad-Glad",
    description: "Simple emotional categorization in three buckets",
    tagline: "Sort your feelings fast",
    icon: <Angry className="size-5" />,
    time: "~2m",
    origin: "Agile Retrospectives",
    citation: "Popular agile format for quick emotional processing. Simpler than 4 Ls - purely emotional, no cognitive analysis.",
    color: {
      bg: "bg-red-400/10",
      icon: "bg-red-400 text-white",
      gradient: "from-red-400/30 via-yellow-400/10 to-green-400/20",
      border: "border-red-400/50 hover:border-red-400",
    },
    fields: [
      { id: "mad", type: "text", label: "What made you MAD? (frustrations)", placeholder: "I was frustrated by...", required: true },
      { id: "sad", type: "text", label: "What made you SAD? (disappointments)", placeholder: "I was disappointed that...", required: true },
      { id: "glad", type: "text", label: "What made you GLAD? (wins)", placeholder: "I was happy about...", required: true },
    ],
  },
  {
    id: "emotional-common-humanity",
    slug: "common-humanity",
    name: "The Common Humanity",
    description: "Remember you're not alone - millions have been exactly here",
    tagline: "You're not the only one",
    icon: <Globe className="size-5" />,
    time: "~2m",
    origin: "Kristin Neff Self-Compassion",
    citation: "Neff's research shows 'common humanity' reduces isolation feelings. Component #2 of self-compassion: 'Struggle is part of the shared human experience.'",
    color: {
      bg: "bg-blue-400/10",
      icon: "bg-blue-400 text-white",
      gradient: "from-blue-400/30 via-blue-400/10 to-cyan-400/20",
      border: "border-blue-400/50 hover:border-blue-400",
    },
    fields: [
      { id: "failure", type: "text", label: "What feels like personal failure?", placeholder: "I feel like I failed at...", required: true },
      { id: "how_many", type: "select", label: "How many others have experienced this exact thing?", options: ["Thousands", "Millions", "Everyone at some point"], required: true },
      { id: "mentor_says", type: "textarea", label: "What would a wise mentor who's been there say?", placeholder: "They would tell me...", rows: 2, required: true },
    ],
  },
  {
    id: "emotional-five-year",
    slug: "five-year-view",
    name: "The Five Year View",
    description: "Zoom out for perspective - cognitive distancing technique",
    tagline: "How will future-you see this?",
    icon: <Clock className="size-5" />,
    time: "~2m",
    origin: "Emotion Regulation Research",
    citation: "Research shows distancing ('How will I view this in 5 years?') is a powerful reappraisal tactic that reduces emotional intensity.",
    color: {
      bg: "bg-indigo-400/10",
      icon: "bg-indigo-400 text-white",
      gradient: "from-indigo-400/30 via-indigo-400/10 to-violet-400/20",
      border: "border-indigo-400/50 hover:border-indigo-400",
    },
    fields: [
      { id: "feels_big", type: "text", label: "What feels big right now?", placeholder: "Right now it feels like...", required: true },
      { id: "five_years", type: "text", label: "How will you view this in 5 years?", placeholder: "In 5 years I'll probably...", required: true },
      { id: "future_advice", type: "text", label: "What advice would future-you give present-you?", placeholder: "Future me would say...", required: true },
    ],
  },
  {
    id: "emotional-improv",
    slug: "improv",
    name: "The Improv",
    description: "Reframe unexpected responses as opportunities, not obstacles",
    tagline: "Yes, And the unexpected",
    icon: <Shuffle className="size-5" />,
    time: "~2m",
    origin: "Second City Improv",
    citation: "Second City: 'You cannot be creative when in judgment of self or others. You also can't be creative if you're in fear.'",
    color: {
      bg: "bg-yellow-500/10",
      icon: "bg-yellow-500 text-white",
      gradient: "from-yellow-500/30 via-yellow-500/10 to-orange-400/20",
      border: "border-yellow-500/50 hover:border-yellow-500",
    },
    fields: [
      { id: "unexpected", type: "text", label: "What unexpected response did you get?", placeholder: "She said/did something I didn't expect...", required: true },
      { id: "reaction", type: "select", label: "Did you 'Yes, And' it or resist?", options: ["Yes, And (built on it)", "Resisted (fought it)", "Froze (went blank)"], required: true },
      { id: "opportunity", type: "text", label: "How could it have been an opportunity?", placeholder: "I could have used it to...", required: true },
    ],
  },
  {
    id: "emotional-free-write",
    slug: "free-write",
    name: "The Free Write",
    description: "Unstructured expressive writing - write continuously without judgment",
    tagline: "Just write, don't think",
    icon: <PenTool className="size-5" />,
    time: "~5m",
    origin: "Pennebaker Expressive Writing",
    citation: "Pennebaker's research shows expressive writing has therapeutic benefits: reduced stress, improved immune function, better emotional processing.",
    color: {
      bg: "bg-teal-400/10",
      icon: "bg-teal-400 text-white",
      gradient: "from-teal-400/30 via-teal-400/10 to-emerald-400/20",
      border: "border-teal-400/50 hover:border-teal-400",
    },
    fields: [
      { id: "free_write", type: "textarea", label: "Set timer for 5 minutes. Write continuously about your deepest feelings. No editing, no judgment.", placeholder: "Start writing and don't stop...", rows: 10, required: true },
      { id: "one_word", type: "text", label: "One word to summarize how you feel now", placeholder: "One word...", required: true },
    ],
  },
]

// ============================================================================
// SECTION 7: Skill & Strategy Templates (1-3 minutes)
// Templates focused on deliberate practice, skill isolation, and strategic thinking
// ============================================================================

const SKILL_STRATEGY_TEMPLATES: ResearchTemplate[] = [
  {
    id: "skill-focus",
    slug: "skill-focus",
    name: "The Skill Focus",
    description: "Deliberate practice - target one specific skill with full concentration",
    tagline: "Targeted practice, not just reps",
    icon: <Focus className="size-5" />,
    time: "~2m",
    origin: "Ericsson Deliberate Practice",
    citation: "Ericsson: 'When individuals engage in practice with full concentration on improving some specific aspect of performance.' Deliberate practice = 18% of variance in skill.",
    color: {
      bg: "bg-orange-500/10",
      icon: "bg-orange-500 text-white",
      gradient: "from-orange-500/30 via-orange-500/10 to-red-500/20",
      border: "border-orange-500/50 hover:border-orange-500",
    },
    fields: [
      { id: "skill_targeted", type: "text", label: "What specific skill did you target?", placeholder: "I was working on...", required: true },
      { id: "concentration", type: "select", label: "Concentration level (1-10)", options: ["1-3 Distracted", "4-6 Moderate", "7-8 Focused", "9-10 Flow state"], required: true },
      { id: "feedback", type: "text", label: "What feedback did you get?", placeholder: "I noticed that...", required: true },
      { id: "refine", type: "text", label: "How will you refine it next time?", placeholder: "Next time I'll adjust by...", required: true },
    ],
  },
  {
    id: "skill-one-thing",
    slug: "one-thing",
    name: "The One Thing",
    description: "Hyper-focused review - analyze just ONE decision that mattered",
    tagline: "The ONE moment that mattered",
    icon: <CrosshairIcon className="size-5" />,
    time: "~1m",
    origin: "Esports VOD Review",
    citation: "Esports research: 'Keep sessions SHORT (10-15 min), focus on 1-2 things. Prioritize decision-making over mechanics.'",
    color: {
      bg: "bg-rose-500/10",
      icon: "bg-rose-500 text-white",
      gradient: "from-rose-500/30 via-rose-500/10 to-pink-500/20",
      border: "border-rose-500/50 hover:border-rose-500",
    },
    fields: [
      { id: "one_moment", type: "text", label: "The ONE moment that mattered most", placeholder: "The key moment was when...", required: true },
      { id: "right_call", type: "select", label: "Was it the right call?", options: ["Yes", "No", "Unsure"], required: true },
      { id: "change", type: "text", label: "What would you change about that ONE moment?", placeholder: "I would change...", required: true },
    ],
  },
  {
    id: "skill-perception-gap",
    slug: "perception-gap",
    name: "The Perception Gap",
    description: "Compare your intention to how you actually landed",
    tagline: "Intention vs. how you landed",
    icon: <Eye className="size-5" />,
    time: "~2m",
    origin: "Executive Coaching 360",
    citation: "360 feedback research: 'Greatest value is seeing gap between intentions and how you actually show up.'",
    color: {
      bg: "bg-purple-500/10",
      icon: "bg-purple-500 text-white",
      gradient: "from-purple-500/30 via-purple-500/10 to-indigo-500/20",
      border: "border-purple-500/50 hover:border-purple-500",
    },
    fields: [
      { id: "intention", type: "text", label: "What was your intention?", placeholder: "I intended to come across as...", required: true },
      { id: "perception", type: "text", label: "How do you think she perceived you?", placeholder: "She probably thought I was...", required: true },
      { id: "gap", type: "text", label: "Where's the gap?", placeholder: "The disconnect was...", required: true },
      { id: "close_gap", type: "text", label: "What would close it?", placeholder: "To close the gap I could...", required: true },
    ],
  },
  {
    id: "skill-learning-goal",
    slug: "learning-goal",
    name: "The Learning Goal",
    description: "Focus on process over outcome - what did you learn about HOW?",
    tagline: "Process over outcome",
    icon: <FlaskConical className="size-5" />,
    time: "~2m",
    origin: "Locke & Latham Goal-Setting",
    citation: "Research: 'For NEW, COMPLEX tasks, learning goals beat performance goals.' Focus on learning, not just results.",
    color: {
      bg: "bg-green-500/10",
      icon: "bg-green-500 text-white",
      gradient: "from-green-500/30 via-green-500/10 to-emerald-500/20",
      border: "border-green-500/50 hover:border-green-500",
    },
    fields: [
      { id: "learned_how", type: "text", label: "What did you learn about HOW to do this? (not results)", placeholder: "I learned that the process of...", required: true },
      { id: "strategy_worked", type: "text", label: "What strategy worked?", placeholder: "What worked was...", required: true },
      { id: "strategy_didnt", type: "text", label: "What strategy didn't work?", placeholder: "What didn't work was...", required: true },
      { id: "experiment", type: "text", label: "One experiment to try next time", placeholder: "Next time I'll experiment with...", required: true },
    ],
  },
  {
    id: "skill-daily-cadence",
    slug: "yesterday-today-week",
    name: "The Yesterday-Today-Week",
    description: "Connect the dots across time - build session continuity",
    tagline: "Connect the dots",
    icon: <Calendar className="size-5" />,
    time: "~1m",
    origin: "Sales Call Review Cadences",
    citation: "Sales research: 'Daily: Review previous day, identify 1 takeaway. Weekly: Focus on one theme.' Creates continuity.",
    color: {
      bg: "bg-cyan-500/10",
      icon: "bg-cyan-500 text-white",
      gradient: "from-cyan-500/30 via-cyan-500/10 to-blue-500/20",
      border: "border-cyan-500/50 hover:border-cyan-500",
    },
    fields: [
      { id: "yesterday", type: "text", label: "Yesterday's key takeaway", placeholder: "From last session I learned...", required: true },
      { id: "today", type: "text", label: "Today's one focus area", placeholder: "Today I focused on...", required: true },
      { id: "week", type: "text", label: "This week's theme", placeholder: "This week I'm working on...", required: true },
    ],
  },
]

// Template icons lookup
const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  "quick-log": <Zap className="size-6" />,
  standard: <FileText className="size-6" />,
  "deep-dive": <Microscope className="size-6" />,
  phoenix: <Flame className="size-6" />,
  custom: <Settings2 className="size-6" />,
  favorite: <Star className="size-6" />,
}

// Template ordering
const TEMPLATE_ORDER: Record<string, number> = {
  "quick-log": 1,
  standard: 2,
  phoenix: 3,
  "deep-dive": 4,
}

export default function TemplateTestingPage() {
  const [templates, setTemplates] = useState<FieldReportTemplateRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUltraShortPopup, setShowUltraShortPopup] = useState(false)
  const [selectedUltraShort, setSelectedUltraShort] = useState<UltraShortTemplate | ResearchTemplate | null>(null)
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>([])
  const [recentlyUsedTemplateId, setRecentlyUsedTemplateId] = useState<string | null>(null)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const response = await fetch("/api/tracking/templates/field-report")
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error("Failed to load templates:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Sort templates
  const { favoriteTemplates, nonFavoriteTemplates } = useMemo(() => {
    const favorites: FieldReportTemplateRow[] = []
    const nonFavorites: FieldReportTemplateRow[] = []

    for (const favId of favoriteTemplateIds) {
      const template = templates.find(t => t.id === favId)
      if (template) favorites.push(template)
    }

    const remaining = templates.filter(t => !favoriteTemplateIds.includes(t.id))
    remaining.sort((a, b) => {
      if (recentlyUsedTemplateId) {
        if (a.id === recentlyUsedTemplateId) return -1
        if (b.id === recentlyUsedTemplateId) return 1
      }
      const orderA = TEMPLATE_ORDER[a.slug] ?? 100
      const orderB = TEMPLATE_ORDER[b.slug] ?? 100
      return orderA - orderB
    })

    return { favoriteTemplates: favorites, nonFavoriteTemplates: remaining }
  }, [templates, favoriteTemplateIds, recentlyUsedTemplateId])

  const handleTemplateClick = (template: FieldReportTemplateRow) => {
    // If it's Quick Log, show the ultra-short popup
    if (template.slug === "quick-log") {
      setShowUltraShortPopup(true)
    } else {
      // For other templates, just log (or navigate in real implementation)
      console.log("Selected template:", template.name)
    }
  }

  const handleUltraShortSelect = (template: UltraShortTemplate | ResearchTemplate) => {
    setSelectedUltraShort(template)
    setShowUltraShortPopup(false)
    setFormValues({})
  }

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }))
  }

  const toggleFavorite = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setIsTogglingFavorite(templateId)
    // Simulated toggle for test page
    setTimeout(() => {
      setFavoriteTemplateIds(prev =>
        prev.includes(templateId)
          ? prev.filter(id => id !== templateId)
          : [...prev, templateId]
      )
      setIsTogglingFavorite(null)
    }, 300)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  // Ultra-short form view
  if (selectedUltraShort) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => {
            setSelectedUltraShort(null)
            setFormValues({})
          }}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Templates
        </button>

        {/* Template header */}
        <div className={`rounded-2xl overflow-hidden mb-6 border border-border/50`}>
          <div className={`p-6 bg-gradient-to-br ${selectedUltraShort.color.gradient}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${selectedUltraShort.color.icon} shadow-lg`}>
                {selectedUltraShort.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{selectedUltraShort.name}</h1>
                <p className="text-muted-foreground text-sm mt-0.5">{selectedUltraShort.tagline}</p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                {selectedUltraShort.time}
              </Badge>
            </div>
            {/* Show origin and citation for research-backed templates */}
            {"origin" in selectedUltraShort && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold">Origin:</span> {selectedUltraShort.origin}
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1 italic">
                  {selectedUltraShort.citation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <Card className="p-6 rounded-2xl border-border/50">
          <div className="space-y-6">
            {selectedUltraShort.fields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === "select" ? (
                  <div className="flex flex-wrap gap-2">
                    {field.options?.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleFieldChange(field.id, option)}
                        className={`px-4 py-2 rounded-lg border transition-all ${
                          formValues[field.id] === option
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : field.type === "textarea" ? (
                  <textarea
                    value={(formValues[field.id] as string) || ""}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    rows={field.rows || 2}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                ) : (
                  <input
                    type="text"
                    value={(formValues[field.id] as string) || ""}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-8 pt-6 border-t border-border/50">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl"
              onClick={() => {
                setSelectedUltraShort(null)
                setFormValues({})
              }}
            >
              Cancel
            </Button>
            <Button className="flex-1 h-12 rounded-xl">
              <Check className="size-4 mr-2" />
              Submit
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Template selection view
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href="/test"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to Test Pages
        </Link>
        <h1 className="text-3xl font-bold">Template Testing</h1>
        <p className="text-muted-foreground mt-2">
          Click <strong>Quick Log</strong> to see all template options (quick captures, research-backed, and deep dives)
        </p>
      </div>

      {/* Template Selection Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Choose Your Template</h2>
        <p className="text-muted-foreground mt-1">Match the depth to your session</p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Non-Favorite Templates */}
        {nonFavoriteTemplates.map((template) => {
          const colors = TEMPLATE_COLORS[template.slug as TemplateSlug] || {
            bg: "bg-primary/10 text-primary border-primary/20",
            icon: "bg-primary text-primary-foreground",
            gradient: "from-primary/30 via-primary/10 to-accent/20",
          }
          const tagline = (TEMPLATE_TAGLINES as Record<string, string>)[template.slug] || template.description
          const allFields = [
            ...template.static_fields,
            ...(template.dynamic_fields || []).filter(f =>
              template.active_dynamic_fields?.includes(f.id)
            )
          ]
          const canAddFavorite = favoriteTemplateIds.length < 3
          const isQuickLog = template.slug === "quick-log"

          return (
            <div
              key={template.id}
              onClick={() => handleTemplateClick(template)}
              className={`group rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer hover:shadow-2xl bg-card ${
                isQuickLog
                  ? "border-amber-500/50 hover:border-amber-500 ring-2 ring-amber-500/20 hover:ring-amber-500/40"
                  : "border-border hover:border-primary/50 hover:shadow-primary/10"
              }`}
            >
              {/* Visual header with pattern */}
              <div className={`h-32 relative overflow-hidden bg-gradient-to-br ${colors.gradient}`}>
                <div className="absolute inset-0 opacity-30">
                  <svg width="100%" height="100%" className="text-foreground">
                    <defs>
                      <pattern id={`pattern-${template.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <circle cx="20" cy="20" r="1.5" fill="currentColor" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#pattern-${template.id})`} />
                  </svg>
                </div>

                <div className={`absolute top-6 left-6 p-4 rounded-2xl ${colors.icon} shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                  {TEMPLATE_ICONS[template.slug] || <FileText className="size-6" />}
                </div>

                <div className="absolute top-6 right-6 flex items-center gap-2">
                  {isQuickLog && (
                    <div className="px-3 py-1.5 rounded-full bg-amber-500/90 text-white text-sm font-medium animate-pulse">
                      Click Me!
                    </div>
                  )}
                  <div className="px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-foreground text-sm font-medium">
                    {template.estimated_minutes} min
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-xl font-bold text-foreground mb-1">{template.name}</h3>
                <p className="text-muted-foreground text-sm italic mb-3">{tagline}</p>
                <p className="text-foreground/70 text-sm leading-relaxed mb-4">{template.description}</p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span>{allFields.length} fields</span>
                  <span>•</span>
                  <span>{allFields.filter(f => f.required).length} required</span>
                </div>

                <div className="flex gap-2">
                  <button className={`flex-1 py-3 rounded-xl font-semibold transition-opacity flex items-center justify-center gap-2 ${
                    isQuickLog
                      ? "bg-amber-500 text-white"
                      : "bg-primary text-primary-foreground opacity-90 group-hover:opacity-100"
                  }`}>
                    {isQuickLog ? "Choose Quick Version" : "Start Report"}
                    <ArrowRight className="size-4" />
                  </button>
                  {canAddFavorite && (
                    <button
                      onClick={(e) => toggleFavorite(template.id, e)}
                      disabled={isTogglingFavorite === template.id}
                      className="px-4 py-3 rounded-xl border border-muted-foreground/30 text-muted-foreground hover:border-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center"
                    >
                      {isTogglingFavorite === template.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Heart className="size-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Ultra-Short Templates Popup - Full screen on mobile */}
      <Dialog open={showUltraShortPopup} onOpenChange={setShowUltraShortPopup}>
        <DialogContent className="!w-[95vw] !max-w-6xl !h-[85vh] !max-h-[900px] flex flex-col !p-0 !gap-0">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-border shrink-0">
            <DialogHeader>
              <DialogTitle className="text-2xl md:text-3xl">Choose Your Template</DialogTitle>
              <DialogDescription className="text-base">
                From 10-second quick captures to 30-minute deep dives - match the depth to your needs
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* SECTION 1: Original Ultra-Short Templates */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-1">Section 1: Quick Captures</h3>
              <p className="text-sm text-muted-foreground mb-4">10-45 second templates for immediate logging</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
                {ULTRA_SHORT_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleUltraShortSelect(template)}
                    className={`group rounded-2xl overflow-hidden border-2 ${template.color.border} transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] bg-card active:scale-[0.98]`}
                  >
                    {/* Header with gradient */}
                    <div className={`p-5 md:p-4 bg-gradient-to-br ${template.color.gradient}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-3 md:p-2.5 rounded-xl ${template.color.icon} shadow-lg`}>
                          {template.icon}
                        </div>
                        <Badge variant="secondary" className="text-sm md:text-xs font-semibold">
                          {template.time}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-lg md:text-base text-foreground">{template.name}</h3>
                      <p className="text-sm md:text-xs text-muted-foreground italic mt-1">{template.tagline}</p>
                    </div>

                    {/* Fields preview */}
                    <div className="p-4 md:p-3 space-y-2 md:space-y-1.5">
                      {template.fields.map((field, idx) => (
                        <div key={field.id} className="flex items-center gap-3 md:gap-2 text-sm md:text-xs text-muted-foreground">
                          <span className="w-6 h-6 md:w-5 md:h-5 rounded-full bg-muted flex items-center justify-center text-xs md:text-[10px] font-semibold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{field.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="p-4 md:p-3 pt-0">
                      <button className={`w-full py-3 md:py-2.5 rounded-xl text-base md:text-sm font-semibold ${template.color.icon} opacity-90 group-hover:opacity-100 transition-all shadow-md`}>
                        Select This
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2: Research-Backed Templates */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-1">Section 2: Research-Backed Reflections</h3>
              <p className="text-sm text-muted-foreground mb-4">5-10 minute templates from sports psychology, healthcare, sales &amp; poker research</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
                {RESEARCH_BACKED_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleUltraShortSelect(template)}
                    className={`group rounded-2xl overflow-hidden border-2 ${template.color.border} transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] bg-card active:scale-[0.98]`}
                  >
                    {/* Header with gradient */}
                    <div className={`p-5 md:p-4 bg-gradient-to-br ${template.color.gradient}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-3 md:p-2.5 rounded-xl ${template.color.icon} shadow-lg`}>
                          {template.icon}
                        </div>
                        <Badge variant="secondary" className="text-sm md:text-xs font-semibold">
                          {template.time}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-lg md:text-base text-foreground">{template.name}</h3>
                      <p className="text-sm md:text-xs text-muted-foreground italic mt-1">{template.tagline}</p>
                    </div>

                    {/* Origin badge */}
                    <div className="px-4 md:px-3 pt-3 md:pt-2">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                        {template.origin}
                      </span>
                    </div>

                    {/* Fields preview */}
                    <div className="p-4 md:p-3 space-y-2 md:space-y-1.5">
                      {template.fields.slice(0, 3).map((field, idx) => (
                        <div key={field.id} className="flex items-center gap-3 md:gap-2 text-sm md:text-xs text-muted-foreground">
                          <span className="w-6 h-6 md:w-5 md:h-5 rounded-full bg-muted flex items-center justify-center text-xs md:text-[10px] font-semibold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{field.label}</span>
                        </div>
                      ))}
                      {template.fields.length > 3 && (
                        <div className="text-xs text-muted-foreground/60 pl-9">
                          +{template.fields.length - 3} more fields
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="p-4 md:p-3 pt-0">
                      <button className={`w-full py-3 md:py-2.5 rounded-xl text-base md:text-sm font-semibold ${template.color.icon} opacity-90 group-hover:opacity-100 transition-all shadow-md`}>
                        Select This
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: Deep Dive Templates */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-1">Section 3: Deep Dive Reflections</h3>
              <p className="text-sm text-muted-foreground mb-4">15-30 minute templates for thorough processing when you have time</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
                {DEEP_DIVE_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleUltraShortSelect(template)}
                    className={`group rounded-2xl overflow-hidden border-2 ${template.color.border} transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] bg-card active:scale-[0.98]`}
                  >
                    {/* Header with gradient */}
                    <div className={`p-5 md:p-4 bg-gradient-to-br ${template.color.gradient}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-3 md:p-2.5 rounded-xl ${template.color.icon} shadow-lg`}>
                          {template.icon}
                        </div>
                        <Badge variant="secondary" className="text-sm md:text-xs font-semibold">
                          {template.time}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-lg md:text-base text-foreground">{template.name}</h3>
                      <p className="text-sm md:text-xs text-muted-foreground italic mt-1">{template.tagline}</p>
                    </div>

                    {/* Origin badge */}
                    <div className="px-4 md:px-3 pt-3 md:pt-2">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                        {template.origin}
                      </span>
                    </div>

                    {/* Fields preview */}
                    <div className="p-4 md:p-3 space-y-2 md:space-y-1.5">
                      {template.fields.slice(0, 3).map((field, idx) => (
                        <div key={field.id} className="flex items-center gap-3 md:gap-2 text-sm md:text-xs text-muted-foreground">
                          <span className="w-6 h-6 md:w-5 md:h-5 rounded-full bg-muted flex items-center justify-center text-xs md:text-[10px] font-semibold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{field.label}</span>
                        </div>
                      ))}
                      {template.fields.length > 3 && (
                        <div className="text-xs text-muted-foreground/60 pl-9">
                          +{template.fields.length - 3} more fields
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="p-4 md:p-3 pt-0">
                      <button className={`w-full py-3 md:py-2.5 rounded-xl text-base md:text-sm font-semibold ${template.color.icon} opacity-90 group-hover:opacity-100 transition-all shadow-md`}>
                        Select This
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 4: Quick Interventions */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-1">Section 4: Quick Interventions</h3>
              <p className="text-sm text-muted-foreground mb-4">1-3 minute targeted tools for specific needs - pre-session, emotional check, behavior change</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
                {QUICK_INTERVENTION_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleUltraShortSelect(template)}
                    className={`group rounded-2xl overflow-hidden border-2 ${template.color.border} transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] bg-card active:scale-[0.98]`}
                  >
                    {/* Header with gradient */}
                    <div className={`p-5 md:p-4 bg-gradient-to-br ${template.color.gradient}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-3 md:p-2.5 rounded-xl ${template.color.icon} shadow-lg`}>
                          {template.icon}
                        </div>
                        <Badge variant="secondary" className="text-sm md:text-xs font-semibold">
                          {template.time}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-lg md:text-base text-foreground">{template.name}</h3>
                      <p className="text-sm md:text-xs text-muted-foreground italic mt-1">{template.tagline}</p>
                    </div>

                    {/* Origin badge */}
                    <div className="px-4 md:px-3 pt-3 md:pt-2">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                        {template.origin}
                      </span>
                    </div>

                    {/* Fields preview */}
                    <div className="p-4 md:p-3 space-y-2 md:space-y-1.5">
                      {template.fields.slice(0, 3).map((field, idx) => (
                        <div key={field.id} className="flex items-center gap-3 md:gap-2 text-sm md:text-xs text-muted-foreground">
                          <span className="w-6 h-6 md:w-5 md:h-5 rounded-full bg-muted flex items-center justify-center text-xs md:text-[10px] font-semibold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{field.label}</span>
                        </div>
                      ))}
                      {template.fields.length > 3 && (
                        <div className="text-xs text-muted-foreground/60 pl-9">
                          +{template.fields.length - 3} more fields
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="p-4 md:p-3 pt-0">
                      <button className={`w-full py-3 md:py-2.5 rounded-xl text-base md:text-sm font-semibold ${template.color.icon} opacity-90 group-hover:opacity-100 transition-all shadow-md`}>
                        Select This
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 5: Focused Reflections */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-1">Section 5: Focused Reflections</h3>
              <p className="text-sm text-muted-foreground mb-4">2-5 minute deeper but targeted templates - specific angles on reflection</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
                {FOCUSED_REFLECTION_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleUltraShortSelect(template)}
                    className={`group rounded-2xl overflow-hidden border-2 ${template.color.border} transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] bg-card active:scale-[0.98]`}
                  >
                    {/* Header with gradient */}
                    <div className={`p-5 md:p-4 bg-gradient-to-br ${template.color.gradient}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-3 md:p-2.5 rounded-xl ${template.color.icon} shadow-lg`}>
                          {template.icon}
                        </div>
                        <Badge variant="secondary" className="text-sm md:text-xs font-semibold">
                          {template.time}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-lg md:text-base text-foreground">{template.name}</h3>
                      <p className="text-sm md:text-xs text-muted-foreground italic mt-1">{template.tagline}</p>
                    </div>

                    {/* Origin badge */}
                    <div className="px-4 md:px-3 pt-3 md:pt-2">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                        {template.origin}
                      </span>
                    </div>

                    {/* Fields preview */}
                    <div className="p-4 md:p-3 space-y-2 md:space-y-1.5">
                      {template.fields.slice(0, 3).map((field, idx) => (
                        <div key={field.id} className="flex items-center gap-3 md:gap-2 text-sm md:text-xs text-muted-foreground">
                          <span className="w-6 h-6 md:w-5 md:h-5 rounded-full bg-muted flex items-center justify-center text-xs md:text-[10px] font-semibold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{field.label}</span>
                        </div>
                      ))}
                      {template.fields.length > 3 && (
                        <div className="text-xs text-muted-foreground/60 pl-9">
                          +{template.fields.length - 3} more fields
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="p-4 md:p-3 pt-0">
                      <button className={`w-full py-3 md:py-2.5 rounded-xl text-base md:text-sm font-semibold ${template.color.icon} opacity-90 group-hover:opacity-100 transition-all shadow-md`}>
                        Select This
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 6: Emotional Processing */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-1">Section 6: Emotional Processing</h3>
              <p className="text-sm text-muted-foreground mb-4">2-5 minute templates for emotional awareness, perspective, and expression</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
                {EMOTIONAL_PROCESSING_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleUltraShortSelect(template)}
                    className={`group rounded-2xl overflow-hidden border-2 ${template.color.border} transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] bg-card active:scale-[0.98]`}
                  >
                    {/* Header with gradient */}
                    <div className={`p-5 md:p-4 bg-gradient-to-br ${template.color.gradient}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-3 md:p-2.5 rounded-xl ${template.color.icon} shadow-lg`}>
                          {template.icon}
                        </div>
                        <Badge variant="secondary" className="text-sm md:text-xs font-semibold">
                          {template.time}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-lg md:text-base text-foreground">{template.name}</h3>
                      <p className="text-sm md:text-xs text-muted-foreground italic mt-1">{template.tagline}</p>
                    </div>

                    {/* Origin badge */}
                    <div className="px-4 md:px-3 pt-3 md:pt-2">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                        {template.origin}
                      </span>
                    </div>

                    {/* Fields preview */}
                    <div className="p-4 md:p-3 space-y-2 md:space-y-1.5">
                      {template.fields.slice(0, 3).map((field, idx) => (
                        <div key={field.id} className="flex items-center gap-3 md:gap-2 text-sm md:text-xs text-muted-foreground">
                          <span className="w-6 h-6 md:w-5 md:h-5 rounded-full bg-muted flex items-center justify-center text-xs md:text-[10px] font-semibold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{field.label}</span>
                        </div>
                      ))}
                      {template.fields.length > 3 && (
                        <div className="text-xs text-muted-foreground/60 pl-9">
                          +{template.fields.length - 3} more fields
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="p-4 md:p-3 pt-0">
                      <button className={`w-full py-3 md:py-2.5 rounded-xl text-base md:text-sm font-semibold ${template.color.icon} opacity-90 group-hover:opacity-100 transition-all shadow-md`}>
                        Select This
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 7: Skill & Strategy */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-1">Section 7: Skill &amp; Strategy</h3>
              <p className="text-sm text-muted-foreground mb-4">1-3 minute templates for deliberate practice, skill isolation, and strategic thinking</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
                {SKILL_STRATEGY_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleUltraShortSelect(template)}
                    className={`group rounded-2xl overflow-hidden border-2 ${template.color.border} transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] bg-card active:scale-[0.98]`}
                  >
                    {/* Header with gradient */}
                    <div className={`p-5 md:p-4 bg-gradient-to-br ${template.color.gradient}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-3 md:p-2.5 rounded-xl ${template.color.icon} shadow-lg`}>
                          {template.icon}
                        </div>
                        <Badge variant="secondary" className="text-sm md:text-xs font-semibold">
                          {template.time}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-lg md:text-base text-foreground">{template.name}</h3>
                      <p className="text-sm md:text-xs text-muted-foreground italic mt-1">{template.tagline}</p>
                    </div>

                    {/* Origin badge */}
                    <div className="px-4 md:px-3 pt-3 md:pt-2">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                        {template.origin}
                      </span>
                    </div>

                    {/* Fields preview */}
                    <div className="p-4 md:p-3 space-y-2 md:space-y-1.5">
                      {template.fields.slice(0, 3).map((field, idx) => (
                        <div key={field.id} className="flex items-center gap-3 md:gap-2 text-sm md:text-xs text-muted-foreground">
                          <span className="w-6 h-6 md:w-5 md:h-5 rounded-full bg-muted flex items-center justify-center text-xs md:text-[10px] font-semibold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{field.label}</span>
                        </div>
                      ))}
                      {template.fields.length > 3 && (
                        <div className="text-xs text-muted-foreground/60 pl-9">
                          +{template.fields.length - 3} more fields
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="p-4 md:p-3 pt-0">
                      <button className={`w-full py-3 md:py-2.5 rounded-xl text-base md:text-sm font-semibold ${template.color.icon} opacity-90 group-hover:opacity-100 transition-all shadow-md`}>
                        Select This
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Combined Legend */}
            <div className="mt-6 p-5 md:p-4 rounded-xl bg-muted/50 border border-border/50">
              <h4 className="font-semibold mb-3 text-base md:text-sm">When to use each:</h4>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Quick Captures (Section 1) - 10-45 seconds:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-2 text-sm md:text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-cyan-500">Driscoll:</span>
                    <span>Want to learn</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-pink-500">Pulse:</span>
                    <span>Quick check-in</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-orange-500">Critical:</span>
                    <span>Something went wrong</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-emerald-500">Win:</span>
                    <span>Just capture positive</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-violet-500">Intention:</span>
                    <span>Had a specific goal</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Research-Backed (Section 2) - 5-10 minutes:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-2 text-sm md:text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-red-500">Voice Memo:</span>
                    <span>Capture raw emotion</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-teal-500">Driscoll Model:</span>
                    <span>Full learning cycle</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-500">Well-Better-How:</span>
                    <span>Let the game go</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-purple-500">3-2-1:</span>
                    <span>Balanced reflection</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-amber-500">Decision Quality:</span>
                    <span>Separate luck from skill</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Deep Dives (Section 3) - 15-30 minutes:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-2 text-sm md:text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-emerald-600">Gibbs&apos; Cycle:</span>
                    <span>Complete processing</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-slate-600">Strategic AAR:</span>
                    <span>Plan vs. reality</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-indigo-600">CBT Diary:</span>
                    <span>Break thought loops</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-orange-600">Pattern Hunter:</span>
                    <span>Find recurring themes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-rose-600">Phoenix:</span>
                    <span>Recover from blowouts</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Quick Interventions (Section 4) - 1-3 minutes:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-2 text-sm md:text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sky-500">Pre-Flight:</span>
                    <span>Before you go out</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-lime-500">Start-Stop-Continue:</span>
                    <span>Quick change plan</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-red-500">Tilt Check:</span>
                    <span>Emotional interference</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-pink-500">Friend Test:</span>
                    <span>Self-compassion</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-violet-500">If-Then:</span>
                    <span>Behavior autopilot</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Focused Reflections (Section 5) - 2-5 minutes:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-2 text-sm md:text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-indigo-500">4 Ls:</span>
                    <span>Full inventory + wishes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-cyan-600">Rewind:</span>
                    <span>What happened before</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-amber-500">Mastery Log:</span>
                    <span>Build confidence</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-emerald-500">Context Check:</span>
                    <span>External factors</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-fuchsia-500">Quick Reframe:</span>
                    <span>Spot thought traps</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Emotional Processing (Section 6) - 2-5 minutes:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-2 text-sm md:text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-red-400">Mad-Sad-Glad:</span>
                    <span>Sort feelings fast</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-400">Common Humanity:</span>
                    <span>You&apos;re not alone</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-indigo-400">Five Year View:</span>
                    <span>Zoom out</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-yellow-500">Improv:</span>
                    <span>Yes, And surprises</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-teal-400">Free Write:</span>
                    <span>Unstructured expression</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Skill &amp; Strategy (Section 7) - 1-3 minutes:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-2 text-sm md:text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-orange-500">Skill Focus:</span>
                    <span>Deliberate practice</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-rose-500">One Thing:</span>
                    <span>Hyper-focused review</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-purple-500">Perception Gap:</span>
                    <span>Intention vs. reality</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-green-500">Learning Goal:</span>
                    <span>Process over outcome</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-cyan-500">Yesterday-Today-Week:</span>
                    <span>Build continuity</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
