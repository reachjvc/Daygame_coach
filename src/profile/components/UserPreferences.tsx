"use client"

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { InteractiveWorldMap } from "./InteractiveWorldMap";
import {
  updateAgeRange,
  updatePreferredRegion,
  updateProfilePreference,
  updateSecondaryRegionDirect,
} from "@/src/profile/actions";
import { getArchetypes } from "@/src/profile/data/archetypes";

interface UserPreferencesProps {
  age_range_start: number;
  age_range_end: number;
  archetype: string;
  secondary_archetype?: string;
  tertiary_archetype?: string;
  dating_foreigners: boolean;
  user_is_foreign?: boolean;
  preferred_region?: string;
  secondary_region?: string;
  experience_level?: string;
  primary_goal?: string;
  onExperienceLevelChange?: (nextLevel: string) => void;
  onPrimaryGoalChange?: (nextGoal: string) => void;
}

const REGION_NAMES: Record<string, string> = {
  "western-europe": "Western Europe",
  "eastern-europe": "Eastern Europe",
  "scandinavia": "Scandinavia",
  "southern-europe": "Southern Europe",
  "latin-america": "Latin America",
  "east-asia": "East Asia",
  "southeast-asia": "Southeast Asia",
  "south-asia": "South Asia",
  "middle-east": "Middle East",
  "north-america": "North America",
  "africa": "Africa",
  "australia": "Australia / Oceania",
};

const EXPERIENCE_OPTIONS = [
  { id: "complete-beginner", label: "Complete Beginner" },
  { id: "newbie", label: "Newbie" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "expert", label: "Expert" },
];

const PRIMARY_GOAL_OPTIONS = [
  { id: "get-numbers", label: "Get Numbers" },
  { id: "have-conversations", label: "Have Conversations" },
  { id: "build-confidence", label: "Build Confidence" },
  { id: "find-dates", label: "Find Dates" },
];

