"use client";

import { Card } from "@/components/ui/card";
import { Trophy, TrendingUp } from "lucide-react";
import { EXPERIENCE_LABELS } from "@/src/profile/data/experience-levels";

interface LevelProgressBarProps {
  level: number;
  xp: number;
  scenariosCompleted?: number;
  experienceLevel?: string | null;
}

function getXPForLevel(level: number): number {
  return 100 * level;
}

function getLevelTitle(level: number): string {
  if (level < 5) return "Rookie";
  if (level < 10) return "Practitioner";
  if (level < 15) return "Confident";
  if (level < 20) return "Advanced";
  if (level < 25) return "Expert";
  return "Master";
}

export function LevelProgressBar({
  level,
  xp,
  scenariosCompleted = 0,
  experienceLevel,
}: LevelProgressBarProps) {
  const xpForCurrentLevel = level === 1 ? 0 : getXPForLevel(level);
  const xpForNextLevel = getXPForLevel(level + 1);
  const xpProgress = Math.max(0, xp - xpForCurrentLevel);
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercentage = Math.min((xpProgress / xpNeeded) * 100, 100);
  const levelTitle =
    (experienceLevel && EXPERIENCE_LABELS[experienceLevel]) || getLevelTitle(level);

  return (
    <Card className="bg-gradient-to-r from-card to-card/50 border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
            <Trophy className="size-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">Level {level}</h3>
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {levelTitle}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {xpProgress} / {xpNeeded} XP to Level {level + 1}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <TrendingUp className="size-4" />
            <span className="font-semibold">{scenariosCompleted}</span>
          </div>
          <p className="text-xs text-muted-foreground">scenarios</p>
        </div>
      </div>

      <div className="relative h-3 bg-background rounded-full overflow-hidden border border-border">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progressPercentage}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-2">
        {xpNeeded - xpProgress} XP until next level
      </p>
    </Card>
  );
}
