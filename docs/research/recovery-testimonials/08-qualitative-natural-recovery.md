# Qualitative & epidemiological evidence on natural recovery / self-change from addiction

**Compiled:** 2026-08-17
**Scope:** peer-reviewed research on people who resolved a substance problem *without* formal treatment — plus the treated comparison studies needed to interpret it.

---

## 0. Methodology and confidence

### What I searched
Four parallel search tracks:
- **Europe PMC REST API** (`/search`, `/{PMCID}/fullTextXML`) — the primary tool. Queries on `"natural recovery"`, `"self-change"`, `"unassisted recovery"`, `"spontaneous remission"`, `"recovery capital"`, `"turning point"`, `"maturing out"`, `"without treatment" + remission`, `"rock bottom"`, filtered `OPEN_ACCESS:Y`, plus author/title lookups (Sobell, Bischof, Rumpf, Blomqvist, Klingemann, Granfield, Cloud, Kelly, Day, Moos, Matzger, Lee & Sher).
- **Illicit-drug track** — Robins' Vietnam veterans, Biernacki/Waldorf, maturing-out tests, cannabis and methamphetamine self-change.
- **Online-community track** — published thematic/NLP analyses of r/stopdrinking, r/OpiatesRecovery, r/leaves, Soberistas, digital recovery support services.
- **Recovery-capital and identity track** — Granfield & Cloud, ARC/REC-CAP, social identity models, recovery-identity adoption.
- **General web search** for the paywalled classics.

### How quotes were verified — read this before trusting anything below

**Rule applied throughout: quotes come from raw JATS full-text XML or raw PDF text extraction, never from a page-summarising model.** This is not pedantry. Three separate summariser-introduced errors were caught and corrected during compilation:

1. Yeh et al. (2009) — summariser returned `"Alcohol is crafty; it's stubborn. It won't quit just because you quit."`; the paper actually reads `"…It won't quit just because you quit. It sneaks up and catches you."`
2. Dingle, Cruwys & Frings (2015) — summariser elided the middle of a participant quote and clipped another to a fragment.
3. Best & Hennessy (2022) — summariser attributed a recovery-capital definition to Granfield & Cloud *as a quotation*; it is Best & Hennessy's own paraphrase with citations appended.

Every quote below was re-extracted from source after those discoveries, except where explicitly tagged otherwise.

Each study is tagged:
- **[FULL TEXT]** — full text read; quotes are XML- or PDF-verified, character-exact.
- **[FULL TEXT — SUMMARISER]** — full text read via a page summariser only; quotes may be truncated or elided. Treat quote wording as approximate; treat findings as reliable. **Do not paste these into customer-facing copy without checking the source.**
- **[ABSTRACT ONLY]** — abstract only; nothing asserted beyond what the abstract states.
- **[UNVERIFIED]** — could not fetch; listed for follow-up, nothing quoted.

### ⚠️ Special warning: Reddit-corpus papers do not print real quotes
**The online-recovery research literature has largely stopped reproducing verbatim post text.** Every major Reddit recovery paper read for §9 states an explicit paraphrasing policy for pseudonymity. Gauthier et al. (CHI 2022), verbatim from their methods:
> "All published quotes are paraphrased from existing non-deleted posts to preserve pseudonymity… We paraphrased by breaking quotes down into their thematic analysis codes, then manually constructed a new quote."

Colditz et al. (2023): *"direct quotes were rephrased (e.g., paraphrased, replacing words with close adjectives) to reasonably obfuscate identities of users."* Chen et al. (2025): *"we constructed synthetic quotations to protect the identities of content authors."*

**Consequence:** anything in §9 that looks like a forum quote is a researcher's reconstruction. It is usable as *"representative of what the community says"* and never as *"a person said this."* The one exception is Sinclair et al. (2017), a survey study printing real free-text responses — see §9.7.

---

## 0A. Quote-provenance audit

Prompted by a sibling researcher finding that a page-fetch layer returned a plausible quote that **did not exist in the source HTML at all**, every study from which this document reproduces participant speech was audited two ways:

1. **Methods-section audit** — the raw XML/HTML was grepped for `paraphras`, `de-identif`, `anonymi[sz]`, `pseudonym`, `lightly edited`, `edited for clarity`, `verbatim`, `altered`, `obfuscat`, `synthetic quot`, `redact`, `translat`, `names changed`.
2. **Substring verification** — distinctive substrings from every load-bearing quote were grepped against the downloaded raw source, with smart-quote/dash/ellipsis normalisation to avoid false misses.

### Errors this audit caught

| # | What happened | Fix |
|---|---|---|
| 1 | Summariser truncated Yeh 2009: gave `"…It won't quit just because you quit."`, omitting `"It sneaks up and catches you."` | Re-extracted from XML |
| 2 | Summariser elided the middle of a Dingle/Cruwys/Frings 2015 quote and clipped another to a fragment | Re-extracted from XML |
| 3 | Summariser attributed a recovery-capital definition to Granfield & Cloud **as a quotation**; it is Best & Hennessy's own paraphrase with citations appended | Attribution corrected, §4A.5 |
| 4 | **Summariser produced a merged composite quote for Rhodes 2018** — `"I watched her actually overdose and die in front of my eyes...the biggest thing was when I lost custody of my kids."` The two halves come from **different passages**; the paper does not contain that sentence | Replaced with true verbatim, §8.5 |
| 5 | **Summariser produced a Rhodes 2018 quote containing text absent from the source** — `"My health was failing...I actually physically felt it...I was gonna die."` The phrase *"I actually physically felt it"* does not appear anywhere in the paper | Replaced with true verbatim, §8.5 |
| 6 | Summariser miscategorised a Rhodes 2018 theme count as "relationship dissolution (2)"; the paper says "strained personal relationships and social isolation (n = 2)" | Corrected, §8.5 |
| 7 | Reddit-corpus literature found to paraphrase all quotes by policy | Whole of §9 relabelled as non-testimonial |

**Six of seven errors came from summarising fetch layers, not from the papers.** Findings survived every check; only quote *wording* was corrupted. That asymmetry is the practical lesson: **use summarisers for findings, never for quotes.**

### Per-study quote-alteration policy

| Study | Policy found in methods (verbatim where quoted) | Verdict on quotes |
|---|---|---|
| Gilbert 2026 (§2.2) | "transcribed verbatim by a professional transcription service"; "reviewed by interviewers for accuracy and to redact potentially identifying information. All participants were assigned pseudonyms." | ✅ **Testimonial-safe.** ⚠️ 5 of 65 interviews were translated from Spanish — an unmarked quote could be a translation |
| Soweid 2024 (§2.1) | "transcribed verbatim…"; "potentially identifying information was redacted to ensure confidentiality" | ✅ **Testimonial-safe.** Same Spanish-translation caveat |
| Martinelli 2023 (§8.1) | "audio recorded and transcribed verbatim"; "We translated quotes from the interviews from Dutch to English, and for readability purposes, we used pseudonyms throughout the results" | ⚠️ **Translated from Dutch.** Faithful, but not the speaker's own words in English |
| Yeh 2009 (§8.2) | "All interviews were transcribed verbatim"; "All personal names were removed to ensure confidentiality" | ⚠️ **Translated from Chinese** (Taiwan study, English-language paper; translation is not itself described) |
| Vose-O'Neal 2025 (§8.3) | "transcribed verbatim, and de-identified by a member of the research team" | ✅ **Testimonial-safe** |
| Pettersen 2018 (§3.7) | "a verbatim transcript of each interview was completed"; "To protect anonymity, no identifiable information about any participant is reported herein" | ⚠️ **Translated from Norwegian** (not described) |
| Rhodes 2018 (§8.5) | "transcribed verbatim"; "potentially identifying information was redacted or **substituted with pseudonyms or more general terms** during transcription" | ⚠️ **Testimonial-safe with caveat** — identifying nouns may have been generalised |
| Day 2023 (§5.2) | Table 3 column header is literally "Verbatim quotes"; these are free-text survey responses | ✅ **Testimonial-safe.** Among the cleanest in the file |
| Dingle/Cruwys/Frings 2015 (§5.4) | "audio recorded and transcribed verbatim" | ✅ **Testimonial-safe** |
| Herbeck 2014 (§2A.5) | **No alteration statement found.** All 8 checked substrings verified present in raw HTML | ⚠️ **Silent on policy** — quotes verified to exist, but no stated fidelity guarantee |
| Boeri 2014 (§2A.6) | "The audio-recorded interviews were transcribed verbatim". All 10 checked substrings verified | ✅ **Testimonial-safe** |
| Boeri 2008 (§2A.8) | **No verbatim-transcription statement found**; only a Certificate of Confidentiality. 3/3 substrings verified | ⚠️ **Silent on policy** |
| Wyse 2018 (§2A.7) | "digitally recorded and professionally transcribed verbatim. Completed documents were reviewed by the PI for accuracy." Note: *"'Easton' is a pseudonym for the large, Eastern U.S. city"* | ✅ **Testimonial-safe.** 6/6 substrings verified |
| Krowka 2025 (§2A.9) | **No alteration statement found anywhere in the paper.** 5/5 substrings verified present | ⚠️ **Silent on policy** |
| Stokes 2018 (§8.4) | **No verbatim-transcription statement found**; only generic "informed consent, confidentiality and privacy" | ⚠️ **Silent on policy.** South African sample, quotes rendered in English |
| Subhani 2022 (§3.8) | Systematic review — quotes are quotes-of-quotes, and I read it via summariser | ❌ **Do not use as testimony** |
| **All Reddit-corpus papers (§9)** | Explicit paraphrasing/synthetic-quote policies (Gauthier, Colditz, Chen, Thulin, Naserianhanzaei) | ❌ **NOT testimony. Researcher reconstructions.** |
| Sinclair 2017 (§9.7) | Free-text survey responses printed in Tables 3–4; no alteration statement | ✅ **The only genuinely quotable source in §9** |

### Rule for anyone using this file
**Green (✅) quotes may be used as testimonials. Amber (⚠️) quotes may be used as evidence of what a study found, with the caveat stated. Red (❌) quotes may never be presented as something a person said.** Translation caveats matter for a product that will show quotes to users: a translated quote is the researcher's English, not the participant's voice.

---

### Confidence
- **High** on the epidemiology (proportion resolving without treatment, stability, who uses assisted pathways). Multiple independent national probability samples agree.
- **High** on the thematic findings from Gilbert/Soweid et al. (2024, 2026) — the best-designed qualitative study of untreated AUD resolvers I found, n=65, with reported theme prevalences.
- **Medium** on cross-study theme synthesis — samples differ wildly (media-recruited German remitters vs. Dutch lifeline interviews vs. Detroit Black community vs. South African 12-steppers), so theme counts below are indicative, not meta-analytic.
- **High** on the illicit-drug epidemiology (Heyman's review of ECA/NCS/NESARC; Robins' Vietnam cohort) — these are large, well-known datasets and the numbers were taken from author-posted PDFs read as raw text.
- **Medium** on the online-community evidence — the studies are methodologically strong but almost none print real quotes (see warning above), and the corpora are self-selected in the extreme.
- **Low / gap on the founding classics.** **Granfield & Cloud (1996, 2001), Cloud & Granfield (2008), and Biernacki (1986) were attempted independently by two search tracks and obtained by neither.** Sage and Taylor & Francis returned 403; no repository copy exists; archive.org has no copy of *Coming Clean*; the open-access Wayne State companion paper (Cloud & Granfield 1994, *Clinical Sociology Review*) sits behind an AWS WAF challenge. **Nothing is quoted from any of them anywhere in this document — only their publisher abstracts.** Anything you have seen attributed to Granfield & Cloud as a participant quote is not corroborated here and should be treated as unverified until someone reads the PDF.

### The big caveat on sampling
The requester's brief assumed qualitative natural-recovery studies are "systematically sampled rather than self-selected." **That is only partly true.** A large slice of the classic German natural-recovery corpus (Bischof, Rumpf et al.) is **media-recruited**, and the field explicitly worried about this — see Rumpf et al., *"Studies on natural recovery from alcohol dependence: sample selection bias by media solicitation?"* (Addiction, 2000) [ABSTRACT ONLY, title verified via Europe PMC]. The genuinely population-representative work is the survey epidemiology (Kelly 2017; Day 2024; Cunningham 1999/2024), which is quantitative, not quote-bearing. The best of both worlds is Gilbert/Soweid et al., who interviewed 65 people drawn from a national US study.

---

## 1. Epidemiology: how many resolve without treatment, and does it hold?

### 1.1 Tucker, Chandler & Witkiewitz (2020) — *Epidemiology of Recovery From Alcohol Use Disorder* [FULL TEXT]
*Alcohol Research: Current Reviews*, 40(3):02. doi:10.35946/arcr.v40.3.02
https://pmc.ncbi.nlm.nih.gov/articles/PMC7643818/ — open access

Verbatim from the abstract:
> "Approximately 70% of persons with AUD and alcohol problems improve without interventions (natural recovery), and fewer than 25% utilize alcohol-focused services."

> "Low-risk drinking is a more common outcome in untreated samples, in part because seeking treatment is associated with higher problem severity."

> "Sex differences are more apparent in help-seeking than recovery patterns, and women have lower help-seeking rates than men."

**Why it matters for the product:** the modal resolver is untreated, and the modal untreated outcome is *not* abstinence.

---

### 1.2 Kelly, Bergman, Hoeppner, Vilsaint & White (2017) — US National Recovery Study [ABSTRACT ONLY]
*Drug and Alcohol Dependence*, 181:162–169. doi:10.1016/j.drugalcdep.2017.09.028
https://europepmc.org/article/MED/29055821 — abstract open; full text paywalled

Probability survey, n=39,809 US adults (63.4% response). Verbatim from abstract:
> "Weighted prevalence of problem resolution was 9.1%, with 46% self-identifying as 'in recovery'; 53.9% reported 'assisted' pathway use."

> "Most utilized support was mutual-help (45.1%,SE=1.6), followed by treatment (27.6%,SE=1.4), and emerging recovery support services (21.8%,SE=1.4), including recovery community centers (6.2%,SE=0.9)."

> "Strongest correlates of 'assisted' pathway use were lifetime AOD diagnosis (AOR=10.8[7.42-15.74], model R2=0.13), drug court involvement (AOR=8.1[5.2-12.6], model R2=0.10), and, inversely, absence of lifetime psychiatric diagnosis (AOR=0.3[0.2-0.3], model R2=0.10)."

> "Compared to those with primary alcohol problems, those with primary cannabis problems were less likely (AOR=0.7[0.5-0.9]) and those with opioid problems were more likely (AOR=2.2[1.4-3.4]) to use assisted pathways."

> "Indices related to severity were related to assisted pathways (R2<0.03)."

**Note that last line.** Severity explained *less than 3%* of the variance in whether someone used an assisted pathway. Diagnosis and criminal-justice contact dominated. Being told you have a disorder predicts using services far better than how bad the problem was.

---

### 1.3 Day, Manitsa, Farley & Kelly (2024) — UK National Recovery Survey [FULL TEXT]
*BJPsych Open*, 10(2):e67. doi:10.1192/bjo.2023.654
https://pmc.ncbi.nlm.nih.gov/articles/PMC10951842/ — open access

Verbatim from abstract:
> "In stage 1 (n = 2061), 102 (5%) reported lifetime AOD problem resolution. In the weighted sample (n = 1373) who completed the survey in stage 2, 49.9% reported 'assisted' pathway use via formal treatment (35.0%), mutual help (29.7%) and/or recovery support services (22.6%)."

> "Use of an assisted pathway was strongly correlated with lifetime AOD diagnosis (adjusted odds ratio [AOR] = 9.54) and arrest in the past year (AOR = 7.88) and inversely correlated with absence of lifetime psychiatric diagnosis (AOR = 0.17)."

> "Nearly three million people have resolved an AOD problem in the UK. Findings challenge the therapeutic pessimism sometimes associated with these problems and suggest a need to learn from community-based self-change that can supplement and enhance existing treatment modalities."

So: **~half of all resolutions are unassisted, in both the US and UK, on nationally representative samples.**

---

### 1.4 Cunningham (1999) — how the estimate moves with your definition [ABSTRACT ONLY]
*Journal of Studies on Alcohol*, 60:463–466. doi:10.15288/jsa.1999.60.463
https://europepmc.org/article/MED/10463801

> "Estimates of the prevalence of nontreatment recoveries ranged from 87.5% to 53.7% depending on the stringency of the definition of prior alcohol problems employed."

> "Although a significant proportion of individuals recover from alcohol problems without treatment, such recoveries appear less common among individuals with more severe alcohol problems."

**This is the honest bracket.** Anyone quoting a single number for "% who recover without treatment" is picking a definition. The range is 54–88%.

---

### 1.5 Rumpf, Bischof, Hapke, Meyer & John (2006) — is untreated remission stable? [ABSTRACT ONLY]
*Alcohol and Alcoholism*, 41(3):311–314. doi:10.1093/alcalc/agl008
https://academic.oup.com/alcalc/article/41/3/311/93241

n=144 people already in 12-month remission from alcohol dependence with no formal help (≤2 self-help meetings), re-interviewed at 24 months. 130 re-interviewed (92.9%).
> "92.3% showed stable remission without formal help"

Breakdown given: 1.5% currently alcohol dependent (DSM-IV); 1.5% classified dependent on collateral information; 1.5% met one or two dependence criteria; 4.6% utilised formal help.

Conclusion, verbatim:
> "Untreated remission is not a transient phenomenon. Therefore, studying remitters from alcohol dependence without formal help can yield valid information on pathways to recovery."

---

### 1.6 Moos & Moos (2006) — the study that says the opposite [ABSTRACT ONLY + verbatim results via full-text fetch]
*Addiction*, 101:212–222. doi:10.1111/j.1360-0443.2006.01310.x
https://pmc.ncbi.nlm.nih.gov/articles/PMC1976118/ — open access

n=461, followed from the point of first recognising a need for help, out to 16 years.

Verbatim results (retrieved from the PMC full text):
> "By the 3-year follow-up, 62.4% of individuals in the helped group were remitted, compared with only 43.4% of individuals in the no help group."

> "By the 16-year follow-up, 60.5% of the 3-year remitted individuals in the no help group had relapsed, compared with 42.9% of 3-year remitted individuals in the helped group."

Verbatim from abstract:
> "Natural remission may be followed by a high likelihood of relapse; thus, preventive interventions may be indicated to forestall future alcohol problems among individuals who cut down temporarily on drinking on their own."

Predictors, verbatim: *"Less alcohol consumption and fewer drinking problems, more self-efficacy and less reliance on avoidance coping at baseline predicted 3-year remission; this was especially true of individuals who remitted without help."*

> ⚠️ **FLAG — direct conflict with §1.5.** Rumpf says untreated remission is 92% stable; Moos says untreated remitters relapse at 60% over 16 years. **The conflict is a sampling artefact and both are true of their own samples.** Rumpf enrolled people who had *already held* 12 months of remission — a survivor-conditioned cohort. Moos enrolled people at the moment they *recognised a problem* — an inception cohort including everyone who would go on to fail. For a product: **once someone has held a year, the odds are strongly with them; the fragile window is the first year, and it is more fragile without help.**

---

### 1.7 Schutte, Moos & Brennan (2006) — untreated remission in later life [ABSTRACT ONLY]
*Journal of Studies on Alcohol*, 67:354–362. doi:10.15288/jsa.2006.67.354
https://europepmc.org/article/MED/16608144

330 older untreated remitters vs. 120 treated remitters vs. 130 untreated non-remitters.
> "A majority (73%) of remitted, older problem drinkers attained remission without any formal treatment for drinking problems."

> "Compared with treated remitters, late-life untreated remitters were more likely to be women and had completed more schooling, reached their peak alcohol consumption and ceased development of new drinking problems earlier, had much less severe drinking and depression histories, and were less likely to have received any advice to reduce consumption."

> "Compared with untreated nonremitters, untreated remitters were more likely to be women, reached their peak alcohol consumption and stopped developing new drinking problems almost a decade earlier, had somewhat less severe drinking histories, were less likely to have been advised to reduce consumption, and were more likely to have reacted to late-life health problems by reducing their alcohol consumption."

**Two things to notice.** (a) The single behavioural discriminator between untreated remitters and untreated non-remitters was *responding to a health problem by cutting down*. (b) Untreated remitters were **less** likely to have been advised to reduce consumption — advice is a marker of severity, not a cause of change.

---

### 1.8 Cunningham, Schell, Walker & Godinho (2024) — UK remission patterns [FULL TEXT]
*Substance Abuse Treatment, Prevention, and Policy*, 19(1):3. doi:10.1186/s13011-023-00588-1
https://pmc.ncbi.nlm.nih.gov/articles/PMC10768276/ — open access

n=3,994 UK panel; 166 with lifetime ICD-10 alcohol dependence now abstinent (n=67) or moderate drinking (n=99).
> "Participants who were currently abstinent were more likely to have accessed treatment than those who were currently moderate drinkers (44.4% versus 16.0%; Fischer's exact test = 0.001)."

> "those who were abstinent were heavier drinkers prior to remission [Mean (SD) drinks per week = 53.6 (31.7) versus 29.1 (21.7); t-test = 5.6, 118.7 df, p < .001] and were more likely to have ever identified themselves as 'in recovery' (51.5% versus 18.9%; Fischer's exact test = 0.001)"

> "the majority of participants reduced their drinking without treatment (and did not regard themselves as in recovery)."

**Note: 99 of 166 remitted dependent drinkers were moderate drinkers, not abstainers.**

---

## 2. The core qualitative study: 65 untreated AUD resolvers

Two papers from the same US national study (recovery definitions and strategies). This is the single most product-relevant source in this document.

### 2.1 Soweid, Gilbert, Maharjan, Holdefer, Evans & Mulia (2024) — recovery strategies [FULL TEXT]
*"Everybody needs to find the best path for them": Insights into recovery strategies of people who have not used specialty treatment for alcohol use disorder.*
*Alcohol, Clinical & Experimental Research*, 48(4):743–754. doi:10.1111/acer.15287
https://pmc.ncbi.nlm.nih.gov/articles/PMC12879724/ — open access

**Sample:** 65 adults, resolved AUD, **no history of specialty services** (no inpatient/outpatient rehab, no MAT). 27 women; 37 White; 58.5% male; 83.0% aged 45+; 63.1% employed; 73.8% >2× federal poverty level; 77% some college or more. **84.6% met criteria for severe lifetime AUD.** 81.5% in recovery >5 years. 56.9% abstinence goal. 41.5% had attended mutual-help groups ("Assisted" subgroup); 58.5% had not ("Independent" subgroup).

**Theme prevalences (this is the rare qualitative paper that gives you numbers):**

| Strategy / factor | % of 65 participants |
|---|---|
| Changing contexts (physical & social settings) | **69.2%** |
| Social connections | **67.7%** |
| Other strategies (catch-all: therapy, cognitive tactics, health habits) | 60.0% |
| Mutual-help groups | 58.5% |
| Activities (hobbies, exercise) | 53.8% |
| Self-reliance | 50.8% |
| Spirituality | 49.2% |
| Substitution | (reported as a theme; no % given) |
| Aging / maturing | (reported as a theme; no % given) |

Authors' framing, verbatim:
> "Most participants employed multiple strategies and were intentional in adopting the ones that best suited them."

