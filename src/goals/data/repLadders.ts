/**
 * Ladders: the rungs a person climbs, one rep at a time.
 *
 * The rungs are **supplied, not authored**. Breaking a frightening thing into
 * survivable steps is the expert part, and it is the part the user arrived
 * without — handing them a blank box is how you get a form nobody finishes.
 *
 * But supplied is not the same as fixed. Someone who already trains four times
 * a week should not be told to put their training clothes on, so every ladder is
 * entered at whichever rung is the first real stretch, and can be moved up or
 * down at any point without it counting as failure.
 *
 * Every rung ends with explicit permission to stop. That is the mechanism, not
 * politeness: it removes the outcome from the rep, so the action is complete on
 * execution rather than on result.
 */

export type LadderId =
  | "approach"
  | "talking"
  | "outside"
  | "training"
  | "sleep"
  | "quit"
  | "work"
  | "money"
  | "skill"
  | "custom"

export interface LadderRung {
  /** What to do. Written so it can be read once and acted on today. */
  action: string
  /** What makes it count. Tight enough to settle an argument with yourself. */
  counts: string
  /** The permission to stop. Always present, never softened away. */
  release: string
}

export interface Ladder {
  id: LadderId
  /** How the user picks it, in their words rather than ours. */
  label: string
  /** Rough grouping, so nine options still scan quickly. */
  group: "People" | "Body" | "Habits" | "Work"
  /** The thing underneath the thing, so the ladder feels aimed at something. */
  aim: string
  rungs: readonly LadderRung[]
}

