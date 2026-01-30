"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Zap,
  FileText,
  Microscope,
  Flame,
  Settings2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  X,
  Eye,
  Palette,
  LayoutGrid,
  List,
  Columns,
  Mic,
  Upload,
  Play,
  Pause,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import type { TemplateField } from "@/src/db/trackingTypes"

// ============================================================================
// Template Definitions with New Fields from Research
// ============================================================================

interface MockTemplate {
  id: string
  name: string
  slug: string
  description: string
  icon: React.ReactNode
  estimated_minutes: number
  static_fields: TemplateField[]
  dynamic_fields: TemplateField[]
  active_dynamic_fields: string[]
}

const MOCK_TEMPLATES: MockTemplate[] = [
  {
    id: "1",
    name: "Quick Log",
    slug: "quick-log",
    description: "Did something today? Log it before life gets in the way. The habit matters more than the detail.",
    icon: <Zap className="size-6" />,
    estimated_minutes: 1,
    static_fields: [
      { id: "mood", type: "select", label: "How do you feel?", options: ["😤", "😐", "😊", "🔥"], required: true },
      { id: "approaches", type: "number", label: "Approaches", placeholder: "How many?", required: true, min: 0 },
      { id: "intention", type: "text", label: "What was your intention/goal?", placeholder: "What were you trying to do?" },
      { id: "conversation", type: "textarea", label: "Write down the conversation", placeholder: "Me: Hey, I had to come say hi...\nHer: Hi! That's so random...\nMe: ...", rows: 5 },
      { id: "audio_reflection", type: "audio", label: "Or record yourself talking about it" },
      { id: "quick_note", type: "text", label: "Quick note", placeholder: "Anything worth noting? (optional)" },
    ],
    dynamic_fields: [],
    active_dynamic_fields: [],
  },
  {
    id: "2",
    name: "Standard",
    slug: "standard",
    description: "Capture what happened, what you learned, and what's next. The perfect balance of depth and speed.",
    icon: <FileText className="size-6" />,
    estimated_minutes: 3,
    static_fields: [
      { id: "mood", type: "select", label: "How do you feel?", options: ["😤", "😐", "😊", "🔥"], required: true },
      { id: "approaches", type: "number", label: "Approaches", placeholder: "How many?", required: true, min: 0 },
      { id: "intention", type: "text", label: "What was your intention/goal?", placeholder: "What were you trying to do?" },
      { id: "conversation", type: "textarea", label: "Write down the conversation", placeholder: "Me: Hey, I had to come say hi...\nHer: Hi! That's so random...\nMe: ...", rows: 6 },
      { id: "audio_reflection", type: "audio", label: "Or record yourself talking about it" },
      { id: "best_moment", type: "textarea", label: "Best moment", placeholder: "What stood out positively?", rows: 2 },
      { id: "why_ended", type: "textarea", label: "Your best interaction - why did it end?", placeholder: "What happened?", rows: 3 },
      { id: "do_differently", type: "textarea", label: "What would you do differently?", placeholder: "If you could replay it...", rows: 2 },
      { id: "key_takeaway", type: "text", label: "Key takeaway (optional)", placeholder: "One thing to remember" },
    ],
    dynamic_fields: [],
    active_dynamic_fields: [],
  },
  {
    id: "3",
    name: "Deep Dive",
    slug: "deep-dive",
    description: "She gave you her number? Almost kissed? This one deserves a proper breakdown. Find the gold in the details.",
    icon: <Microscope className="size-6" />,
    estimated_minutes: 10,
    static_fields: [
      { id: "mood", type: "select", label: "How do you feel?", options: ["😤", "😐", "😊", "🔥"], required: true },
      { id: "approaches", type: "number", label: "Approaches", placeholder: "How many?", required: true, min: 0 },
      { id: "intention", type: "text", label: "What was your intention/goal?", placeholder: "What were you trying to do?" },
      { id: "best_moment", type: "textarea", label: "Best moment", placeholder: "What stood out positively?", rows: 2 },
      { id: "conversation", type: "textarea", label: "Write down the conversation", placeholder: "Me: Hey, I had to come say hi...\nHer: Hi! That's so random...\nMe: ...", rows: 8 },
      { id: "audio_reflection", type: "audio", label: "Or record yourself talking about it" },
      { id: "technique", type: "multiselect", label: "Technique practiced", options: ["Push-pull", "Cold read", "Statement of intent", "Compliance test", "Time bridge", "Tease", "Qualification", "Role play"] },
      { id: "thirty_seconds_before", type: "textarea", label: "What happened in the 30 seconds before the key moment?", placeholder: "The lead-up often reveals more than the moment itself...", rows: 3 },
      { id: "hinge_moment", type: "textarea", label: "The hinge moment (where it could have gone differently)", placeholder: "Describe the decision point...", rows: 3 },
      { id: "why_ended", type: "textarea", label: "Why did it end?", placeholder: "Compare to your intention...", rows: 3 },
      { id: "do_differently", type: "textarea", label: "What would you do differently?", placeholder: "If you could replay it...", rows: 2 },
      { id: "sticking_point", type: "select", label: "Did your sticking point show up?", options: ["Yes", "No"] },
      { id: "sticking_point_detail", type: "textarea", label: "If yes, describe", placeholder: "What happened?", rows: 2 },
      { id: "not_admitting", type: "textarea", label: "What are you not admitting to yourself?", placeholder: "Be honest - this is private...", rows: 3 },
      { id: "key_takeaway", type: "text", label: "Key takeaway", placeholder: "One thing to remember" },
    ],
    dynamic_fields: [],
    active_dynamic_fields: [],
  },
  {
    id: "4",
    name: "Customizable",
    slug: "customizable",
    description: "You know what you need to work on. Build your own report with questions that hit YOUR blind spots.",
    icon: <Settings2 className="size-6" />,
    estimated_minutes: 10,
    static_fields: [
      { id: "mood", type: "select", label: "How do you feel?", options: ["😤", "😐", "😊", "🔥"], required: true },
      { id: "approaches", type: "number", label: "Approaches", placeholder: "How many?", required: true, min: 0 },
      { id: "intention", type: "text", label: "What was your intention/goal?", placeholder: "What were you trying to do?" },
      { id: "conversation", type: "textarea", label: "Write down the conversation", placeholder: "Me: Hey, I had to come say hi...\nHer: Hi! That's so random...\nMe: ...", rows: 8 },
      { id: "audio_reflection", type: "audio", label: "Or record yourself talking about it" },
      { id: "best_moment", type: "textarea", label: "Best moment", placeholder: "What stood out positively?", rows: 2 },
    ],
    dynamic_fields: [
      // ===== Quick Log extras =====
      { id: "quick_note", type: "text", label: "Quick note", placeholder: "Anything worth noting?" },

      // ===== Standard template fields =====
      { id: "why_ended", type: "textarea", label: "Why did your best interaction end?", placeholder: "What happened at the end?", rows: 3 },
      { id: "do_differently", type: "textarea", label: "What would you do differently?", placeholder: "If you could replay it...", rows: 2 },
      { id: "key_takeaway", type: "text", label: "Key takeaway", placeholder: "One thing to remember" },

      // ===== Deep Dive fields =====
      { id: "technique", type: "multiselect", label: "Technique practiced", options: ["Push-pull", "Cold read", "Statement of intent", "Compliance test", "Time bridge", "Tease", "Qualification", "Role play", "Storytelling", "DHV", "Disqualification", "Framing"] },
      { id: "thirty_seconds_before", type: "textarea", label: "What happened 30 seconds before the key moment?", placeholder: "The lead-up often reveals more than the moment...", rows: 3 },
      { id: "hinge_moment", type: "textarea", label: "The hinge moment", placeholder: "Where it could have gone differently...", rows: 3 },
      { id: "sticking_point", type: "select", label: "Did your sticking point show up?", options: ["Yes", "No", "Not sure"] },
      { id: "sticking_point_detail", type: "textarea", label: "Describe the sticking point", placeholder: "What happened?", rows: 2 },
      { id: "not_admitting", type: "textarea", label: "What are you not admitting to yourself?", placeholder: "Be brutally honest - this is private...", rows: 3 },

      // ===== Research-Based Questions (from behavioral psychology & coaching literature) =====
      { id: "pre_energy", type: "scale", label: "Pre-session energy level", min: 1, max: 5 },
      { id: "post_energy", type: "scale", label: "Post-session energy level", min: 1, max: 5 },
      { id: "what_took_courage", type: "textarea", label: "What took courage today?", placeholder: "Celebrate effort regardless of outcome...", rows: 2 },
      { id: "tell_friend", type: "textarea", label: "What would you tell a friend who had this experience?", placeholder: "Self-compassion reframe...", rows: 2 },
      { id: "automatic_thought", type: "textarea", label: "What automatic thought went through your mind?", placeholder: "When she responded, you immediately thought...", rows: 2 },
      { id: "pattern_repeating", type: "textarea", label: "What pattern do you notice repeating?", placeholder: "Compare with previous sessions...", rows: 2 },
      { id: "confidence_assessment", type: "scale", label: "How confident are you in this self-assessment?", min: 1, max: 5 },
      { id: "what_proves", type: "textarea", label: "What does this experience prove about you?", placeholder: "What identity story does this reinforce?", rows: 2 },

      // ===== 10 Additional Research Questions =====
      { id: "body_signals", type: "textarea", label: "What did your body tell you?", placeholder: "Nervous hands, tight chest, relaxed shoulders...", rows: 2 },
      { id: "her_body_language", type: "textarea", label: "What was her body language saying?", placeholder: "Eye contact, feet direction, proximity...", rows: 2 },
      { id: "emotional_trigger", type: "textarea", label: "What emotion drove your actions?", placeholder: "Fear, excitement, curiosity, validation-seeking...", rows: 2 },
      { id: "limiting_belief", type: "textarea", label: "What limiting belief surfaced?", placeholder: "A thought that held you back...", rows: 2 },
      { id: "small_win", type: "textarea", label: "What was your small win today?", placeholder: "Even tiny progress counts...", rows: 2 },
      { id: "comfort_zone", type: "select", label: "Did you step outside your comfort zone?", options: ["Yes, significantly", "A little", "Stayed comfortable", "Avoided challenge"] },
      { id: "next_edge", type: "textarea", label: "What's the next edge to push?", placeholder: "The next slightly scary thing to try...", rows: 2 },
      { id: "gratitude", type: "textarea", label: "What are you grateful for from today?", placeholder: "The opportunity, the lesson, her time...", rows: 2 },
      { id: "mentor_advice", type: "textarea", label: "What would your mentor say?", placeholder: "Imagine advice from someone you respect...", rows: 2 },
      { id: "future_self", type: "textarea", label: "What would your future confident self do differently?", placeholder: "Visualize the version of you who's already figured this out...", rows: 2 },
    ],
    active_dynamic_fields: ["why_ended", "do_differently", "key_takeaway"],
  },
]

