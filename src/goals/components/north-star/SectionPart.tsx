"use client"

import type { ReactNode } from "react"

/**
 * ONE SECTION OF A SPLIT SHEET OR CARD (Plans/plan-new-from-real.md, Phase 6.2).
 *
 * Without a `section` it draws its children and nothing else, so `/plan` is unchanged. With one, the section that is not
 * current stays mounted and hidden instead of unmounted, so a half-typed line in a box of another section is not lost
 * when the chips switch sections.
 */
export function SectionPart({ section, id, className, children }: { section: string | undefined; id: string; className?: string; children: ReactNode }) {
  if (!section) return <>{children}</>
  return <div hidden={section !== id} className={className}>{children}</div>
}
