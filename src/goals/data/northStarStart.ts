/**
 * The doors into the goals tab.
 *
 * The guide already asked the right questions of a goal that exists. What it
 * had nothing to say about was the moment before that: a text box, a heading
 * saying "your goals in Health, in your own words", and a cursor. Everything on
 * the page after that point works, and almost nobody gets past it.
 *
 * So there are five ways in, they all end in the same place — goals in the
 * list, then the questions — and which one is easier is a fact about the person
 * rather than about goal-setting:
 *
 *   write      — you already know. The box, unchanged, still the default.
 *   ten        — you wrote what a 10 looks like one tab back. That paragraph is
 *                a goal list nobody has cut up yet.
 *   day        — you cannot name a goal but you can describe a good Tuesday,
 *                and every line of one is something that either happened or did
 *                not, which is the whole of tracking.
 *   questions  — you can answer a question you cannot answer a blank page.
 *   week       — you think in hours and calendars rather than in outcomes.
 *   experiences— the list that is not goals at all. Things to have done.
 *
 * Nothing here is a quiz and nothing is gated. Every door is open at every
 * point, including after there are goals, because the second area is a blank
 * page too.
 */

export type StartRampId = "write" | "ten" | "day" | "questions" | "week" | "experiences"

export interface StartRamp {
  id: StartRampId
  label: string
  /** One line, on the card. */
  blurb: string
  /** What comes out the other end, said plainly. */
  makes: string
  /**
   * Whether this door is about one area or about the whole week.
   *
   * An area strip above a screen that spans the whole life is furniture that
   * does nothing, so the two life-wide doors hide it.
   */
  scope: "area" | "life"
}

export const START_RAMPS: StartRamp[] = [
  {
    id: "write",
    label: "I know what I want",
    blurb: "Write them out, one per line, in your own words.",
    makes: "Goals, shaped from what each line says",
    scope: "area",
  },
  {
    id: "ten",
    label: "Start from my 10",
    blurb: "You already described what a 10 looks like here. Cut it into goals.",
    makes: "One goal per thing you pictured",
    scope: "area",
  },
  {
    id: "day",
    label: "Describe my ideal day",
    blurb: "Write the Tuesday you want. Every line becomes something that either happened or it did not.",
    makes: "Daily trackables, and goals for the ones with a number in them",
    scope: "life",
  },
  {
    id: "questions",
    label: "Ask me questions",
    blurb: "Five questions that are easier to answer than a blank page.",
    makes: "Raw lines you pick from",
    scope: "area",
  },
  {
    id: "week",
    label: "Block out my week",
    blurb: "Draw the week you want to live. What is on the grid is what runs.",
    makes: "Blocks in your routines, with real days and real times",
    scope: "life",
  },
  {
    id: "experiences",
    label: "Things to experience",
    blurb: "The list that is not goals. Write as many as you like, tick them off as you do them.",
    makes: "A list with no dates, no rungs and no questions",
    scope: "life",
  },
]

export const START_COPY = {
  title: "How do you want to start?",
  help: "Six ways in, and they all end in the same place: your goals, then the questions that make them real. Pick whichever one you can actually answer today — you can use another one afterwards.",
  /** On each door, once it has produced something. */
  used: (n: number) => `${n} from here`,
  back: "← other ways to start",
}

// ---------------------------------------------------------- the fork, step 4

/**
 * What happens after the one thing, and it is a fork rather than a next page.
 *
 * The flow up to here is one order because it is one argument: the life, the
 * areas, then the single change the year is for. After that the order stops
 * being an argument and starts being a fact about the person. Somebody who
 * knows exactly what they want and has no idea what to do on Monday needs the
 * opposite screen from somebody who has been doing the same four things for a
 * year and cannot say what any of it is for — and a third person is here
 * because of one habit, and every screen that asks them to picture twelve areas
 * first is a screen they close.
 *
 * So: three doors, no recommendation, none of them closed afterwards. They all
 * write into the same plan, so the one you did not pick is still there, with
 * whatever the door you did pick has already put in it.
 */
export type StartPathId = "want" | "systems" | "routine"

export interface StartPath {
  id: StartPathId
  label: string
  /** One line: what this door is. */
  blurb: string
  /** Who should pick it, said as a state rather than as a virtue. */
  when: string
  /** What you leave with. */
  makes: string
}

export const START_PATHS: StartPath[] = [
  {
    id: "want",
    label: "Brainstorm what you want",
    blurb:
      "Everything you would be glad to have done, area by area — the numbers, the things, the moments. None of it is a plan yet and it is not supposed to be.",
    when: "You want the pull first. This is the list that makes the rest worth building, and it tells you which systems are even worth having.",
    makes: "The experiences you want in each area, loose and greedy, nothing final",
  },
  {
    id: "systems",
    label: "Build the systems",
    blurb:
      "What you actually do, week in week out, in each area — the rate you will hold and the thing you do on a Tuesday you do not feel like it.",
    when: "You already know roughly what you want, or you would rather argue about what moves it than about what to want.",
    makes: "Systems per area, and what each one is pointed at",
  },
  {
    id: "routine",
    label: "Start with one routine",
    blurb:
      "Skip the whole map and build one block of the day: your morning, your evening, your working hours — or a plan for the one thing you want to stop.",
    when: "Twelve areas is more than you want to think about today, and there is one habit you already know the answer about.",
    makes: "One routine with real steps, running from tomorrow",
  },
]

/**
 * The four doors inside the third path.
 *
 * Three are routines that already exist in every plan — seeded, empty, waiting
 * — so picking one opens it rather than creating it. The fourth is not a
 * routine at all: quitting is its own piece of work with its own research
 * behind it, and it lives on its own page.
 */
export const ROUTINE_DOORS: Array<{ routineId: string; label: string; blurb: string }> = [
  { routineId: "morning", label: "Morning", blurb: "Win the first hour and the rest of the day argues with you less." },
  { routineId: "night", label: "Evening", blurb: "Good days are set up the night before." },
  { routineId: "work", label: "Business", blurb: "The few protected habits the output actually comes from." },
]

