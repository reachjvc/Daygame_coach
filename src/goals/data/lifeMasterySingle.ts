/**
 * v20 — THE SINGLE-PERSON BRANCH for the Relationship area.
 *
 * Why this file exists: everything the product wired to `lm_relationship` was
 * couples material — date night, the six-needs journal, marriage books. A user
 * whose goal is "get a girlfriend" was handed a couples-therapy toolkit.
 *
 * Meanwhile the framework's own author ran a cold-approach coaching business at
 * 21, counted 2,000 approaches in a year at 18, and 10,000+ lifetime. There was
 * a complete curriculum in the source that had simply never been extracted.
 *
 * FRAMING RULE — non-negotiable. He explicitly repudiates The Game's method
 * (negs, canned openers, routines): "I do not agree with or endorse it in any
 * way", while keeping the practice. So the voice here is ADD VALUE and BECOME
 * ATTRACTIVE, never "pickup". Two guardrails he states himself and that must
 * survive into any copy built on this:
 *   1. You end the interaction — "when you walk away, you end the conversation,
 *      there's no rejection."
 *   2. Add value, don't take — leave the person better off for having met you.
 * And never frame the goal as acquiring a person. He never does.
 *
 * Every quote below is verbatim and in `lifeMasteryCorpus.ts` under its videoId.
 */

/** One rung of his approach-anxiety ladder. Progression gates on REPS, not on
 * feeling ready — "you don't have to get everything in place before you show up". */
export interface ApproachRung {
  level: 1 | 2 | 3 | 4
  title: string
  /** What you actually do. */
  action: string
  /** Why this rung, in plain language. */
  point: string
  /** Reps before the next rung unlocks. Deliberately low: the ladder is for
   * getting moving, not for grinding. */
  repsToAdvance: number
}

export const APPROACH_LADDER: ApproachRung[] = [
  {
    level: 1, title: "Ask anyone for directions", repsToAdvance: 10,
    action: "Approach literally anyone. An older woman, a man, anyone at all. Ask for directions, then walk away.",
    point: "The target here is the act of walking up to a stranger. Start here on purpose and take one bite at a time.",
  },
  {
    level: 2, title: "Ask for the time", repsToAdvance: 10,
    action: "Same again, but ask the time. Expect some people to brush you off.",
    point: "The brush-off is the curriculum. You find out that someone declining to give you the time did nothing to your life, and rejection stops being the thing you imagined.",
  },
  {
    level: 3, title: "Ask someone attractive for their opinion", repsToAdvance: 15,
    action: "Now approach someone you actually find attractive, and ask their opinion on something real.",
    point: "First rung where attraction is in the room. An opinion question is easy to answer and asks nothing of them.",
  },
  {
    level: 4, title: "Compliment, converse, ask", repsToAdvance: 0,
    action: "Compliment, let it become a conversation if it wants to, and ask for her number if it's there.",
    point: "This is the whole thing, and by now the first three rungs have done the work. You still end it yourself.",
  },
]

/** His opener — a TEMPLATE, explicitly not a script. The "softener" is his
 * named device for making an out-of-nowhere approach land gently. */
export const APPROACH_OPENER = {
  softener: "Hey, listen, this might sound a little strange…",
  template: "Hey, listen, this might sound strange. I noticed you and I just wanted to come up and say you look amazing. Have a great day.",
  note: "Don't memorise it. A memorised line is the wrong thing. The softener is a shape; the words should be yours.",
  quote: "the idea behind that was uh you are using what is called a softener by saying hey this might sound a little strange or hey I know this doesn't normally happen or hey I know this might seem totally random but I noticed you and I wanted to come up and say hi",
  videoId: "5ITfL1jNAsM",
}

/** His own volume, offered as a default rather than a demand. */
export const APPROACH_REPS = {
  perDay: 10,
  daysPerWeek: 4,
  quote: "for me, when I was single, I had a ritual of going out four days a week. Four days a week, I had to go out to social gatherings, social environments to meet people, to interact with people, to improve my social skills, to approach people",
  videoId: "NidJpDcCkQs",
  /** The reframe that makes the volume make sense — it's confidence work. */
  purposeQuote: "By approaching people, I'm building my confidence. I'm becoming more attractive, and I'm preparing myself so that when the woman of my dreams comes, I'm in a position where I actually have the confidence.",
  purposeVideoId: "NidJpDcCkQs",
}

/** Venues he names. */
export const APPROACH_VENUES = [
  "Mall", "Coffee shop", "Busy street", "Bookstore", "Grocery store",
  "Bus stop", "Festivals", "Meetups", "Nightlife",
]

/**
 * His post-session debrief. He kept this himself and it is far better than a
 * tally: it turns reps into learning. The last question is the one that does
 * the work — it puts attention on HER experience, which is the whole "add
 * value" doctrine in one prompt.
 */
export const SESSION_JOURNAL_PROMPTS = [
  { id: "reps", label: "How many did you actually do?", placeholder: "Count them honestly. The number is the only hard fact here" },
  { id: "body", label: "What was your body doing?", placeholder: "Posture, hands, where your eyes went, how fast you spoke" },
  { id: "felt", label: "What did you feel, and when did it pass?", placeholder: "Before the first one, during, after" },
  { id: "her", label: "What did you do that made her feel that way?", placeholder: "The journal question that does the work. Put your attention on her experience" },
  { id: "next", label: "One thing to do differently next time", placeholder: "One. Not a list." },
]

/** The clarity exercise — his two-column formula, both halves on one screen.
 * The second column is the half people skip, and it's the half that changes
 * anything. */
export const CLARITY_EXERCISE = {
  wantPrompt: "Exactly who do you want? Physical, character, personality, interests. Be specific, then mark which ones are non-negotiable.",
  becomePrompt: "Who do I need to become in order to attract this?",
  becomeQuote: "i consistently focused on a regular basis what i wanted i continued to focus on and read my journal and then focus on who do i need to become and then i created a plan for becoming that",
  becomeVideoId: "xVfwDgP2EGM",
  quote: "i took out a journal ... and i got clarity and wrote out what do i want and i was so detailed so specific about everything physical appearance uh character traits uh you know certain personality traits and you know certain interests and hobbies all of that stuff",
  videoId: "xVfwDgP2EGM",
  caution: "This exercise is credited with producing a partner within a week. Her own correction is worth keeping: you still have to get yourself out there.",
}

/** The rejection reframe. */
export const REJECTION_DOCTRINE = {
  quote: "rejection does not exist",
  videoId: "pgq5MbkmXuM",
  gloss: "The argument: nobody who has known you for eight seconds has enough information to reject you. And if you end the interaction yourself, there was nothing to reject.",
}

/** Books he actually prescribes for a single man — distinct from the marriage
 * books the area currently offers. */
export const SINGLE_BOOKS = ["The Alabaster Girl — Zan Perrion", "Models — Mark Manson"]

/** True when a user's relationship situation is "looking" rather than "with
 * someone". Drives which toolkit the area shows. */
export type RelationshipStatus = "single" | "partnered" | "unset"
