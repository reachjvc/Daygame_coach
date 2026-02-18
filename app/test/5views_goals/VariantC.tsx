"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Swords,
  Shield,
  Sparkles,
  Zap,
  Heart,
  Star,
  Trophy,
  Flame,
  Eye,
  AlertTriangle,
  BookMarked,
  Scroll,
  Crown,
  Users,
  ArrowRight,
  Quote,
  TrendingUp,
} from "lucide-react"

// ─── Mock Data ───────────────────────────────────────────────────────────────

const STORY_TITLE = "From Invisible to Irresistible"
const STORY_SUBTITLE = "A Daygamer's Journey"
const CURRENT_ACT = 2
const JOURNEY_MONTH = 4

const STORY_SO_FAR = `He had always been the quiet one. The observer. The man who sat at the back of cafes, watching life happen to other people while his own collected dust on a shelf. Thirty-one years old, and the longest conversation he'd had with an attractive woman in the past year was asking a barista if the oat milk was extra.

It wasn't that he lacked depth — he read voraciously, trained consistently, and could hold forth on everything from Stoic philosophy to film noir. But all that richness lived behind a wall of silence, visible only to himself.

Then came the catalyst. A friend's wedding where he stood alone for four hours, nursing the same drink, watching couples dance. He drove home that night and something cracked open. Not dramatically — more like a hairline fracture that would, over the following weeks, split into a canyon.

He found the community. Read the theory. Watched the infields. And on a gray Tuesday afternoon in October, he walked up to a woman on the high street and said the most terrifying sentence of his life: "Excuse me — I just noticed you walking past and I had to say something."

She smiled. They talked for three minutes. She had a boyfriend. It didn't matter. Something had shifted in the bedrock of his identity. He was no longer just an observer.

Four months in now, and the story is far from over. The rejections still sting. The approach anxiety still lurks. But the protagonist of this story is no longer the same man who drove home alone from that wedding. He is becoming someone else entirely — and that transformation is the real story.`

interface Chapter {
  id: number
  title: string
  subtitle: string
  act: 1 | 2 | 3
  status: "completed" | "active" | "upcoming"
  summary?: string
  startDate?: string
  endDate?: string
}

