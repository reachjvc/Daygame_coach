import type { Archetype } from "../shared/archetypes";
import { DIFFICULTY_LEVELS, type DifficultyLevel } from "../shared/difficulty";
import { ENHANCED_OUTFITS, type OutfitCategory } from "../openers/outfits";

interface CareerOption {
  title: string;
  line: string;
  tease: string;
  pull: string;
}

export interface CareerScenarioContext {
  jobTitle: string;
  jobLine: string;
  outfitDescription: string;
  vibeDescription: string;
  responseIdeas: string[];
}

const CAREER_OPTIONS_BY_ARCHETYPE: Record<string, CareerOption[]> = {
  powerhouse: [
    {
      title: "product manager",
      line: "I'm a product manager at a fintech startup.",
      tease: "So you basically herd cats all day?",
      pull: "That kind of pressure is impressive.",
    },
    {
      title: "management consultant",
      line: "I work as a management consultant.",
      tease: "So you walk into boardrooms and give people tough love?",
      pull: "That takes confidence.",
    },
    {
      title: "corporate lawyer",
      line: "I'm a corporate lawyer.",
      tease: "So you argue for a living?",
      pull: "I like someone who can hold her ground.",
    },
    {
      title: "operations lead",
      line: "I'm an operations lead at a tech company.",
      tease: "So you're the reason everything actually works?",
      pull: "That's kind of attractive.",
    },
    {
      title: "finance analyst",
      line: "I'm a finance analyst.",
      tease: "So you date spreadsheets?",
      pull: "At least you're good with numbers.",
    },
  ],
  creative: [
    {
      title: "graphic designer",
      line: "I'm a graphic designer at a small studio.",
      tease: "So you get paid to be the taste police?",
      pull: "That sounds pretty creative though.",
    },
    {
      title: "photographer",
      line: "I'm a photographer.",
      tease: "So you see the world in a different frame?",
      pull: "I like that.",
    },
    {
      title: "art director",
      line: "I'm an art director at an agency.",
      tease: "So you're picky about everything?",
      pull: "I respect the vision.",
    },
    {
      title: "interior stylist",
      line: "I'm an interior stylist.",
      tease: "So you're judging my apartment already?",
      pull: "That's kind of cool though.",
    },
    {
      title: "content creator",
      line: "I make content for a living.",
      tease: "So your job is being on camera all day?",
      pull: "That takes confidence.",
    },
  ],
  athlete: [
    {
      title: "personal trainer",
      line: "I'm a personal trainer.",
      tease: "So you secretly judge everyone's form?",
      pull: "I respect disciplined energy.",
    },
    {
      title: "physio",
      line: "I'm a physiotherapist.",
      tease: "So you can tell who's injured just by looking?",
      pull: "That's impressive.",
    },
    {
      title: "strength coach",
      line: "I'm a strength coach.",
      tease: "So you're scary in a good way?",
      pull: "I like that drive.",
    },
    {
      title: "competitive athlete",
      line: "I compete professionally.",
      tease: "So you never skip a workout, huh?",
      pull: "That dedication is attractive.",
    },
    {
      title: "fitness instructor",
      line: "I'm a fitness instructor.",
      tease: "So you wake people up at 6am on purpose?",
      pull: "That's kind of impressive.",
    },
  ],
  intellectual: [
    {
      title: "data scientist",
      line: "I'm a data scientist.",
      tease: "So you turn chaos into charts?",
      pull: "That kind of brain is attractive.",
    },
    {
      title: "researcher",
      line: "I'm a researcher at a university.",
      tease: "So you ask why about everything?",
      pull: "I like curiosity.",
    },
    {
      title: "software engineer",
      line: "I'm a software engineer.",
      tease: "So you talk to computers more than humans?",
      pull: "I respect the focus though.",
    },
    {
      title: "policy analyst",
      line: "I work as a policy analyst.",
      tease: "So you read boring documents for fun?",
      pull: "That's actually impressive.",
    },
    {
      title: "editor",
      line: "I'm an editor.",
      tease: "So you judge everyone's grammar?",
      pull: "I like someone sharp.",
    },
  ],
  freeSpirit: [
    {
      title: "yoga instructor",
      line: "I'm a yoga instructor.",
      tease: "So you're always calm and zen?",
      pull: "I could use some of that energy.",
    },
    {
      title: "barista",
      line: "I work as a barista.",
      tease: "So you're basically my lifeline before 10am?",
      pull: "I appreciate a good coffee expert.",
    },
    {
      title: "event coordinator",
      line: "I'm an event coordinator.",
      tease: "So you make chaos look pretty?",
      pull: "That sounds fun though.",
    },
    {
      title: "wellness coach",
      line: "I'm a wellness coach.",
      tease: "So you're judging my sleep habits?",
      pull: "That sounds calming.",
    },
    {
      title: "community organizer",
      line: "I'm a community organizer.",
      tease: "So you're always bringing people together?",
      pull: "That's kind of attractive.",
    },
  ],
  traveler: [
    {
      title: "flight attendant",
      line: "I'm a flight attendant.",
      tease: "So you're never on the ground long enough to miss it?",
      pull: "That sounds exciting.",
    },
    {
      title: "travel writer",
      line: "I'm a travel writer.",
      tease: "So you get paid to wander?",
      pull: "That's a solid deal.",
    },
    {
      title: "tour guide",
      line: "I'm a tour guide.",
      tease: "So you tell stories for a living?",
      pull: "That sounds fun.",
    },
    {
      title: "language teacher",
      line: "I teach languages.",
      tease: "So you correct people's pronunciation all day?",
      pull: "That is pretty useful.",
    },
    {
      title: "remote marketer",
      line: "I'm a remote marketer for a travel company.",
      tease: "So you're basically a digital nomad?",
      pull: "That sounds free.",
    },
  ],
};

