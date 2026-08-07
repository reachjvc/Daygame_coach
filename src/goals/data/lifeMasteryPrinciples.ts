/**
 * Principle half-pagers and SOS protocols, the education layer of the Life
 * Mastery lab. Every claim and quote is sourced from the research canon
 * (docs/plans/life-mastery-canon.md). Nothing here is invented doctrine.
 * Fixed anatomy per card: principle, why it works, in practice, quotes, and
 * the trap to avoid.
 *
 * VOICE RULES (enforced by tests/unit/goals/lifeMasteryCopyLint.test.ts):
 * say "you", one idea per sentence, no em-dashes, no "X, not Y", no
 * "it isn't X, it's Y", plain verbs, warm rather than clever. Verbatim source
 * material lives in `quotes` and keeps its video id.
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
    title: "The mastery path, and why this system works at all",
    teaser: "Knowing, then doing, then living. The plateau is the gate.",
    principle: "Everything here rides on one skill, and that skill is mastery. It has three levels. You can know what to do and never do it. You can do it and then stop doing it. Mastery is when you live it.",
    mechanism: "The plateau is the mechanism. Every skill flattens out after the early progress, and that flat stretch is where most people quit. The failure is never the flat stretch itself. The failure is stopping in it. Eight things carry you through. Study someone who already has the result. Go deep instead of dabbling. Repeat the fundamentals even when they bore you. Measure your progress. Reward yourself. Expect the plateau before it arrives. Be patient with it. Teach what you learn.",
    practice: "When a plateau hits, keep the reps going and be willing to retool. Sometimes you take two steps back to take ten forward, the way a champion golfer rebuilds a swing that was already winning. Bring in a coach at exactly that point. Courses are for the basics. A coach is for the plateau.",
    quotes: ["\"The master goes deep, the dabbler stays at the surface. The dabbler is looking for what's easy, the master is willing to do what's hard.\" (OltpabSGqmQ)", "\"There's only one reason why you didn't achieve your goal. It's because you stopped.\" (0qdqKXt46w4)", "\"Sometimes you could take two steps back to take ten steps forward.\" (Jy42T9CUee0)"],
    trap: "Reading the plateau as proof the system failed. It is proof you reached the part where mastery gets decided.",
  },
  commit: {
    id: "commit",
    title: "Why you commit first",
    teaser: "The dabbler quits at the plateau. The master already decided.",
    principle: "Before any planning, you commit. To the whole climb, and to every area of your life at once.",
    mechanism: "Skills plateau and motivation dips. A decision you made once, in a strong moment, is what carries you through the weak ones. Committing to every area is what stops the classic trade where the business climbs while your body and your marriage quietly fall apart.",
    practice: "The program opens with a personal manifesto. You write it in the first person, you read it out loud, and it ends with a line about committing to mastery in every area of your life and refusing to settle for anything less than an extraordinary quality of life.",
    quotes: ["\"Repetition is the mother of mastery… praise is the father of mastery.\" (Kf6aFwzozM0)", "\"I go all in, fully committing myself by deciding to do whatever it takes.\" (Kf6aFwzozM0)"],
    trap: "Committing to a result instead of to the process. Results have deadlines. Mastery does not end.",
  },
  values: {
    id: "values",
    title: "Why your values get a veto",
    teaser: "Dream freely first. Then your values judge every goal before it becomes your life.",
    principle: "Write down what has actually been most important to you, then put it in order. The order is what runs your life.",
    mechanism: "Values are emotions. When you say family, what you mean is love, or connection, or safety. Whatever sits at number one filters every decision underneath it. Put security above success and you will never take a risk. Put success above happiness and you will never enjoy anything you achieve.",
    practice: "Redo this every year or two. Ask what has been most important in your life, then keep asking what else until you run dry. Take the first answers, because they come from the gut. Rank them against each other. Then read the order back and see what it has been costing you.",
    quotes: ["\"What do my values need to be in order to create the life that I want?\" (Lp_GOrM16Xc)", "\"Happily achieve, instead of achieving to be happy.\" (OgRGJBpTOeU)"],
    trap: "Writing the values you would like to be seen having. Audit the real ones first and redesign them afterwards. And do not skip this because the vision felt like enough. A vision your values will not fund never survives week three.",
  },
  vision: {
    id: "vision",
    title: "Why the vision has no limits on it",
    teaser: "You can't hit a target you can't see, and a dim target won't pull you.",
    principle: "Write the life you want with zero realism applied. A long-horizon vision is supposed to be unrealistic.",
    mechanism: "The job of the vision is pull. You want something you can re-read that produces motivation the moment you read it. Realism belongs in this year's goals. Word it so it moves you, because you are going to read it every morning.",
    practice: "A strong vision is one long paragraph covering who you are, your body, your home, your relationship, and your income. Read it aloud every morning. If the blank page is too big, try the Perfect Day instead. Take one day, years out, and write it hour by hour.",
    quotes: ["\"Imagine as if there's no limits: if a magician were able to come along and create the perfect life for you, what would that be?\" (8kco2rjijjE)", "\"Without a vision, people perish.\" (hlJYapcgKM8)"],
    trap: "Writing a modest vision so you cannot be disappointed. A vision you already believe is a forecast.",
  },
  purpose: {
    id: "purpose",
    title: "Why the why",
    teaser: "Reasons are the fuel. The vision is only the destination.",
    principle: "Under the vision, and under every single goal, write why you want it. More reasons give you more fuel.",
    mechanism: "Motivation decays. Re-reading your reasons re-ignites it on demand. Pain reasons work too, so write what it costs you to do nothing. That pushes you on the days when nothing is pulling.",
    practice: "Write fresh reasons for your daily outcomes every morning. Deriving them again is the point, so do not copy yesterday's.",
    quotes: ["\"The reasons are the fuel for the fire.\" (ZywgvFSnH38)", "\"Anytime along the journey you're not motivated… just remind yourself: why do I want this?\" (ZywgvFSnH38)"],
    trap: "Settling for one noble-sounding reason. You need the greedy ones and the scared ones too. Whichever produces real feeling is the one that works.",
  },
  identity: {
    id: "identity",
    title: "Why identity beats behaviour",
    teaser: "You will not outperform who you believe you are.",
    principle: "Decide who you are committed to being, in one sentence per area, before you decide what to do.",
    mechanism: "The strongest pull in your personality is staying consistent with how you define yourself. Change the definition and your behaviour reorganises around it. Change only the behaviour and the old definition drags you back.",
    practice: "Write lines that start with I am. Do it for your whole life and for each area. Say them out loud with energy during the morning ritual.",
    quotes: ["\"Whatever you attach the words 'I AM' to is what you become.\" (Wr2SPFgW8iY)", "\"Changing the behavior is not enough unless you change the identity.\" (8kco2rjijjE)"],
    trap: "Waiting until you feel like that person before you say it. The saying comes first and the feeling follows.",
  },
  tens: {
    id: "tens",
    title: "Why you define your 10 and your 0",
    teaser: "A rating with no reference behind it is a mood.",
    principle: "For every area, write what a 10 looks like for you and what a 0 looks like. Then rate where you are today between them, and the number starts meaning something.",
    mechanism: "You can answer where am I against my own ideal. You cannot really answer how is my health. The 10 also moves. Live at a 9 for a while and your picture expands, so what used to be your 10 becomes your 8.",
    practice: "A good body 10 has numbers in it, like weight, body fat, and how much energy you have. A good money 10 gets rewritten as you grow. There is never a final 10, because a 10 would mean you stopped growing.",
    quotes: ["\"If you're honest with yourself in terms of where you want to be, what your ten would be, where would you measure yourself right now?\" (wqJ-2N5KVOU)", "\"What is the ten for you and then what is a zero for you?\" (wqJ-2N5KVOU)", "\"Who says that ten has to be a limitation? Why can't you go to eleven, why can't you go to twelve?\" (wqJ-2N5KVOU)"],
    trap: "Borrowing someone else's 10. Their number has nothing to do with your life. Your 10 is yours.",
  },
  goals: {
    id: "goals",
    title: "Why goals get qualified before they count",
    teaser: "A goal you don't believe at 7, and don't want at 7, is a wish.",
    principle: "Every goal passes two gates. You believe at 7 out of 10 or better that it is achievable, and you want it at 7 out of 10 or better. If it fails either gate, reshape it.",
    mechanism: "Under 7 on belief and your brain will not commit any real action, because part of you has already asked why bother. Under 7 on desire and you abandon it the first hard week. Missing goals you set yourself trains a habit of failure and burns your trust in your own word. So shrink it until you believe it, hit it, then move the target further out.",
    practice: "Write it as a sentence that starts with I will easily, and put the date in. Underneath it write the why, the pain why, a reward for landing it, a consequence for missing it, and a short pre-mortem on what will try to stop you.",
    quotes: ["\"Your short-term goals you want them to be attainable, your long-term goals you want them to be unrealistic.\" (ZywgvFSnH38)", "\"Whatever amount for you that is realistic and attainable for you, that's the most important thing, that you have that level of belief and that desire for it. That's the sweet spot that you want to focus on.\" (GXhPOncX8CA)", "\"What's the date, what's the deadline? If you don't have a deadline, most often people don't take any action.\" (ZywgvFSnH38)"],
    trap: "Setting last year's failed goal again at the same size. Calibrate it. Hitting around 90% of your goals comes from sizing them so they can be hit.",
  },
  focus: {
    id: "focus",
    title: "Why you pick one to three areas per season",
    teaser: "Total balance is a myth. Choose your imbalance on purpose.",
    principle: "Each season, choose the one to three areas that lift all the others when you conquer them. Then agree with yourself that the rest run on maintenance.",
    mechanism: "Focus is finite. Pretending to push twelve areas equally pushes none of them. The test is which area pays out across the others. Money funds the trainer. Health powers the business. Maintenance minimums are what stop the quiet areas dying while you push the loud one.",
    practice: "Let a non-focus area drop from a seven to a five, deliberately, with your own consent. Keep hard minimums like training most days and a weekly date night. If a grind season is coming, negotiate it with your partner before it starts.",
    quotes: ["\"What is that area of my life, by conquering it, it's actually going to simultaneously benefit all the other areas of my life too?\" (JZnLIuW7NQw)", "\"The truth is that balance doesn't really exist. I never go for balance, I go for progress.\" (8kco2rjijjE)"],
    trap: "Going all in without telling anyone. An un-negotiated grind season is how relationships start to end.",
  },
  ritual: {
    id: "ritual",
    title: "Why the morning ritual",
    teaser: "You don't hope for a good day. You manufacture one.",
    principle: "An ordered sequence you run before the world gets to you, with at least one thing each for your mind, your body, and your spirit.",
    mechanism: "State comes before performance. Motion changes emotion, questions aim your focus, and words said out loud install beliefs. Run it daily and the state you practise becomes the one you return to on your own.",
    practice: "Fifteen to sixty minutes, on a checklist, ticked off daily. Treat it as a menu and rotate items monthly so it never bores you. On a chaotic day drop to the one-minute floor, because one step still counts. Consistency beats duration.",
    quotes: ["\"How you start the day is how you end the day.\" (PliFBr__T7Y)", "\"I don't hope it's going to be a good day. I demand it.\" (PliFBr__T7Y)"],
    trap: "The ninety-minute perfect ritual you quit in week two. One minute done daily beats an hour done twice.",
  },
  rpm: {
    id: "rpm",
    title: "Why you plan outcomes instead of to-dos",
    teaser: "You can finish every task on the list and achieve nothing.",
    principle: "Plan the day as three to five results across different areas of your life. Give each one its why and a could-do list, then star the one or two musts under each.",
    mechanism: "A to-do list measures activity. A result measures achievement. Asking what result you are after generates better actions than your memory will. The why keeps feeling attached to the work. Anything unfinished rolls forward without guilt, because the day gets judged on outcomes.",
    practice: "A typical day has one body block, one work block, and one relationship block. Often there is a purely emotional one too, like feeling deeper gratitude today. Do the hardest starred item first on a sixty-minute timer, before you open email.",
    quotes: ["\"A lot of people, they mistaken activity with achievement.\" (ZywgvFSnH38)", "\"Did I achieve my outcomes? Yes, great, that was an awesome day, I made progress.\" (mDHWi92v9X8)"],
    trap: "Checking email first. You just handed the strongest willpower you will have all day to other people's priorities.",
  },
  weekly: {
    id: "weekly",
    title: "Why the weekly evaluation",
    teaser: "Measure weekly and the worst you can have is a bad week.",
    principle: "Once a week, score every area against your 10, celebrate what went right, take the lesson, and commit next week's outcomes.",
    mechanism: "How often you measure sets how much you can lose. Review once a year and you can lose a year. The wheel makes your weakest area visible before it turns into a crisis. The plus-one rule keeps the repair realistic, so you bring the 3 to a 4 and leave the 10 alone.",
    practice: "Run it in order. Re-read the plan. Rate every area from 0 to 10. Write the magic moment, the proudest win, and the lesson. For anything under 7 ask what you could do to level that area up. Then set outcomes with whys and put them in the calendar.",
    quotes: ["\"If you don't measure it you can't manage it, and it doesn't get better.\" (oLQiUIJ7PsQ)", "\"You don't ever get to the point where something is a three out of ten, or a one, or a zero… you can catch it by being proactive, anticipating it in advance and checking in on a more regular basis.\" (wqJ-2N5KVOU)"],
    trap: "Rating only the areas that are going well. The point of the ritual is checking in with your whole life, and the quiet rooms are where things rot.",
  },
  report: {
    id: "report",
    title: "Why the monthly report is a ceremony",
    teaser: "Wins first, misses owned honestly, lessons turned into systems.",
    principle: "Each month, read every goal's number against its target, give it an honest verdict, and own the reason behind every miss.",
    mechanism: "The order does the work. Flood yourself with the wins first, because confidence compounds and success breeds more success. Then process the misses with most of your attention on the solution. A miss with a reason attached becomes a fix. A miss with no reason becomes a pattern.",
    practice: "Write it as though it could be published. Exact numbers, plain verdicts like behind or haven't started yet, and a reason on each one. This single habit is what makes annual goals land.",
    quotes: ["\"Setting goals is the easy part… the hard part is actually following through on that, and more importantly, checking in on a regular basis to make sure that you're measuring yourself.\" (IqCvSF0NHRs)", "\"Don't be hard on yourself… the being hard on yourself part is more for the end… this is a time of celebration.\" (zuEb-1Ll2h8)"],
    trap: "Treating the report as a stats page. It is a sit-down with a beginning, a middle, and an end. Wins, then truth, then next month's focus.",
  },
  evening: {
    id: "evening",
    title: "Why you close the day",
    teaser: "Whatever gets rewarded gets repeated, so reward today, tonight.",
    principle: "Two questions and a score. What was great today, how could it have been better, and how productive were you out of 10.",
    mechanism: "Ending the day by hunting for the good trains your brain to produce more of it. The improvement question turns friction into tomorrow's adjustment without punishing you, and punishment only ever teaches you to stop trying.",
    practice: "When you read the day's wins back, smile and pat yourself on the back for real. You are pairing physical pleasure with productivity on purpose.",
    quotes: ["\"Whatever gets rewarded gets repeated.\" (OgRGJBpTOeU)", "\"You can't build success off failure. You build success off success.\" (CGqhbXzJrG8)"],
    trap: "Skipping it on the bad days. A bad day is exactly when the habit makes you find the one thing that still went right.",
  },
  sos: {
    id: "sos",
    title: "Why you keep an SOS toolkit",
    teaser: "You can't plan your way out of a state. Change the state first.",
    principle: "Cravings, panic, paralysis and despair each get a protocol you can run in under a minute. Run the protocol, then go back to the plan.",
    mechanism: "In a triggered state your planning brain is offline, so willpower argues and loses. Physiology, focus and language are the three levers that move in seconds. Your triggers never disappear. What changes is your relationship to them.",
    practice: "Two rules. Do not leave the house below state level 10. And never try to willpower through it. Jump, breathe, speak, then work. For an urge, make sure the replacement serves the same need the habit was serving.",
    quotes: ["\"To break a habit you must make a habit. You've got to replace this bad habit with something new.\" (AFgeREfiDgw)", "\"All emotions and thoughts are temporary. When you just watch and observe them they fade away, like clouds in the sky.\" (bT1akeSdIIM)"],
    trap: "Reading a bad hour as a verdict on the plan. It is weather. Run the protocol. The plan is still there.",
  },
}

/**
 * The incantation deck, the program's starter cards, grounded in the research
 * canon. Spoken aloud with full physiology, around three times each, often
 * while moving, ending with a fist clench and a loud yes. Users add their own
 * on top: find a limiting belief, write its opposite, add it to the deck.
 */
