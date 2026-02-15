"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MessageCircle, Brain, HelpCircle, ArrowRight, Lock, BarChart3, BookOpen, Swords } from "lucide-react";
import { UserPreferences, LevelProgressBar } from "@/src/profile/components";
import type { DashboardProfileData } from "../types";

interface DashboardContentProps {
  profileData: DashboardProfileData | null;
  isPreviewMode?: boolean;
}

export function DashboardContent({ profileData, isPreviewMode = false }: DashboardContentProps) {
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
    <main className="mx-auto max-w-6xl px-8 py-24" data-testid="dashboard-content">
      <div className="text-center mb-16">
        <h1 className="text-balance text-4xl font-bold tracking-tight lg:text-5xl mb-4 text-foreground">
          {isPreviewMode ? "Explore the Dashboard" : "Welcome Back!"}
        </h1>
        <p className="text-pretty text-lg text-muted-foreground leading-relaxed">
          {isPreviewMode
            ? "See what training modules are available. Sign up to start practicing!"
            : "Choose a training module to continue improving your daygame skills"
          }
        </p>
      </div>

      {/* Level Progress Bar - Show sample in preview mode */}
      {isPreviewMode ? (
        <div className="mb-12 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/80 to-transparent z-10 flex items-center justify-center">
            <div className="bg-card border border-border rounded-lg px-4 py-2 shadow-lg">
              <span className="text-sm text-muted-foreground">Your progress will appear here</span>
            </div>
          </div>
          <div className="opacity-40 pointer-events-none">
            <LevelProgressBar
              level={1}
              xp={0}
              scenariosCompleted={0}
              experienceLevel="beginner"
            />
          </div>
        </div>
      ) : profileData && (
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
        <Link href="/dashboard/scenarios" className="group" data-testid="dashboard-scenarios-link">
          <Card className="p-8 bg-card border-border hover:border-primary transition-all duration-300 h-full flex flex-col items-center text-center cursor-pointer group-hover:shadow-lg">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <Swords className="size-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Scenarios</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Master the art of approaching strangers with confidence. Learn opening lines, body language, and conversation flow.
            </p>
            <div className={`mt-auto w-full p-2 rounded-md flex items-center justify-center gap-2 ${
              isPreviewMode
                ? "bg-primary/80 text-primary-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}>
              {isPreviewMode && <Lock className="size-4" />}
              {isPreviewMode ? "Preview Scenarios" : "Start Training"}
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
        <Link href="/dashboard/inner-game" className="group" data-testid="dashboard-inner-game-link">
          <Card className="p-8 bg-card border-border hover:border-primary transition-all duration-300 h-full flex flex-col items-center text-center cursor-pointer group-hover:shadow-lg">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <Brain className="size-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Inner Game</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Develop mental strength, overcome approach anxiety, and build authentic confidence from within.
            </p>
            <div className={`mt-auto w-full p-2 rounded-md flex items-center justify-center gap-2 ${
              isPreviewMode
                ? "bg-primary/80 text-primary-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}>
              {isPreviewMode && <Lock className="size-4" />}
              {isPreviewMode ? "Preview Module" : "Start Training"}
            </div>
          </Card>
        </Link>
      </div>

      {/* Ask Your Coach - QA Section */}
      <Link href={isPreviewMode ? "/auth/sign-up" : "/dashboard/qa"} className="group block mt-8" data-testid="dashboard-qa-link">
        <Card className="p-6 bg-gradient-to-r from-card to-card/80 border-border hover:border-primary transition-all duration-300 cursor-pointer group-hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                <HelpCircle className="size-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">Ask Your Coach</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                  Got questions about dating, approaching, or social dynamics? Get personalized advice from your AI coach based on proven strategies and real-world experience.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-primary group-hover:translate-x-1 transition-transform">
              {isPreviewMode && <Lock className="size-4" />}
              <span className="font-medium hidden sm:inline">
                {isPreviewMode ? "Sign Up to Ask" : "Ask a Question"}
              </span>
              <ArrowRight className="size-5" />
            </div>
          </div>
        </Card>
      </Link>

      {/* Progress Tracking Section */}
      <Link href={isPreviewMode ? "/auth/sign-up" : "/dashboard/tracking"} className="group block mt-4" data-testid="dashboard-tracking-link">
        <Card className="p-6 bg-gradient-to-r from-card to-card/80 border-border hover:border-primary transition-all duration-300 cursor-pointer group-hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="size-14 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors shrink-0">
                <BarChart3 className="size-7 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">Progress Tracking</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                  Track your real-world approaches, write field reports, and visualize your improvement over time. Start a session and watch your stats grow.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-green-500 group-hover:translate-x-1 transition-transform">
              {isPreviewMode && <Lock className="size-4" />}
              <span className="font-medium hidden sm:inline">
                {isPreviewMode ? "Sign Up to Track" : "Start Tracking"}
              </span>
              <ArrowRight className="size-5" />
            </div>
          </div>
        </Card>
      </Link>

      {/* Articles & Research Section - Always accessible */}
      <Link href="/dashboard/articles" className="group block mt-4">
        <Card className="p-6 bg-gradient-to-r from-card to-card/80 border-border hover:border-primary transition-all duration-300 cursor-pointer group-hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="size-14 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors shrink-0">
                <BookOpen className="size-7 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">Articles & Research</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                  Research-backed articles on performance psychology, deliberate practice, and social dynamics. Content designed to add real value to your life.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-amber-500 group-hover:translate-x-1 transition-transform">
              <span className="font-medium hidden sm:inline">Browse Articles</span>
              <ArrowRight className="size-5" />
            </div>
          </div>
        </Card>
      </Link>

      {/* Preview Mode CTA */}
      {isPreviewMode && (
        <div className="mt-12 text-center p-8 bg-primary/5 border border-primary/20 rounded-lg">
          <h3 className="text-xl font-bold text-foreground mb-2">Ready to Start Training?</h3>
          <p className="text-muted-foreground mb-6">
            Sign up now to unlock all features and start improving your social skills today.
          </p>
          <Link href="/auth/sign-up">
            <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-md font-medium">
              Get Started Free
            </button>
          </Link>
        </div>
      )}

      {profileData && !isPreviewMode && (
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
