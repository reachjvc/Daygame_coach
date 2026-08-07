/**
 * The questions for the simple Life Mastery flow (/test/life-mastery).
 *
 * v2 — the first version put thirteen questions on one screen: the picture
 * (magician, perfect day, at 80), the reasons (cost of not, who else feels it)
 * and the person (identity, standards, who you become), all side by side. Three
 * different jobs, so every box read as a fresh blank page and nothing you wrote
 * fed anything else. It also opened with the hardest, most abstract question in
 * the set.
 *
 * This version is a ladder. One question per screen, concrete first, each one
 * a sentence opener you finish, and the answers assemble into your vision
 * paragraph in front of you. The abstract question ("take the limits off") is
 * last, when there is already material on the page to react to. The reasons
 * come after the picture. The person moved to step 3.
 *
 * VOICE RULES for every user-facing string, same as lifeMasteryIntake.ts:
 *   1. Say "you". Second person, direct.
 *   2. One idea per sentence. Short sentences.
 *   3. No em-dashes. Use a period, or "and", or a comma.
 *   4. No "X, not Y". Say the thing you mean and stop.
 *   5. Plain verbs. Write it out. Take the time. Ask yourself. Pick one.
 *   6. Warm, never clever. No aphorisms we invented.
 *   7. Verbatim source material goes in `quote` only, always with a videoId.
 */

/** One rung of the ladder. Six concrete ones, then the limits come off. */
export interface VisionRung {
  id: string
  /** The question, at the top of the screen. */
  question: string
  /** One line under it: what to write, and how much. */
  help: string
  /**
   * The sentence opener. Shown in front of the box, and used verbatim when
   * the answers are assembled, so the paragraph is only ever made of words
   * the user could see while they typed.
   */
  lead: string
  /** Continues the lead, so the shape of an answer needs no explaining. */
  placeholder: string
  /** A whole answer, on request. */
  example: string
  quote?: string
  quoteVideoId?: string
}

/**
 * How far out the picture sits.
 *
 * His vision horizon is 10, 20, 30 years and further, and he says so
 * repeatedly: goals are "a year or less" and the vision is "maybe 10 or 20 or
 * 30 years from now" (Kz83kMosOWU), "10 years out, 20 years out, 30, 40, 50"
 * and "totally unrealistic" (Rw2qaMltFcY). One year and three years are his
 * GOAL horizons, so framing the vision at three years quietly turned it into a
 * plan, and it fought the last rung, which asks for the limits to come off.
 *
 * The choice of 5, 10 or 20 is his own, from the perfect-day exercise below.
 */
export const HORIZON_CHOICES = [5, 10, 20] as const
export const DEFAULT_HORIZON = 10

export const HORIZON_WORDS: Record<number, string> = { 5: "Five", 10: "Ten", 20: "Twenty" }

/**
 * The first screen. The horizon was a caption above the first question, which
 * is not where a decision belongs: the whole ladder means something different
 * at five years than at twenty, and burying it made the change invisible.
 */
export const HORIZON_SCREEN = {
  question: "How far out is this picture?",
  help: "Pick the year you are writing about. Everything after this is one ordinary day inside that life.",
  options: [
    { years: 5, label: "Five years", note: "Close enough that you can nearly see it." },
    { years: 10, label: "Ten years", note: "His usual answer. Far enough out that anything is allowed." },
    { years: 20, label: "Twenty years", note: "A whole chapter. Hardest to picture, and it pulls the hardest." },
  ],
  /** Why the vision sits past your goals. */
  note: "Your goals live inside a year. Your vision sits a long way past them, and it is allowed to be unrealistic.",
  quote: "the goals are just milestones, they're just stepping stones that lead you to achieving a higher vision that you have for yourself that's maybe 10 or 20 or 30 years from now. So the goals are more short-term goals, typically a year or less. When you go beyond a year it becomes a lot harder to manage and measure",
  quoteVideoId: "Kz83kMosOWU",
  start: "Start",
}

export const HORIZON_QUOTE = {
  text: "the perfect day is really just one day, any day that you want for your life 5 10 20 years from now, of what your life would be like. If you could have one day any way that you want it to be, there's no limits to it whatsoever",
  videoId: "9RxHchflvVs",
}

