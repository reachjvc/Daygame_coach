/**
 * Principle half-pagers + SOS protocols — the education layer of the Life
 * Mastery lab. Every claim/quote is sourced from the research canon
 * (docs/plans/life-mastery-canon.md); nothing here is invented doctrine.
 * Fixed anatomy per card: principle → why it works → in practice →
 * quotes → the trap to avoid.
 */

export interface PrincipleCard {
  id: string
  title: string
  /** One-line teaser shown while collapsed. */
  teaser: string
  principle: string
  mechanism: string
  practice: string
  quotes: string[]
  trap: string
}

export const PRINCIPLES: Record<string, PrincipleCard> = {
  mastery: {
    id: "mastery",
    title: "The mastery path — why this system works at all",
    teaser: "Knowing → doing → living. The plateau is the gate, not the wall.",
    principle: "Everything here rides on one meta-skill: mastery. It has three levels — knowing, doing, and living. You can know what to do and never do it. You can do it and not do it consistently. Mastery is when you live it.",
    mechanism: "The plateau is the mechanism. Every skill flattens out after early progress, and that flat stretch is where dabblers quit — we call the start-plateau-quit loop the triangle of pain. The failure is never the plateau itself; it's stopping. Ten keys for getting through: study someone who already has the result, go deep instead of dabbling, repeat the fundamentals even when it's boring, measure your progress, reward yourself, expect the plateau before it comes, be patient, and teach what you learn.",
    practice: "When a plateau hits: keep the reps going, retool — sometimes two steps back to take ten forward, the way Tiger Woods once rebuilt a championship swing — and bring in a coach at exactly that point. Courses are for the basics; the coach is for the plateau.",
    quotes: ["\"The master goes deep, the dabbler stays at the surface — the dabbler is looking for what's easy, the master is willing to do what's hard.\" (OltpabSGqmQ)", "\"There's only one reason why you didn't achieve your goal — it's because you stopped.\" (0qdqKXt46w4)", "\"Sometimes you could take two steps back to take ten steps forward.\" (Jy42T9CUee0)"],
    trap: "Treating the plateau as evidence the system failed. It's evidence you reached the part where mastery is decided.",
  },
  commit: {
    id: "commit",
    title: "Why commit first",
    teaser: "The dabbler quits at the plateau. The master decided not to.",
    principle: "Before any planning, you commit — to the whole climb, and to every area of life, not just the loud one.",
    mechanism: "Skills plateau; motivation dips. A decision made once, in a strong moment, is what carries you through the weak ones. Committing to ALL areas prevents the classic trade: business up, body and marriage quietly collapsing.",
    practice: "The program opens with a personal manifesto — a first-person credo you write and re-read — ending: 'I commit to mastery in all areas of my life, refusing to settle for anything less than an extraordinary quality of life.'",
    quotes: ["\"Repetition is the mother of mastery… praise is the father of mastery.\" (Kf6aFwzozM0)", "\"I go all in, fully committing myself by deciding to do whatever it takes.\" (Kf6aFwzozM0)"],
    trap: "Committing to a RESULT instead of to the process. Results have deadlines; mastery doesn't end.",
  },
  values: {
    id: "values",
    title: "Why your values get a veto",
    teaser: "Dream freely first — but your values judge every goal before it becomes your life.",
    principle: "Elicit what has actually been most important to you — then rank it. The hierarchy, not the list, runs your life.",
    mechanism: "Values are emotions, not things ('family' is really love or connection). Whatever sits at #1 filters every decision below it: security above success means you never risk; success above happiness means you can't enjoy anything you achieve.",
    practice: "Redo the exercise every year or two: 'What's been most important in my life? What else?' — first answers, from the gut — then pairwise ranking, then an audit of what the ordering costs you.",
    quotes: ["\"What do my values need to be in order to create the life that I want?\" (Lp_GOrM16Xc)", "\"Happily achieve, instead of achieving to be happy.\" (OgRGJBpTOeU)"],
    trap: "Writing the values you'd like to be seen having. Audit the real ones first; redesign afterwards. And don't skip this because the vision felt like enough — a vision your values won't fund never survives week three.",
  },
  vision: {
    id: "vision",
    title: "Why a no-limits vision",
    teaser: "You can't hit a target you can't see — and dim targets don't pull.",
    principle: "Write the life you want with zero realism applied — long-horizon vision is supposed to be unrealistic.",
    mechanism: "The vision's job isn't accuracy, it's PULL: something you re-read that produces motivation on contact. Realism belongs in this year's goals, not in the 10-year picture. Language matters — word it so it moves you.",
    practice: "A strong vision is one long paragraph — identity, body numbers, home, relationship, income — reviewed aloud every morning. Try the Perfect Day exercise: one day, 10 years out, hour by hour.",
    quotes: ["\"Imagine as if there's no limits: if a magician were able to come along and create the perfect life for you, what would that be?\" (8kco2rjijjE)", "\"Without a vision, people perish.\" (hlJYapcgKM8)"],
    trap: "Writing a modest vision to avoid disappointment. A vision you already believe is just a forecast.",
  },
  purpose: {
    id: "purpose",
    title: "Why the why",
    teaser: "Reasons are the fuel — the vision is just the destination.",
    principle: "Under the vision, and under every goal, write WHY you want it. More reasons, more fuel.",
    mechanism: "Motivation decays; re-reading reasons re-ignites it on demand. Pain-reasons work too — what it costs you NOT to act pushes when pleasure stops pulling.",
    practice: "Write fresh reasons for your daily outcomes every single morning — deliberately not copy-pasted, because deriving them again IS the conditioning.",
    quotes: ["\"The reasons are the fuel for the fire.\" (ZywgvFSnH38)", "\"Anytime along the journey you're not motivated… just remind yourself: why do I want this?\" (ZywgvFSnH38)"],
    trap: "One noble-sounding reason. You need the greedy ones, the petty ones, the scared ones — whatever actually produces emotion.",
  },
  identity: {
    id: "identity",
    title: "Why identity beats behavior",
    teaser: "You will not outperform who you believe you are.",
    principle: "Decide who you're committed to being — in one sentence per area — before deciding what to do.",
    mechanism: "The strongest force in personality is staying consistent with self-definition. Change the definition and the behaviors reorganize around it; change only the behavior and the old identity pulls you back.",
    practice: "'I am…' statements, whole-life and per area ('I'm an athlete', 'I'm a world-class coach'), recited with energy in the morning ritual.",
    quotes: ["\"Whatever you attach the words 'I AM' to is what you become.\" (Wr2SPFgW8iY)", "\"Changing the behavior is not enough unless you change the identity.\" (8kco2rjijjE)"],
    trap: "Waiting to feel like that person first. The recitation comes before the feeling, not after.",
  },
  tens: {
    id: "tens",
    title: "Why define your 10",
    teaser: "A rating without a reference is a mood, not a measurement.",
    principle: "For every area, write what a 10 looks like FOR YOU. Then rate where you are today against it, 0-10 — and the number means something.",
    mechanism: "'Where am I against MY ideal?' is answerable; 'how's my health?' is not. And the 10 moves: when you live at 9 for a while, your vision expands — what was a 10 becomes your 8.",
    practice: "A good body-10 has numbers in it (weight, body fat, energy). A good money-10 gets rewritten as you grow. There's never a final 10 — a 10 is when you stop growing.",
    quotes: ["\"If you're honest with yourself in terms of where you want to be — what your ten would be — where would you measure yourself right now?\" (wqJ-2N5KVOU)", "\"Who says that ten has to be a limitation? Why can't you go to eleven, why can't you go to twelve?\" (wqJ-2N5KVOU)"],
    trap: "Borrowing someone else's 10. Their number is irrelevant; your 10 is yours.",
  },
  goals: {
    id: "goals",
    title: "Why goals get qualified, not just written",
    teaser: "A goal you don't believe at 7+ — and want at 7+ — is a wish.",
    principle: "Every goal passes two gates: belief ≥7/10 that it's achievable, and desire ≥7/10 that you actually want it. Below either — reshape it, don't force it.",
    mechanism: "Under 7 belief, the brain won't commit action ('why even try'). Under 7 desire, you'll abandon it the first hard week. Repeatedly missing self-set goals trains a habit of failure and burns self-trust — so shrink until you believe, then move the target closer, hit it, and move it further (bow and arrow).",
    practice: "Sentence format: 'I will easily [X] at least [N] by [date]' — never 'I want'. Under it: the why, the pain-why, a reward, a consequence, and a pre-mortem ('what will get in the way?').",
    quotes: ["\"Your short-term goals you want them to be attainable, your long-term goals you want them to be unrealistic.\" (ZywgvFSnH38)", "\"What's the date, what's the deadline? If you don't have a deadline, most often people don't take any action.\" (ZywgvFSnH38)"],
    trap: "Setting last year's failed goal again at the same size. Calibrate — the ~90% hit rate comes from sizing goals to be hittable.",
  },
  focus: {
    id: "focus",
    title: "Why pick 1-3 domino areas",
    teaser: "Total balance is a myth. Strategic imbalance, honestly chosen, is the move.",
    principle: "Each season, choose the 1-3 areas that — conquered — lift all the others. Consent to the rest drifting to maintenance.",
    mechanism: "Focus is a zero-sum resource; pretending to advance 12 areas equally advances none. The domino test finds the area with cross-area payoff (money funds the trainer; health powers the business). Maintenance quotas stop the others from dying while you push.",
    practice: "Non-focus areas are allowed to drop from a seven to a five — on purpose, with consent. Keep hard minimums (training most days, date nights weekly), and negotiate the grind season with your partner BEFORE it starts.",
    quotes: ["\"What is that area of my life, by conquering it, it's actually going to simultaneously benefit all the other areas of my life too?\" (JZnLIuW7NQw)", "\"The truth is that balance doesn't really exist — I never go for balance, I go for progress.\" (8kco2rjijjE)"],
    trap: "Silent all-in. An un-negotiated grind season is 'the beginning of the end' of a relationship.",
  },
  ritual: {
    id: "ritual",
    title: "Why the morning ritual",
    teaser: "You don't hope for a good day. You manufacture one.",
    principle: "An ordered sequence you run before the world gets to you — minimum one thing each for mind, body, and spirit.",
    mechanism: "State precedes performance: motion changes emotion, questions aim focus, spoken words install beliefs. Done daily, the practiced state becomes your emotional home — where you automatically return.",
    practice: "15 to 60 minutes, checklist on the wall, checked off daily. It's a menu, not a straitjacket: rotate items monthly so it never bores you. On chaotic days: the 1-minute floor — one step still counts. Consistency beats duration.",
    quotes: ["\"How you start the day is how you end the day.\" (PliFBr__T7Y)", "\"I don't hope it's going to be a good day — I demand it.\" (PliFBr__T7Y)"],
    trap: "The 90-minute perfect ritual you quit in week two. One minute done daily beats an hour done twice.",
  },
  rpm: {
    id: "rpm",
    title: "Why plan outcomes, not to-dos",
    teaser: "You can finish every task and still achieve nothing.",
    principle: "Plan the day as 3-5 results (across different life areas), each with its why and a could-do list — then star the 1-2 musts per result.",
    mechanism: "A to-do list measures activity; results measure achievement. Asking 'what result am I after?' generates better actions than memory ever would, and the why keeps emotion attached to the work. Unfinished actions roll forward guilt-free — the day is judged on outcomes.",
    practice: "Typical daily blocks: one body, one work, one relationship — and often one purely emotional ('feel deeper gratitude today'). Hardest starred item first, 60-minute timer, before any email.",
    quotes: ["\"A lot of people, they mistaken activity with achievement.\" (ZywgvFSnH38)", "\"Did I achieve my outcomes? Yes — great, that was an awesome day, I made progress.\" (mDHWi92v9X8)"],
    trap: "Checking email first. You just handed your morning's willpower to other people's priorities.",
  },
  weekly: {
    id: "weekly",
    title: "Why the weekly evaluation",
    teaser: "Measure weekly and the worst you can have is a bad week.",
    principle: "Once a week: score every area against your 10, celebrate what went right, extract the lesson, and commit next week's outcomes.",
    mechanism: "Measurement frequency sets failure granularity — review yearly and you can lose a year. The wheel makes the weakest area visible before it becomes a crisis; the +1 rule keeps repair realistic (bring the 3 to a 4 — not to a 10).",
    practice: "The order matters: re-read the plan → rate 0-10 per area → magic moment, proudest win, lesson → sub-7 areas get 'what can I do to level up this area?' → outcomes with whys → schedule them.",
    quotes: ["\"If you don't measure it you can't manage it — and it doesn't get better.\" (oLQiUIJ7PsQ)", "\"You don't ever get to the point where something is a three out of ten, or a one, or a zero… you can catch it by being proactive, anticipating it in advance and checking in on a more regular basis.\" (wqJ-2N5KVOU)"],
    trap: "Rating only the areas that are going well. The ritual is checking in with your WHOLE life — especially the quiet rooms.",
  },
  report: {
    id: "report",
    title: "Why the monthly report is a ceremony",
    teaser: "Wins celebrated first, failures owned honestly, lessons turned into systems.",
    principle: "Each month: read every goal's number against its target, give it an honest verdict — and own the reason for every miss.",
    mechanism: "The order matters: flood yourself with wins FIRST (confidence compounds — success breeds success), then process misses at 95% solution / 5% problem. A miss with an owned reason becomes a fix; a miss without one becomes a pattern.",
    practice: "The monthly report is written like it could be published: exact numbers, verdicts like 'Behind' and 'Haven't started yet', reasons attached. This one habit is what makes annual goals land.",
    quotes: ["\"Setting goals is the easy part… the hard part is actually following through on that — and more importantly, checking in on a regular basis to make sure that you're measuring yourself.\" (IqCvSF0NHRs)", "\"Don't be hard on yourself… the being hard on yourself part is more for the end… this is a time of celebration.\" (zuEb-1Ll2h8)"],
    trap: "Treating the report as a stats page. It's a sit-down ritual with a beginning (wins), a middle (truth), and an end (next month's focus).",
  },
  evening: {
    id: "evening",
    title: "Why close the day",
    teaser: "Whatever gets rewarded gets repeated — so reward today, tonight.",
    principle: "Two questions and a score: what was great today, how could it have been better, and how productive were you, 1-10.",
    mechanism: "Ending the day by finding the good conditions your brain to produce more of it; the improvement question converts friction into tomorrow's adjustment without self-punishment (self-punishment teaches 'why try').",
    practice: "When you re-read the day's wins, literally smile and pat yourself on the back — pairing physical pleasure with productivity, on purpose.",
    quotes: ["\"Whatever gets rewarded gets repeated.\" (OgRGJBpTOeU)", "\"You can't build success off failure — you build success off success.\" (CGqhbXzJrG8)"],
    trap: "Skipping it on bad days. Bad days are exactly when the habit forces you to find the one thing that still went right.",
  },
  sos: {
    id: "sos",
    title: "Why an SOS toolkit",
    teaser: "You can't plan your way out of a state. Change the state first.",
    principle: "Cravings, panic, paralysis and despair each have a ≤60-second protocol. Run the protocol, then return to the plan.",
    mechanism: "In a triggered state the planning brain is offline — willpower argues and loses. Physiology, focus and language are the three levers that work in seconds. Triggers never disappear; your relationship to them changes.",
    practice: "The rules: don't leave the house below state level 10; never willpower through — jump, breathe, speak, THEN work. For urges: the replacement always serves the same need the habit served.",
    quotes: ["\"To break a habit you must make a habit — you've got to replace this bad habit with something new.\" (AFgeREfiDgw)", "\"All emotions and thoughts are temporary — when you just watch and observe them they fade away, like clouds in the sky.\" (bT1akeSdIIM)"],
    trap: "Treating a bad hour as a verdict on the plan. It's weather. Run the protocol; the plan is still there.",
  },
}

