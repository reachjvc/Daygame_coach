"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoalsHubContent } from "@/src/goals/components/GoalsHubContent"

export default function GoalsOldTestPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/test">
            <ArrowLeft className="size-4 mr-2" />
            Back to Test Pages
          </Link>
        </Button>
        <GoalsHubContent setupPath="/test/goals-old/setup" />
      </div>
    </div>
  )
}
