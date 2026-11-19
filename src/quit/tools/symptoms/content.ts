import type { Evidence, QuitRef } from "../../types"

/**
 * Sourced text of "What you'll feel, and when" (Tool 6) that the nicotine data file does not hold yet.
 * Written by Opus on 2026-11-19. Every quote is copied from the PubMed abstract fetched that day. Our own
 * arithmetic or wording is said so in the basis. Nicotine only.
 */

export interface Basis {
  who: string
  n: string
  design: string
  where: string
  when: string
  caveat: string
  /** What was measured, when the source says. */
  measured?: string
}

export interface SourcedLine {
  id: string
  text: string
  evidence: Evidence
  basis: Basis
  refs: QuitRef[]
  /** Set when the line holds only for people who smoked cigarettes. */
  cigarettesOnly?: boolean
}

const fetchedOn = "2026-11-19"
const ref = (cite: string, pmid: string, quote: string): QuitRef => ({
  cite,
  url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
  pmid,
  quote,
  fetched: true,
  fetchedOn,
})

export const REFS = {
  ussher2013: ref(
    "Ussher M, Beard E, Abikoye G, Hajek P, West R (2013). Urge to smoke over 52 weeks of abstinence. Psychopharmacology 226(1):83-9.",
    "23052572",
    "Ratings of strength of urges to smoke followed an exponential decline over 52 weeks of abstinence, but 6 months after quitting 13 % of ex-smokers still reported strong urges. At 12 months, no ex-smokers reported strong urges, although 34 % reported some urges.",
  ),
  west1987: ref(
    "West RJ, Hajek P, Belcher M (1987). Time course of cigarette withdrawal symptoms during four weeks of treatment with nicotine chewing gum. Addictive Behaviors 12(2):199-203.",
    "3630807",
    "The average amount of time spent with the urge to smoke started to decline early in treatment, but the average strength of urges and overall difficulty not smoking did not decline until the fourth week.",
  ),
  west1989: ref(
    "West R, Hajek P, Belcher M (1989). Time course of cigarette withdrawal symptoms while using nicotine gum. Psychopharmacology 99(1):143-5.",
    "2506601",
    "Irritability, depression, difficulty concentrating and restlessness peaked in the 1st week or two and returned to baseline by week 4. Hunger was more persistent.",
  ),
  gilbert2002: ref(
    "Gilbert DG, McClernon FJ, Rabinovich NE et al (2002). Mood disturbance fails to resolve across 31 days of cigarette abstinence in women. Journal of Consulting and Clinical Psychology 70(1):142-52.",
    "11860040",
    "Abstinence-related increases in depression, tension, anger, irritability, and appetite showed little tendency to return to prequit levels and remained significantly elevated above smoke-group levels.",
  ),
  hughes2007Maybe: ref(
    "Hughes JR (2007). Effects of abstinence from tobacco: valid symptoms and time course. Nicotine & Tobacco Research 9(3):315-27.",
    "17365764",
    "Constipation, cough, dizziness, increased dreaming, and mouth ulcers may be abstinence effects.",
  ),
  hughes2007Method: ref(
    "Hughes JR (2007). Effects of abstinence from tobacco: valid symptoms and time course. Nicotine & Tobacco Research 9(3):315-27.",
    "17365764",
    "Data collection and interpretation were based solely on the author's subjective judgments.",
  ),
  taylor2007: ref(
    "Taylor AH, Ussher MH, Faulkner G (2007). The acute effects of exercise on cigarette cravings, withdrawal symptoms, affect and smoking behaviour: a systematic review. Addiction 102(4):534-43.",
    "17286639",
    "All 12 studies that compared a bout of exercise with a passive condition reported a positive effect on cigarette cravings, withdrawal symptoms and smoking behaviour.",
  ),
  swanson1997: ref(
    "Swanson JA, Lee JW, Hopp JW, Berk LS (1997). The impact of caffeine use on tobacco cessation and withdrawal. Addictive Behaviors 22(1):55-68.",
    "9022872",
    "Three weeks after cessation, concentrations reached 203% of baseline for the caffeine user. Such concentrations may be sufficient to produce caffeine toxicity symptoms in smoking abstinence conditions.",
  ),
  kroon2007: ref(
    "Kroon LA (2007). Drug interactions with smoking. American Journal of Health-System Pharmacy 64(18):1917-21.",
    "17823102",
    "PAHs are potent inducers of the hepatic cytochrome P-450 (CYP) isoenzymes 1A1, 1A2, and, possibly, 2E1. [...] The primary pharmacokinetic interactions with smoking occur with drugs that are CYP1A2 substrates, such as caffeine",
  ),
  edinger2021: ref(
    "Edinger JD, Arnedt JT, Bertisch SM et al (2021). Behavioral and psychological treatments for chronic insomnia disorder in adults: an American Academy of Sleep Medicine clinical practice guideline. Journal of Clinical Sleep Medicine 17(2):255-62.",
    "33164742",
    "We suggest that clinicians use stimulus control as a single-component therapy for the treatment of chronic insomnia disorder in adults. (CONDITIONAL).",
  ),
  hartmannBoyce2021: ref(
    "Hartmann-Boyce J, Theodoulou A, Farley A et al (2021). Interventions for preventing weight gain after smoking cessation. Cochrane Database of Systematic Reviews 10:CD006219.",
    "34611902",
    "However, weight was reduced at 12 months (MD -2.07 kg, 95% CI -3.78 to -0.36; 3 studies, 182 participants; I2 = 0%).",
  ),
  hartmannBoyce2021Education: ref(
    "Hartmann-Boyce J, Theodoulou A, Farley A et al (2021). Interventions for preventing weight gain after smoking cessation. Cochrane Database of Systematic Reviews 10:CD006219.",
    "34611902",
    "detailed weight management education without personalized assessment, planning and feedback did not reduce weight gain and may have reduced smoking cessation rates",
  ),
  sandberg2011: ref(
    "Sandberg A, Sköld CM, Grunewald J, Eklund A, Wheelock ÅM (2011). Assessing recent smoking status by measuring exhaled carbon monoxide levels. PLoS One 6(12):e28864.",
    "22194931",
    "The decline was described as a mono-exponential decay (r(2) = 0.7) with a half-life of 4.5 hours.",
  ),
  tashkin1996: ref(
    "Tashkin DP, Altose MD, Connett JE, Kanner RE, Lee WW, Wise RA (1996). Methacholine reactivity predicts changes in lung function over time in smokers with early chronic obstructive pulmonary disease. The Lung Health Study Research Group. American Journal of Respiratory and Critical Care Medicine 153(6):1802-11.",
    "8665038",
    "In the first year, participants who quit smoking showed improvement in FEV1, whereas continuing smokers showed worsening",
  ),
  kroon2007Dose: ref(
    "Kroon LA (2007). Drug interactions with smoking. American Journal of Health-System Pharmacy 64(18):1917-21.",
    "17823102",
    "The primary pharmacokinetic interactions with smoking occur with drugs that are CYP1A2 substrates, such as caffeine, clozapine, fluvoxamine, olanzapine, tacrine, and theophylline. [...] Conversely, upon smoking cessation, smokers may require a reduction in the dosage of an interacting medication.",
  ),
  west1987Strong: ref(
    "West RJ, Hajek P, Belcher M (1987). Time course of cigarette withdrawal symptoms during four weeks of treatment with nicotine chewing gum. Addictive Behaviors 12(2):199-203.",
    "3630807",
    "At the end of treatment 35% were still experiencing strong urges to smoke and 23% reported finding it difficult keeping themselves from smoking.",
  ),
  west1987Minority: ref(
    "West RJ, Hajek P, Belcher M (1987). Time course of cigarette withdrawal symptoms during four weeks of treatment with nicotine chewing gum. Addictive Behaviors 12(2):199-203.",
    "3630807",
    "Mean ratings of irritability, depression, hunger, restlessness, and inability to concentrate were significantly higher in the first week of abstinence than at baseline, although only a minority of smokers experienced severe withdrawal symptoms.",
  ),
  taylor2021: ref(
    "Taylor GM et al (2021). Smoking cessation for improving mental health. Cochrane Database of Systematic Reviews 3:CD013522.",
    "33687070",
    "anxiety symptoms (SMD -0.28, 95% CI -0.43 to -0.13; 15 studies, 3141 participants; I2 = 69%; low-certainty evidence); depression symptoms: (SMD -0.30, 95% CI -0.39 to -0.21; 34 studies, 7156 participants; I2 = 69%' very low-certainty evidence);  mixed anxiety and depression symptoms (SMD -0.31, 95% CI -0.40 to -0.22; 8 studies, 2829 participants; I2 = 0%; moderate certainty evidence)",
  ),
} as const

