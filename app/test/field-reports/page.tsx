"use client"

import { useState } from "react"
import {
  // Template icons (keep these for templates only)
  Zap,
  FileText,
  Microscope,
  Flame,
  RefreshCw,
  Target,
  // UI icons
  Clock,
  ChevronRight,
  ChevronDown,
  BarChart3,
  ArrowRight,
  Check,
  Sparkles,
  Plus,
  // Principle icons (completely different set)
  Gauge,
  HeartPulse,
  Scale,
  CircleHelp,
  Route,
  Dices,
  Orbit,
  GitCompare,
  BrainCircuit,
  Link2,
  GraduationCap,
  Users,
  ShieldCheck,
  ListChecks,
  Timer,
  SlidersHorizontal,
  MessageCircleQuestion,
  Footprints,
  Trophy,
  BookMarked,
  Repeat,
  Drama,
  PenLine,
} from "lucide-react"

// ============================================================================
// Sample Field Report Data - Rich content for testing layouts
// ============================================================================

interface SampleFieldReport {
  id: string
  templateName: string
  templateSlug: string
  icon: React.ReactNode
  estimatedMinutes: number
  description: string
  tagline: string
  fieldsCount: number
  sampleFields: string[]
  whenToUse: string
  researchBasis: string
}

const SAMPLE_TEMPLATES: SampleFieldReport[] = [
  {
    id: "quick-log",
    templateName: "The Speedrun",
    templateSlug: "quick-log",
    icon: <Zap className="size-6" />,
    estimatedMinutes: 1,
    description: "Minimum viable data capture. Perfect for maintaining consistency when time is short.",
    tagline: "30 seconds. Just the essentials.",
    fieldsCount: 4,
    sampleFields: ["Location", "Approach count", "Best moment (1 sentence)", "Energy level"],
    whenToUse: "Quick capture after every session. Build the habit first, add depth later.",
    researchBasis: "Based on habit science: consistency > intensity. Short daily logs beat sporadic detailed ones.",
  },
  {
    id: "standard",
    templateName: "The Debrief",
    templateSlug: "standard",
    icon: <FileText className="size-6" />,
    estimatedMinutes: 5,
    description: "Balanced reflection covering what worked, what didn't, and what's next.",
    tagline: "The sweet spot. Learn without overthinking.",
    fieldsCount: 7,
    sampleFields: ["Session details", "Best interaction breakdown", "What went well (3 things)", "What to work on", "Why it ended", "Key takeaway", "Action for next time"],
    whenToUse: "Your go-to template. Ideal for regular sessions where you want to extract meaningful insights.",
    researchBasis: "Combines 'Well, Better, How' sports psychology + the critical '80/20' question about why interactions end.",
  },
  {
    id: "deep-dive",
    templateName: "The Forensics",
    templateSlug: "deep-dive",
    icon: <Microscope className="size-6" />,
    estimatedMinutes: 15,
    description: "Full reconstruction for near-misses and breakthrough moments. Detailed tactical analysis.",
    tagline: "When you got close. Extract every lesson.",
    fieldsCount: 12,
    sampleFields: ["Full interaction dialogue", "Emotional state before/during/after", "The critical 3 minutes", "Intended vs. actual", "Techniques attempted", "What you'd do differently", "Connection to skill focus"],
    whenToUse: "When you got really close but didn't pull. Or after a major breakthrough you want to replicate.",
    researchBasis: "Based on 80/20 method: 'the 3 minutes leading up to where you lost her' + Military AAR intended vs. actual comparison.",
  },
  {
    id: "blowout",
    templateName: "The Phoenix",
    templateSlug: "blowout",
    icon: <Flame className="size-6" />,
    estimatedMinutes: 7,
    description: "Emotional recovery and reframing after tough sessions. Self-compassion meets analysis.",
    tagline: "Rise from the ashes. Every master failed here first.",
    fieldsCount: 8,
    sampleFields: ["What happened (factual)", "How it made you feel", "Why it might have happened", "Reframe & learning", "What would you tell a friend?", "Self-compassion check", "Tiny next step"],
    whenToUse: "After harsh rejections or when you need emotional processing before tactical analysis.",
    researchBasis: "Based on CBT thought diaries + Kristin Neff's self-compassion research. Normalizes failure as part of learning.",
  },
  {
    id: "what-so-now",
    templateName: "The Triple",
    templateSlug: "what-so-now",
    icon: <RefreshCw className="size-6" />,
    estimatedMinutes: 3,
    description: "Ultra-minimal Driscoll model. Three questions that complete the learning cycle.",
    tagline: "What? So what? Now what?",
    fieldsCount: 3,
    sampleFields: ["What happened?", "So what? (What did you learn?)", "Now what? (What will you do differently?)"],
    whenToUse: "When you want maximum learning with minimum friction. Perfect for voice memos.",
    researchBasis: "Based on Driscoll's healthcare reflection model. Used by 63% of healthcare professionals. Extreme simplicity drives completion.",
  },
  {
    id: "pre-game",
    templateName: "The Setup",
    templateSlug: "pre-game",
    icon: <Target className="size-6" />,
    estimatedMinutes: 2,
    description: "Pre-session intention setting. Set your learning goal before you go out.",
    tagline: "Enter with intention. Leave with insight.",
    fieldsCount: 5,
    sampleFields: ["Session goal (learning, not outcome)", "Implementation intention (If X, then Y)", "Technique to practice", "Mindset check-in", "Energy level"],
    whenToUse: "Before every session. Research shows pre-set intentions increase success by 3x.",
    researchBasis: "Based on Gollwitzer's implementation intentions research + goal-setting theory. Learning goals > performance goals for skill acquisition.",
  },
]