export const VISION_RUNGS: VisionRung[] = [
  {
    id: "place",
    question: "Where do you wake up?",
    help: "Start with the room and what you can see out of the window.",
    lead: "I wake up in",
    placeholder: "a small house near the water, with the window open",
    example: "a small house near the water. The window is open and I can hear it from bed.",
  },
  {
    id: "people",
    question: "Who is there with you?",
    help: "The people in the house, and the people you see most weeks.",
    lead: "The people around me are",
    placeholder: "my partner and our two kids, and a few friends I actually see",
    example: "my partner and our two kids. I see my brother most weeks and there are three friends I would call at 2am.",
  },
  {
    id: "days",
    question: "What do you do with your days?",
    help: "Say what you are doing at 10am, and what the rest of the day looks like.",
    lead: "My days go into",
    placeholder: "the business, mornings on the hard thing, phone in another room",
    example: "the business. Mornings go on the hard thing with my phone in another room, and I am finished by four.",
    quote: "I want you to spend some time and journal and write it out hour by hour, from the time you'd wake up to the time you go to bed, what that perfect day would be",
    quoteVideoId: "9RxHchflvVs",
  },
  {
    id: "body",
    question: "What does your body feel like?",
    help: "How you feel standing up in the morning, and what you can do with it.",
    lead: "My body feels",
    placeholder: "strong. I train before the house is up",
    example: "strong and light. I train at six, and I can play football on a Sunday without paying for it all week.",
  },
  {
    id: "money",
    question: "What does money let you do?",
    help: "Say what it buys you in an ordinary week. Numbers are welcome if you have them.",
    lead: "Money means I can",
    placeholder: "stop counting at the till, and fly home whenever I want",
    example: "stop counting at the till. There is a year of costs in the bank and I fly home whenever I want to.",
  },
  {
    id: "fun",
    question: "What do you do that has nothing to do with work?",
    help: "The part people leave out. Play, travel, the thing you do because you like it.",
    lead: "Outside of work, I",
    placeholder: "surf on Tuesdays, and take one long trip a year",
    example: "surf on Tuesdays and play football on Fridays. One long trip a year with my oldest friends.",
  },
  {
    id: "limits",
    question: "Now take the limits off. What would you add if nothing was in the way?",
    help: "You have probably kept the answers above sensible. This one is supposed to be unrealistic, because its job is to pull you. Add what you left out because you thought you could not have it.",
    lead: "If nothing was in the way,",
    placeholder: "I would own the building, and take the whole summer off",
    example: "I would own the building. I would take the whole summer off with my family and put a boat in the water.",
    quote: "make sure that it's something that there's no limits by. If you think, oh, I can't afford that or whatever, you're already doubting yourself. Imagine as if there's no limits. If a magician were able to come along and create the perfect life for you, what would that be?",
    quoteVideoId: "8kco2rjijjE",
  },
]

export const VISION_RUNG_MAP = new Map(VISION_RUNGS.map((r) => [r.id, r]))

/** The screen after the ladder: your lines, assembled, yours to rewrite. */
export const VISION_DRAFT_SCREEN = {
  id: "vision",
  question: "This is your vision. Make it read like your life.",
  help: "Every line here came from an answer you wrote. Cut what is limp, join what belongs together, and say it in the present tense as though it is already true.",
  placeholder: "Your vision, in your words",
}

/** Two questions, one screen, after the picture is written. */
export interface WhyPrompt {
  id: string
  question: string
  help: string
  placeholder: string
  example: string
  quote?: string
  quoteVideoId?: string
}

export const WHY_PROMPTS: WhyPrompt[] = [
  {
    id: "why",
    question: "Why do you want this?",
    help: "This is your big why. The vision is where you are going and your why is what gets you moving on a day you would rather not. Write the noble reasons and write the selfish ones. Whichever one produces real feeling is the one that works.",
    placeholder: "Why you want it, and what having it would give you",
    example: "Because I want my kids to grow up watching me keep my word to myself. And because I am tired of being the person who only talks about it.",
    quote: "when you have a vision you got to ask yourself, well why do I want this, what reasons do I have to actually make this happen and follow through",
    quoteVideoId: "8kco2rjijjE",
  },
  {
    id: "cost",
    question: "What does it cost you if nothing changes?",
    help: "Five more years exactly like this one. Say what that takes from you. This is the reason that works on the days the first one does not.",
    placeholder: "What another five years of this takes from you",
    example: "Another five years and I am 42, still renting, still saying next year. And my dad is 77.",
    quote: "what's my life going to be like 5 years, 10 years from now if I don't take action? And even if you can exaggerate it, make it worse than it is, make it scarier than what it's going to be",
    quoteVideoId: "xw5RUrN4Eow",
  },
]

