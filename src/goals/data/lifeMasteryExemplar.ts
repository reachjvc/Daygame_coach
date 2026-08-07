/**
 * THE WORKED EXEMPLAR — the framework's author's own life plan, all 12 areas.
 *
 * Why this exists: "it's easier to write yours after reading one." The guided
 * build shows his answer beside every input box, and the old example covered 4
 * of 12 areas with 2 goals. This is the real document.
 *
 * PROVENANCE RULES — read before editing:
 *  1. Every `quote` here is verbatim from `lifeMasteryCorpus.ts`, which is
 *     itself 5-gram-verified against the named transcript. Do not paraphrase
 *     into a quote field; put paraphrase in `gloss`.
 *  2. `era` is REQUIRED on anything carrying numbers. His numbers drift across
 *     years (190 lbs @ 8% in V1, 170 @ 6% later; $2M/yr then $10M/yr) and
 *     silently mixing them would invent a plan he never had.
 *  3. `reconstructed: true` marks an area where he never read a written vision
 *     paragraph. The UI must label these — one of the 12 is honestly missing.
 *  4. The misses stay. His own hit rate is 80-90%, and an exemplar where
 *     everything landed teaches the opposite of what he teaches.
 *
 * Three source documents, three points in his life:
 *  - V1 `8kco2rjijjE` — the richest: vision + purpose + identity + conduct,
 *    per-area paragraphs, per-area purposes, and his "juicy" area renames.
 *  - V2 `OgRGJBpTOeU` — read off the inside of his closet doors.
 *  - V3 `PPlaK8y4PzA` — fullest and latest, unframed from the wall, present tense.
 *  - `9RxHchflvVs` — "The Perfect Day", his most vivid narrative.
 *  - `I-SoCQvNi9A` — his honest current scores: the "from" half of the picture.
 */

/** Which document/period a fragment belongs to. Never mix numbers across eras. */
export type ExemplarEra = "v1" | "v2" | "v3" | "current"

export const EXEMPLAR_ERA_LABEL: Record<ExemplarEra, string> = {
  v1: "earlier version of this plan",
  v2: "mid-period version",
  v3: "latest version",
  current: "current self-assessment",
}

export interface ExemplarQuote {
  quote: string
  videoId: string
  era: ExemplarEra
}

export interface ExemplarArea {
  areaId: string
  /** His own "juicy" rename — language engineering is his signature rule. */
  renamedTo: string | null
  /** His written vision for the area, as read aloud. */
  vision: ExemplarQuote[]
  /** Why the area matters to him (his per-area purpose). */
  purpose: ExemplarQuote | null
  /** His identity/role labels for the area. */
  identity: ExemplarQuote | null
  /** His honest 0-10 self-score, where he gave one. */
  score: { rating: number; quote: string; videoId: string } | null
  /** True when he never read a written vision paragraph for this area — the
   * text here is assembled from how he SPEAKS about it. Must be labelled. */
  reconstructed: boolean
  /** Plain-language note for the card; ours, not his. */
  gloss?: string
}

