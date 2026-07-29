/**
 * The CITED corpus — every his-voice string the product may quote, with its
 * source. GENERATED from the Phase-1 extraction results (verified: each
 * entry's wording located in its transcript; ~/.cache/lm-corpus). Rule 2:
 * a string may carry quote marks in the UI ONLY if it exists here.
 * DO NOT hand-edit entries — re-run the merge instead.
 */

export interface CorpusEntry {
  id: string
  /** Verbatim as spoken (ASR-normalized punctuation). */
  text: string
  videoId: string
  context: string
  artifact: string
}

export const LIFE_MASTERY_CORPUS: CorpusEntry[] = [
  {
    "id": "consequence-stakes-0",
    "text": "when I set goals this is a great strategy I always make sure that I set up a reward and a consequence okay a reward and a consequence the reward is some sort of pleasure that I'll give myself and achieving it because whatever gets rewarded gets reinforced Whatever Gets rewarded gets repeated there's a great book called Don't Shoot the dog and when they train animals when they train dolphins and the same applies for human beings positive reinforcement is really important",
    "videoId": "GXhPOncX8CA",
    "context": "canonical reward+consequence pairing doctrine",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-1",
    "text": "maybe it's going for a massage maybe it's going on a trip maybe it's um you know getting to do something awesome that I'd really fulfill me maybe it's some sort of treat maybe it's a a a spending spre to go shopping and then also having the consequence the consequence is the pain of what will happen if you don't do it now the ultimate consequence is always the emotional consequence uh you know not being consistent with your identity the shame the lowering your self-esteem not falling through on your word that's the ultimate pain",
    "videoId": "GXhPOncX8CA",
    "context": "reward menu examples + ultimate consequence is emotional (identity/self-esteem/word)",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-2",
    "text": "I've done things with my friends where you write a check to each other and I say Hey listen here's a check for a hundred bucks or a th000 bucks you get to cash this check if I don't achieve this goal by this date and if you know if I achieve it then you got to rip up the check my friend is going to get this money from me and it's going to create another reason for me to follow through you got to really uh burn your boat",
    "videoId": "GXhPOncX8CA",
    "context": "check-to-a-friend device ($100-$1000) + burn-the-boat framing",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-3",
    "text": "here are some consequences and some examples for this the consequence is you have to go outside you have to pick up garbage for 30 minutes you've got to clean toilets for the whole house you hate running so you have to go for a 30 minute run or you hate meditation it's boring for your consequence you have to meditate for 30 minutes your friend has permission to cash that check but if you do achieve it your friend has to rip up the check no tv for a week or maybe the consequence is that you get a return back to a flip phone and give up your smartphone for a month another consequence could be that you have to eat a raw onion okay or you have to lose all access to your social media accounts for one month you have to give your friend all your passwords or you have to fast for seven days",
    "videoId": "y2oiz9LRchE",
    "context": "HIS EXPLICIT CONSEQUENCE MENU — formal list of example consequences",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-4",
    "text": "when you violate uh when you when you don't do what you said you're going to do let's say the key is you have to honor that you have to man up or you have to woman up put on your big boy pants put on your big girl pants and do it do the consequence suck it up and just do it sometimes you have to stack the consequence to make it even more painful if you need to now at the same time you don't just want to have consequences you also want to have rewards",
    "videoId": "y2oiz9LRchE",
    "context": "consequences must be paid; stacking; mandatory reward pairing",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-5",
    "text": "i had a daily accountability buddy for about two years or so where every single morning we'd wake up hop on a call did you do it yes or no there's only reasons or there's results i don't care what the reasons are did you do it yes or no and if it's no then you do the consequence whatever the consequence you agree to you man up you warm it up you do it and then the next day you get back on track you make three more commitments and of course if you did do it the answer is yes we reward that we celebrate that",
    "videoId": "y2oiz9LRchE",
    "context": "AM accountability call: 3 commitments, yes/no, reasons-or-results, consequence or celebration; commitment escalation ladder in same video (buddy→group→12-step/sponsor→therapist→rehab)",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-6",
    "text": "If I do not make this call to you at this time, at 6:00 a.m., if it's even a minute after 6:00, then I'll give you a I'll pay you a consequence. That consequence for me is I'm going to give you $100. Or I'm going to have to donate $100 to a political party that I do not want to support as a consequence. almost everybody wakes up on time to go to work or to go to school. Why? Because there's a consequence if you don't.",
    "videoId": "cx0Qq1P5AHs",
    "context": "6am wake-up call: $100 to friend OR $100 donation to disliked political party",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-7",
    "text": "if it doesn't occur at 6am on the dot then the consequence of what i'm gonna own up to is i'm gonna make a donation of a hundred dollars to a charity or a political organization that i do not want to support if it's after 6 a.m if it's 601 602 then i got to pay the consequence it has to be on the dot",
    "videoId": "sRJ_mpJb4IY",
    "context": "$100 disliked-cause donation, on-the-dot enforcement",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-8",
    "text": "I even take it a step further where I say to my friend listen if I don't call you at 5:10 okay even if I'm at one minute late then I'll give you $10 okay I'll give you 20 bucks or often donate this to a charity but that forces me to have a consequence for missing it so now I'm forced to actually make sure that I do wake up",
    "videoId": "SIlf1a1TdnM",
    "context": "small-stakes version: $10-20 per late call",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-9",
    "text": "if I commit to doing these three things but I don't do it okay then there's got to be a consequence if I break my commitment I will pay ten dollars to a charity of your choice for every commitment that I break now for you maybe ten bucks isn't much it's not going to create pain for you it is okay maybe you got to find a different thing",
    "videoId": "hDRG_q_lAeU",
    "context": "buddy contract: $10/broken commitment to charity of BUDDY'S choice; stake must be sized to hurt",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-10",
    "text": "the accountability is you have to give $20 to a charity okay and uh which is just a way to to motivate yourself and make sure that you're following through and what you say and uh you know I've had many days where where we didn't do it you know we donate a lot",
    "videoId": "PliFBr__T7Y",
    "context": "daily 3-commitments call, $20 charity penalty, candid admission of paying often",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-11",
    "text": "every Sunday we had these house meetings we'd have these whiteboards on our wall and each of us had to write and share the top five actions if you didn't achieve a goal that you said for yourself that week then you'd have to pay $20 to the house the house would then accumulate money and we use that house to bring in a speaker a trainer some form of self-development that we could all benefit from",
    "videoId": "Wr2SPFgW8iY",
    "context": "self-development house: $20 pooled fines fund group growth",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-12",
    "text": "in order your bank machine take a 500 bucks 500 bucks cash or whatever amount of money for you back this money if I've achieved this goal okay if I don't achieve this goal you to keep the money the pain of losing the $500 now you're gonna have an extra incentive you're gonna have more pressure on yourself",
    "videoId": "aAZTBj2UGUk",
    "context": "$500 cash held by friend against 3-month goal",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-13",
    "text": "I've done things with friends where the consequence is giving away money to charity if we don't achieve the goal or it's doing something embarrassing like if I don't do this I have to come over to your house and clean your entire house or stuff like that",
    "videoId": "aAZTBj2UGUk",
    "context": "charity giveaway + embarrassing forfeits",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-14",
    "text": "there's so much pressure that failure is not an option and the consequence of not achieving my goal is just so painful this is the concept of leverage of putting pressure on yourself and pressure creates diamonds pressure is a good thing any goal that you set for yourself there should be a deadline on that deadline there has to be some sort of consequence to not achieving that goal because if there's no consequence to not doing it there's no reason to actually put you know your full effort in",
    "videoId": "aAZTBj2UGUk",
    "context": "leverage doctrine: deadline + consequence = pressure; 'pressure creates diamonds'; rewards menu here: vacation, photoshoot, cheat day, wardrobe",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-15",
    "text": "every year I publicly shared it and it's uncomfortable for me to do that, right? Cuz it creates a lot of pressure. Pressure creates diamonds. When you publicly declare something, there's more of a consequence where if I don't follow through, then I'm going to lose respect, credibility. I'm not going to feel good about myself.",
    "videoId": "r3pYrSsuogs",
    "context": "public goal declaration as accountability pressure",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-16",
    "text": "the consequence is if I don't achieve the goals that I set forth then I'm going to look like an idiot in front of everyone I'm going to lose all my credibility all my respect my reputation in 2012 I was posting bi-weekly update progress reports on my body my weight and uh I committed to everyone I had to be up on stage for a fitness show so there's no turning back I couldn't back out of it",
    "videoId": "3kPNtyg4bsU",
    "context": "PLM founding story: public accountability + future-dated fitness-show stage date",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-17",
    "text": "I moved into a pentos uh 2014 it was $5,000 a month and it more money than I've ever paid I'm GNA put myself in a situation to make it a must because if I put myself in this situation it's a must I can pay for the first month next month I have no idea how I'm going to pay for it but I'll find a way because I'll have this pressure on myself when I literally burn the boats there's no possibility of retreat and I'm forced to take the island",
    "videoId": "E20v-rrXyWs",
    "context": "financial forcing function: $5k/mo penthouse lease; burn-the-boats",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-18",
    "text": "they would burn their boat get to the let's burn the boat now there's no possibility of retreat and now in their mind their only belief system was to move forward success would be inevitable a lot of you guys have a plan B a lot of you guys have a safety net so you don't go all in",
    "videoId": "PWCSSH_wYDg",
    "context": "burn-the-boat vs plan-B",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-19",
    "text": "deadlines really help us get into a state of urgency which is important it creates pressure and remember pressure creates diamonds when you go to school there's certain projects if you don't there's a consequence the consequence is you might get a bad grade you might fail the class",
    "videoId": "GXhPOncX8CA",
    "context": "deadline doctrine, school analogy",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-20",
    "text": "when you're accountable to someone else and you say, 'Hey, I'm going to get this done on this date. That's my deadline and I want you to hold me accountable,' you're more likely to follow through and now there's a consequence if you don't do it, you're letting them down and you're going to be embarrassed by that",
    "videoId": "0UTb0mnuJRE",
    "context": "accountability pressure; same video: rewards (TV/movie, loved ones, massage), AM/PM calls",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-21",
    "text": "we're gonna hop on a call 9:00 a.m. each morning I'm gonna share three high leverage important things that I want you to hold me accountable to then we're gonna touch base again at the end of the day hop on another call and we're gonna debrief we're gonna ask each other did you do what you said you're gonna do and reward yourself at the end of the day for being productive you see whatever gets rewarded gets repeated",
    "videoId": "KQP_sk6gaLs",
    "context": "AM/PM call structure + end-of-day reward",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-22",
    "text": "if there was a gun to your head and I said to you I'm going to pull the trigger if you don't finish and write your book in the next 30 days would you find a way to write your book the answer is yes because when there's a consequence to not doing something and it's important enough you will find the way and if you don't find the way you will make the way",
    "videoId": "Kz83kMosOWU",
    "context": "'gun to your head' thought experiment (recurs in WWObcAOOt3k, y2oiz9LRchE, MMs7aTPSDXo, Ni0o_4_Zq70, NidJpDcCkQs)",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-23",
    "text": "when you pay for something the more you pay the more you pay attention right the more you invest you actually have skin in the game",
    "videoId": "3NquT3aJ-L0",
    "context": "skin-in-the-game; echoed re $10k Business Mastery in GXhPOncX8CA",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-24",
    "text": "using pain as punishment when instead we should use pleasure for reinforcement whenever you study human behavior positive reinforcement actually lasts longer it's more effective than using pain",
    "videoId": "vhZLFdFw5-E",
    "context": "LIMIT: punishment/self-beating rejected; rewards are the durable mechanism",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-25",
    "text": "pain is a good motivator. It's powerful, more powerful of a motivator than pleasure, but it's only a good short-term motivator because you can't always be in pain So, you use pain to give yourself a push and pleasure to make it last",
    "videoId": "NidJpDcCkQs",
    "context": "pain short-term / pleasure long-term rule",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-27",
    "text": "every time you go to the gym or every time you do the thing that you link pain to start to celebrate that and reward yourself and give yourself pleasure positive reinforcement neurons that fire together wire together i pat myself in the back great job stefan i give myself a high five",
    "videoId": "6pOOA9PLsTI",
    "context": "micro-celebration after every kept commitment; pat-on-back/high-five ritual also in CGqhbXzJrG8, Jy42T9CUee0, ruU9mgQB2dM, 8WON0Kt89a8, sRJ_mpJb4IY",
    "artifact": "consequence-stakes"
  },
  {
    "id": "consequence-stakes-28",
    "text": "how committed are you really and this is a question for you to ask yourself how committed are you really to achieving the goal the result that you're after if you want something bad enough you'll do whatever it takes",
    "videoId": "3NquT3aJ-L0",
    "context": "commitment gauge — self-question, NOT a numeric scale",
    "artifact": "consequence-stakes"
  },
  {
    "id": "delegation-ldp-0",
    "text": "it's a constant reprioritization and then also the next level is you look at your list and see if I can delegate this can I delegate the proofreading absolutely who says I have to proof read the book it's probably better that I don't proofread it because maybe I getting a different perspective is more beneficial so maybe I don't need to do this this one here I can outsource this to fiverr.com to hire someone or upwork.com to hire someone or maybe my mom can do it or maybe a friend can do it right and they can proofread it for me so now I've taken it off my plate maybe even the book cover who says that you've got to do that maybe you can hire someone a designer to do that for you right so now you're leveraging even publishing like all of this you can actually delegate it you could outsource it to someone else and you know that way you're working smarter you can get more done in less time",
    "videoId": "uPaiwpeg8-E",
    "context": "How To Plan Your Day Like Tony Robbins — THE delegation pass in his RPM walkthrough. It is explicitly a second pass AFTER prioritization ('the next level'), done by interrogating each action ('who says I have to do this?'). No letter codes; delegation is a question asked over the already-prioritized MAP list.",
    "artifact": "delegation-ldp"
  },
  {
    "id": "delegation-ldp-1",
    "text": "that's essentially what Tony does at this stage is he's a master delegation he has two to three personal assistants right he has a whole team of people that support what he's able to do and so what Tony's job is every day is to only focus on what's most important and what's highest leverage in his life ... and then he'll outsource everything else to other people so that he doesn't have to do everything himself so that's really how you have to think is how to leverage yourself as much as you possibly can because that's the only way they're gonna be able to do more because there's only 24 hours in the day you have the same amount of time as everybody else and so you're only gonna be able to do so much on your own and that's why we have to delegate and leverage other people as much as we possibly can",
    "videoId": "uPaiwpeg8-E",
    "context": "Same video, immediately after the delegation pass — the leverage doctrine: your daily job is only the highest-leverage items; everything else gets outsourced.",
    "artifact": "delegation-ldp"
  },
  {
    "id": "delegation-ldp-2",
    "text": "so always what you want to do is do an 80/20 analysis understand that 20% of the actions that you take are gonna produce eighty percent of results and you got to prioritize what's most important what's highest leverage under this list ... for me what I like to do is I usually will put like an asterisk if that's like super important but also prioritize it on a scale from one to ten ... I usually have at least three to five that are like the stars like the asterisk so that's a must these other things that don't get done they get moved forward to the next day or the next week okay and I just kind of always pre prioritize as I check this off the list",
    "videoId": "uPaiwpeg8-E",
    "context": "The actual marking scheme he teaches on the MAP list: asterisk/star = must, plus a 1–10 priority number per action; undone items are 'moved forward' to next day/week; items are checked off as done. This is the closest thing to an action-status key in the corpus.",
    "artifact": "delegation-ldp"
  },
  {
    "id": "delegation-ldp-3",
    "text": "Usually, when I make my list, I bold or highlight the three most important actions. I try to simplify and just focus on the three highest leverage ones. ... All the other ones, if I don't get them done, that's okay, I can work on them tomorrow. ... this is likely an outcome and a massive action plan, or RPM plan, that I'm going to repeat for tomorrow, so I can easily copy this and move it forward to tomorrow as well so I don't have to write it out",
    "videoId": "OmzcFEuUKMQ",
    "context": "How I Plan My Day Using Evernote (Tony Robbins RPM Method) — Evernote variant of the marking scheme: bold/highlight the 3 highest-leverage actions; undone items roll to tomorrow; recurring RPM blocks are copied forward.",
    "artifact": "delegation-ldp"
  },
  {
    "id": "delegation-ldp-4",
    "text": "I work with my team now, I try to work on my business not in my business as much. I always create content, that's the one thing, as I'm doing right now, that I can never outsource. ... I've got a team, I've got tons of people that work with me now, I'm more working with them and eventually, really I need to get to a point where I have a COO or some sort of operations manager that can just run and manage the teams so that I can just focus on the one thing that I'm really the good and the best at",
    "videoId": "OmzcFEuUKMQ",
    "context": "Inside the RPM Evernote walkthrough — his personal delegation doctrine: content creation is the one never-outsourced activity; goal is a COO layer so he only does his unique thing. Emails deliberately lowest priority ('they get you in a sense of reaction').",
    "artifact": "delegation-ldp"
  },
  {
    "id": "delegation-ldp-5",
    "text": "I like to First just number it from one to whatever 1 to 10 or one to the end uh in order of priority ... and then I also think okay what is a must for me today okay what is one thing on this list one or two things that's a must and I typically put a star next to that so again I don't need to get everything done on this list but the musts I do want to get done",
    "videoId": "mDHWi92v9X8",
    "context": "How To Plan Your Day For Optimal Productivity — journal version of the RPM pass: number every action 1–N by priority, star the musts. Note: NO delegate/leverage column appears in this walkthrough at all.",
    "artifact": "delegation-ldp"
  },
  {
    "id": "delegation-ldp-6",
    "text": "The third strategy, the third principle, is mastering leverage and outsourcing. ... the areas of your business and your life you want to delegate and outsource first are when you track what you're doing in a day, you want to look at the repetitive things, the things that are easy to hand off to someone else, things that every week like customer support, social media posting, editing your videos ... the things that are consistent and repetitive, you outsource that to someone else, you give them a process, maybe you train them on it, but when you do that, you're now buying back freedom and your time",
    "videoId": "0UTb0mnuJRE",
    "context": "Mastering Time Management: 12 Strategies — the delegation selection rule: delegate repetitive, process-able tasks first; hand off with a documented process/training.",
    "artifact": "delegation-ldp"
  },
  {
    "id": "delegation-ldp-7",
    "text": "if you're paying if you live in the US, Canada, or Europe ... you can hire someone from Philippines or India or Bangladesh ... you can get talent much cheaper ... for me, I've always had assistants even when I started, I hired a virtual assistant from the Philippines that could help me with research or help me with data entry or putting things together or my my appointments and things like that that could just free up my time ... today that's why I have two diff two personal assistants, and I've got a team of 15 people or so, and I've got a chef, and I got a cleaner",
    "videoId": "0UTb0mnuJRE",
    "context": "Same video — VA doctrine: hire Philippines VA from day one for research/data entry/appointments; economic argument via hourly-worth math (your hour = $28, VA = $5–10, so doing support work yourself is a loss); scaled to 2 PAs + team of 15 + chef + cleaner.",
    "artifact": "delegation-ldp"
  },
  {
    "id": "delegation-ldp-8",
    "text": "the most valuable productivity tool, all of the what I've shared with you is powerful and great, but the most powerful one is leverage and outsourcing. And what allows you to do that is making more money. ... use your money intelligently to delegate and outsource and leverage yourself. But as you make more money, your your productivity and your results that you produce scale geometrically now because when you have money, you can build a team",
    "videoId": "0UTb0mnuJRE",
    "context": "Closing of the 12-strategies session — leverage/outsourcing ranked as the #1 productivity tool, gated by income.",
    "artifact": "delegation-ldp"
  },
  {
    "id": "delegation-ldp-9",
    "text": "as soon as possible you can hire a virtual assistant as soon as possible that you can hire someone to clean your place to wash the car to do all those things that you're normally doing that aren't making more money or aren't the things that you enjoy or love those are the things you've got to eliminate from your life you've got to fire yourself from doing those things ... do you want to be good at ten things or do you want to be really great at two or three things",
    "videoId": "KopwaDbed4s",
    "context": "#AskStefan Q&A — 'fire yourself' framing: VA hire is urgent, criteria = tasks that neither make money nor bring joy.",
    "artifact": "delegation-ldp"
  },
  {
    "id": "delegation-ldp-10",
    "text": "one thing that I've been doing more now is ... actually leveraging my assistant and my team more to do all the research and planning for me and so uh I'm a big fan of delegating things to other people um if you have an assistant or a team but but I'm having my assistant do a lot of research for me and sign me up and commit me to some of these things just to make that a lot easier for me so I can make sure that I'm achieving my goal",
    "videoId": "F0ToFPMcIqI",
    "context": "April 2017 Monthly Goals Report — delegation applied inside his own goal system: assistant does research/planning/commitments in service of his monthly goals.",
    "artifact": "delegation-ldp"
  },
  {
    "id": "delegation-ldp-11",
    "text": "another challenge and and really lesson is to use my team more, to delegate more, to leverage other people. There's still way too many things that I'm doing that I shouldn't be doing. ... So that is something that is really relinquishing control and trusting other people and even allowing them to make mistakes because that's sometimes how they learn",
    "videoId": "zuEb-1Ll2h8",
    "context": "2016 Year In Review — delegation named as a yearly-review 'lesson learned' category: relinquish control, let team members make mistakes.",
    "artifact": "delegation-ldp"
  },
  {
    "id": "delegation-ldp-12",
    "text": "pretty much everything else I try to figure out if I can automate it delegate it or eliminate it ... the habit is make a not to do list because it's more important than a to do list and when you write down all the things you do if you can automate it do it a lot of technology takes away crap off your plate if you can delegate it get a virtual assistant from the Philippines get your nephew your cousin a friend to do some of the things that you shouldn't",
    "videoId": "GLw6zVveDIk",
    "context": "IMPORTANT ATTRIBUTION: this is guest Dean Graziosi speaking (interview), not Stefan. The only explicit automate/delegate/eliminate triage + 'not-to-do list' in the corpus belongs to the guest, though Stefan endorses it in conversation.",
    "artifact": "delegation-ldp"
  },
  {
    "id": "delegation-ldp-13",
    "text": "I have daily project me tracking sheets so I look at what are my top 10 highest priority activities that I'm going to work on today or I'm going to delegate so throughout the day no matter what happens what are my top tech tivities today",
    "videoId": "I1MhBE-0zxU",
    "context": "ATTRIBUTION: guest Darren Jacklin, not Stefan. The only explicit work-it-or-delegate-it split on a daily tracking sheet in the corpus is the guest's system.",
    "artifact": "delegation-ldp"
  },
  {
    "id": "delegation-ldp-14",
    "text": "my virtual assistant training program is a course that basically teaches how to find hire train interview virtual assistants how to manage them and how to build a team ... more importantly it has my standard operating procedures such as videos and documents that I use to train my virtual assistant on the different aspects of publishing so this course is more so helping you like work on the business not in it",
    "videoId": "DMj-tRpjhTI",
    "context": "7 Critical Keys to Self-Publishing Success — the mechanics of his delegation: SOPs (videos + documents) are the handoff artifact; 'work on the business not in it' is the recurring frame. Similar in eEQFj4Zoijs (find/choose/hire/interview/train a Philippines VA; 9-person virtual team) and IFWC_mQj31o ('learn the process at first create a process for it and then you hand it off to someone else').",
    "artifact": "delegation-ldp"
  },
  {
    "id": "incantations-0",
    "text": "I Stefan Pylarinos see, know, hear and feel that the purpose of my life is to be even more fully alive, grow and make a difference in the lives of others... YES",
    "videoId": "OgRGJBpTOeU",
    "context": "His mission statement spoken daily as an incantation during morning ritual; he always starts incantations with 'I Stefan [surname] see know hear and feel that...' and ends with 'yes' while clenching his fist to anchor the state. Also spoken verbatim in fICEjqpKfoY and vPEblSGsDhE.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-1",
    "text": "I [your name] see, know, hear and feel that the purpose of my life is ___",
    "videoId": "fICEjqpKfoY",
    "context": "The template he teaches: condense your mission to one sentence, say it as an incantation every day; it should give goosebumps/energy. He speaks his own twice in this video.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-3",
    "text": "I Stefan see, know, hear and feel that I am confident, that I am determined, that I am unstoppable",
    "videoId": "yqIkCSmOvhk",
    "context": "Spoken as his daily affirmation; 'say it with intensity, with emotion, like you really mean it.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-4",
    "text": "I Stefan see know hear and feel that I am confident / I Stefan see know hear and feel that I am grateful",
    "videoId": "vPEblSGsDhE",
    "context": "Answering 'what are your favorite affirmations': he reuses the see-know-hear-feel sequence for whatever emotion he needs that day.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-5",
    "text": "I now command my subconscious mind to direct me in helping as many people as possible today, by giving me the strength, the power, the humor, the brevity, the confidence, the certainty, the passion, the joy, the resourcefulness, whatever it takes to make sure that I change this person's life now",
    "videoId": "JZO1--Awz7k",
    "context": "Robbins-lineage incantation he explicitly says he 'stole' from Tony Robbins and speaks before videos and coaching clients.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-6",
    "text": "All I need is within me now. All that I need is within me now.",
    "videoId": "JZO1--Awz7k",
    "context": "Spoken as pre-performance incantation before videos/coaching. Also on his affirmation cards in PPlaK8y4PzA ('all I need is within me now, it's a great one').",
    "artifact": "incantations"
  },
  {
    "id": "incantations-7",
    "text": "I got this. All I need is within me now. All of the intelligence I need is within me now. All the confidence that I need is within me right now. All the belief that I need is within me right now.",
    "videoId": "bDdDQeugO64",
    "context": "Extended version he speaks in his morning ritual; preceded by 'I can do this, I can do this, I can do this.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-8",
    "text": "I am a success. I am valuable. People do enjoy listening to me. I've got tremendous value that I can offer to the world.",
    "videoId": "bDdDQeugO64",
    "context": "Fake-it-till-you-make-it 'act as if' affirmations he says to himself and teaches.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-9",
    "text": "I am confident. I am confident. I am unstoppable. I am [whatever it is that I want to become].",
    "videoId": "Wr2SPFgW8iY",
    "context": "He yelled these in his car driving 30 min to work (lived with his mom, no private space); 'whatever you attach the words I am to is what you become.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-10",
    "text": "I am confident. I am assertive. I have so much certainty. I can do anything. I can achieve anything that I set my mind to.",
    "videoId": "jhSGXkVnJqc",
    "context": "Spoken 'out loud with my body, with my emotion, with total certainty' again and again in his morning ritual to reprogram the subconscious.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-11",
    "text": "I'm so happy. I'm so grateful. I'm so blessed. I'm so fulfilled in my life. I feel so happy and grateful for every experience of my life.",
    "videoId": "jhSGXkVnJqc",
    "context": "His happiness-conditioning affirmation, repeated daily.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-13",
    "text": "I am successful. I can do it. I can do anything I set my mind to. Anything is possible for me. There's no failure, there's only feedback.",
    "videoId": "AW4rKC43BP4",
    "context": "Affirmations/incantations he said out loud every day while building his business, 'and still do.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-14",
    "text": "I make the time for whatever I'm committed to.",
    "videoId": "0UTb0mnuJRE",
    "context": "Offered as 'an affirmation or an incantation you say to yourself again and again.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-15",
    "text": "I control how I feel. I can change how I feel in an instant. I am in charge of how I feel.",
    "videoId": "y_vzzMkjSrQ",
    "context": "'One of my favorite affirmations and belief systems that I condition' — repeated again and again out loud in the morning ritual. Also on cards in SYp9cHaD1dk, PliFBr__T7Y, OgRGJBpTOeU.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-16",
    "text": "I'm so happy for my life. I feel so grateful. I'm confident. I'm amazing. I'm a leader. I'm an incredible speaker.",
    "videoId": "PliFBr__T7Y",
    "context": "Incantation examples he speaks on the rebounder in his morning ritual (segment #3 'incantations').",
    "artifact": "incantations"
  },
  {
    "id": "incantations-17",
    "text": "What I choose to do today is going to shape today and create my tomorrow.",
    "videoId": "PliFBr__T7Y",
    "context": "Read out loud from his cue cards while rebounding. Variant in PPlaK8y4PzA: 'What I do today shapes my day and creates my tomorrow' (said twice).",
    "artifact": "incantations"
  },
  {
    "id": "incantations-18",
    "text": "I enjoy the process of creating a healthy and fit body.",
    "videoId": "PliFBr__T7Y",
    "context": "Cue-card incantation spoken on rebounder.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-20",
    "text": "Life doesn't happen to me, it happens for me.",
    "videoId": "PliFBr__T7Y",
    "context": "Cue-card incantation; also spoken in SYp9cHaD1dk and YirYWEGAKoY.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-22",
    "text": "Is this bringing me closer to or further away from my vision?",
    "videoId": "PliFBr__T7Y",
    "context": "Card he reads aloud in the incantation segment.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-23",
    "text": "Master your emotions, master your life.",
    "videoId": "PliFBr__T7Y",
    "context": "Card read aloud during incantations.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-25",
    "text": "Healthy food is a gift and reward that I deserve every day.",
    "videoId": "PliFBr__T7Y",
    "context": "Card read aloud; variant in PPlaK8y4PzA: 'Healthy food is a gift and reward that I give myself every day' (spoken twice).",
    "artifact": "incantations"
  },
  {
    "id": "incantations-26",
    "text": "Nothing tastes as good as being healthy and fit feels.",
    "videoId": "PliFBr__T7Y",
    "context": "Fitness incantation card; also in OgRGJBpTOeU.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-27",
    "text": "I will improve 1% each day and give myself pleasure for tiny progress.",
    "videoId": "PliFBr__T7Y",
    "context": "Card read aloud; also in OgRGJBpTOeU.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-28",
    "text": "For every disciplined effort there is a multiple reward.",
    "videoId": "PliFBr__T7Y",
    "context": "Card read aloud (Jim Rohn line, not attributed on camera).",
    "artifact": "incantations"
  },
  {
    "id": "incantations-29",
    "text": "I take massive action towards my goals every day.",
    "videoId": "OgRGJBpTOeU",
    "context": "Read from his empowering-beliefs list posted inside his closet doors.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-30",
    "text": "Every cell of my body vibrates with energy and health.",
    "videoId": "OgRGJBpTOeU",
    "context": "Read from his affirmations list.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-32",
    "text": "Everything happens for a reason and a purpose and it serves me.",
    "videoId": "OgRGJBpTOeU",
    "context": "Read from list; also spoken in SYp9cHaD1dk and YirYWEGAKoY.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-33",
    "text": "I make positive healthy choices every day.",
    "videoId": "OgRGJBpTOeU",
    "context": "Read from his affirmations list.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-34",
    "text": "Today is a winning day for me.",
    "videoId": "OgRGJBpTOeU",
    "context": "Read from his affirmations list.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-36",
    "text": "I'm an amazing friend. Everything I touch is a success. I act promptly and decisively. I can accomplish anything that I put my mind to.",
    "videoId": "OgRGJBpTOeU",
    "context": "Read from his affirmations list (he says he has 50-60 of these; picks a few per day).",
    "artifact": "incantations"
  },
  {
    "id": "incantations-37",
    "text": "The truth is I control how I feel. The truth is I can feel energetic, excited and happy right now just by changing my state. The truth is I have unstoppable energy.",
    "videoId": "OgRGJBpTOeU",
    "context": "His replacement incantation for the limiting beliefs 'I'm tired / I don't feel like it.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-39",
    "text": "I experience abundance anytime I: 1) give to others, 2) share with others anything that I've learned, know or is of value, 3) focus on and remember all the incredible abundance that already exists in my life, 4) remember that life is abundant and there's always more available coming my way.",
    "videoId": "PPlaK8y4PzA",
    "context": "Value-conditioning affirmation; he conditions one 'towards value' per day, spoken out loud.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-40",
    "text": "I experience consistent debilitating feelings of scarcity only if I were to consistently believe in the illusion of lack and focus excessively on myself, instead of remembering that everything in life is abundant, having faith that more is always available, and focusing on giving to others.",
    "videoId": "PPlaK8y4PzA",
    "context": "'Away-from value' affirmation to eliminate scarcity, conditioned daily.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-41",
    "text": "How can I appreciate and enjoy my life even more, while feeling even more fully alive and growing and making a difference in the lives of others?",
    "videoId": "PPlaK8y4PzA",
    "context": "His 'primary question' — spoken out loud for a few minutes each morning while answering it.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-42",
    "text": "Questions are the directing force of focus.",
    "videoId": "PPlaK8y4PzA",
    "context": "Affirmation card spoken (repeated) while rebounding.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-43",
    "text": "What we focus on is our experience of life. Our focus equals our reality.",
    "videoId": "PPlaK8y4PzA",
    "context": "Affirmation card spoken twice on camera.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-44",
    "text": "Every experience benefits me by giving me additional resources and new distinctions.",
    "videoId": "PPlaK8y4PzA",
    "context": "Affirmation card spoken twice on camera.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-45",
    "text": "Nothing has any meaning except for the meaning that I give it.",
    "videoId": "PPlaK8y4PzA",
    "context": "Affirmation card read aloud.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-46",
    "text": "Commitment creates power. Commitment creates congruence.",
    "videoId": "PPlaK8y4PzA",
    "context": "Affirmation card read aloud.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-47",
    "text": "I accomplish anything I put my mind to.",
    "videoId": "PPlaK8y4PzA",
    "context": "Affirmation card read aloud.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-48",
    "text": "God's delays are not God's denials.",
    "videoId": "PPlaK8y4PzA",
    "context": "Affirmation card read aloud.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-49",
    "text": "What I do every day will determine my self-esteem and happiness.",
    "videoId": "PPlaK8y4PzA",
    "context": "Affirmation card; also spoken in SYp9cHaD1dk.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-50",
    "text": "I love my life. I love my life.",
    "videoId": "PPlaK8y4PzA",
    "context": "'I'll say that guys like I mean it... I say it with a smile, I say it with the emotion so that I'm congruent with it.' In YirYWEGAKoY he says he said it every day on waking since youth, with a big smile: 'I love my life, I love my life, I love my life.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-51",
    "text": "I love my life and I am so blessed.",
    "videoId": "YirYWEGAKoY",
    "context": "Card he reads aloud; instruction: 'say that out loud three times.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-52",
    "text": "I can feel amazing just by deciding to. I don't need a reason to feel good.",
    "videoId": "YirYWEGAKoY",
    "context": "First card he reads aloud from his morning-ritual deck (spoken twice). 'I don't need a reason to feel good' also in SYp9cHaD1dk.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-53",
    "text": "This too shall pass.",
    "videoId": "YirYWEGAKoY",
    "context": "Card he says to himself in hard times (spoken twice on camera).",
    "artifact": "incantations"
  },
  {
    "id": "incantations-54",
    "text": "Use me Lord. Use me.",
    "videoId": "YirYWEGAKoY",
    "context": "Prayer-incantation he says before speaking, videos, or coaching: 'I just ask my Creator, ask God, use me to share, to give, to inspire.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-55",
    "text": "Leaders are learners. In order to earn more, I must learn more.",
    "videoId": "YirYWEGAKoY",
    "context": "Card read aloud; also spoken in SYp9cHaD1dk.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-56",
    "text": "I always focus on and find the good in everything.",
    "videoId": "YirYWEGAKoY",
    "context": "Card read aloud; spoken twice in PPlaK8y4PzA, also in SYp9cHaD1dk.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-57",
    "text": "Everything is a gift.",
    "videoId": "YirYWEGAKoY",
    "context": "Card read aloud; also in SYp9cHaD1dk.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-58",
    "text": "God isn't interested in my convenience as much as in my character and who I become.",
    "videoId": "YirYWEGAKoY",
    "context": "Card read aloud; variants in SYp9cHaD1dk and PPlaK8y4PzA ('he's interested in my character').",
    "artifact": "incantations"
  },
  {
    "id": "incantations-59",
    "text": "I am bigger than anything that could ever happen to me.",
    "videoId": "YirYWEGAKoY",
    "context": "Card read aloud twice; also in SYp9cHaD1dk.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-60",
    "text": "The best is yet to come.",
    "videoId": "YirYWEGAKoY",
    "context": "Card read aloud twice: 'always remind yourself of that.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-61",
    "text": "Change can happen in an instant.",
    "videoId": "YirYWEGAKoY",
    "context": "Card read aloud; he lives in 'positive anticipation of change.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-62",
    "text": "At any moment I must be willing to sacrifice what I am for what I could become.",
    "videoId": "YirYWEGAKoY",
    "context": "Card read aloud.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-63",
    "text": "I can change my state in an instant. I control how I feel.",
    "videoId": "SYp9cHaD1dk",
    "context": "First card he reads in the affirmations video.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-64",
    "text": "If I change, everything will change for me.",
    "videoId": "SYp9cHaD1dk",
    "context": "Card read aloud (Jim Rohn line, unattributed).",
    "artifact": "incantations"
  },
  {
    "id": "incantations-65",
    "text": "I get rewarded in public for what I practice in private.",
    "videoId": "SYp9cHaD1dk",
    "context": "Card read aloud.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-66",
    "text": "Life is a gift. I'm a gift from God.",
    "videoId": "SYp9cHaD1dk",
    "context": "Cards read aloud.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-67",
    "text": "As I think, I shall become.",
    "videoId": "SYp9cHaD1dk",
    "context": "Card read aloud; Buddha variant in YirYWEGAKoY: 'What I think I become' (spoken twice).",
    "artifact": "incantations"
  },
  {
    "id": "incantations-68",
    "text": "If I can't, then I must. If I must, then I will.",
    "videoId": "SYp9cHaD1dk",
    "context": "Card read aloud (Robbins-lineage line, unattributed on camera).",
    "artifact": "incantations"
  },
  {
    "id": "incantations-69",
    "text": "There's no such thing as failure, only feedback.",
    "videoId": "SYp9cHaD1dk",
    "context": "Card read aloud; also spoken in AW4rKC43BP4.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-71",
    "text": "I deserve the gift of lasting health and happiness. Nothing is more important than my health and happiness.",
    "videoId": "SYp9cHaD1dk",
    "context": "Cards read aloud.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-72",
    "text": "My rituals are an act of self-love.",
    "videoId": "SYp9cHaD1dk",
    "context": "Card read aloud.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-73",
    "text": "To hell with circumstances, I create opportunities.",
    "videoId": "SYp9cHaD1dk",
    "context": "Bruce Lee quote turned into a daily card affirmation: 'Now I'm modeling someone else's blueprint.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-74",
    "text": "Knowing is not enough, we must apply. Willing is not enough, we must do.",
    "videoId": "SYp9cHaD1dk",
    "context": "Bruce Lee card read aloud; also in YirYWEGAKoY and PPlaK8y4PzA.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-75",
    "text": "I must be the change I wish to see in the world.",
    "videoId": "SYp9cHaD1dk",
    "context": "Gandhi card read aloud; in YirYWEGAKoY he says it 'with passion... gives me goosebumps.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-76",
    "text": "Strength does not come from physical capacity, it comes from an indomitable will.",
    "videoId": "SYp9cHaD1dk",
    "context": "Gandhi card read aloud; also YirYWEGAKoY.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-77",
    "text": "Nobody can hurt me without my permission.",
    "videoId": "SYp9cHaD1dk",
    "context": "Gandhi card read aloud; also YirYWEGAKoY.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-78",
    "text": "Faith is taking the first step even when you don't see the whole staircase.",
    "videoId": "SYp9cHaD1dk",
    "context": "MLK card read aloud; also YirYWEGAKoY and oLQiUIJ7PsQ.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-79",
    "text": "I have decided to stick with love; hate is too great of a burden to bear.",
    "videoId": "SYp9cHaD1dk",
    "context": "MLK card read aloud; also YirYWEGAKoY and PPlaK8y4PzA.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-80",
    "text": "Happiness is not something ready-made, it comes from my own actions.",
    "videoId": "SYp9cHaD1dk",
    "context": "Dalai Lama card read aloud; also YirYWEGAKoY.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-81",
    "text": "Be kind whenever possible. It is always possible.",
    "videoId": "SYp9cHaD1dk",
    "context": "Dalai Lama card read aloud twice.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-82",
    "text": "My life is my message.",
    "videoId": "YirYWEGAKoY",
    "context": "Gandhi card read aloud twice.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-83",
    "text": "Life isn't about finding myself, it's about creating myself.",
    "videoId": "YirYWEGAKoY",
    "context": "George Bernard Shaw card read aloud.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-84",
    "text": "I would rather have a mind opened by wonder than one closed by belief.",
    "videoId": "YirYWEGAKoY",
    "context": "Card read aloud twice.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-85",
    "text": "There is no remedy for love but to love more.",
    "videoId": "YirYWEGAKoY",
    "context": "Thoreau card read aloud; also PPlaK8y4PzA.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-86",
    "text": "The secret to living is giving.",
    "videoId": "YirYWEGAKoY",
    "context": "Tony Robbins card read aloud.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-87",
    "text": "The ultimate measure of a man is not where he stands in moments of comfort and convenience, but where he stands in times of challenge and controversy.",
    "videoId": "YirYWEGAKoY",
    "context": "MLK card read aloud; also PPlaK8y4PzA.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-88",
    "text": "First they ignore you, then they laugh at you, then they fight you, and then you win.",
    "videoId": "PPlaK8y4PzA",
    "context": "Gandhi quote card read aloud on rebounder.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-89",
    "text": "You must not lose faith in humanity. Humanity is an ocean; if a few drops of the ocean are dirty, the ocean does not become dirty.",
    "videoId": "PPlaK8y4PzA",
    "context": "Gandhi card read aloud; also read aloud in oLQiUIJ7PsQ.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-90",
    "text": "Live as if you were to die tomorrow. Learn as if you were to live forever.",
    "videoId": "PPlaK8y4PzA",
    "context": "Gandhi card read aloud.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-91",
    "text": "I love my job. I love my job.",
    "videoId": "JZO1--Awz7k",
    "context": "Reframe incantation he prescribed to a coaching client who hated his job: say it on the drive to work with a smile, with passion and energy, 'like you really believe it.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-94",
    "text": "I am the best. I am the best. I am number one. I am amazing. Everybody wants to meet me. I own this place.",
    "videoId": "meGVqcdcU6g",
    "context": "Confidence self-talk he teaches to say out loud/internally ('it's for you, you don't need to say it to other people').",
    "artifact": "incantations"
  },
  {
    "id": "incantations-95",
    "text": "I am confident. I am good enough. I am unstoppable.",
    "videoId": "CGqhbXzJrG8",
    "context": "Taught to a viewer: write out the beliefs you want, then 'say them out loud every day as affirmations, speak them out loud with intensity, with enthusiasm.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-96",
    "text": "I have high self-esteem. I love myself. I'm confident. I'm capable. I believe in myself. I deserve happiness. I deserve joy. I deserve the best.",
    "videoId": "n_vo-SBhB1I",
    "context": "Self-esteem affirmations, declared out loud again and again; he frames them as 'speaking the truth of who you really are.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-97",
    "text": "I let go of the need to please people.",
    "videoId": "oLQiUIJ7PsQ",
    "context": "An affirmation he wrote down and reads aloud on camera.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-99",
    "text": "I will easily do a 15-day juice fast to cleanse and heal my body, creating unstoppable energy and vitality, by December 31st 2016.",
    "videoId": "GXhPOncX8CA",
    "context": "Goal-setting workshop: he writes a goal as an affirmation to repeat in the morning ritual; teaches the wording 'I will easily... and enjoy the process.'",
    "artifact": "incantations"
  },
  {
    "id": "incantations-100",
    "text": "Take action, take action, take action.",
    "videoId": "cNrfm78SfDo",
    "context": "'That should be your mantra in your head all day' — the only self-generated 'mantra' usage in the corpus.",
    "artifact": "incantations"
  },
  {
    "id": "incantations-101",
    "text": "I am the greatest. I am the greatest. I am the greatest.",
    "videoId": "F4j974PvwSQ",
    "context": "DISCUSSED, not his own incantation: Muhammad Ali example ('before he won anything') used to teach 'be careful what you attach to I am'; also cited in bDdDQeugO64, 4789IM-_-i4, 0UTb0mnuJRE.",
    "artifact": "incantations"
  },
  {
    "id": "manifesto-0",
    "text": "my name is Stefan James and I am the master of my life",
    "videoId": "Kf6aFwzozM0",
    "context": "opener (lines 1-2), also repeated verbatim as the final line (96-97) — bookends the manifesto",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-1",
    "text": "I design and create my own future never settling for mediocrity or being average",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 1",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-2",
    "text": "I demand the most of myself and hold myself to the highest standard comparing myself to no one but the best of what I'm truly capable of",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 2",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-3",
    "text": "I never stop learning and growing always remaining humble by learning from others and standing on the shoulders of giants",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 3",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-4",
    "text": "I invest in myself for I know that I am worth it as my own self growth and future is the best investment that I can ever make",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 4",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-5",
    "text": "I take massive action as knowing is not enough I must apply myself and act on what I know",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 5",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-6",
    "text": "I never stop believing and having faith in my vision capabilities and unlimited potential",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 6",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-7",
    "text": "I focus on mastering the process enjoying the journey and trusting knowing that it will always lead to my ultimate destiny",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 7 (ASR likely dropped 'and' in 'trusting and knowing')",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-8",
    "text": "I have patience and I'm after the long-term rewards not the short-term gratification",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 8",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-9",
    "text": "I never give up when a challenge or plateau arises I always choose to step up and find the way",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 9",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-10",
    "text": "I focus on consistently mastering the fundamentals over and over and over again as I understand that repetition is the mother of mastery",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 10",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-11",
    "text": "I am proactive and strategic about my decisions not reactively allowing distractions dabbling or the novelty of shiny objects interfere with my purpose",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 11",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-12",
    "text": "I go all in fully committing myself by deciding to do whatever it takes to achieve my dreams",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 12",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-13",
    "text": "I defy the odds of what is possible I create my own standard and determine my own future not allowing the naysayers or doubters to affect me or tell me otherwise",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 13",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-14",
    "text": "I go deep and all aspects of life as I know mastery and the rewards lie in the depth not on the surface",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 14 (ASR: 'and all aspects' likely 'in all aspects')",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-15",
    "text": "I live the truth of who I really am and what I'm capable of not allowing stories or excuses to limit me",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 15",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-16",
    "text": "I do what I say and I keep my word for integrity and following through all my commitments builds the self-esteem and character that I applied myself in",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 16 (ASR: 'applied myself in' likely 'pride myself in')",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-17",
    "text": "I focus on giving and adding value serving the greater good not just my own for I know that my needs will be met simultaneously through meeting the needs of others",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 17",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-18",
    "text": "I lead by example walking my talk for actions speak much louder than words",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 18",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-19",
    "text": "I lead with my heart with the purpose of serving and inspiring others of the unlimited possibilities of the human spirit",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 19",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-20",
    "text": "my caring is my ultimate power it provides unlimited motivation and drive where human beings will always do more for others they care about than for themselves",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 20",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-21",
    "text": "I live with abundance having full faith and certainty that there's always more easily available within my grasp instead of living with fear and scarcity",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 21",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-22",
    "text": "I reward and acknowledge myself constantly as praise is the father of mastery and whatever gets rewarded gets repeated",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 22",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-23",
    "text": "I celebrate every result every outcome smaller big good or bad as every result has a higher purpose and intent allowing myself to fully trust the process of life surrendering the need for",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 23 — ASR truncates after 'the need for' (likely 'control')",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-24",
    "text": "I am positive and optimistic always searching for the good and creating an empowering meaning and whatever life gives me",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 24 (ASR: 'and whatever' likely 'in whatever')",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-25",
    "text": "I live with joy and happiness today right now never willing to delay my happiness to a future event as I know that happiness is a choice and I choose to live each day fully",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 25",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-26",
    "text": "I focus on living a life of balance constantly striving to improve and master every area of my life for I know that life mastery leads to the highest form of success and fulfillment",
    "videoId": "Kf6aFwzozM0",
    "context": "credo line 26",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-27",
    "text": "I commit to mastery in all areas of my life refusing to settle for anything less than an extraordinary quality of life",
    "videoId": "Kf6aFwzozM0",
    "context": "closing commitment, before the repeated bookend",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-28",
    "text": "the next part of my morning ritual is I'm going to share with you guys some of the incantations and affirmations that process that I go through to amplify my state and condition my myself",
    "videoId": "OgRGJBpTOeU",
    "context": "how/when: daily morning-ritual recitation practice",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-29",
    "text": "I've got a closet that on the inside of the closet I put down my incantations my values my vision",
    "videoId": "OgRGJBpTOeU",
    "context": "how/when: declarations posted inside his office closet doors, spoken aloud daily",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-30",
    "text": "I take Massive Action towards my goals",
    "videoId": "OgRGJBpTOeU",
    "context": "credo line appearing inside his daily affirmations list (he has 50-60, picks a few daily, says out loud with emotional intensity)",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-31",
    "text": "I made a decision I was I was no longer gonna settle in my life I was in the commit to mastery I got rid of my video games my TV",
    "videoId": "TTNjl7W5DOs",
    "context": "origin story of commit-to-mastery, age 17",
    "artifact": "manifesto"
  },
  {
    "id": "manifesto-32",
    "text": "Remember to always believe and commit to mastery.",
    "videoId": "w9SuU6cgqVQ",
    "context": "the closing line reused as his standard video sign-off (16 files)",
    "artifact": "manifesto"
  },
  {
    "id": "mastery-plateau-0",
    "text": "I focus on mastering the process enjoying the journey and trusting knowing that it will always lead to my ultimate destiny I have patience and I'm after the long-term rewards not the short-term gratification I never give up when a challenge or plateau arises I always choose to step up and find the way",
    "videoId": "Kf6aFwzozM0",
    "context": "Project Life Mastery Manifesto (spoken creed video) — patience-on-plateaus clause",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-1",
    "text": "I focus on consistently mastering the fundamentals over and over and over again as I understand that repetition is the mother of mastery. I am proactive and strategic about my decisions not reactively allowing distractions dabbling or the novelty of shiny objects interfere with my purpose",
    "videoId": "Kf6aFwzozM0",
    "context": "Manifesto — repetition doctrine + anti-dabbling clause",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-2",
    "text": "I go deep and all aspects of life as I know mastery and the rewards lie in the depth not on the surface",
    "videoId": "Kf6aFwzozM0",
    "context": "Manifesto — depth-over-surface clause",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-3",
    "text": "I reward and acknowledge myself constantly as praise is the father of mastery and whatever gets rewarded gets repeated",
    "videoId": "Kf6aFwzozM0",
    "context": "Manifesto — 'praise is the father of mastery' (pairs with 'repetition is the mother')",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-4",
    "text": "I commit to mastery in all areas of my life refusing to settle for anything less than an extraordinary quality of life my name is Stefan James and I am the master of my life",
    "videoId": "Kf6aFwzozM0",
    "context": "Manifesto closing — canonical 'commit to mastery' language",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-5",
    "text": "I'm going to share with you 10 keys to mastery that you can apply to anything in life that you want to master",
    "videoId": "Jy42T9CUee0",
    "context": "'10 Secrets To Mastering Anything In Your Life' — names the 10-key meta-process; keys given as: 1 make it a study (model success, proximity: 'the best way to master anything is to put yourself in proximity consistently with someone that has the results that you desire'), 2 go deep don't dabble, 3 repetition, 4 embrace discomfort/handicap yourself, 5 fully immerse yourself, 6 measure your progress, 7 reward yourself, 8 break past plateaus, 9 be patient (10,000 hours), 10 pay it forward and teach ",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-6",
    "text": "there's four levels of learning ... unconscious incompetence is when you suck at something but you're not even aware that you suck ... level two is conscious incompetence ... the third level is conscious competence ... step number four is unconscious competence that's mastery now you're doing it but you don't even have to think about it",
    "videoId": "Jy42T9CUee0",
    "context": "Key #2 (go deep) — 4 levels of learning ladder ending in mastery",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-7",
    "text": "most people they die with their potential still intact not you not me we're gonna make a decision to master these areas of our life so go deep and don't dabble don't just jump from one thing to the next to the next because to master something you gotta break past a plateau you gotta break past that that suck phase where you're incompetent",
    "videoId": "Jy42T9CUee0",
    "context": "Key #2 — depth doctrine, plateau as the gate to mastery",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-8",
    "text": "repetition is the mother of what the mother of mastery if you want to master something repetition you got to do it again and again and again and again and again ... now oftentimes mastery is boring it's boring but you've got to embrace that that's the only way you're going to get good at anything",
    "videoId": "Jy42T9CUee0",
    "context": "Key #3 — repetition; 'mastery is boring' doctrine; cites The Talent Code, Bruce Lee one-kick-10,000-times",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-9",
    "text": "number eight you've got to break past you're going to hit plateaus they're inevitable ... you've got to anticipate plateaus you got to know that they're part of the journey and when you anticipate it you're not surprised by it sometimes you hit a plateau you've got to take a step back ... the level of thinking that got you to where you are is not the same level of thinking that's going to get you to where you want to go",
    "videoId": "Jy42T9CUee0",
    "context": "Key #8 — plateau doctrine core: anticipate, don't be surprised, retool",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-10",
    "text": "he realized that sometimes you could take two steps back to take 10 steps forward and so anytime you make a change ... now you are retooling and now it allows you to break beyond that plateau ... often one of the best ways to identify a plateau is to get a coach someone that's already been there or done it or can offer a different perspective",
    "videoId": "Jy42T9CUee0",
    "context": "Key #8 — Tiger Woods swing-change story; canonical 'two steps back to take ten forward' + get-a-coach plateau remedy",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-11",
    "text": "there's a ten thousand hour rule that typically they say it takes about ten thousand hours to master something ... that's often about 10 years to master something ... mastery is a constant never-ending improvement",
    "videoId": "Jy42T9CUee0",
    "context": "Key #9 patience — 10,000-hour rule (credits Gladwell's Outliers); mastery never 'done'",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-12",
    "text": "see if you really want to master something then teach it share what you're learning with other people it's going to force you to get better at it it's going to force you to learn it at a deeper level it's going to force you to integrate it and it's going to force you to live it",
    "videoId": "Jy42T9CUee0",
    "context": "Key #10 — teach-to-learn doctrine; he explains he built Project Life Mastery as a business precisely to force himself to master life ('I make it into my business and I teach it I have a higher level responsibility')",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-13",
    "text": "you get these 10 keys down you can master anything in your life anything but if you don't then you're going to remain a dabbler in everything in your life",
    "videoId": "Jy42T9CUee0",
    "context": "Closing — dabbler as the anti-identity of the 10 keys",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-14",
    "text": "we're gonna talk about transformation and what transformation means the seven levels of transformation",
    "videoId": "TTNjl7W5DOs",
    "context": "Names the 7-level transformation ladder explicitly. Levels as taught: 1 change in belief/mindset, 2 decision or commitment, 3 action, 4 results, 5 consistency (consistent action + consistent results), 6 identity change, 7 mastery",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-15",
    "text": "that leads to level 7 and level 7 is mastery which really is I can sort of be conditioning and reinforcement because the master that identity you have to when you first build that identity you have to keep doing the actions and the results necessary to reinforce that ... if you stop taking action ... you're gonna regress in their transformation",
    "videoId": "TTNjl7W5DOs",
    "context": "Level 7 = mastery defined as conditioning/reinforcement of identity; ASR garbled mid-sentence",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-16",
    "text": "after the fitness competition I didn't commit to mastery ... I didn't have that same level of standard for myself so this identity weakened and I started to lose some of the results that I had ... unless you continuously condition that and keep your standards high your transformation can regress",
    "videoId": "TTNjl7W5DOs",
    "context": "Personal failure case (WBFF fitness competition) proving level 7 — transformation regresses without commitment to mastery",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-17",
    "text": "inevitably what happens ... you hit what is called a plateau and that plateau could be many things maybe that plateau is you just lose your motivation ... maybe the plateau is you hit a roadblock maybe something that's outside of your control ... whatever that plateau is it can be many different things but what happens for a lot of people is when they hit that plateau they often digress and they revert back to where they were before",
    "videoId": "0qdqKXt46w4",
    "context": "'WHY YOU WILL FAIL' whiteboard talk — anatomy of the plateau",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-18",
    "text": "I call this the pyramid or the triangle of pain because at first you're excited you're enthusiastic you hit the plateau you feel some pain ... sure enough eventually you think to yourself why even try",
    "videoId": "0qdqKXt46w4",
    "context": "'Triangle of pain' — his named model for the repeated start-plateau-quit cycle (also taught in Kz83kMosOWU where it ends in 'learned helplessness')",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-19",
    "text": "there's only one reason why I didn't achieve your goal ... it's because you stopped ... you stopped believing you stopped trying you stopped growing you stop learning",
    "videoId": "0qdqKXt46w4",
    "context": "Plateau reframe — the plateau is never the cause of failure, stopping is",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-20",
    "text": "the way to get to where you want to go is you got to commit to what I call mastery ... you can't get caught up in the dabbler mentality ... the dabbler is the person that when they start something they don't finish it they get shiny object syndrome they jump from one thing to the next ... they're always staying at the surface they never go deep ... the dabbler equals pain",
    "videoId": "0qdqKXt46w4",
    "context": "Dabbler vs mastery framing; 'the dabbler equals pain'",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-21",
    "text": "when you hit that plateau it's gonna be a small dip it's not gonna drive you back ... this person's already been through the plateaus ... they can help you anticipate the potential roadblocks and plateaus that might come up ... that's how you master something you don't try to reinvent the wheel you learn and you model someone that already has the result",
    "videoId": "0qdqKXt46w4",
    "context": "Mentor as plateau-shrinker — modeling turns plateaus into small dips",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-22",
    "text": "there's always a plateau that you're going to hit it's inevitable I don't know why people are so surprised when there's a plateau I'm like oh yeah there's of course there's a plateau there's always a plateau in life right you got to learn to recognize that",
    "videoId": "Kz83kMosOWU",
    "context": "Life Mastery Blueprint livestream — plateau inevitability",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-23",
    "text": "the way to get out of this is committing to Mastery committing to Mastery you can no longer be the dabbler ... the dabbler is someone they hit the wall they hit the plateau they give up and they get discouraged and they complain about it the master is someone they hit the wall they're going to find a way over that wall they're going to go over it they're going to go under it they're going to go around it they're going to break through the wall ... they hit the plateau and they find a way past it",
    "videoId": "Kz83kMosOWU",
    "context": "Canonical dabbler-vs-master wall/plateau contrast",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-24",
    "text": "if you had a mentor a mentor would allow you to avoid the plateaus in the first place ... they've got a different perspective on the journey cuz they've already been through it they've already been through the obstacles the plateaus the pain points",
    "videoId": "Kz83kMosOWU",
    "context": "Mentor/coach doctrine tied to plateaus",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-25",
    "text": "I'm often reminded of the three levels of mastery which is a foundational teaching that I shared here in project life mastery there's knowing there's doing and then there's living you can know something but it doesn't mean that you're doing it ... they know what to do but they're not doing what they know and knowing is not enough",
    "videoId": "pk6ujWo597Y",
    "context": "'How I Learn And Study To Master Anything' — the 3-level mastery ladder (knowing → doing → living), called a foundational teaching; also his 1:3 learn-to-action ratio rule",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-26",
    "text": "that's not Mastery mastery is when you're actually living it you're consistently getting the results and you've achieved a level of success those are the people that you want to learn from learn from people that at the living phase of Mastery",
    "videoId": "Kz83kMosOWU",
    "context": "Knowing/doing/living applied — only learn from people at the 'living' level",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-27",
    "text": "There's three levels of mastery. There's knowing, doing and living. You can know what to do, but not do what you know. You could do it, but not do it consistently and so it's not going to change you as much. You've got to live it. That's the third level of mastery.",
    "videoId": "SYp9cHaD1dk",
    "context": "Cleanest statement of the 3-level ladder (Morning Ritual Mastery pitch); same teaching in 3NquT3aJ-L0 and eEQFj4Zoijs",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-28",
    "text": "maybe it was a shift around the dabbler versus the master the three levels of mastery just hearing that that was a little for you now understanding mastery can change her entire life",
    "videoId": "TTNjl7W5DOs",
    "context": "Cross-reference: dabbler-vs-master + 3 levels cited as example of a level-1 (belief) transformation",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-29",
    "text": "the master goes deep the dabbler stays at the surface the dabbler is looking for what's easy the master is willing to do what's hard and difficult",
    "videoId": "OltpabSGqmQ",
    "context": "Tightest master/dabbler aphorism in corpus",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-30",
    "text": "you can't be the dabbler jumping all over the place in your life you have to commit to what i call mastery the mastery mentality which is understanding there will be plateaus there'll be ups and downs but you got to be laser focused and say no to a lot of distractions ... change your expectation to know that this is going to take a long time ... trusting the process not trying to shortcut it you can never shortcut it",
    "videoId": "KN9504n_ts8",
    "context": "'How To Stay Motivated' — mastery mentality defined as plateau-expectation + patience + focus",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-31",
    "text": "That's the definition of a dabbler. A dabbler is someone that goes from one opportunity to the next and they don't fully commit and go deep.",
    "videoId": "NidJpDcCkQs",
    "context": "Explicit definition; told to a refund-seeking prospect ('the 30-day money back guarantee ... gives all the dabblers a way to retreat')",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-32",
    "text": "I was a dabbler. I wasn't committed to mastery. So I joined this program called the 100-Day Challenge in 2010.",
    "videoId": "IoR5DzX-9YI",
    "context": "Autobiographical — letter-to-self video; his own origin story framed as dabbler-to-mastery conversion",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-33",
    "text": "the easy mentality is the dabbler mentality the mastery mentality is the one that's willing to commit themselves and go deep",
    "videoId": "I3RzLalRjkM",
    "context": "'What's the easiest way to make money' called 'a dabbler question'",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-34",
    "text": "be willing sometimes in your life to take two steps back to take ten steps forward okay it might be uncomfortable and it might suck to have to move back in with their parents to have to sell your car and take the bus",
    "videoId": "I3RzLalRjkM",
    "context": "Two-steps-back applied to life/finances (he moved in with his mom, slept on a friend's futon)",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-35",
    "text": "you're trying to win the war not just the battle sometimes you might lose a battle but you'll win the war right you got to look at the big picture and sometimes you have to take two steps back to take 10 steps forward and so that's just part of the journey",
    "videoId": "iVopRAfH1Aw",
    "context": "Q&A — third occurrence of the two-steps-back formula",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-36",
    "text": "Masters understand the importance of repetition dabblers think that one time is just enough ... Masters understand once is not enough you got to do it again and again and again",
    "videoId": "cjk0O5nWzcU",
    "context": "Master/dabbler contrast on repetition",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-37",
    "text": "sometimes life improvement it's never it's never up like this it's like you make some progress and then you hit a plateau and then you go down a little bit ... goes up and then it goes down ... as long as the trend is up that's what matters",
    "videoId": "6pOOA9PLsTI",
    "context": "Plateau normalized — trend-line doctrine",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-38",
    "text": "i just like the next person made mistakes hit plateaus was frustrated not seeing the success that i wanted ... but what got me past that was my commitment i wanted it badly enough and that gave me the perseverance to push past that",
    "videoId": "y2oiz9LRchE",
    "context": "'The Secret To Success' — commitment as the plateau-breaker; also his Spanish-learning plateau story ('my commitment level and my progress kind of hitting a plateau ... when you're first setting a goal you're naive to the process')",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-39",
    "text": "once you hit a plateau with that and you're ... then you want to get a coach or a mentor to help you with that",
    "videoId": "rJF-3Gadxdk",
    "context": "Sequencing rule: course/basics first, coach at the plateau (same rule in mjVjmmEQysg 'once you kind of hit that plateau then you hire a mentor then you hire a coach' and hQ0SAsuJrIQ 'they hit a plateau ... that's perfect for bringing in a coach')",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-40",
    "text": "have you ever thought about getting your own personal coach so you don't plateau and continue to grow I've got many different coaches in my life actually business coaches health coaches ... that's committed to Mastery",
    "videoId": "SxpyII37voA",
    "context": "Q&A — coaches as plateau prevention, framed as commitment to mastery",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-41",
    "text": "part of the process of mastery is that it's never-ending there's no final that destination there's no end-all be-all ... the goal is not perfection ... your 10 is always gonna change",
    "videoId": "wqJ-2N5KVOU",
    "context": "'How To Master Every Area Of Your Life' — mastery as never-ending process on the wheel-of-life ratings; signs off 'commit your life to mastery god bless'",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-42",
    "text": "I view it as a project okay a project is something I'm always working towards I'm a student I humble myself I'm not a master that's up to other people to decide",
    "videoId": "wqJ-2N5KVOU",
    "context": "Why 'Project' Life Mastery — perpetual-student stance",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-43",
    "text": "success is not for people that are that are dabblers and it should never be that way you know it's a good thing that it's hard ... because that forces you to grow",
    "videoId": "QfUtW2Do79w",
    "context": "Difficulty as filter against dabblers",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-44",
    "text": "a lot of people what they do is they're dabblers they just jump from one thing to the next they're not seeing results fast enough so they're doing something else ... sure enough they never get the result because they don't understand that it's a process",
    "videoId": "2kYLUwBF3h4",
    "context": "Dabbler pattern applied to dieting/goals",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-45",
    "text": "most people unfortunately they live in a world of instant gratification and you know I call it the dabbler mentality and they're looking to achieve success with the least amount of effort and that never leads to success",
    "videoId": "M_xRDNRa40s",
    "context": "Dabbler mentality = instant gratification / least effort",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-46",
    "text": "people that are dabblers those are always the ones that have one foot in one foot out ... they don't fully commit they don't have the Mastery mentality",
    "videoId": "GXhPOncX8CA",
    "context": "One-foot-in dabbler image; same video covers shiny object syndrome and burning-the-boats commitment",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-47",
    "text": "that level of thinking is great especially if you struggle with the dabbler mentality ... but at a certain point I'm kind of realizing that that mindset can have some limitations because at certain times you might have to be flexible ... that flexibility though can actually be a destructive mindset to someone that is a dabbler",
    "videoId": "TRGRznrMSec",
    "context": "Rare nuance — when rigid commitment doctrine needs flexibility, and why that exception is dangerous for dabblers",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-48",
    "text": "I don't want any dabblers in this program. Okay? I've I've already turned people away that wanted to join",
    "videoId": "dBZPHI--GJk",
    "context": "Dabbler-gating as sales/qualification doctrine (same move in rJF-3Gadxdk 'If you're a dabbler, this is not for you. This is for people that are committed to mastery', E20v-rrXyWs, eEQFj4Zoijs, SxpyII37voA, -lH7vrLl0pY)",
    "artifact": "mastery-plateau"
  },
  {
    "id": "mastery-plateau-49",
    "text": "I talk a lot about the dabbler the master you probably heard me talk about this a lot before ... it's one of the most important things that I teach because if you can't understand the Mastery mentality then you're not going to master your life nothing that I share with you is going to work",
    "videoId": "Kz83kMosOWU",
    "context": "He names 'the Life Mastery Mentality' (master vs dabbler) as a standalone foundational training and gate for everything else",
    "artifact": "mastery-plateau"
  },
  {
    "id": "money-system-0",
    "text": "you're gonna break down the money that you make and your expenses into a few different categories first here is necessities what you're going to do is you're going to have fifty-five percent of the money that you make go towards necessities ... necessities are your rent maybe it's your phone bill maybe it's your internet maybe it's your gym membership ... the hydro and you know the bus pass that you got or the the gas or car payments",
    "videoId": "rqbZyviDnfU",
    "context": "Money Management 101 — first jar: necessities 55%",
    "artifact": "money-system"
  },
  {
    "id": "money-system-1",
    "text": "a lot of people already got this wrong where they're spending a hundred percent or ninety percent of the money that they make is going towards their necessities that's called living paycheck to paycheck",
    "videoId": "rqbZyviDnfU",
    "context": "why 55% cap matters",
    "artifact": "money-system"
  },
  {
    "id": "money-system-2",
    "text": "we have long-term savings okay 10% ... you want to make sure you have at least six months okay six months of your income or expenses put aside in a savings account that is just an emergency fund",
    "videoId": "rqbZyviDnfU",
    "context": "jar 2: long-term savings 10%, build to 6-month emergency fund",
    "artifact": "money-system"
  },
  {
    "id": "money-system-3",
    "text": "you never touch that money not unless it's for an emergency okay so that money is not being used to buy a house to buy a car for the next vacation ... you can live off that money for six months before you can you know maybe get another job",
    "videoId": "rqbZyviDnfU",
    "context": "emergency fund rules",
    "artifact": "money-system"
  },
  {
    "id": "money-system-4",
    "text": "financial freedom okay financial freedom this is ten percent of your income that you're gonna put aside for investing in your future ... there's three primary investment vehicles that I think are the best for creating financial freedom and wealth",
    "videoId": "rqbZyviDnfU",
    "context": "jar 3: financial freedom 10%",
    "artifact": "money-system"
  },
  {
    "id": "money-system-5",
    "text": "education 10% and this is also a very important one because the best investment you're ever gonna make in your life also according to Warren Buffett greatest investor of all time is an investment in yourself",
    "videoId": "rqbZyviDnfU",
    "context": "jar 4: education 10%",
    "artifact": "money-system"
  },
  {
    "id": "money-system-6",
    "text": "fun ... you'd put ten percent of your money towards that and then the last the last area is giving okay giving is about five percent",
    "videoId": "rqbZyviDnfU",
    "context": "jar 5: fun/play 10%; jar 6: give 5% (=100% total)",
    "artifact": "money-system"
  },
  {
    "id": "money-system-7",
    "text": "a simple formula or strategy that I learned from Tihar vector and T Harv Eker is the author of secrets of the millionaire mind it's got a great seminar that I went to many years ago",
    "videoId": "rqbZyviDnfU",
    "context": "lineage: T. Harv Eker, Secrets of the Millionaire Mind (ASR mangles name as 'Tihar vector')",
    "artifact": "money-system"
  },
  {
    "id": "money-system-8",
    "text": "for me right now if I were to be totally honest with my income and my lifestyle right now I would say probably 80% of my income goes into financial freedom",
    "videoId": "rqbZyviDnfU",
    "context": "his own modified allocation at high income",
    "artifact": "money-system"
  },
  {
    "id": "money-system-9",
    "text": "it's not really even about the amount it's about the habit of it okay getting in the consistent habit of managing your money",
    "videoId": "rqbZyviDnfU",
    "context": "habit-over-amount doctrine (lottery/liposuction analogy)",
    "artifact": "money-system"
  },
  {
    "id": "money-system-10",
    "text": "This is a simple method that I actually learned from T. Harv Eker. T. Harv Eker wrote a great book called The Secrets of the Millionaire Mind, highly recommend it. And this is known as the jar system. A way to budget and allocate your finances. ... So the first jar you have is called necessities. And you want 55%.",
    "videoId": "VfhmzqDHM4w",
    "context": "How To Budget Your Money — only place he names it 'the jar system'",
    "artifact": "money-system"
  },
  {
    "id": "money-system-11",
    "text": "long term savings. How much do you want going towards that? 10% of your income. ... you want to build this up until it's about six months worth of your income. That's an emergency. That's if shit hits the fan in your life, if you lose your job, if there's a recession ... You don't touch that money unless it's a rainy day",
    "videoId": "VfhmzqDHM4w",
    "context": "long-term savings jar mechanics",
    "artifact": "money-system"
  },
  {
    "id": "money-system-12",
    "text": "the next one you need a financial freedom account. Very important, okay? You've got to take 10% to put into this. This is money that you can use to invest, this is money that you can use to start a business. ... Stocks or real estate, bonds, mutual funds, different investments.",
    "videoId": "VfhmzqDHM4w",
    "context": "financial freedom account 10%",
    "artifact": "money-system"
  },
  {
    "id": "money-system-13",
    "text": "So put 10% into fun, into play. Getting that massage, buying some clothes ... And have that and spend it guilt free. There's no shame, you've earned that money, enjoy it. ... And then the last one is to give. 5%, okay. And you can modify these numbers if you like",
    "videoId": "VfhmzqDHM4w",
    "context": "fun 10% guilt-free, give 5%, numbers modifiable",
    "artifact": "money-system"
  },
  {
    "id": "money-system-14",
    "text": "I would do this every single week. Every single week. Every week when I first started doing this it would take me 15 to 20 minutes. I would just go through my bank statements, credit card statements, every purchase, I would identify which category, I throw it in that spreadsheet. Add it up, make sure I'm sticking to my budget",
    "videoId": "VfhmzqDHM4w",
    "context": "weekly money ritual — agenda: statements → categorize → spreadsheet → check budget",
    "artifact": "money-system"
  },
  {
    "id": "money-system-15",
    "text": "If you do it ever month you're gonna over spend. You're gonna pass your budget. ... when I tried doing it every month it'd take me like an hour, hour and a half. A lot more time, but if you do it every week it's fast. 15, 20 minutes and I actually enjoyed it 'cause I felt empowered",
    "videoId": "VfhmzqDHM4w",
    "context": "why weekly beats monthly",
    "artifact": "money-system"
  },
  {
    "id": "money-system-16",
    "text": "decide on a certain day every week, it could be Monday, it could be Sunday, where you're gonna go through your statements, you're gonna update your spreadsheets",
    "videoId": "VfhmzqDHM4w",
    "context": "fixed weekly money day",
    "artifact": "money-system"
  },
  {
    "id": "money-system-17",
    "text": "if it's high interest debt, the long term savings, after you've got up six months worth you put that additional 10% into one of these two categories. But from there I would start taking some of the financial freedom money to pay it off. I probably wouldn't take off the education ... I would probably take the 10 to 20% here to pay off that student loan debt",
    "videoId": "VfhmzqDHM4w",
    "context": "debt payoff protocol within jar system — raid savings+financial-freedom jars, never education",
    "artifact": "money-system"
  },
  {
    "id": "money-system-18",
    "text": "if you transfer a balance from one card to their card then they actually have, maybe for the first 12 months or the first 18 months they might actually have a 0% interest rate. And that's what I did when I was in credit card debt years ago",
    "videoId": "VfhmzqDHM4w",
    "context": "balance transfer tactic vs 19% credit card interest; also: use credit cards not cash, for tracking + credit rating",
    "artifact": "money-system"
  },
  {
    "id": "money-system-19",
    "text": "I follow this model up until a certain amount. It could be my first 100,000, 200,000, but anything excess over that, where do you think I put it? ... I put that excess money into my financial freedom account and my education ... These two here, guys, are the keys to financial abundance to becoming a multi-millionaire.",
    "videoId": "VfhmzqDHM4w",
    "context": "high-income modification: excess above ~$100-200k → FF + education",
    "artifact": "money-system"
  },
  {
    "id": "money-system-20",
    "text": "You'd wanna put 55% of whatever you make to necessities ... then you wanna put 10% to long-term savings ... ideally you wanna build it up to six months of whatever your expenses or income is ... Next, 10% you need to put aside for what is called financial freedom. 'Kay, a financial freedom account. ... Another 10% you've gotta put towards education ... another 10% you're gonna put towards fun ... And then the last 5% is to give",
    "videoId": "iMBikr7lKHI",
    "context": "full system restated in 'If You're Broke' — step 2 of his get-back-on-feet plan",
    "artifact": "money-system"
  },
  {
    "id": "money-system-21",
    "text": "the most important ones are savings, financial freedom, education. Those are the most important ones that you have to prioritize",
    "videoId": "iMBikr7lKHI",
    "context": "jar priority order when broke",
    "artifact": "money-system"
  },
  {
    "id": "money-system-22",
    "text": "It could just be givin' $1 to a homeless person on the street ... it's not necessarily the amount as it is the habit",
    "videoId": "iMBikr7lKHI",
    "context": "giving jar — habit trains abundance",
    "artifact": "money-system"
  },
  {
    "id": "money-system-23",
    "text": "55% of your income you should put towards your necessities. 10% you put towards your financial freedom. So investing, business to create more money for you basically. Another 10% towards long-term savings. Another 10% towards your education. Okay, so investing in yourself, courses, trainings, coaches. 10% for fun. ... the other last 5% would be to giving, contribution. And you can modify maybe you want to give 10% maybe more or less.",
    "videoId": "6VuTI0WlI1M",
    "context": "Panama vlog — cleanest single restatement of all six jars",
    "artifact": "money-system"
  },
  {
    "id": "money-system-24",
    "text": "what percent ten percent would be the minimum ten percent not less than that if you could do 15 percent 20 30 40 50 percent great for me I save 90 percent of the money that I make ... pay yourself first this is money you got to take you put it aside and you build your savings from that",
    "videoId": "deyPziYcJ5A",
    "context": "pay-yourself-first: 10% floor, he saves 90% now",
    "artifact": "money-system"
  },
  {
    "id": "money-system-25",
    "text": "you got to have at least three to six months savings of whatever your expenses or income is so if your expenses every month let's say or $2,000 let's say $5,000 a month well you'd want to have at least $15,000 to $30,000 saved in a bank account for emergency",
    "videoId": "deyPziYcJ5A",
    "context": "reserve sizing example",
    "artifact": "money-system"
  },
  {
    "id": "money-system-26",
    "text": "there's three things you've got to master ... number one you gotta learn how to earn it ... next is you have to learn how to keep it ... it's not what you make it's what you keep ... the third thing you have to master is how to grow it ... to invest it how to have that money work for you to hopefully create passive income",
    "videoId": "deyPziYcJ5A",
    "context": "earn/keep/grow framework (Win The Game Of Money)",
    "artifact": "money-system"
  },
  {
    "id": "money-system-27",
    "text": "you're gonna take a percentage of what you make, and I recommend 10% at minimum, take 10% and you're gonna put that aside and pay yourself first, you're gonna put it in a savings account, or an investment account, or some other account that you're not gonna touch",
    "videoId": "covxjhXsCi8",
    "context": "pay-yourself-first mechanics (Investing For Beginners)",
    "artifact": "money-system"
  },
  {
    "id": "money-system-28",
    "text": "The reason why they say pay yourself first is 'cause you're supposed to pay yourself that money before anything else, before you pay your bills, your rent, or anything else",
    "videoId": "covxjhXsCi8",
    "context": "pay before bills",
    "artifact": "money-system"
  },
  {
    "id": "money-system-29",
    "text": "you wanna have at least three months to six months of savings, which is typical of your expenses. So if your expenses every month is $2,000 a month ... you need to put aside at least $6,000 to $12,000 in savings as an emergency in case something happens to your job, in case a disability happens ... But three months at minimum",
    "videoId": "covxjhXsCi8",
    "context": "emergency reserve: 3-6 months of expenses, 3 absolute minimum",
    "artifact": "money-system"
  },
  {
    "id": "money-system-30",
    "text": "now because my business and my cash flow is really big, I'm able to pay myself like 80% of what I make",
    "videoId": "covxjhXsCi8",
    "context": "his savings rate at scale",
    "artifact": "money-system"
  },
  {
    "id": "money-system-31",
    "text": "I started with about, I think $500 was my first investment in a mutual fund. It was actually the Bank of Montreal mutual fund here in Canada. I started putting aside $25 a month on a pre-authorized payment plan",
    "videoId": "covxjhXsCi8",
    "context": "origin at 18 after The Wealthy Barber (David Chilton); doctrine: invest monthly = dollar cost averaging, DRIP dividends, TFSA $5,500/yr, Buffett's #1 investment = yourself, #2 = own business, then index funds",
    "artifact": "money-system"
  },
  {
    "id": "money-system-32",
    "text": "how I got out of fifteen thousand dollars worth of credit card debt which by the way credit card debt is the worst kind of debt to be in",
    "videoId": "DA_qgda-3L4",
    "context": "debt payoff video — the $15,000 story",
    "artifact": "money-system"
  },
  {
    "id": "money-system-33",
    "text": "every week for me it was on Tuesdays ... I log into my online banking and I created an Excel spreadsheet or a Google spreadsheet and I tracked everything",
    "videoId": "DA_qgda-3L4",
    "context": "his personal weekly money day was Tuesday",
    "artifact": "money-system"
  },
  {
    "id": "money-system-34",
    "text": "I looked at every single expense that I had in my spreadsheet and I asked myself the question how can I either reduce this or eliminate this expense altogether",
    "videoId": "DA_qgda-3L4",
    "context": "debt protocol step 3: reduce-or-eliminate audit of every line item (sold car for $1,500, couch-surfed for ~$500/mo, sold TV)",
    "artifact": "money-system"
  },
  {
    "id": "money-system-35",
    "text": "if I'm only focused on defense and I don't have any offense then I'm not really gonna get ahead ... my offense was finding ways to make more money",
    "videoId": "DA_qgda-3L4",
    "context": "debt protocol step 4: defense (budget/eliminate) + offense (second job, freelance, build business); step 1 was balance transfer, chained card-to-card: 'transfer that balance to the next one to the next one'",
    "artifact": "money-system"
  },
  {
    "id": "money-system-36",
    "text": "you got to know what your net worth is okay that's the score card that's the number that matters most it's not how money you make is how much you keep",
    "videoId": "2V06cH1z3Qo",
    "context": "net worth = the scorecard (10 Steps For Creating Wealth, step 3)",
    "artifact": "money-system"
  },
  {
    "id": "money-system-37",
    "text": "this is a habit that you do every three months every quarter is what you do is you have a spreadsheet on your computer and you track what are your assets and what are your liabilities what is your net worth ... by every quarter tracking this you want to make sure your net worth is going up",
    "videoId": "2V06cH1z3Qo",
    "context": "quarterly net-worth tracking ritual; assets minus liabilities (example: $5k cash, $40k student debt = -$35k)",
    "artifact": "money-system"
  },
  {
    "id": "money-system-38",
    "text": "the key to creating wealth you might want to write this down this is the formula is to spend less than you earn and invest the difference and then reinvest those profits to create even more wealth",
    "videoId": "2V06cH1z3Qo",
    "context": "core wealth formula (step 4: master money management)",
    "artifact": "money-system"
  },
  {
    "id": "money-system-39",
    "text": "you want to make sure you have three to six months and savings on whatever your monthly expenses are so if your expenses are two grand a month you want to have at least six thousand dollars saved ... the position you never want to be in is you have your investments you have no savings and you got to sell your investments for an emergency",
    "videoId": "2V06cH1z3Qo",
    "context": "reserve before investing; also weekly tracking: 'every week i could set a budget for myself and if i'm overspending in one area i can catch myself'",
    "artifact": "money-system"
  },
  {
    "id": "money-system-40",
    "text": "I measure my net worth every 3 months I might manage my finances all my income and expenses every week",
    "videoId": "8kco2rjijjE",
    "context": "Life Plan video — canonical cadence; plus doctrine: 'if you only measure once a year then you're going to have a bad year if you do it once a month and the worst you'll have a bad month once a week you'll have a bad week'",
    "artifact": "money-system"
  },
  {
    "id": "money-system-41",
    "text": "I still regularly, every single week, I check my credit cards, my bank statements. I check every single month going through the profit loss. And I know the numbers ... Every single day I'm logging into my trading accounts just to look to see how the market's doing.",
    "videoId": "NidJpDcCkQs",
    "context": "Success Rituals — money ritual stack today: weekly statements, monthly P&L (QuickBooks + bookkeeper), daily market check",
    "artifact": "money-system"
  },
  {
    "id": "money-system-42",
    "text": "I went to this seminar called the Miller of Mind Intensive. They gave me a 90-day wealth conditioning program where every day for 90 days, I was conditioning my beliefs, my mindset around money",
    "videoId": "NidJpDcCkQs",
    "context": "Millionaire Mind Intensive (Eker) 90-day wealth conditioning ritual (ASR mangles name); same passage: 'I used to allocate okay 10% I'm going to put aside for investing in my ... future my business ... I'm going to put aside 10% to improve myself'",
    "artifact": "money-system"
  },
  {
    "id": "money-system-43",
    "text": "one of the most basic investing principles out there is to pay yourself first ... your bills everything can wait you put that money aside",
    "videoId": "aK1Q4rJf3u0",
    "context": "index fund video; compounding table at 9-10% on $100/wk: 5yr '31 121', 10yr '79 000', 15yr '152 677', 20yr '266 033', 30yr '708 799', millionaire at 35 years",
    "artifact": "money-system"
  },
  {
    "id": "money-system-44",
    "text": "ideally at least 10% probably even 15% or more to be honest with you if you really want to get ahead financially so I would find a way to sacrifice where I can save 10 15 20 percent of whatever my income is ... I'd build a reserve I'd build an emergency fund that would be the equivalent of three to six months of my income or expenses",
    "videoId": "rrBohkoZIBM",
    "context": "What I'd Do If I Was Broke — save-rate ladder + reserve ($9k-$18k on $3k/mo)",
    "artifact": "money-system"
  },
  {
    "id": "money-system-45",
    "text": "that's always the first thing you got to do before you consider investing you ideally want to have three to six months of whatever your monthly expenses are saved put aside put that into a savings account you do not touch that unless you lose your job",
    "videoId": "JeeXEnRyoUc",
    "context": "emergency fund is prerequisite gate before any investing",
    "artifact": "money-system"
  },
  {
    "id": "money-system-46",
    "text": "I don't touch my savings I don't touch my emergency fund I have another bucket of money that I put aside for opportunities like that and that's what I'm investing right now",
    "videoId": "vuFKYvd974o",
    "context": "separate opportunity bucket beyond emergency fund (deployed $1M cash in March 2020 crash per 2V06cH1z3Qo)",
    "artifact": "money-system"
  },
  {
    "id": "money-system-47",
    "text": "you've got to make sure you have an emergency fund usually that's at least three to six months of whatever your income or expenses might be ... if there might be a recession and depending on your risk threshold you might want to have more money saved",
    "videoId": "qq3mmK0jKaE",
    "context": "reserve extended above 6 months in recession conditions",
    "artifact": "money-system"
  },
  {
    "id": "money-system-48",
    "text": "the way you become financially free is when your passive income exceeds your expenses. So, if your expenses ... let's say it's $5,000 a month ... When this exceeds $5,000 a month or more, that's when you're free.",
    "videoId": "wvNtE4pMUpA",
    "context": "financial freedom definition (Kiyosaki cashflow quadrant video)",
    "artifact": "money-system"
  },
  {
    "id": "money-system-49",
    "text": "you just take a certain percentage of what you make you put it aside you pay yourself first you know 10% of what you make and you just put it into at that time like a mutual fund ... I did this even when I got into credit card debt",
    "videoId": "IUAIkR6Fqfc",
    "context": "How We Invest Our Money — never broke the pay-yourself-first habit even in debt; 'Stefan and I combined our dividends combined monthly is enough money ... to pay for our lifestyle ... we always reinvest all that money we have it on a drip'",
    "artifact": "money-system"
  },
  {
    "id": "money-system-50",
    "text": "the amount of money that I lent him was about 130 000 ... he was able to pay back I think like 40 000",
    "videoId": "5brfz139uiU",
    "context": "5 Money Mistakes — private lending loss; doctrine: 'the better approach oftentimes is just trying to get rich slow'; balance transfer gave 'zero percent interest for 12 months'",
    "artifact": "money-system"
  },
  {
    "id": "money-system-51",
    "text": "you pay yourself first you take 10% of what you make you put it aside and you invest it that if you just continue that when you're young for the next 20 30 40 years 50 years you will become a millionaire",
    "videoId": "lBDhvRYk-OA",
    "context": "stock advice video — cites The Automatic Millionaire (David Bach); reserve: 'at least three to six months savings put aside of your monthly expenses'",
    "artifact": "money-system"
  },
  {
    "id": "money-system-52",
    "text": "teaching the principles of paying yourself first ten percent of what you make, you've got to pay yourself first ... I read it when I was eighteen and it really impacted my life",
    "videoId": "CQ8m5o_QH-g",
    "context": "25 Books — The Wealthy Barber as the pay-yourself-first source",
    "artifact": "money-system"
  },
  {
    "id": "money-system-53",
    "text": "at least three to six months of whatever your expenses would be or even your income put that aside into a bank account okay that's money that you don't touch that's money for an emergency a rainy day or for an incredible opportunity",
    "videoId": "NO-8aUrkVSo",
    "context": "Invest In Your 20s — cushion first; invest priority order: yourself → career/business → stocks/real estate; goal: 'build a ten million dollar plus investment portfolio' for dividend income",
    "artifact": "money-system"
  },
  {
    "id": "money-system-54",
    "text": "I'm going to manage my money smart. I'm going to have a certain percentage of my money that I save, a certain percentage of my money that I invest, a certain percentage of money that I put towards my own education, my own self-growth, a certain percent to fun and enjoying and whatever it is, totally guilt-free, a certain percent as well to contribute and give.",
    "videoId": "fJnDFHh09xE",
    "context": "Money Beliefs — percentage-allocation as the antidote to guilt/scarcity conditioning",
    "artifact": "money-system"
  },
  {
    "id": "question-sets-0",
    "text": "number four empowering questions now whatever you focus on you feel ... what controls your focus are questions",
    "videoId": "PliFBr__T7Y",
    "context": "morning empowering questions — framing, intro to the set",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-1",
    "text": "number one what am I happy about in my life right now ... what am I happy about if my brain comes up with nothing I push myself and I say okay well what could I be happy about or if I was happy what would that be",
    "videoId": "PliFBr__T7Y",
    "context": "morning set Q1 (happy) + the 'what could I be happy about / if I was happy what would that be' fallback",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-2",
    "text": "and then I I'll kind of follow up the question you know I'll either ask hey what about that makes me happy or how does that make me feel how does that really make me feel and I take a moment to feel it",
    "videoId": "PliFBr__T7Y",
    "context": "morning set — the follow-up probe attached to every question",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-3",
    "text": "what am I excited about in my life right now what am I excited about",
    "videoId": "PliFBr__T7Y",
    "context": "morning set Q2 (excited)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-4",
    "text": "all right next what am I proud of in my life",
    "videoId": "PliFBr__T7Y",
    "context": "morning set Q3 (proud)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-5",
    "text": "okay what what am I grateful for in my life",
    "videoId": "PliFBr__T7Y",
    "context": "morning set Q4 (grateful)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-6",
    "text": "what am I passionate about in my life what am I passionate about",
    "videoId": "PliFBr__T7Y",
    "context": "morning set Q5 (passionate) — NOT in the caller's 8-question target list",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-7",
    "text": "um what am I enjoying most right now in my life",
    "videoId": "PliFBr__T7Y",
    "context": "morning set Q6 (enjoying most)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-8",
    "text": "what am I uh what am I committed to in my life what am I committed to",
    "videoId": "PliFBr__T7Y",
    "context": "morning set Q7 (committed)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-9",
    "text": "usually I just spend about five minutes a day doing this last question who do I love who do I love ... who loves me my Creator loves me God my mom my dad my family my dog",
    "videoId": "PliFBr__T7Y",
    "context": "morning set Q8 (who do I love / who loves me) — explicitly called 'last question'; ~5 min total for the set",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-10",
    "text": "you're literally through this process feeling happy feeling excited feeling proud grateful passionate uh you know just enjoying you know whatever moments of your life feeling committed feeling loved",
    "videoId": "PliFBr__T7Y",
    "context": "morning set — his own recap of the full emotion sequence, confirms order happy→excited→proud→grateful→passionate→enjoying→committed→loved",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-11",
    "text": "my empowering questions and this is also from Tony Robbins and what he says is that what you focus on you feel and what controls your focus are questions",
    "videoId": "OgRGJBpTOeU",
    "context": "morning set v2 — attribution to Tony Robbins",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-12",
    "text": "one of the questions I ask myself is just what am I happy about in my life what am I happy about in my life right now ... and I ask myself and how does that make me feel and um you know or what about that makes me happy",
    "videoId": "OgRGJBpTOeU",
    "context": "morning set v2 Q1 (happy) + follow-up phrasing",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-13",
    "text": "if your brain says there's nothing to be happy about you can always ask yourself what could I be happy about and if you look hard enough you can always find it",
    "videoId": "OgRGJBpTOeU",
    "context": "fallback question, second attestation",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-14",
    "text": "another question I ask is what am I grateful for what am I grateful for",
    "videoId": "OgRGJBpTOeU",
    "context": "morning set v2 Q2 (grateful)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-15",
    "text": "I ask myself also what am I proud of in my life what am I really proud of",
    "videoId": "OgRGJBpTOeU",
    "context": "morning set v2 Q3 (proud)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-16",
    "text": "another question is what am I excited about in my life",
    "videoId": "OgRGJBpTOeU",
    "context": "morning set v2 Q4 (excited)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-17",
    "text": "I think about what am I passionate about",
    "videoId": "OgRGJBpTOeU",
    "context": "morning set v2 Q5 (passionate)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-18",
    "text": "I also think about uh what am I committed to in my life",
    "videoId": "OgRGJBpTOeU",
    "context": "morning set v2 Q6 (committed)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-19",
    "text": "I also think who do I love and who loves me I love God I love myself I love my family my friends",
    "videoId": "OgRGJBpTOeU",
    "context": "morning set v2 Q7 (love) — note: NO 'enjoying most' question in this version",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-20",
    "text": "what am I grateful for in my life ... what am I happy about my life you know what something I'm really happy about",
    "videoId": "PPlaK8y4PzA",
    "context": "morning set v3 (millionaire ritual, done on rebounder) — grateful then happy",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-21",
    "text": "if you want more passion in your life ask yourself what am I passionate about what can I be passionate about ... if you want confidence what am I confident about how can I be more confident today uh if you want more inner peace what am what you know what peace do I have in my life what can I feel peaceful about how can I feel peace right now in this moment who do I love in my life who can I give to you how can I contribute these are all questions I ask every single day part of the day depending on what I need how can I grow today how can I get the most out of today",
    "videoId": "PPlaK8y4PzA",
    "context": "morning set v3 — modular emotion-on-demand questions (passion, confidence, peace, love/give/contribute, grow); reframes the set as one-question-per-desired-emotion",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-22",
    "text": "my new primary question i ask this every day is how can i appreciate and enjoy my life even more while feeling even more fully alive and growing and making a difference ... my old one used to be how can i become better",
    "videoId": "PPlaK8y4PzA",
    "context": "primary question (asked all day, distinct from morning set); old vs new versions with the 'not enough' presupposition critique",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-23",
    "text": "questions are the directing force of focus ... what we focus on is our experience of life our focus equals our reality",
    "videoId": "PPlaK8y4PzA",
    "context": "incantation cards he reads aloud — meta-belief about questions",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-24",
    "text": "you put in three things you're grateful for what would make today great you put in three things for that you put in the daily affirmation that you have and then also has an evening portion as well where you ask yourself three amazing things that happen today you journal that and how could i made today better",
    "videoId": "PPlaK8y4PzA",
    "context": "Five Minute Journal — morning (3 gratitudes, what would make today great, affirmation) + EVENING set (3 amazing things that happened today, how could I have made today better); identical passage also in DH-ljbSald8",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-25",
    "text": "you put in 3 things that you're grateful for what would make today great ... three amazing things that happened today you journal that and how could I mean today better",
    "videoId": "DH-ljbSald8",
    "context": "Five Minute Journal morning+evening sets, second attestation",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-26",
    "text": "email me in the morning three things you're grateful for and then before you go to bed email me three awesome things that happened throughout your day three things you did well and make them small",
    "videoId": "ruU9mgQB2dM",
    "context": "evening set variant he prescribed to coaching clients (3 awesome things + 3 things done well); plus his own '10 things I'm grateful for' morning journal earlier in same file",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-27",
    "text": "i take out a journal and i write down 10 things i'm grateful for and i always try to make it a little bit different",
    "videoId": "ruU9mgQB2dM",
    "context": "morning gratitude journaling prompt (10 items)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-28",
    "text": "I always ask myself why is this important why is this important ... another question I'll ask myself is why do I care about this person ... another question I might ask is how can I enjoy this how can I have fun while doing this process the question might be how can I be at my best right now how can I be in the best Peak optimal State how can I have more fun right now how can I be in a state of certainty",
    "videoId": "JZO1--Awz7k",
    "context": "daily/pre-moment ritual question set (before videos, coaching calls, work): why is this important / why do I care / how can I enjoy this / how can I be at my best; recap later adds 'why is this a must for me' and 'what difference is this going to make'",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-29",
    "text": "ask yourself those questions why is this important why do I need to do this why is this a must for me why do I care what difference is this going to make",
    "videoId": "JZO1--Awz7k",
    "context": "pre-moment set — closing recap listing",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-30",
    "text": "how can I learn from this what's great about this how can I use this how can I turn this around how can I use this experience to grow",
    "videoId": "l1sHA7GaUbM",
    "context": "problem/adversity set — difficult-times video",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-31",
    "text": "what was good about this okay what was good about this or what was great ... ask yourself what can I learn from this okay what can I learn from this okay extract the lessons from it ask herself what could I done differently or what could I done better if I were to do this all over again what would I do differently or better how can I utilize this or how can I use this to my advantage how can this liability become an asset how can this failure this is disappointment become a gift in my life and how can I change my perception of it",
    "videoId": "z6xt0z_Iges",
    "context": "failure-processing set (most complete problem set): what was good/great → what can I learn → what would I do differently/better → how can I utilize this / liability→asset / failure→gift",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-32",
    "text": "the way that I always make every event in my life a positive event a positive meaning as I ask myself this question how can I utilize this how can I use this it's the power of utilization how can I use this in my life how can I use this to my advantage how can I use this to make me stronger how can I use this to make me grow how can I use this so I can help other people how can I use this to be a better father how can I use this to be a better leader in this world",
    "videoId": "FpPbz23YV9c",
    "context": "utilization question, fullest expansion",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-33",
    "text": "oh great this is an amazing test this is an opportunity for me to grow what can I learn from this how can I use this I'm so grateful for this experience",
    "videoId": "6i2VJCLPdls",
    "context": "problem set applied to rejection/failure reframe (complaint-free challenge)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-34",
    "text": "I always ask myself questions like what's great about this what can I learn from this how can I use this ... or what else could this mean what's an empowering meaning from this",
    "videoId": "Bvz6k3UsS_c",
    "context": "adversity set + 'what else could this mean' (NLP reframing)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-35",
    "text": "I might ask myself is it true is it possible that I misinterpreted this is it possible that they didn't really mean that is it possible that maybe they're going through a hard time is it possible that I don't have all the information about this situation ... what's great about this? What can I learn from this? How can I benefit from this? You know, how can this enhance my life?",
    "videoId": "vNq9aIh-mXA",
    "context": "mind/emotions-mastery set: 'is it true / is it possible I misinterpreted' + what's-great trio",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-36",
    "text": "one of my favorite questions that I asked myself is what else could this mean what else could this mean or what's great about this",
    "videoId": "lzy64MccvoQ",
    "context": "emotional-pain video — 'what else could this mean' as favorite question",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-37",
    "text": "oftentimes it's just asking the question What's the good in this you know what's what's the good In This What's great about this or how you know is it possible that I might have um misinterpreted this in some way",
    "videoId": "5ecLYP3FE6g",
    "context": "NLP reframing lesson — same problem set",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-38",
    "text": "I started to ask myself okay what's what's great about this you know what's great about this and looking for the good in this situation ... I also ask myself will this even matter like a year from now will it even matter five years from now 10 years from now",
    "videoId": "-lH7vrLl0pY",
    "context": "problem set live use (lost laptop story) + 'will this matter in a year/5/10 years' perspective question",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-39",
    "text": "what's great about this what can I learn from this what's beautiful about this moment what am i happy about right now in my life what am i excited for",
    "videoId": "I3RzLalRjkM",
    "context": "blended daily-focus questions incl. 'what's beautiful about this moment'",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-40",
    "text": "i ask questions like what am i grateful for what do I love what can I appreciate about my life or who do I love and who loves me what can I give today what am i committed to what is my passion what is my purpose",
    "videoId": "oZmL1lzrPYE",
    "context": "bad-day video — compressed morning set incl. 'what can I give today' (closest corpus hit to a give-question)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-41",
    "text": "I ask myself questions like what am i happy about in my life you know what am i happy about and by asking the question it forces my mind to come up with an answer",
    "videoId": "FiWus84T7BY",
    "context": "happiness video — happy question + forcing-function rationale",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-42",
    "text": "ask yourself the question what is something I'm really grateful for right now in this moment ... you can ask what's a happy moment what's something I'm happy about what am I proud of what do I love who do I care about in my life ... I ask myself what's the truth what's the truth of my life what's the truth of this situation what's the truth of this moment What's the truth of who and what I am",
    "videoId": "mfjVql-G9pY",
    "context": "HeartMath 2-min meditation set: gratitude question in the heart + swap-in emotion questions + 'what's the truth' closer",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-43",
    "text": "just by asking yourself the question what am i grateful for in relationship what am i grateful for or what can I appreciate about my partner",
    "videoId": "hUIKpeGLQCs",
    "context": "relationship-domain gratitude question (daily, about partner)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-44",
    "text": "having questions that I'd ask myself about what am I grateful for what am I happy about what am I excited about what am I proud of in my life you know what am I looking forward to",
    "videoId": "faNF843NNrQ",
    "context": "interview retelling of the written morning-question sheet; adds 'what am I looking forward to'",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-45",
    "text": "I think about what I'm grateful for ... what I'm happy about what I'm excited for in my life my next vision of where I want to go ... and really who I love and who loves me and what I'm proud of in my life",
    "videoId": "9RxHchflvVs",
    "context": "perfect-day design — morning questions embedded in the visualized ideal morning",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-46",
    "text": "what time would you wake up in the morning ... if you could wake up at any time what time would that be for you ... where would you live in the world if you can live anywhere that you want where would that be",
    "videoId": "9RxHchflvVs",
    "context": "area-sweep: perfect-day design prompt sequence (hour-by-hour, morning to night, journal it)",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-47",
    "text": "that first question is what was all the good that happened ... the next one is what were the okay what were the challenges of this last year the last week this last month this last quarter ... and what did you learn from them ... what are the solutions what can you do better ... the third one is what did you learn this last year what were the most valuable lessons insights learnings",
    "videoId": "JZnLIuW7NQw",
    "context": "year/week review set: 1 what was all the good, 2 what were the challenges (+what did you learn from them, what are the solutions), 3 what did you learn; he notes 'you can do this every week — what did I learn this last week'",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-48",
    "text": "you'd want to ask yourself what are the most important areas of my life that i want to focus on in this upcoming year ... if you had to pick one or two or three ... what is that area of my life by conquering it or taking that to the next level it's actually going to simultaneously benefit all the other areas of my life too ... what's the biggest difference that i want to make in my life this upcoming year and also what is most important to me right now at this stage of my life",
    "videoId": "JZnLIuW7NQw",
    "context": "area-sweep / goal-setting prompts: pick 1-3 focus areas, keystone-area question, biggest-difference question",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-49",
    "text": "just asking yourself what is my ultimate purpose for achieving this Vision okay why do I want this what will this give me ... ask yourself Who Am I who who would I want to be um who am I committed to being if I were to look my name up in the dictionary what would it say about me ... ask yourself what actions do I need to take to achieve this goal",
    "videoId": "8kco2rjijjE",
    "context": "life-plan set: vision→purpose (why do I want this / what will this give me) → identity (who am I / who am I committed to being / dictionary question) → action plan; weekly outcomes per life area follow",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-50",
    "text": "I deliberately write out what is my outcome? Why do I want this? ... And then I write down what do I need to do? What are the actions that I need to take to make sure that I can achieve this outcome today ... what's the most important thing out of this list. What's the highest leverage thing",
    "videoId": "0UTb0mnuJRE",
    "context": "RPM daily planning question trio (outcome / purpose / massive action) + highest-leverage question",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-51",
    "text": "he would ask himself what good shall I do this day ... asking yourself empowering questions visualizing the day asking yourself What's My outcome what do I want to create today what good shall I do",
    "videoId": "Xb02qGHngb0",
    "context": "morning-rituals-of-the-successful video: Benjamin Franklin's question endorsed + his own outcome questions",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-52",
    "text": "every hour I'm thinking about what I'm grateful for what I'm happy about my life what I need to get done you know what's my outcome",
    "videoId": "OcYECokZIeM",
    "context": "evolution: no fixed morning/evening ritual anymore — the questions run all day, every hour",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-53",
    "text": "so I do that and then what I do is I do my morning questions so what am I most grateful for in my life today who do I love who loves me what do I appreciate value",
    "videoId": "I1MhBE-0zxU",
    "context": "GUEST Darren Jacklin's morning questions (not Stefan) — included for completeness; only corpus occurrence of the literal phrase 'morning questions'",
    "artifact": "question-sets"
  },
  {
    "id": "question-sets-54",
    "text": "we ask empowering questions to one another we check things off our bucket lists together",
    "videoId": "lT-EQtteqiE",
    "context": "monthly relationship ritual with Tatiana — empowering questions used as couple practice (specific questions not stated)",
    "artifact": "question-sets"
  },
  {
    "id": "relationship-journal-0",
    "text": "I'll share one ritual that I have every two weeks with my girlfriend is we do what is called a relationship journal where every two weeks we do a we do a relationship check-in. And we have a journal which basically has our vision for a relationship and it has goals that we have for a relationship as well. And we review that. We get focused. Okay, this is what we're after. This is what we want to create. We remind ourselves of that and we every two weeks we go over each other's needs. Human beings, they have six human needs. And the needs are certainty, variety, significance, connection, and love, growth, and contribution. And this is something that I learned from Tony Robbins when it comes to relationships. And we do a a check-in where every two weeks we ask ourselves, okay, on a scale from 0 to 10, where are you in the experience of love? You know, how love how how loved do you feel? How significant do you feel to me? How much certainty do you feel in this relationship? How much variety and excitement, surprise, passion do you feel on a scale from 0 to 10? How much do you feel that we're growing? How much do you feel that we're contributing to one another? And by doing that and regularly having that communication, if a need isn't being met, you can immediately get yourself to fulfill that person's need. But why do a lot of relationships fail is because they don't communicate... kill the monster while it was little.",
    "videoId": "NidJpDcCkQs",
    "context": "Success Rituals — canonical bi-weekly relationship journal: vision + goals + six needs each scored 0-10",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-1",
    "text": "Scott shared with me a ritual that he had with his wife and he said every night before we go to bed we have a little post-it note and we write one magic moment that we had with that person that day and what we do is we each write it out before we go to bed and then we share that with each other and then we put that in a jar... every once in a while they just take out randomly and just reminisce and remember all those incredible moments that they've created together.",
    "videoId": "NidJpDcCkQs",
    "context": "Magic-moment post-it jar ritual; nightly, shared before bed",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-2",
    "text": "if you can identify we, you know, you have top two, you know, each person does, and if you can make sure you do a check-in every week, every two weeks, hey, you know, where do you feel is your love language being met? Because if someone has a different love language than you, then you got to be proactive in making sure that you give that to the other person, right? And always remember that a relationship is a place you go to give, not to get.",
    "videoId": "NidJpDcCkQs",
    "context": "Love-language check inside the check-in; five languages: acts of service, quality time, words of affirmation, physical touch, gifts",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-3",
    "text": "I'll easily create more passion and love in my relationship with Tatiana by doing our bi-weekly relationship Journal by December 31st 2016... every two weeks we do a relationship check-in... the process is basically we check in with each other on our vision for a relationship... we got goals we got goals to travel goals to learn things... part of our bi-weekly check-in is we check in on each other's needs... you check in and you ask yourself on a scale from 0 to 10 how much certainty do you feel in this relationship how much variety excitement surprise how much significance how important unique do you feel to your partner how much love and connection is there on a scale from 0 to 10 and how much growth and how much contribution... when you meet someone's needs you're going to have a love slave",
    "videoId": "GXhPOncX8CA",
    "context": "Goal Setting Workshop: journal as SMART goal; full check-in structure vision→goals→six needs 0-10",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-4",
    "text": "we do a process where we check in on the five love languages... we also go through these relationship questions we ask ourself you know we ask we asked each other uh what are you grateful for in your partner what are you grateful for in relationship how can you give more to your partner you know what's a magic moment that you never want to forget... we also capture and record magic moments we think about okay what are you know what were the moments that we had over the last two weeks and we we actually write them down in journal and we have relationship books",
    "videoId": "GXhPOncX8CA",
    "context": "Love-language check, appreciation questions, magic-moment question as explicit journal parts",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-5",
    "text": "we have a relationship ritual that we do every week or so where we check in on a relationship just like you check in on the progress you're making in your physical body or your finances your business we measure things in a relationship as well because you can't manage something if you don't measure it",
    "videoId": "xVfwDgP2EGM",
    "context": "Measurement doctrine for the weekly check-in",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-6",
    "text": "we'll check in with each other and say on a scale from one to ten how much certainty do you feel in a relationship right now and tatiana was shared and maybe let's say it's at a seven well if that's the case then i can say okay tatiana how can i get that to a ten how can we feel more certainty in the relationship",
    "videoId": "xVfwDgP2EGM",
    "context": "Scoring follow-up: 'how can I get that to a ten'",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-7",
    "text": "this is actually a notebook from like 2016 that i made... we do this check-in we actually started this when we first started dating like literally in the first few dates... we started doing this back in 2014 and we would do this once a week and again schedule this in if you just say we're going to do it once a week it's not going to happen trust me... you've got to put it in your calendar and say okay friday's at 5 p.m we're going to sit down we're going to give each other the time to do this phones are off no distractions",
    "videoId": "xVfwDgP2EGM",
    "context": "Cadence + scheduling: weekly, calendared Friday 5pm, phones off, since 2014, physical notebook",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-8",
    "text": "when you check in every week like this for us it never really goes below a seven because if it does go to a seven or below that we're really quick to get on top of that to do something that can allow our relationship to grow but if you don't do this and time goes on then that seven drops to a six and a five and a four... this ensures that you're there's always like a baseline in the relationship",
    "videoId": "xVfwDgP2EGM",
    "context": "7-as-floor baseline rule: 7 or below triggers immediate action",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-9",
    "text": "we ask each other what can you do better to meet your partner's needs so we answer that and we write that down we take notes and it's good because we can look back on previous um sessions and then we ask each other the five love languages",
    "videoId": "xVfwDgP2EGM",
    "context": "'what can you do better to meet your partner's needs' — written, sessions reviewed",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-10",
    "text": "we always ask each other how can you how can your partner better meet your love language so and then we also do these relationship questions and we don't do this every time it depends on how much time we want to dedicate to this process but we'll ask things like what's great about our relationship what do you love about it what do you appreciate about your partner... what do you love about your partner how can you give more to your partner why is it important to give how can you create more love in your relationship how can you create more passion in your relationship those are two different things um and so we go on and on and then we also share our magic moments so it's a time to reflect on the week the things that we did together that were fun and we can just write them down and journal about them and kind of relive them",
    "videoId": "xVfwDgP2EGM",
    "context": "Optional relationship-questions block verbatim + weekly magic-moments sharing",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-11",
    "text": "my girlfriend I we have a relationship Journal has her vision in it we're always moving towards you know we have certain questions we ask herself we do this every month or every two weeks you know we sit down we ask herself what do you love about your partner what do you cherish about them what do you appreciate about this person in your life how can you give more to this person in your life and we actually go through this process and it creates a stronger bond",
    "videoId": "7F6AJgL6yvw",
    "context": "Journal questions incl. cherish/appreciate; cadence 'every month or every two weeks'",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-12",
    "text": "tony robbins has a great process called the six human needs we all have six needs one for certainty uncertainty significance connection and love growth and contribution so we sit down we say okay on a scale from zero to ten how certain do you feel in this relationship... okay if it's a low then what can I do to create more certainty how much variety spontaneity fun adventure do you feel okay what can I do to bring that to a ten how significant do you feel in this relationship how important or unique okay what can I do to bring that up how much connection and love do you feel how much do you feel that we're growing together how much do you feel that I'm giving to you or were contributing to each other... when you meet the person's needs at a high level you'll have a love slave",
    "videoId": "7F6AJgL6yvw",
    "context": "Six-needs 0-10 scoring script with per-need 'bring that to a ten' follow-up",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-13",
    "text": "we do a check-in or like okay you know how am i meeting your love language is there anything that I can do to further make you feel loved",
    "videoId": "7F6AJgL6yvw",
    "context": "Love-language check-in question verbatim (Chapman's five languages)",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-14",
    "text": "just writing down a real vision for your relationship and then goals maybe for that year of things that you want to do... we have a journal relationship journal or we have this written down and every month or so we go through this and we reflect on our vision and we just remind ourselves what we want to create long-term this vision is 10 years 20 years even 30 years... whenever we plan out the year we make sure that our goals are in alignment so you know travel goals contribution goals self development health goals",
    "videoId": "sMLeWQvtzcg",
    "context": "Journal contents: 10/20/30-year vision + yearly aligned goals, reviewed ~monthly",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-15",
    "text": "we mentioned our relationship Journal this is this is how we create that space so maybe throughout the week you're not really feeling in that safe space to openly communicate about something that's really heavy on your heart but if you're dedicating one hour per week and you have it in your calendar both you and your partner or maybe it's once per month and in that moment in that timeframe you're able to then have an open discussion... there's no judgment there's no criticism and what we also do is something that might help you is dyads... one person speaking and the other person does not respond",
    "videoId": "sMLeWQvtzcg",
    "context": "Session container: judgment-free, 1hr/week or monthly, calendared; dyads technique",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-16",
    "text": "there's a relationship ritual that we do every single month I've shared it with you guys before every month we check in on our six human needs we make sure that we're meeting each other's love languages we ask empowering questions to one another we check things off our bucket lists together we focus on the vision that we have for creating the relationship that we want so on track with that... I'll easily plan a romantic experience with Tatiana at least once a month to create magical moments together",
    "videoId": "lT-EQtteqiE",
    "context": "Feb 2018 report — monthly ritual components + monthly romantic-experience goal",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-17",
    "text": "I do every month to basically ensure that we have a great relationship we check in on the vision that we have for a relationship our goals we have a bucket list for a relationship we check in on our six human needs we check in on or five love languages we ask each other questions like how can we grow this relationship how can we give more to one another you know what are you grateful for in the relationship... our relationships never been in a bad point because of this because if if someone's the needs drop a little bit we can quickly address it",
    "videoId": "vPEblSGsDhE",
    "context": "Jan 2018 report — full monthly check-in list + early-warning function",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-18",
    "text": "I'll easily update our relationship journal with Tatiana at least once a month to further enhance and grow our relationship and we are consistent with that",
    "videoId": "jCemE9klMVM",
    "context": "Journal as recurring written annual goal; same phrasing in TVdT3ymNN_I, E4Pxl3rx_s0, F0ToFPMcIqI, xlpu_UowW1U, jZO8pey7TKE",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-19",
    "text": "I wasn't as consistent as I like with some hobbies, you know, like yoga, Muay Thai, kickboxing, uh, my relationship journal, my girlfriend. These are things that I wanted wanted to do and stick with every week.",
    "videoId": "zuEb-1Ll2h8",
    "context": "2016 YIR — intended cadence weekly; travel breaks routine",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-20",
    "text": "one of the things that we did is we had this relationship journal that we started and we in the first page of that let's create a vision for this relationship something that be exciting for us to step into what kind of power coupled you know can we create... and then we even set goals we set goals for our relationship that we've actually achieved a lot of them and what do you achieve them you've got to set some new ones... when you write down your vision when you write down your goals... you now get clarity",
    "videoId": "2uwBvaq4cQY",
    "context": "Journal page 1 = relationship vision, then goals, treated like business goals",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-21",
    "text": "you got to step outside yourself and actually find out is this person what do they need right now do they need love do they need a sense of feeling important and significant do they need to feel secure in certainty do they need a sense of aliveness and excitement and variety do they need to feel growth or a contribution and when you can really be a detective... what are the needs that that I'm not meeting and your take that as you're responsible for that",
    "videoId": "2uwBvaq4cQY",
    "context": "Needs-detective framing: diagnose unmet needs; you are responsible",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-22",
    "text": "the first most important daily habit you can have is the daily habit of gratitude and appreciation for your partner... the law of familiarity kicks in and it states that anything that you're around too often you can start to take a little bit for granted... every single morning I've got a morning ritual that I I do of gratitude and I'll think about Tatiana I think what am i grateful for what do I appreciate about or not thinking I'm so grateful for her love I'm so grateful for your beauty... just by asking yourself the question what am i grateful for in relationship what am i grateful for or what can I appreciate about my partner",
    "videoId": "hUIKpeGLQCs",
    "context": "Daily appreciation prompt vs law of familiarity",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-23",
    "text": "at the end of every day take out like a post-it note and have each of you write down what was the magic moment that you guys had or a moment throughout the day that you never want to forget and each of you write it on that that note and you put it in a jar and you share it you know each night before you go to bed... and then eventually you go back you open the jar you go through and you remember and reminisce",
    "videoId": "hUIKpeGLQCs",
    "context": "Magic-moment jar as prescribed DAILY couple habit",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-24",
    "text": "at the very beginning of a relationship we created a relationship bucket list and we made a list of me brainstormed we had this relationship journal which we still have where we made a list of all the things we want to do together you know travel to this place or go to this restaurant... whenever we'd hang out just to check something off that list... we never really felt bored because we always had new things",
    "videoId": "hUIKpeGLQCs",
    "context": "Relationship bucket list lives inside the journal — feeds variety",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-25",
    "text": "maybe if you're in a relationship maybe it's setting a ritual of date night every friday you know planning a romantic date for you and your partner... one thing that tatiana and i do we have a jar and we write on post-it notes one thing one magic moment that we share together or one special moment or one special message and we take it we put it in the jar and then a month later we just spend some time we go through the jar we just pull out random notes and read them and reflect",
    "videoId": "ZywgvFSnH38",
    "context": "Goal Setting Workshop — Friday date night + their jar practice w/ monthly review",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-26",
    "text": "Some of the rituals you could have someone mentioned is a date night, right? Maybe once a week you have a date night. You do something fun, romantic. You plan something... What if once a week you thought, hey, you know what? How can I surprise the partner that I'm with?... let's update the list here. We had date night. We had uh you know uh journaling together. We had you know relationship check-ins.",
    "videoId": "NidJpDcCkQs",
    "context": "Relationship rituals menu: weekly date night, weekly surprise question, journaling, check-ins",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-27",
    "text": "I schedule it when I'm going to wake up I schedule when my date nights gonna be I schedule things in advance the most important things",
    "videoId": "oLQiUIJ7PsQ",
    "context": "Date night scheduled in advance; same doctrine 0UTb0mnuJRE, eRYjsCUh848, uPaiwpeg8-E",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-28",
    "text": "your relationship maybe you determine with your partner that you have one or two days a week and that's date night that's the time you spend quality time together",
    "videoId": "faNF843NNrQ",
    "context": "Date-night frequency: 1-2 fixed days/week; duplicated in NnwwjL67Fv4",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-29",
    "text": "we commit ourselves to dedicating okay there's you know this hour a week or this date night or or we're going to do this a relationship Journal that's those little things are what make up the success of a relationship not just because we met each other",
    "videoId": "s3oeWqLd68Y",
    "context": "10-years retrospective: hour-a-week + date night + journal = the mechanics",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-30",
    "text": "if you understand your partners like what are their Love Languages what are their six human needs what are their top values like if you actually understand certain things what does it take for them to feel love... seek first to understand then to be understood",
    "videoId": "s3oeWqLd68Y",
    "context": "Three lenses: love languages, six needs, top values",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-31",
    "text": "I have a video on my channel about the six human needs in a relationship and how because I'm constantly meeting Stefan's needs at high levels he's never gonna want to leave me you know like why would he when he's a love slave",
    "videoId": "cU96A9Pi7Ms",
    "context": "Tatiana confirming the shared doctrine",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-32",
    "text": "one of the things I've learned from Tony Robbins is another model which is the six human needs and significance is one of those needs which we all value but there's also a hierarchy of and so if you value significance above all your other needs above let's say love or certainty... you never feel like you have enough you're always comparing yourself to others",
    "videoId": "hQ0SAsuJrIQ",
    "context": "Needs-hierarchy nuance: overvalued significance as red flag",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-33",
    "text": "Share the magic moments of the day with my girlfriend, journal the magic moments of the day as well.",
    "videoId": "OmzcFEuUKMQ",
    "context": "Magic-moment sharing as daily plan line item",
    "artifact": "relationship-journal"
  },
  {
    "id": "relationship-journal-34",
    "text": "give love every day to my amazing girlfriend to focus on meeting her needs daily",
    "videoId": "OgRGJBpTOeU",
    "context": "Daily needs-meeting as written 'I will easily' goal",
    "artifact": "relationship-journal"
  },
  {
    "id": "resource-escalation-0",
    "text": "a course is generalized information it's a system it's a process it's a step by step that you're investing in at a much cheaper price than it cost you to hire someone one-on-one ... when you're first starting out you invest in courses because the reality is hiring a mentor and a coach if you hired me for coaching one-on-one you'd pretty much be wasting your money because everything that I would tell you if you're brand-new as a beginner I would just say it's right here in the course ... you really want to be at a certain level of proficiency where now it makes sense for you to hire a coach or a consultant ... if you really struggle with just motivation you don't take action in your life you're lazy ... that's the value a coach can give you and in that case you'd want to hire a life coach a life coach and accountability coach that's a lot cheaper than hiring a successful business coach ... you can get a life coach for $50 an hour ok hire a life coach 50 bucks an hour they'll coach you and help you with the mindset to make sure you're taking action with the course ok but you want to start out with the course the generalized information make something of that and then once you're at a different stage and then hire a coach hire a consultant a mentor that can help you move further than that",
    "videoId": "PWCSSH_wYDg",
    "context": "THE LADDER, most explicit statement: courses first (cheap, generalized) -> coach/consultant/mentor once proficient; separate rung = cheap accountability/life coach purely for motivation. Q&A 'Making Money Online', answering 'course vs live coach'",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-1",
    "text": "I look at my education was learning by investing in courses seminars mentors and I don't know if that if I went down the business school path if I'd be where I am today ... because the internet it's really change the education model you don't have to go to school anymore you can educate yourself online the education model is ancient",
    "videoId": "PWCSSH_wYDg",
    "context": "self-education replaces formal education; education = courses+seminars+mentors",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-2",
    "text": "when I was 18 years old the first seminar I ever went to was by dating and relationship seminar by Xan [Zan] Perry ... in Vancouver ... I was a 500 buck 500 dollar seminar ... I was sitting there in the front row I had my computer with me and I took notes on every word ... by the end of it I had a word document of like 50 pages ... I got so much more value out of that than I ever would have if that if you just had some videos on YouTube ... because when you pay for something the more you pay the more you pay attention right the more you invest you actually have skin in the game ... invest in books and trainings I mean you can go to the library for free library is an amazing place",
    "videoId": "3NquT3aJ-L0",
    "context": "KEY DOCTRINE PHRASE: 'the more you pay the more you pay attention'; free YouTube vs paid seminar contrast; free library as bottom rung; origin story first $500 seminar at 18 (Zan Perry, dating)",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-3",
    "text": "oftentimes people you can come to me and say Stefan I'm willing to do whatever it takes ... I'll say okay great here buy this course this course is gonna guide you to getting to where you want to go ... and then oftentimes what happens up for a lot of people say oh no no I can't because of this and that well here you just said you're gonna do whatever it takes ... how committed are you really ... that's oftentimes how you know someone is kind of in the dabbler mentality",
    "videoId": "3NquT3aJ-L0",
    "context": "willingness to pay = commitment test; 'dabbler mentality' = won't put money behind their goals",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-4",
    "text": "many of you guys know I was in business Mastery two or three weeks ago in Las Vegas that was the most amount of money I've ever spent for a seminar which is $10,000 ... when you invest a lot of money to something you take it more seriously and you get way more out of it ... I was playing full out I was showing up early I was taking notes I was reviewing my notes during the breaks ... because often times when you just get free information you don't value it the same way as I when you actually pay for something ... another reason why it's powerful is accountability see when you commit to something you're going to be accountable to it the 100 day challenge has built-in accountability which is great Gary Ryan Blair is a master at that ... if you can have a coach a mentor great",
    "videoId": "GXhPOncX8CA",
    "context": "'pay for accountability not information' doctrine in his actual words: free information not valued + paid = accountability; Tony Robbins Business Mastery $10,000 Vegas story; Gary Ryan Blair 100 Day Challenge (product he sells, coupon MASTERY)",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-5",
    "text": "you can either form your own Mastermind ... but all the best masterminds you got to pay for so there's a mastermind that I'm a part of I pay every year to be a part of it and they do trips around the world ... a yearly membership which I think is like $2,000 a year ... I personally pay to get access to people that are more successful than myself I pay to go to seminars I pay for coaches uh I've got a great business coach right now that I pay $2,500 a month for for two sessions a month ... even when I didn't have money I I still found ways to hire coaches and mentors ... I like to be a part of masterminds where I'm like very uncomfortable amongst the group because everyone is just so much better than myself ... if you're the smartest person in the room you're in the wrong room ... people in these masterminds are doing 10 million a year and $50 million a year ... I happily pay for those to be around those people because that's you get the best growth from that",
    "videoId": "-lH7vrLl0pY",
    "context": "top rung of ladder: paid mastermind ($2k/yr + events) + business coach $2,500/month; 'pay for access/proximity' doctrine; Nov 2016 Monthly Goals Report Q&A. Same video lists: Brotherhood Mastermind trip, Tony Robbins Business Mastery Vegas, booked Date with Destiny leadership program Australia",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-6",
    "text": "education 10% and this is also a very important one because the best investment you're ever gonna make in your life also according to Warren Buffett greatest investor of all time is an investment in yourself okay so your education is you investing in you it's investing in books it's investing in courses like the one that you guys are a part of right now it's investing in seminars it's investing in coaches and consultants ... making sure you put money aside for your own education I can't stress that enough that's been one of the most important things that I've done since an early age of my life",
    "videoId": "rqbZyviDnfU",
    "context": "THE 10% RULE: Money Management 101 jar system — 10% financial freedom, 10% EDUCATION (books->courses->seminars->coaches escalation named inside the jar), 10% fun, 5% giving; T. Harv Eker-style jars",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-7",
    "text": "The next one we need to have, this one's probably one of the most important ones, is education. Guys, you have to be improving yourself ... You've got to be putting money aside to invest in you because you are the most valuable resource that is gonna determine how much money you make. You've got to develop your own skills, you have to buy books, go to seminars, go through courses, training programs, mentors, and coaches. Always improving to reinvest in yourself. Warren Buffett, the multi-billionaire says the best investment you can ever make is not in a stock, is not in real estate, is not in business, but it's in you.",
    "videoId": "VfhmzqDHM4w",
    "context": "How To Budget Your Money — jar system, education account; second independent statement of 10%-into-education rule (fun jar = 10%, give = 5%)",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-8",
    "text": "Another 10% you've gotta put towards education. You've gotta invest in yourself, because how are you gonna really change your life if you don't have the financial means to invest in yourself, to learn from others, to invest in seminars, training, courses, coaches, and mentors. That's really what's gonna get you to financial prosperity.",
    "videoId": "iMBikr7lKHI",
    "context": "'If You're Broke Or Struggling Financially' — third independent statement of the 10%-of-income-into-education rule, prescribed even to broke viewers",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-9",
    "text": "another quote from jim rohn actually ... he says that your inc your income is in proportion to your level of self-development and so the more that you grow the more that your income grows ... one of my favorite quotes from jim rohn he says that if you want things to get better in your life then you must get better and that if you want things to change then you must change",
    "videoId": "5emsRG7baec",
    "context": "'your income grows to the extent you do' doctrine — his actual phrasing, attributed to Jim Rohn; Top 10 Self-Help Books video",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-10",
    "text": "that's the number one investment that Warren Buffett ... says the best investments not in real estate it's not in stocks it's in you ... first seminar I ever went to was five hundred dollars at eighteen years old and ever since then I've been literally invested hundreds of thousands of dollars into myself and yes it's a lot of money you may think that's crazy but that's resulted in me making millions of dollars ... books are such a bargain when it comes to the amount of money it cost to invest in them and the return you can get ... ideally you do all three right you invest in yourself you invest in your own business and grow that and you also invest in stocks ... if you only have a thousand bucks first it's pro ties [prioritize] in yourself and then it's also your business ... and then taking that and investing in stocks",
    "videoId": "JeeXEnRyoUc",
    "context": "'Where To Invest $1,000 Right Now' — capital allocation hierarchy: self > business > stocks; hundreds-of-thousands-into-self -> millions ROI claim; also mentions just buying a $300 Tantra relationship course over 1 Apple share",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-11",
    "text": "his advice. Invest in yourself first and foremost. Number two invest in an index fund. Okay? Hold it longterm. ... The only difference was that I invested in myself.",
    "videoId": "s5NyRs0HTn8",
    "context": "'Warren Buffett Reveals His Best Investment Advice' — whole video frames Buffett as authority for invest-in-yourself-first",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-12",
    "text": "I would say also going to a seminar called The Millionaire Mind intensive with TR Becker [T. Harv Eker] that's all about passive income excuse me in Financial Freedom and that really shifted my mentality",
    "videoId": "OcYECokZIeM",
    "context": "named seminar: Millionaire Mind Intensive (T. Harv Eker); 29th Birthday Hangout origin story",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-13",
    "text": "i love tihar vekker [T. Harv Eker] i've been to his seminars the millionaire mind intensive he doesn't teach anymore but uh this was a really good classic book",
    "videoId": "qXwwJdwmgic",
    "context": "Secrets of the Millionaire Mind book + Millionaire Mind Intensive seminar attendance confirmed",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-14",
    "text": "tony robbins has been one of the biggest influences in my life he's someone that i discovered his audio programs when i was 17 years old and a lot of what i believe and a lot of who i am has been based on a lot of teachings and the influence of tony robbins in fact the whole project life mastery concept was inspired by tony robbins because he coined life mastery ... i spend at least an hour a day reading sometimes two hours a day",
    "videoId": "qXwwJdwmgic",
    "context": "named mentor #1 Tony Robbins (audio programs at 17, PLM name origin); daily reading prescription 1-2 hrs/day",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-15",
    "text": "42-book per-life-area list ('my top four book recommendations for improving every aspect of your life', categories: general self-help / mindset / physical health / mental health & addiction / relationships / finances / business / marketing / spirituality / christianity): GENERAL SELF-HELP: Awaken the Giant Within (Tony Robbins), Unlimited Power (Robbins, NLP), Think and Grow Rich (Napoleon Hill), The 7 Habits of Highly Effective People (Covey), 12 Rules for Life (Jordan Peterson). MINDSET: Grit (Angela Duckworth), Relentless (Tim Grover), Can't Hurt Me (David Goggins), Mindset (Carol Dweck). PHYSICAL HEALTH: How Not to Die (Michael Greger), Fats That Heal Fats That Kill (Udo Erasmus), The Reboot with Joe Juice Diet (Joe Cross, + doc Fat Sick and Nearly Dead), Your Body's Many Cries for Water ('dr batman' = Batmanghelidj). MENTAL HEALTH/ADDICTION: Man's Search for Meaning (Viktor Frankl), Dopamine Nation (Anna Lembke), The Molecule of More, Recovery (Russell Brand, 12 steps), Your Brain on Porn (Gary Wilson). RELATIONSHIPS: The Five Love Languages (Gary Chapman), The Seven Principles for Making Marriage Work (John Gottman), Cupid's Poisoned Arrow, The Way of the Superior Man (David Deida). FINANCES: Rich Dad Poor Dad + Cashflow Quadrant (Kiyosaki), Money Master the Game + Unshakeable (Robbins), The Millionaire Fastlane (MJ DeMarco), Secrets of the Millionaire Mind (T. Harv Eker). BUSINESS: The E-Myth Revisited (Gerber), The 4-Hour Workweek (Ferriss), Principles (Ray Dalio), Sam Walton Made in America. MARKETING: Influence (Cialdini), Getting Everything You Can Out of All You've Got (Jay Abraham), Traffic Secrets (Russell Brunson), Building a StoryBrand (Donald Miller). SPIRITUALITY: A New Earth + The Power of Now (Eckhart Tolle), The Untethered Soul + The Surrender Experiment (Michael Singer), Power vs Force + Letting Go (David Hawkins), Way of the Peaceful Warrior (Dan Millman). CHRISTIANITY: The Bible, The Purpose Driven Life (Rick Warren), The Case for Christ (Lee Strobel), Jesus Calling",
    "videoId": "qXwwJdwmgic",
    "context": "'42 Life-Changing Books For Mastering Every Area Of Your Life' — THE canonical per-area prescription video; framing quote: 'whenever someone asks me stefan what book should i read ... i often respond with well what area of your life are you really focused on right now'",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-16",
    "text": "Top-10 self-help list: 1 Awaken the Giant Within (Robbins; + Notes from a Friend as short companion), 2 The Four Agreements (Don Miguel Ruiz), 3 As a Man Thinketh (James Allen), 4 The 7 Habits of Highly Effective People (Covey), 5 12 Rules for Life (Peterson), 6 Psycho-Cybernetics (Maxwell Maltz), 7 How to Win Friends and Influence People (Carnegie), 8 Way of the Peaceful Warrior (Millman), 9 The Alchemist (Coelho), 10 The War of Art (Pressfield); bonus 50 Self-Help Classics / 50 Psychology / 50 Success / 50 Spirituality Classics (Tom Butler-Bowdon, 'tom bowden')",
    "videoId": "5emsRG7baec",
    "context": "'Top 10 Self-Help Books That Will Change Your Life'; doctrine framing: 'self-help is the foundation because the more that you grow and improve yourself it benefits every other aspect'; also 'i encourage people to actually read a book and not just consume a summary'",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-17",
    "text": "25-books-that-changed-my-life list: Awaken the Giant Within, Think and Grow Rich, It Works (RHJ), Man's Search for Meaning, The Way of the Superior Man, The 4-Hour Workweek, The Greatest Salesman in the World (Og Mandino), The Wealthy Barber (David Chilton — 'paying yourself first ten percent of what you make'), Rich Dad Poor Dad, Cashflow Quadrant, The Millionaire Fastlane, FU Money (Dan Lok), Secrets of the Millionaire Mind (Eker — money blueprint/thermostat), Way of the Peaceful Warrior, The Power of Now, The Depression Cure, The Game (Neil Strauss — 'I don't agree with what the book teaches' but proved attraction is learnable), The Alchemist, Unlimited Power, Rocket Fuel (visionary/integrator), Get Up! (treadmill desk), The Introvert Advantage, Brain Over Binge, Money Master the Game ('I got it before it was released at a seminar at the time, Unleash The Power Within')",
    "videoId": "CQ8m5o_QH-g",
    "context": "'25 BOOKS THAT CHANGED MY LIFE'; also Dan Lok mentor story ('someone that was once a mentor in my life... now Dan and I have become friends'); wealthy dating-coaching client advice: 'Read all the books by Robert Kiyosaki'",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-18",
    "text": "most often when something's free or inexpensive people don't value it they don't have any skin in the game they're not invested ... you attract a totally different customer ... when they actually pay more money for something because now they've got something on the line they've got skin in the game they're more likely to take action with it and apply it and get results",
    "videoId": "456PIB2Mk_g",
    "context": "skin-in-the-game doctrine applied from the seller side (why he promotes high-ticket)",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-19",
    "text": "they've already demonstrated they have the mindset and a willingness to invest their money and their time and they've got skin in the game and they're gonna get so much more value as a result of that and so ASM is a barrier yes it is but those that are willing to rise up to it ... those are the ones that I can help the most because there's so much more coachable",
    "videoId": "oLQiUIJ7PsQ",
    "context": "price-as-filter doctrine used to justify expensive course (Amazing Selling Machine)",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-20",
    "text": "people will not take action generally speaking unless they have some form of skin in the game if they have not invested in something out of their pocket that's painful okay whether it's $5 or $5,000 they're not as invested it's the reason why $5,000 courses have lower refund rates than $5 courses",
    "videoId": "U0ytnJZWxMU",
    "context": "NOTE: spoken by interview guest John Benson (copywriter), featured approvingly by Stefan in intro clip — supporting the pay=commitment doctrine",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-21",
    "text": "when you're an entrepreneur for example and you do your own self education you have to learn to develop the skills and the confidence to be able to make money whenever you need it ... I think self development self education is the most valuable things continue to learn and grow and improve understand that the best way to learn again is by doing fine people that have the results you want learn from that invest in yourself of course just as you would with a school or education",
    "videoId": "88-MQ-PKfGA",
    "context": "'Why I Dropped Out Of College' — redirect tuition-level spend into self-education; 'find people that have the results you want'",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-22",
    "text": "i consume content constantly books and seminars and courses and co[aches] i've done that and that's been my life",
    "videoId": "ECa8xB_4cUs",
    "context": "'If I Started Over Tomorrow' — the full ladder listed as lifestyle in one breath",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-23",
    "text": "there's many times for me in my life i turn off learning because sometimes it's a distraction for you you know watching more and more YouTube videos and reading more about books that can be a distraction ... you got to make sure you apply what you learn ... when you invest in something you value it more you get more from it um so I invest in it I got my skin in the game and then I'm GNA be applying that for the next few months",
    "videoId": "E20v-rrXyWs",
    "context": "counterweight rule: consumption without application = distraction; invest then commit to applying one thing for months",
    "artifact": "resource-escalation"
  },
  {
    "id": "resource-escalation-24",
    "text": "going to a seminar ... reading books gaining more you know practicing your skills um going to courses seminars and retreats and actually spending your time doing things that benefit your future because really an investment is something that you do today that gives you a future benefit a future return",
    "videoId": "iVopRAfH1Aw",
    "context": "invest-in-yourself defined as books/courses/seminars/retreats with delayed-return framing (Q&A)",
    "artifact": "resource-escalation"
  },
  {
    "id": "rules-engineering-0",
    "text": "the other types of beliefs are rules rules are beliefs that you have about what has to happen in order for you to feel a certain way okay so when it comes to your rules the way that they come in place is around your values they determine whether or not you even experience any of the values that you have see what determines whether or not you even feel successful is the rule that you have in your head a belief that says in order to feel successful blank needs to happen so if i were to ask you what has to happen for you to feel successful in your life what would your response be whatever your response is is your rule is your belief of what has to happen for you to feel successful",
    "videoId": "_Axwu-OV9YQ",
    "context": "core definition of rules + the elicitation question verbatim",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-1",
    "text": "so for some people they might say in order for me to feel successful i need to make millions of dollars every year in order for me to feel successful i need to be respected by thousands of people around the world in order for me to feel successful i need to be one of the best in the world at what i do in order for me to feel successful i need to have you know a hundred thousand dollars saved in the bank account right or in order for me to feel successful i need to do everything on my to-do list every day now that person what are their chances of feeling success not that often unless they meet all of those beliefs all those rules they have",
    "videoId": "_Axwu-OV9YQ",
    "context": "before examples — hard, out-of-control success rules",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-2",
    "text": "you know for me i feel successful the moment i wake up for me i feel successful when i remember i'm a child of god and that i'm just worthy and significant for being alive that you know i'm alive here on this planet and i didn't have to do anything and i've been given this incredible gift and that makes me feel successful or that person might say in order for me to feel successful i just need to remember something that i've achieved in my life i need to just remember that you know i got an a in my test or i got an a in this subject in school or i got to remember what i'm capable of right and so for that person what are their chances of feeling successful in their life it's a lot easier",
    "videoId": "_Axwu-OV9YQ",
    "context": "after examples — 'I feel successful the moment I wake up' verbatim",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-3",
    "text": "oftentimes people they make it incredibly hard for them to feel good and incredibly easy for them to feel bad and that's a problem because if you make it so hard on yourself to feel good then you're not going to feel those emotions you have all these rules in place",
    "videoId": "_Axwu-OV9YQ",
    "context": "the easy-to-feel-good doctrine",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-4",
    "text": "if you ask someone let's say what has to happen in order for you to feel happy they might say well in order for me to feel happy you know my kids have to do what i say well the problem with that is that what happens when your kids don't do it do what you say they're not going to feel happy or in order for me to feel happy i need to be in a relationship so that means that you're not going to be happy when you're not in a relationship and the problem with this is that you're putting your happiness as a dependency on someone else which you have no control over so you don't even have control over your own happiness",
    "videoId": "_Axwu-OV9YQ",
    "context": "diagnosis — rule out of your control",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-5",
    "text": "instead if you make it easier for you to feel happy and you say i feel happy the moment that i wake up i feel happy anytime i think about anything that i can be grateful for in my life i feel happy anytime that i focus on the love from god the unconditional love for my creator where i feel happy anytime i make progress towards a desire that i have in my life you know i feel happy anytime that i give something to someone else i'm a blessing to someone else if you make it easy for yourself you're going to feel the happiness so much more",
    "videoId": "_Axwu-OV9YQ",
    "context": "rewrite step — 'I feel X anytime I…' format verbatim",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-6",
    "text": "when people make it so hard for them to feel successful or to feel happy or to feel love or to feel all these things that they really desire they're limiting themselves from having the energy to pursue more of it see they don't realize success breeds more success when you feel successful you're more likely to pursue more success you get momentum from that so by making it easier for you to feel success in your life you're gonna want to pursue more success love abundance freedom happiness can't help but to express itself can't help but to expand and often what happens is the target moves so for you for a lot of people success they make it even harder once they get closer towards success they say oh that's not success this is success and make it harder and harder by moving the target",
    "videoId": "_Axwu-OV9YQ",
    "context": "why easy rules work; moving-target failure mode",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-7",
    "text": "if i were to ask you what has to happen for you to feel rejected in your life and that's your number one away from value well someone might say in order for me to feel rejected someone has to criticize me or in order for me to feel rejected someone would have to ignore me for some people their belief in the rule is in order for me to be rejected i'd have to allow someone to reject me i'd have to allow that person's opinion of me to be greater than my own opinion of myself right and so as a result they're not giving other people's opinion more power than the opinion and the beliefs they have about themselves",
    "videoId": "_Axwu-OV9YQ",
    "context": "away-from-value rules — inverting rejection",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-8",
    "text": "for some people they feel failure anytime that something happens that they didn't expect or things didn't go their way other people they believe their rule is saying the only time i feel failure is if i didn't learn if i learned that i'm not a failure if i don't learn then then i am or for them they say you know i only feel failure if i don't try if i don't give it my shot and so for them they only feel failure if they don't take action and that can actually support them more so these rules are really what screws us up they can really destroy your life and most people they're not conscious of them this is the software this is the blueprint this is the operating system the model of the world",
    "videoId": "_Axwu-OV9YQ",
    "context": "failure rule rewrite; rules-as-software framing",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-9",
    "text": "here's the problem with a lot of people they want to be right instead of being happy instead of being fulfilled instead of being successful instead of being free for me i'm willing to be flexible with my beliefs and to change my beliefs and my values in an intelligent way to determine what's going to make me the most fulfilled is this belief really serving me in my life or is it holding me back",
    "videoId": "_Axwu-OV9YQ",
    "context": "criterion: does the rule serve you, not is it true",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-10",
    "text": "the feeling of happiness, I want you to imagine it's like a target and the bull's-eye of that target is happiness and that's what you're trying to move towards. You're trying to hit that target of happiness. But what determines whether or not you feel and hit that target is the rules you have, the beliefs in your mind of what has to happen in order for you to feel happy.",
    "videoId": "KuVQ5wpcIvg",
    "context": "target/bullseye metaphor",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-11",
    "text": "My invitation for you is to rewrite the software. To change your beliefs. To write out a new list of rules of what has to happen for you to feel happy. Write it out. I feel happiness anytime I smile. I feel happiness anytime I focus on and notice all the good in my life, which is always around me. I feel happiness anytime I focus on someone that I love. I feel happiness anytime that I wake up to another gift of life. And you write out this list of many ways that you can feel happy that are so easy for you to feel.",
    "videoId": "KuVQ5wpcIvg",
    "context": "THE EXERCISE — write the new rules list, verbatim",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-12",
    "text": "don't delude yourself for making it so hard for you to feel it when you can give yourself permission and rewrite the software and write out your new list and condition that every day. I'd encourage you every day for 30 days. 30 days, I feel happy anytime I smile. I feel happy anytime I take in a deep breath in.",
    "videoId": "KuVQ5wpcIvg",
    "context": "conditioning protocol — daily for 30 days",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-13",
    "text": "then I also go over my rules so my rules are um beliefs that I have about what has to happen for me to meet my values and experience them I just read those to myself so for example I experience health and energy anytime I do anything that increases my physical wellbeing or I take a deep breath or I consume fruits or vegetables or I drink water or focus on positive thoughts or be in a positive state so I just remind myself those are my rules and I try to make it as easy as possible to feel healthy and energetic love I experience love anytime I am loving anytime I'm warm towards others anytime I focus on remember the love that's always in my heart I experience love anytime I connect with God or I Feel Love anytime my state enhances the way others feel okay so I've made it as easy as possible for me to feel love",
    "videoId": "OgRGJBpTOeU",
    "context": "his personal value-rules affirmations verbatim (health/energy, love), daily ritual step",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-14",
    "text": "same thing with happiness a lot of people have these beliefs these rules in order to feel happy I need to make money I've got to do this and this all this sort of stuff has to happen if you're happy for me it's I experience happiness and gratitude anytime I remember and appreciate all the good that already exists in my life number two feel thankful for God or anyone else and number three wake up another day alive that's it I feel happy just being waking up another day alive I can be happy every day just by changing my beliefs about what has to happen for me to meet them",
    "videoId": "OgRGJBpTOeU",
    "context": "his personal happiness rules (3 numbered)",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-15",
    "text": "i ask myself okay what is one value from this list that i have here that i want to integrate more in my life what's one that i want to condition so for example let's say today i take abundance okay i've created an affirmation and i say to myself i experience abundance anytime i number one give to others okay number two share with others anything that i've learned know or is it of value number three focus on and remember all the incredible abundance that already exists in my life or number four remember that life is abundant and there's always more available coming my way so i'm conditioning the value in my life but also the rules the rules are the beliefs that you have of what has to happen for you to feel that way so i try to condition that just one value a day",
    "videoId": "PPlaK8y4PzA",
    "context": "one-value-per-day conditioning with numbered rule affirmation",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-16",
    "text": "then i also try to condition what's called an away from value which are the negative emotions that you want to avoid in your life and i've turned these into affirmations as well so for example let's say that i want to eliminate scarcity i'll say to myself and this is the belief that i condition and empowers me i experience consistent debilitating feelings of scarcity only if i were to consistently believe in the illusion of lack and focus excessively on myself instead of remembering that everything in life is abundant having faith that more is always available and focusing on giving to others",
    "videoId": "PPlaK8y4PzA",
    "context": "away-from-value affirmation format verbatim: 'I experience [X] only if I were to consistently…'",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-17",
    "text": "the next thing that I have is I go over what I call my values and my rules now your values are emotional states that we're moving towards we have towards values and also away from values and I learned a lot of this stuff from Tony Robbins at his date with Destiny seminar values and rules is something I've learned from Tony Robbins",
    "videoId": "OgRGJBpTOeU",
    "context": "lineage attribution + daily values-and-rules ritual step",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-18",
    "text": "I remember for me I used to Value success above happiness and so just that little switch there when I had that I'd always had to achieve or do something significant in order to feel happy whereas when I switched happiness to above success now I happily achieve instead of achieving to be happy huge difference of Worlds right there",
    "videoId": "OgRGJBpTOeU",
    "context": "value-hierarchy reorder — 'happily achieve'",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-19",
    "text": "you're right now achieving to be happy what if instead you happily achieved see successful people aren't happy happy people are successful so happiness is something that you start with that contributes to your success",
    "videoId": "FiWus84T7BY",
    "context": "easy rules don't kill drive",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-20",
    "text": "for me I have a low criteria for happiness in my life I think a lot of people they're not happy because they think something big has to happen for them to be happy they have to achieve this big goal for me I can be happy from a smile for me I could be happy from a sunset or a sunrise for me I could be happy just going for a walk through nature",
    "videoId": "FBfLPj6PX6g",
    "context": "'low criteria' synonym doctrine",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-21",
    "text": "everybody has a blueprint a set of beliefs about what has to happen in order for us to experience happiness",
    "videoId": "6i2VJCLPdls",
    "context": "blueprint definition",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-22",
    "text": "you're driving in your car the person in front of you is driving too slow which is this based on your preference they have the right to drive it whatever pace they want they're driving the speed limit right the only reason why you're upset is you've created a rule in the belief that has to happen the way you want it to happen it's not so you feel angry and upset when that happens",
    "videoId": "mq1qX8Gssc0",
    "context": "anger = violated invented rule",
    "artifact": "rules-engineering"
  },
  {
    "id": "rules-engineering-23",
    "text": "even how you define success is based on whatever you make up some people define success as having a million dollars other people is 10 million dollars other people they define their success as someone that's just living in integrity every day or someone that's just living true to their values if they do that then they feel successful you get to make up whatever these beliefs are",
    "videoId": "F4j974PvwSQ",
    "context": "rules are made up, therefore rewritable",
    "artifact": "rules-engineering"
  },
  {
    "id": "state-protocols-0",
    "text": "if you're sitting I'd love for you to stand up okay shake out your body okay taking a big deep breath in and exhale good and I want you to stand or sit the way you sit or stand if you totally confident I want you to make changes right now in your body your physiology if you were confident where would your shoulders be would they be up and back if so put them up and back how would you move how would you breathe if you were confident do that right now would it be full or would it be more shallow I want you to even exaggerate it",
    "videoId": "meGVqcdcU6g",
    "context": "instant state change step 1: stand, shake out, deep breath, confident physiology, exaggerate",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-1",
    "text": "what kind of look would you have in your eyes put that look in your eyes right now maybe you'd have a little smirk like yeah like you know that you're going to own it you know that you're going to own this day what would you do with your hands if you're confident would you be taking up more space like you know you own the room would you have more power with your voice would you project your voice a lot louder what's something that you would say if you were confident whether it's yes I can do this I can accomplish whatever I set my mind to I am the man I am the woman whatever it is say it now say it with power say it with conviction",
    "videoId": "meGVqcdcU6g",
    "context": "eyes/expression, take up space, project voice, confident language with power",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-2",
    "text": "I want you to imagine I want you to make a picture right now see yourself with your eyes closed what would you look like if you were confident maybe it's seeing a time in your past of being successful or maybe it's creating one in the future take that image take that picture make it bigger make it brighter that's it good bring it close towards you feel it feel that in your body feel that flow through every part of your body",
    "videoId": "meGVqcdcU6g",
    "context": "focus/visualization step — bigger, brighter, closer (NLP submodalities)",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-3",
    "text": "whatever level you are right now I want you to take it to level 10 take that confidence to level 10 do whatever you got to do right now in your body to take it to level 10 if you got to put on music you got to start dancing because if you can get yourself to level 10 11 12 15 you can modulate and bring this energy this confidence down to level seven that might be more appropriate to a certain environment or context but I want you to stretch yourself to condition like building a muscle",
    "videoId": "meGVqcdcU6g",
    "context": "level-10 doctrine — overshoot to modulate down; conditioning like a muscle",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-4",
    "text": "we're going to create a little anchor an association so that you can access this emotional state anytime that you want so what I want you to do is I want you to clench your right Fist and say yes okay do that now say yes good do it even stronger yes do it even stronger yes do it even louder yes what we're doing right now is we're linking we're associating yes and that gesture to the state",
    "videoId": "meGVqcdcU6g",
    "context": "fist-clench 'yes' anchoring at escalating intensity",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-5",
    "text": "I do not leave the house until I'm at level 10 I do not create a video like this on YouTube at least until I'm at level 10 this is my ritual to put myself there and I don't need to do it as much I don't always have to be level 10 I can bring myself down to six or seven based on the topic or based on the environment and the context but because I put myself at level 10 I can bring myself there if I need to as well",
    "videoId": "meGVqcdcU6g",
    "context": "'don't leave the house until level 10' verbatim; repeated in cbIy7oD7-LQ",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-6",
    "text": "he teaches the emotional Triad the three things that we just did determines how you feel in any moment the first was changing physiology changing the way you move the way you breathe your expression that's the fastest way to change how you feel emotion is created by motion number two is your focus whatever you focus on you feel make it bigger make it brighter those are the submodalities the other piece that we did was your language certain words produce emotion those three things are from Tony Robbins now Tony Robbins originally got those Concepts from NLP neurolinguistic programming",
    "videoId": "meGVqcdcU6g",
    "context": "THE TRIAD — physiology (fastest) / focus / language, credited Robbins + NLP",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-7",
    "text": "whenever you say to yourself I don't feel like doing it you're tired you're lazy don't just try to force yourself to do it change your state put yourself in the state where doing it will be automatic",
    "videoId": "meGVqcdcU6g",
    "context": "low motivation → change state, not willpower",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-8",
    "text": "you have no control over the outside world but you have 100% control of your inner world and what things mean you have 100% control of how you decide to use your body how you decide to use your focus and how you decide to use your language and those are all three things that radically change the ways that we feel",
    "videoId": "mxl2l-QBD0s",
    "context": "triad applied to fear/anxiety",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-10",
    "text": "the first step is to get yourself in that state put yourself in the pattern okay the second step is to break the pattern interrupt it do something crazy unique something that shocks you but the third step is to put yourself in the state that you need to be in so basically replace the old pattern with something new",
    "videoId": "iaihRQhG-5Y",
    "context": "pattern-interrupt protocol: enter → interrupt → replace",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-11",
    "text": "when you're in this peak state of feeling amazing if you do something unique right at the peak of that okay so for example snapping my fingers or just saying yes and clenching my fist what's happening is I'm associating or linking this emotional state to that gesture if I'm depressed or I'm down all I got to do is go like this or like this and just set off that anchor and I go back into that emotional state",
    "videoId": "iaihRQhG-5Y",
    "context": "anchoring at peak + firing when down; 'at least 10 times a day for the next 10 days'",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-12",
    "text": "before certain moments that I have or throughout the day I perform a quick ritual which is parts of the morning ritual that basically are 5 to 10 minute rituals that just make sure that I'm in an incredible great state for the moment that is right before me",
    "videoId": "JZO1--Awz7k",
    "context": "the pre-moment ritual concept",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-13",
    "text": "I want to make sure that I'm in a peak state physically I usually shake up my body and might do stretches I got my mini trampoline rebounder I'll jump up and down on that for a few minutes just to loosen up my body I might just make a radical shift in my body make a power move you could do the same thing just by doing jumping Jacks push-ups another thing I do is the incantations or affirmations I might say things like yes I love this this going to be so much fun or I love my job",
    "videoId": "JZO1--Awz7k",
    "context": "pre-moment steps: physical → incantations",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-14",
    "text": "don't just have the morning ritual but have a ritual before every moment man when you go on a date with a girl or a guy you want to make sure you're in a great state if you go on a job interview make sure that you have a ritual to get yourself in a great state before you leave the house each day man get yourself in a peak State spend 5 10 minutes get yourself in state ask yourself those questions",
    "videoId": "JZO1--Awz7k",
    "context": "ritual-before-everything doctrine; LeBron anchoring example",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-15",
    "text": "the priming looks like this I first do 30 explosive breaths in and out through my nose Okay I take my hands like this and I close my eyes as I do this I'm usually sitting on my bed and I just breathe in and out through my nose as I take my hands and I go up and down like this and I'll do it 30 times you want to breathe in and out through your stomach through your diaphragm",
    "videoId": "OgRGJBpTOeU",
    "context": "priming round 1: 30 explosive nasal breaths with hand pumps (from Robbins)",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-16",
    "text": "then what I do is I do another 30 breaths just like that and then I focus on three things that I'm grateful for in my life and two of the things that I'm grateful for always have to be something small like being grateful for a pen or a notebook or a chair being grateful for your heart that beats a 100,000 times a day I'll do another 30 explosive breaths just like I showed you and I'll think about three things I want to create in my life I'll visualize it and then I'll do another 30 explosive breaths and I always finish off just by asking the universe asking God for healing I just say thank you thank you thank you",
    "videoId": "OgRGJBpTOeU",
    "context": "priming rounds 2-4: 3 gratitudes (2 small) → 3 creations visualized → healing prayer + triple thanks",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-17",
    "text": "I wake up and I immediately smile I just feel thankful for the day there's been studies done that they took people that are clinically depressed and all they had them do each day was smile from ear to ear in front of the mirror for at least 15 minutes a day just by smiling 15 minutes a day it radically helped them it releases chemicals hormones endorphins",
    "videoId": "OgRGJBpTOeU",
    "context": "smile-on-waking; physiology-first",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-18",
    "text": "I do something to start to engage my physiology engage my body um emotion is created by motion the more that you use your body the more it's going to radically change how you feel because your mind and your body are linked whether it's stretching or yoga or running or just doing push-ups or jumping jacks",
    "videoId": "OgRGJBpTOeU",
    "context": "'emotion is created by motion' — movement step (also PliFBr__T7Y, mxl2l-QBD0s, meGVqcdcU6g)",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-19",
    "text": "the key to this is to elicit the emotion and feel it in your body and then what i often do as well is i like to anchor it i like to do something unique my anchor that i have is i clench my fist or i'll snap my fingers or maybe i'll clap my hands together and what it does is it associates that emotion that feeling to that anchor so in any other moment my life if i want to pull and call upon that emotion of confidence a passion of gratitude of happiness of joy of laughter of fun then i could just set off that anchor",
    "videoId": "PPlaK8y4PzA",
    "context": "anchor variants: fist/snap/clap; fire on demand",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-20",
    "text": "your emotional state is going to dictate your behavior how you feel your emotions is going to determine your performance and so you've got to make sure that before you start the day that you're at your best that on a scale from zero to ten ten being totally confident unstoppable creative resourceful you want to be at level ten you don't want to be at level two or three or five",
    "videoId": "KQP_sk6gaLs",
    "context": "rate your state 0-10 before starting work",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-21",
    "text": "I want to make sure that before I speak I'm at a on a scale from one to ten level ten I turn on some music I'll start singing I'll start dancing I'll start doing silly things sometimes I over exaggerate my movements I'll walk around in circles and talk out loud and when I talk I really want to expand my range I do voice exercises sometimes I've got a little mini trampoline a rebounder I'll jump up and down on that so whatever I need to do I put myself at level 10",
    "videoId": "u7DavvkSxMk",
    "context": "pre-speaking level-10 warmup",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-22",
    "text": "sometimes when i'm struggling to create youtube videos i'm not in the best state to do it so sometimes i turn off the camera and i just go jump on my trampoline i change my state i say my quotes and my affirmations out loud and i'm now in a better state now i come back to what i'm trying to do it's much easier for me to follow through and deliver",
    "videoId": "sRJ_mpJb4IY",
    "context": "mid-task state reset",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-23",
    "text": "when you're at your best each day when you're starting the day at level 10 then you're gonna have a level 10 day when these challenges arise in your life you're gonna deal with them a lot better but if you start off the day and you're like level 5 then the challenges are gonna affect you",
    "videoId": "oZmL1lzrPYE",
    "context": "level-10 start as inoculation",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-24",
    "text": "if you're a level 3 person you've got a level seven problem the problem is gonna consume you you got to be a level 10 person when you deal with the level 7 problem as a level-10 person you could destroy and rip through that problem",
    "videoId": "z6xt0z_Iges",
    "context": "level-10-person vs problem-size doctrine (also qq3mmK0jKaE, fxupIUtRLSs, MMs7aTPSDXo, kViGyCNRyl8)",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-25",
    "text": "I never start my day without making sure i prime myself to be at my best to be at level 10 because when you're at level 10 you can handle whatever shows up in their life in a very different way versus if you wake up and you're you know you got your anxiety and your fear and your depression and you're reading the news and you're checking your social media checking your email and you're just reactive",
    "videoId": "eRYjsCUh848",
    "context": "priming as non-negotiable daily start; proactive vs reactive",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-26",
    "text": "the secret to building discipline willpower is every single day you gotta do something that sucks now the king of this is doing a cold shower okay cold showers one of my favorite things i do in the morning very simple you take your warm shower at the end of the shower you turn the faucet on cold and you let it run cold for 30 seconds you count to 30 and then you turn it off and you go about your day that simple act right there of doing something that's uncomfortable that sucks will build discipline and willpower and transfer to other aspects of your life",
    "videoId": "Gh8DMB0n7Jw",
    "context": "cold shower protocol — daily 'do something that sucks'",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-27",
    "text": "here's how you start doing cold showers you take a warm shower at the end of the shower you turn your back to the shower head you have it run just on the back your neck and the back and your shoulders here which is the best place you just turn it cold turn it on cold you count to 30 and then you finish your shower and maybe at first you can't tolerate it then just make it a little bit cold and then every day go a little bit further eventually you build a tolerance",
    "videoId": "6pOOA9PLsTI",
    "context": "cold shower progression (back/neck first, count 30, incremental); Wim Hof cited",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-28",
    "text": "one thing that i do is i do a cold shower you know that's just a little challenge that i do it's not easy it's not comfortable i don't want to do it but it's something that i do just to develop grit and to bring about the warrior within myself",
    "videoId": "pryzRl1h0WA",
    "context": "cold shower as warrior-archetype cultivation",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-29",
    "text": "to be a master of your emotions you have to become a master of meaning. The meaning that you associate to an event, is what's going to determine how you feel in any given moment Nothing in life has any meaning, except for the meaning that you give it Just by asking yourself, 'What's great about this? What else could this mean? What's good about this?'",
    "videoId": "y_vzzMkjSrQ",
    "context": "language/meaning leg expanded",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-30",
    "text": "whenever you catch yourself saying something negative or disempowering or limiting, say the opposite of that",
    "videoId": "y_vzzMkjSrQ",
    "context": "say-the-opposite correction drill",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-31",
    "text": "I taken deep slow diaphragm breaths okay inhale I hold it for just maybe a few seconds so that I'm fully oxygenating all my cells in my body and then I make sure that I exhale through my diaphragm okay through my stomach so that I'm eliminating and getting rid of all the toxicity in my body",
    "videoId": "PliFBr__T7Y",
    "context": "waking breathing protocol (older ritual)",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-32",
    "text": "anchoring is basically the process where you anchor a certain emotional State ok a certain emotional State to something That's unique at its peak of intensity with enough frequency the key to anchoring is making that What You're doing when you anchor it is unique often times I use something like I clench my right fist This is an anchor for me I've anchored many things to it clench my fist or I Snap my fingers",
    "videoId": "5ecLYP3FE6g",
    "context": "formal anchoring recipe: unique × peak intensity × frequency",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-33",
    "text": "sometimes something might happen, might bother me. I might go to the gym. I might go for a walk. I might take a break before I respond to that. So, I can change my state and maybe think about it a little bit of a different way",
    "videoId": "vNq9aIh-mXA",
    "context": "change state before responding when triggered",
    "artifact": "state-protocols"
  },
  {
    "id": "state-protocols-34",
    "text": "you don't need to be at level 10 for me what I look at in my life I just want to be at level 7 8 9 or 10 7 for me is the minimum in my life if I drop below a 7 in a certain area in my life based on my standards and my definition of it then what I do is I check in I said you know what that's not acceptable what can I do to bring that out back to level 7",
    "videoId": "wqJ-2N5KVOU",
    "context": "7 as the minimum standard per area; who-says-ten-is-a-limitation same video",
    "artifact": "state-protocols"
  },
  {
    "id": "ui-quotes-0",
    "text": "one thing that I heard from Tony Robbins years ago is that the strongest force in the human personality is the need to remain consistent with how we define ourselves",
    "videoId": "wnsM113Lqzs",
    "context": "ui-quote source: The strongest force in the human personality is the need to stay consistent with",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-1",
    "text": "if my brain comes up with nothing I push myself and I say okay well what could I be happy about or if I was happy what would that be",
    "videoId": "PliFBr__T7Y",
    "context": "ui-quote source: What COULD I be happy about?",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-2",
    "text": "what can I do to enhance this area of my life what can I do and improve that area in my life",
    "videoId": "wqJ-2N5KVOU",
    "context": "ui-quote source: What can I do to level up this area of life?",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-3",
    "text": "ask yourself what are my values need to be to create the life that I want",
    "videoId": "Lp_GOrM16Xc",
    "context": "ui-quote source: What do my values NEED to be to create the life I want?",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-4",
    "text": "all emotions and thoughts are temporary when you just watch and you observe them they fade away they dissipate they're like clouds in the sky",
    "videoId": "bT1akeSdIIM",
    "context": "ui-quote source: All temptations are temporary — like clouds.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-5",
    "text": "anytime along the journey you're not motivated you're discouraged you're frustrated all you got to do is just remind yourself why do i want this",
    "videoId": "ZywgvFSnH38",
    "context": "ui-quote source: Anytime you're not motivated — remind yourself: why do I want this?",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-6",
    "text": "the truth is that balance doesn't really exist it's impossible to be completely balanced um I never go for balance I go for progress",
    "videoId": "8kco2rjijjE",
    "context": "ui-quote source: Balance doesn't exist — rebalance, rebalance, rebalance.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-7",
    "text": "you don't want to get to the point where something as a three out of ten or a one or a zero but you can catch it by being proactive anticipating it in advance and checking in on a more regular basis",
    "videoId": "wqJ-2N5KVOU",
    "context": "ui-quote source: Catch it early — so nothing ever gets to a three.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-8",
    "text": "that's why changing the behavior is not enough unless you change their identity and beliefs about who you are",
    "videoId": "8kco2rjijjE",
    "context": "ui-quote source: Changing the behavior is not enough unless you change the identity.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-9",
    "text": "at the end of the day I can look at my day and ask myself did I achieve my outcomes yes great that was an awesome day I made progress",
    "videoId": "mDHWi92v9X8",
    "context": "ui-quote source: Did I achieve my outcomes? Then it was an awesome day.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-10",
    "text": "don't be hard on yourself, okay? Um the the the being hard on yourself part is more for the end of this video ... don't be too hard on yourself. This is a time of celebration",
    "videoId": "zuEb-1Ll2h8",
    "context": "ui-quote source: Don't be hard on yourself — that part comes at the end. This is a time of celebr",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-11",
    "text": "now I happily achieve instead of achieving to be happy",
    "videoId": "OgRGJBpTOeU",
    "context": "ui-quote source: Happily achieve, instead of achieving to be happy.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-12",
    "text": "how you start the day is how you end the day",
    "videoId": "PliFBr__T7Y",
    "context": "ui-quote source: How you start the day is how you end the day.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-13",
    "text": "I don't go about the day hoping that it's going to be a good day okay I don't hope I demand it",
    "videoId": "PliFBr__T7Y",
    "context": "ui-quote source: I don't hope it's going to be a good day — I demand it.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-14",
    "text": "I go all in fully committing myself by deciding to do whatever it takes to achieve my dreams",
    "videoId": "Kf6aFwzozM0",
    "context": "ui-quote source: I go all in, fully committing myself by deciding to do whatever it takes.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-15",
    "text": "imagine as if there's no limits if a magician were able to come along and create the perfect life for you what would that be",
    "videoId": "8kco2rjijjE",
    "context": "ui-quote source: If a magician could create the perfect life for you — what would that be?",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-16",
    "text": "having a timeline when are you going to achieve this goal by what's the date what's the deadline if you don't have a deadline most often people don't take any action",
    "videoId": "ZywgvFSnH38",
    "context": "ui-quote source: If you don't have the timeline, it's really just a dream.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-17",
    "text": "if you're honest with yourself in terms of where you want to be what your ten would be where would you measure yourself right now",
    "videoId": "wqJ-2N5KVOU",
    "context": "ui-quote source: If you don't know what your 10 is, how are you going to measure?",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-18",
    "text": "a lot of people they mistaken activity with achievement",
    "videoId": "ZywgvFSnH38",
    "context": "ui-quote source: People mistake activity with achievement.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-19",
    "text": "repetition is the mother of mastery ... praise is the father of mastery and whatever gets rewarded gets repeated",
    "videoId": "Kf6aFwzozM0",
    "context": "ui-quote source: Repetition is the mother of mastery… praise is the father of mastery.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-20",
    "text": "setting goals is the easy part anybody can easily set goals ... the hard part is actually following through on that and more importantly checking in on a regular basis to make sure that you're measuring yourself",
    "videoId": "IqCvSF0NHRs",
    "context": "ui-quote source: Setting goals is the easy part. The hard part is checking in and measuring regul",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-21",
    "text": "your short-term goals you want them to be attainable your long-term goals you want them to be unrealistic",
    "videoId": "ZywgvFSnH38",
    "context": "ui-quote source: Short-term goals attainable; long-term goals unrealistic.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-22",
    "text": "the reasons are the fuel for the fire the more reasons the more motivated you'll be",
    "videoId": "ZywgvFSnH38",
    "context": "ui-quote source: The reasons are the fuel for the fire.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-23",
    "text": "to break a habit you must make a habit ... you've got to replace this bad habit with something new",
    "videoId": "AFgeREfiDgw",
    "context": "ui-quote source: To break a habit, you must make a habit.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-24",
    "text": "what do my values need to be in order to create the life that I want",
    "videoId": "Lp_GOrM16Xc",
    "context": "ui-quote source: What do my values need to be in order to create the life that I want?",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-25",
    "text": "I'm always rewarding myself throughout the day cuz whatever gets rewarded gets repeated",
    "videoId": "OgRGJBpTOeU",
    "context": "ui-quote source: Whatever gets rewarded gets repeated.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-26",
    "text": "whatever you attach the words I am to is what you become",
    "videoId": "Wr2SPFgW8iY",
    "context": "ui-quote source: Whatever you attach the words 'I AM' to is what you become.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-27",
    "text": "the principles of success they transfer to every other area of your life when you're successful one area of your life it translates",
    "videoId": "oLQiUIJ7PsQ",
    "context": "ui-quote source: Which area, by conquering it, simultaneously benefits all the others?",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-28",
    "text": "who says that ten has to be a limitation why can't you go to eleven why can't you go to 12 why can't you expand and go beyond",
    "videoId": "wqJ-2N5KVOU",
    "context": "ui-quote source: Who says ten has to be the limit? Why can't you go to eleven?",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-29",
    "text": "it says in the Bible that without a vision people perish",
    "videoId": "hlJYapcgKM8",
    "context": "ui-quote source: Without a vision, people perish.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-30",
    "text": "you can't build success off of failure you build success off success you get momentum from it",
    "videoId": "CGqhbXzJrG8",
    "context": "ui-quote source: You can't build success off failure — you build success off success.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-31",
    "text": "if you don't measure it you can't manage it and it doesn't get better",
    "videoId": "oLQiUIJ7PsQ",
    "context": "ui-quote source: You can't manage what you don't measure.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-32",
    "text": "does believing it serve you in your life does it empower you",
    "videoId": "3NquT3aJ-L0",
    "context": "ui-quote source: does holding it get me the life I said I want?",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-33",
    "text": "the key with this as well is really languaging it in a way that inspires you",
    "videoId": "8kco2rjijjE",
    "context": "ui-quote source: language it in a way that inspires you.",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-34",
    "text": "on a scale from zero to ten what would i rate myself in each aspect of my life ... 10 being where i want to be",
    "videoId": "QZjdmXreWd0",
    "context": "ui-quote source: where am I, 1-10, against my ideal?",
    "artifact": "ui-quotes"
  },
  {
    "id": "ui-quotes-35",
    "text": "I'd focus on how I'm not good enough or you know why this always happen to me",
    "videoId": "iaihRQhG-5Y",
    "context": "ui-quote source: why does this always happen to me?",
    "artifact": "ui-quotes"
  }
]
