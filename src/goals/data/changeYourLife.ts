/**
 * Findings and prototype content for the "how to change your life" corpus study.
 *
 * Source: docs/research/change-your-life/ — 91 full transcripts (300,390 words)
 * and 1,822 top-ranked comments across 474M views. Every claim here traces to a
 * video or a comment in that corpus; quotes are verbatim from auto-captions and
 * comment text, reproduced with their original typos.
 *
 * The flow content below is *our* copy, not a creator's. The research shaped the
 * questions; no source is named in anything the user reads inside the flow.
 */

// ------------------------------------------------------------------- corpus

export const CYL_TOTALS = {
  transcripts: 91,
  words: 300_390,
  comments: 1_822,
  commentsBehind: 515_920,
  views: 474_193_612,
  likesRepresented: 4_750_000,
  channels: 54,
  queries: 72,
  candidates: 1_231,
} as const

/** Median like-rate by category. Age- and channel-size independent. */
export interface CylCategoryStat {
  cat: string
  label: string
  sublabel: string
  n: number
  medianLikeRate: number
  best: number
}

export const CYL_CATEGORY_STATS: readonly CylCategoryStat[] = [
  { cat: "MEN", label: "Masculine self-improvement", sublabel: "discipline, monk mode", n: 14, medianLikeRate: 5.08, best: 8.31 },
  { cat: "ANTI", label: "Anti-self-help", sublabel: "critiques of the genre", n: 10, medianLikeRate: 5.08, best: 6.32 },
  { cat: "GEN", label: "General life change", sublabel: "habits, purpose, reinvention", n: 24, medianLikeRate: 3.69, best: 8.34 },
  { cat: "DATE", label: "Dating advice for men", sublabel: "approach, attraction, apps", n: 32, medianLikeRate: 3.12, best: 6.02 },
  { cat: "SCI", label: "Science & psychology", sublabel: "mechanism explainers", n: 13, medianLikeRate: 2.85, best: 3.80 },
] as const

export const CYL_MEDIAN_LIKE_RATE = 3.62

/**
 * How fast this genre actually talks, measured from the corpus rather than
 * taken from a generic figure.
 *
 * Transcript word count ÷ runtime across the 91 videos that have both:
 *   p10 149 · p25 168 · **median 188** · p75 210 · p90 235
 *
 * The usual "150–160 wpm" advice sits at this genre's tenth percentile, and the
 * videos down there are the motivational-speech compilations — a register worth
 * avoiding. The creators closest to this product run far faster: 267, 261, 240.
 *
 * At 188 wpm a three-minute vertical holds about 564 words.
 *
 * Caveat: auto-captions drop the odd word and b-roll or music lowers the
 * apparent rate, so these read slightly slow if anything.
 */
export const CYL_GENRE_WPM = {
  p25: 168,
  median: 188,
  p75: 210,
  p90: 235,
} as const

// ------------------------------------------------------- what they improvised

// -------------------------------------------------- how strong the evidence is

/**
 * Comment-derived findings ranked by **convergence**, not by likes.
 *
 * The first pass ranked this evidence by like count, and the data says that was
 * wrong: of the 100 most-liked comments in the corpus, **zero** report anything
 * that actually happened. Likes measure wit and recognition inside one video's
 * audience — a good signal for what a hook should sound like, a bad one for what
 * is true across a genre.
 *
 * What survives is convergence: the same thing appearing independently under
 * videos with nothing to do with each other. Note how badly the two disagree —
 * the strongest finding here sits at 754 median likes and the weakest at 3,500.
 *
 * Reproduce with `~/.cache/cyl-corpus/convergence.py`. Every count is a **lower
 * bound**: these are regexes over free text and they catch a fraction of how
 * people actually phrase things, so a low count means "not demonstrated", never
 * "does not happen".
 */
export interface CylConvergence {
  finding: string
  videos: number
  channels: number
  medianLikes: number
  /** How much weight this can carry. */
  strength: "strong" | "moderate" | "thin"
  note: string
}

export const CYL_CONVERGENCE: readonly CylConvergence[] = [
  {
    finding: "A viewer writes out the steps the video never gave",
    videos: 41,
    channels: 28,
    medianLikes: 754,
    strength: "strong",
    note: "Forty-one of the ninety-one videos have someone in the comments typing out the framework as a numbered list. Verified by sampling: these are the video’s own steps, reconstructed by a viewer because the video only ever said them out loud.",
  },
  {
    finding: "The plan does not fit the commenter’s circumstances",
    videos: 15,
    channels: 14,
    medianLikes: 182,
    strength: "moderate",
    note: "Money, a shared house, two jobs, shift work, children, parents who decide what happens. Almost never the top comment — the median is 182 likes — which is exactly why sorting by likes hides it.",
  },
  {
    finding: "Someone reports a measured outcome",
    videos: 15,
    channels: 13,
    medianLikes: 333,
    strength: "moderate",
    note: "“Day 523.” “Three months sober.” “Twenty-four weeks strong.” People keep counts nobody asked them to keep, and they volunteer the number unprompted.",
  },
  {
    finding: "Someone posts a dated pledge",
    videos: 6,
    channels: 5,
    medianLikes: 566,
    strength: "moderate",
    note: "A start date and a promise, written to strangers. Real, but narrower than the first pass implied — five channels, not a genre-wide habit.",
  },
  {
    finding: "Someone returns later to report what happened",
    videos: 6,
    channels: 5,
    medianLikes: 734,
    strength: "moderate",
    note: "An edit on the original comment, months or years on. Pairs with the pledge above and appears about as often.",
  },
  {
    finding: "The like button used as a reminder or bookmark",
    videos: 2,
    channels: 2,
    medianLikes: 3500,
    strength: "thin",
    note: "The clearest example of the trap. It has by far the highest likes of anything here and by far the least spread — two videos. It was given headline treatment in the first pass and should not have been.",
  },
] as const

