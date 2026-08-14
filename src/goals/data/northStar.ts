/**
 * The copy and the templates for the North Star flow (/test/life-mastery).
 *
 * Three tabs: the north star, your life (the areas, the goals in them and the
 * routines under all of it), then the review. Everything a user reads on that
 * page starts here, so the wording can be checked in one file instead of
 * hunted through the components.
 *
 * VOICE RULES for every user-facing string, same as lifeMasteryWhy.ts:
 *   1. Say "you". Second person, direct.
 *   2. One idea per sentence. Short sentences.
 *   3. No em-dashes. Use a period, or "and", or a comma.
 *   4. No "X, not Y". Say the thing you mean and stop.
 *   5. Plain verbs. Write it out. Take the time. Ask yourself. Pick one.
 *   6. Warm, never clever. No aphorisms we invented.
 */

import { LIFE_MASTERY_AREAS } from "./lifeMasteryAreas"
import type {
  NsArea,
  NsReviewPrompt,
  NorthStarTabId,
  RoutineBlueprint,
} from "../types"

export const NORTH_STAR_STORAGE_KEY = "north-star-v1"

/**
 * Four tabs, split by the question each one answers.
 *
 * "Where you are" and "Areas, routines & goals" were once the same screen twice
 * over, so they were merged. Merged, one screen carried the whole assessment
 * (the rating, the 10, the why, the identity, the values) AND every goal in
 * twelve areas, and the assessment work sat underneath a goal editor nobody
 * scrolled past. The split now runs along the honest line:
 *
 *   now  — where you stand, and what already runs underneath.
 *   plan — what you are going to do about it.
 */
export const TAB_ORDER: NorthStarTabId[] = ["star", "now", "plan", "review"]

export const TAB_LABELS: Record<NorthStarTabId, string> = {
  star: "North star",
  now: "Where you are",
  plan: "Your goals",
  review: "Review",
}

export const TAB_BLURBS: Record<NorthStarTabId, string> = {
  star: "The life you are aiming at, why it matters, and who you would have to be.",
  now: "Rate each area on the wheel, picture your 10, and say why it matters and who you are in it.",
  plan: "The goals aimed at each 10, and the routines running underneath them.",
  review: "Whether the goals point at your 10, and what has stopped you before.",
}

// ---------------------------------------------------------------- tab 1

/**
 * The one question the whole flow hangs off.
 *
 * It is asked as a picture of a person rather than a list of outcomes, because
 * "who are you" produces material that the identity and values work later can
 * actually use. The hint names the four areas so nobody writes a career plan
 * and calls it a life, and it gives explicit permission to be unrealistic,
 * which is the part people need said out loud.
 */
export const NORTH_STAR_SCREEN = {
  question: "Imagine an ideal future. Who are you? What do you do?",
  hint: "Consider health, wealth, relationships, and meaning or spirituality. Let this be bigger than what seems realistic, if that is what feels right to you. Its job is to pull you.",
  placeholder: "Write it in the present tense, as though you are already living it.",
  help: "Write it as one paragraph. Say where you wake up, who is around you, what your days go into, what your body feels like, and what you do that has nothing to do with work.",
  example:
    "I wake up in a small house near the water with my partner and our two kids. I train before the house is up and my body feels light. My days go into a business that earns well without owning my calendar, and I am finished by four. There is a year of costs in the bank and I stop counting at the till. I surf on Tuesdays and take one long trip a year with my oldest friends.",
}

/** Shown under the box once there is something in it. */
export const NORTH_STAR_REREAD =
  "Read this out loud once a day. That is the whole practice, and it is what keeps the rest of this page from going quiet in March."

/**
 * The work that sits under the paragraph.
 *
 * The paragraph says what you want. These say why it matters, who you would
 * have to be to hold it, and what you say to yourself in the meantime. They
 * live on this tab rather than in the review because they belong to the vision,
 * and because the reason is the thing you re-read in March.
 *
 * `become` and `identity_total` keep the ids they had while they were review
 * prompts, so anything already written under them still loads.
 */
export const STAR_WORK_INTRO = {
  title: "Under the paragraph",
  help: "The paragraph is what you want. This is why it matters, who you would have to be to hold it, and what would have to matter to you. Answer what you can today and come back to the rest.",
}

/**
 * The why has its own card, directly under the paragraph, so it is the one
 * star prompt the "answered" count on the card below does not include.
 */
export const STAR_WHY_ID = "star_why"

/**
 * The order is his, not ours.
 *
 * He groups four things and calls them the driving force: vision, purpose,
 * identity, code of conduct — read back weekly, "sometimes twice a week if I'm
 * down" (source video 8kco2rjijjE). The values list is read daily and sits
 * between the purpose and the identity, because it is derived from the vision
 * ("once you know your vision, you make the list: what are the values I need to
 * have to create that life") and because the identity is written out of it.
 *
 * So: paragraph → why → values → identity → standards → the gap → affirmations.
 *
 * `become` and `identity_total` keep the ids they were born with, and `conduct`
 * keeps the id it had while it lived on the review tab, so every answer already
 * written still loads.
 *
 * WHY `become` IS LAST AND NOT NEXT TO `identity_total`. They read as the same
 * question and they are not. "Who are you committed to being" is his verbatim
 * identity question, answered in the present tense and conditioned until it is
 * true. "Who do you need to become" never appears in the driving force; it
 * appears attached to an outcome — "who do you need to become to achieve that,
 * in terms of character, skill set, focus, self-discipline, daily habits"
 * (I1MhBE-0zxU). One is a declaration, the other is the gap between here and
 * there, and the gap is the handover into the plan. See
 * docs/research/life-mastery/values-and-identity.md.
 */
export const STAR_PROMPTS: NsReviewPrompt[] = [
  {
    id: STAR_WHY_ID,
    question: "Why is this important to you?",
    help: "This is the part you re-read on a day you do not feel like it, so it is worth more than the wording of the paragraph. Write the reasons that get you up. Then write what it costs you if you never get there.",
    placeholder: "This matters to me because…",
  },
  /**
   * The identity and the standards, and why they are two questions.
   *
   * They read as one question, and the page used to make that worse: both were
   * phrased "committed to", and both are lists of good qualities in the present
   * tense. He blurs it himself, saying of the STANDARDS list "this is who I'm
   * committed to being, this is the standards that I want to live my life by"
   * (8kco2rjijjE).
   *
   * The difference is real and it is visible in his own two lists:
   *
   *   Identity — a self-portrait. "I'm an extraordinarily loving man… I'm an
   *   amazing friend, son, brother, uncle, strategist, marketer, entrepreneur…
   *   I'm an athlete, bodybuilder and fitness model… I'm a Muay Thai fighter."
   *   Nouns as much as adjectives, long, rangy, and about what is TRUE of you.
   *   He conditions it weekly until it is: "when you condition that you start to
   *   become that."
   *
   *   Standards — a bar. "to be fun playful outrageous, to be loving and caring,
   *   to be confident… to be disciplined… to be outgoing social and friendly."
   *   Short by his own account, every line "to be", and the thing you can fall
   *   short of on a Tuesday and come back to.
   *
   * So: what is true of you, and what you hold yourself to. The questions say
   * that now, and each carries a few words of his own answer, because seeing "an
   * amazing friend, son, brother" beside "to be disciplined" settles it faster
   * than any explanation of the difference.
   */
  {
    id: "identity_total",
    question: "Who are you?",
    help: "Your identity, in the present tense, as lines that start with I am. Not who you will be once it works: who you are, read back every week until it is simply true. Put the roles in as well as the qualities. His way in: if you looked your own name up in the dictionary, what would it say about you?",
    placeholder: "I am…",
    example: "His: “I'm an extraordinarily loving man… I'm an amazing friend, son, brother, uncle… I'm an athlete, bodybuilder and fitness model.”",
    list: true,
  },
  {
    id: "conduct",
    question: "What do you hold yourself to?",
    help: "Your standards, and a different thing from the identity above. That one is what is true of you. This is the bar you set: what you can fall short of on a bad Tuesday and come back to. His own list is short and every line starts with to be.",
    placeholder: "To be…",
    example: "His: “to be fun, playful, outrageous. To be loving and caring. To be disciplined. To be outgoing, social and friendly.”",
    list: true,
  },
  {
    id: "become",
    question: "And who do you need to become to have all of this?",
    help: "A different question from the two above. Those are who you are. This is what the person in your paragraph has that you do not have yet: character, skills, focus, self-discipline, daily habits. Whatever you write here is what you go and work on.",
    placeholder: "Character, skills, focus, self-discipline, daily habits",
  },
  {
    id: "affirmations",
    question: "Your affirmations",
    help: "Short lines you say out loud, as though they are already true. Say them daily with your whole body. Reading them in your head does very little. These are the lines the manifestation routine asks you for.",
    placeholder: "One line each\nI am the kind of person who finishes what I start",
    list: true,
  },
]

