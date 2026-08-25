/**
 * Everything the flows say, and the rules about how they say it.
 *
 * Content policy, because this is the kind of page where getting it wrong does
 * damage rather than just reading badly:
 *
 *  - **Public-domain sources only, for anything reproduced closely.** SAMHSA
 *    TIP 35 and NIAAA's Rethinking Drinking are US Government works and can be
 *    used as they stand. SMART Recovery and Therapist Aid publish worksheets
 *    free to *use* and forbid republishing, so where their tools are the best
 *    ones the fields are rebuilt in our own words rather than copied. The
 *    Rational Recovery and AVRT marks were *cancelled* in Dec 2022 and Oct
 *    2025 (USPTO TSDR) and rational.org is now parked — but cancellation of a
 *    registration is not abandonment of the underlying rights, so the rule
 *    stands unchanged: the technique is here and the names are not.
 *  - **Allen Carr is the live hazard, not Rational Recovery.** Allen Carr's
 *    Easyway holds current UK/EU/US marks in classes 9, 41 and 44 — software,
 *    training and health services, which is precisely this product — and the
 *    company has filed hundreds of DMCA notices. Nothing here paraphrases his
 *    text. Where the same mechanism is wanted, it gets rebuilt from the
 *    peer-reviewed descriptions (Keogan, Frings) rather than from the book.
 *  - **No "should", "must", "have to", "need to", "ought", "make sure you".**
 *    Enforced by tests/unit/vice/viceCopyLint.test.ts. Controlling language
 *    produces reactance in exactly the person this is for, and it creeps back
 *    in every time somebody edits a string without knowing the rule.
 *  - **Never the word "addiction" about a behaviour.** See LANGUAGE_RULES.
 */

// ---------------------------------------------------------------- safety

/**
 * The withdrawal interlock.
 *
 * This is the one screen in the whole module that is allowed to be blunt, and
 * it comes before any quit date can be set. Stopping alcohol or benzodiazepines
 * abruptly, without medical cover, can cause seizures and can be fatal — which
 * is not a thing to leave to a footnote under a streak counter.
 *
 * It does not lock anybody out. It asks, it says what the answer means, and it
 * makes carrying on a deliberate act rather than an accident.
 */
export const SAFETY = {
  title: "One thing before a date goes in",
  blurb:
    "Most things on that list are unpleasant to stop. Two of them are dangerous to stop suddenly on your own, and this question is the only way this page can tell.",
  question: "When you go without it for a day or so, do any of these happen?",
  signs: [
    "Shaking or tremors",
    "Sweating, or a racing heart",
    "Feeling sick, or being sick",
    "Trouble sleeping, or restlessness that will not settle",
    "Seeing or hearing things that are not there",
    "A seizure, ever",
  ],
  noneLabel: "None of these",
  /** Shown when they tick anything. Deliberately not softened. */
  warningTitle: "Talk to a doctor before you stop",
  warning: [
    "Those are withdrawal signs. With alcohol and with benzodiazepines, stopping abruptly without medical cover can cause seizures and can kill people. It is rare, and it is real, and it is treatable when somebody knows to look for it.",
    "A GP or a pharmacist can tell you in one appointment whether you need a managed reduction rather than a stop. Nothing on this page can do that.",
    "Everything else here still works. The urge tool, the log, the plans, the card — none of them require you to have stopped.",
  ],
  acknowledge: "I have read this. Carry on setting things up.",
  /** Shown afterwards, quietly, wherever a date appears. */
  banner: "You flagged withdrawal signs. A managed reduction is a doctor's call, not this page's.",
} as const

/**
 * Language rules, enforced by the lint.
 *
 * The second one is not squeamishness. Compulsive sexual behaviour is
 * classified as an impulse-control problem and not as an addiction, and a large
 * share of people who describe themselves as porn addicts turn out on
 * measurement to have a conflict between their behaviour and their values
 * rather than a dependence. Telling that person their brain is damaged is
 * inaccurate and makes them worse, so the module never says it about anybody.
 */