export const PATHS_COPY = {
  title: "Where do you want to start?",
  help:
    "You have said what the next few years are for. What comes next is three different jobs, and which one is easier is a fact about you rather than about planning. Pick one — the other two stay here, and everything writes into the same plan.",
  /** Under the cards, because a fork nobody can back out of is a gate. */
  note: "Nothing here is a commitment. You can do all three, in any order, and come back to this page from the rail at the top.",
  viceLabel: "Quit a vice",
  viceBlurb: "The one you would stop if you could. A plan for it, on its own page.",
  viceHref: "/test/quit-vice",
  /** On the routine doors, once the routine has something in it. */
  routineSteps: (n: number) => `${n} ${n === 1 ? "step" : "steps"} in it`,
  routineEmpty: "Nothing in it yet",
  routineTitle: "Which one?",
} as const

// ------------------------------------------------------------------ the ten

export const TEN_COPY = {
  title: (area: string) => `What you said a 10 looks like in ${area}`,
  /**
   * Why the sentences are offered rather than added.
   *
   * The split is mechanical — line breaks and full stops — and a paragraph
   * about a life is not a goal list. Half of what comes out is scenery ("I wake
   * up without an alarm") and the other half is the plan. Offering them is the
   * difference between a screen that reads your writing back to you and one
   * that fills your plan with fragments.
   */
  help: "Most of a 10 is a picture of how things feel, not a list of things to do — so only the lines that name something you could actually go and do are offered here. For the rest, the button below turns the picture into things you would do about it.",
  empty: (area: string) => `You have not written a 10 for ${area} yet. It is the first box on "Where you are", and it is the one thing that makes the goals here mean anything.`,
  goEmpty: "Go and picture a 10 →",
  gap: (rating: number, area: string) => `You rated ${area} a ${rating}/10.`,
  gapAsk: (next: number) => `What is the first thing that would make it a ${next}?`,
  gapPlaceholder: "The one thing that moves the number",
  add: "Add the ticked ones",
  none: "Nothing ticked",
  already: "Nothing in this 10 reads as something you could go and do — which is normal, it is a picture. Use the button below to turn it into things you would do about it.",
  /**
   * The button that closes the gap the mechanical split cannot.
   *
   * A 10 is a picture of a state, because that is what the question asks for.
   * No regex turns "I wake up happy and excited" into something you can do on a
   * Tuesday, and pretending otherwise is how the page ended up offering scenery
   * as somebody's most important thing this season.
   */
  actionsButton: "Turn this 10 into things I would actually do",
}

// ------------------------------------------------------------- the ideal day

export const IDEAL_DAY_COPY = {
  title: "Write your ideal Tuesday",
  /**
   * Tuesday, and the reason is not a joke.
   *
   * An ideal SUNDAY is easy to picture and tells you nothing: everybody's is a
   * beach. A Tuesday is a working day, which means the answer has to survive
   * the job you actually have, and the gap between the Tuesday you describe and
   * the Tuesday you had is the plan.
   */
  help: "A working day, not a Sunday — anybody can picture a good Sunday, and it asks nothing of you. Write it hour by hour or as a list. Times are optional.",
  placeholder: "06:30 Up, no phone\n07:00 Gym\n08:30 Breakfast with the kids\n09:00 Two hours of deep work, no notifications\n12:00 Walk outside\n17:30 Dinner, cooked, at the table\n21:00 Read ten pages\n22:30 Lights out",
  parsed: (n: number) => `${n} ${n === 1 ? "thing" : "things"} in your day`,
  /** The two destinations, per line. */
  track: "Track it daily",
  goal: "Make it a goal",
  trackNote: "Goes into a routine, and is a box that gets ticked or does not.",
  goalNote: "Goes into your goal list, and gets asked the questions.",
  where: "Where it goes",
  areaMissing: "Pick an area",
  add: (n: number) => (n === 0 ? "Nothing to add" : `Add all ${n}`),
  addedTrack: (n: number) => `${n} added to your routines`,
  addedGoals: (n: number) => `${n} added to your goals`,
  again: "Write another day",
  /** What the times are used for, said once so the minutes are not a mystery. */
  minutesNote: "Length comes from the gap to the next line, so 07:00 to 08:30 is a 90-minute block. Change any of them here or in the routine afterwards.",
  saved: "Saved as you type, so you can come back to it.",
}

/**
 * Which routine a line lands in, by the hour it happens.
 *
 * Nine and five, not eleven and six. A thing at nine in the morning is the
 * working day starting rather than a long morning routine, and a routine that
 * swallows every line before eleven is one routine with somebody's whole
 * morning in it and two empty ones underneath.
 */
export const DAY_WINDOWS: Array<{ blueprintId: string; untilMin: number }> = [
  { blueprintId: "morning", untilMin: 9 * 60 },
  { blueprintId: "work", untilMin: 17 * 60 },
  { blueprintId: "night", untilMin: 24 * 60 },
]

// --------------------------------------------------------------- the questions

/**
 * Five questions, and every one of them is a question somebody can answer out
 * loud in a pub.
 *
 * "What are your goals" is not on the list. It is the question the blank box
 * already asks, it is the one nobody can answer cold, and every one of these is
 * a way round it: what is already annoying you, what you have already been
 * meaning to do, what you would already be doing if you were the person you
 * want to be.
 */
