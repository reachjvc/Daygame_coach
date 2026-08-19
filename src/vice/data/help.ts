/**
 * The door out of the module.
 *
 * This screen exists because the awareness flow would be irresponsible without
 * it. Handing somebody an accurate picture of a serious problem and then
 * offering them a body-map picker is worse than not having shown them the
 * picture, and the rest of this module has no route out of itself.
 *
 * What it is built against, specifically:
 *
 *  - **"I am not bad enough."** The single largest barrier in the literature,
 *    and the reason ~95% of people who met criteria and got no help gave for
 *    getting none. So it is answered first, before anything else on the screen.
 *  - **"Treatment means rehab."** It mostly does not. Most of what exists is
 *    outpatient and looks like an appointment. The mental picture people carry
 *    is of the smallest and most intensive slice of it, and that picture is
 *    itself a barrier.
 *  - **"They will make me stop completely."** Frequently the actual reason for
 *    not going, and frequently wrong: reduction goals are mainstream clinical
 *    practice now, not a loophole. Several people never make the call because
 *    nobody told them this.
 *  - **"There is nothing they could give me."** There is, for several of these,
 *    and the numbers are better than people expect. Most have never heard of
 *    the medications.
 *
 * Maintenance: SERVICES contains real phone numbers, and a wrong crisis number
 * is an active harm rather than a stale doc. `VERIFIED` is the date each was
 * last checked against the provider's own page. The US gambling helpline
 * changed in September 2025, which is exactly the failure mode this guards.
 */

import type { HelpLocale } from "../types"

/** When the numbers below were last checked against the providers' own pages. */
export const VERIFIED = "2026-08-17"

// ---------------------------------------------------------------- services

export interface HelpService {
  name: string
  /** Phone, text instruction, or a URL. Rendered verbatim. */
  contact: string
  /** What it is for and when it answers. */
  note: string
  url?: string
  /** Crisis services render first, always, in a distinct block. */
  crisis?: boolean
  /** Only shown when the person's vice matches. */
  forVice?: string[]
}

export const SERVICES: Record<HelpLocale, { label: string; emergency: string; items: HelpService[] }> = {
  uk: {
    label: "United Kingdom",
    emergency: "999",
    items: [
      {
        name: "Samaritans",
        contact: "116 123",
        note: "Any time of day or night, free, and you are not obliged to be in a crisis to ring them.",
        url: "https://www.samaritans.org",
        crisis: true,
      },
      {
        name: "NHS 111",
        contact: "111",
        note: "Urgent but not an emergency. They can tell you what to do tonight and where to go tomorrow.",
        url: "https://111.nhs.uk",
        crisis: true,
      },
      {
        name: "Your GP",
        contact: "The surgery you are registered with",
        note: "The actual front door to everything else — a referral, a managed reduction, or a prescription. One appointment, and it is not on any public record.",
      },
      {
        name: "Drinkline",
        contact: "0300 123 1110",
        note: "The national alcohol line. Free, and you can ring about somebody else's drinking too.",
        forVice: ["alcohol"],
      },
      {
        name: "FRANK",
        contact: "0300 123 6600",
        note: "Drugs, honestly answered, around the clock. Also text and webchat.",
        url: "https://www.talktofrank.com",
        forVice: ["weed", "other"],
      },
      {
        name: "National Gambling Helpline",
        contact: "0808 8020 133",
        note: "GamCare, free, any hour. They also do the blocking software and the self-exclusion paperwork.",
        url: "https://www.gamcare.org.uk",
        forVice: ["gambling"],
      },
      {
        name: "NHS local services finder",
        contact: "nhs.uk/service-search",
        note: "Free drug and alcohol services near you. Self-referral, so a GP letter is not a prerequisite.",
        url: "https://www.nhs.uk/service-search/other-services/Alcohol%20addiction/LocationSearch/1805",
      },
    ],
  },
  us: {
    label: "United States",
    emergency: "911",
    items: [
      {
        name: "988 Suicide & Crisis Lifeline",
        contact: "Call or text 988",
        note: "Any hour, free, and it covers substance crises and plain distress, not only suicide.",
        url: "https://988lifeline.org",
        crisis: true,
      },
      {
        name: "SAMHSA National Helpline",
        contact: "1-800-662-4357",
        note: "Free, confidential, around the clock, English and Spanish. They refer you to actual local treatment, and they do it whether or not you have insurance.",
        url: "https://www.samhsa.gov/find-help/helplines/national-helpline",
        crisis: true,
      },
      {
        name: "FindTreatment.gov",
        contact: "findtreatment.gov",
        note: "The government's own searchable list. Filters by what you can pay and what kind of care you want.",
        url: "https://findtreatment.gov",
      },
      {
        name: "Your regular doctor",
        contact: "Whoever you saw last",
        note: "Primary care can prescribe for drinking, opioids and nicotine. No specialist referral is a prerequisite for that conversation.",
      },
      {
        name: "National Problem Gambling Helpline",
        contact: "1-800-697-3738",
        note: "Also 1-800-522-4700, which still answers. Free and confidential, any hour. The old 1-800-GAMBLER number stopped being theirs in 2025.",
        url: "https://www.ncpgambling.org/help-treatment/",
        forVice: ["gambling"],
      },
    ],
  },
  other: {
    label: "Somewhere else",
    emergency: "Your local emergency number",
    items: [
      {
        name: "Find A Helpline",
        contact: "findahelpline.com",
        note: "Free, vetted lines in over a hundred countries. Pick the country and it gives you what actually answers there.",
        url: "https://findahelpline.com",
        crisis: true,
      },
      {
        name: "A doctor",
        contact: "Whatever primary care looks like where you are",
        note: "The entry point is the same almost everywhere, and so is the confidentiality.",
      },
    ],
  },
}