export const LANGUAGE_RULES = {
  /** Words that make the page an authority issuing instructions. */
  bannedControl: ["should", "must", "have to", "has to", "need to", "needs to", "ought to", "make sure you", "don't forget"],
  /** Never used about a behaviour, and never used about a person. */
  bannedDiagnosis: ["addict", "addiction", "addicted", "alcoholic", "junkie", "clean and sober"],
  /**
   * Empty encouragement.
   *
   * People who have quit something name this as actively repellent, in almost
   * these words — "you've got this" gets singled out more than any other line.
   * It reads as a page that has not understood the situation, and a page that
   * has not understood the situation is one you stop opening. Acknowledging
   * that it is hard is welcome; cheering is not.
   */
  bannedCheer: [
    "you've got this",
    "you have got this",
    "you can do it",
    "stay positive",
    "believe in yourself",
    "you are stronger than",
    "keep your chin up",
    "one day at a time",
  ],
  /**
   * Allowed where the module is describing the research honestly rather than
   * describing the person — the hub's provenance strip, and nowhere else.
   */
  diagnosisExemptIds: ["hub.provenance", "hub.evidence"],
  /**
   * Phrasing that reads as machine-written.
   *
   * This is a trust rule, not a taste one. Somebody deciding whether to believe
   * a page about their drinking is reading for whether a person wrote it, and
   * the tells below are the ones that answer "no" fastest. A page that sounds
   * generated is a page whose numbers get discounted too.
   *
   * Two kinds here. Filler that says nothing ("it is worth noting", "when it
   * comes to"), and inflated register that this module has no business in
   * ("journey", "empower", "transformative"). The house style is plain, short,
   * and specific, and these are the words that pull hardest away from it.
   */
  bannedMachineTells: [
    "delve",
    "tapestry",
    "a testament to",
    "navigate the complexit",
    "in today's world",
    "it is important to note",
    "it's important to note",
    "it is worth noting",
    "worth noting that",
    "when it comes to",
    "at the end of the day",
    "game-changer",
    "game changer",
    "deep dive",
    "unlock your",
    "empower",
    "seamless",
    "holistic",
    "myriad",
    "plethora",
    "underscore",
    "elevate your",
    "resonate with",
    "embark",
    "transformative",
    "cutting-edge",
    "in conclusion",
    "furthermore",
    "moreover",
    "your journey",
    "the journey",
  ],
  /**
   * The "not just X but Y" construction, which is the single most recognisable
   * shape in generated prose and creeps in wherever a sentence wants emphasis
   * it has not earned.
   */
  bannedEmphasisShape: /\b(not|isn't|is not|aren't|are not|wasn't|was not)\s+just\b[^.!?]{0,60}\bbut\b/i,
} as const

// ---------------------------------------------------------------- rulers

/**
 * The 0–10 rulers, from SAMHSA TIP 35 Exhibits 3.9 and 3.10. Public domain.
 *
 * The follow-up is the entire tool and it only works in one direction. Asking
 * "how are you at a 6 rather than a 3" invites somebody to make the case for
 * changing; asking "rather than a 9" invites them to make the case against, and
 * the case against is the thing that predicts it not happening. `viceService`
 * generates the lower number and will not generate a higher one.
 */
export const IMPORTANCE_RULER = {
  id: "importance",
  question: "How important is it to you to change this, if you decided to?",
  lowAnchor: "Not at all important",
  highAnchor: "Most important",
  whyNotLower: "How are you at a {n} instead of a {lower}?",
  whatWouldMove: "What would help move it from a {n} to a {up}?",
  zeroFallback: "What would make this matter even a little?",
  tenFallback: "What keeps it at a ten, on a day when it would be easier not to?",
} as const

export const CONFIDENCE_RULER = {
  id: "confidence",
  question: "How confident are you that you could change it, if you decided to?",
  lowAnchor: "Not at all confident",
  highAnchor: "Completely confident",
  whyNotLower: "How are you at a {n} instead of a {lower}?",
  whatWouldMove: "What would help you get from a {n} to a {up}?",
  zeroFallback: "What would make this feel even slightly possible?",
  tenFallback: "What are you drawing on that makes it a ten?",
} as const

/** Why the ruler answers get stored and shown back rather than summarised. */
export const RULER_NOTE =
  "What you write here gets kept in your own words and read back to you later, on a day it is harder to remember."

// ---------------------------------------------------------------- urges

/**
 * The urge tool, in the order the steps have to happen in.
 *
 * Label first, then body, then rate, then wait. That order is not arbitrary:
 * naming a feeling measurably takes the heat out of it, and locating it in the
 * body is impossible to do while still wanting — it moves a person from inside
 * the urge to looking at it, which is the whole trick.
 *
 * The line about being able to do it anyway is load-bearing and stays on screen
 * throughout. Take the demand away and observation becomes possible; leave the
 * demand in and the tool is one more test to fail.
 */
export const URGE = {
  title: "An urge, while it is happening",
  /** On screen for the entire tool. Never hidden, never conditional. */
  standing: "You can still do it afterwards. This is not a test.",
  steps: {
    halt: {
      title: "First, the cheap question",
      blurb: "A fair share of what arrives looking like an urge is one of these four wearing a costume.",
      options: ["Hungry", "Angry", "Lonely", "Tired"],
      followUp: "What would sort that out in the next twenty minutes?",
    },
    name: {
      title: "What is the feeling",
      blurb: "Pick what fits. Two taps is plenty — this is not a journal.",
    },
    body: {
      title: "Where is it, in your body",
      blurb: "Somewhere physical. This is the part that turns wanting it into watching it.",
    },
    rate: {
      title: "How strong, right now",
      blurb: "Zero to ten. Nobody sees this but you.",
    },
    wait: {
      title: "Ninety seconds",
      blurb: "Not to make it go. Just to watch what it does while nobody argues with it.",
      /** Deliberately not "and it will pass". It might not, and saying so costs trust. */
      after: "And now?",
    },
    close: {
      title: "What happened",
      passed: "It passed",
      acted: "I did it anyway",
      /** The most important sentence on the screen after "I did it anyway". */
      actedNote: "Logging it is worth more than not having done it would have been. That is not a consolation prize — the log is what the rest of this runs on.",
    },
  },
  /**
   * Never promise a duration. The "urges last twenty minutes" line is folklore
   * with no primary source behind it, and somebody whose urge outlasts the
   * timer has been handed a failure and a reason to disbelieve everything else
   * on the page. The module measures the person's own durations and quotes
   * those back instead.
   */
  durationPolicy:
    "This page does not tell you how long an urge lasts. Once you have logged a few, it tells you how long yours last.",
} as const

/**
 * What to do about the urge, offered as a choice rather than a single answer.
 *
 * This replaces a design where the only response was to watch the urge for
 * ninety seconds. That is urge surfing, and the research corpus is unkind to it
 * as a sole option:
 *
 *  - It is nearly absent from the largest peer community — four mentions
 *    against ten for playing the tape forward, which that community explicitly
 *    teaches to newcomers.
 *  - People report it *extending* the urge: attention on the thing keeps the
 *    thing present. One account puts their own urges at forty-five minutes,
 *    against a ninety-second timer.
 *  - Several report the urge is too fast to observe at all — the hand has moved
 *    before there is anything to watch.
 *  - A practitioner who uses it says plainly that in a cue-rich room the
 *    skilful move is to direct attention *away*, not toward.
 *
 * So the tool now asks where the person is, and offers four responses with the
 * cue-rich case steering away from observation. Watching is still here, because
 * it works for some people and they say so. It is no longer the only door.
 */
export const RESPOND = {
  title: "What do you want to do with it",
  blurb: "Four things people actually do. None of them is the right one — pick what fits where you are.",
  whereQuestion: "Where are you right now?",
  whereOptions: [
    { id: "near", label: "Near it, or with people who are using", cueRich: true },
    { id: "home", label: "At home, and it is in the house", cueRich: true },
    { id: "away", label: "Somewhere it is not available", cueRich: false },
  ],
  /** Shown when they picked a cue-rich answer. */
  cueRichNote:
    "Then watching it is the harder option, and somebody who teaches this says so — in a room full of the cue, moving your attention away works better than putting it on the urge. The first two below do that.",
  options: [
    {
      id: "tape",
      label: "Play the tape forward",
      help: "Run the film past the first one to how the night actually ends, and to the morning.",
      basis: "The move the largest peer community teaches newcomers, and the one with a trial behind it.",
    },
    {
      id: "out",
      label: "Get out of the room",
      help: "Leave, change the room, or go outside. Decide where you are going before you stand up.",
      basis: "Changing the context rather than the intention. The strongest single mechanism in the research.",
    },
    {
      id: "move",
      label: "Move",
      help: "Shoes on, out the door, or anything that gets your heart up for ten minutes.",
      basis: "One of the highest-count techniques people name, and the low-barrier version is a walk with a podcast.",
    },
    {
      id: "watch",
      label: "Watch it for ninety seconds",
      help: "Sit with it and see what it does. Works for some people and not for others.",
      basis: "Kept because people credit it. Not the default, because plenty report it making the urge louder.",
    },
  ],
  tapePrompt: "Say you do it. What happens next, and after that, and how is tomorrow morning?",
  outPrompt: "Where are you going, and what do you say on the way out?",
  movePrompt: "What are you about to do, and for how long?",
  /** Under every one of them. */
  anyIsFine: "Whichever you pick, coming back here afterwards to say what happened is the part that pays.",
} as const

/** Feeling words for the picker. */
export const FEELINGS = [
  "Bored", "Stressed", "Anxious", "Lonely", "Tired", "Angry", "Sad", "Restless",
  "Numb", "Ashamed", "Deserving", "Defiant", "Celebrating", "Relieved", "Empty", "Wired",
]

// ---------------------------------------------------------------- the voice

/**
 * Naming the urge and answering it.
 *
 * The move underneath is a semantic one: any first-person sentence arguing for
 * doing it gets its subject swapped, so "I want a drink" becomes "it wants a
 * drink, I do not". Rational Recovery built a whole method on this. Its marks
 * were cancelled in 2022 and 2025, which is not the same as abandoned, so the
 * technique is here under a plain description and their branding is not.
 */
export const VOICE = {
  title: "Give it a name, then answer it",
  blurb:
    "The lines it uses on you are not yours, and they are surprisingly few. Written down, they stop being persuasive and start being predictable.",
  nameHelp: "Something that makes it recognisable rather than frightening.",
  nameSeeds: ["The Negotiator", "The Smooth Talker", "The Whiner", "The Reasonable One", "The Saboteur"],
  saysLabel: "What does it say to you?",
  saysSeeds: [
    "You have earned this.",
    "Just one.",
    "This time is different.",
    "Nobody will know.",
    "You have been good all week.",
    "You are stressed. Deal with it tomorrow.",
    "You have already ruined it.",
    "Everyone else is.",
  ],
  backLabel: "What do you say back?",
  backSeeds: [
    "You are not in charge here. I am.",
    "I hear you, and you are not getting the microphone today.",
    "Name the last three times you said that.",
    "I will know. That was never the point.",
  ],
  /** The transformation, done for them once so they see the shape of it. */
  swapDemo: { from: "I want one.", to: "It wants one. I do not." },
} as const

/**
 * The lines the vice uses, and what stands up to them.
 *
 * Every one of these is a permission-giving thought — the sentence that arrives
 * between deciding not to and doing it anyway. The rebuttal is offered, and
 * then a field asks for their own version, because a borrowed rebuttal does not
 * hold at eleven at night and one they wrote does.
 */
export const PERMISSION_THOUGHTS: Array<{ id: string; thought: string; kind: string; rebuttal: string }> = [
  { id: "just-one", thought: "Just one will not hurt.", kind: "Minimising", rebuttal: "One could hurt. I have watched \"just one\" turn into a lot more than one." },
  { id: "deserve", thought: "I have earned this.", kind: "Entitlement", rebuttal: "I can reward myself with something that is still good tomorrow." },
  { id: "different", thought: "This time will be different.", kind: "Denying the history", rebuttal: "Name the last three times I thought that, and what happened." },
  { id: "secret", thought: "Nobody will know.", kind: "Secrecy", rebuttal: "I will know. Who was watching was never the point." },
  { id: "ruined", thought: "I have already blown it, so why stop now?", kind: "One slip becoming a verdict", rebuttal: "One is one. It is not a verdict, and the next hour is still mine." },
  { id: "hard", thought: "This is too hard, I cannot do it.", kind: "Low confidence", rebuttal: "Hard is not the same as impossible. What about the next ten minutes only?" },
  { id: "everyone", thought: "Everyone else is.", kind: "Normalising", rebuttal: "Their Tuesday is not my Tuesday. I decided this." },
  { id: "banned", thought: "I am not allowed to.", kind: "Being told what to do", rebuttal: "Nobody is imposing this. I chose it, and I can choose again." },
  { id: "tomorrow", thought: "I will stop after the weekend.", kind: "Deferring", rebuttal: "Tomorrow's version of me gets the same choice, with one more day on the pile." },
  { id: "sleep", thought: "I need it to sleep, or to relax, or to be able to talk to people.", kind: "A belief about what it does", rebuttal: "What do my own last five entries say my mood was an hour afterwards?" },
  { id: "occasion", thought: "It is a special occasion.", kind: "Making an exception", rebuttal: "How many special occasions were there last month?" },
  { id: "stress", thought: "I am too stressed to deal with this right now.", kind: "Escape", rebuttal: "Doing it adds a second problem to the first one." },
]

/** The three-beat method the rebuttals are used with. Public domain, NIAAA. */
export const REBUTTAL_METHOD = {
  title: "Stop it, find the error, replace it",
  interrupt: "Wait a minute — what am I telling myself?",
  steps: [
    "Catch the sentence, as close to word for word as you can.",
    "Find the error in it. It is usually one of the twelve.",
    "Say the replacement, out loud if you are alone.",
  ],
} as const

// ---------------------------------------------------------------- refusal

/**
 * What to say when it is offered. Adapted from NIAAA's refusal-skills module,
 * which is public domain.
 *
 * The reframe at the bottom is the highest-leverage sentence in the whole
 * module and it is why this step exists at all: "I am not allowed" breeds
 * resentment and resentment is what gives in. "I decided" does not.
 */
export const REFUSAL = {
  title: "What you say when it is offered",
  blurb:
    "Short, friendly, and without a reason attached. A reason is something to argue with, and a long explanation is an invitation to keep going.",
  rules: [
    "Do not hesitate. The pause is where you talk yourself into it.",
    "Look at them.",
    "Keep it short, clear and simple.",
    "Afterwards, change the subject. Defending the choice keeps it on the table.",
  ],
  /**
   * The first two rungs work for anything. The third names the thing, so it
   * cannot be one fixed sentence — a hardcoded "I am not drinking at the
   * moment" was being shown on the card to people quitting betting, porn and
   * scrolling, which is a small error that costs the whole page its credibility
   * with five of the nine vices. See `refusalLadder` in viceService.
   */
  ladder: [
    "No, thank you.",
    "No thanks, I do not want to.",
  ],
  /** Third rung, keyed by vice id. `{thing}` is filled from the catalogue. */
  ladderThird: {
    alcohol: "I am not drinking at the moment, and I would appreciate a hand with it.",
    nicotine: "I have packed it in, and I would rather not be offered.",
    weed: "I am off it at the moment. Go ahead without me.",
    gambling: "I am not putting anything on. I will watch.",
    porn: "That is not something I am doing any more.",
    scrolling: "I am off my phone this evening, on purpose.",
    gaming: "I am sitting this one out. Deal me back in another time.",
    junk: "Not for me tonight, thanks.",
    spending: "I am not buying anything today.",
    custom: "I have stopped, and I would appreciate a hand with it.",
  } as Record<string, string>,
  brokenRecord:
    "If they keep going: take a bit of their point — \"I hear you\" — and then go straight back to the same short line. If words run out, leaving is allowed.",
  scriptFields: [
    { id: "offer", label: "They offer. Picture an actual person and an actual room." },
    { id: "reply1", label: "What you say." },
    { id: "push1", label: "They push." },
    { id: "reply2", label: "What you say." },
    { id: "push2", label: "They push again." },
    { id: "reply3", label: "What you say." },
  ],
  rehearse: "Say it out loud once, now. That is the part that makes it available later.",
  autonomy:
    "A lot of people end up thinking \"I am not allowed to\", as though somebody had imposed a rule on them. That breeds resentment, and resentment is what gives in. You are in charge here. You know how you want your life to go, and you decided to change something.",
} as const

// ---------------------------------------------------------------- coping

/** What to do instead, bucketed by how long you have got. */
export const DISTRACTION_BUCKETS = [
  { id: "short", label: "Under five minutes", seeds: ["Cold water on my face", "Ten slow breaths", "Put the kettle on", "Text somebody", "Step outside", "Press-ups"] },
  { id: "mid", label: "Five to thirty", seeds: ["Walk round the block", "Shower", "Wash up", "Play something loud", "Call somebody", "Stretch"] },
  { id: "long", label: "Longer than that", seeds: ["Go to the gym", "Cook properly", "Go and see somebody", "Get out of the house entirely", "Something with my hands"] },
]

/** The four things you can do with an external trigger, and the three internal. */
export const COPING_MOVES = {
  external: [
    { id: "avoid", label: "Avoid it", help: "The cheapest one. Which exposure can simply stop happening?" },
    { id: "escape", label: "Leave", help: "For the ones you cannot see coming. What is the exit, and what do you say on the way out?" },
    { id: "distract", label: "Do something else", help: "Works better the more interesting the something else is." },
    { id: "endure", label: "Sit it out", help: "Talk it through, ask for help, or wait. Bring something with you: a card, a photo, no money." },
  ],
  internal: [
    { id: "distract-i", label: "Do something else" },
    { id: "letgo", label: "Let it go past", help: "Having the thought is not the same as having to follow it." },
    { id: "endure-i", label: "Sit it out" },
  ],
} as const

// ---------------------------------------------------------------- the lapse

/**
 * What happens after they do it.
 *
 * This screen decides whether somebody comes back, so it is built against the
 * abstinence violation effect rather than in ignorance of it. Two things turn
 * one lapse into abandoning the whole thing: an identity re-designation ("I am
 * a day-zero person again") and a stable, internal explanation ("I have no
 * willpower"). A counter that zeroes itself delivers both, at the exact moment
 * of maximum vulnerability, which is why this module does not have one.
 *
 * So: no red, no cross, no broken flame, no number going back to nought. Credit
 * for logging it, then a compassion beat, then questions that can only be
 * answered at the level of what happened rather than what kind of person they
 * are, then the chain backwards.
 */
export const LAPSE = {
  title: "You logged it",
  opener: "That is the hard part, and most people skip it. Nothing here is going to reset.",
  compassion: {
    prompt: "Say this to yourself the way you would say it to a friend who had just told you the same thing.",
    /** Editable. A borrowed sentence is a starting point, not the exercise. */
    draft: "That was a hard moment and I got through it badly. It is one evening. I know more about it now than I did this morning.",
  },
  /** Behaviour-level only. No "why are you like this". */
  questions: [
    { id: "before", label: "What happened just before?" },
    { id: "going-on", label: "What was going on for you?" },
    { id: "said", label: "What did you tell yourself, as close to word for word as you can?" },
  ],
  chain: {
    title: "Now work backwards",
    blurb:
      "Not to the moment you did it — to before that. Most of it was decided several apparently unrelated choices earlier.",
    prompt: "And what happened before that?",
    minSteps: 5,
    /** The single highest-yield question in the method. Own screen, on purpose. */
    pivot: "Why today, and not yesterday?",
    pivotHelp: "Yesterday had the same vice in it and you did not. Something was different. That difference is the actual finding.",
    earliest: "Mark the earliest point where a different move was still available.",
  },
  /** Straight after, so the answer to "what now" is already on the screen. */
  next: {
    title: "The next hour",
    lines: [
      "Setbacks are normal in anything that takes a while. It is the run of it that counts, not the evening.",
      "Each day is a fresh one to start on. Nothing about tonight obliges you to carry on.",
      // Not sentiment. Shame is the most consistently named cause of the second
      // one, in people's own accounts of it: "I could never hate myself into
      // stopping, and I tried hard." The page says so plainly rather than
      // cheering, which is the thing they say they cannot stand.
      "Running yourself down does not help, and reliably makes the next one more likely.",
    ],
    field: "One thing that would make the next hour easier:",
    /**
     * The reframe people who eventually stuck it describe using, almost word
     * for word — and the exact thing a counter going back to nought denies
     * them. Worth saying out loud, since there is no counter here to say it.
     */
    notStartingOver: "You are not starting over. Nothing you worked out has been taken off you, and you know one more thing about it than you did yesterday.",
  },
  /**
   * Where to go from here.
   *
   * Until this existed the debrief ended at "Done" and closed — the moment the
   * module had least to say and the corpus has most. Two onward routes, both
   * earned: the attempt review, because a lapse is the specific ending it keys
   * its answer on, and the tripwire when the honest answer is that things had
   * been going well.
   */
  onward: {
    label: "Now what",
    again: "Look at what was different last time",
    againWhy: "This just became your most recent ending, which is what the useful rule gets learned from.",
    tripwire: "Write a rule for the next good stretch",
    tripwireWhy: "If this came out of a good run rather than a bad day, that is the pattern worth planning for.",
  },
} as const

// ---------------------------------------------------------------- if-then

/**
 * The plan builder, and the one validation rule with hard experimental backing.
 *
 * A plan phrased as a negation — "if I am offered one, then I will NOT take it"
 * — measurably backfires, and it backfires worst in exactly the people whose
 * habit is strongest. The plan has to name something to *do*. So the builder
 * rejects the negation words rather than advising against them, and
 * `viceService.planProblem` is where that lives.
 */
export const IFTHEN = {
  title: "If this happens, then I do this",
  blurb:
    "One plan per situation, not one master plan. The \"if\" is something you could photograph, and the \"then\" something you could start inside a minute.",
  whenLabel: "When…",
  whenPlaceholder: "it gets to six and I walk in the door",
  thenLabel: "…then I",
  thenPlaceholder: "put my keys down and start the kettle before I take my coat off",
  rejectNegation:
    "A plan that names what you will not do makes the thing louder rather than quieter, and it does that most in the people it matters most for. Name what you will do instead.",
  vagueCue: "Something you could photograph — a time, a room, a person, a feeling in your body.",
  rehearse: "Read it out once. That is the bit that puts it within reach later.",
} as const

// ---------------------------------------------------------------- misc

/** The self-binding menu — deciding now what later-you cannot easily undo. */
export const BINDING = {
  title: "Decide it now, so it is not a decision later",
  blurb:
    "Willpower at eleven at night is a bad bet, and it is an avoidable one. Every item here is a choice you make once, calmly, that later-you then does not get to make.",
  groups: [
    {
      id: "physical",
      label: "Put distance in",
      help: "Between you and it. Steps, locks, or simply not having any in the house.",
      seeds: ["None in the house", "Card details deleted", "App off the phone", "Phone charges in the kitchen", "Different route home", "Give the spare key to somebody"],
    },
    {
      id: "chronological",
      label: "Put time in",
      help: "Windows when it is on the table, and a line after which it is not.",
      seeds: ["Not before six", "Not on weeknights", "Not alone", "Nothing after nine", "Only when it is planned a day ahead"],
    },
    {
      id: "categorical",
      label: "Draw the category line",
      help: "Which specific version is in and which is out. Vague rules get relitigated nightly.",
      seeds: ["Beer yes, spirits no", "Out with people yes, alone no", "Weekends only", "Never the first thing in the morning"],
    },
  ],
} as const

/**
 * The tripwire — a rule for the good stretch.
 *
 * The single largest gap the research turned up. Across eight independent
 * sources and five substances, the relapse trigger people describe is *feeling
 * fine*, not craving: "now I can finally moderate", arriving at day 4 when the
 * symptoms lift, at ten days and two months for cannabis, at six months and a
 * year for nicotine, and at nine years in one case. An RCT gives it a
 * mechanism — positive affect predicted urge, which predicted intoxication.
 *
 * And the signal that separates the people it held for: whether the plan rests
 * on self-trust or on structure. One person failed at day 72 *because*
 * confidence returned. Another has held for months while saying plainly that
 * they do not trust themselves, with a timed lock box doing the work.
 *
 * Only two people in the entire corpus had written a rule for this in advance.
 * Nobody who failed had. That is what this screen is.
 */
export const TRIPWIRE = {
  title: "A rule for the week it is going well",
  blurb:
    "Every other plan in here is for a bad moment. This one is for a good one, which is the moment people actually describe going wrong.",
  why: [
    "The pattern is remarkably consistent. It is rarely a crisis that ends it. It is a good stretch, read as evidence that the problem has been solved — and then a reasonable-sounding decision to test that.",
    "One person put it exactly: it was not stress or trauma, they just thought they deserved a treat. Another got to day 72, stopped thinking about it at all, decided that meant they could moderate, and was back inside a fortnight.",
    "So the useful thing to write, now, is what you will do when that thought turns up. Not whether it will.",
  ],
  /** The thought itself, in the words people use, offered as cues. */
  thoughts: [
    "I could probably moderate now",
    "I have proved I can stop",
    "It has been long enough",
    "I have earned this",
    "I do not even think about it any more",
    "It was never that bad",
  ],
  whenLabel: "When I notice myself thinking…",
  thenLabel: "…then I",
  thenPlaceholder: "read this back, and tell {person} the thought turned up before I do anything about it",
  /** The MI-consistent framing: the thought is information, not a verdict. */
  note:
    "The thought is not a warning that you are about to fail. It arrives for nearly everybody, and it arrives because things improved. Writing the response now is what makes it a piece of information rather than a decision.",
  selfTrustWarning:
    "One thing the accounts agree on, and it is counter-intuitive: a plan that rests on trusting yourself is the fragile kind. The ones that held rested on something outside the person — a lock, a rule, another human being. If your answer is a version of \"I will be fine\", that is the shape that failed.",
  /** Shown when a hazard window is reached. */
  nudgeTitle: "About this point, for a lot of people",
  nudge:
    "You are around the mark where the accounts get interesting — not because anything is wrong, but because this is where things usually feel better and the arguing starts. Worth two minutes.",
  empty: "Nothing written yet.",
  saved: "That is your tripwire. It sits with your plans and on your card.",
} as const

/** What to say about where the numbers on the review screen came from. */
export const PROVENANCE = {
  title: "Where this comes from",
  lines: [
    "The rulers and the refusal script are from SAMHSA's TIP 35 and NIAAA's Rethinking Drinking, both US Government works in the public domain, used close to as written.",
    "The urge work, the chain backwards and the lapse screen follow Marlatt's relapse-prevention model. The expected-against-actual rating is Brewer's reward-value work.",
    "SMART Recovery and Therapist Aid publish the best versions of several of these and do not permit republishing, so where their tool was the model the questions have been rebuilt rather than copied.",
    "Nothing here is treatment, and none of it is a diagnosis. It is a set of exercises with reasonable evidence behind them, arranged so you can actually get through them.",
  ],
  /** Said plainly rather than buried, because the honest number is unflattering. */
  evidence:
    "Apps for this have a poor record on their own — the trials mostly find small effects or none, and what predicts anything is whether a person keeps opening the thing. So this is built to be short, to survive a bad night, and to give you back something you did not know.",
} as const