/**
 * Moved off step 1 in v2. Who you are is a different question from where you
 * are going, and mixing them was half of why the first screen felt like a
 * pile. These sit at the end of step 3, next to the goals they change.
 */
export const IDENTITY_PROMPTS: WhyPrompt[] = [
  {
    id: "identity",
    question: "Who are you committed to being?",
    help: "Write these as lines that start with I am. One per line.",
    placeholder: "I am…",
    example: "I am someone who does what I say I will do.\nI am a person people feel calmer around.\nI am an athlete.",
    quote: "just ask yourself, who am I, who would I want to be, who am I committed to being. If I were to look my name up in the dictionary, what would it say about me?",
    quoteVideoId: "8kco2rjijjE",
  },
  {
    id: "become",
    question: "Who do you need to become to have this?",
    help: "You attract what you are. Write the character, the skills and the habits that person has, because that is the part you can work on starting today.",
    placeholder: "Character, skills, habits",
    example: "Someone who finishes. Someone who can sell without feeling dirty about it. Someone who trains when it is boring.",
    quote: "who do I need to become in terms of character skill set focus self-discipline daily habits",
    quoteVideoId: "I1MhBE-0zxU",
  },
  {
    id: "conduct",
    question: "How are you committed to showing up?",
    help: "These are your standards. Identity is who you are and your standards are how that shows up in a room, on a bad day, and when nobody is checking.",
    placeholder: "To be…",
    example: "To be on time, always.\nTo be the calmest person in the argument.\nTo say the awkward thing rather than let it sit.",
    quote: "your code of conduct, and this is basically how you're committed to showing up. It's standards that you have for yourself, standards you have set to live your life by. To be fun, playful, outrageous. To be loving and caring. To be confident. To be passionate. To be grateful. To be disciplined.",
    quoteVideoId: "8kco2rjijjE",
  },
]

/** Every answer key the flow can store. Anything else is dropped on load. */
export const ANSWER_IDS: string[] = [
  ...VISION_RUNGS.map((r) => r.id),
  VISION_DRAFT_SCREEN.id,
  ...WHY_PROMPTS.map((p) => p.id),
  ...IDENTITY_PROMPTS.map((p) => p.id),
]

/** The two answers the rest of the flow leans on. */
export const CORE_WHY_IDS = ["vision", "why"]

/**
 * Step 3 asks the same question about one goal at a time, and nobody produces
 * more than three reasons from a single angle. These rotate.
 */
export const GOAL_WHY_ANGLES: Array<{ id: string; label: string; question: string }> = [
  { id: "daily", label: "The daily texture", question: "What is an ordinary Tuesday like once you have this? Name the small things." },
  { id: "identity", label: "Who you become", question: "Who are you once this is true, and what does that person do differently?" },
  { id: "cost", label: "The cost of not", question: "What does another five years without this take from you?" },
  { id: "others", label: "Who else feels it", question: "Who else's life is different because you did this?" },
  { id: "unlocks", label: "What it unlocks", question: "What becomes possible after this that is not possible now?" },
  { id: "proof", label: "The proof", question: "What would this prove to you. And to whom?" },
  { id: "feeling", label: "The feeling", question: "What do you get to stop feeling? What do you get to start feeling?" },
  { id: "body", label: "The body", question: "What does this give you physically. Energy, sleep, how you feel in your own skin?" },
]

/** The pain why, asked once per goal. His second flavour of reason. */
export const PAIN_WHY_QUESTION = "What will it cost you if you do not do this?"

/** Belief and desire both get a 0-10, and both have to clear 7. */
export const QUALIFY_THRESHOLD = 7