> "In the majority of interviews, it was rare that a participant focused only on a single strategy or factor."

> "By far, the two most common strategies were Changing Contexts (reported by 69.2% of participants) whereby people reduced their alcohol exposure by modifying social networks or physical settings and relying on Social Connections (reported by 67.7%), especially connections to people with similar lived experiences and struggles."

> "Spirituality appeared to play an important, but not universal, role as it was invoked by approximately half (49.2%) of participants."

**Recovery identity split, verbatim:**
> "A significantly larger proportion of the Assisted Recovery group labeled themselves as in recovery, recovering, or recovered compared to the Independent Recovery group (51.9% vs. 15.8%, p = 0.01)."

**Why people didn't seek help, verbatim:**
> "many participants believed that they could recover on their own or that there was sufficient support in their lives that negated the need for additional, external help. However, some participants in the Independent Recovery group admitted that if they had found their recovery to be too difficult, they probably would have resorted to some form of treatment."

> "Those participants who avoided mutual-help groups described reluctance due to the perceived religiosity of the groups, disagreement with aspects of the program (e.g., the 12 steps or 12 traditions of AA), not having rapport or not fitting in with group members, or having social anxiety that deterred them from joining groups. There were no mentions of 12-step alternatives (e.g., SMART Recovery)."

**Participant quotes** (the paper attributes these only as "one participant"; that is the descriptor the authors give):

*Theme — changing contexts:*
> "A lot of places where I would encounter drinking, I had cut out…[which] resulted in fewer opportunities or occasions to drink"

> "I had a liquor cabinet in my apartment that I literally, if I didn't give it away, I threw it away."

> "I don't mind it if people are drinking. … But when they get sloppy…no, I don't want that. And so, I leave when it's like that."

> "it was changing my friend base…There were a couple of friends that just didn't understand alcoholism and neither did I very well. And those are the friends who were like, 'Can you just taste my drink?' No, I can't just taste it. So, people like that are what I found a hindrance."

*Theme — social connections:*
> "I couldn't imagine getting better, but I thought I'd stick with this group of nutty people and laugh and listen. And that things might get better, and they did."

> "I must say that when you have your partner or your husband…it'll work much better because you have somebody that'll understand that there's more to life than drinking"

> "I don't really see too many friends anymore. I don't like to be around those people…because I might…get tempted and I don't want to get tempted, so I just stay away."

*Theme — cognitive strategies:*
> "Every once in a while, I think about having a drink, and all I have to do is think ahead 12 h of what I would feel like, the guilt, the shame and the hangover, and [that] I just blew my ten-year sobriety"

*Theme — activities / substitution:*
> "I started running three months later, after my recovery. I was trying to figure out how to rebuild stamina, and I wasn't the healthiest person, was pretty heavy actually. So I started running and running is what kept me sober for the rest of that year."

> "To be perfectly honest with you, I became so focused on improving my exercises…that it almost replaced the drinking, if you will. It became just a focus where I had something else that I could put my energy and my time into that just…it just kinda kept me going."

> "[I would] think of something else. I would twiddle my fingers, I would read. I'm a reader. I collect coins. I would do, you know, do something else in place of thinking about a drink."

*Theme — self-reliance:*
> "Instead of cutting back and weaning myself off, I just one day just stopped drinking"

> "if you're going to kick a habit, you have to kick it completely, because if you go little by little, you'll never kick it."

> "I didn't need any support or anything. I know some people need support and sponsors and somebody they can talk to, but I'm fortunate in that I didn't need that."

> "I am a very strong-minded woman. … And when I make up my mind to do something, I usually can do it."

> "If you don't really have any goals set in life, you're just hanging out, just living from day to day, chances are you're not gonna want to quit, you're not gonna have that willpower"

> "I just quit. That was it. … No actions, I just quit."

*Theme — rejecting the higher-power frame:*
> "One thing that I really objected to when I went to some AA meetings was that it seemed very religious… the whole thing about succumbing to a higher power, I never agreed with that…I could see how people could get something out of it, but it was definitely not for me."

*Theme — aging / maturing:*
> "For me, it was the awakening of realizing [that I was] about to start a family. … Having people depend on you, having people look up to you, knowing that you are going to be the central focal figure. That, in itself, gave me so much motivation to know that these are things that I don't want my kids to see."

> "my shrink put [it] in perspective for me…She's like, well you just grew out of it. That's all. And that really made an impression on me…that I grew out of it. Just like the saying a fool who persists in his folly will become wise? I became wise."

**Author observation on how the two subgroups differ, verbatim:**
> "Participants in Independent Recovery discussed their self-reliance as a primary reason for not pursuing treatment or attending mutual-help groups, specifically disagreeing with the premise of giving up control to a higher power. However, Assisted group participants discussed self-reliance as a factor that helped them to initiate and maintain recovery and concurrently spoke of the value of mutual-help groups, highlighting the need for both independence and fellowship for recovery."

> "both groups described changing their social and physical environments, but the Assisted group talked more concretely about what they did (i.e., removing alcohol from their homes, avoiding grocery aisles) while the Independent group spoke more generally."

---

### 2.2 Gilbert, Soweid, Maharjan & Mulia (2026) — non-abstinent recovery [FULL TEXT]
*Choosing and Managing Non-Abstinent Recovery: Experiences of Adults in Untreated Recovery From Alcohol Use Disorder.*
*Drug and Alcohol Review*, 45(2):e70103. doi:10.1111/dar.70103
https://pmc.ncbi.nlm.nih.gov/articles/PMC12873455/ — open access

Same 65 participants. **Recovery goal split: complete abstinence 43.1%, conditional abstinence 13.9%, moderated drinking 43.1%.** Among the moderated-drinking group, only 10.7% had no past-year drinking; 57.1% drank once a month or less. Only two participants who drank in the past year reported *any* binge drinking, less than monthly.

Authors' conclusion, verbatim:
> "Strict or enduring abstinence may not be necessary for all individuals seeking to recover from alcohol use disorder."

> "Non‐abstinent participants reported infrequent and low‐level drinking, citing helpful internal resources, such as strong self‐awareness of their limits and confidence in their ability to control their drinking. By contrast, individuals who chose abstinence were often not confident in their ability to stop drinking, and some recounted instances when they learned that, after years of abstinence, they could not safely control their drinking."

> "individuals who chose moderated drinking appeared to have clear, self‐imposed rules about when and how much they could drink."

> "Many participants described changing their recovery goal, sometimes multiple times, reflecting a dynamic process of recovery."

**Participant quotes** (descriptors exactly as the paper gives them):

*Theme — what non-abstinent recovery actually looks like:*
> "I may have a cocktail every now and then, but it would be negligible, probably five or six [drinks] in 30, 31 years."
> — Olivia (cisgender woman, assisted pathway, in very long-term recovery [≥ 10 years])

> "If we're out for lunch or whatever, I've taken a few sips here and there, and it has not triggered anything. But I've never even had a full drink or anything like that in 11 years."
> — Mallory (transgender woman, independent pathway, in long-term recovery [5–9 years])

> "about once a year, I have a cocktail on New Year's night. I usually have a small rum and cola, or just something to celebrate."
> — Viola (cisgender woman, independent pathway, in very long-term recovery)

> "That's always been my limit. Being drunk and drinking—it's a very fine line. So, my goal is always drink, have fun, but don't get drunk."
> — Natasha (cisgender woman, independent pathway, in short-term recovery [< 5 years])

> "I'm going to drink with you on your wedding day … I'll drink a toast, and it's not going to be a drink. I'm going to put the champagne to my lips, I'm going to taste it, and I'm going to leave it. But I will have toasted you and your wife."
> — Juan (cisgender man, assisted pathway, in very long-term recovery), recounting what he told his son

*Theme — self-imposed rules and confidence in control:*
> "I began having alcohol again, but I realised I could control it. I didn't need to just drink and keep drinking. I could have one glass of beer and that was fine."
> — Victor (cisgender man, assisted pathway, in long-term recovery)

> "If I were to go out to dinner with somebody I would probably order a glass of wine, and I might even drink it. But that doesn't mean that I fell off the wagon … It doesn't matter if I have a sip right now, or if I have a sip in a year, it's not gonna ever like take off like it did."
> — Naomi (cisgender woman, independent pathway, in short-term recovery)

> "I never decided that I needed to quit completely because I've learned that I have an off‐switch. I know when I've had too much and I can say, 'Okay, I'm done,' even if occasionally I do get drunk. And these days, that's extremely rare."
> — Floyd (cisgender man, assisted pathway, in very long-term recovery) — described by the authors as **atypical**

*Theme — why others chose abstinence instead:*
> "I know that my next drink is not gonna be one, it's gonna be all."
> — Vincent (cisgender man, assisted pathway, in short-term recovery)

*Theme — abstinence felt unrealistic:*
> "I just decided to cut back as much as I was able to. [Declaring] that I was never going to drink again didn't seem like a reasonable thing to expect of myself. I knew there would be occasions, different dinners [when] I would be offered wine and I would probably drink it. But I really did my best to control the frequency and the amounts."
> — Wallace (cisgender man, independent pathway, in long-term recovery)

> "I just wanted to cut back, I don't think I necessarily want to quit entirely. I do find [drinking] to be somewhat beneficial and fun, and I like the taste of beer. So I don't necessarily want to cut it out of my life entirely."
> — Daafi (cisgender man, independent pathway, in short-term recovery)

*Theme — maturing out:*
> "I feel like I've gotten more mature. When I drink, I don't want to drink to just get drunk. If I'm at a restaurant or with a couple friends, just have a couple drinks and chill and don't push it … nothing too serious, entirely manageable."
> — Zachary (cisgender man, independent pathway, in short-term recovery)

> "I was in a relationship where my spouse had a healthy relationship with alcohol, and so it just kind of faded away. It's just like I got older, I got more mature."
> — Floyd (cisgender man, assisted pathway, in very long-term recovery)

*Theme — health as the driver, with no decision moment:*
> "I was having headaches every single day, which then got worse with body pain and a lot of other symptoms and stuff. I didn't want to do anything that would make me feel worse … I guess I could say that I was focused on health and trying to improve my health in any way that I could … I didn't really decide I'm not going to drink. It was more that I'd have a couple drinks and realise it wasn't worth it."
> — Heather (cisgender woman, independent pathway, in short-term recovery)

> "I drink a little bit of wine with my daughter once in a while … but with the MS [multiple sclerosis] I can't even imagine drinking what I used to drink."
> — Gail (cisgender woman, independent pathway, in very long-term recovery)

*Theme — tolerance drifting down over years:*
> "at one point in my life, fishbowl margaritas would have been ideal, then you would switch to maybe two jumbos, and then later maybe just a single jumbo, to then a large, or medium and small, and then to where you are today, where a sip is probably all I can tolerate."
> — Virgil (cisgender man, independent pathway, in very long-term recovery)

*Theme — when moderation failed:*
> Martin (cisgender man, assisted pathway, in very long-term recovery) was abstinent ~4 years until offered a free drink at a darts bar; this triggered a six-day episode going from "one beer … to two cases." Afterwards he "decided that the people in AA knew what they were talking about, that I must be an alcoholic, so I stopped again. I haven't had a drink since."

> "I thought that I had been off of it long enough that I would have been okay to drink a few drinks here and there, … and clearly that wasn't the case."
> — Veronica (cisgender woman, independent pathway, in short-term recovery), after resuming drinking at 10 months and having a panic attack

---

## 2A. Natural recovery from illicit drugs

The alcohol literature dominates this field. The drug literature is smaller but contains the two hardest pieces of evidence in the whole corpus.

### 2A.1 Hall & Weier (2017) — Robins' Vietnam veterans, the natural experiment [FULL TEXT]
*Addiction classics: Lee Robins' study of heroin use among US Vietnam Veterans.* *Addiction*. doi:10.1111/add.13584
Open-access author manuscript: https://kclpure.kcl.ac.uk/ws/portalfiles/portal/61077174/Addiction_classics_Robins_preprint.pdf

Design as described: random sample of 450 enlisted men returning September 1971 plus 450 who screened opiate-positive; interviewed 8–12 months after return; 95% interviewed, 92% gave urine; 3-year follow-up of a subset with a matched non-Vietnam control group.

Verbatim:
> "Just under half (43%) of the random sample of veterans reported opiate use in Vietnam in the year before the study (38% used opium and 34% heroin)"

> "Around 20% (46% of those who used an opiate in Vietnam) used heroin often enough and for long enough to experience symptoms of opiate withdrawal (e.g. sweats, irritability, trouble sleeping) for two days or more"

> "Only 10% reported any heroin use, 2% reported using heroin more than weekly for more than a month, and just under 1% reported becoming re-addicted (a rate confirmed by urinalysis). This remained the case in the subsequent 2 years: only 2% were re-addicted at follow up (although 5% had been addicted at some point in three years)"

> "It was not for lack of opportunity: most veterans reported that heroin was easy to get where they lived and a tenth had tried heroin after they returned. The main reasons for not using were a fear of becoming addicted, experiencing adverse health effects, being arrested, and the strong disapproval of friends and family"

Against the clinical orthodoxy of the time, verbatim:
> "They also clashed with the dominant clinical view that heroin addiction was a chronic and intractable disorder. The latter view was derived from follow up studies in the USA which showed that more than 90% of treated heroin addicts relapsed to heroin use within a year"

**The mechanism is setting, not person.** Verbatim:
> "Heroin was available but purity was less than 10% in the USA as against 90% in Vietnam. Its price was much higher in the USA, namely, $20 for a street bag of 10% purity as against $6 a day in Vietnam for pure heroin. Injection was the most efficient way to use heroin in the USA."

Robins' own framing, as quoted by Hall & Weier:
> "an opportunity to learn what happens when first exposure to heroin occurs in a foreign and for many a frightening setting, without the deterrents of high prices, impure drugs, or the presence of a disapproving family"

> ⚠️ **Substitution warning — highly relevant to a single-vice product.** Verbatim:
> "After the veterans' return to the USA, heavy drinking and alcohol-related problems increased as heroin use declined and heavy drinking increased among veterans who had used heroin in Vietnam"
> "Three years after their return alcohol abuse was a major problem for over a third of veterans, especially among those who had used heroin in Vietnam"

**Same men. Same drug. Different price, purity, legality and social surroundings. 20% withdrawal-symptomatic in Vietnam; under 1% re-addicted at home.** This is the strongest available evidence that environment does more work than disposition.

---

### 2A.2 Heyman (2013) — *Quitting Drugs: Quantitative and Qualitative Features* [FULL TEXT]
*Annual Review of Clinical Psychology* 9:29–59. doi:10.1146/annurev-clinpsy-032511-143041
Author PDF: https://geneheyman.com/wordpress/wp-content/uploads/2013/11/HeymanAnnRevClinPsych13QuitDrugs.pdf

Review of the ECA, NCS and NESARC epidemiological surveys. The densest source of numbers that cut against standard recovery messaging.

**Remission is the norm, and fast for illicit drugs.** Verbatim:
> "half of those ever addicted to cocaine had quit using this drug at clinically significant levels by year 4, and the half-life for marijuana dependence was six years. In contrast, alcohol and cigarette dependence had much longer half-lives. For alcohol, the 50% remission mark was not reached until year 16, and for cigarettes, it took on average 30 years"

> "two-thirds of those ever dependent on cocaine no longer met the symptoms for dependence by year 7, but it took 27 years to reach the two-thirds threshold for alcoholics and 49 years to reach the two-thirds mark for cigarette smokers"

> "The NESARC project (Lopez-Quintero et al. 2011) found that among those addicted to cocaine, 27% had remitted after two years, 51% had remitted after four years, and 76% had remitted after nine years. For marijuana, 55% had remitted by six years, and 75% had remitted by twelve years. Since the typical onset age for dependence is 20, most addicts were no longer using drugs at clinically significant levels by age 30."

> "The results do not support the often heard claim that addiction is a chronic, relapsing disease. Indeed, addiction proved to be the psychiatric disorder with the highest, not the lowest, remission rate."

**Treatment is not necessary.** Verbatim:
> "no more that 16% of those who currently met the criteria for addiction were in treatment" *(NESARC, treatment defined broadly to include 12-step, religious counselling, detox, methadone, halfway house, ER care)*

> "Of those who met the criteria for opiate dependence at departure from Vietnam, 6% reported that they had been in treatment. Their one-year relapse rate was nearly 70%. For the 94% that did not seek treatment, the relapse rate was less than 12%"

> "Thus, it is fair to say that treatment is not a necessary condition for remission from drug dependence."

> ⚠️ Read that Vietnam treatment/no-treatment split as **severity selection**, not as evidence that treatment harms. But note the direction is the opposite of the messaging.

**Duration of use does not predict this year's odds of quitting.** Verbatim:
> "For each drug, the proportion of addicts who quit each year was approximately constant. This means that the likelihood of remitting was independent of years of dependence."

> "Winick's maturing-out theory was not supported by the results. Maturing out implies that the likelihood of quitting increases with age. This did not happen. Remission rates remained constant. Thus, the title of his article notwithstanding, Winick did not get the psychological dynamics of remitting right."

Heyman quoting Vaillant's 20-year Lexington follow-up to the same effect:
> "stable abstinence can be achieved at any point in an addict's career … whether an addict was addicted for one year or ten years did not appear to affect the odds that he would become abstinent over the next five years"

**But the long tail is real.** Verbatim:
> "Among those dependent on cocaine, half had remitted by four years, but 10% were dependent for at least 16 years, and 5% were dependent for at least 23 years. Similarly, although half of those dependent on marijuana remitted by year 7, 10% remained dependent for at least 23 years, and 5% remained dependent for at least 36 years."

**Who stays stuck is a question of social position, not a distinct pathology.** Verbatim:
> "when the multivariate model included marital status and completion of high school, the ethnic/racial differences disappeared; they were no longer significant correlates of remission"

> "There is not a subset of voluntary addicts who stay remitted and another subset of compulsive addicts who keep relapsing."

---

### 2A.3 Lopez-Quintero et al. (2011) — lifetime remission probabilities [ABSTRACT ONLY]
*Addiction* 106(3):657–669. PMID 21077975 / PMC3227547

Lifetime remission probabilities: **nicotine 83.7%, alcohol 90.6%, cannabis 97.2%, cocaine 99.2%.** Median time to remission ranged from ~5 years (cocaine) to 26 years (nicotine). Males, Black respondents, and people with personality disorders or comorbid substance use had lower remission across at least two substances.

---

### 2A.4 Hodgins & Stea (2018) — cannabis, natural vs treatment-assisted recovery [FULL TEXT]
*Insights from individuals successfully recovered from cannabis use disorder: natural versus treatment-assisted recoveries and abstinent versus moderated outcomes.*
*Addiction Science & Clinical Practice* 13:16. doi:10.1186/s13722-018-0118-0
https://pmc.ncbi.nlm.nih.gov/articles/PMC6065061/ — open access (CC BY)

**Sample:** 119 community volunteers recruited by media ads, meeting lifetime but not past-year DSM cannabis use disorder (CIDI-verified). 30% female; mean age 37.3; mean CUD onset age 20.0; **median 5 years of recovery. 45% treatment-assisted, 55% natural recovery. 57% abstinent, 43% continuing non-problematic use.**

**Perceived cause of recovery success, natural recovery (NR) vs treatment-assisted (TAR):**

| Attribution | NR | TAR |
|---|---|---|
| Focused on reasons for change | **47.0%** | 22.6% (χ²=7.5, p<.01) |
| Will power | **15.2%** | 3.8% |
| Lost enjoyment / lifestyle change | **13.6%** | 1.9% |
| Treatment / self-help | 4.5% | **24.5%** (χ²=10.1, p<.001 — the only comparison surviving Bonferroni) |
| Conquered underlying issues | 0.0% | 11.3% |
| Religious/spiritual guidance | 12.1% | 13.2% (no difference) |

Whole-sample attributions: focused on reasons for change 36.1%; goal commitment 31.9%; conquered denial/self-deception 25.2%.

**Advice they would give someone else:** seek help / social support **16.7% NR vs 64.2% TAR** (χ²=28.2, p<.001, survives correction); reflect on reasons for change 33.3% NR vs 17.0% TAR; engage in hobbies / distracting activities 33.3% NR vs 15.1% TAR; stimulus control / avoidance / change social environment 28.8% NR vs 13.2% TAR.

**Recommendations:** professional treatment 79.1%; self-help materials 76.9%; **natural recovery 53.2% overall (72.9% of NR vs 30.0% of TAR)**. Quit entirely 48.7%; "depends on the person" 24.4%; reduce/cut back 19.3%.

Verbatim:
> "The treatment-assisted and abstinence groups exhibited higher levels of lifetime severity of cannabis problems than the natural and moderation groups. This association between severity of problem and recovery pathways has been found for other addictive behaviours including alcohol, heroin, and gambling."

> "despite the different pathways to recovery, the motivators and processes of recovery were mostly similar for the different groups"

Their summary of Ellingstad's cannabis natural-recovery study (**this is a quote of Hodgins & Stea, not of Ellingstad**):
> "The major reasons described for resolving their problem were increasingly viewing cannabis as negative, experiencing more negative effects, and change being related to a broader lifestyle shift. Strategies cited as helpful in quitting included involvement in activities unrelated to cannabis use, avoidance of triggers to use, and lifestyle changes."

And of Cunningham et al.: *"The most common explanations included emotional maturation and taking on new roles and responsibilities."*

---

### 2A.5 Herbeck, Brecht, Christou & Lovinger (2014) — methamphetamine, treated vs untreated [FULL TEXT — raw-HTML verified]
*Predictors of Long-term Abstinence in Long-term Methamphetamine Users.* *Journal of Psychoactive Drugs* 46(3):215–225.
https://pmc.ncbi.nlm.nih.gov/articles/PMC4122259/ — open access

**Quote-alteration policy: none stated anywhere in the paper.** All eight checked quote substrings were verified present in the raw HTML, so nothing is invented — but there is no stated fidelity guarantee.

**Sample:** 20 long-term MA users at 8-year follow-up. **9 treatment (45%), 11 no-treatment (55%).** 65% male; 35% African American, 35% White, 25% Hispanic. Mean age 46.2; mean lifetime MA use 12.2 years; mean abstinence 7.0 years; 65% abstinent 4+ years.

**Participant quotes, no-treatment group** (descriptors as printed):

*Theme — children as the lever:*
> "My kids said they couldn't tolerate it… they said, 'Mom, you're gonna end up on the street. You're just looking like an old bag-lady.' … so I knew I needed to change. It wasn't easy"
> — No treatment, woman, age 54, White

> "Finally I made the decision to stop, that's because my kids were taken from me… I wasn't going to be able to get them back if I was unable to test clean… I failed a couple tests. Then finally…they told me they were gonna give my kids up for adoption… I just stopped. I can't explain it. It just—it seemed like I didn't have time to think about the drugs because I was too busy trying to think about how am I gonna get them back"
> — No treatment, woman, age 29, Latina

*Theme — non-judgmental acceptance, not confrontation:*
> "Well, I knew Fred from 1983… and he always supported me. I mean, he says, 'Oh… you shouldn't do that. That's not good for you.' I'm like, 'Oh, I know, I know, but you still like me, right?' He goes, 'Of course I do.' One thing about Fred, he was a straight man who was religious, but at the same time, he knew what I was into… and he accepted me for who I was… he was a rare bird"
> — No treatment, man, age 52, Multi-ethnic