// ------------------------------------------------------- the values procedure
//
// Not a chip row. The whole exercise, in his order (source video Lp_GOrM16Xc,
// written up in docs/research/life-mastery/values-and-identity.md):
//
//   1. What has been most important to you so far. This is the list that built
//      the life you already have, and asking for it is the diagnosis.
//   2. What would have to be important to create the life in the paragraph.
//   3. Order the second list, because "whatever number one is, everything else
//      is being filtered through that". Ordered by asking, one pair at a time,
//      "is it this one or this one".
//   4. Read the conflicts the order produces.
//
// Both lists accept anything typed. A word that names a thing rather than a
// feeling is not refused; it earns one follow-up question, because "our values
// are just emotions" and "family" or "money" is the means to one.

export const VALUES_INTRO = {
  title: "What matters to you",
  help: "A value is what you fall back on when two things you want will not both fit in the same day. Two lists: what has actually been driving you so far, then what that paragraph would need. They are rarely the same, and the difference is the point. You put them in order later, on the review, once you have seen where you stand.",
  minimum: 7,
  minimumNote: "Seven or more is a good list.",
  daily: "Write the finished list out and keep it somewhere you see it. Redo it every year or two.",
  /** Shown at the bottom of the elicitation half, saying where the rest is. */
  laterHint: "You order this list on the review, after you have rated your areas and written the values each one asks for.",
}

/**
 * Pass 1. His question, and the prompting he does around it.
 *
 * The question is verbatim: "I want you to ask yourself this question, what's
 * been most important to me in my life?" (Lp_GOrM16Xc). An earlier pass here
 * rewrote it, on the theory that it reads as a question about events. It does
 * read that way ON ITS OWN — and the fix is not a better question, because he
 * never asks it on its own. Within seconds of asking he does four things, and
 * all four are what makes it answerable:
 *
 *   1. "what's the first answer that comes up… just trust whatever comes up,
 *      don't think about it too much, don't overanalyze"  → `first`
 *   2. he reads a menu out loud, and it is the actual scaffolding: "security,
 *      has it been being safe, has it been happiness, has it been success, has
 *      it been money, has it been family, has it been love, has it been passion,
 *      has it been friends, has it been travel"           → `MENU`
 *   3. "what else has been important for you in life… and you're going to keep
 *      asking yourself that question, you're going to go deep"  → `again`
 *   4. "try to steer your focus and direction to the emotion, the core emotion
 *      that you've been after to experience"              → `emotion`
 *
 * Nobody produces a value cold. He knows that, and the menu plus the repeated
 * "what else" IS the method. The page asks his question and does his prompting.
 */
export const VALUES_PAST = {
  question: "What has been most important to you in your life?",
  help: "Write the first thing that comes up and do not think about it too hard. The first answer is the honest one. It is one word or a short phrase, not a story: what you have actually been chasing and protecting until now.",
  /** His spoken prompt, and the name of the group that carries his words. */
  first: "Has it been…",
  /** Asked again after every answer. The repetition is the exercise. */
  again: "And what else has been important to you?",
  againNote: "Keep going until nothing else comes up. Most people have more than they think.",
  emotion: "If you write something like family, money or your business, steer it toward the feeling underneath. That is the value.",
  placeholder: "Type whatever comes up first and press enter",
}

/**
 * His menu, in his order, spoken as "has it been X?" while the viewer writes.
 * These come first in the suggestion row on the past list, because they are the
 * prompt rather than our idea of a good starting set.
 *
 * Two words are his spoken form said the library's way: "being safe" is Safety
 * and "friends" is Friendship. Same value either way, and shipping two words for
 * one thing means somebody adds both and then ranks them against each other.
 */
export const VALUES_PAST_MENU = [
  "Security", "Safety", "Happiness", "Success", "Money", "Family", "Love", "Passion", "Friendship", "Travel",
]

export const VALUES_NEEDED = {
  question: "What do your values need to be to create the life you want?",
  /** Names the group of words read back out of the user's own writing. */
  lead: "From your paragraph",
  help: "Read your paragraph again, then answer this. Same shape: one word or a short phrase each. Some of them are already on the list above. The ones that are not are what has to change.",
  placeholder: "Type whatever the paragraph asks of you and press enter",
}

/**
 * The browse panel under both lists, and inside an area.
 *
 * The search box adds as well as filters. Somebody looking for "enjoyment" and
 * not finding it was told "type it in the box above", which is one instruction
 * too many at exactly the wrong moment: they are already typing, in a box, and
 * the box they are typing in did nothing with the word. So a word that is not on
 * the list turns into a button that adds it.
 */
export const VALUES_BROWSE = {
  more: (n: number) => `Show all ${n} values`,
  search: "Search, or type a value of your own",
  add: (q: string) => `Add “${q}”`,
  addNote: "Not on our list is not a problem. Your word is the one that counts.",
  none: "Nothing matches that.",
  note: "Words to pick from, grouped. Anything you type counts the same.",
}

/** Said under the two lists once both have something in them. */
export const VALUES_DIFF = {
  added: "New here, and not something you have been living by:",
  dropped: "You have been living by these and left them off:",
  droppedNote: "That is often the right call. Just worth seeing once.",
}

export const VALUES_ORDER = {
  title: "Put your values in order",
  question: "Now put them in order",
  help: "Whatever is number one, everything else gets filtered through it. Order them by answering one pair at a time.",
  duel: "Which of these two is more important to you?",
  duelNote: "There is no right answer, and you can redo this whenever you like.",
  start: "Order them, one pair at a time",
  restart: "Order them again",
  done: "That is the order.",
  manual: "Or move one directly with the arrows.",
  /** Shown when the ordering half has no list to work on yet. */
  empty: "Nothing to order yet. Write your values on the north star tab first, and the values each area asks for as you rate them.",
  /** Above the list, naming where the pool came from. */
  pooled: "Everything you have written: the whole-life list, plus the values each area and each goal asked for.",
  pull: "add the ones I wrote per area",
}

/**
 * The means-to-ends drill.
 *
 * "Often when someone says they value family, which is great, what is the
 * emotion that you're really after? Because at the core of it our values are
 * just emotions… if you say it's money, then what are you really after money
 * for?" It is offered on any item, never enforced, and the typed word is kept
 * whatever the answer, because being wrong about this costs nothing and being
 * told you typed the wrong kind of word costs the exercise.
 */
export const VALUES_MEANS = {
  question: (item: string) => `What is the feeling you are really after from ${item.toLowerCase()}?`,
  help: "Underneath most values there is an emotion. With money, the value is what the money is for. Same with family, a business, a body. Write the feeling and the list gets easier to use.",
  keep: "keep both",
  replace: "replace it",
  skip: "it is already the feeling",
  hint: "worth a second look",
}

/**
 * The ends values: emotional states rather than the things that produce them.
 *
 * Used for two jobs, both advisory. Anything on this list is left alone by the
 * means drill, and anything typed that is not on it gets offered the drill once.
 * A long list on purpose, because a false "worth a second look" on somebody's
 * real value is more annoying than a missed one.
 */
export const VALUE_ENDS_WORDS = [
  "love", "happiness", "happy", "joy", "joyful", "freedom", "free", "peace", "peaceful", "calm",
  "growth", "learning", "mastery", "progress", "adventure", "excitement", "passion", "fun", "play",
  "playfulness", "connection", "intimacy", "belonging", "significance", "certainty", "security",
  "safety", "confidence", "courage", "strength", "vitality", "energy", "health", "wellbeing",
  "gratitude", "abundance", "generosity", "contribution", "service", "impact", "purpose", "meaning",
  "faith", "spirituality", "presence", "integrity", "honesty", "authenticity", "trust", "respect",
  "discipline", "consistency", "responsibility", "achievement", "success", "excellence", "beauty",
  "creativity", "curiosity", "wisdom", "clarity", "focus", "fulfilment", "fulfillment", "kindness",
  "compassion", "humility", "loyalty", "leadership", "independence", "autonomy", "legacy", "pride",
  "acceptance", "forgiveness", "patience", "resilience", "optimism", "hope", "wonder", "flow",
]

/**
 * The conflicts he names, each one a means value ranked above the end it was
 * supposed to serve. Checked against the user's own order and only ever raised
 * when both words are actually on the list, in that order.
 *
 * `above` is the one ranked higher, `below` the one it is crowding out. Matching
 * is on whole words against either, so "financial success" trips the success row.
 */
export const VALUE_CONFLICTS: Array<{ above: string[]; below: string[]; note: string }> = [
  {
    above: ["success", "achievement", "money", "wealth", "business", "career", "ambition"],
    below: ["happiness", "happy", "joy", "fulfilment", "fulfillment", "peace"],
    note: "With success above happiness you only let yourself feel good once you are winning, and the bar keeps moving. He lived that way for years and says it is the thing he would change first.",
  },
  {
    above: ["fitness", "physique", "aesthetics", "performance"],
    below: ["health", "vitality", "energy", "wellbeing", "longevity"],
    note: "He put fitness above health for a while, did two fitness competitions, and was the most ripped and the least healthy he has ever been. Fitness is what your body can do today. Health is whether it is still there in twenty years.",
  },
  {
    above: ["business", "work", "career", "money", "wealth", "success"],
    below: ["love", "family", "connection", "intimacy", "relationship", "friendship"],
    note: "Work is sitting above the people. His version of this: if you check email first thing in the morning, you are valuing the business above everything else on the list.",
  },
]

