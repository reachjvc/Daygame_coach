/**
 * The four flows.
 *
 * They are four because the research disagrees with itself in a way that cannot
 * be averaged out, and averaging it out is how you get a flow that suits
 * nobody. The disagreements are real and each one has a flow:
 *
 *  - **Watch it first** takes the position that argument does not touch a
 *    habit's grip, and that a person's own expected-against-actual numbers do.
 *    It asks for no commitment whatsoever, and is the only one that works on
 *    somebody who has not decided anything.
 *  - **Run an experiment** takes the position that "forever" is what people
 *    refuse, and a dated, bounded, reversible period is what they accept. It
 *    carries the one component with a clean trial behind it — a short daily
 *    task sequence.
 *  - **Draw a line** takes the opposite position: that a single unconditional
 *    decision is what removes the nightly re-litigation, and that the daily
 *    renewal of a promise is itself exhausting. Its known failure is that one
 *    slip collapses the whole thing, so the lapse protocol is written *before*
 *    it is needed rather than offered afterwards.
 *  - **Change the week** takes the position that none of this is psychological
 *    and all of it is architecture. It asks for no introspection at all.
 *
 * Everything is shared: one log, one set of plans, one card, one voice. Someone
 * who starts in one and moves to another keeps all of it.
 */

import type { ViceFlow } from "../types"
import { EXTERNAL_TRIGGERS, INTERNAL_TRIGGERS } from "./vices"
import { TRAJECTORY, WHERE_INTRO } from "./awareness"
import { GIVES_INTRO } from "./gives"

/** Offered top-down so the number they land on is one they argued for. */
export const LENGTH_OFFERS = [30, 14, 7, 3, 1]

/**
 * The daily sequence for the experiment flow.
 *
 * Kept to a month and to one small thing a day, which is the shape the only
 * clean component trial in this field actually tested. They are instructions,
 * not journalling prompts and not reading — that distinction is the finding.
 */
export const MISSIONS: Array<{ day: number; title: string; body: string }> = [
  { day: 1, title: "Say what you are doing to one person", body: "Out loud, to somebody real. Not a post. The point is that it now exists outside your own head, where it is harder to quietly drop." },
  { day: 2, title: "Take one thing out of the house", body: "Whatever is nearest to hand. If there is nothing in the house, delete one saved card or one app instead." },
  { day: 3, title: "Log one urge from start to finish", body: "Including how many minutes it ran. You are building your own number here, and nobody else's is any use to you." },
  { day: 4, title: "Name the hour it is worst", body: "Look at what you have logged. Put a thing you would actually enjoy into that hour tomorrow." },
  { day: 5, title: "Write one if-then plan", body: "For the situation you already know is coming this week." },
  { day: 6, title: "Say the refusal line out loud", body: "Once, alone, so your mouth has been round it before a person is standing there." },
  { day: 7, title: "One week. Look at the numbers", body: "Expected against actual, the hours, the durations. Read them before you decide anything." },
  { day: 8, title: "Change one route", body: "The walk, the drive, the room you sit in when you get home. Cue exposure you can simply not have." },
  { day: 9, title: "Write the three reasons on the card", body: "Twelve words each at most. This is the thing you open at eleven at night." },
  { day: 10, title: "Tell the second person", body: "Somebody who will be in the room during a hard one." },
  { day: 11, title: "Do the thing you used to do instead", body: "From before it took up the time. Rate it out of ten afterwards, honestly, even if it was a disappointment." },
  { day: 12, title: "Answer one line it uses on you", body: "Pick the one you hear most and write your own reply to it. Yours, not the suggested one." },
  { day: 13, title: "Put something in the diary for the weekend", body: "An actual arrangement with an actual person, not an intention." },
  { day: 14, title: "Two weeks. What has changed that you did not expect?", body: "One sentence. Compare it with what you wrote at the start about what you wanted to find out." },
  { day: 15, title: "Sleep", body: "Same bedtime tonight, phone out of the room. Tiredness is the most reliable of the four cheap causes." },
  { day: 16, title: "Spend some of the money", body: "Work out roughly what you have not spent and buy one specific thing with it. Not saved — spent, on something you can point at." },
  { day: 17, title: "Handle one social situation on purpose", body: "Go, with your line ready and your exit decided in advance." },
  { day: 18, title: "Reread the first thing you wrote", body: "Your own answer about why it mattered. In your own words, from before any of this." },
  { day: 19, title: "Find the earliest choice point", body: "In the last near-miss, work backwards. The decision was made well before the moment it looked like it was." },
  { day: 20, title: "Add a second if-then plan", body: "For the situation the first three weeks have shown you, rather than the one you predicted." },
  { day: 21, title: "Three weeks. Ask what is actually harder now", body: "Not what is easier. The honest answer tells you what the next week is for." },
  { day: 22, title: "One evening with nothing in it", body: "Deliberately. Boredom is the trigger nobody plans for, and the first unplanned evening is not the one to meet it on." },
  { day: 23, title: "Say it to somebody who will be surprised", body: "Somebody outside the two who already know." },
  { day: 24, title: "Rate the replacement honestly", body: "The thing you have been doing instead. If it is a five, it is a five, and a five is worth knowing about." },
  { day: 25, title: "Write the line for the night you nearly give up", body: "Address it to yourself. You are going to need it and you cannot write it then." },
  { day: 26, title: "Check the body map", body: "Next urge, before anything else: where is it, and what is it like there?" },
  { day: 27, title: "Look at the durations", body: "Your own median, your own longest. That is the number, and it is better than the one everybody repeats." },
  { day: 28, title: "Decide what the next period is", body: "Same length, longer, different terms, or stop here. All four are real answers and this page does not prefer one." },
  { day: 29, title: "Write down what you would tell somebody on day one", body: "You know something now that you did not four weeks ago." },
  { day: 30, title: "Read the whole thing back", body: "Everything you have written, in order. Then decide." },
]

