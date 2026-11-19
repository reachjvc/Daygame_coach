import type { QuitRef } from "../../types"
import type { Basis } from "../date/Bits"

export interface IfEvidence {
  id: string
  text: string
  basis: Basis
  refs: readonly QuitRef[]
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

/** Every study line of the If-then plan tool. Nothing else in the tool states a study result. */
export const EVIDENCE = {
  quitting: {
    id: "quitting",
    text: "Across 12 studies of people trying to quit smoking, people asked to make if-then plans quit more often: about 11 in 100 against 5 in 100 without one.",
    basis: {
      who: "People trying to quit smoking, in 12 studies",
      n: "12 studies; the abstract does not give the number of people",
      design: "Systematic review and meta-analysis (random effects), searched to February 2018. The authors report substantial differences between the studies and say there were few of them.",
      when: "Published 2019",
    },
    refs: [S1, S1b],
  },
  list: {
    id: "list",
    text: "In one trial of 193 smokers, those who used a sheet linking each temptation to a listed response smoked fewer cigarettes and quit more often than three comparison groups.",
    basis: {
      who: "People who smoke",
      n: "193",
      design: "Randomized exploratory trial: four groups, one of them got the help sheet with the instruction to link each temptation to a response.",
      when: "Published 2008",
    },
    refs: [S4],
  },
  negation: {
    id: "negation",
    text: "In studies of eating habits, plans of the form \"if this, then not that\" backfired. They made the habit stronger than having no plan, or a plan that named something to do instead.",
    basis: {
      who: "Not stated in the abstract; the paper is about unhealthy eating habits, not drugs",
      n: "Not stated in the abstract",
      design: "Experiments (\"the present studies\") comparing an if-then plan that negates the habit with an intention only and with a replacement plan. The effect was most likely when the habit was strong.",
      when: "Published 2011",
    },
    refs: [S6, S6b],
  },
} as const satisfies Record<string, IfEvidence>

/** The tag over the nudge: the study is about eating habits, not drugs. */
export const NEGATION_TAG = "Studied in eating habits"
