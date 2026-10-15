import type { ReactNode } from "react"
import { AppFrame } from "@/components/AppFrame"

/**
 * Every signed-in page sits under this route group, and the group's only job
 * is the frame: the laptop header and the phone tab bar, drawn once rather
 * than page by page. The folder name in parentheses never appears in an
 * address. No sign-in check and no data here: `proxy.ts` owns who may enter,
 * and the pages keep their own checks. `Plans/site-structure.md`, Phase 3.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>
}
