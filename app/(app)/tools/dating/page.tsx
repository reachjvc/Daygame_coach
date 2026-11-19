import type { Metadata } from "next"
import { ToolsPage } from "@/src/hometab"

export const metadata: Metadata = { title: "Dating" }

/** The Dating tile on Home opens this: All tools, Dating only (Plans/rebrand-10kdaysclub.md, Phase 6). */
export default function Page() {
  return <ToolsPage group="dating" />
}
