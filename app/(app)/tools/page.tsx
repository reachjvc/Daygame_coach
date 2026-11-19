import type { Metadata } from "next"
import { ToolsPage } from "@/src/hometab"

export const metadata: Metadata = { title: "All tools" }

export default function Page() {
  return <ToolsPage />
}