// ---------------------------------------------------------------- the copy

export const HELP = {
  title: "Past what a page can do",
  /** Sits at the very top, above everything, always. */
  crisisHeading: "If it is bad right now",
  crisisBlurb:
    "If you are thinking about hurting yourself, or somebody is in danger, this is the part of the screen that matters and the rest can wait.",

  /**
   * Answered first, because it is the reason most people who could benefit
   * never look at a screen like this one.
   */
  badEnough: {
    title: "There is no bar to clear first",
    lines: [
      "Around ninety-five percent of the people who met the clinical criteria and got no help said the reason was that they did not think they needed any. Which means the feeling of not being bad enough is close to useless as a signal — it is reported by almost everybody, including the people who were.",
      "Services are not rationed by how far gone you are, and nobody is going to tell you off for turning up early. Turning up early is the version that goes well.",
    ],
  },

  notRehab: {
    title: "It is probably not the thing you are picturing",
    lines: [
      "Most of what exists is outpatient. An appointment, an hour, and you go home afterwards and nobody at work is any the wiser. Residential rehab is a small and expensive slice at one end, and it is not the first step and not the default.",
      "In most places you can refer yourself to a community drug and alcohol service without going through a doctor at all.",
    ],
  },

  notAbstinence: {
    title: "Stopping completely is not the entry requirement",
    lines: [
      "This one keeps more people away than cost does, and it is out of date. Cutting down is a legitimate, mainstream clinical goal now — the guidance says so explicitly, on the grounds that a reduction someone will actually attempt beats an abstinence they will not.",
      "You are allowed to walk in and say you want to drink less rather than not at all. That is a normal conversation, and it will not be argued with.",
    ],
  },

  medication: {
    title: "There is medication, and hardly anybody knows",
    lines: [
      "For drinking there are two in common use, acamprosate and naltrexone. In the big pooled analysis, for every twelve people who take acamprosate one extra person avoids going back to drinking, and for naltrexone it is one in twelve who avoids going back to heavy drinking. Those are respectable numbers by the standards of medicine generally, and better than anything this module can offer.",
      "There are established options for opioids and for nicotine as well. All of it is a normal appointment with a normal doctor, and none of it obliges you to enter a programme.",
    ],
  },

  /** Each barrier, with the thing that is actually true about it. */
  barriers: [
    {
      id: "shame",
      barrier: "I would be embarrassed.",
      answer:
        "They have heard it. Whatever the specifics are, they have heard a version of it this week, and the reaction you are bracing for is not the reaction you get.",
    },
    {
      id: "record",
      barrier: "It will go on my record.",
      answer:
        "It goes in your medical notes, which are confidential and are not visible to your employer, your insurer by default, or anybody else who asks. Worth asking directly at the appointment if it worries you — that is a reasonable question and they get it often.",
    },
    {
      id: "cost",
      barrier: "I cannot afford it.",
      answer:
        "Community services are free in a lot of places, including the whole of the UK, and the US national line refers people regardless of whether they can pay. Cost is worth checking before it is treated as settled.",
    },
    {
      id: "failed",
      barrier: "I tried before and it did not work.",
      answer:
        "Most people who resolve one of these have more than one attempt behind them, and the attempts are not wasted — the ones that ended still moved something. A previous try that failed is evidence about a method, not a verdict on you.",
    },
    {
      id: "time",
      barrier: "I have not got time for it.",
      answer:
        "The first step is one phone call. Whatever the arithmetic on the previous screen said this costs you in hours a year, the call is shorter.",
    },
  ],

  /**
   * The last block, and the only one that asks for anything.
   *
   * An intention without a time attached is not a plan, and this module already
   * knows that and has the machinery for it. Reusing the if-then builder here
   * rather than printing "consider reaching out" is the entire difference
   * between a resources page and a step.
   */
  plan: {
    title: "One call, with a time on it",
    blurb:
      "Same shape as everything else in here. An intention without a when attached does not survive contact with a Tuesday.",
    whenPlaceholder: "it gets to nine on Monday and I have had my coffee",
    thenPlaceholder: "ring the surgery and ask for a phone appointment about drinking",
    done: "That is in your plans now, with the rest of them.",
  },

  /** Said plainly, because the alternative is a page overselling itself. */
  ceiling:
    "What this module is: a set of exercises with reasonable evidence behind them, arranged so a person can get through them on a bad night. What it is not: treatment, a diagnosis, or a substitute for somebody who trained for this. Apps in this category have a modest record on their own, and the honest thing is to say so on the screen where it matters rather than in a footnote.",

  localeQuestion: "Where are you?",
  localeNote: "Only decides which services get listed. It is not stored anywhere but this browser.",
  verifiedNote: "Numbers last checked {date}. If one has changed, the emergency number for where you are always works.",
} as const
