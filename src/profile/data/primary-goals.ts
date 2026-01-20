import { MessageSquare, Heart, TrendingUp, Award, type LucideIcon } from "lucide-react"

export interface PrimaryGoal {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
}

export const PRIMARY_GOALS: PrimaryGoal[] = [
  { id: "get-numbers", name: "Get Numbers", icon: MessageSquare, description: "Focus on collecting numbers and building contacts" },
  { id: "have-conversations", name: "Have Conversations", icon: Heart, description: "Build genuine connections and engaging dialogues" },
  { id: "build-confidence", name: "Build Confidence", icon: TrendingUp, description: "Overcome approach anxiety and social fears" },
  { id: "find-dates", name: "Find Dates", icon: Award, description: "Turn approaches into actual dates and relationships" },
];

export const GOAL_LABELS: Record<string, string> = {
  "get-numbers": "Get Numbers",
  "have-conversations": "Have Conversations",
  "build-confidence": "Build Confidence",
  "find-dates": "Find Dates",
};

export type PrimaryGoalId = typeof PRIMARY_GOALS[number]['id'];
