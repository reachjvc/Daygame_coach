/**
 * The sequential intake, in the order the source material teaches it.
 *
 * Order comes from the life-plan walkthrough (8kco2rjijjE), where the whole
 * life vision is written first and the areas and goals are derived from it, and
 * from the annual workshop (JZnLIuW7NQw), where the year is debriefed before the
 * vision is re-read and the vision is re-read before goals are set.
 *
 * VOICE RULES for every user-facing string in this file (enforced by
 * tests/unit/goals/lifeMasteryCopyLint.test.ts):
 *   1. Say "you". Second person, direct.
 *   2. One idea per sentence. Short sentences.
 *   3. No em-dashes. Use a period, or "and", or a comma.
 *   4. No "X, not Y". Say the thing you mean and stop.
 *   5. No "it's not about X, it's about Y".
 *   6. Repeat the noun instead of reaching for a clever pronoun.
 *   7. Plain verbs. Write it out. Take the time. Ask yourself. Pick one.
 *   8. Warm, never clever. No aphorisms we invented.
 *   9. Verbatim source material goes in `quote` only, always with a videoId.
 */

/** The five pages of the intake. Reveal order is exactly this order. */
export type IntakePageId = "back" | "matters" | "going" | "areas" | "doing"

export interface IntakePage {
  id: IntakePageId
  /** Shown in the rail. */
  label: string
  /** Shown under the page heading. */
  intro: string
  /** Page 0 is offered on a first run and required on an annual re-run. */
  optionalOnFirstRun?: boolean
}

export const INTAKE_PAGES: IntakePage[] = [
  {
    id: "back",
    label: "Look back",
    intro: "Before you plan the year ahead, take the year behind you and get what it owes you. Three questions. Write short lines, as many as come.",
    optionalOnFirstRun: true,
  },
  {
    id: "matters",
    label: "What matters",
    intro: "Two things before the planning starts. What you are committing to, and what has actually been driving you.",
  },
  {
    id: "going",
    label: "Where you're going",
    intro: "This is the part everything else hangs off. Your vision, why you want it, who you are being, and the standards you hold. Together they are your driving force, and you will re-read them every week.",
  },
  {
    id: "areas",
    label: "Your areas",
    intro: "Now break your life into its areas and give each one a picture. What a 10 looks like, what a 0 looks like, and where you sit today.",
  },
  {
    id: "doing",
    label: "What you'll do",
    intro: "Goals are the stepping stones to the vision you just wrote. Get them out of your head, pick this year's, then qualify each one.",
  },
]

export type IntakeKind = "text" | "long" | "list" | "custom"