export interface CylImprovised {
  likes: number
  what: string
  where: string
}

/**
 * The audience building the missing accountability product by hand. Dated
 * pledge, scheduled return, visible log, stranger audience — invented
 * independently across six unconnected channels.
 */
export const CYL_IMPROVISED: readonly CylImprovised[] = [
  { likes: 9300, what: "The same four-step method reconstructed by three separate commenters, because the talk never numbered its own steps", where: "Judson Brewer, TED" },
  { likes: 7000, what: "“I want to come back here 10 years from now and say, ‘I did it’” — updated in 2026 with her nursing-board pass", where: "Team Fearless" },
  { likes: 7000, what: "Hand-typed step lists extracting the framework the video never stated", where: "Odysseas, and five others" },
  { likes: 4600, what: "The like button repurposed as a reminder service: “whenever someone likes this comment”", where: "TEDx · von Fliss" },
  { likes: 4200, what: "A dated commitment, returned to a year later and edited with the outcome", where: "Mateusz M, “Unbroken”" },
  { likes: 2400, what: "A bookmark, because nothing says come back tomorrow: “Plz someone like this so that i can come back”", where: "Better Ideas" },
  { likes: 286, what: "A self-invented commitment device: “I will do 1 push up per like, per day”", where: "Hamza" },
  { likes: 210, what: "A bean jar — one bean per completed session — because the episode shipped no tracker", where: "Mel Robbins · James Clear" },
] as const

// ---------------------------------------------------------------- the gaps

export interface CylGap {
  n: number
  title: string
  said: string
  gap: string
}

export const CYL_GAPS: readonly CylGap[] = [
  {
    n: 1,
    title: "A relapse protocol",
    said: "Hamza names the exact failure point — “The fourth day or close enough is the day that it just comes crashing down” — and never addresses it. Project 50 makes you restart from day one on any miss; its comment section is day-one pledges and essentially no finishers.",
    gap: "One exception in 91: Dr. Tracey Marks — “Relapse isn’t failure, it’s feedback.”",
  },
  {
    n: 2,
    title: "Selection",
    said: "Everyone teaches review; nobody teaches choosing. Ali Abdaal names his goal-selection system and skips explaining it. struthless’s life-changing one-thing was picked for him by a mentor — the one input a viewer cannot get from the video.",
    gap: "The audience, under Odysseas: “There are too many things and I want to do all of them.”",
  },
  {
    n: 3,
    title: "Duration — and where stated, wildly incoherent",
    said: "D’Avella runs 30 days. Mel Robbins’ episode is titled Change Your Life in 1 Month while her guest says identity payoff “sometimes takes a decade or more.” Gadzhi says five years minimum. Dr. K says three to seven.",
    gap: "A viewer sampling this genre receives estimates spanning 30 days to 15 years for the same request.",
  },
  {
    n: 4,
    title: "Measurement",
    said: "Roughly nine of 91 prescribe any tracking artifact at all. James Clear’s wall calendar is the strongest, and notably the tracking is the reward, not just the record.",
    gap: "Everyone else offers a feeling.",
  },
  {
    n: 5,
    title: "A constraints layer",
    said: "Money, hours, dependants, control of your own space — assumed, never entered. Gadzhi’s protocol needs a relocation to Cape Town. Thewizardliz’s first step is “look for a job in a different country.”",
    gap: "Measured: D’Avella says purge your kitchen; his two top comments — 83,000 likes combined — are people who don’t control their kitchen.",
  },
  {
    n: 6,
    title: "Candidate generation",
    said: "Purpose frameworks format an answer you already have. Abdaal’s career system requires knowing which tasks you enjoy; his two highest comments both say that is the actual hard part and it isn’t addressed.",
    gap: "Nobody produces a candidate answer from a person’s actual history.",
  },
  {
    n: 7,
    title: "A route from level −5 to level 1",
    said: "Named by a commenter, ignored by every creator: “All the programs and coaches miss this very important step of getting from lvl -5 to lv1.”",
    gap: "Every program starts above where the viewer is standing.",
  },
] as const

// --------------------------------------------------------------- consensus

export interface CylConsensus {
  title: string
  body: string
}

export const CYL_CONSENSUS: readonly CylConsensus[] = [
  { title: "Willpower is the villain, environment is the fix", body: "The broadest agreement in the corpus. Best mechanism, from Dr. Marks: willpower lives in the prefrontal cortex, habits in the basal ganglia — “you’re asking your conscious brain to fight an automatic system that’s faster older and stronger.”" },
  { title: "Act first, feel second", body: "Hormozi’s “emotion follows motion”, struthless’s “action comes before motivation”, Todd V’s “approaching is primarily a physical act”, and Academy of Ideas’ version: act while depressed, because the feeling is a symptom of not acting." },
  { title: "Identity beats goals", body: "Clear’s “every action is a vote”; Abdaal’s “will you vote is an action, will you be a voter is an identity”; Thomas Frank’s “No thanks, I’m not a smoker.”" },
  { title: "Knowing is never the bottleneck", body: "Manson: “learning can feel like progress even when it’s not progress.” Sivers, via Ferriss: “If more information were the answer, we’d all be billionaires with six pack abs.”" },
  { title: "Small beats big", body: "The two-minute rule, ten squats, “so small that you can’t lose”, and Ferriss’s inversion of every hustle short on the platform: “lower your standards until you get started.”" },
] as const

// -------------------------------------------------------------- divergences

