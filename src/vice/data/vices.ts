/**
 * What you might be quitting, and the two facts about it the flows need.
 *
 * `medicalRisk` is the only field here that can hurt somebody. Alcohol and
 * benzodiazepines are the two where stopping abruptly on your own can kill you
 * — seizures, delirium tremens — and everything else on this list is merely
 * horrible. So the flag lives on the vice rather than on a question the person
 * has to know to answer, and the safety step reads it rather than guessing.
 *
 * `shape` decides tone as much as content. A screen habit has no withdrawal and
 * enormous cue exposure, so its work is environmental. A behaviour with shame
 * on it needs the opposite of a lecture. See LANGUAGE_RULES in copy.ts for the
 * one about never calling any of the "behaviour" ones an addiction.
 */

import type { ViceOption } from "../types"

export const VICES: ViceOption[] = [
  {
    id: "alcohol",
    label: "Drinking",
    unit: "a drink",
    shape: "substance",
    medicalRisk: true,
    triggerSeeds: ["Finishing work", "Friday", "A bad day", "Being offered one", "Cooking dinner", "Anyone else drinking"],
  },
  {
    id: "nicotine",
    label: "Smoking or vaping",
    unit: "a cigarette",
    shape: "substance",
    medicalRisk: false,
    triggerSeeds: ["Coffee", "Finishing a meal", "Getting in the car", "A break at work", "Drinking", "Stress"],
  },
  {
    id: "weed",
    label: "Weed",
    unit: "a session",
    shape: "substance",
    medicalRisk: false,
    triggerSeeds: ["Getting home", "Boredom", "Before bed", "Watching something", "Friends", "Not wanting to think"],
  },
  {
    id: "scrolling",
    label: "Scrolling",
    unit: "a scroll",
    shape: "screen",
    medicalRisk: false,
    triggerSeeds: ["Waking up", "A queue", "The toilet", "A dull moment at work", "Bed", "A notification"],
  },
  {
    id: "gaming",
    label: "Gaming",
    unit: "a session",
    shape: "screen",
    medicalRisk: false,
    triggerSeeds: ["Getting home", "An evening with nothing in it", "Friends online", "Avoiding something", "One more round"],
  },
  {
    id: "porn",
    label: "Porn",
    unit: "a session",
    shape: "behaviour",
    medicalRisk: false,
    triggerSeeds: ["Alone in the house", "Late at night", "In bed with a phone", "Bored", "Stressed", "Turned down"],
  },
  {
    id: "gambling",
    label: "Betting",
    unit: "a bet",
    shape: "behaviour",
    medicalRisk: false,
    triggerSeeds: ["A match on", "Payday", "Chasing a loss", "An advert", "Friends betting", "Boredom"],
  },
  {
    id: "junk",
    label: "Junk food or bingeing",
    unit: "an episode",
    shape: "behaviour",
    medicalRisk: false,
    triggerSeeds: ["Alone in the kitchen", "Late evening", "Upset", "Skipping a meal earlier", "Something in the cupboard"],
  },
  {
    id: "spending",
    label: "Impulse spending",
    unit: "a purchase",
    shape: "behaviour",
    medicalRisk: false,
    triggerSeeds: ["A bad day", "An advert", "Payday", "Saved card details", "Boredom", "A sale"],
  },
  {
    id: "custom",
    label: "Something else",
    unit: "a time",
    shape: "behaviour",
    medicalRisk: false,
    triggerSeeds: [],
  },
]

export const VICE_MAP = new Map(VICES.map((v) => [v.id, v]))

/**
 * Generic triggers, offered after the vice's own.
 *
 * Split the way the source material splits them, because the two halves need
 * different work: an external trigger can be avoided or left, and an internal
 * one cannot, so it has to be ridden or answered instead.
 */
export const EXTERNAL_TRIGGERS = [
  "A particular person",
  "A particular place",
  "A time of day",
  "Being offered it",
  "Payday",
  "A screen in my hand",
  "Being alone in the house",
  "The walk home",
  "A celebration",
  "Everyone else doing it",
]

/**
 * The inside ones.
 *
 * The last three are on this list because first-person accounts keep naming
 * them and no app offers them. People expect the bad states and plan for them;
 * what actually catches them is a good day — feeling strong, feeling past it,
 * hitting a milestone — and then deciding that is evidence they can handle it.
 * Leaving those off the list is how an inventory misses the real one.
 */
export const INTERNAL_TRIGGERS = [
  "Bored",
  "Stressed",
  "Lonely",
  "Tired",
  "Angry",
  "Anxious",
  "Sad",
  "Restless",
  "Rejected",
  "Ashamed",
  "Numb",
  "Deserving it",
  "Excited, or celebrating",
  "A good day, and feeling past it",
  "Just hit a milestone",
]

/** Where an urge is felt. Used by the body map on the urge tool. */
export const BODY_PLACES = [
  "Chest",
  "Stomach",
  "Throat",
  "Mouth",
  "Hands",
  "Jaw",
  "Head",
  "Shoulders",
  "Legs",
  "All over",
]

/** How it feels there. Straight from the body-scan step of the urge script. */
export const BODY_TEXTURES = [
  "Hot",
  "Cold",
  "Tingly",
  "Numb",
  "Tense",
  "Heavy",
  "Empty",
  "Fluttery",
  "Tight",
  "Buzzing",
]
