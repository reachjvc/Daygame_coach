"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useVoiceLanguage } from "./VoiceLanguageContext"
import { getWhisperLanguage, getVoiceLanguageLabel } from "../config"
import type { AudioUploadResult } from "../types"

const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",      // .mp3
  "audio/mp4",       // .m4a
  "audio/x-m4a",     // .m4a (alt)
  "audio/wav",       // .wav
  "audio/webm",      // .webm
  "audio/ogg",       // .ogg
  "audio/flac",      // .flac
]

const MAX_FILE_SIZE_MB = 100
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

interface AudioUploadButtonProps {
  onComplete: (result: AudioUploadResult) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
}

type UploadState =
  | { status: "idle" }
  | { status: "loading-model"; progress: number }
  | { status: "transcribing" }
  | { status: "error"; message: string }

export function AudioUploadButton({
  onComplete,
  onError,
  disabled = false,
  className,
}: AudioUploadButtonProps) {
  const lang = useVoiceLanguage()
  const langLabel = getVoiceLanguageLabel(lang)
  const [state, setState] = useState<UploadState>({ status: "idle" })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset file input so same file can be re-selected
    e.target.value = ""

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = `File too large (${Math.round(file.size / 1024 / 1024)}MB). Max ${MAX_FILE_SIZE_MB}MB.`
      setState({ status: "error", message: msg })
      onError?.(msg)
      return
    }

    // Validate file type (lenient — accept anything audio/*)
    if (!file.type.startsWith("audio/")) {
      const msg = "Please select an audio file (.mp3, .m4a, .wav, .webm, .ogg)"
      setState({ status: "error", message: msg })
      onError?.(msg)
      return
    }

    const audioBlobUrl = URL.createObjectURL(file)

    try {
      // Load the model (shows download progress on first use)
      setState({ status: "loading-model", progress: 0 })

      const { pipeline } = await import("@huggingface/transformers")

      const transcriber = await pipeline(
        "automatic-speech-recognition",
        "onnx-community/whisper-tiny",
        {
          dtype: "q8",
          device: "wasm",
          progress_callback: (event: { status: string; progress?: number }) => {
            if (event.status === "progress" && typeof event.progress === "number") {
              setState({ status: "loading-model", progress: Math.round(event.progress) })
            }
          },
        },
      )

      setState({ status: "transcribing" })

      const whisperLang = getWhisperLanguage(lang)
      const result = await transcriber(audioBlobUrl, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false,
        language: whisperLang,
      })

      const text = typeof result === "object" && result !== null && "text" in result
        ? (result as { text: string }).text.trim()
        : String(result).trim()

      setState({ status: "idle" })
      onComplete({ transcription: text, audioBlobUrl })
    } catch (err) {
      console.error("Audio transcription error:", err)
      const msg = err instanceof Error ? err.message : "Transcription failed"
      setState({ status: "error", message: msg })
      onError?.(msg)
      // Still provide the audio URL even if transcription failed
      onComplete({ transcription: "", audioBlobUrl })
    }
  }, [onComplete, onError, lang])

  const handleDismissError = useCallback(() => {
    setState({ status: "idle" })
  }, [])

  // Loading model state
  if (state.status === "loading-model") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {state.progress > 0 ? `Model ${state.progress}%` : "Loading model..."}
        </span>
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Transcribing state
  if (state.status === "transcribing") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Transcribing...</span>
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (state.status === "error") {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-destructive truncate max-w-[120px]" title={state.message}>
          {state.message}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleDismissError}
          className="text-muted-foreground hover:text-destructive"
        >
          <X className="size-3" />
        </Button>
      </div>
    )
  }

  // Idle state
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_AUDIO_TYPES.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        data-testid="audio-upload-input"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleClick}
        disabled={disabled}
        className={cn("text-muted-foreground hover:text-primary", className)}
        title={`Upload audio recording for transcription (${langLabel})`}
        data-testid="audio-upload-button"
      >
        <Upload className="size-4" />
      </Button>
    </>
  )
}