export interface CylDivergence {
  split: string
  a: string
  b: string
  risk?: string
}

export const CYL_DIVERGENCES: readonly CylDivergence[] = [
  {
    split: "Tell someone / tell no one",
    a: "Clear: accountability partner, habit contract, $10 forfeit. Sisyphus 55, on suicidality: low social support and “an aversion to self-disclosure” are primary predictors.",
    b: "Better Ideas: telling people is “genuinely destructive”. Thewizardliz: keep it private, the evil eye is real.",
    risk: "Not a preference. For a user in crisis, “tell no one” is dangerous advice. Privacy can be a default; isolation cannot be a prescription.",
  },
  { split: "Accept yourself / refuse to", a: "Izadi: “tough love when you’re speaking to yourself often isn’t very smart love.”", b: "Leo Skepi: “I don’t want to accept myself how I am.” Hamza: “have a little bit of hatred towards yourself.”" },
  { split: "Measure / don’t", a: "Hormozi: “confidence comes from data, not dopamine.” Clear: don’t break the chain.", b: "Martha Beck: “don’t be counting things — that’s all left hemisphere thinking.” Sisyphus 55 names tracking apps as the pathology." },
  { split: "Inner work / reps first", a: "Dr. K: diagnose, then identity and beliefs — gym and flirting come last.", b: "Todd V: leave the house, walk over, say anything. Better Ideas: stop cerebralizing, get out the door." },
  { split: "Immersion / tiny steps", a: "Monk mode, Project 50, the 24-hour dopamine detox.", b: "Two minutes, ten squats, “so small you can’t lose”." },
  { split: "Your fault / not your fault", a: "The genre’s default personal-responsibility frame.", b: "Man Carrying Thing: “the issue is that no one wants to hire entry-level positions.” Memeable Data: it’s the app’s math, not your profile." },
  { split: "Find passion / build it", a: "Leipzig: what are you supremely qualified to teach?", b: "Academy of Ideas: “our passions follow the development of our skills.”" },
  { split: "Goals / anti-goals", a: "Abdaal: write them down, review weekly.", b: "Clear: “FORGET ABOUT GOALS, FOCUS ON SYSTEMS INSTEAD.”" },
  { split: "Scarcity / transparency", a: "Corey Wayne: “women are more attracted to guys they have to work for.”", b: "Psych2Go: “don’t try to play it cool or play hard to get.” Henry Grey Earls: “being emotionally available is a power move.”" },
] as const

// ------------------------------------------------------ specimen comments

export interface CylComment {
  likes: number
  text: string
  source: string
}

export const CYL_TOP_COMMENTS: readonly CylComment[] = [
  { likes: 127000, text: "I realized that ive started to always scroll down the comments section while the video is still playing. It's my brain searching for more dopamine than the video on its own can provide", source: "Better Than Yesterday" },
  { likes: 93000, text: "\"Be careful who you start dating. A lot of people ain't looking for love, they're looking for help\" - Johnny Bravo", source: "Psych2Go" },
  { likes: 59000, text: "Dating for straight women is like shopping. Dating for straight men is like a job interview.", source: "Memeable Data" },
  { likes: 41000, text: "it’s so much easier when you don’t have a family that’s also addicted.", source: "Matt D'Avella" },
  { likes: 37000, text: "90% of people watching this video are laying on their bed.", source: "Better Than Yesterday" },
  { likes: 34000, text: "I'm 23 and feel completely lost, seems like everyone is better, smarter etc. than me... this video helped to have patience with myself... thank you!", source: "struthless" },
  { likes: 33000, text: "Step 9: Stop watching these videos. You already know what to do.", source: "Better Ideas" },
  { likes: 19000, text: "I am naturally not selected", source: "HealthyGamerGG" },
  { likes: 12000, text: "I don’t want to die, I just don’t want to keep doing this version of living.", source: "Sisyphus 55" },
  { likes: 9700, text: "\"Work on yourself\" is the equivalent of \"Have you tried turning it on and off?\"", source: "HealthyGamerGG" },
  { likes: 3400, text: "its sad how fast i clicked on this — even more sad how the only answer i have is my name", source: "TEDx · Adam Leipzig" },
  { likes: 2400, text: "Plz someone like this so that i can come back", source: "Better Ideas" },
] as const

// ------------------------------------------------------------- the flow

export type CylLayerId =
  | "material"
  | "access"
  | "skill"
  | "belief"
  | "regulation"
  | "direction"
  | "crisis"

export interface CylLayerDef {
  id: CylLayerId
  label: string
  /** What we say back to the user once this is their primary constraint. */
  verdict: string
  /** What the flow does next. Two of these deliberately do not lead to a protocol. */
  next: string
  /** Where in the corpus this layer came from. Shown in the research view, never in the flow. */
  provenance: string
}

