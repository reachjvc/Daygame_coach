"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Target, MessageCircle, Brain } from "lucide-react";
import { UserPreferences, LevelProgressBar } from "@/src/profile/components";
import type { DashboardProfileData } from "../types";

interface DashboardContentProps {
  profileData: DashboardProfileData | null;
}

export function DashboardContent({ profileData }: DashboardContentProps) {
  const [experienceLevel, setExperienceLevel] = useState<string | null>(
    profileData?.experience_level ?? null
  );
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(
    profileData?.primary_goal ?? null
  );

  useEffect(() => {
    setExperienceLevel(profileData?.experience_level ?? null);
  }, [profileData?.experience_level]);

  useEffect(() => {
    setPrimaryGoal(profileData?.primary_goal ?? null);
  }, [profileData?.primary_goal]);

  return (
    <main className="mx-auto max-w-6xl px-8 py-24">
      <div className="text-center mb-16">
        <h1 className="text-balance text-4xl font-bold tracking-tight lg:text-5xl mb-4 text-foreground">
          Welcome Back!
        </h1>
        <p className="text-pretty text-lg text-muted-foreground leading-relaxed">
          Choose a training module to continue improving your daygame skills
        </p>
      </div>

      {/* Level Progress Bar */}
      {profileData && (
        <div className="mb-12">
          <LevelProgressBar
            level={profileData.level || 1}
            xp={profileData.xp || 0}
            scenariosCompleted={profileData.scenarios_completed || 0}
            experienceLevel={experienceLevel ?? profileData.experience_level}
          />
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {/* Scenarios */}
        <Link href="/dashboard/scenarios" className="group">
          <Card className="p-8 bg-card border-border hover:border-primary transition-all duration-300 h-full flex flex-col items-center text-center cursor-pointer group-hover:shadow-lg">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <Target className="size-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Scenarios</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Master the art of approaching strangers with confidence. Learn opening lines, body language, and conversation flow.
            </p>
            <div className="mt-auto bg-primary text-primary-foreground hover:bg-primary/90 w-full p-2 rounded-md">
              Start Training
            </div>
          </Card>
        </Link>

        {/* Cold Approach - Coming Soon */}
        <Card
          className="p-8 bg-card border-border opacity-60 h-full flex flex-col items-center text-center"
        >
          <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <MessageCircle className="size-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-foreground">Cold Approach</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Practice in realistic environments like coffee shops, parks, and bookstores. Build situational awareness and adaptability.
          </p>
          <div className="mt-auto bg-secondary text-secondary-foreground w-full p-2 rounded-md">
            Coming Soon
          </div>
        </Card>

        {/* Inner Game */}
        <Link href="/dashboard/inner-game" className="group">
          <Card className="p-8 bg-card border-border hover:border-primary transition-all duration-300 h-full flex flex-col items-center text-center cursor-pointer group-hover:shadow-lg">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <Brain className="size-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Inner Game</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Develop mental strength, overcome approach anxiety, and build authentic confidence from within.
            </p>
            <div className="mt-auto bg-primary text-primary-foreground hover:bg-primary/90 w-full p-2 rounded-md">
                Start Training
            </div>
          </Card>
        </Link>
      </div>

      {profileData && (
        <div className="mt-16">
          <UserPreferences
            age_range_start={profileData.age_range_start}
            age_range_end={profileData.age_range_end}
            archetype={profileData.archetype}
            secondary_archetype={profileData.secondary_archetype ?? undefined}
            tertiary_archetype={profileData.tertiary_archetype ?? undefined}
            dating_foreigners={profileData.dating_foreigners}
            user_is_foreign={profileData.user_is_foreign}
            preferred_region={profileData.preferred_region}
            secondary_region={profileData.secondary_region}
            experience_level={experienceLevel ?? profileData.experience_level}
            primary_goal={primaryGoal ?? profileData.primary_goal}
            onExperienceLevelChange={setExperienceLevel}
            onPrimaryGoalChange={setPrimaryGoal}
          />
        </div>
      )}

    </main>
  );
}
