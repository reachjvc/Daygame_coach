"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { VoiceRecorderResult, UseVoiceRecorderReturn } from "../types"

// Web Speech API types (not in standard TypeScript lib)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

const MAX_RECORDING_SECONDS = 120 // 2 minutes max

/**
 * Detect the best supported MIME type for MediaRecorder.
 * iOS Safari prefers audio/mp4, while Chrome/Firefox prefer audio/webm.
 */
function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm"

  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return "audio/webm" // fallback
}

/**
 * Check if Web Speech API is supported in the current browser.
 */
function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

/**
 * Hook for voice recording with Web Speech API transcription.
 * Uses MediaRecorder for audio capture and browser's built-in speech recognition.
 *
 * Free, no API key required. Works in browsers but not iOS installed PWA.
 */
export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [transcription, setTranscription] = useState("")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const transcriptRef = useRef<string>("")
  const fullTranscriptRef = useRef<string>("")

  const isSupported = typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError("Voice recording is not supported in this browser")
      return
    }

    try {
      setError(null)
      setTranscription("")
      transcriptRef.current = ""
      fullTranscriptRef.current = ""
      audioChunksRef.current = []

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      })
      streamRef.current = stream

      // Start MediaRecorder for audio capture
      const mimeType = getSupportedMimeType()
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(1000) // Collect data every second

      // Start Web Speech API for transcription (if available)
      // Chrome requires HTTPS (or localhost) for Web Speech API
      if (
        typeof location !== "undefined" &&
        location.protocol !== "https:" &&
        location.hostname !== "localhost" &&
        location.hostname !== "127.0.0.1"
      ) {
        console.warn("Speech recognition may not work over non-HTTPS connections")
      }

      if (isSpeechRecognitionSupported()) {
        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognitionClass) return // Type guard

        const recognition = new SpeechRecognitionClass()
        recognitionRef.current = recognition

        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US"

        recognition.onresult = (event) => {
          let finalTranscript = ""
          let interimTranscript = ""

          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              finalTranscript += result[0].transcript + " "
            } else {
              interimTranscript += result[0].transcript
            }
          }

          transcriptRef.current = finalTranscript
          fullTranscriptRef.current = finalTranscript + interimTranscript
          setTranscription(finalTranscript + interimTranscript)
        }

        recognition.onerror = (event) => {
          // Don't show error for "no-speech" - user just didn't speak
          if (event.error !== "no-speech" && event.error !== "aborted") {
            console.warn("Speech recognition error:", event.error)
            // Surface meaningful errors to the user
            if (event.error === "not-allowed") {
              setError("Speech recognition permission denied. Check browser settings.")
            } else if (event.error === "network") {
              setError("Speech recognition requires an internet connection.")
            } else {
              setError(`Transcription unavailable: ${event.error}`)
            }
          }
        }

        recognition.start()
      }

      setIsRecording(true)
      setDuration(0)

      // Duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1
          // Auto-stop at max duration
          if (newDuration >= MAX_RECORDING_SECONDS) {
            // Will be handled by stopRecording
          }
          return newDuration
        })
      }, 1000)

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }

    } catch (err) {
      console.error("Error starting recording:", err)

      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          setError("Microphone access denied. Please allow microphone access in your browser settings.")
        } else if (err.name === "NotFoundError") {
          setError("No microphone found. Please connect a microphone.")
        } else {
          setError(`Recording failed: ${err.message}`)
        }
      } else {
        setError("Failed to start recording. Please try again.")
      }
    }
  }, [isSupported])

  const stopRecording = useCallback(async (): Promise<VoiceRecorderResult | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return null
    }

    setIsTranscribing(true)

    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    // Stop media recorder and wait for final data
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!

      mediaRecorder.onstop = () => {
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }

        // Create audio blob
        const mimeType = getSupportedMimeType()
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })

        // Get final transcription (fall back to full transcript including interim
        // results, since Chrome may not have finalized them before stop fires)
        const finalTranscription = (transcriptRef.current || fullTranscriptRef.current).trim()
        setTranscription(finalTranscription)

        setIsRecording(false)
        setIsTranscribing(false)

        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50])
        }

        resolve({
          audioBlob,
          transcription: finalTranscription,
        })
      }

      mediaRecorder.stop()
    })
  }, [isRecording])

  const cancelRecording = useCallback(() => {
    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    audioChunksRef.current = []
    transcriptRef.current = ""
    fullTranscriptRef.current = ""
    setTranscription("")
    setIsRecording(false)
    setIsTranscribing(false)
    setDuration(0)
  }, [])

  return {
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
    isTranscriptionSupported: isSpeechRecognitionSupported(),
  }
}
