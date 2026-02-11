"use client"

import { useState, useEffect } from "react"
import { DiagnosticSelector } from "./_components/DiagnosticSelector"
import { TurnViewer } from "./_components/TurnViewer"
import type { DiagnosticData } from "./_components/types"

export default function CalibrationPage() {
  const [diagnostics, setDiagnostics] = useState<string[]>([])
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<string | null>(null)
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load available diagnostics on mount
  useEffect(() => {
    async function loadDiagnostics() {
      try {
        const res = await fetch("/api/test/calibration/list")
        if (!res.ok) throw new Error("Failed to load diagnostics")
        const data = await res.json()
        setDiagnostics(data.files || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load")
      } finally {
        setLoading(false)
      }
    }
    loadDiagnostics()
  }, [])

  // Load selected diagnostic
  useEffect(() => {
    if (!selectedDiagnostic) {
      setDiagnosticData(null)
      return
    }

    async function loadDiagnosticData() {
      try {
        const res = await fetch(`/api/test/calibration/get?file=${encodeURIComponent(selectedDiagnostic)}`)
        if (!res.ok) throw new Error("Failed to load diagnostic")
        const data = await res.json()
        setDiagnosticData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load diagnostic")
      }
    }
    loadDiagnosticData()
  }, [selectedDiagnostic])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Calibration Viewer</h1>
        <p className="text-muted-foreground">Loading diagnostics...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Calibration Viewer</h1>
      <p className="text-muted-foreground mb-6">
        View diagnostic results to identify evaluator blind spots. Score &lt; 7 on coach lines = blind spot.
      </p>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      <DiagnosticSelector
        diagnostics={diagnostics}
        selected={selectedDiagnostic}
        onSelect={setSelectedDiagnostic}
      />

      {diagnosticData && (
        <div className="mt-6">
          <TurnViewer data={diagnosticData} />
        </div>
      )}

      {!diagnosticData && !selectedDiagnostic && diagnostics.length === 0 && (
        <div className="mt-6 p-8 border border-dashed rounded-lg text-center text-muted-foreground">
          <p className="mb-2">No diagnostics found.</p>
          <p className="text-sm">
            Ask Claude Code to run a diagnostic: &quot;Run diagnostic on VIDEO_ID with prompt_0&quot;
          </p>
        </div>
      )}
    </div>
  )
}
