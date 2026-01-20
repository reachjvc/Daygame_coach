export const EXPERIENCE_LEVELS = [
  { id: "complete-beginner", name: "Complete Beginner", description: "Never approached a woman on the street before" },
  { id: "newbie", name: "Newbie", description: "A few approaches, still very nervous" },
  { id: "intermediate", name: "Intermediate", description: "Comfortable approaching, working on conversations" },
  { id: "advanced", name: "Advanced", description: "Regularly get numbers, working on dates/pulls" },
  { id: "expert", name: "Expert", description: "Consistent results, refining my game" },
] as const;

export const EXPERIENCE_LABELS: Record<string, string> = {
  "complete-beginner": "Complete Beginner",
  "newbie": "Newbie",
  "intermediate": "Intermediate",
  "advanced": "Advanced",
  "expert": "Expert",
};

export type ExperienceLevelId = typeof EXPERIENCE_LEVELS[number]['id'];
