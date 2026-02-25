"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Orbit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import type { MilestoneLadderConfig } from "@/src/goals/types"

const DEFAULT_CONFIG: MilestoneLadderConfig = {
  start: 0,
  target: 50,
  steps: 5,
  curveTension: 0,
  controlPoints: [],
}

export default function CurveEditorTestPage() {
  const [config, setConfig] = useState<MilestoneLadderConfig>(DEFAULT_CONFIG)

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(180deg, #050810 0%, #0a0e1c 50%, #050810 100%)" }}
    >
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="mb-4 text-white/50 hover:text-white/80">
            <Link href="/test">
              <ArrowLeft className="size-4 mr-2" />
              Back to Tests
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="rounded-lg p-2"
              style={{
                background: "rgba(0, 230, 118, 0.1)",
                boxShadow: "0 0 20px rgba(0, 230, 118, 0.15)",
              }}
            >
              <Orbit className="size-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                Curve Editor — Zen Theme
              </h1>
              <p className="text-white/40 text-sm mt-0.5">
                Original zen theme preserved for reference
              </p>
            </div>
          </div>
        </div>

        {/* Curve Editor */}
        <MilestoneCurveEditor
          config={config}
          onChange={setConfig}
          allowDirectEdit
          themeId="zen"
        />
      </div>
    </div>
  )
}