const CHAPTERS: Chapter[] = [
  { id: 1, title: "The Awakening", subtitle: "In which our hero realizes he cannot stay invisible forever", act: 1, status: "completed", summary: "The wedding that changed everything. Standing alone while the world danced. The drive home. The decision.", startDate: "Oct 1", endDate: "Oct 7" },
  { id: 2, title: "First Steps", subtitle: "In which research becomes obsession and obsession becomes intent", act: 1, status: "completed", summary: "Discovered daygame theory. Consumed 40+ hours of content in two weeks. Began visualizing approaches. Bought new clothes.", startDate: "Oct 8", endDate: "Oct 21" },
  { id: 3, title: "The Opening Line", subtitle: "In which a single sentence rewrites a life", act: 1, status: "completed", summary: "First approach ever. Gray Tuesday on the high street. Three minutes of conversation. She had a boyfriend. It didn't matter. Something fundamental shifted.", startDate: "Oct 22", endDate: "Oct 28" },
  { id: 4, title: "The Gauntlet Begins", subtitle: "In which quantity teaches what quality cannot", act: 1, status: "completed", summary: "Committed to 5 approaches per week. Hit the streets every Saturday. Most conversations lasted under 60 seconds. Didn't care. Building the muscle.", startDate: "Oct 29", endDate: "Nov 11" },
  { id: 5, title: "The Wall", subtitle: "In which our hero meets his first true enemy — himself", act: 1, status: "completed", summary: "Three consecutive sessions of zero approaches. Approach anxiety returned with a vengeance. Considered quitting. Journaled instead. Breakthrough insight: fear is the compass.", startDate: "Nov 12", endDate: "Nov 25" },
  { id: 6, title: "Into the Fire", subtitle: "In which Act I ends and the real story begins", act: 1, status: "completed", summary: "Pushed through the wall. Got his first phone number. She texted back. Then ghosted. But the ice was broken.", startDate: "Nov 26", endDate: "Dec 2" },
  { id: 7, title: "The Approach Gauntlet", subtitle: "In which discipline replaces motivation", act: 2, status: "completed", summary: "Increased to 10 approaches per week. Started tracking metrics. Conversion to number: 15%. Began noticing patterns in what worked.", startDate: "Dec 3", endDate: "Dec 16" },
  { id: 8, title: "The Rejection Storm", subtitle: "In which our hero faces his darkest hour", act: 2, status: "completed", summary: "Zero numbers from 15 approaches in one week. A woman laughed in his face. Another walked away mid-sentence. Every hero has their crucible.", startDate: "Dec 17", endDate: "Dec 30" },
  { id: 9, title: "The Unexpected Wing", subtitle: "In which allies appear when needed most", act: 2, status: "completed", summary: "Met a fellow daygamer at the usual spot. Started wingmanning. Having someone to debrief with changed everything. The journey is better shared.", startDate: "Dec 31", endDate: "Jan 13" },
  { id: 10, title: "The First Date", subtitle: "In which conversation becomes connection", act: 2, status: "completed", summary: "First real date from a cold approach. Coffee turned into a walk turned into three hours. She wasn't the one, but the experience proved the process works.", startDate: "Jan 14", endDate: "Jan 27" },
  { id: 11, title: "Calibration", subtitle: "In which our hero learns to read the invisible language", act: 2, status: "completed", summary: "Shifted focus from quantity to quality. Studying body language, vocal tonality, eye contact. Approaches became conversations. Conversations became connections.", startDate: "Jan 28", endDate: "Feb 3" },
  { id: 12, title: "The Numbers Game", subtitle: "In which metrics reveal truth and truth demands more", act: 2, status: "active", summary: "Current chapter. Weekly approach targets with detailed tracking. Building systematic review habits. The data doesn't lie — and it's showing improvement.", startDate: "Feb 4" },
  { id: 13, title: "The Date", subtitle: "In which our hero must show who he has become", act: 2, status: "upcoming" },
  { id: 14, title: "The Second Rejection Storm", subtitle: "In which the universe tests resolve once more", act: 2, status: "upcoming" },
  { id: 15, title: "The Turning Point", subtitle: "In which everything learned converges into instinct", act: 3, status: "upcoming" },
  { id: 16, title: "Natural Game", subtitle: "In which technique dissolves into authenticity", act: 3, status: "upcoming" },
  { id: 17, title: "The New Man", subtitle: "In which the protagonist becomes someone his past self wouldn't recognize", act: 3, status: "upcoming" },
]

interface PlotTwist {
  id: string
  title: string
  chapterId: number
  type: "setback" | "breakthrough" | "ally" | "revelation"
  narrative: string
  impact: string
}

const PLOT_TWISTS: PlotTwist[] = [
  {
    id: "pt1",
    title: "The Coffee Shop Rejection",
    chapterId: 8,
    type: "setback",
    narrative: "She was reading Murakami — his favorite author. The perfect opener. He walked up, heart pounding, and delivered what he thought was his best approach yet. She looked up, said 'I have a boyfriend' before he finished his sentence, and returned to her book. He stood there for a full second too long before walking away. The wingman saw everything.",
    impact: "Forced a reckoning with outcome dependence. Led to the realization that rejection is information, not judgment.",
  },
  {
    id: "pt2",
    title: "The Unexpected Wing",
    chapterId: 9,
    type: "ally",
    narrative: "He was approaching on Regent Street when he noticed another man doing the same thing — the same nervous energy, the same purposeful wandering, the same post-approach journaling on his phone. They made eye contact and laughed. 'You too?' 'Yeah, me too.' Marcus became his wing, his accountability partner, and eventually his friend.",
    impact: "Transformed a solitary pursuit into a shared mission. Approach frequency doubled within two weeks.",
  },
  {
    id: "pt3",
    title: "The Three-Hour Date",
    chapterId: 10,
    type: "breakthrough",
    narrative: "She said yes to coffee. He almost cancelled twice. But he showed up, and something clicked — not with her specifically, but with himself. For three hours, he was funny, present, curious. He wasn't performing. He was just... being. She texted after: 'That was really nice, but I didn't feel a romantic spark. You're great though.' He read it and smiled. She was right. And he was great.",
    impact: "Proof of concept. The system works. More importantly: he can be himself and that self is enough.",
  },
  {
    id: "pt4",
    title: "The Mirror Moment",
    chapterId: 11,
    type: "revelation",
    narrative: "Watching back a recorded approach (with consent), he barely recognized himself. The man on screen was relaxed, smiling, present. Nothing like the anxious wreck he felt like internally. The gap between self-perception and reality had been lying to him for years.",
    impact: "Shattered the core limiting belief: 'I'm not the kind of guy who can do this.' He literally watched himself being that guy.",
  },
]

