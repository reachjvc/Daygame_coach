import {
  Zap,
  FileText,
  Microscope,
  Flame,
  Settings2,
} from "lucide-react"

/**
 * Template icons for field reports.
 * Separated from config.ts because it contains JSX.
 */
export const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  "quick-log": <Zap className="size-6" />,
  standard: <FileText className="size-6" />,
  "deep-dive": <Microscope className="size-6" />,
  blowout: <Flame className="size-6" />,
  customizable: <Settings2 className="size-6" />,
  custom: <Settings2 className="size-6" />,
}
