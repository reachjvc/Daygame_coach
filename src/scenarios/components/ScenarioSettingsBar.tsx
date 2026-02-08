"use client"

import { useState, useTransition } from "react"
import { Globe, MapPin, Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { SITUATIONS } from "@/src/scenarios/keepitgoing/data/situations"

const SCENARIO_LANGUAGES = [
  { code: "da", label: "Dansk" },
  { code: "en", label: "English" },
] as const

type ScenarioLanguage = (typeof SCENARIO_LANGUAGES)[number]["code"]

interface ScenarioSettingsBarProps {
  initialLanguage: ScenarioLanguage
  onLanguageChange: (language: string) => Promise<void>
  selectedEncounter: string | null
  onEncounterChange: (encounterId: string | null) => void
}

export function ScenarioSettingsBar({
  initialLanguage,
  onLanguageChange,
  selectedEncounter,
  onEncounterChange,
}: ScenarioSettingsBarProps) {
  const [isPending, startTransition] = useTransition()
  const [currentLanguage, setCurrentLanguage] =
    useState<ScenarioLanguage>(initialLanguage)
  const [encounterOpen, setEncounterOpen] = useState(false)

  const handleLanguageToggle = (lang: ScenarioLanguage) => {
    setCurrentLanguage(lang)
    startTransition(async () => {
      await onLanguageChange(lang)
    })
  }

  const selectedSituation = selectedEncounter
    ? SITUATIONS.find((s) => s.id === selectedEncounter)
    : null

  return (
    <div className="flex items-center gap-3 flex-wrap py-3 px-4 bg-card/50 border border-border rounded-lg">
      {/* Language Toggle */}
      <div className="flex items-center gap-2">
        <Globe className="size-4 text-muted-foreground" />
        <div className="flex rounded-md border border-border overflow-hidden">
          {SCENARIO_LANGUAGES.map((lang) => (
            <Button
              key={lang.code}
              variant={currentLanguage === lang.code ? "default" : "ghost"}
              size="sm"
              onClick={() => handleLanguageToggle(lang.code)}
              disabled={isPending}
              className={cn(
                "rounded-none",
                currentLanguage !== lang.code && "text-muted-foreground"
              )}
            >
              {lang.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border" />

      {/* Encounter Selector */}
      <div className="flex items-center gap-2">
        <MapPin className="size-4 text-muted-foreground" />
        <Popover open={encounterOpen} onOpenChange={setEncounterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {selectedSituation ? (
                <span>{selectedSituation.location[currentLanguage]}</span>
              ) : (
                <>
                  <Shuffle className="size-3" />
                  <span>Random</span>
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="grid gap-1">
              <Button
                variant={!selectedEncounter ? "secondary" : "ghost"}
                size="sm"
                className="justify-start gap-2"
                onClick={() => {
                  onEncounterChange(null)
                  setEncounterOpen(false)
                }}
              >
                <Shuffle className="size-3" />
                {currentLanguage === "da" ? "Tilfældig" : "Random Encounter"}
              </Button>
              <div className="my-1 h-px bg-border" />
              {SITUATIONS.map((situation) => (
                <Button
                  key={situation.id}
                  variant={selectedEncounter === situation.id ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    onEncounterChange(situation.id)
                    setEncounterOpen(false)
                  }}
                >
                  {situation.location[currentLanguage]}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
