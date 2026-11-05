import type { ReactNode } from "react"
import { AppFrame } from "@/components/AppFrame"
import { ClaimThisDevice } from "@/src/notifications/components/ClaimThisDevice"

/**
 * Every signed-in page sits under this route group, and the group's only job
 * is the frame: the laptop header and the phone tab bar, drawn once rather
 * than page by page. The folder name in parentheses never appears in an
 * address. No sign-in check and no data here: `proxy.ts` owns who may enter,
 * and the pages keep their own checks. `Plans/site-structure.md`, Phase 3.
 *
 * One more job since the account-switching audit (Phase 8 of
 * Plans/toggl-parity.md): once per page load, this browser's push address is
 * handed to whoever is signed in, so a previous person's running timer stops
 * reaching it (`claimThisDevice`). It draws nothing.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* this browser's push address belongs to whoever is signed in now: `claimThisDevice` */}
      <ClaimThisDevice />
      <AppFrame>{children}</AppFrame>
    </>
  )
}