export const EXEMPLAR_AREAS: ExemplarArea[] = [
  {
    areaId: "lm_health",
    renamedTo: "Physical Power — World Class Health and Fitness",
    vision: [{
      quote: "health is a very important component of that important component of my vision of my amazing life I want to make sure that I have the energy the Vitality I want to make sure that I can live for a long time I want to live to over a 100 years old you know that's my goal and make sure that I have tons of energy and I look young I look fit I look incredible at that age",
      videoId: "Kz83kMosOWU", era: "v1",
    }],
    purpose: { quote: "to live to be 100 to stay young healthy and vibrant", videoId: "8kco2rjijjE", era: "v1" },
    identity: null,
    score: null,
    reconstructed: true,
    gloss: "Health is split from fitness here, and ranked above it, because \"without your health you cease to exist\". The area is described richly in the source, and no written paragraph for it exists.",
  },
  {
    areaId: "lm_fitness",
    renamedTo: "Physical Power — World Class Health and Fitness",
    vision: [
      {
        quote: "my physical body to be my ultimate vision is to be 190 lbs to 8% body fat to be vital healthy strong athletic taned ripped and energetic to look in the mirror and smile and feel proud feel outstanding sexy have high self-esteem feel confident um to be an inspiration to others",
        videoId: "8kco2rjijjE", era: "v1",
      },
      {
        quote: "i'm physically active and fit weighing 170 pounds at six percent body fat with unstoppable energy",
        videoId: "PPlaK8y4PzA", era: "v3",
      },
    ],
    purpose: {
      quote: "my health and fitness purpose is to be outstanding to be an inspiration to others to be sexy a total 10 um to be attracted more confident non-stop energy to live to be 100 to stay young healthy and vibrant to look in the mirror and feel proud",
      videoId: "8kco2rjijjE", era: "v1",
    },
    identity: {
      quote: "for my fitness I have I'm an Adonis I'm a Greek god I'm Greek by the way uh world class athlete fitness model shredded Stefan lean mean F burning machine a manifestation of vibrant health and energy I'm an energy Dynamo a peak performer an Exemplar of physical vitality and strength",
      videoId: "8kco2rjijjE", era: "v1",
    },
    score: null,
    reconstructed: false,
    gloss: "The most numerically specific area in the example, and the clearest case for era labels. 190 lbs at 8% in the earlier plan, 170 at 6% in the later one.",
  },
  {
    areaId: "lm_mindset",
    renamedTo: null,
    vision: [{
      quote: "your mindset your mentality your thoughts your belief system that's important as well that's a separate area of life and this influen your your emotions",
      videoId: "Kz83kMosOWU", era: "v1",
    }],
    purpose: null,
    identity: null,
    score: { rating: 8, quote: "Mind and emotions ... for me, the 10 that I desire and I'm after is high levels of happiness, and joy, and freedom, and peace, and gratitude. If I were to be honest where I am right now, I'd say about an eight out of 10.", videoId: "I-SoCQvNi9A" },
    reconstructed: true,
    gloss: "THE HONEST GAP: no written vision paragraph for this area exists anywhere in the source. Mind and beliefs was added after the only version that carried per-area paragraphs, so this is assembled from surrounding description. Shown as a reconstruction rather than a quote.",
  },
  {
    areaId: "lm_emotions",
    renamedTo: "Emotional Power — Unlimited Juice and Vitality",
    vision: [
      {
        quote: "my ultimate Vision emotionally to every day feel happy grateful proud loving loved excited passionate present committed ecstasy uh confident outgoing social strong determined motivated inspired adequate attractive certain significant balance centered energized fulfilled silly playful outrageous fun worthy at a level of 9 or 10 to wake up each day excited jumping out of bed and enjoying the process of the day",
        videoId: "8kco2rjijjE", era: "v1",
      },
      {
        quote: "i'm a master of my emotions consistently experiencing peak levels of emotional juice and vitality happiness joy laughter fun passion gratitude peace certainty adventure aliveness and fulfillment",
        videoId: "PPlaK8y4PzA", era: "v3",
      },
    ],
    purpose: { quote: "my emotions to have a deeper sense of meaning in my life to experience life to the fullest I really enjoy the journey and process of life", videoId: "8kco2rjijjE", era: "v1" },
    identity: { quote: "I've got unstoppable emotions Unstoppable confidence a beacon of Joy full of fulfillment uh vibrant happiness and ecstasy", videoId: "8kco2rjijjE", era: "v1" },
    score: null,
    reconstructed: false,
  },
  {
    areaId: "lm_relationship",
    renamedTo: "Incredible Relationships — Passion and Love",
    vision: [
      {
        quote: "credible relationships to be an amazing passionate loving honest exciting fulfilling fun committed extraordinary relationship uh with the woman of my dreams my total 10 my soulmate a beautiful incredible woman to attract and be the woman that I'll spend my life with start a family with and stay committed to forever",
        videoId: "8kco2rjijjE", era: "v1",
      },
      {
        quote: "i have an incredibly loving beautiful wife that i have a passionate love affair with that is growing every day",
        videoId: "PPlaK8y4PzA", era: "v3",
      },
    ],
    purpose: { quote: "my relationships what's the reason that I have for having an amazing relationship be able to share my life with someone to have more fun and excitement to be able be in love uh intimacy connection someone to travel with", videoId: "8kco2rjijjE", era: "v1" },
    identity: null,
    score: { rating: 8.5, quote: "Spirituality, I've got as a seven.", videoId: "I-SoCQvNi9A" },
    reconstructed: false,
    gloss: "Note the arc. The earlier plan is written by someone single, describing who they want to attract. The later one names her. Both are here on purpose, because that arc is the useful part.",
  },
  {
    areaId: "lm_mission",
    renamedTo: "A Leader and Contributor of Lifestyle Transformations",
    vision: [{
      quote: "I want my ultimate vision is I want to have products and services in every area of life I want to have more products and services on how to become more free in your life how to build online businesses and make passive income on how to be healthier",
      videoId: "jTVs9IbF8L0", era: "v3",
    }],
    purpose: {
      quote: "just magic moments fulfillment to live life on my terms and to never settle for less than I can be do uh create or give to be happy for fun for growth progress connection love significance",
      videoId: "8kco2rjijjE", era: "v1",
    },
    identity: {
      quote: "for my coaching business ... I'm world class coach I'm a facilitator of change I'm a Force for good a force for God I'm an agent of transformation I'm a leader called upon by leaders a Mr solution instant uh change artist a developer of the human Spirit I'm an architect of change",
      videoId: "8kco2rjijjE", era: "v1",
    },
    score: null,
    reconstructed: false,
    gloss: "The identity rule in action: \"architect of change\", not \"coach\". The line has to excite you more than the job title does.",
  },
  {
    areaId: "lm_money",
    renamedTo: "Absolute Financial Freedom",
    vision: [
      {
        quote: "to have live in total abundance Financial Freedom I have this is my vision again uh to be making $2 million a year and I'm very specific about this as well which is really key but $2 million a year $163,000 a month $5,400 a day uh income with 90% of it being earned through passive income which is internet marketing businesses real estate and Investments to have a net worth of $10 million",
        videoId: "8kco2rjijjE", era: "v1",
      },
      { quote: "I want to build a business and be earning $10 million", videoId: "I-SoCQvNi9A", era: "current" },
    ],
    purpose: { quote: "financially live the life of my dreams be fun never settle live life fully do what I want when I want", videoId: "8kco2rjijjE", era: "v1" },
    identity: { quote: "extraordinary investor financial genius smart saver wealth Creator strategist uh marketer a creator of the good life creator of Fortune a millionaire", videoId: "8kco2rjijjE", era: "v1" },
    score: { rating: 8, quote: "I want to build a business and be earning $10 million", videoId: "I-SoCQvNi9A" },
    reconstructed: false,
    gloss: "The pain-why underneath it: a family bankruptcy, and losing the house a father built by hand. \"I made a decision that i'm never going to go through that again.\"",
  },
  {
    areaId: "lm_family",
    renamedTo: "Extraordinary Family Life",
    vision: [
      {
        quote: "my family life you know to be totally connected with and in regular communication each member of my family several times a week having fun supporting each other sharing magic moments in our lives to go on a family vacation every year",
        videoId: "8kco2rjijjE", era: "v1",
      },
      {
        quote: "i have an extraordinary family life with two children that i have give unconditional love to and help shape them to incredible human beings",
        videoId: "PPlaK8y4PzA", era: "v3",
      },
    ],
    purpose: null,
    identity: null,
    score: { rating: 6, quote: "My family, I put at a six out of 10 ... I travel a lot and sometimes I miss some family holidays ... I don't always make it to my nieces' and my nephews' birthday", videoId: "I-SoCQvNi9A" },
    reconstructed: false,
    gloss: "The lowest score in the example, with the reason given and not excused. This is what an honest wheel looks like from someone who teaches this for a living.",
  },
  {
    areaId: "lm_friends",
    renamedTo: "Extraordinary Friendships",
    vision: [
      {
        quote: "extraordinary friendships you know the people that I want to surround myself people that support me inspire me that make me feel good you know we challenge each other people that I travel with have fun with",
        videoId: "8kco2rjijjE", era: "v1",
      },
      {
        quote: "i have extraordinary friendships with friends that i'm constantly growing with that are supportive fun successful leaders and givers that i'm sharing my experience of life with",
        videoId: "PPlaK8y4PzA", era: "v3",
      },
    ],
    purpose: null,
    identity: null,
    score: null,
    reconstructed: false,
  },
  {
    areaId: "lm_fun",
    renamedTo: null,
    vision: [{
      quote: "my lifestyle consists of total freedom to travel which includes a fun adventurous vacation every three months while enjoying a full three months immersed in a new part of the world every year",
      videoId: "PPlaK8y4PzA", era: "v3",
    }],
    purpose: {
      quote: "I realized man I'm crushing it in all different areas of my life my business my health my relationship my friends and family is great but that doesn't guarantee that you're having fun",
      videoId: "Kz83kMosOWU", era: "v1",
    },
    identity: null,
    score: null,
    reconstructed: false,
    gloss: "The area ADDED after noticing that winning at everything and enjoying none of it is still losing. The method for filling it: what did you do as a kid purely for fun? (The answers here: video games and pro wrestling.)",
  },
  {
    areaId: "lm_contribution",
    renamedTo: null,
    vision: [{
      quote: "i'm a philanthropist and a force for good that's dedicated to helping those in need with areas that i'm committed to serving in especially having funded and built over a hundred houses for those that are suffering from poverty and 30 schools for children in need of proper education",
      videoId: "PPlaK8y4PzA", era: "v3",
    }],
    purpose: {
      quote: "what would happen if I added contribution to an area of my life where I'm giving not to get I'm giving out of just pure being selfless making an impact making a difference empowering people in the world that I they don't even know who I am they can't give me anything back but it's just pure service to others",
      videoId: "Kz83kMosOWU", era: "v1",
    },
    identity: null,
    score: null,
    reconstructed: false,
    gloss: "Numbers are attached to it. 5 to 10% of income to giving, 10% tithing even while broke, and turning up in person to build the schools.",
  },
  {
    areaId: "lm_spirituality",
    renamedTo: "Spirit and Soul — Force for God",
    vision: [
      {
        quote: "my spiritual you know vision is uh be spiritually connected to God the universe nature myself and all beings around me while feeling centered and at peace growing and evolving my spirit and humbly serving my Creator by living my purpose each and every day",
        videoId: "8kco2rjijjE", era: "v1",
      },
      { quote: "i am a force for god i have a deep everlasting spiritual connection with god and my creator i am living my destiny", videoId: "PPlaK8y4PzA", era: "v3" },
    ],
    purpose: null,
    identity: null,
    score: { rating: 7, quote: "Spirituality, I've got as a seven. For me, my spirituality is my connection with God ... I've got an amazing relationship with God. I communicate everyday but I want to go deeper.", videoId: "I-SoCQvNi9A" },
    reconstructed: false,
    gloss: "This area stays deliberately un-prescriptive, in the words of the source \"I'm not here to convert you\". It sits off the pyramid entirely, because \"our spirit embodies all of this\".",
  },
]

