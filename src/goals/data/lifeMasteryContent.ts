/**
 * Phase-3 content — every structure here is built from the VERIFIED corpus
 * (src/goals/data/lifeMasteryCorpus.ts + ~/.cache/lm-corpus/results/*). Each
 * item carries the videoId it was extracted from (Rule 2: provenance or
 * silence). Display rule: text inside QUOTE MARKS is single-source verbatim
 * (punctuation/case restored, wording unchanged); unquoted text is faithful
 * product-voice paraphrase grounded in the cited source(s).
 */

// ---------------------------------------------------------------------------
// 1. THE MANIFESTO — the program's credo, offered as the worked example in the
// commit gate; every line adoptable, never a default. Themes are grounded in
// the research corpus (Kf6aFwzozM0, internal); the wording is ours.
// ---------------------------------------------------------------------------

export interface CitedLine {
  text: string
  videoId: string
}

export const MANIFESTO_OPENER_TEMPLATE = "My name is ___ and I am the master of my life." // Kf6aFwzozM0 (bookend)

export const MANIFESTO_PROGRAM_CREDO: CitedLine[] = [
  { text: "I build my future on purpose — average was never the plan.", videoId: "Kf6aFwzozM0" },
  { text: "I hold myself to my own highest standard, and compare myself to no one but the person I'm capable of being.", videoId: "Kf6aFwzozM0" },
  { text: "I never stop learning, and I stay humble enough to learn from anyone.", videoId: "Kf6aFwzozM0" },
  { text: "I invest in myself first — my own growth is the best return I will ever get.", videoId: "Kf6aFwzozM0" },
  { text: "I act on what I know. Knowing was never the hard part.", videoId: "Kf6aFwzozM0" },
  { text: "I keep faith in my vision and in what I'm capable of, especially when it's quiet.", videoId: "Kf6aFwzozM0" },
  { text: "I fall in love with the process and let the destination take care of itself.", videoId: "Kf6aFwzozM0" },
  { text: "I play the long game — the long rewards, not the quick hits.", videoId: "Kf6aFwzozM0" },
  { text: "When a plateau comes, I don't quit — I step up and find the way through.", videoId: "Kf6aFwzozM0" },
  { text: "I repeat the fundamentals until they're boring, and then I repeat them again — repetition is how anything becomes mine.", videoId: "Kf6aFwzozM0" },
  { text: "I choose my direction on purpose — no shiny objects, no dabbling, no drifting.", videoId: "Kf6aFwzozM0" },
  { text: "I go all in. Half-committed is not committed.", videoId: "Kf6aFwzozM0" },
  { text: "I set my own odds — no doubter gets a vote on my future.", videoId: "Kf6aFwzozM0" },
  { text: "I go deep, because everything worth having lives past the surface.", videoId: "Kf6aFwzozM0" },
  { text: "I live as who I actually am — no stories, no excuses, no shrinking.", videoId: "Kf6aFwzozM0" },
  { text: "I do what I say. My word to myself counts double.", videoId: "Kf6aFwzozM0" },
  { text: "I give more than I take, and my own needs get met on the way.", videoId: "Kf6aFwzozM0" },
  { text: "I lead by example — my actions make the argument.", videoId: "Kf6aFwzozM0" },
  { text: "I lead with heart, in service of what people can become.", videoId: "Kf6aFwzozM0" },
  { text: "My caring is my power — I will always do more for the people I love than I'd ever do for myself alone.", videoId: "Kf6aFwzozM0" },
  { text: "I live from abundance: there is always more available, and fear doesn't allocate my attention.", videoId: "Kf6aFwzozM0" },
  { text: "I reward myself constantly — what gets rewarded gets repeated.", videoId: "Kf6aFwzozM0" },
  { text: "I celebrate every result, good or bad — every outcome carries something I need.", videoId: "Kf6aFwzozM0" },
  { text: "I hunt for the good and build empowering meaning out of whatever happens.", videoId: "Kf6aFwzozM0" },
  { text: "I am happy now, today — happiness delayed to a future event is happiness declined.", videoId: "Kf6aFwzozM0" },
  { text: "I master every area of my life, because a life is not one room.", videoId: "Kf6aFwzozM0" },
]

