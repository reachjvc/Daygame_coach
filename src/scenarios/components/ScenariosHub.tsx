"use client";

import type { ComponentType } from "react";
import { useState } from "react";
import {
  MessageSquare,
  TrendingUp,
  Shield,
  Phone,
  HelpCircle,
  Heart,
  Sparkles,
  MessageCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Lock,
  CheckCircle2,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DifficultyLevel } from "@/src/scenarios/openers/data/energy";
import { PracticeOpenersTrainer } from "@/src/scenarios/openers/OpenersTrainer";
import { VoiceChatWindow } from "@/src/scenarios/components/ChatWindow";
import { cn } from "@/lib/utils";

interface ScenariosPageClientV2Props {
  recommendedDifficulty: DifficultyLevel;
  userLevel: number;
  scenariosCompleted: number;
}

type ScenarioId =
  | "practice-openers"
  | "topic-pivot"
  | "assumption-game"
  | "her-question"
  | "practice-career-response"
  | "hobby-response"
  | "compliment-delivery"
  | "flirting-escalation"
  | "practice-shittests"
  | "boyfriend-mention"
  | "time-pressure"
  | "number-ask"
  | "insta-close"
  | "instant-date"
  | "first-text"
  | "date-proposal"
  | "flake-recovery"
  | "app-opener"
  | "app-to-date";

interface Scenario {
  id: ScenarioId;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  available: boolean;
  comingSoon?: boolean;
}

interface ScenarioPhase {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  scenarios: Scenario[];
}

const SCENARIO_PHASES: ScenarioPhase[] = [
  {
    id: "opening",
    title: "Opening",
    icon: MessageSquare,
    description: "Start the conversation",
    scenarios: [
      {
        id: "practice-openers",
        title: "Practice Openers",
        description: "First 5 seconds - what do you say to get her attention?",
        icon: MessageSquare,
        available: true,
      },
    ],
  },
  {
    id: "hooking",
    title: "Hooking & Interest",
    icon: Sparkles,
    description: "Build curiosity and investment",
    scenarios: [
      {
        id: "topic-pivot",
        title: "Topic Pivot",
        description: "She gave a bland response. Keep the conversation going.",
        icon: MessageSquare,
        available: false,
        comingSoon: true,
      },
      {
        id: "assumption-game",
        title: "Assumption Game",
        description: "Make playful assumptions about her to create intrigue.",
        icon: Sparkles,
        available: false,
        comingSoon: true,
      },
      {
        id: "her-question",
        title: "Her Question to You",
        description: '"So what do you do?" - she\'s qualifying you now.',
        icon: HelpCircle,
        available: false,
        comingSoon: true,
      },
    ],
  },
  {
    id: "vibing",
    title: "Vibing & Connection",
    icon: Heart,
    description: "Build rapport and attraction",
    scenarios: [
      {
        id: "practice-career-response",
        title: "Career Response",
        description: "She reveals her job. Practice push/pull dynamics.",
        icon: TrendingUp,
        available: true,
      },
      {
        id: "hobby-response",
        title: "Hobby Response",
        description: '"I do yoga" - respond without interview mode.',
        icon: Heart,
        available: false,
        comingSoon: true,
      },
      {
        id: "compliment-delivery",
        title: "Compliment Delivery",
        description: "Give a genuine compliment without being needy.",
        icon: Heart,
        available: false,
        comingSoon: true,
      },
      {
        id: "flirting-escalation",
        title: "Flirting Escalation",
        description: "Add tension and romantic intent to the conversation.",
        icon: Sparkles,
        available: false,
        comingSoon: true,
      },
    ],
  },
  {
    id: "resistance",
    title: "Handling Resistance",
    icon: Shield,
    description: "Stay confident under pressure",
    scenarios: [
      {
        id: "practice-shittests",
        title: "Shit-Tests",
        description: "Handle challenges and boundary checks with humor.",
        icon: Shield,
        available: true,
      },
      {
        id: "boyfriend-mention",
        title: "Boyfriend Mention",
        description: '"I have a boyfriend" - real or test? How do you respond?',
        icon: Shield,
        available: false,
        comingSoon: true,
      },
      {
        id: "time-pressure",
        title: "Time Pressure",
        description: '"I really need to go" - respect or persist?',
        icon: Shield,
        available: false,
        comingSoon: true,
      },
    ],
  },
  {
    id: "closing",
    title: "Closing & Texting",
    icon: Phone,
    description: "Seal the deal and follow up",
    scenarios: [
      {
        id: "number-ask",
        title: "Number Ask",
        description: "Conversation is going well. Ask for her number.",
        icon: Phone,
        available: false,
        comingSoon: true,
      },
      {
        id: "insta-close",
        title: "Instagram Close",
        description: "She's hesitant on number. Pivot to social media.",
        icon: Phone,
        available: false,
        comingSoon: true,
      },
      {
        id: "instant-date",
        title: "Instant Date Pitch",
        description: "High momentum - propose grabbing coffee right now.",
        icon: Calendar,
        available: false,
        comingSoon: true,
      },
      {
        id: "first-text",
        title: "First Text",
        description: "You got her number. What do you send?",
        icon: MessageCircle,
        available: false,
        comingSoon: true,
      },
      {
        id: "date-proposal",
        title: "Date Proposal",
        description: "She's responding positively. Set up a date.",
        icon: Calendar,
        available: false,
        comingSoon: true,
      },
      {
        id: "flake-recovery",
        title: "Flake Recovery",
        description: "She went cold or cancelled. Re-engage without neediness.",
        icon: MessageCircle,
        available: false,
        comingSoon: true,
      },
      {
        id: "app-opener",
        title: "Dating App Opener",
        description: "Her profile is interesting. Send a standout first message.",
        icon: MessageCircle,
        available: false,
        comingSoon: true,
      },
      {
        id: "app-to-date",
        title: "App to Date",
        description: "Match is going well. Move from app chat to real date.",
        icon: Calendar,
        available: false,
        comingSoon: true,
      },
    ],
  },
];

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
  const recommendedScenarios = SCENARIO_PHASES.flatMap((phase) =>
    phase.scenarios.filter((s) => recommendedScenarioIds.includes(s.id) && s.available)
  );

  // Count available scenarios per phase
  const getPhaseProgress = (phase: ScenarioPhase) => {
    const available = phase.scenarios.filter((s) => s.available).length;
    const total = phase.scenarios.length;
    return { available, total };
  };

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
        {SCENARIO_PHASES.map((phase) => {
          const isExpanded = expandedPhases.has(phase.id);
          const PhaseIcon = phase.icon;
          const progress = getPhaseProgress(phase);

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
                  {phase.scenarios.map((scenario) => {
                    const Icon = scenario.icon;
                    const isRecommended = recommendedScenarioIds.includes(scenario.id);

                    return (
                      <Card
                        key={scenario.id}
                        className={cn(
                          "p-4 transition-all h-full flex flex-col",
                          scenario.available
                            ? "bg-card border-border hover:border-primary/50 cursor-pointer"
                            : "bg-muted/30 border-border/50 opacity-60"
                        )}
                        onClick={() => scenario.available && setActiveScenario(scenario.id)}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={cn(
                              "size-9 rounded-full flex items-center justify-center shrink-0",
                              scenario.available ? "bg-primary/10" : "bg-muted"
                            )}
                          >
                            {scenario.available ? (
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
                              {isRecommended && scenario.available && (
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