const TEMPLATE_COLORS: Record<string, { bg: string; icon: string; gradient: string }> = {
  "quick-log": {
    bg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: "bg-amber-500 text-white",
    gradient: "from-amber-500/30 via-amber-500/10 to-orange-500/20",
  },
  standard: {
    bg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: "bg-blue-500 text-white",
    gradient: "from-blue-500/30 via-blue-500/10 to-indigo-500/20",
  },
  "deep-dive": {
    bg: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    icon: "bg-purple-500 text-white",
    gradient: "from-purple-500/30 via-purple-500/10 to-pink-500/20",
  },
  customizable: {
    bg: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    icon: "bg-cyan-500 text-white",
    gradient: "from-cyan-500/30 via-cyan-500/10 to-sky-500/20",
  },
}

const TEMPLATE_TAGLINES: Record<string, string> = {
  "quick-log": "In and out. Keep the streak alive.",
  standard: "3 minutes that compound over time.",
  "deep-dive": "Something clicked today. Let's unpack it.",
  customizable: "Your brain, your rules, your growth.",
}

// ============================================================================
// Field Renderer Component (Enhanced)
// ============================================================================

interface FieldRendererProps {
  field: TemplateField
  value: unknown
  onChange: (value: unknown) => void
  variant?: "default" | "compact" | "card"
}