/** Card c: most people feel these mildly. */
export const mildForMost: SourcedLine = {
  id: "mild",
  text: "Severe is not the rule: in a smokers clinic, only a minority had severe symptoms in week 1.",
  evidence: "weak",
  basis: {
    who: "Smokers-clinic clients who stayed off 4 weeks, using nicotine gum",
    n: "52",
    design: "Weekly ratings of withdrawal symptoms, from before quit day to week 4",
    where: "A smokers clinic in the UK (the authors' address; not stated in the summary)",
    when: "Published 1987",
    caveat: "A small study, and everyone used nicotine gum, which can soften withdrawal. Only people who stayed off all 4 weeks were counted, so those who struggled most may be missing.",
  },
  refs: [REFS.west1987Minority],
}

/** "What gets better": anxiety and low mood over months (Cochrane). */
export const moodBetter: SourcedLine = {
  id: "mood-months",
  text: "Anxiety and low mood improved more in people who quit than in people who kept smoking.",
  evidence: "weak",
  basis: {
    who: "Adults in studies that followed people who quit smoking and people who kept smoking",
    n: "15 studies, 3,141 people (anxiety); 34 studies, 7,156 people (low mood); 8 studies, 2,829 people (both together)",
    design: "Cochrane review; mostly the same people followed over time, not trials",
    where: "Several countries",
    when: "Published 2021",
    caveat: "Low certainty for anxiety, very low for low mood, moderate for the two measured together: people who quit may differ in other ways. Studies of smokers.",
  },
  refs: [REFS.taylor2021],
}

