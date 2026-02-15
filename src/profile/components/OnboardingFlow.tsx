"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { ChevronRight, ChevronLeft, CircleDot, Rocket, MapPin } from "lucide-react"
import { completeOnboarding } from "@/src/profile/actions"
import { getArchetypes } from "@/src/profile/data/archetypes"
import { InteractiveWorldMap } from "./InteractiveWorldMap"
import { REGIONS } from "@/src/profile/data/regions"
import { EXPERIENCE_LEVELS } from "@/src/profile/data/experience-levels"
import { PRIMARY_GOALS } from "@/src/profile/data/primary-goals"

const REGION_LABELS = Object.fromEntries(
  REGIONS.map((region) => [region.id, region.name])
) as Record<string, string>

interface OnboardingFlowProps {
  initialStep?: number;
}

const clampStep = (value: number) => Math.min(Math.max(value, 1), 5);

export function OnboardingFlow({ initialStep }: OnboardingFlowProps) {
  const [step, setStep] = useState(() =>
    clampStep(initialStep ?? 1)
  );

  useEffect(() => {
    if (initialStep === undefined) {
      return;
    }
    setStep(clampStep(initialStep));
  }, [initialStep]);

  // Step 1: Age + Foreign Status
  const [ageRange, setAgeRange] = useState([22, 25]);
  const [userIsForeign, setUserIsForeign] = useState<boolean | null>(null);
  const [datingForeigners, setDatingForeigners] = useState<boolean | null>(null);

  // Step 2: Nationality/Region
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Step 3: Archetype
  const [selectedArchetypes, setSelectedArchetypes] = useState<string[]>([]);

  // Step 4: Experience Level
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);

  // Step 5: Primary Goal
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);

  // Auto-detect timezone
  const [detectedTimezone] = useState(() =>
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  // Get archetypes based on age and region
  const archetypes = getArchetypes(ageRange, selectedRegion ?? undefined);

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return userIsForeign !== null && datingForeigners !== null;
      case 2:
        return selectedRegion !== null;
      case 3:
        return selectedArchetypes.length > 0;
      case 4:
        return experienceLevel !== null;
      case 5:
        return primaryGoal !== null;
      default:
        return false;
    }
  };

  const handleRegionSelect = (regionId: string) => {
    setSelectedRegion(regionId);
  };

  const primaryRegionLabel = selectedRegion ? (REGION_LABELS[selectedRegion] || selectedRegion) : null;

  const handleArchetypeToggle = (archetypeName: string) => {
    setSelectedArchetypes((prev) => {
      if (prev.includes(archetypeName)) {
        return prev.filter((name) => name !== archetypeName);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, archetypeName];
    });
  };

  const getArchetypePriorityLabel = (index: number) => {
    switch (index) {
      case 0:
        return "Primary";
      case 1:
        return "Secondary";
      default:
        return "Tertiary";
    }
  };

  const getArchetypeBadgeClasses = (index: number) => {
    if (index === 0) {
      return "bg-gradient-to-r from-primary to-orange-400 text-primary-foreground shadow-sm ring-1 ring-primary/40";
    }
    if (index === 1) {
      return "bg-primary/15 text-primary ring-1 ring-primary/30";
    }
    return "bg-primary/10 text-primary/70 ring-1 ring-primary/20";
  };

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Progress Indicator */}
        <div className="mb-8" data-testid="onboarding-progress">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground" data-testid="onboarding-step-indicator">Step {step} of 5</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(((step - 1) / 5) * 100)}% Complete
            </span>
          </div>
          <div className="h-2 bg-card rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((step - 1) / 5) * 100}%` }}
            />
          </div>
        </div>

        <form action={completeOnboarding}>
          {/* Hidden fields for form submission */}
          <input type="hidden" name="ageRangeStart" value={ageRange[0]} />
          <input type="hidden" name="ageRangeEnd" value={ageRange[1]} />
          <input type="hidden" name="userIsForeign" value={String(userIsForeign)} />
          <input type="hidden" name="datingForeigners" value={String(datingForeigners)} />
          <input type="hidden" name="region" value={selectedRegion || ""} />
          <input type="hidden" name="archetype" value={selectedArchetypes[0] || ""} />
          <input type="hidden" name="secondaryArchetype" value={selectedArchetypes[1] || ""} />
          <input type="hidden" name="tertiaryArchetype" value={selectedArchetypes[2] || ""} />
          <input type="hidden" name="experienceLevel" value={experienceLevel || ""} />
          <input type="hidden" name="primaryGoal" value={primaryGoal || ""} />
          <input type="hidden" name="timezone" value={detectedTimezone} />

          {/* Step Content Container */}
          <div className="min-h-[500px]">
          {/* STEP 1: Age + Foreign Status */}
          {step === 1 && (
            <Card className="p-8 bg-card border-border">
              <h2 className="text-3xl font-bold mb-4 text-foreground">
                Tell us about yourself
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Help us personalize your training experience
              </p>

              <div className="space-y-8">
                {/* Age Range */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-foreground">
                    Preferred age range
                  </h3>
                  <div className="flex justify-between mb-4">
                    <span className="text-lg font-semibold text-foreground">{ageRange[0]} years</span>
                    <span className="text-lg font-semibold text-foreground">{ageRange[1]} years</span>
                  </div>
                  <Slider
                    min={18}
                    max={45}
                    step={1}
                    value={ageRange}
                    onValueChange={setAgeRange}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <span>18</span>
                    <span>45</span>
                  </div>
                </div>

                {/* User Foreign Status */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-foreground">
                    Are you a foreigner in your current location?
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card
                      className={`p-6 cursor-pointer text-center transition-all hover:border-primary ${
                        userIsForeign === true ? "border-primary bg-primary/5" : "border-border"
                      }`}
                      onClick={() => setUserIsForeign(true)}
                    >
                      <h4 className="text-lg font-bold text-foreground">Yes, I'm a foreigner</h4>
                      <p className="text-sm text-muted-foreground mt-2">Living/traveling abroad</p>
                    </Card>
                    <Card
                      className={`p-6 cursor-pointer text-center transition-all hover:border-primary ${
                        userIsForeign === false ? "border-primary bg-primary/5" : "border-border"
                      }`}
                      onClick={() => setUserIsForeign(false)}
                    >
                      <h4 className="text-lg font-bold text-foreground">No, I'm local</h4>
                      <p className="text-sm text-muted-foreground mt-2">In my home country</p>
                    </Card>
                  </div>
                </div>

                {/* Dating Foreigners */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-foreground">
                    Are you primarily dating foreigners?
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card
                      className={`p-6 cursor-pointer text-center transition-all hover:border-primary ${
                        datingForeigners === true ? "border-primary bg-primary/5" : "border-border"
                      }`}
                      onClick={() => setDatingForeigners(true)}
                    >
                      <h4 className="text-lg font-bold text-foreground">Yes</h4>
                      <p className="text-sm text-muted-foreground mt-2">Mostly dating foreigners or tourists</p>
                    </Card>
                    <Card
                      className={`p-6 cursor-pointer text-center transition-all hover:border-primary ${
                        datingForeigners === false ? "border-primary bg-primary/5" : "border-border"
                      }`}
                      onClick={() => setDatingForeigners(false)}
                    >
                      <h4 className="text-lg font-bold text-foreground">No</h4>
                      <p className="text-sm text-muted-foreground mt-2">Mostly dating locals</p>
                    </Card>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* STEP 2: Nationality/Region */}
          {step === 2 && (
            <Card className="p-8 bg-card border-border">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="size-8 text-primary" />
                <h2 className="text-3xl font-bold text-foreground">
                  Preferred nationality/region
                </h2>
              </div>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Select the region where the women you're interested in are from. This helps us tailor scenarios and cultural contexts.
              </p>

              <InteractiveWorldMap
                selectedRegion={selectedRegion}
                onRegionSelect={handleRegionSelect}
              />

              {selectedRegion && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
                    <Badge className="bg-primary/80 text-primary-foreground uppercase tracking-wide">Primary</Badge>
                    <span className="font-semibold text-foreground">{primaryRegionLabel}</span>
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-lg border border-border/60 bg-muted/40 p-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Tip:</strong> Click a region on the map above. You can add a secondary region later from your dashboard.
                </p>
              </div>
            </Card>
          )}

          {/* STEP 3: Archetype */}
          {step === 3 && (
            <Card className="p-8 bg-card border-border">
              <h2 className="text-3xl font-bold mb-4 text-foreground">Choose your preferred archetype</h2>
              <p className="text-muted-foreground leading-relaxed">
                Choose at least one and up to three archetypes. The order you pick sets your priority.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{selectedArchetypes.length}/3 selected</span>
                <span>Click again to remove an archetype.</span>
                {selectedArchetypes.length === 3 && (
                  <span className="text-primary">Max 3 selected.</span>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-8 max-h-[700px] overflow-y-auto pr-2">
                {archetypes.map((archetype) => {
                  const priorityIndex = selectedArchetypes.indexOf(archetype.name);
                  const isSelected = priorityIndex !== -1;
                  const badgeLabel = isSelected ? getArchetypePriorityLabel(priorityIndex) : null;
                  return (
                    <Card
                      key={archetype.name}
                      className={`relative p-6 cursor-pointer transition-all hover:border-primary hover:shadow-lg ${
                        isSelected ? "border-primary bg-primary/5" : "border-border"
                      }`}
                      onClick={() => handleArchetypeToggle(archetype.name)}
                    >
                      {badgeLabel && (
                        <div className="absolute right-4 top-4">
                          <Badge className={getArchetypeBadgeClasses(priorityIndex)}>
                            {badgeLabel}
                          </Badge>
                        </div>
                      )}
                      {archetype.image && (
                        <img
                          src={archetype.image}
                          alt={archetype.name}
                          className="w-full h-80 object-cover object-top rounded-lg mb-5"
                        />
                      )}
                      <h3 className="font-bold text-xl mb-3 text-foreground">{archetype.name}</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-primary mb-1">CORE VIBE</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{archetype.vibe}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-primary mb-1">CONVERSATIONAL BARRIER</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{archetype.barrier}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          )}

          {/* STEP 4: Experience Level */}
          {step === 4 && (
            <Card className="p-8 bg-card border-border">
              <div className="flex items-center gap-3 mb-4">
                <Rocket className="size-8 text-primary" />
                <h2 className="text-3xl font-bold text-foreground">
                  What's your experience level?
                </h2>
              </div>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Be honest! This helps us calibrate the difficulty and type of feedback you'll receive.
              </p>

              <div className="space-y-4">
                {EXPERIENCE_LEVELS.map((level) => (
                  <Card
                    key={level.id}
                    className={`p-6 cursor-pointer transition-all hover:border-primary hover:shadow-lg ${
                      experienceLevel === level.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    onClick={() => setExperienceLevel(level.id)}
                  >
                    <h3 className="font-bold text-lg mb-2 text-foreground">{level.name}</h3>
                    <p className="text-sm text-muted-foreground">{level.description}</p>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* STEP 5: Primary Goal */}
          {step === 5 && (
            <Card className="p-8 bg-card border-border">
              <div className="flex items-center gap-3 mb-4">
                <CircleDot className="size-8 text-primary" />
                <h2 className="text-3xl font-bold text-foreground">
                  What's your primary goal?
                </h2>
              </div>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Choose what you want to focus on right now. You can always change this later.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {PRIMARY_GOALS.map((goal) => {
                  const Icon = goal.icon;
                  return (
                    <Card
                      key={goal.id}
                      className={`p-8 cursor-pointer transition-all hover:border-primary hover:shadow-lg ${
                        primaryGoal === goal.id ? "border-primary bg-primary/5" : "border-border"
                      }`}
                      onClick={() => setPrimaryGoal(goal.id)}
                    >
                      <Icon className="size-12 text-primary mb-4" />
                      <h3 className="font-bold text-xl mb-3 text-foreground">{goal.name}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{goal.description}</p>
                    </Card>
                  );
                })}
              </div>
            </Card>
          )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              className="h-auto px-6 py-2 border-border bg-transparent"
              data-testid="onboarding-back-button"
            >
              <ChevronLeft className="size-4 mr-2" />
              Back
            </Button>

            {step < 5 ? (
              <Button
                type="button"
                variant="default"
                onClick={handleNext}
                disabled={!canProceed()}
                className="h-auto px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="onboarding-next-button"
              >
                Next
                <ChevronRight className="size-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="default"
                disabled={!canProceed()}
                className="h-auto px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="onboarding-complete-button"
              >
                Complete Setup
                <ChevronRight className="size-4 ml-2" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