/**
 * The incantation deck — the program's starter cards, grounded in the research
 * canon (spoken aloud with full physiology, ~3× each, often while moving;
 * end with a fist-clench "YES!"). Users add their own on top: find a limiting
 * belief, write its antithesis, add it to the deck.
 */
export const INCANTATION_CARDS: string[] = [
  "What I choose to do today is going to shape today and create my tomorrow.",
  "I enjoy the process of creating a healthy and fit body.",
  "The past does not equal the future.",
  "Life doesn't happen to me, it happens for me.",
  "Is this bringing me closer to — or further away from — my vision?",
  "Master your emotions, master your life.",
  "I eat to fuel my body, not satisfy appetite.",
  "Nothing tastes as good as being healthy and fit feels.",
  "I will improve 1% each day and give myself pleasure for progress.",
  "For every disciplined effort there is a multiple reward.",
  "I control how I feel. I can change my state in an instant.",
  "I always focus on and find the good in everything.",
  "Everything is a gift. Everything happens for a reason, and it serves me.",
  "Life is a gift.",
  "Leaders are learners. In order to earn more, I must learn more.",
  "If I change, everything will change for me.",
  "I get rewarded in public for what I practice in private.",
  "To hell with circumstances — I create opportunities.",
  "As I think, I shall become.",
  "If I can't, then I must. If I must, then I will.",
  "There's no such thing as failure, only feedback.",
  "I deserve the gift of lasting health and happiness.",
  "What I do every day determines my self-esteem and my happiness.",
  "My rituals are an act of self-love.",
  "I don't need a reason to feel good.",
  "Nothing is more important than my health and my happiness.",
  "Knowing is not enough — we must apply. Willing is not enough — we must do.",
  "I am bigger than anything that could ever happen to me.",
  "All that I need is within me now.",
  "If I'm committed enough, there's always a way.",
]

