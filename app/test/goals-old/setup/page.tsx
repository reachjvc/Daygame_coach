"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoalSetupWizard } from "@/src/goals/components/setup/GoalSetupWizard"

export default function GoalsOldSetupTestPage() {
  return (
    <div>
      <div className="absolute top-4 left-4 z-50">
        <Button asChild variant="ghost" size="sm">
          <Link href="/test/goals-old">
            <ArrowLeft className="size-4 mr-2" />
            Back to Goals Old
          </Link>
        </Button>
      </div>
      <GoalSetupWizard returnPath="/test/goals-old" />
    </div>
  )
}
