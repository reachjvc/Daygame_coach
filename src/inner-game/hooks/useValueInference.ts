"use client"

import { useState, useCallback } from "react"
import type { InferredValue } from "../types"

export type ValueInferenceContext = "shadow" | "hurdles" | "peak_experience"

interface UseValueInferenceOptions {
  context: ValueInferenceContext
  initialResponse?: string | null
  initialInferredValues?: InferredValue[] | null
  minResponseLength?: number
  emptyResponseError?: string
  shortResponseError?: string
}

interface UseValueInferenceReturn {
  response: string
  setResponse: (response: string) => void
  inferredValues: InferredValue[] | null
  isLoading: boolean
  error: string | null
  showResults: boolean
  setShowResults: (show: boolean) => void
  clearError: () => void
  inferValues: () => Promise<boolean>
}

export function useValueInference({
  context,
  initialResponse = null,
  initialInferredValues = null,
  minResponseLength = 20,
  emptyResponseError = "Please share your thoughts before continuing.",
  shortResponseError = "Please provide more detail.",
}: UseValueInferenceOptions): UseValueInferenceReturn {
  const [response, setResponse] = useState(initialResponse ?? "")
  const [inferredValues, setInferredValues] = useState<InferredValue[] | null>(
    initialInferredValues
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(!!initialInferredValues)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const inferValues = useCallback(async (): Promise<boolean> => {
    if (!response.trim()) {
      setError(emptyResponseError)
      return false
    }

    if (response.length < minResponseLength) {
      setError(shortResponseError)
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/inner-game/infer-values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, response }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to analyze your response")
      }

      const data = await res.json()
      setInferredValues(data.values)
      setShowResults(true)
      return true
    } catch (err) {
      console.error("Failed to infer values:", err)
      setError(err instanceof Error ? err.message : "Something went wrong")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [response, context, minResponseLength, emptyResponseError, shortResponseError])

  return {
    response,
    setResponse,
    inferredValues,
    isLoading,
    error,
    showResults,
    setShowResults,
    clearError,
    inferValues,
  }
}
