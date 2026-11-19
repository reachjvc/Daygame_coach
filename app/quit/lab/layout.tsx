import type { ReactNode } from "react"
import "./lab.css"

/** The lab's classes come from its own stylesheet, so other pages do not download them (app/theme.css). */
export default function LabLayout({ children }: { children: ReactNode }) {
  return children
}