// ---------------------------------------------------------------------------
// 2. THE INCANTATION DECK — the program's starter deck. Grounded in the
// corpus internally; wording ours except the classic quotes, which stay
// attributed to the greats who said them ("lineage").
// ---------------------------------------------------------------------------

export interface IncantationCard extends CitedLine {
  origin?: "lineage" // a classic from the greats, kept on the deck (Gandhi/MLK/Lee/Rohn/…)
}

export const INCANTATION_DECK: IncantationCard[] = [
  { text: "Everything I need is already in me. It's already here.", videoId: "JZO1--Awz7k" },
  { text: "I've got this. I can do this — watch me.", videoId: "bDdDQeugO64" },
  { text: "I'm in charge of how I feel — and I can change it in a breath.", videoId: "y_vzzMkjSrQ" },
  { text: "I don't need a reason to feel good. Deciding is the reason.", videoId: "YirYWEGAKoY" },
  { text: "I love my life. Say it again: I love my life.", videoId: "PPlaK8y4PzA" },
  { text: "I love this life, and I know how lucky I am.", videoId: "YirYWEGAKoY" },
  { text: "What I do today builds my tomorrow — today is the vote that counts.", videoId: "PliFBr__T7Y" },
  { text: "Today is mine to win.", videoId: "OgRGJBpTOeU" },
  { text: "I move on my goals every single day.", videoId: "OgRGJBpTOeU" },
  { text: "If I'm committed, there is always a way.", videoId: "OgRGJBpTOeU" },
  { text: "I am confident. I am determined. I do not stop.", videoId: "yqIkCSmOvhk" },
  { text: "Whatever I aim at, I can reach.", videoId: "jhSGXkVnJqc" },
  { text: "I'm grateful for this life — full stop, right now.", videoId: "jhSGXkVnJqc" },
  { text: "I have real value to give, and the world is better when I give it.", videoId: "bDdDQeugO64" },
  { text: "My whole body runs on energy and health.", videoId: "OgRGJBpTOeU" },
  { text: "I am at peace with what was, what is, and what's coming.", videoId: "OgRGJBpTOeU" },
  { text: "Whatever happens, I can make it serve me.", videoId: "OgRGJBpTOeU" },
  { text: "I choose what's good for me, daily, on purpose.", videoId: "OgRGJBpTOeU" },
  { text: "I enjoy building a body that carries my life.", videoId: "PliFBr__T7Y" },
  { text: "I eat for fuel, not for escape.", videoId: "PliFBr__T7Y" },
  { text: "Real food is a gift I give myself daily.", videoId: "PPlaK8y4PzA" },
  { text: "No taste beats how strong feels.", videoId: "PliFBr__T7Y" },
  { text: "There are better ways to change how I feel than eating about it.", videoId: "PliFBr__T7Y" },
  { text: "One percent better today — and I celebrate even that.", videoId: "PliFBr__T7Y" },
  { text: "Is this taking me closer to my vision — or further away?", videoId: "PliFBr__T7Y" },
  { text: "Run your emotions, or they run your life.", videoId: "PliFBr__T7Y" },
  { text: "My past is data, not destiny.", videoId: "PliFBr__T7Y" },
  { text: "Life isn't happening to me — it's happening for me.", videoId: "PliFBr__T7Y" },
  { text: "The truth: I control how I feel, and my energy answers to me.", videoId: "OgRGJBpTOeU" },
  { text: "The question I ask decides what I see.", videoId: "PPlaK8y4PzA" },
  { text: "My focus is my reality — where attention goes, life follows.", videoId: "PPlaK8y4PzA" },
  { text: "Every experience pays me — in lessons, if nothing else.", videoId: "PPlaK8y4PzA" },
  { text: "Nothing means anything until I decide what it means.", videoId: "PPlaK8y4PzA" },
  { text: "Commitment is where my power comes from.", videoId: "PPlaK8y4PzA" },
  { text: "What I commit to, I complete.", videoId: "PPlaK8y4PzA" },
  { text: "My days build my self-respect — every kept promise counts.", videoId: "PPlaK8y4PzA" },
  { text: "This will pass. It always does.", videoId: "YirYWEGAKoY" },
  { text: "The best part hasn't happened yet.", videoId: "YirYWEGAKoY" },
  { text: "Everything can change in a moment — including this.", videoId: "YirYWEGAKoY" },
  { text: "There is good in this somewhere, and I will find it.", videoId: "YirYWEGAKoY" },
  { text: "All of it — even this — is a gift.", videoId: "YirYWEGAKoY" },
  { text: "I am bigger than anything that happens to me.", videoId: "YirYWEGAKoY" },
  { text: "What I practice in private pays me in public.", videoId: "SYp9cHaD1dk" },
  { text: "My rituals are how I take care of the person I'm becoming.", videoId: "SYp9cHaD1dk" },
  { text: "There is no failure here — only feedback.", videoId: "SYp9cHaD1dk" },
  { text: "I'm done performing for approval.", videoId: "oLQiUIJ7PsQ" },
  { text: "Starting today: what serves me stays, what drains me goes.", videoId: "oLQiUIJ7PsQ" },
  { text: "Leaders are learners. In order to earn more, I must learn more.", videoId: "YirYWEGAKoY", origin: "lineage" },
  { text: "If I change, everything will change for me.", videoId: "SYp9cHaD1dk", origin: "lineage" },
  { text: "For every disciplined effort there is a multiple reward.", videoId: "PliFBr__T7Y", origin: "lineage" },
  { text: "If I can't, then I must. If I must, then I will.", videoId: "SYp9cHaD1dk", origin: "lineage" },
  { text: "The secret to living is giving.", videoId: "YirYWEGAKoY", origin: "lineage" },
  { text: "Knowing is not enough, we must apply. Willing is not enough, we must do.", videoId: "SYp9cHaD1dk", origin: "lineage" },
  { text: "To hell with circumstances, I create opportunities.", videoId: "SYp9cHaD1dk", origin: "lineage" },
  { text: "Strength does not come from physical capacity — it comes from an indomitable will.", videoId: "SYp9cHaD1dk", origin: "lineage" },
  { text: "Nobody can hurt me without my permission.", videoId: "SYp9cHaD1dk", origin: "lineage" },
  { text: "I must be the change I wish to see in the world.", videoId: "SYp9cHaD1dk", origin: "lineage" },
  { text: "Faith is taking the first step even when you don't see the whole staircase.", videoId: "SYp9cHaD1dk", origin: "lineage" },
  { text: "I have decided to stick with love; hate is too great a burden to bear.", videoId: "SYp9cHaD1dk", origin: "lineage" },
  { text: "Happiness is not something ready-made — it comes from my own actions.", videoId: "SYp9cHaD1dk", origin: "lineage" },
  { text: "Be kind whenever possible. It is always possible.", videoId: "SYp9cHaD1dk", origin: "lineage" },
  { text: "My life is my message.", videoId: "YirYWEGAKoY", origin: "lineage" },
  { text: "As I think, I shall become.", videoId: "SYp9cHaD1dk", origin: "lineage" },
  { text: "At any moment I must be willing to sacrifice what I am for what I could become.", videoId: "YirYWEGAKoY", origin: "lineage" },
  { text: "Life isn't about finding myself, it's about creating myself.", videoId: "YirYWEGAKoY", origin: "lineage" },
]

