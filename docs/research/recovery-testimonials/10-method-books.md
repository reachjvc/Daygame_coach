# 10 — Method books and programmes: what they actually tell you to do, and whether it works

Research date: 2026-08-17.

**Every quoted string in this file was read from a URL that was actually fetched, and the URL
sits next to the quote.** Nothing is quoted from memory. Where a claim could not be verified
against a live page it appears under an explicit `UNVERIFIED` heading, without quotation marks,
and it may not be promoted into the product.

**Scope.** Thirteen methods people repeatedly name when they credit something for changing an
addictive behaviour. For each: (A) the mechanical description — what the method tells a person
to *do* or *think*, stripped to something implementable; (B) the evidence; (C) real user
accounts, crediting and failing; (D) licensing; (E) verdict.

## The bias in this file

Three different things are being reported here and they routinely disagree:

1. **Trial evidence** — what controlled studies found.
2. **What users credit** — heavily survivorship-biased. People for whom a book worked write
   reviews and forum posts; people for whom it did nothing mostly go quiet.
3. **What users say did not work** — the rarest and most valuable category, and the one this
   file went hunting for hardest.

Allen Carr is the clearest illustration: enormously credited by quitters, thin and mixed trial
evidence. The Freedom Model is the inverse warning: confident published success rates produced
entirely in-house by the organisation selling the programme.

## Fetching constraints hit during this research

