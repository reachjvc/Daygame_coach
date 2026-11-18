import type { QuitRef } from "../../../types"

/** Where a line was studied. `smokers`: only people who smoke were in the study. */
export type StudiedIn = "smokers"

export interface QdEvidence {
  id: string
  text: string
  basis: { who: string; n: string; design: string; when: string }
  studiedIn: StudiedIn
  refs: QuitRef[]
}

const S21: QuitRef = {
  cite: "Lindson-Hawley N, Banting M, West R, Michie S, Shinkins B, Aveyard P (2016). Gradual Versus Abrupt Smoking Cessation: A Randomized, Controlled Noninferiority Trial. Ann Intern Med 164(9):585-92.",
  url: "https://pubmed.ncbi.nlm.nih.gov/26975007/",
  pmid: "26975007",
  quote: "Quitting smoking abruptly is more likely to lead to lasting abstinence than cutting down first, even for smokers who initially prefer to quit by gradual reduction.",
}
const S21b: QuitRef = {
  ...S21,
  quote: "Both groups received behavioral support from nurses and used nicotine replacement before and after quit day.",
}
const S22: QuitRef = {
  cite: "Lindson N, Klemperer E, Hong B, Ordóñez-Mena JM, Aveyard P (2019). Smoking reduction interventions for smoking cessation. Cochrane Database Syst Rev 9(9):CD013183.",
  url: "https://pubmed.ncbi.nlm.nih.gov/31565800/",
  pmid: "31565800",
  quote: "when comparing reduction-to-quit interventions with abrupt quitting (standard care) we found evidence that neither approach resulted in superior quit rates (RR 1. 01, 95% CI 0.87 to 1.17; I2 = 29%; 22 studies, 9219 participants).",
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
const S24: QuitRef = {
  cite: "Cobb CO, Niaura RS, Donaldson EA, Graham AL (2014). Quit now? Quit soon? Quit when you're ready? Insights about target quit dates for smoking cessation from an online quit date tool. J Med Internet Res 16(2):e55.",
  url: "https://pubmed.ncbi.nlm.nih.gov/24534139/",
  pmid: "24534139",
  quote: "TQD timing did not predict cessation outcomes in standard or exploratory analyses.",
}

/** Every new evidence line of the improved Quit date and plan. Nothing else in `best/` states a study result. */
export const EVIDENCE = {
  /** Shown beside a date more than 14 days ahead. */
  dateFar: {
    id: "dateFar",
    text: "In one large study of smokers, those who picked a later quit date were less often smoke-free 6 months on: about 40% with a date in week 1, 23% in week 5.",
    basis: {
      who: "Smokers in a trial of money rewards for quitting (or usual care) who picked their own quit date 0 to 90 days out",
      n: "1,848",
      design:
        "Planned secondary analysis of a randomized trial; the date itself was not randomized. Model estimate (adjusted for other factors).",
      when: "Published 2017",
    },
    studiedIn: "smokers",
    refs: [S25a, S25b],
  },
  /** Under the date-far line: two other studies that disagree. */
  dateOthers: {
    id: "dateOthers",
    text: "A second study of smokers also found later dates went with less success. A third, of smokers using an online quit-date tool, found the date's timing did not predict quitting.",
    basis: {
      who: "Smokers trying to quit",
      n: "Not stated in the first abstract; 427 of the 825 in the second's trial set a quit date ahead and were compared.",
      design: "Both are secondary analyses of trials; the quit date was not randomized in either. In the first, dates fell 1 to 5 weeks out, and the authors say whether the link is causal is unclear. The second measured quitting at 3 months.",
      when: "Published 2011 and 2014",
    },
    studiedIn: "smokers",
    refs: [S23, S24],
  },
  /** Under "stop for good": why there is no step-down path. */
  abrupt: {
    id: "abrupt",
    text: "No step-down path here. In one trial, quitting at once beat cutting down first; a review of 22 studies found the two worked about the same.",
    basis: {
      who: "Adult smokers with tobacco addiction in English primary care (trial); people who smoke, 22 studies (review)",
      n: "697 (trial); 9,219 (review)",
      design: "Randomized trial: the cut-down group cut by 75% over the 2 weeks before quit day; both groups had nurse support and nicotine replacement; checked at 4 weeks and 6 months. Cochrane review of randomized trials (it includes this trial), moderate certainty, quitting checked at 6 months or later.",
      when: "Published 2016 and 2019",
    },
    studiedIn: "smokers",
    refs: [S21, S21b, S22],
  },
} as const satisfies Record<string, QdEvidence>
