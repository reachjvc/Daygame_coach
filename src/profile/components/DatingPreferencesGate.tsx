"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MapPin } from "lucide-react"
import { saveDatingPreferences } from "@/src/profile/actions"
import { getArchetypes } from "@/src/profile/data/archetypes"
import { InteractiveWorldMap } from "./InteractiveWorldMap"
import { REGIONS } from "@/src/profile/data/regions"
import { Slider } from "@/components/ui/slider"
import { AGE_RANGE } from "@/src/profile/config"
import { EMPTY_ONBOARDING_VALUES } from "@/src/profile/config"
import type { OnboardingInitialValues } from "@/src/profile/types"

const REGION_LABELS = Object.fromEntries(
  REGIONS.map((region) => [region.id, region.name])
) as Record<string, string>

/** Only decides which photos the archetype cards show. Never saved from here. */
const PHOTO_AGE_RANGE: [number, number] = [22, 25]

const MAX_ARCHETYPES = 3

interface DatingPreferencesGateProps {
  /** Answers already saved, so changing one does not blank the others. */
  initialValues?: OnboardingInitialValues
  /** Where to go once saved. Validated server-side before the redirect. */
  next?: string
  /** Shown above the questions. The scenario door and /preferences differ here. */
  heading: string
  intro: string
  submitLabel: string
}

/**
 * THE ONE PLACE THE DATING QUESTIONS ARE ASKED.
 *
 * It replaces a five-step signup wizard that every user met before reaching
 * anything. Measured 2026-09-08, only `scenariosService` reads these answers,
 * yet `onboarding_completed` gated the dashboard, the Lair, Inner Game and the
 * post-login redirect as well -- so a dating questionnaire blocked three
 * features that never read a word of it. Two of the five steps collected
 * nothing usable at all: step 4 was a "Coming soon" placeholder and the primary
 * goal it asked for on step 5 is read by no feature in the codebase.
 *
 * So: signup asks nothing, and this stands at the scenario door instead.
 * `/preferences` renders the same component, which is what keeps there from
 * being a second, drifting copy of these questions.
 *
 * The age range is NOT asked. It only ever chose which photo folder the
 * archetype cards use, and it is still editable on the dashboard card.
 */
