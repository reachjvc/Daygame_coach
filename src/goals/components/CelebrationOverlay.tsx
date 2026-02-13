"use client"

import { useEffect, useCallback } from "react"
import confetti from "canvas-confetti"
import { Trophy, Star, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CelebrationTier } from "../types"

interface CelebrationOverlayProps {
  tier: CelebrationTier
  goalTitle: string
  onDismiss: () => void
}

const TIER_CONFIG: Record<CelebrationTier, {
  duration: number
  showModal: boolean
  confettiConfig?: confetti.Options
}> = {
  subtle: { duration: 1500, showModal: false },
  toast: { duration: 2500, showModal: false },
  "confetti-small": {
    duration: 3000,
    showModal: false,
    confettiConfig: { particleCount: 80, spread: 60, origin: { y: 0.7 } },
  },
  "confetti-full": {
    duration: 4000,
    showModal: true,
    confettiConfig: { particleCount: 150, spread: 100, origin: { y: 0.6 } },
  },
  "confetti-epic": {
    duration: 6000,
    showModal: true,
    confettiConfig: { particleCount: 250, spread: 160, origin: { y: 0.5 } },
  },
}

export function CelebrationOverlay({ tier, goalTitle, onDismiss }: CelebrationOverlayProps) {
  const config = TIER_CONFIG[tier]

  const fireConfetti = useCallback(() => {
    if (!config.confettiConfig) return

    // Initial burst
    confetti(config.confettiConfig)

    // For epic tier, fire multiple bursts
    if (tier === "confetti-epic") {
      setTimeout(() => confetti({ ...config.confettiConfig, angle: 60, origin: { x: 0, y: 0.6 } }), 500)
      setTimeout(() => confetti({ ...config.confettiConfig, angle: 120, origin: { x: 1, y: 0.6 } }), 1000)
      setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { y: 0.4 } }), 2000)
    }

    // For full tier, second burst from sides
    if (tier === "confetti-full") {
      setTimeout(() => confetti({ ...config.confettiConfig, angle: 60, origin: { x: 0, y: 0.7 } }), 600)
      setTimeout(() => confetti({ ...config.confettiConfig, angle: 120, origin: { x: 1, y: 0.7 } }), 600)
    }
  }, [config.confettiConfig, tier])

  useEffect(() => {
    fireConfetti()

    // Auto-dismiss for non-modal tiers
    if (!config.showModal) {
      const timer = setTimeout(onDismiss, config.duration)
      return () => clearTimeout(timer)
    }
  }, [fireConfetti, config, onDismiss])

  // Subtle: just a checkmark pulse (no overlay)
  if (tier === "subtle") {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-2 bg-green-500/15 text-green-400 border border-green-500/30 rounded-lg px-4 py-2">
          <Sparkles className="size-4" />
          <span className="text-sm font-medium">Done!</span>
        </div>
      </div>
    )
  }

  // Toast: brief notification
  if (tier === "toast") {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-2 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-lg px-4 py-3 shadow-lg">
          <Star className="size-4" />
          <span className="text-sm font-medium">Goal complete: {goalTitle}</span>
        </div>
      </div>
    )
  }

  // Confetti-small: brief confetti + toast
  if (tier === "confetti-small") {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-2 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg px-4 py-3 shadow-lg">
          <Trophy className="size-4" />
          <span className="text-sm font-medium">Goal complete: {goalTitle}</span>
        </div>
      </div>
    )
  }

  // Modal tiers (confetti-full, confetti-epic)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in duration-300">
      <div className="relative bg-card border border-border rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mb-4">
          <Trophy className="size-8 text-amber-400" />
        </div>

        <h2 className="text-2xl font-bold mb-2">
          {tier === "confetti-epic" ? "Epic Achievement!" : "Goal Complete!"}
        </h2>

        <p className="text-muted-foreground mb-6">{goalTitle}</p>

        {tier === "confetti-epic" && (
          <p className="text-amber-400 text-sm font-medium mb-6">
            You completed a long-term goal. That takes real commitment.
          </p>
        )}

        <Button onClick={onDismiss} className="w-full">
          Continue
        </Button>
      </div>
    </div>
  )
}