/**
 * Value words we can read out of what the user has already written.
 *
 * The suggestion row used to be twenty words we picked. Somebody who has just
 * written a paragraph about waking up near the water with their kids should be
 * offered freedom and family off their own page, not off ours. Each entry is a
 * value and the words in their own writing that imply it.
 */
export const VALUE_CUES: Array<{ value: string; cues: string[] }> = [
  { value: "Freedom", cues: ["freedom", "free", "own terms", "nobody tells me", "anywhere", "my own hours", "my calendar", "independent"] },
  { value: "Family", cues: ["family", "kids", "children", "my son", "my daughter", "wife", "husband", "partner", "parents"] },
  { value: "Love", cues: ["love", "loving", "in love", "affection", "adore"] },
  { value: "Health", cues: ["health", "healthy", "energy", "vitality", "sleep", "well", "illness", "longevity"] },
  { value: "Fitness", cues: ["fit", "fitness", "strong", "strength", "train", "training", "gym", "lift", "muscle", "body fat"] },
  { value: "Adventure", cues: ["adventure", "travel", "trip", "explore", "surf", "mountain", "abroad", "the world"] },
  { value: "Growth", cues: ["grow", "growth", "learn", "learning", "better", "improve", "read", "study", "master"] },
  { value: "Contribution", cues: ["give", "giving", "help", "serve", "service", "impact", "difference", "charity", "volunteer", "teach"] },
  { value: "Abundance", cues: ["abundance", "abundant", "plenty", "generous", "never worry about money", "stop counting"] },
  { value: "Security", cues: ["security", "secure", "safe", "stable", "in the bank", "savings", "runway", "protected"] },
  { value: "Peace", cues: ["peace", "peaceful", "calm", "quiet", "still", "unhurried", "no rush"] },
  { value: "Fun", cues: ["fun", "play", "laugh", "silly", "enjoy", "playful"] },
  { value: "Creativity", cues: ["create", "creative", "build", "make", "write", "design", "art"] },
  { value: "Connection", cues: ["friends", "friendship", "community", "people around", "belong", "together", "close"] },
  { value: "Faith", cues: ["god", "faith", "spiritual", "prayer", "pray", "creator", "soul", "meditat"] },
  { value: "Discipline", cues: ["discipline", "disciplined", "consistent", "every day", "never miss", "habit", "routine"] },
  { value: "Confidence", cues: ["confident", "confidence", "certain", "sure of myself", "self-belief"] },
  { value: "Achievement", cues: ["achieve", "achievement", "win", "best", "top", "prove", "goal"] },
  { value: "Presence", cues: ["present", "presence", "in the moment", "attention", "phone down"] },
  { value: "Gratitude", cues: ["grateful", "gratitude", "thankful", "appreciate"] },
]

/** The ladder, for anyone who cannot start from a blank paragraph. */
export const LADDER_INTRO = {
  title: "Stuck on the blank box?",
  help: "Answer these one at a time and your paragraph assembles itself underneath. Nothing appears in it that you did not write.",
  assemble: "Use these as my north star",
}

// ---------------------------------------------------------------- tab 2

/**
 * The four areas the flow opens with.
 *
 * Colours come from the wheel palette that was validated as a set (colour-vision
 * separation plus contrast on the dark surface). Green, amber, rose and violet
 * sit far apart in that set, and identity is carried by the direct labels and
 * the sector gaps as well as by colour.
 */
/**
 * The twelve areas of life, from the Blueprint taxonomy in `lifeMasteryAreas.ts`.
 *
 * Derived rather than retyped, so the labels, the sub-labels and the palette
 * (validated as a set for colour-vision separation and contrast on the dark
 * surface) have exactly one home. Health and Fitness are separate, and so are
 * Family and Friends, because they fail independently: a strong body with no
 * energy, or a close family and no friends, are different problems.
 *
 * They stay editable. Rename any of them, drop the ones you are not working on,
 * add your own.
 */
export const DEFAULT_AREAS: NsArea[] = LIFE_MASTERY_AREAS.map((a) => ({
  id: a.id,
  label: a.label,
  sublabel: a.sublabel,
  color: a.color,
  custom: false,
}))

/**
 * Colours for areas the user adds. Same validated palette, in an order that
 * keeps the near-miss pairs apart as the wheel grows.
 */
export const AREA_COLOR_POOL = ["#0ea5e9", "#14b8a6", "#ec4899", "#84cc16", "#6366f1", "#f97316", "#eab308", "#a855f7"]

/**
 * Which framework library an area browses for its common goals.
 *
 * Read off each Blueprint area's own `pillarIds`, first one wins, so the two
 * taxonomies are joined in one place instead of by a hand-typed table that
 * would drift. An area the user added has no entry and picks a library by hand.
 */
export const AREA_LIBRARY_PILLAR: Record<string, string> = Object.fromEntries(
  LIFE_MASTERY_AREAS.filter((a) => a.pillarIds.length > 0).map((a) => [a.id, a.pillarIds[0]]),
)

export const LIBRARY_COPY = {
  title: "Common goals",
  help: "Pick from the ones people actually set in this area. Each one arrives with its numbers and its shape already filled in, and everything stays editable.",
  templateTitle: "Or take a whole set",
  templateHelp: "A template turns on several goals at once, sized to where you are starting from. Nothing is locked; remove any of them afterwards.",
  levelHelp: "Pick the level that matches where you are today, and the numbers come in at that size.",
  pillarPrompt: "This is your own area, so pick the library that fits it best.",
  added: "already added",
  /** The peek controls, in place of the disclosures these used to be. */
  more: (n: number) => `Show all ${n} goals`,
  moreSets: (n: number) => `Show all ${n} sets`,
  sets: (n: number) => `${n} sets`,
}

/** Suggestions for a new area, so the button is not another blank box. */
export const AREA_SUGGESTIONS = ["Fun & adventure", "Mind & learning", "Emotions", "Home & environment", "Craft", "Contribution"]

export const AREAS_INTRO = {
  title: "The parts of your life",
  /** Shown while the Edit toggle is on. */
  help: "Rename them, add your own, and remove the ones you are not working on. Removing an area moves its goals rather than deleting them.",
  /** Shown the rest of the time, when this is a picture rather than a form. */
  resting: "The twelve areas of life. The fill is how you rated each one. Press Edit to rename them or add your own.",
  wheelHint: "The fill is your latest rating, once you have made one.",
}

export const ROUTINES_INTRO = {
  title: "What runs underneath",
  /** Shown while the Edit toggle is on. */
  help: "Open one and cut what is not yours. Editing something down is far easier than writing it from nothing.",
  /** Shown the rest of the time. */
  resting: "Your ordinary Tuesday, whether you feel like it or not.",
  /** Beside the goals wheel, where the four live. */
  beside: "The part of the plan that runs whether or not you open this page. Click one to build it.",
}

/**
 * The routine templates.
 *
 * Morning, night and manifestation are sequences: an ordered stack you walk top
 * to bottom, sized in minutes. Workouts, work and social are weekly: a set of
 * habits each with its own days per week. The split designer belongs only to
 * the workout routine.
 */