/** The whole-life documents he keeps SEPARATE from the area plans and re-reads
 * in the same block: vision, purpose, identity, code of conduct. */
export const EXEMPLAR_WHOLE_LIFE = {
  purpose: {
    quote: "my purpose ... is uh to humbly serve God by being a powerful and passionate example of the unlimited possibilities that life offers to any of us the moment we acknowledge and rejoice in our Creator's gifts to sincerely love and serve in all his Creations to live life to the fullest",
    videoId: "8kco2rjijjE", era: "v1" as ExemplarEra,
  },
  mission: {
    quote: "I Stefan see, know, hear and feel that the purpose of my life is to be even more fully alive, grow and make a difference in the lives of others",
    videoId: "fICEjqpKfoY", era: "v3" as ExemplarEra,
  },
  primaryQuestion: {
    quote: "How can I appreciate and enjoy my life even more, while feeling even more fully alive and growing and making a difference in the lives of others?",
    videoId: "PPlaK8y4PzA", era: "v3" as ExemplarEra,
  },
  identityRule: {
    quote: "the strongest force in the human personality is the need to be consistent with how we Define ourselves",
    videoId: "8kco2rjijjE", era: "v1" as ExemplarEra,
  },
}

/**
 * His real goals with their REAL outcomes. The misses are the point: he claims
 * 80-90% year after year, so a plan where everything landed is the wrong lesson.
 */