*Theme — relocation:*
> "Getting away from everybody because everyone… that I hung out with at the time, everyone did it. Everyone either smoked crack, or they smoked meth, or they shot heroin, and I decided to leave the whole area… we ended up moving down to Texas, and down there, well, it turns out, it was around there everywhere too, but I didn't know anybody… I didn't want to get to know anybody just in case I go to their house one night, and they pull out a pipe"
> — No treatment, man, age 31, White

*Theme — mundane cognitive comparison, no crisis:*
> "I know it [MA] didn't help any, I mean intellectually, I knew that. When I stopped for a little bit and I noticed how… even if you aren't really happy… you still feel at least a little more level"
> — No treatment, man, age 46, White

*Theme — self-concept:*
> "I told myself, I said, 'I can do better… I'm pretty smart… this is not the way I want to live.'"
> — No treatment, woman, age 55, African American

*Theme — identity rebuilt through others' trust:*
> "I didn't like the life I had. I mean, I like my life now. I like the life that I'm building… I'm respected, which I don't know that I was before. People look at you, like your family members, they don't trust you…They don't know you. And all that, coming back slowly but surely as you replace all that other stuff with what people do remember they like about you or they can trust you or they do love you or whatever, it's great… you just make choices"
> — No treatment, man, age 41, African American

*Theme — the drug simply stopped working (reported ONLY in the no-treatment group):*
> "It wasn't the same effect anymore… it would be a really weird effect, paranoia… it wasn't the same feeling as when it first was… —once I would try to stop and do it again, it was kind of like, 'Ew, I don't really like this anymore.' It was like something that I just didn't want to continue doing"
> — No treatment, woman, age 30, Latina

*Theme — rejecting the addict label (ONLY in the no-treatment group):*
> "It wasn't like friends of mine that do it, and people that do it every day until their teeth are falling out. It never got in the way of work, although… at one point I was feeling too anxious and weird, and I told my boss that I had partied over the weekend. He goes, 'Yeah, go home, relax.'"
> — No treatment, man, age 52, Multi-ethnic

**Group differences:** treatment group averaged 9.1 facilitators, no-treatment 6.6. Higher in treatment: self-help/AA/NA 67% vs 9%; new coping strategies 67% vs 9%; building momentum over time 67% vs 18%; shame/guilt if relapsed 33% vs 0%. Higher in no-treatment: "never a serious problem / not addicted" 36% vs 0%; "MA no longer pleasurable" 27% vs 0%; relocation 27% vs 11%. Barriers: craving/addiction cited by 78% of treatment vs 36% of no-treatment; "desire to use for fun/excitement" 82% of no-treatment vs 44% of treatment. Overall: productive use of time was the most common facilitator (75%); external pressures (testing, jail, custody) 55%; physical health concerns 40%; mental health concerns 45%.

**Structural finding worth carrying forward:** initial abstinence was driven by *external* force (testing, custody, jail, moving); sustained abstinence was attributed to *internal* shifts plus filled time. **A two-stage model, not one turning point.**

---

### 2A.6 Boeri, Gibson & Boshears (2014) — social recovery from methamphetamine [FULL TEXT — raw-HTML verified]
*Conceptualizing Social Recovery: Recovery Routes of Methamphetamine Users.*
*Journal of Qualitative Criminal Justice & Criminology* 2(1):5–38. doi:10.21428/88de04a1.ce2a8386
https://pmc.ncbi.nlm.nih.gov/articles/PMC4283845/ — open access

**Quote-alteration policy, verbatim:** *"The audio-recorded interviews were transcribed verbatim and entered into NVivo."* All ten checked quote substrings verified present. → **Testimonial-safe.**

**Sample:** 50 former MA users (no use past 30 days; prior 6+ month cessation), Atlanta suburb, ethnographic interviews 2007–2008, grounded theory. 90% White, 64% male, mean age 32.5, mean first MA use age 20.4, mean cessation age 30.4. Routes non-exclusive: formal treatment 76%, 12-step 70%, **natural recovery 72%**.

Five strategies used across all routes: social support; goal-focus; avoidance; religious/spiritual experience; substitute drugs.

Authors' definition:
> "The process of acquiring the skills, resources, and networks needed that enhance people's ability to live in society without resorting to problematic substance use."

**Natural-recovery quotes** (descriptors as printed):

*Theme — someone gave them somewhere to be:*
> "Her house was a haven for lost children…It was a one-bedroom apartment, and I lived in the living room for about nine months because she knew that I needed somewhere to be."
> — 23-year-old white male

*Theme — conventional roles as the replacement:*
> "I can't speak for anybody else's reasons, but I'm back in school. I have a family that's supportive of me. I'm married."
> — 27-year-old female

> "I have no intention of ever using meth again…I'm going to school full time, I've got a boyfriend, and I work part time."
> — 19-year-old white female

*Theme — conditional-but-loving boundary, not shaming:*
> "And so I called my mom and I was like, 'Will you please come get me?' And she said, 'Only if you're completely done with those people and everything.'"
> — 22-year-old female

> "Really, my wife gave me a talk. She was about to leave, you know, and I really just had my son then, and I didn't want to lose my family."
> — 26-year-old white male

*Theme — avoidance / geography:*
> "You know, if I'm not around it, I'm not going to go looking for it anymore."
> — 48-year-old white male

> "I think that the only way that you can stop yourself…is either getting caught or moving far away where you don't know anybody."
> — 21-year-old female

> "I kind of just stopped hanging out with that whole crowd for a long time. I only hang out with one of the girls that I used to do it with, but I don't do it with her now."
> — 23-year-old white female

*Theme — spirituality, both directions:*
> "I asked God to put all my pain and sickness on that train and it was like it left me."
> — 43-year-old white male

> "I think it partly goes back to my religion. I believed more in myself and I don't look for a higher power to give me strength."
> — 33-year-old white male

*Theme — substitution, reported openly:*
> "In a lot of ways that was my sanity."
> — 23-year-old white male, on marijuana

> "It makes my stomach turn whenever I even think about it [methamphetamine use]...But with marijuana, it's like, it makes days better."
> — 19-year-old male

*Theme — drifting out of 12-step without relapsing:*
> "I went to AA after rehab, and I did that whole deal for a while, and then I fell out of it because the same thing anyone falls out of anything–you just don't care anymore."
> — 21-year-old white male

**The stable-recovery subgroup is the striking finding.** Of the 6 people with 5+ years of cessation, **all reached stability via natural recovery as their most recent route** (though 4 of 6 had prior formal treatment), and **only 2 of 6 were abstinent from all substances** — 3 drank moderately, 3 used cannabis occasionally, 5 smoked. The authors read non-problematic modulation as protective, not as pre-relapse. From the abstract:
> "The common strategies used for recovery from problematic methamphetamine use in all routes were social in nature and did not necessarily include cessation of all substances."

---

### 2A.7 Wyse (2018) — older former prisoners, "Sober Aged Reflection" [FULL TEXT — raw-HTML verified]
*Older former prisoners' pathways to sobriety.* *Alcoholism Treatment Quarterly* 36(1):32–53. doi:10.1080/07347324.2017.1355222
https://pmc.ncbi.nlm.nih.gov/articles/PMC5784447/ — free on PMC

**Quote-alteration policy, verbatim:** *"The open-ended portion of the interviews was digitally recorded and professionally transcribed verbatim. Completed documents were reviewed by the PI for accuracy."* Place names pseudonymised: *"'Easton' is a pseudonym for the large, Eastern U.S. city where the study was conducted."* → **Testimonial-safe.**

15 men aged 49–64 (mean 54.8), 93.3% Black non-Hispanic, mean 18.9 years of substance use, mean 63 months incarcerated. **No participant reported medication-assisted treatment; only a few reported any substance use treatment.** Two-wave semi-structured interviews.

Core construct: **Sober Aged Reflection** — forced sobriety (incarceration) plus older age plus mortality awareness. The men explicitly said earlier incarcerations at younger ages had *not* produced the same resolve. A maturing-out mechanism that is neither pharmacological nor treatment-based.

**Verified verbatim quotes** (fuller than earlier summariser renderings; re-extracted from raw HTML):

> "I was incarcerated... I got incarcerated and when I came out I never went back to it. Prison. ... because see, the thing is if I hadn't have gotten locked up I would have maybe been still in the street using. I might be dead or something like that. No, there's a positive side to the incarceration."
> — Samuel, 53, cocaine/crack

> "I was getting reacquainted back with a person I had lost for a long time, which was me"
> — Truls, 55, 30+ years crack/PCP/marijuana

> "I think this incarceration right here really helped me...Because it sent me...to look at things. See, my mother died in this incarceration and my brother died...like, three months apart...And I really looked at it for what it was. I couldn't be there. Everything I'm missing. For what? For nothing. For some bullshit! For you to spend three thousand dollars a week on drugs, which is crazy!"
> — Jacob, 50, 25+ years cocaine

> "This, I mean, I want to live. You know, drugs is like...it's just not what I want in the picture. Drugs is just not, it's not part of my life anymore. It really isn't because, like I say, I don't, I don't know how much longer I have to live. I do not know this."
> — Ray, 57, decades of crack

> "I wasted a lot of time in my life…I could have found happiness and kept it"
> — Richard, 59, heroin

*Theme — turning toward helping others:*
> "And once I got inside... I had that moment that I told you was just me, myself, and the truth. And I looked at me...I said...I know man is happiest when he bring happiness to another. And I've...studied Jesus, Mohammed, Buddha, Confucius, Hinduism, spirituality, meditations. So I just came to a point where I said in my life, I just want to help people."
> — Daniel, 56, who subsequently trained as a certified addiction counsellor

---

### 2A.8 Boeri, Sterk & Elifson (2008) — the inverse case: maturing *in* [FULL TEXT — raw-HTML verified]
*Reconceptualizing Early- and Late-Onset: A Life Course Analysis of Older Heroin Users.* *The Gerontologist* 48(5):637–645.
https://pmc.ncbi.nlm.nih.gov/articles/PMC3717518/ — open access

29 older heroin users aged 35–54 (mean 43); 16 early-onset (mean first use 19), 13 late-onset (mean first use 40); 48.3% female; 58.6% African American; Atlanta; retrospective life-history interviews.

Included because it undercuts "addiction is a disorder of youth" as a universal — it documents decades-long controlled use and onset at 40.

Quotes verified present in raw HTML; **the paper states no verbatim-transcription policy**, so treat fidelity as unguaranteed:
> "You can control this. All you gotta do is pay all your bills and shit first…that's having control"

> "I've gone through stages where I could deal with it or so it seemed, and down and out [when I] just couldn't seem to get it together...if you're going to be a junkie, you might as well be a junkie" — 52-year-old father

> "I'm also afraid because I don't know what would come of it. I don't know how the pain would be physically, mentally, or emotionally...I've never seen anyone detox. I've never done it myself, so it's like what would I expect?" — grandmother, late-onset

**Mechanism:** conventional social roles (parenthood, employment) enabled *control*; late-onset users who had lost or never acquired those roles lost control.

---

### 2A.9 Krowka & Aller (2025) — deliberate contrast case, a fully treated sample [FULL TEXT — raw-XML verified]
*Recovery From Heroin Addiction: A Qualitative Study.* *Public Health Nursing* 42(2):744–753. doi:10.1111/phn.13526
https://pmc.ncbi.nlm.nih.gov/articles/PMC11895412/ — open access

n=10 (7 men, 3 women), aged 24–45, all Caucasian, ≥12 months abstinent, heroin careers 1–14 years, 0–20 prior relapses, mean 7 different substances, **100% incarcerated at least twice, 80% court-ordered rehab, 100% attending 12-step weekly.** Overarching theme *"As normal as you can get."*

Quotes verified present in raw XML; **the paper states no quote-alteration policy anywhere**, so treat fidelity as unguaranteed:
> "I would stop for my mom, I would stop for my daughter...but I wasn't ready. Until I'm ready to do it for myself there's nothing anyone can do" — Rachel, 31

> "I have hundreds of sobriety dates and I'm telling you...99% of them I would've told you 'I'm done, I swear to God I'm done'" — Mike, 33

> "This is an on-going process. I don't get a cure for my addiction" — Jason, 37

> "I believe that full abstinence from everything is the only way. I don't think that you can safely use alcohol or marijuana and not go back" — Jason, 37

> "I don't know how to deal with emotions. I don't know how to live. All I ever knew how to do was work and get high" — Rachel, 31

**Use this deliberately.** The abstinence-absolutism and permanent-addict identity in this sample are the beliefs of a **court-mandated, 12-step-saturated population**, and they contradict what Hodgins & Stea's 43%-moderation cannabis sample and Boeri's stable-recovery meth sample actually *did*. Both samples are real. They are different populations, and the difference is largely structural coercion and severity, not insight.

---

## 3. What triggers resolution: turning points, dramatic and mundane

### 3.1 Sobell, Sobell, Toneatto & Leo (1993) — the controlled turning-point study [ABSTRACT ONLY]
*What triggers the resolution of alcohol problems without treatment?*
*Alcoholism: Clinical and Experimental Research*, 17:217–224. doi:10.1111/j.1530-0277.1993.tb00752.x
https://europepmc.org/article/MED/8488958

This is the most important single finding in the whole turning-point literature, and it is negative. Verbatim from abstract:

> "As a control for prevalence of life events, a control group of nonresolved, nontreated alcohol abusers were interviewed about events in a randomly selected year. Collaterals were interviewed for all subjects. **No life event or constellation of events was differentially associated with the resolutions across the three resolved groups or differentiated the resolved and nonresolved groups.**" *(emphasis added)*

> "Interviews with resolved subjects were qualitatively analyzed-the majority (57%) of recoveries were characterized as involving a 'cognitive evaluation' or appraisal of the pros and cons of drinking."

> "Spousal support was reported by the greatest number of resolved subjects as having helped them maintain their resolution."

> "The study also demonstrates the importance of using a control group, without which very different conclusions might have been drawn."

> ⚠️ **This is the loudest contradiction in the file.** Recovery memoirs and forums are saturated with dramatic turning-point narratives. Sobell et al. added the control group nobody else adds, and **the dramatic events happened just as often to the people who did not resolve.** The events are not the cause; they are ambient. What distinguished resolvers was a deliberative cognitive weighing (57%), which is a *process*, not an *event*. Anyone building a product should not wait for, engineer, or valorise a rock-bottom event.

---

### 3.2 Matzger, Kaskutas & Weisner (2005) — reasons that actually predict sustained remission [ABSTRACT ONLY]
*Reasons for drinking less and their relationship to sustained remission from problem drinking.*
*Addiction*, 100(11):1637–1646. doi:10.1111/j.1360-0443.2005.01203.x
https://europepmc.org/article/MED/16277625

n=659 problem drinkers (239 general population probability sample + 420 treatment admissions), followed 1/3/5 years. Verbatim:

> "While the treated sample endorsed a majority of reasons in significantly higher proportions than the general population sample, the same three reasons were significant for both groups in predicting sustained remission from problem drinking: hitting rock bottom, experiencing a traumatic event and undergoing a spiritual awakening."

> "**Interventions by medical personnel and family members were either non-significant predictors or significantly negatively related to sustained improvement** for both general population and treated problem drinkers." *(emphasis added)*

> ⚠️ **Two contradictions here at once.** (a) This study *does* find rock bottom predictive — squarely against §3.1. The difference: Sobell asked whether events *occurred* (with a control group); Matzger asked which self-reported *reasons* people endorsed and whether those endorsements predicted outcome. So the finding may be about how people narrate change rather than what causes it. **Flagging both and resolving neither is the honest position.** (b) Being talked to by a doctor or a family member predicted *worse* outcomes. That is the opposite of standard "have the conversation / stage an intervention" advice.

---

### 3.3 Blomqvist (1999) — treated vs. untreated, environment and attributions [ABSTRACT ONLY]
*Treated and untreated recovery from alcohol misuse: environmental influences and perceived reasons for change.*
*Substance Use & Misuse*, 34:1371–1406. doi:10.3109/10826089909029389
https://europepmc.org/article/MED/10446766

Verbatim from abstract:
> "It was found that both recovery, independent of help-seeking status, and help-seeking, independent of long-term outcome, were preceded by prolonged harmful drinking consequences and increasing negative stress."

> "Initial attempts to solve the drinking problem were followed by a significant reduction in life stress, but **stable recovery was uniquely associated with stability and/or major improvements in the life context.**" *(emphasis added)*

> "**Unassisted recovery was more often gradual in character and/or motivated by positive incentives than assisted recovery.**" *(emphasis added)*

**Two of the most product-relevant sentences in the corpus.** Unassisted change tends to be *gradual and pulled by positive incentives*, not abrupt and pushed by catastrophe. And what makes it stick is not the quit event but improvement in the surrounding life.

---

### 3.4 Bischof, Rumpf, Hapke, Meyer & John (2000) — maintenance factors, treated vs. untreated [ABSTRACT ONLY]
*Maintenance factors of recovery from alcohol dependence in treated and untreated individuals.*
*Alcoholism: Clinical and Experimental Research*, 24:1773–1777. doi:10.1111/j.1530-0277.2000.tb01980.x
https://europepmc.org/article/MED/10715007 (via title search)

93 natural remitters vs. 42 self-help group participants. Verbatim:
> "Logistic regression analysis that focused on maintenance factors showed that, independent from direct self-help group context, self-help group attendees informed more individuals about their former alcohol problems and sought social support more often as a coping strategy to deal with craving. No further group differences could be identified."

> "data support the assumption that **more commonalities than differences exist within successful recoveries from alcohol dependence, independent of help-seeking status**." *(emphasis added)*

**Only two differences survived: disclosure breadth, and using social support as a craving-coping strategy.** Both are things a product can offer without a meeting.

---

### 3.5 Bischof et al. (2002) — does the definition of "treatment" change the answer? [ABSTRACT ONLY]
*Remission from alcohol dependence without help: how restrictive should our definition of treatment be?*
*Journal of Studies on Alcohol*, 63:229–236. doi:10.15288/jsa.2002.63.229
https://europepmc.org/article/MED/12033700

Three samples: 103 who received *no* help; 75 who received *minor* help (≤9 self-help sessions or ≤3 counselling sessions); 50 regular self-help group participants.
> "On most triggering and maintenance factors of the remission, remitters from alcohol dependence who received minor help are comparable with remitters who received no help, and both groups differ significantly from regular self-help group participants."

**A few sessions is functionally self-change. Regular group attendance is a different animal.**

---

### 3.6 Bischof, Rumpf, Meyer, Hapke & John (2007) — subtypes and who relapses [ABSTRACT ONLY]
*Stability of subtypes of natural recovery from alcohol dependence after two years.*
*Addiction*, 102:904–908. doi:10.1111/j.1360-0443.2007.01834.x
https://europepmc.org/article/MED/17523984

Cohort of 178 initially untreated remitters (media-recruited), followed 24 months. Three clusters:
- **LPLS** — high severity of dependence, low alcohol-related problems, **low social support**
- **HPMS** — high severity, high alcohol-related problems, medium social support
- **LPHS** — high social support, late onset, low severity, low problems

Verbatim:
> "Differences between the cluster groups in social support diminished over time; however, even at follow-up, LPLS revealed less social support by friends when compared to LPHS and showed **significant higher rates of relapse and utilization of formal help** than did HPHS and LPHS." *(emphasis added)*

**Low social support is the discriminator for relapse among natural remitters — not severity of dependence.** Both the low-support and high-support clusters contained high-severity drinkers.

---

### 3.7 Pettersen, Landheim, Skeie, Biong, Brodahl, Benson & Davidson (2018) — why people with long SUD histories stop [FULL TEXT]
*Why Do Those With Long-Term Substance Use Disorders Stop Abusing Substances? A Qualitative Study.*
*Substance Abuse: Research and Treatment*, 12:1178221817752678. doi:10.1177/1178221817752678
https://pmc.ncbi.nlm.nih.gov/articles/PMC5808961/ — open access

18 participants, all diagnosed SUD, all abstinent ≥5 years. Norway. Peer consultants in long-term recovery co-designed the study.

Authors' summary, verbatim:
> "Participants recalled harmful consequences and significant events during their years of substance use. Pressure and concern from close family members were important in their initial efforts to abstain from substance use. Being able to imagine a different life, and the awareness of existing treatment options, promoted hope and further reinforced their motivation to quit."

**Participant quotes** (the paper does not attach demographic descriptors to quotes):

*Theme — accumulated exhaustion, not a single event:*
> "I just wasn't able to cope with things any more, and I felt totally devastated. I was very uncomfortable with myself and people close to me. I was so mentally worn-out. It took some years to reach such a state."

*Theme — a projected future self as the trigger:*
> "Eventually I became afraid to meet other people, and needed a few drinks in order to manage going to work. There was one time I imagined becoming one of the drunks frequenting the parks, and that just wasn't me. I had reached my point of no return."

*Theme — being able to imagine a different life:*
> "I had a wish to live a different life than what was captured by the substance use environment. I have good memories from my childhood, and I knew it was possible to live a decent life. I thought about sunny days. It was not a lot, but I remember that it is possible to do well. If you talk about a person not having a single good memory, then it becomes difficult. You ought to get into contact with such memories."

*Theme — planning for relapse against professional advice:*
> "I have thought since then that the actual decision was made rather suddenly. I made my choice about quitting substance use, but I also had in mind that I most certainly would relapse. My treatment providers strongly opposed this way of thinking. But by thinking this way I was able to put aside my feelings of shame by accepting that I would probably experience relapses later in life."

> ⚠️ **CONTRADICTS COMMON ADVICE, explicitly.** The participant's providers opposed planning for relapse. The participant credits exactly that stance with removing shame — and this person went on to ≥5 years abstinent.

*Theme — an unplanned micro-social moment as the hinge:*
> "I recall sitting in the waiting room at the detoxification unit, thinking 'Shall I really . . . or not?' There was a weak voice still very much in doubt about the decision. But next to me sat another guy having the same dilemma. We looked at each other, rather surprised. Then my thought was: 'He doesn't back away, so I won't either.' Actually, we had only five minutes of nonverbal contact, but that was important in order to stick to my decision."

*Theme — family as motive:*
> "The main reason to quit was in consideration of my two children. The oldest lived with her father at that time, and the younger one I volunteered to place in a foster home. I thought it should be temporary, and it was really a wish of mine to keep a good relationship with both of them."

> "I had disappointed my father so many times. He always picked me up when I had completed detoxification treatment. I remember I was motivated to show my dad that I could manage. But he died only 3 weeks after I started Methadone treatment. Unfortunately, I didn't make it back home on time. Some of my driving force was to please my father. I had a great wish that he could have been able to see me in sobriety, and not the listless and tired girl he had been used to seeing."

*Theme — the cost of the first ask for help:*
> "The first time asking for help was the real hard one. It felt like a defeat. The reason was that it was because of something I had inflicted on myself, but couldn't solve. But gradually help-seeking became less troublesome."

*Theme — disclosure by a professional as the unlock:*
> "I was so strongly attached to alcohol, and I experienced a despair in acknowledging that I had to stop drinking, and knowing at the same time that I couldn't manage to stop. But the psychotherapist I was seeing for my depression strongly advised me to seek substance use treatment. The reason I followed his advice, was that he told me his own story of former alcohol problems. We discovered together that I needed treatment."