export const STARTER_QUESTIONS: Array<{ id: string; ask: string; note: string; placeholder: string }> = [
  {
    id: "meaning",
    ask: "What have you been meaning to do for over a year?",
    note: "Everybody has this list already. It is not a goal list yet only because nobody ever wrote it down.",
    placeholder: "One per line",
  },
  {
    id: "annoying",
    ask: "What is annoying you, week in and week out?",
    note: "The things you notice on a Wednesday and forget by Friday. Most real goals start as an irritation rather than as an ambition.",
    placeholder: "One per line",
  },
  {
    id: "person",
    ask: "What would the person you want to be have done this week, that you did not?",
    note: "Not the whole identity. The three or four things that person does on an ordinary week and you currently do not.",
    placeholder: "One per line",
  },
  {
    id: "december",
    ask: "If this year went as well as it realistically could, what is different by December?",
    note: "Realistically. Not the fantasy version and not the version where nothing changes.",
    placeholder: "One per line",
  },
  {
    id: "domino",
    ask: "What one thing, if it changed, would make half the rest easier?",
    note: "There is usually one. It is worth knowing which, because it is the thing to do first.",
    placeholder: "Usually one line",
  },
]

export const QUESTIONS_COPY = {
  title: "Five questions",
  help: "Answer whichever ones you have an answer to, one thing per line. Nothing is added to your plan until you tick it.",
  pick: "Tick the ones that are goals",
  add: "Add the ticked ones",
  none: "Nothing ticked yet",
  saved: "Your answers are kept, so you can come back and add more later.",
}

/**
 * Where the two writing doors keep what you typed, inside `plan.answers`.
 *
 * One prefix, and the loader keeps anything carrying it. The alternative is
 * listing five question ids and a written day in the plan's allow-list, which
 * is a second place to remember every time a question is added.
 */
export const START_ANSWER_PREFIX = "start:"
/**
 * The one thing, in the user's own words.
 *
 * Kept beside the start doors' answers and under the same prefix, so the
 * loader's allow-list has one rule rather than a growing list of hand-typed
 * keys. `seasonFocusId` points at the area or goal; this is the sentence, and
 * plenty of people can write the sentence before anything on the wheel is the
 * right thing to point at.
 */
/**
 * Everything step 3 stores, under one roof.
 *
 * The one thing itself keeps the key it has always had — people have this
 * written already and a rename would silently empty their page.
 */
export const ONE_ANSWERS = {
  oneThing: `${START_ANSWER_PREFIX}one-thing`,
  why: `${START_ANSWER_PREFIX}one-why`,
  cost: `${START_ANSWER_PREFIX}one-cost`,
  identity: `${START_ANSWER_PREFIX}one-identity`,
  values: `${START_ANSWER_PREFIX}one-values`,
  /** The areas this one thing reaches. One change usually moves several. */
  areas: `${START_ANSWER_PREFIX}one-areas`,
} as const

export const ONE_COPY = {
  intro:
    "One step, one sentence. The list of everything you want comes next, and it goes better once this is decided — a plan that is a list of everything is a plan nobody runs.",
  title: "What is the one thing?",
  help:
    "The one change that, if it happened, would make the next few months or years far more likely to work. Not your most important goal — the one that makes several of the others easier, or unnecessary.",
  waiting: "Write it above and the rest of this step opens. There is no point asking why something matters before it exists.",

  whyTitle: "Why does it matter?",
  whyHelp: "In your own words, not the respectable version. This is the sentence you will need in February, and the true reason is the only one that works then.",
  whyPlaceholder: "Because…",

  costTitle: "And if it does not happen?",
  costHelp: "What next year looks like if this is still where it is now. Naming it while it is cheap and theoretical is much easier than thinking clearly about it in week six.",
  costPlaceholder: "Then a year from now…",

  identityTitle: "Who would you have to be?",
  identityHelp: "Not what you would have to do — who this is true of. The person it is already true of does it without deciding to, and that is the difference you are aiming at.",
  identityPlaceholder: "Someone who…",

  valuesTitle: "What is it in service of?",
  valuesHelp: "The values this is a bet on, from the ones you have already named in your areas. You rank them properly at step 6; this is only which ones this sentence is for.",
  valuesNone: "Nothing named yet — values get written in the areas, and ranked at step 6. This will fill in as you go.",

  areasTitle: "Which parts of your life does it touch?",
  areasHelp:
    "Usually more than one — that is most of what makes it the one thing. Pick every area it reaches; the Experiences step opens on these.",

  needsTitle: "What needs to happen for it to work?",
  needsHelp:
    "One line each. These are not notes — each becomes a real goal, filed in the area it belongs to, and they are waiting for you on the goals page. This is where the list of everything you want stops being everything you want.",
  needsPlaceholder: "Something that has to be true",
  needsAdd: "Add",
  needsArea: "Files under",
  needsAlready: "You have already written these, and they read like they are about it:",
  needsLink: "this serves it",
  needsGo: (n: number) => `${n} ${n === 1 ? "goal" : "goals"} written — go to the goals page`,
} as const

export const ONE_THING_KEY = `${START_ANSWER_PREFIX}one-thing`
/** What the season after this one is for, named while this one is fresh. */
export const NEXT_SEASON_KEY = `${START_ANSWER_PREFIX}next-season`
/** The commitment itself, in the person's own words, and the date they made it. */
export const COMMIT_KEY = `${START_ANSWER_PREFIX}commit`
export const COMMIT_DATE_KEY = `${START_ANSWER_PREFIX}commit-date`
export const IDEAL_DAY_KEY = `${START_ANSWER_PREFIX}ideal-day`
export const STARTER_KEY = (id: string) => `${START_ANSWER_PREFIX}q:${id}`

// -------------------------------------------------------------------- the week

export const WEEK_COPY = {
  title: "The week you want to live",
  help: "Click any empty slot to put something there. What you draw becomes part of a routine, with the days and the time you gave it, and it shows up in the weekly load like everything else.",
  tray: "Not on the grid yet",
  trayHelp: "Everything already running that has never been given a slot. Click one, then click where it goes.",
  trayEmpty: "Everything you have is on the grid.",
  placing: (title: string) => `Placing "${title}" — click a slot`,
  cancel: "cancel",
  newBlock: "New block",
  namePlaceholder: "What is it?",
  routine: "Part of",
  repeats: "Repeats on",
  length: "Length",
  remove: "Take it off the grid",
  removeAll: "Delete it entirely",
  empty: "Nothing on the grid yet. Click a slot, or place something from the tray.",
  hours: (from: number, to: number) => `Showing ${from}:00 to ${to}:00`,
  wider: "Show the whole day",
  narrower: "Show working hours",
  load: (h: number) => `${h} h drawn on the week`,
}

