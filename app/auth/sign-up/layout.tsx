import type { Metadata } from "next"
import type { ReactNode } from "react"

/** The page is a client component, so its title comes from here (rule R4, docs/product/look.md). */
export const metadata: Metadata = { title: "Sign up" }

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children
}
