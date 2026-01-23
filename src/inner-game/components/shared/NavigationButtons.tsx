"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"

type NavigationButtonsProps = {
  onBack?: () => void
  onNext: () => void
  backLabel?: string
  nextLabel?: string
  nextDisabled?: boolean
  isLoading?: boolean
}

export function NavigationButtons({
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Continue",
  nextDisabled = false,
  isLoading = false,
}: NavigationButtonsProps) {
  return (
    <div className="flex justify-between items-center gap-4 pt-6">
      {onBack ? (
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Button>
      ) : (
        <div /> // Spacer for alignment
      )}

      <Button
        onClick={onNext}
        disabled={nextDisabled || isLoading}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {nextLabel}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </div>
  )
}