/** The deck protocol (Robbins-lineage practice; corpus-grounded internally). */
export const INCANTATION_PROTOCOL = [
  "An affirmation is words; an incantation is your whole BODY saying it. Speak it out loud with emotion — said flat, your brain calls it BS.",
  "Cards, not lists: keep a deck and pick a FEW each day — never run the whole thing.",
  "Say each card at least three times, louder and stronger each round. Five minutes total is enough.",
  "Move while you speak — jump, pace, bounce. Motion creates the emotion.",
  "End on a fist-clench \"YES!\" — at the emotional peak, so the state anchors to the gesture.",
  "Say the word IN the matching state: \"loving\" said lovingly, \"confident\" stood tall. Congruence is the mechanism.",
  "30 days of this and you start to believe it — you're overriding the old programming.",
]

// ---------------------------------------------------------------------------
// 3. QUESTION SETS — additions to the verified morning set.
// ---------------------------------------------------------------------------

/** The follow-up probe attached to EVERY morning question (corpus: PliFBr__T7Y). */
export const QUESTION_FOLLOW_UP = "What about that makes me feel this way? How does that really make me feel?" // then pause and FEEL it

// ---------------------------------------------------------------------------
// 4. THE MONEY SYSTEM — the program's allocation system (T. Harv Eker's jar
// method; corpus-grounded internally: rqbZyviDnfU, VfhmzqDHM4w, iMBikr7lKHI).
// ---------------------------------------------------------------------------