function FieldRendererEnhanced({ field, value, onChange, variant = "default" }: FieldRendererProps) {
  const [tagInput, setTagInput] = useState("")

  const renderField = () => {
    switch (field.type) {
      case "text":
        return (
          <Input
            id={field.id}
            placeholder={field.placeholder}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "transition-all",
              variant === "card" && "bg-background/50 border-border/50 focus:border-primary"
            )}
          />
        )

      case "textarea":
        return (
          <textarea
            id={field.id}
            placeholder={field.placeholder}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            rows={field.rows || 4}
            className={cn(
              "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all",
              variant === "card" && "bg-background/50 border-border/50 focus:border-primary"
            )}
          />
        )

      case "number":
        return (
          <Input
            id={field.id}
            type="number"
            placeholder={field.placeholder}
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            min={field.min}
            max={field.max}
            className={cn(
              "transition-all",
              variant === "card" && "bg-background/50 border-border/50 focus:border-primary"
            )}
          />
        )

      case "select":
        // Special handling for emoji mood selector
        if (field.options?.every(opt => /^[\u{1F300}-\u{1F9FF}]$/u.test(opt))) {
          return (
            <div className="flex gap-2">
              {field.options?.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange(option)}
                  className={cn(
                    "text-3xl p-3 rounded-xl transition-all duration-200 hover:scale-110",
                    value === option
                      ? "bg-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                      : "bg-muted/50 hover:bg-muted opacity-60 hover:opacity-100"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )
        }
        return (
          <div className="flex flex-wrap gap-2">
            {field.options?.map((option) => (
              <Button
                key={option}
                type="button"
                variant={value === option ? "default" : "outline"}
                size="sm"
                onClick={() => onChange(option)}
                className="transition-all"
              >
                {option}
              </Button>
            ))}
          </div>
        )

      case "multiselect": {
        const selectedValues = (value as string[]) || []
        return (
          <div className="flex flex-wrap gap-2">
            {field.options?.map((option) => {
              const isSelected = selectedValues.includes(option)
              return (
                <Button
                  key={option}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (isSelected) {
                      onChange(selectedValues.filter((v) => v !== option))
                    } else {
                      onChange([...selectedValues, option])
                    }
                  }}
                  className="transition-all"
                >
                  {isSelected && <Check className="size-3 mr-1" />}
                  {option}
                </Button>
              )
            })}
          </div>
        )
      }

      case "scale": {
        const min = field.min ?? 1
        const max = field.max ?? 5
        const scaleOptions = Array.from({ length: max - min + 1 }, (_, i) => min + i)
        return (
          <div className="flex gap-2">
            {scaleOptions.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onChange(num)}
                className={cn(
                  "w-12 h-12 rounded-xl font-semibold transition-all duration-200",
                  value === num
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {num}
              </button>
            ))}
          </div>
        )
      }

      case "tags": {
        const tags = (value as string[]) || []
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="flex items-center gap-1 py-1 px-2">
                  {tag}
                  <button
                    type="button"
                    onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={field.placeholder || "Add tag..."}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    e.preventDefault()
                    if (!tags.includes(tagInput.trim())) {
                      onChange([...tags, tagInput.trim()])
                    }
                    setTagInput("")
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                    onChange([...tags, tagInput.trim()])
                    setTagInput("")
                  }
                }}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        )
      }

      case "audio": {
        const audioValue = value as { fileName?: string; url?: string } | null
        return (
          <div className="space-y-3">
            {audioValue?.url ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                <div className="p-2 rounded-full bg-primary/10">
                  <Mic className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{audioValue.fileName || "Recording"}</p>
                  <audio controls className="w-full h-8 mt-1">
                    <source src={audioValue.url} />
                  </audio>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onChange(null)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : (
              <label className={cn(
                "flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                "hover:border-primary/50 hover:bg-primary/5",
                variant === "card" && "bg-background/50"
              )}>
                <div className="p-3 rounded-full bg-muted">
                  <Upload className="size-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Upload audio recording</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    MP3, M4A, WAV up to 10MB
                  </p>
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const url = URL.createObjectURL(file)
                      onChange({ fileName: file.name, url })
                    }
                  }}
                />
              </label>
            )}
            <p className="text-xs text-muted-foreground">
              <Mic className="size-3 inline mr-1" />
              Prefer talking? Record yourself reflecting on the session
            </p>
          </div>
        )
      }

      default:
        return (
          <Input
            id={field.id}
            placeholder={field.placeholder}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        )
    }
  }

  return (
    <div className={cn(
      "space-y-2",
      variant === "card" && "p-4 rounded-xl bg-muted/30 border border-border/50"
    )}>
      <Label htmlFor={field.id} className="flex items-center gap-1 text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      {renderField()}
    </div>
  )
}

