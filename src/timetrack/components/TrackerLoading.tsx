import Link from "next/link"

import { cn } from "@/lib/utils"

/**
 * The tracker's way back, drawn the same in its loading state and once it has loaded.
 *
 * The only way out of the tracker on a phone, and it used to be a bare 20x36px
 * arrow with its label hidden below `sm` — under the 44px this slice's own
 * `touchTarget` sets as the floor, on the one control somebody needs when they
 * are trying to leave.
 */
export const BACK_LINK_CLASS =
  "-ml-1 flex min-h-11 shrink items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground sm:min-h-0 sm:h-9"

/**
 * What the tracker shows before its workspace exists: the app's own chrome, not
 * a bare centred line on an empty page.
 *
 * This is the first thing anybody sees on the way in, and for the second it
 * lasted it looked like a different site: no header, no way back, and then the
 * whole page arriving at once underneath it. The header here is the real one,
 * so nothing jumps when the workspace lands.
 *
 * TWO MOMENTS USE IT: `app/(app)/time/loading.tsx`, while the server checks who
 * you are (before it, tapping Time showed nothing at all — getting-around #6 in
 * Plans/time-tracker-like-toggl.md), and `TogglLab`, while this browser's copy
 * is read. No hooks and no "use client", so the route's loading file can be a
 * server component.
 *
 * `underAppHeader`: the app's own header is drawn above on a PC (D9), so the
 * back control and the title are for phones only there, as in `TogglLab`.
 */
export function TrackerLoading({
  backHref,
  backLabel,
  underAppHeader = false,
}: {
  backHref: string
  backLabel: string
  underAppHeader?: boolean
}) {
  return (
    <div className="min-h-screen bg-background">
      <header
        className={cn("sticky top-0 z-[9500] border-b border-border bg-card/95 backdrop-blur", underAppHeader && "sm:hidden")}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2">
          <Link href={backHref} className={BACK_LINK_CLASS}>
            <span className="shrink-0">←</span>
            <span className="max-w-[112px] truncate">{backLabel}</span>
          </Link>
          <h1 className="shrink-0 text-sm font-semibold">Time Log</h1>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 pt-6 sm:px-4">
        <p className="text-sm text-muted-foreground">Loading your time…</p>
      </main>
    </div>
  )
}