/** Monday first, because a week that starts on Sunday is a calendar rather than a plan. */
export const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** The grid opens on the hours anything is likely to be in, and widens on ask. */
export const WEEK_HOURS = { from: 6, to: 23 }

// --------------------------------------------------------------- area guessing

/**
 * Words that place a line in an area without asking.
 *
 * Needed because the ideal-day door hands over fifteen lines at once, and
 * fifteen area dropdowns set to "pick one" is a worse form than the blank box
 * it replaced. It guesses, it shows every guess before anything is added, and
 * anything it cannot place says so rather than picking the first area.
 *
 * English and Danish, because this plan gets written in both, and any word that
 * two areas both claim is dropped from the index rather than arbitrated — see
 * `areaKeywordIndex`. Words of four letters or more match as prefixes, so
 * "træn" catches træne, træning and træner; shorter ones must match whole.
 */
export const AREA_KEYWORDS: Record<string, string[]> = {
  lm_health: ["sleep", "søvn", "sove", "water", "vand", "energy", "energi", "doctor", "læge", "nap", "diet", "kost", "eat", "spis", "food", "mad", "breakfast", "morgenmad", "lunch", "frokost", "dinner", "aftensmad", "cook", "sunlight", "dentist", "tandlæge", "supplement", "vitamin"],
  lm_fitness: ["gym", "træn", "train", "workout", "run", "løb", "lift", "bench", "bænk", "squat", "deadlift", "pullup", "pull-up", "pushup", "push-up", "cardio", "stretch", "stræk", "yoga", "swim", "svøm", "bike", "cykl", "muscle", "muskel", "fitness", "strength", "styrke", "steps", "skridt"],
  lm_mindset: ["read", "læs", "book", "bog", "journal", "mindset", "belief", "learn", "lær", "study", "studer", "course", "kursus", "podcast", "affirm", "incantation", "notes", "noter"],
  lm_emotions: ["gratitude", "taknem", "mood", "therapy", "terapi", "anxiety", "angst", "stress", "breathwork", "vejrtræk", "emotion", "følelse"],
  lm_relationship: ["date", "dating", "girlfriend", "kæreste", "wife", "kone", "husband", "mand", "partner", "intimacy", "intimitet", "romance", "flirt", "relationship", "forhold", "approach"],
  lm_mission: ["work", "arbejd", "job", "career", "karriere", "business", "client", "kunde", "meeting", "møde", "project", "projekt", "school", "skole", "email", "mail", "ship", "launch", "lancer", "code", "kode", "deadline", "invoice", "faktura"],
  lm_money: ["money", "penge", "save", "spar", "invest", "budget", "debt", "gæld", "income", "indkomst", "salary", "løn", "sell", "sælg", "price", "pris", "finance", "økonomi", "pension", "tax", "skat"],
  // "Ring my mother once a week" guessed Health, because the list had "mom"
  // and "mor" but not the word half the language actually uses.
  lm_family: ["family", "familie", "mother", "mom", "mum", "mor", "father", "dad", "far", "parents", "forældre", "kids", "børn", "son", "daughter", "datter", "brother", "bror", "sister", "søster", "grandma", "grandpa", "bedstemor", "bedstefar"],
  lm_friends: ["friend", "ven", "venner", "social", "community", "party", "fest", "meetup", "mates", "network", "netværk"],
  lm_fun: ["fun", "sjov", "hobby", "game", "gaming", "spil", "travel", "rejs", "adventure", "eventyr", "guitar", "music", "musik", "film", "movie", "surf", "climb", "klatr", "golf", "fishing", "fiskeri"],
  lm_contribution: ["volunteer", "frivillig", "donate", "doner", "charity", "velgørenhed", "mentor", "teach", "underviser", "contribute", "bidrag", "help out"],
  lm_spirituality: ["pray", "bøn", "church", "kirke", "spiritual", "soul", "sjæl", "nature", "natur", "silence", "stilhed", "oneness", "meditate", "meditat", "mindfulness"],
}


// ------------------------------------------------------ the examples in a box

/**
 * WHAT EVERY PREFILLED BOX SHOWS, AREA BY AREA.
 *
 * Reported from the page, twice: open Relationship and the goal box said "e.g.
 * Flat bench 100 kg", the rung box offered pull-ups, and the action box asked
 * about training chest. One example string served twelve areas, so eleven of
 * them were being shown somebody else's life at the exact moment they were
 * being asked for their own. A placeholder is not decoration — it is the page
 * saying "this is the kind of thing that goes here", and saying the wrong thing
 * is worse than saying nothing.
 *
 * Four boxes need an example, and they are different boxes:
 *
 *   want   — the goal line itself, the thing you would be glad to have done
 *   action — what you do on an ordinary week that gets you there
 *   units  — what a number in this area is counted in
 *   rungs  — a progression, for the climb that is not arithmetic
 *
 * `northStarOffers.test.ts` holds every one of these to the same rule the
 * catalogue is held to: an area may speak its neighbours' language and never a
 * stranger's, decided against `AREA_KEYWORDS`.
 */
export interface AreaGoalExample {
  /** The goal line: what you want to have achieved here. */
  want: string
  /** The thing you do about it on an ordinary week, with its rate. */
  action: string
  /** What a number is counted in here, for the unit box. */
  units: string
  /** A progression, in order, for the rungs box. */
  rungs: string[]
}