export const INCANTATION_CARDS: string[] = [
  "What I choose to do today is going to shape today and create my tomorrow.",
  "I enjoy the process of creating a healthy and fit body.",
  "The past does not equal the future.",
  "Life doesn't happen to me, it happens for me.",
  "Is this bringing me closer to my vision, or further away from it?",
  "Master your emotions, master your life.",
  "I eat to fuel my body.",
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
  "To hell with circumstances. I create opportunities.",
  "As I think, I shall become.",
  "If I can't, then I must. If I must, then I will.",
  "There's no such thing as failure, only feedback.",
  "I deserve the gift of lasting health and happiness.",
  "What I do every day determines my self-esteem and my happiness.",
  "My rituals are an act of self-love.",
  "I don't need a reason to feel good.",
  "Nothing is more important than my health and my happiness.",
  "Knowing is not enough, we must apply. Willing is not enough, we must do.",
  "I am bigger than anything that could ever happen to me.",
  "All that I need is within me now.",
  "If I'm committed enough, there's always a way.",
]

/** SOS protocols. Interventions of a minute or less, one per crisis type,
 * straight from the toolkit layer of the canon. The front door for a rough
 * moment. */
export interface SosProtocol {
  id: string
  label: string
  /** What the user is feeling, shown as the button copy. */
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
      "Name it out loud. This is a trigger and it will pass. Emotions and thoughts are temporary, so watch them and they fade, like clouds in the sky.",
      "Make some space. Ten slow breaths. The urge is a wave and you are learning to surf it.",
      "Run your replacement. The kettle, the walk, the shower. It has to serve the same need the habit was serving.",
      "Ask the after question. \"How will I feel about myself afterwards? Does my self-esteem go up or down?\"",
    ],
    closer: "One day at a time. Never say never again. Just not this hour.",
  },
  {
    id: "cant-start",
    label: "Can't start",
    feeling: "I'm paralyzed / procrastinating",
    steps: [
      "Shrink the bar until winning is guaranteed. One minute. Open the doc. Put the shoes on. That is the whole task.",
      "State before task. Stand up, shake out, ten explosive breaths, one loud yes.",
      "Ask why this is important and what it will cost you if you skip it. Say the answer out loud.",
      "Set a timer and start ugly. You are after started.",
    ],
    closer: "Consistency beats duration. One minute done is a win, so celebrate it like one.",
  },
  {
    id: "anxious",
    label: "Anxious / overwhelmed",
    feeling: "My chest is tight and my head is spinning",
    steps: [
      "Hands on your heart, eyes closed. Breathe as if the breath goes through your heart, five slow rounds.",
      "Ask what you are really grateful for, right now, in this moment. Feel the answer before you move on.",
      "Then ask what the truth of this situation is. Trust the first quiet answer you get.",
      "Check your body. Tension anywhere means you are back in your head, so drop to the breath once more.",
    ],
    closer: "Your head is for strategy and it is terrible at happiness. Decisions can wait ten minutes.",
  },
  {
    id: "down",
    label: "Rough day",
    feeling: "I feel like giving up",
    steps: [
      "Don't fight the thought. Hear it, then say \"thank you for sharing, delete, delete.\"",
      "Read your driving force. The vision and the whys. This is what they are for.",
      "Find one thing that still went right today and write it down. You build success off success.",
      "If a window of energy opens later, take it for one small thing. Being 95% down still leaves 5%.",
    ],
    closer: "A bad day is weather. The plan is still there tomorrow, and so are you.",
  },
  {
    id: "wrong-thought",
    label: "The wrong-thought drill",
    feeling: "A thought keeps looping that I know isn't serving me",
    steps: [
      "Catch it and say it back out loud in the third person. \"There's the thought that says I always quit.\" Once you name it, it is a thought you are having.",
      "Dismiss it with some ceremony. \"Thank you for sharing. Delete, delete.\"",
      "Now the drill. Don't leave the hole empty. Speak the replacement thought out loud in the present tense. \"I'm the kind of person who finishes.\"",
      "Say the replacement three times, louder each time, with your body in it. The rep count is the point, because repetition is the mother of mastery.",
    ],
    closer: "You don't argue with a weed. You pull it, and you plant something in the hole.",
  },
]
