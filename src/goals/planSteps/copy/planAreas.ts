// Generated from the private words file (the owner's pick of areas, 2026-11-18).
export const PLAN_AREAS = [
  {
    "id": "dating",
    "label": "Dating & Daygame",
    "covers": "Meeting women, dates, sex, a relationship",
    "standingPlaceholder": "Few dates; I freeze before I open",
    "northStarIdea": "I meet women easily and pick who I date",
    "color": "#f43f5e"
  },
  {
    "id": "health",
    "label": "Health & Appearance",
    "covers": "Body, training, sleep, food, looks, style",
    "standingPlaceholder": "Training again, still 10 kg too heavy",
    "northStarIdea": "Lean, strong, and I like the mirror",
    "color": "#22c55e"
  },
  {
    "id": "career",
    "label": "Career & Finances",
    "covers": "Work, income, savings, your next career step",
    "standingPlaceholder": "Job I don't rate, no savings yet",
    "northStarIdea": "Work I'm good at, no money worries",
    "color": "#f59e0b"
  },
  {
    "id": "social",
    "label": "Social Life",
    "covers": "Friends, new people, plans, your circle",
    "standingPlaceholder": "Two good friends, rarely see them",
    "northStarIdea": "A crew I see every week",
    "color": "#0ea5e9"
  },
  {
    "id": "growth",
    "label": "Personal Growth",
    "covers": "Learning, skills, books, discipline, staying calm",
    "standingPlaceholder": "Reading again, but I quit things fast",
    "northStarIdea": "I learn fast and finish what I start",
    "color": "#6366f1"
  },
  {
    "id": "feeling",
    "label": "Feeling about life",
    "covers": "How your life feels overall, over time",
    "standingPlaceholder": "Most weeks feel grey and the same",
    "northStarIdea": "Most days, my life feels great to me",
    "color": "#ec4899"
  },
  {
    "id": "lifestyle",
    "label": "Lifestyle",
    "covers": "Home, travel, fun, how your days run",
    "standingPlaceholder": "Messy flat, no trip in two years",
    "northStarIdea": "A clean place and a trip each quarter",
    "color": "#14b8a6"
  },
  {
    "id": "vices",
    "label": "Vices & Elimination",
    "covers": "Habits you're cutting: porn, nicotine, drink, scrolling",
    "standingPlaceholder": "Vaping daily, porn most nights",
    "northStarIdea": "Nothing I use runs my day",
    "color": "#a3a3a3"
  }
] as const

export const DEFAULT_RATING = {
  "id": "f_feeling",
  "areaId": "feeling",
  "question": "How great did life feel today?",
  "scale": 5,
  "lowLabel": "Rough",
  "highLabel": "Great"
} as const

export const areasSwitchCopy = {
  "action": "Switch this copy to your new areas",
  "help": "Goals and notes from the old twelve areas move into these eight.",
  "button": "Switch areas",
  "confirm_title": "Switch to the eight new areas?",
  "confirm_body": "Each goal and note moves with its old area into one of the eight. You can always take a fresh copy with Recopy my plan.",
  "confirm_yes": "Switch",
  "cancel": "Cancel",
  "working": "Switching…",
  "done_toast": "Done. This copy now has your eight areas."
} as const