For honesty about coverage: `reddit.com` and `old.reddit.com` are **blocked** to the fetch tool
in this environment, `trustpilot.com` and `quora.com` return **403**, `pubmed.ncbi.nlm.nih.gov`
serves a cookie wall, and `soberrecovery.com` returned 403. Peer-community quotes are therefore
thinner in this file than in the Reddit-focused files in this directory. Where a search engine
surfaced a snippet but the underlying page could not be fetched, the material is marked
UNVERIFIED rather than quoted. The Europe PMC REST API
(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=…&resultType=core&format=json`)
was the workaround for abstracts and it works well.

---

# Contents

| # | Method | Evidence | Verdict |
|---|---|---|---|
| 1 | Allen Carr's Easyway | 2 RCTs: one positive/independent, one **null/company-funded**. Nothing at all for alcohol | adapt the mechanism; hard safety gate on alcohol |
| 2 | Annie Grace — This Naked Mind / The Alcohol Experiment | **none found** | adapt the mechanic, not the book |
| 3 | William Porter — Alcohol Explained | **none found** | adapt one mechanic |
| 4 | Craig Beck / Stop Drinking Expert | **none found** | **not worth it** |
| 5 | The Freedom Model | vendor-produced only | **not worth it, actively avoid** |
| 6 | Rational Recovery / AVRT | see §6 | see §6 |
| 7 | SMART Recovery toolkit | see §7 | see §7 |
| 8 | Gabor Maté | see §8 | see §8 |
| 9 | Atomic Habits / James Clear | implementation intentions real (d≈.65) but **g≈0.31** for alcohol/tobacco; book untested | scaffolding only — **no streak counter** |
| 10 | Duhigg habit loop | journalist synthesis, no trial; habit model of addiction contested | build the diagnostic, not the model |
| 11 | Judson Brewer / MBRP / urge surfing | **real RCTs**, but best meta-analysis null on relapse; author COI | **build**, claim sized honestly |
| 12 | Dry January and structured challenges | **best behavioural evidence here** | **build** |
| 13 | The Sinclair Method | good for the drug (NNT 12); "78%" unsourced | support, never direct |

---

# 1. Allen Carr's Easyway

The case the brief flagged, and it holds up: enormously credited, and the trial evidence is
weaker and more equivocal than the reputation.

## (A) Mechanical description

The best *citable* description of the mechanics is the peer-reviewed trial protocol, because it
describes the seminar in implementable terms and is open access.

Session shape — <https://pmc.ncbi.nlm.nih.gov/articles/PMC5735399/>:

> "The ACE intervention involves a single group session with up to 25 attendees, led by a trained facilitator. The 5–6 hour session broadly comprises elements of cognitive behavioural therapy (CBT)"

The core reframe — the "no genuine pleasure" move, same source:

> "Participants are assisted in identifying positive expectancies they associate with smoking (eg, pleasure, support, crutch or other benefits) before working towards the conclusion that the belief that smoking provides these benefits is, in fact, erroneous and harmful."

Stated more bluntly in Dijkstra et al., *BMC Public Health*
(<https://pmc.ncbi.nlm.nih.gov/articles/PMC4189200/>):

> "The core of the argument…is that smoking tobacco has no real benefits; it is only smoking away withdrawal symptoms in an addicted body."

Keep using the drug until a defined point — <https://pmc.ncbi.nlm.nih.gov/articles/PMC5735399/>:

> "Participants are encouraged to carry on smoking as normal right up until they attend the clinic, and during the session they are encouraged to smoke as normal during scheduled smoking breaks (around every 45–60 min)."

The final-cigarette ritual, same source:

> "These sessions end with a 'ritual' final cigarette followed by an approximately 20 min period of hypnotherapy—a light relaxation exercise that reinforces the main points of the session."

Corroborated independently in Keogan et al. (<https://pmc.ncbi.nlm.nih.gov/articles/PMC6589447/>):
"Participants smoke during smoking breaks until there is a ritualistic final cigarette followed
by a 20 min relaxation exercise."

Aftercare — <https://pmc.ncbi.nlm.nih.gov/articles/PMC5735399/>: SMS/email/phone contact on
"day 1, and again at 3, 7, 10, 14, 21, 30, 45, 60, 75, and 90 days", plus optional top-up
sessions. **This schedule is published in an open-access protocol and is free to copy.**

The company's own instruction set (<https://www.allencarr.com/easyway-stop-smoking/top-tips-to-stop-smoking/>),
verbatim fragments:

> "You're going to stop naturally so carry on smoking as usual until then."

> "The physical withdrawal is very slight and passes quickly."

> "Never be fooled into thinking you can have the odd smoke."

> "Nicotine Replacement Therapy; patches, gums, nasal sprays, e-cigarettes…simply keep the addiction to nicotine alive."

> "You are already a non-smoker the moment you put out your final cigarette."

That last one is the load-bearing design decision and it is easy to miss: **identity flips at the
ritual, not after N days.** That is *why* there is no day-counting in the method. It is the same
conclusion the existing quit-vice module reached independently (`docs/plans/quitting-a-vice.md`
line 48, "There is no streak counter, anywhere") and the same conclusion the Dry January data
supports in §12. Three independent routes to one decision.

The method also supplies a scripted craving response, same page — note that it is celebratory
rather than endurance-based:

> "Isn't it marvellous: I don't need to smoke anymore"

and instructs users to socialise normally and pity smokers rather than envy them.

Mechanism education is an explicit component, from the protocol
(<https://pmc.ncbi.nlm.nih.gov/articles/PMC5735399/>):

> "Participants also achieve a basic understanding of how the psychological and pharmacological mechanisms of nicotine addiction facilitate the maintenance of erroneous and problematic beliefs."

Book-level expression, short quotes verified from the Goodreads quotes page for the current
edition (<https://www.goodreads.com/work/quotes/64066894>):

> "THERE IS NO PLEASURE OR CRUTCH IN SMOKING!"

> "Smoking creates an artificial feeling of insecurity and emptiness."

> "Knowledge is not necessarily enough to beat the nicotine trap."

**Implementable sequence, stripped:** (1) name the expectancies you hold about the drug;
(2) demolish each as a misattribution — the "relief" is the drug undoing its own withdrawal;
(3) reframe the *fear of stopping* as itself a product of the addiction; (4) therefore reframe
quitting as gain, not sacrifice, so no willpower contest is needed; (5) keep using right up to a
scheduled endpoint, no tapering; (6) a marked, ritualised final use plus a vow; (7) relaxation
and consolidation; (8) reframe subsequent pangs as evidence of the drug leaving, met with
gladness; (9) refuse substitutes, "just one", and emergency stashes; (10) scheduled re-contact
over 90 days.

## (B) Evidence — blunt version

### The Dublin RCT — Keogan, Li & Clancy
*Tobacco Control* 2019;28(4):414–419 (**not** *Addiction*).
<https://pmc.ncbi.nlm.nih.gov/articles/PMC6589447/>

- Open (unblinded) single-centre RCT, n=300 (151 Allen Carr / 149 Quit.ie), mean age 44.
- Recruitment: "Smokers were recruited through public advertisement in an Irish national
  newspaper, and on national and local radio in July 2015." **Self-selected volunteers.**
- CO-verified at every visit.
- Quit rates: AC 38 / 27 / 23 / **22%** vs Quit.ie 20 / 15 / 15 / **11%** at 1/3/6/12 months.
- "Being in the AC condition increased the odds of quitting by 2.3 (95% CI 1.2 to 4.2)".
- **Retention 179 / 127 / 113 / 101 of 300** — roughly two-thirds lost by 12 months (ITT counts
  them as smokers).
- Funding: "DOH Ireland Grant: NL14/1" — Irish Department of Health. **The one trial without
  company money.**
- Weight gain higher in the AC arm (3.8 kg vs 1.8 kg).

### The UK RCT — Frings et al., *Addiction* 2020
<https://pmc.ncbi.nlm.nih.gov/articles/PMC7186816/> · protocol
<https://pmc.ncbi.nlm.nih.gov/articles/PMC5735399/> · registration
<https://clinicaltrials.gov/study/NCT02855255>

Two-arm parallel single-blind RCT, n=620, London, Feb 2017–May 2018. Primary outcome continuous
26-week abstinence, CO-verified <10 ppm.

> "Continuous abstinence to 26 weeks was 19.4% (60 of 310) in the ACE intervention and 14.8% (46 of 310) in the SSS intervention [risk difference for ACE versus SSS 4.5% (95% confidence interval (CI) = –1.4 to 10.4%, odds ratio (OR) = 1.38)]. The Bayes factor for superiority of the ACE condition was 1.24."

> "There was no clear evidence of a difference in the efficacies of the Allen Carr's Easyway (ACE) and specialist smoking cessation support."

**The CI crosses zero and BF=1.24 is essentially no evidence either way. This is a null result,
not a win.**

**Funding: "Funding was provided by Allen Carr's Easyway International Ltd."** The protocol says
it outright: "This trial is funded in full by Allen Carr's Easyway (International) Ltd."
Safeguards were real — independent steering committee, protocol peer review, analysis run by
LSBU, no company veto — and competing interests are declared as "None". Authors' own
limitations: vulnerable patients excluded, "51.30% [were] lost to follow-up".

Note for accuracy: **Frings' Easyway output is two papers**, the protocol and the results paper.
A Europe PMC author search returned no other Easyway-specific work. Do not describe it as a
research programme.

### The weaker studies
- **Hutter, Moshammer & Neuberger 2006** (PMID 16133522) — uncontrolled workplace cohort, n=223;
  1-year quit rate "40% (worst case assumption) to 55% (best estimate)". No control group.
- **Moshammer & Neuberger 2007** (PMID 17097816) — 3-year follow-up, n=510; "262 (51.4%)
  reported continuing abstinence"; urinary cotinine in a random subsample of 61. Uncontrolled.
- **Dijkstra et al. 2014** (<https://pmc.ncbi.nlm.nih.gov/articles/PMC4189200/>) —
  quasi-experimental, 124 vs 161 matched controls; 41.1% vs 9.6% at 13 months, OR 6.52 (95% CI
  3.1–13.72). **Co-funded by the Dutch Allen Carr licensee, with one author employed by it.**
  Authors concede the design "allows no definite conclusion about the effectiveness".
- **Foshee et al. 2017** (PMID 28719709) — the *only* test of the **book**. 112 head-and-neck
  cancer patients recruited, 52 followed up. Free book 26% vs recommended-purchase 32%, p=0.76.
  Reading the book did not correlate with cessation (p=0.81). **Null.** The systematic review
  rated it "serious risk" of bias.

### Reviews and guidelines
Possenti, Scala, Lugo, Clancy, Keogan & Gallus, *Tobacco Prevention & Cessation* 2023
(<https://www.tobaccopreventioncessation.com/The-effectiveness-of-Allen-Carr-s-method-for-smoking-cessation-A-systematic-review,172314,0,2.html>)
— six studies, unfunded, **but two of its six authors wrote the Dublin RCT it reviews.**
Conclusion: "The AC seminar may be an effective intervention for smoking cessation. This
approach deserves further RCTs with large sample sizes to strengthen the evidence."

**No Cochrane review of Easyway exists.** NICE NG209 does include it; the company's own page
(<https://www.allencarr.com/about-allen-carrs-easyway/nice/>) renders the recommendation as
"ACE [Allen Carr's Easyway] is a non-pharmacological option [drug free option] that could be
considered for adults who want to stop smoking" — the square brackets are the company's
insertions, and NICE's own pages 403 to automated fetch, so the underlying wording is
second-hand. NICE separately issued a research recommendation because the online and book
formats are untested.

**WHO "endorsement" is a campaign partnership, not clinical endorsement.** The 2024 WHO clinical
treatment guideline for tobacco cessation (<https://www.ncbi.nlm.nih.gov/books/NBK604665/>) does
not mention Allen Carr or Easyway anywhere.

**Real-world population data are unflattering.** Jackson, Brown, Buss & Shahab's Smoking Toolkit
Study analysis (medRxiv 10.1101/2024.09.16.24313731) found **"no clear evidence of benefit"** for
Allen Carr's Easyway among English quit attempters. The AC-specific odds ratio could not be
extracted from the abstract.

### The marketing gap — worth knowing before we imitate anything about how this is sold
The company's success-rate page (<https://www.allencarr.com/help-and-faqs/success-rate/>) claims
"The success rate at Allen Carr's Easyway Centres is over 50% after 12 months" and "over 90% for
stop smoking, stop drinking and quit drugs seminars based on the three month money-back
guarantee." The two RCTs measured **22%** (12 months) and **19.4%** (26 weeks). The 90% figure is
a **refund-non-claim rate**, not a quit rate: the guarantee page
(<https://www.allencarr.com/moneyback-guarantee/>) says "Less than 10% of our clients make a
claim", and the refund requires attending "at least two free back-up seminars within three
months" and is void on cancellation, postponement, no-show, or arriving over 15 minutes late.

And on the trial they funded, the company's headline
(<https://www.allencarr.com/easyway-stop-smoking/uk-clinical-trial-allen-carr/>) reads:

> "New clinical trial PROVES Allen Carr's Easyway are at least as effective as The UK's gold standard NHS Service"

— for a paper whose own stated conclusion is "no clear evidence of a difference in the
efficacies". **This is the gap between credit and evidence made literal, in the vendor's own
words, and it is the single clearest illustration of why this file separates the two.**

### ALCOHOL: there is no evidence. None. And there is a safety problem.
- Europe PMC search across "Allen Carr" OR Easyway AND (alcohol OR drinking OR cannabis):
  **zero studies evaluating it for anything but smoking.**
- ClinicalTrials.gov: exactly **one** registered Easyway trial ever — NCT02855255, smoking.
- **Safety flag.** The alcohol book applies a "stop abruptly, no tapering" procedure to a drug
  where that can kill. NHS (<https://www.nhs.uk/conditions/alcohol-misuse/treatment/>): "It can
  be very dangerous to stop drinking suddenly if you're dependent on alcohol" and "If you get
  withdrawal symptoms, get medical help before you try to stop drinking."

**A software product shipping the no-taper pattern for alcohol or benzodiazepines without a
dependence screen and a hard medical-referral gate is a genuine safety and liability risk.**
Not an issue for nicotine or cannabis. This is the highest-risk single item in this file.

## (C) User accounts

Reddit and Quora were unfetchable. Everything below is from a fetched page. Display names that
look like real names of private individuals are withheld.

**Aggregate shape first, because it frames everything else.** Smoking book
(<https://www.goodreads.com/book/show/6618.The_Easy_Way_to_Stop_Smoking>): 4.27 average, 19,120
ratings — 5★ 56%, 4★ 23%, 3★ 12%, 2★ 4%, 1★ 2%. Alcohol book
(<https://www.goodreads.com/book/show/9321.Easy_Way_to_Control_Alcohol>): 4.15 average, 2,919
ratings — 5★ 49%, 4★ 27%, 3★ 15%, 2★ 5%, 1★ 2%. **Roughly one reader in five rates it 3★ or
below on both.** The reputation is real and so is the dissent.

Credited, with the mechanism named — Goodreads, *Easy Way to Control Alcohol*
(<https://www.goodreads.com/book/show/9321.Easy_Way_to_Control_Alcohol>):

> "This worked for me! I've been completely sober since reading this book - ten years ago!" … "Not only do I not drink, I don't miss it. Not even a little."

> "I read the book then immediately quit drinking. No cravings, no willpower."

Note what is being credited in both: **the absence of felt deprivation**, not the argument.

### Failure accounts — the valuable half

Goodreads, *The Easy Way to Stop Smoking*
(<https://www.goodreads.com/book/show/6618.The_Easy_Way_to_Stop_Smoking>) — 4.27 average across
19,120 ratings; 2% one-star, 4% two-star:

> "Utter rubbish. Allen Carr uses neurolinguistic programming (quite poorly - mostly just repetition and weasel words)… It may work on the weak minded, but for anyone who is actually used to thinking and critically evaluating things, it's just crap."

A reviewer who nonetheless quit found the "constant, self-congratulatory tone can get obnoxious"
and compared the marketing to "a pyramid scam".

Goodreads ebook edition (<https://www.goodreads.com/book/show/60036107>): the opening chapters
are "just full of incessant begging"; "This book could've been summarized in like maybe 70-120
pages"; one chapter contains "an entire page shamelessly copy/pasted from a previous chapter".

On the alcohol book — the "no sacrifice" framing collapsing, which is the single most
product-relevant failure mode in this section
(<https://www.goodreads.com/book/show/9321.Easy_Way_to_Control_Alcohol>):

> "a lovely Scotch, herbal gin…can taste fantastic. My taste buds aren't lying to me." (2 stars)

> "Don't bother reading this if you are truly addicted to alcohol…contains NO tools whatsoever to deal with life sober." (1 star)

> "The 'easy way' boils down to knowing alcohol is a poison…and therefore deciding to never have another drink. Wow, thanks Allen." (1 star)

And a reader raising the same safety point independently (3 stars): the book "majorly minimizes"
alcohol withdrawal risks, potentially "life threatening" for severely dependent people.

### More failure accounts, from fetchable forums

**Sourcing caveat:** reddit.com is hard-blocked to this toolchain. The Reddit quotes below came
from the Arctic Shift archive API (arctic-shift.photon-reddit.com), which returns raw comment
bodies plus permalinks — **the text was seen in the API response, not on the rendered page.**
Mumsnet, Hacker News, Goodreads and unbekoming were fetched directly. Trustpilot, Amazon, Quora
and MetaFilter all 403'd.

> "Yeah, that Allen Carr book is mediocre at best. It blows my mind why it is recommended everywhere. There are no books, no special points, no right combination of words just waiting to be perceived to alleviate this situation. Why would anyone imply there are? Idiots." — u/Dull-Mulberry8710, <https://www.reddit.com/r/stopsmoking/comments/1vmp2r8/relapse_after_90_days_and_the_problem_of/p3bmhkv/>

**The "no sacrifice" frame collapsing on contact with real withdrawal** — the single most
important failure quote in this file:

> "Allen carr is so magical in making it certain that you have already smoked your last ciggerete but the post quit problems like headaches, low energy, feeling overwhelmed and stressed are somethings that allen carr doesn't mention about. These problems are so terrible and persistent that at times they make you even regret your decision of quiting." — u/Run_Tec, <https://www.reddit.com/r/stopsmoking/comments/1vovpqi/im_34_days_in_but_still_high_stress_and_headaches/p3t16u8/>

**The "keep using while you read" instruction weaponised as a permanent off-ramp** — a direct
design warning for anyone implementing that mechanic:

> "i read easy way to stop smoking last year..got to the part where he says 'if you still don't feel ready to quit put this book down and come back in a couple of months'..but i never did.." — babyonboard, <https://www.mumsnet.com/talk/other_subjects/91607-do-allen-carr-books-really-work>

Flat failures, three on one thread
(<https://www.mumsnet.com/talk/am_i_being_unreasonable/2970179-To-ask-people-who-have-read-Allen-Carr-Stop-Smoking-books>):
"I tried, twice - didn't work for me"; "It didn't work at all for me".

Partial failure — dose reduced but dependence intact:

> "managed to change from having 30/day to 3 on a Sunday evening in the pub. But if I didn't get to the pub on Sunday evening it ate me up inside" — u/rahoulb, <https://news.ycombinator.com/item?id=5054081>

And the honest ambivalent verdict, 5 stars:

> "This is really, truly a terrible book that uses very transparent psychological trickery to convince you to stop smoking. But, it totally worked on me so it gets 5 stars." — <https://www.goodreads.com/book/show/6618.The_Easy_Way_to_Stop_Smoking>

### The "wore off" / re-read pattern — the strongest product signal in this file

Goodreads discussion thread (<https://www.goodreads.com/topic/show/1495548-just-read-it-to-the-end>):
a commenter relapsed on a single cigarette around day 30 of a one-month quit, then re-did it.

> "boring, tedious, repetitive, but it works"

> "read it to the end… read it again if you have to"

And, much more explicitly:

> "I read this book… in 2 nights. Woke up the next morning and POOOOF.. no desire to smoke, gave up cold turkey with no 'side-effects' 3yrs i gave up.. then started again… so I re-read the book aaand again stopped smoking for another 8mths. I started again re-read again.. same result. Started again then it didnt work!" — commenter "wayne john", <https://www.unbekoming.com/p/allen-carrs-easy-way-to-stop-smoking/comments>

> "Be careful cause it works like magic only the first time." — u/d-equivalence, <https://news.ycombinator.com/item?id=9869987>

> "I read that book the first time in 2003, and probably more than ten times since. I attended the seminar three times. It was finally the online seminar that made the ideas click for me." — u/microcentury, <https://news.ycombinator.com/item?id=5621845>

> "I did read the book 3 times in a row until all the thinking damage in my head was gone." — u/access_denied, <https://news.ycombinator.com/item?id=763122>

Residue even after failure, which argues the exposure is not wasted:

> "even though I failed with Alan the first time, the things he said are still there and that's why it was easy for me to stop when pregnant" — Mumsnet, <https://www.mumsnet.com/talk/am_i_being_unreasonable/2970179-To-ask-people-who-have-read-Allen-Carr-Stop-Smoking-books>

And the mechanism named cleanly by someone it worked for:

> "The breakthrough was the realisation that the response that says 'I want a cigarette' is a broken thought process that was learned, i.e. is not natural, and can be unlearned." — u/microcentury, <https://news.ycombinator.com/item?id=5621845>

### The alcohol version, from readers
Strongest negative, and it is a safety objection rather than a taste one
(<https://www.goodreads.com/book/show/9321.Easy_Way_to_Control_Alcohol>, 1★, "Milky Boi"):

> "A very dangerous book."

> "Carr seems to have very little understanding of alcohol and the dangerous effects of withdrawal."

> "Egregiously applying his 'easyway' product to this topic with evidently little research is very reckless."

### UNVERIFIED — could not source, and it matters
**No account was found of anyone describing feeling guilty or broken for failing at a method sold
as easy and guaranteed.** That was searched for repeatedly and not found. It is the most
important pattern the brief asked for and its absence is a genuine gap, not a null result — the
sources that would carry it (Trustpilot, Amazon, Quora, MetaFilter, EX Community) all 403'd, and
Goodreads star-filters do not work server-side so the sample skews positive. Also not found: any
account of the seminars being cult-like, or of anyone actually claiming the refund.

**The re-read is user-invented maintenance. The book itself frames one reading as sufficient.**
That gap is a product opportunity — and note the company already concedes it commercially: the
money-back guarantee *requires* attending two further seminars, and optional top-up sessions
exist. The organisation assumes the effect needs refreshing even where the book denies it.

### The effect arrives at completion, not incrementally — the most important design finding here
From the same thread: a commenter reports "no withdrawal pangs" and warns that

> "the book worked until almost the last page"

Read alongside the trial evidence, this is the crux. Both positive results come from a single
5–6 hour immersive session. Users describe the shift as a **duration-and-closure effect, not an
information effect.** An app that drips the same content across days is not the same
intervention, and the only test of a self-directed format (Foshee, the book) was null.

**If we build this, preserve the immersive-single-session shape, not the content-drip shape.**
That is a specific, falsifiable design constraint, and it cuts against how habit apps are
normally built.

## (D) Licensing

**Corporate entity — verified.** Companies House 02423347
(<https://find-and-update.company-information.service.gov.uk/company/02423347>): ALLEN CARR'S
EASYWAY (INTERNATIONAL) LTD., incorporated 18 September 1989, **Active**, Park House, 14 Pepys
Road, Raynes Park, London SW20 8NH. Formerly EASYWAY PRODUCTIONS LIMITED and TOWERING LIMITED.

Governance note worth diligence: PSC Robin Hayley >50–<75%; global CEO John Dicey **resigned as
director 17 April 2025**; two PSCs ceased 28 August 2025. There is also ALLEN CARR'S EASYWAY (US)
LTD, no. 08779260.

**Publishing — copyright is split.** "Arden Books" could **not** be verified as copyright holder
anywhere; the brief's assumption appears to be wrong. What was verified:

- The company asserts copyright in its own materials
  (<https://www.allencarr.com/help-and-faqs/terms-and-conditions/>).
- **Arcturus Publishing Ltd is the current book publisher** (53 titles in its Easyway collection,
  <https://arcturuspublishing.com/collections/allen-carrs-easyway>) and **sends DMCA notices in
  its own name for the books**, while the company sends them for DVD/audio. That split is the best
  available signal of who holds what.
- Historic editions across Penguin, Sterling, Clarity, Arcturus
  (<https://openlibrary.org/search.json?q=allen+carr+easy+way+to+stop+smoking>).

**Trademarks — actual register data**, via the TMview/TMDN API (UKIPO, EUIPO and Justia all 403'd
to direct fetch):

| Office | Mark | Number | Status | Classes |
|---|---|---|---|---|
| UK | ALLEN CARR'S EASYWAY | UK00903165131 | Registered | 9, 16, 35, 41, 44 |
| UK | ALLEN CARR | UK00903395266 | Registered | 9, 16, 35, 41, 44 |
| EUTM | ALLEN CARR'S EASYWAY | 003165131 | Registered | 9, 16, 35, 41, 44 |
| **EUTM** | **EASYWAY (bare)** | **005114971** | **ENDED** | — |
| US | ALLEN CARR'S EASYWAY | RN 3450766 | Registered, renewed 2018 | 9, 16, 41 |
| US | ALLEN CARR | RN 3518830 | Registered | 9, 16, 41, 44 |

**Key finding: they hold no live bare "EASYWAY" mark in UK/EU/US** — in the UK, EASYWAY in
classes 35/39/43 belongs to easyGroup. What *is* live is the **"ALLEN CARR" / "ALLEN CARR'S
EASYWAY" name family in class 9 (software), 41 (training) and 44 (health)** — precisely the
classes a recovery app occupies.

**Enforcement posture: aggressive on verbatim piracy, no record of method litigation.**
- Lumen: **336 notices** matching "easyway"; Arcturus and the company routinely DMCA books, DVDs
  and audiobooks against Google and Vimeo
  (<https://lumendatabase.org/notices/search?term=easyway>).
- **WIPO UDRP: 0 decisions** for "Allen Carr" and 0 for "easyway" — the control query "easyjet"
  returned 93 on the same endpoint, so this is a real negative, not a broken query.
- **USPTO TTAB: no proceedings** naming Allen Carr. EUTM 005114971's record shows
  `oppositions: []`, `cancellations: []`.
- No franchisee suit, cease-and-desist or copycat action found in any public source.

**Franchise economics** (<https://www.vettedbiz.com/franchises/allen-carrs-easyway>, FDD 2022):
initial fee $20,050–$100,050, **royalty 20% of monthly sales**, total investment $275k–$472k.
The 20% royalty is the tell — **the licence's value is the brand and the trained-facilitator
channel, not a monopoly on the ideas.**

**Technique vs expression.** 17 U.S.C. §102(b)
(<https://www.law.cornell.edu/uscode/text/17/102>), verbatim:

> "In no case does copyright protection for an original work of authorship extend to any idea, procedure, process, system, method of operation, concept, principle, or discovery, regardless of the form in which it is described, explained, illustrated, or embodied in such work."

The US Copyright Office is almost on the nose here — Circular 31
(<https://www.copyright.gov/circs/circ31.pdf>): copyright in a book describing a system "will not
give the author any right to prevent others from adapting the system itself for commercial or
other purposes or from using any procedures, processes, or methods described in the book." UK law
reaches the same place via CDPA 1988 s.1 (<https://www.legislation.gov.uk/ukpga/1988/48/section/1>),
which grants no monopoly in a therapeutic method.

**Free to rebuild in our own words:** the withdrawal-relief-misattribution reframe; treating
willpower as the wrong tool; no tapering / use-until-the-endpoint; a marked final-use ritual plus
commitment; greeting pangs as evidence of recovery; refusing substitutes, "just one", and
emergency stashes; the 90-day contact schedule. All procedure.

**Rebuild from the Keogan and Frings papers, not from the book.** Those papers describe the
procedure in neutral peer-reviewed language, which is a clean, citable, non-infringing statement
of the method and removes any question of derivation from Carr's prose. This is the single most
useful licensing finding in this file.

**Not free:** Carr's actual sentences and paragraphs; his coined metaphors *as phrased* — the
"Little Nicotine Monster" / "Big Monster", the tight-shoes analogy, the "trap"; the particular
selection and arrangement of chapters; all branding. Separately from copyright, "Easyway",
"Allen Carr" and "Allen Carr's Easyway" function as trademarks — we cannot name a product with
them or imply endorsement, even though the technique is unprotectable.

**Enforcement posture could not be established.** No DMCA, UDRP, TTAB or IP litigation surfaced,
but the search also hit repeated fetch failures. **Treat "not litigious" as unproven, not
established.** They run a per-territory franchise network, which implies active mark policing.

### UNVERIFIED — could not source
- **Trademark registrations.** Search surfaced US serials 78352842 (ALLEN CARR'S EASYWAY),
  74586365 (EASYWAY), 77062688 (ALLEN CARR) but no record could be opened. Owner, class and
  live/dead status all unconfirmed. No UK IPO or EUIPO record retrieved.
- "Arden Books" as copyright holder — no evidence found at all.
- Chapter titles "The Moment of Revelation" and "The Final Cigarette" — corroborated only by
  search snippets of summary sites, never by a fetched page. **The "moment of revelation" is
  therefore described below as a phenomenon, not quoted as a chapter.**
- The AC-specific effect estimate in the Smoking Toolkit real-world study.

## (E) Verdict — **adapt the mechanism, do not clone the product, do not ship the alcohol version as designed**

**The evidence supports "about as good as standard care", not "better".** The company-funded RCT
is null. The independently funded RCT is positive but open-label, self-selected via newspaper
advertising, and two-thirds lost to follow-up. Population data show no clear benefit. Absolute
quit rates in both trials — 19–22% — are ordinary. Build from it because it is a plausible,
cheap, drug-free behavioural frame, not because it beats anything.

**Implementable:**
- The expectancy-elicitation → demolition loop. The user lists what they believe the drug does
  for them; the product addresses each. This is the actual engine, and it is structurally the
  same move as Annie Grace's ACT (§2) and SMART's ABC-D (§7). **Three of the most-credited
  methods in this file converge on one mechanic. Build that mechanic once.**
- Reframing a pang as evidence of recovery rather than deprivation — a one-tap "pang logged"
  interaction that responds with gladness framing instead of a resist-counter. Cheap,
  distinctive, and the opposite of streak-shaming (see §9).
- A scheduled quit moment with a ritualised final use and an explicit commitment artefact, no
  tapering — **for nicotine and cannabis only.**
- The 90-day decaying contact schedule (day 1, 3, 7, 10, 14, 21, 30, 45, 60, 75, 90). Published
  in an open-access protocol, free to copy.
- **A structured refresher loop — if we build one thing from this section, build this.** The
  strongest signal in the whole user corpus is that the effect decays and re-exposure restores it:
  "it works like magic only the first time", ten re-reads, three seminars, a re-read producing
  another eight months. The vendor has institutionalised it commercially (two back-up seminars are
  a contractual condition of the guarantee) while the book denies it is needed. **Software is the
  right medium for a decaying reframe that needs periodic re-installation, and this is the one
  place an app genuinely beats a book.**
- **The keep-using-while-learning mechanic needs a forcing function.** It removes the
  pre-commitment barrier that kills app onboarding — a real advantage — but the documented failure
  mode is that it becomes a permanent off-ramp ("come back in a couple of months...but i never
  did"). Ship it with a deadline, not an open invitation.

**One plank to drop rather than port:** the blanket refusal of NRT and vaping. It is at odds with
NICE, WHO and the strongest real-world evidence on e-cigarettes. Carry the "no substitutes" stance
only as a user-selected option, never a default, and never as a claim about what works.

**Does not survive the format transfer:**
- The 5–6 hour immersion with live smoking breaks and group facilitation. **This is the
  intervention that was actually tested.** Both positive results come from the *seminar*. The
  book has been tested once and was null — and software is closer to the book than to the
  seminar. Be honest with ourselves about which format the evidence attaches to.
- The 20-minute hypnotherapy close.
- The moment of revelation. It is an affective epiphany produced by hours of cumulative argument.
  You cannot schedule an epiphany in a UI. Design for repeat exposure and re-reading instead —
  which is what users already improvise.

**Two things the user data tell us to design against:** the repetition that produces the epiphany
is the same repetition many readers call patronising and padded; and the "no sacrifice" claim is
the most-reported point of collapse months later, especially for alcohol. Both argue for a
refresher loop that Carr's own framing refuses to provide.

**Hard gate:** any alcohol or benzodiazepine module needs a dependence screen and a medical
referral interstitial before it can tell anyone to stop abruptly.

---

# 2. Annie Grace — This Naked Mind / The Alcohol Experiment

## (A) Mechanical description

The core mechanic is **belief interrogation**, run as a repeated three-step loop, plus a
**time-boxed abstinence period framed as data collection rather than as a pledge**.

The three-step loop is published on Annie Grace's own site
(<https://thisnakedmind.com/how-to-quit-drinking-alcohol-cold-turkey/>), verbatim:

> "ACT = Awareness, Clarity, and Turnaround"

> "ACT is a three-step process I created which enables you to unwind some of your long-held beliefs about alcohol."

> "You'll become aware of your beliefs by naming and putting language with them."

> "Next, you'll clarify the beliefs, where they came from, and how they feel inside you."

> "Finally, you will turn around the beliefs."

> "This involves coming up with a few reasons why the opposite of your long-held belief may be as true or truer than the original belief."

The premise the loop rests on, same page, verbatim:

> "The attachment to alcohol is all in your head. We drink because of our beliefs about alcohol. And we keep drinking because of our beliefs about alcohol and ourselves."

The book's structure interleaves narrative with units she calls **liminal points**, each one
targeting a single specific belief ("I drink to relieve stress", "alcohol is vital to social
life"). This structure is described in secondary sources but I could not fetch a publisher page
stating it verbatim — see UNVERIFIED below.

The companion product is a fixed-length structured challenge, described on her site as:

> "The Alcohol Experiment" is "a free 30-day program designed to help you take a break from alcohol."
> — <https://thisnakedmind.com/how-to-quit-drinking-alcohol-cold-turkey/>

**Implementable core, in our own words:** surface one specific belief about the substance;
name where it came from; then generate two or three concrete reasons the opposite might be as
true. One belief per session, repeated across many sessions. Pair it with a fixed-length
abstinence window framed as an experiment that produces data, not a vow that can be broken.

That mechanic is not Annie Grace's invention and is not ownable — it is a cognitive
restructuring / disputation move (see SMART's ABC-D in §7 and Byron Katie's "turnaround", which
the wording closely tracks). What is hers is the specific packaging, the acronym, and the prose.

### UNVERIFIED — could not source
- The exact wording and full list of the book's liminal points. Only secondary summaries were
  reachable; I did not fetch a publisher excerpt or Google Books preview containing them.
- Her conscious/unconscious-mind framing in her own words. Her site says subconscious beliefs
  are the target but I did not fetch a passage laying out the two-mind model.
- Whether she explicitly refuses the disease model in the book text.

## (B) Evidence

**There is none.** A Europe PMC full-text search for "This Naked Mind" OR "Alcohol Experiment"
returned ten hits, none of which is an evaluation of the programme — they are unrelated
alcohol-science papers plus two "sober curious" qualitative papers
(<https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=%22This%20Naked%20Mind%22%20OR%20%22Alcohol%20Experiment%22&resultType=core&format=json&pageSize=10>).
No RCT, no cohort study, no independent evaluation of the book, the app, or the 30-day
programme was found.

This matters because the programme's marketing leans on scientific framing. The clearest
sourced critique comes from Molly Watts, who reviewed the book across two podcast episodes.
Transcript at
<https://alcoholminimalist.transistor.fm/episodes/a-review-of-this-naked-mind-by-annie-grace-part-two/transcript>.
Watts reads book text aloud; these are the book's words *as quoted in that transcript*, not
fetched from the book itself:

> "Alcohol doesn't satisfy your desire for alcohol. It is what created your desire for alcohol."

> "Moderation is not control or freedom. Unless you want to be consumed by an addictive poison that will do nothing for you except eventually kill you."

Watts's substantive objections, per that transcript: that Grace's claim a single bout of heavy
drinking causes permanent alteration of nerve cells is not supported by the citation given;
that the causal direction is backwards — Watts's position is

> "The reason you crave alcohol is because of your thoughts about alcohol, which create the feeling of desire"

— which contradicts the book's claim that the drug itself manufactures the craving; and that
the book's dismissal of moderation is not based on having examined moderation programmes.

Note the irony worth carrying into the product: the *first* Watts quote above is the same
mechanism Allen Carr and William Porter assert. Three of the most-credited books in this file
all rest on a claim that is contested rather than established.

## (C) User accounts

From the Talking Sober recovery forum thread "Book review: This Naked Mind...have you read it?"
(<https://talkingsober.com/t/book-review-this-naked-mind-have-you-read-it/31328>), pseudonymous
handles as published:

> "Helped me to begin shifting my perspective about alcohol and see that we're basically brainwashed since birth into thinking alcohol is needed to have fun, relax, cope with life, etc." — Serenity412

> "I find its really opening my eyes about how evil drinking is...When I started listening to it I had been drinking and listened to the first few chapters over and over trying to take it all in." — Willow

> "I just finished it last night. I'm on Day 21 and figuring out how to make this lifestyle permanent." — Samme

Two things to notice. First, Serenity412's word is "brainwashed" — the same frame Allen Carr
built his book on; the vocabulary of these methods travels between them and users adopt it.
Second, Willow describes **listening while still drinking**, which is Carr's instruction too, and
is the one operational detail these books share.

Also verified:

> "This Naked Mind was the first quit-lit book I read when I quit drinking in 2022"
> — Julie Fontes, <https://juliefontes.substack.com/p/quit-lit-series-this-naked-mind-by>

**The whole fetched thread is positive.** That is not evidence the book always works; it is the
survivorship bias in this corpus showing up in a single readable sample. People post in a
book-recommendation thread because the book gave them something.

### UNVERIFIED — could not source
Accounts of the book failing, being repetitive, or wearing off. Search snippets pointed to a
review calling it "a legitimately bad book" and to relapse accounts, but every page carrying
them 403'd, had an expired certificate, or was Reddit (blocked). Nothing is quoted.
**This is a real gap and should be filled from the r/stopdrinking file (01) rather than left
to inference.**

## (D) Licensing

- Copyright: Annie Grace. Trade publisher for both titles is Avery / Penguin Random House
  (<https://www.penguinrandomhouse.com/books/579682/the-alcohol-experiment-expanded-edition-by-annie-grace/>).
- "This Naked Mind" and "The Alcohol Experiment" are brand names in commercial use across a
  book series, an app, a podcast and a paid coaching programme. Treat both as marks; do not use
  either as a feature name.
- "ACT" as her acronym is her expression. The underlying move (name a belief → examine its
  origin → argue the opposite) is a technique and is not copyrightable. **Rebuild it, rename it,
  do not reproduce her wording or her liminal-point list.**
- Her prose is in-copyright. Short attributed quotes only.

## (E) Verdict — **worth adapting, not worth building as given**

The belief-interrogation loop is the single most directly implementable thing in this entire
file: it is one screen, one belief, three prompts, and it generates user-authored text that can
be resurfaced later. Build that.

Do not import the framing that alcohol alone manufactures the desire — it is contested (§2B),
and a product that asserts it will be wrong for the substantial group of users whose drinking
is driven by something the drug did not create. Do not use her names. Do not present the method
as evidence-based, because on the record above it is not.

---

# 3. William Porter — Alcohol Explained

## (A) Mechanical description

Porter's method is **education as the intervention**. There is no worksheet and no daily
practice; the claim is that understanding the physiological mechanism dissolves the desire.

Porter states the influence directly, in an interview published at Authority Magazine
(<https://medium.com/authority-magazine/social-impact-authors-how-why-author-william-porter-of-alcohol-explained-is-helping-to-change-9f336a9f9d7b>):

> "I read Alan Carr's easy way to stop smoking and was absolutely fascinated by his practical and pragmatic approach."

His statement of the target, same source:

> "What keeps pulling them back in is there false beliefs about their drugs. Things like I enjoy it, I needed to cope with stress, I need it to help me bond and socialise, it helps me sleep, life just isn't as sweet without it."

> "Think of addiction as a prison where the bars are made-up of false beliefs about the addict drug of choice. Reversing these beliefs, or removing the bars to the prison, provides true freedom."

> "For me the answer is about education and explanation. Is about giving people knowledge and information."

The mechanism claim, from a fetched interview transcript at Hello Someday Coaching
(<https://hellosomedaycoaching.com/alcohol-explained/>), Porter speaking:

> "Alcohol is a deceptive drug. It creates the illusion of pleasure and relaxation while causing the very anxiety and discomfort it purports to relieve."

> "When a drink finishes, an unpleasant feeling starts to build up, and we need another one to get rid of it. Now, that's learned behavior."

> "Every alcoholic drink, when it wears off creates the desire for the next one. And that's why people find it hard to moderate when they reach that stage."

> "Whatever relaxing effects you get from alcohol, when it wears off, there's a corresponding feeling of anxiety."

> "Your brain is being slowed down by the alcohol. So it's making everything a lot more sensitive, so that you can work under the effects of the alcohol. And then when the alcohol wears off, that's when you become very overly anxious."

And on what he asks the reader to do, which is notably thin as an instruction:

> "It is a leap in faith. Yes, you do because I remember doing it myself just being desperately unhappy and thinking Stopping drinking isn't going to change this...you have to trust the process."

**Implementable core, in our own words:** a *reattribution* move. When the user logs a craving,
show them the timeline of their own last drinking episode and ask whether what they are feeling
now is the substance's after-effect rather than a pre-existing state the substance would fix.
This is the one genuinely distinct mechanic in Porter, and unlike Annie Grace's belief work it
operates on a sensation in the moment rather than on a belief in the abstract.

The underlying neurobiology — GABA/glutamate adaptation producing a hyperexcitable rebound state
on cessation — is mainstream and independently citable, e.g. Alcohol & Alcoholism,
<https://academic.oup.com/alcalc/article/47/5/501/99762>. **Cite the science, not Porter, when
making the claim in-product.** Porter's *extension* of that mechanism to ordinary
between-drinks anxiety in non-dependent drinkers is his inference, not established.

## (B) Evidence

**None found.** No trial, evaluation or peer-reviewed study of Alcohol Explained was located.
The book is self-published (ISBN 9781516997190,
<https://www.amazon.com/Alcohol-Explained-William-Porter/dp/1516997190>).

The physiological substrate he draws on is well evidenced. The specific therapeutic claim —
that being told the mechanism is sufficient to remove the desire — is not tested anywhere I
could find.

## (C) User accounts

### UNVERIFIED — could not source
Porter is frequently named alongside Allen Carr in r/stopdrinking threads. None of those
threads could be fetched. No user account is quoted here. Fill from file 01.

## (D) Licensing

- Copyright: William Porter, self-published under the series name "William Porter's 'Explained'".
- No trademark landmine identified, but the series name is a brand; do not use it.
- The physiological explanation is public science and freely restatable **from the primary
  literature**. Do not restate it from Porter's book, because his particular ordering and
  analogies are his expression.
- Five free chapters are offered on <https://www.alcoholexplained.com/> — that is a marketing
  grant to read, not a licence to republish.

## (E) Verdict — **worth adapting, one specific mechanic**

Take the reattribution move. It is cheap to build, it fits a craving-logging surface we would
build anyway, and it is grounded in real pharmacology. Ignore the rest: "read this and you will
understand and then you will be free" is not a software mechanic, it is a book.

---

# 4. Craig Beck — Stop Drinking Expert

## (A) Mechanical description

### UNVERIFIED — could not source
I could not fetch a page setting out Beck's actual method in his own words at a level of detail
that would let me describe its mechanics honestly. The public surface is a funnel: a free
webinar leading to paid programmes and coaching. Nothing mechanical is described here because
nothing mechanical was verified.

## (B) Evidence

**None found.** No trial, evaluation or independent assessment. No ASA (UK Advertising Standards
Authority) ruling against Beck was found either — searched and not located, which is a null
result, not a clearance.

## (C) User accounts

Reviews.io hosts a small verified set (<https://www.reviews.io/company-reviews/store/stopdrinkingexpert.com>),
overall 4.7/5 across 25 reviews, 92% recommending. **Treat as marketing-adjacent**: a 25-review
sample on a merchant-controlled widget is not peer testimony.

Crediting:

> "Simply life changing!...The best money I have ever spent!" — Jim M, verified reviewer

> "As a 20 year veteran of drinking hard liquor every day, I am now 9+ months alcohol free." — Long Teresa, verified reviewer

Failing — the more useful half:

> "Craig Beck is extremely dishonest. He wouldn't honour his money-back guarantee even though I had done everything he required." — Matt, unverified reviewer

> "I found his information no more useful than the free video content I have watched on YouTube." — Matt, unverified reviewer

> "Audiobook promises free mp3 downloads, but none available anywhere on website. Have to sit through a webinar, which is just a summary of book." — Don, verified reviewer

Trustpilot carries a larger and reportedly more mixed set at
<https://www.trustpilot.com/review/stopdrinkingexpert.com> and
<https://www.trustpilot.com/review/craigbeck.com>; both returned HTTP 403 and were not read.

## (D) Licensing

- Copyright: Craig Beck / CBML.
- "Stop Drinking Expert" is a commercial brand. Avoid.
- Nothing here is worth licensing.

## (E) Verdict — **not worth it**

No verifiable method, no evidence, an aggressive commercial funnel, and the sourced negative
reviews are about billing conduct rather than about the method. There is nothing to extract.
Its only value to us is as a **negative exemplar**: this is the shape of thing our product must
not resemble, and the refund complaints are a reminder that in this category trust is the
product.

---

# 5. The Freedom Model (Baldwin Research Institute)

## (A) Mechanical description

The Freedom Model is a **worldview replacement**, delivered as an educational curriculum. Its
central move is to deny that addiction exists as a condition, and to reframe heavy use as a
freely chosen preference that the person can simply re-choose.

From their own research page (<https://www.thefreedommodel.org/research/>), verbatim:

> "Addiction is not a disease, it is a choice…the disease model of addiction has never been scientifically proven."

> "the 'symptoms' of the supposed 'disease of addiction' remain under the control of the 'addict/alcoholic.' They control whether or not they use, and they control whether or not they crave. So, addiction is not a disease. It is a pattern of fully freely chosen behavior based on personal preference."

> "every concept of addiction is built on the idea that in some way, a person's substance use becomes involuntary"

— that last being the premise they reject.

The organisation was Saint Jude Retreats and renamed itself The Freedom Model Retreats on
1 March 2018, alongside the book's publication
(<https://www.prnewswire.com/news-releases/saint-jude-retreats-originators-of-the-first-non-12-step-approach-to-drug-and-alcohol-problems-in-the-us-will-be-changing-their-name-to-the-freedom-model-retreats-march-1-2018-300600534.html>).
It is a residential retreat business with a book attached.

### UNVERIFIED — could not source
The "positive drive principle" and the specific curriculum steps. I did not fetch a page setting
these out in the authors' own words. No mechanics beyond the above are asserted here.

## (B) Evidence

This is the file's worst case, and it is worth being precise about why.

Their outcome claims are **produced by the organisation that sells the programme**. Their own
research page describes the origin of their evidence base as
(<https://www.thefreedommodel.org/research/>):

> "Baldwin Research Institute first began its efforts in 1989 when it conducted a study of the modern Alcoholics Anonymous organization. Then, in 1990, the Institute began a study of 38 subjects with drug and alcohol problems."

An n=38 study from 1990 by the vendor. The widely repeated 62%-since-1992 abstinence figure
appears on affiliated and promotional pages, and the promotional page I fetched
(<https://www.ryanschwantes.com/blog/2017/08/25/baldwin-research-institute-success-rate/>) turned
out to contain **no independent analysis at all** — it is advocacy material that asserts the
studies are unbiased without examining them.

I searched specifically for independent academic or journalistic critique of the Freedom Model's
methodology and **found none that I could fetch**. That absence cuts both ways and should be
stated honestly: the claims are not independently validated, and they are also not
independently refuted. What is certain is that no peer-reviewed evaluation was located.

Prof. David J. Hanson (SUNY Potsdam) has written about the organisation
(<https://www.alcoholproblemsandsolutions.org/st-jude-retreats-scientology-narconon-discover-the-facts/>)
but only to dismiss a Scientology rumour, concluding:

> "There is no reason for anyone to avoid the St. Jude Retreats simply because of concerns that they are related to either Narconon or the Church of Scientology."

He does not evaluate the method. Do not cite him as validating it.

## (C) User accounts

Weak sourcing, and everything found is affiliated. Recovery.com lists the retreat at
**"$22,000 - $24,000"** for a four-week programme, and heads the page
**"Saint Jude Retreats (Closed): Find similar centers on Recovery.com"**
(<https://recovery.com/saint-jude-retreats/>) — i.e. the residential arm the outcome studies
were based on is no longer operating.

The Fix carries former-guest comments (<https://www.thefix.com/content/saint-jude-retreats-non-12-step-rehab00222>).
**Not independent** — the page states: "This free insurance benefits check is a service performed
by advertising sponsor Clean & Sober Media, LLC, part of a network of commonly owned
rehabilitation service providers." With that caveat, the mechanism a guest credits is at least
informative:

> "learning that I was in control of my life and no one or nothing was 'making' me do anything"

> "the most memorable aspect for me was just my peers that I became friendly with"

The second is the more interesting one: the thing remembered most is the peer group, in a
programme whose book argues that recovery groups are the problem.

### UNVERIFIED — could not source
Independent or critical first-person accounts. soberrecovery.com returned 403 on the one
substantial forum thread found
(`/forums/newcomers-recovery/462595-freedom-model-progressive-harmful.html`). No unaffiliated
user account, positive or negative, could be quoted.

## (D) Licensing

- Copyright: Baldwin Research Institute, Inc. / Steven Slate, Mark W. Scheeren, Michelle L. Dunbar.
- "The Freedom Model" is the operating name of a live business. Do not use the phrase.
- Nothing here we would want to reproduce.

## (E) Verdict — **not worth it, and worth actively avoiding**

Two independent reasons.

**Safety.** Telling a person that craving is under their voluntary control, and that dependence
is a preference, is a claim we would be asserting to users who may be physically dependent. The
same directory's Dry January material (§12) shows what the responsible position looks like:
Alcohol Change UK publishes "People who are clinically alcohol dependent can die if they
suddenly, completely stop drinking." A product that adopts the Freedom Model's framing has no
coherent place to put that warning.

**Provenance.** Vendor-produced outcome studies with no independent replication, attached to a
paid residential programme, is precisely the pattern this corpus's source-weighting exists to
catch.

There is one legitimate idea buried in it — that a permanent "in recovery" identity is not
obligatory, and that some people simply stop. That idea is better sourced from the natural-recovery
literature in file 08, where it has real evidence, than from this book.

---

# 6. Rational Recovery / AVRT (Jack Trimpey)

## Two findings that change existing repo rules

**1. The organisation appears defunct.** `rational.org` is a parked GoDaddy domain as of
2026-08-17 — it serves a redirect stub to `/lander`, which contains
`window._trfd.push({ap:"parking"})` and `img1.wsimg.com/parking-lander/` assets. **There is no
live primary source for AVRT any more.** archive.org playback was blocked (HTTP 498). Everything
below marked as mechanics therefore comes from third parties and is flagged as such.

**2. Both trademarks are DEAD.** Pulled from USPTO TSDR directly — authoritative, not a scraper:

| Mark | Serial | Reg. | Status | Cancelled |
|---|---|---|---|---|
| RATIONAL RECOVERY | 74138829 | 1690651 | **DEAD/Cancelled** | **16 Dec 2022** |
| ADDICTIVE VOICE RECOGNITION TECHNIQUE | 74397325 | 1887516 | **DEAD/Cancelled** | **17 Oct 2025** |

Both cancelled under Section 8 — "Registration cancelled because registrant did not file an
acceptable declaration under Section 8." Sources: <https://tsdr.uspto.gov/statusview/sn74138829>,
<https://tsdr.uspto.gov/statusview/sn74397325>. Owners of record: Jack & Lois Trimpey (dba
Rational Recovery Systems) and Rational Recovery Systems, Inc., both P.O. Box 800, Lotus, CA.

**This contradicts the standing note in this repo.** `src/vice/data/copy.ts` line 12 and
`docs/plans/quitting-a-vice.md` line 203 both record that Rational Recovery and AVRT are
trademarks. As of the registers today they are cancelled federal registrations.

**Do not relax the rule on this basis.** Cancellation is not abandonment: common-law rights can
survive continued use, and abandonment is a fact question. It is risk *reduction*, not clearance.
The existing conservative position — use the technique, not the names — remains the right one,
and now has a second justification: the names carry Trimpey's anti-AA and trauma-dismissive
baggage into our product (see user accounts below). **Recommend updating the two repo notes to
say "cancelled registrations, still avoid" rather than "are trademarks", so the reason survives
if someone later checks the register and finds nothing.**

## (A) Mechanical description

The self/Beast split, from <https://hams.cc/avrt/>: AVRT rests on a claim that "the human brain
can be divided into two parts: There is the primitive animal brain...and there are frontal lobes
which are responsible for abstract thought"; that "It is the limbic system which is responsible
for the voice of craving--for the idea that one must pursue alcohol or drugs"; and the technique
itself — "AVRT teaches people to clearly distinguish the voice of the beast brain from the voice
of their real self." The framing is adversarial: "ANY thoughts you have in your head that tell
you that you need to drink are the ENEMY."

Third-person recasting, from <https://recoverydemystified.substack.com/p/what-is-avrt>:

> "Can we recognize any thought that leads us to further use as a thought made by The Beast? Can we return to our Core Self as the viewer of these thoughts and decide that we will not listen to them?"

The Big Plan, from <https://sobertostay.com/what-is-rational-recovery-perhaps-the-world-wasnt-ready-for-it>:
described as "merely a decision...to NEVER DRINK/USE AGAIN", with the mechanism "The idea is to
isolate the addictive voice from the rational, recovered voice."

The abandoned groups phase, from <https://en.wikipedia.org/wiki/Rational_Recovery>: in late 1998
the organisation announced "all addiction recovery group meetings . . . are canceled and will not
be rescheduled." The prior structure, from
<https://www.encyclopedia.com/education/encyclopedias-almanacs-transcripts-and-maps/rational-recovery-rr>:
"An RR 'coordinator' leads a group of five to ten members, who meet once or twice weekly for
ninety minutes", using a "Sobriety Spreadsheet" on which members "write out irrational beliefs
that activate their desire to drink". **Early RR was REBT-based; AVRT replaced it.** The same
source notes RR "does not encourage supportive exchanges and phone calls between meetings."

Hostility to AA and to recovery-as-identity — Wikipedia records that RR "rejects conceptualizing
addiction as disease, discourages lifelong 'recovering' identities, excludes religious elements."
Sobertostay records Trimpey characterising recovery groups as "anti-family" and as a "relapse
waiting room".

### UNVERIFIED — could not source
The commonly repeated Big Plan formula (a sentence combining never drinking again with never
changing one's mind) appears only in a search snippet pointing at soberrecovery.com, which
returned 403. Not quoted.

## (B) Evidence

**There is no trial evidence for AVRT. None.** Europe PMC returns zero addiction hits for "AVRT"
(every hit is atrioventricular reentrant tachycardia) and nothing on Rational Recovery as a
programme. What exists studied the **1990s groups** — a format that no longer exists — and not
AVRT, and not the book alone.

- **Galanter, Egelko & Edwards 1993**, *Am J Drug Alcohol Abuse* 19(4):499–510. Cross-sectional
  self-report survey, n=433 across 63 RR groups. Via the Parkman/Lloyd/Spilsbury scoping review
  (<https://eprints.whiterose.ac.uk/id/eprint/86229/3/Parkman,_Lloyd,_Spilsbury_2015_Self-Help_Groups_for_Alcohol_Dependency_A_Scoping_Review%5B1%5D.pdf>):
  "Galanter, Egelko, and Edwards (1993) found that since joining Rational Recovery, 73% of
  'engaged members' (those with an average of 8 months membership) were abstinent from all
  substances compared to 38% of 'recruits'". The reviewers immediately caveat: "there is the
  quite plausible explanation that those who remain in such projects differ in fundamental ways
  from those who do not." A survey with an obvious survivorship confound.
- **Li, Feifer & Strohm 2000**, *Addictive Behaviors*, PMID 10972457: pilot, 48 AA vs 33 SMART
  members — about SMART, not RR, and measures orientation, not outcome.

### UNVERIFIED — could not source
A Rational-Recovery-vs-AA controlled comparison in the Kownacki & Shadish meta-analytic
literature. Searched; not found.

## (C) User accounts

Crediting, from <https://recoverydemystified.substack.com/p/what-is-avrt>:

> "If a thought of drinking/using comes up, I say, hello there! No thanks! And as easy as that, I go on with my day."

Failing and alienated — Goodreads reviews of the book
(<https://www.goodreads.com/en/book/show/1179391>), display names as published:

> "This dude SERIOUSLY hates 12 Step Recovery Groups...while the Addictive Voice Recognition Technique seems like it could be helpful, this guy was very dismissive of people having past trauma." — Sammy, 2025

> "The author dismisses and minimizes the role of childhood trauma and abuse in substance addiction...the author implies that people who claim to have been abused as children are probably just imagining it or making it up." — Rachel, 2008

> "fuck anyone who writes about trauma from an uninformed perspective. What right do you have to vomit out harmful messages...to people who are already doing their best?" — L.E. Heron, 2023

> "Jack Trimpey has some valid points regarding logical inconsistencies of the twelve step programs...but from Trimpey's soapbox point of view one pictures a program that works for no one." — Stephen, 2014

**The pattern in the reachable material is that the alienation is about the anti-AA polemic and
the trauma dismissal, not about the personification device itself.** That distinction is what
makes the mechanic salvageable.

### UNVERIFIED — could not source
First-person relapse accounts attributing failure specifically to the Beast framing. The forums
holding them (soberrecovery, Reddit) are blocked.

## (D) Licensing

See the trademark table above. Additionally: **the book text remains under copyright regardless
of trademark status** — the technique is not protectable, the prose is.

**Generic equivalent naming.** The mechanism is externalising-and-labelling of pro-use cognition.
Neutral, defensible options: "urge externalisation", "name the urge", "craving-voice labelling";
and "the commitment decision" for the Big Plan. Our best argument is genuine prior art: SMART
ships a near-identical tool (§7) and Maté/Schwartz's "Relabel" is the same move (§8).

## (E) Verdict — **take the mechanism, none of the branding, and claim no evidence**

The externalise-and-label move is cheap, is independently present in two other methods in this
file, and users report it working. The Big Plan — one permanent decision instead of a daily
count — is a genuinely differentiated product primitive and worth building, and it converges
with Allen Carr's identity-flips-at-the-ritual (§1) and with the no-streak-counter rule already
in the vice module.

But: zero trial evidence, a defunct organisation, lapsed marks, and a founder whose text alienates
trauma-affected users. **Let the user name the voice themselves** rather than imposing "the
Beast" — that single change removes the main documented source of alienation while keeping the
mechanic.

---

# 7. SMART Recovery's toolkit

## (A) Mechanical description

The 4-Point Program, verbatim from <https://smartrecovery.org/4-point>:

1. "Build and maintain motivation"
2. "Cope with urges and cravings"
3. "Manage thoughts, feelings and behavior"
4. "Live a balanced life"

The current official toolbox (<https://smartrecovery.org/toolbox>) lists 14 tools. The following
are verbatim from SMART's own worksheet PDFs, each of which carries the footer
`SMART RECOVERY 4–POINT PROGRAM® HANDBOOK` — **these are handbook pages, not public-domain forms.**

**Cost-benefit analysis (Tool 3.1)**,
<https://smartrecovery.org/hubfs/Tool%203.1f%20Cost-benefit%20analysis%20REV.pdf> — a 2×2 of
benefits/costs × when I do / when I don't do the behaviour:

> "You get something out of the behavior you're thinking about changing. Otherwise, you wouldn't have engaged in it."

> "It's normal to both want to change and not want to change."

> "After you make your lists, star the long-term benefits and costs. Where are you sacrificing your future goals for immediate satisfaction in the present?"

**ABC exercise (Tool 5.2)**, <https://smartrecovery.org/hubfs/Tool-5.2-ABC-exercise.pdf> —
columns: **A** "Activating event" ("The event that created the urge"); **B** "Belief about the
event" ("What I unhelpfully believe about A—the 'must'"); **C** "Consequence of the unhelpful
belief" ("How I feel and behave in response to A because of B"); **D** "Dispute the unhelpful
belief" ("Questions I ask myself to dispute the unhelpful belief B"); **E** "Effective thinking
change" ("The new more effective belief I adopt to replace B").

**Personify and disarm (Tool 4.6)**,
<https://smartrecovery.org/hubfs/Tool%204.6f%20Personify%20and%20disarm%20REV.pdf> — SMART's
AVRT-equivalent, and far gentler:

> "The urges you feel aren't you. They're an impulse or a reaction—something separate from you. For some, personifying urges can create a helpful boundary."

Three fields: Name (examples given: "The whiner, the lobbyist, the hurt child"); what you say to
them ("I see you and I am in control here"); what happens when you say it ("They lose their
power, they dissolve, they move on").

**DENTS (Tool 4.5)**, <https://smartrecovery.org/hubfs/Tool%204.5f%20Customize%20DENTS%20for%20you%20REV.pdf>
— the urge-coping mnemonic: **D**eny or delay, **E**scape, **N**eutralize, **T**asks, **S**wap.
Urge surfing sits inside Neutralize: "What techniques help you sit with urges until they pass?"

**Change plan (Tool 3.4)**, <https://smartrecovery.org/hubfs/Tool%203.4f%20Change%20plan%20REV.pdf>
— changes I want to make; importance 1–10; confidence 1–10; most important reasons; steps; who
can help and how; "I'll know my plan is working when"; "Some things that could interfere with my
plan are"; a self-review date.

**Hierarchy of values (Tool 3.2)**,
<https://smartrecovery.org/hubfs/Tool%203.2f%20Define%20your%20values%20REV-1.pdf> — brainstorm
values → group into themes → narrow to five → "Where does your behavior conflict with your value
system?" With a sharp line worth stealing conceptually:

> "For most people, the behavior they want to change isn't a value. Yet it may have made itself a priority in your life."

**VACI** — Vitally Absorbing Creative Interest. SMART USA has renamed it "Explore New Pursuits
and Passions"; the classic worksheet survives at SMART Recovery BC
(<https://www.smartrecoverybc.com/toolchest/VACI.pdf>): "A Vitally Absorbing Creative Interest
(VACI) can help bring back the simple pleasure of living a life free of substances and unhelpful
behaviors." Method: read the *benefits* column of your CBA and find a legitimate activity
supplying that same benefit — "If you enjoyed the buzz, then look at things you could do to get a
real buzz out of life" — then rate each tried activity 1–10. **That linkage from CBA-benefits to
substitute-activity is the most directly implementable chain in the whole toolkit.**

**Graduation** is real: per <https://en.wikipedia.org/wiki/SMART_Recovery>, once participants have
"sustained a long period of change, they may choose to move on with their lives and 'graduate'
from SMART Recovery."

### UNVERIFIED — correction to the brief
**"DISARM" as an acronym could not be verified.** The expansion "Destructive Imagery and
Self-talk Awareness and Refusal Method" appears only in search snippets and third-party sites, on
no current SMART page. **SMART USA has retired the acronym**, replacing it with "Personify and
Disarm" with no expansion given. Treat the acronym as legacy and do not use the expansion.

Also unverified: "graduation" stated on smartrecovery.org's own 4-point page (only Wikipedia).

## (B) Evidence — real, but far weaker than AA's, and we should say so

- **Beck et al. 2017**, *Psychology of Addictive Behaviors*, PMID 28165272: 12 studies identified,
  only **3 effectiveness evaluations**. Their words: "although positive effects were found, the
  modest sample and diversity of methods prevent us from making conclusive remarks about
  efficacy", and "further research is needed to understand the clinical and public health utility
  of SMART as a viable recovery support option."
- **Hester et al. 2013 / Campbell et al. 2016** (PMID 23846588, 27701064): the *Overcoming
  Addictions* web-app RCT, n=189 problem drinkers, 3 arms. "All groups significantly increased
  their percent days abstinent from 44% to 72%" and "decreased their mean drinks per drinking day
  from 8.0 to 4.6." Large effects — but **no significant differences between arms.** This is the
  closest thing to an RCT of SMART and it does not separate SMART from its comparators.
- **Zemore et al. 2018**, *JSAT*, PMID 29606223: n=647, 12-month longitudinal, "no differences in
  the efficacy of WFS, LifeRing, or SMART, vs. 12-step groups" after controlling for abstinence
  motivation.
- **Zemore et al. 2026 PAL cohorts**, PMID 40750480, N=1,152: involvement predicted abstinence,
  but "MHG choice was unrelated to outcomes either alone or in interaction with MHG involvement."
  **Engagement, not brand.**
- **The contrast that must be disclosed** — Kelly, Humphreys & Ferri 2020 Cochrane
  (DOI 10.1002/14651858.cd012880.pub2): 27 studies, **10,565 participants**, "high quality
  evidence that manualized AA/TSF interventions are more effective than other established
  treatments, such as CBT, for increasing abstinence", 12-month continuous abstinence RR 1.21
  (95% CI 1.03–1.42). **An order of magnitude more evidence than SMART has.**

**Components separately:**
- CBT/REBT for substance use is well established — SMART's borrowed engine.
- **Decisional balance is the weak link, and this is a design constraint, not a footnote.**
  Miller & Rose 2015, *Behav Cogn Psychother*, PMID 24229732, verbatim: "With ambivalent people, a
  DB intervention tends to decrease commitment to change, whereas evocation (a key element of MI)
  promotes change. When a person has already made the decision to change, evocation is
  unnecessary and may deter change, whereas DB may further strengthen commitment."

  **Product implication: gate the cost-benefit tool on decision stage.** Show it to the
  already-decided; do not show it to the ambivalent. Note that SMART's own CBA framing ("It's
  normal to both want to change and not want to change") sits exactly in the risky zone. This is
  also congruent with the existing vice module's refusal of pros/cons lists — that decision now
  has a citation behind it.

## (C) User accounts

From Steven Slate's write-up of a meeting he attended, a sympathetic critic
(<https://www.thecleanslate.org/review-of-a-smart-recovery-meeting/>, 6 April 2011): the absence
of self-labels was "a breath of fresh air"; "everyone was really taking responsibility at the
level of thought and behavior"; "Mysticism is avoided like the plague." His criticisms: SMART
retains the word "relapse", which he reads as importing disease framing; the abstinence-only
default; and that any group, SMART included, "risks enabling dependency, where members attend
without genuinely changing behavior."

### UNVERIFIED — could not source
First-person accounts using the "too clinical / too cerebral / meetings too sparse" complaints.
The forums carrying them are blocked. Not manufactured.

## (D) Licensing — verified and restrictive

From <https://smartrecovery.org/terms-of-service>:

> "Copyright and other relevant intellectual property rights exists on all text relating to the Company's services and the full content of this website unless specifically noted."

> "SMART Recovery's logo is a registered trademark of ADASHN in the United States and other countries. The brand names and specific services of SMART Recovery featured on this web site are trade marked."

> "Redistribution or republication of any part of this site or its content is prohibited, including such by framing or other similar or any other means, without the express written consent of the Company."

**What must be rebuilt in our own words: everything.** The four points as a phrase-set, the tool
names ("DENTS", "VACI", "Personify and Disarm", "Hierarchy of Values"), the example text, and the
worksheet layout copy are all off-limits. **What we may freely take:** the underlying REBT ABCDE
model (Ellis, generic), a costs/benefits 2×2 (generic), values elicitation (generic), a change
plan structure (Miller & Rollnick lineage, generic). Do not call anything a "4-Point Program".

This confirms the rule the vice module already follows (`src/vice/data/copy.ts` line 9).

## (E) Verdict — **the best structural donor in this file**

The tools are concrete, worksheet-shaped, and map cleanly onto software forms with scoring,
history and reminders. Rebuild them from first principles with our own copy and examples.

Two mandates fall out of the evidence:
1. **Gate the cost-benefit tool behind a commitment-stage check.** Miller & Rose says it actively
   harms the ambivalent.
2. **Build the graduation exit path.** It is SMART's genuinely distinctive claim and it is the one
   thing a subscription product is structurally tempted to omit. Note that conflict of interest
   openly and resolve it honestly.

---

# 8. Gabor Maté

## (A) Mechanical description — and a correction to the brief

**The worldview**, from <https://drgabormate.com/addiction/>: "all addictions come from emotional
loss, and exist to soothe the pain resulting from that loss"; "The source of addictions is not to
be found in genes, but in childhood trauma and in stress". The reframe, verbatim from
<https://www.goodreads.com/work/quotes/604115-in-the-realm-of-hungry-ghosts-close-encounters-with-addiction>:

> "The question is never 'Why the addiction?' but 'Why the pain?'"

> "It is impossible to understand addiction without asking what relief the addict finds...in the drug or addictive behaviour."

**The practice — this is the important find, and the brief's premise was wrong.** There is no
"list of four questions" of the kind the brief expected, and none was invented. What the book
actually contains as a do-this procedure is **"The Four Steps, Plus One"**, extracted verbatim
from a PDF handout of the chapter (<https://wacodtx.org/wp-content/uploads/2014/07/The.Hungry.Ghost_.I.pdf>),
which states it is "Adapted from Chapter 33 of In The Realm of Hungry Ghosts" and is itself "an
adaptation to the healing of addiction of the Four Step method developed by Dr. Jeffrey Schwartz
at UCLA for the treatment of OCD."

Usage instruction, verbatim:

> "The four steps should be practiced daily at least once, but also whenever an addictive impulse or self-undermining belief pulls you so strongly that you are tempted to act it out... Find a place to sit and write."

1. **Relabel** — "you label the addictive/self-deprecating thought or urge exactly for what it is,
   and not mistake it for reality." Script: "I don't need to purchase anything now or to eat
   anything now; I'm only having an obsessive thought that I have such a need. It's not a real,
   objective need but a false belief." Crucially: "The point of Relabeling is not to make the
   addictive urge or compulsive thought disappear—it's not going to."
   **Structurally identical to AVRT's core move, minus the hostility.**
2. **Reattribute** — "In Reattribute you learn to place the blame squarely on your brain. This is
   my brain sending me a false message." And: "The compulsion says nothing about you as a person;
   it is not a moral failure or a character weakness."
3. **Refocus** — "you buy yourself time... Your initial goal is modest: buy yourself just fifteen
   minutes." Quoting Schwartz: "It's not how you feel; it's what you do that counts." With an
   explicit graded fallback: "Perhaps in the beginning you can't even hold out for fifteen
   minutes—fine. Make it five, and record it in a journal as a success."
4. **Revalue** — "This step should really be called Devalue... In the Revalue step you devalue the
   false gold." Prompt: "What has this addictive urge done for me, you ask." Guardrail: "Do all
   this without judging yourself. You are gathering information, not conducting a criminal trial
   against yourself." Plus the two A's: "Anticipate and Accept... Anticipate relapse."
5. **Re-create** — "Write down your values and intentions... what is the life you really want?
   What do you choose to create?"

**So a practice does exist, it is journaling-based, it is daily-plus-on-urge, and it is far more
implementable than the popular framing of Maté suggests.** Note also step 3's graded fallback —
five minutes recorded as a success — which is a lapse-tolerant design the streak genre lacks.

**Compassionate Inquiry** is a different thing entirely. From <https://compassionateinquiry.com/en/>:

> "Through the skilled and compassionate use of questions, the Certified Compassionate Inquiry® Practitioner holds a mirror to your experience... The intention is to inquire into each situation and your response to it, so that you can understand the underlying unconscious dynamics and their origin."

It is a **practitioner-delivered therapy with a year-long professional training, a six-month
mentorship and certification — not a self-help protocol.** That distinction is decisive for us.

**Abstinence and harm reduction.** He worked at Insite. From
<https://drgabormate.com/help-least-no-harm/>: "As the physician at Onsite, the detox facility
attached to Insite, I can assure Mr. Clement that staff do their utmost to steer clients toward
abstinence and recovery." Harm reduction as the floor, abstinence as a direction, not a gate.

## (B) Evidence

**Compassionate Inquiry has no RCT base that could be found.** Europe PMC and web searches
located none. Stanton Peele's charge, verbatim from <https://www.peele.net/lib/mate.html>:

> "Like a faith healer who 'cures' people by the laying on of hands, Maté never troubles to present evidence to back his approach."

**Keep this separate from the ACEs literature, which is solid.** The trauma→addiction
*association* is well evidenced. But the effect sizes do not support Maté's strength of claim.
Peele in *Psychology Today*
(<https://www.psychologytoday.com/us/blog/addiction-in-society/201112/the-seductive-dangerous-allure-gabor-mate>):

> "only a tiny group (3.5 percent) of people with four or more adverse childhood experiences became involved in injection drug use"

> "The percentage of addicts increases somewhat with the number of adverse experiences. Even so, this relatively minor elevation in no way presupposes the damage is caused biochemically."

He notes for alcohol the rates "are still not much higher for abuse victims, 16 percent", and
that "three-quarters of people who were at one time alcohol-dependent fully recover, the large
majority without treatment" — which is the natural-recovery finding in file 08.

Further criticism bearing on credibility, from <https://www.peele.net/lib/mate.html>: that Maté
overextends causation to "negative childhood experiences or the absence of sufficiently positive
ones", which "invites parody"; that he "really uses the *idea* of brain damage" as a symbol
rather than presenting evidence; and Peele's report that Maté told him "We are not teaching
substance use competency".

### UNVERIFIED — could not source
The *Myth of Normal* stress/cancer critique and the ADHD critique, from primary sources.

## (C) User accounts — the product-relevant finding is the insight/method gap

Crediting the reframe: Goodreads reviews (<https://www.goodreads.com/en/book/show/617702>), e.g.
Thomas praising its "non-stigmatizing attitude toward addiction."

**Insight without method — the pattern the brief asked to be hunted, and it is real.** Same URL:

> "Compassion and lazy thinking are the only glue keeping his ragtag theory in one piece." — Sandra

Brenda wants "more evidence-based therapy like CBT and Motivational enhancement training for
treating addiction" rather than the spiritual framing. Reid finds the prescription of observing
one's mental state with impartial compassionate curiosity impractical. Thomas adds it is "just a
bit long and repetitive."

The sharpest version, from two authors who write in the field — Mike Pond and Maureen Palmer,
1 Feb 2016, <https://addictionthenextstep.com/blog/dr-gabor-mates-review-of-wasted/>. Maté
reviewed their book and spent "fully half of the review of our book to expound on his own theory
about the roots of addiction – childhood trauma". Their complaint is exactly the etiology-versus-
treatment gap: they wanted attention on "a broader toolkit to treat our number 1 health problem" —
medications, motivational interviewing, and CRAFT.

### UNVERIFIED — could not source
A first-person account phrased as "I understood why I drank and still drank." The pattern is
reported; the quote is not, because it was not found.

## (D) Licensing

- **Books:** *In the Realm of Hungry Ghosts* — Maté / North Atlantic Books
  (<https://www.northatlanticbooks.com/blog/excerpt-in-the-realm-of-hungry-ghosts/>). Standard
  trade copyright. The Four Steps text quoted above is book text: **paraphrase the procedure, do
  not reproduce the prose.**
- **Compassionate Inquiry** is used with ® throughout <https://compassionateinquiry.com/en/>,
  footer "Copyright © 2026 Compassionate Inquiry". **The USPTO registration could not be
  verified** — tmsearch endpoints errored and Justia/Trademarkia are Cloudflare-403. Treat the ®
  as an asserted claim; assume protected; do not use the name.
- **The Four Steps are Jeffrey Schwartz's, adapted.** If we build that protocol, Schwartz's
  *Brain Lock* is the upstream source and a cleaner, less encumbered citation than Maté.

## (E) Verdict — **take the framing and the Four Steps; do not build Compassionate Inquiry**

The "why the pain" reframe is the most humane onboarding stance available in this file and it
demonstrably reduces shame. Adopt it as tone.

The recurring reader complaint *is* the product opportunity: **Maté supplies the why and
under-supplies the what-to-do.** The Four Steps Plus One is the fix and it is journaling-shaped —
a daily prompt, an on-urge prompt, a 15-minute Refocus timer with graded success logging (five
minutes counts, and is recorded as a success), and a Revalue log. Cite Schwartz upstream.

**Do not build Compassionate Inquiry.** It is a practitioner modality requiring hundreds of
training hours and certification, it has no RCT base, and it involves surfacing childhood trauma.
An app doing trauma excavation without a clinician is a safety problem, not merely a licensing
one. This is the second hard safety gate in this file, after §1's alcohol no-taper problem.

---

# 9. James Clear — Atomic Habits, applied to quitting

## (A) Mechanical description

The four laws and, crucially, their inversion for breaking a habit — verbatim from
<https://jamesclear.com/three-steps-habit-change>:

> "The 1st law (Cue) Make it obvious. The 2nd law (Craving) Make it attractive. The 3rd law (Response) Make it easy. The 4th law (Reward) Make it satisfying."

> "Inversion of the 1st law (Cue) Make it invisible. Inversion of the 2nd law (Craving) Make it unattractive. Inversion of the 3rd law (Response) Make it difficult. Inversion of the 4th law (Reward) Make it unsatisfying."

Identity-based habits, verbatim from <https://jamesclear.com/atomic-habits-summary>:

> "Every action you take is a vote for the type of person you wish to become."

> "Your current behaviors are simply a reflection of your current identity."

And from <https://jamesclear.com/identity-based-habits>: "Outcomes are about what you get.
Processes are about what you do. Identity is about what you believe." / "In order to believe in
a new identity, we have to prove it to ourselves."

Implementation intentions, <https://jamesclear.com/implementation-intentions>: "When situation X
arises, I will perform response Y." Clear names Gollwitzer & Sheeran (2006) and
Milne/Orbell/Sheeran as the source.

Habit stacking, <https://jamesclear.com/habit-stacking>: "After/Before [CURRENT HABIT], I will
[NEW HABIT]." Clear disclaims authorship in a footnote: "This method, which was created by BJ
Fogg as part of his Tiny Habits program, can be used to design an obvious cue for nearly any
habit."

Two-minute rule, <https://jamesclear.com/how-to-stop-procrastinating>: "When you start a new
habit, it should take less than two minutes to do." / "The point is not to do one thing. The
point is to master the habit of showing up."

Tracking, <https://jamesclear.com/habit-tracker>: "Never miss twice." / "Missing once is an
accident. Missing twice is the start of a new habit." / "You don't want to break your streak."

Breaking a bad habit, <https://jamesclear.com/how-to-break-a-bad-habit>: "You don't eliminate a
bad habit, you replace it." / "Cut out as many triggers as possible. If you smoke when you
drink, then don't go to the bar." / "Join forces with somebody...pair up with someone and quit
together."

**Whose idea is what.** Clear is scrupulous about attribution: implementation intentions to
Gollwitzer, habit stacking to BJ Fogg, the 66-day figure to Lally. His own contribution is the
four-laws/inversion scaffold, "never miss twice", the identity-vote formulation, and the brand.

### UNVERIFIED — could not source
The habit-contract mechanic. No first-party jamesclear.com page stating it could be reached;
only third-party summaries. Describe it if used, do not quote it.

## (B) Evidence

Layered, and it degrades exactly where a recovery product operates.

1. **Implementation intentions have a real base.** Gollwitzer & Sheeran (2006), *Advances in
   Experimental Social Psychology* 38:69–119, **d = .65** across 94 independent tests, >8,000
   participants. Citation-verified via <https://www.scirp.org/reference/referencespapers?referenceid=2077487>;
   the primary PDF was not fetched, so treat the effect size as citation-verified rather than
   source-verified. The Milne/Orbell/Sheeran study Clear cites is real — PMID 14596707, *Br J
   Health Psychol*, N=248 (<https://pubmed.ncbi.nlm.nih.gov/14596707/>). Clear's 91% figure is
   in the paper body, not the abstract, and was not fetched.

2. **For addictive behaviours the effect roughly halves.** Malaguti et al. (2020), *Drug and
   Alcohol Dependence* 214:108120, PMID 32622228 (<https://pubmed.ncbi.nlm.nih.gov/32622228/>).
   21 RCTs. **Alcohol g = 0.31 (95% CI 0.21–0.42); tobacco g = 0.31 (95% CI 0.12–0.50).**
   Verbatim: "no studies were retrieved for the use of implementation intentions on illicit drug
   use." The samples are general population and students, not dependent clinical populations.
   **This is the most important number in this section.** Webb, Sheeran & Luszczynska (2009)
   additionally found the effect shrinks as habit strength rises — citation-verified only.

3. **The 66 days.** Lally, van Jaarsveld, Potts & Wardle (2010), *European Journal of Social
   Psychology* 40:998–1009. 96 volunteers, mean 66 days to automaticity plateau, **range 18–254
   days**. Wiley returned HTTP 402; confirmed via Clear's own page
   (<https://jamesclear.com/new-habit>): "In Lally's study, it took anywhere from 18 days to 254
   days for people to form a new habit."

4. **The research is about simple positive behaviours.** Lally's participants chose an eating,
   drinking or activity behaviour — water, fruit, a run. Nothing in this literature concerns
   substance dependence. Habit-formation science and addiction science are separate bodies of
   work and the popular books elide the gap.

5. **Atomic Habits itself has no trial.** None found. It is an unevaluated synthesis.

6. **Streaks cut both ways.** The abstinence violation effect (Marlatt & Gordon) is the
   documented failure mode: a lapse attributed to internal, stable causes produces guilt,
   lowered self-efficacy, and escalation to full relapse. Citation-level only — no primary
   source fetched; the Polivy & Herman "what-the-hell effect" is **UNVERIFIED**. Note the direct
   tension anyway: "You don't want to break your streak" is precisely the cognition AVE research
   identifies as dangerous in a dependence context. "Never miss twice" is a partial mitigation
   but is framed as discipline, not lapse management.

## (C) User accounts

Reddit was unfetchable; these are from Hacker News, spot-checkable live.

> "The core idea is to recognize the habit, then dissect it and make it invisible, unattractive, difficult and unsatisfying." — mattbrewsbytes, 2024-03-18, <https://news.ycombinator.com/item?id=39746962>

On the identity move applied to smoking:

> "If he refuses by saying 'I don't smoke now/I'm trying to quit', he will much more likely not be able to quit his addiction. But if he answers with 'I'm not a smoker', he is on a good path." — kaba0, 2023-06-14, <https://news.ycombinator.com/item?id=36321913>

On alcohol, environment design:

> "I want to reduce/eliminate my alcohol consumption to become a person that doesn't rely on alcohol for social distraction or self-medication. To achieve this I have stopped keeping any alcohol in my home." — nomadiccoder, 2021-12-31, <https://news.ycombinator.com/item?id=29748792>

Deflating:

> "It's fucking hard to make new habits." — ativzzz, 2022-01-03, <https://news.ycombinator.com/item?id=29777894>

### UNVERIFIED — could not source
The "Atomic Habits didn't touch my drinking" genre. No verbatim, fetchable instance found.
Not manufactured.

## (D) Licensing

- *Atomic Habits* (2018), Avery / Penguin Random House; copyright James Clear.
- "ATOMIC HABITS" registered trademark, **James Clear Holdings LLC**, serial 97356492,
  registration 7227649, filed 2022-04-11, registered 2023-11-28. **Search-verified only** —
  Justia, Trademarkia and the USPTO TSDR API all returned 403/401. Re-check before relying on it.
- Official app: Atoms (atoms.jamesclear.com).
- **Rebuildable without permission:** implementation intentions (Gollwitzer's public science),
  habit stacking / anchoring (Fogg's, as Clear states in print), environment design, the
  two-minute rule, generic habit tracking.
- **Not rebuildable:** the name, the four-laws-and-inversions phrasing as a set, the diagrams,
  and Clear's prose. Paraphrase from the primary science and name our own scaffold.

## (E) Verdict — **worth adapting as scaffolding, not as the intervention**

Cheap to implement, and implementation intentions have genuine meta-analytic support. But the
support degrades exactly where this product lives: g≈0.31 for alcohol and tobacco, nothing for
illicit drugs, weaker still as habit strength rises.

**Do not ship a streak counter.** That is not a style preference — it is the one place where the
most popular mechanic in the habit genre runs directly into the abstinence violation effect, and
it is congruent with the existing quit-vice module's standing decision (see MEMORY: no streak
counter). The Dry January data in §12 independently supports the same call: partial completers
who stayed engaged out-performed unsupported full completers.

---

# 10. Charles Duhigg — The Power of Habit

## (A) Mechanical description

Duhigg publishes the operative material himself as free PDFs, which is unusual and useful.

The loop — <https://charlesduhigg.com/wp-content/uploads/2025/01/Teachers-Guide-Duhigg-Power-of-Habit-Study-Guide.pdf>:

> "The habit loop can be broken down into three basic steps. First, there is a cue, a trigger that tells your brain to go into automatic mode... The second part of the habit loop is the routine, the behavior that leads to the reward... The third part is the reward."

The Golden Rule, same PDF:

> "The golden rule of habit change says that to change a habit, it is important to keep the cue and the reward the same, while inserting a new routine into the habit loop."

Applied to drinking, in his own words, same PDF:

> "If you want to change a habit, it usually helps to recognize the cue ('I always want to go to a bar when I feel stressed'), deliver the expected reward ('I feel more relaxed around my friends'), but find an alternative routine ('Instead of going to the bar, I'll go to an Alcoholics Anonymous meeting'). And remember, your odds of success go up dramatically when you commit to changing as part of a group."

Belief, same PDF: "Belief is at the core of modifying many habit loops and plays a critical role
in habit change. For habit change to be permanent, people must believe change is possible."

The four-step diagnostic —
<https://charlesduhigg.com/wp-content/uploads/2025/01/Duhigg-Readers-Guide-to-Changing-Habits.pdf>:

> "THE FRAMEWORK: • Identify the routine • Experiment with rewards • Isolate the cue • Have a plan"

Same appendix: the five cue categories are "Location / Time / Emotional State / Other People /
Immediately preceding action"; the loop is formalised as "When I see CUE, I will do ROUTINE in
order to get a REWARD"; and Duhigg names the underlying science himself — "Within psychology,
these plans are known as 'implementation intentions.'"

His own hedging is more honest than the genre and worth carrying into the product:

> "there isn't one formula for changing habits. There are thousands."

> "There is, unfortunately, no specific set of steps guaranteed to work for every person."

**Implementable core:** the four-step diagnostic is a self-administered experiment — log the
routine, systematically vary the reward to find which one the behaviour is actually serving,
narrow the cue across five fixed dimensions, then write an if-then plan. It is the most directly
productisable artifact in this whole file.

## (B) Evidence

Duhigg is a journalist synthesising others' research. The underlying science is real:

- **Ann Graybiel**, basal ganglia and habit — *Annu Rev Neurosci* 2008;31:359–87, PMID 18558860
  (<https://pubmed.ncbi.nlm.nih.gov/18558860/>). Duhigg's rendering is a fair summary.
- **Wendy Wood** — Wood & Neal (2007), *Psychological Review* 114:843–863; Wood & Rünger (2016),
  *Annual Review of Psychology* 67:289–314. Author PDF at
  <https://dornsife.usc.edu/wendy-wood/wp-content/uploads/sites/183/2023/10/wood.neal_.2007psychrev_a_new_look_at_habits_and_the_interface_between_habits_and_goals.pdf>.
  Wood's actual finding — habits are context-cued and shift slowly, resisting goal states — is a
  *caution* about the Golden Rule, not an endorsement of it.

**Established:** cue-driven automaticity, basal ganglia involvement, context-dependence.
**Popular synthesis, untested:** that swapping the routine while holding cue and reward fixed is
a reliable change procedure. No trial of the Golden Rule as an intervention was found.

**The habit account of addiction is actively contested — this matters.** Everitt & Robbins
(2005), *Nat Neurosci* 8:1481–9, PMID 16251991, is the canonical pro-habit position: a transition
"from actions to habits to compulsion". Against it, Hogarth (2020), *Neuropsychopharmacology*
45:720–735, PMID 31905368 (<https://pubmed.ncbi.nlm.nih.gov/31905368/>), verbatim:

> "Habit theory of addiction has weaker support... most human studies have not found greater propensity to habitual behaviour in drug users or as a function of dependence severity"

> "human addiction is primarily driven by excessive goal-directed drug choice under negative affect, and less by habit or compulsion."

**That is a direct, citable challenge to the premise that the habit loop is the right model for a
dependency.** If Hogarth is right, the product's centre of gravity should be negative affect and
the choice made under it, not cue-routine automaticity.

## (C) User accounts

> "The central theme of that book is that people attribute dumb behaviors to things like chemical dependence, when in fact it's a behavioral habit." — hoorayimhelping, 2020-07-24, <https://news.ycombinator.com/item?id=23939065>

That quote is included precisely because it is the model's central risk showing up in the wild:
a reader converting "habits matter" into "it isn't really dependence".

### UNVERIFIED — could not source
Failure accounts specific to Duhigg. None found in a fetchable source.

## (D) Licensing

- Random House / Penguin Random House, February 2012. The study guide PDF carries "Copyright ©
  2012 by Charles Duhigg".
- Duhigg publishes chapter one, a teacher's guide and the full Reader's Guide appendix free on
  his own site — free to read and cite, **not** free to reproduce.
- Trademark status **unknown**; Justia returned 403 on every attempt.
- **Rebuildable:** cue-routine-reward is not Duhigg's invention (Graybiel, Wood, learning
  theory), and the four-step diagnostic is a method we can re-express in our own words and
  structure. **Not rebuildable:** the title, the phrase "the Golden Rule of habit change", the
  loop diagram as drawn, his prose and case studies.

## (E) Verdict — **worth building the diagnostic, not the model**

Ship the four-step experiment as a trigger-and-function self-diagnosis tool. It is concrete,
self-administered, produces user-authored data we can resurface, and Duhigg publishes it free so
there is no provenance problem in citing it.

Do not ship the model. Its standing as an addiction account is the weakest of the three habit
approaches — journalist synthesis, no trial, and a live literature arguing the frame is wrong
for dependence. **Never let the product imply that a dependency is "really just a habit."**

---

# 11. Judson Brewer, MBRP, and urge surfing

## (A) Mechanical description

The lead from the sibling agent is **verified independently** against the official TED
transcript, extracted from the page's embedded JSON at
<https://www.ted.com/talks/judson_brewer_a_simple_way_to_break_a_bad_habit/transcript>. Exact
published wording with its lead-in:

> "Now, with mindfulness training, we dropped the bit about forcing and instead focused on being curious. In fact, we even told them to smoke. What? Yeah, we said, 'Go ahead and smoke, just be really curious about what it's like when you do.'"

The reported result, verbatim: "Mindful smoking: smells like stinky cheese and tastes like
chemicals, YUCK!"

**Double-verified.** The same passage is on disk in this repo's own cyl-corpus at
`~/.cache/cyl-corpus/text/-moW9jvvMr4.txt` lines 118–134, from the YouTube captions of "A Simple
Way to Break a Bad Habit | Judson Brewer | TED" (TED channel, uploaded 2016-02-24, 16.4M views,
<https://www.youtube.com/watch?v=-moW9jvvMr4>; metadata in `~/.cache/cyl-corpus/meta/-moW9jvvMr4.json`).
The on-disk caption text and the ted.com transcript agree word for word. This is the one claim in
this file with two fully independent sources, and it is the one the sibling agent flagged as a
lead — the lead was good.

Turning toward the craving and decomposing it into sensations, same transcript:

> "This willingness to turn toward our experience rather than trying to make unpleasant cravings go away as quickly as possible."

> "we start to notice that cravings are simply made up of body sensations -- oh, there's tightness, there's tension, there's restlessness -- and that these body sensations come and go. These are bite-size pieces of experiences that we can manage from moment to moment rather than getting clobbered by this huge, scary craving that we choke on."

Reward-value updating / disenchantment — the move that distinguishes this from distraction and
from willpower, same transcript:

> "Seeing what we get from our habits helps us understand them at a deeper level -- to know it in our bones so we don't have to force ourselves to hold back or restrain ourselves from behavior. We're just less interested in doing it in the first place."

Why willpower is the wrong tool, same transcript: the prefrontal cortex "is also the first part
of our brain that goes offline when we get stressed out, which isn't that helpful." Brewer's loop
terminology in the talk is **"Trigger, behavior, reward"**, not Duhigg's cue-routine-reward.

**RAIN — Brewer's own two published versions disagree, so pick one and label it.**
At <https://mariashriver.com/using-the-rain-practice-to-stay-present/>: "RECOGNIZE/RELAX into
what is arising (e.g., your craving)." / "ACCEPT/ALLOW it to be there." / "INVESTIGATE bodily
sensations, emotions, and thoughts." / "NOTE what is happening from moment to moment." He
credits the originators there: "Michele McDonald, an American meditation teacher, first came up
with this decades ago," adapted "based on noting practice, which was popularized by the late
Mahasi Sayadaw."
On his own site, <https://drjud.com/rain-exercise/>, the N is different: "R: Recognize what
you're feeling / A: Allow the experience to be present / I: Investigate with curiosity /
N: Nurture yourself with self-compassion" — and no attribution appears. RAIN does not appear in
the TED talk at all.

**MBRP** is a separate structured programme: Sarah Bowen, Neha Chawla and the late G. Alan
Marlatt, University of Washington. **Eight weekly two-hour group sessions with two therapists**
(per the Bowen 2014 abstract). Urge surfing is its signature practice; free audio at
<https://www.mindfulrp.com/for-clients>.

### UNVERIFIED — could not source
Brewer's "what do I get from this?" question and the "Bigger Better Offer" third-gear framing
from *Unwinding Anxiety*, in his own words — secondary summaries only. Urge surfing's origin
with Marlatt in the early 1980s is search-verified, not primary-sourced.

## (B) Evidence — the strongest set in this file, reported straight

| Study | Design | n | Result | Source |
|---|---|---|---|---|
| Brewer et al. 2011 | RCT, mindfulness training vs American Lung Association Freedom From Smoking, 8 sessions/4 weeks | 88 | End of treatment 36% vs 15% (p=.063, **trend only**); 17-week follow-up **31% vs 6%** (p=.012) | *Drug Alcohol Depend* 119:72–80, PMID [21723049](https://pubmed.ncbi.nlm.nih.gov/21723049/) |
| Garrison et al. 2020 (Craving to Quit app) | Researcher-blind RCT, app vs experience-sampling control | 325 | **NULL on primary.** "No group difference was found in smoking abstinence at 6 months (overall, 11.1%; MMT-ES, 9.8%; ES, 12.1%; χ2(1) = 0.43, p = .51)." Only a craving×group interaction, p=.05 | *Nicotine Tob Res* 22:324–331, PMID [29917096](https://pubmed.ncbi.nlm.nih.gov/29917096/) |
| Roy et al. 2021 (Unwinding Anxiety, GAD) | RCT, TAU vs TAU+app, 2 months | 65 | GAD-7 reduction 67% vs 14%, median change −8.5 vs −1.0, P<.001, NNT=1.6 | *JMIR* 23(12):e26987, PMID [34860673](https://pubmed.ncbi.nlm.nih.gov/34860673/) |
| Bowen et al. 2014 (MBRP) | 3-arm RCT, MBRP vs CBT relapse prevention vs TAU, 12-month follow-up | 286 | At 6 mo both MBRP and RP beat TAU; **RP beat MBRP** on time to first drug use; at 12 mo MBRP beat both on days of use and heavy drinking | *JAMA Psychiatry* 71:547–56, PMID [24647726](https://pubmed.ncbi.nlm.nih.gov/24647726/) |
| Oikonomou et al. 2017 | Meta-analysis, mindfulness for smoking | 4 RCTs, 474 | 25.2% vs 13.6% abstinent >4 months, RR 1.88, **95% CI 1.04–3.40** (lower bound barely clears 1) | *J Health Psychol*, PMID [27044630](https://pubmed.ncbi.nlm.nih.gov/27044630/) |
| **Grant et al. 2017 (RAND)** | Meta-analysis of MBRP | 9 RCTs, 901 | **No significant difference on relapse (OR 0.72, CI 0.46–1.13)**, frequency of use (SMD 0.02), dropout, depression, anxiety, or mindfulness. Significant only on withdrawal/craving (SMD −0.13) and negative consequences (SMD −0.23). Evidence quality rated **low to very low throughout** | *J Addict Med*, PMID [28727663](https://pubmed.ncbi.nlm.nih.gov/28727663/) |
| Korecki et al. 2020 | Systematic review, 6 manualised programmes | 30 studies | MBIs "appear to be **as effective as** existing evidence-based treatments" — non-inferiority, not superiority | [PMC7392831](https://pmc.ncbi.nlm.nih.gov/articles/PMC7392831/) |

**The honest read.** Grant's verbatim conclusion is the one to hold onto:

> "We have limited confidence in estimates suggesting MBRP yields small effects on withdrawal/craving and negative consequences versus comparator interventions. We did not detect differences for any other outcome."

Korecki's authors flag low follow-up rates, high attrition, retrospective self-report, and
"small-to-medium" or "very small" effects against active controls. The 2011 Brewer result is one
small trial, unreplicated at that magnitude, and **the app version of the same training was
flatly null.**

### The "5x" claim — resolved, and it is a marketing artifact

From Brewer's own clinician fact sheet,
<https://drjud.com/wp-content/uploads/2019/09/C2Q-FactSheet_for-clinicians.pdf>, verbatim:

> "The training delivered by Craving to Quit when given in person was shown to be 5x more effective than gold-standard treatment at helping people quit smoking."

Its footnote 1 is Brewer 2011 — so the "5x" is the **31% ÷ 6% abstinence ratio from the
in-person trial.** It is not a 5x reduction in smoking and it is not the app. The hedge "when
given in person" carries the entire claim, since the app's own full-scale RCT found nothing. In
the TED talk Brewer states the more defensible version: "mindfulness training was twice as good
as gold standard therapy at helping people quit smoking." The same fact sheet lists pricing:
"$24.99 for one month, $99.99 for one year."

### Conflicts of interest — state these whenever citing Brewer

- Garrison et al. 2020, from <https://pmc.ncbi.nlm.nih.gov/articles/PMC7297096/>: "Judson A.
  Brewer and Prasanta Pal own stock in Claritas Mindsciences, the company that developed the
  apps used in this study."
- Roy et al. 2021: "JAB and AR are paid advisers to Sharecare, the company that owns the
  mindfulness app used in this study. This financial interest has been disclosed to and is being
  managed by Brown University..."
- Sharecare describes Brewer as "Sharecare's executive medical director of behavioral health"
  and markets the trial as showing the app "decreased anxiety in participants by 67% after two
  months of use" (<https://about.sharecare.com/press-releases/sharecares-unwinding-anxiety-shown-to-decrease-anxiety-by-67-in-a-randomized-controlled-trial/>).
- Even the MBRP developers disclose one — Bowen 2014: "Drs Bowen, Grow, and Chawla conduct MBRP
  trainings for which they receive monetary incentives."

The positive trials use treatment-as-usual controls with self-reported outcomes, run by people
with a financial stake in the product. That does not make them wrong; it makes them weak
evidence, and we should say so on any page that cites them.

## (C) User accounts

> "It can be an uncomfortable process as you realize the full extent of your predicament and the strength of the craving. But after a while, it works exactly as intended. You then gain confidence in knowing that cravings can abate on their own no matter how strong they feel at the onset." — Bakary, 2021-01-03, <https://news.ycombinator.com/item?id=25622036>

The same commenter notes it "was harder than I expected it to be."

> "He's a psychiatrist and explains the habit part of negative behaviors very well and provides an approach to 'unlearn' these bad habits." — sjg007, 2022-02-14, <https://news.ycombinator.com/item?id=30335241>

A practitioner critique naming urge surfing's failure mode — not a user account, but sourced and
directly on the question. Martina Cowen,
<https://freedomfromcravings.co.uk/blog-nutrition-cravings-gut-health-insights/urge-surfing-and-cravings-why-it-sometimes-doesn-t-work-and-what-to-do-instead>:

> "When you're in a survival state (fight, flight, freeze, or shut down) your rational brain isn't online."

> "Without including the body, urge surfing risks becoming another battle."

### UNVERIFIED — could not source
The "urge surfing made me focus on the craving more" genre. No verbatim fetchable instance found.
Not invented.

## (D) Licensing

- **Apps are commercial and trademarked.** Craving to Quit®, Eat Right Now®, Unwinding Anxiety®
  — originally MindSciences, Inc. (founded by Brewer); **Sharecare acquired MindSciences in June
  2020** (<https://about.sharecare.com/press-releases/sharecare-acquires-mindsciences-fortifies-platform-with-best-in-class-digital-therapeutics-for-anxiety-tobacco-and-overeating/>).
  "UNWINDING ANXIETY" trademark serial 87488700, registration 5628787, filed 2017-06-14,
  registered 2018-12-11, owner of record MindSciences, Inc. — **search-verified only**, Justia
  and USPTO both refused.
- **MBRP manual:** Bowen, Chawla, Grow & Marlatt, *Mindfulness-Based Relapse Prevention for
  Addictive Behaviors*, 2nd ed., **The Guilford Press © 2021**, ISBN 9781462545315. Guilford
  states it contains "27 reproducible handouts and forms" downloadable by purchasers. **The
  precise photocopy-licence wording is UNVERIFIED** — read the copyright page before reproducing
  anything.
- **Free MBRP audio** at <https://www.mindfulrp.com/for-clients> (Urge Surfing, SOBER space, body
  scan) is offered "for streaming and/or download". The only permission statement on the page is
  "Adapted from Kabat-Zinn (2002). Copyright © 2002 Jon Kabat-Zinn. Used by permission." There is
  **no general reuse licence. Do not bundle, mirror or re-host their audio. Link out.**
- **Urge surfing itself** is an old Marlatt-lineage clinical technique with no trademark found,
  described openly across DBT/ACT/clinical literature. Free to describe and implement. What we
  cannot copy is a specific published script, recording or handout.
- TED transcripts are normally CC BY-NC-ND; **the licence on this specific page was not
  verified.** Check before reproducing the transcript in shipped product.

## (E) Verdict — **worth building, with the claim sized honestly**

This is the only approach in the habit/mindfulness set with randomised evidence in addiction, and
the mechanism is a genuinely different move: turn toward the craving, decompose it into
sensations, and let the reward value update — rather than out-muscle it. That difference matters
because willpower fails precisely when stress takes the prefrontal cortex offline, which Brewer
says explicitly.

Build urge surfing and curiosity-based noticing as **free, non-branded, non-app-dependent** tools
credited to the Marlatt/MBRP lineage, not to a trademarked programme. Present the evidence as
*helps with craving and negative consequences; unproven for preventing relapse*. **Never repeat
the 5x figure** — it is marketing, it refers to in-person training, and the app it advertises
failed its own trial.

---

# 12. Dry January and structured time-boxed challenges

## (A) Mechanical description

The mechanic, stripped down: **a fixed start date, a fixed end date, a public registration, and
a support layer delivered daily across that window.** The endpoint is the active ingredient in
the framing — it is a temporary experiment, not a permanent identity, which lowers the cost of
starting. The support layer is the active ingredient in the outcome (see §12B, which is the most
product-relevant evidence in this entire file).

Concretely, from Alcohol Change UK's 2019 evaluation, the delivered components were a website
and blog, a daily-ish supportive email sequence, and a mobile app; the fundraising variants
(Macmillan's Go Sober for October, Dry July) add sponsorship as external accountability.

### UNVERIFIED — could not source
The mechanics of Go Sober for October specifically. `gosober.org.uk` now 301s to
`soberoctober.org.uk`, which was showing an off-season placeholder ("Please check back soon for
updates") when fetched on 2026-08-17. The sponsorship and buy-a-day-off ("golden ticket")
mechanics commonly attributed to the fundraising variants are **not** verified here and must not
be described as fact. Re-check in September.

Note also that the Dry January evidence below is evidence for *Dry January*, where charity
fundraising was rated the **least** important reason for taking part (mean 1.90/10 among
registrants, Table 2 of the evaluation). Do not transfer it to sponsorship-driven challenges,
whose motivational structure is materially different.

## (B) Evidence — the best in this file for something we can actually build

Primary source: Richard de Visser's independent evaluation of Dry January 2019, full PDF at
<https://www.drugsandalcohol.ie/32647/1/R-de-Visser-Dry-January-evaluation-2019.pdf>. Design and
numbers, read from the PDF text:

> "The overall sample sizes were: 6148 at baseline; 3564 at 1-month follow-up; and 2741 at 6-month follow-up."

Dry January arm: 3171 baseline / 1342 at 1 month / 1158 at 6 months. General population arm:
2977 / 2222 / 1583. Outcomes were AUDIT-C, the Drink Refusal Self-Efficacy scale, self-rated
physical health, and WEMWBS wellbeing. It is a **prospective cohort, not an RCT** — nobody was
randomised — and the report is candid about attrition:

> "Only 46% of the original sample completed the 6-month follow-up, and completion of the 6-month follow-up was significantly related to age, gender, ethnicity, education, WEMWBS scores, concern about the health effects of drinking and control over drinking, AUDIT-C scores, and DRSE. Thus, data were weighted for likelihood of completing the follow-up."

**Self-selection is severe and must be stated wherever we use this.** Registrants were
overwhelmingly female (82.0% vs 51.0% in the population sample), better educated (48.9%
university vs 37.8%), higher income, and much heavier drinkers: mean AUDIT-C 9.1 vs 5.7, with
**27.8% of registrants scoring "possibly dependent" against 6.1% of the general population**
(Table 1 of the PDF). This is not a general-population intervention; it recruits worried heavy
drinkers.

The companion peer-reviewed paper makes the same point and is the honest counterweight to the
campaign's marketing — de Visser & Piper, *Alcohol and Alcoholism* 2020, "Short- and Longer-Term
Benefits of Temporary Alcohol Abstinence During 'Dry January' Are Not Also Observed Among Adult
Drinkers in the General Population" (1,192 participants vs 1,549 non-abstaining drinkers), which
reports:

> "Dry January participants had higher SES, poorer well-being, higher AUDIT-C scores and less control over their drinking than the general population."

Abstract retrieved via Europe PMC,
<https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:10.1093/alcalc/agaa025&resultType=core&format=json>.
PubMed record: <https://pubmed.ncbi.nlm.nih.gov/32391879/>.

### The finding that should drive product design

From Table 7 of the 2019 evaluation — proportions achieving a 10%+ improvement at **6 months**,
split by whether the person registered with the campaign and whether they stayed fully dry:

| Outcome (10%+ improvement at 6 months) | No attempt (n=1012) | Unsupported, partially dry (n=199) | Unsupported, completely dry (n=113) | Registered, partially dry (n=428) | Registered, completely dry (n=990) |
|---|---|---|---|---|---|
| AUDIT-C reduction | 35.7% | 31.7% | 58.4% | 46.7% | 59.0% |
| Drink-Refusal Self-Efficacy increase | 21.9% | 25.6% | 24.8% | **44.4%** | 51.3% |
| Self-rated health increase | 18.0% | 17.6% | 24.8% | 25.2% | 32.7% |
| Wellbeing (WEMWBS) increase | 22.7% | 24.6% | 16.8% | **39.0%** | 45.9% |

The evaluation's own reading of it:

> "It is notable that people who registered for Dry January but were only partially dry were more likely to report improvements in DRSE and well-being than were people who were completely dry but not register for Dry January. This indicated the value of the support provided by Dry January."

**Registering and partly failing beat succeeding alone.** For a software product that is close to
the most useful single result in this directory: the scaffolding, not the abstinence, is
carrying the self-efficacy and wellbeing gains.

Which scaffolding, from Table 6 (usefulness out of 10, among users):

| Support | % who used it | Mean score among users |
|---|---|---|
| Dry January app | 74.7% | **8.48** |
| Dry January emails | 85.5% | 7.23 |
| Dry January website/blog | 92.5% | 5.60 |
| Facebook groups | 27.3% | 6.55 |
| Media coverage | 45.4% | 4.84 |

The app scored highest by a wide margin among those who used it, and the report notes:

> "Very few participants used support from sources outside of Dry January."

Also from Table 10: staying completely dry was significantly related to having registered via
the website or app (69.8% of registrants stayed fully dry vs 36.2% of non-registrants), and to
**planning in advance to drink less afterwards** — but *not* to doing the challenge with another
person, and *not* to the number of previous attempts. Social accompaniment did not predict
success in this dataset. That is worth knowing before building a buddy feature.

Alcohol Change UK's own summary of short-term self-reported benefits
(<https://alcoholchange.org.uk/help-and-support/managing-your-drinking/dry-january/about-dry-january/the-evidence-behind-the-dry-january-challenge-benefits-and-long-term-impact>):
86% saved money, 81% felt more in control of their drinking, 70% slept better, 67% better
concentration, 66% more energy, 65% generally improved health, 54% lost weight. These are
self-report from a self-selected group, in campaign marketing. Weight accordingly.

### The counter-evidence

George F. Koob, director of NIAAA, on what follows the month, quoted at
<https://news.northeastern.edu/2023/01/30/dry-january-over/>:

> "There's a phenomenon that's been well documented known as the alcohol deprivation effect. 'I'm done with January so I'm going to tie one on.'"

> "Please don't tie one on. It's not good for your body in any way, shape or form."

The 2019 evaluation found a **softening of intention** across the month that cuts against the
"month off resets you" story: at registration 47% intended to stop drinking altogether and 39%
to drink less; by the end of January that had moved to 23% intending to stop and 45% to drink
less, with 29% intending to drink the same as before and 3% more. Roughly a quarter downgraded
their ambition over the course of the challenge.

### The safety line — this is non-negotiable for us

Alcohol Change UK's own policy page
(<https://alcoholchange.org.uk/help-and-support/managing-your-drinking/dry-january/about-dry-january/dry-january-policies>):

> "People who are clinically alcohol dependent can die if they suddenly, completely stop drinking."

> "The challenge is aimed at people drinking at risky levels but is not suitable for people who are clinically alcohol dependent."

They further advise anyone with withdrawal symptoms — fits, shaking, sweating, hallucinations,
depression, anxiety, sleep difficulty — to "NOT suddenly, completely stop drinking" and to
"Talk to a GP or your local community alcohol service", and that the challenge "should not be
used as a substitute for alcohol treatment".

**Any time-boxed abstinence challenge we ship must carry this warning at the point of starting,
not in a footer.** Given the evaluation found 27.8% of registrants scored possibly-dependent,
this is not a hypothetical edge case — it is roughly a quarter of the likely audience.

## (C) User accounts

A contemporaneous account of the day-31 problem, from a Substack written during the attempt
(<https://controlissues.substack.com/p/day-31>):

> "There's a monster stirring in the depths, rocking my makeshift sobriety raft."

> "The desire for alcohol cannot be eradicated in 31 days, even thought I would like for this to be the case."

That writer's response was to join a further 30-day group challenge rather than resume — which
is itself the design lesson: **the endpoint is a cliff, and the product needs something at the
bottom of it.**

### UNVERIFIED — could not source
Accounts of the 1 February binge, and of people who found the challenge trivialising, exist in
search snippets but the Reddit sources could not be fetched. Fill from file 01.

## (D) Licensing

- **"Dry January®" is a registered trademark of Alcohol Change UK / Alcohol Research UK**, stated
  on their own policy page: "'Dry January®' and our logo (below) are both registered trademarks
  of Alcohol Change UK/Alcohol Research UK."
  (<https://alcoholchange.org.uk/help-and-support/managing-your-drinking/dry-january/about-dry-january/dry-january-policies>)
  First registered 2014. **Do not use the name.**
- The mark is not unlimited: Big Drop Brewing Co successfully challenged Alcohol Change UK's 2022
  attempt to extend it into further classes, reported at
  <https://www.thegrocer.co.uk/news/big-drop-successfully-challenges-dry-january-trademark-application-by-alcohol-change-uk/690487.article>
  and <https://www.morningadvertiser.co.uk/Article/2024/04/18/big-drop-brewing-co-challenges-dry-january-trademark/>.
  Irrelevant to us — a challenge app is squarely in the classes they hold.
- "Go Sober for October" is Macmillan Cancer Support's; "Dry July" is an Australian/NZ charity's.
  Avoid all three.
- **The mechanics are not ownable.** A user-chosen fixed-length abstinence window with daily
  support, a saved-money/units counter and an end-of-window debrief is a generic design. Ship it
  under our own neutral name ("30-day reset", "your own dry month" — decided by product, not here).
- "Try Dry®" is also their app's registered name. Avoid.

## (E) Verdict — **worth building. Highest-confidence build in this file.**

It has the best evidence of anything here that is purely behavioural; the evidence specifically
credits the *app and email scaffolding* rather than the abstinence; four of the five most-used
support elements are things software does natively; and the failure modes are documented well
enough to design against (the day-31 cliff, the intention softening, the deprivation effect).

Design implications that fall straight out of the data above:
1. Registration is a real intervention, not a signup step. Make committing an explicit act.
2. Partial success must be first-class. Registered-and-partly-dry beat unsupported-and-fully-dry
   on self-efficacy and wellbeing. A binary streak that breaks on day 9 destroys exactly the
   thing that was working.
3. Ask for the after-plan *before* the window ends — planning to drink less afterwards predicted
   staying dry.
4. Build the day-after-the-end surface. It is where the documented risk is.
5. Do not over-invest in buddy features on this evidence; doing it with another person did not
   predict completion.
6. Gate the start on the dependence warning.

---

# 13. The Sinclair Method

## (A) Mechanical description

Naltrexone taken before drinking, every time, continued indefinitely, while the person keeps
drinking. The claimed mechanism is extinction: blocking opioid reinforcement while the drinking
behaviour is actually performed weakens the learned response over months.

Sinclair's own three-point statement of the protocol, from his 2001 review abstract in
*Alcohol and Alcoholism* ("Evidence about the use of naltrexone and for different ways of using
it in the treatment of alcoholism"), retrieved via Europe PMC
(<https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=AUTH:%22Sinclair%20JD%22%20AND%20naltrexone%20AND%20extinction&resultType=core&format=json&pageSize=6>):

> "On this basis, it was proposed that: (1) naltrexone should be administered to patients who were still currently drinking; (2) the instructions should be to take naltrexone only when drinking was anticipated; (3) this treatment should continue indefinitely."

And the reasoning for why abstinence-oriented delivery fails:

> "Although all found benefits from naltrexone with the coping therapy, none of them found any significant benefit of naltrexone over placebo when combined with support for abstinence. These results are consistent with our pre-clinical studies in which naltrexone, naloxone, and nalmefene were effective when paired with drinking but ineffective when given during abstinence. This supported the hypothesis that the primary mechanism involved is extinction … because extinction only weakens responses that are made while reinforcement is blocked."

Protocol details as commonly practised — 50mg, one to two hours before the first drink — per
Harvard Health (<https://www.health.harvard.edu/newsletter_article/can-you-retrain-your-brain-to-stop-excessive-drinking>):

> "The Sinclair Method, pioneered in the late 1980s by scientist John David Sinclair, requires taking naltrexone an hour or two before you drink alcohol - every time."

> "The timeline varies from person to person; some people notice their alcohol cravings diminish within weeks, while others require many months."

**This is a medical intervention requiring a prescriber. Our product must never direct, dose, or
schedule it.**

## (B) Evidence

Genuinely mixed, and the popular figure is the weak part.

**The trial usually cited as the method's proof** is Heinälä et al. 2001, "Targeted use of
naltrexone without prior detoxification in the treatment of alcohol dependence: a factorial
double-blind, placebo-controlled trial", *Journal of Clinical Psychopharmacology*, abstract via
Europe PMC
(<https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=AUTH:%22Heinala%20P%22%20AND%20naltrexone&resultType=core&format=json&pageSize=5>).
n=121 non-abstinent outpatients, randomised to cognitive coping skills (n=67) or supportive
therapy (n=54) × naltrexone 50mg (n=63) or placebo (n=58), daily for 12 weeks then targeted for
20 weeks. Result:

> "Naltrexone was not better than placebo in the supportive groups, but it had a significant effect in the coping groups: 27% of the coping/naltrexone patients had no relapses to heavy drinking throughout the 32 weeks, compared with only 3% of the coping/placebo patients."

Note carefully: **27%, not 78%.** Note also that the drug only worked when paired with a
psychosocial coping component — which is the space a software product legitimately occupies.

**The 78% figure.** It does not appear in Sinclair's 2001 review abstract (quoted above, fetched
in full). It is repeated across commercial TSM providers and secondary coverage; I could not
source it to a specific published result. Harvard Health, covering the method, says plainly
(same URL as above):

> "There aren't many clinical trials comparing the Sinclair Method with other treatments for problem drinking."

**Treat 78% as UNVERIFIED and do not repeat it.**

**Naltrexone generally** is well evidenced but modestly so. Jonas et al. 2014, *JAMA*,
"Pharmacotherapy for adults with alcohol use disorders in outpatient settings: a systematic
review and meta-analysis", via Europe PMC
(<https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=TITLE:%22Pharmacotherapy%20for%20adults%20with%20alcohol%20use%20disorders%20in%20outpatient%20settings%22&resultType=core&format=json&pageSize=3>):

> "NNT was 20 (95% CI, 11 to 500)" — to prevent one return to any drinking, oral naltrexone 50mg/day

> "The NNT to prevent return to heavy drinking was 12"

NNT 12 is a real effect and better than most behavioural interventions manage, but it is not an
80% success rate.

**Criticism.** From the Hanley Center, an abstinence-based residential provider — so a direct
commercial competitor to the method, and the conflict should be stated whenever this is cited
(<https://www.hanleycenter.org/the-case-against-the-sinclair-method/>):

> "you have to take the pill an hour before drinking, every time you drink. That can be a big ask"

> "the only thing standing between an alcoholic and intoxication is voluntarily taking a pill"

> "breaking the link between alcohol and that relief only solves part of the problem"

The first of those is the honest one, and it is the point at which software can help.

**Safety.** Harvard Health, same URL: side effects "nausea, headache, dizziness, and trouble
sleeping"; and "In rare cases, naltrexone can cause liver problems, but mostly in people who
already have liver damage from excessive drinking." Naltrexone is an opioid antagonist and will
precipitate withdrawal in anyone using opioids — a contraindication our product must surface if
it goes anywhere near this.

## (C) User accounts

From the Talking Sober forum, pseudonymous handles as published.

Thread "Trying sinclair method - Naltrexone"
(<https://talkingsober.com/t/trying-sinclair-method-naltrexone/64889>):

> "At first i didnt feel anything but then after like 2-3 drinks…starts to get a mild nausea feeling." — Dublosix88

> "The nauseating feeling…no significant feeling of high…and for the first time in my life…i left a full glass of wine unfinished." — Dublosix88

That is a clean description of the intended effect — reward blunting producing an unfinished
drink — and it also shows nausea and reward-blunting arriving together, which is the dropout
risk.

Uncertainty about whether it is doing anything, which matters because extinction is slow and
invisible week to week:

> "I take Naltrexone alongside Antabuse but only on days when I know I have an event or something that slightly worries me, i'm not even sure if it does anything or it's just a placebo effect." — Sobarsogood

A substantive objection to the protocol itself:

> "If you've already detoxed from alcohol there is absolutely 0 point to starting the Sinclair method...Naltrexone works just fine at taking away the cravings without drinking." — Englishd

Englishd is disputing exactly the point Sinclair's 2001 review argues (that abstinence-paired
naltrexone does not produce extinction). Worth flagging that the disagreement is live among
users, not settled.

Thread "Naltrexone Review" (<https://talkingsober.com/t/naltrexone-review/42735>):

> "My mouth slightly watered but the strong urge that's usually there was gone." — langdon51, day 5

> "I believe it has really helped with the cravings, and especially the obsessing over it." — Sage, ~3 weeks in

> "when I finally do get off the medicine and the cravings come back on how to handle it" — langdon51, on his main worry

### UNVERIFIED — could not source
Accounts of the compliance failure mode specifically — people who could not reliably dose an
hour before every drinking occasion, which is the failure the Hanley critique names and the one
a product would exist to solve. r/Alcoholism_Medication and r/thesinclairmethod are blocked;
Quora and Trustpilot 403'd. **The two threads above skew positive and neither contains a clear
"it did nothing for me" account. Treat the user-account evidence here as incomplete.**

## (D) Licensing

- Naltrexone is generic. The protocol is published medical literature and freely describable
  from the primary sources cited above.
- "The Sinclair Method" and "TSM" are used as branded service names by multiple commercial
  clinics (sinclairmethod.org, sinclairmethoduk.com) and promoted by the C Three Foundation
  (cthreefoundation.org / tsmoptions.org). Trademark status was **not** verified — treat the
  phrase as risky and describe it as "targeted naltrexone" instead, which is also the accurate
  clinical term.
- No copyright obstacle to describing the protocol from Sinclair's own peer-reviewed abstract.

## (E) Verdict — **support it, never direct it. Narrow build.**

The product question is where the line is, and the evidence answers it unusually cleanly:
Heinälä found the drug did nothing without a coping-skills component and worked with one. The
legitimate software role is that component plus the compliance problem — a pre-drink reminder
the *user* configures, a log of dosed-vs-undosed drinking occasions, and a long-horizon chart of
consumption so a months-long extinction curve is visible to someone who cannot feel it week to
week. That is a genuinely useful, genuinely unserved product.

Hard boundaries: never suggest starting it, never state a dose, never a schedule the product
authored, always a prescriber, always the opioid contraindication, and never the 78% figure.

---

# Synthesis

## 1. The convergence: four methods, one mechanic

The most useful finding across all thirteen is that the methods people credit most are not
doing thirteen different things. Two mechanics recur, independently invented, under different
names and hostile to each other's branding.

**Mechanic A — externalise and label the pro-use thought.**

| Method | Its name for it | Tone |
|---|---|---|
| Rational Recovery / AVRT (§6) | the Addictive Voice / "the Beast" | adversarial, "the ENEMY" |
| SMART Recovery (§7) | Personify and disarm | gentle, "an impulse or a reaction—something separate from you" |
| Maté / Schwartz (§8) | Relabel | non-judgemental, "not a moral failure or a character weakness" |
| Judson Brewer (§11) | decompose the craving into sensations | curious, "there's tightness, there's tension" |

**Mechanic B — elicit the user's own claimed benefits, then dismantle each one.**

| Method | Its name for it |
|---|---|
| Allen Carr (§1) | identifying "positive expectancies… before working towards the conclusion that the belief… is, in fact, erroneous and harmful" |
| Annie Grace (§2) | ACT — Awareness, Clarity, Turnaround |
| William Porter (§3) | reattribution of the after-effect |
| SMART (§7) | the ABC-D disputation, and the CBA→VACI chain |
| Maté / Schwartz (§8) | Revalue / "devalue the false gold" |

**Build each mechanic once, well, under our own neutral vocabulary.** That is the plan, and the
convergence is also the strongest licensing argument available: a technique arrived at
independently by four parties, none of whom can claim it, is genuine prior art.

Two refinements the evidence forces:
- **Let the user name the voice.** SMART's examples ("the whiner, the lobbyist, the hurt child")
  outperform an imposed "Beast" on exactly the axis where AVRT's reviewers report alienation.
- **Gate the cost-benefit variant on decision stage.** Miller & Rose 2015 (§7) found decisional
  balance *decreases* commitment in the ambivalent. This also gives the existing vice module's
  no-pros-and-cons decision a citation it did not previously have.

## 2. Credited vs evidenced — the honest scoreboard

| | Real controlled evidence | Credited but unevidenced |
|---|---|---|
| **Strong** | Dry January cohort (§12) · naltrexone NNT 12 (§13) · AA/TSF Cochrane, as the comparator (§7) | — |
| **Real but modest / contested** | Brewer & MBRP (§11) — RCTs exist, best meta-analysis null on relapse · Allen Carr seminar (§1) — one positive independent RCT, one null company-funded · implementation intentions (§9) — g≈0.31 for alcohol/tobacco · SMART (§7) — 3 evaluations, no advantage over 12-step | — |
| **None found** | — | This Naked Mind (§2) · Alcohol Explained (§3) · Craig Beck (§4) · The Freedom Model (§5, vendor-produced only) · AVRT (§6) · Compassionate Inquiry (§8) · Atomic Habits as a book (§9) · Duhigg's Golden Rule (§10) · Allen Carr's **book** and the entire **alcohol** line (§1) |

Three specific numbers that will be repeated at us and are not true as stated:
- **Allen Carr "over 90% success"** is a refund-non-claim rate with attendance preconditions
  (§1). The trials measured 19.4% and 22%.
- **The Sinclair Method "78%"** does not appear in Sinclair's own 2001 review abstract and could
  not be sourced anywhere (§13). Harvard Health: "There aren't many clinical trials comparing the
  Sinclair Method with other treatments for problem drinking."
- **Brewer's "5x"** is the 31%÷6% ratio from one small in-person trial, advertising an app whose
  own RCT was null (§11).

## 3. Licensing landmines, ranked by how easily we could trip

1. **Names we must never use as feature or product names:** Easyway, Allen Carr, Allen Carr's
   Easyway (live UK/EU/US registrations in **class 9 software, 41 training, 44 health** — exactly
   our classes); Dry January®, Try Dry®, Go Sober for October, Dry July; SMART Recovery, 4-Point
   Program, DENTS, VACI, Personify and Disarm; This Naked Mind, The Alcohol Experiment; The
   Freedom Model; Stop Drinking Expert; Unwinding Anxiety, Craving to Quit, Eat Right Now;
   Compassionate Inquiry; Atomic Habits; and — despite the cancelled registrations — Rational
   Recovery, AVRT, Addictive Voice Recognition Technique.
2. **Never re-host third-party assets.** MBRP's free audio at mindfulrp.com carries no reuse
   licence; Guilford's 27 MBRP handouts are purchaser-licensed only; SMART's terms forbid
   republication outright; Arcturus/Easyway have filed **336 Lumen DMCA notices**. Link out.
3. **A finding that reduces risk without removing it:** RATIONAL RECOVERY and ADDICTIVE VOICE
   RECOGNITION TECHNIQUE are **cancelled** federal registrations (2022 and 2025), and rational.org
   is a parked domain. **Do not relax the rule** — cancellation is not abandonment. But
   `src/vice/data/copy.ts` line 12 and `docs/plans/quitting-a-vice.md` line 203 currently state
   these *are* trademarks, which is now inaccurate. Recommend rewording to "cancelled
   registrations — still avoid", so the reason survives someone checking the register.
4. **The clean route for Allen Carr specifically:** rebuild from the Keogan and Frings papers,
   which describe the procedure in neutral peer-reviewed language. That removes any question of
   derivation from copyrighted prose. 17 U.S.C. §102(b) and Copyright Office Circular 31 are close
   to dispositive on the technique itself.
5. **Needs counsel before launch:** any product naming; the FDD; and the Compassionate Inquiry ®
   claim, which could not be verified against a register.

## 4. Two hard safety gates — non-negotiable

- **Abrupt alcohol cessation.** Allen Carr's alcohol method (§1) and the Freedom Model (§5) both
  push abrupt stopping with no medical involvement, and both have zero evidence. Alcohol Change UK
  publishes "People who are clinically alcohol dependent can die if they suddenly, completely stop
  drinking", the NHS says "It can be very dangerous to stop drinking suddenly if you're dependent
  on alcohol", and a reader has already called the Carr alcohol book "A very dangerous book" over
  exactly this. The Dry January evaluation found **27.8% of registrants scored possibly
  dependent** — this is a quarter of the likely audience, not an edge case. **Any abstinence-start
  flow for alcohol or benzodiazepines needs a dependence screen and a medical-referral
  interstitial before it can begin.**
- **No trauma excavation without a clinician.** Compassionate Inquiry (§8) is a practitioner
  modality with certification and no RCT base. Adopt Maté's tone; do not build his therapy.

## 5. Congruence with what this repo already decided

The existing quit-vice module reached several of these conclusions independently, and this
research supports rather than revises them:

- **No streak counter** (`docs/plans/quitting-a-vice.md` line 48) — now supported three ways:
  Allen Carr's identity flips at the ritual rather than at day N (§1); the abstinence violation
  effect against Clear's "you don't want to break your streak" (§9); and Dry January's finding
  that registered-but-partial beat unsupported-but-complete on self-efficacy and wellbeing (§12).
- **No pros/cons list** — now has a citation: Miller & Rose 2015 (§7).
- **Rebuild SMART and Therapist Aid tools rather than copy** (`src/vice/data/copy.ts` line 9) —
  confirmed verbatim against SMART's terms of service (§7).
- **Brewer reward-value updating already implemented** (`src/vice/data/flows.ts` line 245, and its
  existing note that the in-person trial is strong and the app trial null) — confirmed exactly
  (§11).
- **Naltrexone NNT 12** (`src/vice/data/help.ts` line 202) — confirmed against Jonas et al. 2014
  (§13).

## 6. What to build, in order

1. **A time-boxed challenge with real scaffolding (§12).** Best evidence here, and the evidence
   specifically credits the app-and-email layer rather than the abstinence. Registration as an
   explicit commitment act; partial success first-class; ask for the after-plan before the window
   closes; build the day-after surface; dependence gate on entry.
2. **The two convergent mechanics (§1, §2, §6, §7, §8, §11)** — externalise-and-label, and
   elicit-then-dismantle — built once each, user-named, stage-gated.
3. **A refresher loop (§1).** The clearest unserved need in the whole corpus: the reframe decays,
   re-exposure restores it, users improvise re-reads, and the vendor charges for it. Software is
   the right medium and no book can be.

## 7. What this file could not do

Stated plainly so it is not mistaken for coverage. `reddit.com` and `old.reddit.com` are blocked;
Trustpilot, Quora, Amazon reviews, MetaFilter, EX Community and soberrecovery all 403'd;
pubmed.ncbi.nlm.nih.gov serves a cookie wall; Justia, Trademarkia and USPTO TSDR mostly refused.
The consequences:

- **Peer-community failure accounts are the thinnest part of this file**, and they are the most
  valuable category. Fill from files 01 and 02, which were gathered by agents with Reddit access.
- **No first-person Sinclair Method compliance-failure account** — the exact failure a product
  would exist to solve (§13).
- **No account of anyone feeling guilty or broken after failing Allen Carr** despite repeated
  searching (§1).
- **No unaffiliated user account of the Freedom Model at all** (§5).
- Several trademark records are search-verified rather than register-verified; each is flagged
  in place.

Everything above is quoted from a URL that was fetched. Where it was not, it says so.