/** Card a: everyday cravings. The time line marks and the text. */
export const cravings = {
  title: "Cravings",
  text: "Strongest in the first weeks, then they fade over months. A year on, about a third of the people still off had some urges, and none had strong ones.",
  detail: "In smokers who quit without medicine and stayed off, urge strength fell from week 1 onward. In a separate clinic study on nicotine gum it did not drop until week 4, and 35 in 100 still had strong urges then. At 6 months, 13 in 100 of the people still off had strong urges; at 12 months none did, and 34 in 100 had some.",
  evidence: "moderate" as Evidence,
  basis: {
    who: "Smokers quitting with support and no medicine (Ussher); smokers-clinic clients on nicotine gum (West)",
    n: "452 started (Ussher); asked while still off at weeks 1, 2, 3, 4, 26 and 52: 197, 156, 139, 131, 66 and 38 people. 52 people over 4 weeks (West).",
    design: "The same people followed and asked to rate their urges, off cigarettes confirmed by a breath test (Ussher); weekly ratings in a smokers clinic (West)",
    where: "London, UK (Ussher); a smokers clinic in the UK, by the authors' address (West)",
    when: "Published 2013 and 1987",
    caveat: "People who slipped dropped out of the later counts, so the late numbers describe those who stayed off: 66 people at 6 months, 38 at 12 months. The week-4 finding comes from people using nicotine gum.",
  } satisfies Basis,
  refs: [REFS.ussher2013, REFS.west1987, REFS.west1987Strong],
}

/** Card c: the line that some people's mood did not settle. */
export const notForEveryone: SourcedLine = {
  id: "gilbert",
  text: "Not for everyone: in a study of 96 women, those paid to stay off for 31 days still had low mood, tension, anger and irritability at day 31, above their own level before quitting and above the women who kept smoking.",
  evidence: "weak",
  basis: {
    who: "Women who smoked, split by chance into a group paid to stay off and a group that kept smoking",
    n: "96 (81 in 100 of those asked to stay off finished the 31 days)",
    design: "Randomised: one group stayed off 31 days (checked by tests), the other kept smoking; mood rated twice a week",
    where: "USA",
    when: "Published 2002",
    caveat: "Women only; those who stayed off were paid. Women who tend toward low mood or worry, as a personality trait, had the bigger rise. The physical side of anxiety did settle, by week 2.",
  },
  refs: [REFS.gilbert2002],
}

/** Card c: the Hughes review is one author's judgement (C28). */
export const reviewCaveat = "The review is one author's reading of 120 earlier studies, by his own judgement, not a pooled count."