export interface MoneyJar {
  name: string
  pct: number
  blurb: string
  videoId: string
}

export const MONEY_JARS: MoneyJar[] = [
  { name: "Necessities", pct: 55, blurb: "Rent, bills, phone, transport. If this runs over 55%, that's the paycheck-to-paycheck trap — shrink the lifestyle, not the other jars.", videoId: "rqbZyviDnfU" },
  { name: "Long-term savings", pct: 10, blurb: "Builds your emergency fund — 3-6 months of expenses. Untouchable except a true emergency: not a car, not a vacation.", videoId: "VfhmzqDHM4w" },
  { name: "Financial freedom", pct: 10, blurb: "Invest only — stocks, index funds, business. This jar buys your freedom: free = passive income exceeds expenses.", videoId: "VfhmzqDHM4w" },
  { name: "Education", pct: 10, blurb: "Books, courses, seminars, coaches. \"The best investment you'll ever make is in yourself.\" Never raided — not even to pay debt.", videoId: "rqbZyviDnfU" },
  { name: "Fun & play", pct: 10, blurb: "Spent guilt-free. You earned it — enjoy it. Guilt-free fun is part of the system, not a leak in it.", videoId: "VfhmzqDHM4w" },
  { name: "Give", pct: 5, blurb: "Even $1 counts — the amount matters less than the habit. Giving trains abundance.", videoId: "iMBikr7lKHI" },
]

export const MONEY_WEEKLY_RITUAL = {
  title: "The weekly money ritual — pick a fixed day, 15-20 minutes",
  videoId: "DA_qgda-3L4",
  steps: [
    "Log into your banking — every account, every card.",
    "Go through the week's statements: every purchase gets a jar category.",
    "Drop them into your spreadsheet and total income vs. expenses.",
    "Check against the jar percentages — over in one? Adjust next week, not \"someday\".",
  ],
  why: "Weekly beats monthly: monthly takes 90 minutes and you've already overspent; weekly takes 15 and you catch it while it's small.",
}

export const MONEY_RULES: CitedLine[] = [
  { text: "Pay yourself first — 10% minimum, before bills, before rent, into an account you don't touch.", videoId: "covxjhXsCi8" },
  { text: "Emergency fund BEFORE investing: 3-6 months of expenses. The position you never want is having to sell investments in an emergency.", videoId: "2V06cH1z3Qo" },
  { text: "Net worth is the scorecard — assets minus liabilities, tracked every quarter, trending up.", videoId: "2V06cH1z3Qo" },
  { text: "The wealth formula: spend less than you earn, invest the difference, reinvest the profits.", videoId: "2V06cH1z3Qo" },
]