export const CYL_LAYERS: readonly CylLayerDef[] = [
  {
    id: "material",
    label: "Circumstances",
    verdict: "Your bottleneck right now is your circumstances, not your character.",
    next: "We are not going to hand you a protocol that assumes a free evening and your own kitchen. First we find what actually fits inside the week you have.",
    provenance: "Man Carrying Thing; the 83,000 likes on “I don’t control my kitchen”",
  },
  {
    id: "access",
    label: "Access",
    verdict: "You know what to do. There is nowhere and nobody to do it with.",
    next: "The work is building a place to practise before building the skill. Every rung comes with somewhere to stand.",
    provenance: "Dr. K on the loss of third spaces; “You will NOT meet someone, ever, without meeting new people”",
  },
  {
    id: "skill",
    label: "Skill",
    verdict: "You get the chance and you don’t yet know the moves.",
    next: "A ladder, starting below where you think you are, where every rung ends with permission to walk away.",
    provenance: "Todd V’s desensitisation ladder; Coach Kyle’s approach geometry",
  },
  {
    id: "belief",
    label: "What you believe about yourself",
    verdict: "Something in you discounts the evidence when it goes well.",
    next: "Before reps, we collect evidence you are not allowed to argue with — and check what you do with it.",
    provenance: "Dr. K on core beliefs; Aaron Beck’s cognitive model",
  },
  {
    id: "regulation",
    label: "Doing it at all",
    verdict: "You know, you want to, and you still don’t do it. That is a different problem from not knowing.",
    next: "We size one rep to your worst day and write the relapse letter before you need it.",
    provenance: "Brewer on urges; Izadi on self-talk; Dr. Marks on the basal ganglia",
  },
  {
    id: "direction",
    label: "Direction",
    verdict: "You would act. You don’t know at what.",
    next: "We generate candidates from what you have already done, rather than asking you what your purpose is.",
    provenance: "Leipzig’s question two — where 20.4M viewers stall",
  },
  {
    id: "crisis",
    label: "Below the line",
    verdict: "What you have described is not a self-improvement problem, and it would be dishonest to hand you a habit tracker.",
    next: "This flow stops here on purpose. Talking to a person — a GP, a therapist, a crisis line, a friend tonight — is the step that matters, and it is not a smaller step than the ones below it.",
    provenance: "Sisyphus 55 — low social support and aversion to self-disclosure are primary predictors",
  },
] as const

export interface CylDifferentialOption {
  label: string
  /** Layers this answer is evidence for. */
  weights: Partial<Record<CylLayerId, number>>
}

export interface CylDifferentialQuestion {
  id: string
  question: string
  hint?: string
  options: readonly CylDifferentialOption[]
}

/**
 * Seven discriminating questions. They route to a primary constraint, never to a
 * personality type — the output is one sentence about what is in the way.
 *
 * Phrasing is taken from how the audience phrases it in the comments, not from
 * how creators phrase it: "stuck", "behind", "I already know what to do".
 */
export const CYL_DIFFERENTIAL: readonly CylDifferentialQuestion[] = [
  {
    id: "stops-first",
    question: "When you picture doing the thing, what stops you first?",
    options: [
      { label: "I don’t know how", weights: { skill: 3 } },
      { label: "There’s nowhere and no-one to do it with", weights: { access: 3 } },
      { label: "I can’t make myself", weights: { regulation: 3 } },
      { label: "I don’t know what the thing even is", weights: { direction: 3 } },
      { label: "There isn’t time or money for it", weights: { material: 3 } },
    ],
  },
  {
    id: "perfect-plan",
    question: "If someone handed you a perfect step-by-step plan tomorrow, could you run it this week?",
    hint: "Not in a good week. This week.",
    options: [
      { label: "Yes, I’d start", weights: { regulation: 1, skill: 1 } },
      { label: "Yes, but I’d stop within a few days", weights: { regulation: 3 } },
      { label: "No — my week isn’t mine to spend", weights: { material: 3 } },
      { label: "No — I’d have nowhere to actually do it", weights: { access: 3 } },
    ],
  },
  {
    id: "real-chance",
    question: "In the last month, did you get a real chance at this and not take it?",
    options: [
      { label: "Yes, and I froze", weights: { skill: 2, belief: 1 } },
      { label: "Yes, and I talked myself out of it", weights: { belief: 3 } },
      { label: "No — no chance came up", weights: { access: 3 } },
      { label: "I haven’t been in a position for one", weights: { access: 2, material: 1 } },
    ],
  },
  {
    id: "goes-well",
    question: "When something goes well, how long does it stay true for you?",
    options: [
      { label: "It sticks", weights: {} },
      { label: "A day or two", weights: { belief: 1 } },
      { label: "I find a reason it didn’t count", weights: { belief: 3 } },
      { label: "Nothing has gone well in a while", weights: { belief: 2, crisis: 1 } },
    ],
  },
  {
    id: "already-know",
    question: "Is there something you already know you should do, and just… don’t?",
    hint: "The most-liked comment in this whole study says exactly this.",
    options: [
      { label: "Yes, and I can name it right now", weights: { regulation: 3 } },
      { label: "Yes, but I’m not sure it’s the right thing", weights: { direction: 2, regulation: 1 } },
      { label: "No — I genuinely don’t know what to do", weights: { direction: 3, skill: 1 } },
    ],
  },
  {
    id: "control",
    question: "Can you change your own surroundings?",
    hint: "Throw food out, delete an app, rearrange a room, be alone for twenty minutes.",
    options: [
      { label: "Yes, all of that", weights: {} },
      { label: "Some of it", weights: { material: 1 } },
      { label: "No — I don’t control the place I live", weights: { material: 3 } },
    ],
  },
  {
    id: "floor",
    question: "Last two weeks — how has it actually been?",
    hint: "There is a route through this flow that stops rather than hands you a plan. This question is what finds it.",
    options: [
      { label: "Flat, but fine", weights: {} },
      { label: "Low. I’m still doing the basics", weights: { regulation: 1 } },
      { label: "I’ve stopped doing things I used to enjoy", weights: { crisis: 2, regulation: 1 } },
      { label: "I’ve been having thoughts of hurting myself", weights: { crisis: 10 } },
    ],
  },
] as const

export interface CylConstraintField {
  id: string
  label: string
  hint: string
  kind: "number" | "choice"
  suffix?: string
  choices?: readonly string[]
}