export const AREA_GOAL_EXAMPLES: Record<string, AreaGoalExample> = {
  lm_health: {
    want: "Sleep seven hours a night",
    action: "In bed by eleven, six nights a week",
    units: "hours, kg, %",
    rungs: ["Lights out by midnight", "Lights out by half eleven", "Lights out by eleven"],
  },
  lm_fitness: {
    want: "Flat bench 100 kg",
    action: "Train chest twice a week",
    units: "kg, reps, minutes",
    rungs: ["5 pull-ups", "10 pull-ups", "Muscle-up"],
  },
  lm_mindset: {
    want: "Twenty-four books this year",
    action: "Ten pages before bed, every day",
    units: "books, pages, days",
    rungs: ["One book a month", "Two books a month", "One a week"],
  },
  lm_emotions: {
    want: "Ninety days of gratitude, written down",
    action: "Write three gratitudes each morning",
    units: "days, minutes",
    rungs: ["Notice it the next day", "Notice it within the hour", "Notice it as it happens"],
  },
  lm_relationship: {
    want: "A girlfriend I am proud of",
    action: "Approach two women a week",
    units: "dates, approaches, months",
    rungs: ["Say hi to one stranger", "Hold a two-minute conversation", "Ask for the number"],
  },
  lm_mission: {
    want: "Ten thousand a month from my own business",
    action: "Ninety minutes of deep work before email, five days a week",
    units: "clients, hours, kr",
    rungs: ["First paying customer", "Ten customers", "Ten thousand a month"],
  },
  lm_money: {
    want: "Fifty thousand invested",
    action: "Thirty minutes with my numbers, same day each week",
    units: "kr, %, months",
    rungs: ["One month of costs put away", "Six months put away", "A whole year put away"],
  },
  lm_family: {
    want: "A week away with my parents",
    action: "Call my mother every Sunday",
    units: "visits, calls, months",
    rungs: ["A call every month", "A call every week", "A visit every month"],
  },
  lm_friends: {
    want: "Four people I could call at 2am",
    action: "Reach out to one friend, three days a week",
    units: "friends, evenings, months",
    rungs: ["One evening out a month", "One a fortnight", "One a week"],
  },
  lm_fun: {
    want: "Play a whole song on the guitar",
    action: "Half an hour on the guitar, four days a week",
    units: "songs, trips, days",
    rungs: ["The chords", "The whole song slowly", "Up to speed"],
  },
  lm_contribution: {
    want: "Mentor one person for a year",
    action: "Two hours given away every month",
    units: "hours, people, months",
    rungs: ["One hour a month", "Two hours a month", "Something every week"],
  },
  lm_spirituality: {
    want: "A hundred days of practice in a row",
    action: "Ten minutes of silence every morning, before the phone",
    units: "days, minutes",
    rungs: ["Five minutes a day", "Ten minutes a day", "Twenty minutes a day"],
  },
}

/**
 * The boxes in an area somebody invented.
 *
 * A custom area has no catalogue and no keywords, so there is nothing true to
 * put in an example. It says what shape the box wants instead of inventing a
 * life to illustrate it.
 */
export const NEUTRAL_GOAL_EXAMPLE: AreaGoalExample = {
  want: "One line, as you would say it out loud",
  action: "Something you will do, and how often",
  units: "what it is counted in",
  rungs: ["Where you are now", "The step after that", "Where you want to be"],
}


// ------------------------------------------------------- things to experience

/**
 * The bucket list, and why it is not the goal list.
 *
 * Half of what people want out of a life is not an achievement. Seeing the
 * northern lights, learning to surf, a threesome, a season in another country,
 * your parents meeting your kids — none of those want a target number, a rung
 * schedule, or a question asking what it costs you if you never do it. Run
 * through the goal machinery they come out as forms; kept as a list they come
 * out as a life.
 *
 * The prompts below are deliberately wide, and deliberately not only the
 * respectable ones. A list that only ever suggests travel and hobbies quietly
 * tells people which half of their wanting is allowed on the page.
 */
export const EXPERIENCES_COPY = {
  title: "Things to experience",
  help: "Not goals. Things to have done. No dates, no numbers, nothing asked of you here — write as many as come, tick them off as you do them, and promote any one you decide to actually chase into a real goal.",
  placeholder: "See the northern lights\nLearn to surf\nA month working from another country\nTake my parents somewhere good\nA threesome\nEat somewhere with three stars\nSwim somewhere I probably should not",
  add: (n: number) => (n === 0 ? "Add them" : `Add ${n}`),
  countNone: "Nothing on the list yet",
  count: (total: number, done: number) => `${total} on the list, ${done} done`,
  done: "done",
  undo: "not yet",
  promote: "Make it a goal",
  promoted: "in your goals",
  promoteWhere: "Which area does it belong to?",
  remove: "Remove",
  areaAny: "No area",
  /** The nudge, once the list is long and none of it is dated. */
  nudge: "One of these is worth turning into a real goal this year. Which one?",
}

/** Prompts for the brain-dump, so the box is not blank either. */
export const EXPERIENCE_PROMPTS: string[] = [
  "Somewhere you want to wake up",
  "Something you want to be able to do with your body",
  "Something you want to have seen with your own eyes",
  "Something you want to have tried once",
  "Somebody you want to have taken somewhere",
  "Something you would not admit to wanting",
]


// ---------------------------------------------------------------- generation

/**
 * The one button that leaves the browser, and the copy that says so.
 *
 * Every claim here has to be true, which is why "private" appears nowhere: the
 * page already mirrors plans to a server table, and this additionally sends the
 * text to Anthropic. Saying what happens beats promising what does not.
 */
/**
 * The same builder, asking the other question.
 *
 * Switching Fitness to Systems used to leave "Everything you want in Fitness"
 * above the box and the goal catalogue underneath it — so the page asked for
 * what you want while telling you it wanted what you do, and offered a 100 kg
 * bench as something to do on a Tuesday.
 */