/** Card c: help for all five feelings. */
export const moveForMood: SourcedLine = {
  id: "move",
  text: "Move: a brisk walk or the stairs. In all 12 lab studies that compared a bout of exercise with sitting still, it eased cravings, withdrawal symptoms or smoking.",
  evidence: "moderate",
  basis: {
    who: "Smokers kept off cigarettes for a short time for the lab test",
    n: "12 studies",
    design: "Systematic review of lab studies: a bout of exercise against sitting still",
    where: "Several countries",
    when: "Published 2007",
    caveat: "Lab studies of a few hours off cigarettes, measuring withdrawal overall, not each feeling on its own.",
  },
  refs: [REFS.taylor2007],
}

/** Cards c and d: caffeine, cigarette smokers only. */
export const caffeine: SourcedLine = {
  id: "caffeine",
  text: "Smoked cigarettes and have caffeine every day? Have about half your usual amount for the first weeks. After quitting, the same coffee leaves about twice the caffeine in your body, which may be enough to cause jitters or bad sleep.",
  evidence: "weak",
  cigarettesOnly: true,
  basis: {
    who: "Smokers who used caffeine, in quit programmes of the American Lung Association",
    n: "162",
    measured: "Caffeine in sputum (spit) for 3 weeks after quit day. Those who kept their caffeine reached 203% of their level before quitting by week 3. Cutting caffeine out entirely made people more tired for the first 3 days and made no difference to other symptoms or to quitting.",
    design: "Trial: clinics assigned to keep caffeine or stop it",
    where: "USA (the place is not stated in the summary)",
    when: "Published 1997",
    caveat: "A pharmacy review (Kroon 2007) names chemicals in tobacco smoke as what speeds up caffeine; it does not name nicotine. Our reading: this does not apply if you only vaped or used pouches. \"About half\" is our arithmetic from \"doubled\", not a dose the study tested.",
  },
  refs: [REFS.swanson1997, REFS.kroon2007],
}

/** Card d: three steps for sleep (replaces the four unsourced rules, B18). */
export const sleepSteps = {
  title: "Three steps for sleep",
  steps: [
    "Get up at the same time every day, whatever the night was like.",
    "Use the bed only for sleep.",
    "Can't sleep? Get up, do something quiet, and go back to bed when sleepy.",
  ],
  evidence: "moderate" as Evidence,
  basis: {
    who: "Adults with long-lasting insomnia",
    n: "A guideline built on a systematic review of trials",
    design: "Clinical guideline of the American Academy of Sleep Medicine. These steps are the method it calls \"stimulus control\"; it suggests it on its own (a conditional recommendation).",
    where: "USA",
    when: "Published 2021",
    caveat: "Not tested in people quitting nicotine. Their sleep trouble is often short, and the guideline is for insomnia that lasts.",
  } satisfies Basis,
  refs: [REFS.edinger2021],
}

/** Card e: hunger and weight. */
export const hunger = {
  title: "Hunger and weight",
  text: "Hunger can stay up for weeks. It outlasted the other symptoms in a study of 147 people over 4 weeks, and appetite was still up at day 31 in the study of 96 women.",
  evidence: "weak" as Evidence,
  basis: {
    who: "Smokers-clinic clients on nicotine gum who stayed off 4 weeks (West); women paid to stay off 31 days (Gilbert)",
    n: "147 (West); 96 (Gilbert)",
    design: "Weekly ratings over 4 weeks (West); twice-weekly ratings against a group that kept smoking (Gilbert)",
    where: "London, UK; USA",
    when: "Published 1989 and 2002",
    caveat: "Small studies, and the first used nicotine gum. They say hunger lasts, not for how many weeks.",
  } satisfies Basis,
  refs: [REFS.west1989, REFS.gilbert2002],
}

export const hungerHelp: SourcedLine[] = [
  {
    id: "exercise",
    text: "Exercise regularly. In 3 small trials (182 people), exercise programmes meant about 2 kg less weight gain a year later; at the end of the programmes there was little or no difference (4 trials, 404 people).",
    evidence: "weak",
    basis: {
      who: "People quitting smoking, in trials of ways to limit weight gain",
      n: "3 trials, 182 people",
      design: "Cochrane systematic review; exercise programmes against usual care",
      where: "Several countries",
      when: "Published 2021",
      caveat: "Small trials. The review found no method with moderate certainty of a useful effect on long-term weight gain.",
    },
    refs: [REFS.hartmannBoyce2021],
  },
  {
    id: "no-diet",
    text: "Skip weight-loss lessons on your own, without personal support. In 2 small trials (61 people) such lessons did not cut weight gain, and in 2 trials (522 people) fewer may have stayed off. Low to very low certainty.",
    evidence: "weak",
    basis: {
      who: "People quitting smoking",
      n: "2 trials: 61 people for weight, 522 for staying off",
      design: "Cochrane systematic review; weight-management lessons against none",
      where: "Several countries",
      when: "Published 2021",
      caveat: "Low to very low certainty. Lessons with personal planning and feedback were not the same and are not what this line is about. Weight was counted only in the people who stayed off.",
    },
    refs: [REFS.hartmannBoyce2021Education],
  },
]