export const REP_LADDERS: readonly Ladder[] = [
  {
    id: "approach",
    label: "Talk to women I don't know",
    group: "People",
    aim: "Being able to start something with someone you find attractive, without it being a whole event.",
    rungs: [
      {
        action: "Go somewhere you'd realistically meet someone. Don't approach anyone.",
        counts: "You were there, out of the house, for twenty minutes.",
        release: "Go home whenever you like. Being there was the whole rep.",
      },
      {
        action: "Make eye contact with one woman and smile first.",
        counts: "Eyes met and you smiled before she did.",
        release: "Then look away and carry on. Nothing has to follow.",
      },
      {
        action: "Say one sentence to one woman. Anything at all.",
        counts: "You spoke first and she heard you.",
        release: "Then you're free to go, whatever she says back.",
      },
      {
        action: "Say the sentence, and stay for one more exchange.",
        counts: "You got past the opener and said a second thing.",
        release: "Leave first. Ending it yourself is part of the rep.",
      },
      {
        action: "Two minutes of conversation, then ask for her name or her number.",
        counts: "You asked.",
        release: "Her answer isn't the rep. The asking is the rep.",
      },
    ],
  },
  {
    id: "talking",
    label: "Talk to people I don't know",
    group: "People",
    aim: "Being someone who can start a conversation with a stranger without rehearsing it first.",
    rungs: [
      {
        action: "Go somewhere there are other people and stay ten minutes.",
        counts: "You were out, among people, for ten minutes.",
        release: "You don't have to speak to anyone. Come home.",
      },
      {
        action: "Say one thing out loud to one stranger. Anything at all.",
        counts: "Words left your mouth and were aimed at a person.",
        release: "Then you're free to go. It does not have to go anywhere.",
      },
      {
        action: "Say one thing, and add something you actually noticed about them.",
        counts: "You said a second sentence that wasn't small talk.",
        release: "Leave straight after. Two sentences is the whole job.",
      },
      {
        action: "Say your name and get theirs.",
        counts: "You know one thing about them that isn't visible.",
        release: "You can walk away immediately afterwards.",
      },
      {
        action: "Bring up one new thing to talk about and keep it going for half a minute.",
        counts: "Thirty seconds on a subject you introduced.",
        release: "Then end it yourself, before it dies. Ending it is part of the rep.",
      },
    ],
  },
  {
    id: "outside",
    label: "Get out of the house and have a life again",
    group: "People",
    aim: "Having somewhere to go and faces that know yours.",
    rungs: [
      {
        action: "Go outside once, for any reason at all.",
        counts: "You were out.",
        release: "Round the block counts. Come straight back.",
      },
      {
        action: "Go somewhere with other people in it and stay ten minutes.",
        counts: "Ten minutes somewhere public.",
        release: "You can sit in the corner on your phone. Being there is the rep.",
      },
      {
        action: "Ask one person who works there a question.",
        counts: "You spoke to a member of staff and they answered.",
        release: "That's it. Buy your coffee and go.",
      },
      {
        action: "Go back to the same place twice in one week.",
        counts: "Two visits, same place, seven days.",
        release: "Nobody has to recognise you yet. You're just becoming a regular.",
      },
      {
        action: "Go to something that happens on a schedule. Once.",
        counts: "You turned up to a thing at a time other people had chosen.",
        release: "You can leave at the first break. Turning up was the hard part.",
      },
    ],
  },
  {
    id: "training",
    label: "Get in shape",
    group: "Body",
    aim: "Being someone who trains, rather than someone who is about to start training.",
    rungs: [
      {
        action: "Put your training clothes on.",
        counts: "You're dressed for it.",
        release: "You don't have to leave the house. Get changed again if you want.",
      },
      {
        action: "Shoes on, out the door, five minutes in any direction.",
        counts: "Five minutes away from your front door.",
        release: "Turn round at five. Going further doesn't earn extra credit.",
      },
      {
        action: "Ten minutes of something that gets you out of breath.",
        counts: "Ten minutes, breathing hard.",
        release: "Stop at ten even if you feel like you could keep going.",
      },
      {
        action: "One short session. Something with a beginning and an end.",
        counts: "You finished the thing you set out to do.",
        release: "Leave feeling like you had more in you. That's the correct amount.",
      },
      {
        action: "The session you actually planned.",
        counts: "You did it as written, not as negotiated down.",
        release: "When it's done, it's done. No bonus sets to make up for last week.",
      },
    ],
  },
  {
    id: "sleep",
    label: "Fix my sleep and my mornings",
    group: "Body",
    aim: "Waking up at a time you chose, on purpose, most days.",
    rungs: [
      {
        action: "Set an alarm for the time you'd like to be up.",
        counts: "The alarm is set.",
        release: "You don't have to obey it tomorrow. Setting it is the rep.",
      },
      {
        action: "Get out of bed within ten minutes of it going off.",
        counts: "Both feet on the floor inside ten minutes.",
        release: "You can go back to bed afterwards. Getting up once counts.",
      },
      {
        action: "Charge your phone outside the bedroom tonight.",
        counts: "It spent the night in another room.",
        release: "One night. This isn't a lifestyle yet.",
      },
      {
        action: "Be in bed with the lights off by the time you named.",
        counts: "Dark by your target time.",
        release: "You don't have to be asleep. Lying there counts.",
      },
      {
        action: "Get up within half an hour of yesterday's time.",
        counts: "Two consecutive days within thirty minutes of each other.",
        release: "One late morning is not a reset. Weekends included, but gently.",
      },
    ],
  },
  {
    id: "quit",
    label: "Cut something out",
    group: "Habits",
    aim: "Getting the thing down to a size you choose, rather than one it chooses.",
    rungs: [
      {
        action: "Write down when you did it today. Change nothing else.",
        counts: "The times are written down, unedited.",
        release: "You're not quitting yet. You're just looking at it.",
      },
      {
        action: "Notice one urge and wait ten minutes before acting on it.",
        counts: "You clocked the urge and ten minutes passed.",
        release: "Then do it if you still want to. The waiting was the rep.",
      },
      {
        action: "Put one thing in the way today.",
        counts: "Something is harder to reach than it was this morning.",
        release: "You can undo it tomorrow. Today it stands.",
      },
      {
        action: "Swap it once for the thing you'd rather have done.",
        counts: "The urge came and you did the other thing instead.",
        release: "Once. Not forever, and not today onwards.",
      },
      {
        action: "One clean day.",
        counts: "Midnight to midnight, none.",
        release: "Tomorrow is a completely separate question.",
      },
    ],
  },
  {
    id: "work",
    label: "Do the work I keep avoiding",
    group: "Work",
    aim: "Being able to start the difficult thing without a run-up.",
    rungs: [
      {
        action: "Sit down at it with everything else closed. Two minutes.",
        counts: "Two minutes, nothing else open.",
        release: "Then get up. Two minutes was the entire ask.",
      },
      {
        action: "Ten minutes on the actual thing.",
        counts: "Ten minutes, timer running.",
        release: "Stop at ten even if it's finally going well.",
      },
      {
        action: "Twenty-five minutes with your phone in another room.",
        counts: "One clean block, phone elsewhere.",
        release: "One block. Then you're done for the day.",
      },
      {
        action: "Two blocks, with a proper break between them.",
        counts: "Two clean blocks in one day.",
        release: "Stop after the second. A third doesn't buy you tomorrow off.",
      },
      {
        action: "Give the first block to the part you've been avoiding.",
        counts: "The hard bit got the first block, not the last one.",
        release: "Only the first block has to be the hard bit.",
      },
    ],
  },
  {
    id: "money",
    label: "Stop avoiding my finances",
    group: "Work",
    aim: "Being able to look at your own numbers without your stomach turning over.",
    rungs: [
      {
        action: "Open the banking app and look at the number.",
        counts: "You saw it and didn't close the app straight away.",
        release: "Do nothing about it. Looking is the whole rep.",
      },
      {
        action: "Write down what actually went out this week.",
        counts: "A list exists, in writing.",
        release: "No judging it and no fixing it. Just the list.",
      },
      {
        action: "Cancel one thing you don't use.",
        counts: "One subscription is gone.",
        release: "One. This isn't an audit.",
      },
      {
        action: "Move something aside, however small.",
        counts: "Money is in a different place than it was.",
        release: "A pound counts. The amount isn't the point yet.",
      },
      {
        action: "Sit with the whole picture for twenty minutes.",
        counts: "Twenty minutes, everything open.",
        release: "Stop at twenty even if it's unfinished. Especially if it's unfinished.",
      },
    ],
  },
  {
    id: "skill",
    label: "Finally learn the thing I keep meaning to learn",
    group: "Work",
    aim: "Being someone who does it, rather than someone who owns the equipment.",
    rungs: [
      {
        action: "Get it out and leave it somewhere you'll trip over it.",
        counts: "It's out of the cupboard and in your way.",
        release: "You don't have to use it today.",
      },
      {
        action: "Two minutes. Badly.",
        counts: "Two minutes of doing it, however bad.",
        release: "Stop at two. Being bad at it is the expected state.",
      },
      {
        action: "Ten minutes.",
        counts: "Ten minutes, timer on.",
        release: "Stop when the timer goes, mid-sentence if necessary.",
      },
      {
        action: "Ten minutes on the specific bit you're worst at.",
        counts: "Ten minutes on the uncomfortable part, not the part you enjoy.",
        release: "Ten is plenty. This one is meant to be unpleasant.",
      },
      {
        action: "A proper session, on something you'd show someone.",
        counts: "You worked on a real piece of it.",
        release: "Finish where you planned to finish, not where it starts going well.",
      },
    ],
  },
] as const