---

### 3.8 Subhani, Talat, Knight, Morling, Jones, Aithal et al. (2022) — systematic review of alcohol recovery narratives [FULL TEXT — SUMMARISER]
*Characteristics of alcohol recovery narratives: Systematic review and narrative synthesis.*
*PLoS ONE*, 17(5):e0268034. doi:10.1371/journal.pone.0268034
https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0268034 — open access

**32 studies (29 qualitative, 3 mixed-methods), 1,055 participants, ages 17–82, 52.6% male.** Eight narrative dimensions identified: genre, identity, recovery setting, drinking trajectory, drinking behaviours/traits, stages, spirituality/religion, recovery experience.

On turning points, verbatim as the summariser returned it (⚠️ wording not XML-verified):
> "Turning points described by participants ranged from no specific event to near death experiences, embarrassment, spiritual experiences, a sense of loss, death of a family member, loss of a friend by suicide, and physical and mental health decline"

On drivers:
> recovery is motivated by "push factors (hitting rock bottom, shame, identity loss, alienation) and pull factors (the good life, the social relationships one wants to develop and starts to enjoy)"

On identity:
> "The individuals grow through identity renewal, identity construction and identity formation to often find sustainable recovery, sometimes finding themselves in a role to help others struggling with addiction"

Note the review explicitly lists *natural recovery, emancipation, discovery, mastery, coping* as the outside-treatment narrative settings — which is the Mellor et al. (2021) typology (see §3.9).

**Note the very first item in the turning-point list: "no specific event."** A systematic review of 32 studies puts "nothing in particular happened" on the same list as near-death experiences.

---

### 3.9 Mellor, Lancaster & Ritter (2021) — four narratives of untreated recovery [ABSTRACT ONLY]
*Recovery from alcohol problems in the absence of treatment: a qualitative narrative analysis.*
*Addiction*, 116(6):1413–1423. doi:10.1111/add.15288
https://pubmed.ncbi.nlm.nih.gov/33037842/ — **paywalled; abstract only**
Record also at https://researchportal.bath.ac.uk/en/publications/recovery-from-alcohol-problems-in-the-absence-of-treatment-a-qual/

12 Australian participants who resolved alcohol disorders without formal treatment; life-history interviews, narrative analysis. Four recovery narratives:
- **emancipation** — separating from oppressive circumstances
- **discovery** — identity through art / consciousness-expanding experiences
- **mastery** — individual problem-solving
- **coping** — managing continuous struggles

The published abstract states: *"Recovery from alcohol problems in the absence of treatment or mutual-aid is very common, but under-researched."*

⚠️ **No participant quotes are reproduced here — I could not access the full text.** The typology above is reported in the abstract/record and is independently corroborated by Subhani et al. (§3.8), which lists the same four labels.

---

## 4. Maturing out and life-course events

### 4.1 Lee & Sher (2018) — *"Maturing Out" of Binge and Problem Drinking* [FULL TEXT]
*Alcohol Research: Current Reviews*, 39(1):31–42.
https://pmc.ncbi.nlm.nih.gov/articles/PMC6104962/ — open access

Verbatim from abstract:
> "Whereas most existing literature on maturing out emphasizes contextual effects of transitions into adult roles and responsibilities, this article also reviews recent work demonstrating further effects of young adult personality maturation."

> "As possible mechanisms of naturally occurring desistance, these processes could inform both public health and clinical interventions aimed at spurring similar types of drinking-related behavior change."

> "This article also draws attention to evidence that the normative trend of age-related reductions in problem drinking extends well beyond young adulthood."

**Note the second mechanism.** Maturing out is *not* only about acquiring a spouse/job/child. Personality maturation (declining impulsivity, rising conscientiousness) contributes independently. That is a mechanism a product can plausibly work with; marriage is not.

### 4.2 Vergés et al. (2013) — the study that dismantles the standard maturing-out story [FULL TEXT]
*Refining the Notion of Maturing Out: Results From the National Epidemiologic Survey on Alcohol and Related Conditions.*
*American Journal of Public Health* 103(12):e67–e73.
https://pmc.ncbi.nlm.nih.gov/articles/PMC3828971/ — open access

NESARC Waves 1 (n=43,093) and 2 (n=34,653), 3-year follow-up; multinomial logistic regression decomposing Wave-2 drug use disorder into **persistence (n=208), new onset (n=349), recurrence (n=191)**.

- **Persistence did not vary with age** — Wald F₅,₆₅ = 0.29, P = .92
- New onset decreased sharply with age — F₅,₆₅ = 63.44, P < .001
- Recurrence decreased with age — F₅,₆₅ = 3.30, P < .05

Verbatim:
> "The decrease in drug use disorders with age is not attributable to relatively lower rates of persistence in younger cohorts."

On role transitions (marriage, parenthood, employment), verbatim:
> "the effect of these role transitions is not necessarily stronger in young adulthood. Rather, the identified associations involving these transitions tended to be stable across the life span."

> ⚠️ **Read §4.1, §4.2 and §2A.2 together and the popular account of maturing out collapses.** Drug use disorder prevalence falls with age mainly because **fewer people start or restart**, not because older people break out at higher rates (Vergés). Quit probability is roughly flat over years of dependence (Heyman; Vaillant). Winick was right that treatment isn't required and wrong about the mechanism (Heyman, explicitly). **Neither "you'll grow out of it" nor "it gets harder the longer you've used" survives contact with the data.** What does survive: role transitions matter, and they matter *at every age*, not only in your twenties (Vergés; Lee & Sher on personality maturation).

### 4.3 Related maturing-out studies located but not fetched [UNVERIFIED — reference only]
- Lee MR et al. (2015), *Role transitions and young adult maturing out of heavy drinking: evidence for larger effects of marriage…*, PMID 26009967
- Lee MR et al. (2015), *Integrating Social-Contextual and Intrapersonal Mechanisms of "Maturing Out"…*, PMID 26247314
- Lee MR et al. (2013), *Maturing out of alcohol involvement: transitions in latent drinking statuses…*, PMID 24229554

Nothing is quoted from these.

---

## 4A. Recovery capital: what resources actually predict unassisted success

### 4A.1 The primary sources are unobtainable — state of access [ABSTRACT ONLY]

Two independent search tracks attempted these and neither obtained a full text. **No participant quotes exist in this document from any Granfield & Cloud paper.** Publisher abstracts, verbatim:

**Granfield R & Cloud W (1996).** *The Elephant That No One Sees: Natural Recovery among Middle-Class Addicts.* *Journal of Drug Issues* 26(1):45–61. doi:10.1177/002204269602600104 — **CLOSED**
> "This paper examines the characteristics of middle-class alcoholics and drug addicts who terminate their addictions without the benefit of treatment. Using what is commonly referred to as 'natural recovery' processes, respondents terminated their addictions without formal treatment or self-help group assistance. Data for this study are based on in-depth interviews with 46 alcoholics and drug addicts who were identified through snowball sampling techniques. First, we examine the postaddict identities of our respondents to see how they view themselves in relation to their addictive past. Next, we explore the reasons respondents gave for avoiding treatment and self-help groups. We then examine the factors in our respondents' lives that promoted natural recovery…"

**Granfield R & Cloud W (2001).** *Social Context and "Natural Recovery": The Role of Social Capital in the Resolution of Drug-Associated Problems.* *Substance Use & Misuse* 36(11):1543–1570. doi:10.1081/JA-100106963 — **CLOSED**
> "Using data collected from in-depth interviews with 46 former alcohol- and drug-dependent persons, this paper examines how the social capital that these respondents had accumulated prior to their addiction and maintained during it aided in their recovery without treatment."

**Cloud W & Granfield R (2008).** *Conceptualizing Recovery Capital: Expansion of a Theoretical Construct.* *Substance Use & Misuse* 43(12–13):1971–1986. doi:10.1080/10826080802289762 — **CLOSED**
> "In this paper we reveal the relationship between access to large amounts of recovery capital and substance misuse maintenance and introduce the concept of negative recovery capital. In doing so, we examine the relationships between negative recovery capital and gender, age, health, mental health, and incarceration."

> ⚠️ **Note the under-cited claim in that last abstract.** Cloud & Granfield's own point is that **high recovery capital can also sustain misuse** — money, status and social insulation let people keep using without consequence. That is the construct's authors saying it, not a critic.

**Best target for a follow-up attempt:** Cloud W & Granfield R (1994), *Terminating Addiction Naturally: Post-Addict Identity and the Avoidance of Treatment*, *Clinical Sociology Review* 12(1), Article 13 — https://digitalcommons.wayne.edu/csr/vol12/iss1/13/. Nominally open access (n=25, in-depth interviews, post-addict identity + reasons for avoiding treatment). **The PDF is behind an AWS WAF challenge; curl gets a JS challenge and fetch gets 403. Worth one retry with a real browser.** This is the likeliest source of genuine Granfield & Cloud participant quotes.

---

### 4A.2 De Meyer, Zerrouk, De Ruysscher & Vanderplasschen (2024) — Flanders Life in Recovery [FULL TEXT]
*Exploring indicators of natural recovery from alcohol and drug use problems: findings from the life in recovery survey in Flanders.*
*Substance Abuse Treatment, Prevention, and Policy* 19:22. doi:10.1186/s13011-024-00604-y
https://pmc.ncbi.nlm.nih.gov/articles/PMC11015601/ — open access (CC BY)

**This is the closest thing in the literature to a direct test of "what predicts unassisted success."**

**Sample:** 343 people in recovery ≥3 months, Flanders; **52 (15%) natural recovery, 291 treatment-assisted.** Mean age 47.7. Primary substances: alcohol 66%, cocaine 10%, amphetamines 9%, cannabis 8%.

**Multivariate predictors of natural recovery (Model 1):**
- Higher education **OR 2.42** (95% CI 1.24–4.83, p=.01) — 56% of NR had university/college vs 38% of treatment group
- Lower Severity of Dependence Scale score **OR 0.42** (p<.001) — NR mean SDS 7.75 (SD 3.13) vs 9.95 (SD 2.63)
- **Cannabis vs alcohol as primary substance OR 4.67** (95% CI 1.50–14.47, p=.007)
- Shorter problem duration — 10.1 years NR vs 13.5 years treatment (p=.004)
- Later age of first use — 18.02 NR vs 15.92 treatment

**Model 2 — the load-bearing finding.** Adding cumulative barriers and strengths:
- Cumulative **barriers** strongly predicted *not* recovering naturally: **OR 0.26 (95% CI 0.14–0.47, p<.001)**. One SD more barriers dropped P(natural recovery) from 0.14 to 0.04.
- **Strengths were not significant (p=.74).**
- Bivariately both differed (strengths 9.29 vs 7.88, p=.007; barriers 3.83 vs 6.22, p<.001) — **only barriers survived adjustment.**
- Individual barriers that mattered: untreated emotional/mental health problems; driver's licence revoked; damaged property.

Verbatim:
> "Higher education level, lower severity of dependence, and cannabis use as the main problem substance (vs. alcohol) were statistically significant (p < 0.05) correlates of NR."

> "When scores for the number of barriers and strengths associated with active addiction were added, barriers (but not strengths) were significantly associated with NR."

**Why the 52 didn't use treatment (Table 5):** treatment not necessary 33 (63%) — of which problem not severe enough 7 (13%), strong character 5 (10%), changing/enabling life circumstances 4 (8%), enough other recovery resources 3 (6%). **Treatment barriers 17 (33%)** — stigma 9 (17%), available treatment doesn't fit me 4 (8%), bad experiences 3 (6%), practical concerns 3 (6%), lack of knowledge 2 (4%). Motivation to prove something to self 5 (10%).

Verbatim:
> "The most reported reason for not entering treatment was not experiencing any need to do so."

> ⚠️ **Two things a product should take from this.**
> (1) **Removing obstacles beats stacking assets.** Strengths didn't discriminate; barriers did, hard. The natural-recovery population is not defined by having more grit — it is defined by having accumulated fewer wrecked things.
> (2) **A third of the self-change population was pushed out, not opted out** — stigma at 17% is the single largest named barrier. These people wanted help and did not get it.

---

### 4A.3 Tucker, Cheong, James et al. (2020) — which severity profiles can moderate unassisted [ABSTRACT ONLY]
*Preresolution Drinking Problem Severity Profiles Associated with Stable Moderation Outcomes of Natural Recovery Attempts.*
*Alcoholism: Clinical and Experimental Research* 44(3):738–745. doi:10.1111/acer.14285 — PMC8101020, not OA

N=616 community-dwelling problem drinkers "enrolled soon after stopping alcohol misuse **without treatment**," followed prospectively for a year, pooling five studies. Latent profile analysis gave four profiles, verbatim:
> "(i) global low risk on all indicators, (ii) global high risk on all indicators, (iii) high risk limited to drinking practices only, and (iv) high risk limited to alcohol dependence and alcohol-related problems only. Outcomes differed by profile membership (p < 0.01)… the global low risk and heavy drinking risk only profiles were associated with stable moderation during the 1-year follow-up. The high dependence and alcohol problems risk profile was associated with both abstinence and relapse during the follow-up (ps < 0.05)."

**Translation: heavy drinking alone does not rule out unassisted moderation. Dependence symptoms plus accumulated life problems do.** This is the same shape as De Meyer's barriers finding, arrived at prospectively and independently.

Companion — Tucker, Roth & Vignolo (2009), *J Consult Clin Psychol* 77(2):219–228 [ABSTRACT ONLY]: a behavioural-economic "Alcohol-Savings Discretionary Expenditure" index (preresolution money spent on alcohol vs saved for the future) predicted outcome — *"increases on this… index predicted higher rates of abstinence (OR = 1.93, p = .004) and relapse (OR = 2.89, p < .0001) compared with moderation outcomes."*

---

### 4A.4 Groshkova, Best & White (2013) — the Assessment of Recovery Capital [FULL TEXT]
*The Assessment of Recovery Capital: properties and psychometrics of a measure of addiction recovery strengths.*
*Drug and Alcohol Review* 32(2):187–194. doi:10.1111/j.1465-3362.2012.00489.x

**The construct definition, as quoted inside this paper — this is a verified secondary quotation of Cloud & Granfield:**
> "Cloud and Granfield [17] have defined recovery capital as 'the breadth and depth of internal and external resources that can be drawn upon to initiate and sustain recovery from AOD [alcohol and other drug] problems'."

**Instrument:** 50 items, 10 domains × 5 items — substance use and sobriety; global psychological health; global physical health; citizenship and community involvement; social support; meaningful activities; housing and safety; risk-taking; coping and life functioning; recovery experience.

**Samples:** 142 in community rehab services (Scotland), n=45 retest subsample; 176 in recovery groups/communities (England).

**Psychometrics:** total ARC 1-week test–retest ICC 0.61 [0.35–0.75]. Single factor, 57% of variance. Convergent with WHOQOL-BREF: physical r=0.83, psychological r=0.84, social r=0.69, environmental r=0.82.

**Discrimination:** verbatim —
> "The estimated ROC curve had an AUC of 0.890 (95% CI 0.84–0.94)… the optimal cut-off level yielding maximal SN and SP for predicting stable recovery was an ARC score of 27.5 (SN = 92%; SP = 69%, at J = 0.61)."

> ⚠️ **Do not oversell this.** "Stable recovery" here is self-reported ≥5 years, measured cross-sectionally. **This is concurrent discrimination, not prospective prediction.**

---

### 4A.5 Best & Hennessy (2022) — the field's own verdict on recovery capital [FULL TEXT]
*The science of recovery capital: where do we go from here?* *Addiction* 117(4):1139–1145. doi:10.1111/add.15732

Verbatim:
> "RC is based on an ecological model referring to all the internal and external resources which a person can access in support of their recovery process (2–5). Recently, RC has been defined as the 'resources and capacities that enable growth and human flourishing' (6), an asset-based definition that focuses on an individual's strengths."

⚠️ **That first sentence is Best & Hennessy's own paraphrase with citations appended — it is NOT a quotation of Granfield & Cloud.** A summariser misattributed it during compilation; the error is recorded here so it does not propagate.

On negative recovery capital, verbatim:
> "Scholars also disagree on the valence of RC. Some have conceptualized it as solely positive (resource-driven) and thus on a summative scale while Cloud and Granfield (5) and others, suggest a continuum with the presence of negative RC. From a purely etymological perspective, 'recovery barriers' rather than 'negative recovery capital' would be a more appropriate term to use…"

The critical limitation, verbatim:
> "Despite burgeoning empirical work on RC, its application and translation has been unsystematic. The field currently relies on self-report questionnaires for the development of the theory and quantification of [RC]."

And on the REC-CAP specifically: *"has yet to provide evidence of predictive validity."*

Declared conflict of interest worth knowing: *"DB is a director of the Recovery Outcomes Institute (Florida, USA) who have a version of the REC-CAP tool… which is being sold in Canada and in parts of the US."*

> ⚠️ **Bottom line on recovery capital.** It is a useful organising idea with a thin evidence base. **No study found in this compilation demonstrates that recovery capital prospectively predicts unassisted success specifically.** De Meyer 2024 is the closest and it is cross-sectional and retrospective — and its own answer is that the *absence of barriers*, not the presence of strengths, is what discriminates. Treat "build your recovery capital" as a plausible frame, not an evidenced intervention.

---

## 5. Identity: does "being in recovery" help?

### 5.1 Kelly, Abry, Milligan, Bergman & Hoeppner (2018) — recovery identity in the US [ABSTRACT ONLY]
*On being "in recovery": A national study of prevalence and correlates of adopting or not adopting a recovery identity among individuals resolving drug and alcohol problems.*
*Psychology of Addictive Behaviors*, 32:595–604. doi:10.1037/adb0000386
https://europepmc.org/article/MED/30070538

n=39,809 screened; n=1,995 resolving an AOD problem. Verbatim:
> "The proportion of individuals currently identifying as being in recovery was 45.1%, never in recovery 39.5%, and no longer in recovery 15.4%."

> "Predictors of identifying as being in recovery included formal treatment and mutual-help participation, and history of being diagnosed with AOD or other psychiatric disorders."

> "Qualitative analyses regarding reasons for no/prior recovery identity found themes related to low AOD problem severity, viewing the problem as resolved, or having little difficulty of stopping."

> "**These appear to be individuals who have not engaged with the formal or informal treatment systems.** To attract, engage, and accommodate this large number of individuals who add considerably to the AOD-related global burden of disease, AOD public health communication efforts may need to consider additional concepts and terminology beyond recovery (e.g., 'problem resolution') to meet a broader range of preferences, perspectives and experiences." *(emphasis added)*

### 5.2 Day, Manitsa, Farley & Kelly (2023) — recovery identity in the UK [ABSTRACT ONLY]
*A UK national study of prevalence and correlates of adopting or not adopting a recovery identity among individuals who have overcome a drug or alcohol problem.*
*Substance Abuse Treatment, Prevention, and Policy*, 18:68. doi:10.1186/s13011-023-00579-2
https://pmc.ncbi.nlm.nih.gov/articles/PMC10657010/ — open access

n=1,373. Verbatim:
> "The proportion of individuals currently identifying as being in recovery was 52.4%, never in recovery 28.6%, and no longer in recovery 19.0%."

> "These are most likely to be individuals with less significant histories of impairment secondary to AOD and who have not engaged with formal or informal treatment systems. The understanding of the term recovery in this UK population did not completely align with abstinence from alcohol or drugs."

> ⚠️ **Product-critical.** Between 28% and 40% of people who resolved a substance problem have **never** identified as "in recovery," and 15–19% have *stopped* identifying that way. Adding those together, roughly **half the target population rejects the recovery-identity frame**, and the half that rejects it is disproportionately the untreated, self-change half — i.e. exactly the population a self-serve product reaches. Two national studies on two continents agree, and both authors independently recommend alternative language ("problem resolution").

Corroborating datapoint from §2.1: among the 65 untreated AUD resolvers, only **15.8%** of the fully independent subgroup used a recovery label, vs. 51.9% of those who had attended mutual-help groups.

Day 2023 odds ratios (currently in recovery vs never in recovery): abstinent 2.37 [1.81–3.10]; diagnosed AUD/DUD 4.46 [3.04–6.50]; used recovery support services 6.72 [4.30–10.51]; formal treatment 3.63 [2.67–4.94]; mutual-help 3.16 [2.35–4.25]; B-ARC recovery capital 1.35 [1.16–1.57].

Verbatim conclusion:
> "Many individuals who report resolving a significant AOD problem do not identify as being 'in recovery', but those with the most significant problems are more likely to do so. Recovery is associated with abstinence, but many individuals who have controlled rather than stopped their AOD use also see themselves as in recovery. Individuals who do not use recovery as a self-label are less likely to engage with treatment services, and so may require novel strategies to reach, and subsequently help sustain, their positive gains over time."

---

### 5.3 Day 2023, the free-text responses — why people reject the label [FULL TEXT]
Same study as §5.2. Table 3 of the paper prints these under the column header **"Verbatim quotes"** — free-text survey responses from UK adults who report having overcome an alcohol or drug problem. **These are among the cleanest quotes in this entire document** for exactly the population a self-serve product serves.

*Theme — never adopted a recovery identity: "ability to stop" (27.8% of the never-in-recovery group):*
> "I just got to a point where I didn't want to continue with it so removed myself from the environment."

> "I found a way to change my behaviour by acknowledging that the previous attitude was problematic."

> "I just really liked it but couldn't afford it, so I stopped."

*Theme — continued non-problematic use (25.8%):*
> "I still consume alcohol, but I can control it but not stop."

> "Because I still use these things now and again but not to extremes and not every single day."

*Theme — low severity (20.8%):*
> "I wouldn't really say my problems were severe enough to consider myself an addict and thus I wouldn't say I'm in recovery."

> "…cannabis isn't addictive and once I had things to fill my time with such as university, I didn't need it anymore."

> "I stopped when I saw habitual problems arising. I never got to a place of true addiction."

*Theme — rejection of the label itself (13.7%):*
> "Never identified with that language."

> "I don't agree with the recovery rhetoric."

> "Because I don't see addiction as a disease to be treated but as a behaviour."

> "I don't like the term 'recovery' as if I had some injury, just changing a mindset on drinking habits."

*Theme — matured out (9.4%):*
> "My life moved on. I changed the people I hung out with so stopped taking drugs. It wasn't a particular decision."

> "Once I became pregnant none of these lifestyle choices were appropriate."

*Theme — dropped the label later: "resolved" (56.6% of the no-longer-in-recovery group):*
> "I am fully recovered. I am totally free in mind body and spirit from the addictions I once had. I know with absolute certainty that I will never use drugs again."

> "I've overcome the problem."

*Theme — dropped the label, active rejection (2.0%) — **the single most product-relevant quote in this document**:*
> "I feel that the 'addict' label and being 'in recovery' are somewhat counterproductive past a certain point. I had a problem, and I overcame it. I prefer not to have my entire life dominated by that."

> "It isn't clear what this means. I have recovered and that's that."

*Theme — non-problematic continued use after dropping the label (13.8%):*
> "I believe I've moved past it, and now have a healthy relationship with alcohol (e.g., drinking very occasionally, being able to stop at one drink)."