// ---------------------------------------------------------------- flows

export const VICE_FLOWS: ViceFlow[] = [
  // ----------------------------------------------------------- 0. where
  /**
   * The awareness flow, and it goes first because it is the only one that
   * works on somebody who has not yet concluded there is anything to work on.
   *
   * The other four all begin after that conclusion has been reached. For the
   * ~95% of people who met clinical criteria, got no help, and said the reason
   * was that they did not think they needed any, that is the entire failure —
   * they never got as far as a page like this being relevant to them.
   *
   * It ends in three doors and picks none of them. A flow that spends fifteen
   * minutes establishing that the person is the authority on their own
   * situation, and then issues a recommendation, has undone its own work on the
   * last screen.
   */
  {
    id: "where",
    label: "Find out where this actually is",
    pitch: "No advice and no label at the end. An accurate picture, which is the one thing that is hard to get from inside it.",
    forWho: "You genuinely do not know whether this is a habit, a problem, or nothing much.",
    asks: "About fifteen minutes, once. Nothing to keep up afterwards and no decision at the bottom.",
    basis: "Screening plus personalised feedback, given in that order. Modest effects on behaviour by itself; its actual job is the picture.",
    minutes: 15,
    steps: [
      {
        id: "where.intro",
        kind: "intro",
        title: "You cannot see this one from the inside",
        blurb: "Which is a fact about the problem rather than a remark about you.",
        body: [...WHERE_INTRO.body],
        caution: WHERE_INTRO.caution,
      },
      { id: "where.pick", kind: "pickVice", title: "What are we looking at?", blurb: "Name it however you say it in your head." },
      {
        id: "where.count",
        kind: "count",
        title: "The count",
        blurb: "Things that either happened in the last year or did not. Nobody is marking it.",
        source: "The constructs clinicians count for a substance use disorder, rebuilt in plain words. The published wording is copyright; arithmetic is not.",
      },
      {
        id: "where.usage",
        kind: "usage",
        title: "What a week holds",
        blurb: "Four small numbers, multiplied out. Most people are surprised, and a good few are surprised by how little.",
      },
      {
        id: "where.feedback",
        kind: "feedback",
        title: "What it adds up to",
        blurb: "Your prediction first, then the numbers, then what you make of them.",
        source: "Personalised feedback given elicit–provide–elicit. Small pooled effect on drinking on its own; the sequencing is what stops it becoming an argument.",
      },
      {
        id: "where.trajectory",
        kind: "trajectory",
        title: "Which way it is going",
        blurb: "A count is a snapshot. Direction of travel is the half a snapshot cannot show.",
        fields: [...TRAJECTORY.fields],
      },
      {
        id: "where.doors",
        kind: "doors",
        title: "So what now",
        blurb: "Three ways on. This page does not have a preference between them.",
      },
    ],
  },

  // ----------------------------------------------------------- 0b. gives
  /**
   * The one that starts at the good half.
   *
   * Sits next to the awareness flow rather than among the four, because like
   * that one it asks for no commitment and works on somebody who has decided
   * nothing. Where `where` counts what it costs, this one takes seriously what
   * it pays — and then checks the payment against the person's own record.
   *
   * The thing to not break: this is never a balance sheet. The gives and the
   * costs are on different screens and are never totalled against each other.
   * See the header of data/gives.ts.
   */
  {
    id: "gives",
    label: "What it gives you, honestly",
    pitch: "Start at the good half, then check it against your own record rather than anybody's opinion.",
    forWho: "Every account of this you have read is about the damage, and none of it matches why you actually do it.",
    asks: "About twenty minutes. No commitment, no date, and nothing added up at the end.",
    basis: "Expectancy checking against your own log, discrepancy left for you to find, and future cues you can use at the moment it matters.",
    minutes: 20,
    steps: [
      {
        id: "gives.intro",
        kind: "intro",
        title: "Start with what it is for",
        blurb: "If it did nothing for you this would be easy, and it is not easy.",
        body: [...GIVES_INTRO.body],
        caution: GIVES_INTRO.caution,
      },
      { id: "gives.pick", kind: "pickVice", title: "What are we talking about?", blurb: "Name it however you say it in your head." },
      {
        id: "gives.beliefs",
        kind: "beliefs",
        title: "What it gives you",
        blurb: "The honest half, and it goes first.",
        source: "The spread follows the factor structure the expectancy questionnaires settled on, rebuilt in our own words. The published items are copyright.",
      },
      {
        id: "gives.test",
        kind: "beliefTest",
        title: "Now check them",
        blurb: "One at a time, against your own log and your own last three times.",
        source: "Expectancy challenge. Works, then fades within about a month where it has been tested — except that your own record keeps arriving.",
      },
      {
        id: "gives.values",
        kind: "values",
        title: "What you are for",
        blurb: "Separately, and with nothing weighed against anything.",
        source: "A values card sort, in the motivational-interviewing sense. The discrepancy is left for the person to find; a page that points at it produces an argument.",
      },
      {
        id: "gives.futures",
        kind: "futures",
        title: "Two versions of later",
        blurb: "Four dates, twice over, written short enough to re-read at a bad moment.",
        source: "Episodic future thinking. Shortens the gap between now and later, reduces how much the immediate thing pulls, and has moved real drinking in a trial on people with alcohol use disorder.",
      },
      {
        id: "gives.letter",
        kind: "letter",
        title: "The letter",
        blurb: "From it, or to it. The first asks less and is the better use of today.",
        source: "The goodbye letter is ubiquitous in treatment and thinly evidenced. Externalising — addressing it as separate — is the part with support.",
      },
    ],
  },

  // ------------------------------------------------------------- 1. map
  {
    id: "map",
    label: "Watch it first",
    pitch: "Change nothing. Just find out what it actually gives you.",
    forWho: "You are not sure you want to stop, or you have tried stopping and it did not hold.",
    asks: "About a minute a day, for a week or two. No quitting, no date, no promise.",
    basis: "Reward-value updating. You cannot argue a habit down, but your own numbers can.",
    minutes: 12,
    steps: [
      {
        id: "map.intro",
        kind: "intro",
        title: "Change nothing",
        blurb: "Seriously. This flow does not ask you to stop, cut down, or decide anything.",
        body: [
          "Habits are hard to see because they run without asking. By the time there is a thought about it, the hand has usually already moved. So the first job is not stopping — it is getting the thing into view at all.",
          "Here is the whole method. Before you do it, you say how good you expect it to be. Afterwards, you say how good it actually was. That is it.",
          "The gap between those two numbers is what does the work, and it does it without anybody arguing with you. If it turns out there is no gap, that is a real finding and this page will say so.",
        ],
        caution: "Nothing on this flow is a test and nothing on it can be failed. A week where you did it every single time is a good week of data.",
      },
      { id: "map.pick", kind: "pickVice", title: "What are we watching?", blurb: "Name it however you say it in your head." },
      {
        id: "map.log",
        kind: "log",
        title: "The loop",
        blurb: "Before: how good is this going to be? After: how good was it? Then a line about what you noticed.",
        source: "Reward-value updating — Brewer. The in-person trial is strong, the app trial was null on quitting but did loosen the link between craving and acting.",
      },
      {
        id: "map.window",
        kind: "window",
        title: "When it happens",
        blurb: "Built from what you have logged, not from what you would guess. Guesses about this are usually wrong.",
      },
      {
        id: "map.triggers",
        kind: "chips",
        title: "What sets it off",
        blurb: "Two lists, because they need different answers. An outside one can be avoided or left. An inside one cannot, so it gets ridden or answered instead.",
        caution: "Fair warning: thinking hard about your own urges can set one off. If that feels like a bad idea alone, do this bit with somebody.",
        chips: [
          { id: "triggers.external", label: "Outside you", help: "People, places, times, things.", options: EXTERNAL_TRIGGERS, allowCustom: true },
          { id: "triggers.internal", label: "Inside you", help: "Feelings, thoughts, states.", options: INTERNAL_TRIGGERS, allowCustom: true },
        ],
      },
      {
        id: "map.review",
        kind: "review",
        title: "What the week says",
        blurb: "Your numbers, with the arithmetic and nothing else. What you do about it is a separate question, and it is yours.",
      },
    ],
  },

  // ------------------------------------------------------ 2. experiment
  {
    id: "experiment",
    label: "Run an experiment",
    pitch: "Not forever. A dated, reversible period, with one small thing to do each day.",
    forWho: "You want to change something, and \"never again\" is the bit that makes you not start.",
    asks: "A setup of about ten minutes, then a minute a day for however long you pick.",
    basis: "Trial abstinence, negotiated down rather than imposed, plus the one daily-task format with a clean trial behind it.",
    minutes: 10,
    steps: [
      {
        id: "exp.intro",
        kind: "intro",
        title: "Not forever. An experiment",
        blurb: "With a start date, an end date, and a decision at the end that genuinely includes going back to how it was.",
        body: [
          "Most people refuse to quit and will happily run an experiment, and the difference is not willpower — it is that one of them is a verdict on who you are and the other is a fortnight.",
          "So there is no permanent option anywhere on this flow. You pick a length, you find out what happens, and on the last day you decide what is next. Carrying on exactly as before is on that menu, without any editorial from this page.",
          "You are also not agreeing that you have a problem, and nothing here is going to ask you to say that you do.",
        ],
      },
      { id: "exp.pick", kind: "pickVice", title: "What is the experiment about?", blurb: "Name it however you say it in your head." },
      { id: "exp.safety", kind: "safety", title: "One thing before a date goes in", blurb: "Thirty seconds, and it only matters for two of them." },
      {
        id: "exp.rulers",
        kind: "ruler",
        title: "Two numbers",
        blurb: "Then one question about each. Both questions are asked downwards on purpose — see the note under them.",
        source: "SAMHSA TIP 35, Exhibits 3.9 and 3.10. Public domain, used close to as written.",
      },
      {
        id: "exp.length",
        kind: "negotiate",
        title: "How long",
        blurb: "Start at the top and come down until you hit a number you would actually bet on. The one you argue down to is worth more than the one you were handed.",
      },
      {
        id: "exp.hypothesis",
        kind: "text",
        title: "What do you want to find out?",
        blurb: "This is what turns doing as you are told into curiosity, and curiosity survives a bad Tuesday rather better.",
        fields: [
          { id: "exp.find-out", label: "By the end of it, I want to know…", placeholder: "whether I actually sleep better, or whether that is just something people say", rows: 3, minWords: 4 },
          { id: "exp.worst", label: "What do you think the worst part will be?", help: "Written now, read back at the end. Predictions are much more interesting than memories.", rows: 2 },
        ],
      },
      {
        id: "exp.plan",
        kind: "ifthen",
        title: "The first hard one",
        blurb: "You already know roughly when it is. Decide now what happens, while it is not happening.",
      },
      { id: "exp.card", kind: "card", title: "The card", blurb: "Three reasons and one line. This is the thing you open when it is bad, so it is short on purpose." },
      { id: "exp.missions", kind: "missions", title: "One thing a day", blurb: "Small, specific, and done in a couple of minutes. Missing one is not a problem; the sequence does not reset." },
      { id: "exp.review", kind: "review", title: "The end of the period", blurb: "The data, your predictions from day one, and then one question." },
    ],
  },

  // ------------------------------------------------------------ 3. line
  {
    id: "line",
    label: "Draw a line",
    pitch: "One decision, made once, so it stops being on the table every evening.",
    forWho: "You have already decided, and what you are tired of is deciding again every night.",
    asks: "About twenty-five minutes in one sitting. It is the longest of the four.",
    basis: "A single unconditional decision, plus the lapse protocol written in advance — which is the repair for this approach's known failure.",
    minutes: 25,
    steps: [
      {
        id: "line.intro",
        kind: "intro",
        title: "The daily vote is the exhausting part",
        blurb: "Not the vice. The re-litigating.",
        body: [
          "There is a real argument that holding something open — taking it a day at a time, seeing how it goes — costs more than closing it, because an open question gets asked again every single evening, usually at the worst moment and by the least reliable version of you.",
          "The counter-argument is just as real, and it is why this flow has a last step that the pure version of this approach does not. If a line is absolute, then one crossing of it can read as total collapse, and people who take that reading tend to keep going rather than stop. That is a predictable and preventable failure, and preventing it means writing the response now, while nothing has happened.",
          "So: the decision here is unconditional. The response to breaking it is not catastrophic. Both, on purpose.",
        ],
      },
      { id: "line.pick", kind: "pickVice", title: "What is the line about?", blurb: "Name it however you say it in your head." },
      { id: "line.safety", kind: "safety", title: "One thing before a date goes in", blurb: "Thirty seconds, and it only matters for two of them." },
      {
        id: "line.audit",
        kind: "text",
        title: "The one you would keep",
        blurb: "If you had to give up all of it except one, which one survives? Then the same question the other way.",
        fields: [
          { id: "line.precious", label: "The one you would least want to give up is…", placeholder: "the first one on a Friday, the moment I sit down", rows: 2 },
          { id: "line.what-for", label: "What does that one actually do for you?", help: "Answer it properly. There is always a real answer, and the flow does not work if you skip past it.", rows: 3, minWords: 5 },
          { id: "line.worst", label: "And the worst one? The one that is just automatic?", rows: 2 },
          { id: "line.same", label: "What is the difference between those two, honestly?", help: "For a lot of people the answer turns out to be the situation, not the thing itself.", rows: 3 },
        ],
      },
      {
        id: "line.values",
        kind: "text",
        title: "What it serves, and what it costs",
        blurb: "Both halves. A page that only lets you write the costs is one you will not believe.",
        fields: [
          { id: "line.serves", label: "Name five things that matter to you. Not about this — about your life.", help: "People, ways of living, things you are trying to be.", rows: 3, minWords: 5 },
          { id: "line.serve-how", label: "How does it serve any of those?", help: "Genuinely. This is the honest half and it is the one that makes the other half land.", rows: 3, minWords: 4 },
          { id: "line.violate-how", label: "And which of them does it get in the way of?", rows: 3, minWords: 4 },
        ],
      },
      {
        id: "line.tape",
        kind: "tape",
        title: "Play it forward",
        blurb: "Say you do it. Then what? And then what? Keep going — the first two frames are always pleasant and the whole point is in the ones after.",
      },
      { id: "line.voice", kind: "voice", title: "Give it a name", blurb: "Then write down what it says, and what you say back." },
      {
        id: "line.line",
        kind: "text",
        title: "The line",
        blurb: "One sentence, in your words. Short enough to say to yourself in a doorway.",
        fields: [
          { id: "line.sentence", label: "Write it.", placeholder: "I do not drink on weeknights. Not one, not with dinner, not because it has been a day.", rows: 2, minWords: 3 },
          { id: "line.knows", label: "Who is going to know you wrote it?", help: "One name. Something nobody knows about is easier to quietly drop.", rows: 1 },
        ],
      },
      { id: "line.binding", kind: "binding", title: "Now make it hard to undo", blurb: "Decisions taken calmly, once, that later-you does not get to take again." },
      { id: "line.refusal", kind: "refusal", title: "When it is offered", blurb: "Short, friendly, no reason attached. A reason is something to argue with." },
      { id: "line.card", kind: "card", title: "The card", blurb: "Three reasons and one line, ready before you need them." },
      {
        id: "line.lapse",
        kind: "intro",
        title: "And if you cross it",
        blurb: "Written now, while nothing has happened, because this is not writable afterwards.",
        body: [
          "One crossing is one crossing. It is an event with a time and a cause, and it is not a verdict about what kind of person you are — that distinction is the single thing that separates people who get back on from people who do not.",
          "There is no counter in this module and nothing anywhere in it resets, precisely so that a bad Friday cannot present itself as having destroyed something. What you have written stays written and what you have logged stays logged.",
          "When it happens, open the lapse tool from the toolbar. It gives you credit for logging it, asks what happened at the level of what happened, and then walks the chain backwards to the point where a different move was still available. Then it asks about the next hour, which is the only part you can still do anything about.",
        ],
        caution: "The line stays absolute. The response to crossing it does not.",
      },
    ],
  },

  // ------------------------------------------------------------- 4. week
  {
    id: "week",
    label: "Change the week",
    pitch: "No feelings, no digging. Move the furniture so the thing stops being easy.",
    forWho: "You find the introspective version of this unbearable and you would rather just change something.",
    asks: "About fifteen minutes, and then some actual rearranging.",
    basis: "Behaviour design and environmental restructuring — the thing almost no app in this category ships.",
    minutes: 15,
    steps: [
      {
        id: "week.intro",
        kind: "intro",
        title: "Take the prompt away first",
        blurb: "Motivation is the expensive lever and it is also the last one worth pulling.",
        body: [
          "A behaviour happens when three things line up: some motivation, enough ability, and a prompt. Two of those are cheap to change and one is not, and almost everything written about quitting goes straight for the expensive one.",
          "So this flow does it in the other order. Remove the prompt. Then make it harder — more steps, more distance, more friction. Motivation last, if at all.",
          "It also refuses to treat this as one big thing. \"I drink too much\" cannot be attacked. \"I pour one while I am cooking, at about quarter past six, on my own\" can be, and so can each of the other three separately.",
        ],
      },
      { id: "week.pick", kind: "pickVice", title: "What are we rearranging around?", blurb: "Name it however you say it in your head." },
      {
        id: "week.decompose",
        kind: "text",
        title: "Break it into the actual behaviours",
        blurb: "Not the category. The specific things, each with a time and a place attached.",
        fields: [
          { id: "week.b1", label: "The first one", help: "Time, place, who is there, what is happening. As concrete as you can make it.", placeholder: "one while I cook, about six fifteen, on my own, radio on", rows: 2, minWords: 4 },
          { id: "week.b2", label: "The second", rows: 2 },
          { id: "week.b3", label: "The third", rows: 2 },
          { id: "week.biggest", label: "Which of those is the biggest, and which is the easiest to move?", help: "They are rarely the same one. Start with the easy one.", rows: 2 },
        ],
      },
      { id: "week.binding", kind: "binding", title: "Distance, time, and the category line", blurb: "One-off decisions that take the nightly decision away." },
      { id: "week.window", kind: "window", title: "The window", blurb: "Derived from what you have logged, if you have logged anything. Otherwise, name it yourself." },
      {
        id: "week.menu",
        kind: "chips",
        title: "What goes in its place",
        blurb: "Sorted by how long you have got, because at the moment of an urge nobody browses a list.",
        chips: [
          { id: "menu.short", label: "Under five minutes", options: ["Cold water on my face", "Ten slow breaths", "Kettle on", "Text somebody", "Step outside", "Press-ups"], allowCustom: true },
          { id: "menu.mid", label: "Five to thirty", options: ["Walk round the block", "Shower", "Wash up", "Something loud", "Call somebody", "Stretch"], allowCustom: true },
          { id: "menu.long", label: "Longer", options: ["Gym", "Cook properly", "Go and see somebody", "Out of the house entirely", "Something with my hands"], allowCustom: true },
        ],
      },
      { id: "week.plan", kind: "ifthen", title: "One plan per situation", blurb: "Not one master plan. One each, for the situations you just named." },
      { id: "week.review", kind: "review", title: "What moved", blurb: "Which component died, which survived, and what the week actually looked like." },
    ],
  },
]

export const FLOW_MAP = new Map(VICE_FLOWS.map((f) => [f.id, f]))
