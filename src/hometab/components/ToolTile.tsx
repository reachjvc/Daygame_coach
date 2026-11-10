import Link from "next/link"
import { Lock } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { TileState } from "../tileAccess"

/**
 * One square on Home's grid. Four fit across a 320px phone: 4 × 64px plus
 * three 8px gaps is 280px inside a 16px gutter, and each stays above the 44px
 * a fingertip needs.
 */
export function ToolTile({ id, label, icon: Icon, access }: { id: string; label: string; icon: LucideIcon; access: TileState }) {
  const locked = access.state !== "open"
  return (
    <Link
      href={access.href}
      className="group relative flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-1 py-3 text-center transition-colors hover:border-primary"
      data-testid={`home-tile-${id}`}
      data-access={access.state}
      aria-label={access.state === "locked" ? `${label} (locked: see plans)` : access.state === "preview" ? `${label} (preview)` : undefined}
    >
      <Icon className="size-6 text-primary" aria-hidden />
      <span className="text-xs leading-tight text-foreground">{label}</span>
      {locked && <Lock className="absolute right-1.5 top-1.5 size-3.5 text-muted-foreground" aria-hidden />}
    </Link>
  )
}