// ============================================================================
// Template Card Component
// ============================================================================

interface TemplateCardProps {
  template: MockTemplate
  onClick: () => void
  layout: "grid" | "list" | "compact"
}

function TemplateCard({ template, onClick, layout }: TemplateCardProps) {
  const colors = TEMPLATE_COLORS[template.slug] || TEMPLATE_COLORS["standard"]
  const tagline = TEMPLATE_TAGLINES[template.slug] || template.description

  if (layout === "list") {
    return (
      <div
        onClick={onClick}
        className="group flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 bg-card cursor-pointer transition-all hover:shadow-lg"
      >
        <div className={`p-3 rounded-xl ${colors.icon}`}>
          {template.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{template.name}</h3>
            <Badge variant="secondary" className="text-xs">{template.estimated_minutes} min</Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{tagline}</p>
        </div>
        <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    )
  }

  if (layout === "compact") {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl border transition-all w-full text-left",
          "hover:border-primary/50 hover:shadow-md",
          colors.bg
        )}
      >
        <div className={`p-2 rounded-lg ${colors.icon}`}>
          {template.icon}
        </div>
        <div className="flex-1">
          <span className="font-medium text-sm">{template.name}</span>
          <span className="text-xs text-muted-foreground ml-2">{template.estimated_minutes}m</span>
        </div>
      </button>
    )
  }

  // Grid layout (default)
  return (
    <div
      onClick={onClick}
      className="group rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-primary/10 bg-card h-full flex flex-col"
    >
      {/* Visual header */}
      <div className={`h-28 relative overflow-hidden bg-gradient-to-br ${colors.gradient} flex-shrink-0`}>
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" className="text-foreground">
            <defs>
              <pattern id={`p-${template.id}`} x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="16" cy="16" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#p-${template.id})`} />
          </svg>
        </div>
        <div className={`absolute top-4 left-4 p-3 rounded-xl ${colors.icon} shadow-lg group-hover:scale-105 transition-transform`}>
          {template.icon}
        </div>
        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium">
          {template.estimated_minutes} min
        </div>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-lg mb-0.5">{template.name}</h3>
        <p className="text-muted-foreground text-sm italic mb-2">{tagline}</p>
        <p className="text-foreground/70 text-xs leading-relaxed mb-3 line-clamp-2">{template.description}</p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span>{template.static_fields.length + template.active_dynamic_fields.length} fields</span>
          <span>•</span>
          <span>{template.static_fields.filter(f => f.required).length} required</span>
        </div>

        <div className="mt-auto">
          <button className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground opacity-90 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            Start Report
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Form Section Component
// ============================================================================

interface FormSectionProps {
  template: MockTemplate
  formValues: Record<string, unknown>
  onFieldChange: (id: string, value: unknown) => void
  variant: "default" | "sections" | "cards"
  showDynamicFields: boolean
  activeDynamicFields: string[]
  onToggleDynamicField: (id: string) => void
}

function FormSection({
  template,
  formValues,
  onFieldChange,
  variant,
  showDynamicFields,
  activeDynamicFields,
  onToggleDynamicField
}: FormSectionProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // Get all fields to render
  const staticFields = template.static_fields
  const dynamicFields = template.dynamic_fields.filter(f =>
    showDynamicFields || activeDynamicFields.includes(f.id)
  )

  if (variant === "sections") {
    // Group fields into sections
    const sections = [
      { id: "basics", title: "Basics", fields: staticFields.slice(0, 4) },
      { id: "reflection", title: "Reflection", fields: staticFields.slice(4) },
      { id: "optional", title: "Optional Deep Dive", fields: dynamicFields },
    ].filter(s => s.fields.length > 0)

    return (
      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.id} className="overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">{section.title}</span>
                <Badge variant="secondary" className="text-xs">{section.fields.length} fields</Badge>
              </div>
              {expandedSection === section.id ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
            </button>
            {expandedSection === section.id && (
              <div className="p-4 pt-0 space-y-4 border-t">
                {section.fields.map((field) => (
                  <FieldRendererEnhanced
                    key={field.id}
                    field={field}
                    value={formValues[field.id]}
                    onChange={(value) => onFieldChange(field.id, value)}
                  />
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    )
  }

  if (variant === "cards") {
    return (
      <div className="space-y-4">
        {staticFields.map((field) => (
          <FieldRendererEnhanced
            key={field.id}
            field={field}
            value={formValues[field.id]}
            onChange={(value) => onFieldChange(field.id, value)}
            variant="card"
          />
        ))}

        {template.dynamic_fields.length > 0 && (
          <div className="pt-4 border-t border-dashed">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium text-muted-foreground">Optional Fields</span>
              <Badge variant="outline" className="text-xs">Research-backed</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {template.dynamic_fields.map((field) => (
                <button
                  key={field.id}
                  onClick={() => onToggleDynamicField(field.id)}
                  className={cn(
                    "p-2 rounded-lg text-xs text-left transition-all",
                    activeDynamicFields.includes(field.id)
                      ? "bg-primary/10 border border-primary/30 text-primary"
                      : "bg-muted/50 border border-transparent hover:border-border"
                  )}
                >
                  {activeDynamicFields.includes(field.id) && <Check className="size-3 inline mr-1" />}
                  {field.label}
                </button>
              ))}
            </div>
            {dynamicFields.map((field) => (
              <FieldRendererEnhanced
                key={field.id}
                field={field}
                value={formValues[field.id]}
                onChange={(value) => onFieldChange(field.id, value)}
                variant="card"
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <Card className="p-6">
      <div className="space-y-6">
        {staticFields.map((field) => (
          <FieldRendererEnhanced
            key={field.id}
            field={field}
            value={formValues[field.id]}
            onChange={(value) => onFieldChange(field.id, value)}
          />
        ))}

        {template.dynamic_fields.length > 0 && showDynamicFields && (
          <>
            <div className="h-px bg-border" />
            <div className="text-sm text-muted-foreground font-medium">Optional fields</div>
            {dynamicFields.map((field) => (
              <FieldRendererEnhanced
                key={field.id}
                field={field}
                value={formValues[field.id]}
                onChange={(value) => onFieldChange(field.id, value)}
              />
            ))}
          </>
        )}
      </div>
    </Card>
  )
}

// ============================================================================
// Main Showcase Page
// ============================================================================

export default function FieldReportShowcasePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<MockTemplate | null>(null)
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [activeDynamicFields, setActiveDynamicFields] = useState<string[]>([])

  // View toggles
  const [templateLayout, setTemplateLayout] = useState<"grid" | "list" | "compact">("grid")
  const [formVariant, setFormVariant] = useState<"default" | "sections" | "cards">("default")
  const [showDynamicFields, setShowDynamicFields] = useState(false)

  const handleFieldChange = (id: string, value: unknown) => {
    setFormValues(prev => ({ ...prev, [id]: value }))
  }

  const handleToggleDynamicField = (id: string) => {
    setActiveDynamicFields(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const handleSelectTemplate = (template: MockTemplate) => {
    setSelectedTemplate(template)
    setFormValues({})
    setActiveDynamicFields(template.active_dynamic_fields)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <Link href="/test" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Test Dashboard
            </Link>
            <h1 className="text-xl font-bold">Field Report Showcase</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Eye className="size-3" />
              Testing Mode
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Controls */}
        <Card className="p-4 mb-8">
          <div className="flex flex-wrap items-center gap-6">
            {/* Template Layout Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Templates:</span>
              <div className="flex border rounded-lg overflow-hidden">
                <button
                  onClick={() => setTemplateLayout("grid")}
                  className={cn(
                    "p-2 transition-colors",
                    templateLayout === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  onClick={() => setTemplateLayout("list")}
                  className={cn(
                    "p-2 transition-colors",
                    templateLayout === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <List className="size-4" />
                </button>
                <button
                  onClick={() => setTemplateLayout("compact")}
                  className={cn(
                    "p-2 transition-colors",
                    templateLayout === "compact" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <Columns className="size-4" />
                </button>
              </div>
            </div>

            {/* Form Variant Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Form Style:</span>
              <div className="flex gap-1">
                {(["default", "sections", "cards"] as const).map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={formVariant === v ? "default" : "outline"}
                    onClick={() => setFormVariant(v)}
                    className="capitalize"
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>

            {/* Show Dynamic Fields Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Optional Fields:</span>
              <Button
                size="sm"
                variant={showDynamicFields ? "default" : "outline"}
                onClick={() => setShowDynamicFields(!showDynamicFields)}
              >
                {showDynamicFields ? "Show All" : "Hide"}
              </Button>
            </div>

            {/* Reset */}
            {selectedTemplate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedTemplate(null)
                  setFormValues({})
                }}
              >
                Reset Selection
              </Button>
            )}
          </div>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Template Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Choose Your Template</h2>
              <Badge variant="secondary">{MOCK_TEMPLATES.length} templates</Badge>
            </div>

            <div className={cn(
              templateLayout === "grid" && "grid grid-cols-2 gap-4",
              templateLayout === "list" && "space-y-3",
              templateLayout === "compact" && "grid grid-cols-2 gap-2"
            )}>
              {MOCK_TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onClick={() => handleSelectTemplate(template)}
                  layout={templateLayout}
                />
              ))}
            </div>
          </div>

          {/* Right: Form Preview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {selectedTemplate ? `${selectedTemplate.name} Form` : "Form Preview"}
              </h2>
              {selectedTemplate && (
                <Badge variant="outline" className="gap-1">
                  <Palette className="size-3" />
                  {formVariant}
                </Badge>
              )}
            </div>

            {selectedTemplate ? (
              <div className="space-y-4">
                {/* Template Header */}
                <div className={cn(
                  "p-4 rounded-xl",
                  `bg-gradient-to-r ${TEMPLATE_COLORS[selectedTemplate.slug]?.gradient || "from-primary/10 to-primary/5"}`
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      TEMPLATE_COLORS[selectedTemplate.slug]?.icon || "bg-primary text-primary-foreground"
                    )}>
                      {selectedTemplate.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedTemplate.name}</h3>
                      <p className="text-sm text-muted-foreground">{TEMPLATE_TAGLINES[selectedTemplate.slug]}</p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <FormSection
                  template={selectedTemplate}
                  formValues={formValues}
                  onFieldChange={handleFieldChange}
                  variant={formVariant}
                  showDynamicFields={showDynamicFields}
                  activeDynamicFields={activeDynamicFields}
                  onToggleDynamicField={handleToggleDynamicField}
                />

                {/* Submit Buttons */}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1">
                    Save Draft
                  </Button>
                  <Button className="flex-1">
                    <Check className="size-4 mr-2" />
                    Submit Report
                  </Button>
                </div>

                {/* Form Values Debug */}
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Debug: Form Values
                  </summary>
                  <pre className="mt-2 p-3 rounded-lg bg-muted/50 overflow-auto max-h-48">
                    {JSON.stringify(formValues, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <Card className="p-12 text-center">
                <div className="text-muted-foreground">
                  <FileText className="size-12 mx-auto mb-4 opacity-50" />
                  <p>Select a template to preview the form</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