export function UserPreferences({
  age_range_start,
  age_range_end,
  archetype,
  secondary_archetype,
  tertiary_archetype,
  dating_foreigners,
  user_is_foreign,
  preferred_region,
  secondary_region,
  experience_level,
  primary_goal,
  onExperienceLevelChange,
  onPrimaryGoalChange,
}: UserPreferencesProps) {
  const ageRange = [age_range_start, age_range_end];
  const archetypeMap = new Map(
    getArchetypes(ageRange).map((arch) => [arch.name, arch])
  );
  const primaryArchetypeData = archetypeMap.get(archetype);
  const secondaryArchetypeData = secondary_archetype
    ? archetypeMap.get(secondary_archetype)
    : undefined;
  const tertiaryArchetypeData = tertiary_archetype
    ? archetypeMap.get(tertiary_archetype)
    : undefined;

  const [ageRangeState, setAgeRangeState] = useState<[number, number]>([
    age_range_start,
    age_range_end,
  ]);
  const [isAgePending, startAgeTransition] = useTransition();

  const [preferredRegionState, setPreferredRegionState] = useState<string | null>(
    preferred_region ?? null
  );
  const [secondaryRegionState, setSecondaryRegionState] = useState<string | null>(
    secondary_region ?? null
  );
  const [mapMode, setMapMode] = useState<"primary" | "secondary" | null>(null);
  const [isPrimaryPending, startPrimaryTransition] = useTransition();
  const [isSecondaryPending, startSecondaryTransition] = useTransition();

  const [showExperienceDialog, setShowExperienceDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [experienceLevelState, setExperienceLevelState] = useState<string | null>(
    experience_level ?? null
  );
  const [primaryGoalState, setPrimaryGoalState] = useState<string | null>(
    primary_goal ?? null
  );
  const [isExperiencePending, startExperienceTransition] = useTransition();
  const [isGoalPending, startGoalTransition] = useTransition();

  useEffect(() => {
    setExperienceLevelState(experience_level ?? null);
  }, [experience_level]);

  useEffect(() => {
    setPrimaryGoalState(primary_goal ?? null);
  }, [primary_goal]);

  const preferredRegionLabel = preferredRegionState
    ? REGION_NAMES[preferredRegionState] || preferredRegionState
    : null;
  const secondaryRegionLabel = secondaryRegionState
    ? REGION_NAMES[secondaryRegionState] || secondaryRegionState
    : null;
  const experienceLabel = experienceLevelState
    ? EXPERIENCE_OPTIONS.find((option) => option.id === experienceLevelState)?.label ||
      experienceLevelState
    : "Not set";
  const primaryGoalLabel = primaryGoalState
    ? PRIMARY_GOAL_OPTIONS.find((option) => option.id === primaryGoalState)?.label ||
      primaryGoalState
    : "Not set";
  const chosenArchetypes = [
    primaryArchetypeData?.name || archetype,
    secondaryArchetypeData?.name || secondary_archetype,
    tertiaryArchetypeData?.name || tertiary_archetype,
  ].filter((name): name is string => Boolean(name));
  const uniqueArchetypes = Array.from(new Set(chosenArchetypes));
  const archetypeSummary = uniqueArchetypes.length ? uniqueArchetypes.join(", ") : "Not set";

  const handleMapSelect = (regionId: string) => {
    if (!mapMode) {
      return;
    }

    if (mapMode === "primary") {
      if (regionId === preferredRegionState) {
        setMapMode(null);
        return;
      }
      setPreferredRegionState(regionId);
      if (secondaryRegionState === regionId) {
        setSecondaryRegionState(null);
      }
      startPrimaryTransition(() => updatePreferredRegion(regionId));
      setMapMode(null);
      return;
    }

    if (regionId === preferredRegionState) {
      return;
    }

    const nextSecondary = regionId === secondaryRegionState ? null : regionId;
    setSecondaryRegionState(nextSecondary);
    startSecondaryTransition(() => updateSecondaryRegionDirect(nextSecondary));
    setMapMode(null);
  };

  const handleAgeCommit = (nextRange: number[]) => {
    const [start, end] = nextRange;
    setAgeRangeState([start, end]);
    startAgeTransition(() => updateAgeRange(start, end));
  };

  const handleExperienceSelect = (levelId: string) => {
    setExperienceLevelState(levelId);
    setShowExperienceDialog(false);
    onExperienceLevelChange?.(levelId);
    startExperienceTransition(async () => {
      const formData = new FormData();
      formData.append("preferenceKey", "experience_level");
      formData.append("preferenceValue", levelId);
      await updateProfilePreference(formData);
    });
  };

  const handleGoalSelect = (goalId: string) => {
    setPrimaryGoalState(goalId);
    setShowGoalDialog(false);
    onPrimaryGoalChange?.(goalId);
    startGoalTransition(async () => {
      const formData = new FormData();
      formData.append("preferenceKey", "primary_goal");
      formData.append("preferenceValue", goalId);
      await updateProfilePreference(formData);
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Your Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:grid-rows-[auto_auto]">
          <div className="flex h-full flex-col lg:col-start-1 lg:row-start-1">
            {primaryArchetypeData?.image && (
              <div className="flex h-full flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
                <div className="relative">
                  <img
                    src={primaryArchetypeData.image}
                    alt={archetype}
                    className="size-40 object-cover object-top rounded-full ring-2 ring-primary/40 shadow-lg sm:size-48 lg:size-52"
                  />
                  <Badge className="absolute right-2 top-2 bg-gradient-to-r from-primary to-orange-400 text-primary-foreground shadow-sm ring-1 ring-primary/40">
                    Primary
                  </Badge>
                </div>

                {(secondaryArchetypeData?.image || tertiaryArchetypeData?.image) && (
                  <div className="flex flex-wrap justify-center gap-3">
                    {secondaryArchetypeData?.image && secondary_archetype !== archetype && (
                      <div className="flex flex-col items-center gap-1">
                        <div className="relative">
                          <img
                            src={secondaryArchetypeData.image}
                            alt={secondary_archetype || "Secondary archetype"}
                            className="size-20 object-cover object-top rounded-full opacity-80 saturate-75 ring-1 ring-primary/20 sm:size-24 lg:size-28"
                          />
                          <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary/15 text-primary text-[10px] uppercase tracking-wide ring-1 ring-primary/30">
                            Secondary
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground sm:hidden">Less likely</span>
                      </div>
                    )}
                    {tertiaryArchetypeData?.image && tertiary_archetype !== archetype && (
                      <div className="flex flex-col items-center gap-1">
                        <div className="relative">
                          <img
                            src={tertiaryArchetypeData.image}
                            alt={tertiary_archetype || "Tertiary archetype"}
                            className="size-20 object-cover object-top rounded-full opacity-70 saturate-60 ring-1 ring-primary/15 sm:size-24 lg:size-28"
                          />
                          <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary/10 text-primary/80 text-[10px] uppercase tracking-wide ring-1 ring-primary/20">
                            Tertiary
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground sm:hidden">Occasional</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-center lg:col-start-1 lg:row-start-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Chosen archetypes</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{archetypeSummary}</p>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link href="/preferences/archetypes">Choose new archetypes</Link>
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3 lg:col-start-2 lg:row-start-1">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Preferred region map</p>
                <p className="text-xs text-muted-foreground">
                  Toggle a mode below to update your selection.
                </p>
              </div>
              {(isPrimaryPending || isSecondaryPending) && (
                <span className="text-xs font-semibold text-primary">Updating...</span>
              )}
            </div>
            <InteractiveWorldMap
              selectedRegion={preferredRegionState}
              secondaryRegion={secondaryRegionState}
              selectionMode="primary"
              onRegionSelect={handleMapSelect}
              showInfoBox={false}
              isInteractive={mapMode !== null}
              showCountryFocus={false}
            />
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 lg:col-start-2 lg:row-start-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {secondaryRegionLabel ? "Chosen primary · secondary region" : "Chosen primary region"}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {preferredRegionLabel || "Not set"}
              {secondaryRegionLabel ? ` · ${secondaryRegionLabel}` : ""}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={mapMode === "primary" ? "default" : "outline"}
                size="sm"
                disabled={isPrimaryPending || isSecondaryPending}
                onClick={() => setMapMode((prev) => (prev === "primary" ? null : "primary"))}
              >
                Choose new primary region
              </Button>
              <Button
                type="button"
                variant={mapMode === "secondary" ? "default" : "outline"}
                size="sm"
                disabled={isPrimaryPending || isSecondaryPending}
                onClick={() => setMapMode((prev) => (prev === "secondary" ? null : "secondary"))}
              >
                Choose new secondary region
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Preferred age range</p>
              {isAgePending && (
                <span className="text-xs font-semibold text-primary">Saving...</span>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-sm font-semibold text-foreground">
              <span>{ageRangeState[0]} years</span>
              <span>{ageRangeState[1]} years</span>
            </div>
            <Slider
              min={18}
              max={45}
              step={1}
              value={ageRangeState}
              onValueChange={(nextValue) => setAgeRangeState(nextValue as [number, number])}
              onValueCommit={(nextValue) => handleAgeCommit(nextValue as number[])}
              className="mt-4"
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>18</span>
              <span>45</span>
            </div>
          </div>

          {user_is_foreign !== undefined && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">I am a Foreigner</p>
                <p className="text-xs text-muted-foreground">Update your current location status.</p>
              </div>
              <form action={updateProfilePreference} className="flex items-center gap-2">
                <input type="hidden" name="preferenceKey" value="user_is_foreign" />
                <Button
                  type="submit"
                  name="preferenceValue"
                  value="true"
                  size="sm"
                  variant={user_is_foreign === true ? "default" : "outline"}
                >
                  Yes
                </Button>
                <Button
                  type="submit"
                  name="preferenceValue"
                  value="false"
                  size="sm"
                  variant={user_is_foreign === false ? "default" : "outline"}
                >
                  No
                </Button>
              </form>
            </div>
          )}

          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Dating Foreigners</p>
              <p className="text-xs text-muted-foreground">Adjust your current focus.</p>
            </div>
            <form action={updateProfilePreference} className="flex items-center gap-2">
              <input type="hidden" name="preferenceKey" value="dating_foreigners" />
              <Button
                type="submit"
                name="preferenceValue"
                value="true"
                size="sm"
                variant={dating_foreigners ? "default" : "outline"}
              >
                Yes
              </Button>
              <Button
                type="submit"
                name="preferenceValue"
                value="false"
                size="sm"
                variant={!dating_foreigners ? "default" : "outline"}
              >
                No
              </Button>
            </form>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 flex items-center justify-between gap-3">
            <p className="min-w-0 text-sm font-semibold text-foreground truncate">
              Experience level: <span className="text-foreground">{experienceLabel}</span>
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowExperienceDialog(true)}
            >
              Update
            </Button>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 flex items-center justify-between gap-3">
            <p className="min-w-0 text-sm font-semibold text-foreground truncate">
              Primary goal: <span className="text-foreground">{primaryGoalLabel}</span>
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowGoalDialog(true)}
            >
              Update
            </Button>
          </div>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link href="/preferences">Edit Full Preferences</Link>
        </Button>
      </CardContent>

      <Dialog open={showExperienceDialog} onOpenChange={setShowExperienceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update experience level</DialogTitle>
            <DialogDescription>
              Pick the level that best matches your current confidence.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {EXPERIENCE_OPTIONS.map((option) => (
              <Button
                key={option.id}
                type="button"
                size="sm"
                variant={experienceLevelState === option.id ? "default" : "outline"}
                className="w-full"
                onClick={() => handleExperienceSelect(option.id)}
                disabled={isExperiencePending}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update primary goal</DialogTitle>
            <DialogDescription>
              Choose what you want to focus on right now.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {PRIMARY_GOAL_OPTIONS.map((option) => (
              <Button
                key={option.id}
                type="button"
                size="sm"
                variant={primaryGoalState === option.id ? "default" : "outline"}
                className="w-full"
                onClick={() => handleGoalSelect(option.id)}
                disabled={isGoalPending}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