export function DatingPreferencesGate({
  initialValues,
  next,
  heading,
  intro,
  submitLabel,
}: DatingPreferencesGateProps) {
  const saved = initialValues ?? EMPTY_ONBOARDING_VALUES

  const [selectedRegion, setSelectedRegion] = useState<string | null>(saved.region)
  const [selectedArchetypes, setSelectedArchetypes] = useState<string[]>(saved.archetypes)
  const [userIsForeign, setUserIsForeign] = useState<boolean | null>(saved.userIsForeign)
  const [datingForeigners, setDatingForeigners] = useState<boolean | null>(saved.datingForeigners)
  const [secondaryRegion, setSecondaryRegion] = useState<string | null>(saved.secondaryRegion)
  /* Defaulted rather than left blank. This one is never a blocker -- it only
     chooses which photographs the archetype cards show -- and an unanswered
     slider that stops you continuing would be a worse trade than a sensible
     starting point you can move. */
  const [ageRange, setAgeRange] = useState<number[]>([
    saved.ageRangeStart ?? PHOTO_AGE_RANGE[0],
    saved.ageRangeEnd ?? PHOTO_AGE_RANGE[1],
  ])

  /* Follows the slider and the region as you move them. It used to read a saved
     age range that this screen never asked for, so a new account was always
     shown the default photographs no matter what it chose. */
  const archetypes = getArchetypes(ageRange, selectedRegion ?? undefined)

  const toggleArchetype = (name: string) => {
    setSelectedArchetypes((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name)
      if (prev.length >= MAX_ARCHETYPES) return prev
      return [...prev, name]
    })
  }

  const priorityLabel = (index: number) =>
    index === 0 ? "Primary" : index === 1 ? "Secondary" : "Tertiary"

  const priorityClasses = (index: number) => {
    if (index === 0) {
      return "bg-gradient-to-r from-primary to-orange-400 text-primary-foreground shadow-sm ring-1 ring-primary/40"
    }
    if (index === 1) return "bg-primary/15 text-primary ring-1 ring-primary/30"
    return "bg-primary/10 text-primary/70 ring-1 ring-primary/20"
  }

  /* Every answer is checked before the button goes live, so the server action
     can never be handed a half-filled form. The wizard this replaces checked
     only the step on screen, so deep-linking to its last step offered a live
     submit button that threw a blank error page. */
  const missing: string[] = []
  if (selectedRegion === null) missing.push("a region")
  if (selectedArchetypes.length === 0) missing.push("at least one archetype")
  if (userIsForeign === null || datingForeigners === null) missing.push("the two questions below")

  const YesNo = ({
    value,
    onChange,
    testId,
  }: {
    value: boolean | null
    onChange: (next: boolean) => void
    testId: string
  }) => (
    <div className="flex items-center gap-2" data-testid={testId}>
      {/* min-h/min-w 44px: `size="sm"` renders 40px tall, which is under the
          minimum touch target and was caught on an iPhone viewport by
          tests/e2e/sweep/route-sweep.spec.ts. These are the only two things on
          this screen a thumb has to hit precisely. */}
      <Button
        type="button"
        size="sm"
        className="min-h-11 min-w-11"
        variant={value === true ? "default" : "outline"}
        onClick={() => onChange(true)}
      >
        Yes
      </Button>
      <Button
        type="button"
        size="sm"
        className="min-h-11 min-w-11"
        variant={value === false ? "default" : "outline"}
        onClick={() => onChange(false)}
      >
        No
      </Button>
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <form action={saveDatingPreferences} data-testid="dating-preferences-gate">
        <input type="hidden" name="region" value={selectedRegion || ""} />
        {/* One field per archetype, in priority order -- the action reads them
            with getAll, so the order the user clicked is the order saved. */}
        {selectedArchetypes.map((name) => (
          <input key={name} type="hidden" name="archetype" value={name} />
        ))}
        <input type="hidden" name="userIsForeign" value={String(userIsForeign)} />
        <input type="hidden" name="datingForeigners" value={String(datingForeigners)} />
        <input type="hidden" name="ageRangeStart" value={ageRange[0]} />
        <input type="hidden" name="ageRangeEnd" value={ageRange[1]} />
        <input type="hidden" name="secondaryRegion" value={secondaryRegion || ""} />
        {next && <input type="hidden" name="next" value={next} />}

        <h1 className="text-3xl font-bold text-foreground">{heading}</h1>
        <p className="mt-2 mb-8 leading-relaxed text-muted-foreground">{intro}</p>

        <Card className="mb-6 border-border bg-card p-5 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <MapPin className="size-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Which region are they from?</h2>
          </div>
          <InteractiveWorldMap
            selectedRegion={selectedRegion}
            onRegionSelect={setSelectedRegion}
            regionList="list"
          />
          {selectedRegion && (
            <p className="mt-4 text-sm">
              <span className="font-semibold text-foreground">
                {REGION_LABELS[selectedRegion] || selectedRegion}
              </span>
            </p>
          )}

          {/* Optional, and it does something: `scenariosService` reads
              secondary_region when it builds a scenario. Nothing in the app had
              ever asked for it. */}
          {selectedRegion && (
            <div className="mt-6 border-t border-border/60 pt-5">
              <p className="text-sm font-medium text-foreground">
                Anywhere else? <span className="text-muted-foreground">(optional)</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2" data-testid="secondary-region-list">
                {REGIONS.filter((r) => r.id !== selectedRegion).map((region) => {
                  const chosen = secondaryRegion === region.id
                  return (
                    <button
                      key={region.id}
                      type="button"
                      aria-pressed={chosen}
                      data-testid={`secondary-region-${region.id}`}
                      onClick={() => setSecondaryRegion(chosen ? null : region.id)}
                      className={`min-h-11 rounded-full border px-4 text-sm transition-colors ${
                        chosen
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/60"
                      }`}
                    >
                      {region.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Placed before the archetypes on purpose: it changes the photographs
            on those cards, so you want to have set it before you look at them. */}
        <Card className="mb-6 border-border bg-card p-5 sm:p-8">
          <h2 className="text-xl font-bold text-foreground">Roughly what age?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This chooses the photographs below. You can move it any time.
          </p>
          <div className="mt-6 flex justify-between text-lg font-semibold text-foreground">
            <span data-testid="age-from">{ageRange[0]} years</span>
            <span data-testid="age-to">{ageRange[1]} years</span>
          </div>
          <Slider
            min={AGE_RANGE.MIN}
            max={AGE_RANGE.MAX}
            step={1}
            value={ageRange}
            onValueChange={setAgeRange}
            className="mt-4 w-full"
          />
          <div className="mt-2 flex justify-between text-sm text-muted-foreground">
            <span>{AGE_RANGE.MIN}</span>
            <span>{AGE_RANGE.MAX}</span>
          </div>
        </Card>

        <Card className="mb-6 border-border bg-card p-5 sm:p-8">
          <h2 className="text-xl font-bold text-foreground">Pick up to three archetypes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The order you pick sets the priority. Click one again to remove it.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {selectedArchetypes.length}/{MAX_ARCHETYPES} selected
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {archetypes.map((archetype) => {
              const index = selectedArchetypes.indexOf(archetype.name)
              const isSelected = index !== -1
              return (
                <Card
                  key={archetype.name}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  data-testid={`gate-archetype-${archetype.name}`}
                  className={`relative cursor-pointer p-4 transition-all hover:border-primary ${
                    isSelected ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => toggleArchetype(archetype.name)}
                  onKeyDown={(e) => {
                    // Space as well as Enter: a role="button" is expected to
                    // answer both, and the old cards answered only Enter.
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      toggleArchetype(archetype.name)
                    }
                  }}
                >
                  {isSelected && (
                    <div className="absolute right-3 top-3">
                      <Badge className={priorityClasses(index)}>{priorityLabel(index)}</Badge>
                    </div>
                  )}
                  {archetype.image && (
                    <img
                      src={archetype.image}
                      alt=""
                      loading="lazy"
                      className="mb-3 h-48 w-full rounded-lg object-cover object-top"
                    />
                  )}
                  <h3 className="font-bold text-foreground">{archetype.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {archetype.vibe}
                  </p>
                </Card>
              )
            })}
          </div>
        </Card>

        <Card className="mb-6 space-y-4 border-border bg-card p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">
                Are you a foreigner where you live?
              </p>
              <p className="text-sm text-muted-foreground">Living or travelling abroad.</p>
            </div>
            <YesNo value={userIsForeign} onChange={setUserIsForeign} testId="gate-user-is-foreign" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">
                Are you mostly meeting foreigners or tourists?
              </p>
              <p className="text-sm text-muted-foreground">Rather than locals.</p>
            </div>
            <YesNo
              value={datingForeigners}
              onChange={setDatingForeigners}
              testId="gate-dating-foreigners"
            />
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {missing.length > 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="gate-missing">
              Still need {missing.join(", ")}.
            </p>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            disabled={missing.length > 0}
            data-testid="gate-submit"
            className="px-6"
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  )
}
