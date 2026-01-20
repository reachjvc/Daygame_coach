"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { InteractiveWorldMap } from "./InteractiveWorldMap"
import { REGIONS } from "@/src/profile/data/regions"
import { updateSecondaryRegion } from "@/src/profile/actions"

const REGION_LABELS = Object.fromEntries(
  REGIONS.map((region) => [region.id, region.name])
) as Record<string, string>

interface SecondaryRegionSelectorProps {
  primaryRegion: string
  initialSecondaryRegion?: string | null
}

export function SecondaryRegionSelector({
  primaryRegion,
  initialSecondaryRegion,
}: SecondaryRegionSelectorProps) {
  const [secondaryRegion, setSecondaryRegion] = useState<string | null>(
    initialSecondaryRegion ?? null
  )

  const primaryLabel = useMemo(
    () => REGION_LABELS[primaryRegion] || primaryRegion,
    [primaryRegion]
  )
  const secondaryLabel = secondaryRegion
    ? REGION_LABELS[secondaryRegion] || secondaryRegion
    : null
  const isDirty = secondaryRegion !== (initialSecondaryRegion ?? null)

  const handleRegionSelect = (regionId: string) => {
    if (regionId === primaryRegion) {
      return
    }
    setSecondaryRegion((prev) => (prev === regionId ? null : regionId))
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <Card className="p-8 bg-card border-border">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="size-8 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">
              Choose a second region
            </h2>
          </div>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Your primary region stays locked. Click another region to add a secondary preference.
          </p>

          <InteractiveWorldMap
            selectedRegion={primaryRegion}
            secondaryRegion={secondaryRegion}
            selectionMode="secondary"
            onRegionSelect={handleRegionSelect}
          />

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
              <Badge className="bg-primary/80 text-primary-foreground uppercase tracking-wide">
                Primary
              </Badge>
              <span className="font-semibold text-foreground">{primaryLabel}</span>
            </div>
            {secondaryLabel && (
              <div className="flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-primary/70">
                <Badge className="bg-primary/40 text-primary-foreground uppercase tracking-wide">
                  Secondary
                </Badge>
                <span className="font-semibold text-foreground">{secondaryLabel}</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="outline" size="sm" className="border-border bg-transparent">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
            <div className="flex flex-wrap gap-2">
              {secondaryRegion && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-border bg-transparent"
                  onClick={() => setSecondaryRegion(null)}
                >
                  Clear secondary
                </Button>
              )}
              <form action={updateSecondaryRegion}>
                <input type="hidden" name="secondaryRegion" value={secondaryRegion || ""} />
                <Button type="submit" size="sm" disabled={!isDirty}>
                  Save secondary region
                </Button>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