/**
 * WHERE A LINE WENT, WHEN IT WENT TO THE OTHER STEP.
 *
 * "Workout 5× a week" typed on the achievements step is a rate, so it is filed
 * as a system and the achievements list — which shows achievements only — does
 * not show it. Left at that, the line the person just typed vanishes, which is
 * the worst thing a text box can do. So the page says where it went, names it,
 * and offers the step it is on.
 */
export const OTHER_HALF_COPY = {
  fromMilestones: (n: number) =>
    `${n} ${n === 1 ? "line you wrote here is a rate you hold rather than something you finish, so it is a system and lives" : "lines you wrote here are rates you hold rather than things you finish, so they are systems and live"} on the Systems step.`,
  fromSystems: (n: number) =>
    `${n} ${n === 1 ? "line you wrote here is something you finish rather than a rate, so it lives" : "lines you wrote here are things you finish rather than rates, so they live"} on the Experiences step.`,
  goMilestones: "open Experiences",
  goSystems: "open Systems",
} as const

export const SYSTEM_BUILDER_COPY = {
  title: (area: string) => `What you will actually do in ${area}`,
  help:
    "One line each, at a rate you would hold on a bad week: four sessions a week, twenty minutes on a Sunday. These are the things that move the list on the Experiences step — link them on the Systems view once they are written.",
  /** This area's own example, so the box never asks in another area's language. */
  placeholder: (example: string) => `e.g. ${example}`,
  empty: (area: string) =>
    `Nothing running in ${area} yet. Name one thing you will do, or open a routine above — everything in a routine is a system.`,
} as const

/**
 * SIX PER AREA, AND YOU ONLY EVER SEE THE ONE YOU OPENED.
 *
 * It was twenty across the whole life, shown under every area with the area it
 * belonged to on a badge — so opening Money offered a muscle-up, a book and ten
 * days of silence, and the one useful chip was three rows down. "If i click
 * money, the suggestions should only be around money that i see." A prompt list
 * has one job, which is to answer "what sort of thing goes here", and a list
 * that mostly answers about somewhere else does not do it.
 *
 * No attempt to be balanced in ambition inside an area: "read a book" sits next
 * to "speak on a stage" on purpose, because the pair is the permission. Titles
 * are written the way a person types, which is also what the classifier reads —
 * none of these is a rate, so every one of them lands as an achievement.
 */
export const WANT_EXAMPLES: Array<{ areaId: string; title: string }> = [
  { areaId: "lm_health", title: "Sleep 8 hours without an alarm" },
  { areaId: "lm_health", title: "Get to 12% body fat" },
  { areaId: "lm_health", title: "Bloods back clean" },
  { areaId: "lm_health", title: "Off the painkillers" },
  { areaId: "lm_health", title: "A year without being properly ill" },
  { areaId: "lm_health", title: "Wake up before the alarm, without coffee to start" },

  { areaId: "lm_fitness", title: "One muscle-up" },
  { areaId: "lm_fitness", title: "Flat bench 100 kg" },
  { areaId: "lm_fitness", title: "Run 10 km without stopping" },
  { areaId: "lm_fitness", title: "Touch my toes" },
  { areaId: "lm_fitness", title: "Like what I see in the mirror" },
  { areaId: "lm_fitness", title: "Carry all the shopping in one trip" },

  { areaId: "lm_mindset", title: "Read a book" },
  { areaId: "lm_mindset", title: "Speak on a stage" },
  { areaId: "lm_mindset", title: "Catch a spiral inside a minute" },
  { areaId: "lm_mindset", title: "Say the hard thing to the person it is about" },
  { areaId: "lm_mindset", title: "Learn something useless to nobody but me" },
  { areaId: "lm_mindset", title: "Stop needing to be agreed with" },

  { areaId: "lm_emotions", title: "A week where nothing knocks me off" },
  { areaId: "lm_emotions", title: "Feel good on an ordinary Tuesday, for no reason" },
  { areaId: "lm_emotions", title: "Go a month without dreading a Sunday night" },
  { areaId: "lm_emotions", title: "Be the calm one in a bad hour" },
  { areaId: "lm_emotions", title: "Cry at something and not be embarrassed" },
  { areaId: "lm_emotions", title: "Say no to something I would have resented" },

  { areaId: "lm_relationship", title: "Meet someone I want to build a life with" },
  { areaId: "lm_relationship", title: "Take her to Rome for a weekend" },
  { areaId: "lm_relationship", title: "A row that ends the same night" },
  { areaId: "lm_relationship", title: "A threesome" },
  { areaId: "lm_relationship", title: "Six months where we still want each other" },
  { areaId: "lm_relationship", title: "Say the thing I have never said out loud" },

  { areaId: "lm_mission", title: "Ship the thing I keep talking about" },
  { areaId: "lm_mission", title: "Quit my job and pay myself from my own work" },
  { areaId: "lm_mission", title: "One paying customer who found me on their own" },
  { areaId: "lm_mission", title: "Be good enough at it to be asked" },
  { areaId: "lm_mission", title: "Finish a week knowing exactly what I moved" },
  { areaId: "lm_mission", title: "Hire the first person" },

  { areaId: "lm_money", title: "Buy a Ferrari 458" },
  { areaId: "lm_money", title: "A year of costs in the bank" },
  { areaId: "lm_money", title: "10k a month" },
  { areaId: "lm_money", title: "Clear the debt I do not talk about" },
  { areaId: "lm_money", title: "Money coming in that does not need my hours" },
  { areaId: "lm_money", title: "Stop looking at prices in the supermarket" },

  { areaId: "lm_family", title: "Take my parents somewhere they have never been" },
  { areaId: "lm_family", title: "Nothing important left unsaid" },
  { areaId: "lm_family", title: "Sunday lunch that everyone actually turns up to" },
  { areaId: "lm_family", title: "Call home because I want to" },
  { areaId: "lm_family", title: "Fix the thing my brother and I do not mention" },
  { areaId: "lm_family", title: "Be the one they ring when it goes wrong" },

  { areaId: "lm_friends", title: "A house full of people on my birthday" },
  { areaId: "lm_friends", title: "Three people I could call at 2am" },
  { areaId: "lm_friends", title: "A trip with the old crowd" },
  { areaId: "lm_friends", title: "Make one new friend as an adult" },
  { areaId: "lm_friends", title: "Be someone's best man" },
  { areaId: "lm_friends", title: "See them often enough that we do not catch up" },

  { areaId: "lm_fun", title: "Learn to surf" },
  { areaId: "lm_fun", title: "See the northern lights" },
  { areaId: "lm_fun", title: "Play a gig, badly, in front of people" },
  { areaId: "lm_fun", title: "A month working from another country" },
  { areaId: "lm_fun", title: "Eat somewhere with three stars" },
  { areaId: "lm_fun", title: "One night a week that is nobody else's" },

  { areaId: "lm_contribution", title: "Pay for someone else's course" },
  { areaId: "lm_contribution", title: "Give on a standing order, not when I remember" },
  { areaId: "lm_contribution", title: "Teach what I know for free, once" },
  { areaId: "lm_contribution", title: "One person better off this year because of me" },
  { areaId: "lm_contribution", title: "Show up for the thing nobody wants to do" },
  { areaId: "lm_contribution", title: "Leave something behind that keeps working" },

  { areaId: "lm_spirituality", title: "Ten days of silence" },
  { areaId: "lm_spirituality", title: "A practice I keep for a year" },
  { areaId: "lm_spirituality", title: "Sit for twenty minutes without reaching for the phone" },
  { areaId: "lm_spirituality", title: "Forgive the one I am still carrying" },
  { areaId: "lm_spirituality", title: "A day a week with nothing to achieve" },
  { areaId: "lm_spirituality", title: "Feel part of something bigger than my week" },
]

