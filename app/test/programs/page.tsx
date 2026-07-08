"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProgramsApp } from "@/src/programs/components/ProgramsApp"

export default function ProgramsTestPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/test">
            <ArrowLeft className="size-4 mr-2" />
            Back to Test Pages
          </Link>
        </Button>

        <h1 className="text-2xl font-bold mb-1">Workout Programs</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Browse 13 programs across 7 disciplines, enroll, log today&apos;s session, and watch the engine
          progress you — strength, bodybuilding, cardio, calisthenics, flexibility, plus periodized
          triathlon &amp; Ironman plans.
        </p>

        <ProgramsApp />
      </div>
    </div>
  )
}