export interface IntakeQuestion {
  id: string
  page: IntakePageId
  /** The question itself. Verbatim from source where the `quote` field matches it. */
  question: string
  /** One or two lines on why you are being asked this. */
  why: string
  /** Key into PRINCIPLES for the deeper card, when there is one. */
  principle?: string
  /** A worked answer from the source material. Verbatim, always attributed. */
  quote?: string
  quoteVideoId?: string
  /** Ordinary answers, shown as examples so nobody copies them. */
  examples: string[]
  kind: IntakeKind
  placeholder?: string
  /** Offered but skippable even inside a required page. */
  optional?: boolean
}

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  // ---------------------------------------------------------------- page 0
  {
    id: "back_good",
    page: "back",
    question: "What was all the good that happened?",
    why: "Start with the wins, and flood yourself with them before you look at anything that went wrong. The hard part comes second on purpose.",
    quote: "off the top of your mind right now I want you to reflect, maybe even write some things down. What were some great moments, victories, wins, great decisions that you might have made this last year, things you're proud of",
    quoteVideoId: "JZnLIuW7NQw",
    examples: [
      "Ran my first half marathon in April",
      "Left the job that was making me miserable",
      "Got properly close with my brother again",
    ],
    kind: "list",
    placeholder: "One good thing, then the next",
  },
  {
    id: "back_challenges",
    page: "back",
    question: "What were the challenges, and what are the solutions?",
    why: "Name what went wrong, then spend most of your attention on what you will do about it. A challenge you have a plan for stops being a challenge.",
    quote: "what were the challenges, and also what are the solutions, what can you do better, what are some ideas that you have that can allow you to move past them",
    quoteVideoId: "JZnLIuW7NQw",
    examples: [
      "Money kept slipping away. I never once looked at where it went, so this year I check it weekly",
      "Trained hard for two months then stopped. The plan was too big, so I am starting at twice a week",
    ],
    kind: "list",
    placeholder: "The challenge, then what you'll do about it",
  },
  {
    id: "back_lessons",
    page: "back",
    question: "What did you learn? What were the most valuable lessons?",
    why: "Lessons are the part of a year you get to keep. Write them as short sentences you would say to yourself.",
    quote: "what did you learn this last year, what were the most valuable lessons, insights, learnings that you had this last year",
    quoteVideoId: "JZnLIuW7NQw",
    examples: [
      "I do my best work in the morning and I keep scheduling it at night",
      "Saying yes to everything is how I ended up with no time for anything",
    ],
    kind: "list",
    placeholder: "One lesson per line",
  },

  // ---------------------------------------------------------------- page 1
  {
    id: "commit",
    page: "matters",
    question: "Are you committing to this?",
    why: "Everything after this asks for real work. Deciding once, now, is what carries you through the weeks where you do not feel like it. The commitment is to every area of your life, and not only to the one shouting loudest.",
    principle: "commit",
    quote: "I go all in, fully committing myself by deciding to do whatever it takes.",
    quoteVideoId: "Kf6aFwzozM0",
    examples: [],
    kind: "custom",
  },
  {
    id: "values_audit",
    page: "matters",
    question: "What's been most important to you in your life?",
    why: "Answer fast and from the gut, and keep going until you run dry. This is what has actually been driving you so far. You will come back to it after the vision and decide what you want it to be.",
    principle: "values",
    quote: "the way you identify your values is you ask yourself, what's most important to me in life",
    quoteVideoId: "NidJpDcCkQs",
    examples: ["Freedom", "Family", "Being good at something", "Security"],
    kind: "list",
    placeholder: "One word or a short phrase, then what else?",
  },

  // ---------------------------------------------------------------- page 2
  {
    id: "vision",
    page: "going",
    question: "If a magician could come along and create the perfect life for you, what would it be?",
    why: "Write it with no limits on it at all. This one is supposed to be unrealistic, because its job is to pull you. The realistic part comes later, in this year's goals.",
    principle: "vision",
    quote: "make sure that it's something that there's no limits by. If you think, oh, I can't afford that or whatever, you're already doubting yourself. Imagine as if there's no limits. If a magician were able to come along and create the perfect life for you, what would that be?",
    quoteVideoId: "8kco2rjijjE",
    examples: [
      "I wake up in a house near the water with my partner and two kids. I train before anyone else is up. I run a business that earns well without owning my calendar, and I coach two afternoons a week because I love it.",
    ],
    kind: "long",
    placeholder: "Write it as one long paragraph, in the present tense, as though it is already true",
  },
  {
    id: "perfect_day",
    page: "going",
    question: "What would your perfect day look like, hour by hour?",
    why: "If the vision is hard to start, come at it from a single day. Take one day ten years out and walk it from waking to sleeping. Where you are, what you do, how you feel, who is with you.",
    principle: "vision",
    quote: "I want you to spend some time and journal and write it out hour by hour, from the time you'd wake up to the time you go to bed, what that perfect day would be",
    quoteVideoId: "9RxHchflvVs",
    examples: [
      "6am, woken by light rather than an alarm. Coffee on the balcony with my partner before the house wakes up. 7am training. 9am to 1pm on the work that actually matters, phone in another room.",
    ],
    kind: "long",
    placeholder: "From the moment you wake up to the moment you go to bed",
    optional: true,
  },
  {
    id: "purpose",
    page: "going",
    question: "Why do you want this? What will it give you?",
    why: "Reasons are the fuel. The vision is where you are going and your reasons are what get you moving on a day you would rather not. Write the noble ones and write the selfish ones, because whichever produces real feeling is the one that works.",
    principle: "purpose",
    quote: "when you have a vision you got to ask yourself, well why do I want this, what reasons do I have to actually make this happen and follow through",
    quoteVideoId: "8kco2rjijjE",
    examples: [
      "Because I want my kids to grow up watching me keep my word to myself",
      "Because I am tired of being the person who talks about it",
    ],
    kind: "long",
    placeholder: "Why you want it, and what having it would give you",
  },
  {
    id: "identity",
    page: "going",
    question: "Who are you committed to being? If someone looked your name up in the dictionary, what would it say?",
    why: "You will not outperform who you believe you are. Decide the person first and the behaviour reorganises around the decision. Write these as lines that start with I am.",
    principle: "identity",
    quote: "just ask yourself, who am I, who would I want to be, who am I committed to being. If I were to look my name up in the dictionary, what would it say about me?",
    quoteVideoId: "8kco2rjijjE",
    examples: [
      "I am someone who does what I say I will do",
      "I am a person people feel calmer around",
      "I am an athlete",
    ],
    kind: "list",
    placeholder: "I am…",
  },
  {
    id: "conduct",
    page: "going",
    question: "How are you committed to showing up?",
    why: "These are your standards. Identity is who you are and your standards are how that shows up in a room, on a bad day, and when nobody is checking.",
    quote: "your code of conduct, and this is basically how you're committed to showing up. It's standards that you have for yourself, standards you have set to live your life by. To be fun, playful, outrageous. To be loving and caring. To be confident. To be passionate. To be grateful. To be disciplined.",
    quoteVideoId: "8kco2rjijjE",
    examples: [
      "To be on time, always",
      "To be the calmest person in the argument",
      "To say the awkward thing rather than let it sit",
    ],
    kind: "list",
    placeholder: "To be…",
  },
  {
    id: "values_redesign",
    page: "going",
    question: "What do your values need to be to create the life you just wrote?",
    why: "Earlier you wrote what has been most important to you. Now you have a vision to aim at, so look at that list again and decide what it needs to become. Add what is missing, drop what belongs to an older version of you, and put them in order. The order is the part that runs your life.",
    principle: "values",
    quote: "What do my values need to be in order to create the life that I want?",
    quoteVideoId: "Lp_GOrM16Xc",
    examples: [],
    kind: "custom",
    // Offered, never required. The page's job is the driving force. Making a
    // full multi-phase values exercise the price of leaving the page is exactly
    // the friction this redesign exists to remove, and the life-plan source does
    // not put values on this path at all.
    optional: true,
  },

  // ---------------------------------------------------------------- page 3
  {
    id: "areas_pick",
    page: "areas",
    question: "Which areas of your life are you working on?",
    why: "Your life splits into areas and each one gets its own picture. Open the one that pulls you most. Give it a name that means something to you, because you will read these names every week.",
    quote: "there's different areas of life. Health and fitness. Business or your career. Your emotional life. Your relationships. Your finances. Your friends. Your family. And a spiritual part of life.",
    quoteVideoId: "8kco2rjijjE",
    examples: [],
    kind: "custom",
  },
  {
    id: "areas_room",
    page: "areas",
    question: "For each area you open: what is a 10, what is a 0, and where are you today?",
    why: "A rating with nothing behind it is a mood. Write both ends yourself and the weekly score starts meaning something. Then say why the area matters and who you are in it. Do this for one area and the rest get easier.",
    principle: "tens",
    quote: "what is the ten for you, and then what is a zero for you. But I want you to ask yourself, as a measurement on a scale from zero to ten, where are you right now?",
    quoteVideoId: "wqJ-2N5KVOU",
    examples: [],
    kind: "custom",
  },

  // ---------------------------------------------------------------- page 4
  {
    id: "brainstorm",
    page: "doing",
    question: "What do you want? Write everything, and do not filter. Then mark how many years each one needs and circle this year's.",
    why: "Get it all out first and sort it after. Anything you want to have, do, be, or give. Do not stop to judge whether it is realistic, because that comes next.",
    quote: "I want you to write down everything that you want. Don't limit yourself. Whatever comes to mind, write it down.",
    quoteVideoId: "JZnLIuW7NQw",
    examples: [],
    kind: "custom",
  },
  {
    id: "qualify",
    page: "doing",
    question: "Now qualify each goal.",
    why: "A goal becomes real when it has a sentence, a deadline, reasons under it, and something at stake. Write each one as a sentence that starts with I will easily.",
    principle: "goals",
    quote: "I will easily do a 15-day juice fast to cleanse and heal my body creating unstoppable energy and vitality by December 31st. 'I' means I'm taking responsibility. 'Will' ensures that you're actually going to be doing it. And then 'easily', just by adding the word easily, it changes the way it feels.",
    quoteVideoId: "GXhPOncX8CA",
    examples: [],
    kind: "custom",
  },
  {
    id: "action_plan",
    page: "doing",
    question: "What could you do to get there?",
    why: "Write everything you could do, and use the word could on purpose, because it opens your head up instead of narrowing it. Then find the few that carry most of the result.",
    quote: "I don't just create a to-do list, I create a could-do list. For each of my goals I have my reasons why, but I also ask myself, what are all the things that I could do? 'Could' as a keyword, because then you're opening up your mind to different options and possibilities.",
    quoteVideoId: "AuRE42mCwlU",
    examples: [],
    kind: "custom",
  },
  {
    id: "sign",
    page: "doing",
    question: "Sign it.",
    why: "You have built the plan, so now put your name to it and start. Read it out loud before you sign, because a thing you say lands differently from a thing you skim.",
    principle: "commit",
    examples: [],
    kind: "custom",
  },
]

export const INTAKE_QUESTION_MAP = new Map(INTAKE_QUESTIONS.map((q) => [q.id, q]))

export function questionsForPage(page: IntakePageId): IntakeQuestion[] {
  return INTAKE_QUESTIONS.filter((q) => q.page === page)
}

/** The label shown on the link that waves a question past without answering it. */
export const INTAKE_SKIP_LABEL = "I'm not sure yet"

/** Shown once under the skip link the first time it appears. */
export const INTAKE_SKIP_NOTE = "It stays open and you can come back to it whenever you want."
