"use client"

import { Sprout, TreePine } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyTreeStateProps {
  onCreateGoal: () => void
  hasSoil: boolean
}

export function EmptyTreeState({ onCreateGoal, hasSoil }: EmptyTreeStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[500px] text-center px-6">
      {/* Seedling visual */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "radial-gradient(circle, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.03))",
          boxShadow: "0 0 40px rgba(34, 197, 94, 0.1)",
          border: "1px solid rgba(34, 197, 94, 0.2)",
        }}
      >
        <Sprout className="w-10 h-10 text-green-500/70" />
      </div>

      <h2 className="text-xl font-semibold text-foreground mb-2">
        Every great life starts with roots
      </h2>

      <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">
        {hasSoil
          ? "Your soil is rich with values. Plant your first seed and watch it grow into a branch of your life."
          : "Plant your first goal to start growing your tree. Discover your values in Inner Game to deepen your roots."}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onCreateGoal}
          className="gap-2"
          style={{
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            boxShadow: "0 0 20px rgba(34, 197, 94, 0.2)",
          }}
        >
          <TreePine className="h-4 w-4" />
          Plant your first seed
        </Button>

        {!hasSoil && (
          <Button variant="outline" className="gap-2" asChild>
            <a href="/dashboard/inner-game">
              <Sprout className="h-4 w-4" />
              Discover your soil
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
