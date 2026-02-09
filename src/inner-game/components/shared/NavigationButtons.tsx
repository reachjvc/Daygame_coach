"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Loader2, LayoutGrid } from "lucide-react"

type NavigationButtonsProps = {
  onBack?: () => void
  onNext: () => void
  backLabel?: string
  nextLabel?: string
  nextDisabled?: boolean
  isLoading?: boolean
  onBackToHub?: () => void
}

export function NavigationButtons({
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Continue",
  nextDisabled = false,
  isLoading = false,
  onBackToHub,
}: NavigationButtonsProps) {
  return (
    <div className="space-y-4 pt-6">
      {/* Main navigation */}
      <div className="flex justify-between items-center gap-4">
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

      {/* Back to hub link */}
      {onBackToHub && (
        <div className="text-center">
          <button
            type="button"
            onClick={onBackToHub}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Back to Overview
          </button>
        </div>
      )}
    </div>
  )
}
