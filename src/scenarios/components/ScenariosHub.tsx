"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Lock,
  CheckCircle2,
  Sparkles,
  X,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DifficultyLevel } from "../openers/data/energy";
import { PracticeOpenersTrainer } from "@/src/scenarios/openers/OpenersTrainer";
import { VoiceChatWindow } from "@/src/scenarios/components/ChatWindow";
import { cn } from "@/lib/utils";

import {
  SCENARIO_CATALOG,
  PHASE_CATALOG,
  type ScenarioId,
  type ScenarioDef,
  type PhaseDef,
} from "@/src/scenarios/catalog";
import type { ChatScenarioType } from "@/src/scenarios/types";

interface ScenariosHubProps {
  recommendedDifficulty: DifficultyLevel;
  userLevel: number;
  scenariosCompleted: number;
  isPreviewMode?: boolean;
}

// Get recommended scenarios based on user progress
function getRecommendedScenarios(userLevel: number, scenariosCompleted: number): ScenarioId[] {
  // Early users: focus on fundamentals
  if (scenariosCompleted < 5) {
    return ["practice-openers", "practice-career-response", "practice-shittests"];
  }
  // Getting comfortable: mix of phases
  if (scenariosCompleted < 15) {
    return ["practice-openers", "practice-career-response", "practice-shittests"];
  }
  // Experienced: still the core 3 until more are available
  return ["practice-openers", "practice-career-response", "practice-shittests"];
}

// Helper to check if scenario is available
function isAvailable(scenario: ScenarioDef): boolean {
  return scenario.status === "available";
}

// Get scenarios for a phase from the catalog
function getScenariosForPhase(phase: PhaseDef): ScenarioDef[] {
  return phase.scenarioIds.map((id) => SCENARIO_CATALOG[id]);
}

// Count available scenarios per phase
function getPhaseProgress(phase: PhaseDef) {
  const scenarios = getScenariosForPhase(phase);
  const available = scenarios.filter(isAvailable).length;
  const total = scenarios.length;
  return { available, total };
}

function isVoiceChatScenario(id: ScenarioId): id is ChatScenarioType {
  return id === "practice-career-response" || id === "practice-shittests";
}