/** The ledger. Everything downstream is checked against these. */
export const CYL_CONSTRAINTS: readonly CylConstraintField[] = [
  { id: "hours", label: "Hours a week that are genuinely yours", hint: "Not ideally. This week.", kind: "number", suffix: "hrs" },
  { id: "money", label: "Money you could spend on this each month", hint: "Zero is a real and common answer.", kind: "number", suffix: "/mo" },
  { id: "space", label: "Control over where you live", hint: "Can you throw things out and be alone in a room?", kind: "choice", choices: ["Full", "Partial", "None"] },
  { id: "dependants", label: "People who depend on you", hint: "Children, parents, anyone whose day you run.", kind: "choice", choices: ["Nobody", "Someone", "Several"] },
  { id: "health", label: "Anything physical that limits you", hint: "Left blank is fine.", kind: "choice", choices: ["Nothing", "Something minor", "Something significant"] },
  { id: "access", label: "People you could actually see this month", hint: "Friends, colleagues, a class, a club — anyone.", kind: "choice", choices: ["Plenty", "A few", "Nobody"] },
] as const

// ------------------------------------------------------ showcase (on camera)

/**
 * Copy for the showcase tab, which is written to be **filmed** — scrolled
 * through as B-roll inside the short.
 *
 * Three rules separate this from the deep-dive copy:
 *  1. Every line stands on its own. A viewer sees it for two seconds with no
 *     narration explaining it, so nothing may depend on a sentence above it.
 *  2. No creator names, no channel names, no attributed quotes. On screen those
 *     read as callouts of specific people; they belong in the backend tab.
 *  3. Say the number in words as well as digits where the digits alone are
 *     ambiguous ("nine videos out of ninety-one", not "9/91").
 */
export interface CylCountFact {
  filled: number
  total: number
  headline: string
  body: string
}

export const CYL_COUNT_FACTS: readonly CylCountFact[] = [
  {
    filled: 9,
    total: 91,
    headline: "Nine give you a way to tell if it's working.",
    body: "The rest say go on how you feel. That's the first thing to break on a bad week.",
  },
  {
    filled: 2,
    total: 91,
    headline: "Two tell you how long it takes.",
    body: "One says three to seven years. One says fifteen to two hundred and fifty days, and admits nobody can say which. The other eighty-nine let you guess, then you measure yourself against your own guess.",
  },
  {
    filled: 1,
    total: 91,
    headline: "One tells you what to do after you miss a day.",
    body: "Missing isn't the exception. It's the thing that ends it. Ninety of them go quiet right there.",
  },
] as const

export interface CylDurationClaim {
  label: string
  /** Low and high estimate in days. Equal values mean a point estimate. */
  lowDays: number
  highDays: number
  human: string
}

/**
 * The same question — how long does changing your life take? — as answered by
 * videos in this study. Sources deliberately unnamed: the point is the spread,
 * not who said what. Named in `05-per-video-extracts.md`.
 */
export const CYL_DURATIONS: readonly CylDurationClaim[] = [
  { label: "A 30-day challenge", lowDays: 30, highDays: 30, human: "30 days" },
  { label: "A video titled “in one month”", lowDays: 30, highDays: 30, human: "1 month" },
  { label: "The one honest range", lowDays: 15, highDays: 250, human: "15–250 days" },
  { label: "The guest on that same episode", lowDays: 730, highDays: 3650, human: "2–10 years" },
  { label: "A psychiatrist, on dating", lowDays: 1095, highDays: 2555, human: "3–7 years" },
  { label: "A creator, on becoming who you want to be", lowDays: 1825, highDays: 5475, human: "5–15 years" },
] as const

export interface CylShowcasePanel {
  key: string
  eyebrow: string
  headline: string
  body: string
}

/**
 * The narrative spine of the showcase, in scroll order.
 *
 * Written to be **read aloud**, in the first person, by the person who owns the
 * product. Not an analyst reporting a study.
 *
 *  1. The claim leads. The research is a receipt dropped in once, not the
 *     credential the whole thing hangs off. "I read 91 videos" persuades nobody.
 *  2. Short sentences. Say it once. If a line cannot be said out loud in one
 *     breath it gets cut.
 *  3. Speak to one person, as "you". No balanced clauses, no rule-of-three
 *     flourishes, no dash-stacked asides.
 *  4. **Give the thing away.** The second draft spent its whole length saying
 *     nobody tells you what to do, and then also did not tell you what to do.
 *     That is the exact failure the research is about, so a page shaped that way
 *     refutes itself. Most of the page is now the substance; the gap in the
 *     genre is one beat, and it exists to introduce the part we hand over.
 */
export const CYL_SHOWCASE: readonly CylShowcasePanel[] = [
  {
    key: "already-know",
    eyebrow: "",
    headline: "The advice was never the problem.",
    body: "Every video you've watched told you the truth. Sleep more. Start small. Fix your environment. None of it was wrong, and none of it worked, and after a while you start to suspect the fault is you.",
  },
  {
    key: "works",
    eyebrow: "I read ninety-one of them properly",
    headline: "Five things held up. Everything else was noise.",
    body: "Every transcript, every top comment, half a billion views between them. Strip out the selling and this is what's left.",
  },
  {
    key: "relapse",
    eyebrow: "Do this before you need it",
    headline: "Write the letter now, while nothing has gone wrong.",
    body: "Missing a day isn't the exception, it's the thing that quietly ends most attempts, and out of ninety-one videos exactly one had anything to say about it. So here's the bit that gets left out.",
  },
  {
    key: "duration",
    eyebrow: "The bit that catches everyone",
    headline: "It takes longer than you want, and nobody can tell you exactly how long.",
    body: "That isn't a dodge. It depends on where you're starting, how much of your week is yours, and who's around you. Below is every answer this genre gives, and the spread across them is the honest part of it.",
  },
  {
    key: "loop",
    eyebrow: "The whole method",
    headline: "Four steps, and one rule for the day it goes wrong.",
    body: "This is all of it. You can run it on paper this afternoon and it will work about as well as anything I could sell you.",
  },
  {
    key: "areas",
    eyebrow: "What it looks like",
    headline: "The same four steps, in four different lives.",
    body: "The steps are dull on their own, which is why most people nod at them and never run one. Here they are with the abstraction taken out.",
  },
] as const

