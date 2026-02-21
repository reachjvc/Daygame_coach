"use client"

import { Zap, Rocket } from "lucide-react"

interface OnboardingChoiceProps {
  onChoose: (track: "simple" | "full") => void
}

export function OnboardingChoice({ onChoose }: OnboardingChoiceProps) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-2xl font-bold text-white mb-2">How do you want to start?</h1>
      <p className="text-sm text-white/60 mb-8 text-center max-w-md">
        You can always change this later. Start with what feels right.
      </p>

      <div className="grid gap-4 w-full max-w-lg">
        {/* Start Small card */}
        <button
          onClick={() => onChoose("simple")}
          className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 text-left transition-all hover:border-emerald-400/30 hover:bg-emerald-400/5 cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-emerald-400/10 p-3">
              <Zap className="size-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Start Small</h3>
              <p className="text-sm text-white/60">
                Pick one goal and build the habit. We&apos;ll suggest more when you&apos;re ready.
              </p>
            </div>
          </div>
        </button>

        {/* Go All In card */}
        <button
          onClick={() => onChoose("full")}
          className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 text-left transition-all hover:border-purple-400/30 hover:bg-purple-400/5 cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-purple-400/10 p-3">
              <Rocket className="size-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Go All In</h3>
              <p className="text-sm text-white/60">
                Set up your full goal system across all life areas.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