// ============================================================================
// Comprehensive Principles from Research (All 25+)
// ============================================================================

interface Principle {
  id: string
  number: number
  title: string
  description: string
  source: string
  category: string
  icon: React.ReactNode
  insight?: string // A punchy one-liner that makes it memorable
  stat?: string // A research statistic if available
}

const PRINCIPLE_CATEGORIES = [
  { id: "foundation", name: "Foundation", description: "Core principles that underpin effective reflection" },
  { id: "psychology", name: "Psychology", description: "How your mind processes learning and failure" },
  { id: "learning", name: "Learning Science", description: "Evidence-based methods for skill acquisition" },
  { id: "habits", name: "Habit Formation", description: "Building sustainable reflection practices" },
  { id: "feedback", name: "Feedback & Goals", description: "Optimizing how you evaluate and improve" },
]

const PRINCIPLES: Principle[] = [
  // FOUNDATION
  {
    id: "p1",
    number: 1,
    title: "Less Friction = More Consistency",
    description: "Users who complete shorter reports consistently outperform those who abandon detailed ones. The best report is one you actually complete.",
    source: "Habit formation science",
    category: "foundation",
    icon: <Gauge className="size-5" />,
    insight: "A 30-second log beats a skipped 10-minute analysis.",
    stat: "Consistency increases success by 40%",
  },
  {
    id: "p2",
    number: 2,
    title: "Emotion First, Analysis Second",
    description: "Ask how you felt before diving into tactical analysis. Emotional processing prevents rumination and aids genuine learning.",
    source: "CBT + Sports psychology",
    category: "foundation",
    icon: <HeartPulse className="size-5" />,
    insight: "Process the feeling, then find the lesson.",
  },
  {
    id: "p3",
    number: 3,
    title: "Balance Positive and Negative",
    description: "Don't just focus on mistakes. Celebrating wins reinforces good behavior and literally affects your hormones for future performance.",
    source: "Sports science research",
    category: "foundation",
    icon: <Scale className="size-5" />,
    insight: "What you celebrate, you repeat.",
    stat: "Positive feedback increases testosterone for next session",
  },
  {
    id: "p4",
    number: 4,
    title: "The Critical Question",
    description: "The most important question: 'Why did the interaction end, and what could you have done differently?' This single question drives 80% of learning.",
    source: "80/20 Field Report Method",
    category: "foundation",
    icon: <CircleHelp className="size-5" />,
    insight: "Every ending is a lesson waiting to be extracted.",
    stat: "80% of insights come from analyzing endings",
  },
  {
    id: "p5",
    number: 5,
    title: "Make It Actionable",
    description: "End every reflection with a forward-looking action item, not just analysis. A report without a 'next step' is incomplete.",
    source: "Goal-setting theory",
    category: "foundation",
    icon: <Route className="size-5" />,
    insight: "Insight without action is just entertainment.",
  },
  {
    id: "p6",
    number: 6,
    title: "Match Depth to Situation",
    description: "Quick log for routine sessions, deep dive for near-misses, emotional template for tough days. One size doesn't fit all.",
    source: "Deliberate practice research",
    category: "foundation",
    icon: <SlidersHorizontal className="size-5" />,
    insight: "The right tool for the right moment.",
  },

  // LEARNING SCIENCE
  {
    id: "p7",
    number: 7,
    title: "Complete the Learning Cycle",
    description: "Kolb's cycle: Experience → Reflect → Conceptualize → Experiment. A report that only documents without extracting lessons and planning change is incomplete.",
    source: "Kolb's Experiential Learning",
    category: "learning",
    icon: <Orbit className="size-5" />,
    insight: "Reflection without action = half the cycle.",
    stat: "Full cycle completion doubles retention",
  },
  {
    id: "p8",
    number: 8,
    title: "Intended vs. Actual",
    description: "The military's After Action Review always starts with: 'What did we intend to accomplish vs. what actually happened?' This gap is where learning lives.",
    source: "US Military AAR",
    category: "learning",
    icon: <GitCompare className="size-5" />,
    insight: "The gap between plan and reality is your teacher.",
    stat: "Used by US Army since 1970s",
  },
  {
    id: "p11",
    number: 11,
    title: "Match Template to Skill Stage",
    description: "Beginners need detailed structure to build awareness. Experts need speed and focus on edge cases. Your reports should evolve with you.",
    source: "Fitts & Posner stages",
    category: "learning",
    icon: <GraduationCap className="size-5" />,
    insight: "Scaffolding for beginners, freedom for experts.",
  },
  {
    id: "p19",
    number: 19,
    title: "What? So What? Now What?",
    description: "Driscoll's ultra-simple model: Describe what happened, extract meaning, plan next action. Three questions that complete the learning cycle.",
    source: "Driscoll's Reflection Model",
    category: "learning",
    icon: <MessageCircleQuestion className="size-5" />,
    insight: "Three questions. Maximum learning.",
    stat: "Used by 63% of healthcare professionals",
  },
  {
    id: "p20",
    number: 20,
    title: "Focus on the Lead-Up",
    description: "Like BJJ fighters reviewing 'what happened before the submission,' analyze the 3 minutes leading up to where you lost her. That's where the real learning is.",
    source: "BJJ Scout method",
    category: "learning",
    icon: <Footprints className="size-5" />,
    insight: "The moment before the moment matters most.",
  },
  {
    id: "p23",
    number: 23,
    title: "Spaced Retrieval",
    description: "Periodically review old reports. Spaced repetition increases retention 200-300% vs. one-time review. Your past insights are goldmines.",
    source: "Ebbinghaus + Learning science",
    category: "learning",
    icon: <Repeat className="size-5" />,
    insight: "Old reports are future teachers.",
    stat: "200-300% better retention with spaced review",
  },

  // PSYCHOLOGY
  {
    id: "p9",
    number: 9,
    title: "Challenge Cognitive Distortions",
    description: "Watch for all-or-nothing thinking ('total failure'), catastrophizing ('I'll never be good'), and mind reading ('she thought I was weird'). Reality is usually more nuanced.",
    source: "Cognitive Behavioral Therapy",
    category: "psychology",
    icon: <BrainCircuit className="size-5" />,
    insight: "Your brain lies. Check the evidence.",
  },
  {
    id: "p13",
    number: 13,
    title: "Common Humanity",
    description: "Every skilled person failed many times learning. Recognizing that struggle is universal reduces shame and increases resilience.",
    source: "Neff's Self-Compassion",
    category: "psychology",
    icon: <Users className="size-5" />,
    insight: "Every master was once a disaster.",
    stat: "+32% adherence with identity framing",
  },
  {
    id: "p15",
    number: 15,
    title: "Psychological Safety with Self",
    description: "You need psychological safety with YOURSELF to honestly assess performance. Self-judgment and shame inhibit honest reflection.",
    source: "Edmondson's research",
    category: "psychology",
    icon: <ShieldCheck className="size-5" />,
    insight: "You can't learn what you can't admit.",
    stat: "Teams with safety are 2x more effective",
  },
  {
    id: "p17",
    number: 17,
    title: "Rumination Circuit Breaker",
    description: "Healthy reflection is purposeful and time-limited. Rumination is repetitive, circular, and makes you feel worse. Set time limits and always end with an action.",
    source: "Psychology research",
    category: "psychology",
    icon: <Timer className="size-5" />,
    insight: "If you're going in circles, stop and act.",
  },
  {
    id: "p24",
    number: 24,
    title: "Yes, And Mindset",
    description: "From improv: accept what happened ('yes') and build on it ('and'). Unexpected responses are opportunities, not obstacles. Mistakes can become charming moments.",
    source: "Second City improv",
    category: "psychology",
    icon: <Drama className="size-5" />,
    insight: "Every surprise is raw material.",
  },
  {
    id: "p25",
    number: 25,
    title: "Expressive Writing Heals",
    description: "Writing about emotional experiences for 15-20 minutes has measurable health benefits. The key is emotional expression, not just documentation.",
    source: "Pennebaker research",
    category: "psychology",
    icon: <PenLine className="size-5" />,
    insight: "Write it out to let it go.",
    stat: "200+ studies confirm benefits",
  },

  // HABITS
  {
    id: "p10",
    number: 10,
    title: "Habit Stacking",
    description: "Link your report to an existing routine: 'After I get home, I will log my session.' Pre-existing habits become triggers for new ones.",
    source: "BJ Fogg's Tiny Habits",
    category: "habits",
    icon: <Link2 className="size-5" />,
    insight: "Attach new habits to old anchors.",
    stat: "+64% success with habit stacking",
  },
  {
    id: "p12",
    number: 12,
    title: "Identity Over Behavior",
    description: "Frame it as 'I am someone who learns from experience' not 'I should write reports.' Identity-based habits stick better than behavior-based ones.",
    source: "Habit science",
    category: "habits",
    icon: <Users className="size-5" />,
    insight: "Become a learner, not just someone who logs.",
    stat: "+32% adherence with identity framing",
  },

  // FEEDBACK & GOALS
  {
    id: "p14",
    number: 14,
    title: "Process Over Outcomes",
    description: "Judge your decisions, not your results. A good decision can have a bad outcome (variance). Bad decisions with good outcomes reinforce bad habits.",
    source: "Trading/Poker psychology",
    category: "feedback",
    icon: <Dices className="size-5" />,
    insight: "Good process, trust the results will follow.",
  },
  {
    id: "p16",
    number: 16,
    title: "If-Then Planning",
    description: "Pre-decide: 'If she seems distracted, I will use a cold read.' Implementation intentions triple success rate on difficult goals.",
    source: "Gollwitzer's research",
    category: "feedback",
    icon: <ListChecks className="size-5" />,
    insight: "Pre-decide, then execute.",
    stat: "3x success rate on difficult goals",
  },
  {
    id: "p18",
    number: 18,
    title: "Match Feedback to Confidence",
    description: "When struggling, you need gentler feedback and smaller wins. When confident, you can handle direct critique. Calibrate feedback intensity to your state.",
    source: "Kluger & DeNisi meta-analysis",
    category: "feedback",
    icon: <SlidersHorizontal className="size-5" />,
    insight: "The right feedback at the right time.",
    stat: "1/3 of feedback actually harms performance",
  },
  {
    id: "p21",
    number: 21,
    title: "Mastery Experiences Build Confidence",
    description: "Nothing convinces you of your capability like achieving something yourself. Highlight and celebrate wins - they're the foundation of future confidence.",
    source: "Bandura's Self-Efficacy",
    category: "feedback",
    icon: <Trophy className="size-5" />,
    insight: "Your wins are proof you can do it.",
  },
  {
    id: "p22",
    number: 22,
    title: "Learning Goals for New Skills",
    description: "For new skills, focus on 'practice technique X' not 'get Y numbers.' Learning goals beat performance goals for skill acquisition.",
    source: "Locke & Latham",
    category: "feedback",
    icon: <BookMarked className="size-5" />,
    insight: "Focus on the skill, not the score.",
    stat: "35 years of research, 90% success rate",
  },
]