// ------------------------------------------------------------ the substance

export interface CylPrinciple {
  title: string
  body: string
}

/** What survived reading all ninety-one. Given plainly, because the whole point
 *  is that the genre withholds this behind another video. */
/**
 * Voice note. An earlier draft answered "sounds like AI" by cutting every
 * sentence short, which just swapped one tell for another: uniformly clipped
 * lines read as ad copy, and nobody writes that way either. These vary. Some run
 * long and carry a subordinate clause, some land in four words, and there is
 * connective tissue between them.
 */
export const CYL_WORKS: readonly CylPrinciple[] = [
  {
    title: "Stop trying to out-willpower it",
    body: "Willpower runs on the newest part of your brain and habits run on something older and faster, so most nights you lose that fight. Rather than getting better at losing it, arrange things so it never starts, which usually just means taking the thing out of the house.",
  },
  {
    title: "Start smaller than feels serious",
    body: "Not going to the gym. Putting your shoes on and walking out the door. What you're bad at isn't the workout, it's turning up, and that's the bit you train first.",
  },
  {
    title: "You're collecting evidence about who you are",
    body: "There's a difference between saying you're trying to quit and saying you don't smoke. One is a fight you're losing, the other is just true, and you get from the first to the second by quietly stacking up evidence.",
  },
  {
    title: "The motivation turns up afterwards",
    body: "Nobody wants to before they start. The feeling you're waiting for is what you get paid once you've begun, so waiting on it is like waiting for wages before the shift.",
  },
  {
    title: "Plan for a bad week, not a good one",
    body: "Most advice assumes a free evening and a kitchen nobody else has opinions about. Build the version that still happens on a late shift when someone's ill, because that's the week that decides whether any of it survives.",
  },
] as const

export interface CylLoopStep {
  n: string
  label: string
  detail: string
}

/** The method as one picture: four steps and the branch for the day you miss. */
export const CYL_LOOP: readonly CylLoopStep[] = [
  { n: "01", label: "Pick one thing", detail: "One. The one you'd hate to still not have done in a year." },
  { n: "02", label: "Shrink it", detail: "Until skipping it would be embarrassing rather than reasonable." },
  { n: "03", label: "Say what counts", detail: "“Done when ______.” Tight enough to settle an argument at 11pm." },
  { n: "04", label: "Do the rep", detail: "Today. Not once you've read a bit more about it." },
] as const

export const CYL_LOOP_MISS = {
  label: "Missed a day?",
  detail:
    "Go back to step four tomorrow. Not to step one. The day you missed doesn't cancel the thirty before it, and the only rule that matters is that you don't miss twice in a row.",
} as const

export interface CylAreaExample {
  area: string
  oneThing: string
  rep: string
  counts: string
}

/**
 * The same four steps in four different lives, because a method stated in the
 * abstract is the thing people nod at and never run.
 */
export const CYL_AREAS: readonly CylAreaExample[] = [
  {
    area: "Getting fit",
    oneThing: "Be someone who trains",
    rep: "Shoes on, out the front door",
    counts: "Both feet on the pavement",
  },
  {
    area: "Meeting people",
    oneThing: "Have a social life again",
    rep: "Say one thing to one stranger",
    counts: "You spoke first, whatever happened next",
  },
  {
    area: "Money",
    oneThing: "Stop dreading the bank app",
    rep: "Open it and look at the number",
    counts: "You saw it without closing the app",
  },
  {
    area: "A skill you keep meaning to learn",
    oneThing: "Actually play the thing",
    rep: "Take it out of the case, play badly",
    counts: "You made a sound on purpose",
  },
] as const

/**
 * The one exercise worth doing before anything goes wrong. Kept separate from
 * the loop above, which already states the rule; this is the part nothing else
 * in the genre covers.
 */
export const CYL_LETTER = {
  instruction:
    "Think of someone you actually care about, and imagine they've just told you they fell off. Write down what you'd say to them. Not the card version. The real one.",
  turn:
    "Then cross out their name and write yours at the top, and that's the letter you read on the day you'd otherwise quit.",
  why:
    "You'll be in no state to write it on the day you need it. People are fairer to others than to themselves, so borrow your own judgement from a day you had some.",
} as const

export interface CylAction {
  n: number
  title: string
  body: string
}

/** The close. Four things, doable in two minutes, on the page. */
export const CYL_DO_NOW: readonly CylAction[] = [
  {
    n: 1,
    title: "Name one thing. Not five.",
    body: "The one you'd hate to still not have done in a year.",
  },
  {
    n: 2,
    title: "Shrink it until it's almost nothing.",
    body: "Small enough that skipping it would be embarrassing.",
  },
  {
    n: 3,
    title: "Write down what counts.",
    body: "“Done when ______.” Specific enough that you can't argue at 11pm.",
  },
  {
    n: 4,
    title: "Write the letter.",
    body: "The one for the day you fall off. Do it now, while nothing has gone wrong.",
  },
] as const

/** The honest answer on timescale, given rather than withheld. */
export const CYL_DURATION_ANSWER =
  "Weeks before it stops feeling like a decision, months before you notice anything, and longer than that before it's simply who you are. Almost everyone judges it at week three, which is the exact point where it feels like nothing is happening."

export interface CylCandidatePrompt {
  id: string
  question: string
  hint: string
}

