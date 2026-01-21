"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DifficultyLevel } from "@/src/scenarios/openers/data/energy";
import type { GeneratedScenarioV2 } from "@/src/scenarios/openers/generator";

type EnvironmentChoice =
  | "any"
  | "high-street"
  | "mall"
  | "coffee-shop"
  | "transit"
  | "park"
  | "gym"
  | "campus";

type OpenerEvaluation = {
  overallScore: number;
  confidence: number;
  authenticity: number;
  calibration: number;
  hook: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  suggestedRewrite?: string;
};

interface PracticeOpenersTrainerProps {
  recommendedDifficulty: DifficultyLevel;
  onBack: () => void;
}

function positionToLabel(position: GeneratedScenarioV2["aiHandoff"]["position"]): string {
  switch (position) {
    case "standing":
      return "Standing";
    case "seated":
      return "Seated";
    case "walking_slow":
      return "Walking slow";
    case "walking_moderate":
      return "Walking moderate";
    case "walking_brisk":
      return "Walking brisk";
    case "walking_fast":
      return "Walking fast";
    default:
      return position;
  }
}

function defaultHintForDifficulty(difficulty: DifficultyLevel): boolean {
  return difficulty === "beginner" || difficulty === "intermediate";
}

export function PracticeOpenersTrainer({
  recommendedDifficulty,
  onBack,
}: PracticeOpenersTrainerProps) {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(recommendedDifficulty);
  const [environment, setEnvironment] = useState<EnvironmentChoice>("high-street");
  const [includeHint, setIncludeHint] = useState<boolean>(defaultHintForDifficulty(recommendedDifficulty));
  const [includeWeather, setIncludeWeather] = useState<boolean>(false);

  const [encounter, setEncounter] = useState<GeneratedScenarioV2 | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [opener, setOpener] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<OpenerEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const difficultyOptions = useMemo(
    () =>
      [
        { value: "beginner", label: "Beginner", note: "More approachable, more obvious cues" },
        { value: "intermediate", label: "Intermediate", note: "Normal, mixed signals" },
        { value: "advanced", label: "Advanced", note: "Busy + time constraints" },
        { value: "expert", label: "Expert", note: "Skeptical + harder stops" },
        { value: "master", label: "Master", note: "Cold + least receptive" },
      ] as const satisfies Array<{
        value: DifficultyLevel;
        label: string;
        note: string;
      }>,
    []
  );

  const environmentOptions = useMemo(
    () =>
      [
        { value: "high-street", label: "High Street" },
        { value: "coffee-shop", label: "Coffee Shop" },
        { value: "park", label: "Park" },
        { value: "mall", label: "Mall" },
        { value: "transit", label: "Transit" },
        { value: "gym", label: "Gym" },
        { value: "campus", label: "Campus" },
        { value: "any", label: "Any" },
      ] as const satisfies Array<{ value: EnvironmentChoice; label: string }>,
    []
  );

  const selectClasses =
    "border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm";

  const generateEncounter = async () => {
    setError(null);
    setEvaluation(null);
    setOpener("");
    setIsGenerating(true);
    try {
      const res = await fetch("/api/scenarios/openers/encounter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulty,
          environment,
          includeHint,
          includeWeather,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to generate encounter.");
        return;
      }

      setEncounter(data.encounter as GeneratedScenarioV2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const evaluateOpener = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!encounter || !opener.trim() || isEvaluating) return;

    setError(null);
    setEvaluation(null);
    setIsEvaluating(true);
    try {
      const res = await fetch("/api/scenarios/openers/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opener: opener.trim(),
          encounter,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to evaluate opener.");
        return;
      }

      setEvaluation(data.evaluation as OpenerEvaluation);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const difficultyNote = difficultyOptions.find((d) => d.value === difficulty)?.note;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Scenarios
          </Button>
        </div>

        <div className="flex-1 text-center">
          <h2 className="text-3xl font-bold text-foreground">Practice Openers</h2>
          <p className="text-muted-foreground mt-2">
            Generate an encounter, then write what you’d say as your opener.
          </p>
        </div>

        <div className="w-[140px]" />
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Generate Encounter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <select
                id="difficulty"
                className={selectClasses}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
              >
                {difficultyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {difficultyNote && <p className="text-xs text-muted-foreground">{difficultyNote}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <select
                id="environment"
                className={selectClasses}
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as EnvironmentChoice)}
              >
                {environmentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Pick where you want to practice. “Any” gives the most variety.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeHint}
                onChange={(e) => setIncludeHint(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-background"
              />
              Show opener hint (easier)
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeWeather}
                onChange={(e) => setIncludeWeather(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-background"
              />
              Include weather
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={generateEncounter} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {encounter && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
              <span>Encounter</span>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{encounter.meta.difficulty}</Badge>
                <Badge variant="secondary">{encounter.userFacing.environment}</Badge>
                <Badge variant="secondary">{positionToLabel(encounter.aiHandoff.position)}</Badge>
                {encounter.aiHandoff.hasHeadphones && <Badge variant="secondary">Headphones</Badge>}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground leading-relaxed">{encounter.userFacing.description}</p>

            {includeHint && encounter.userFacing.hook && (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Hint:</span>{" "}
                  {encounter.userFacing.hook}
                </p>
              </div>
            )}

            {encounter.userFacing.weatherDescription && (
              <p className="text-sm text-muted-foreground">{encounter.userFacing.weatherDescription}</p>
            )}

            <div className="rounded-md border border-border p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Your turn:</span> Write your opener (1–2
                sentences). Keep it natural and calibrated to what you see.
              </p>

              <form onSubmit={evaluateOpener} className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={opener}
                  onChange={(e) => setOpener(e.target.value)}
                  placeholder="Type what you’d say…"
                  disabled={isEvaluating}
                />
                <Button type="submit" disabled={isEvaluating || !opener.trim()}>
                  {isEvaluating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Evaluating…
                    </>
                  ) : (
                    "Get Feedback"
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}

      {evaluation && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-3">
              <span>Feedback</span>
              <Badge className="bg-primary text-primary-foreground">
                Score: {Math.round(evaluation.overallScore)}/10
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Confidence: {Math.round(evaluation.confidence)}/10</Badge>
              <Badge variant="secondary">Authenticity: {Math.round(evaluation.authenticity)}/10</Badge>
              <Badge variant="secondary">Calibration: {Math.round(evaluation.calibration)}/10</Badge>
              <Badge variant="secondary">Hook: {Math.round(evaluation.hook)}/10</Badge>
            </div>

            <p className="text-foreground leading-relaxed">{evaluation.feedback}</p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-md border border-border p-3">
                <p className="text-sm font-semibold text-foreground mb-2">Strengths</p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  {evaluation.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border border-border p-3">
                <p className="text-sm font-semibold text-foreground mb-2">Improve</p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  {evaluation.improvements.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {evaluation.suggestedRewrite && (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Try this:</span>{" "}
                  {evaluation.suggestedRewrite}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