> "I have found a level of alcohol consumption which is non-destructive and controlled."

*Theme — stopped without support (1.7%):*
> "I achieved my goal myself."

> "Abstained using own will power."

---

### 5.4 Dingle, Cruwys & Frings (2015) — two identity pathways, not one [FULL TEXT]
*Social Identities as Pathways into and out of Addiction.* *Frontiers in Psychology* 6:1795. doi:10.3389/fpsyg.2015.01795
https://pmc.ncbi.nlm.nih.gov/articles/PMC4663247/ — open access (CC BY)

Semi-structured interviews with 21 adults in a drug and alcohol therapeutic community; thematic analysis. **Quote policy: "The interviews were audio recorded and transcribed verbatim."** → testimonial-safe.

Core finding, verbatim:
> "thematic analysis revealed two distinct identity-related pathways leading into and out of addiction. Some individuals experienced a loss of valued identities during addiction onset that were later renewed during recovery (consistent with the existing redemption narrative). However, a distinct identity gain pathway emerged for socially isolated individuals, who described the onset of their addiction in terms of a new valued social identity."

**Quotes (XML-verified — an earlier summariser pass elided the middle of the first one and clipped the last):**

*Pathway 1 — identity loss:*
> "In my good bits, I excel, really excel. I was playing basketball too, got drafted for the Northern Tigers in the under 16s, I was like 15 and competing for the Olympics, I had a really beautiful girlfriend when I was 16. And then everything just went *poof*"
> — Male, 1 week in treatment for amphetamines

> "When I had my daughter I was a really good Mum for two years…no problem. I had had drug problems before but when I had her I just stopped, I was happy being a Mummy"
> — Female, 1 week in treatment for amphetamines

*Pathway 2 — identity GAIN (the novel finding): addiction supplied belonging that was previously missing:*
> "I hung around the wrong people. I learnt by being naughty I could have friends that actually liked me, that wanted to be with me. Well not be with me, be around me"
> — Male, 1 week in treatment for amphetamine misuse

> "That feeling of emptiness and that real, pure loneliness feeling of 'it's just me in the world'. And even though I was in the city and there was all these people, just thinking I was so alone"
> — Male, 1 week in treatment for amphetamines

> "I started to feel more and more depressed and more excluded from the outside world… I lost my dog, and that was pretty much the only thing connecting me to the rest of the world at that time"
> — Male, 4 weeks in treatment for alcohol

*Theme — peer credibility:*
> "You couldn't have anything more healing than being able to talk to someone who knows exactly what you're talking about. From beginning to end… your losses, your gains… everything."
> — Female, 5 weeks in treatment for opiate misuse

> "…the support was just instant straight away from everybody. Everybody. Nobody looked at you sideways they were just continually there."
> — Female, 5 weeks in treatment for opiate misuse

*Theme — aspirational ordinary identity:*
> "For me, I have, the good side of me, I want to go to Uni, I want to do occupational therapy and I want to be able to have a normal life. That's my real ambition."
> — Male, 1 week in treatment for amphetamine use

*Theme — DISSENT: the recovery community is not universally positive* (rare and worth preserving — this is inside a study that otherwise endorses group belonging):
> "you're not actually wanting to support them. You are pointing out to them their consequences and relishing in their failures… But it is not as solid of a community as I thought it was."
> — Female, 3 weeks in treatment for alcohol misuse

> "Um…not particularly [I don't have close relationships within the TC]. No… there would be very few people at this point who I would stay connected with after I leave."
> — Male, 4 weeks in treatment for alcohol

> **Why the gain pathway matters for a product.** If someone's substance use *supplied* their only belonging, then removing it removes their social world, and "change your friend group" is not advice — it is a demand to become isolated again. The two pathways need different products.

---

### 5.5 Dingle, Stark, Cruwys & Best (2015) — "Breaking good" [FULL TEXT]
*Breaking good: Breaking ties with social groups may be good for recovery from substance misuse.*
*British Journal of Social Psychology* 54(2):236–254.
Green OA manuscript: https://shura.shu.ac.uk/9437/1/Best_-_Breaking_good_-_Revised_manuscript_for_BJSP_July_2014.pdf

132 adults entering a drug and alcohol therapeutic community; measured at admission, three fortnightly intervals, and exit; follow-up in a subsample of n=60.

Verbatim from abstract:
> "User identity decreased significantly over time, such that 76 percent of the sample decreased in User identity strength over the first month in the TC. At the same time, Recovery identity ratings increased significantly over time, with 64 percent of the sample staying the same or increasing their Recovery identity ratings over the first month. Identity change, indexed by the change in the difference score between User identity and Recovery identity over the treatment period, accounted for 34 percent of the variance in drinking quantity, 41 percent of the variance in drinking frequency, 5 percent of the variance in other drug use frequency, and 49 percent of the variance in life satisfaction at follow-up, after accounting for initial substance abuse severity and social identity ratings at entry to the TC."

The theoretical inversion, verbatim:
> "In this case, it is not the continuation of social identities during a period of transition that confers wellbeing benefits… rather it is the move away from former substance using social groups and towards a new social identity with others in alcohol and drug recovery that offers the most social support benefits."

> "between five percent and nearly a half of the variance in the outcome variables was accounted for by this identity transition, which is a greater amount of variance than was explained by traditional variables such as the duration of substance dependence and the number of treatment episodes in the individual's lifetime."

**The authors' own honesty about causal direction, verbatim — quote this whenever anyone cites the 49% figure:**
> "It could be argued that social identity at follow up is influenced by substance use behaviour rather than the other way around… Identity change occurred quickly within the first week of treatment, and could be said to occur either concurrently with substance use behaviour"

> ⚠️ **Three caveats before anyone builds on the 49%.** (a) The authors explicitly decline to claim identity change *precedes* behaviour change. (b) n=60 followed up out of 132. (c) The setting is a residential therapeutic community — a maximally social, maximally identity-saturated environment, and **the least generalisable possible context for a solo user of an app.**

### 5.6 Best et al. (2016) — Social Identity Model of Recovery [ABSTRACT ONLY]
*Overcoming alcohol and other drug addiction as a process of social identity transition.* *Addiction Research & Theory* 24(2):111–123. doi:10.3109/16066359.2015.1075980 — **paywalled**

Verbatim from abstract: *"This theoretical paper argues that recovery is best understood as a personal journey of socially negotiated identity transition that occurs through changes in social networks and related meaningful activities."*

> ⚠️ **It is a theoretical paper, not an empirical one.** SIMOR is very widely cited as if it were evidence that identity change drives recovery. Cite it as a model, never as a finding.

### 5.7 McIntosh & McKeganey (2000) — are recovery narratives even about recovery? [ABSTRACT ONLY]
*Addicts' narratives of recovery from drug use: constructing a non-addict identity.* *Social Science & Medicine* 50(10):1501–1510. doi:10.1016/S0277-9536(99)00409-8 — **paywalled**

70 recovering addicts, semi-structured interviews. Verbatim:
> "The paper argues that the correspondence between addicts' own accounts of their recovery and those of professional drug workers may be not so much the result of the intrinsic nature of the recovery process as a product of the socially constructed nature of the narratives and the fact that the latter may have been developed in conjunction with those working in the drug treatment industry."

> ⚠️ **This is the sharpest methodological caution in the file, and it applies to every quote in it.** Recovery narratives may partly be artefacts of the vocabulary people were taught in treatment, not descriptions of the mechanism. **If you build a journaling, narrative or reflection feature, you will be supplying that vocabulary** — and then reading it back as if it were evidence.

---

## 6. Contradiction watch: what the evidence says against standard recovery advice

Each item below is sourced to a study above. Nothing here is inferred beyond what the cited text states.

| # | Common advice | What the evidence says | Source |
|---|---|---|---|
| 1 | You must hit rock bottom before you can change. | With a **control group**, no life event or constellation of events distinguished resolvers from non-resolvers. The events happen to everyone. | §3.1 Sobell 1993 |
| 2 | (…but see the other side) | Self-endorsed "hitting rock bottom" *did* predict sustained remission in a 5-year follow-up of 659 drinkers. | §3.2 Matzger 2005 |
| 3 | Family and doctors should confront the person. | Interventions by medical personnel and family members were "either non-significant predictors or significantly negatively related to sustained improvement." | §3.2 Matzger 2005 |
| 4 | Abstinence is the only real recovery. | Among 65 untreated AUD resolvers (84.6% severe lifetime AUD), 43.1% had a moderated-drinking goal; near-zero binge drinking. Authors: "Strict or enduring abstinence may not be necessary for all." In the UK panel, 99 of 166 remitted dependent drinkers were moderate drinkers. | §2.2 Gilbert 2026; §1.8 Cunningham 2024 |
| 5 | Once an addict, always an addict; keep the recovery identity for life. | 28–40% of resolvers never adopted a recovery identity; 15–19% dropped it. Non-adopters are concentrated among the untreated. | §5.1, §5.2 |
| 6 | Never plan for relapse — it gives you permission. | A ≥5-year abstinent participant credits *expecting* relapse with removing the shame that had blocked him, explicitly against his providers' advice. | §3.7 Pettersen 2018 |
| 7 | Change requires a decisive, dramatic break. | Unassisted recovery "was more often gradual in character and/or motivated by positive incentives than assisted recovery." A systematic review of 32 studies lists "no specific event" first among turning points. | §3.3 Blomqvist 1999; §3.8 Subhani 2022 |
| 8 | Getting advice to cut down is a helpful nudge. | Late-life untreated remitters were **less** likely to have been advised to reduce consumption than either treated remitters or untreated non-remitters. | §1.7 Schutte 2006 |
| 9 | Self-help groups are what maintains recovery. | Comparing 93 natural remitters to 42 self-help attendees, only two maintenance differences survived: attendees disclosed to more people and used social support as a craving strategy more. "More commonalities than differences." | §3.4 Bischof 2000 |
| 10 | Telling people recovery-without-treatment is possible would be irresponsible. | ~half the UK public thinks so — but people who had **actually resolved** a dependence were *significantly less* likely to think it harmful. | §7.1 |
| 11 | Addiction is a chronic, relapsing disease. | "The results do not support the often heard claim that addiction is a chronic, relapsing disease. Indeed, addiction proved to be the psychiatric disorder with the highest, not the lowest, remission rate." Lifetime remission: cocaine 99.2%, cannabis 97.2%, alcohol 90.6%, nicotine 83.7%. | §2A.2 Heyman 2013; §2A.3 Lopez-Quintero 2011 |
| 12 | The longer you've used, the harder it gets. | Quit probability per year is **constant**, independent of years of dependence. Vaillant's 20-year follow-up: "whether an addict was addicted for one year or ten years did not appear to affect the odds that he would become abstinent over the next five years." | §2A.2 |
| 13 | You'll grow out of it (maturing out). | Prevalence falls with age because **fewer people start or restart** — persistence did not vary with age at all (Wald F=0.29, P=.92). Heyman, explicitly: "Winick did not get the psychological dynamics of remitting right." | §4.2 Vergés 2013; §2A.2 |
| 14 | Willpower is a myth / self-reliance is denial. | Self-attributed agency is the *signature* of natural recovery: will power cited by 15.2% of natural vs 3.8% of treatment-assisted cannabis resolvers; "strong character" volunteered by 10% of Flanders' natural recoverers; self-reliance a named theme in 50.8% of 65 untreated AUD resolvers. | §2A.4 Hodgins & Stea 2018; §4A.2; §2.1 |
| 15 | Build your recovery capital — stack your strengths. | In the only multivariate test found, **strengths were not significant (p=.74)** while accumulated **barriers were (OR 0.26, p<.001)**. The field's own leaders say the REC-CAP "has yet to provide evidence of predictive validity." | §4A.2 De Meyer 2024; §4A.5 Best & Hennessy 2022 |
| 16 | More recovery-community engagement is better. | Higher *proportion* of recovery-community memberships: **OR 5.00** for a use episode. Breadth of ordinary non-recovery communities: OR 0.25, ~6% risk reduction per community joined. Posting more predicted **more** risk (p=.001). | §9.2 Naserianhanzaei 2022 |
| 17 | Celebrate the milestones (30 days, 1 year). | Craving-related post volume decays exponentially **but spikes on exactly those milestone days.** The community's own native ritual is deliberately daily and non-milestone. | §9.6 Kramer 2024; §9.3 Gauthier 2022 |
| 18 | Maintain your support network through the transition. | For addiction specifically the opposite held: "it is not the continuation of social identities during a period of transition that confers wellbeing benefits… rather it is the move away from former substance using social groups." | §5.5 Dingle 2015 |
| 19 | Quitting one thing helps you quit others. | Vietnam veterans' alcohol problems **rose** as heroin use fell: "alcohol abuse was a major problem for over a third of veterans" three years out. | §2A.1 Hall & Weier 2017 |
| 20 | High recovery capital protects you. | Cloud & Granfield's own 2008 abstract "reveal[s] the relationship between access to large amounts of recovery capital and substance misuse maintenance." Money and social insulation let people keep using without consequence. | §4A.1 |
| 21 | Confront them / stage an intervention. | Untreated resolvers credit **non-judgmental acceptance**: "he accepted me for who I was… he was a rare bird." The boundary-setting that worked was conditional-but-loving ("Only if you're completely done with those people"), not shaming. | §2A.5 Herbeck 2014; §2A.6 Boeri 2014 |
| 22 | Recovery narratives tell you how recovery works. | They may be artefacts of the vocabulary people were taught: correspondence between addicts' and professionals' accounts "may be… a product of the socially constructed nature of the narratives." | §5.7 McIntosh & McKeganey 2000 |

---

## 7. Public belief vs. lived experience

### 7.1 Cunningham (2026) — would publicising natural recovery cause harm? [FULL TEXT]
*Perceived consequences of disseminating evidence on untreated recovery and moderate drinking after resolving alcohol concerns.*
*Harm Reduction Journal*, 23(1):85. doi:10.1186/s12954-026-01442-w
https://pmc.ncbi.nlm.nih.gov/articles/PMC13154890/ — open access

n=3,749 UK adults (demographically matched via Prolific), after exclusions. Verbatim from results:
> "For the two questions asking about beliefs, 53% believed it would make recovery harder if it were widely reported that individuals could return to moderate drinking after resolving alcohol problems. Further, 49% of participants believed that publishing information that some individuals recover without treatment would make recovery more difficult for others."

And the key interaction, verbatim:
> "for both the beliefs that promulgating information about the possibility of moderate drinking and untreated recoveries, participants with higher AUDIT-C scores and those who met criteria for alcohol dependence in their lifetime but did not report any symptoms in the past year were less likely to believe that this information would be harmful."

> ⚠️ **The people who actually did it are the least worried about saying so.** The fear that natural-recovery messaging demotivates people is concentrated in the never-dependent public, not in resolvers. This is directly relevant to product copy.

---

## 8. Supporting qualitative studies (mostly treated samples — useful for contrast)

These sampled people who *did* use treatment or mutual aid. They are included because the contrast is informative and because several contain findings that cut against the treated-recovery orthodoxy from inside it.

### 8.1 Martinelli, Roeg, Bellaert, Van de Mheen & Nagelhout (2023) [FULL TEXT]
*Understanding the Process of Drug Addiction Recovery Through First-Hand Experiences: A Qualitative Study in the Netherlands Using Lifeline Interviews.*
*Qualitative Health Research*, 33(10):857–870. doi:10.1177/10497323231174161
https://pmc.ncbi.nlm.nih.gov/articles/PMC10426251/ — open access

n=30 Netherlands, ≥3 months recovery from illicit drug addiction; 15 men / 15 women; 10 early (<1yr), 10 sustained (1–5yr), 10 stable (>5yr); mean age 38. 90-minute visual lifeline interviews; 973 transcript pages; thematic analysis.

Four themes: (1) recovery is a broad process interwoven with all life domains; (2) recovery involves identity reconsideration and new perspective; (3) recovery is a staged long-term process; (4) universal life processes are part of recovery.

**Quotes (XML-verified):**

*Theme — stopping is not the change:*
> "What didn't work out was to be much happier. (...) A bit happier, but not… The idea was that if I do this, it would be the end of… These are of course the dynamics of addiction. Oh, you take a drug, and you feel better all at once. It works the other way around too. Oh, I quit a drug in one go and then you will start feeling better again. But it doesn't work that way at all. You are just the same asshole as when you were using."
> — Alexander, man, 59 years, >5 years recovery

> "The only thing I needed to change was everything"
> — Ben, man, 47 years, 1–5 years recovery

> "You can be clean, and you can be in recovery. But being clean doesn't work for me. I tried that."
> — Daisy, woman, 30 years, 1–5 years recovery

*Theme — not knowing what you're changing to:*
> "I wasn't sure what I wanted to change. I didn't want to use anymore because use always led to bullshit. So, I did what I had to do to avoid using. I didn't have a very clear idea of what I wanted differently, really, because I didn't know very well."
> — Peter, man, 45 years, >5 years recovery

> "Yeah, I really wanted rest man. Because I was always running, everywhere. There was so much unrest."
> — Man, 47 years, 1–5 years recovery

*Theme — identity reconsideration:*
> "I always thought I'm weird, I'm not right, I'm crazy. That's why you get aggressive, you go against everything. Then I was like, it's normal. This behavior is normal. (...) It's in my brain, not in my character."
> — Edwin, man, 48 years, >5 years recovery

> "That now, I am on the train and I'm going to work with all the other working people. So that now I am becoming a productive member of society. Yes, look at me!"
> — Kyle, man, 42 years, 1–5 years recovery

*Theme — dreading the loss of occasions:*
> "In the beginning, I thought, well I'm going to do this for a while because, yeah, how can you never celebrate your birthday again without...? Look, I get that the drugs need to be gone, but New Year's Eve and everything without anything? How?"
> — Yara, woman, 36 years, <1 year recovery

*Theme — early recovery is overwhelming, not triumphant:*
> "Especially in the beginning, you have the idea that you are standing there with a big spotlight on you, that completely dazzles you. And it takes quite a long time before you get used to that. (...) And at a certain point, you get the overview again, but that is a whole process that you go through."
> — Jolien, woman, 30 years, 1–5 years recovery

> "If you don't have to work, don't do it, and really focus on your recovery, that's already a full-time job. A roof over your head, food… the rest will all come later."
> — Ben, man, 47 years, 1–5 years recovery

*Theme — the "pink cloud" and its risks:*
> "Then I would also reconcile with four to five people in one week. Almost every day going to someone to do penance. Then they said to me: 'Yes, that can be toned down a bit. Why don't you divide it over five years, isn't that okay too?'"
> — Simon, man, 35 years, <1 year recovery

> "I felt a lot of love in myself and around me. I heard the birds whistle. (...) But when I look at the last year, it has become a bit more normal. When I am occasionally with people around me, who hear my story for the first time or I talk about it, I notice that it no longer affects me in the same way as before."
> — Simon, man, 35 years, <1 year recovery

*Theme — moving on from the recovery identity:*
> "I don't feel like talking about the Kees I was then. I have benefited a lot from that for a while, also you know, providing information for others, but it bothers me a lot now."
> — Kees, man, 38 years, 1–5 years recovery

> "Then I think to myself 'just let it go, man'. If you're in your recovery and things are going well, let go of those steps at some point. But people are so afraid of relapsing."
> — woman, 54 years, >5 years recovery

*Theme — care needs air, not a plaster:*
> "You also must make sure that your wound can breathe. That comes first. Because if you just put a plaster on it, it won't do the trick either. (...) Giving someone the space to take care of it and let them know: 'look, this hurts'."
> — Sara, woman, 54 years, >5 years recovery

*Theme — recovery gains are ordinary gains:*
> "I can now genuinely enjoy sitting on the couch on a Saturday night and putting on a movie. I am now mainly concerned with what I like, just… It's very different. Social life is… I still have it, but it's just in a different way."
> — Angelina, woman, 36 years, <1 year recovery

> "I used to just put 10 appointments in my calendar, you know? I went everywhere, I was doing everything. And (...) then I came right back home, and I was completely over-stimulated and stuff. I don't do any of that anymore."
> — Woman, 30 years, 1–5 years recovery

> "I have learned so much as a person, not just in recovery. (...) Your perception changes, hasn't yours too? Don't you think differently about things than when you were 18? I notice that in myself too. I used to dive into everything and now I'm like 'shit, if I do this, then this could happen'. You just change."
> — Giovanni, man, 35 years, 1–5 years recovery

*Theme — recovery tools are general-purpose life tools:*
> "Why are there not such groups for people who feel alone or who are depressed, or you name it? (...) Because it is also about struggles or pitfalls or things you run into. Normal people, non-addicts, have this too."
> — Simon, man, 38 years, <1 year recovery

---

### 8.2 Yeh, Che & Wu (2009) — the abstinence process in Taiwan [FULL TEXT]
*An ongoing process: a qualitative study of how the alcohol-dependent free themselves of addiction through progressive abstinence.*
*BMC Psychiatry*, 9:76. doi:10.1186/1471-244X-9-76
https://pmc.ncbi.nlm.nih.gov/articles/PMC2787499/ — open access

32 adults (3 female, 29 male) purposively sampled from an AA group and a psychiatric hospital in North Taiwan, 2003–2004; semi-structured interviews; content analysis.

Model: **IAA cycle** (Indulgence → Ambivalence → Attempt) → **Turning Point** (Personal Nadir, self-belief and acceptance, embracing change) → **Ongoing Process**.

**Quotes (XML-verified — note these are longer than commonly circulated versions):**

*Theme — indulgence:*
> "When I had physical problems and saw the doctor, they never got better. But I felt good when I had a drink. I started relying on alcohol and started wanting to drink all the time. Drinking would help me feel better."
> — Interviewee 26

*Theme — ambivalence / fear of the sober life:*
> "I'm afraid of life without alcohol. I've been around alcohol for so long it's become a part of my life. Oh! If I had to give it up all at once, I'm really afraid of that kind of bleak existence."
> — Interviewee 25

*Theme — rejecting others' framing:*
> "Other people keep pointing out my problem and I can't accept that. I'll admit I have a drinking problem, but I think I can control it."
> — Interviewee 24

*Theme — attempt via route-changing (environmental avoidance):*
> "If somebody were drinking over here, I'd just take a different route. I wouldn't pass by anywhere where everyone knows me. We drank together. We know each other. If there's alcohol on this street, this is a street I won't walk down."
> — Interviewee 12

*Theme — the Personal Nadir:*
> "When drinking, I suffered physically and everything was controlled by alcohol. My personal relationships were destroyed, and I could not see where I had gone wrong, so I felt that it was the other person's fault, or my environment…"
> — Interviewee 26 (quote continues beyond the fragment I verified; treat the trailing clause as partial)

*Theme — the enemy does not rest:*
> "Alcohol is crafty; it's stubborn. It won't quit just because you quit. It sneaks up and catches you."
> — Interviewee 26

*Theme — survival as motive:*
> "I didn't drink myself to death in the end, so I've got to keep on living as best I can."
> — Interviewee 26

*Theme — eventual release from vigilance:*
> "When I was in abstinence periods, the craving would always be there. I don't know when, but, eventually, I became a completely free man. Now, I don't avoid convenience stores or street vendors that sell alcohol."
> — Interviewee 22

