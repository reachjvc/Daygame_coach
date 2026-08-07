/**
 * v21 — THE BELIEF-CHANGE PROCEDURE.
 *
 * The product asks users to write an identity line per area and a "who am I
 * committed to being" list, and offered no method for the case that actually
 * blocks people: a belief in the way. He has a complete one.
 *
 * His most distinctive move is step 2, and it's the reason this works at all —
 * he refuses to argue about whether a belief is TRUE and asks only whether it
 * is USEFUL. That sidesteps the trap where someone defends a belief with
 * evidence and stays stuck inside it.
 *
 * Quotes verbatim; each verified in lifeMasteryCorpus.ts under its videoId.
 */

export interface BeliefStep {
  id: "inventory" | "useful" | "evidence" | "replace" | "condition" | "references" | "room"
  title: string
  /** What the user does at this step. */
  ask: string
  /** His reasoning, in our voice. */
  why: string
  /** His words, where the step rests on a specific line. */
  quote?: { text: string; videoId: string }
}

export const BELIEF_STEPS: BeliefStep[] = [
  {
    id: "inventory", title: "Write it down",
    ask: "Finish these three, honestly: “I am ___”, “I can't ___”, “I don't have the ___”.",
    why: "Three stems that catch nearly everything. Most limiting beliefs are already sitting in one of them; writing it turns a mood into a sentence you can work on.",
    quote: { text: "whatever you attach the words I am to is what you become", videoId: "F4j974PvwSQ" },
  },
  {
    id: "useful", title: "Is it useful?",
    ask: "Set aside whether it is true. Does this belief serve you? Does it empower you?",
    why: "This is the move that unsticks people. Arguing about truth keeps you inside the belief; asking whether it is useful lets you drop it without having to win the argument.",
    quote: { text: "the question is not whether or not they're true", videoId: "4789IM-_-i4" },
  },
  {
    id: "evidence", title: "Go find the counter-evidence",
    ask: "Who has done this while having your exact disadvantage? And when have YOU already done something like it?",
    why: "Look for the person who broke the rule you think is a law. Then go through your own history for the exceptions you have filed away.",
  },
  {
    id: "replace", title: "Write the replacement",
    ask: "Same subject, stated so it's both believable and useful. Not a slogan.",
    why: "Worked example: “I don't have time” becomes “I have an abundance of time for whatever I'm committed to.” It doesn't deny reality; it moves the problem to commitment.",
  },
  {
    id: "condition", title: "Condition it daily",
    ask: "Say it out loud, with your body, every day for 30 to 60 days.",
    why: "Deciding once does not change a belief. This works the same way the incantations do. Out loud, moving, repeated.",
  },
  {
    id: "references", title: "Stack the references",
    ask: "Each time you act as if it's true, log it. Count the legs.",
    why: "This is what makes a declared identity stick, and it is the one part here a product can genuinely help with. Every reference you log is another leg under the table.",
    quote: { text: "they become like the legs to a tabletop which is your belief", videoId: "bDdDQeugO64" },
  },
  {
    id: "room", title: "Change the room",
    ask: "Who around you needs this belief to stay true? Who would call your bluff?",
    why: "This step is last on purpose. The people around you hold your beliefs up, so the final move is an environmental one.",
  },
]

/** His compressed version of the whole thing, when the seven steps are too many. */
export const BELIEF_SHORT_FORM = {
  text: "identify",
  videoId: "jTVs9IbF8L0",
  gloss: "Identify it → get to the truth, which is usually the opposite of the belief → interrupt the old pattern → condition the new one.",
}

/** The three stems, for seeding the inventory input. */
export const BELIEF_STEMS = ["I am…", "I can't…", "I don't have the…"]

/** One belief the user is working, with its reference count. */
export interface BeliefWork {
  id: string
  /** The limiting belief as first written. */
  old: string
  /** The replacement, once written. */
  replacement?: string
  /** Whether they judged the old one useful. Recorded because "yes, it's
   * useful" is a legitimate answer that should stop the exercise. */
  useful?: boolean
  /** Counter-evidence they found. */
  evidence?: string[]
  /** ISO dates on which they logged acting as if the new belief were true. */
  references?: string[]
  /** ISO date the replacement was written — drives the 30-60 day window. */
  startedAt?: string
}