export const MONEY_DEBT_PROTOCOL = {
  videoId: "DA_qgda-3L4",
  steps: [
    "Confront the real number. Write it down — the debt you won't look at is the debt that runs you.",
    "Balance-transfer high-interest debt to a 0% card (12-18 months; chain cards if needed).",
    "Weekly tracking, no exceptions — the spreadsheet sees everything.",
    "Defense: ask of EVERY expense line, \"how can I reduce or eliminate this?\" Everything is on the table — the car, the TV, the apartment.",
    "Offense: more income — second job, freelance, the business. Defense alone doesn't get you ahead.",
    "Once the reserve is built, redirect the savings jar (and up to the freedom jar) at the debt — but never the education jar.",
  ],
}

// ---------------------------------------------------------------------------
// 5. RELATIONSHIP JOURNAL — the program's session script (corpus-grounded:
// NidJpDcCkQs, GXhPOncX8CA, xVfwDgP2EGM). A physical-notebook couple practice.
// ---------------------------------------------------------------------------

export const SIX_NEEDS = ["Certainty", "Variety", "Significance", "Love & connection", "Growth", "Contribution"] // Robbins lineage, NidJpDcCkQs

export const RELATIONSHIP_JOURNAL_SCRIPT = {
  container: "Calendared, phones off, judgment-free — a fixed slot like Friday at 5pm. If something's hard to say, use dyads: one speaks, the other only listens and says thank you.", // xVfwDgP2EGM, sMLeWQvtzcg
  cadence: "Start weekly; bi-weekly once it's solid; monthly is the floor. Schedule it or it won't happen.", // cadence evolution per corpus: xVfwDgP2EGM, GXhPOncX8CA, jCemE9klMVM
  steps: [
    { title: "Re-read your relationship vision and goals", detail: "Page one of the journal: the vision (10-20-30 years out) and this year's shared goals. Achieved one? Set a new one.", videoId: "2uwBvaq4cQY" },
    { title: "Score the six needs, 0-10 — each of you", detail: "On a scale from 0 to 10: how much certainty do you feel in this relationship? How much variety — spontaneity, fun, adventure? How significant do you feel? How much connection and love? How much do you feel we're growing? How much are we contributing to one another?", videoId: "7F6AJgL6yvw" },
    { title: "Any score at 7 or below → act now", detail: "Ask each other: what can I do to bring that to a ten? Seven is the tripwire — catch it this week, not when it's a four. Kill the monster while it's little.", videoId: "7F6AJgL6yvw" },
    { title: "Love-language check", detail: "Ask: how am I meeting your love language — and is there anything more I can do to make you feel loved? (Each of you knows your top two.)", videoId: "7F6AJgL6yvw" },
    { title: "The questions — when there's time", detail: "What's great about our relationship? What do you appreciate about your partner? What do you cherish about them? How can you give more? How can we create more love — and more passion (two different things)? What can you do better to meet your partner's needs? Write the answers down; re-read old sessions.", videoId: "xVfwDgP2EGM" },
    { title: "Magic moments + bucket list", detail: "Ask: what's a magic moment from this stretch that you never want to forget? Write it in. Then check something off the relationship bucket list that lives in the same journal.", videoId: "GXhPOncX8CA" },
  ],
}

// ---------------------------------------------------------------------------
// 6. RULES ENGINEERING — the program's 5-step exercise (Robbins/Date With
// Destiny lineage; corpus-grounded: _Axwu-OV9YQ, KuVQ5wpcIvg).
// ---------------------------------------------------------------------------

