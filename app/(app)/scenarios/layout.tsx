import type { Metadata } from "next"
import type { ReactNode } from "react"

/** The title of every page below, too (rule R4, docs/product/look.md). */
export const metadata: Metadata = { title: "Scenarios" }

export default function ScenariosLayout({ children }: { children: ReactNode }) {
  return children
}