export const ROUTINE_BLUEPRINTS: RoutineBlueprint[] = [
  {
    id: "morning",
    label: "Morning routine",
    kind: "sequence",
    why: "How you start the day decides how the day goes. Win the first hour and the rest argues with you less.",
    areaSeedId: null,
    servesAreaIds: ["lm_mindset", "lm_emotions", "lm_health", "lm_spirituality"],
    daysPerWeek: 7,
    split: false,
    defaultStepIds: ["water", "bed", "star", "gratitude", "breath", "plan"],
    defaultSplitId: null,
    presets: [
      { id: "15", label: "15 min", note: "The floor. Small enough that you still win it on a bad morning.", stepIds: ["water", "bed", "star", "gratitude", "breath", "plan"] },
      { id: "30", label: "30 min", note: "Adds sitting still and writing it down.", stepIds: ["water", "bed", "star", "gratitude", "meditate", "journal", "plan"] },
      { id: "60", label: "60 min", note: "Adds moving your body and reading.", stepIds: ["water", "bed", "star", "gratitude", "meditate", "move", "read", "journal", "plan"] },
      {
        id: "full",
        label: "The full ritual",
        // The hour as taught, in its documented order (source video PliFBr__T7Y:
        // smile, stretch, breathe, water, rebounder, incantations, empowering
        // questions, driving force, ten pages, RPM plan). "Rebounder" is written
        // as plain movement because almost nobody owns one.
        note: "The whole hour, in the order the program teaches it. Nothing added, nothing reordered.",
        stepIds: ["smile", "stretch", "breath", "water", "move", "incantations", "questions", "driving-force", "read", "plan"],
      },
    ],
    library: [
      { id: "smile", title: "Smile, before you are even out of bed", minutes: 1, daysPerWeek: 7, dimension: "spirit" },
      { id: "stretch", title: "Stretch while you are still lying down", minutes: 2, daysPerWeek: 7, dimension: "body" },
      { id: "water", title: "Big glass of water", minutes: 1, daysPerWeek: 7, dimension: "body" },
      { id: "bed", title: "Make your bed", minutes: 2, daysPerWeek: 7, dimension: "body" },
      { id: "star", title: "Read your north star out loud", minutes: 2, daysPerWeek: 7, dimension: "spirit" },
      { id: "driving-force", title: "Read your driving force. Vision, purpose, identity, standards, values", minutes: 5, daysPerWeek: 7, dimension: "spirit" },
      { id: "questions", title: "Ask yourself what you are happy, proud and grateful for", minutes: 5, daysPerWeek: 7, dimension: "mind" },
      { id: "incantations", title: "Speak your incantations out loud, with your whole body", minutes: 5, daysPerWeek: 7, dimension: "spirit" },
      { id: "gratitude", title: "Write three gratitudes", minutes: 3, daysPerWeek: 7, dimension: "spirit" },
      { id: "breath", title: "Breathwork", minutes: 5, daysPerWeek: 7, dimension: "body" },
      { id: "meditate", title: "Meditate", minutes: 10, daysPerWeek: 7, dimension: "spirit" },
      { id: "move", title: "Move. Stretch, walk, or a quick workout", minutes: 10, daysPerWeek: 6, dimension: "body" },
      { id: "read", title: "Read ten pages", minutes: 15, daysPerWeek: 6, dimension: "mind" },
      { id: "journal", title: "Journal", minutes: 5, daysPerWeek: 7, dimension: "mind" },
      { id: "plan", title: "Plan the day. Pick the three that matter", minutes: 5, daysPerWeek: 7, dimension: "mind" },
      { id: "cold", title: "Cold shower finish", minutes: 3, daysPerWeek: 5, dimension: "body" },
      { id: "sun", title: "Daylight on your face", minutes: 10, daysPerWeek: 7, dimension: "body" },
      { id: "nophone", title: "No phone for the first thirty minutes", minutes: 1, daysPerWeek: 7, dimension: "mind" },
    ],
  },
  {
    id: "night",
    label: "Evening routine",
    kind: "sequence",
    why: "Good days are set up the night before. Wind down, reset the room, protect your sleep.",
    areaSeedId: "lm_health",
    servesAreaIds: ["lm_mindset", "lm_emotions"],
    daysPerWeek: 7,
    split: false,
    defaultStepIds: ["tomorrow", "cleanup", "screens", "good-thing"],
    defaultSplitId: null,
    presets: [
      { id: "15", label: "15 min", note: "The floor. Tomorrow decided, the room reset.", stepIds: ["tomorrow", "cleanup", "screens", "good-thing"] },
      { id: "30", label: "30 min", note: "Adds the wind-down and something to read.", stepIds: ["tomorrow", "cleanup", "screens", "layout", "stretch", "good-thing", "read-bed"] },
      { id: "60", label: "60 min", note: "Adds looking back at the day and a fixed bedtime.", stepIds: ["tomorrow", "cleanup", "screens", "layout", "stretch", "reflect", "good-thing", "read-bed", "bedtime"] },
    ],
    library: [
      { id: "tomorrow", title: "Write down tomorrow's one important thing", minutes: 3, daysPerWeek: 7, dimension: "mind" },
      { id: "cleanup", title: "Ten minute reset of the space", minutes: 10, daysPerWeek: 7, dimension: "body" },
      { id: "screens", title: "Screens off an hour before bed", minutes: 1, daysPerWeek: 7, dimension: "mind" },
      { id: "layout", title: "Lay out clothes and gym bag", minutes: 3, daysPerWeek: 6, dimension: "body" },
      { id: "stretch", title: "Wind down stretch", minutes: 5, daysPerWeek: 6, dimension: "body" },
      { id: "reflect", title: "Two lines on how the day went", minutes: 5, daysPerWeek: 7, dimension: "mind" },
      { id: "good-thing", title: "One good thing about today", minutes: 2, daysPerWeek: 7, dimension: "spirit" },
      { id: "read-bed", title: "Read in bed", minutes: 15, daysPerWeek: 6, dimension: "mind" },
      { id: "bedtime", title: "Same bedtime", minutes: 1, daysPerWeek: 7, dimension: "body" },
      { id: "gratitude-night", title: "Say thank you for one person", minutes: 2, daysPerWeek: 7, dimension: "spirit" },
    ],
  },
  {
    id: "manifestation",
    label: "Manifestation routine",
    kind: "sequence",
    why: "Your north star is only worth writing if you keep meeting it. This is the routine that puts it back in front of you and makes you feel it.",
    areaSeedId: "lm_spirituality",
    servesAreaIds: ["lm_mindset", "lm_emotions", "lm_mission"],
    daysPerWeek: 7,
    split: false,
    defaultStepIds: ["read-star", "see-scene", "incantations", "act-as-if"],
    defaultSplitId: null,
    presets: [
      { id: "15", label: "15 min", note: "Read it, see it, say it, act on it once today.", stepIds: ["read-star", "see-scene", "incantations", "act-as-if"] },
      { id: "30", label: "30 min", note: "Adds feeling it and saying who you are.", stepIds: ["read-star", "see-scene", "feel-it", "incantations", "identity-lines", "act-as-if"] },
      { id: "60", label: "60 min", note: "Adds gratitude you sit with and the why under a goal.", stepIds: ["read-star", "see-scene", "feel-it", "incantations", "identity-lines", "gratitude-deep", "why-read", "act-as-if"] },
    ],
    library: [
      { id: "read-star", title: "Read your north star out loud", minutes: 3, daysPerWeek: 7, dimension: "spirit" },
      { id: "see-scene", title: "Close your eyes and see one scene from it", minutes: 5, daysPerWeek: 7, dimension: "spirit" },
      { id: "feel-it", title: "Feel it as though it already happened", minutes: 5, daysPerWeek: 7, dimension: "spirit" },
      { id: "incantations", title: "Speak your incantations out loud, with your whole body", minutes: 5, daysPerWeek: 7, dimension: "spirit" },
      { id: "identity-lines", title: "Say your identity lines. The ones that start with I am", minutes: 3, daysPerWeek: 7, dimension: "mind" },
      { id: "why-read", title: "Re-read the why under one goal", minutes: 3, daysPerWeek: 7, dimension: "mind" },
      { id: "gratitude-deep", title: "Sit with three things you are grateful for until you feel them", minutes: 5, daysPerWeek: 7, dimension: "spirit" },
      { id: "act-as-if", title: "Pick one thing that person would do today, and do it", minutes: 2, daysPerWeek: 7, dimension: "mind" },
      { id: "future-letter", title: "Write two lines from the version of you who already has it", minutes: 5, daysPerWeek: 3, dimension: "mind" },
      { id: "visual-board", title: "Look at your pictures of it", minutes: 3, daysPerWeek: 7, dimension: "spirit" },
    ],
  },
  {
    id: "workout",
    label: "Training week",
    kind: "weekly",
    why: "A body you are proud of is built from sessions you do not skip. Name the days and the week stops being a decision.",
    areaSeedId: "lm_fitness",
    servesAreaIds: ["lm_health", "lm_emotions"],
    daysPerWeek: 4,
    split: true,
    defaultStepIds: ["strength", "cardio", "mobility"],
    defaultSplitId: "fullbody",
    presets: [
      { id: "three", label: "3 days", note: "Full body three times. The one that survives an unpredictable week.", stepIds: ["strength", "steps", "mobility"] },
      { id: "four", label: "4 days", note: "Lifting four times with cardio alongside it.", stepIds: ["strength", "cardio", "steps", "mobility"] },
      { id: "six", label: "6 days", note: "For a season where training is the priority.", stepIds: ["strength", "cardio", "steps", "mobility", "sport", "protein"] },
    ],
    library: [
      { id: "strength", title: "Strength session", minutes: 60, daysPerWeek: 3, dimension: "body" },
      { id: "cardio", title: "Cardio. Run, bike or swim", minutes: 40, daysPerWeek: 2, dimension: "body" },
      { id: "steps", title: "Ten thousand steps", minutes: 60, daysPerWeek: 6, dimension: "body" },
      { id: "mobility", title: "Mobility and stretching", minutes: 10, daysPerWeek: 4, dimension: "body" },
      { id: "protein", title: "Hit your protein target", minutes: 5, daysPerWeek: 7, dimension: "body" },
      { id: "sport", title: "Play a sport", minutes: 90, daysPerWeek: 1, dimension: "body" },
      { id: "weigh", title: "Morning weigh-in", minutes: 1, daysPerWeek: 7, dimension: "body" },
    ],
  },
  {
    id: "work",
    label: "Business routine",
    kind: "weekly",
    why: "Output compounds from a few protected habits. Everything else is noise with a calendar invite.",
    areaSeedId: "lm_mission",
    servesAreaIds: ["lm_money", "lm_mindset"],
    daysPerWeek: 5,
    split: false,
    defaultStepIds: ["mit", "deep", "shutdown"],
    defaultSplitId: null,
    presets: [
      { id: "light", label: "Light", note: "One thing that matters, and a clean finish.", stepIds: ["mit", "shutdown"] },
      { id: "standard", label: "Standard", note: "Adds a protected block and a weekly look back.", stepIds: ["mit", "deep", "shutdown", "weekly-review"] },
      { id: "deep", label: "Deep", note: "For a season where the work is the point.", stepIds: ["mit", "deep", "shutdown", "weekly-review", "craft", "ship", "no-social", "money-day"] },
    ],
    library: [
      { id: "mit", title: "One most important task, done first", minutes: 90, daysPerWeek: 5, dimension: "mind" },
      { id: "deep", title: "Ninety minutes of deep work", minutes: 90, daysPerWeek: 5, dimension: "mind" },
      { id: "shutdown", title: "Daily shutdown. Clear the inbox, plan tomorrow", minutes: 15, daysPerWeek: 5, dimension: "mind" },
      { id: "money-day", title: "Thirty minutes with your numbers, same day each week", minutes: 30, daysPerWeek: 1, dimension: "mind" },
      { id: "weekly-review", title: "Weekly review", minutes: 30, daysPerWeek: 1, dimension: "mind" },
      { id: "craft", title: "Sharpen your craft", minutes: 30, daysPerWeek: 3, dimension: "mind" },
      { id: "ship", title: "Ship one visible thing", minutes: 60, daysPerWeek: 2, dimension: "mind" },
      { id: "no-social", title: "No social media before noon", minutes: 1, daysPerWeek: 5, dimension: "mind" },
    ],
  },
  {
    /**
     * The one that is made of things you do NOT do.
     *
     * Every other routine here adds something to the week. This one takes
     * something out, and it is usually the faster lift: dropping one thing moves
     * mind, emotions, health and money at once, which is exactly the shape the
     * season-focus question is looking for. Each line is a day you stay clean of
     * it, so seven days a week is the line held all week.
     */
    id: "vices",
    label: "Vices",
    kind: "weekly",
    why: "The fastest way to lift four areas at once is usually to stop doing one thing. Name what you are quitting and how many days a week you hold it.",
    areaSeedId: "lm_mindset",
    servesAreaIds: ["lm_health", "lm_emotions", "lm_spirituality"],
    daysPerWeek: 7,
    split: false,
    defaultStepIds: ["no-phone-bed", "no-scroll-am"],
    defaultSplitId: null,
    presets: [
      { id: "screens", label: "Screens", note: "The phone ones. Start here if you are not sure.", stepIds: ["no-phone-bed", "no-scroll-am", "no-social-noon"] },
      { id: "substances", label: "Substances", note: "Drink, smoke, weed.", stepIds: ["no-drink-week", "no-smoke", "no-weed"] },
      { id: "hard", label: "The hard reset", note: "For a season where the point is to stop.", stepIds: ["no-porn", "no-drink-week", "no-scroll-am", "no-phone-bed", "no-junk", "no-gaming-week"] },
    ],
    library: [
      { id: "no-phone-bed", title: "No phone in bed", minutes: 0, daysPerWeek: 7, dimension: "mind" },
      { id: "no-scroll-am", title: "No scrolling in the first hour", minutes: 0, daysPerWeek: 7, dimension: "mind" },
      { id: "no-social-noon", title: "No social media before noon", minutes: 0, daysPerWeek: 5, dimension: "mind" },
      { id: "no-porn", title: "No porn", minutes: 0, daysPerWeek: 7, dimension: "spirit" },
      { id: "no-drink-week", title: "No drinking on weeknights", minutes: 0, daysPerWeek: 5, dimension: "body" },
      { id: "no-smoke", title: "No smoking or vaping", minutes: 0, daysPerWeek: 7, dimension: "body" },
      { id: "no-weed", title: "No weed", minutes: 0, daysPerWeek: 7, dimension: "body" },
      { id: "no-junk", title: "No junk food", minutes: 0, daysPerWeek: 6, dimension: "body" },
      { id: "no-gaming-week", title: "No gaming on weeknights", minutes: 0, daysPerWeek: 5, dimension: "mind" },
      { id: "no-gambling", title: "No betting", minutes: 0, daysPerWeek: 7, dimension: "mind" },
      { id: "no-spend", title: "Nothing bought on impulse", minutes: 0, daysPerWeek: 7, dimension: "mind" },
      { id: "no-snooze", title: "No snooze button", minutes: 0, daysPerWeek: 7, dimension: "body" },
    ],
  },
  {
    id: "social",
    label: "People routine",
    kind: "weekly",
    why: "Relationships compound like money, on small consistent deposits. Nobody drifts into a good one.",
    areaSeedId: "lm_friends",
    servesAreaIds: ["lm_family", "lm_relationship", "lm_fun"],
    daysPerWeek: 4,
    split: false,
    defaultStepIds: ["reach-out", "family-call", "plan-social"],
    defaultSplitId: null,
    presets: [
      { id: "light", label: "Light", note: "One friend and one call home. Hard to fail.", stepIds: ["reach-out", "family-call"] },
      { id: "standard", label: "Standard", note: "Adds something in the diary and a word said out loud.", stepIds: ["reach-out", "family-call", "plan-social", "compliment"] },
      { id: "full", label: "Full", note: "For a season where the people are the priority.", stepIds: ["reach-out", "family-call", "plan-social", "compliment", "date", "host", "voice-note"] },
    ],
    library: [
      { id: "reach-out", title: "Reach out to one friend", minutes: 10, daysPerWeek: 3, dimension: "spirit" },
      { id: "family-call", title: "Call family with no agenda", minutes: 20, daysPerWeek: 1, dimension: "spirit" },
      { id: "date", title: "Go on, or plan, a date", minutes: 120, daysPerWeek: 1, dimension: "spirit" },
      { id: "host", title: "Invite someone over", minutes: 120, daysPerWeek: 1, dimension: "spirit" },
      { id: "compliment", title: "Give one genuine compliment", minutes: 1, daysPerWeek: 5, dimension: "spirit" },
      { id: "plan-social", title: "Put one social thing in the diary", minutes: 10, daysPerWeek: 1, dimension: "mind" },
      { id: "voice-note", title: "Send a voice note instead of a text", minutes: 3, daysPerWeek: 3, dimension: "spirit" },
      { id: "stranger", title: "Start one conversation with a stranger", minutes: 5, daysPerWeek: 3, dimension: "mind" },
    ],
  },
  {
    id: "mind",
    label: "Mind routine",
    kind: "weekly",
    why: "A calm, growing mind is the base layer under every other goal here.",
    areaSeedId: "lm_mindset",
    servesAreaIds: ["lm_emotions", "lm_spirituality", "lm_health"],
    daysPerWeek: 4,
    split: false,
    defaultStepIds: ["reading", "nature", "breath-long"],
    defaultSplitId: null,
    presets: [
      { id: "light", label: "Light", note: "Read, and get outside without headphones.", stepIds: ["reading", "nature"] },
      { id: "standard", label: "Standard", note: "Adds a skill you are building and a long sit.", stepIds: ["reading", "learn", "nature", "breath-long"] },
      { id: "full", label: "Full", note: "Adds writing and one evening away from a screen.", stepIds: ["reading", "learn", "nature", "breath-long", "write", "low-screen"] },
    ],
    library: [
      { id: "reading", title: "Read non-fiction", minutes: 20, daysPerWeek: 4, dimension: "mind" },
      { id: "learn", title: "Half an hour learning a skill", minutes: 30, daysPerWeek: 3, dimension: "mind" },
      { id: "nature", title: "Time outside with no headphones", minutes: 30, daysPerWeek: 2, dimension: "spirit" },
      { id: "write", title: "Write two hundred words about anything", minutes: 20, daysPerWeek: 3, dimension: "mind" },
      { id: "low-screen", title: "One low-screen evening", minutes: 120, daysPerWeek: 2, dimension: "mind" },
      { id: "breath-long", title: "Long breathwork or meditation sit", minutes: 20, daysPerWeek: 2, dimension: "spirit" },
    ],
  },
]