export const RULES_EXERCISE = {
  elicit: {
    question: (value: string) => `What has to happen for you to feel ${value.toLowerCase()}?`,
    probe: "And what else has to happen?",
    videoId: "_Axwu-OV9YQ",
  },
  diagnose: [
    "Is it HARD — rarely met? (\"…I need to make millions every year.\")",
    "Is it OUT OF YOUR CONTROL — dependent on other people? (\"…my kids have to do what I say.\")",
    "Is it a MOVING TARGET — receding as you approach? ($100k → $1M → $2M…)",
  ], // _Axwu-OV9YQ, KuVQ5wpcIvg
  rewriteFormat: "I feel ___ anytime I ___", // KuVQ5wpcIvg exercise verbatim
  rewriteExamples: [
    { text: "I feel successful the moment I wake up.", videoId: "_Axwu-OV9YQ" },
    { text: "I feel happy anytime I make progress towards a desire that I have in my life.", videoId: "_Axwu-OV9YQ" },
    { text: "I experience health and energy anytime I do anything good for my body — a deep breath, a glass of water, a walk.", videoId: "OgRGJBpTOeU" },
    { text: "I experience love anytime I am being loving — warmth out is warmth in.", videoId: "OgRGJBpTOeU" },
  ],
  invertFormat: "I experience ___ only if I were to consistently ___", // PPlaK8y4PzA verbatim
  invertExample: { text: "I experience real scarcity only if I were to consistently believe there isn't enough and think only of myself.", videoId: "PPlaK8y4PzA" },
  condition: "Read your rules aloud in the morning ritual — one value a day — for 30 days. The test for any rule is never \"is it true?\" but \"does holding it serve me?\"", // KuVQ5wpcIvg, PPlaK8y4PzA, _Axwu-OV9YQ
}

// ---------------------------------------------------------------------------
// 7. CONSEQUENCE MENU — the program's stake menu (corpus: y2oiz9LRchE;
// cx0Qq1P5AHs / GXhPOncX8CA / aAZTBj2UGUk stakes).
// ---------------------------------------------------------------------------

export const CONSEQUENCE_MENU: CitedLine[] = [
  { text: "Pick up garbage outside for 30 minutes", videoId: "y2oiz9LRchE" },
  { text: "Clean every toilet in the house", videoId: "y2oiz9LRchE" },
  { text: "30 minutes of the exercise you hate", videoId: "y2oiz9LRchE" },
  { text: "No TV for a week", videoId: "y2oiz9LRchE" },
  { text: "Flip phone for a month", videoId: "y2oiz9LRchE" },
  { text: "Eat a raw onion", videoId: "y2oiz9LRchE" },
  { text: "Hand a friend your social passwords for a month", videoId: "y2oiz9LRchE" },
  { text: "$100 to a cause you can't stand", videoId: "cx0Qq1P5AHs" },
  { text: "Write a friend a check they cash if you miss", videoId: "GXhPOncX8CA" },
]

/** Deliberate cut: the corpus menu also includes a 7-day fast (y2oiz9LRchE) —
 * left off the quick-picks for health-safety; disclosed here per Rule 1. */
export const CONSEQUENCE_RULES = [
  "Size it so it actually hurts YOU — a painless stake is decoration.", // hDRG_q_lAeU
  "If you miss, you PAY it. No renegotiating after the fact.", // y2oiz9LRchE
  "Never a consequence without a reward — pain pushes short-term, pleasure is what lasts.", // NidJpDcCkQs, vhZLFdFw5-E
]

// ---------------------------------------------------------------------------
// 8. MASTERY — the 10 keys (Jy42T9CUee0), 3 levels, plateau doctrine.
// ---------------------------------------------------------------------------

export const MASTERY_TEN_KEYS: string[] = [
  "Make it a study — model someone who has the result; proximity is the fastest teacher.",
  "Go deep, don't dabble — the rewards live in the depth, past the suck phase.",
  "Repetition — again and again and again. Mastery is boring; embrace that.",
  "Embrace discomfort — deliberately handicap yourself to force growth.",
  "Immerse fully — no one foot in, one foot out.",
  "Measure your progress — you can't manage what you don't measure.",
  "Reward yourself — whatever gets rewarded gets repeated.",
  "Anticipate plateaus and break past them — two steps back to take ten forward; get a coach at the plateau.",
  "Be patient — ten thousand hours; constant, never-ending improvement.",
  "Teach it — sharing what you learn forces you to live it.",
] // Jy42T9CUee0