export interface ExemplarGoal {
  areaId: string
  /** His own sentence, in his format: "I will easily [X] by [date]". */
  sentence: string
  outcome: string
  verdict: "hit" | "missed" | "beaten" | "chosen-not-to"
  videoId: string
  year: string
}

export const EXEMPLAR_GOALS: ExemplarGoal[] = [
  {
    areaId: "lm_money", year: "2016",
    sentence: "I'll easily make two million dollars in revenue by December 31st 2016",
    outcome: "Missed by about $40,000 — $1,960,236. He reports it as a miss even while noting the bookkeeping might close the gap.",
    verdict: "missed", videoId: "IqCvSF0NHRs",
  },
  {
    areaId: "lm_money", year: "2016",
    sentence: "I'll easily have a 1.5 million dollar investment portfolio by December 31st 2016",
    outcome: "Hit early — reached it in August, ended the year above $2M.",
    verdict: "hit", videoId: "IqCvSF0NHRs",
  },
  {
    areaId: "lm_mission", year: "2016",
    sentence: "I'll easily publish at least 150 new video blogs on YouTube and on projectlifemastery.com",
    outcome: "Beaten — 227 videos published.",
    verdict: "beaten", videoId: "zuEb-1Ll2h8",
  },
  {
    areaId: "lm_mission", year: "2017",
    sentence: "200 videos",
    outcome: "198 of 200 — and he stopped on purpose: \"I didn't want to throw out a video that's low quality just for the sake of achieving that goal.\"",
    verdict: "chosen-not-to", videoId: "2fDYApReHWc",
  },
  {
    areaId: "lm_mindset", year: "2018",
    sentence: "I'll easily read at least 20 books and continue master every area in my life",
    outcome: "18 of 20.",
    verdict: "missed", videoId: "vPEblSGsDhE",
  },
  {
    areaId: "lm_health", year: "2017",
    sentence: "Massage twice a month",
    outcome: "\"I didn't achieve that goal either.\" A small, unglamorous, honestly-reported miss.",
    verdict: "missed", videoId: "TRGRznrMSec",
  },
  {
    areaId: "lm_contribution", year: "2018",
    sentence: "I'll raise and fund at least ten thousand dollars to build three plus houses with world housing",
    outcome: "Part of a giving programme he reports on publicly each year.",
    verdict: "hit", videoId: "vPEblSGsDhE",
  },
  {
    areaId: "lm_fun", year: "2018",
    sentence: "I'll easily do a new fun activity every month",
    outcome: "The operational form of the area he added to stop winning-without-enjoying.",
    verdict: "hit", videoId: "vPEblSGsDhE",
  },
]

/** His stated hit rate — the number that makes the misses above normal. */
export const EXEMPLAR_HIT_RATE = {
  quote: "I'm proud to say I achieved maybe 90% of my goals year after year, but there's still 10% that under certain circumstances or whatever I'm not achieving them for",
  videoId: "zuEb-1Ll2h8",
}

export const exemplarArea = (areaId: string): ExemplarArea | undefined =>
  EXEMPLAR_AREAS.find((a) => a.areaId === areaId)

export const exemplarGoals = (areaId: string): ExemplarGoal[] =>
  EXEMPLAR_GOALS.filter((g) => g.areaId === areaId)