export function ScenariosHub({
  recommendedDifficulty,
  userLevel,
  scenariosCompleted,
  isPreviewMode = false,
}: ScenariosHubProps) {
  const [activeScenario, setActiveScenario] = useState<ScenarioId | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set(["opening", "vibing", "resistance"]) // Default expanded
  );
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [selectedScenarioName, setSelectedScenarioName] = useState<string>("");

  const recommendedScenarioIds = getRecommendedScenarios(userLevel, scenariosCompleted);

  // Handle scenario click - gate in preview mode
  const handleScenarioClick = (scenario: ScenarioDef) => {
    if (!isAvailable(scenario)) return;

    if (isPreviewMode) {
      setSelectedScenarioName(scenario.title);
      setShowSignupPrompt(true);
    } else {
      setActiveScenario(scenario.id);
    }
  };

  // Handle active scenario rendering (only when not in preview mode)
  if (!isPreviewMode && activeScenario === "practice-openers") {
    return (
      <PracticeOpenersTrainer
        recommendedDifficulty={recommendedDifficulty}
        onBack={() => setActiveScenario(null)}
      />
    );
  }

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  // Get all recommended scenarios for the featured section
  const recommendedScenarios = PHASE_CATALOG.flatMap((phase) =>
    getScenariosForPhase(phase).filter(
      (s) => recommendedScenarioIds.includes(s.id) && isAvailable(s)
    )
  );

  return (
    <div className="space-y-8" data-testid="scenarios-hub">
      {/* Signup Prompt Modal */}
      {showSignupPrompt && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6 relative" data-testid="scenarios-signup-prompt">
            <button
              onClick={() => setShowSignupPrompt(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>

            <div className="text-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="size-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Unlock "{selectedScenarioName}"
              </h3>
              <p className="text-muted-foreground mb-6">
                Sign up to start practicing this scenario and track your progress. Get personalized feedback and improve your social skills.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/auth/sign-up" className="w-full">
                  <Button className="w-full">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/auth/login" className="w-full">
                  <Button variant="outline" className="w-full">
                    Already have an account? Login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground mb-3">
          Practice Scenarios
        </h1>
        <p className="text-pretty text-lg text-muted-foreground leading-relaxed">
          {isPreviewMode
            ? "Browse available scenarios. Sign up to start practicing!"
            : "Train each phase of the conversation, from opener to close."
          }
        </p>
      </div>

      {/* Recommended Section */}
      {recommendedScenarios.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {isPreviewMode ? "Popular Scenarios" : "Recommended for You"}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedScenarios.map((scenario) => {
              const Icon = scenario.icon;
              return (
                <Card
                  key={scenario.id}
                  className={cn(
                    "p-4 bg-card border-border transition-all cursor-pointer",
                    isPreviewMode
                      ? "hover:border-primary/50 hover:shadow-md"
                      : "hover:border-primary/50"
                  )}
                  onClick={() => handleScenarioClick(scenario)}
                >
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{scenario.title}</h3>
                        {isPreviewMode && <Lock className="size-3 text-muted-foreground" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{scenario.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Phase Sections */}
      <div className="space-y-3">
        {PHASE_CATALOG.map((phase) => {
          const isExpanded = expandedPhases.has(phase.id);
          const PhaseIcon = phase.icon;
          const progress = getPhaseProgress(phase);
          const scenarios = getScenariosForPhase(phase);

          return (
            <div key={phase.id} className="border border-border rounded-lg overflow-hidden">
              {/* Phase Header */}
              <button
                onClick={() => togglePhase(phase.id)}
                className="w-full flex items-center justify-between p-4 bg-card hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <PhaseIcon className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{phase.title}</h3>
                    <p className="text-sm text-muted-foreground">{phase.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {progress.available}/{progress.total} available
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="size-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Phase Content */}
              {isExpanded && (
                <div className="p-4 pt-0 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {scenarios.map((scenario) => {
                    const Icon = scenario.icon;
                    const isRecommended = recommendedScenarioIds.includes(scenario.id);
                    const available = isAvailable(scenario);

                    return (
                      <Card
                        key={scenario.id}
                        className={cn(
                          "p-4 transition-all h-full flex flex-col",
                          available
                            ? "bg-card border-border hover:border-primary/50 cursor-pointer"
                            : "bg-muted/30 border-border/50 opacity-60"
                        )}
                        onClick={() => handleScenarioClick(scenario)}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={cn(
                              "size-9 rounded-full flex items-center justify-center shrink-0",
                              available ? "bg-primary/10" : "bg-muted"
                            )}
                          >
                            {available ? (
                              <Icon className="size-4 text-primary" />
                            ) : (
                              <Lock className="size-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-foreground text-sm">
                                {scenario.title}
                              </h4>
                              {isPreviewMode && available && (
                                <Lock className="size-3 text-muted-foreground shrink-0" />
                              )}
                              {!isPreviewMode && isRecommended && available && (
                                <CheckCircle2 className="size-4 text-primary shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {scenario.description}
                            </p>
                          </div>
                        </div>
                        {scenario.comingSoon && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <span className="text-xs text-muted-foreground">Coming Soon</span>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview Mode CTA */}
      {isPreviewMode && (
        <div className="text-center p-8 bg-primary/5 border border-primary/20 rounded-lg">
          <h3 className="text-xl font-bold text-foreground mb-2">Ready to Start Practicing?</h3>
          <p className="text-muted-foreground mb-6">
            Sign up to unlock all scenarios and start improving your conversation skills today.
          </p>
          <Link href="/auth/sign-up">
            <Button size="lg">
              Get Started Free
            </Button>
          </Link>
        </div>
      )}

      {/* Voice Chat Window for non-opener scenarios (only when not in preview mode) */}
      {!isPreviewMode && activeScenario && isVoiceChatScenario(activeScenario) && (
        <VoiceChatWindow
          onClose={() => setActiveScenario(null)}
          scenarioType={activeScenario}
        />
      )}
    </div>
  );
}