// ============================================================================
// Layout Components (Updated with proper color scheme)
// ============================================================================

function HorizontalCardsLayout({ templates }: { templates: SampleFieldReport[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground/90">Layout 1: Horizontal Scroll</h3>
      <p className="text-muted-foreground text-sm mb-4">Cards scroll horizontally. Hover to expand and see details.</p>

      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {templates.map((template) => {
          const isHovered = hoveredId === template.id
          return (
            <div
              key={template.id}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`
                flex-shrink-0 snap-start rounded-2xl overflow-hidden cursor-pointer
                border transition-all duration-300 bg-card
                ${isHovered
                  ? "w-[380px] border-primary/50 shadow-2xl shadow-primary/10 scale-[1.02] z-10"
                  : "w-[280px] border-border hover:border-primary/30"
                }
              `}
            >
              {/* Header with icon */}
              <div className={`p-5 transition-all duration-300 ${isHovered ? "pb-3" : ""} bg-gradient-to-br from-primary/10 to-transparent`}>
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-primary text-primary-foreground shadow-lg">
                    {template.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                      ~{template.estimatedMinutes} min
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                      {template.fieldsCount} fields
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-foreground mt-4">{template.templateName}</h3>
                <p className="text-muted-foreground text-sm mt-1 italic">{template.tagline}</p>
              </div>

              {/* Content */}
              <div className="px-5 pb-5">
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {template.description}
                </p>

                {/* Fields preview */}
                <div className="space-y-1.5 mb-4">
                  {template.sampleFields.slice(0, isHovered ? 7 : 3).map((field, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground/50 font-mono text-xs">{idx + 1}.</span>
                      <span className="text-foreground/70">{field}</span>
                    </div>
                  ))}
                  {!isHovered && template.sampleFields.length > 3 && (
                    <p className="text-muted-foreground/60 text-xs ml-4">+{template.sampleFields.length - 3} more...</p>
                  )}
                </div>

                {/* Expanded content */}
                {isHovered && (
                  <div className="space-y-4 pt-4 border-t border-border animate-in fade-in duration-200">
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">When to use</h4>
                      <p className="text-foreground/80 text-sm">{template.whenToUse}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Research basis</h4>
                      <p className="text-muted-foreground text-xs italic">{template.researchBasis}</p>
                    </div>

                    <button className="w-full py-3 rounded-xl text-primary-foreground font-semibold bg-primary hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                      Use this template
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GridCardsLayout({ templates }: { templates: SampleFieldReport[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground/90">Layout 2: Grid Cards (2x3)</h3>
      <p className="text-muted-foreground text-sm mb-4">All templates visible at once. Click to select.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const isSelected = selectedId === template.id
          return (
            <div
              key={template.id}
              onClick={() => setSelectedId(isSelected ? null : template.id)}
              className={`
                rounded-2xl overflow-hidden cursor-pointer bg-card
                border transition-all duration-300
                ${isSelected
                  ? "border-primary shadow-2xl shadow-primary/20 ring-2 ring-primary/50"
                  : "border-border hover:border-primary/40"
                }
              `}
            >
              {/* Compact header */}
              <div className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-md">
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{template.templateName}</h3>
                  <p className="text-muted-foreground text-xs truncate">{template.tagline}</p>
                </div>
                {isSelected && (
                  <div className="p-1.5 rounded-full bg-primary/20">
                    <Check className="size-4 text-primary" />
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div className="px-4 pb-3 flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="size-3" />
                  {template.estimatedMinutes} min
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <BarChart3 className="size-3" />
                  {template.fieldsCount} fields
                </span>
              </div>

              {/* Description */}
              <div className="px-4 pb-4">
                <p className="text-muted-foreground text-sm line-clamp-2">{template.description}</p>
              </div>

              {/* Expanded details */}
              {isSelected && (
                <div className="px-4 pb-4 pt-2 border-t border-border space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1">
                    {template.sampleFields.slice(0, 4).map((field, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-foreground/70">{field}</span>
                      </div>
                    ))}
                  </div>
                  <button className="w-full py-2.5 rounded-xl text-primary-foreground text-sm font-medium bg-primary hover:bg-primary/90 transition-colors">
                    Select Template
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CompactListLayout({ templates }: { templates: SampleFieldReport[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground/90">Layout 3: Compact List</h3>
      <p className="text-muted-foreground text-sm mb-4">Vertical stack with hover expansion.</p>

      <div className="space-y-3 max-w-2xl">
        {templates.map((template) => {
          const isExpanded = expandedId === template.id
          return (
            <div
              key={template.id}
              onMouseEnter={() => setExpandedId(template.id)}
              onMouseLeave={() => setExpandedId(null)}
              className={`
                rounded-xl overflow-hidden cursor-pointer
                border transition-all duration-300
                ${isExpanded
                  ? "border-primary/50 shadow-xl shadow-primary/10 bg-card"
                  : "border-border hover:border-primary/30 bg-card/50"
                }
              `}
            >
              {/* Main row */}
              <div className="p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-md">
                  {template.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground">{template.templateName}</h3>
                    <span className="px-2 py-0.5 rounded text-xs bg-secondary text-muted-foreground">
                      ~{template.estimatedMinutes} min
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">{template.description}</p>
                </div>

                <ChevronRight
                  className={`size-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`}
                />
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="pt-3 border-t border-border">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-2">Fields included:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.sampleFields.map((field, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded text-xs bg-primary/10 text-primary"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground mb-1">When to use:</p>
                    <p className="text-sm text-foreground/80">{template.whenToUse}</p>
                  </div>

                  <button className="w-full py-2.5 rounded-xl text-primary-foreground text-sm font-medium bg-primary hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                    Use {template.templateName}
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VisualCardsLayout({ templates }: { templates: SampleFieldReport[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground/90">Layout 4: Visual Cards</h3>
      <p className="text-muted-foreground text-sm mb-4">Bold visuals with abstract patterns.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
        {templates.slice(0, 4).map((template) => (
          <div
            key={template.id}
            className="group rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-primary/10 bg-card"
          >
            {/* Visual header with pattern */}
            <div className="h-32 relative overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20">
              {/* Abstract pattern overlay */}
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

              {/* Floating icon */}
              <div className="absolute top-6 left-6 p-4 rounded-2xl bg-primary text-primary-foreground shadow-xl group-hover:scale-110 transition-transform duration-300">
                {template.icon}
              </div>

              {/* Time badge */}
              <div className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-foreground text-sm font-medium">
                {template.estimatedMinutes} min
              </div>

              {/* Bottom gradient */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="text-xl font-bold text-foreground mb-1">{template.templateName}</h3>
              <p className="text-muted-foreground text-sm italic mb-3">{template.tagline}</p>
              <p className="text-foreground/70 text-sm leading-relaxed mb-4">{template.description}</p>

              {/* Quick stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                <span>{template.fieldsCount} fields</span>
                <span>•</span>
                <span className="capitalize">{template.whenToUse.split(".")[0]}</span>
              </div>

              {/* CTA */}
              <button className="w-full py-3 rounded-xl text-primary-foreground font-semibold bg-primary opacity-90 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                Start Report
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// PRINCIPLES SECTION - Complete Redesign for Impact
// ============================================================================

function PrinciplesSection({ principles }: { principles: Principle[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [expandedPrinciple, setExpandedPrinciple] = useState<string | null>(null)

  const filteredPrinciples = activeCategory === "all"
    ? principles
    : principles.filter(p => p.category === activeCategory)

  const categoryStats = PRINCIPLE_CATEGORIES.map(cat => ({
    ...cat,
    count: principles.filter(p => p.category === cat.id).length
  }))

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-card to-accent/10 border border-primary/30 p-8 md:p-12">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <Sparkles className="size-7" />
            </div>
            <div>
              <p className="text-primary font-semibold text-sm uppercase tracking-wider">The Science</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Why Field Reports Work</h2>
            </div>
          </div>

          <p className="text-lg text-foreground/80 max-w-2xl mb-6">
            These aren&apos;t random tips. They&apos;re <span className="text-primary font-semibold">25 evidence-based principles</span> from
            military training, sports psychology, cognitive science, and habit research—distilled into actionable guidelines.
          </p>

          {/* Quick stats row */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-foreground/70"><span className="text-foreground font-bold">15+</span> research domains</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-foreground/70"><span className="text-foreground font-bold">200+</span> studies referenced</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-foreground/70"><span className="text-foreground font-bold">35+</span> years of goal-setting research</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Browse by Category</h3>
          <span className="text-sm text-muted-foreground">{filteredPrinciples.length} principles</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeCategory === "all"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "bg-card border border-border text-foreground/70 hover:border-primary/50 hover:text-foreground"
            }`}
          >
            All ({principles.length})
          </button>
          {categoryStats.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-card border border-border text-foreground/70 hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>

        {/* Category description */}
        {activeCategory !== "all" && (
          <p className="text-muted-foreground text-sm pl-1">
            {PRINCIPLE_CATEGORIES.find(c => c.id === activeCategory)?.description}
          </p>
        )}
      </div>

      {/* Principles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPrinciples.map((principle) => {
          const isExpanded = expandedPrinciple === principle.id
          return (
            <div
              key={principle.id}
              onClick={() => setExpandedPrinciple(isExpanded ? null : principle.id)}
              className={`
                rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 bg-card border
                ${isExpanded
                  ? "border-primary/50 shadow-xl shadow-primary/10 md:col-span-2"
                  : "border-border hover:border-primary/30 hover:shadow-lg"
                }
              `}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl transition-colors ${isExpanded ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                    {principle.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">#{principle.number}</span>
                      <span className="px-2 py-0.5 rounded text-xs bg-secondary text-muted-foreground capitalize">
                        {PRINCIPLE_CATEGORIES.find(c => c.id === principle.category)?.name}
                      </span>
                    </div>
                    <h4 className="font-bold text-foreground text-lg leading-tight">{principle.title}</h4>
                  </div>
                  <ChevronDown className={`size-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>

                {/* Insight quote - always visible */}
                {principle.insight && (
                  <div className="mt-4 pl-16">
                    <p className="text-primary font-medium italic">&ldquo;{principle.insight}&rdquo;</p>
                  </div>
                )}

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Description */}
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">The Principle</h5>
                        <p className="text-foreground/80 leading-relaxed">{principle.description}</p>
                      </div>

                      {/* Meta info */}
                      <div className="space-y-4">
                        {/* Research stat */}
                        {principle.stat && (
                          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                            <h5 className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Research Finding</h5>
                            <p className="text-foreground font-semibold">{principle.stat}</p>
                          </div>
                        )}

                        {/* Source */}
                        <div>
                          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Source</h5>
                          <p className="text-foreground/70">{principle.source}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <div className="text-center pt-8">
        <p className="text-muted-foreground mb-4">
          These principles are built into every template. When you write a field report, you&apos;re not just logging—you&apos;re learning.
        </p>
        <button className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
          Start Your First Report
          <ArrowRight className="size-5" />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Research Domains Showcase
// ============================================================================

function ResearchDomainsSection() {
  const domains = [
    { name: "Military", detail: "US Army After Action Reviews", icon: "🎖️" },
    { name: "Sports Psychology", detail: "Elite athlete debriefs", icon: "🏆" },
    { name: "CBT", detail: "Cognitive Behavioral Therapy", icon: "🧠" },
    { name: "Habit Science", detail: "BJ Fogg, James Clear", icon: "🔄" },
    { name: "Learning Theory", detail: "Kolb, Ericsson", icon: "📚" },
    { name: "Self-Compassion", detail: "Kristin Neff research", icon: "💚" },
    { name: "Trading/Poker", detail: "Decision journaling", icon: "🎰" },
    { name: "Aviation", detail: "Crew Resource Management", icon: "✈️" },
    { name: "Improv Comedy", detail: "Second City methods", icon: "🎭" },
    { name: "Healthcare", detail: "Gibbs & Driscoll models", icon: "🏥" },
    { name: "BJJ/Martial Arts", detail: "Video analysis methods", icon: "🥋" },
    { name: "Agile/Software", detail: "Retrospectives", icon: "💻" },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">Sourced From 15+ Domains</h3>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          We didn&apos;t invent these principles. We synthesized decades of research from fields that have mastered the art of learning from experience.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {domains.map((domain) => (
          <div
            key={domain.name}
            className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors group"
          >
            <div className="text-2xl mb-2">{domain.icon}</div>
            <h4 className="font-semibold text-foreground text-sm">{domain.name}</h4>
            <p className="text-muted-foreground text-xs">{domain.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Key Stats Highlight
// ============================================================================

function KeyStatsSection() {
  const stats = [
    { value: "3x", label: "Success rate", detail: "with implementation intentions" },
    { value: "40%", label: "Higher adherence", detail: "with habit tracking" },
    { value: "200-300%", label: "Better retention", detail: "with spaced retrieval" },
    { value: "80%", label: "Of insights", detail: "come from analyzing endings" },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 text-center">
          <div className="text-4xl font-bold text-primary mb-1">{stat.value}</div>
          <div className="text-foreground font-medium text-sm">{stat.label}</div>
          <div className="text-muted-foreground text-xs">{stat.detail}</div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export default function FieldReportsTestPage() {
  const [activeLayout, setActiveLayout] = useState<1 | 2 | 3 | 4>(1)

  return (
    <div className="min-h-screen bg-background p-6 overflow-auto">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          <span>Test Page</span>
          <span>/</span>
          <span className="text-foreground/80">Field Reports</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Field Report Layouts</h1>
        <p className="text-muted-foreground max-w-2xl">
          Testing different layout options for the &quot;Write Field Report&quot; section.
          Now using proper color scheme and distinct icons.
        </p>
      </div>

      {/* Layout Switcher */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-card border border-border inline-flex">
          {[1, 2, 3, 4].map((num) => (
            <button
              key={num}
              onClick={() => setActiveLayout(num as 1 | 2 | 3 | 4)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeLayout === num
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              Layout {num}
            </button>
          ))}
        </div>
      </div>

      {/* Current Layout */}
      <div className="max-w-7xl mx-auto mb-16">
        {activeLayout === 1 && <HorizontalCardsLayout templates={SAMPLE_TEMPLATES} />}
        {activeLayout === 2 && <GridCardsLayout templates={SAMPLE_TEMPLATES} />}
        {activeLayout === 3 && <CompactListLayout templates={SAMPLE_TEMPLATES} />}
        {activeLayout === 4 && <VisualCardsLayout templates={SAMPLE_TEMPLATES} />}
      </div>

      {/* Divider */}
      <div className="max-w-7xl mx-auto mb-16">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* KEY STATS */}
      <div className="max-w-7xl mx-auto mb-16">
        <KeyStatsSection />
      </div>

      {/* PRINCIPLES SECTION - The Star */}
      <div className="max-w-7xl mx-auto mb-16">
        <PrinciplesSection principles={PRINCIPLES} />
      </div>

      {/* Divider */}
      <div className="max-w-7xl mx-auto mb-16">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* RESEARCH DOMAINS */}
      <div className="max-w-7xl mx-auto mb-16">
        <ResearchDomainsSection />
      </div>

      {/* All Layouts Preview */}
      <div className="max-w-7xl mx-auto mb-16">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Layout Comparison</h3>
        <p className="text-muted-foreground text-sm mb-6">Side-by-side mini previews of all layouts</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((num) => (
            <button
              key={num}
              onClick={() => setActiveLayout(num as 1 | 2 | 3 | 4)}
              className={`p-4 rounded-xl border transition-all duration-300 text-left ${
                activeLayout === num
                  ? "border-primary/50 bg-primary/10"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className="text-foreground font-medium mb-1">Layout {num}</div>
              <div className="text-muted-foreground text-xs">
                {num === 1 && "Horizontal scroll cards"}
                {num === 2 && "2x3 grid layout"}
                {num === 3 && "Compact vertical list"}
                {num === 4 && "Visual pattern cards"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Design Notes */}
      <div className="max-w-7xl mx-auto mb-8 p-6 rounded-2xl bg-card border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="size-5 text-primary" />
          Updates Made
        </h3>
        <ul className="space-y-2 text-muted-foreground text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            <span><strong className="text-foreground">Color scheme fixed</strong> - Now using CSS variables (--primary, --accent, --card, etc.)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            <span><strong className="text-foreground">Distinct icons</strong> - Templates and Principles use completely different icon sets</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            <span><strong className="text-foreground">All 25 principles</strong> - Complete list from research, organized by category</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            <span><strong className="text-foreground">Principles redesigned</strong> - Hero section, category filtering, expandable cards with stats</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            <span><strong className="text-foreground">Research domains showcase</strong> - Visual proof of the breadth of sources</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            <span><strong className="text-foreground">Key stats section</strong> - Compelling numbers at a glance</span>
          </li>
        </ul>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-border">
        <p className="text-muted-foreground text-sm text-center">
          Field Reports Layout Test • Based on research from FIELD_REPORT_RESEARCH_PLAN.md
        </p>
      </div>
    </div>
  )
}
