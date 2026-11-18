import type { QuitRef } from "../../../types"
import type { StudiedIn } from "./logic"

export interface IfEvidence {
  id: string
  text: string
  basis: { who: string; n: string; design: string; when: string }
  studiedIn: StudiedIn
  refs: QuitRef[]
}

const S1: QuitRef = {
  cite: "McWilliams L, Bellhouse S, Yorke J, Lloyd K, Armitage CJ (2019). Beyond \"planning\": A meta-analysis of implementation intentions to support smoking cessation. Health Psychol 38(12):1059-1068.",
  url: "https://pubmed.ncbi.nlm.nih.gov/31414843/",
  pmid: "31414843",
  quote: "Implementation intentions were effective for smoking cessation at follow up, OR = 1.70, CI [1.32, 2.20], p < .001, average 10.7% quit rate for intervention participants (4.9% in controls).",
}
const S1b: QuitRef = {
  ...S1,
  quote: "Implementation intentions are effective at helping smokers quit although the review reported substantial heterogeneity across the limited number of included studies.",
}
const S3: QuitRef = {
  cite: "Cooke R, McEwan H, Norman P (2023). The effect of forming implementation intentions on alcohol consumption: A systematic review and meta-analysis. Drug Alcohol Rev 42(1):68-80.",
  url: "https://pubmed.ncbi.nlm.nih.gov/36173203/",
  pmid: "36173203",
  quote: "volitional help sheet (d+ = -0.34, CI [-0.60; -0.07]) versus implementation intention format (d+ = -0.07, CI [-0.16; 0.02]).",
}
const S3b: QuitRef = { ...S3, quote: "Forming implementation intentions had a null effect on HED, d+ = -0.01 CI [-0.10; 0.08]." }
const S3c: QuitRef = {
  ...S3,
  quote: "paper (d+ = -0.26, CI [-0.43; -0.09]) versus online (d+ = -0.04, CI [-0.14; 0.06]) mode of delivery",
}
const S4: QuitRef = {
  cite: "Armitage CJ (2008). A volitional help sheet to encourage smoking cessation: a randomized exploratory trial. Health Psychol 27(5):557-66.",
  url: "https://pubmed.ncbi.nlm.nih.gov/18823182/",
  pmid: "18823182",
  quote: "Findings revealed significant decreases in nicotine dependence, number of cigarettes smoked, and increases in quitting in the volitional help sheet condition, relative to the control conditions",
}
const S6: QuitRef = {
  cite: "Adriaanse MA, van Oosten JM, de Ridder DT, de Wit JB, Evers C (2011). Planning what not to eat: ironic effects of implementation intentions negating unhealthy habits. Pers Soc Psychol Bull 37(1):69-81.",
  url: "https://pubmed.ncbi.nlm.nih.gov/21177875/",
  pmid: "21177875",
  quote: "forming negation implementation intentions resulted in cognitive ironic rebound effects as well as behavioral ironic rebound effects compared to an intention only condition or a replacement implementation intention.",
}
const S6b: QuitRef = {
  ...S6,
  quote: "negation implementation intentions are most likely to result in ironic rebound effects when the habit to be negated is strong.",
}

/** Every study line of the improved If-then plan. Nothing else in `best/` states a study result. */
export const EVIDENCE = {
  /** Step 1: do if-then plans help people quit. */
  quitting: {
    id: "quitting",
    text: "Across 12 studies of people trying to quit smoking, people asked to make if-then plans quit more often: about 11 in 100 against 5 in 100 without one.",
    basis: {
      who: "People trying to quit smoking, in 12 studies",
      n: "12 studies; the abstract does not give the number of people",
      design: "Systematic review and meta-analysis (random effects), searched to February 2018. The authors report substantial differences between the studies and say there were few of them.",
      when: "Published 2019",
    },
    studiedIn: "smokers",
    refs: [S1, S1b],
  },
  /** Step 2: picking from a list. */
  list: {
    id: "list",
    text: "In one trial of 193 smokers, those who used a sheet linking each temptation to a listed response smoked fewer cigarettes and quit more often than three comparison groups.",
    basis: {
      who: "People who smoke",
      n: "193",
      design: "Randomized exploratory trial: four groups, one of them got the help sheet with the instruction to link each temptation to a response.",
      when: "Published 2008",
    },
    studiedIn: "smokers",
    refs: [S4],
  },
  /** Step 2: list format against free wording, alcohol. */
  format: {
    id: "format",
    text: "In a review of 16 alcohol studies, plans made by picking a response from a list cut weekly drinking by a small amount. Plans in the usual if-then wording made no clear difference. If-then plans did not reduce heavy drinking sessions.",
    basis: {
      who: "Community and university samples in studies of drinking",
      n: "16 studies; the abstract does not give the number of people",
      design: "Systematic review and meta-analysis. The list result is a small effect with a wide margin (from almost none to medium). The two formats were compared across studies, not inside one trial. Effects got smaller over time.",
      when: "Published 2023, searched to March 2021",
    },
    studiedIn: "drinkers",
    refs: [S3, S3b],
  },
  /** Plan screen: paper against online. */
  paper: {
    id: "paper",
    text: "In the same review, plans filled in on paper cut weekly drinking by a small amount. Plans filled in online made no clear difference.",
    basis: {
      who: "Community and university samples in studies of drinking",
      n: "16 studies; the abstract does not give the number of people",
      design: "Systematic review and meta-analysis; the online result was not clearly different from no effect.",
      when: "Published 2023, searched to March 2021",
    },
    studiedIn: "drinkers",
    refs: [S3c],
  },
  /** Under a typed "then" that names something he will not do. */
  negation: {
    id: "negation",
    text: "In studies of eating habits, plans of the form \"if this, then not that\" backfired. They made the habit stronger than having no plan, or a plan that named something to do instead.",
    basis: {
      who: "Not stated in the abstract; the paper is about unhealthy eating habits, not drugs",
      n: "Not stated in the abstract",
      design: "Experiments (\"the present studies\") comparing an if-then plan that negates the habit with an intention only and with a replacement plan. The effect was most likely when the habit was strong.",
      when: "Published 2011",
    },
    studiedIn: "eating",
    refs: [S6, S6b],
  },
} as const satisfies Record<string, IfEvidence>