export const GENERATE_COPY = {
  button: "Suggest goals and experiences from this",
  running: "Reading what you wrote…",
  sends: "Sends what you wrote in this box to Anthropic to read. Nothing is added to your plan until you tick it.",
  needMore: "Write a few lines first — there is not enough here to work from yet.",
  failed: "That did not come back. Try again, or carry on writing your own — nothing was lost.",
  nothing: "Nothing came back that is not already on your list.",
  picked: "Tick the ones that are yours",
  add: "Add the ticked ones",
  none: "Nothing ticked",
  asGoal: "goal",
  asExperience: "experience",
}


// ------------------------------------------------------------ the area builder

/**
 * One area, built the way somebody actually builds one.
 *
 * The paragraph box asked for every goal in every area at once and then a queue
 * asked one question about one goal before jumping to another. Nobody plans
 * like that. You take an area, you say everything you want in it, then you take
 * one of those and finish it: how far, by when, what that means month by month,
 * and what you do on a Tuesday about it.
 */
export const BUILDER_COPY = {
  title: (area: string) => `Everything you want in ${area}`,
  help: "One line each, as you would say it out loud. Then open any of them and finish it: where you are now, by when, and what you will actually do about it.",
  /**
   * THE WANTING BOX, AT THE TOP OF AN OPEN AREA, ABOVE THE 10.
   *
   * The one-line adder underneath asks the same question with a smaller cursor,
   * and a cursor that fits one line asks for the tidy answer. What this step
   * needs first is the dump — everything, in any order, before anything is
   * qualified — so the box is a box, it sits above the picture of a 10 rather
   * than under it, and it says out loud that nothing here is being committed
   * to and that leaving early is allowed.
   */
  wantsHelp:
    "These are all the things in this area you want to experience in your life. Allow yourself to dream big — prioritising and building the systems that get you there happen later. The purpose here is to create energy towards each part of your life, and to see what is actually on the other side of working at it. Feel free to skip ahead whenever you want. You can always come back, or fill in more detail later.",
  /** One line at a time, so the box is answerable in four seconds. */
  wantsPlaceholder: (example: string) => `e.g. ${example}`,
  wantsAdd: (n: number) => (n === 0 ? "Add" : n === 1 ? "Add it" : `Add these ${n}`),

  /**
   * TWENTY EXAMPLES, FROM EVERY AREA, UNDER THE BOX.
   *
   * A cursor in an empty box asks somebody to invent a life from nothing, and
   * the examples we had were one per area, hidden in the placeholder of the
   * area you happened to open. Twenty of them, spread across all twelve areas
   * and badged with the area they belong to, do three things at once: they show
   * the SIZE of answer that belongs here (a book, a Ferrari — small and absurd
   * side by side), they show that this is about the whole life rather than the
   * area you opened, and they are one click each.
   *
   * They are deliberately concrete and deliberately uneven in ambition. A list
   * of respectable examples produces a respectable list back.
   */
  examplesTitle: "Or take one of these",
  examplesHelp: (area: string) =>
    `Things people want in ${area}, to show the size of the answer. Click one and it lands in your list here — edit or delete it after.`,
  examplesAdded: "added",
  /** The list under the 10, once the box above is where the writing happens. */
  listTitle: "What you have written here",
  tenPrefix: "Your 10 here:",
  /**
   * The example comes from the area, never from this file.
   *
   * It said "e.g. Flat bench 100 kg" in all twelve areas, so Relationship,
   * Family and Money were each opened with a lift in the box. See
   * `AREA_GOAL_EXAMPLES`.
   */
  placeholder: (example: string) => `e.g. ${example}`,
  add: "Add",
  allOfThem: "Write all of them, not just the respectable ones. It is easier to cut a list than to invent one.",
  empty: (area: string) => `Nothing in ${area} yet. Name one thing you want to have achieved here.`,

  needsTarget: "what you are climbing to",
  needsStart: "where you are now",
  needsDate: "a date",
  /** A driver is finished when it has a rate, not when it has a deadline. */
  needsRate: "how many days a week",
  needsAction: "something you will do",
  stillNeeds: (what: string) => `needs ${what}`,
  done: "ready",

  startAsk: (target: number, unit: string) => `Going to ${target}${unit ? ` ${unit}` : ""} — where are you today?`,
  /**
   * No example numbers in either box.
   *
   * The start box used to say "e.g. 72", which is a fine bench and complete
   * nonsense under a goal of 36 — an example number cannot know what was typed
   * above it, so it contradicts the person roughly half the time. What the box
   * wants is not an example, it is a label.
   */
  editTitle: "What you want, in your words",
  editTitleNote: "Change the wording any time. If it has a number in it, the climb re-reads it.",

  startPlaceholder: "today's number",
  targetPlaceholder: "number",
  /** What a number is counted in here. "pull-ups, kg, %" under Money was not. */
  unitPlaceholder: (units: string) => units,
  scale: "Scale it",
  writeOwn: "or write the steps yourself",
  writeOwnAsk: "Your progression, in order",
  writeOwnNote: (example: string) =>
    `One rung per line, or separate them with arrows. They do not have to be numbers, and the last one does not have to be more of the first: "${example}" is a climb.`,
  writeOwnPlaceholder: (rungs: string[]) => rungs.join("\n"),
  writeOwnSave: (n: number) => (n > 0 ? `Use these ${n} rungs` : "Use these rungs"),
  writtenTitle: "Your rungs, in your order:",
  writtenNoDate: "Give this a date above and the rungs get one each.",
  dateAsk: "By when?",
  scaledTitle: "Which means, between now and then:",
  pace: (n: string, unit: string, months: number) =>
    `About ${n}${unit ? ` ${unit}` : ""} a month for ${months} ${months === 1 ? "month" : "months"}.`,

  actionAsk: "And what gets you there?",
  actionHelp: "The things you do on an ordinary week. These are tracked like everything else, so they are goals too — just the daily kind.",
  actionPlaceholder: (example: string) => `e.g. ${example}`,
  /**
   * The three animals an area holds, named.
   *
   * "Within any area, I have many things. Eg working out 5x a week, and eating
   * 2k calories are the drivers, they can stay the same indefinitely, and I
   * have a particular goal like a muscle up by date xx… perhaps a goal like
   * being complimented by a random stranger." Three shapes, and the page used
   * to guess between them from the wording — which files a muscle-up as a
   * finish line, because there is no number in it to find.
   */
  kind: "This is",
  kindTarget: "A target I climb to",
  /**
   * The example is this area's climb.
   *
   * It explained a target with "5 pull-ups, then 10, then the muscle-up" under
   * all twelve areas, which is the same hardcoded life the goal box was showing
   * one line above it.
   */
  kindTargetNote: (rungs: string[]) =>
    `Something you get to by a date, and can be spread into rungs on the way: ${rungs.join(", then ")}.`,
  kindDriver: "A driver I hold",
  kindDriverNote: "The rate that makes the rest happen, held for as long as it is useful: train five times a week, eat 2000 calories. No finish line.",
  kindOneOff: "A one-off I want",
  kindOneOffNote: "Not a SMART goal and not meant to be — complimented by a stranger, a trip, a car. Worth writing down because wanting it is what makes the rest run.",

  driverAsk: "How many days a week?",
  driverNote: "Held, not finished.",
  /**
   * THE SECOND NUMBER, because "approaches 20×/wk" was answering two questions
   * with one field.
   *
   * How often you do it and how much of it you do are different: three nights
   * out and twenty approaches is one plan, and three nights and three
   * approaches is a different one. Days are the honest floor — you either went
   * or you did not — and the count is what the days are for. Optional: plenty
   * of drivers are only ever a frequency.
   */
  countAsk: "And how many a week, if you count them?",
  countNote: "Optional. Days are how often you turn up; this is how much you do — three nights out and twenty approaches is a different plan from three nights and three approaches.",
  countUnit: "counted in",
  countUnitPlaceholder: "approaches, texts, sets",
  countClear: "no count, just the days",
  targetAsk: "What are you climbing to?",
  targetNote: "A number and what it is counted in. Your sentence carries no number, so this is where the rungs come from.",

  /**
   * PUTTING A WHOLE SET BACK, where its goals are.
   *
   * Taking one is a single click and writes five rows; not wanting it was five
   * confirms. This is the same click in reverse, and it says the number so that
   * nobody presses it wondering how much it takes.
   */
  tookTitle: "Took a set you do not want?",
  tookRemove: (label: string, n: number) => `Remove ${label} — ${n} ${n === 1 ? "goal" : "goals"}`,
  tookConfirm: (n: number) => `Remove all ${n}?`,
  tookAlso: (steps: number, routines: string) =>
    `and the ${steps} ${steps === 1 ? "step" : "steps"} it put in your ${routines}`,
  tookAlsoRoutine: (routines: string) => `and your ${routines}, which is only here for it`,
  tookYes: "remove them",
  tookNo: "keep them",

  running: (area: string) => `Already running in ${area}`,
  runningNote: "These come from your routines. You do not need to write them again as goals — a routine step is already something that gets ticked.",
  echo: (where: string) => `You also have this in ${where}.`,
  echoDrop: "drop this copy",

  offersTitle: (area: string) => `Or start from what people set in ${area}`,
  offersCount: (goals: number, sets: number, practices: number) =>
    `${goals} goals · ${sets} sets · ${practices} practices`,
  suggest: "Suggest some from my 10",
  sets: "Whole sets",
  setPreview: (label: string) => `“${label}” adds:`,
  setCancel: "not this one",
  setAdd: (n: number) => (n === 1 ? "Add it" : `Add these ${n}`),
  practices: "Practices",
  practicesHelp: "These go into a routine rather than the goal list — they are the daily kind.",
  makeClimb: (value: number, unit: string) => `This has a number in it (${value}${unit ? ` ${unit}` : ""}) — scale it into rungs`,
}
