"use client"

import type { ReactNode } from "react"
import { PlanStoreProvider } from "@/src/goals/planStore"
import { PlanSandboxBanner } from "@/src/goals/components/PlanSandboxBanner"
import { ROUTES } from "@/src/shared/routes"
import { PlanNewProvider } from "./PlanNewContext"
import { RealStepSessionProvider } from "./RealStep"

/** The copy space banner above every page of the new version, and the store every screen reads. */
export function PlanNewShell({ sandboxId, timezone = "UTC", children }: { sandboxId: string; timezone?: string; children: ReactNode }) {
  return (
    <PlanStoreProvider account={sandboxId}>
      <PlanNewProvider account={sandboxId} timezone={timezone}>
        <RealStepSessionProvider>
          <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <div className="mx-auto w-full max-w-xl px-4 pt-3">
              <PlanSandboxBanner sandboxId={sandboxId} basePath={ROUTES.planNew} wording="new" />
            </div>
            {children}
          </div>
        </RealStepSessionProvider>
      </PlanNewProvider>
    </PlanStoreProvider>
  )
}
