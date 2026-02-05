"use client"

import { useState, useCallback } from "react"
import { Mic, Square, Loader2, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVoiceRecorder } from "../hooks/useVoiceRecorder"
import type { VoiceRecorderResult } from "../types"
import { cn } from "@/lib/utils"

interface VoiceRecorderButtonProps {
  onComplete: (result: VoiceRecorderResult) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
}

/**
 * Formats duration in seconds to mm:ss format.
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

/**
 * Voice recorder button with tap-to-toggle recording.
 * Shows recording state, duration, and live transcription preview.
 */
export function VoiceRecorderButton({
  onComplete,
  onError,
  disabled = false,
  className,
}: VoiceRecorderButtonProps) {
  const {
    isRecording,
    isTranscribing,
    duration,
    error,
    transcription,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
    isSupported,
    isTranscriptionSupported,
  } = useVoiceRecorder()

  const [showError, setShowError] = useState(false)

  const handleClick = useCallback(async () => {
    if (!isSupported) {
      onError?.("Voice recording is not supported in this browser")
      return
    }

    if (isRecording) {
      // Stop recording
      const result = await stopRecording()
      if (result) {
        onComplete(result)
      }
    } else {
      // Start recording
      clearError()
      setShowError(false)
      await startRecording()
    }
  }, [isRecording, isSupported, startRecording, stopRecording, clearError, onComplete, onError])

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    cancelRecording()
  }, [cancelRecording])

  // Show error toast
  if (error && !showError) {
    setShowError(true)
    onError?.(error)
  }

  // Not supported - show disabled mic
  if (!isSupported) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled
        className={cn("text-muted-foreground", className)}
        title="Voice recording not supported"
      >
        <Mic className="size-4" />
      </Button>
    )
  }

  // Processing (transcribing)
  if (isTranscribing) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled
        className={cn("text-muted-foreground", className)}
        title="Processing..."
      >
        <Loader2 className="size-4 animate-spin" />
      </Button>
    )
  }

  // Recording state
  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        {/* Duration */}
        <span className="text-xs font-mono text-red-500 tabular-nums">
          {formatDuration(duration)}
        </span>

        {/* Stop button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleClick}
          className={cn(
            "relative text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950",
            className
          )}
          title="Stop recording"
          data-testid="voice-stop-button"
        >
          {/* Pulsing indicator */}
          <span className="absolute inset-0 rounded-md bg-red-500/20 animate-pulse" />
          <Square className="size-4 fill-current relative z-10" />
        </Button>

        {/* Cancel button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleCancel}
          className="text-muted-foreground hover:text-destructive"
          title="Cancel recording"
          data-testid="voice-cancel-button"
        >
          <X className="size-4" />
        </Button>
      </div>
    )
  }

  // Idle state
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleClick}
      disabled={disabled}
      className={cn("text-muted-foreground hover:text-primary", className)}
      title={
        isTranscriptionSupported
          ? "Record voice note"
          : "Record voice note (auto-transcription not available in this browser)"
      }
      data-testid="voice-record-button"
    >
      <Mic className={cn("size-4", !isTranscriptionSupported && "opacity-60")} />
    </Button>
  )
}

interface TranscriptionPreviewProps {
  transcription: string
  audioBlob: Blob | null
  onUseAsNote?: () => void
  onDiscard: () => void
  className?: string
}

/**
 * Preview card showing transcription result.
 * When onUseAsNote is omitted, shows "Saved as note" indicator (auto-save mode).
 */
export function TranscriptionPreview({
  transcription,
  audioBlob,
  onUseAsNote,
  onDiscard,
  className,
}: TranscriptionPreviewProps) {
  if (!transcription && !audioBlob) {
    return null
  }

  return (
    <div className={cn("p-3 bg-muted/50 rounded-lg space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Voice Note</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
        >
          Discard
        </Button>
      </div>

      {transcription ? (
        <>
          <p className="text-sm text-foreground">{transcription}</p>
          {onUseAsNote ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onUseAsNote}
              className="w-full"
            >
              Use as note
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="size-3 text-green-500" />
              <span>Saved as note</span>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          No transcription available (audio recorded)
        </p>
      )}
    </div>
  )
}
