"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

interface GoalToggleProps {
  goalId: string
  isActive: boolean
  onToggle: (goalId: string, active: boolean) => Promise<void>
}

export function GoalToggle({ goalId, isActive, onToggle }: GoalToggleProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      await onToggle(goalId, !isActive)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <Loader2 className="size-4 animate-spin text-muted-foreground flex-shrink-0" />
  }

  return (
    <button
      onClick={handleToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 cursor-pointer ${
        isActive ? "bg-primary" : "bg-muted"
      }`}
      role="switch"
      aria-checked={isActive}
    >
      <span
        className={`inline-block size-3.5 rounded-full bg-white transition-transform shadow-sm ${
          isActive ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  )
}
