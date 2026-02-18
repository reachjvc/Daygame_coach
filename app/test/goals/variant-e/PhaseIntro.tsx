"use client"

import { Button } from "@/components/ui/button"
import { Compass } from "lucide-react"

interface PhaseIntroProps {
  onBegin: () => void
}

export function PhaseIntro({ onBegin }: PhaseIntroProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[480px] text-center px-6">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full" />
        <div className="relative rounded-full bg-orange-500/10 border border-orange-500/20 p-6">
          <Compass className="size-12 text-orange-500" />
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-3 tracking-tight">
        Your Journey Starts Here
      </h1>

      <p className="text-muted-foreground max-w-lg text-base leading-relaxed mb-2">
        Forget browsing a catalog. Tell us about yourself, and we will build
        a personalized goal map that fits where you are and where you want to go.
      </p>

      <p className="text-muted-foreground/70 text-sm max-w-md mb-8">
        4 quick questions. Takes about 60 seconds.
      </p>

      <Button
        size="lg"
        onClick={onBegin}
        className="px-8 py-3 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 hover:scale-[1.02]"
        data-testid="journey-begin"
      >
        Let us map your journey
      </Button>

      <div className="mt-12 flex items-center gap-6 text-xs text-muted-foreground/50">
        <span className="flex items-center gap-1.5">
          <div className="size-1.5 rounded-full bg-orange-500/40" />
          Personalized
        </span>
        <span className="flex items-center gap-1.5">
          <div className="size-1.5 rounded-full bg-orange-500/40" />
          No wrong answers
        </span>
        <span className="flex items-center gap-1.5">
          <div className="size-1.5 rounded-full bg-orange-500/40" />
          Fully customizable
        </span>
      </div>
    </div>
  )
}