/**
 * Candidate generation. Deliberately never asks "what is your purpose" — that
 * question formats an answer you already have and cannot produce one, which is
 * where 20.4M viewers of the best-known purpose framework stall.
 *
 * Every prompt asks about something that already happened.
 */
export const CYL_CANDIDATE_PROMPTS: readonly CylCandidatePrompt[] = [
  { id: "lose-time", question: "What do you already lose time in?", hint: "Not what you admire. What you look up from." },
  { id: "could-teach", question: "What could you explain to someone worse at it than you?", hint: "The bar is one person, not an audience." },
  { id: "projects", question: "What are you actually working on right now, however small?", hint: "Not what type of person you are — what is in progress." },
  { id: "easy-for-you", question: "What do other people find hard that comes easily to you?", hint: "Usually invisible to you, which is why it’s worth writing down." },
  { id: "difficulty", question: "Which kind of difficulty are you actually willing to eat?", hint: "Every version of this costs something. Boredom, rejection, being bad in public, being broke. Which one can you take?" },
  { id: "envy", question: "Who do you envy, and for what specifically?", hint: "The specific part matters. Not the life — the thing they do on a Tuesday." },
] as const

export interface CylStageDef {
  n: number
  key: string
  title: string
  summary: string
  because: string
}

/** The nine stages. A real sequence: each one consumes the one before it. */
export const CYL_STAGES: readonly CylStageDef[] = [
  { n: 0, key: "differential", title: "Which problem is actually yours", summary: "Seven discriminating questions that route to a primary constraint, not a personality type.", because: "Dr. K: “the number one reason why problems persist is because theyve made a diagnostic error not a treatment error” — then offers no self-serve differential." },
  { n: 1, key: "constraints", title: "The constraints ledger", summary: "Hours, money, control of your space, dependants, health, access. Produces a budget every later stage is checked against.", because: "83,000 likes on two comments saying “I don’t control my kitchen”, under a video whose method is to purge your kitchen." },
  { n: 2, key: "candidates", title: "Candidate generation", summary: "Never asks what your purpose is. Generates candidates from evidence you already have.", because: "20.4M people watched a purpose framework and stalled at question two." },
  { n: 3, key: "selection", title: "Selection, with a forced trade-off", summary: "Rank, cut to one, defer the rest with a date, then fit-test against the ledger.", because: "Everyone teaches review and nobody teaches choosing. 90 days, because you can’t see past it." },
  { n: 4, key: "rep", title: "One rep, sized to your worst day", summary: "A single observable action, plus the thing the corpus never writes down: what counts.", because: "Justin Sung: “you want it to work on the worst day.” Clear’s reader is measuring “did I show up or not.”" },
  { n: 5, key: "ladder", title: "A ladder with permission to leave", summary: "Rungs barely harder than the last, each with an explicit exit clause.", because: "The only mechanism in 91 videos with reported behaviour change from self-described level −5 people." },
  { n: 6, key: "relapse", title: "The relapse letter, written first", summary: "Write it to someone you love who fell off track. Then cross out their name and write your own.", because: "The largest unserved gap in the corpus, and the best single exercise in it, have never been connected." },
  { n: 7, key: "commitment", title: "The dated commitment", summary: "An end date, a scheduled return, a visible log — and you choose who sees it.", because: "Precisely what the audience built by hand, using upvotes as bookmarks and the like button as a reminder." },
  { n: 8, key: "readback", title: "Duration honesty", summary: "What you committed to, how long it actually takes, and what happens when you miss.", because: "People quit at month three of a three-year process because nobody told them it was one." },
] as const

// ------------------------------------------------------ the short's script

export interface CylScriptBeat {
  /** Seconds from the start. */
  at: number
  section: string
  /** What is said. Empty string for a silent beat. */
  line: string
  /** What is on screen for exactly this line. */
  visual: string
  /** On-screen text, where it differs from the spoken line. */
  onScreen?: string
  /** Where the line's substance comes from. Not shown to a viewer. */
  source?: string
}

/**
 * A 3-minute vertical, built from the corpus's own evidence.
 *
 * Shape follows the study's strongest structural finding: resonance tracks
 * recognition, not instruction. Seven of the ten lowest-resonance videos in a
 * 474M-view corpus are tactical listicles, so this opens with a comment the
 * audience wrote and upvoted rather than with a promise or a tip.
 *
 * One mechanism only. The corpus is full of videos that name six and land none.
 */
