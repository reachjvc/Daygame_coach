"use client"

import { ArrowLeft } from "lucide-react"
import dynamic from "next/dynamic"

const GoalModelPage = dynamic(() => import("./GoalModelPage"), { ssr: false })

export default function GoalModelTestPage() {
  return (
    <div className="relative">
      <button
        onClick={() => window.history.back()}
        className="fixed top-4 left-4 z-50 flex items-center gap-1.5 rounded-lg bg-background/80 backdrop-blur border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors shadow-lg"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>
      <GoalModelPage />
    </div>
  )
}