interface CharacterStat {
  name: string
  value: number
  max: number
  icon: typeof Swords
  color: string
  description: string
}

const CHARACTER_STATS: CharacterStat[] = [
  { name: "Courage", value: 45, max: 100, icon: Swords, color: "bg-red-500", description: "Willingness to face fear and act anyway" },
  { name: "Discipline", value: 62, max: 100, icon: Shield, color: "bg-blue-500", description: "Consistency of practice, rain or shine" },
  { name: "Social Calibration", value: 38, max: 100, icon: Eye, color: "bg-purple-500", description: "Reading social cues and adjusting in real-time" },
  { name: "Resilience", value: 71, max: 100, icon: Flame, color: "bg-orange-500", description: "Ability to absorb rejection and keep going" },
  { name: "Charm", value: 55, max: 100, icon: Sparkles, color: "bg-amber-500", description: "Natural warmth, humor, and presence" },
]

interface CastMember {
  name: string
  role: string
  appearedIn: number
  description: string
}

const CAST: CastMember[] = [
  { name: "Marcus", role: "The Wing", appearedIn: 9, description: "Fellow daygamer turned accountability partner. Brutally honest feedback. Always up for a session." },
  { name: "The Barista", role: "The Recurring Extra", appearedIn: 1, description: "The oat milk question. A symbol of everything that needed to change. Still goes to that cafe. Still hasn't had a real conversation with her." },
  { name: "Coach Kyle", role: "The Mentor (Remote)", appearedIn: 2, description: "YouTube coach whose infields made it real. Never met in person, but his voice is in the protagonist's head during every approach." },
  { name: "Murakami Girl", role: "The Catalyst", appearedIn: 8, description: "The rejection that cut deepest. Not because of her, but because of the hope attached to the 'perfect opener.' A lesson in letting go." },
  { name: "Sarah", role: "The First Date", appearedIn: 10, description: "Three hours of genuine connection. Not the love interest, but proof that the protagonist can show up as himself and be enough." },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

function StoryArcVisualization({ chapters, currentChapter }: { chapters: Chapter[]; currentChapter: number }) {
  const totalChapters = chapters.length
  const arcPoints = chapters.map((ch, i) => {
    const x = (i / (totalChapters - 1)) * 100
    // Dramatic arc: rises through Act I, peaks mid Act II, dips, then rises to climax in Act III
    let y: number
    if (ch.act === 1) {
      y = 20 + (i / 5) * 30 // Rising from 20 to ~50
    } else if (ch.act === 2) {
      const actProgress = (i - 6) / 8
      // Peak at start of act 2, dip in middle (rejection storm), rise again
      y = 50 + Math.sin(actProgress * Math.PI) * 25 + actProgress * 10
    } else {
      y = 75 + ((i - 14) / 2) * 15 // Rising to climax
    }
    return { x, y: Math.min(95, y), chapter: ch }
  })

  return (
    <div className="relative w-full h-48 mt-4">
      {/* Act labels */}
      <div className="absolute top-0 left-0 right-0 flex text-xs font-serif text-muted-foreground">
        <div className="flex-1 text-center border-b border-dashed border-muted-foreground/30 pb-1">
          Act I — The Setup
        </div>
        <div className="flex-1 text-center border-b border-dashed border-amber-500/40 pb-1">
          Act II — The Confrontation
        </div>
        <div className="flex-1 text-center border-b border-dashed border-muted-foreground/30 pb-1">
          Act III — The Resolution
        </div>
      </div>

      {/* SVG arc */}
      <svg viewBox="0 0 100 60" className="w-full h-32 mt-6" preserveAspectRatio="none">
        {/* Completed path */}
        <polyline
          points={arcPoints
            .filter((p) => p.chapter.status === "completed" || p.chapter.status === "active")
            .map((p) => `${p.x},${60 - (p.y / 100) * 55}`)
            .join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
          className="text-amber-600"
        />
        {/* Upcoming path (dashed) */}
        <polyline
          points={arcPoints
            .filter((p) => p.chapter.status === "active" || p.chapter.status === "upcoming")
            .map((p) => `${p.x},${60 - (p.y / 100) * 55}`)
            .join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.4"
          strokeDasharray="1.5 1"
          className="text-muted-foreground/40"
        />
        {/* Chapter dots */}
        {arcPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={60 - (p.y / 100) * 55}
            r={p.chapter.id === currentChapter ? 1.8 : 0.9}
            className={
              p.chapter.status === "completed"
                ? "fill-amber-600"
                : p.chapter.status === "active"
                  ? "fill-amber-400 animate-pulse"
                  : "fill-muted-foreground/30"
            }
          />
        ))}
      </svg>

      {/* Current position indicator */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center">
        <span className="text-xs font-serif text-amber-600 italic">
          You are here — Chapter {currentChapter} of {totalChapters}
        </span>
      </div>
    </div>
  )
}

function StatBar({ stat }: { stat: CharacterStat }) {
  const Icon = stat.icon
  const percentage = (stat.value / stat.max) * 100

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-amber-700/70" />
          <span className="text-sm font-serif font-medium text-amber-950">{stat.name}</span>
        </div>
        <span className="text-xs font-mono text-amber-800/60">{stat.value}/{stat.max}</span>
      </div>
      <div className="h-2.5 bg-amber-100 rounded-full overflow-hidden border border-amber-200/50">
        <div
          className={`h-full ${stat.color} rounded-full transition-all duration-1000`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-amber-800/50 mt-0.5 font-serif italic opacity-0 group-hover:opacity-100 transition-opacity">
        {stat.description}
      </p>
    </div>
  )
}

function PlotTwistCard({ twist }: { twist: PlotTwist }) {
  const [expanded, setExpanded] = useState(false)
  const typeConfig = {
    setback: { icon: AlertTriangle, badge: "Plot Twist", badgeClass: "bg-red-100 text-red-800 border-red-200" },
    breakthrough: { icon: Zap, badge: "Breakthrough", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    ally: { icon: Users, badge: "New Ally", badgeClass: "bg-blue-100 text-blue-800 border-blue-200" },
    revelation: { icon: Eye, badge: "Revelation", badgeClass: "bg-purple-100 text-purple-800 border-purple-200" },
  }
  const config = typeConfig[twist.type]
  const Icon = config.icon

  return (
    <div
      className="border border-amber-200/60 rounded-lg bg-gradient-to-br from-amber-50/50 to-orange-50/30 overflow-hidden cursor-pointer hover:border-amber-300 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-1.5 rounded-md bg-amber-100/80">
              <Icon className="size-4 text-amber-700" />
            </div>
            <div>
              <h4 className="font-serif font-semibold text-amber-950 text-sm">{twist.title}</h4>
              <p className="text-xs text-amber-700/60 font-serif">Chapter {twist.chapterId}</p>
            </div>
          </div>
          <Badge variant="outline" className={`text-xs shrink-0 ${config.badgeClass}`}>
            {config.badge}
          </Badge>
        </div>
        {expanded && (
          <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="pl-4 border-l-2 border-amber-300/60">
              <p className="text-sm font-serif text-amber-900/80 leading-relaxed italic">
                {twist.narrative}
              </p>
            </div>
            <div className="bg-amber-100/40 rounded-md p-3">
              <p className="text-xs font-serif text-amber-800">
                <span className="font-semibold">Character Development:</span> {twist.impact}
              </p>
            </div>
          </div>
        )}
        {!expanded && (
          <p className="mt-2 text-xs text-amber-700/50 font-serif italic">Click to read more...</p>
        )}
      </div>
    </div>
  )
}

function ChapterListItem({ chapter, isActive, onClick }: { chapter: Chapter; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-all cursor-pointer ${
        isActive
          ? "bg-amber-100/80 border border-amber-300 shadow-sm"
          : chapter.status === "completed"
            ? "hover:bg-amber-50/50 border border-transparent"
            : "opacity-50 hover:opacity-70 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`size-7 rounded-full flex items-center justify-center text-xs font-mono shrink-0 ${
          chapter.status === "completed"
            ? "bg-amber-200 text-amber-800"
            : chapter.status === "active"
              ? "bg-amber-500 text-white animate-pulse"
              : "bg-muted text-muted-foreground"
        }`}>
          {chapter.id}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-serif font-medium truncate ${
            chapter.status === "upcoming" ? "text-muted-foreground" : "text-amber-950"
          }`}>
            {chapter.title}
          </p>
          <p className="text-xs font-serif text-amber-700/50 truncate italic">
            {chapter.subtitle}
          </p>
        </div>
        {chapter.status === "active" && (
          <Badge className="ml-auto shrink-0 bg-amber-500 text-white text-xs">Current</Badge>
        )}
      </div>
    </button>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function VariantC() {
  const [activeSection, setActiveSection] = useState<"story" | "chapters" | "character" | "cast">("story")
  const [selectedChapter, setSelectedChapter] = useState<Chapter>(CHAPTERS.find((c) => c.status === "active")!)
  const [storyExpanded, setStoryExpanded] = useState(false)

  const completedCount = CHAPTERS.filter((c) => c.status === "completed").length
  const activeChapter = CHAPTERS.find((c) => c.status === "active")!
  const upcomingChapters = CHAPTERS.filter((c) => c.status === "upcoming")

  const sections = [
    { id: "story" as const, label: "The Story So Far", icon: BookOpen },
    { id: "chapters" as const, label: "Chapters", icon: BookMarked },
    { id: "character" as const, label: "Character Sheet", icon: Scroll },
    { id: "cast" as const, label: "The Cast", icon: Users },
  ]

  return (
    <div className="space-y-6">
      {/* ─── Title Card ─── */}
      <Card className="overflow-hidden border-amber-200/60 bg-gradient-to-br from-amber-50 via-orange-50/30 to-yellow-50/20">
        <CardContent className="p-6 md:p-8">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <BookOpen className="size-8 text-amber-700/70" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-amber-950 tracking-tight">
                {STORY_TITLE}
              </h1>
              <p className="text-sm font-serif text-amber-700/60 italic mt-1">
                {STORY_SUBTITLE}
              </p>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs font-serif text-amber-800/50">
              <span>Month {JOURNEY_MONTH}</span>
              <span className="text-amber-300">|</span>
              <span>Act {CURRENT_ACT} of 3</span>
              <span className="text-amber-300">|</span>
              <span>{completedCount} chapters completed</span>
            </div>
            <div className="pt-2">
              <Badge variant="outline" className="bg-amber-100/60 text-amber-800 border-amber-200 font-serif">
                <Flame className="size-3 mr-1" />
                Currently: Chapter {activeChapter.id} — {activeChapter.title}
              </Badge>
            </div>
          </div>

          {/* Story Arc Visualization */}
          <StoryArcVisualization chapters={CHAPTERS} currentChapter={activeChapter.id} />
        </CardContent>
      </Card>

      {/* ─── Section Navigation ─── */}
      <div className="flex gap-1 p-1 rounded-lg bg-amber-50/80 border border-amber-200/40 overflow-x-auto">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-serif font-medium transition-all cursor-pointer ${
                activeSection === section.id
                  ? "bg-white text-amber-900 shadow-sm border border-amber-200/60"
                  : "text-amber-700/50 hover:text-amber-800"
              }`}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{section.label}</span>
            </button>
          )
        })}
      </div>

      {/* ─── The Story So Far ─── */}
      {activeSection === "story" && (
        <div className="space-y-6">
          <Card className="border-amber-200/60 bg-gradient-to-b from-amber-50/30 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Quote className="size-5 text-amber-600/60" />
                <CardTitle className="font-serif text-amber-950">The Story So Far</CardTitle>
              </div>
              <CardDescription className="font-serif italic">
                Month {JOURNEY_MONTH}. Act {CURRENT_ACT}. The confrontation is underway.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className={`font-serif text-amber-900/80 leading-relaxed text-sm space-y-4 ${!storyExpanded ? "line-clamp-6" : ""}`}>
                  {STORY_SO_FAR.split("\n\n").map((paragraph, i) => (
                    <p key={i} className={i === 0 ? "first-letter:text-3xl first-letter:font-bold first-letter:text-amber-700 first-letter:float-left first-letter:mr-1 first-letter:leading-none" : ""}>
                      {paragraph}
                    </p>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-amber-700 hover:text-amber-900 font-serif"
                  onClick={() => setStoryExpanded(!storyExpanded)}
                >
                  {storyExpanded ? "Read less" : "Continue reading..."}
                  <ChevronRight className={`size-4 ml-1 transition-transform ${storyExpanded ? "rotate-90" : ""}`} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Plot Twists */}
          <div>
            <h3 className="font-serif font-semibold text-amber-950 mb-3 flex items-center gap-2">
              <Zap className="size-4 text-amber-600" />
              Recent Plot Twists
            </h3>
            <div className="grid gap-3">
              {PLOT_TWISTS.map((twist) => (
                <PlotTwistCard key={twist.id} twist={twist} />
              ))}
            </div>
          </div>

          {/* Coming Next Teaser */}
          <Card className="border-dashed border-amber-300/60 bg-amber-50/20">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-amber-100/80">
                  <ArrowRight className="size-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-amber-600 font-serif font-medium uppercase tracking-wider">Coming Next</p>
                  <h4 className="font-serif font-semibold text-amber-950 mt-1">
                    Chapter {activeChapter.id + 1}: {upcomingChapters[0]?.title}
                  </h4>
                  <p className="text-sm font-serif text-amber-800/60 italic mt-1">
                    {upcomingChapters[0]?.subtitle}
                  </p>
                  <p className="text-xs font-serif text-amber-700/40 mt-2">
                    The next chapter awaits. But first, the current one must be lived fully.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Chapters ─── */}
      {activeSection === "chapters" && (
        <div className="grid md:grid-cols-[280px_1fr] gap-4">
          {/* Chapter List */}
          <Card className="border-amber-200/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-serif text-amber-950">All Chapters</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[500px]">
                <div className="space-y-1 pr-3">
                  {[1, 2, 3].map((act) => (
                    <div key={act}>
                      <div className="px-3 py-2 mt-2 first:mt-0">
                        <p className="text-xs font-serif font-semibold text-amber-600/70 uppercase tracking-wider">
                          Act {act} — {act === 1 ? "The Setup" : act === 2 ? "The Confrontation" : "The Resolution"}
                        </p>
                      </div>
                      {CHAPTERS.filter((c) => c.act === act).map((chapter) => (
                        <ChapterListItem
                          key={chapter.id}
                          chapter={chapter}
                          isActive={selectedChapter.id === chapter.id}
                          onClick={() => setSelectedChapter(chapter)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chapter Detail */}
          <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/20 to-transparent">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <Badge variant="outline" className="text-xs font-serif bg-amber-50 text-amber-700 border-amber-200">
                    Act {selectedChapter.act} — Chapter {selectedChapter.id}
                  </Badge>
                  <Badge
                    className={`text-xs ${
                      selectedChapter.status === "completed"
                        ? "bg-amber-200 text-amber-800"
                        : selectedChapter.status === "active"
                          ? "bg-amber-500 text-white"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {selectedChapter.status === "completed" ? "Completed" : selectedChapter.status === "active" ? "In Progress" : "Upcoming"}
                  </Badge>
                </div>

                <div>
                  <h2 className="text-xl font-serif font-bold text-amber-950">
                    {selectedChapter.title}
                  </h2>
                  <p className="font-serif text-amber-700/60 italic text-sm mt-1">
                    {selectedChapter.subtitle}
                  </p>
                </div>

                {selectedChapter.startDate && (
                  <p className="text-xs font-serif text-amber-600/50">
                    {selectedChapter.startDate}{selectedChapter.endDate ? ` — ${selectedChapter.endDate}` : " — Present"}
                  </p>
                )}

                {selectedChapter.summary ? (
                  <div className="border-l-2 border-amber-300/60 pl-4">
                    <p className="font-serif text-sm text-amber-900/70 leading-relaxed">
                      {selectedChapter.summary}
                    </p>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <BookOpen className="size-8 text-amber-300 mx-auto mb-3" />
                    <p className="font-serif text-amber-700/40 italic text-sm">
                      This chapter has yet to be written.
                    </p>
                    <p className="font-serif text-amber-600/30 text-xs mt-1">
                      The pages await your story.
                    </p>
                  </div>
                )}

                {/* Plot twists in this chapter */}
                {PLOT_TWISTS.filter((pt) => pt.chapterId === selectedChapter.id).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-amber-200/40">
                    <p className="text-xs font-serif font-semibold text-amber-700/60 uppercase tracking-wider mb-3">
                      Plot Twists in This Chapter
                    </p>
                    <div className="space-y-2">
                      {PLOT_TWISTS.filter((pt) => pt.chapterId === selectedChapter.id).map((twist) => (
                        <PlotTwistCard key={twist.id} twist={twist} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigation between chapters */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-serif text-amber-700"
                    disabled={selectedChapter.id === 1}
                    onClick={() => setSelectedChapter(CHAPTERS[selectedChapter.id - 2])}
                  >
                    <ChevronLeft className="size-4 mr-1" />
                    Previous Chapter
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-serif text-amber-700"
                    disabled={selectedChapter.id === CHAPTERS.length}
                    onClick={() => setSelectedChapter(CHAPTERS[selectedChapter.id])}
                  >
                    Next Chapter
                    <ChevronRight className="size-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Character Sheet ─── */}
      {activeSection === "character" && (
        <div className="space-y-6">
          {/* Character Header */}
          <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/40 via-orange-50/20 to-yellow-50/10 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Character portrait placeholder */}
                <div className="shrink-0 mx-auto md:mx-0">
                  <div className="size-32 rounded-xl bg-gradient-to-br from-amber-200 to-orange-200 border-2 border-amber-300/60 flex items-center justify-center shadow-inner">
                    <Crown className="size-12 text-amber-700/40" />
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <h2 className="text-xl font-serif font-bold text-amber-950">The Protagonist</h2>
                    <Badge className="bg-amber-500 text-white text-xs font-serif">Level 12</Badge>
                  </div>
                  <p className="text-sm font-serif text-amber-700/60 italic">
                    Former introvert. Aspiring conversationalist. Work in progress.
                  </p>
                  <div className="flex items-center justify-center md:justify-start gap-3 mt-3 text-xs font-serif text-amber-800/50">
                    <span className="flex items-center gap-1"><Star className="size-3" /> {completedCount} Chapters</span>
                    <span className="flex items-center gap-1"><TrendingUp className="size-3" /> Act {CURRENT_ACT}</span>
                    <span className="flex items-center gap-1"><Heart className="size-3" /> {PLOT_TWISTS.length} Plot Twists</span>
                  </div>

                  {/* XP Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-serif text-amber-700/60 mb-1">
                      <span>Journey Progress</span>
                      <span>{Math.round((completedCount / CHAPTERS.length) * 100)}%</span>
                    </div>
                    <div className="h-3 bg-amber-100 rounded-full overflow-hidden border border-amber-200/50">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-1000"
                        style={{ width: `${(completedCount / CHAPTERS.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="border-amber-200/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Scroll className="size-5 text-amber-600/60" />
                <CardTitle className="font-serif text-amber-950">Character Attributes</CardTitle>
              </div>
              <CardDescription className="font-serif italic text-xs">
                Every approach, every rejection, every conversation — they all shape who you are becoming.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {CHARACTER_STATS.map((stat) => (
                  <StatBar key={stat.name} stat={stat} />
                ))}
              </div>

              {/* Total power */}
              <div className="mt-6 pt-4 border-t border-amber-200/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-serif font-medium text-amber-950">Total Character Power</span>
                  <span className="text-lg font-mono font-bold text-amber-700">
                    {CHARACTER_STATS.reduce((sum, s) => sum + s.value, 0)}/{CHARACTER_STATS.reduce((sum, s) => sum + s.max, 0)}
                  </span>
                </div>
                <div className="h-4 bg-amber-100 rounded-full overflow-hidden border border-amber-200/50 mt-2">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-red-400 rounded-full"
                    style={{
                      width: `${(CHARACTER_STATS.reduce((sum, s) => sum + s.value, 0) / CHARACTER_STATS.reduce((sum, s) => sum + s.max, 0)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements / Milestones */}
          <Card className="border-amber-200/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-amber-600/60" />
                <CardTitle className="font-serif text-amber-950">Achievements Unlocked</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { title: "First Words", desc: "Completed your first approach", icon: Sparkles, unlocked: true },
                  { title: "Thick Skin", desc: "Survived 10+ rejections", icon: Shield, unlocked: true },
                  { title: "Band of Brothers", desc: "Found a wingman", icon: Users, unlocked: true },
                  { title: "The Date", desc: "First date from cold approach", icon: Heart, unlocked: true },
                  { title: "Centurion", desc: "100 total approaches", icon: Swords, unlocked: false },
                  { title: "Silver Tongue", desc: "Social Calibration reaches 70", icon: Crown, unlocked: false },
                ].map((achievement) => (
                  <div
                    key={achievement.title}
                    className={`p-3 rounded-lg border text-center ${
                      achievement.unlocked
                        ? "border-amber-200 bg-amber-50/50"
                        : "border-muted bg-muted/20 opacity-40"
                    }`}
                  >
                    <achievement.icon className={`size-6 mx-auto mb-2 ${achievement.unlocked ? "text-amber-600" : "text-muted-foreground"}`} />
                    <p className="text-xs font-serif font-semibold text-amber-950">{achievement.title}</p>
                    <p className="text-xs font-serif text-amber-700/50 mt-0.5">{achievement.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── The Cast ─── */}
      {activeSection === "cast" && (
        <div className="space-y-4">
          <Card className="border-amber-200/60 bg-gradient-to-b from-amber-50/30 to-transparent">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-amber-600/60" />
                <CardTitle className="font-serif text-amber-950">The Cast</CardTitle>
              </div>
              <CardDescription className="font-serif italic text-xs">
                No story is a solo act. These are the characters who have shaped the protagonist's journey.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {CAST.map((member) => (
                  <Dialog key={member.name}>
                    <DialogTrigger asChild>
                      <div className="flex items-start gap-4 p-4 rounded-lg border border-amber-200/40 hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer group">
                        <div className="size-10 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 border border-amber-300/60 flex items-center justify-center shrink-0">
                          <span className="text-sm font-serif font-bold text-amber-800">{member.name[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-serif font-semibold text-amber-950 text-sm">{member.name}</h4>
                            <Badge variant="outline" className="text-xs font-serif bg-amber-50 text-amber-700 border-amber-200">
                              {member.role}
                            </Badge>
                          </div>
                          <p className="text-xs font-serif text-amber-700/50 mt-0.5">
                            First appeared: Chapter {member.appearedIn}
                          </p>
                          <p className="text-sm font-serif text-amber-800/60 mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">
                            {member.description}
                          </p>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="bg-amber-50 border-amber-200">
                      <DialogHeader>
                        <DialogTitle className="font-serif text-amber-950 flex items-center gap-2">
                          {member.name}
                          <Badge variant="outline" className="font-normal text-xs bg-amber-100 text-amber-700 border-amber-200">
                            {member.role}
                          </Badge>
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <p className="text-xs font-serif text-amber-600/60">
                          First appeared in Chapter {member.appearedIn}: {CHAPTERS[member.appearedIn - 1]?.title}
                        </p>
                        <div className="border-l-2 border-amber-300/60 pl-4">
                          <p className="font-serif text-sm text-amber-900/70 leading-relaxed">
                            {member.description}
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Foreshadowing: Characters yet to appear */}
          <Card className="border-dashed border-amber-300/40">
            <CardContent className="p-5">
              <p className="text-xs font-serif text-amber-600/60 uppercase tracking-wider mb-3 font-medium">
                Foreshadowed Characters
              </p>
              <div className="space-y-2">
                {[
                  { hint: "The One Who Stays", tease: "Somewhere in the chapters ahead, there is a conversation that doesn't end. A number that leads to a second date, then a third..." },
                  { hint: "The Rival", tease: "Another daygamer, but with a different philosophy. The encounter will challenge everything the protagonist thinks he knows." },
                ].map((foreshadow) => (
                  <div key={foreshadow.hint} className="p-3 rounded-md bg-amber-50/30 border border-amber-200/20">
                    <p className="text-sm font-serif font-medium text-amber-900/40">{foreshadow.hint}</p>
                    <p className="text-xs font-serif text-amber-700/30 italic mt-1">{foreshadow.tease}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Footer Quote ─── */}
      <div className="text-center py-6 border-t border-amber-200/30">
        <Quote className="size-4 text-amber-400/40 mx-auto mb-2" />
        <p className="text-sm font-serif text-amber-700/40 italic max-w-md mx-auto">
          "We are the stories we tell ourselves. Choose to tell a brave one."
        </p>
      </div>
    </div>
  )
}