export const CYL_SCRIPT: readonly CylScriptBeat[] = [
  { at: 0, section: "Recognition", line: "Someone left this comment under a video about fixing your life.", visual: "Hard cut, no logo. A YouTube comment fills the frame, typed out live.", onScreen: "“Step 9: Stop watching these videos. You already know what to do.”", source: "Better Ideas, 33,000 likes" },
  { at: 6, section: "Recognition", line: "Thirty-three thousand people agreed with him.", visual: "The like counter ticks up to 33,000 and stops.", onScreen: "33,000 ▲" },
  { at: 10, section: "Recognition", line: "So I read ninety-one of these videos. All the way through. Every word.", visual: "Ninety-one thumbnails tile the screen in a fast grid, then collapse into a single stack.", source: "The corpus" },

  { at: 15, section: "The pattern", line: "Three hundred thousand words of transcript. Half a billion views.", visual: "Two counters running side by side in mono, settling on the real numbers.", onScreen: "300,390 words · 474,193,612 views" },
  { at: 21, section: "The pattern", line: "And they all do the same thing. They describe your problem — really well —", visual: "Rapid-fire cuts of creators mid-sentence, all saying a version of the same diagnosis.", },
  { at: 27, section: "The pattern", line: "and then they stop.", visual: "Cut to black. One full beat of silence.", onScreen: "" },

  { at: 30, section: "The gap", line: "Here's what none of them tell you.", visual: "White frame, single line of type.", },
  { at: 33, section: "The gap", line: "Nobody says how long it takes.", visual: "The line lands alone, centred.", onScreen: "Nobody says how long it takes." },
  { at: 37, section: "The gap", line: "One video says thirty days. One says a decade. One says five years minimum. One says three to seven.", visual: "Four timelines drawing left to right at wildly different lengths, stacked, each labelled with its number.", onScreen: "30 days · 1 month · 5 years · 3–7 years", source: "D'Avella · Mel Robbins' title · Gadzhi · Dr. K" },
  { at: 46, section: "The gap", line: "Same question. Same audience. Thirty days to fifteen years.", visual: "All four timelines overlay on one axis; the mismatch is the image.", },
  { at: 52, section: "The gap", line: "So you start, and at week three you're not where the video implied you'd be, and you conclude the thing that everybody concludes.", visual: "A progress bar creeps forward, then a hand closes the laptop.", },
  { at: 60, section: "The gap", line: "That it works for other people. Not for you.", visual: "Comment on screen.", onScreen: "“Working on myself isn’t working”", source: "HealthyGamerGG comment" },

  { at: 66, section: "The mechanism", line: "There's one exception in ninety-one videos.", visual: "The stack of 91 thumbnails again; one lifts out.", },
  { at: 70, section: "The mechanism", line: "One creator says the quiet part: everyone tells you what to do, and nobody tells you how long it'll take — and that's what screws people.", visual: "The quote types out.", onScreen: "“everyone tells you what to do / no one tells you how long it’ll take / and that’s what screws people”", source: "Dr. K, verbatim" },
  { at: 80, section: "The mechanism", line: "Imagine nobody had told you a degree takes four years.", visual: "A calendar unrolling; a figure walks out at month four.", },
  { at: 85, section: "The mechanism", line: "You'd quit in month four and decide you were stupid.", visual: "The figure stops, turns, walks off frame.", },
  { at: 90, section: "The mechanism", line: "That's the whole thing. It isn't that you're weak. It's that you were given a deadline nobody could meet, by people who never named one.", visual: "Hold on a single frame of text.", },

  { at: 100, section: "The turn", line: "Now here's the part I didn't expect.", visual: "Tone shift. Softer light, slower cut rhythm.", },
  { at: 104, section: "The turn", line: "I also read eighteen hundred of the top comments.", visual: "Comments scrolling fast, then slowing.", onScreen: "1,822 comments · 4.7M likes" },
  { at: 110, section: "The turn", line: "In forty-one of the ninety-one, somebody in the comments had written out the steps.", visual: "A grid of 91 tiles; 41 of them light up.", onScreen: "41 / 91", source: "Convergence measure, not likes — see convergence.py" },
  { at: 118, section: "The turn", line: "Not a summary. The actual instructions, typed out as a numbered list, because the video said them out loud and never wrote them down.", visual: "A viewer's numbered list types itself out over the paused video it came from.", },
  { at: 128, section: "The turn", line: "Twenty-eight different channels. Nobody organised it. It just keeps happening, under videos that have nothing to do with each other.", visual: "Channel avatars fan out from the tile grid, unconnected, no lines between them.", },
  { at: 138, section: "The turn", line: "Under others, people post a start date and a promise, and come back a year later to edit the same comment with what actually happened.", visual: "A real comment with its edit; the year gap appears as a timestamp jump.", },

  { at: 150, section: "The offer", line: "So we built it.", visual: "Cut to the tool. Real screen, no mockup gloss.", },
  { at: 153, section: "The offer", line: "It asks which problem is actually yours — because most people are treating the wrong one.", visual: "The differential, one question on screen, answered live.", },
  { at: 159, section: "The offer", line: "It asks what your week actually holds before it suggests anything.", visual: "The constraints ledger being filled in.", },
  { at: 164, section: "The offer", line: "It tells you how long. Up front. Even when the honest answer is that nobody knows.", visual: "A horizon set, with a range rather than a promise.", },
  { at: 170, section: "The offer", line: "And it makes you write the letter before you fall off — the one you'd write to someone you love who quit. Then you cross out their name and write your own.", visual: "Handwriting on screen. A name crossed out. A new name written.", source: "Shahroo Izadi's exercise" },
  { at: 180, section: "The offer", line: "It's free. Link's below. Go and do the thing you already know about.", visual: "URL on a clean frame, held. No music sting.", onScreen: "the URL" },
] as const

export const CYL_SCRIPT_NOTES = {
  runtime: "3:04 at a natural read. Trim beats 52 and 85 first if it needs to come under 3:00.",
  hookRule: "The first frame is a comment, not a claim, and not a face. Seven of the ten lowest-resonance videos in the corpus open with a promise or a tip.",
  evidenceRule:
    "A like count is allowed to justify a hook and never a claim. Likes measure how much a line resonated inside one video's audience, which is exactly what a hook needs and exactly the wrong test for whether something is true — none of the 100 most-liked comments in the corpus report anything that happened. Every factual beat here rests on a count across videos instead.",
  oneMechanism: "Duration is the only mechanism in this cut. The corpus is full of videos that name six mechanisms and land none.",
  avoid: "No countdown lists, no “5 tips”, no borrowed motivational-speech register, and nothing from the Gadzhi cold open — it is emotional coercion and the same video narrates suicidal planning.",
  cutdowns: "Three sub-60s cuts live inside this master: beats 0–14 (the comment), 33–60 (the duration mismatch), 104–140 (what the audience built). The third is the strongest standalone.",
} as const
