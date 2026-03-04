import {
  Zap,
  FileText,
  Microscope,
  Settings2,
  Star,
  Lock,
  Heart,
  Brain,
  Footprints,
  Activity,
  Eye,
  Lightbulb,
} from "lucide-react"
import type { FieldCategory } from "../types"
import type { TemplateSlug } from "../data/templates"

/**
 * Category color classes for the field library.
 * Can't use dynamic Tailwind classes, so these are mapped explicitly.
 */
export const CATEGORY_COLORS_MAP: Record<FieldCategory, { border: string; bg: string; dot: string; text: string }> = {
  quick_capture: {
    border: "border-amber-500/30 hover:border-amber-500",
    bg: "hover:bg-amber-500/10",
    dot: "bg-amber-500",
    text: "text-amber-600 border-amber-500/50",
  },
  emotional: {
    border: "border-pink-500/30 hover:border-pink-500",
    bg: "hover:bg-pink-500/10",
    dot: "bg-pink-500",
    text: "text-pink-600 border-pink-500/50",
  },
  analysis: {
    border: "border-indigo-500/30 hover:border-indigo-500",
    bg: "hover:bg-indigo-500/10",
    dot: "bg-indigo-500",
    text: "text-indigo-600 border-indigo-500/50",
  },
  action: {
    border: "border-green-500/30 hover:border-green-500",
    bg: "hover:bg-green-500/10",
    dot: "bg-green-500",
    text: "text-green-600 border-green-500/50",
  },
  skill: {
    border: "border-orange-500/30 hover:border-orange-500",
    bg: "hover:bg-orange-500/10",
    dot: "bg-orange-500",
    text: "text-orange-600 border-orange-500/50",
  },
  context: {
    border: "border-slate-500/30 hover:border-slate-500",
    bg: "hover:bg-slate-500/10",
    dot: "bg-slate-500",
    text: "text-slate-600 border-slate-500/50",
  },
  cognitive: {
    border: "border-violet-500/30 hover:border-violet-500",
    bg: "hover:bg-violet-500/10",
    dot: "bg-violet-500",
    text: "text-violet-600 border-violet-500/50",
  },
}

/**
 * Template icons for field reports.
 * Separated from config.ts because it contains JSX.
 *
 * Typed against TemplateSlug to ensure all slugs have icons.
 */
export const TEMPLATE_ICONS: Record<TemplateSlug, React.ReactNode> = {
  "quick-log": <Zap className="size-6" />,
  standard: <FileText className="size-6" />,
  "deep-dive": <Microscope className="size-6" />,
  "cbt-thought-diary": <Brain className="size-6" />,
  custom: <Settings2 className="size-6" />,
  favorite: <Star className="size-6" />,
  "favorite-locked": <Lock className="size-6" />,
}

/**
 * Category icons for the custom report builder field library.
 * Separated from config.ts because it contains JSX.
 */
export const CATEGORY_ICONS: Record<FieldCategory, React.ReactNode> = {
  quick_capture: <Zap className="size-4" />,
  emotional: <Heart className="size-4" />,
  analysis: <Brain className="size-4" />,
  action: <Footprints className="size-4" />,
  skill: <Activity className="size-4" />,
  context: <Eye className="size-4" />,
  cognitive: <Lightbulb className="size-4" />,
}

/**
 * Component to render a category icon by key.
 * Use this instead of directly accessing CATEGORY_ICONS when you need a component.
 */
export function CategoryIcon({
  category,
  className,
}: {
  category: FieldCategory
  className?: string
}) {
  const icon = CATEGORY_ICONS[category]
  if (!icon) return null
  // Clone the icon element with additional className if provided
  if (className && typeof icon === "object" && "props" in icon) {
    const iconElement = icon as React.ReactElement
    return (
      <span className={className}>
        {iconElement}
      </span>
    )
  }
  return <>{icon}</>
}