**Authors' key claim, verbatim:**
> "the alcohol-dependent find motivation to resist and seek a chance 'at a new life.'"

> "as individual subjects stated, the Personal Nadir is not the same for everybody."

> ⚠️ Note this paper's stance: *"We found that the abstinence process is an ongoing process… This process never ends or resolves in complete recovery."* That sits **directly against** Interviewee 22's own account of becoming "a completely free man" who no longer avoids shops selling alcohol, and against §8.1's Kees and the 54-year-old woman who deliberately let the recovery frame go. The authors' conclusion is more pessimistic than their own data.

---

### 8.3 Vose-O'Neal, Christmas, Alfaro, Dunigan, Leon, Hickman, Johnson, Kim & Reif (2025) [FULL TEXT]
*Understanding pathways to recovery from alcohol use disorder in a Black community.*
*Frontiers in Public Health*, 13:1537059. doi:10.3389/fpubh.2025.1537059
https://pmc.ncbi.nlm.nih.gov/articles/PMC12078236/ — open access

37 participants in Detroit, Michigan, all Black/African American, in recovery from AUD. Mean age 50; 40% women; mean 8.4 years in recovery. Framework analysis.

Four themes, verbatim from abstract:
> "(1) Delayed recovery initiation largely due to systemic challenges and a lack of knowledge about recovery, resulting in the belief that recovery was not possible. (2) Once initiating recovery, many reported getting stuck in chronic early recovery due to relapse cycles that regularly involved system and individual challenges coupled with inadequate support. (3) Use of blended recovery pathways, some common in the recovery literature (e.g., Alcoholics Anonymous), and some more prevalent in Black communities (e.g., religion/spirituality). (4) The facilitators of recovery vary by recovery stage; for example, receiving support was crucial in early recovery while providing support was important for sustained recovery."

**Quotes (XML-verified):**

*Theme — not knowing recovery exists:*
> "For a long time, I never knew recovery existed…I had no idea in the throes of my addiction that there was a place to get some help for a long time (participant #20)."

*Theme — environment as a structural driver:*
> "You got a liquor store on every corner and the church, so you got to choose one…I mean, it is quick to go to the store. Because you are going to the store anyway, and then if you a drinker your mind be like, 'Ah, I need a shot because my day ain't been good.' And you go and get a shot. Maybe it'll calm me down or I forget about the situation, but nah (participant #26)."

> "On the south side of every city is where you are going to find poor Black folk… [The system] is set up for failure…It's all set up for us, man. Basically, I was born with the cards dealt against me already…So, you need to be focused, and you need to try to do the best you can. And when you have anything that's altering your thinking, no matter if it's marijuana or alcohol, you might not make the right decision (participant #6)."

*Theme — substance use as trauma coping:*
> "Depression, anxiety, trauma goes a lot in the black community. So that's a lot that we deal with, and that's a reason why people turn to drinking, or drugs, or whatever to cope. But at the end of the day, them problems still there (participant #10)."

*Theme — chronic early recovery:*
> "I was a chronic relapser. I could get a little time clean. I could get six months; I could get three months. I was constantly doing that throughout the years. And I looked up, and the years were going by and by and by (participant #33)."

*Theme — breaking a family cycle as motive:*
> "One thing that I'm so grateful for is to break the chain of addiction in my family because on both sides, everybody is addicted, whether it's pills, heroin, alcohol, relationships, everybody, everywhere. I mean to this day. So, when you are in an environment where everybody's doing things, you wonder if that's what you ought to do (participant #27)."

> "I had a really rough childhood, so I just know I do not want that for my child. So, whatever I got to do to keep myself together and that's pretty much what I'm on…[I'm] trying to break that [cycle] completely…I should not have had to grow up on my own and figure things out on my own. I should have had somebody, had my parents there (participant #2)."

*Theme — mismatched helper:*
> "Before I went to DRP, I was seeing another therapist. He wasn't Black, he was white. I felt like he was judging me off why I was there versus trying to figure out who I was…He was basically trying to tell me in so many words, 'Well, you are an alcoholic, you have a problem.' Instead of really trying to find where it came from (participant #2)."

*Theme — disclosure as the tool:*
> "Communication is the most effective tool I have against active addiction coming back again in my life. I learned to do that, and it was something different. I was not the type of man to share my innermost thoughts and feelings. I thought that it hindered my masculinity (participant #9)."

*Theme — cutting off loved ones:*
> "Some of the people that you love, you have to cut them off because you do not want them to put you back in a situation where you relapse. That was my father. He drinks, but if he was to start drinking around me, it's time for me to leave his house (participant #14)."

*Theme — atheism inside a God-framed programme:*
> "I had a very difficult time in [early] recovery because I considered myself atheist…I felt bad because everybody else was talking about God....It took me a couple of decades to find a God of my own understanding (participant #33)."

*Theme — harm inside mutual aid:*
> "[In early recovery] I was still looking for love, acceptance. I was a people pleaser. I was in a lot of relationships. When I stopped using drugs, I did not stop having sex. So, I had a lot of sex, with a lot of different people... [In the 1980s] the old timers [in AA] took advantage of the newcomers. They knew we were desperately seeking love and attention, and they just took advantage of us [women] (participant #18)."

*Theme — providing support sustains recovery:*
> "My understanding of [AA] is how you help other people is you tell your story…And by you continuously carrying the message, it helps the new person. If you see that you are helping the new person, it helps you. It has a reciprocal type thing (participant #15)."

*Theme — gendered exposure:*
> "I know women stay longer out there using…If you are out there selling your body for somebody, they want to keep you selling your body, so they going to keep giving you more alcohol and more crack. Men do not sell their bodies as much as women do, so we are out there longer. We have more people trying to keep us out there longer (participant #8)."

---

### 8.4 Stokes, Schultz & Alpaslan (2018) [FULL TEXT]
*Narrating the journey of sustained recovery from substance use disorder.*
*Substance Abuse Treatment, Prevention, and Policy*, 13(1):35. doi:10.1186/s13011-018-0167-0
https://pmc.ncbi.nlm.nih.gov/articles/PMC6161338/ — open access

15 participants, South Africa; narrative/phenomenological design; Schlossberg's Transition Process Model (self, situation, strategies, support).

Verbatim from abstract:
> "Participants' entry into recovery was triggered by an internal or external crisis caused by chemical substance abuse. They had to embrace a psychological mind set change, involving commitment to a new way of life in order to sustain their recovery."

> "The act of helping others further helped the participants to sustain their own recovery."

**Selected quotes (XML-verified). This is a heavily 12-step / faith-based sample, so it is the best available counterweight to the untreated samples above.**

*Theme — crisis entry:*
> "What actually happened, my rock bottom happened as it got to the point where there was physical and verbal abuse towards my wife… She had left the home and said that she is leaving me if I didn't get help and … so I hit a rock bottom…"
> — Male, 47

> "What brought me to recovery like; I was literally fed up of being fed up. Using [drugs] became physically painful, like I had aches in my bones, like my skeleton pained and I was going literally insane. I was seeing stuff, hearing voices and the biggest scare for me was I felt like I was becoming possessed."
> — Male, 27

*Theme — total-life change:*
> "It's about making a deeper than conscious decision that your life needs to change in its entirety. So you will have to let go of everything you were doing. You can't do the things you were doing and stay clean. You have got to stop doing everything and start doing something else, that's on the one hand and on the other hand you have to change the way that you look at your life."
> — Male, 33

*Theme — the disease frame as relief:*
> "I was faced, for the first time, with what is actually going on with me. That I've got the disease of addiction and I could name this dis-ease inside of me that I had all my life and I could start working on it and it was difficult."
> — Male, 27

*Theme — REJECTING the permanent-addict identity (from inside a 12-step sample):*
> "I personally don't believe in the 'once an addict, always an addict.' I don't believe in that. I don't see myself as an addict anymore, because it is not part of my frame of reference anymore. So far back in my past, and I have become a completely new person from the person I used to be then. I see myself as a mother and a wife and a daughter and I work, but that is not … I don't feel like it is part of me anymore."
> — Female, 32

> "I came from a faith based environment where for me the foundation and the new identity (referring to a non-addict, Christian identity) that I had received you know from a lot of Biblical input, it helped form an identity for myself that wasn't, you know, 'you're and addict, your past defines you', you know all that kind of thing. And for me that was quite a revelation because for me that meant that I could change my life without having that label kind of attached to me for ever and a day."
> — Male, 35

*Theme — fear as a maintenance mechanism:*
> "Now, I am still desperate, I tell you. Fear of relapse, fear of losing the little that they have, fear of losing the freedom I found in the fellowship or in the programme… Because when I fall, when I go down, I hit rock bottom times two. No half measures. I don't take no survivors. It is a complete, complete destruction for me. I can't stop. So fear in a positive way at the moment. Fear of myself. The desperation is the same."
> — Male, 42

*Theme — building a life, chaotically:*
> "And at a certain time I picked up painting. Obviously I was a musician and I picked up more instruments. I picked up more books. I picked up other crafts like, leather craft… You know every time I buy tools I get excited, I am going to work on this thing, and I work on it for a month and then the next thing I get bored and then I buy paint and canvas and I will be painting, painting, painting. And next thing then I will buy a new guitar or a saxophone. Or I am stripping it off, which will take me a week to put it back. So for those first five years, life was what I was making."
> — Male, 42

*Theme — exercise:*
> "So my fitness, my health and fitness also gave me an escape. If I was feeling down or I wasn't having a good day, I loved to go for a jog or a long walk, and that really helped me clear my head."
> — Female, 28

*Theme — helping others:*
> "It is genuinely the only way… to help other people to help yourself into the process…. going on a Wednesday night to go talk to people at the rehab centre and try to go and help them cause that is helping them and is helping me and the positive part the feedback that you get there helps you also a lot in improving your self-image to boost yourself and to stay positive in your everyday fight."
> — Male, 50

---

### 8.5 Rhodes, Gottfredson & Hill (2018) [FULL TEXT — raw-HTML verified]
*Desistance and treatment seeking among women with substance use disorders.*
*Qualitative Health Research*, 28(8):1330–1341. doi:10.1177/1049732318767637
https://pmc.ncbi.nlm.nih.gov/articles/PMC7470472/ — free on PMC (not in the Europe PMC OA XML subset; raw HTML downloaded and grepped)

**Quote-alteration policy, verbatim from methods:** *"Password protected de-identified data were stored on secure servers and potentially identifying information was redacted or substituted with pseudonyms or more general terms during transcription."* Transcription itself was verbatim: *"Interviews were transcribed verbatim by Rhodes and a trained research assistant."*
→ **Usable as testimony, with the caveat that identifying nouns may have been generalised.**

30 women in addiction treatment, central North Carolina; mean age 42; 13 Black, 17 White.

**Rock-bottom breakdown, verbatim from the paper:**
> "Rock-bottom experiences included interactions with the child welfare system (n = 6), attempted suicide or suicidal thoughts (n = 3), strained personal relationships and social isolation (n = 2), experiences of physical abuse (n = 2), homelessness (n = 1), and accidental overdose (n = 1)."

> ⚠️ **A summariser pass earlier in this compilation rendered the third category as "relationship dissolution (2)."** The paper says "strained personal relationships and social isolation." Corrected here.

**Verified verbatim quotes** (re-extracted from raw HTML after two summariser errors were caught — see §0A):

*Theme — rock bottom as a witnessed event:*
> "And my sister was with me and I watched her actually overdose and die in front of my eyes. And fortunately she was brought back and she's OK, but that was really, really scary. Seeing someone as close to me, and thinking they might not recover and come back. And I didn't want that to happen to me …"

*Theme — "sick and tired":*
> "I was throwing up all the time. Blood and everything. Couldn't hardly walk. I walked with a cane and I was only like 30 years old then … I was just miserable. I've never been suicidal. I guess I never had the guts to really hurt myself that bad, and I'm a true believer in God and always thought if I did do something like that I'd go to hell. And I thought, my God, it's bad enough here I can't go worse. And um, you know I just got sick and tired of being sick and tired. And like I say, just finally surrendered."

*Theme — health decline prompting an internal dialogue:*
> "And the thing about it, like I said, the bulb went off in my head. It was my … I mean my conscience actually said, 'OK. Right now, you're at this path. Where … you keep talking about this life is worth living … OK. Are you trying to commit suicide?' Because my health was failing. Every time you turn around I'm in that hospital. Not because, directly, of the drugs, but because I was having a lot of health issues. And of course the drugs was making everything worse."

*Theme — shifting identity:*
> "I mean I was tired … the whole rhythm and roll of the people. The people I was having to deal with, and the things that I was having to subject myself to. It was … it was too much. I knew that I'm better than that. But I had to start taking—taking the reins. Because I was steady saying, you gotta do drugs. Drugs can't do you. The whole time drugs was doing me. That's why I had nothing. I didn't have a pot to piss in, or a window to throw it out of."

**The useful structure here is the split: half rock-bottom, half gradual.** Even in a treatment-seeking sample — the population most selected for dramatic entry — sudden traumatic events accounted for only 15 of 30.

---

## 9. Online recovery communities: what the published analyses find

> ⚠️⚠️ **READ §0 FIRST.** With the single exception of §9.7, **no quote in this section is a real thing a real person wrote.** Every major Reddit-corpus paper here states an explicit paraphrasing or synthetic-quote policy. The *findings* are solid and are the valuable half. The quotes are researcher reconstructions and must never be presented as testimony.

This section matters disproportionately for a self-serve product, because these are the only studies of the delivery channel the product would actually use.

### 9.1 Kornfield et al. (2018) — what language predicts relapse [FULL TEXT]
*What Do You Say Before You Relapse? How Language Use in a Peer-to-peer Online Discussion Forum Predicts Risky Drinking among Those in Recovery.*
*Health Communication* 33(9):1184–1193. doi:10.1080/10410236.2017.1350906
Green OA PDF: https://facesandvoicesofrecovery.org/wp-content/uploads/Documents/What-Do-You-Say-Before-You-Relapse.pdf

104 adults with AUD post-residential treatment in the A-CHESS mobile RCT; **1,625 forum messages** (first 4 months), mean 15.3 messages / 410 words per person. Outcome: self-reported risky drinking at 4/8/12 months. **37/104 relapsed.** LIWC + hierarchical logistic regression.

Model χ²=62.3, p<0.01, 45.1% of variance. Demographics 11.7%, system use 1.6%, **language 31.8%.** Overall accuracy **81.7%** (86.6% non-relapse, 73.0% relapse).

| Predictor | B | SE | p | Direction |
|---|---|---|---|---|
| Swearing | 9.275 | 2.947 | .002 | ↑ relapse |
| Inhibition ("block, constrain, stop") | 1.283 | 0.488 | .009 | ↑ relapse |
| Negative emotion | 0.806 | 0.346 | .020 | ↑ relapse |
| **Love** | 1.503 | 0.482 | .005 | **↑ relapse** |
| Cognitive mechanisms ("cause, know, ought") | −0.166 | 0.077 | .031 | ↓ relapse |
| Achievement | −1.248 | 0.469 | .008 | ↓ relapse |
| Death | −6.211 | 3.299 | .060 | ↓ (trend) |
| 1st person singular ("I") | 0.007 | 0.085 | .939 | **n.s.** |
| 1st person plural ("we") | 0.940 | 0.733 | .199 | **n.s.** |
| Days used app | 0.014 | 0.018 | .432 | **n.s.** |
| Messages posted | −0.042 | 0.028 | .138 | **n.s.** |

**Authors' own surprised findings, verbatim:**
> "We had also proposed that cognition focused on inhibition would be supportive of recovery, but surprisingly, greater use of inhibition language was associated with higher relapse risk. In other words, the more people used inhibition-related words, the less they were able to inhibit their drinking impulses."

They flag the obvious confound themselves: *"the inhibition category would capture messages reading both 'I can stop drinking' and 'I can't stop drinking.'"*

> "Finally, we predicted that 'love' words would be negatively associated with relapse risk… yet we found the opposite… the use of 'love' words may have signified a bid for social support, rather than an acknowledgement that this support exists."

> "we failed to replicate prior findings showing that high rates of plural first-person pronouns (e.g., 'we') predict psychological benefits… These findings are surprising given the ample evidence that social integration is central to recovery."

> ⚠️ **Amount of use predicted nothing.** Days logged on and messages posted were both non-significant. Only *what* was said mattered.

---

### 9.2 Naserianhanzaei & Koschate-Reis (2022) — recovery monoculture predicts relapse [FULL TEXT]
*Effects of Substance Use, Recovery, and Non–Drug-Related Online Community Participation on the Risk of a Use Episode During Remission From Opioid Use Disorder.*
*Journal of Medical Internet Research* 24(8):e36555. https://www.jmir.org/2022/8/e36555 — fully open access

457 Redditors in remission from OUD who self-announced a quit date on r/OpiatesRecovery (Feb 2012–Jun 2019); **219 (47.9%) had ≥1 use episode.** Extended Cox model with time-dependent covariates.

**Absolute number of community memberships:**
- Non-drug-related communities: b=−0.06 (0.01), **p<.001, OR 0.94** — ~6% risk reduction per additional ordinary community joined
- Recovery communities: b=−0.20 (0.08), p=.009 alone, but **b=0.02, p=.73 in the combined model** — effect vanishes
- Substance-use communities: b=−0.22 (0.07), p=.002, OR 0.80 — **opposite of hypothesis**
- Number of posts: b=0.0004 (0.0001), **p=.001 — posting more predicted MORE risk**

**Proportion of memberships:**
- Recovery memberships %: b=1.61 (0.20), **p<.001, OR 5.00**
- Non-drug memberships %: b=−1.39 (0.26), **p<.001, OR 0.25**

Medians: non-drug groups **16 (no-use) vs 8 (use), p=.004.**

> ⚠️ **This is the most uncomfortable finding for a recovery app.** An *exclusive* focus on recovery communities is associated with roughly **5× the hazard** of a use episode; breadth of ordinary, non-recovery online life is the protective factor, and it holds after controlling for posting volume. The authors' own recommendation is that recovery platforms should *"flag non–drug-related online communities to members to enable them to build wider social group memberships and avoid a narrow focus on recovery support groups, particularly in the longer term."*
>
> **A product that maximises time-in-app is optimising a variable this study associates with worse outcomes.**

---

### 9.3 Gauthier, Costello & Wallace (2022) — the definitive thematic analysis [FULL TEXT]
*"I Will Not Drink With You Today": A Topic-Guided Thematic Analysis of Addiction Recovery on Reddit.* *CHI '22*, ACM. doi:10.1145/3491102.3502076
Open PDF: https://uwspace.uwaterloo.ca/handle/10012/17742

**Corpus:** all threads 2014–2017 — **144,422 threads / 58,407 distinct usernames (r/stopdrinking)** and **14,079 threads / 10,668 usernames (r/OpiatesRecovery)**. Two 16-topic LDA models → purposive sample of **640 threads (640 submissions + 7,828 comments)**. Reflexive thematic analysis.

**Quote policy, verbatim — this is the paper that made the whole warning necessary:**
> "All published quotes are paraphrased from existing non-deleted posts to preserve pseudonymity… We paraphrased by breaking quotes down into their thematic analysis codes, then manually constructed a new quote."

**Seven themes:** Sharing Experiences (*"the most frequent theme"* — self-reflections, sharing failures, sharing successes, drinking/using dreams); Peer Support (check-ins, encouragement, solidarity); Consequences; Substance Related Concerns (pain management for opiates, socialising for alcohol); Social Relationships and Activities (filling a void, group/healthy/leisure activities); Sharing Knowledge and Lived Experience; Supporting Formal Treatment (female support, higher power concerns, newcomer support).

**Key findings:**
- **IWNDWYT** ("I will not drink with you today") is the community's ritual token, used identically for successes and relapses: *"members from r/stopdrinking used this acronym to express solidarity with each other in both good and bad times."*
- Open check-in threads function as **daily-frequency sobriety chips** — the authors' explicit parallel: they *"serve a similar purpose to the 'chips' or 'sobriety coins'"* but can be daily, weekly or holiday-based rather than at fixed milestones.
- **The subreddit's distinctive role is metacommunicative** — it is where people discuss 12-step programmes in ways they cannot inside them: atheists on the higher power, women seeking female mentors, opiate users stigmatised at AA, and people afraid that disclosing a relapse in a halfway-house-linked NA meeting would get them evicted.
- **Contradicts prior literature, and says so.** Earlier work worried these forums dispense harmful amateur advice; Gauthier et al. found the opposite — communities routinely disclaim expertise and actively route people out (e.g. to r/AlAnon). It also counters work finding online groups are seen as lower-quality than face-to-face: *"This contrast suggests the communities play a distinct and important complementing role by supporting queries that may be difficult to address in person."*
- **Scale contrast:** ~6,000 people engaged monthly in r/stopdrinking vs an average in-person 12-step group of **~17 members**.

---

### 9.4 Colditz et al. (2023) — what support actually gets given [FULL TEXT — SUMMARISER]
*Characterizing online social support for alcohol use disorder: a mixed-methods approach.*
*Alcohol Clin Exp Res (Hoboken)* 47(11):2110–2120. doi:10.1111/acer.15187
https://pmc.ncbi.nlm.nih.gov/articles/PMC11218862/ — open access

**Quote policy, verbatim:** *"direct quotes were rephrased (e.g., paraphrased, replacing words with close adjectives) to reasonably obfuscate identities of users."*

r/StopDrinking, Oct 2018–Sep 2019: **77,033 posts / 578,289 direct responses; 1,386 responses double-coded (2,015 paragraphs).**

**Support-type prevalence:** Emotional **74.0%** (38% of responses emotional *only*); Appraisal **55.1%**; Informational **16.5%**; **Instrumental 0%** (forum rules prohibit tangible resource exchange). 40% contained ≥2 types.

**Linguistic profile (median, IQR):**
| | Words | Gunning Fog | VADER |
|---|---|---|---|
| Emotional only | **10** (6–17) | 2.8 (1.6–5.8) | **0.66** (0.44–0.82) |
| Appraisal only | 39 (19–64) | 6.9 (4.9–8.7) | 0.17 (−0.30–0.69) |
| Informational only | 25 (13–42) | 7.2 (5.0–10.6) | 0.00 (−0.08–0.51) |

**The dominant unit of online recovery support is a ten-word, grade-3-reading-level, strongly positive utterance** — not advice, not information. Informational support is the rarest thing in the room.

> ⚠️ Pair this with §9.1: the forum overwhelmingly produces warm-affect exchange, and warm-affect language ("love") was the *risk* marker.

---

### 9.5 Tamersoy, De Choudhury & Chau (2015) — abstinence-duration prediction [FULL TEXT — SUMMARISER]
*Characterizing Smoking and Drinking Abstinence from Social Media.* *Proc 26th ACM Conf Hypertext & Social Media*, 139–148. doi:10.1145/2700171.2791247
https://pmc.ncbi.nlm.nih.gov/articles/PMC4668115/ — open access

~8 years (2006–2014). r/StopDrinking 533 users / 30,178 posts / 229,656 comments (plus r/StopSmoking and 15 adjacent subreddits). Ground truth = self-reported sobriety **badges** (days sober shown in flair). Ridge regression, 357 features.

**Accuracy 85–86%**, F1 0.85–0.86, precision 88–90%, recall 82–83%.

