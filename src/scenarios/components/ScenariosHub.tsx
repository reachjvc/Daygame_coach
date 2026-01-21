"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Lock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import type { DifficultyLevel } from "@/src/scenarios/openers/data/energy";
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

interface ScenariosPageClientV2Props {
  recommendedDifficulty: DifficultyLevel;
  userLevel: number;
  scenariosCompleted: number;
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

export function ScenariosHub({
  recommendedDifficulty,
  userLevel,
  scenariosCompleted,
}: ScenariosPageClientV2Props) {
  const [activeScenario, setActiveScenario] = useState<ScenarioId | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set(["opening", "vibing", "resistance"]) // Default expanded
  );

  const recommendedScenarioIds = getRecommendedScenarios(userLevel, scenariosCompleted);

  // Handle active scenario rendering
  if (activeScenario === "practice-openers") {
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
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground mb-3">
          Practice Scenarios
        </h1>
        <p className="text-pretty text-lg text-muted-foreground leading-relaxed">
          Train each phase of the conversation, from opener to close.
        </p>
      </div>

      {/* Recommended Section */}
      {recommendedScenarios.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Recommended for You
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedScenarios.map((scenario) => {
              const Icon = scenario.icon;
              return (
                <Card
                  key={scenario.id}
                  className="p-4 bg-card border-border hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => setActiveScenario(scenario.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{scenario.title}</h3>
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
                        onClick={() => available && setActiveScenario(scenario.id)}
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
                              {isRecommended && available && (
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

      {/* Voice Chat Window for non-opener scenarios */}
      {activeScenario && (
        <VoiceChatWindow
          onClose={() => setActiveScenario(null)}
          scenarioType={activeScenario as any}
        />
      )}
    </div>
  );
}