/** Under the cards: less-studied effects. */
export const alsoPossible = {
  text: "Also possible, less studied (one author's judgement in a review): constipation, cough, dizziness, more dreams, mouth ulcers.",
  refs: [REFS.hughes2007Maybe],
}

/** "What gets better, and when": rows that are not already numbers in the data file. */
export const better: SourcedLine[] = [
  moodBetter,
  {
    id: "co",
    text: "Carbon monoxide in your breath halves about every 4.5 hours after the last cigarette.",
    evidence: "moderate",
    cigarettesOnly: true,
    basis: {
      who: "Smokers and non-smokers in a Swedish lab study",
      n: "6 smokers measured every hour for a day, plus 57 smokers measured on three visits",
      design: "Repeated breath tests; the fall fitted to a curve",
      where: "Stockholm, Sweden",
      when: "Published 2011",
      caveat: "Vapes and pouches make no carbon monoxide. How fast it falls differs from person to person.",
    },
    refs: [REFS.sandberg2011],
  },
  {
    id: "lungs",
    text: "Lung function improved in the first year in people who quit; it got worse in those who kept smoking.",
    evidence: "moderate",
    cigarettesOnly: true,
    basis: {
      who: "Smokers with early lung disease (mild to moderate airway narrowing); aged 35 to 60, from the study's main paper",
      n: "5,733",
      design: "Within a large trial (Lung Health Study): quitters and smokers compared over 5 years, but who quit was not assigned by chance",
      where: "USA and Canada, from the study's main paper",
      when: "Published 1996",
      caveat: "Smokers with early lung disease, not everyone. How big the gain was is not in the summary we quote.",
    },
    refs: [REFS.tashkin1996],
  },
]

/** When each "What gets better" row shows, in time order. `number` rows come from the data file's `numbers` by kind. */
export const betterOrder: { when: string; line?: string; better?: string; number?: string; belief?: string }[] = [
  { when: "Within a day", better: "co" },
  { when: "From week 1", number: "after-first-month" },
  { when: "Over months", better: "mood-months" },
  { when: "First year", better: "lungs" },
  { when: "Over a year", belief: "b3" },
  { when: "A year on", number: "after-body:15610111" },
  { when: "Years 1 and 3", number: "after-mood" },
]

/** Under the cards, cigarette smokers only: some medicines need a lower dose after quitting. */
export const medicines: SourcedLine = {
  id: "medicines",
  text: "Take a regular medicine? Tell your doctor you stopped smoking. For some medicines, such as clozapine, olanzapine or theophylline, the dose may need lowering.",
  evidence: "moderate",
  cigarettesOnly: true,
  basis: {
    who: "People who smoke and take medicines that tobacco smoke speeds up",
    n: "A review of drug interactions",
    design: "Pharmacy review",
    where: "USA",
    when: "Published 2007",
    caveat: "The speed-up comes from chemicals in tobacco smoke, so this is about cigarettes. Ask your doctor or pharmacist; do not change a dose yourself.",
  },
  refs: [REFS.kroon2007Dose],
}

/** The cue card's basis, corrected from the date tool's shared box (four groups; who was studied). */
export const cueBasis: Basis = {
  who: "Smokers of 10 or more a day, not trying to quit, paid to stay off",
  n: "86",
  design: "Lab study: four groups kept off 7, 14 or 35 days; three were tested once on their last day, one on days 7, 14 and 35. Nobody was tested on other days or after day 35.",
  where: "USA",
  when: "Published 2011",
  caveat: "Only days 7, 14 and 35 were tested, so nothing is claimed about days 1 to 6 or after day 35. The lab showed smoking cues, not real places. Paid volunteers in a lab, not people quitting in daily life.",
}