export const MASTERY_THREE_LEVELS = "Knowing → doing → living. You can know what to do and not do it; you can do it and not do it consistently. Mastery is when you LIVE it." // corpus: SYp9cHaD1dk, pk6ujWo597Y

export const PLATEAU_DOCTRINE = "The plateau is not the failure — stopping is. We call the start-plateau-quit loop the triangle of pain: excitement, the dip, \"why even try\". The master anticipates the plateau, keeps the reps, retools (two steps back to take ten forward), and brings in a coach exactly there." // corpus: 0qdqKXt46w4, Jy42T9CUee0, Kz83kMosOWU

// ---------------------------------------------------------------------------
// 9. RESOURCE LADDER + BOOKS PER AREA (qXwwJdwmgic 42-book video; PWCSSH_wYDg
// ladder; 3NquT3aJ-L0/GXhPOncX8CA payment doctrine).
// ---------------------------------------------------------------------------

export const RESOURCE_LADDER = [
  "Free content — the library, YouTube. Real, but easy to not value: nothing at stake.",
  "Books — $20 for a lifetime of someone's best thinking. An hour of reading a day compounds fast.",
  "Courses — generalized step-by-step, the right rung when you're starting out.",
  "Seminars and workshops — the more you pay, the more you pay attention.",
  "Coaching — once you're proficient, or a cheap accountability coach anytime motivation is the problem.",
  "Mastermind — pay to be the least accomplished person in the room.",
] // PWCSSH_wYDg, 3NquT3aJ-L0, -lH7vrLl0pY

/** The program's reading list per Blueprint area (corpus: qXwwJdwmgic, 5emsRG7baec). */
export const AREA_BOOKS: Record<string, string[]> = {
  lm_health: ["How Not to Die — Michael Greger", "Your Body's Many Cries for Water — F. Batmanghelidj"],
  lm_fitness: ["The Reboot with Joe Juice Diet — Joe Cross", "Fats That Heal, Fats That Kill — Udo Erasmus"],
  lm_mindset: ["Awaken the Giant Within — Tony Robbins", "Mindset — Carol Dweck", "Psycho-Cybernetics — Maxwell Maltz"],
  lm_emotions: ["Man's Search for Meaning — Viktor Frankl", "The Power of Now — Eckhart Tolle", "Dopamine Nation — Anna Lembke"],
  lm_relationship: ["The Five Love Languages — Gary Chapman", "The Seven Principles for Making Marriage Work — John Gottman", "The Way of the Superior Man — David Deida"],
  lm_mission: ["The 7 Habits of Highly Effective People — Stephen Covey", "The E-Myth Revisited — Michael Gerber", "The War of Art — Steven Pressfield"],
  lm_money: ["Secrets of the Millionaire Mind — T. Harv Eker", "Rich Dad Poor Dad — Robert Kiyosaki", "Money: Master the Game — Tony Robbins"],
  lm_family: ["The Five Love Languages — Gary Chapman", "How to Win Friends and Influence People — Dale Carnegie"],
  lm_friends: ["How to Win Friends and Influence People — Dale Carnegie"],
  lm_fun: ["The 4-Hour Workweek — Tim Ferriss", "Way of the Peaceful Warrior — Dan Millman"],
  lm_contribution: ["The Purpose Driven Life — Rick Warren", "The Alchemist — Paulo Coelho"],
  lm_spirituality: ["The Untethered Soul — Michael Singer", "A New Earth — Eckhart Tolle", "Letting Go — David Hawkins"],
}
