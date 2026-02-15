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