export const ROUTINE_BLUEPRINT_MAP = new Map(ROUTINE_BLUEPRINTS.map((b) => [b.id, b]))

/**
 * The four that ship in the stack beside the wheel, in order.
 *
 * Morning and evening bracket the day, business is where the output comes from,
 * and vices is the one made of things you stop. Manifestation is still in the
 * library and one click away; it was cut from the default four because reading
 * the north star out loud is already a step in the morning routine.
 */
export const DEFAULT_ROUTINE_IDS = ["morning", "night", "work", "vices"]

/** Standard split templates for the training week. */
export const NS_SPLITS: Array<{ id: string; label: string; days: string[]; perWeek: number }> = [
  { id: "fullbody", label: "Full body", days: ["Full Body A", "Full Body B", "Full Body C"], perWeek: 3 },
  { id: "upper-lower", label: "Upper / Lower", days: ["Upper A", "Lower A", "Upper B", "Lower B"], perWeek: 4 },
  { id: "ppl", label: "Push / Pull / Legs", days: ["Push", "Pull", "Legs"], perWeek: 3 },
  { id: "ppl6", label: "Push / Pull / Legs ×6", days: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"], perWeek: 6 },
  { id: "bodypart", label: "Body part split", days: ["Chest", "Back", "Legs", "Shoulders", "Arms"], perWeek: 5 },
  { id: "custom", label: "Custom", days: ["Day A", "Day B"], perWeek: 2 },
]

// ---------------------------------------------------------------- tab 3

/** The three shapes a goal can take, in one place so every screen agrees. */
export const NS_GOAL_TYPES: Array<{ type: "milestone_ladder" | "habit_ramp" | "achievement"; icon: string; label: string; hint: string }> = [
  { type: "milestone_ladder", icon: "🎯", label: "Target", hint: "A number you climb to by a date. 100 kg, ten thousand a month, twelve percent body fat." },
  { type: "habit_ramp", icon: "🔁", label: "Practice", hint: "An ongoing weekly practice. You never finish it, you just keep it." },
  { type: "achievement", icon: "🏁", label: "Finish line", hint: "You either did it or you did not. A first muscle-up, a licence, a book out." },
]

export const GOALS_INTRO = {
  title: "What you are actually doing about it",
  help: "Write the goal, then the reason under it. The reason is the part you re-read on a day you do not feel like it, so it is worth more than the wording of the goal.",
  shapes: "A number becomes a target with a date. Something you do every week becomes a practice. Something you either do or do not becomes a finish line. Flip any goal between them at any time.",
}

/**
 * Every goal arrives with a date on it, a year out.
 *
 * A goal with no date is a wish, and a picker that starts empty means every goal
 * added from the library needs twelve clicks in a calendar before it means
 * anything. A year is his own default horizon for a goal ("typically a year or
 * less; when you go beyond a year it becomes a lot harder to manage and
 * measure"), and it is the number people move off rather than the number they
 * have to invent. Moving it is one click on a chip.
 */
export const DEFAULT_GOAL_MONTHS = 12

/** The dates people actually pick, so the calendar is the fallback not the tool. */
export const GOAL_DATE_PRESETS: Array<{ id: string; label: string; months: number | null; note: string }> = [
  { id: "m3", label: "3 months", months: 3, note: "A sprint. Close enough that this week counts." },
  { id: "m6", label: "6 months", months: 6, note: "Long enough for a real change in a body or a balance." },
  { id: "m12", label: "1 year", months: 12, note: "His own default. Past a year a goal gets hard to measure." },
  { id: "m24", label: "2 years", months: 24, note: "For something that genuinely cannot be done sooner." },
  { id: "eoy", label: "End of this year", months: null, note: "The 31st of December." },
]

/**
 * Goals the site can score for you.
 *
 * You already rate the twelve areas day to day on this page. A goal like "raise
 * my average emotional state to an 8" is measured by exactly that number, so
 * asking the user to type their own progress into it would be asking them to
 * copy a figure the page is already holding. Wiring it means the goal's current
 * value is the rolling average and the progress bar moves on its own.
 */
export const GOAL_METRIC_COPY = {
  label: "Score this from my daily ratings",
  help: (area: string) =>
    `Your rolling ${NS_DAILY_WINDOW}-day average for ${area} becomes this goal's current number. Rate the area each day and the progress moves on its own.`,
  on: "Scored from your daily ratings",
  off: "Track it yourself",
  unit: "/10 average",
  noData: "Rate this area on a few days and the number starts filling in.",
  reading: (avg: number, days: number) => `${avg}/10 average over ${days} ${days === 1 ? "day" : "days"}`,
}

/** Said over a set of goals that just arrived together from a template. */
export const TEMPLATE_ADDED_COPY = {
  title: (n: number, label: string) => `${n} ${n === 1 ? "goal" : "goals"} added from ${label}`,
  help: "They all arrived with a date a year out and their own shape. Open any of them to move the date, drag the climb, or change the ramp.",
  shape: "Shape them",
  dismiss: "got it",
}

export const TEMPLATE_PREVIEW_COPY = {
  show: "what is in it",
  hide: "hide",
  levelNote: (level: string) => `Numbers shown at ${level}.`,
}

/** The nudge that replaces gating. Nothing is ever blocked; it is just listed. */
export const TODO_COPY = {
  title: "Still to fill in",
  help: "None of this stops you moving on. A date or a why can wait a week. It is listed here so you can find it again.",
  none: "Nothing outstanding.",
}

/** Common things that stop people, offered so the box is not blank. */
export const OBSTACLE_PRESETS = [
  "I run out of time",
  "I lose motivation after a few weeks",
  "Work eats the hours I planned for this",
  "I get ill or injured and never restart",
  "The people around me pull me the other way",
  "I start too big and burn out",
  "I forget it exists",
  "Money gets in the way",
]

/** The counter is the half people skip, so it gets its own question. */
export const OBSTACLE_COUNTER_QUESTION = "And what will you do when that happens?"

/**
 * The belief procedure, compressed to the four steps a goal card can hold.
 *
 * The second step is the one that does the work. It refuses to argue about
 * whether the belief is true and asks only whether it is useful, which is how
 * you drop a belief without having to win an argument with yourself.
 */
export const BELIEF_STEP_COPY = {
  old: { label: "The belief in the way", placeholder: "I am… / I can't… / I don't have the…" },
  useful: { label: "Set aside whether it is true. Does it serve you?", yes: "It serves me", no: "It does not serve me" },
  evidence: { label: "Who has done this with your exact disadvantage? And when have you already done something like it?", placeholder: "The counter-evidence" },
  replacement: { label: "The replacement. Same subject, believable and useful", placeholder: "I have an abundance of time for whatever I am committed to" },
  usefulNote: "Saying it serves you is a real answer. If it does, leave it alone and work on something else.",
  conditionNote: "Say the replacement out loud, with your body, every day for a month. Deciding once does not change a belief.",
}

/** Rotated one at a time, because nobody gets three reasons from one angle. */
export const NS_WHY_ANGLES: Array<{ id: string; label: string; question: string }> = [
  { id: "daily", label: "The daily texture", question: "What is an ordinary Tuesday like once you have this? Name the small things." },
  { id: "identity", label: "Who you become", question: "Who are you once this is true, and what does that person do differently?" },
  { id: "cost", label: "The cost of not", question: "What does another five years without this take from you?" },
  { id: "others", label: "Who else feels it", question: "Whose life is different because you did this?" },
  { id: "unlocks", label: "What it unlocks", question: "What becomes possible after this that is not possible now?" },
  { id: "proof", label: "The proof", question: "What would this prove to you. And to whom?" },
  { id: "feeling", label: "The feeling", question: "What do you get to stop feeling? What do you get to start feeling?" },
  { id: "body", label: "The body", question: "What does this give you physically. Energy, sleep, how you feel in your own skin?" },
]

export const NS_PAIN_WHY_QUESTION = "What will it cost you if you do not do this?"

/** Belief and desire both get a 0-10, and both have to clear this. */
export const NS_QUALIFY_THRESHOLD = 7

// ---------------------------------------------------------------- tab 4

export const NOW_INTRO = {
  title: "Where you are, area by area",
  help: "Before you decide where you are going, be honest about where you are standing. Open an area and write what a 10 looks like, rate yourself against it, then say why it matters, who you are in it, and what it asks of you.",
  order: "Write the 10 first. A rating with no picture behind it is a mood, and somebody else's 10 in your health is not yours. You do not have to do all twelve.",
  next: "Now write the goals →",
}

/** Tab 3. The goals, and nothing else. */
export const PLAN_INTRO = {
  title: "What you are going to do about it",
  help: "One area at a time. Its 10 and its rating come with it, so every goal is written against the picture it is supposed to close. The routines beside the wheel are the part that runs every week whatever else happens.",
  order: "Write the goal, then the reason under it. The reason is what you re-read on a day you do not feel like it.",
  empty: "Nothing written yet. Open an area and add the first one.",
  next: "Now check them against your 10 →",
  /** Said on an area that has a 10 written and nothing aimed at it. */
  gap: (names: string) => `Pictured but nothing aimed at it yet: ${names}.`,
}

/**
 * Only said once every area has a number.
 *
 * It used to appear the moment a single area was rated, so rating Emotions first
 * produced "Under the floor right now: Emotions. That is where the attention goes
 * this season" off one data point and eleven blanks. You cannot know what is
 * lowest until you have looked at all of them, and telling somebody where their
 * season goes before they have decided anything is the app doing the deciding.
 *
 * So: nothing until all twelve are rated, and then an observation rather than an
 * instruction. What to do about it is the next screen's job.
 */
export const FLOOR_LINE = {
  waiting: (rated: number, total: number) =>
    `${total - rated} ${total - rated === 1 ? "area" : "areas"} still unrated. Once they all have a number this will tell you which are under the floor.`,
  under: (names: string) => `Under a seven right now: ${names}.`,
  none: "Nothing under a seven right now.",
  note: "Seven is the floor. Which of these you work on this season is your call, and two or three areas carry most years.",
}

/**
 * One person's 10 in each area, offered as a starting point.
 *
 * Every area used to open on an empty box under "What would a 10 look like
 * here?", with only his three-word sub-label ("Energy, Vitality, Well-Being") to
 * say what the area even covered. Twelve blank boxes is eleven more than anyone
 * fills in, and the first question the box has to answer is what the area means.
 *
 * Written in the first person and in the same register as the north star
 * example, so it can be edited into the user's own rather than read as a target.
 * Never inserted automatically: it is a placeholder plus a button.
 */
export const AREA_TEN_EXAMPLES: Record<string, string> = {
  lm_health:
    "I wake up before the alarm and I am awake all day without needing coffee to get going. I sleep seven or eight hours most nights. Nothing hurts, my bloods are clean, and I have not been properly ill in a year.",
  lm_fitness:
    "I train four times a week without negotiating with myself about it. I am strong enough to carry anything I need to carry, I can run for the bus without thinking, and I like what I see in the mirror.",
  lm_mindset:
    "My default thought about a hard thing is that I will work it out. I catch myself in a spiral within minutes instead of days. I do not need anyone to agree with me to feel steady.",
  lm_emotions:
    "Most days I feel good for no particular reason. When something knocks me, it lasts hours rather than weeks. I am grateful without having to be reminded, and the people near me can tell.",
  lm_relationship:
    "We are close, we want each other, and we can say hard things without it turning into a fight. I look forward to seeing them at the end of the day.",
  lm_mission:
    "The work matters to me and I would still do a version of it if the money were handled. I am good at it and getting better, and I finish most weeks knowing what I moved.",
  lm_money:
    "No debt I am uncomfortable with, a year of costs saved, and money coming in that does not depend on my hours. I stop looking at prices for ordinary things.",
  lm_family:
    "I talk to them because I want to, not out of duty. Nothing important is unsaid. When something goes wrong for one of us, everyone knows within a day.",
  lm_friends:
    "Three or four people I could call at 2am, and I see them often enough that we do not have to catch up. My weeks have people in them without me organising anything.",
  lm_fun:
    "Something in the week is purely for the pleasure of it and I do not have to justify it. A few trips a year. I am still learning things that are no use to anyone.",
  lm_contribution:
    "I give money or time regularly, on a schedule, not when I remember. At least one person is better off this year because of something I did and will not be repaid for.",
  lm_spirituality:
    "I have a practice I keep. I feel part of something larger than my own week, and my decisions come from that rather than from whatever I am anxious about.",
}

export const REVIEW_INTRO = {
  title: "Does the plan point at your 10?",
  help: "You wrote your 10 in each area and rated where you stand. Now read the goals against that picture, and answer the questions that decide whether you keep going in February.",
  dailyNote: "The ratings and the 10s live on the Where you are tab. This tab reads them back beside the goals in that area.",
  floorNote: "Seven is the floor, and it is not the aim. Anything under a seven is the area asking for attention this season.",
}

/** The score below which an area is asking for attention. */
export const NS_FLOOR = 7

/**
 * What the two numbers being apart actually means.
 *
 * The old line said "one of the two is telling the truth, and it is worth a
 * minute deciding which", which reads as being told your own rating is wrong.
 * Nothing in the material says that. What he says about rating is only that
 * measuring makes you aware and lets you act ("when you see my energy is a six,
 * you can do something about it"). The two numbers come from different places
 * and are supposed to differ, so this now says what the difference is made of
 * and stops.
 */
export const RATING_VARIANCE_NOTE = {
  above: "Your fortnight number is higher than your daily average. Looking back tends to round up, and the daily numbers were made in the moment. Both are real readings.",
  below: "Your fortnight number is lower than your daily average. Memory weights the worst days heavily. Both are real readings.",
  gap: 1.5,
}

/**
 * The one thing for the season.
 *
 * Ranking twenty goals tells you what order to work through them. It does not
 * tell you which one, if it happened, would make half the list easier or
 * unnecessary. That is a different question and it is worth asking on its own,
 * because the answer is usually not the goal at rank one.
 */
export const SEASON_FOCUS_COPY = {
  title: "Your one thing this season",
  help: "Of everything on this page, which one, if it happened, would make the rest easier? Often it is not the biggest goal. Quitting one thing, or getting one habit in place, can move four areas at once.",
  empty: "Nothing picked yet.",
  pick: "Make this my one thing",
  clear: "not this one",
  banner: (label: string) => `This season: ${label}`,
  bannerNote: "If a week goes badly, this is the one that still gets done.",
  areaOption: "Or pick a whole area, if you have not written the goal yet.",
}

/** Marking what a goal or a routine lifts beyond the box it is filed under. */
export const SERVES_COPY = {
  goal: {
    label: "What else does this lift?",
    help: "Some goals move more than one part of your life. Sleeping properly, or dropping one thing, lifts several at once. Tick them and this goal shows up inside each of those areas.",
  },
  routine: {
    label: "Which areas does this routine carry?",
    help: "A morning routine is not filed under one part of your life. Say which parts it holds up and each of them will show it.",
  },
  /** Shown inside an area, listing what already runs there from elsewhere. */
  inArea: "Also working on this area:",
  none: "Nothing from elsewhere reaches this area yet.",
}

/**
 * Goals that are really an in-app tool.
 *
 * The business template ships "Weekly Review", which is exactly the thing this
 * page's review tab does. Leaving it as a bare goal with a 1-per-week ramp means
 * the user tracks a review they then have nowhere to run. Matched on title,
 * case-insensitively, because these arrive from the framework catalogue by
 * label.
 */
export const GOAL_TOOL_LINKS: Array<{ match: string[]; label: string; tab: NorthStarTabId; note: string }> = [
  {
    match: ["weekly review", "weekly reflection"],
    label: "Run it on the Review tab",
    tab: "review",
    note: "This page has the review built in. The Review tab reads every area's 10 back beside its goals and asks whether they still aim at it.",
  },
  {
    match: ["morning ritual", "morning routine"],
    label: "Build it in your Morning routine",
    tab: "now",
    note: "Your morning routine is already on this page, with the full hour as a preset. Build it there and this goal is just the promise to keep it.",
  },
]

/**
 * Milestone celebrations, on a finish-line goal.
 *
 * A finish line pays out once, at the end. "Bench 36 kg dumbbells for 6 reps" is
 * correctly a finish line — you did it or you did not — and it is also obviously
 * a climb, and the climb is where the year actually happens. So the number comes
 * out of the title, the rungs are generated at even intervals, and each one has
 * a place to write what you do when you get there.
 */
export const MILESTONE_COPY = {
  title: "Milestone celebrations",
  help: "This one has a number in it, so it has a climb underneath it. Set the rungs and say what you do when you reach each one. A finish line that only pays out at the end is a long time to work with nothing to feel.",
  from: "From",
  to: "To",
  count: "Rungs",
  unit: "Unit",
  make: "Set the milestones",
  remake: "Redo the milestones",
  replaceNote: (n: number) => `This replaces the ${n} ${n === 1 ? "milestone" : "milestones"} already here. Checkpoints you wrote yourself stay.`,
  celebrate: "What you do when you get here",
  celebratePlaceholder: "Tell someone. Take the night off. Buy the thing.",
  celebrateHint: "Small and soon beats big and never. It only counts if you actually do it.",
  none: "No number in this goal's title, so there is nothing to space out. Write the checkpoints yourself below.",
  offer: "Turn this into a climb",
}

/** Said on a goal whose title already exists as a step in one of the routines. */
export const GOAL_IN_ROUTINE = (routine: string, step: string) =>
  `Already in your ${routine}, as "${step}". Keeping the goal is fine; the routine is where it actually happens.`

/** How many days of daily ratings roll into the average shown beside the review. */
export const NS_DAILY_WINDOW = 14

export const AREA_REVIEW_COPY = {
  ten: { question: "What would a 10 look like here?", help: "Your 10, in your words. Somebody else's 10 in this area is not yours, and a rating with nothing behind it is a mood.", placeholder: "A 10 in this area is…" },
  tenExample: "Not sure what this area covers? Here is one person's 10, to edit or ignore.",
  tenUse: "start from this",
  tenReplace: "replace what I wrote?",
  tenKeep: "keep mine",
  /**
   * The guidance that stops the 10 being useless.
   *
   * Both halves are his. "The 10 is whatever you define it to be, so my 10
   * might be different than your 10. Financially your 10 might be a
   * billionaire, and so you might feel like a 2, because that's the standard
   * and that's the goal that you have for yourself" — and, about himself, "I
   * would never say 10, it would always be nine, or nine and a half, because I
   * always thought if it's a 10 then it's perfect", which he no longer does:
   * he rates finances, career and relationship a 10 at this stage of his life.
   * So the 10 moves as you do (QZjdmXreWd0, I-SoCQvNi9A).
   *
   * The last sentence is our reading rather than a quote, and it is the useful
   * part: a 10 pinned twenty years out reads a 2 every week and teaches you
   * nothing.
   */
  tenGuide: [
    "Your 10 is yours. His 10 for his body is 170 pounds at 6 percent body fat and six hours of sleep. Somebody else's is being pain free with energy all day. Both are fine.",
    "It moves. A 10 at this stage of your life will not be a 10 in ten years. Rewrite it as you grow.",
    "Write the version of this area you could be living inside a year or two. If you set it at billionaire, you will rate yourself a 2 every week for a decade and learn nothing from it.",
  ],
  tenGuideTitle: "What counts as a 10?",
  /**
   * The purpose, per area. His structure, and the piece we did not have.
   *
   * "I've got my vision here, I've got my purpose for my relationship, and then
   * I've got my goals, my one-year goals, my three-month goals, my monthly goals
   * in that area. So I do that for each area of my life" (Rw2qaMltFcY).
   */
  purpose: {
    question: "Why does this area matter to you?",
    help: "Your reason for this one part of your life. It is what you read when you do not feel like doing the goals underneath it.",
    placeholder: "This part of my life matters because…",
  },
  snapshot: {
    question: "Where are you right now, in a sentence or two?",
    help: "Optional. The number says it was a 4. This says what a 4 felt like, which you will not remember in six months.",
    placeholder: "Right now, honestly…",
  },
  /** The two dialogs are one area split in half, so each points at the other. */
  toGoals: (label: string) => `Write the goals for ${label} →`,
  toGoalsHelp: "The goals live on the next tab. This one is the picture they are aimed at.",
  fromGoals: "Your 10 in this area",
  fromGoalsEdit: "edit the picture",
  fromGoalsEmpty: "No 10 written for this area yet. Write it first, on Where you are, and the goals have something to aim at.",
  /** The footer, so you can leave an area without clicking into empty space. */
  done: "Done",
  next: (label: string) => `Next: ${label}`,
  autosave: "Saved as you type.",
  rating: { question: "Over the last two weeks, where have you been?", help: "Against the 10 you just wrote. Be honest rather than kind." },
  goalsAim: { question: "Do your goals here actually move you toward that 10?", help: "Read your goals in this area against the picture. If the answer is no, that is useful. Change the goals." },
  values: { question: "What would you have to value to live at that 10?", help: "One word or a short phrase per line. These are the ones this area asks for." },
  /** Names the short row read off their own writing, above the full library. */
  valuesLead: (label: string) => `For ${label.toLowerCase()}`,
  identity: { question: "Who are you when this area is handled?", help: "Present tense, starting with I am. You will not outperform who you believe you are." },
  blockers: { question: "What might stop you here?", help: "Name it now, while it is theoretical and cheap. It is much harder to think clearly about it in the middle of week six." },
}

/**
 * The whole-life questions, under the per-area ones.
 *
 * The values list and the standards used to live here. Both moved to the north
 * star tab, where the rest of the driving force is, keeping their ids so nothing
 * already written is lost. What is left is what genuinely belongs to looking
 * back rather than to the vision.
 */
export const REVIEW_PROMPTS: NsReviewPrompt[] = [
  {
    id: "stoppers",
    question: "What might stop you overall?",
    help: "Not in one area. The pattern that has ended things for you before.",
    placeholder: "What has actually stopped you before",
  },
  {
    id: "support",
    question: "Who needs to know, and who could help?",
    help: "The people around you hold your beliefs up. Tell someone, and the plan stops being private.",
    placeholder: "Who you will tell, and what you will ask for",
  },
]

/**
 * The full value list, grouped, to browse.
 *
 * Twenty words in a chip row was the whole pool, and twelve of them fitted on
 * screen. Twelve words is not a list you can find yourself in: the point of
 * offering words at all is that naming a value is a recall problem, and recall
 * needs a big enough field to recognise something in.
 *
 * MEANS VALUES ARE IN HERE ON PURPOSE. Family, money, fitness and status are not
 * emotions, and they are what people actually say. Refusing them, or leaving
 * them off the list, is the thing that ends the exercise. They earn the "worth a
 * second look" question when they land in the ordered list, which is his own
 * correction and is a question rather than a rejection.
 *
 * Groups are for scanning, nothing more. No value is filed anywhere twice.
 */
export const NS_VALUE_GROUPS: Array<{ label: string; color: string; values: string[] }> = [
  {
    label: "Freedom",
    color: "#38bdf8",
    values: ["Freedom", "Independence", "Autonomy", "Flexibility", "Simplicity", "Space", "Balance", "Self-reliance", "Adventure", "Travel"],
  },
  {
    label: "People",
    color: "#f43f5e",
    values: ["Love", "Connection", "Intimacy", "Family", "Friendship", "Belonging", "Loyalty", "Community", "Partnership", "Being liked", "Generosity", "Forgiveness"],
  },
  {
    label: "Growth",
    color: "#6366f1",
    values: ["Growth", "Learning", "Mastery", "Curiosity", "Wisdom", "Progress", "Craft", "Competence", "Self-awareness", "Reading"],
  },
  {
    label: "Body",
    color: "#22c55e",
    values: ["Health", "Vitality", "Energy", "Strength", "Fitness", "Looking strong", "Rest", "Longevity", "Sleep", "Sobriety"],
  },
  {
    label: "Work and money",
    color: "#84cc16",
    values: ["Achievement", "Success", "Ambition", "Excellence", "Winning", "Wealth", "Money", "Security", "Stability", "Recognition", "Status", "Reputation", "Hard work", "Results"],
  },
  {
    label: "Meaning",
    color: "#eab308",
    values: ["Purpose", "Meaning", "Contribution", "Service", "Impact", "Legacy", "Justice", "Mentorship", "Leaving things better"],
  },
  {
    label: "Spirit",
    color: "#c084fc",
    values: ["Faith", "Spirituality", "Peace", "Presence", "Mindfulness", "Stillness", "Solitude", "Nature", "Gratitude", "Acceptance", "Devotion", "Hope"],
  },
  {
    label: "Joy",
    color: "#ec4899",
    values: ["Joy", "Enjoyment", "Happiness", "Contentment", "Satisfaction", "Fun", "Play", "Humour", "Passion", "Ease", "Novelty", "Spontaneity", "Beauty", "Pleasure", "Excitement", "Wonder"],
  },
  {
    label: "Character",
    color: "#14b8a6",
    values: ["Integrity", "Honesty", "Authenticity", "Courage", "Discipline", "Consistency", "Determination", "Responsibility", "Humility", "Respect", "Fairness", "Trust", "Kindness", "Compassion", "Empathy", "Patience", "Resilience", "Optimism", "Self-respect"],
  },
  {
    label: "Making things",
    color: "#f97316",
    values: ["Creativity", "Self-expression", "Imagination", "Originality", "Vision", "Building things", "Order", "Clarity", "Focus"],
  },
  {
    label: "Standing",
    color: "#94a3b8",
    values: ["Confidence", "Leadership", "Influence", "Boldness", "Certainty", "Control", "Being needed", "Approval", "Safety", "Comfort"],
  },
]

/** The colour a value carries wherever it is shown, from the group it is in. */
export const VALUE_COLOR = new Map(
  NS_VALUE_GROUPS.flatMap((g) => g.values.map((v) => [v.toLowerCase(), g.color] as const)),
)

/**
 * The values each of the twelve areas usually asks for.
 *
 * A generic twenty-word row under "what would you have to value to live at that
 * 10 in Money?" offered Adventure and Faith and left out Security, which is the
 * one nearly everybody writes. The area knows what it is about; the short list
 * should too.
 *
 * These are only the fallback. `areaValueSuggestions` reads the user's own 10,
 * purpose and north star first, so somebody who wrote "a year of costs in the
 * bank and I stop counting at the till" is offered Security and Abundance off
 * their own paragraph before any of this.
 */
export const AREA_VALUE_SUGGESTIONS: Record<string, string[]> = {
  lm_health: ["Health", "Vitality", "Energy", "Rest", "Sleep", "Longevity", "Discipline", "Sobriety"],
  lm_fitness: ["Strength", "Fitness", "Discipline", "Consistency", "Looking strong", "Determination", "Resilience", "Energy"],
  lm_mindset: ["Clarity", "Focus", "Growth", "Learning", "Optimism", "Resilience", "Self-awareness", "Wisdom"],
  lm_emotions: ["Happiness", "Joy", "Gratitude", "Peace", "Contentment", "Acceptance", "Presence", "Enjoyment"],
  lm_relationship: ["Love", "Intimacy", "Passion", "Trust", "Loyalty", "Honesty", "Partnership", "Patience"],
  lm_mission: ["Purpose", "Meaning", "Mastery", "Craft", "Impact", "Excellence", "Contribution", "Ambition"],
  lm_money: ["Security", "Freedom", "Wealth", "Stability", "Independence", "Generosity", "Discipline", "Simplicity"],
  lm_family: ["Family", "Love", "Connection", "Loyalty", "Presence", "Patience", "Trust", "Belonging"],
  lm_friends: ["Friendship", "Connection", "Belonging", "Community", "Fun", "Loyalty", "Generosity", "Humour"],
  lm_fun: ["Fun", "Play", "Adventure", "Novelty", "Spontaneity", "Enjoyment", "Travel", "Wonder"],
  lm_contribution: ["Contribution", "Service", "Generosity", "Impact", "Kindness", "Compassion", "Legacy", "Justice"],
  lm_spirituality: ["Faith", "Spirituality", "Peace", "Presence", "Stillness", "Gratitude", "Devotion", "Acceptance"],
}

/** Every value in the library, flat, for search and for counting. */
export const NS_VALUE_LIBRARY = NS_VALUE_GROUPS.flatMap((g) => g.values)

/**
 * The short row shown inline, to prime recall before anybody opens the browser.
 * The rest of the library is one click away.
 */
export const NS_VALUE_SUGGESTIONS = [
  "Freedom", "Growth", "Family", "Love", "Health", "Contribution", "Faith",
  "Adventure", "Security", "Creativity", "Connection", "Achievement",
  "Integrity", "Fun", "Peace", "Learning", "Legacy", "Discipline", "Honesty", "Courage",
]

/** Said once, under the wheel, when an area has a 10 and no goals. */
export const GAP_WARNING = "You have written a 10 here and no goal that aims at it. Either add one, or accept that this area is holding its floor this season."
