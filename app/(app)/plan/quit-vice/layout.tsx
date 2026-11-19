import type { Metadata } from "next"
import type { ReactNode } from "react"

/** The page is a client component, so its title comes from here (rule R4, docs/product/look.md). */
export const metadata: Metadata = { title: "Black Box" }

export default function BlackBoxLayout({ children }: { children: ReactNode }) {
  return children
}
