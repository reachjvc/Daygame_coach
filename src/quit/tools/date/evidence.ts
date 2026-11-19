import type { QuitRef } from "../../types"

export interface DateEvidence {
  id: string
  text: string
  basis: { who: string; n: string; design: string; when: string; caveat?: string }
  refs: QuitRef[]
}

const S25a: QuitRef = {
  cite: "Anesi GL, Halpern SD, Harhay MO, Volpp KG, Saulsgiver K (2017). Time to selected quit date and subsequent rates of sustained smoking abstinence. J Behav Med 40(6):989-997.",
  url: "https://pubmed.ncbi.nlm.nih.gov/28639106/",
  pmid: "28639106",
  quote: "In the fully adjusted model, the probability of being abstinent at 6 months if the participant selected a quit date in weeks 1, 5, 10, and 13 were 39.6, 22.6, 10.9, and 4.3%, respectively.",
}
const S25b: QuitRef = {
  ...S25a,
  quote: "study participants were instructed to select a quit date between 0 and 90 days from enrollment. Among those who selected a quit date and provided complete baseline data (n = 1848)",
}
const S23: QuitRef = {
  cite: "Hughes JR, Callas PW (2011). Is delaying a quit attempt associated with less success? Nicotine Tob Res 13(12):1228-32.",
  url: "https://pubmed.ncbi.nlm.nih.gov/21908460/",
  pmid: "21908460",
  quote: "Delaying a quit attempt prospectively predicts less success among smokers actively trying to quit. Whether this represents a causal effect is unclear.",
}

/** The two plain information lines shown past 28 days ahead. Nothing else on the date screens states a study result. */
export const DATE_EVIDENCE = {
  dateFar: {
    id: "dateFar",
    text: "In one large study of smokers, those who picked a later quit date were less often smoke-free 6 months on: about 40% with a date in week 1, 23% in week 5.",
    basis: {
      who: "Smokers in a trial of money rewards for quitting (or usual care) who picked their own quit date 0 to 90 days out",
      n: "1,848",
      design: "Planned secondary analysis of a randomized trial; the date itself was not randomized. Model estimate (adjusted for other factors).",
      when: "Published 2017",
      caveat: "It shows a link, not that the later date caused it.",
    },
    refs: [S25a, S25b],
  },
  dateOthers: {
    id: "dateOthers",
    text: "A second study of smokers found the same direction: later dates went with fewer quit attempts and more early lapses. The 6-month result was only a trend.",
    basis: {
      who: "Smokers who set a quit date",
      n: "Not stated in the abstract line we hold",
      design: "Secondary analysis of trials; the quit date was not randomized. The authors say whether the link is causal is unclear.",
      when: "Published 2011",
      caveat: "Only a trend at 6 months.",
    },
    refs: [S23],
  },
} as const satisfies Record<string, DateEvidence>