export const LADDER_BY_ID: Record<string, Ladder> = Object.fromEntries(
  REP_LADDERS.map((l) => [l.id, l]),
)

export const LADDER_GROUPS = ["People", "Body", "Habits", "Work"] as const

/**
 * A custom ladder still gets the release clause, because that is the mechanism
 * rather than the wording. The user writes what to do and what counts; the
 * permission to stop is supplied so it cannot be quietly dropped.
 */
export const CUSTOM_RELEASE = "Then you're done for the day, whatever came of it."

export const CUSTOM_RUNG_HINTS: readonly string[] = [
  "The version so small it would be embarrassing to skip",
  "Slightly harder. Still not the real thing",
  "Now it costs you something",
  "Close to what you actually want to be doing",
  "The thing itself",
] as const

export const CUSTOM_MIN_RUNGS = 2
export const CUSTOM_MAX_RUNGS = 6

export interface TimelineNote {
  fromDay: number
  note: string
}

export const REP_TIMELINE: readonly TimelineNote[] = [
  { fromDay: 0, note: "First week. It's supposed to feel like nothing yet, so don't read anything into how it feels." },
  { fromDay: 7, note: "Week two or three. This is where most people stop, and it's the least useful moment to judge it." },
  { fromDay: 21, note: "A month in. It should be starting to feel less like a decision every single time." },
  { fromDay: 56, note: "Two months. Other people tend to notice before you do, so don't wait to feel different." },
  { fromDay: 180, note: "Six months. Now it's fair to ask whether this is working, and you'll have enough to answer with." },
] as const

/** How many clean reps at a rung before the next one is offered. */
export const REPS_TO_ADVANCE = 3