- **Half the population is at high risk of relapse within 1–2 months of the quit attempt; past ~3 years, sustained abstinence becomes highly likely.**
- Short-term markers: "i started," "i need to," "i feel," "thanks for the"; **high indegree (receiving lots of comments)**; negative sentiment.
- Long-term markers: "keep it up," "hang in there," "i quit drinking," "sobriety"; longer tenure; higher comment karma; positive sentiment; **participation in fitness and religious subreddits.**

> **The direction-of-support flip is the signal: receiving support marks fragility; giving it marks durability.** Converges with §9.1's "love words = a bid for support, not evidence of it" and with §9.2's finding that posting more predicted more risk.

---

### 9.6 Kramer, Groh, Stüben & Soyka (2024) — craving onset at scale [FULL TEXT — SUMMARISER]
*Analysis of addiction craving onset through natural language processing of the online forum Reddit.* *PLoS ONE* 19(5):e0301682.
https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0301682 — open access

r/stopdrinking, Apr 2017–Apr 2022; 279,688 posts filtered to **44,920 craving-related posts from 24,435 distinct authors** (~16%). Word2vec + LDA + regex craving lexicon, manually validated on 200- and 350-post test sets.

- **"The number of craving-related posts decreases exponentially with the number of days since the author's last alcoholic drink"** — but with **spikes on milestone days (30 days, 100 days, 1 year).**
- Emotions: boredom 45% similarity to "crave"; stress 40% similarity to "drink"; anxiety mentioned by 23.68% of authors; depression 14.1%; nicotine 12.02%.
- Time: evening/night mentioned by ~44% of authors; weekend >26%; Fri/Sat 37–40% semantic similarity to craving vs 23–31% for other days.
- Location: **airport 46% similarity to "trigger"** — the paper's novel finding; plus home, work, bars/restaurants.

> ⚠️ **Milestone days are craving spikes, not victory laps.** A product that celebrates day 30 and day 365 is intervening on precisely the days when risk language peaks. Note that the community's own native ritual (daily IWNDWYT check-ins, §9.3) is deliberately *non*-milestone — the members may be better calibrated than the AA-chip metaphor most apps copy.

---

### 9.7 Sinclair, Chambers & Manson (2017) — the ONE genuinely quotable source in this section [FULL TEXT]
*Internet Support for Dealing with Problematic Alcohol Use: A Survey of the Soberistas Online Community.*
*Alcohol and Alcoholism* 52(2):220–226. doi:10.1093/alcalc/agw078
https://academic.oup.com/alcalc/article/52/2/220/2333817 — open access, CC BY-NC-ND

**438 respondents (11.4% of ~3,800 active users), 432 analysed. 94% female, mean age band 45–54, 71.9% UK, 73.4% employed, 27.5% postgraduate.** These are printed free-text survey responses in Tables 3 and 4, not paraphrases.

**Findings:**
- **62.5% had problematic use for 10+ years. 46.5% had never sought any previous support. Only 28.9% had ever attended AA.**
- 55.1% zero alcohol in the past 7 days; **34.3% became alcohol-free since joining; 23.8% reduced; 12.5% no change.**
- Most-valued feature is **personal stories: 80.8% "particularly helpful"** (91% used them). Blogs/forums 73.1%. Expert webinars 34.6%. "Ask the Doctor" 29.3%. **Chat room 19.6%** — the synchronous feature was the *least* helpful.
- **Dose is low: 81% spend 1–3 hours per week; only 4.4% spend >10 hours.**
- Members sober >1 year were more likely to have sought previous help (21.7% vs 13.5%, χ²=4.9, p=0.026).

**Verbatim member quotes** (real free-text responses):

*Reasons for joining:*
> "To try and stop drinking alcohol."

> "I wanted to stop drinking and didn't want to go to AA."

> "I was looking for online support other than AA."

> "I felt it was very accepting and other forms of help available were stigmatising…I wasn't really sure if I was 'bad' enough to need other alcohol services."

> "Soberistas seems strong, and I love the 'normalization' of the problem."

> "Love the camaraderie—and I think many women like myself."

> "My mum found this site and recommended it to me as it sounded just like my behaviour."

*Reasons for continuing:*
> "It's good to have ongoing support, and to feel part of a community, and that I am not alone and a 'failure'. Hearing about others struggling with this problem is helpful."

> "The sense of community with people who understand."

> "Feel part of a family."

> "I like to read other people's stories."

> "I will be sober 6 months in a week. Could not have done it without Soberistas and need Soberistas every day."

> "I don't think I would still be sober without the site."

> "To remind me why I stopped drinking."

> "Knowing it's in the background."

> "Being able to drop in as I wish."

> ⚠️ **This population is the product's actual target and it does not look like the clinical pathway at all.** Treatment-naive, mostly female, professional, routing *around* AA and around services because of stigma and because they doubted they were "bad enough." **Nearly half had never sought help of any kind in 10+ years of problem drinking.** And note the engagement model the members describe: *"Knowing it's in the background"* and *"Being able to drop in as I wish"* — ambient availability, 1–3 hours a week, stories over tools. That is very different from streaks and daily check-ins.

---

### 9.8 Thulin, Walton, Bonar & Fernandez (2024) — r/leaves [FULL TEXT — SUMMARISER]
*Examining the Popularity, Content, and Intersections With SAMHSA's Definition of Recovery in a Nonclinical Online Cannabis Cessation Community.*
*Journal of Medical Internet Research* 26:e47357. https://pmc.ncbi.nlm.nih.gov/articles/PMC11470220/

**Quote policy: paraphrased to prevent deanonymisation.** The paper reproduces ~53 quotes that read exactly like verbatim testimony. **None of them are.**

Top 100 posts/year 2011–2021 → 1,000 posts, 965 analysable, ~90% unique authors. Volume grew **83-fold**, 420 → 34,841 posts/year, exponential after 2018. Five themes forming a narrative arc: individual history → consequences of use → reasons for changing → cessation strategies → consequences of change. **SAMHSA domain coverage: Health, Purpose and Community heavily represented; Home (housing stability) almost entirely absent.**

### 9.9 Chen et al. (2025) — stigma and stage of change [FULL TEXT — SUMMARISER]
*Stigma and Behavior Change Techniques in Substance Use Recovery: Qualitative Study of Social Media Narratives.* *JMIR Form Res* 9:e57468. doi:10.2196/57468

**Quote policy, verbatim: "we constructed synthetic quotations to protect the identities of content authors."**

748 Reddit posts (316 alcohol, 335 cannabis, 135 opioid), 2013–2019; Transtheoretical Model + BCT taxonomy, Cohen κ = 0.71.
- Stage distribution: **Action 472 (63.1%)**, Precontemplation 95 (12.7%), Contemplation 68 (9.1%), Preparation 43 (5.7%), Maintenance 45 (6%), Unknown 25 (3.3%).
- Stigma: **internalized 49.3%**, anticipated 17.5%, enacted 14.8%.
- 11 BCT clusters observed in the wild, including natural consequences, environmental restructuring, repetition and substitution, emotion regulation, identity reframing, self-belief, feedback and monitoring.

> **Internalised stigma appears in half of posts and dwarfs both anticipated and enacted stigma.** And the population is overwhelmingly mid-action, not contemplative — a tool designed around "deciding to quit" addresses ~15% of what is actually there.

### 9.10 Valdez & Patterson (2022) — what posts are for [FULL TEXT — SUMMARISER]
*Computational analyses identify addiction help-seeking behaviors on the social networking website Reddit.* *PLOS Digital Health* 1(11):e0000143.

9,066 posts across seven subreddits, Mar–Aug 2022. TF-IDF + k-means + PCA + VADER; logistic regression cross-validation 85% accuracy.
**Asking for advice 44% (n=3,885); giving advice 31% (n=2,661); personal struggle narratives 25% (n=2,159).** Giving-advice posts had the highest positive affect, struggle narratives the lowest; ANOVA F(2,5082)=31.94, p<.001.

### 9.11 Bergman & Kelly (2020) — the field's own review, including the harms [FULL TEXT — SUMMARISER]
*Online digital recovery support services: An overview of the science and their potential to help individuals with substance use disorder during COVID-19 and beyond.*
*Journal of Substance Abuse Treatment* 120:108152. https://pmc.ncbi.nlm.nih.gov/articles/PMC7532989/

- 4.1% of a national US sample (~900,000 people) report lifetime online recovery meeting participation.
- **SMART Recovery online attendance improved percent-days-abstinent at 3 months but the effect did not hold at 6 months.**
- *"No studies to date"* on 12-step online meeting effectiveness.
- InTheRooms.com: 450,000+ registered, 30,000 monthly visitors; average member has **7 years continuous abstinence**, logs in several times/week for ~30 min. Sober Grid users average **<1 year** abstinence and 12.5 sessions.
- Reddit content analyses: comments *"typically mapped onto Yalom's curative group therapy factors"* and *"only very few comments were potentially harmful."*
- **Stated iatrogenic risks:** digital recovery support *"may not facilitate active recovery involvement as well as in-person groups"*; sponsorship, home groups and accountability mechanisms *"may not be present"*; group alliance may be lower via telemedicine; screen proximity may *"enhance arousal and negative affect"*; and **one in four US adults lack household broadband, disproportionately Black and Latino and lower-SES individuals.**

---

## 10. Reviews and framing pieces

### 10.1 Klingemann, Sobell & Sobell (2010) [ABSTRACT ONLY]
*Continuities and changes in self-change research.* *Addiction*, 105:1510–1518. doi:10.1111/j.1360-0443.2009.02770.x
> "A substantial literature demonstrates that natural recoveries from substance use disorders not only occur but are a common pathway to recovery."

### 10.2 De Meyer, Bencherif, De Ruysscher, Lippens & Vanderplasschen (2024) [ABSTRACT ONLY]
*Self-change from problems with alcohol and drugs: A scoping review of the literature since 2010.*
*Drug and Alcohol Review*, 43:1349–1360. doi:10.1111/dar.13834
PRISMA scoping review; **56 articles** with explicit empirical results on self-change. Findings organised around: methods/definitions; prevalence; indicators; process; population views.
> "The review highlights the significant growth in research on self-change considering key themes as well as the need for a relational and time-bound approach to self-change in research and practice."

**This is the most current review of the field and should be the next full text obtained.** It is paywalled.

### 10.3 Hesse, Brummer & Nielsen (2024) — editorial on Day et al. [FULL TEXT]
*Assisted resolution and self-change: differences between healthcare systems.* *BJPsych Open*, 10(5):e173. doi:10.1192/bjo.2024.760
https://pmc.ncbi.nlm.nih.gov/articles/PMC11536214/ — open access

The single most important caution in this document, verbatim:
> "There is a vast difference between simple normative changes in substance use due to changing life circumstances, such as marriage or becoming a parent, and increasing maturity on the one hand and resolution of substance use disorders among people with complex and multifaceted problems on the other."

> "The fact that a large proportion of people change on their own does not mean that treatment services are not needed. **The people who do change on their own have fewer and less complex problems than those who use services. Those who seek treatment are those who may have tried on their own but failed.** If anything, services should be tailored to those who have more severe or co-occurring problems – people with early-onset substance use, a history of mental health problems, and a history of criminal justice involvement." *(emphasis added)*

Also verbatim, on the product-relevant upside:
> "shedding light on the fact that resolution is not only possible but indeed very common may reduce the stigma associated with AOD problems… Knowing that it is possible to get out on the other side is important and can boost hope."

And a caution against over-reading self-change into intervention design, verbatim:
> "More than 20 years ago, Linda Sobell and colleagues attempted to implement an intervention informed by studies of self-change in the community and did not find meaningful differences between brief, community-level interventions and just handing out pamphlets. Whether it is possible to developing effective interventions based on self-change studies remains an open question."

### 10.4 Burman (1997) [ABSTRACT ONLY]
*The challenge of sobriety: natural recovery without treatment and self-help groups.* *Journal of Substance Abuse*, 9:41–61. doi:10.1016/s0899-3289(97)90005-5
> "So strong is the supposition of the process of recovering as a life-long condition that requires treatment and/or a self-help group for on-going support and rehabilitation that recovery on one's own is given little credence."

### 10.5 Chen (2018) [ABSTRACT ONLY]
*Building Recovery Capital: The Role of "Hitting Bottom" in Desistance and Recovery from Substance Abuse and Crime.* *Journal of Psychoactive Drugs*, 50:420–429. doi:10.1080/02791072.2018.1517909
Theoretical piece arguing hitting bottom both motivates change and drives resource-building via the conservation-of-resources model. **Theory, not new data.**

### 10.6 Boeri, Gibson & Boshears (2014)
→ **See §2A.6.** Full text read and quotes verified; the entry lives with the illicit-drug cluster.

### 10.7 Slutske (2010) [TITLE ONLY — no abstract published]
*Why is natural recovery so common for addictive disorders?* *Addiction* 105:1520–1; discussion 1524. doi:10.1111/j.1360-0443.2010.03035.x
A commentary. Europe PMC holds no abstract. **Nothing quoted.** Listed because the title is frequently cited as if it were a findings paper.

---

## 11. Studies identified but NOT obtained — the honest gap list

Nothing is quoted from any of these. Listed so the gap is visible rather than papered over.

| Study | Why it matters | Status |
|---|---|---|
| **Granfield R & Cloud W (1996).** *The Elephant That No One Sees: Natural Recovery among Middle-Class Addicts.* J Drug Issues 26(1):45–61. doi:10.1177/002204269602600104 | The founding recovery-capital study; 46 in-depth interviews, snowball sample, US. **The origin of the entire recovery-capital construct.** | **Paywalled (SAGE). Not obtained. No quotes reproduced anywhere in this document.** |
| **Cloud W & Granfield R (2008).** *Conceptualizing recovery capital: expansion of a theoretical construct.* Subst Use Misuse. | The formal four-part model (social, physical, human, cultural capital). | Paywalled; title/journal verified via Europe PMC only. |
| **Biernacki P (1986).** *Pathways from Heroin Addiction: Recovery without Treatment.* Temple University Press. | Book-length ethnography of untreated heroin recovery; the identity-transformation account. | Book, not indexed. Not obtained. |
| **Granfield R & Cloud W (2001).** *Social context and "natural recovery": the role of social capital in the resolution of drug-associated problems.* Subst Use Misuse. | Direct follow-up on social capital. | Paywalled; title verified via Europe PMC. |
| **Mellor R, Lancaster K & Ritter A (2021).** Addiction 116(6):1413–23. | The four-narrative typology; 12 untreated Australians. | **Abstract only** — see §3.9. |
| **De Meyer F et al. (2024).** Drug Alcohol Rev 43:1349–60. | Most current scoping review, 56 studies. | Abstract only. |
| **Rumpf HJ et al. (2000).** *Studies on natural recovery from alcohol dependence: sample selection bias by media solicitation?* Addiction. | The methodological critique of the German corpus. | Title only. |
| **Sobell LC et al. (2000).** *Natural recovery from alcohol and drug problems: methodological review…* Addiction. | Field-defining methods review. | Title only. |
| **Bischof G et al. (2003).** *Types of natural recovery from alcohol dependence: a cluster analytic approach.* Addiction. | Source of the LPLS/HPMS/LPHS clusters used in §3.6. | Title only; clusters described via the 2007 follow-up abstract. |
| **Best D et al. (2016).** *Overcoming alcohol and other drug addiction as a process of social identity transition.* Addict Res Theory 24(2):111–123. | The Social Identity Model of Recovery. | **Abstract only** — see §5.6. Theoretical paper, not empirical. |
| **Cloud W & Granfield R (1994).** *Terminating Addiction Naturally: Post-Addict Identity and the Avoidance of Treatment.* Clinical Sociology Review 12(1), Art. 13. | Nominally OPEN ACCESS. n=25 in-depth interviews. **The likeliest obtainable source of genuine Granfield & Cloud participant quotes.** | Landing page fetchable; **PDF blocked by an AWS WAF challenge** (curl → JS challenge, fetch → 403). **Retry with a real browser — highest-value single action for this file.** |
| **McIntosh J & McKeganey N (2000).** *Addicts' narratives of recovery from drug use.* Soc Sci Med 50(10):1501–1510. | 70 interviews; the "narratives may be treatment artefacts" critique. | **Abstract only** — see §5.7. |
| **Sypher I et al. (2023).** *What's race got to do with it? Factors contributing to self-change from cocaine use disorder among Black adults.* J Subst Use Addict Treat. PMID 37654008. | 29 Black adults who reduced cocaine use **without formal treatment**; themes named in the abstract: racial identity, responsibility to family, social regard, spirituality, turning point for change, changing one's environment. | **Abstract only; no PMCID, not open access.** The single best-fitting modern study found for the brief. **Needs institutional access.** |
| **Tucker JA et al. (2020).** *Preresolution Drinking Problem Severity Profiles…* Alcohol Clin Exp Res 44(3):738–745. | The prospective test of who can moderate unassisted. | **Abstract only** — see §4A.3. |
| **MacLean et al.**, Forum77 sustained-abstinence language work (cited inside Kornfield 2018); **CSCW 2021 SIMOR paper** doi:10.1145/3449142; **SMART Recovery virtual-groups qualitative study** (S0955395923002219). | Online-recovery leads. | **UNVERIFIED — not obtained. Nothing cited from them.** |

---

## 12. Synthesis — themes with study counts

Counts are of studies **in this document** that support the theme. Not a meta-analysis; sample designs differ.

**T1. Most resolution happens without treatment, and it is roughly half of all resolutions on representative samples. (6 studies)**
Tucker 2020 (~70% improve without intervention); Kelly 2017 (53.9% assisted → 46% unassisted, US probability sample); Day 2024 (49.9% assisted, UK); Cunningham 1999 (54–88% depending on definition); Schutte 2006 (73% of older remitters untreated); Cunningham 2024 (majority reduced without treatment).

**T2. The people who resolve without help have less severe and less complex problems. (5 studies)**
Cunningham 1999; Schutte 2006; Kelly 2017 (diagnosis AOR 10.8, psychiatric history); Day 2024 (diagnosis AOR 9.54, arrest AOR 7.88); Hesse 2024 (explicit statement).
→ **Direct product implication: a self-serve product's addressable population is real and large, but it is the lower-complexity half. Severity, psychiatric comorbidity, and criminal-justice contact are the referral triggers.**

**T3. Turning points are as often mundane as dramatic — and the dramatic ones may not be causal. (5 studies, 1 dissenting)**
Sobell 1993 (**no event distinguished resolvers from non-resolvers, with controls**); Blomqvist 1999 (unassisted change more often gradual and positively motivated); Subhani 2022 (32-study review lists "no specific event" first); Gilbert 2026 (Heather: *"I didn't really decide I'm not going to drink"*; Otis: *"you just grew out of it"*); Rhodes 2018 (15/30 rock-bottom, 15/30 gradual).
**Dissenting:** Matzger 2005 (self-endorsed rock bottom predicted sustained remission at 5 years).