/** SOS protocols — ≤60-second interventions per crisis type, straight from
 * the toolkit layer of the canon. The front door for the rough moments. */
export interface SosProtocol {
  id: string
  label: string
  /** What the user is feeling — shown as the button copy. */
  feeling: string
  steps: string[]
  closer: string
}

export const SOS_PROTOCOLS: SosProtocol[] = [
  {
    id: "urge",
    label: "Riding out an urge",
    feeling: "I'm about to give in to a craving",
    steps: [
      "Name it out loud: this is a trigger, and it will pass. Emotions and thoughts are temporary — watch them and they fade, like clouds in the sky.",
      "Make the space: 10 slow breaths. The urge is a wave; you're learning to surf it.",
      "Run your replacement — the kettle, the walk, the shower. It must serve the same need the habit served.",
      "Ask the after-question: \"How will I feel about myself AFTER — does my self-esteem go up or down?\"",
    ],
    closer: "One day at a time. Never say 'never again' — just not this hour.",
  },
  {
    id: "cant-start",
    label: "Can't start",
    feeling: "I'm paralyzed / procrastinating",
    steps: [
      "Shrink the bar to guaranteed-win size: one minute. Open the doc. Put on the shoes. That's the whole task.",
      "State before task: stand up, shake out, 10 explosive breaths, one loud \"YES.\"",
      "Ask: \"Why is this important? What will it cost me if I don't?\" — say the answer out loud.",
      "Set a timer and start ugly. You're not after perfect — you're after started.",
    ],
    closer: "Consistency beats duration. One minute done is a win — celebrate it like one.",
  },
  {
    id: "anxious",
    label: "Anxious / overwhelmed",
    feeling: "My chest is tight and my head is spinning",
    steps: [
      "Hands on heart, eyes closed. Breathe as if through the heart — five slow rounds.",
      "Ask: \"What is something I'm really grateful for, right now, in this moment?\" Feel it — don't just answer it.",
      "Then: \"What's the truth of this situation?\" Trust the first quiet answer.",
      "Body check: tension anywhere = you're in your head. Drop back to the breath once more.",
    ],
    closer: "Your head is for strategy — it's terrible at happiness. Decisions can wait ten minutes.",
  },
  {
    id: "down",
    label: "Rough day",
    feeling: "I feel like giving up",
    steps: [
      "Don't fight the thought. Hear it, then: \"Thank you for sharing. Delete, delete.\"",
      "Read your driving force — the vision, the whys. That's what it's FOR.",
      "Find one thing that still went right today and write it down. You build success off success.",
      "If a window of energy opens later — seize it for ONE small thing. 95% down still leaves 5%.",
    ],
    closer: "A bad day is weather, not a verdict. The plan is still there tomorrow — and so are you.",
  },
  {
    id: "wrong-thought",
    label: "The wrong-thought drill",
    feeling: "A thought keeps looping that I know isn't serving me",
    steps: [
      "Catch it and say it back, out loud, in third person: \"There's the thought that says I always quit.\" Named, it's a thought — not a fact.",
      "Dismiss it with ceremony: \"Thank you for sharing. Delete, delete.\"",
      "Now the drill — don't leave the hole empty: speak the REPLACEMENT thought, present tense, out loud: \"I'm the kind of person who finishes.\"",
      "Repeat the replacement three times, louder each time, with your body in it. The rep count is the point — repetition is the mother of mastery.",
    ],
    closer: "You don't argue with a weed — you pull it and plant something in the hole.",
  },
]