const CAREER_OPTIONS_BY_TONE: Record<Archetype["communicationStyle"]["tone"], CareerOption[]> = {
  professional: CAREER_OPTIONS_BY_ARCHETYPE.powerhouse,
  casual: CAREER_OPTIONS_BY_ARCHETYPE.freeSpirit,
  playful: CAREER_OPTIONS_BY_ARCHETYPE.traveler,
  intellectual: CAREER_OPTIONS_BY_ARCHETYPE.intellectual,
  warm: CAREER_OPTIONS_BY_ARCHETYPE.freeSpirit,
};

const DEFAULT_CAREER_OPTIONS: CareerOption[] = [
  {
    title: "marketing coordinator",
    line: "I work in marketing.",
    tease: "So you convince people to buy stuff for a living?",
    pull: "That is kind of impressive.",
  },
  {
    title: "software engineer",
    line: "I'm a software engineer.",
    tease: "So you can fix my laptop then?",
    pull: "That is useful.",
  },
  {
    title: "teacher",
    line: "I'm a teacher.",
    tease: "So you can spot mischief instantly?",
    pull: "That's a patient job.",
  },
];

const OUTFIT_CATEGORIES_BY_ARCHETYPE: Record<string, OutfitCategory[]> = {
  powerhouse: ["business", "smart_casual", "minimalist", "preppy"],
  creative: ["bohemian", "vintage", "edgy", "trendy"],
  athlete: ["athleisure", "sporty", "streetwear"],
  intellectual: ["smart_casual", "minimalist", "preppy"],
  freeSpirit: ["bohemian", "relaxed", "vintage"],
  traveler: ["casual", "streetwear", "relaxed", "smart_casual"],
};

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i);
  }
  return hash;
}

function pickDeterministic<T>(items: T[], seed: string): T {
  if (items.length === 0) {
    throw new Error("No items available to select from.");
  }
  const index = Math.abs(hashSeed(seed)) % items.length;
  return items[index];
}

function getCareerOptions(archetype: Archetype): CareerOption[] {
  return (
    CAREER_OPTIONS_BY_ARCHETYPE[archetype.id] ||
    CAREER_OPTIONS_BY_TONE[archetype.communicationStyle.tone] ||
    DEFAULT_CAREER_OPTIONS
  );
}

function getOutfitTier(difficulty: DifficultyLevel): "tier1" | "tier2" | "tier3" {
  if (difficulty === "beginner") return "tier1";
  if (difficulty === "intermediate" || difficulty === "advanced") return "tier2";
  return "tier3";
}

function pickOutfitDescription(
  archetype: Archetype,
  difficulty: DifficultyLevel,
  seed: string
): string {
  const categories = OUTFIT_CATEGORIES_BY_ARCHETYPE[archetype.id];
  const outfitPool = categories
    ? ENHANCED_OUTFITS.filter((outfit) => categories.includes(outfit.category))
    : ENHANCED_OUTFITS;
  const selectedOutfit = pickDeterministic(outfitPool.length ? outfitPool : ENHANCED_OUTFITS, seed);
  const tier = getOutfitTier(difficulty);
  const description = pickDeterministic(selectedOutfit[tier], `${seed}-${selectedOutfit.id}-${tier}`);
  return description;
}

function buildResponseIdeas(job: CareerOption): string[] {
  return [
    `Push/pull: "${job.tease} ${job.pull}"`,
    'Curious: "What got you into it in the first place?"',
    'Playful: "Be honest, do you ever switch off?"',
    'Relate: "That sounds intense. I am more of a work-to-live type."',
  ];
}

export function generateCareerScenario(
  archetype: Archetype,
  difficulty: DifficultyLevel,
  seed: string
): CareerScenarioContext {
  const job = pickDeterministic(getCareerOptions(archetype), `${seed}-job`);
  const outfitDescription = pickOutfitDescription(archetype, difficulty, `${seed}-outfit`);
  const vibeDescription = DIFFICULTY_LEVELS[difficulty].womanDescription.vibe;
  const responseIdeas = buildResponseIdeas(job);

  return {
    jobTitle: job.title,
    jobLine: job.line,
    outfitDescription,
    vibeDescription,
    responseIdeas,
  };
}

export function generateCareerScenarioIntro(context: CareerScenarioContext): string {
  const responseIdeas = context.responseIdeas.map((idea) => `- ${idea}`).join("\n");

  return `*You're already mid-conversation with her.*

She says: "${context.jobLine}"

She's ${context.outfitDescription}. Her vibe is ${context.vibeDescription}.

Your turn to respond. Try a push/pull on her job (tease or light challenge, then show genuine interest).

Response ideas:
${responseIdeas}`;
}