**T4. What sustains change is environmental and social, not motivational. (6 studies)**
Soweid 2024 (changing contexts 69.2%, social connections 67.7% — the top two of nine themes); Blomqvist 1999 (stable recovery uniquely associated with life-context stability/improvement); Bischof 2007 (low social support = the relapse discriminator among natural remitters); Bischof 2000 (disclosure + social-support coping = the only maintenance differences); Sobell 1993 (spousal support most-cited maintenance factor); Yeh 2009 (Interviewee 12's route-changing).
→ **This is the strongest convergent finding in the file, and it is a design brief: help someone change their contexts and their people, not their willpower.**

**T5. Abstinence is not the only stable endpoint. (4 studies)**
Gilbert 2026 (43.1% moderated-drinking goal among severe-AUD untreated resolvers; near-zero binge); Cunningham 2024 (99/166 remitted dependent drinkers were moderate drinkers); Tucker 2020 ("Low-risk drinking is a more common outcome in untreated samples"); Boeri 2014 (meth recovery routes "did not necessarily include cessation of all substances").
**But:** Gilbert 2026 also documents Martin and Veronica failing at moderation after years of abstinence, and Vincent's *"my next drink is not gonna be one, it's gonna be all."* The paper's own framing is that confidence-in-control is the discriminator, and that people **change goals, sometimes repeatedly.**

**T6. Roughly half of resolvers reject the "in recovery" identity, and the rejectors are the untreated. (4 studies)**
Kelly 2018 (39.5% never + 15.4% no longer, US); Day 2023 (28.6% never + 19.0% no longer, UK); Soweid 2024 (15.8% of independent resolvers used the label vs. 51.9% of mutual-help attenders); Martinelli 2023 (Kees and the 54-year-old woman describing deliberately dropping it).
Countervailing voices exist *inside* treated samples too — Stokes 2018's Female, 32: *"I personally don't believe in the 'once an addict, always an addict.'"*
→ **Product implication: "problem resolution" language, recommended explicitly by both Kelly and Day, not recovery-identity language.**

**T7. Identity change is real, but it is about becoming someone, not about labelling the problem. (4 studies)**
Martinelli 2023 (theme 2: identity reconsideration; *"It's in my brain, not in my character"*; *"I don't feel fake anymore"*); Subhani 2022 (identity renewal → construction → formation); Rhodes 2018 (shifting identities, n=9/30); Pettersen 2018 (*"I imagined becoming one of the drunks frequenting the parks, and that just wasn't me"*).
→ Note the direction: the projected **negative future self** ("that just wasn't me") and the projected **positive ordinary self** ("becoming a productive member of society") both appear. Neither is the addict/recovery label.

**T8. Stopping is the small part; the life around it is the work. (4 studies)**
Martinelli 2023 (*"You are just the same asshole as when you were using"*; *"The only thing I needed to change was everything"*); Blomqvist 1999 (life-context improvement); Soweid 2024 (activities, substitution, health habits); Stokes 2018 (*"life was what I was making"*).

**T9. Helping others is a maintenance mechanism, reported across very different samples. (4 studies)**
Vose-O'Neal 2025 (theme 4: providing support matters in sustained recovery specifically); Stokes 2018 (multiple); Yeh 2009 (Interviewee 24: *"Helping people is the best way to stay vigilant myself"*); Subhani 2022 ("sometimes finding themselves in a role to help others").
→ ⚠️ Caveat: this is over-represented in 12-step samples where service is doctrine. In the 65 untreated resolvers (Soweid 2024) it does **not** appear as a named theme.

**T10. The fragile window is the first months, and help matters most there. (4 studies)**
Moos & Moos 2006 (43.4% vs 62.4% 3-year remission; 60.5% vs 42.9% 16-year relapse); Rumpf 2006 (once 12 months held, 92.3% stable at 24 months); Vose-O'Neal 2025 ("chronic early recovery," relapse cycles); Tamersoy 2015 (**"half the population is at high risk of relapse within 1–2 months of the quit attempt; past ~3 years, sustained abstinence becomes highly likely"** — from 8 years of r/StopDrinking badge data, an entirely independent method reaching the same shape).

**T11. Removing barriers beats adding strengths. (3 studies)**
De Meyer 2024 (barriers OR 0.26, p<.001; **strengths p=.74**); Tucker 2020 (dependence symptoms *plus* accumulated problems, not heavy drinking alone, is what rules out unassisted moderation); Heyman 2013 (racial/ethnic differences in remission disappeared once marital status and high-school completion entered the model).
→ **The single most actionable design finding in the file, and it inverts the standard "build your recovery capital" frame.**

**T12. Duration of use does not predict this year's odds. (3 studies)**
Heyman 2013 (constant annual quit rate); Vaillant via Heyman (1 year vs 10 years of addiction did not change 5-year abstinence odds); Vergés 2013 (persistence flat across age, F=0.29, P=.92).
→ **Directly refutes the "it only gets harder" message, which is both common and demoralising.**

**T13. Giving support beats receiving it. (4 studies)**
Tamersoy 2015 (long-term abstainers write "keep it up"/"hang in there"; **high indegree — receiving lots of replies — marks short-term** abstainers); Valdez 2022 (giving-advice posts carry the highest positive affect, F(2,5082)=31.94, p<.001); Kornfield 2018 ("love" words as a *bid* for support predicted relapse, B=1.503, p=.005); Vose-O'Neal 2025 (receiving support crucial in early recovery, **providing** support in sustained recovery).
→ Note this partly re-derives T9 from computational data, in a population with no 12-step doctrine to explain it away.

**T14. Engagement volume predicts nothing good. (3 studies)**
Kornfield 2018 (days used p=.432, messages posted p=.138 — both n.s.); Naserianhanzaei 2022 (total posts b=0.0004, **p=.001, positively** associated with a use episode); Sinclair 2017 (81% of a successfully-quitting community spend just **1–3 hours per week**; the most-valued feature was reading other people's stories at 80.8%, and the *least*-valued was the synchronous chat room at 19.6%).
→ ⚠️ **Three independent designs, same direction. A product whose success metric is time-in-app is optimising against its users.**

**T15. Environment beats disposition. (5 studies)**
Hall & Weier 2017 (same men, same drug, different setting: 20% withdrawal-symptomatic in Vietnam → under 1% re-addicted at home); Soweid 2024 (changing contexts, 69.2%, the top theme); Herbeck 2014 (relocation, 27% of untreated vs 11% of treated); Boeri 2014 (avoidance one of five universal strategies); Yeh 2009 (Interviewee 12's route-changing).
→ Sits directly on top of T4 and is the strongest single mechanism claim the corpus supports.

---

## 13. Cross-cutting: where this agrees and disagrees with forums and memoirs

⚠️ **This section compares the studies above against the *general characterisation* of memoir/forum content. It should be re-checked against the actual forum and memoir corpora in the sibling documents of this folder before being relied on.** Where a published forum analysis is cited, it is marked.

**Agreements:**
- Environment and people change (T4) is what both literatures put first in practice, even when the stated ideology differs.
- Identity work is central in both (T7).
- The "the drinking wasn't the problem, my life was" motif in memoirs matches T8 almost exactly.

**Disagreements — loud ones:**

1. **Rock bottom.** Memoir and forum genre convention makes the rock-bottom scene the structural centre of the story. Sobell 1993, with a control group, found the events were equally common among people who did *not* resolve. Genre demands a scene; the data does not supply a cause. *(§3.1 vs. genre convention.)*

2. **Permanence of the addict identity.** Forums built around 12-step norms treat the identity as lifelong. Two national probability studies find 43–55% of resolvers either never took the identity or dropped it, concentrated among the untreated — i.e. among the people least likely to post in those forums. **The forum population is systematically the identity-adopting minority.** This is a selection effect, not a disagreement about facts. *(§5.1, §5.2.)*

3. **Moderation.** Sobriety forums generally treat moderation attempts as denial. Gilbert 2026 finds 43.1% of untreated resolvers with severe lifetime AUD holding a moderated-drinking goal with near-zero binge drinking. Both are right about different people, and Gilbert 2026 names the discriminator (confidence in and evidence of control) rather than assuming it. *(§2.2.)*

4. **Whether to say any of this out loud.** ~half the UK public thinks publicising natural recovery and moderation would make things worse — but resolvers themselves are significantly *less* likely to think so. The instinct to suppress the message comes from people who have not been through it. *(§7.1.)*

5. **Planning for relapse.** Common advice, and much forum norm, treats relapse-planning as self-sabotage. Pettersen 2018 has a ≥5-year abstinent participant crediting exactly that, explicitly against clinical advice. One participant is not evidence of a general rule — but it is a genuine, cited counterexample. *(§3.7.)*

6. **Talking to them about it.** Matzger 2005: interventions by medical personnel and family members were non-significant or *negatively* related to sustained improvement. *(§3.2.)*

7. **How much time you should spend in the community.** Forums reward high engagement — post counts, flair, badges, daily check-ins. Three independent quantitative studies of those very forums find engagement volume predicts nothing good, and one finds it predicts *harm* (§9.1 n.s. on both use metrics; §9.2 posting more, p=.001, positively associated with a use episode; §9.5 receiving lots of replies marks the *short*-term abstainers). Meanwhile a community with genuinely good outcomes reports a **1–3 hour weekly** dose and rates its synchronous chat room the least helpful feature (§9.7). *(§9.1, §9.2, §9.5, §9.7.)*

8. **Whether the recovery community should be your world.** This is the sharpest conflict in the file. Forum culture treats immersion as commitment. Naserianhanzaei 2022 finds a high *proportion* of recovery-community memberships carries **OR 5.00** for a use episode, while breadth of ordinary non-recovery communities carries **OR 0.25** — and the authors recommend platforms actively point members *out* toward non-recovery interests. Tamersoy 2015 independently finds fitness and religious subreddit participation among long-term-abstinence markers. *(§9.2, §9.5.)*

9. **Milestones.** Both forums and apps build ritual around 30 days, 90 days, one year. Kramer 2024 finds craving-post volume spikes on exactly those days against an otherwise exponential decay. Notably, the members' *own* native ritual (daily IWNDWYT check-ins) is deliberately non-milestone — **the community's organic practice may be better calibrated than the AA-chip metaphor the apps copied.** *(§9.6, §9.3.)*

10. **Who is even in the room.** Sinclair 2017's successfully-quitting online population was **94% female, professional, treatment-naive, with 46.5% never having sought any support** across 10+ years of problem drinking — and explicitly routing around AA and around services because of stigma and because they doubted they were "bad enough." Chen 2025 finds Reddit recovery posts are **63.1% action-stage**, only ~15% contemplation-or-earlier. **The clinical pathway model (treatment → aftercare → mutual aid) describes almost none of these people**, and a tool designed around "helping someone decide to quit" is aimed at a minority of who actually shows up. *(§9.7, §9.9.)*

11. **What support actually looks like versus what we imagine.** The imagined unit of peer support is thoughtful advice. The measured unit is a **ten-word, grade-3-reading-level, strongly positive utterance**; informational support is the *rarest* category at 16.5%, and instrumental support is literally 0% because forum rules forbid it. *(§9.4.)*

> ⚠️ **A standing caution about this whole section.** Points 7–11 compare *published analyses of forums* against *forum folk-practice*. They do not compare against the actual forum and memoir corpora held elsewhere in this folder. **Re-check them against those sibling documents before acting.** In particular, §9's evidence base has a hard selection problem: the people posting on r/stopdrinking are, by §5.1–5.3, systematically the identity-adopting, help-engaged minority of all resolvers — so forum findings generalise poorly to the untreated majority the product would serve.

---

## 14. Full citation list

1. Bischof G, Rumpf HJ, Hapke U, Meyer C, John U (2000). Maintenance factors of recovery from alcohol dependence in treated and untreated individuals. *Alcohol Clin Exp Res* 24:1773–1777. doi:10.1111/j.1530-0277.2000.tb01980.x
2. Bischof G, Rumpf HJ, Hapke U, Meyer C, John U (2002). Remission from alcohol dependence without help: how restrictive should our definition of treatment be? *J Stud Alcohol* 63:229–236. doi:10.15288/jsa.2002.63.229
3. Bischof G, Rumpf HJ, Meyer C, Hapke U, John U (2007). Stability of subtypes of natural recovery from alcohol dependence after two years. *Addiction* 102:904–908. doi:10.1111/j.1360-0443.2007.01834.x
4. Blomqvist J (1999). Treated and untreated recovery from alcohol misuse: environmental influences and perceived reasons for change. *Subst Use Misuse* 34:1371–1406. doi:10.3109/10826089909029389
5. Boeri M, Gibson D, Boshears P (2014). Conceptualizing Social Recovery: Recovery Routes of Methamphetamine Users. *J Qual Crim Just Criminol* 2:5–38. doi:10.21428/88de04a1.ce2a8386
6. Burman S (1997). The challenge of sobriety: natural recovery without treatment and self-help groups. *J Subst Abuse* 9:41–61. doi:10.1016/s0899-3289(97)90005-5
7. Chen G (2018). Building Recovery Capital: The Role of "Hitting Bottom" in Desistance and Recovery from Substance Abuse and Crime. *J Psychoactive Drugs* 50:420–429. doi:10.1080/02791072.2018.1517909
8. Cunningham JA (1999). Resolving alcohol-related problems with and without treatment: the effects of different problem criteria. *J Stud Alcohol* 60:463–466. doi:10.15288/jsa.1999.60.463
9. Cunningham JA (2026). Perceived consequences of disseminating evidence on untreated recovery and moderate drinking after resolving alcohol concerns. *Harm Reduct J* 23(1):85. doi:10.1186/s12954-026-01442-w
10. Cunningham JA, Schell C, Walker H, Godinho A (2024). Patterns of remission from alcohol dependence in the United Kingdom. *Subst Abuse Treat Prev Policy* 19(1):3. doi:10.1186/s13011-023-00588-1
11. Day E, Manitsa I, Farley A, Kelly JF (2023). A UK national study of prevalence and correlates of adopting or not adopting a recovery identity. *Subst Abuse Treat Prev Policy* 18:68. doi:10.1186/s13011-023-00579-2
12. Day E, Manitsa I, Farley A, Kelly JF (2024). The UK National Recovery Survey. *BJPsych Open* 10(2):e67. doi:10.1192/bjo.2023.654
13. De Meyer F, Bencherif N, De Ruysscher C, Lippens L, Vanderplasschen W (2024). Self-change from problems with alcohol and drugs: A scoping review of the literature since 2010. *Drug Alcohol Rev* 43:1349–1360. doi:10.1111/dar.13834
14. Gilbert PA, Soweid L, Maharjan G, Mulia N (2026). Choosing and Managing Non-Abstinent Recovery. *Drug Alcohol Rev* 45(2):e70103. doi:10.1111/dar.70103
15. Hesse M, Brummer J, Nielsen AS (2024). Assisted resolution and self-change: differences between healthcare systems. *BJPsych Open* 10(5):e173. doi:10.1192/bjo.2024.760
16. Kelly JF, Bergman B, Hoeppner BB, Vilsaint C, White WL (2017). Prevalence and pathways of recovery from drug and alcohol problems in the United States population. *Drug Alcohol Depend* 181:162–169. doi:10.1016/j.drugalcdep.2017.09.028
17. Kelly JF, Abry AW, Milligan CM, Bergman BG, Hoeppner BB (2018). On being "in recovery". *Psychol Addict Behav* 32:595–604. doi:10.1037/adb0000386
18. Klingemann H, Sobell MB, Sobell LC (2010). Continuities and changes in self-change research. *Addiction* 105:1510–1518. doi:10.1111/j.1360-0443.2009.02770.x
19. Lee MR, Sher KJ (2018). "Maturing Out" of Binge and Problem Drinking. *Alcohol Res Curr Rev* 39(1):31–42.
20. Martinelli TF, Roeg DPK, Bellaert L, Van de Mheen D, Nagelhout GE (2023). Understanding the Process of Drug Addiction Recovery Through First-Hand Experiences. *Qual Health Res* 33(10):857–870. doi:10.1177/10497323231174161
21. Matzger H, Kaskutas LA, Weisner C (2005). Reasons for drinking less and their relationship to sustained remission from problem drinking. *Addiction* 100(11):1637–1646. doi:10.1111/j.1360-0443.2005.01203.x
22. Mellor R, Lancaster K, Ritter A (2021). Recovery from alcohol problems in the absence of treatment: a qualitative narrative analysis. *Addiction* 116(6):1413–1423. doi:10.1111/add.15288
23. Moos RH, Moos BS (2006). Rates and predictors of relapse after natural and treated remission from alcohol use disorders. *Addiction* 101:212–222. doi:10.1111/j.1360-0443.2006.01310.x
24. Pettersen H, Landheim A, Skeie I, Biong S, Brodahl M, Benson V, Davidson L (2018). Why Do Those With Long-Term Substance Use Disorders Stop Abusing Substances? *Subst Abuse Res Treat* 12:1178221817752678. doi:10.1177/1178221817752678
25. Rhodes BE, Gottfredson NC, Hill LM (2018). Desistance and treatment seeking among women with substance use disorders. *Qual Health Res* 28(8):1330–1341. doi:10.1177/1049732318767637
26. Rumpf HJ, Bischof G, Hapke U, Meyer C, John U (2006). Stability of remission from alcohol dependence without formal help. *Alcohol Alcohol* 41(3):311–314. doi:10.1093/alcalc/agl008
27. Schutte KK, Moos RH, Brennan PL (2006). Predictors of untreated remission from late-life drinking problems. *J Stud Alcohol* 67:354–362. doi:10.15288/jsa.2006.67.354
28. Sobell LC, Sobell MB, Toneatto T, Leo GI (1993). What triggers the resolution of alcohol problems without treatment? *Alcohol Clin Exp Res* 17:217–224. doi:10.1111/j.1530-0277.1993.tb00752.x
29. Soweid L, Gilbert PA, Maharjan G, Holdefer PJ, Evans S, Mulia N (2024). "Everybody needs to find the best path for them". *Alcohol Clin Exp Res* 48(4):743–754. doi:10.1111/acer.15287
30. Stokes M, Schultz P, Alpaslan A (2018). Narrating the journey of sustained recovery from substance use disorder. *Subst Abuse Treat Prev Policy* 13(1):35. doi:10.1186/s13011-018-0167-0
31. Subhani M, Talat U, Knight H, Morling JR, Jones KA, Aithal GP, et al. (2022). Characteristics of alcohol recovery narratives: Systematic review and narrative synthesis. *PLoS ONE* 17(5):e0268034. doi:10.1371/journal.pone.0268034
32. Tucker JA, Chandler SD, Witkiewitz K (2020). Epidemiology of Recovery From Alcohol Use Disorder. *Alcohol Res Curr Rev* 40(3):02. doi:10.35946/arcr.v40.3.02
33. Vose-O'Neal A, Christmas S, Alfaro KA, Dunigan R, Leon AP, Hickman D, Johnson A, Kim ML, Reif S (2025). Understanding pathways to recovery from alcohol use disorder in a Black community. *Front Public Health* 13:1537059. doi:10.3389/fpubh.2025.1537059
34. Yeh MY, Che HL, Wu SM (2009). An ongoing process: a qualitative study of how the alcohol-dependent free themselves of addiction through progressive abstinence. *BMC Psychiatry* 9:76. doi:10.1186/1471-244X-9-76

### Added in the second pass (illicit drugs, recovery capital, online communities)

35. Bergman BG, Kelly JF (2020). Online digital recovery support services: an overview of the science and their potential to help individuals with substance use disorder during COVID-19 and beyond. *J Subst Abuse Treat* 120:108152.
36. Best D, Beckwith M, Haslam C, Haslam SA, Jetten J, Mawson E, Lubman DI (2016). Overcoming alcohol and other drug addiction as a process of social identity transition. *Addict Res Theory* 24(2):111–123. doi:10.3109/16066359.2015.1075980
37. Best D, Hennessy EA (2022). The science of recovery capital: where do we go from here? *Addiction* 117(4):1139–1145. doi:10.1111/add.15732
38. Boeri MW, Sterk CE, Elifson KW (2008). Reconceptualizing Early- and Late-Onset: A Life Course Analysis of Older Heroin Users. *The Gerontologist* 48(5):637–645.
39. Chen AT, Wang LC, Johnny S, Wong SH, Chaliparambil RK, Conway M, Glass JE (2025). Stigma and Behavior Change Techniques in Substance Use Recovery. *JMIR Form Res* 9:e57468. doi:10.2196/57468
40. Cloud W, Granfield R (1994). Terminating Addiction Naturally: Post-Addict Identity and the Avoidance of Treatment. *Clinical Sociology Review* 12(1), Article 13.
41. Cloud W, Granfield R (2008). Conceptualizing recovery capital: expansion of a theoretical construct. *Subst Use Misuse* 43(12–13):1971–1986. doi:10.1080/10826080802289762
42. Colditz JB, Chu K-H, Hsiao L, Barrett E, Kraemer KL, Pedersen SL (2023). Characterizing online social support for alcohol use disorder: a mixed-methods approach. *Alcohol Clin Exp Res (Hoboken)* 47(11):2110–2120. doi:10.1111/acer.15187
43. Day E, Manitsa I, Farley A, Kelly JF (2023). — see item 11; free-text quotes used in §5.3.
44. De Meyer F, Zerrouk A, De Ruysscher C, Vanderplasschen W (2024). Exploring indicators of natural recovery from alcohol and drug use problems: findings from the life in recovery survey in Flanders. *Subst Abuse Treat Prev Policy* 19:22. doi:10.1186/s13011-024-00604-y
45. Dingle GA, Cruwys T, Frings D (2015). Social Identities as Pathways into and out of Addiction. *Front Psychol* 6:1795. doi:10.3389/fpsyg.2015.01795
46. Dingle GA, Stark C, Cruwys T, Best D (2015). Breaking good: Breaking ties with social groups may be good for recovery from substance misuse. *Br J Soc Psychol* 54(2):236–254.
47. Gauthier RP, Costello MJ, Wallace JR (2022). "I Will Not Drink With You Today": A Topic-Guided Thematic Analysis of Addiction Recovery on Reddit. *CHI '22*, ACM. doi:10.1145/3491102.3502076
48. Granfield R, Cloud W (1996). The Elephant That No One Sees: Natural Recovery among Middle-Class Addicts. *J Drug Issues* 26(1):45–61. doi:10.1177/002204269602600104
49. Granfield R, Cloud W (2001). Social Context and "Natural Recovery": The Role of Social Capital in the Resolution of Drug-Associated Problems. *Subst Use Misuse* 36(11):1543–1570. doi:10.1081/JA-100106963
50. Groshkova T, Best D, White W (2013). The Assessment of Recovery Capital: properties and psychometrics of a measure of addiction recovery strengths. *Drug Alcohol Rev* 32(2):187–194. doi:10.1111/j.1465-3362.2012.00489.x
51. Hall W, Weier M (2017). Addiction classics: Lee Robins' study of heroin use among US Vietnam Veterans. *Addiction*. doi:10.1111/add.13584
52. Herbeck DM, Brecht M-L, Christou D, Lovinger K (2014). Predictors of Long-term Abstinence in Long-term Methamphetamine Users. *J Psychoactive Drugs* 46(3):215–225.
53. Heyman GM (2013). Quitting Drugs: Quantitative and Qualitative Features. *Annu Rev Clin Psychol* 9:29–59. doi:10.1146/annurev-clinpsy-032511-143041
54. Hodgins DC, Stea JN (2018). Insights from individuals successfully recovered from cannabis use disorder: natural versus treatment-assisted recoveries and abstinent versus moderated outcomes. *Addict Sci Clin Pract* 13:16. doi:10.1186/s13722-018-0118-0
55. Kornfield R, Sarma PK, Shah DV, McTavish F, Landucci G, Pe-Romashko K, Gustafson DH (2018). What Do You Say Before You Relapse? *Health Commun* 33(9):1184–1193. doi:10.1080/10410236.2017.1350906
56. Kramer T, Groh G, Stüben N, Soyka M (2024). Analysis of addiction craving onset through natural language processing of the online forum Reddit. *PLoS ONE* 19(5):e0301682.
57. Krowka J, Aller L (2025). Recovery From Heroin Addiction: A Qualitative Study. *Public Health Nurs* 42(2):744–753. doi:10.1111/phn.13526
58. Lopez-Quintero C, et al. (2011). Probability and predictors of remission from lifetime nicotine, alcohol, cannabis or cocaine dependence. *Addiction* 106(3):657–669. PMID 21077975
59. McIntosh J, McKeganey N (2000). Addicts' narratives of recovery from drug use: constructing a non-addict identity. *Soc Sci Med* 50(10):1501–1510. doi:10.1016/S0277-9536(99)00409-8
60. Naserianhanzaei E, Koschate-Reis M (2022). Effects of Substance Use, Recovery, and Non–Drug-Related Online Community Participation on the Risk of a Use Episode During Remission From Opioid Use Disorder. *J Med Internet Res* 24(8):e36555.
61. Sinclair JMA, Chambers SE, Manson CC (2017). Internet Support for Dealing with Problematic Alcohol Use: A Survey of the Soberistas Online Community. *Alcohol Alcohol* 52(2):220–226. doi:10.1093/alcalc/agw078
62. Slutske WS (2010). Why is natural recovery so common for addictive disorders? *Addiction* 105:1520–1. doi:10.1111/j.1360-0443.2010.03035.x
63. Sypher I, Pavlo A, King J, Youins R, Shumake A, Lopez J, Haeny AM (2023). What's race got to do with it? Factors contributing to self-change from cocaine use disorder among Black adults. *J Subst Use Addict Treat*. PMID 37654008. doi:10.1016/j.josat.2022.208945
64. Tamersoy A, De Choudhury M, Chau DH (2015). Characterizing Smoking and Drinking Abstinence from Social Media. *Proc 26th ACM Conf Hypertext & Social Media*, 139–148. doi:10.1145/2700171.2791247
65. Thulin EJ, Walton MA, Bonar EE, Fernandez A (2024). Examining the Popularity, Content, and Intersections With SAMHSA's Definition of Recovery in a Nonclinical Online Cannabis Cessation Community. *J Med Internet Res* 26:e47357.
66. Tucker JA, Cheong J, James TG, Jung S, Chandler SD (2020). Preresolution Drinking Problem Severity Profiles Associated with Stable Moderation Outcomes of Natural Recovery Attempts. *Alcohol Clin Exp Res* 44(3):738–745. doi:10.1111/acer.14285
67. Tucker JA, Roth DL, Vignolo MJ, Westfall AO (2009). A behavioral economic reward index predicts drinking resolutions. *J Consult Clin Psychol* 77(2):219–228.
68. Valdez D, Patterson MS (2022). Computational analyses identify addiction help-seeking behaviors on the social networking website Reddit. *PLOS Digit Health* 1(11):e0000143.
69. Vergés A, Haeny AM, Jackson KM, Bucholz KK, Grant JD, Trull TJ, Wood PK, Sher KJ (2013). Refining the Notion of Maturing Out. *Am J Public Health* 103(12):e67–e73.
70. Witkiewitz K, Montes KS, Schwebel FJ, Tucker JA (2020). What Is Recovery? *Alcohol Res Curr Rev* 40(3):01. doi:10.35946/arcr.v40.3.01
71. Wyse JJ (2018). Older former prisoners' pathways to sobriety. *Alcohol Treat Q* 36(1):32–53. doi:10.1080/07347324.2017.1355222

⚠️ **Note on item 70:** Witkiewitz et al. (2020) miscredits recovery capital to "Granfield and Smith." It is Granfield and **Cloud**. Do not propagate the error.
