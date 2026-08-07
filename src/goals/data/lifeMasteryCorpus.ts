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
    "id": "belief-desire-gate-0",
    "text": "so you know whatever amount for you that is uh realistic and attainable for you that's the most important thing that you have that 78 n 10 level of belief and that desire for it that's the that that's a sweet spot that you want to focus on",
    "videoId": "GXhPOncX8CA",
    "context": "the DUAL gate: belief AND desire both around 7-8 out of 10 (ASR renders 'seven-eight in ten' as '78 n 10'); paired with sizing the goal so it stays realistic and attainable",
    "artifact": "belief-desire-gate"
  },
  {
    "id": "your-ten-zero-0",
    "text": "but what is the ten for you and then what is a zero for you but I want you to ask yourself as a measurement on a scale from zero to ten where are you right now in your life where would you rate yourself be honest with yourself this is just for you not for me or anyone else",
    "videoId": "wqJ-2N5KVOU",
    "context": "defines BOTH ends of the per-area scale in one breath, then asks for today's rating; re-verified at source 2026-08-03 with a whitespace-insensitive search after two prior deletions caused by a plain grep against hard-wrapped transcripts",
    "artifact": "your-ten-zero"
  },
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
    "id": "phase2-dating-1",
    "text": "I don't agree with what the book teaches, it's not a good book in terms of learning actually how to pick up women because it basically teaches these techniques and routines and lines and openers and basically ways that you can put women down and deceive them and all this sort of stuff that I do not agree with or endorse in any way.",
    "videoId": "CQ8m5o_QH-g",
    "context": " Caveat worth surfacing to the product owner: he consistently distances himself from The Game -style tactics while keeping the practice. CQ8m5o_QH-g : \"I don't agree with what the book teaches, it's not a good book in terms of learning actually how to pick up women because it basically teaches these",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-2",
    "text": "How to overcome shyness and social anxiety.",
    "videoId": "wnsM113Lqzs",
    "context": " wnsM113Lqzs — \"How to overcome shyness and social anxiety.\" The same method, with the transition-to-conversation lines spelled out. ",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-4",
    "text": "I'd meet people because I was single at the time I'd try to talk to girls on the bus and the bus stop and everything",
    "videoId": "eEQFj4Zoijs",
    "context": " eEQFj4Zoijs : \"I'd meet people because I was single at the time I'd try to talk to girls on the bus and the bus stop and everything\"",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-5",
    "text": "going on the street time during the daytime and approaching women and feast my fears and getting rejected and and doing it again and again and again",
    "videoId": "Kzk9Daur83k",
    "context": " Kzk9Daur83k : \"going on the street time during the daytime and approaching women and feast my fears and getting rejected and and doing it again and again and again\"",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-6",
    "text": "how have you handled rejection in all areas of your life.",
    "videoId": "pgq5MbkmXuM",
    "context": " pgq5MbkmXuM — the fullest treatment. Question asked: \"how have you handled rejection in all areas of your life.\" ",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-7",
    "text": "I overcame my fear to approach women I overcame my fear of rejection and became **desensitized** to that and this unreactive",
    "videoId": "Tug0HU0q8qg",
    "context": " Tug0HU0q8qg : \"I overcame my fear to approach women I overcame my fear of rejection and became desensitized to that and this unreactive\"",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-8",
    "text": "**every woman that i approached that rejected me was actually giving me a gift**. it was actually giving me an opportunity to work on myself... to be indifferent to what people think about me to be a more confident man",
    "videoId": "xVfwDgP2EGM",
    "context": " xVfwDgP2EGM : \" every woman that i approached that rejected me was actually giving me a gift . it was actually giving me an opportunity to work on myself... to be indifferent to what people think about me to be a more confident man\"",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-9",
    "text": "How to overcome fear",
    "videoId": "mxl2l-QBD0s",
    "context": " mxl2l-QBD0s (\"How to overcome fear\") — the confidence-state exercise, applied to approaching:",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-10",
    "text": "I actually did public speaking classes, **not to be a public speaker**, but because I wanted to improve my ability to speak and communicate... I went to Toast Masters... every single week",
    "videoId": "NidJpDcCkQs",
    "context": "- Toastmasters / public speaking classes. NidJpDcCkQs : \"I actually did public speaking classes, not to be a public speaker , but because I wanted to improve my ability to speak and communicate... I went to Toast Masters... every single week\"",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-11",
    "text": "I remember actually specifically joining these acting classes... it's called **Acting for the Terrified**. It was like acting classes specifically for people that were scared and had anxiety.",
    "videoId": "wnsM113Lqzs",
    "context": "- Improv / acting classes. wnsM113Lqzs : \"I remember actually specifically joining these acting classes... it's called Acting for the Terrified . It was like acting classes specifically for people that were scared and had anxiety.\" (Honest detail: \"I did it for 3 sessions. The fourth session, I didn",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-12",
    "text": "I did it for 3 sessions. The fourth session, I didn't show up. I had so much anxiety... but I made progress.",
    "videoId": "wnsM113Lqzs",
    "context": "- Improv / acting classes. wnsM113Lqzs : \"I remember actually specifically joining these acting classes... it's called Acting for the Terrified . It was like acting classes specifically for people that were scared and had anxiety.\" (Honest detail: \"I did it for 3 sessions. The fourth session, I didn",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-13",
    "text": "I really struggled projecting my voice and the music was always very loud... one thing I hated is I always had to lean in and when you're leaning in... you're supplicating to that person, you're communicating lower status.",
    "videoId": "Wr2SPFgW8iY",
    "context": "- Voice work. Wr2SPFgW8iY / BOiKOInznkI : bought Roger Love's Set Your Voice Free , did vocal exercises in the car commuting, later hired Love. Reason: \"I really struggled projecting my voice and the music was always very loud... one thing I hated is I always had to lean in and when you're leaning i",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-15",
    "text": "**what kind of person do I need to become for them to pursue me?**",
    "videoId": "xTWuLHNc6aM",
    "context": " xTWuLHNc6aM — 7-step \"attract quality people\" process (framed for people generally, structurally identical to his partner formula): 1) define who you want to attract (make a list, get specific on qualities), 2) define who you need to become to attract them — \" what kind of person do I need to becom",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-16",
    "text": "**put yourself in environments where you can automatically attract the people that you want**... ask yourself **where do they go, where do they spend their time**",
    "videoId": "xTWuLHNc6aM",
    "context": " xTWuLHNc6aM — 7-step \"attract quality people\" process (framed for people generally, structurally identical to his partner formula): 1) define who you want to attract (make a list, get specific on qualities), 2) define who you need to become to attract them — \" what kind of person do I need to becom",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-17",
    "text": "the biggest pain point that I had when I was 17 was I was shy and I wanted a girlfriend and I wanted to have friends in my life. I didn't care about money... I went to three different high schools and I was always the outsider and I got addicted to video games and so I would escape reality... that made me very antisocial because I missed out on my social development.",
    "videoId": "Tug0HU0q8qg",
    "context": "- The starting point. Tug0HU0q8qg : \"the biggest pain point that I had when I was 17 was I was shy and I wanted a girlfriend and I wanted to have friends in my life. I didn't care about money... I went to three different high schools and I was always the outsider and I got addicted to video games an",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-19",
    "text": "I was so terrified to talk to a girl right and when you're 17 years old that was the goal that I had",
    "videoId": "I3RzLalRjkM",
    "context": "- I3RzLalRjkM : \"I was so terrified to talk to a girl right and when you're 17 years old that was the goal that I had\"",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-20",
    "text": "**there could be a woman right next to me smiling and waving at me and I'd be too shy and terrified to even say anything to her** — that's how shy I was",
    "videoId": "Wr2SPFgW8iY",
    "context": "- Wr2SPFgW8iY : \" there could be a woman right next to me smiling and waving at me and I'd be too shy and terrified to even say anything to her — that's how shy I was\"",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-21",
    "text": "I started off as a dating coach because that was the area of my life that I struggled with and **I was shy I was lonely I was insecure I was depressed**",
    "videoId": "XsRtptiQwyQ",
    "context": "- XsRtptiQwyQ : \"I started off as a dating coach because that was the area of my life that I struggled with and I was shy I was lonely I was insecure I was depressed \"",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-22",
    "text": "**I couldn't get a girlfriend I couldn't get a date I didn't have any friends** and I had depression, a lot of issues growing up... I was terrified to talk to girls so I forced myself to go out and figure that out and force myself to **overcome that approach anxiety**",
    "videoId": "MYitqG6HgBc",
    "context": "- MYitqG6HgBc : \" I couldn't get a girlfriend I couldn't get a date I didn't have any friends and I had depression, a lot of issues growing up... I was terrified to talk to girls so I forced myself to go out and figure that out and force myself to overcome that approach anxiety \"",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-23",
    "text": "Specifically because **I got hurt by this girl** and I went through a lot of pain with that, I realized I'm going to make my focus improving myself... I discovered David DeAngelo. He had a great eBook called Double Your Dating. **I read this book like 20 times.** I kid you not. I printed out the eBook.",
    "videoId": "9tXhLNIuUrI",
    "context": "- 9tXhLNIuUrI : \"Specifically because I got hurt by this girl and I went through a lot of pain with that, I realized I'm going to make my focus improving myself... I discovered David DeAngelo. He had a great eBook called Double Your Dating. I read this book like 20 times. I kid you not. I printed ou",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-25",
    "text": "I used to do these **free seminars in Vancouver**, we'd advertise them on Craigslist and meetup.com, they're called the **dating mastery seminars**, we did them every two weeks and they're free and then I'd sell people on a **three-day boot camp** where they actually take men out into nightclubs, bars, the mall and actually help them approach women",
    "videoId": "Wr2SPFgW8iY",
    "context": "- Wr2SPFgW8iY : \"I used to do these free seminars in Vancouver , we'd advertise them on Craigslist and meetup.com, they're called the dating mastery seminars , we did them every two weeks and they're free and then I'd sell people on a three-day boot camp where they actually take men out into nightcl",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-26",
    "text": "I eventually **wrote a book on dating advice for men**",
    "videoId": "MYitqG6HgBc",
    "context": "- MYitqG6HgBc : \"I eventually wrote a book on dating advice for men \"",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-27",
    "text": "**we met through an online dating app** so that's the short story.",
    "videoId": "cU96A9Pi7Ms",
    "context": "- How he met his wife. cU96A9Pi7Ms (Tatiana speaking): \" we met through an online dating app so that's the short story.\" Corroborated by xVfwDgP2EGM (Tatiana): \"I literally showed up downtown... I never ever come to his area where he lives and I just happened to be there and I was the one who reache",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-29",
    "text": "a lot of how I am today and how I communicate is because of those days... I learned how to speak on my feet... which is part of what I do today.",
    "videoId": "Tug0HU0q8qg",
    "context": "- What he says it gave him. Tug0HU0q8qg : \"a lot of how I am today and how I communicate is because of those days... I learned how to speak on my feet... which is part of what I do today.\" jZO8pey7TKE : it put him around mentors 10-20 years older. iVopRAfH1Aw : \"I was also terrified to approach wome",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-31",
    "text": "this has been an area of my life that I feel **I've really mastered**... it's one of the areas of my life that I initially started to master when I was as young as 17 years old because that was the area in my life that created the most pain for me was **being alone and being single**... I've developed a lot of great content that I used to teach and coach in that area and **I want to share that with you guys**.",
    "videoId": "jCemE9klMVM",
    "context": "- His current stance. jCemE9klMVM : \"this has been an area of my life that I feel I've really mastered ... it's one of the areas of my life that I initially started to master when I was as young as 17 years old because that was the area in my life that created the most pain for me was being alone an",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-33",
    "text": "Who do I need to become in order to attract this?",
    "videoId": "xVfwDgP2EGM",
    "context": " 2. Ship the clarity journal as the first task. From xVfwDgP2EGM + ZywgvFSnH38 : \"take out a journal and get clarity on exactly who you want... physical appearance, character traits, personality traits, interests and hobbies,\" then mark non-negotiables . Second field, on the same screen: \"Who do I n",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-34",
    "text": "you don't have to get everything in place before you show up",
    "videoId": "WgtMvtm5rhY",
    "context": "Gate progression on reps, not on feeling ready (\"you don't have to get everything in place before you show up\" — WgtMvtm5rhY ).",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-35",
    "text": "if you can do that 10 times a day",
    "videoId": "5ITfL1jNAsM",
    "context": " 4. The default rep target is his, not ours: 10/day, 4 days a week. 5ITfL1jNAsM : \"if you can do that 10 times a day\"; Wr2SPFgW8iY / ZywgvFSnH38 / NidJpDcCkQs : \"four days a week.\" Venues he names: mall, coffee shop, busy street, bookstore, grocery store, bus stop, festivals, meetups, nightlife. ",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-37",
    "text": "what did I do that made her feel that way?",
    "videoId": "Wr2SPFgW8iY",
    "context": " 6. The post-approach journal is the killer product mechanic and it's verbatim his. Wr2SPFgW8iY : after every session he logged what happened in every interaction, what I could have done better, my body language, eye contact, vocal tone and asked \"what did I do that made her feel that way?\" — that i",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-38",
    "text": "whatever gets rewarded gets repeated... pat yourself on the back... instead of beating yourself up because you weren't perfect.",
    "videoId": "w9SuU6cgqVQ",
    "context": " 7. Reward the rep, not the outcome. w9SuU6cgqVQ : \"whatever gets rewarded gets repeated... pat yourself on the back... instead of beating yourself up because you weren't perfect.\" The streak/celebration UI should fire on approach made , never on number obtained .",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-39",
    "text": "There's no rejection, there's only feedback.",
    "videoId": "pgq5MbkmXuM",
    "context": "- \"There's no rejection, there's only feedback.\" ( pgq5MbkmXuM )",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-40",
    "text": "Nobody can really reject you — nobody knows you enough to really reject you.",
    "videoId": "pgq5MbkmXuM",
    "context": "- \"Nobody can really reject you — nobody knows you enough to really reject you.\" ( pgq5MbkmXuM )",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-41",
    "text": "It just means that *that approach* didn't work.",
    "videoId": "pgq5MbkmXuM",
    "context": "- \"It just means that that approach didn't work.\" ( pgq5MbkmXuM )",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-42",
    "text": "At least I did my job.",
    "videoId": "WgtMvtm5rhY",
    "context": "- \"At least I did my job.\" / \"I'm a student of life.\" ( WgtMvtm5rhY )",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-43",
    "text": "I'm a student of life.",
    "videoId": "WgtMvtm5rhY",
    "context": "- \"At least I did my job.\" / \"I'm a student of life.\" ( WgtMvtm5rhY )",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-44",
    "text": "made me more attractive",
    "videoId": "5e7XxjyCwQU",
    "context": " 9. Surround the dating goal with the adjacent goals he actually prescribes , so the plan isn't approach-only: Toastmasters/public speaking (weekly), improv or acting class, voice projection practice, gym/martial arts ( 5e7XxjyCwQU : Muay Thai \"made me more attractive\"), grooming/fashion/haircut rit",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-45",
    "text": "they'll have to shift their lifestyle and their comfort zone... I can't play World of Warcraft all weekend",
    "videoId": "WgtMvtm5rhY",
    "context": " 10. Name the real resistance early. Zan's \"fear of success\" passage ( WgtMvtm5rhY ) — \"they'll have to shift their lifestyle and their comfort zone... I can't play World of Warcraft all weekend\" — pairs with Stefan's own video-game-addiction origin ( 9tXhLNIuUrI , Tug0HU0q8qg , mxl2l-QBD0s ). For a",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-47",
    "text": "How to overcome shyness and social anxiety",
    "videoId": "wnsM113Lqzs",
    "context": " wnsM113Lqzs \"How to overcome shyness and social anxiety\" highest — compliment script + conversation transition + rejection ",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-55",
    "text": "we met through an online dating app",
    "videoId": "cU96A9Pi7Ms",
    "context": " cU96A9Pi7Ms live w/ Tatiana low — \"we met through an online dating app\" ",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-dating-56",
    "text": "got hurt by this girl",
    "videoId": "9tXhLNIuUrI",
    "context": " 9tXhLNIuUrI video game addiction low — Double Your Dating origin, \"got hurt by this girl\" ",
    "artifact": "phase2-dating"
  },
  {
    "id": "phase2-exemplar-0",
    "text": "health is a very important component of that important component of my vision of my amazing life I want to make sure that I have the energy the Vitality I want to make sure that I can live for a long time I want to live to over a 100 years old you know that's my goal and make sure that I have tons of energy and I look young I look fit I look incredible at that age",
    "videoId": "Kz83kMosOWU",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-1",
    "text": "to live to be 100 to stay young healthy and vibrant",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-2",
    "text": "my physical body to be my ultimate vision is to be 190 lbs to 8% body fat to be vital healthy strong athletic taned ripped and energetic to look in the mirror and smile and feel proud feel outstanding sexy have high self-esteem feel confident um to be an inspiration to others",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-3",
    "text": "i'm physically active and fit weighing 170 pounds at six percent body fat with unstoppable energy",
    "videoId": "PPlaK8y4PzA",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-4",
    "text": "my health and fitness purpose is to be outstanding to be an inspiration to others to be sexy a total 10 um to be attracted more confident non-stop energy to live to be 100 to stay young healthy and vibrant to look in the mirror and feel proud",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-5",
    "text": "for my fitness I have I'm an Adonis I'm a Greek god I'm Greek by the way uh world class athlete fitness model shredded Stefan lean mean F burning machine a manifestation of vibrant health and energy I'm an energy Dynamo a peak performer an Exemplar of physical vitality and strength",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-6",
    "text": "your mindset your mentality your thoughts your belief system that's important as well that's a separate area of life and this influen your your emotions",
    "videoId": "Kz83kMosOWU",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-7",
    "text": "Mind and emotions ... for me, the 10 that I desire and I'm after is high levels of happiness, and joy, and freedom, and peace, and gratitude. If I were to be honest where I am right now, I'd say about an eight out of 10.",
    "videoId": "I-SoCQvNi9A",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-8",
    "text": "my ultimate Vision emotionally to every day feel happy grateful proud loving loved excited passionate present committed ecstasy uh confident outgoing social strong determined motivated inspired adequate attractive certain significant balance centered energized fulfilled silly playful outrageous fun worthy at a level of 9 or 10 to wake up each day excited jumping out of bed and enjoying the process of the day",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-9",
    "text": "i'm a master of my emotions consistently experiencing peak levels of emotional juice and vitality happiness joy laughter fun passion gratitude peace certainty adventure aliveness and fulfillment",
    "videoId": "PPlaK8y4PzA",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-10",
    "text": "my emotions to have a deeper sense of meaning in my life to experience life to the fullest I really enjoy the journey and process of life",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-11",
    "text": "I've got unstoppable emotions Unstoppable confidence a beacon of Joy full of fulfillment uh vibrant happiness and ecstasy",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-12",
    "text": "credible relationships to be an amazing passionate loving honest exciting fulfilling fun committed extraordinary relationship uh with the woman of my dreams my total 10 my soulmate a beautiful incredible woman to attract and be the woman that I'll spend my life with start a family with and stay committed to forever",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-13",
    "text": "i have an incredibly loving beautiful wife that i have a passionate love affair with that is growing every day",
    "videoId": "PPlaK8y4PzA",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-14",
    "text": "my relationships what's the reason that I have for having an amazing relationship be able to share my life with someone to have more fun and excitement to be able be in love uh intimacy connection someone to travel with",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-15",
    "text": "Spirituality, I've got as a seven.",
    "videoId": "I-SoCQvNi9A",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-16",
    "text": "I want my ultimate vision is I want to have products and services in every area of life I want to have more products and services on how to become more free in your life how to build online businesses and make passive income on how to be healthier",
    "videoId": "jTVs9IbF8L0",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-17",
    "text": "just magic moments fulfillment to live life on my terms and to never settle for less than I can be do uh create or give to be happy for fun for growth progress connection love significance",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-18",
    "text": "for my coaching business ... I'm world class coach I'm a facilitator of change I'm a Force for good a force for God I'm an agent of transformation I'm a leader called upon by leaders a Mr solution instant uh change artist a developer of the human Spirit I'm an architect of change",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-19",
    "text": "to have live in total abundance Financial Freedom I have this is my vision again uh to be making $2 million a year and I'm very specific about this as well which is really key but $2 million a year $163,000 a month $5,400 a day uh income with 90% of it being earned through passive income which is internet marketing businesses real estate and Investments to have a net worth of $10 million",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-20",
    "text": "I want to build a business and be earning $10 million",
    "videoId": "I-SoCQvNi9A",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-21",
    "text": "financially live the life of my dreams be fun never settle live life fully do what I want when I want",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-22",
    "text": "extraordinary investor financial genius smart saver wealth Creator strategist uh marketer a creator of the good life creator of Fortune a millionaire",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-23",
    "text": "my family life you know to be totally connected with and in regular communication each member of my family several times a week having fun supporting each other sharing magic moments in our lives to go on a family vacation every year",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-24",
    "text": "i have an extraordinary family life with two children that i have give unconditional love to and help shape them to incredible human beings",
    "videoId": "PPlaK8y4PzA",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-25",
    "text": "My family, I put at a six out of 10 ... I travel a lot and sometimes I miss some family holidays ... I don't always make it to my nieces' and my nephews' birthday",
    "videoId": "I-SoCQvNi9A",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-26",
    "text": "extraordinary friendships you know the people that I want to surround myself people that support me inspire me that make me feel good you know we challenge each other people that I travel with have fun with",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-27",
    "text": "i have extraordinary friendships with friends that i'm constantly growing with that are supportive fun successful leaders and givers that i'm sharing my experience of life with",
    "videoId": "PPlaK8y4PzA",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-28",
    "text": "my lifestyle consists of total freedom to travel which includes a fun adventurous vacation every three months while enjoying a full three months immersed in a new part of the world every year",
    "videoId": "PPlaK8y4PzA",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-29",
    "text": "I realized man I'm crushing it in all different areas of my life my business my health my relationship my friends and family is great but that doesn't guarantee that you're having fun",
    "videoId": "Kz83kMosOWU",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-30",
    "text": "i'm a philanthropist and a force for good that's dedicated to helping those in need with areas that i'm committed to serving in especially having funded and built over a hundred houses for those that are suffering from poverty and 30 schools for children in need of proper education",
    "videoId": "PPlaK8y4PzA",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-31",
    "text": "what would happen if I added contribution to an area of my life where I'm giving not to get I'm giving out of just pure being selfless making an impact making a difference empowering people in the world that I they don't even know who I am they can't give me anything back but it's just pure service to others",
    "videoId": "Kz83kMosOWU",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-32",
    "text": "my spiritual you know vision is uh be spiritually connected to God the universe nature myself and all beings around me while feeling centered and at peace growing and evolving my spirit and humbly serving my Creator by living my purpose each and every day",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-33",
    "text": "i am a force for god i have a deep everlasting spiritual connection with god and my creator i am living my destiny",
    "videoId": "PPlaK8y4PzA",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-34",
    "text": "Spirituality, I've got as a seven. For me, my spirituality is my connection with God ... I've got an amazing relationship with God. I communicate everyday but I want to go deeper.",
    "videoId": "I-SoCQvNi9A",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-35",
    "text": "my purpose ... is uh to humbly serve God by being a powerful and passionate example of the unlimited possibilities that life offers to any of us the moment we acknowledge and rejoice in our Creator's gifts to sincerely love and serve in all his Creations to live life to the fullest",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-36",
    "text": "I Stefan see, know, hear and feel that the purpose of my life is to be even more fully alive, grow and make a difference in the lives of others",
    "videoId": "fICEjqpKfoY",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-37",
    "text": "How can I appreciate and enjoy my life even more, while feeling even more fully alive and growing and making a difference in the lives of others?",
    "videoId": "PPlaK8y4PzA",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-38",
    "text": "the strongest force in the human personality is the need to be consistent with how we Define ourselves",
    "videoId": "8kco2rjijjE",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-exemplar-39",
    "text": "I'm proud to say I achieved maybe 90% of my goals year after year, but there's still 10% that under certain circumstances or whatever I'm not achieving them for",
    "videoId": "zuEb-1Ll2h8",
    "context": "worked exemplar — his own plan, rendered in the guided build",
    "artifact": "phase2-exemplar"
  },
  {
    "id": "phase2-goals-1",
    "text": "get the most out of next year",
    "videoId": "JZnLIuW7NQw",
    "context": "- JZnLIuW7NQw — Life Mastery Accelerator session: \"get the most out of next year\"",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-2",
    "text": "How To Manage Your Life",
    "videoId": "8kco2rjijjE",
    "context": "- 8kco2rjijjE — \"How To Manage Your Life\" (contains the 1yr→90day→30day chunking)",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-3",
    "text": "I just use Evernote so I use Evernote to track my goals ... it's basically an online Journal I preferred using Evernote rather than uh you know pen and paper",
    "videoId": "F0ToFPMcIqI",
    "context": " \"I just use Evernote so I use Evernote to track my goals ... it's basically an online Journal I preferred using Evernote rather than uh you know pen and paper\" — F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-4",
    "text": "I'm going to go through each of the goals that I have there's over 50 goals",
    "videoId": "F0ToFPMcIqI",
    "context": " \"I'm going to go through each of the goals that I have there's over 50 goals\" — F0ToFPMcIqI (2017)",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-5",
    "text": "even just for 2018 alone I have over 40 at 40 or 41 business goals ... a lot of the goals that I set on my blog and YouTube channel that I publicly share that's not the full picture",
    "videoId": "2fDYApReHWc",
    "context": " \"even just for 2018 alone I have over 40 at 40 or 41 business goals ... a lot of the goals that I set on my blog and YouTube channel that I publicly share that's not the full picture\" — 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-6",
    "text": "I'm proud to say I achieved maybe 90% of my goals year after year, but there's still 10% that under certain circumstances or whatever I'm not achieving them for",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"I'm proud to say I achieved maybe 90% of my goals year after year, but there's still 10% that under certain circumstances or whatever I'm not achieving them for\" — zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-7",
    "text": "it's not that your goals you necessarily achieve every one of them every year i never do i'd say i may be achieve 80 to 90 of the goals that i do set",
    "videoId": "JZnLIuW7NQw",
    "context": " \"it's not that your goals you necessarily achieve every one of them every year i never do i'd say i may be achieve 80 to 90 of the goals that i do set\" — JZnLIuW7NQw ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-8",
    "text": "I'll easily make at least $1 million (which is $84,000 per month) by December 31st, 2015",
    "videoId": "tYCT57Onfas",
    "context": " 2015 Financial (illustrative in the workshop) \"I'll easily make at least $1 million (which is $84,000 per month) by December 31st, 2015\" stated as the target while \"currently in 2014 I've been making about $70,000 per month\" tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-9",
    "text": "currently in 2014 I've been making about $70,000 per month",
    "videoId": "tYCT57Onfas",
    "context": " 2015 Financial (illustrative in the workshop) \"I'll easily make at least $1 million (which is $84,000 per month) by December 31st, 2015\" stated as the target while \"currently in 2014 I've been making about $70,000 per month\" tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-10",
    "text": "I will easily weigh 160 pounds and be at 8% body fat while having unstoppable levels of energy by December 31st, 2015",
    "videoId": "tYCT57Onfas",
    "context": " 2015 Body \"I will easily weigh 160 pounds and be at 8% body fat while having unstoppable levels of energy by December 31st, 2015\" NOT FOUND (given as the worked example) tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-11",
    "text": "I will easily raise $10,000 and build a school in Ecuador by March 30th, 2015",
    "videoId": "tYCT57Onfas",
    "context": " 2015 Contribution \"I will easily raise $10,000 and build a school in Ecuador by March 30th, 2015\" NOT FOUND tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-12",
    "text": "I will easily do my morning ritual five days a week for at least 10 minutes and experience peak levels of joy, happiness, excitement, peace, love, passion at levels 8, 9 or 10 by December 31st, 2015",
    "videoId": "tYCT57Onfas",
    "context": " 2015 Emotional \"I will easily do my morning ritual five days a week for at least 10 minutes and experience peak levels of joy, happiness, excitement, peace, love, passion at levels 8, 9 or 10 by December 31st, 2015\" NOT FOUND tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-13",
    "text": "The year before, um, in 2015, I did 1.5 million.",
    "videoId": "zuEb-1Ll2h8",
    "context": " 2015 Financial (actual) — \"The year before, um, in 2015, I did 1.5 million.\" zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-14",
    "text": "I'll easily make two million dollars in revenue by December 31st 2016",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Financial \"I'll easily make two million dollars in revenue by December 31st 2016\" MISSED by ~$40k — \"The total number that I calculated was $1,960,236 ... about $40,000 short of my goal of $2 million\" (adds: \"it actually might be more. I might have actually achieved this goal. I don't really k",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-17",
    "text": "I'll easily have a 1.5 million dollar investment portfolio by December 31st 2016",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Investing \"I'll easily have a 1.5 million dollar investment portfolio by December 31st 2016\" HIT early — \"I achieved that goal back in August but right now my investment portfolio's around 1.6 million dollars\"; year-end \"grew my stock investment portfolio to over $2 million Canadian\", \"$1.2 mi",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-18",
    "text": "I achieved that goal back in August but right now my investment portfolio's around 1.6 million dollars",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Investing \"I'll easily have a 1.5 million dollar investment portfolio by December 31st 2016\" HIT early — \"I achieved that goal back in August but right now my investment portfolio's around 1.6 million dollars\"; year-end \"grew my stock investment portfolio to over $2 million Canadian\", \"$1.2 mi",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-21",
    "text": "I'll easily explore buying any real estate property by December 31st 2016 and if the opportunity's right close the deal",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Investing \"I'll easily explore buying any real estate property by December 31st 2016 and if the opportunity's right close the deal\" NOT DONE — \"it doesn't look like this is going to happen primarily because it's just not the right time to buy right now\" IqCvSF0NHRs ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-22",
    "text": "it doesn't look like this is going to happen primarily because it's just not the right time to buy right now",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Investing \"I'll easily explore buying any real estate property by December 31st 2016 and if the opportunity's right close the deal\" NOT DONE — \"it doesn't look like this is going to happen primarily because it's just not the right time to buy right now\" IqCvSF0NHRs ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-23",
    "text": "I'll easily have at least a hundred thousand YouTube subscribers",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Business \"I'll easily have at least a hundred thousand YouTube subscribers\" HIT in June ; ended year \"over 154,000 subscribers\", \"over 93,000 new subscribers\" IqCvSF0NHRs , zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-25",
    "text": "I'll easily have at least 100,000 Facebook fans on Stefan James",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Business \"I'll easily have at least 100,000 Facebook fans on Stefan James\" HIT back in June IqCvSF0NHRs ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-26",
    "text": "I'll easily have at least fifty thousand Instagram followers on the Project Life Mastery page",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Business \"I'll easily have at least fifty thousand Instagram followers on the Project Life Mastery page\" on track Oct (\"we're at over 47,000 ... about 3,000 short\"); HIT by year end (\"reached over 50,000 followers\") IqCvSF0NHRs , zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-29",
    "text": "I'll easily have at least 50,000 email subscribers by December 31st",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Business \"I'll easily have at least 50,000 email subscribers by December 31st\" BLOWN PAST — \"I built my email list to over 110,000 subscribers ... I remember my goal for 2016 was like 50,000\" IqCvSF0NHRs , zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-31",
    "text": "I'll easily reach and impact at least 3 million people on YouTube and have 6.5 million views on Project Life Mastery YouTube channel",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Business \"I'll easily reach and impact at least 3 million people on YouTube and have 6.5 million views on Project Life Mastery YouTube channel\" HIT back in August ; ended \"over 5.3 million views\" (his stated year-total differs from the mid-year claim — both appear) IqCvSF0NHRs , zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-37",
    "text": "I'll easily launch K Optimizer 2.0 to help Kindle publishers grow their business",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Business \"I'll easily launch K Optimizer 2.0 to help Kindle publishers grow their business\" ACHIEVED IqCvSF0NHRs ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-38",
    "text": "I'll easily create/launch a new free course",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Business \"I'll easily create/launch a new free course\" ACHIEVED — the \"seven online business models that made me an internet millionaire\" IqCvSF0NHRs , zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-40",
    "text": "I'll easily launch two new Amazon products by using the Amazing Selling Machine",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Business \"I'll easily launch two new Amazon products by using the Amazing Selling Machine\" partial in Oct (\"my second product is actually going to be launched this month in November\"); year-end \"I launched three new Amazon products through Lifemastery Nutrition\" IqCvSF0NHRs , zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-41",
    "text": "my second product is actually going to be launched this month in November",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Business \"I'll easily launch two new Amazon products by using the Amazing Selling Machine\" partial in Oct (\"my second product is actually going to be launched this month in November\"); year-end \"I launched three new Amazon products through Lifemastery Nutrition\" IqCvSF0NHRs , zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-44",
    "text": "hire an SEO person",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Business \"I'll easily hire someone to run my Amazon business part-time\" / \"hire an SEO person\" BOTH ACHIEVED back in March IqCvSF0NHRs ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-46",
    "text": "I completed a 15-day juice fast, nothing but juice for 15 days",
    "videoId": "zuEb-1Ll2h8",
    "context": " 2016 Health 15-day juice fast ACHIEVED — \"I completed a 15-day juice fast, nothing but juice for 15 days\" zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-48",
    "text": "I'll easily attend Tony Robbins Business Mastery",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Growth \"I'll easily attend Tony Robbins Business Mastery\" ACHIEVED back in August IqCvSF0NHRs ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-50",
    "text": "my Date With Destiny event is scheduled in Australia for 2017 ... wasn't able to achieve that this year",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Growth \"I'll easily attend Date With Destiny\" MISSED / rescheduled — \"my Date With Destiny event is scheduled in Australia for 2017 ... wasn't able to achieve that this year\"; cause: \"it actually got sold out by the time that I was interested in signing up\" IqCvSF0NHRs , zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-52",
    "text": "I'll easily read at least 20 books by December 31st 2016",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Mind \"I'll easily read at least 20 books by December 31st 2016\" HIT — \"I read over 23 books\" IqCvSF0NHRs , zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-54",
    "text": "I'll easily complete a 10-day silent meditation retreat with Vipassana",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Spiritual \"I'll easily complete a 10-day silent meditation retreat with Vipassana\" MISSED / rescheduled to 2017 — girlfriend's hip/tailbone injury IqCvSF0NHRs , zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-55",
    "text": "I'll easily continue to do bi-weekly journaling with Tatiana with our relationship book",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Relationship \"I'll easily continue to do bi-weekly journaling with Tatiana with our relationship book\" SLIPPING — \"we did it one time in the last month and that's something that I need to improve\" IqCvSF0NHRs ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-56",
    "text": "we did it one time in the last month and that's something that I need to improve",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Relationship \"I'll easily continue to do bi-weekly journaling with Tatiana with our relationship book\" SLIPPING — \"we did it one time in the last month and that's something that I need to improve\" IqCvSF0NHRs ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-57",
    "text": "I'll easily learn Tantra",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Relationship \"I'll easily learn Tantra\" in progress Oct; the 3-day Tantra workshop slipped to Feb 2017 IqCvSF0NHRs , zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-58",
    "text": "I'll easily build two schools with Change Heroes",
    "videoId": "IqCvSF0NHRs",
    "context": " 2016 Contribution \"I'll easily build two schools with Change Heroes\" / \"build two houses\" ACHIEVED — \"raised and contributed over $20,000 to build a school in Ethiopia\"; \"I funded and volunteered to build two houses in Nicaragua\"; also \"$10,000 to Operation Underground Railroad\" IqCvSF0NHRs , zuEb-",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-64",
    "text": "I'll easily make $2 million in revenue while impacting thousands of people's lives by December 31st 2017",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Financial \"I'll easily make $2 million in revenue while impacting thousands of people's lives by December 31st 2017\" SMASHED — \"the total amount of revenue and sales for my businesses and for my investments ... is 3.4 million dollars ... my goal was 2 million\" (CAD) F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-66",
    "text": "I'll easily have a $2.5 million stock investment portfolio by December 31st 2017",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Investing \"I'll easily have a $2.5 million stock investment portfolio by December 31st 2017\" April: $2,173,565; year-end \"I grew my holding company assets and investment portfolio to over 3.2 million Canadian\"; \"$85,000 just in dividends\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-69",
    "text": "I'll easily publish 200+ videos on the Project Life Mastery YouTube channel while impacting thousands of lives by December 31st",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Business \"I'll easily publish 200+ videos on the Project Life Mastery YouTube channel while impacting thousands of lives by December 31st\" MISSED by 2 — \"in 2017 I published 198 videos on YouTube ... that's actually two short from 200 which was the goal ... I didn't want to just kind of throw ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-71",
    "text": "I'll easily publish 200+ blog posts on projectlifemastery.com while impacting thousands of lives by December 31st",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Business \"I'll easily publish 200+ blog posts on projectlifemastery.com while impacting thousands of lives by December 31st\" HIT — \"published 243 blog posts\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-73",
    "text": "I'll easily have at least 250,000 YouTube subscribers on the Project Life Mastery channel by December 31st",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Business \"I'll easily have at least 250,000 YouTube subscribers on the Project Life Mastery channel by December 31st\" HIT — \"we gained over 256 thousand subscribers\" in the year F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-75",
    "text": "I'll easily have at least 1 million views per month on the Project Life Mastery YouTube channel",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Business \"I'll easily have at least 1 million views per month on the Project Life Mastery YouTube channel\" HIT — April was the first month (\"1,000,167 views ... it just made it by 167 views\"); year total \"12,658,000 views which was over a million views per month\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-78",
    "text": "I'll easily have at least 150,000 unique visitors per month visit projectlifemastery.com by December 31st",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Business \"I'll easily have at least 150,000 unique visitors per month visit projectlifemastery.com by December 31st\" April 119,000; year-end \"2.1 million unique visitors\" (i.e. ~175k/mo avg) F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-80",
    "text": "I'll easily host a Life Mastery Transformation seminar, love the process, help transform lives",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Business \"I'll easily host a Life Mastery Transformation seminar, love the process, help transform lives\" COMPLETED in January F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-81",
    "text": "I'll easily launch the Life Mastery Accelerator program, love the process, help people accelerate every aspect of their lives on a monthly basis",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Business \"I'll easily launch the Life Mastery Accelerator program, love the process, help people accelerate every aspect of their lives on a monthly basis\" ACHIEVED F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-84",
    "text": "haven't had a chance to dive into that yet ... scheduled for the summertime",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Business \"I'll easily launch the Life Mastery Transformation video training program\" SLIPPED — \"haven't had a chance to dive into that yet ... scheduled for the summertime\" F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-85",
    "text": "I'll easily relaunch Affiliate Marketing Mastery, help hundreds of new people build their own successful online business",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Business \"I'll easily relaunch Affiliate Marketing Mastery, help hundreds of new people build their own successful online business\" DEFERRED in April; year-end \"massively improved affiliate marketing mastery\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-87",
    "text": "I'll easily launch the Project Life Mastery merchandise by December 31st",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Business \"I'll easily launch the Project Life Mastery merchandise by December 31st\" ACHIEVED — masteryapparel.com; \"we actually decided this year to give a hundred percent of the profit to charity\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-92",
    "text": "I'll easily complete a 15-day juice fast, cleanse my body, create unstoppable energy",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Health \"I'll easily complete a 15-day juice fast, cleanse my body, create unstoppable energy\" NOT SCHEDULED as of April, considering switching to a water fast; NOT FOUND in year-review successes F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-93",
    "text": "I'll easily complete Tough Mudder in Whistler with my girlfriend Tatiana, love the process",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Health \"I'll easily complete Tough Mudder in Whistler with my girlfriend Tatiana, love the process\" ACHIEVED — \"I completed Tough Mudder in Whistler with my girlfriend Tatiana ... second time\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-95",
    "text": "I'll easily complete the Spartan Race in Vancouver and love the process",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Health \"I'll easily complete the Spartan Race in Vancouver and love the process\" scheduled June; NOT FOUND in year-review F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-97",
    "text": "I'll easily do yoga once a week, increase my flexibility and relieve tension",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Health \"I'll easily do yoga once a week, increase my flexibility and relieve tension\" SLIPPING — \"this is a goal that I've been slacking on ... I'm not BS-ing myself and saying that oh I'm stretching at the gym for five or 10 minutes and that that's yoga\" F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-98",
    "text": "this is a goal that I've been slacking on ... I'm not BS-ing myself and saying that oh I'm stretching at the gym for five or 10 minutes and that that's yoga",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Health \"I'll easily do yoga once a week, increase my flexibility and relieve tension\" SLIPPING — \"this is a goal that I've been slacking on ... I'm not BS-ing myself and saying that oh I'm stretching at the gym for five or 10 minutes and that that's yoga\" F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-100",
    "text": "I make an exception for traveling with that",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Health \"I'll easily use my PEMF mat at least once per day\" paused while travelling (\"I make an exception for traveling with that\") F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-101",
    "text": "I'll easily hire an amazing personal trainer to help me get in amazing shape ... achieve my fitness goals",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Health \"I'll easily hire an amazing personal trainer to help me get in amazing shape ... achieve my fitness goals\" ACHIEVED late — \"I hired two personal trainers ... one in Vancouver ... also hired one in California\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-103",
    "text": "I'll easily do a DEXA scan every 3 months to track my muscle mass, body fat, bone density",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Health \"I'll easily do a DEXA scan every 3 months to track my muscle mass, body fat, bone density\" MISSED (partial) — \"I did three DEXA bone density scans ... my goal was four for the year so I came up short with that as a goal\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-105",
    "text": "I'll easily do a massage twice per month to help me feel amazing by December 31st",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Health \"I'll easily do a massage twice per month to help me feel amazing by December 31st\" MISSED — \"one of my goals was to get two massages a month for the year and unfortunately I didn't achieve that goal either ... some months I did one massage other months two or three\" F0ToFPMcIqI , 2fDYA",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-107",
    "text": "I'll easily get tested at least once with my live blood analysis, allergy test, hormone tests, metal test etc.",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Health \"I'll easily get tested at least once with my live blood analysis, allergy test, hormone tests, metal test etc.\" ACHIEVED, and the highest-consequence one : heavy-metals test found \"high levels of mercury and lead in my body and I've started the detox process\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-109",
    "text": "I'll easily complete the 100 Day Challenge",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Mind \"I'll easily complete the 100 Day Challenge\" ACHIEVED (\"I do it every year ... every year for the last seven years now\") F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-111",
    "text": "I'll easily complete the 30-day morning ritual challenge",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Mind \"I'll easily complete the 30-day morning ritual challenge\" ACHIEVED F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-113",
    "text": "I'll easily complete a 10-day silent meditation retreat with Vipassana to deepen my meditation practice and grow spiritually",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Spiritual \"I'll easily complete a 10-day silent meditation retreat with Vipassana to deepen my meditation practice and grow spiritually\" scheduled Nov/Dec, not booked in April; NOT FOUND in year-review successes F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-114",
    "text": "I'll easily attend a 3-day Tantra workshop",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Growth \"I'll easily attend a 3-day Tantra workshop\" ACHIEVED (February) F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-117",
    "text": "I'll easily attend the National Achievers Congress",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Growth \"I'll easily attend the National Achievers Congress\" ACHIEVED (Seattle, early year) F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-118",
    "text": "I'll easily read at least 20 books to enhance my knowledge, mindset and skills",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Mind \"I'll easily read at least 20 books to enhance my knowledge, mindset and skills\" MISSED — \"I read over 18 books in 2017 ... I was two short on the goal that I had for the year\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-120",
    "text": "I'll easily go to church at least once a week on Sundays to grow my relationship with God",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Spiritual \"I'll easily go to church at least once a week on Sundays to grow my relationship with God\" MISSED — \"I went to church more than I ever had in my life as well; I wasn't able to be as consistent as I would like ... so I didn't fully achieve that\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-122",
    "text": "I'll easily host a fun activity once a month with friends, create more magic moments",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Social \"I'll easily host a fun activity once a month with friends, create more magic moments\" on track (UFC nights, poker) F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-123",
    "text": "I'll easily enjoy a fun family vacation creating fun and magic moments",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Family \"I'll easily enjoy a fun family vacation creating fun and magic moments\" unscheduled in April; NOT FOUND at year end F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-124",
    "text": "I'll easily update a relationship journal with my girlfriend at least once a month",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Relationship \"I'll easily update a relationship journal with my girlfriend at least once a month\" MISSED in April ; year-end: \"consistently with my relationship journal with Tatiana\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-126",
    "text": "I'll easily travel to Australia by December 31st",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Travel \"I'll easily travel to Australia by December 31st\" ACHIEVED F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-127",
    "text": "I'll easily travel to Ethiopia by December 31st to build a school",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Travel \"I'll easily travel to Ethiopia by December 31st to build a school\" ACHIEVED (October) — \"I traveled to Ethiopia to volunteer and for the inauguration of a school that I helped fund back in 2016\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-130",
    "text": "travel to California, spend at least a month living there",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Travel \"travel to California, spend at least a month living there\" ACHIEVED/EXCEEDED — \"Los Angeles for over two months\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-133",
    "text": "I'll go snowboarding at least five times",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Lifestyle \"I'll go snowboarding at least five times\" behind (\"I've only gone twice so far this year\"); NOT FOUND at year end F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-134",
    "text": "I've only gone twice so far this year",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Lifestyle \"I'll go snowboarding at least five times\" behind (\"I've only gone twice so far this year\"); NOT FOUND at year end F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-135",
    "text": "I'll easily do at least three photo shoots to get some amazing photos",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Lifestyle \"I'll easily do at least three photo shoots to get some amazing photos\" 1 of 3 by April F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-136",
    "text": "I'll easily host a monthly coaching session with the Project Life Mastery Teen Mentoring program",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Contribution \"I'll easily host a monthly coaching session with the Project Life Mastery Teen Mentoring program\" MISSED in April ; program later merged into Life Mastery Accelerator F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-137",
    "text": "I'll easily fund at least two houses for families suffering from poverty, changing their lives, by December 31st",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Contribution \"I'll easily fund at least two houses for families suffering from poverty, changing their lives, by December 31st\" year-end: \"I also raised over $3,000 and personally matched it with another three thousand ... to give to World Housing\" F0ToFPMcIqI , 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-139",
    "text": "I'll easily fund a school to be built with Change Heroes, Imagine1Day or another organization",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Contribution \"I'll easily fund a school to be built with Change Heroes, Imagine1Day or another organization\" ACHIEVED — \"donated over fifty thousand dollars to ... Imagine1Day which merged with WE.org ... started building a school that has several classrooms in Ethiopia and also one in Kenya\" ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-141",
    "text": "I'll easily cultivate the habit of giving more by giving to those that are homeless, truly in need, every opportunity that I get",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Contribution \"I'll easily cultivate the habit of giving more by giving to those that are homeless, truly in need, every opportunity that I get\" patchy while travelling, by his own admission F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-142",
    "text": "I'll easily find some new organizations or charities I can help contribute to, broadening my impact, by December 31st",
    "videoId": "F0ToFPMcIqI",
    "context": " 2017 Contribution \"I'll easily find some new organizations or charities I can help contribute to, broadening my impact, by December 31st\" ongoing (Kiva) F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-144",
    "text": "I will easily achieve it for this year in fact I was gonna bump it up but there's actually a little bit of a wrench in this plan",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Financial \"I'll easily have a six million dollar Canadian investment/assets — that includes cash, stocks, bonds, ETFs, real estate, cryptocurrencies etc.\" in-year confidence: \"I will easily achieve it for this year in fact I was gonna bump it up but there's actually a little bit of a wrench in",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-145",
    "text": "I'll easily host twelve of my Life Mastery Accelerator monthly mentoring sessions",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Business \"I'll easily host twelve of my Life Mastery Accelerator monthly mentoring sessions\" on track Jan vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-146",
    "text": "I'll easily host twelve Online Business Mastery Accelerator monthly mentoring sessions",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Business \"I'll easily host twelve Online Business Mastery Accelerator monthly mentoring sessions\" on track Jan vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-147",
    "text": "I'll easily host at least two Online Business Mastery mastermind events, love the process, and personally help people build and grow their online business",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Business \"I'll easily host at least two Online Business Mastery mastermind events, love the process, and personally help people build and grow their online business\" dates TBD Jan vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-148",
    "text": "I'll easily host the Life Mastery Transformation seminar",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Business \"I'll easily host the Life Mastery Transformation seminar\" not planned as of Jan vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-149",
    "text": "I'll easily create a new self-development course or online business course",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Business \"I'll easily create a new self-development course or online business course\" not started Jan vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-150",
    "text": "I'll easily hire two new A-players to join my team, help grow Project Life Mastery",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Business \"I'll easily hire two new A-players to join my team, help grow Project Life Mastery\" not started Jan vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-151",
    "text": "I'll easily publish 150+ videos on the Project Life Mastery YouTube channel",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Business \"I'll easily publish 150+ videos on the Project Life Mastery YouTube channel\" 12 in Jan, \"we've been aiming for about three a week\" vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-152",
    "text": "we've been aiming for about three a week",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Business \"I'll easily publish 150+ videos on the Project Life Mastery YouTube channel\" 12 in Jan, \"we've been aiming for about three a week\" vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-155",
    "text": "I'll easily reach at least 14 million views, which is 1.1 million views per month",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Business \"I'll easily reach at least 14 million views, which is 1.1 million views per month\" Jan: \"over 1.1 million just shy of what the average would need to be\" vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-156",
    "text": "over 1.1 million just shy of what the average would need to be",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Business \"I'll easily reach at least 14 million views, which is 1.1 million views per month\" Jan: \"over 1.1 million just shy of what the average would need to be\" vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-157",
    "text": "I'll easily reach at least a million unique visitors on my blog",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Business \"I'll easily reach at least a million unique visitors on my blog\" Jan: 112,000 vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-158",
    "text": "I'll easily reach at least 1 million podcast listeners — that's 83,000 listens per month",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Business \"I'll easily reach at least 1 million podcast listeners — that's 83,000 listens per month\" Jan: ~50,000 vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-159",
    "text": "[I'll] easily get tested to better optimize my physical, mental and emotional well-being",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Health \"[I'll] easily get tested to better optimize my physical, mental and emotional well-being\" 3 tests in Jan vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-160",
    "text": "I'll easily continue working out five times a week to build more lean muscle mass, strength and endurance",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Health \"I'll easily continue working out five times a week to build more lean muscle mass, strength and endurance\" on track vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-163",
    "text": "I'll easily listen to at least thirty Blinks using the Blinkist app",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Mind \"I'll easily listen to at least thirty Blinks using the Blinkist app\" 3 so far vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-164",
    "text": "I'll easily plan a romantic experience with Tatiana once a month to create magic moments together",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Relationship \"I'll easily plan a romantic experience with Tatiana once a month to create magic moments together\" on track vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-165",
    "text": "I'll easily connect with each member of my family at least once a month, in person or over the phone",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Family \"I'll easily connect with each member of my family at least once a month, in person or over the phone\" on track (phone, travelling) vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-166",
    "text": "I'll easily connect with a new friend at least once a week in person or over phone/Skype",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Social \"I'll easily connect with a new friend at least once a week in person or over phone/Skype\" on track vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-167",
    "text": "I'll easily do a new fun activity every month",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Fun \"I'll easily do a new fun activity every month\" Jan = Bulletproof Labs vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-168",
    "text": "I'll easily live in Los Angeles for at least three months",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Lifestyle \"I'll easily live in Los Angeles for at least three months\" on track vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-169",
    "text": "I'll easily travel through Europe",
    "videoId": "vPEblSGsDhE",
    "context": " 2018 Travel \"I'll easily travel through Europe\" not planned Jan vPEblSGsDhE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-170",
    "text": "my long-term goal is to have $10 million as my nest egg and then that money will consistently provide a passive income for me",
    "videoId": "zuEb-1Ll2h8",
    "context": "- \"my long-term goal is to have $10 million as my nest egg and then that money will consistently provide a passive income for me\" — zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-173",
    "text": "make sure you schedule off maybe 30 minutes or an hour of your time to actually commit yourself to this process",
    "videoId": "tYCT57Onfas",
    "context": " \"make sure you schedule off maybe 30 minutes or an hour of your time to actually commit yourself to this process\" — tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-174",
    "text": "there's a few things you're going to need. One is you're going to need a journal ... I like to just use a paperback journal ... Something I can physically write in with a pen. Uh you can use your computer if you want as well, but I find just actually using a journal to be uh pretty powerful ... it just kind of goes to my brain at a different level.",
    "videoId": "tYCT57Onfas",
    "context": " \"there's a few things you're going to need. One is you're going to need a journal ... I like to just use a paperback journal ... Something I can physically write in with a pen. Uh you can use your computer if you want as well, but I find just actually using a journal to be uh pretty powerful ... it",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-175",
    "text": "I often do this every year at the start of the year ... but this is something you can do every quarter. My company we do quarterly meetings with my team and we set goals for each part of the business",
    "videoId": "ZywgvFSnH38",
    "context": " \"I often do this every year at the start of the year ... but this is something you can do every quarter. My company we do quarterly meetings with my team and we set goals for each part of the business\" — ZywgvFSnH38 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-176",
    "text": "spend more time after this maybe this weekend or maybe before the year is up to maybe go in nature or go out to a library or coffee shop whatever environment makes you feel good",
    "videoId": "JZnLIuW7NQw",
    "context": " \"spend more time after this maybe this weekend or maybe before the year is up to maybe go in nature or go out to a library or coffee shop whatever environment makes you feel good\" — JZnLIuW7NQw ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-177",
    "text": "before you do this process, you get yourself in a great state ... a lot of this process is going to require your imagination ... you want to be in the state almost like when you're like a kid ... There's no limits. There's no fear to his level of thinking.",
    "videoId": "tYCT57Onfas",
    "context": " \"before you do this process, you get yourself in a great state ... a lot of this process is going to require your imagination ... you want to be in the state almost like when you're like a kid ... There's no limits. There's no fear to his level of thinking.\" — tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-178",
    "text": "I like to spend maybe 10 minutes. I'll put on some music. Um dance around ... I've got a little trampoline that I'll jump up and down on. Maybe you can go for a walk ... Something to engage your body or that alters your state ... because if you're in a negative state and you try to do this, if you're frustrated, if you're angry, if you're depressed, then obviously the answers aren't going to come to you.",
    "videoId": "tYCT57Onfas",
    "context": " \"I like to spend maybe 10 minutes. I'll put on some music. Um dance around ... I've got a little trampoline that I'll jump up and down on. Maybe you can go for a walk ... Something to engage your body or that alters your state ... because if you're in a negative state and you try to do this, if you",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-179",
    "text": "before you even decide to set your goals for 2018 and beyond you really got to make sure that you reflect on the previous year you've got to debrief it",
    "videoId": "2fDYApReHWc",
    "context": " \"before you even decide to set your goals for 2018 and beyond you really got to make sure that you reflect on the previous year you've got to debrief it\" — 2fDYApReHWc ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-180",
    "text": "number one what is all the good that has happened in my life over the last 12 months ... what are all the victories what were all the successes ... I love this question because ... you're not looking at challenges just yet ... most of us we're so hard on ourselves and we automatically by default look at the problems",
    "videoId": "JZnLIuW7NQw",
    "context": " \"number one what is all the good that has happened in my life over the last 12 months ... what are all the victories what were all the successes ... I love this question because ... you're not looking at challenges just yet ... most of us we're so hard on ourselves and we automatically by default l",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-181",
    "text": "the next one is ... what were the challenges of this last year ... and also what are the solutions what can you do better",
    "videoId": "JZnLIuW7NQw",
    "context": " \"the next one is ... what were the challenges of this last year ... and also what are the solutions what can you do better\" — JZnLIuW7NQw ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-182",
    "text": "the third one is what did you learn this last year what were the most valuable lessons insights learnings",
    "videoId": "JZnLIuW7NQw",
    "context": " \"the third one is what did you learn this last year what were the most valuable lessons insights learnings\" — JZnLIuW7NQw ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-183",
    "text": "I keep paperback journals. I also use Evernote ... I go back through my Instagram, I go back through my camera roll on my phone ... I'm just trying to flood myself and go back to the beginning of the year and try to remember and relive a lot of the experiences",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"I keep paperback journals. I also use Evernote ... I go back through my Instagram, I go back through my camera roll on my phone ... I'm just trying to flood myself and go back to the beginning of the year and try to remember and relive a lot of the experiences\" — zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-184",
    "text": "don't be hard on yourself ... Really, what you're trying to do is reward yourself. Acknowledge yourself ... don't be like, 'Yeah, I did this, but' because whenever you say that but you're almost cheapening the accomplishment",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"don't be hard on yourself ... Really, what you're trying to do is reward yourself. Acknowledge yourself ... don't be like, 'Yeah, I did this, but' because whenever you say that but you're almost cheapening the accomplishment\" — zuEb-1Ll2h8 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-185",
    "text": "before i set goals for a year the first thing i always do is i really reflect on my vision ... the goals that we set every year those are just the milestones the stepping stones that lead us to the ultimate vision",
    "videoId": "JZnLIuW7NQw",
    "context": " \"before i set goals for a year the first thing i always do is i really reflect on my vision ... the goals that we set every year those are just the milestones the stepping stones that lead us to the ultimate vision\" — JZnLIuW7NQw ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-186",
    "text": "your vision you want to be unrealistic to be crazy because when you look at things on a scale of 10 years 20 years 30 years anything is possible",
    "videoId": "JZnLIuW7NQw",
    "context": " \"your vision you want to be unrealistic to be crazy because when you look at things on a scale of 10 years 20 years 30 years anything is possible\" — JZnLIuW7NQw ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-187",
    "text": "of all the areas of your life you want to ask yourself what would you say is the most important area that you want to focus on for this upcoming year ... if you had to pick one or two or three what are those most important ones",
    "videoId": "JZnLIuW7NQw",
    "context": " \"of all the areas of your life you want to ask yourself what would you say is the most important area that you want to focus on for this upcoming year ... if you had to pick one or two or three what are those most important ones\" — JZnLIuW7NQw ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-188",
    "text": "what i like to do as well is i like to think you know what is that area of my life by conquering it or taking that to the next level it's actually going to simultaneously benefit all the other areas of my life too",
    "videoId": "JZnLIuW7NQw",
    "context": " \"what i like to do as well is i like to think you know what is that area of my life by conquering it or taking that to the next level it's actually going to simultaneously benefit all the other areas of my life too\" — JZnLIuW7NQw ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-189",
    "text": "i'm going to drop it from like a seven out of ten to like a five okay i'm gonna be okay with that because i'm gonna take more of my energy and focus now put it to my career",
    "videoId": "JZnLIuW7NQw",
    "context": "He explicitly accepts temporary imbalance: \"i'm going to drop it from like a seven out of ten to like a five okay i'm gonna be okay with that because i'm gonna take more of my energy and focus now put it to my career\" — JZnLIuW7NQw ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-191",
    "text": "you're going to maybe set a timer for 5 to 10 minutes. And you're going to write out rapidly everything that you want in your life ... point form ... I want to own an island. You're going to write that out. I want to have a private jet ... I want to be 170 pounds at 6% body fat ... Don't worry about ... whether it's realistic or not. Uh don't even worry about the specifics of it just yet.",
    "videoId": "tYCT57Onfas",
    "context": " \"you're going to maybe set a timer for 5 to 10 minutes. And you're going to write out rapidly everything that you want in your life ... point form ... I want to own an island. You're going to write that out. I want to have a private jet ... I want to be 170 pounds at 6% body fat ... Don't worry abo",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-192",
    "text": "you're going to probably have a few pages when you do this",
    "videoId": "tYCT57Onfas",
    "context": " \"you're going to probably have a few pages when you do this\" — tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-193",
    "text": "at the beginning just brainstorm brainstorm don't worry about being perfect doesn't mean you have to commit to every one of these goals we can simplify it later",
    "videoId": "ZywgvFSnH38",
    "context": " \"at the beginning just brainstorm brainstorm don't worry about being perfect doesn't mean you have to commit to every one of these goals we can simplify it later\" — ZywgvFSnH38 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-194",
    "text": "the foundation of that is my physical body ... when you're going to set goals for yourself I recommend that you set goals for each area of life you first start with your physical body",
    "videoId": "ZywgvFSnH38",
    "context": " \"the foundation of that is my physical body ... when you're going to set goals for yourself I recommend that you set goals for each area of life you first start with your physical body\" — ZywgvFSnH38 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-195",
    "text": "there's two types of goals there's result oriented goals and process oriented goals ... the thing with results though you don't have full control over the results do you ... you have absolute control over the process",
    "videoId": "ZywgvFSnH38",
    "context": " \"there's two types of goals there's result oriented goals and process oriented goals ... the thing with results though you don't have full control over the results do you ... you have absolute control over the process\" — ZywgvFSnH38 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-196",
    "text": "each area of your life make a list of goals make a list of goals result goals process goals",
    "videoId": "ZywgvFSnH38",
    "context": " \"each area of your life make a list of goals make a list of goals result goals process goals\" — ZywgvFSnH38 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-197",
    "text": "you're going to go through that list and you're actually going to put a number next to each goal ... And that number is going to be the time frame in which you're going to achieve that goal by. So, for example, um you know, you might put next to some goals 20 for 20 years, 10 for 10 years, five for 5 years, three for three years, and one for a one-year goal.",
    "videoId": "tYCT57Onfas",
    "context": " \"you're going to go through that list and you're actually going to put a number next to each goal ... And that number is going to be the time frame in which you're going to achieve that goal by. So, for example, um you know, you might put next to some goals 20 for 20 years, 10 for 10 years, five fo",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-198",
    "text": "You're going to go through your list and you're going to write the time frame in which you're going to achieve these goals by.",
    "videoId": "tYCT57Onfas",
    "context": " \"You're going to go through your list and you're going to write the time frame in which you're going to achieve these goals by.\" — tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-199",
    "text": "I want to actually go over how to set long-term goals, the 10, 20 year goals as well as the short-term goals, the one-year, quarterly, and monthly goals because I really believe that both are equally important.",
    "videoId": "tYCT57Onfas",
    "context": " \"I want to actually go over how to set long-term goals, the 10, 20 year goals as well as the short-term goals, the one-year, quarterly, and monthly goals because I really believe that both are equally important.\" — tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-200",
    "text": "your short-term goals you want them to be attainable your long-term goals you want them to be unrealistic",
    "videoId": "ZywgvFSnH38",
    "context": " \"your short-term goals you want them to be attainable your long-term goals you want them to be unrealistic\" — ZywgvFSnH38 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-201",
    "text": "my long-term goals are more the unrealistic ones ... But my yearly goals and my short-term goals, I always want to make sure that they're realistic and attainable.",
    "videoId": "tYCT57Onfas",
    "context": " \"my long-term goals are more the unrealistic ones ... But my yearly goals and my short-term goals, I always want to make sure that they're realistic and attainable.\" — tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-202",
    "text": "the third step is we're going to narrow down and pick the most important one-year goals for yourself ... what I'm going to do is I'm going to just kind of circle the goals that I'm going to say, okay, these are the goals that [are] going to be my one-year goals. And these are going to be the ones that motivate you the most, the ones that you want the most.",
    "videoId": "tYCT57Onfas",
    "context": " \"the third step is we're going to narrow down and pick the most important one-year goals for yourself ... what I'm going to do is I'm going to just kind of circle the goals that I'm going to say, okay, these are the goals that [are] going to be my one-year goals. And these are going to be the ones ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-203",
    "text": "So, I've got a health goal, I've got an emotional goal, I've got a financial goal.",
    "videoId": "tYCT57Onfas",
    "context": "He checks the circled set covers areas: \"So, I've got a health goal, I've got an emotional goal, I've got a financial goal.\" — tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-204",
    "text": "really, the list of what you want to focus on for your year is entirely up to you. Um, I like to set quite a few goals. **Usually I have about 15 to 20 goals** because I like to again have goals in different areas of my life, not just financial, but all the different areas of my life because again, I want to have a balanced life.",
    "videoId": "tYCT57Onfas",
    "context": " \"really, the list of what you want to focus on for your year is entirely up to you. Um, I like to set quite a few goals. Usually I have about 15 to 20 goals because I like to again have goals in different areas of my life, not just financial, but all the different areas of my life because again, I ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-205",
    "text": "how many goals you should have is really different based on the individual ... if you're overwhelmed easily ... just set a few maybe set one goal for each aspect of your life ... but other people they can set a lot you know for me I've been guilty of having a lot of goals and sometimes too many but **at times I have a hundred goals** ... I've been doing this for over 16 years",
    "videoId": "ZywgvFSnH38",
    "context": " \"how many goals you should have is really different based on the individual ... if you're overwhelmed easily ... just set a few maybe set one goal for each aspect of your life ... but other people they can set a lot you know for me I've been guilty of having a lot of goals and sometimes too many bu",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-206",
    "text": "there's no set amount really ... there might be some areas I might have five goals or 10 goals otherwise I might have one goal or two or three goals ... every year I'm doing more I'm achieving more goals because I learn how to work smarter",
    "videoId": "GXhPOncX8CA",
    "context": " \"there's no set amount really ... there might be some areas I might have five goals or 10 goals otherwise I might have one goal or two or three goals ... every year I'm doing more I'm achieving more goals because I learn how to work smarter\" — GXhPOncX8CA ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-207",
    "text": "for me, I'm going to set five goals, five goals for the next 100 days and you can set one goal if you want you can set two ... make sure that you set an amount of goals that you can comfortably handle you're not ... setting 50 goals when you know you struggle just to achieve one or two",
    "videoId": "GXhPOncX8CA",
    "context": " For a 100-day block: \"for me, I'm going to set five goals, five goals for the next 100 days and you can set one goal if you want you can set two ... make sure that you set an amount of goals that you can comfortably handle you're not ... setting 50 goals when you know you struggle just to achieve o",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-209",
    "text": "what I like to do for my long-term goals ... The first thing that I have here is what is called a vision board ... this basically is my long-term goals, my yearly, 5 year, 10 year, 20 year goals ... put this on my wall where I can focus on and see it every day",
    "videoId": "tYCT57Onfas",
    "context": " \"what I like to do for my long-term goals ... The first thing that I have here is what is called a vision board ... this basically is my long-term goals, my yearly, 5 year, 10 year, 20 year goals ... put this on my wall where I can focus on and see it every day\" — tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-210",
    "text": "Another thing that I have created for myself also is this chart here which has my ultimate vision for my life and the vision that I have for each area of my life ... I like to write it out and focus on these visions on a weekly basis.",
    "videoId": "tYCT57Onfas",
    "context": " \"Another thing that I have created for myself also is this chart here which has my ultimate vision for my life and the vision that I have for each area of my life ... I like to write it out and focus on these visions on a weekly basis.\" — tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-211",
    "text": "SMARTT is an acronym which stands for specific, measurable, attainable, realistic, and having a timeline",
    "videoId": "tYCT57Onfas",
    "context": " \"SMARTT is an acronym which stands for specific, measurable, attainable, realistic, and having a timeline\" — tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-212",
    "text": "I will easily. Okay, so first the first two words I will — I found that to be powerful because it's assuming that you are going to do this ... I don't like to say I want ... The third word that I like to add in is easily ... And I like that word at least because it's kind of having the minimum ... So I'll easily make at least $1 million. And then I might put in brackets which is $84,000 per month by December 31st, 2015.",
    "videoId": "tYCT57Onfas",
    "context": " \"I will easily. Okay, so first the first two words I will — I found that to be powerful because it's assuming that you are going to do this ... I don't like to say I want ... The third word that I like to add in is easily ... And I like that word at least because it's kind of having the minimum ...",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-213",
    "text": "it's something that I have a belief level on a scale from 0 to 10, at least a seven, a seven, eight, nine, or 10 ... that's kind of the sweet spot",
    "videoId": "tYCT57Onfas",
    "context": " \"it's something that I have a belief level on a scale from 0 to 10, at least a seven, a seven, eight, nine, or 10 ... that's kind of the sweet spot\" — tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-214",
    "text": "ask yourself this question why do I want this goal what will this give me what's the benefit what's the pleasure ... the reasons are the fuel for the fire the more reasons the more motivated you'll be",
    "videoId": "ZywgvFSnH38",
    "context": " \"ask yourself this question why do I want this goal what will this give me what's the benefit what's the pleasure ... the reasons are the fuel for the fire the more reasons the more motivated you'll be\" — ZywgvFSnH38 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-215",
    "text": "maybe even asking the question what will happen in my life if I don't do this if I don't achieve this what's the consequence of not achieving this goal",
    "videoId": "ZywgvFSnH38",
    "context": " \"maybe even asking the question what will happen in my life if I don't do this if I don't achieve this what's the consequence of not achieving this goal\" — ZywgvFSnH38 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-216",
    "text": "the next and final step is ... the RPM plan, which I learned from Tony Robbins ... when you have your result or your outcome, the other two things you need is your purpose and a massive action plan",
    "videoId": "tYCT57Onfas",
    "context": "This is RPM: \"the next and final step is ... the RPM plan, which I learned from Tony Robbins ... when you have your result or your outcome, the other two things you need is your purpose and a massive action plan\" — tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-217",
    "text": "when you set your goals here's a really important question to ask what would get in the way of me achieving this goal ... what are the obstacles that are going to come up that we all know are going to come up ... number one how can i prevent it from showing up ... and if it does show up what can i do when that happens",
    "videoId": "JZnLIuW7NQw",
    "context": " \"when you set your goals here's a really important question to ask what would get in the way of me achieving this goal ... what are the obstacles that are going to come up that we all know are going to come up ... number one how can i prevent it from showing up ... and if it does show up what can i",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-218",
    "text": "i set goals and it's great for a little while but then new opportunities show up and i can get distracted okay stefan what are you gonna do how can i prevent that i gotta learn how to say no",
    "videoId": "JZnLIuW7NQw",
    "context": "He names his own recurring obstacle: \"i set goals and it's great for a little while but then new opportunities show up and i can get distracted okay stefan what are you gonna do how can i prevent that i gotta learn how to say no\" — JZnLIuW7NQw ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-219",
    "text": "what are the resources that are available that can help you achieve this ... are there personal trainers out there are there courses ... who's a mentor who's a maybe a mastermind or maybe I need an accountability buddy",
    "videoId": "ZywgvFSnH38",
    "context": " \"what are the resources that are available that can help you achieve this ... are there personal trainers out there are there courses ... who's a mentor who's a maybe a mastermind or maybe I need an accountability buddy\" — ZywgvFSnH38 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-220",
    "text": "I like to create what is called a could do list not a to-do list. A could do list is what are all the things I could do to achieve this so when you have a could do list your brain comes up with more options more ideas",
    "videoId": "ZywgvFSnH38",
    "context": " \"I like to create what is called a could do list not a to-do list. A could do list is what are all the things I could do to achieve this so when you have a could do list your brain comes up with more options more ideas\" — ZywgvFSnH38 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-222",
    "text": "there's something called the 80 20 principle the pareto principle it says that 20 of your actions or goals will lead to 80 of the results so out of your maybe top 10 goals that you have what are the top two what are the top three okay those are the ones that I really want you to focus on and prioritize and still make progress on the other ones",
    "videoId": "ZywgvFSnH38",
    "context": " \"there's something called the 80 20 principle the pareto principle it says that 20 of your actions or goals will lead to 80 of the results so out of your maybe top 10 goals that you have what are the top two what are the top three okay those are the ones that I really want you to focus on and prior",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-223",
    "text": "out of your goals again you want to prioritize what's most important ... if you had to pick one or two or three what would be those ultimate ones",
    "videoId": "JZnLIuW7NQw",
    "context": " \"out of your goals again you want to prioritize what's most important ... if you had to pick one or two or three what would be those ultimate ones\" — JZnLIuW7NQw ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-224",
    "text": "once you have the goal right you've got your purpose and everything ... it's setting a 90-day goal okay so **I like to chunk my goals in the 90-day goals and also monthly goals as well** um because I find sometimes having a yearly goal is a little bit too overwhelming ... if my goal let's say is to make $100,000 a year okay which is $8,400 a month then I'm going to break it down into a three-month goal ... and then a monthly goal",
    "videoId": "8kco2rjijjE",
    "context": " \"once you have the goal right you've got your purpose and everything ... it's setting a 90-day goal okay so I like to chunk my goals in the 90-day goals and also monthly goals as well um because I find sometimes having a yearly goal is a little bit too overwhelming ... if my goal let's say is to ma",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-225",
    "text": "so you know what you want you know why you want it you have your purpose your ultimate vision in each area of your life your ultimate purpose and everything your identity, you got your one-year goal, you have 90 day goals and of course monthly 30-day goals, next is the action plan",
    "videoId": "8kco2rjijjE",
    "context": " \"so you know what you want you know why you want it you have your purpose your ultimate vision in each area of your life your ultimate purpose and everything your identity, you got your one-year goal, you have 90 day goals and of course monthly 30-day goals, next is the action plan\" — 8kco2rjijjE ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-226",
    "text": "you got to break that down into short-term goals ... the goals that over the next 12 months over the next six months the next three months the next month you can break that down into bite-sized chunks",
    "videoId": "ZywgvFSnH38",
    "context": " \"you got to break that down into short-term goals ... the goals that over the next 12 months over the next six months the next three months the next month you can break that down into bite-sized chunks\" — ZywgvFSnH38 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-227",
    "text": "for me to make a million dollars, I might write down um some actions are to create a new coaching program or to host a live event or a live mastermind group here in Vancouver, maybe to launch a new product or course ... If my goal is to be 160 lbs, then I'm going to write down I'm going to work out 5 days a week. I'm going to do cardio 3 days a week. I'm going to consume 2500 calories a day. I'm going to hire a coach ... I'm going to check in with my body weight and take pictures of myself and measurements on a weekly basis.",
    "videoId": "tYCT57Onfas",
    "context": " \"for me to make a million dollars, I might write down um some actions are to create a new coaching program or to host a live event or a live mastermind group here in Vancouver, maybe to launch a new product or course ... If my goal is to be 160 lbs, then I'm going to write down I'm going to work ou",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-228",
    "text": "I recommend you take this list of goals and you print it you put it on your wall you read it and you focus on it every day",
    "videoId": "ZywgvFSnH38",
    "context": " \"I recommend you take this list of goals and you print it you put it on your wall you read it and you focus on it every day\" — ZywgvFSnH38 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-229",
    "text": "put it up on your wall or somewhere where you can see them every day. Um maybe carry it around in your wallet or uh put it up on a whiteboard",
    "videoId": "tYCT57Onfas",
    "context": " \"put it up on your wall or somewhere where you can see them every day. Um maybe carry it around in your wallet or uh put it up on a whiteboard\" — tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-230",
    "text": "this is the weekly process that I go through okay every week I make sure that I associate and remind myself and read over ... okay what are my one-year goals what are my three month goals my one month goals ... you can't fall into the trap of just looking at it one time okay that's the biggest mistake people make is they set goals and then they forget about the goals",
    "videoId": "8kco2rjijjE",
    "context": " \"this is the weekly process that I go through okay every week I make sure that I associate and remind myself and read over ... okay what are my one-year goals what are my three month goals my one month goals ... you can't fall into the trap of just looking at it one time okay that's the biggest mis",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-231",
    "text": "one of the things that I do that's really helped me with my goals has been my monthly goals reports where on my blog I share my goals publicly for the year, but I also every month give an update ... daily, weekly, and monthly is what has worked best for me",
    "videoId": "tYCT57Onfas",
    "context": " \"one of the things that I do that's really helped me with my goals has been my monthly goals reports where on my blog I share my goals publicly for the year, but I also every month give an update ... daily, weekly, and monthly is what has worked best for me\" — tYCT57Onfas ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-232",
    "text": "as a way for me to be accountable ... to make sure that I've got that pressure on myself that outside accountability",
    "videoId": "F0ToFPMcIqI",
    "context": "Why the monthly is public: \"as a way for me to be accountable ... to make sure that I've got that pressure on myself that outside accountability\" — F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-233",
    "text": "I find it's very easy to bullshit yourself when you're not following through and you got to make sure you catch yourself on that, catch yourself on the stories that you tell yourself ... the justifications and the rationalizations",
    "videoId": "F0ToFPMcIqI",
    "context": " \"I find it's very easy to bullshit yourself when you're not following through and you got to make sure you catch yourself on that, catch yourself on the stories that you tell yourself ... the justifications and the rationalizations\" — F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-234",
    "text": "I've been doing some stretching um I would not consider that yoga though ... I'm not BS-ing myself and saying that oh I'm stretching at the gym for five or 10 minutes and that that's yoga",
    "videoId": "F0ToFPMcIqI",
    "context": "Concrete instance of that honesty rule: \"I've been doing some stretching um I would not consider that yoga though ... I'm not BS-ing myself and saying that oh I'm stretching at the gym for five or 10 minutes and that that's yoga\" — F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-235",
    "text": "if it's not fast enough ... then you've got to look at your action plan and modify it improve it find other resources try new things or maybe you got to change your goal maybe your goal is too unrealistic ... when an airplane takes off and they go to a destination most of the time the airplane is off course ... but it's always course correcting",
    "videoId": "ZywgvFSnH38",
    "context": " \"if it's not fast enough ... then you've got to look at your action plan and modify it improve it find other resources try new things or maybe you got to change your goal maybe your goal is too unrealistic ... when an airplane takes off and they go to a destination most of the time the airplane is ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-236",
    "text": "maybe the goal is to lose 30 pounds you only lost 20. Does that mean you failed? Of course not ... all it means is just going to set back the goal a little bit longer maybe push it back another three to six months",
    "videoId": "ZywgvFSnH38",
    "context": "And on a shortfall: \"maybe the goal is to lose 30 pounds you only lost 20. Does that mean you failed? Of course not ... all it means is just going to set back the goal a little bit longer maybe push it back another three to six months\" — ZywgvFSnH38 ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-237",
    "text": "more so privately to be honest ... sometimes I get some input from my coaches, from my masterminds ... as well as making sure that my girlfriend and I are aligned because we share similar visions and we like to align ourselves with some of the same goals",
    "videoId": "F0ToFPMcIqI",
    "context": " \"more so privately to be honest ... sometimes I get some input from my coaches, from my masterminds ... as well as making sure that my girlfriend and I are aligned because we share similar visions and we like to align ourselves with some of the same goals\" — F0ToFPMcIqI ",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-238",
    "text": "about 15 to 20",
    "videoId": "tYCT57Onfas",
    "context": "- Number of goals he recommends: \"about 15 to 20\" — \"Usually I have about 15 to 20 goals because I like to again have goals in different areas of my life\" ( tYCT57Onfas ). Modern caveat: no fixed number, scale to capacity, and for a 100-day sprint he personally runs 5 ( GXhPOncX8CA , ZywgvFSnH38 ).",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-239",
    "text": "Usually I have about 15 to 20 goals because I like to again have goals in different areas of my life",
    "videoId": "tYCT57Onfas",
    "context": "- Number of goals he recommends: \"about 15 to 20\" — \"Usually I have about 15 to 20 goals because I like to again have goals in different areas of my life\" ( tYCT57Onfas ). Modern caveat: no fixed number, scale to capacity, and for a 100-day sprint he personally runs 5 ( GXhPOncX8CA , ZywgvFSnH38 ).",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-goals-240",
    "text": "you might put next to some goals 20 for 20 years, 10 for 10 years, five for 5 years, three for three years, and one for a one-year goal",
    "videoId": "tYCT57Onfas",
    "context": "- Timeframe split: 1 / 3 / 5 / 10 / 20 years, assigned by writing a number beside each brainstormed item — \"you might put next to some goals 20 for 20 years, 10 for 10 years, five for 5 years, three for three years, and one for a one-year goal\" ( tYCT57Onfas ). The 1-year goals then chunk 1yr → 90-d",
    "artifact": "phase2-goals"
  },
  {
    "id": "phase2-identity-2",
    "text": "How To Manage Your Life",
    "videoId": "8kco2rjijjE",
    "context": "- 8kco2rjijjE — \"How To Manage Your Life\" — the identity-writing method : identity questions, his actual identity statement, code of conduct, per-life-area role identities.",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-4",
    "text": "legs to a tabletop",
    "videoId": "bDdDQeugO64",
    "context": "- bDdDQeugO64 , mjVjmmEQysg , s3oeWqLd68Y — references = \"legs to a tabletop\".",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-5",
    "text": "no such thing as failure",
    "videoId": "QZjdmXreWd0",
    "context": "- QZjdmXreWd0 — identity as a thermostat you regress to; \"no such thing as failure\".",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-6",
    "text": "your identity is who you are it's a series of beliefs about how you define yourself",
    "videoId": "TTNjl7W5DOs",
    "context": " \"your identity is who you are it's a series of beliefs about how you define yourself\" — TTNjl7W5DOs ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-7",
    "text": "your identity is basically who you are or who you strive to be and your identity is essentially a sum of beliefs about who you are that's all it really is that's why you believe who you are",
    "videoId": "8kco2rjijjE",
    "context": " \"your identity is basically who you are or who you strive to be and your identity is essentially a sum of beliefs about who you are that's all it really is that's why you believe who you are\" — 8kco2rjijjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-8",
    "text": "the strongest force in the human personality is the need to be consistent with how we Define ourselves if you have certain beliefs about yourself if you believe that you're shy that you're introverted that you're uh not good enough that you're depressed then the behavior follows those beliefs it follows that identity and so that's why changing the behavior is not enough unless you change their identity and beliefs about who you are because if you had the belief that I'm successful that I'm uh you know I'm a fitness model or I'm an Adonis then the behavior follows that you'll start working out you'll start to eat healthy just because that's a belief about who you are",
    "videoId": "8kco2rjijjE",
    "context": " \"the strongest force in the human personality is the need to be consistent with how we Define ourselves if you have certain beliefs about yourself if you believe that you're shy that you're introverted that you're uh not good enough that you're depressed then the behavior follows those beliefs it f",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-9",
    "text": "one thing that I heard from Tony Robbins years ago is that the strongest force in the human personality is the need to remain consistent with how we define ourselves. You define yourself as someone who is shy. You're going to remain that way, because that's who you are. That's your identity.",
    "videoId": "wnsM113Lqzs",
    "context": " \"one thing that I heard from Tony Robbins years ago is that the strongest force in the human personality is the need to remain consistent with how we define ourselves. You define yourself as someone who is shy. You're going to remain that way, because that's who you are. That's your identity.\" — wn",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-10",
    "text": "we all have this um this this threshold this this this level that we always find a way to get back to this identity that if we don't change it if we don't change our identity and our beliefs and our values then we can't get to where we want to go we always take two steps forward two steps back and just end up right where we started",
    "videoId": "QZjdmXreWd0",
    "context": " \"we all have this um this this threshold this this this level that we always find a way to get back to this identity that if we don't change it if we don't change our identity and our beliefs and our values then we can't get to where we want to go we always take two steps forward two steps back and",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-11",
    "text": "it's not about what you get in life it's about who you become",
    "videoId": "QZjdmXreWd0",
    "context": " \"it's not about what you get in life it's about who you become\" — QZjdmXreWd0 ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-12",
    "text": "you can't let other people around Define and dict dicte who you are and that was so much of my life ... because I didn't know who I was I didn't have a strong identity I was like oh I guess that's who I am I guess I am this way and the only person that can Define who you are is you and you have to consciously do it",
    "videoId": "8kco2rjijjE",
    "context": " \"you can't let other people around Define and dict dicte who you are and that was so much of my life ... because I didn't know who I was I didn't have a strong identity I was like oh I guess that's who I am I guess I am this way and the only person that can Define who you are is you and you have to",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-13",
    "text": "just ask yourself Who Am I who who would I want to be um who am I committed to being if I were to look my name up in the dictionary what would it say about me",
    "videoId": "8kco2rjijjE",
    "context": " \"just ask yourself Who Am I who who would I want to be um who am I committed to being if I were to look my name up in the dictionary what would it say about me\" — 8kco2rjijjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-14",
    "text": "I just go on and on and on and um that inspires me as well you know that gets me juice gets me pumped up so going through a process like that of just discovering who you are who you're committed to being and conditioning that as well and that's the amazing thing when you condition that you start to become that",
    "videoId": "8kco2rjijjE",
    "context": " \"I just go on and on and on and um that inspires me as well you know that gets me juice gets me pumped up so going through a process like that of just discovering who you are who you're committed to being and conditioning that as well and that's the amazing thing when you condition that you start t",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-15",
    "text": "something called your code of conduct and this is basically how you're committed to showing up it's a it's a standards that you have for yourself standards you have set to live your life by and um for me it's kind of short but it's to be fun playful outrageous to be loving and caring to be confident to be passionate to be cheerful happy and joyful to be grateful to be disciplined to be motivated and determined to be healthy and energetic to be proud to be an example of all the good that's possible in people's lives to be outgoing social and friendly so those are the standards I just remind myself every week and just associate to this is who I'm committed to being this is the standards that I want to live my life by",
    "videoId": "8kco2rjijjE",
    "context": " \"something called your code of conduct and this is basically how you're committed to showing up it's a it's a standards that you have for yourself standards you have set to live your life by and um for me it's kind of short but it's to be fun playful outrageous to be loving and caring to be confide",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-16",
    "text": "under each area is having uh back to the identity you know certain roles of who are you in each of these areas of your life because that if you can create an identity for yourself or beliefs or just kind of use certain language that excites you the more likely you are to associate yourself and spend time in that area",
    "videoId": "8kco2rjijjE",
    "context": " \"under each area is having uh back to the identity you know certain roles of who are you in each of these areas of your life because that if you can create an identity for yourself or beliefs or just kind of use certain language that excites you the more likely you are to associate yourself and spe",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-17",
    "text": "that inspires me so much more than saying oh you know I'm a coach or I'm a teacher",
    "videoId": "8kco2rjijjE",
    "context": " \"that inspires me so much more than saying oh you know I'm a coach or I'm a teacher\" — 8kco2rjijjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-18",
    "text": "if you can really identify what are the beliefs the roles the identity that you'd have for each aspect of your life that can have a very powerful impact and I always make sure that I do that",
    "videoId": "8kco2rjijjE",
    "context": " \"if you can really identify what are the beliefs the roles the identity that you'd have for each aspect of your life that can have a very powerful impact and I always make sure that I do that\" — 8kco2rjijjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-19",
    "text": "I have it written out in my apartment I have it on my desk I have a vision board I have images of that and I'm constantly reminding myself of my vision my purpose my identity uh the standards that I hold myself to and that's what you have to do you have to always condition it if you just do this one time and I've been guilty of this as well you know you set goals or a vision and or a mission statement or something like that for your life you do it one time and you forget about it you never look at it again so this has to be a ritual that you do every week sometimes I'll do it...",
    "videoId": "8kco2rjijjE",
    "context": " \"I have it written out in my apartment I have it on my desk I have a vision board I have images of that and I'm constantly reminding myself of my vision my purpose my identity uh the standards that I hold myself to and that's what you have to do you have to always condition it if you just do this o",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-20",
    "text": "when you're getting consistent results what happens is it leads to level six which is a change in your identity now your identity is who you are it's a series of beliefs about how you define yourself and so what happens is you start getting results consistent action and then how you view yourself shifts your entire perception about who you are it's like all of a sudden you went from this concept that you could make money online to you're a successful person because you're consistently getting those results you're an internet entrepreneur at first you're a wantrepreneur",
    "videoId": "TTNjl7W5DOs",
    "context": " \"when you're getting consistent results what happens is it leads to level six which is a change in your identity now your identity is who you are it's a series of beliefs about how you define yourself and so what happens is you start getting results consistent action and then how you view yourself ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-21",
    "text": "I remember the result that I got that changed my life was when I made one dollar online one dollar changed my life because what that did is when you get that result it actually reinforces your beliefs even more it's like your mindset even strengthens",
    "videoId": "TTNjl7W5DOs",
    "context": " \"I remember the result that I got that changed my life was when I made one dollar online one dollar changed my life because what that did is when you get that result it actually reinforces your beliefs even more it's like your mindset even strengthens\" — TTNjl7W5DOs ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-23",
    "text": "after the fitness competition I didn't commit to mastery ... I wasn't tracking my calories I wasn't working with a coach I didn't have that same level of standard for myself so this identity weakened and I started to lose some of the results that I had ... unless you continuously condition that and keep your standards high your transformation can regress",
    "videoId": "TTNjl7W5DOs",
    "context": " \"after the fitness competition I didn't commit to mastery ... I wasn't tracking my calories I wasn't working with a coach I didn't have that same level of standard for myself so this identity weakened and I started to lose some of the results that I had ... unless you continuously condition that an",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-24",
    "text": "not holding on to any identity to any way of being realizing that tomorrow is a new day that anything new is possible and be anyone you want to be ... this moment you have a choice to make a different decision to think differently to be differently but we're holding on to and still attached to our old identity and beliefs and comfort zone",
    "videoId": "faNF843NNrQ",
    "context": " \"not holding on to any identity to any way of being realizing that tomorrow is a new day that anything new is possible and be anyone you want to be ... this moment you have a choice to make a different decision to think differently to be differently but we're holding on to and still attached to our",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-25",
    "text": "where the suffering comes in is in the attachment to that previous identity ... you've now become a butterfly and you haven't realized that you're a butterfly yet ... the sooner that you let go of that attachment the more quickly you're going to realize your new potential",
    "videoId": "faNF843NNrQ",
    "context": " \"where the suffering comes in is in the attachment to that previous identity ... you've now become a butterfly and you haven't realized that you're a butterfly yet ... the sooner that you let go of that attachment the more quickly you're going to realize your new potential\" — faNF843NNrQ (Tatiana)",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-26",
    "text": "when you form a certain identity and you're attached to it and other people reinforce that identity then it's very difficult to change that to be anything else",
    "videoId": "QZjdmXreWd0",
    "context": " \"when you form a certain identity and you're attached to it and other people reinforce that identity then it's very difficult to change that to be anything else\" — QZjdmXreWd0 ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-27",
    "text": "what determines whether or not you're successful is your actions your behavior what you do ... but what determines your actions and your behavior is your beliefs see if you believe that you can do something or that something is possible then what will follow that is the behavior and the action you'll pursue it you'll take action and those actions will lead to the results in your life your success if you believe that you can't do something or that it's not possible then you're not going to even try",
    "videoId": "F4j974PvwSQ",
    "context": " \"what determines whether or not you're successful is your actions your behavior what you do ... but what determines your actions and your behavior is your beliefs see if you believe that you can do something or that something is possible then what will follow that is the behavior and the action you",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-28",
    "text": "a lot of people they try to change their actions or the results but they realize you gotta change your beliefs first",
    "videoId": "oLQiUIJ7PsQ",
    "context": " \"a lot of people they try to change their actions or the results but they realize you gotta change your beliefs first\" — oLQiUIJ7PsQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-29",
    "text": "you're trying to change your behavior you're trying to change your actions instead of changing the software and the beliefs that will therefore determine the actions that you take automatically so you always got to make sure you update and change your model of the world first because the behaviors will follow that",
    "videoId": "4789IM-_-i4",
    "context": " \"you're trying to change your behavior you're trying to change your actions instead of changing the software and the beliefs that will therefore determine the actions that you take automatically so you always got to make sure you update and change your model of the world first because the behaviors",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-30",
    "text": "all a belief is is a feeling of certainty about what something means",
    "videoId": "F4j974PvwSQ",
    "context": " \"all a belief is is a feeling of certainty about what something means\" — F4j974PvwSQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-31",
    "text": "all beliefs are generalizations",
    "videoId": "4789IM-_-i4",
    "context": " \"all beliefs are generalizations\" — 4789IM-_-i4 ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-32",
    "text": "our beliefs are made up our beliefs aren't real ... we are a victim of our environment we grew up in this world that has a culture and that culture has a series of beliefs that exist within it or society you are influenced by that culture you're influenced by your family your peers your teachers the church you're influenced by the media by marketing they're all instilling a series of beliefs into your psychology but it doesn't make it true in fact most people they have these beliefs they never challenge them they never question them they just accept them",
    "videoId": "F4j974PvwSQ",
    "context": " \"our beliefs are made up our beliefs aren't real ... we are a victim of our environment we grew up in this world that has a culture and that culture has a series of beliefs that exist within it or society you are influenced by that culture you're influenced by your family your peers your teachers t",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-33",
    "text": "he had the belief system in his model of the world that women weren't attracted to him ... she's laughing and smiling she's leaning in her body language is very open and afterwards ... he said Stefan no you know women aren't attracted to me ... he ends up getting her phone number and then afterwards he says Stefan no you know she's just being nice to me it's probably a fake phone number ... his belief system was creating a blind spot and not allowing him to see",
    "videoId": "4789IM-_-i4",
    "context": " \"he had the belief system in his model of the world that women weren't attracted to him ... she's laughing and smiling she's leaning in her body language is very open and afterwards ... he said Stefan no you know women aren't attracted to me ... he ends up getting her phone number and then afterwar",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-34",
    "text": "all fears are learned but it can also be unlearned all beliefs are learned and so therefore it can also be unlearned",
    "videoId": "4789IM-_-i4",
    "context": " \"all fears are learned but it can also be unlearned all beliefs are learned and so therefore it can also be unlearned\" — 4789IM-_-i4 ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-35",
    "text": "you got to do an inventory you got to do an inventory of your mindset and your beliefs the most important thing to change your life is to have awareness so you got to catch yourself when you have a limiting belief a story that comes up is preventing you from moving forward",
    "videoId": "oLQiUIJ7PsQ",
    "context": " \"you got to do an inventory you got to do an inventory of your mindset and your beliefs the most important thing to change your life is to have awareness so you got to catch yourself when you have a limiting belief a story that comes up is preventing you from moving forward\" — oLQiUIJ7PsQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-36",
    "text": "write down right now as you're watching this video write down some of your limiting beliefs what's showing up for you what's coming up right now as I speak about this write it down so that you can come back to them",
    "videoId": "F4j974PvwSQ",
    "context": " \"write down right now as you're watching this video write down some of your limiting beliefs what's showing up for you what's coming up right now as I speak about this write it down so that you can come back to them\" — F4j974PvwSQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-37",
    "text": "whatever you attach the words I am to is what you become whatever you say I am and you fill in the blank is creating ... your identity is a series of beliefs about who you are",
    "videoId": "F4j974PvwSQ",
    "context": " \"whatever you attach the words I am to is what you become whatever you say I am and you fill in the blank is creating ... your identity is a series of beliefs about who you are\" — F4j974PvwSQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-38",
    "text": "we also have beliefs that are inner conflicts where you believe something is possible but you believe that you can't do it and that creates a conflict because you want it you want to pursue it you know it's possible there's a part of you that doubts whether or not you can actually make that happen and if we can resolve these inner conflicts ... then it can transform your life",
    "videoId": "F4j974PvwSQ",
    "context": " \"we also have beliefs that are inner conflicts where you believe something is possible but you believe that you can't do it and that creates a conflict because you want it you want to pursue it you know it's possible there's a part of you that doubts whether or not you can actually make that happen",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-39",
    "text": "the question is not whether or not they're true is it useful does it empower you does it serve you that's the most important thing when you decide you're gonna take on something is it gonna serve you in your life",
    "videoId": "4789IM-_-i4",
    "context": " \"the question is not whether or not they're true is it useful does it empower you does it serve you that's the most important thing when you decide you're gonna take on something is it gonna serve you in your life\" — 4789IM-_-i4 ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-40",
    "text": "you got to catch yourself and look at that say is that serving me in my life is that empowering me is it useful is that a positive belief or is it a negative belief is it empowering or is it disempowering",
    "videoId": "oLQiUIJ7PsQ",
    "context": " \"you got to catch yourself and look at that say is that serving me in my life is that empowering me is it useful is that a positive belief or is it a negative belief is it empowering or is it disempowering\" — oLQiUIJ7PsQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-41",
    "text": "does that really serve you in your life does that empower you in your life does it make you feel good about yourself does it make you pursue life and goals and dreams ... see if it doesn't serve you in your life why believe it why hold on to it",
    "videoId": "F4j974PvwSQ",
    "context": " \"does that really serve you in your life does that empower you in your life does it make you feel good about yourself does it make you pursue life and goals and dreams ... see if it doesn't serve you in your life why believe it why hold on to it\" — F4j974PvwSQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-42",
    "text": "I will change a belief in an instant the moment that I see the consequence of it that it's not serving me in my life or serving others. And I'm very open-minded and not attached in any way to taking on a new belief system that can serve and support me instead.",
    "videoId": "cx0Qq1P5AHs",
    "context": " \"I will change a belief in an instant the moment that I see the consequence of it that it's not serving me in my life or serving others. And I'm very open-minded and not attached in any way to taking on a new belief system that can serve and support me instead.\" — cx0Qq1P5AHs ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-43",
    "text": "is it helpful for me to believe that I'm ugly of course not if I believe that I'm ugly what actions will that lead to well that will lead to no actions and approaching the opposite sex would lead to low self-esteem and depression and the result from that is I'll probably be alone for the rest of my life",
    "videoId": "oLQiUIJ7PsQ",
    "context": " \"is it helpful for me to believe that I'm ugly of course not if I believe that I'm ugly what actions will that lead to well that will lead to no actions and approaching the opposite sex would lead to low self-esteem and depression and the result from that is I'll probably be alone for the rest of m",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-44",
    "text": "Colonel Sanders the founder of Kentucky Fried Chicken ... if they can do it you can too that's evidence to support that that is possible",
    "videoId": "F4j974PvwSQ",
    "context": "Same for \"too old\": \"Colonel Sanders the founder of Kentucky Fried Chicken ... if they can do it you can too that's evidence to support that that is possible\" ( F4j974PvwSQ ).",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-45",
    "text": "I used to believe that I was shy but it wasn't really true in fact when I started realizing and finding evidence to support times when I wasn't shy times where I was expressing myself I was a little bit more outgoing I was more confident I used that as evidence to now support reasons why I am confident why I'm social why I'm outgoing and I fed that new empowering belief rather than continuing to feed the limiting one",
    "videoId": "F4j974PvwSQ",
    "context": " \"I used to believe that I was shy but it wasn't really true in fact when I started realizing and finding evidence to support times when I wasn't shy times where I was expressing myself I was a little bit more outgoing I was more confident I used that as evidence to now support reasons why I am conf",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-46",
    "text": "if something does not serve and empower you then create a new empowering alternative start believing that you are attractive that you are good enough and even though you might not be able to find evidence to support that what will happen is the results in your life will create the evidence that will be manifested based on your actions because when you start taking action believing that you are good enough you are attractive guess what shows up amazing results that you can now point to and say see I am good enough I am attractive",
    "videoId": "F4j974PvwSQ",
    "context": " \"if something does not serve and empower you then create a new empowering alternative start believing that you are attractive that you are good enough and even though you might not be able to find evidence to support that what will happen is the results in your life will create the evidence that wi",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-47",
    "text": "if it's limiting your life then maybe you should change it maybe you got to change that belief and upgrade it to a new belief a new software new app that says I make the money for whatever I'm committed to",
    "videoId": "oLQiUIJ7PsQ",
    "context": " \"if it's limiting your life then maybe you should change it maybe you got to change that belief and upgrade it to a new belief a new software new app that says I make the money for whatever I'm committed to\" — oLQiUIJ7PsQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-48",
    "text": "I don't have the time",
    "videoId": "F4j974PvwSQ",
    "context": "- \"I don't have the time\" → \"I have an abundance of time, I have the time for whatever it is that I want and I'm committed enough to my life\" ( F4j974PvwSQ )",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-49",
    "text": "I have an abundance of time, I have the time for whatever it is that I want and I'm committed enough to my life",
    "videoId": "F4j974PvwSQ",
    "context": "- \"I don't have the time\" → \"I have an abundance of time, I have the time for whatever it is that I want and I'm committed enough to my life\" ( F4j974PvwSQ )",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-50",
    "text": "I don't have the money",
    "videoId": "F4j974PvwSQ",
    "context": "- \"I don't have the money\" → \"I have the money for whatever I'm committed enough to in my life, if I'm committed I will find a way to get the money for this\" ( F4j974PvwSQ )",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-51",
    "text": "I have the money for whatever I'm committed enough to in my life, if I'm committed I will find a way to get the money for this",
    "videoId": "F4j974PvwSQ",
    "context": "- \"I don't have the money\" → \"I have the money for whatever I'm committed enough to in my life, if I'm committed I will find a way to get the money for this\" ( F4j974PvwSQ )",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-52",
    "text": "you can do whatever it is that you set your mind to that's the new belief that you really have to embody",
    "videoId": "F4j974PvwSQ",
    "context": "- \"I can't ___\" → \"you can do whatever it is that you set your mind to that's the new belief that you really have to embody\" ( F4j974PvwSQ )",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-54",
    "text": "success is not a matter of ability it's always a matter of motivation",
    "videoId": "F4j974PvwSQ",
    "context": " \"success is not a matter of ability it's always a matter of motivation\" — F4j974PvwSQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-55",
    "text": "when you say to yourself I don't have the money here's the issue with that is that you're now closing off your mind from any possibility any creativity ... and if you start asking yourself instead how can I come up with the money how can I find ways to get money for this now you start being creative",
    "videoId": "F4j974PvwSQ",
    "context": " \"when you say to yourself I don't have the money here's the issue with that is that you're now closing off your mind from any possibility any creativity ... and if you start asking yourself instead how can I come up with the money how can I find ways to get money for this now you start being creati",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-56",
    "text": "one thing I like to do with the new empowering belief I write it down I say it out loud again and again and again every single day to really reinforce and condition that as being true for me",
    "videoId": "F4j974PvwSQ",
    "context": " \"one thing I like to do with the new empowering belief I write it down I say it out loud again and again and again every single day to really reinforce and condition that as being true for me\" — F4j974PvwSQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-57",
    "text": "as long as we challenge the old beliefs we create a new empowering one and we just got to condition it again and again and again and that new belief becomes your reality",
    "videoId": "F4j974PvwSQ",
    "context": " \"as long as we challenge the old beliefs we create a new empowering one and we just got to condition it again and again and again and that new belief becomes your reality\" — F4j974PvwSQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-58",
    "text": "identify these thoughts identify these limiting beliefs that are sabotaging their success identify them and then use [the] morning ritual ... replace them [with] affirmations incantations and just replacing them every single day if you do that within 30 days 60 days you can have a totally different mindset and those old thoughts and beliefs that are holding you back are going to disappear",
    "videoId": "jTVs9IbF8L0",
    "context": " \"identify these thoughts identify these limiting beliefs that are sabotaging their success identify them and then use [the] morning ritual ... replace them [with] affirmations incantations and just replacing them every single day if you do that within 30 days 60 days you can have a totally differen",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-59",
    "text": "you can condition your belief system your mindset by every day you write down your affirmations so I used to take out my journal every day when I was 18 years old and I'd write it out again and again I am confident I am confident I am confident I have pages of that that I still have in storage ... because whatever you attach I am to is what you become",
    "videoId": "PWCSSH_wYDg",
    "context": " \"you can condition your belief system your mindset by every day you write down your affirmations so I used to take out my journal every day when I was 18 years old and I'd write it out again and again I am confident I am confident I am confident I have pages of that that I still have in storage ...",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-60",
    "text": "a lot of people think that when I see it then I'll believe it it's actually the other way around it's not until you believe it that's when you start to see it",
    "videoId": "F4j974PvwSQ",
    "context": " \"a lot of people think that when I see it then I'll believe it it's actually the other way around it's not until you believe it that's when you start to see it\" — F4j974PvwSQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-61",
    "text": "some people will say that when I see it then I'll believe it. It's actually the other way around ... when you start to believe in something you have faith in it then you notice it start showing up all around you.",
    "videoId": "cx0Qq1P5AHs",
    "context": " \"some people will say that when I see it then I'll believe it. It's actually the other way around ... when you start to believe in something you have faith in it then you notice it start showing up all around you.\" — cx0Qq1P5AHs ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-62",
    "text": "would say over and over and over to himself I am the greatest I am the greatest I am the greatest before he won anything",
    "videoId": "F4j974PvwSQ",
    "context": " Muhammad Ali \"would say over and over and over to himself I am the greatest I am the greatest I am the greatest before he won anything\" — F4j974PvwSQ (repeated in 4789IM-_-i4 )",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-63",
    "text": "having role models and references the more role models and references you have of success other people that are just like you people that are average people from all different walks of life that made it happen right they started with nothing and they became successful the more of those that you gather the more of those that you find they become references they become like the legs to a tabletop which is your belief and they support it the more legs you have the more secure the stronger that belief is",
    "videoId": "bDdDQeugO64",
    "context": " \"having role models and references the more role models and references you have of success other people that are just like you people that are average people from all different walks of life that made it happen right they started with nothing and they became successful the more of those that you ga",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-64",
    "text": "the more that you find those role models it's creating references for you that are supporting the belief that if they can do it then you can do it too",
    "videoId": "mjVjmmEQysg",
    "context": " \"the more that you find those role models it's creating references for you that are supporting the belief that if they can do it then you can do it too\" — mjVjmmEQysg ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-65",
    "text": "having references are really important references as in other people that you've seen that have created that kind of success",
    "videoId": "s3oeWqLd68Y",
    "context": " \"having references are really important references as in other people that you've seen that have created that kind of success\" — s3oeWqLd68Y ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-66",
    "text": "one of my favorite ways of doing that ... I love coming across empowering belief systems so when I study success and the greatest people through history I'm always looking for quotes or belief systems that make them great",
    "videoId": "oLQiUIJ7PsQ",
    "context": " \"one of my favorite ways of doing that ... I love coming across empowering belief systems so when I study success and the greatest people through history I'm always looking for quotes or belief systems that make them great\" — oLQiUIJ7PsQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-67",
    "text": "By reading quotes from Gandhi Nelson Mandela Mother Teresa Jesus Christ ... you're taking on their beliefs. Because that's really all their quote is ... those are belief systems that are incredibly valuable beliefs to take on and to adopt if they enhance and enrich your life.",
    "videoId": "cx0Qq1P5AHs",
    "context": " \"By reading quotes from Gandhi Nelson Mandela Mother Teresa Jesus Christ ... you're taking on their beliefs. Because that's really all their quote is ... those are belief systems that are incredibly valuable beliefs to take on and to adopt if they enhance and enrich your life.\" — cx0Qq1P5AHs ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-68",
    "text": "you got to find who those people are and you got to study them you got to model them you got to download their software their beliefs and you got to implant that in your own mind because your brain is a computer",
    "videoId": "oLQiUIJ7PsQ",
    "context": " \"you got to find who those people are and you got to study them you got to model them you got to download their software their beliefs and you got to implant that in your own mind because your brain is a computer\" — oLQiUIJ7PsQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-69",
    "text": "who you spend time with is who you become that's one of the most important ways to change your beliefs and to get around other people that will hold you to a higher standard surround yourself with people that will not accept anything less than a high standard they'll not accept you lying to yourself and telling yourself stories of limitation",
    "videoId": "F4j974PvwSQ",
    "context": " \"who you spend time with is who you become that's one of the most important ways to change your beliefs and to get around other people that will hold you to a higher standard surround yourself with people that will not accept anything less than a high standard they'll not accept you lying to yourse",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-70",
    "text": "it doesn't feel good to challenge your beliefs I get it because most of us we're unconscious we use our beliefs to justify and rationalize things in our life because it makes us feel good if you can have a great friend or a great coach that can call you on your BS and say hey brother hey sister man you're selling yourself short right now this is not really true you're more than this ... that's a valuable thing to have in your life because the truth will set you free",
    "videoId": "F4j974PvwSQ",
    "context": " \"it doesn't feel good to challenge your beliefs I get it because most of us we're unconscious we use our beliefs to justify and rationalize things in our life because it makes us feel good if you can have a great friend or a great coach that can call you on your BS and say hey brother hey sister ma",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-71",
    "text": "I'm not just here to support you and encourage you I'm here to challenge you I'm here to challenge you on some of the patterns that you have of thinking to look at them and say is this really true is this serving me is this empowering me in my life and if it's not let's get rid of it let's create something new",
    "videoId": "F4j974PvwSQ",
    "context": " \"I'm not just here to support you and encourage you I'm here to challenge you I'm here to challenge you on some of the patterns that you have of thinking to look at them and say is this really true is this serving me is this empowering me in my life and if it's not let's get rid of it let's create ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-72",
    "text": "your brain is like a computer ... you've got this amazing piece of hardware called your brain which is capable of so much ... but your software the apps that are installed on it are outdated they're old you've never examined them before in your entire life ... and not only that you got viruses and malware on that system that you've never wiped out",
    "videoId": "4789IM-_-i4",
    "context": " \"your brain is like a computer ... you've got this amazing piece of hardware called your brain which is capable of so much ... but your software the apps that are installed on it are outdated they're old you've never examined them before in your entire life ... and not only that you got viruses and",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-73",
    "text": "if I install that you are rich that you are abundant that you are successful that you are confident all those sort of things your behavior is going to match that ... which will therefore reinforce those beliefs that you have",
    "videoId": "4789IM-_-i4",
    "context": " \"if I install that you are rich that you are abundant that you are successful that you are confident all those sort of things your behavior is going to match that ... which will therefore reinforce those beliefs that you have\" — 4789IM-_-i4 ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-74",
    "text": "never never never stop thinking of yourself as broke as a failure as not good enough don't even entertain those thoughts don't even feed into it don't even give energy to it",
    "videoId": "4789IM-_-i4",
    "context": " \"never never never stop thinking of yourself as broke as a failure as not good enough don't even entertain those thoughts don't even feed into it don't even give energy to it\" — 4789IM-_-i4 ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-75",
    "text": "he's got a whole process called the Dickens process and it's basically a couple-hour process to overcome three limiting beliefs from your life and you identify the beliefs and he shares with you the seven steps to lasting change ... once you identify your limiting beliefs it's really about getting to the truth because these limiting beliefs also known as BS by the way belief systems they're not true they're just these stories that we've told ourselves and when you can get to the truth which is often just the antithesis of what your limiting belief is then you're free from it and then once you identify your new belief that you want instead you're just going to be able to interrupt the old pattern the old belief and then condition a new belief",
    "videoId": "jTVs9IbF8L0",
    "context": " \"he's got a whole process called the Dickens process and it's basically a couple-hour process to overcome three limiting beliefs from your life and you identify the beliefs and he shares with you the seven steps to lasting change ... once you identify your limiting beliefs it's really about getting",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-76",
    "text": "one of the first steps is just knowing what you want ... The second step is to get leverage on yourself because it's not until, you know, we are controlled by pain and pleasure ... it's only once you associate massive pain to eating that food and pleasure to eating something healthy and more nurturing for your body, and you make that association, you switch that around, that will help free you from that addiction",
    "videoId": "3oem_bNxIUw",
    "context": " \"one of the first steps is just knowing what you want ... The second step is to get leverage on yourself because it's not until, you know, we are controlled by pain and pleasure ... it's only once you associate massive pain to eating that food and pleasure to eating something healthy and more nurtu",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-77",
    "text": "most people describe fear as an acronym which stands for false evidence appearing real but what fear really is is anticipation of pain fear is anticipation of pain ... that fear is just an anticipation of pain that your brain is trying to protect you from",
    "videoId": "bFkN3_9VXjE",
    "context": " \"most people describe fear as an acronym which stands for false evidence appearing real but what fear really is is anticipation of pain fear is anticipation of pain ... that fear is just an anticipation of pain that your brain is trying to protect you from\" — bFkN3_9VXjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-78",
    "text": "fear's job is to keep you within your comfort zone the realm of what's already familiar for you also known as your danger zone because the thing is everything you want in your life ... is outside of your realm of comfort because you'd already have it if it was already within it",
    "videoId": "bFkN3_9VXjE",
    "context": " \"fear's job is to keep you within your comfort zone the realm of what's already familiar for you also known as your danger zone because the thing is everything you want in your life ... is outside of your realm of comfort because you'd already have it if it was already within it\" — bFkN3_9VXjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-79",
    "text": "the moment you take a step over that line outside your comfort zone you're gonna feel afraid you're gonna feel anxiety you're gonna feel nervous and that's a good thing because that means that you're growing and if it's not uncomfortable if you don't have fear then it's already within your comfort zone and so you should always be intentionally finding what scares you and facing it",
    "videoId": "bFkN3_9VXjE",
    "context": " \"the moment you take a step over that line outside your comfort zone you're gonna feel afraid you're gonna feel anxiety you're gonna feel nervous and that's a good thing because that means that you're growing and if it's not uncomfortable if you don't have fear then it's already within your comfort",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-80",
    "text": "on the other side of fear is the person that you want to be and the life that you want",
    "videoId": "bFkN3_9VXjE",
    "context": " \"on the other side of fear is the person that you want to be and the life that you want\" — bFkN3_9VXjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-81",
    "text": "you'll never overcome fear but you can tame it and you can use it to your advantage",
    "videoId": "bFkN3_9VXjE",
    "context": " \"you'll never overcome fear but you can tame it and you can use it to your advantage\" — bFkN3_9VXjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-82",
    "text": "you're afraid of going for your dreams but what you should be more afraid of is not going for your dreams that should terrify the hell out of you ... you should be more afraid of what your life's gonna be like living a life that you're not living your potential ... having this feeling of regret this feeling of what if that should terrify you more than the fear of going for it",
    "videoId": "bFkN3_9VXjE",
    "context": " \"you're afraid of going for your dreams but what you should be more afraid of is not going for your dreams that should terrify the hell out of you ... you should be more afraid of what your life's gonna be like living a life that you're not living your potential ... having this feeling of regret th",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-83",
    "text": "the fear that you might have of rejection and failure right let's say it's right here you should build your fear of not going for it to be up here and in doing so it conquers that fear of whatever is holding you back",
    "videoId": "bFkN3_9VXjE",
    "context": " \"the fear that you might have of rejection and failure right let's say it's right here you should build your fear of not going for it to be up here and in doing so it conquers that fear of whatever is holding you back\" — bFkN3_9VXjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-84",
    "text": "people that I've found that are most successful are the most afraid ... I'm terrified of being broke I'm terrified of being in debt I'm terrified of working for someone else ... and therefore those fears serve me and empower me and fuel me to take action",
    "videoId": "bFkN3_9VXjE",
    "context": " \"people that I've found that are most successful are the most afraid ... I'm terrified of being broke I'm terrified of being in debt I'm terrified of working for someone else ... and therefore those fears serve me and empower me and fuel me to take action\" — bFkN3_9VXjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-85",
    "text": "ask yourself questions that elicit fear and these emotions in a more empowering way you should be asking yourself the question man what if I don't go for it what's my life gonna be like five years from now if I don't go for it and make this change ... what's the pain what's the consequence of that what's the real pain of that right associate not going for it to massive pain and then look at hey you know if I do go for it what's the pleasure what's the benefit how will this enrich my life",
    "videoId": "bFkN3_9VXjE",
    "context": " \"ask yourself questions that elicit fear and these emotions in a more empowering way you should be asking yourself the question man what if I don't go for it what's my life gonna be like five years from now if I don't go for it and make this change ... what's the pain what's the consequence of that",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-86",
    "text": "the way you overcome it is get leverage on yourself by realizing the consequence of not going for it and be more afraid of that that will get you out of fear that will get you taking action in a heartbeat",
    "videoId": "bFkN3_9VXjE",
    "context": " \"the way you overcome it is get leverage on yourself by realizing the consequence of not going for it and be more afraid of that that will get you out of fear that will get you taking action in a heartbeat\" — bFkN3_9VXjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-88",
    "text": "you're either a warning or an example and that's your choice",
    "videoId": "bFkN3_9VXjE",
    "context": " \"you're either a warning or an example and that's your choice\" — bFkN3_9VXjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-89",
    "text": "make a list right now guys what are the top fears you have and commit to doing it commit to doing it whatever it takes and every time you do it you're gonna get more confidence every time you do it you're gonna reclaim more of yourself your real identity",
    "videoId": "bFkN3_9VXjE",
    "context": " \"make a list right now guys what are the top fears you have and commit to doing it commit to doing it whatever it takes and every time you do it you're gonna get more confidence every time you do it you're gonna reclaim more of yourself your real identity\" — bFkN3_9VXjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-91",
    "text": "I learned from Tony Robbins and Jim Rohn that if you can't then you must",
    "videoId": "bFkN3_9VXjE",
    "context": " \"I learned from Tony Robbins and Jim Rohn that if you can't then you must\" — bFkN3_9VXjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-92",
    "text": "if I say I'm afraid to do this but I don't do it then I'm admitting a limitation to myself I'm actually cheating myself and everyone that I love",
    "videoId": "bFkN3_9VXjE",
    "context": " \"if I say I'm afraid to do this but I don't do it then I'm admitting a limitation to myself I'm actually cheating myself and everyone that I love\" — bFkN3_9VXjE ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-93",
    "text": "there's no failure there's only feedback and I only fail if I don't learn as long as I learn something that is worthwhile because the only failure is not doing anything listen if you're not taking action in your life you're failing right now so if you don't try you're ensuring your failure if you do go for it you might fail but at least you can look yourself in the mirror each day proud of yourself knowing that you're becoming more",
    "videoId": "bFkN3_9VXjE",
    "context": " \"there's no failure there's only feedback and I only fail if I don't learn as long as I learn something that is worthwhile because the only failure is not doing anything listen if you're not taking action in your life you're failing right now so if you don't try you're ensuring your failure if you ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-94",
    "text": "there's no such thing as failure there's no such thing as failure failure is a meaning it's an interpretation that you made up around a certain event in your life you made it mean that it's a failure and therefore it equals pain in my life and I don't want to experience that pain again if you can change your mindset to instead realize that that's not failure that's a lesson there's a learning there there's a gift in this experience of what happened and there's an opportunity in that if you change your perception you look at it in that way then it's no longer a painful event",
    "videoId": "QZjdmXreWd0",
    "context": " \"there's no such thing as failure there's no such thing as failure failure is a meaning it's an interpretation that you made up around a certain event in your life you made it mean that it's a failure and therefore it equals pain in my life and I don't want to experience that pain again if you can ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-95",
    "text": "rejection doesn't really exist. It's all how you interpret it. Also, it's really actually a blessing too, because rejection is always feedback. That's how you learn.",
    "videoId": "wnsM113Lqzs",
    "context": " \"rejection doesn't really exist. It's all how you interpret it. Also, it's really actually a blessing too, because rejection is always feedback. That's how you learn.\" — wnsM113Lqzs ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-96",
    "text": "the only way that you know where the line is, is by crossing the line, by doing things that are uncomfortable that are going to offend people ... Then you know where the line is",
    "videoId": "wnsM113Lqzs",
    "context": " \"the only way that you know where the line is, is by crossing the line, by doing things that are uncomfortable that are going to offend people ... Then you know where the line is\" — wnsM113Lqzs ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-97",
    "text": "If somebody watches this video right now and they said, 'You suck. I hate you.' That has nothing to do with me ... all it is, is a projection.",
    "videoId": "wnsM113Lqzs",
    "context": " \"If somebody watches this video right now and they said, 'You suck. I hate you.' That has nothing to do with me ... all it is, is a projection.\" — wnsM113Lqzs ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-99",
    "text": "you get to make up whatever these beliefs are",
    "videoId": "F4j974PvwSQ",
    "context": " \"you get to make up whatever these beliefs are\" / defining success existing entry, F4j974PvwSQ ",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-102",
    "text": "lying of any kind lowers our self-esteem",
    "videoId": "n_vo-SBhB1I",
    "context": "9. The five self-esteem builders ( n_vo-SBhB1I ) — especially \"lying of any kind lowers our self-esteem\" and \"do the job right, don't dust around the plant\". A completely different lever from goals or state.",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-104",
    "text": "There's no such thing as failure — failure is a meaning you made up",
    "videoId": "QZjdmXreWd0",
    "context": "10. \"There's no such thing as failure — failure is a meaning you made up\" ( QZjdmXreWd0 ) and rejection-as-feedback ( wnsM113Lqzs ).",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-107",
    "text": "feel the fear and do it anyway",
    "videoId": "bFkN3_9VXjE",
    "context": "- No \"do it scared\" — zero hits (the equivalent is \"feel the fear and do it anyway\", cited to the Susan Jeffers book, in bFkN3_9VXjE and mxl2l-QBD0s ).",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-identity-109",
    "text": "do an inventory of your mindset and your beliefs",
    "videoId": "oLQiUIJ7PsQ",
    "context": "- No structured \"belief audit\" worksheet or numbered-belief template; the closest is \"do an inventory of your mindset and your beliefs\" ( oLQiUIJ7PsQ ) and \"write down some of your limiting beliefs\" ( F4j974PvwSQ ).",
    "artifact": "phase2-identity"
  },
  {
    "id": "phase2-onboarding-2",
    "text": "so these four things are the driving force this is what just really Sparks you",
    "videoId": "8kco2rjijjE",
    "context": " \"so these four things are the driving force this is what just really Sparks you\" — 8kco2rjijjE ",
    "artifact": "phase2-onboarding"
  },
  {
    "id": "phase2-onboarding-3",
    "text": "it's not until you master your health I think that's the foundation of life",
    "videoId": "Kz83kMosOWU",
    "context": " \"it's not until you master your health I think that's the foundation of life\" — Kz83kMosOWU ",
    "artifact": "phase2-onboarding"
  },
  {
    "id": "phase2-onboarding-4",
    "text": "I recommend doing this every week if you can",
    "videoId": "I-SoCQvNi9A",
    "context": " \"I recommend doing this every week if you can\" — I-SoCQvNi9A ",
    "artifact": "phase2-onboarding"
  },
  {
    "id": "phase2-onboarding-5",
    "text": "a lot of people they Master One area but they're not mastering them all",
    "videoId": "Kz83kMosOWU",
    "context": " \"a lot of people they Master One area but they're not mastering them all\" — Kz83kMosOWU ",
    "artifact": "phase2-onboarding"
  },
  {
    "id": "phase2-onboarding-6",
    "text": "I encourage you take out a journal take out your computer and write down your goals",
    "videoId": "ZywgvFSnH38",
    "context": " \"I encourage you take out a journal take out your computer and write down your goals\" — ZywgvFSnH38 ",
    "artifact": "phase2-onboarding"
  },
  {
    "id": "phase2-onboarding-7",
    "text": "nobody can tell you what that is but you",
    "videoId": "HbLlMjqq41Y",
    "context": " \"nobody can tell you what that is but you\" — HbLlMjqq41Y ",
    "artifact": "phase2-onboarding"
  },
  {
    "id": "phase2-onboarding-8",
    "text": "for me I have it written out in my apartment I have it on my desk I have a vision board",
    "videoId": "8kco2rjijjE",
    "context": " \"for me I have it written out in my apartment I have it on my desk I have a vision board\" — 8kco2rjijjE ",
    "artifact": "phase2-onboarding"
  },
  {
    "id": "phase2-purpose-0",
    "text": "don't be perfect with defining what your mission is I know a lot of people they make this more complex than it really needs to be complexity is the enemy of execution … your mission statement is not something that's set in stone you know you can change it any point in your life and evolve it … I think that's one of the biggest things that holds people back from actually doing this you know they they feel like their purpose or their mission is this this big mysterious thing that they take some a lifetime to discover what that is and I say you know just pick something that you want your life to be about",
    "videoId": "fICEjqpKfoY",
    "context": " \"don't be perfect with defining what your mission is I know a lot of people they make this more complex than it really needs to be complexity is the enemy of execution … your mission statement is not something that's set in stone you know you can change it any point in your life and evolve it … I t",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-1",
    "text": "don't look for the perfect answer man just trust yourself there's no perfect answer purpose can change you can evolve it's not stagnant it's dynamic maybe you have a purpose right now for this stage your life a calling that you need to fulfill pursue",
    "videoId": "HbLlMjqq41Y",
    "context": " \"don't look for the perfect answer man just trust yourself there's no perfect answer purpose can change you can evolve it's not stagnant it's dynamic maybe you have a purpose right now for this stage your life a calling that you need to fulfill pursue\" — HbLlMjqq41Y (repeated verbatim in hlJYapcgKM",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-2",
    "text": "even if you do find your purpose, it's not like there's a permanence to that. You know, you're going to find things in your life that you'll be excited for and passionate about and give you purpose at different stages, but then at times you might lose touch with that purpose and look for other things. … don't wait for what your calling is or your purpose is. Just pursue opportunities that are in alignment with who you want to be, what you want out of your life. Start a business, read books, start new hobbies, new interests, and you can find purpose and meaning in all those things.",
    "videoId": "5ITfL1jNAsM",
    "context": " \"even if you do find your purpose, it's not like there's a permanence to that. You know, you're going to find things in your life that you'll be excited for and passionate about and give you purpose at different stages, but then at times you might lose touch with that purpose and look for other thi",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-3",
    "text": "my purpose has completely changed from what it was at 39 years old of, you know, being an influencer. Now my purpose is more with my family, more more growing and developing myself in other ways. you know, my I find purpose through God, my relationship with my creator.",
    "videoId": "5ITfL1jNAsM",
    "context": "His own purpose has changed since: \"my purpose has completely changed from what it was at 39 years old of, you know, being an influencer. Now my purpose is more with my family, more more growing and developing myself in other ways. you know, my I find purpose through God, my relationship with my cre",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-4",
    "text": "they're not living their purpose in life you're not doing what you're meant to do on this planet and you've got to figure out what that is only you know what that is nobody can tell you nobody can give you that answer comes a time in your life guys you got to stop asking the questions of everybody else and you got to start asking the questions of yourself because you have the answers",
    "videoId": "HbLlMjqq41Y",
    "context": " \"they're not living their purpose in life you're not doing what you're meant to do on this planet and you've got to figure out what that is only you know what that is nobody can tell you nobody can give you that answer comes a time in your life guys you got to stop asking the questions of everybody",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-5",
    "text": "the first thing I'll say is release the expectation that you have to have it all figured out that at this stage of your life you gotta know with a hundred percent clarity that this is what you're gonna do for the rest of your life because the reality is nobody knows that",
    "videoId": "duKiFg3BP4w",
    "context": " \"the first thing I'll say is release the expectation that you have to have it all figured out that at this stage of your life you gotta know with a hundred percent clarity that this is what you're gonna do for the rest of your life because the reality is nobody knows that\" — duKiFg3BP4w ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-6",
    "text": "it's very naive to think at this stage of your life that you're gonna have it all figured out you're not in fact that's a very fixed way of looking at things it's a very limiting way putting yourself in a box",
    "videoId": "duKiFg3BP4w",
    "context": " \"it's very naive to think at this stage of your life that you're gonna have it all figured out you're not in fact that's a very fixed way of looking at things it's a very limiting way putting yourself in a box\" — duKiFg3BP4w ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-7",
    "text": "it's okay if you don't have it all figured out nobody does just choose a path choose a direction that interests you right now learn about it give it a chance put some time into it",
    "videoId": "duKiFg3BP4w",
    "context": " \"it's okay if you don't have it all figured out nobody does just choose a path choose a direction that interests you right now learn about it give it a chance put some time into it\" — duKiFg3BP4w ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-8",
    "text": "the second second thing I'd say is ask yourself questions and journal about what's important to you in your job in a career in a business what's important to you right now and be prepared for that to change as you go",
    "videoId": "duKiFg3BP4w",
    "context": " \"the second second thing I'd say is ask yourself questions and journal about what's important to you in your job in a career in a business what's important to you right now and be prepared for that to change as you go\" — duKiFg3BP4w ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-9",
    "text": "for me what's important is freedom you know I want to make sure I have freedom to do what I want when I want that's always been very important for me other people they don't value freedom for them what's important is security",
    "videoId": "duKiFg3BP4w",
    "context": " \"for me what's important is freedom you know I want to make sure I have freedom to do what I want when I want that's always been very important for me other people they don't value freedom for them what's important is security\" — duKiFg3BP4w ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-10",
    "text": "another thing that was important to me was making a difference … so that was something important for me that became part of my criteria when I started looking at the options that I had and what direction I could go I wanted freedom and I wanted to be able to make a difference",
    "videoId": "duKiFg3BP4w",
    "context": " \"another thing that was important to me was making a difference … so that was something important for me that became part of my criteria when I started looking at the options that I had and what direction I could go I wanted freedom and I wanted to be able to make a difference\" — duKiFg3BP4w ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-11",
    "text": "as you look at opportunities you have a criteria checklist you can look does that meet this need does this fulfill the freedom that I want does this fulfill the growth that I want does this fulfill the financial you know abundance that I desire and you can find and look for things that meet the criteria that's important and then you go down that path",
    "videoId": "duKiFg3BP4w",
    "context": " \"as you look at opportunities you have a criteria checklist you can look does that meet this need does this fulfill the freedom that I want does this fulfill the growth that I want does this fulfill the financial you know abundance that I desire and you can find and look for things that meet the cr",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-12",
    "text": "the third thing I would share with you is you've got to try a lot of different things because you're never going to know what the path is for you and what you really like until you try something until you gain experience",
    "videoId": "duKiFg3BP4w",
    "context": " \"the third thing I would share with you is you've got to try a lot of different things because you're never going to know what the path is for you and what you really like until you try something until you gain experience\" — duKiFg3BP4w ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-13",
    "text": "when you try things you got to give it a sufficient amount of time to give it a chance to really know if you like it or not because most often when you try anything new the beginning of it you suck",
    "videoId": "duKiFg3BP4w",
    "context": " \"when you try things you got to give it a sufficient amount of time to give it a chance to really know if you like it or not because most often when you try anything new the beginning of it you suck\" — duKiFg3BP4w ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-14",
    "text": "here's what I've learned to do any time I try anything new before I come to any judgement about it about whether I like it or not whether I'm good at it or not I gotta at least give it a month at least one month and a fair enough effort a fair enough chance before coming to a certain conclusion",
    "videoId": "tz4CGFsupQY",
    "context": " \"here's what I've learned to do any time I try anything new before I come to any judgement about it about whether I like it or not whether I'm good at it or not I gotta at least give it a month at least one month and a fair enough effort a fair enough chance before coming to a certain conclusion\" —",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-15",
    "text": "so don't be quick to judge give something a fair enough chance for at least a month okay and make it a goal to try something new every month every month try something new go to a dance class and give it a go for a month try fishing or hunting or scuba diving or snorkeling or hiking whatever might be give it a month a month commit to it",
    "videoId": "tz4CGFsupQY",
    "context": " \"so don't be quick to judge give something a fair enough chance for at least a month okay and make it a goal to try something new every month every month try something new go to a dance class and give it a go for a month try fishing or hunting or scuba diving or snorkeling or hiking whatever might ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-16",
    "text": "I believe that to find your passion you've got to go through the buffet of life right you got to be willing to try a lot of different things and have an open mind",
    "videoId": "tz4CGFsupQY",
    "context": " \"I believe that to find your passion you've got to go through the buffet of life right you got to be willing to try a lot of different things and have an open mind\" — tz4CGFsupQY (also \"the buffet of life\" in duKiFg3BP4w)",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-17",
    "text": "the buffet of life",
    "videoId": "tz4CGFsupQY",
    "context": " \"I believe that to find your passion you've got to go through the buffet of life right you got to be willing to try a lot of different things and have an open mind\" — tz4CGFsupQY (also \"the buffet of life\" in duKiFg3BP4w)",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-18",
    "text": "if you're going to start a business for example give it a chance give it a year you know don't just after a few weeks say oh this is not for me",
    "videoId": "duKiFg3BP4w",
    "context": " \"if you're going to start a business for example give it a chance give it a year you know don't just after a few weeks say oh this is not for me\" — duKiFg3BP4w ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-19",
    "text": "when you pursue them when you're actually doing these activities actually journal and actually pay attention to what about it you enjoy that you do like about it and what it is that you do not enjoy okay so coming at it from a place of awareness coming at it from a place of self-education",
    "videoId": "hlJYapcgKM8",
    "context": " \"when you pursue them when you're actually doing these activities actually journal and actually pay attention to what about it you enjoy that you do like about it and what it is that you do not enjoy okay so coming at it from a place of awareness coming at it from a place of self-education\" — hlJYa",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-20",
    "text": "so when you go down a certain path re-evaluate every year to ask yourself is this really what I want to do um what do I enjoy about what I'm doing what do I not enjoy and be open to other opportunities that can show up",
    "videoId": "duKiFg3BP4w",
    "context": " \"so when you go down a certain path re-evaluate every year to ask yourself is this really what I want to do um what do I enjoy about what I'm doing what do I not enjoy and be open to other opportunities that can show up\" — duKiFg3BP4w ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-21",
    "text": "go spend a few hours just be with yourself think about your life think about who you want to be on this planet what you want to have what you want to do what you want to contribute what you want your life to be about what you want your legacy to be and how you want to be remembered walk around for a few hours ask yourself the questions that few people are willing ask you know if there's no limits to your life what would you do would it look like what would it take for you to wake up each morning happy excited fulfilled passionate enthusiastic",
    "videoId": "HbLlMjqq41Y",
    "context": " \"go spend a few hours just be with yourself think about your life think about who you want to be on this planet what you want to have what you want to do what you want to contribute what you want your life to be about what you want your legacy to be and how you want to be remembered walk around for",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-22",
    "text": "you know what I recommend guys go for a few hours go nature go by the beach go by the forest let's go walk just by yourself alone be introspective and whatever comes up guys it's write it down write it out in a journal whatever comes up for you just write it out trust it ask yourself the questions that that are deep not the surface level ones … what is your purpose what were you put here for what is it that you're meant to do",
    "videoId": "HbLlMjqq41Y",
    "context": " \"you know what I recommend guys go for a few hours go nature go by the beach go by the forest let's go walk just by yourself alone be introspective and whatever comes up guys it's write it down write it out in a journal whatever comes up for you just write it out trust it ask yourself the questions",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-23",
    "text": "I don't care how long it takes you man walk all night if you gotta walk every day for a few hours a day until you find out what that is",
    "videoId": "HbLlMjqq41Y",
    "context": " \"I don't care how long it takes you man walk all night if you gotta walk every day for a few hours a day until you find out what that is\" — HbLlMjqq41Y ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-24",
    "text": "really encourage you to actually take out your pen and paper put yourself in an environment where there's no distractions uh make sure that you're in a great state you're feeling good maybe you meditate maybe go to Nature um but really go deep on this and spend some time you know spend a few hours if you need to",
    "videoId": "Lp_GOrM16Xc",
    "context": " \"really encourage you to actually take out your pen and paper put yourself in an environment where there's no distractions uh make sure that you're in a great state you're feeling good maybe you meditate maybe go to Nature um but really go deep on this and spend some time you know spend a few hours",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-25",
    "text": "I Stephan Platanos see know hear and feel that the purpose of my life is to be even more fully alive grow and make a difference in the lives of others",
    "videoId": "fICEjqpKfoY",
    "context": " \"I Stephan Platanos see know hear and feel that the purpose of my life is to be even more fully alive grow and make a difference in the lives of others\" — fICEjqpKfoY ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-26",
    "text": "I whatever your name is see you know hear and feel the purpose of my life is blank the purpose of my life is to grow and make a difference the purpose of my life is be more fully alive the purpose of my life is to love others and to be an example for others of what's possible whatever whatever you want it to be",
    "videoId": "fICEjqpKfoY",
    "context": " \"I whatever your name is see you know hear and feel the purpose of my life is blank the purpose of my life is to grow and make a difference the purpose of my life is be more fully alive the purpose of my life is to love others and to be an example for others of what's possible whatever whatever you",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-27",
    "text": "everything that I do every action I take every single day is an extension and is aligned with my mission everything that I do helps me be more alive helps me grow and helps me make a difference right now by creating this video for you guys I'm experiencing the aliveness of what my life's about",
    "videoId": "fICEjqpKfoY",
    "context": " \"everything that I do every action I take every single day is an extension and is aligned with my mission everything that I do helps me be more alive helps me grow and helps me make a difference right now by creating this video for you guys I'm experiencing the aliveness of what my life's about\" — ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-28",
    "text": "now you might be asking well Steph I don't know I don't know what my passion is I don't know what my purpose is listen the word passion is a very emotionally charged word it's often used a lot let me give you guys a different word an easier word a simpler word to use what do you enjoy okay so forget about the word passion what do you enjoy okay when you're enjoying something by the way I believe joy when you're in joy that's that's a clue okay that's a clue that if you're in joy and you're enjoying it you're connected to your hearts okay so start with that what do you enjoy what's a topic that you enjoy",
    "videoId": "naTjNwfiOxQ",
    "context": " \"now you might be asking well Steph I don't know I don't know what my passion is I don't know what my purpose is listen the word passion is a very emotionally charged word it's often used a lot let me give you guys a different word an easier word a simpler word to use what do you enjoy okay so forg",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-29",
    "text": "here's that little test that you can do hang out with some friends hang with some family members and just talk to them about certain areas okay certain things that come up for you okay different [niches] topics and when you're talking about it and you're sharing it with other people what lights you up what excites you you know that when you talk about it you get you get pumped up you get inspired … that's the clue man that's the clue right there that you're on to something you're on the right track",
    "videoId": "naTjNwfiOxQ",
    "context": " \"here's that little test that you can do hang out with some friends hang with some family members and just talk to them about certain areas okay certain things that come up for you okay different [niches] topics and when you're talking about it and you're sharing it with other people what lights yo",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-30",
    "text": "I can do it but that doesn't inspire me it doesn't light me up",
    "videoId": "naTjNwfiOxQ",
    "context": "He applies the test to himself as a contrast pair: teaching Amazon publishing = \"I can do it but that doesn't inspire me it doesn't light me up\"; teaching whole-life mastery = \"I'm gonna get fired up.\" ( naTjNwfiOxQ )",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-31",
    "text": "I'm gonna get fired up.",
    "videoId": "naTjNwfiOxQ",
    "context": "He applies the test to himself as a contrast pair: teaching Amazon publishing = \"I can do it but that doesn't inspire me it doesn't light me up\"; teaching whole-life mastery = \"I'm gonna get fired up.\" ( naTjNwfiOxQ )",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-32",
    "text": "what a lot of people understand is that they might have a job or they're going to school and they're say to might you know Stefan I don't have a mission I don't have a purpose well what I might say to you is why can't what you're doing right now be aligned with your mission and purpose what if going to school right now is a stepping stone allowing you to lead into your mission and purpose … What If this job that you have that you despise you instead look at it as a gift and actually a part of your mission because even though you might be building a business on the side … well this job is still part of that mission because that job provides for you it pays your bills the job provides some money that you can save and put aside that you can use to fund your mission and your purpose",
    "videoId": "Kz83kMosOWU",
    "context": " \"what a lot of people understand is that they might have a job or they're going to school and they're say to might you know Stefan I don't have a mission I don't have a purpose well what I might say to you is why can't what you're doing right now be aligned with your mission and purpose what if goi",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-33",
    "text": "this is a great way to prepare myself for my mission because at my job or my school I could develop the habits of success I can be more disciplined more productive I can think about how I can communicate better with other people … understand that right now you're already living your mission your purpose or it's a stepping stone or helping you prepare for that",
    "videoId": "Kz83kMosOWU",
    "context": " \"this is a great way to prepare myself for my mission because at my job or my school I could develop the habits of success I can be more disciplined more productive I can think about how I can communicate better with other people … understand that right now you're already living your mission your p",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-34",
    "text": "your mission might be your family your mission might be taking care of the household and really mastering that and there's nothing wrong with that",
    "videoId": "Kz83kMosOWU",
    "context": " \"your mission might be your family your mission might be taking care of the household and really mastering that and there's nothing wrong with that\" — Kz83kMosOWU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-35",
    "text": "well you don't really know if something is gonna be your passion or your mission unless you've already done it right because you can have these thoughts that yeah you know what when I get a job as the architect or when I get a job as a business owner or as an engineer or as a doctor then that's gonna be my passion well you don't really know that's gonna be your passion unless you're actually doing it already",
    "videoId": "hlJYapcgKM8",
    "context": " \"well you don't really know if something is gonna be your passion or your mission unless you've already done it right because you can have these thoughts that yeah you know what when I get a job as the architect or when I get a job as a business owner or as an engineer or as a doctor then that's go",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-36",
    "text": "I was lost confused I had no idea what I wanted to do in my life and I think that's pretty normal",
    "videoId": "hlJYapcgKM8",
    "context": " \"I was lost confused I had no idea what I wanted to do in my life and I think that's pretty normal\" (about himself at 17) — hlJYapcgKM8 ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-37",
    "text": "most people they try something once or twice or three times and they make a judgement based on their experience of that and they judge too soon they judge too quickly … so you might have tried this when you're 10 years old try dancing when you're 10 I don't like dancing and now you're 20 years old now you're 30 but you're allowing your past to dictate and define your present and your future",
    "videoId": "tz4CGFsupQY",
    "context": " \"most people they try something once or twice or three times and they make a judgement based on their experience of that and they judge too soon they judge too quickly … so you might have tried this when you're 10 years old try dancing when you're 10 I don't like dancing and now you're 20 years old",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-38",
    "text": "the brain doesn't even fully develop until you're in your mid-20s okay so understand that right now is a new moment a new opportunity",
    "videoId": "tz4CGFsupQY",
    "context": " \"the brain doesn't even fully develop until you're in your mid-20s okay so understand that right now is a new moment a new opportunity\" — tz4CGFsupQY ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-39",
    "text": "for me discipline weighs ounces regret weight is tons there's two paints of life the pain of discipline and the pain of regret the pain of regret weighs so much more",
    "videoId": "tz4CGFsupQY",
    "context": " \"for me discipline weighs ounces regret weight is tons there's two paints of life the pain of discipline and the pain of regret the pain of regret weighs so much more\" — tz4CGFsupQY ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-40",
    "text": "there's a lot of pressure that's being put on young kids when you graduate from high school that you got to have it figured out … and that's unrealistic for someone that's 18 19 20 years old to know what they're gonna do for the rest of their life … and oftentimes a lot of people what happens is they go to school to get a degree they invest all this money they get into student loan debt and then a few years later they realize that's not really what they wanted to do and now they're in debt",
    "videoId": "duKiFg3BP4w",
    "context": " \"there's a lot of pressure that's being put on young kids when you graduate from high school that you got to have it figured out … and that's unrealistic for someone that's 18 19 20 years old to know what they're gonna do for the rest of their life … and oftentimes a lot of people what happens is t",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-41",
    "text": "your mission your mission is your purpose in life your mission is your work it could be your job it could be your business it could be your school or your studies I like the word Mission because that's the ultimate goal for all of us to have a mission to have a purpose when you have that and you fully associate to it man you become Unstoppable in life because you're going to spend the majority of your life in your mission in your purpose",
    "videoId": "Kz83kMosOWU",
    "context": " \"your mission your mission is your purpose in life your mission is your work it could be your job it could be your business it could be your school or your studies I like the word Mission because that's the ultimate goal for all of us to have a mission to have a purpose when you have that and you f",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-42",
    "text": "the next one I call your mission and purpose which really is your career your business what you do for a living I like mission and purpose because this is my wheel and for me that's how I like to define and categorize that area of my life it feels more meaningful and I get more energy and juice when I refer to it as my mission in life and purpose rather than just my job or my business on my career it's a different emotion behind that",
    "videoId": "wqJ-2N5KVOU",
    "context": " \"the next one I call your mission and purpose which really is your career your business what you do for a living I like mission and purpose because this is my wheel and for me that's how I like to define and categorize that area of my life it feels more meaningful and I get more energy and juice wh",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-43",
    "text": "doing something you love every day is something that fulfills you something that's your passion in life that doesn't feel like work … what Buffett says tap dance to work or maybe it feels like you have a hobby that you get paid for",
    "videoId": "wqJ-2N5KVOU",
    "context": " \"doing something you love every day is something that fulfills you something that's your passion in life that doesn't feel like work … what Buffett says tap dance to work or maybe it feels like you have a hobby that you get paid for\" — wqJ-2N5KVOU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-44",
    "text": "vision is more macro it's the ultimate Vision this could be 10 years from now it could be 20 years 30 40 50 years … that's the vision that's the macro that's the what that's the more Spirit side and then the purpose is identifying why that's important to you why is um this Vision important to you and why are these different areas of my life important for me to master you got to associate to your purpose behind that and then we get now to the more micro level which is … within a year time frame where it becomes more practical where you want to identify your specific goals",
    "videoId": "Kz83kMosOWU",
    "context": " \"vision is more macro it's the ultimate Vision this could be 10 years from now it could be 20 years 30 40 50 years … that's the vision that's the macro that's the what that's the more Spirit side and then the purpose is identifying why that's important to you why is um this Vision important to you ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-45",
    "text": "all these different online business models out there there are simply vehicles that's all it is it's just a vehicle and you got to decide in that vehicle which niche market your passion your purpose it's part of it",
    "videoId": "naTjNwfiOxQ",
    "context": " \"all these different online business models out there there are simply vehicles that's all it is it's just a vehicle and you got to decide in that vehicle which niche market your passion your purpose it's part of it\" — naTjNwfiOxQ ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-46",
    "text": "because I received so much benefit from it I feel that it's my mission in life it's my purpose to share what I've learned with other people I don't want people to suffer like how I suffered … I spent so much time energy effort money to solve my problems I don't want to just keep the solutions to myself you know if I went through a lot to solve the problems in my life then I feel it's my responsibility to then share those solutions with other people",
    "videoId": "naTjNwfiOxQ",
    "context": " \"because I received so much benefit from it I feel that it's my mission in life it's my purpose to share what I've learned with other people I don't want people to suffer like how I suffered … I spent so much time energy effort money to solve my problems I don't want to just keep the solutions to m",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-47",
    "text": "each day is a gift it really is it's a blessing and you know what the amazing thing about life is is that you've been given this gift for free you didn't have to do anything for it you didn't have to earn it … something loved you enough to give you this gift I call that something God can call it whatever you want to call it I believe it's our responsibility to do something with this life that we've been given not just to waste it away like most people do I believe that we've been given a purpose we each have our unique gifts and talents and creativity",
    "videoId": "HbLlMjqq41Y",
    "context": " \"each day is a gift it really is it's a blessing and you know what the amazing thing about life is is that you've been given this gift for free you didn't have to do anything for it you didn't have to earn it … something loved you enough to give you this gift I call that something God can call it w",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-48",
    "text": "you're alive but you're not living",
    "videoId": "HbLlMjqq41Y",
    "context": " \"you're alive but you're not living\" (of the Friday-relief 9–5 life) — HbLlMjqq41Y ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-49",
    "text": "Martin Luther King once said that a man who hasn't found his purpose he hasn't found something he's willing to die for the man's not fit to live",
    "videoId": "HbLlMjqq41Y",
    "context": " \"Martin Luther King once said that a man who hasn't found his purpose he hasn't found something he's willing to die for the man's not fit to live\" — HbLlMjqq41Y ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-50",
    "text": "it says in the Bible that without a vision people perish without a compelling future people just sit around people are lazy they have no motivation for their life they have no goals they procrastinate … I know so many people that reach out and say I'm lazy I'm not excited for my life I'm not motivated and most often that's because you don't have a vision that excites you",
    "videoId": "hlJYapcgKM8",
    "context": " \"it says in the Bible that without a vision people perish without a compelling future people just sit around people are lazy they have no motivation for their life they have no goals they procrastinate … I know so many people that reach out and say I'm lazy I'm not excited for my life I'm not motiv",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-51",
    "text": "trust your intuition we all have an intuition guys it's moments you have you have a feeling about something get excited you have that spark but most people they don't listen to it they dismiss it their mind getting away start doubting already oh I can't do this I can't do that the fear comes up and before you know what guys that intuition is gone gonna learn how to trust it trust that intuition trust your gut and act on it",
    "videoId": "HbLlMjqq41Y",
    "context": " \"trust your intuition we all have an intuition guys it's moments you have you have a feeling about something get excited you have that spark but most people they don't listen to it they dismiss it their mind getting away start doubting already oh I can't do this I can't do that the fear comes up an",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-53",
    "text": "a lot of people they have goals for their business they have goals for their body they have goals for their relationship but they don't have goals for their family and friends and that's why their family and friends aren't as good as where it could really be a lot of people don't have goals for their emotions that's why their emotions aren't as high as it could be … because whatever you set goals for you're going to focus on consistently in your life and whatever you focus on consistently is going to grow",
    "videoId": "Kz83kMosOWU",
    "context": " \"a lot of people they have goals for their business they have goals for their body they have goals for their relationship but they don't have goals for their family and friends and that's why their family and friends aren't as good as where it could really be a lot of people don't have goals for th",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-54",
    "text": "understand that at times you might have to get out of balance in your life and that's okay as long as you return to Center",
    "videoId": "Kz83kMosOWU",
    "context": " \"understand that at times you might have to get out of balance in your life and that's okay as long as you return to Center\" — Kz83kMosOWU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-55",
    "text": "you can't manage something if you don't measure it",
    "videoId": "Kz83kMosOWU",
    "context": "Weekly measurement ritual across all areas (spreadsheet + whiteboard, Drucker \"you can't manage something if you don't measure it\"): — Kz83kMosOWU . His success standard: \"I define my success as living each area of my life that matters to me at a high level at at level seven eight nine or ten\" — wqJ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-57",
    "text": "having fun in your life now this was an important one for me I realized man I'm crushing it in all different areas of my life my business my health my relationship my friends and family is great but that doesn't guarantee that you're having fun",
    "videoId": "Kz83kMosOWU",
    "context": " \"having fun in your life now this was an important one for me I realized man I'm crushing it in all different areas of my life my business my health my relationship my friends and family is great but that doesn't guarantee that you're having fun\" — Kz83kMosOWU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-58",
    "text": "I was thinking to myself yeah you know what I'm not having as much fun as I'd like to have in my life life has become a lot more serious and I thought to myself well maybe that's because I don't have that is a freaking area of my life on my pyramid that I'm consistently focusing on and setting goals for so I had to breakthrough I thought what would happen to my life if I actually added fun to my list … and I decided you know what I'm going to set goals for fun I'm going to make that a priority",
    "videoId": "Kz83kMosOWU",
    "context": " \"I was thinking to myself yeah you know what I'm not having as much fun as I'd like to have in my life life has become a lot more serious and I thought to myself well maybe that's because I don't have that is a freaking area of my life on my pyramid that I'm consistently focusing on and setting goa",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-59",
    "text": "for me fun I break down as your hobbies right your hobbies remember those having hobbies in your life I break that down as adventure maybe travel got to have that you know when you're a kid you have no problem having fun right kids know how to have fun but often times when adults we grow up we lose we lose that essence of fun we lose that inner child that we all have and I think we got to nurture that on a more regular basis",
    "videoId": "Kz83kMosOWU",
    "context": " \"for me fun I break down as your hobbies right your hobbies remember those having hobbies in your life I break that down as adventure maybe travel got to have that you know when you're a kid you have no problem having fun right kids know how to have fun but often times when adults we grow up we los",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-60",
    "text": "got to have fun in life I mean it's great to make money it's great to have a mission it's great to have a great relationship emotions health and be regimented and successful you could be an overachiever but you got to enjoy life you could have some play you're gonna have some fun we got to be silly and spontaneous and go on adventures maybe for you that's traveling or maybe for you as just spending quality time with friends and family and loved ones and giving to them and creating magical moments with them or maybe it's taken up some new hobbies … playing the guitar or music or singing or gardening or cooking",
    "videoId": "wqJ-2N5KVOU",
    "context": " \"got to have fun in life I mean it's great to make money it's great to have a mission it's great to have a great relationship emotions health and be regimented and successful you could be an overachiever but you got to enjoy life you could have some play you're gonna have some fun we got to be sill",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-61",
    "text": "I thought to myself you know when I was a kid what did I used to do that was just pure fun I was doing it not for success or not for money not for purpose or Mission or anything like that it was just pure fun it lit me up and I enjoyed it fully",
    "videoId": "Kz83kMosOWU",
    "context": " \"I thought to myself you know when I was a kid what did I used to do that was just pure fun I was doing it not for success or not for money not for purpose or Mission or anything like that it was just pure fun it lit me up and I enjoyed it fully\" — Kz83kMosOWU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-62",
    "text": "I got a PlayStation 4 and I'll have some friends over and we'll play the UFC UFC 2 and NBA and just different games like that and have fun you know and I'll allow myself to get into it and being competitive and it's a different side of myself that I get to nurture",
    "videoId": "Kz83kMosOWU",
    "context": " \"I got a PlayStation 4 and I'll have some friends over and we'll play the UFC UFC 2 and NBA and just different games like that and have fun you know and I'll allow myself to get into it and being competitive and it's a different side of myself that I get to nurture\" — Kz83kMosOWU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-63",
    "text": "what happened in my life is that that got way out of balance where I became addicted to it and basically my entire life was video games and uh it was destru[cti]ve to me at that point in my life because I didn't have health I didn't have relationships I didn't have emotions I didn't have anything else on the list it was just fun fun fun video games and it was a way of escaping in my life instead of something that adds to my life once everything else is in Balance",
    "videoId": "Kz83kMosOWU",
    "context": " \"what happened in my life is that that got way out of balance where I became addicted to it and basically my entire life was video games and uh it was destru[cti]ve to me at that point in my life because I didn't have health I didn't have relationships I didn't have emotions I didn't have anything ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-64",
    "text": "I'll easily host a fun activity once a month with my friends creating more magic moments",
    "videoId": "TVdT3ymNN_I",
    "context": "- \"I'll easily host a fun activity once a month with my friends creating more magic moments\" — annual goal, repeated across goals reports TVdT3ymNN_I , F0ToFPMcIqI . Instances: \"we had a poker night UFC night which was a lot of fun\" (TVdT3ymNN_I).",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-65",
    "text": "we had a poker night UFC night which was a lot of fun",
    "videoId": "TVdT3ymNN_I",
    "context": "- \"I'll easily host a fun activity once a month with my friends creating more magic moments\" — annual goal, repeated across goals reports TVdT3ymNN_I , F0ToFPMcIqI . Instances: \"we had a poker night UFC night which was a lot of fun\" (TVdT3ymNN_I).",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-66",
    "text": "I'll easily enjoy a fun family vacation creating fun and magic moments",
    "videoId": "TVdT3ymNN_I",
    "context": "- \"I'll easily enjoy a fun family vacation creating fun and magic moments\" — TVdT3ymNN_I , F0ToFPMcIqI .",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-67",
    "text": "I'll easily go snowboarding at least five times",
    "videoId": "TVdT3ymNN_I",
    "context": "- \"I'll easily go snowboarding at least five times\" — TVdT3ymNN_I (\"only did twice so far this year\").",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-68",
    "text": "only did twice so far this year",
    "videoId": "TVdT3ymNN_I",
    "context": "- \"I'll easily go snowboarding at least five times\" — TVdT3ymNN_I (\"only did twice so far this year\").",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-69",
    "text": "I'll easily do at least three photo shoots get amazing photos",
    "videoId": "TVdT3ymNN_I",
    "context": "- \"I'll easily do at least three photo shoots get amazing photos\" — TVdT3ymNN_I .",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-70",
    "text": "attend at least two Brotherhood Mastermind trips",
    "videoId": "TVdT3ymNN_I",
    "context": "- \"attend at least two Brotherhood Mastermind trips\" — TVdT3ymNN_I .",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-71",
    "text": "make it a goal to try something new every month",
    "videoId": "tz4CGFsupQY",
    "context": "- \"make it a goal to try something new every month\" — tz4CGFsupQY .",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-72",
    "text": "at some point we didn't really have many hobbies in our life like we were digital Nomads traveling world was one of the things that we decided to give up was the hobbies and and pursuing different interest because we wanted to use all that time towards business for us our top priority was our health relationships and business and else was you know basically sacrificed for a period of time",
    "videoId": "vfOco_5GK44",
    "context": " \"at some point we didn't really have many hobbies in our life like we were digital Nomads traveling world was one of the things that we decided to give up was the hobbies and and pursuing different interest because we wanted to use all that time towards business for us our top priority was our heal",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-73",
    "text": "when we did like kind of retire I guess and no longer really spend any time in business … we started doing art you know got into painting",
    "videoId": "vfOco_5GK44",
    "context": " \"when we did like kind of retire I guess and no longer really spend any time in business … we started doing art you know got into painting\" — vfOco_5GK44 ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-74",
    "text": "I actually have to discipline myself to not spend as much time on my mission and spend more time with my family and friends and having fun that's my challenges that I face … my mission is fun it's the source of that but I still have to try to separate it and have some other hobbies and whatnot too",
    "videoId": "Kz83kMosOWU",
    "context": " \"I actually have to discipline myself to not spend as much time on my mission and spend more time with my family and friends and having fun that's my challenges that I face … my mission is fun it's the source of that but I still have to try to separate it and have some other hobbies and whatnot too",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-75",
    "text": "it is true that in your mission your job you're adding value contributing in some way … but I thought to myself what would happen if I added contribution to an area of my life where I'm giving not to get I'm giving out of just pure being selfless making an impact making a difference empowering people in the world that I they don't even know who I am they can't give me anything back but it's just pure service to others",
    "videoId": "Kz83kMosOWU",
    "context": " \"it is true that in your mission your job you're adding value contributing in some way … but I thought to myself what would happen if I added contribution to an area of my life where I'm giving not to get I'm giving out of just pure being selfless making an impact making a difference empowering peo",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-76",
    "text": "sometimes you could be contributing but not feel it not really acknowledge yourself the impact the difference that you're really making so I think you got to feel that more and acknowledge yourself the contribution that you're making",
    "videoId": "Kz83kMosOWU",
    "context": " \"sometimes you could be contributing but not feel it not really acknowledge yourself the impact the difference that you're really making so I think you got to feel that more and acknowledge yourself the contribution that you're making\" — Kz83kMosOWU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-77",
    "text": "I think that's such an important area of life and it's important area that really I think we all have a responsibility to do to find a way to get outside ourselves and often times when you do that you focus on serving something better something greater than yourself outside of yourself you put yourself in a state of abundance and you get out of the fear and scarcity that holds many people back",
    "videoId": "Kz83kMosOWU",
    "context": " \"I think that's such an important area of life and it's important area that really I think we all have a responsibility to do to find a way to get outside ourselves and often times when you do that you focus on serving something better something greater than yourself outside of yourself you put you",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-78",
    "text": "no matter where you are right now maybe you don't have much money or maybe it's time you can give but the money you can give a dollar you can give a quarter every once in a while to a homeless person right there's always a way to give you don't believe that you can give then you're seriously suffering from a scarcity mentality that's going to hold you back massively in your life … the happiest people that I know are the most generous people they're the ones that are consistently giving contributing",
    "videoId": "Kz83kMosOWU",
    "context": " \"no matter where you are right now maybe you don't have much money or maybe it's time you can give but the money you can give a dollar you can give a quarter every once in a while to a homeless person right there's always a way to give you don't believe that you can give then you're seriously suffe",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-79",
    "text": "as Tony Robbins says the secret to living is giving that the more that you give the more that you get and I like to practice that in my life and it adds a different level of joy to my life it actually enhances everything else and enhances my mind and my emotions",
    "videoId": "wqJ-2N5KVOU",
    "context": " \"as Tony Robbins says the secret to living is giving that the more that you give the more that you get and I like to practice that in my life and it adds a different level of joy to my life it actually enhances everything else and enhances my mind and my emotions\" — wqJ-2N5KVOU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-80",
    "text": "we've all been given this incredible gift and privilege in life let's not just take from this life let's give something back let's make sure that the next generation is better off for us being here rather than we were just here and just took and didn't contribute much of value I want to leave this world better when I come out of it",
    "videoId": "wqJ-2N5KVOU",
    "context": " \"we've all been given this incredible gift and privilege in life let's not just take from this life let's give something back let's make sure that the next generation is better off for us being here rather than we were just here and just took and didn't contribute much of value I want to leave this",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-81",
    "text": "I'm actually donating 10% of everyone's purchase to affiliate marketing Mastery to my campaign for that … run through change Heroes um and a program called imagine one day",
    "videoId": "E20v-rrXyWs",
    "context": "Same commitment stated live in E20v-rrXyWs : \"I'm actually donating 10% of everyone's purchase to affiliate marketing Mastery to my campaign for that … run through change Heroes um and a program called imagine one day\" ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-82",
    "text": "Last year, I built a house in El Salvador. I volunteered to actually go and build it, and I funded it, which was $3,000.",
    "videoId": "dBZPHI--GJk",
    "context": " Cost of one house: $3,000 — dBZPHI--GJk : \"Last year, I built a house in El Salvador. I volunteered to actually go and build it, and I funded it, which was $3,000.\" ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-83",
    "text": "I've been involved in building houses and schools I've built some houses in Nicaragua last year and El Salvador and built the schools in Ethiopia and Kenya and Ecuador going to Ethiopia later this year to volunteer and build uh one of the schools that I funded but you know that's just pure contribution",
    "videoId": "Kz83kMosOWU",
    "context": " \"I've been involved in building houses and schools I've built some houses in Nicaragua last year and El Salvador and built the schools in Ethiopia and Kenya and Ecuador going to Ethiopia later this year to volunteer and build uh one of the schools that I funded but you know that's just pure contrib",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-84",
    "text": "I'm not not just funding the house I'm actually going there to build it too and volunteer so um I've yet to confirm a location for that",
    "videoId": "TVdT3ymNN_I",
    "context": " \"I'm not not just funding the house I'm actually going there to build it too and volunteer so um I've yet to confirm a location for that\" — TVdT3ymNN_I ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-85",
    "text": "again I want to make sure that wherever I build the school I could travel there and actually volunteer and build it as well",
    "videoId": "F0ToFPMcIqI",
    "context": " \"again I want to make sure that wherever I build the school I could travel there and actually volunteer and build it as well\" — F0ToFPMcIqI ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-86",
    "text": "around 80% of the population here lives on less than $2 a day … if you're watching this right now on YouTube or you're watching this on a computer or a smartphone you're in the top 1% you're much further ahead than most people in the world",
    "videoId": "o9dMVcGUHaY",
    "context": " \"around 80% of the population here lives on less than $2 a day … if you're watching this right now on YouTube or you're watching this on a computer or a smartphone you're in the top 1% you're much further ahead than most people in the world\" — o9dMVcGUHaY ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-87",
    "text": "one could argue that spirituality is the most important area of life because spirituality is actually goes beyond our life you know as Wayne Dyer said we are not human beings having a spiritual experience we're Spiritual Beings having a human experience",
    "videoId": "Kz83kMosOWU",
    "context": " \"one could argue that spirituality is the most important area of life because spirituality is actually goes beyond our life you know as Wayne Dyer said we are not human beings having a spiritual experience we're Spiritual Beings having a human experience\" — Kz83kMosOWU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-88",
    "text": "spirituality is believing and having a sense of awareness of something bigger than this moment you know right now a lot of people focus just on their life which is really just a moment in time from zero to 100 years old and then that's it that's all there is and spirituality says that there's something bigger than that there's something more and so that's why I thought you know spirituality doesn't really fit within this because our spirit embodies all of this",
    "videoId": "Kz83kMosOWU",
    "context": " \"spirituality is believing and having a sense of awareness of something bigger than this moment you know right now a lot of people focus just on their life which is really just a moment in time from zero to 100 years old and then that's it that's all there is and spirituality says that there's some",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-89",
    "text": "first I put it in a circle but I thought a circle is a metaphor it's an you know it's a metaphor that has a limitation on it and spirituality is not limited because it's infinite nobody knows we only have a certain level of awareness",
    "videoId": "Kz83kMosOWU",
    "context": " \"first I put it in a circle but I thought a circle is a metaphor it's an you know it's a metaphor that has a limitation on it and spirituality is not limited because it's infinite nobody knows we only have a certain level of awareness\" — Kz83kMosOWU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-90",
    "text": "spirituality is something that's always expanding it's an area of life that you can't really Master it doesn't really fit in with the concept of Mastery because um it's something that we still do not understand you know we still don't really fully grasp we have awareness of it we meditate we pray we you know certain things but there's still so much uncertainty and unknown with it that you can't master it but you can definitely grow in it",
    "videoId": "Kz83kMosOWU",
    "context": " \"spirituality is something that's always expanding it's an area of life that you can't really Master it doesn't really fit in with the concept of Mastery because um it's something that we still do not understand you know we still don't really fully grasp we have awareness of it we meditate we pray ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-91",
    "text": "having a spiritual connection with God … that's added an incredible level of richness and joy and meaning to my life that's beyond honestly everything else on this list",
    "videoId": "wqJ-2N5KVOU",
    "context": " \"having a spiritual connection with God … that's added an incredible level of richness and joy and meaning to my life that's beyond honestly everything else on this list\" — wqJ-2N5KVOU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-92",
    "text": "that's the most important relationship and part of my life and it's the foundation for everything else that I do and experience in my life",
    "videoId": "wDQ7PwL-C_4",
    "context": " \"that's the most important relationship and part of my life and it's the foundation for everything else that I do and experience in my life\" — wDQ7PwL-C_4 ← the closest verbatim to \"foundation, not a level\"",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-94",
    "text": "if i say i'm going to meditate for an hour it's like oh my gosh that's such a big thing it prevents me from doing it but if i say i'm gonna meditate for two minutes then that's something that i can easily do and often what i find when i meditate for a short period of time often i extend it … so really any meditation is better than no meditation if you struggle to meditate and you resist it more of the reason why you should be meditating in your life because that's the very thing that you need and your ego is trying to resist it",
    "videoId": "2ca5WyRM-gM",
    "context": " \"if i say i'm going to meditate for an hour it's like oh my gosh that's such a big thing it prevents me from doing it but if i say i'm gonna meditate for two minutes then that's something that i can easily do and often what i find when i meditate for a short period of time often i extend it … so re",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-95",
    "text": "I'd take a moment after a run for 20 or 30 minutes and I just sit there and meditate and meditate for 20 or 30 minutes there and just really calm my mind and connect to myself connect to my Creator connect to the universe I would do some sort of Prayer process as well and that would just help to rejuvenate myself immensely",
    "videoId": "9RxHchflvVs",
    "context": " \"I'd take a moment after a run for 20 or 30 minutes and I just sit there and meditate and meditate for 20 or 30 minutes there and just really calm my mind and connect to myself connect to my Creator connect to the universe I would do some sort of Prayer process as well and that would just help to r",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-96",
    "text": "I meditate more consistently and still not as much as I'd like there are some days where I skip my meditations but that's okay I'm not super anal and rigid about things being a certain way",
    "videoId": "2lH5lndRn9A",
    "context": " \"I meditate more consistently and still not as much as I'd like there are some days where I skip my meditations but that's okay I'm not super anal and rigid about things being a certain way\" — 2lH5lndRn9A (Joe Dispenza 7-day retreat review)",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-97",
    "text": "in order to have emotional mastery, is to really understand that you are in control of your emotions … A lot of people want to believe that emotions happen to you … That's the first lie. That's the first illusion that you have to dispel.",
    "videoId": "y_vzzMkjSrQ",
    "context": " \"in order to have emotional mastery, is to really understand that you are in control of your emotions … A lot of people want to believe that emotions happen to you … That's the first lie. That's the first illusion that you have to dispel.\" — y_vzzMkjSrQ ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-98",
    "text": "In order to be a master of your emotions, to have emotional mastery, you have to become a master of meaning. The meaning that you associate to an event, is what's going to determine how you feel in any given moment. … Nothing in life has any meaning, except for the meaning that you give it.",
    "videoId": "y_vzzMkjSrQ",
    "context": " \"In order to be a master of your emotions, to have emotional mastery, you have to become a master of meaning. The meaning that you associate to an event, is what's going to determine how you feel in any given moment. … Nothing in life has any meaning, except for the meaning that you give it.\" — y_v",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-99",
    "text": "quality of life is emotions, that's the most important thing. It doesn't matter what you achieve, what you get, it's all about how you feel.",
    "videoId": "OmzcFEuUKMQ",
    "context": " \"quality of life is emotions, that's the most important thing. It doesn't matter what you achieve, what you get, it's all about how you feel.\" — OmzcFEuUKMQ ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-100",
    "text": "Whatever you focus on is what you feel",
    "videoId": "y_vzzMkjSrQ",
    "context": " y_vzzMkjSrQ : (1) Focus — \"Whatever you focus on is what you feel\"; (2) Physiology — posture, smile, voice, breathing, exercise; (3) Language — \"whenever you catch yourself saying something negative or disempowering or limiting, say the opposite of that.\"",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-101",
    "text": "whenever you catch yourself saying something negative or disempowering or limiting, say the opposite of that.",
    "videoId": "y_vzzMkjSrQ",
    "context": " y_vzzMkjSrQ : (1) Focus — \"Whatever you focus on is what you feel\"; (2) Physiology — posture, smile, voice, breathing, exercise; (3) Language — \"whenever you catch yourself saying something negative or disempowering or limiting, say the opposite of that.\"",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-103",
    "text": "what happened in our past we can't change … but most often what happens when an event occurs in our life we create a meaning or a story or an interpretation of that event of what happened and the interpretation the story and the meaning that we create is where the emotion lies it's where the anger lies the resentment the fear the pain the insecurities",
    "videoId": "lzy64MccvoQ",
    "context": " \"what happened in our past we can't change … but most often what happens when an event occurs in our life we create a meaning or a story or an interpretation of that event of what happened and the interpretation the story and the meaning that we create is where the emotion lies it's where the anger",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-104",
    "text": "there are some events that occurred in our past when you're five years old and when you're five years old you created an interpretation and the meaning of an event as a five-year-old that you continue to live with to this day and a lot of these things are totally illogical",
    "videoId": "lzy64MccvoQ",
    "context": " \"there are some events that occurred in our past when you're five years old and when you're five years old you created an interpretation and the meaning of an event as a five-year-old that you continue to live with to this day and a lot of these things are totally illogical\" — lzy64MccvoQ ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-105",
    "text": "it's almost like we have a wound you know you have a wound and there's a scab and the scab never fully heals and every time these events occur in our future in the present it's like poking at that scab",
    "videoId": "lzy64MccvoQ",
    "context": " \"it's almost like we have a wound you know you have a wound and there's a scab and the scab never fully heals and every time these events occur in our future in the present it's like poking at that scab\" — lzy64MccvoQ ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-106",
    "text": "one of my favorite questions that I asked myself is what else could this mean what else could this mean or what's great about this you know and if I can create a new empowering meaning behind this then it can really serve and empower me my life",
    "videoId": "lzy64MccvoQ",
    "context": " \"one of my favorite questions that I asked myself is what else could this mean what else could this mean or what's great about this you know and if I can create a new empowering meaning behind this then it can really serve and empower me my life\" — lzy64MccvoQ ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-107",
    "text": "you can go back to these events and experiences from your life and just realize it didn't mean that at all that that was just an out of date interpretation that you had when you're five years old when you're 10 years old and it doesn't have to mean that you're not enough … it just maybe means that your parents were in a dark place … we don't need to create personal meaning to it",
    "videoId": "lzy64MccvoQ",
    "context": " \"you can go back to these events and experiences from your life and just realize it didn't mean that at all that that was just an out of date interpretation that you had when you're five years old when you're 10 years old and it doesn't have to mean that you're not enough … it just maybe means that",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-108",
    "text": "I don't want you to believe blindly what I have to say I more want to invite you just to try it on just like if you go to the store and you go to the rack and you take out a suit and you try it on you don't have to buy the suit",
    "videoId": "lzy64MccvoQ",
    "context": " \"I don't want you to believe blindly what I have to say I more want to invite you just to try it on just like if you go to the store and you go to the rack and you take out a suit and you try it on you don't have to buy the suit\" — lzy64MccvoQ ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-109",
    "text": "I'll immediately recognize it and then the second thing I'll do is I'll come up with an empowering positive uh opposite of that the antithesis of that … and I think gratitude is one of the best ways of doing that finding something to appreciate about the situation",
    "videoId": "6i2VJCLPdls",
    "context": " \"I'll immediately recognize it and then the second thing I'll do is I'll come up with an empowering positive uh opposite of that the antithesis of that … and I think gratitude is one of the best ways of doing that finding something to appreciate about the situation\" — 6i2VJCLPdls ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-110",
    "text": "gratitude is when [one of] the most powerful most spiritual emotions that we can experience in our lives and it nurtures our spirit and we have to cultivate that daily",
    "videoId": "oJfHa5ry9Qk",
    "context": " \"gratitude is when [one of] the most powerful most spiritual emotions that we can experience in our lives and it nurtures our spirit and we have to cultivate that daily\" — oJfHa5ry9Qk ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-111",
    "text": "no matter how horrible you might think your life is no matter what you're going through right now no matter if you're going through stress problems challenges gratitude is the antidote",
    "videoId": "oJfHa5ry9Qk",
    "context": " \"no matter how horrible you might think your life is no matter what you're going through right now no matter if you're going through stress problems challenges gratitude is the antidote\" — oJfHa5ry9Qk ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-112",
    "text": "if you don't already appreciate and are grateful for what you already have in your life then what point is there to go out there to try to attract and receive more because if you have the pattern of complaining and lacking appreciation … you're gonna make more money you're gonna attract a man or woman in your life … but you're gonna take with you the pattern and the habit of taking things for granted",
    "videoId": "oJfHa5ry9Qk",
    "context": " \"if you don't already appreciate and are grateful for what you already have in your life then what point is there to go out there to try to attract and receive more because if you have the pattern of complaining and lacking appreciation … you're gonna make more money you're gonna attract a man or w",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-113",
    "text": "spend at least 60 minutes on my morning ritual, five minutes of gratitude as well. I usually do this in the gym in the morning when I'm going for my walk and my run.",
    "videoId": "OmzcFEuUKMQ",
    "context": " Daily 5-minute gratitude slot inside the morning ritual: \"spend at least 60 minutes on my morning ritual, five minutes of gratitude as well. I usually do this in the gym in the morning when I'm going for my walk and my run.\" — OmzcFEuUKMQ ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-114",
    "text": "there's two areas of life we really have to master … one is a science of achievement … but there's [an]other area of Our Lives that we often Overlook which is the art of fulfillment and that's really just learning how to appreciate and celebrate and reward ourselves for everything in our lives being grateful",
    "videoId": "DqLGgwdO2IM",
    "context": " \"there's two areas of life we really have to master … one is a science of achievement … but there's [an]other area of Our Lives that we often Overlook which is the art of fulfillment and that's really just learning how to appreciate and celebrate and reward ourselves for everything in our lives bei",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-115",
    "text": "if you're making $330,000 a year you're in the top 1% of income earners … you're already more successful than most people on this planet what you got to learn to do is enjoy your life more be more fulfilled",
    "videoId": "OgRGJBpTOeU",
    "context": " \"if you're making $330,000 a year you're in the top 1% of income earners … you're already more successful than most people on this planet what you got to learn to do is enjoy your life more be more fulfilled\" — OgRGJBpTOeU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-116",
    "text": "non-attachment means you can have it and you'll be happy and you cannot have it and you'll also be happy either way you're happy … that's maybe something that not everyone's ready for I know I wasn't ready for",
    "videoId": "iVopRAfH1Aw",
    "context": " \"non-attachment means you can have it and you'll be happy and you cannot have it and you'll also be happy either way you're happy … that's maybe something that not everyone's ready for I know I wasn't ready for\" — iVopRAfH1Aw ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-117",
    "text": "what are the emotional states I want to live in every single day what are the emotional states that I want to eliminate from my life I want to get rid of them and I can reprogram myself and condition my emotional home my emotional consistent state of being and living",
    "videoId": "Kz83kMosOWU",
    "context": " \"what are the emotional states I want to live in every single day what are the emotional states that I want to eliminate from my life I want to get rid of them and I can reprogram myself and condition my emotional home my emotional consistent state of being and living\" — Kz83kMosOWU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-118",
    "text": "what do you do when you feel burned out I rest I relax I take a break I listen to myself I meditate I go out in nature I spend time with friends and family I fill myself up so that I can be in a position where I can get right back on track",
    "videoId": "2fDYApReHWc",
    "context": " \"what do you do when you feel burned out I rest I relax I take a break I listen to myself I meditate I go out in nature I spend time with friends and family I fill myself up so that I can be in a position where I can get right back on track\" — 2fDYApReHWc ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-119",
    "text": "family and friends you got to have that in your life too I separate those personally … those are two different areas of life you know there's times where maybe you're spending time with your family and it's going great … but maybe you've been neglecting your friends maybe you don't have the people in your life to share your life with you don't have people that are supporting you that are like-minded people on the same path right you don't have that empowering ecosystem as I call it and vice versa you can maybe have a great time with your friends … but maybe you haven't talked to your family for a while maybe you have some unresolved issues there maybe there's some pain or resentment or hurt",
    "videoId": "Kz83kMosOWU",
    "context": " \"family and friends you got to have that in your life too I separate those personally … those are two different areas of life you know there's times where maybe you're spending time with your family and it's going great … but maybe you've been neglecting your friends maybe you don't have the people",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-120",
    "text": "for myself it's it's going on family trips and giving to them at a much higher level than before connecting with them at a much deeper level and creating more magic moments",
    "videoId": "Kz83kMosOWU",
    "context": "- Goals for family, framed as giving and connection: \"for myself it's it's going on family trips and giving to them at a much higher level than before connecting with them at a much deeper level and creating more magic moments\" — Kz83kMosOWU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-121",
    "text": "I actually have to discipline myself to not spend as much time on my mission and spend more time with my family and friends and having fun",
    "videoId": "Kz83kMosOWU",
    "context": "- He treats over-work as the failure mode and disciplines against it: \"I actually have to discipline myself to not spend as much time on my mission and spend more time with my family and friends and having fun\" — Kz83kMosOWU ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-122",
    "text": "At first it's like well you know I want to start a business so that I can have more time with my kids … but you get so consumed by it that you lose sight of like why you started it in the first place",
    "videoId": "vfOco_5GK44",
    "context": "- Warning against losing the original why: \"At first it's like well you know I want to start a business so that I can have more time with my kids … but you get so consumed by it that you lose sight of like why you started it in the first place\" — vfOco_5GK44 ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-123",
    "text": "who you spend time with is who you become I love a great saying which is that show me your friends and I'll show you your future because a lot of cases a lot of people surrounding themselves with friends that aren't the most supportive people aren't going anywhere in their lives and in some ways unfortunately that can hold you back hold you back it's not a fun topic to discuss but it's true",
    "videoId": "Kz83kMosOWU",
    "context": " \"who you spend time with is who you become I love a great saying which is that show me your friends and I'll show you your future because a lot of cases a lot of people surrounding themselves with friends that aren't the most supportive people aren't going anywhere in their lives and in some ways u",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-124",
    "text": "if your ecosystem your environment your peer group and who you spend time with they're not in alignment with that in many cases they can kind of be holding you back unconsciously because the people in your life whether they're aware of it or not they're influencing who you are your beliefs your values your decisions your actions … you're the average of the five people you most spend time with",
    "videoId": "GLw6zVveDIk",
    "context": " \"if your ecosystem your environment your peer group and who you spend time with they're not in alignment with that in many cases they can kind of be holding you back unconsciously because the people in your life whether they're aware of it or not they're influencing who you are your beliefs your va",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-125",
    "text": "people in the Marines they have such high standards but those standards drop once they go back to their everyday lives and Tony said it's because people's lives are a direct reflection of the expectations of their peer group because when they're in a peer group an environment where there's high standards and expectations you rise up to that he shares that if you want to get better at tennis you got to play someone better than you are on that level and if you're around people that are worse then you're gonna drop",
    "videoId": "GLw6zVveDIk",
    "context": " \"people in the Marines they have such high standards but those standards drop once they go back to their everyday lives and Tony said it's because people's lives are a direct reflection of the expectations of their peer group because when they're in a peer group an environment where there's high st",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-126",
    "text": "that's a sign of a great friend versus a bad friend is the kind of person that when you're doing well in your life they feel jealous and insecure and envious and they try to bring you down because it makes them feel insecure because you're doing better than they are that's not a good person to have in your life you know you want someone that's happy for you to improve and wants you to improve",
    "videoId": "6pOOA9PLsTI",
    "context": " \"that's a sign of a great friend versus a bad friend is the kind of person that when you're doing well in your life they feel jealous and insecure and envious and they try to bring you down because it makes them feel insecure because you're doing better than they are that's not a good person to hav",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-127",
    "text": "we don't have all the answers to mental health problems but we do have some things that can improve it exercise eating healthy sleep who you spend time with and surround yourself with if you only have so many days of your life do you not want to make sure that the people you surround yourself with are positive people that make you feel better about yourself",
    "videoId": "6pOOA9PLsTI",
    "context": " \"we don't have all the answers to mental health problems but we do have some things that can improve it exercise eating healthy sleep who you spend time with and surround yourself with if you only have so many days of your life do you not want to make sure that the people you surround yourself with",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-128",
    "text": "obviously the most important decision you ever make in your life is who you spend your life with the decision that you make of who you're going to marry",
    "videoId": "6pOOA9PLsTI",
    "context": " \"obviously the most important decision you ever make in your life is who you spend your life with the decision that you make of who you're going to marry\" — 6pOOA9PLsTI ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-purpose-129",
    "text": "one ritual that he has is every single morning, every, you know, when he wakes up, he always makes sure that the first words out of his mouth are, 'I love you.'",
    "videoId": "NidJpDcCkQs",
    "context": " \"one ritual that he has is every single morning, every, you know, when he wakes up, he always makes sure that the first words out of his mouth are, 'I love you.'\" — NidJpDcCkQs ",
    "artifact": "phase2-purpose"
  },
  {
    "id": "phase2-reviews-0",
    "text": "i'm a big fan of rituals as you guys know i have morning rituals every single day sometimes i have rituals before i go to bed i have weekly rituals monthly rituals and quarterly rituals as well as yearly rituals what i'm going to share with you right now are some of the things that i do as a yearly ritual but it can be a process that you could even integrate into a week into a month and i might even recommend that for you ... the more that you can kind of reflect on things in your life and get that bird's eye view of your week your month your year the more of an advantage that you can have because you'll get better at making decisions",
    "videoId": "JZnLIuW7NQw",
    "context": " \"i'm a big fan of rituals as you guys know i have morning rituals every single day sometimes i have rituals before i go to bed i have weekly rituals monthly rituals and quarterly rituals as well as yearly rituals what i'm going to share with you right now are some of the things that i do as a yearl",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-1",
    "text": "most people they don't really measure an area of your life to like once a year but if you only measure once a year then you're going to have a bad year if you do it once a month and the worst you'll have a bad month once a week you'll have a bad week so making sure that the more often you measure something the more easier it's going to be to make sure that you're making progress cuz you're always checking in",
    "videoId": "8kco2rjijjE",
    "context": " \"most people they don't really measure an area of your life to like once a year but if you only measure once a year then you're going to have a bad year if you do it once a month and the worst you'll have a bad month once a week you'll have a bad week so making sure that the more often you measure ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-2",
    "text": "there's times for Me Maybe initially I'm going to check in every week there might be certain goals I'm a little bit more focused on that I'm going to check in weekly or bi-weekly but overall every month that's the more public one that I do with my monthly goals reports and so checking in regularly is key",
    "videoId": "GXhPOncX8CA",
    "context": " \"there's times for Me Maybe initially I'm going to check in every week there might be certain goals I'm a little bit more focused on that I'm going to check in weekly or bi-weekly but overall every month that's the more public one that I do with my monthly goals reports and so checking in regularly",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-3",
    "text": "I used to do them every month now I'm doing them every quarter so my quarterly goals report for 2019 is gonna be available for you guys ... we also did that for my company because my company we have a team quarterly meeting as well we go over the company's goals and what we're focused on quarter 2",
    "videoId": "Y4Z6wQVArPQ",
    "context": " \"I used to do them every month now I'm doing them every quarter so my quarterly goals report for 2019 is gonna be available for you guys ... we also did that for my company because my company we have a team quarterly meeting as well we go over the company's goals and what we're focused on quarter 2",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-4",
    "text": "i plan plan out my day three most important things if by the end of the day i did nothing else but those three things today was a great day i celebrate that and i i i really acknowledge myself for that my philosophy is if every day you do three important things over the course of a month that's incredible amount of progress that you've made",
    "videoId": "PPlaK8y4PzA",
    "context": " \"i plan plan out my day three most important things if by the end of the day i did nothing else but those three things today was a great day i celebrate that and i i i really acknowledge myself for that my philosophy is if every day you do three important things over the course of a month that's in",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-5",
    "text": "my rituals before I go to bed are different because they're more ways for me to relax calm my mind prepare for my sleep to you know reflect on the day things of that nature",
    "videoId": "Y4Z6wQVArPQ",
    "context": " \"my rituals before I go to bed are different because they're more ways for me to relax calm my mind prepare for my sleep to you know reflect on the day things of that nature\" — Y4Z6wQVArPQ ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-6",
    "text": "this is my evening ritual okay what i like to do before i go to bed and this is my weekly ritual so similar process to this but i like to do it before i go to bed and i'll do that in other videos",
    "videoId": "PPlaK8y4PzA",
    "context": " \"this is my evening ritual okay what i like to do before i go to bed and this is my weekly ritual so similar process to this but i like to do it before i go to bed and i'll do that in other videos\" — PPlaK8y4PzA (he never films the promised evening/weekly ritual video inside this corpus)",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-7",
    "text": "every single morning we'd wake up hop on a call did you do it yes or no there's only reasons or there's results i don't care what the reasons are did you do it yes or no and if it's no then you do the consequence ... and then the next day you get back on track you make three more commitments",
    "videoId": "y2oiz9LRchE",
    "context": " \"every single morning we'd wake up hop on a call did you do it yes or no there's only reasons or there's results i don't care what the reasons are did you do it yes or no and if it's no then you do the consequence ... and then the next day you get back on track you make three more commitments\" — y2",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-8",
    "text": "the weekly evaluation ritual that I created so once you've determined your goals and the different areas of your life ... then it's consistently measuring yourself in each area on a weekly basis okay on a weekly basis so what I personally do is I have this in a spreadsheet I also have this on a whiteboard in my office but having it in a spreadsheet or a journal is really great because you want to make sure that you can go back over previous weeks you want to make sure that you can compare yourself",
    "videoId": "Kz83kMosOWU",
    "context": " \"the weekly evaluation ritual that I created so once you've determined your goals and the different areas of your life ... then it's consistently measuring yourself in each area on a weekly basis okay on a weekly basis so what I personally do is I have this in a spreadsheet I also have this on a wh",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-9",
    "text": "in my Excel spreadsheet in the document I'm going to give you I have each area and then I ask myself every week where am I a scale from 0 to 10 in each area of my life okay with 10 being exactly where I want to be zero being nothing",
    "videoId": "8kco2rjijjE",
    "context": " \"in my Excel spreadsheet in the document I'm going to give you I have each area and then I ask myself every week where am I a scale from 0 to 10 in each area of my life okay with 10 being exactly where I want to be zero being nothing\" — 8kco2rjijjE ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-10",
    "text": "maybe you're you're a two a two out of 10 in your your health and fitness right you're a two and that doesn't feel good for you but you might say you know what how can I bring myself to a three next week how can I grow from this and make progress",
    "videoId": "Kz83kMosOWU",
    "context": " \"maybe you're you're a two a two out of 10 in your your health and fitness right you're a two and that doesn't feel good for you but you might say you know what how can I bring myself to a three next week how can I grow from this and make progress\" — Kz83kMosOWU ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-11",
    "text": "7 for me is the minimum in my life if I drop below a 7 in a certain area in my life based on my standards and my definition of it then what I do is I check in I said you know what that's not acceptable what can I do to bring that out back to level 7",
    "videoId": "wqJ-2N5KVOU",
    "context": " \"7 for me is the minimum in my life if I drop below a 7 in a certain area in my life based on my standards and my definition of it then what I do is I check in I said you know what that's not acceptable what can I do to bring that out back to level 7\" — wqJ-2N5KVOU [ALREADY IN CORPUS as state-proto",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-12",
    "text": "if you do that every week what happens is that allows you to check in and catch yourself if you're dropping so you don't ever get to the point where something as a three out of ten or a one or a zero",
    "videoId": "wqJ-2N5KVOU",
    "context": " \"if you do that every week what happens is that allows you to check in and catch yourself if you're dropping so you don't ever get to the point where something as a three out of ten or a one or a zero\" — wqJ-2N5KVOU [ALREADY IN CORPUS as ui-quotes-7] ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-13",
    "text": "another thing with my journal going back to that is I reflect on the week before so I write down all the magic moments of the week before all of my accomplishments all the things that I got done all the amazing experiences that I had and I really just associate that because an important piece that will give you that fulfillment is making sure that you're celebrating your life ... there's a really great saying by Jim Rohn which is that a life worth living is worth recording ... I might even ask myself what did I learn from last week you know what were the lessons that I learned",
    "videoId": "8kco2rjijjE",
    "context": " \"another thing with my journal going back to that is I reflect on the week before so I write down all the magic moments of the week before all of my accomplishments all the things that I got done all the amazing experiences that I had and I really just associate that because an important piece that",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-14",
    "text": "when it comes to planning the week that is to come ... I'll capture everything out on paper and then I'll start to categorize it in each area of my life and what I like to do is each week I like to set specific outcomes of what I want to achieve for that week okay so I'll be like okay what are my outcomes in my body for this week what is My outcome or my goal for my my uh my finances or my family life ... and then I'll write down why do I want that what's the purpose that I have for that and then I'll write down the actions",
    "videoId": "8kco2rjijjE",
    "context": " \"when it comes to planning the week that is to come ... I'll capture everything out on paper and then I'll start to categorize it in each area of my life and what I like to do is each week I like to set specific outcomes of what I want to achieve for that week okay so I'll be like okay what are my ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-15",
    "text": "once you have a plan for each area and you have the outcomes for the week and the reasons why then start to the next step is to schedule it for each day ... the key is to make sure that you do something you have to do something each week to grow and improve each area okay so you cannot just alienate and ignore each area of your life",
    "videoId": "8kco2rjijjE",
    "context": " \"once you have a plan for each area and you have the outcomes for the week and the reasons why then start to the next step is to schedule it for each day ... the key is to make sure that you do something you have to do something each week to grow and improve each area okay so you cannot just aliena",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-16",
    "text": "every Sunday we had these house meetings we'd have these whiteboards on our wall and each of us had to write and share you know Stefan here's like the top five actions and I'm committed to achieving for this week and each person would do that ... and then if you didn't achieve a goal that you said for yourself that week then you'd have to pay $20 to the house",
    "videoId": "Wr2SPFgW8iY",
    "context": " \"every Sunday we had these house meetings we'd have these whiteboards on our wall and each of us had to write and share you know Stefan here's like the top five actions and I'm committed to achieving for this week and each person would do that ... and then if you didn't achieve a goal that you said",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-17",
    "text": "they have these after Action reviews where every two weeks you got to fill out this form to check in on your goal which is very important too so once you set the goals you got to check in every two weeks **are you on track are you making progress are you behind what changes do you need to make if necessary in order to achieve that**",
    "videoId": "GXhPOncX8CA",
    "context": " \"they have these after Action reviews where every two weeks you got to fill out this form to check in on your goal which is very important too so once you set the goals you got to check in every two weeks are you on track are you making progress are you behind what changes do you need to make if ne",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-18",
    "text": "right here I got my laptop and I've got my Evernote document open where I have all the goals that I set for myself beginning of the year and what I'm going to do is I'm going to go through each of the goals that I have there's over 50 goals I'm going to give you guys an update on each one of them some of these goals have already achieved ... and so I'm just going to briefly go over them real quick and you know really go dive deeper and emphasize the ones that I'm still uh you know primarily focused on",
    "videoId": "F0ToFPMcIqI",
    "context": " \"right here I got my laptop and I've got my Evernote document open where I have all the goals that I set for myself beginning of the year and what I'm going to do is I'm going to go through each of the goals that I have there's over 50 goals I'm going to give you guys an update on each one of them ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-19",
    "text": "as a way for me to be accountable ... to make sure that I'm being consistent every month make sure that I'm following through making sure that I've got that pressure on myself that outside accountability ... hopefully this can be an example for you guys to also do check-ins for yourself every single month or every single week to make sure that you're on point",
    "videoId": "F0ToFPMcIqI",
    "context": " \"as a way for me to be accountable ... to make sure that I'm being consistent every month make sure that I'm following through making sure that I've got that pressure on myself that outside accountability ... hopefully this can be an example for you guys to also do check-ins for yourself every sing",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-20",
    "text": "it's so valuable to do this to check in on your goals because there's times you know where I forget I forget I'm like oh yeah you know what am I doing like I got to get back on track with that and if it wasn't for this process every month I wouldn't have that awareness to really you know identify okay you know what I committed to that and I'm not doing it at the same level and what that does is it really makes me think it makes me ponder it makes me think **okay what can I be doing better what can I be doing different how can I increase this and up my game and raise my standard**",
    "videoId": "E4Pxl3rx_s0",
    "context": " \"it's so valuable to do this to check in on your goals because there's times you know where I forget I forget I'm like oh yeah you know what am I doing like I got to get back on track with that and if it wasn't for this process every month I wouldn't have that awareness to really you know identify ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-21",
    "text": "definitely on Pace to achieve this goal",
    "videoId": "TRGRznrMSec",
    "context": "- \"definitely on Pace to achieve this goal\" ( TRGRznrMSec )",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-22",
    "text": "I ended up canceling it because there's a seminar that I had a conflict with that date",
    "videoId": "TRGRznrMSec",
    "context": "- \"I ended up canceling it because there's a seminar that I had a conflict with that date\" ( TRGRznrMSec )",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-23",
    "text": "I'm going to reschedule that when he's back",
    "videoId": "TRGRznrMSec",
    "context": "- \"I'm going to reschedule that when he's back\" ( TRGRznrMSec )",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-24",
    "text": "this is one of the goals that I might change I might change this goal",
    "videoId": "TRGRznrMSec",
    "context": "- \"this is one of the goals that I might change I might change this goal\" ( TRGRznrMSec )",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-25",
    "text": "hopefully you're still on track with the goals that you set this year right remember those goals you say January 1st or excited their New Year's resolutions well are you making progress still and if not then we got to make some adjustments and you got to get yourself back on track and that's why it is important to have a ritual every week or every month or every quarter where you **reflect on your goals and you celebrate what went well you make adjustments if necessary and then you focus on quarter 2**",
    "videoId": "Y4Z6wQVArPQ",
    "context": " \"hopefully you're still on track with the goals that you set this year right remember those goals you say January 1st or excited their New Year's resolutions well are you making progress still and if not then we got to make some adjustments and you got to get yourself back on track and that's why i",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-26",
    "text": "I measure my net worth every 3 months",
    "videoId": "8kco2rjijjE",
    "context": " \"I measure my net worth every 3 months\" — 8kco2rjijjE ; \"this is a habit that you do every three months every quarter ... you track what are your assets and what are your liabilities what is your net worth\" — 2V06cH1z3Qo ; \"live blood analysis. That's one thing that I do every three months\" — NidJp",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-29",
    "text": "having strategic times throughout the day or weekends or every few months taking, you know, a week or two off, has great benefit in helping you to reassess, evaluate, analyze, and strategize with your business. And your life too, by the way. I do that just to reflect on how I've been living my life and what I want to change in my life. But sometimes you can't see when you're involved in the day-to-day, and you get in a different environment, you can get different perspectives on your life",
    "videoId": "cx0Qq1P5AHs",
    "context": " \"having strategic times throughout the day or weekends or every few months taking, you know, a week or two off, has great benefit in helping you to reassess, evaluate, analyze, and strategize with your business. And your life too, by the way. I do that just to reflect on how I've been living my lif",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-30",
    "text": "before you even decide to set your goals for 2018 and beyond you really got to make sure that you reflect on the previous year you've got to debrief it",
    "videoId": "2fDYApReHWc",
    "context": " \"before you even decide to set your goals for 2018 and beyond you really got to make sure that you reflect on the previous year you've got to debrief it\" — 2fDYApReHWc ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-31",
    "text": "first I'm going to go over my successes, accomplishments, and celebrations, the different categories of my life ... I go over the goals that I achieved. I go over the goals that I didn't achieve. Okay, I go over my failures, the mistakes that I might have made, the challenges that I might have had. I try to extract the lessons from that. What can I pull from that and learn so that I can bring that with me into 2017 so that I can make sure that I don't make some of the same mistakes again",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"first I'm going to go over my successes, accomplishments, and celebrations, the different categories of my life ... I go over the goals that I achieved. I go over the goals that I didn't achieve. Okay, I go over my failures, the mistakes that I might have made, the challenges that I might have had",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-32",
    "text": "on that blog post I've got everything broken down successes failures challenges lessons learned",
    "videoId": "2fDYApReHWc",
    "context": " \"on that blog post I've got everything broken down successes failures challenges lessons learned\" — 2fDYApReHWc ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-33",
    "text": "I find it's very beneficial throughout the year to keep journals and I keep paperback journals. I also use Evernote. I plan out my day and everything and so I find it very useful to be able to go back throughout the year and look at those old journals ... because I like to take a lot of pictures too. So, I go back through my Instagram, I go back through my camera roll on my phone",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"I find it's very beneficial throughout the year to keep journals and I keep paperback journals. I also use Evernote. I plan out my day and everything and so I find it very useful to be able to go back throughout the year and look at those old journals ... because I like to take a lot of pictures t",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-34",
    "text": "when you're reviewing your successes and your wins throughout the year, don't be hard on yourself, okay? The being hard on yourself part is more for the end of this video, okay? Or the end of this process. Really, what you're trying to do is reward yourself. Acknowledge yourself.",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"when you're reviewing your successes and your wins throughout the year, don't be hard on yourself, okay? The being hard on yourself part is more for the end of this video, okay? Or the end of this process. Really, what you're trying to do is reward yourself. Acknowledge yourself.\" — zuEb-1Ll2h8 [p",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-35",
    "text": "here's some things that you know when you when you do this, you got to look at yourself in a critical way, right? There's always things you can improve. Nobody's perfect.",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"here's some things that you know when you when you do this, you got to look at yourself in a critical way, right? There's always things you can improve. Nobody's perfect.\" — zuEb-1Ll2h8 ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-36",
    "text": "I will mention never compare yourself either. You know, everyone else is at a different level in their life. They got different goals, different focus, different vision, different circumstances.",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"I will mention never compare yourself either. You know, everyone else is at a different level in their life. They got different goals, different focus, different vision, different circumstances.\" — zuEb-1Ll2h8 ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-37",
    "text": "that first question is what was all the good that happened ... the next one is what were the challenges of this last year the last week this last month this last quarter ... and what did you learn from them ... what are the solutions what can you do better ... the third one is what did you learn this last year what were the most valuable lessons insights learnings",
    "videoId": "JZnLIuW7NQw",
    "context": " \"that first question is what was all the good that happened ... the next one is what were the challenges of this last year the last week this last month this last quarter ... and what did you learn from them ... what are the solutions what can you do better ... the third one is what did you learn t",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-38",
    "text": "there's actually a saying that goes you want to spend like 95% of your time and attention and energy on the solution and only 5% on the problem and challenge and most people what they do is they spend 95% of their time and attention on the problem ... let's say you had a lot of stress this last year ask yourself why what were the causes the triggers of this stress was it finances was it my job was it a relationship okay and if you can find that root cause now you can dig deeper into that and say does something have to change here maybe I got to change my job maybe I've got to change my finances",
    "videoId": "JZnLIuW7NQw",
    "context": " \"there's actually a saying that goes you want to spend like 95% of your time and attention and energy on the solution and only 5% on the problem and challenge and most people what they do is they spend 95% of their time and attention on the problem ... let's say you had a lot of stress this last ye",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-39",
    "text": "lessons are valuable only if we learn from it and we make sure we don't repeat those mistakes okay otherwise if you had challenges and things that happened this last year and you're not learning from it then you're probably going to continue repeating them again and again in your future until eventually it becomes so painful that you finally get the lesson and we don't want to wait for that to happen we want to learn again as much as we can from these experiences when they're small before they're really big",
    "videoId": "JZnLIuW7NQw",
    "context": " \"lessons are valuable only if we learn from it and we make sure we don't repeat those mistakes okay otherwise if you had challenges and things that happened this last year and you're not learning from it then you're probably going to continue repeating them again and again in your future until even",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-40",
    "text": "when you set your goals here's a really important question to ask **what would get in the way of me achieving this goal** okay what's going to come up what are the obstacles that are going to come up ... if we don't anticipate that and think about what is gonna show up and how can we prevent that then we're gonna just repeat that same pattern ... number one **how can i prevent it from showing up** ... and if it does show up **what can i do when that happens**",
    "videoId": "JZnLIuW7NQw",
    "context": " \"when you set your goals here's a really important question to ask what would get in the way of me achieving this goal okay what's going to come up what are the obstacles that are going to come up ... if we don't anticipate that and think about what is gonna show up and how can we prevent that then",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-41",
    "text": "you know for me some patterns i set goals and it's great for a little while but then new opportunities show up and i can get distracted okay stefan what are you gonna do how can i prevent that i gotta learn how to say no i know that's coming now",
    "videoId": "JZnLIuW7NQw",
    "context": " \"you know for me some patterns i set goals and it's great for a little while but then new opportunities show up and i can get distracted okay stefan what are you gonna do how can i prevent that i gotta learn how to say no i know that's coming now\" — JZnLIuW7NQw ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-42",
    "text": "this could be like a weekly ritual that you do a monthly or a yearly one",
    "videoId": "JZnLIuW7NQw",
    "context": "- JZnLIuW7NQw : \"this could be like a weekly ritual that you do a monthly or a yearly one\"; \"what were the challenges of this last year the last week this last month this last quarter\"; \"you can do this every week what did i learn this last week\"",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-43",
    "text": "what were the challenges of this last year the last week this last month this last quarter",
    "videoId": "JZnLIuW7NQw",
    "context": "- JZnLIuW7NQw : \"this could be like a weekly ritual that you do a monthly or a yearly one\"; \"what were the challenges of this last year the last week this last month this last quarter\"; \"you can do this every week what did i learn this last week\"",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-44",
    "text": "you can do this every week what did i learn this last week",
    "videoId": "JZnLIuW7NQw",
    "context": "- JZnLIuW7NQw : \"this could be like a weekly ritual that you do a monthly or a yearly one\"; \"what were the challenges of this last year the last week this last month this last quarter\"; \"you can do this every week what did i learn this last week\"",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-45",
    "text": "a ritual every week or every month or every quarter where you reflect on your goals and you celebrate what went well you make adjustments if necessary",
    "videoId": "Y4Z6wQVArPQ",
    "context": "- Y4Z6wQVArPQ : \"a ritual every week or every month or every quarter where you reflect on your goals and you celebrate what went well you make adjustments if necessary\"",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-46",
    "text": "the way you use this in your life is every week every month every quarter if you'd like but the more that you measure something the better you can manage it",
    "videoId": "wqJ-2N5KVOU",
    "context": "- wqJ-2N5KVOU : \"the way you use this in your life is every week every month every quarter if you'd like but the more that you measure something the better you can manage it\"",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-47",
    "text": "maybe you got to change your goal maybe your goal is too unrealistic or too unattainable and you're going to break it down more in a way that you can achieve it that's the process of success that i just gave you **something doesn't work you change your approach that doesn't work what do you change your approach if that doesn't work what do you do change your approach ... you keep changing your approach until you get what you want** okay when an airplane takes off and they go to a destination most of the time the airplane is off course with the wind and all that stuff is off course but it's always course adjusting it's always course correcting to get to the destination it's the same thing with you **you're going to get off track but you always get to adjust course as you go**",
    "videoId": "ZywgvFSnH38",
    "context": " \"maybe you got to change your goal maybe your goal is too unrealistic or too unattainable and you're going to break it down more in a way that you can achieve it that's the process of success that i just gave you something doesn't work you change your approach that doesn't work what do you change y",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-48",
    "text": "based on checking in and measuring that you can make the necessary adjustments in order to get on track to achieve it right so if you only lost one pound maybe you got to change your strategy maybe you got to change the actions that you're doing so that's why it's very important to make sure that you can measure consistently where you're at with that goal",
    "videoId": "GXhPOncX8CA",
    "context": " \"based on checking in and measuring that you can make the necessary adjustments in order to get on track to achieve it right so if you only lost one pound maybe you got to change your strategy maybe you got to change the actions that you're doing so that's why it's very important to make sure that ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-49",
    "text": "having a goal like that that's based on result is an indicator for you to measure it to see whether or not you need to change your approach or change your action plan along the way",
    "videoId": "ZywgvFSnH38",
    "context": " \"having a goal like that that's based on result is an indicator for you to measure it to see whether or not you need to change your approach or change your action plan along the way\" — ZywgvFSnH38 ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-50",
    "text": "you only lost 20 [of 30 pounds]. does that mean you failed of course not you got to look at the progress that you made the habits the confidence and everything you gained from that and **all it means is just going to set back the goal a little bit longer maybe push it back another three to six months or another year and improve and optimize your process** so that you get there",
    "videoId": "ZywgvFSnH38",
    "context": " \"you only lost 20 [of 30 pounds]. does that mean you failed of course not you got to look at the progress that you made the habits the confidence and everything you gained from that and all it means is just going to set back the goal a little bit longer maybe push it back another three to six month",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-51",
    "text": "perhaps it wasn't really a failure maybe you just needed more time maybe all these unexpected things showed up and happened that you weren't prepared for and the goal that you set was maybe not realistic enough and so maybe it's going to push it back a bit maybe instead of looking at that first year as a failure you can look at it and say you know i just got to be more patient i got to put more effort into it i got to take more action i've got to look at what i've been doing and analyze and see what i can improve and do better ... **i can set a new expectation now based on new experience and knowledge**",
    "videoId": "ekJtKfPCvsM",
    "context": " \"perhaps it wasn't really a failure maybe you just needed more time maybe all these unexpected things showed up and happened that you weren't prepared for and the goal that you set was maybe not realistic enough and so maybe it's going to push it back a bit maybe instead of looking at that first ye",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-52",
    "text": "you've got to give something a period of time before you jump and abandon it and move on to something else and **oftentimes it's not that you even necessarily even need to abandon it and move on to something else is that you just gotta tweak things you're gonna make adjustments along the way** you know if you're on a diet maybe you're gonna make adjustments along the way on a week to week or a month a month basis if it's a business ... you're gonna switch gears a little bit and try something else ... but it's always a long term process so I would say at least a year for most",
    "videoId": "KopwaDbed4s",
    "context": " \"you've got to give something a period of time before you jump and abandon it and move on to something else and oftentimes it's not that you even necessarily even need to abandon it and move on to something else is that you just gotta tweak things you're gonna make adjustments along the way you kno",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-53",
    "text": "that is something that I need to reassess and it might be a goal that I change ... being okay with being adaptable and flexible because this goal is something I feel like cuz I've committed to it I've got to do it but I'm kind of learning now that I can change it maybe I'm going to change this goal maybe I only want to do yoga once a month you know or once in a while you know **maybe it's not important for me to do it every single week because for me it just hasn't been a must it hasn't been important enough for me to really commit to and stick with** and so that is a goal that I might change",
    "videoId": "TRGRznrMSec",
    "context": " \"that is something that I need to reassess and it might be a goal that I change ... being okay with being adaptable and flexible because this goal is something I feel like cuz I've committed to it I've got to do it but I'm kind of learning now that I can change it maybe I'm going to change this goa",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-54",
    "text": "this is one of the goals that I might change ... as some of you guys know I shared a video that I [have] Mercury toxicity in my body ... I've been doing a different type of cleanse right now that is more of a Mercury Detox ... so I might change it I'm not sure yet I might still do it ... because you know **more priority for me is the metals so I got to eliminate that from my body first**",
    "videoId": "TRGRznrMSec",
    "context": " \"this is one of the goals that I might change ... as some of you guys know I shared a video that I [have] Mercury toxicity in my body ... I've been doing a different type of cleanse right now that is more of a Mercury Detox ... so I might change it I'm not sure yet I might still do it ... because y",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-55",
    "text": "I've been kind of struggling with the goals especially planning a year in advance that required like every week or every day sort of thing because I found it challenging to maintain it. I think I might change some of the goals when I try to integrate habits in my life to be more around 30 days like immerse myself a 30-day challenge for it rather than for the whole year ... I think that's one thing I'm kind of learning now when I set these goals is to modify in that a little bit in that way **give myself more flexibility**",
    "videoId": "TRGRznrMSec",
    "context": " \"I've been kind of struggling with the goals especially planning a year in advance that required like every week or every day sort of thing because I found it challenging to maintain it. I think I might change some of the goals when I try to integrate habits in my life to be more around 30 days lik",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-56",
    "text": "I only completed half of my Patty scuba diving training in Thailand ... didn't complete that goal because I got seasick, threw up in the water and halfway through it and my girlfriend too and decided after that, you know, scuba diving is not something I really want to pursue. Although I'd still like to pursue it in the future, but I think I just have a bit of a negative association after that experience. **So I'm taking a break from that goal**",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"I only completed half of my Patty scuba diving training in Thailand ... didn't complete that goal because I got seasick, threw up in the water and halfway through it and my girlfriend too and decided after that, you know, scuba diving is not something I really want to pursue. Although I'd still li",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-57",
    "text": "I didn't complete my new self-development course. So, this is something I could have achieved, but **I decided not to because I didn't want to rush it. I didn't want to burn myself and overwhelm myself** ... sometimes I'm like, you know, I don't need to kill myself over this ... I'm at a point in my life now where my stress in terms of just my happiness and well-being is much more important and valuable to me than money or success ... I had to say to myself, listen, it's okay if you don't do this. People will understand and just move it on for next year. Be fine with that.",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"I didn't complete my new self-development course. So, this is something I could have achieved, but I decided not to because I didn't want to rush it. I didn't want to burn myself and overwhelm myself ... sometimes I'm like, you know, I don't need to kill myself over this ... I'm at a point in my l",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-58",
    "text": "some goals I set them at the beginning of the year and I achieve a lot and then other goals I'm like I just maybe not as motivated for and **I have to reprioritize things or maybe change goals. So, I need to be more flexible in that regard and there's just some goals I wasn't as motivated by or weren't as relevant to me at the certain stage that I had throughout the year**",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"some goals I set them at the beginning of the year and I achieve a lot and then other goals I'm like I just maybe not as motivated for and I have to reprioritize things or maybe change goals. So, I need to be more flexible in that regard and there's just some goals I wasn't as motivated by or were",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-59",
    "text": "they have one foot in one foot out they're always looking okay well if I get lazy a week from now or I change my mind or whatever it is then I can just get a refund and I can back out and **I'm going to change my goal to something else** you know and they're always changing their mind they don't fully commit they don't have the Mastery mentality — the master commits fully they go all in when they say they're going to do something it gets done",
    "videoId": "GXhPOncX8CA",
    "context": " \"they have one foot in one foot out they're always looking okay well if I get lazy a week from now or I change my mind or whatever it is then I can just get a refund and I can back out and I'm going to change my goal to something else you know and they're always changing their mind they don't fully",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-60",
    "text": "You got to make it a must in your life. You can't have that back door of retreat of, oh, if I don't feel like it, if I get lazy, then forget about it. That's the worst mentality to have. When I commit to something, it means that it's done. It's done. There's no possibility of retreat. There's no excuses. There's no I changed my mind.",
    "videoId": "NidJpDcCkQs",
    "context": " \"You got to make it a must in your life. You can't have that back door of retreat of, oh, if I don't feel like it, if I get lazy, then forget about it. That's the worst mentality to have. When I commit to something, it means that it's done. It's done. There's no possibility of retreat. There's no e",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-61",
    "text": "that level of thinking is great especially if you struggle with the dabbler mentality if you have a hard time following through and committing to things ... but **at a certain point I'm kind of realizing that that mindset can have some limitations because at certain times you might have to be flexible you might have to be strategic you might have to change course and you might have to break a commitment in order to course correct or make different decisions at different times to achieve your ultimate vision**",
    "videoId": "TRGRznrMSec",
    "context": " \"that level of thinking is great especially if you struggle with the dabbler mentality if you have a hard time following through and committing to things ... but at a certain point I'm kind of realizing that that mindset can have some limitations because at certain times you might have to be flexib",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-62",
    "text": "it's okay to be flexible and adaptable to change your commitments at times it might be necessary **especially because if you're setting goals out for a year in advance so much can change in a year** ... so flexibility is a good thing um **but you got to be careful with it okay you have to make sure that you're not dabbling with it too much you know that you still have the habit of doing what you say finishing what you start but still having that flexibility at a later point**",
    "videoId": "TRGRznrMSec",
    "context": " \"it's okay to be flexible and adaptable to change your commitments at times it might be necessary especially because if you're setting goals out for a year in advance so much can change in a year ... so flexibility is a good thing um but you got to be careful with it okay you have to make sure that",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-63",
    "text": "you got to be flexible at the same time also so **flexibility is power**",
    "videoId": "GXhPOncX8CA",
    "context": " \"you got to be flexible at the same time also so flexibility is power \" — GXhPOncX8CA ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-64",
    "text": "when you don't achieve a goal it can be useful to give yourself a bit of pain just to kick yourself in the ass get on track but **you don't want to indulge in it you don't want to beat yourself up** because then you're just going to kill your self-esteem and confidence ... there's no failure there's only feedback and so if you set goals you didn't achieve them that's incredible feedback you just got to look at okay **why didn't I achieve them what happened** — I don't achieve every goal that I set I achieve maybe 90% of them ... there's always 10% I can learn from ... maybe I didn't schedule things the right way or maybe I changed my mind or things happen",
    "videoId": "GXhPOncX8CA",
    "context": " \"when you don't achieve a goal it can be useful to give yourself a bit of pain just to kick yourself in the ass get on track but you don't want to indulge in it you don't want to beat yourself up because then you're just going to kill your self-esteem and confidence ... there's no failure there's o",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-65",
    "text": "I'm proud to say I achieved maybe 90% of my goals year after year, but there's still 10% that under certain circumstances I'm not achieving them for",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"I'm proud to say I achieved maybe 90% of my goals year after year, but there's still 10% that under certain circumstances I'm not achieving them for\" — zuEb-1Ll2h8 ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-68",
    "text": "I don't really believe in a 100% consistency cuz no one is no one's perfect ... you still got to reward and acknowledge yourself for the progress you make ... you don't have to go to the gym every day but man if you just get yourself to just go to the gym a few times that's still a win that's still a success so don't feel bad for yourself for that",
    "videoId": "TRGRznrMSec",
    "context": " \"I don't really believe in a 100% consistency cuz no one is no one's perfect ... you still got to reward and acknowledge yourself for the progress you make ... you don't have to go to the gym every day but man if you just get yourself to just go to the gym a few times that's still a win that's stil",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-69",
    "text": "I quit not lying I quit and I just fell behind I missed a day and I missed two days and then I try to get back on track and then I miss other days ... and I gave up on it ... and then I realized okay the next time the next 100 days after that I need to commit to this again ... **I didn't beat myself up too much I just got back to it did it again and again until I finally learned how to master something**",
    "videoId": "GXhPOncX8CA",
    "context": " \"I quit not lying I quit and I just fell behind I missed a day and I missed two days and then I try to get back on track and then I miss other days ... and I gave up on it ... and then I realized okay the next time the next 100 days after that I need to commit to this again ... I didn't beat myself",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-70",
    "text": "as you endure difficulties challenges setbacks **go back to those list of reasons strengthen them come up with more up that level of commitment** until you get what you want",
    "videoId": "y2oiz9LRchE",
    "context": " \"as you endure difficulties challenges setbacks go back to those list of reasons strengthen them come up with more up that level of commitment until you get what you want\" — y2oiz9LRchE ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-71",
    "text": "any time you get sidetracked any time you get off track whatever it is you lose that motivation all you got to do is just focus on where you want to go ... write out your goals put it on a notepad or a piece of paper put it in your back pocket ... and anytime you get off track just pull it out",
    "videoId": "KN9504n_ts8",
    "context": " \"any time you get sidetracked any time you get off track whatever it is you lose that motivation all you got to do is just focus on where you want to go ... write out your goals put it on a notepad or a piece of paper put it in your back pocket ... and anytime you get off track just pull it out\" (T",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-72",
    "text": "the consequence is the pain of what will happen if you don't do it now **the ultimate consequence is always the emotional consequence — not being consistent with your identity, the shame, the lowering your self-esteem, not following through on your word** ... but if you can have a consequence that's different as well that could also be powerful so it could be Mastermind groups I'm a part of will have a consequence if you don't achieve the goal then you're going to have to donate money to charity or you're going to have to give another guy — I've done things with my friends where you write a check to each other",
    "videoId": "GXhPOncX8CA",
    "context": " \"the consequence is the pain of what will happen if you don't do it now the ultimate consequence is always the emotional consequence — not being consistent with your identity, the shame, the lowering your self-esteem, not following through on your word ... but if you can have a consequence that's d",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-73",
    "text": "if it's no then you do the consequence whatever the consequence you agree to you man up you do it ... **sometimes you have to stack the consequence to make it even more painful if you need to**",
    "videoId": "y2oiz9LRchE",
    "context": " \"if it's no then you do the consequence whatever the consequence you agree to you man up you do it ... sometimes you have to stack the consequence to make it even more painful if you need to \" — y2oiz9LRchE ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-74",
    "text": "most challenges will get bigger and bigger and bigger it's like you want to kill the monster while it's small before it gets to a point where it's godzilla is taking over the whole city",
    "videoId": "JZnLIuW7NQw",
    "context": " \"most challenges will get bigger and bigger and bigger it's like you want to kill the monster while it's small before it gets to a point where it's godzilla is taking over the whole city\" — JZnLIuW7NQw ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-75",
    "text": "whatever gets rewarded gets reinforced Whatever Gets rewarded gets repeated ... there's a great book called Don't Shoot the Dog and when they train animals when they train dolphins the same applies for human beings positive reinforcement is really important ... negative reinforcement sometimes is good pain can drive you as well but **the positive reinforcement is how you make something last**",
    "videoId": "GXhPOncX8CA",
    "context": " \"whatever gets rewarded gets reinforced Whatever Gets rewarded gets repeated ... there's a great book called Don't Shoot the Dog and when they train animals when they train dolphins the same applies for human beings positive reinforcement is really important ... negative reinforcement sometimes is ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-76",
    "text": "whatever it gets rewarded gets repeated it gets reinforced and so if you don't ever take in and pat yourself on the back and acknowledge and celebrate wins and successes then **you're not going to be able to create more of that in your life it starts with reinforcing and taking it all in**",
    "videoId": "2fDYApReHWc",
    "context": " \"whatever it gets rewarded gets repeated it gets reinforced and so if you don't ever take in and pat yourself on the back and acknowledge and celebrate wins and successes then you're not going to be able to create more of that in your life it starts with reinforcing and taking it all in \" — 2fDYApR",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-77",
    "text": "when I set goals this is a great strategy I always make sure that **I set up a reward and a consequence** ... for me I like to set up a reward when I achieve the goal then maybe I'm going to do something awesome for myself maybe it's going for a massage maybe it's going on a trip",
    "videoId": "GXhPOncX8CA",
    "context": " \"when I set goals this is a great strategy I always make sure that I set up a reward and a consequence ... for me I like to set up a reward when I achieve the goal then maybe I'm going to do something awesome for myself maybe it's going for a massage maybe it's going on a trip\" — GXhPOncX8CA ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-78",
    "text": "you want to give yourself a reward for achieving your goal or doing what you said you're going to do so for example if you said yourself i'm going to publish a book on amazon in the next 30 days what reward will you give yourself when you achieve that goal maybe you could give yourself a shopping spree allow yourself to spend a hundred dollars on anything that you want ... or maybe get a massage or maybe it's to go to the spa ... maybe it's taking yourself out to a nice restaurant and allowing yourself to order anything that you want",
    "videoId": "y2oiz9LRchE",
    "context": " \"you want to give yourself a reward for achieving your goal or doing what you said you're going to do so for example if you said yourself i'm going to publish a book on amazon in the next 30 days what reward will you give yourself when you achieve that goal maybe you could give yourself a shopping ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-79",
    "text": "sometimes it's simple things like giving yourself a pat on the back you know acknowledging yourself and being proud of yourself and **writing out 10 reasons why you're proud of yourself** ... i often kind of give myself a high five on my own or pat myself in the back or **look myself in the mirror and say Stefan great job**",
    "videoId": "y2oiz9LRchE",
    "context": " \"sometimes it's simple things like giving yourself a pat on the back you know acknowledging yourself and being proud of yourself and writing out 10 reasons why you're proud of yourself ... i often kind of give myself a high five on my own or pat myself in the back or look myself in the mirror and s",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-80",
    "text": "if by the end of the day I did nothing else but those three things today was a great day i celebrate that",
    "videoId": "PPlaK8y4PzA",
    "context": "- Daily: \"if by the end of the day I did nothing else but those three things today was a great day i celebrate that\" — PPlaK8y4PzA ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-81",
    "text": "a life worth living is worth recording",
    "videoId": "8kco2rjijjE",
    "context": "- Weekly: journal all the magic moments of last week — \"a life worth living is worth recording\" (Jim Rohn) — 8kco2rjijjE ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-82",
    "text": "for me if i have a big launch a big project i usually set it up so my reward after this big project which might take me three months after i'm gonna take a one week off and i'm going to go on a vacation and really celebrate and reward myself",
    "videoId": "y2oiz9LRchE",
    "context": "- Project-scale: \"for me if i have a big launch a big project i usually set it up so my reward after this big project which might take me three months after i'm gonna take a one week off and i'm going to go on a vacation and really celebrate and reward myself\" — y2oiz9LRchE ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-83",
    "text": "when i was really focused on transforming my body i would celebrate by having a photo shoot ... hiring a professional photographer taking some great photos maybe getting some new outfits",
    "videoId": "y2oiz9LRchE",
    "context": "- Body-transformation-scale: \"when i was really focused on transforming my body i would celebrate by having a photo shoot ... hiring a professional photographer taking some great photos maybe getting some new outfits\" — y2oiz9LRchE ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-84",
    "text": "often times we're afraid to toot our own horn we're afraid to acknowledge ourselves to celebrate it ... I'm a fan of being humble and whatnot but **if you don't really take in and pat yourself on the back and acknowledge and celebrate wins and successes then you're not going to be able to create more of that in your life**",
    "videoId": "2fDYApReHWc",
    "context": " \"often times we're afraid to toot our own horn we're afraid to acknowledge ourselves to celebrate it ... I'm a fan of being humble and whatnot but if you don't really take in and pat yourself on the back and acknowledge and celebrate wins and successes then you're not going to be able to create mor",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-85",
    "text": "don't be so critical of yourself all the time and be like, 'Yeah, I did this, but—' **because whenever you say that 'but' you're almost cheapening the accomplishment and the success that you have.** I think that we all need to be a lot nicer to ourselves. We all need to reward ourselves more and acknowledge ourselves a lot more in our lives",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"don't be so critical of yourself all the time and be like, 'Yeah, I did this, but—' because whenever you say that 'but' you're almost cheapening the accomplishment and the success that you have. I think that we all need to be a lot nicer to ourselves. We all need to reward ourselves more and ackno",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-86",
    "text": "everybody should toot their own horn from time to time and pat themselves on the back and acknowledge themselves for the hard work and everything that they've done well because **that builds your self-esteem, your confidence**",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"everybody should toot their own horn from time to time and pat themselves on the back and acknowledge themselves for the hard work and everything that they've done well because that builds your self-esteem, your confidence \" — zuEb-1Ll2h8 ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-87",
    "text": "when I do this and I focus on it I'm like, 'Wow, I'm so proud of myself' and it grows your confidence. And I'm like, 'Oh my god, I did so much. What more can I do in 2017?' My confidence, my self-esteem is high. And it **gives me more confidence to achieve more and to achieve bigger things**",
    "videoId": "zuEb-1Ll2h8",
    "context": " \"when I do this and I focus on it I'm like, 'Wow, I'm so proud of myself' and it grows your confidence. And I'm like, 'Oh my god, I did so much. What more can I do in 2017?' My confidence, my self-esteem is high. And it gives me more confidence to achieve more and to achieve bigger things \" — zuEb-",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-88",
    "text": "if it's not perfect you linked in your mind back when you're a kid with your parents that if you don't get an A then it means you're not good enough so even a B you don't even celebrate ... and if it's not perfect then you're a perfectionist and now you never take action because you never again want to experience that feeling that pain",
    "videoId": "oLQiUIJ7PsQ",
    "context": " \"if it's not perfect you linked in your mind back when you're a kid with your parents that if you don't get an A then it means you're not good enough so even a B you don't even celebrate ... and if it's not perfect then you're a perfectionist and now you never take action because you never again wa",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-89",
    "text": "some people don't like that because that makes them feel insecure it makes them feel jealous — **someone else's successes can shine a spotlight on other people's missed opportunities and failures**",
    "videoId": "2fDYApReHWc",
    "context": " \"some people don't like that because that makes them feel insecure it makes them feel jealous — someone else's successes can shine a spotlight on other people's missed opportunities and failures \" — 2fDYApReHWc ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-90",
    "text": "what you're doing right now you're not looking at challenges just yet you're not looking at the problems just yet most of us we're so hard on ourselves and we automatically by default look at the problems and the challenges in our life and we don't have a balance of also looking at the good so we'll get to the challenges in a moment okay but first **let's flood yourself with all the good**",
    "videoId": "JZnLIuW7NQw",
    "context": " \"what you're doing right now you're not looking at challenges just yet you're not looking at the problems just yet most of us we're so hard on ourselves and we automatically by default look at the problems and the challenges in our life and we don't have a balance of also looking at the good so we'",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-91",
    "text": "there might be times when your brain is like there was nothing that was good that happened and it's gonna go to that default negative mode and that's where you have to **train your mind to still look for the good** the fact that you woke up that you're still alive that you're healthy all of those are great victories",
    "videoId": "JZnLIuW7NQw",
    "context": " \"there might be times when your brain is like there was nothing that was good that happened and it's gonna go to that default negative mode and that's where you have to train your mind to still look for the good the fact that you woke up that you're still alive that you're healthy all of those are ",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-92",
    "text": "a lot of people when they set their goals they don't have that confidence and that certainty and when you don't have that confidence and certainty you're not going to set goals because part of you doesn't believe that you're going to achieve them ... **part of this process it gives you certainty and confidence**",
    "videoId": "JZnLIuW7NQw",
    "context": " \"a lot of people when they set their goals they don't have that confidence and that certainty and when you don't have that confidence and certainty you're not going to set goals because part of you doesn't believe that you're going to achieve them ... part of this process it gives you certainty and",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-reviews-93",
    "text": "weekly review on Sunday",
    "videoId": "z2eXtlqviQo",
    "context": "- z2eXtlqviQo (\"weekly review on Sunday\") is a guest (Evolved Brain Type author), not Stefan — excluded from the doctrine.",
    "artifact": "phase2-reviews"
  },
  {
    "id": "phase2-routines-0",
    "text": "by smiling for me I don't even use an alarm clock I just naturally wake up around 8:00 in the morning each day and I wake up and I immediately smile",
    "videoId": "OgRGJBpTOeU",
    "context": "- v2 (~2014): no alarm, ~8am. \"by smiling for me I don't even use an alarm clock I just naturally wake up around 8:00 in the morning each day and I wake up and I immediately smile\" — OgRGJBpTOeU ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-1",
    "text": "number one I usually sleep about seven to eight hours okay I'm a big fan of making sure you get good quality sleep... wake up usually actually the Sun wakes me up it's one of the amazing things about living in an apartment with a lot of natural light so light wakes me up in the morning",
    "videoId": "DH-ljbSald8",
    "context": "- v4 (~2020): sun wakes him, 7–8h sleep. \"number one I usually sleep about seven to eight hours okay I'm a big fan of making sure you get good quality sleep... wake up usually actually the Sun wakes me up it's one of the amazing things about living in an apartment with a lot of natural light so ligh",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-2",
    "text": "a lot of people ask me you know how many hours do you sleep uh per night usually it's between 6 to 8 hours and I really am big on listening to my body because you know every day is different and I work out a lot too... I want to make sure that I sleep up to 8 hours just so that my body can recover um but usually the sun wakes me up",
    "videoId": "d55uSjZQ-QI",
    "context": "- day-in-life: 6–8h. \"a lot of people ask me you know how many hours do you sleep uh per night usually it's between 6 to 8 hours and I really am big on listening to my body because you know every day is different and I work out a lot too... I want to make sure that I sleep up to 8 hours just so that",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-3",
    "text": "Knowing what time you wake up and having a ritual around that. Waking up, let's say 6:00 a.m. I love waking up early, sometimes 5:00 a.m., but usually 6:00. But I like waking up early because I can accomplish more in the morning. I often find if I wake up at 5:00, by the time it's 10:00 a.m., I've already got so much done compared to most people.",
    "videoId": "0UTb0mnuJRE",
    "context": "- later (time-management video): 6am default, sometimes 5am. \"Knowing what time you wake up and having a ritual around that. Waking up, let's say 6:00 a.m. I love waking up early, sometimes 5:00 a.m., but usually 6:00. But I like waking up early because I can accomplish more in the morning. I often ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-4",
    "text": "I think a healthy range is 6 to 8 hours",
    "videoId": "0UTb0mnuJRE",
    "context": "- His own stated healthy range: \"I think a healthy range is 6 to 8 hours\" — 0UTb0mnuJRE ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-5",
    "text": "first thing that i do guys first thing right out the gate it sounds so simple but it's so important is i smile",
    "videoId": "PPlaK8y4PzA",
    "context": "\"first thing that i do guys first thing right out the gate it sounds so simple but it's so important is i smile\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-6",
    "text": "to be honest with you guys i don't always feel happy or positive every day in the morning but by training myself to smile i'm setting the president for the rest of the day",
    "videoId": "PPlaK8y4PzA",
    "context": "Honest caveat he gives: \"to be honest with you guys i don't always feel happy or positive every day in the morning but by training myself to smile i'm setting the president for the rest of the day\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-7",
    "text": "number two stretch stretch um so as I'm laying in bed it's going to stretch out my body",
    "videoId": "PliFBr__T7Y",
    "context": "v1 had a 3-part in-bed opener before getting up: smile → stretch → breathe . \"number two stretch stretch um so as I'm laying in bed it's going to stretch out my body\" / \"number uh number three is I kind of Chunk all this kind of stuff together is breathe breathe\" — PliFBr__T7Y ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-8",
    "text": "number uh number three is I kind of Chunk all this kind of stuff together is breathe breathe",
    "videoId": "PliFBr__T7Y",
    "context": "v1 had a 3-part in-bed opener before getting up: smile → stretch → breathe . \"number two stretch stretch um so as I'm laying in bed it's going to stretch out my body\" / \"number uh number three is I kind of Chunk all this kind of stuff together is breathe breathe\" — PliFBr__T7Y ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-9",
    "text": "after that i go to the bathroom you know i brush my teeth i wash my face all that standard stuff that often people do",
    "videoId": "PPlaK8y4PzA",
    "context": "\"after that i go to the bathroom you know i brush my teeth i wash my face all that standard stuff that often people do\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-10",
    "text": "i usually start off my day drinking high quality filtered ionized water usually 9.5 alkaline and i drink this whole bottle guys this bottle says abundance on it",
    "videoId": "PPlaK8y4PzA",
    "context": "\"i usually start off my day drinking high quality filtered ionized water usually 9.5 alkaline and i drink this whole bottle guys this bottle says abundance on it\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-11",
    "text": "often i drink my water with a green drink too i like to use athletic greens",
    "videoId": "PPlaK8y4PzA",
    "context": "\"often i drink my water with a green drink too i like to use athletic greens\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-12",
    "text": "I'm [ __ ] drinking like two glasses of water because my body needs it",
    "videoId": "PliFBr__T7Y",
    "context": "v1/v2: two glasses minimum + lemon. \"I'm [ __ ] drinking like two glasses of water because my body needs it\" — PliFBr__T7Y ; \"I like to mix a greens drink a greens powder in my water and drink that I also sometimes put a lemon in as well lemon will help alkalize the water I also use a water ionizer ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-14",
    "text": "this is apple cider vinegar so i usually take a shot of this",
    "videoId": "PPlaK8y4PzA",
    "context": "\"this is apple cider vinegar so i usually take a shot of this\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-15",
    "text": "usually the ones i take first thing in the morning on an empty stomach are enzymes number one so i usually take mass symes [MassZymes] which uh by buy optimizers my friend wade lightheart... but enzymes always on an empty stomach",
    "videoId": "PPlaK8y4PzA",
    "context": "\"usually the ones i take first thing in the morning on an empty stomach are enzymes number one so i usually take mass symes [MassZymes] which uh by buy optimizers my friend wade lightheart... but enzymes always on an empty stomach\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-16",
    "text": "other ones i take are vitamin b12 um vitamin d3 especially during the winter months not getting much sunlight",
    "videoId": "PPlaK8y4PzA",
    "context": "\"other ones i take are vitamin b12 um vitamin d3 especially during the winter months not getting much sunlight\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-17",
    "text": "i spend at least 10 minutes a day reading or at least read 10 pages a day of a good book if you read just 10 pages a day then over a month that's 300 pages which is a book a month over the course of a year that's 12 books a year that's just the bare minimum",
    "videoId": "PPlaK8y4PzA",
    "context": "\"i spend at least 10 minutes a day reading or at least read 10 pages a day of a good book if you read just 10 pages a day then over a month that's 300 pages which is a book a month over the course of a year that's 12 books a year that's just the bare minimum\" — PPlaK8y4PzA (identical math in PliFBr_",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-18",
    "text": "a lot of people they start off their day with social media... i think that's a horrible way to start the day",
    "videoId": "PPlaK8y4PzA",
    "context": "Deliberately BEFORE email/news: \"a lot of people they start off their day with social media... i think that's a horrible way to start the day\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-19",
    "text": "i got the five minute journal so i also write in here... you put in three things you're grateful for what would make today great you put in three things for that you put in the daily affirmation that you have and then also has an evening portion as well where you ask yourself three amazing things that happen today you journal that and how could i made today better",
    "videoId": "PPlaK8y4PzA",
    "context": "\"i got the five minute journal so i also write in here... you put in three things you're grateful for what would make today great you put in three things for that you put in the daily affirmation that you have and then also has an evening portion as well where you ask yourself three amazing things t",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-20",
    "text": "i've also got here the productivity planner by the same company... what is the most important task for the day what are the secondary tasks of importance additional tasks your productivity score for the day and they use the pomodoro uh technique",
    "videoId": "PPlaK8y4PzA",
    "context": "\"i've also got here the productivity planner by the same company... what is the most important task for the day what are the secondary tasks of importance additional tasks your productivity score for the day and they use the pomodoro uh technique\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-21",
    "text": "for those of you that maybe are christian or more spiritual this is for the spirit i've got my christian gratitude journal",
    "videoId": "PPlaK8y4PzA",
    "context": "\"for those of you that maybe are christian or more spiritual this is for the spirit i've got my christian gratitude journal\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-22",
    "text": "so i'll spend maybe uh 10 minutes doing that maybe a little bit longer",
    "videoId": "PPlaK8y4PzA",
    "context": "\"so i'll spend maybe uh 10 minutes doing that maybe a little bit longer\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-23",
    "text": "i lay on this for at least 10 minutes and i do my meditation on it",
    "videoId": "PPlaK8y4PzA",
    "context": "\"i lay on this for at least 10 minutes and i do my meditation on it\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-24",
    "text": "i usually just set it for maybe 10 minutes you can put on the intensity of it and then you put on the what's called the omni brain which basically it's good for optimizing your brain waves so it flashes different lights and then there's also headphones i listen to that have binaural beats",
    "videoId": "PPlaK8y4PzA",
    "context": "\"i usually just set it for maybe 10 minutes you can put on the intensity of it and then you put on the what's called the omni brain which basically it's good for optimizing your brain waves so it flashes different lights and then there's also headphones i listen to that have binaural beats\" — PPlaK8",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-25",
    "text": "i usually just do at least 10 minutes um morning sometimes i do in the evening as well",
    "videoId": "PPlaK8y4PzA",
    "context": "\"i usually just do at least 10 minutes um morning sometimes i do in the evening as well\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-26",
    "text": "oftentimes i'll also stretch on my pemf mat just five minutes stretching up my body my back",
    "videoId": "PPlaK8y4PzA",
    "context": "\"oftentimes i'll also stretch on my pemf mat just five minutes stretching up my body my back\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-27",
    "text": "this is known as the juve j-o-o-v-v and what this does is it's red light therapy and so what you do is you turn it on... and you spend five minutes standing in front of it now when i do this of course you remove your clothes so you're naked okay because it has to have contact with the skin",
    "videoId": "PPlaK8y4PzA",
    "context": "\"this is known as the juve j-o-o-v-v and what this does is it's red light therapy and so what you do is you turn it on... and you spend five minutes standing in front of it now when i do this of course you remove your clothes so you're naked okay because it has to have contact with the skin\" — PPlaK",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-28",
    "text": "often when i'm doing those five minutes in front of the red lights i like to practice what is called heart activation and it's a great book called the heart math solution... when you put your hands in your hearts and you focus on breathing on your heart and feeling grateful for your heart",
    "videoId": "PPlaK8y4PzA",
    "context": "\"often when i'm doing those five minutes in front of the red lights i like to practice what is called heart activation and it's a great book called the heart math solution... when you put your hands in your hearts and you focus on breathing on your heart and feeling grateful for your heart\" — PPlaK8",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-29",
    "text": "if i can utilize and combine these things together in whatever way i can that's the best way to do it that's why i like to do my meditation on the pemf mat because now i'm getting two different benefits from it",
    "videoId": "PPlaK8y4PzA",
    "context": "Stacking is a deliberate principle: \"if i can utilize and combine these things together in whatever way i can that's the best way to do it that's why i like to do my meditation on the pemf mat because now i'm getting two different benefits from it\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-30",
    "text": "my new primary question i ask this every day is how can i appreciate and enjoy my life even more while feeling even more fully alive and growing and making a difference",
    "videoId": "PPlaK8y4PzA",
    "context": "\"my new primary question i ask this every day is how can i appreciate and enjoy my life even more while feeling even more fully alive and growing and making a difference\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-31",
    "text": "my old one used to be how can i become better which was a useful primary question... but the downside with it is there's actually a negative presupposition to that which is that i'm not enough",
    "videoId": "PPlaK8y4PzA",
    "context": "Old one, and why he retired it: \"my old one used to be how can i become better which was a useful primary question... but the downside with it is there's actually a negative presupposition to that which is that i'm not enough\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-32",
    "text": "often i don't go through all of this in one day i pick one so i ask myself okay what is one value from this uh list that i have here that i want to integrate more in my life",
    "videoId": "PPlaK8y4PzA",
    "context": "\"often i don't go through all of this in one day i pick one so i ask myself okay what is one value from this uh list that i have here that i want to integrate more in my life\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-33",
    "text": "i also try to condition what's called an away from value which are the negative emotions that you want to avoid in your life and i've turned these into affirmations as well",
    "videoId": "PPlaK8y4PzA",
    "context": "\"i also try to condition what's called an away from value which are the negative emotions that you want to avoid in your life and i've turned these into affirmations as well\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-34",
    "text": "then often i've got my six human needs... i like conditioned love and growth and contribution every day um but i i spend maybe five or ten minutes a day going through that",
    "videoId": "PPlaK8y4PzA",
    "context": "\"then often i've got my six human needs... i like conditioned love and growth and contribution every day um but i i spend maybe five or ten minutes a day going through that\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-35",
    "text": "i like to frame these things and have it somewhere i can see it every day i found if i have it in a book if i've got it in a file on my computer it's very easy to forget about it",
    "videoId": "PPlaK8y4PzA",
    "context": "\"i like to frame these things and have it somewhere i can see it every day i found if i have it in a book if i've got it in a file on my computer it's very easy to forget about it\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-36",
    "text": "so i usually spend three minutes doing [that]",
    "videoId": "PPlaK8y4PzA",
    "context": "\"so i usually spend three minutes doing [that]\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-37",
    "text": "I Stephan poos see know hear and feel that the purpose of my life is to be more Fully Alive grow and make a difference in the lives of others yes I usually always end off my incantations by saying yes because when I say yes... it starts to Anchor that emotional state",
    "videoId": "OgRGJBpTOeU",
    "context": "v2 mission statement is spoken first, as an incantation: \"I Stephan poos see know hear and feel that the purpose of my life is to be more Fully Alive grow and make a difference in the lives of others yes I usually always end off my incantations by saying yes because when I say yes... it starts to An",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-38",
    "text": "here in my office i've got a rebounder which is a mini trampoline and i've also got one down in my bedroom also",
    "videoId": "PPlaK8y4PzA",
    "context": "\"here in my office i've got a rebounder which is a mini trampoline and i've also got one down in my bedroom also\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-39",
    "text": "how often do i rebound multiple times a multiple times a day before this stream early this morning after this in the evening time i always have it out because i can just jump on it changes my state",
    "videoId": "QZjdmXreWd0",
    "context": "\"how often do i rebound multiple times a multiple times a day before this stream early this morning after this in the evening time i always have it out because i can just jump on it changes my state\" — QZjdmXreWd0 ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-41",
    "text": "it helps to eliminate lymph stimulates the lymphatic system because oftentimes they also call one of these a lymphocyzer",
    "videoId": "PPlaK8y4PzA",
    "context": "Why: \"emotion is created by motion\" + lymphatic drainage — \"it helps to eliminate lymph stimulates the lymphatic system because oftentimes they also call one of these a lymphocyzer\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-42",
    "text": "i'll spend about five minutes doing that jumping up and down exactly as i demonstrated asking myself these questions speaking it out loud",
    "videoId": "PPlaK8y4PzA",
    "context": "\"i'll spend about five minutes doing that jumping up and down exactly as i demonstrated asking myself these questions speaking it out loud\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-43",
    "text": "what i often do as well is i like to anchor it... my anchor that i have is i clench my fist or i'll snap my fingers or maybe i'll clap my hands together",
    "videoId": "PPlaK8y4PzA",
    "context": "\"what i often do as well is i like to anchor it... my anchor that i have is i clench my fist or i'll snap my fingers or maybe i'll clap my hands together\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-44",
    "text": "usually I just spend about five minutes a day doing this",
    "videoId": "PliFBr__T7Y",
    "context": "v1 duration: \"usually I just spend about five minutes a day doing this\" — PliFBr__T7Y ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-45",
    "text": "i'll speak usually each card at least three times i don't go through the whole deck i've got over 100 here i've got even more elsewhere but i'll speak each one three times i'll spend usually five minutes doing this",
    "videoId": "PPlaK8y4PzA",
    "context": "\"i'll speak usually each card at least three times i don't go through the whole deck i've got over 100 here i've got even more elsewhere but i'll speak each one three times i'll spend usually five minutes doing this\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-46",
    "text": "it only takes five minutes a day",
    "videoId": "PPlaK8y4PzA",
    "context": "\"it only takes five minutes a day\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-47",
    "text": "i have here practice public speaking and speaking transcripts for 10 minutes so one thing i like to do is i find great speakers... and i'll get it transcribed and i'll pay someone to transcribe it and then i have the transcript i print it out and then i practice speaking out loud",
    "videoId": "PPlaK8y4PzA",
    "context": "\"i have here practice public speaking and speaking transcripts for 10 minutes so one thing i like to do is i find great speakers... and i'll get it transcribed and i'll pay someone to transcribe it and then i have the transcript i print it out and then i practice speaking out loud\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-48",
    "text": "i'll spend 15 minutes going through exercises",
    "videoId": "PPlaK8y4PzA",
    "context": "\"i'll spend 15 minutes going through exercises\" (pattern interrupts for binge eating / laziness / procrastination) — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-49",
    "text": "i've got to have a ritual every day where i review what i've learned you know if i went to this seminar i want to make sure for the next 30 days i'm reviewing my notes",
    "videoId": "PPlaK8y4PzA",
    "context": "\"i've got to have a ritual every day where i review what i've learned you know if i went to this seminar i want to make sure for the next 30 days i'm reviewing my notes\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-50",
    "text": "what i like to do um as a kind of the last thing as part of my ritual is to plan out the day and i find there's benefit of doing this like right before you're transitioning to work mode versus like early on because when i plan out my day i get excited about my outcomes... that's when i sort of focus in on business and work mode and switch gears",
    "videoId": "PPlaK8y4PzA",
    "context": "\"what i like to do um as a kind of the last thing as part of my ritual is to plan out the day and i find there's benefit of doing this like right before you're transitioning to work mode versus like early on because when i plan out my day i get excited about my outcomes... that's when i sort of focu",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-51",
    "text": "usually I focus on about three different outcomes... usually I'll have an outcome for my my body, my health, uh I'll have an outcome for uh my business, and then also usually have an outcome for my relationship or social life",
    "videoId": "qaD-jpWPNOE",
    "context": "Method = Tony Robbins RPM in Evernote: outcome → why → action plan. \"usually I focus on about three different outcomes... usually I'll have an outcome for my my body, my health, uh I'll have an outcome for uh my business, and then also usually have an outcome for my relationship or social life\" — qa",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-52",
    "text": "what are the three most important highest leverage things that i need to do... if by the end of the day i did nothing else but those three things today was a great day",
    "videoId": "PPlaK8y4PzA",
    "context": "Success criterion: \"what are the three most important highest leverage things that i need to do... if by the end of the day i did nothing else but those three things today was a great day\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-53",
    "text": "whenever I do my highest leverage activity I always use a timer and I usually sit about 60 minutes for me to get something done just right away right off the get-go the one thing I've been procrastinating on",
    "videoId": "OgRGJBpTOeU",
    "context": "\"whenever I do my highest leverage activity I always use a timer and I usually sit about 60 minutes for me to get something done just right away right off the get-go the one thing I've been procrastinating on\" — OgRGJBpTOeU ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-54",
    "text": "every morning I have a call with a buddy... we talk in in a very fast conversation about the three things that we're committed to getting done that day... if you didn't get it done the accountability is you have to give $20 to a charity",
    "videoId": "PliFBr__T7Y",
    "context": "- Accountability call (v1): \"every morning I have a call with a buddy... we talk in in a very fast conversation about the three things that we're committed to getting done that day... if you didn't get it done the accountability is you have to give $20 to a charity\" — PliFBr__T7Y . Later variant: 6a",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-57",
    "text": "the priming looks like this I first do 30 explosive breaths in and out through my nose... I'll do it 30 times... and then I focus on three things that I'm grateful for in my life... two of the things that I'm grateful for always have to be something small... then I do another 30 explosive breaths just like I showed you and I'll think about three things I want to create in my life... and then I'll do another 30 explosive breaths and I always finish off just by asking the universe asking God... for healing and I just finish off just with a little prayer and I just say thank you thank you thank you",
    "videoId": "OgRGJBpTOeU",
    "context": "- Priming (v2 only, explicitly Tony Robbins): 3 rounds of 30 explosive nose breaths, sandwiching gratitude then creation-visualisation, closing with prayer. \"the priming looks like this I first do 30 explosive breaths in and out through my nose... I'll do it 30 times... and then I focus on three thi",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-58",
    "text": "I usually do maybe 5 or 10 minutes",
    "videoId": "OgRGJBpTOeU",
    "context": "- Priming (v2 only, explicitly Tony Robbins): 3 rounds of 30 explosive nose breaths, sandwiching gratitude then creation-visualisation, closing with prayer. \"the priming looks like this I first do 30 explosive breaths in and out through my nose... I'll do it 30 times... and then I focus on three thi",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-59",
    "text": "I put myself in a resourceful State and usually that's putting on music jumping up and down making different gestures my body making my moves saying yes",
    "videoId": "OgRGJBpTOeU",
    "context": "- Peak-state / celebration step (v2): \"I put myself in a resourceful State and usually that's putting on music jumping up and down making different gestures my body making my moves saying yes\" + \"after I've did my ritual I'll Pat myself on the back you know say great job\" — OgRGJBpTOeU ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-60",
    "text": "after I've did my ritual I'll Pat myself on the back you know say great job",
    "videoId": "OgRGJBpTOeU",
    "context": "- Peak-state / celebration step (v2): \"I put myself in a resourceful State and usually that's putting on music jumping up and down making different gestures my body making my moves saying yes\" + \"after I've did my ritual I'll Pat myself on the back you know say great job\" — OgRGJBpTOeU ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-61",
    "text": "about five to six days a week right now in my morning I do coffee enemas... part of the reason for that right now is I've been doing a detox for the last few months to really get rid of systemic Candida as well as to heal leaky gut... when I do it I usually do do it for about 20 to 30 minutes and I'm laying on my back usually to my right side to more stimulate the liver... but I also read okay so I read on my Kindle",
    "videoId": "Y4Z6wQVArPQ",
    "context": "- Coffee enemas (2019 phase, 5–6×/week, 20–30 min, reading on Kindle throughout): \"about five to six days a week right now in my morning I do coffee enemas... part of the reason for that right now is I've been doing a detox for the last few months to really get rid of systemic Candida as well as to ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-62",
    "text": "I created a vision board video and I watch it in the morning... it's a pretty short video five minutes long or so but it's also got some inspiring music and quotes",
    "videoId": "Y4Z6wQVArPQ",
    "context": "- Vision-board VIDEO (2019): \"I created a vision board video and I watch it in the morning... it's a pretty short video five minutes long or so but it's also got some inspiring music and quotes\" — Y4Z6wQVArPQ ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-63",
    "text": "every single morning before I start my work before I do anything else is I have to make a contribution to someone else's life... I would literally go down to the streets... and find a homeless person and give them a dollar... in other cases it'll be sending a note or a message or a text message of appreciation... it takes you about one minute to do",
    "videoId": "Y4Z6wQVArPQ",
    "context": "- Daily contribution (30-day challenge phase): \"every single morning before I start my work before I do anything else is I have to make a contribution to someone else's life... I would literally go down to the streets... and find a homeless person and give them a dollar... in other cases it'll be se",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-64",
    "text": "I actually have a 15 minute ritual I've got a 30 minute ritual and then I got an hour ritual and I've also got rituals they even last two hours or more depending on you know what I've got going on",
    "videoId": "DH-ljbSald8",
    "context": "- \"I actually have a 15 minute ritual I've got a 30 minute ritual and then I got an hour ritual and I've also got rituals they even last two hours or more depending on you know what I've got going on\" — DH-ljbSald8 ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-65",
    "text": "usually for me it depends because every day it's different... sometimes for me it's an hour and I'll just go a full hour... other times I might just do 15 minutes you know if I'm in a rush",
    "videoId": "OgRGJBpTOeU",
    "context": "- \"usually for me it depends because every day it's different... sometimes for me it's an hour and I'll just go a full hour... other times I might just do 15 minutes you know if I'm in a rush\" — OgRGJBpTOeU ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-66",
    "text": "at first I spent 15 minutes a day and then I increased it to an hour a day and I discovered so much incredible benefit that I've done rituals today that can last two to three hours I kid you not",
    "videoId": "Y4Z6wQVArPQ",
    "context": "- \"at first I spent 15 minutes a day and then I increased it to an hour a day and I discovered so much incredible benefit that I've done rituals today that can last two to three hours I kid you not\" — Y4Z6wQVArPQ ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-67",
    "text": "i will mention i don't do everything here um every single day... this is my ideal ritual but i wouldn't say i do this every single day some of these things are bonuses",
    "videoId": "PPlaK8y4PzA",
    "context": "- He does NOT claim to do everything daily: \"i will mention i don't do everything here um every single day... this is my ideal ritual but i wouldn't say i do this every single day some of these things are bonuses\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-68",
    "text": "I probably do every morning about five to ten of the rituals there in this book and then I cycle through them at different times",
    "videoId": "Y4Z6wQVArPQ",
    "context": "- From the book: \"I probably do every morning about five to ten of the rituals there in this book and then I cycle through them at different times\" — Y4Z6wQVArPQ ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-69",
    "text": "one thing I've learned as well is to always switch it up don't always do the same thing each day because we need variety you eventually get bored of it",
    "videoId": "OgRGJBpTOeU",
    "context": "- Variety is a design rule: \"one thing I've learned as well is to always switch it up don't always do the same thing each day because we need variety you eventually get bored of it\" — OgRGJBpTOeU ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-70",
    "text": "i've been doing these rituals since i was 17 years old",
    "videoId": "PPlaK8y4PzA",
    "context": "- Start date: \"i've been doing these rituals since i was 17 years old\" — PPlaK8y4PzA ; \"i've been doing this now for over 14 years different rituals\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-71",
    "text": "i've been doing this now for over 14 years different rituals",
    "videoId": "PPlaK8y4PzA",
    "context": "- Start date: \"i've been doing these rituals since i was 17 years old\" — PPlaK8y4PzA ; \"i've been doing this now for over 14 years different rituals\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-72",
    "text": "to be honest with you not really I mean I the way that I kind of view it now is I don't have a specific morning ritual evening ritual really I view every day is a ritual and every minute of the day is a ritual as well so I'm really doing my ritual all throughout the day you know all throughout the day every hour I'm thinking about what I'm grateful for what I'm happy about my life... there's times where I might be in the elevator I'm walking down the street I'll just remind myself to smile",
    "videoId": "OcYECokZIeM",
    "context": "\"to be honest with you not really I mean I the way that I kind of view it now is I don't have a specific morning ritual evening ritual really I view every day is a ritual and every minute of the day is a ritual as well so I'm really doing my ritual all throughout the day you know all throughout the ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-73",
    "text": "what I do now that's even more powerful I believe is I do my daily ritual meaning before certain moments that I have or throughout the day I perform a quick ritual which is parts of the morning ritual that basically are 5 to 10 minute rituals",
    "videoId": "JZO1--Awz7k",
    "context": "\"what I do now that's even more powerful I believe is I do my daily ritual meaning before certain moments that I have or throughout the day I perform a quick ritual which is parts of the morning ritual that basically are 5 to 10 minute rituals\" — JZO1--Awz7k ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-74",
    "text": "why is this important... why do I care about this person... how can I enjoy this how can I have fun while doing this process",
    "videoId": "JZO1--Awz7k",
    "context": "Three components: (1) physiology shake-up / rebounder / power move; (2) incantations; (3) three questions — \"why is this important... why do I care about this person... how can I enjoy this how can I have fun while doing this process\" — JZO1--Awz7k ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-75",
    "text": "why is this a must for me why do I care what difference is this going to make",
    "videoId": "JZO1--Awz7k",
    "context": "Recap list adds: \"why is this a must for me why do I care what difference is this going to make\" — JZO1--Awz7k ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-76",
    "text": "I have a YouTube video called my evening ritual uh definitely worth checking out um it's a few years old but a lot of the things that I do from that I still do to this day",
    "videoId": "jCemE9klMVM",
    "context": " There is no evening-ritual video in the corpus. He repeatedly references one that exists elsewhere: \"I have a YouTube video called my evening ritual uh definitely worth checking out um it's a few years old but a lot of the things that I do from that I still do to this day\" — jCemE9klMVM ; \"this is ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-78",
    "text": "in a lot of cases it's uh doing some meditation before I go to bed uh or laying on my pmf mat uh doing some reading before I go to bed uh in some cases it's maybe even taking a bath and relaxing and having some bath salts and then also reading while I'm doing that too... in some cases you it might not be reading but even just kind of listening to something or even watching something motivational inspirational",
    "videoId": "jCemE9klMVM",
    "context": "- Components he names: \"in a lot of cases it's uh doing some meditation before I go to bed uh or laying on my pmf mat uh doing some reading before I go to bed uh in some cases it's maybe even taking a bath and relaxing and having some bath salts and then also reading while I'm doing that too... in s",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-79",
    "text": "my rituals before I go to bed are different because they're more ways for me to relax calm my mind prepare for my sleep to you know reflect on the day",
    "videoId": "Y4Z6wQVArPQ",
    "context": "- Purpose: \"my rituals before I go to bed are different because they're more ways for me to relax calm my mind prepare for my sleep to you know reflect on the day\" — Y4Z6wQVArPQ ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-80",
    "text": "if I'm reading the evening time it's not a nonfiction book as maybe it's maybe more biography or something that I don't really need to memorize as much",
    "videoId": "Y4Z6wQVArPQ",
    "context": "- What he reads at night differs by design: \"if I'm reading the evening time it's not a nonfiction book as maybe it's maybe more biography or something that I don't really need to memorize as much\" — because \"I avoid learning when I'm tired\" — Y4Z6wQVArPQ ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-82",
    "text": "using things like blue-blocking glasses like these, these will essentially help um in the evening time. I wear this, and it helps block out the blue light from devices",
    "videoId": "cx0Qq1P5AHs",
    "context": "- Blue blockers + melatonin + bedtime alarm (advice he gives, and wears himself on camera): \"using things like blue-blocking glasses like these, these will essentially help um in the evening time. I wear this, and it helps block out the blue light from devices\" — cx0Qq1P5AHs ; \"set an alarm on your ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-86",
    "text": "if you still want to get seven to eight hours a day asleep every day which is what I recommend that means that you have to plan what time you're gonna go to bed at so if you're waking up at 5:00 a.m. let's say you're getting seven hours of sleep that means you have to go to bed by 10:00 p.m. okay or 9:00 p.m. if you want to get it eight hours",
    "videoId": "SIlf1a1TdnM",
    "context": "- Bedtime arithmetic: \"if you still want to get seven to eight hours a day asleep every day which is what I recommend that means that you have to plan what time you're gonna go to bed at so if you're waking up at 5:00 a.m. let's say you're getting seven hours of sleep that means you have to go to be",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-87",
    "text": "take your alarm clock let's say it's your phone but put it on the other side of the room or even outside of your room",
    "videoId": "SIlf1a1TdnM",
    "context": "- Alarm across the room: \"take your alarm clock let's say it's your phone but put it on the other side of the room or even outside of your room\" — SIlf1a1TdnM ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-88",
    "text": "it's in the evening time evening time is my time where I relax with Tatiana we you know we actually do meditations together sometimes we do something called the kiss meditation which is like a taunt[ra]... we do eye gazing in certain experiences like that which also relax us too you know watching some shows",
    "videoId": "PWCSSH_wYDg",
    "context": "- Evening = relationship/relaxation time, not work: \"it's in the evening time evening time is my time where I relax with Tatiana we you know we actually do meditations together sometimes we do something called the kiss meditation which is like a taunt[ra]... we do eye gazing in certain experiences l",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-89",
    "text": "before this stream early this morning after this in the evening time i always have it out",
    "videoId": "QZjdmXreWd0",
    "context": "- Evening rebound: \"before this stream early this morning after this in the evening time i always have it out\" — QZjdmXreWd0 ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-90",
    "text": "also has an evening portion as well where you ask yourself three amazing things that happen today you journal that and how could i made today better",
    "videoId": "PPlaK8y4PzA",
    "context": "- 5 Minute Journal has an evening half he uses: \"also has an evening portion as well where you ask yourself three amazing things that happen today you journal that and how could i made today better\" — PPlaK8y4PzA ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-91",
    "text": "another great benefit that I love of waking up at 5 a.m. is that it forces you to go to bed earlier and I've noticed that a lot of the times in the evening time people spend it at 9:00 p.m. 11 10 11 p.m. midnight... often times [they're] kind of edging out on the couch and watching Netflix... because your willpower is at the lowest point",
    "videoId": "SIlf1a1TdnM",
    "context": "- Why go to bed early: \"another great benefit that I love of waking up at 5 a.m. is that it forces you to go to bed earlier and I've noticed that a lot of the times in the evening time people spend it at 9:00 p.m. 11 10 11 p.m. midnight... often times [they're] kind of edging out on the couch and wa",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-92",
    "text": "i have morning rituals every single day sometimes i have rituals before i go to bed i have weekly rituals monthly rituals and quarterly rituals as well as yearly rituals",
    "videoId": "JZnLIuW7NQw",
    "context": "\"i have morning rituals every single day sometimes i have rituals before i go to bed i have weekly rituals monthly rituals and quarterly rituals as well as yearly rituals\" — JZnLIuW7NQw ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-93",
    "text": "At the start of every week, whether it's on Sunday or Monday, often what I'll do is I'll make a list of all the most important things I want to accomplish during that week. And I'll plan it and I'll schedule it. I'll put it in my calendar... I'm going to schedule in when I wake up and when I do my morning ritual. From this time to this time. I schedule in when I'm going to go to the gym each day. I schedule in my date night",
    "videoId": "0UTb0mnuJRE",
    "context": "- Weekly planning, Sunday or Monday: \"At the start of every week, whether it's on Sunday or Monday, often what I'll do is I'll make a list of all the most important things I want to accomplish during that week. And I'll plan it and I'll schedule it. I'll put it in my calendar... I'm going to schedul",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-94",
    "text": "at the end of the week on Sundays uh I've been incorporating a ritual where I just go for a walk I get outdoors in nature I take my journal and I just write down all the successes for that week all the magic moments for that week uh maybe some great lessons that I learned",
    "videoId": "DqLGgwdO2IM",
    "context": "- Sunday walk-and-journal celebration ritual: \"at the end of the week on Sundays uh I've been incorporating a ritual where I just go for a walk I get outdoors in nature I take my journal and I just write down all the successes for that week all the magic moments for that week uh maybe some great les",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-95",
    "text": "every week make sure I add that one day off I call it my self-love Sunday where I just take the day off and I just do whatever I want",
    "videoId": "2fDYApReHWc",
    "context": "- \"Self-love Sunday\" — one full day off/week: \"every week make sure I add that one day off I call it my self-love Sunday where I just take the day off and I just do whatever I want\" — 2fDYApReHWc ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-96",
    "text": "every week you step on the scale and you measure exactly where you're at in terms of your goal... this is one ritual that I had for years",
    "videoId": "NidJpDcCkQs",
    "context": "- Weekly weigh-in (past): \"every week you step on the scale and you measure exactly where you're at in terms of your goal... this is one ritual that I had for years\" — NidJpDcCkQs ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-97",
    "text": "I had a ritual for this where I once a week you go to a float tank, pitch dark, and you're in a tank that's a lot of salt water and you float on it and it's pure darkness and you meditate for an hour",
    "videoId": "NidJpDcCkQs",
    "context": "- Float tank, once a week (past): \"I had a ritual for this where I once a week you go to a float tank, pitch dark, and you're in a tank that's a lot of salt water and you float on it and it's pure darkness and you meditate for an hour\" — NidJpDcCkQs ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-98",
    "text": "having every three months one week off so every three months when we go on a trip relax and really trying to eliminate technology eliminate computers phones",
    "videoId": "2fDYApReHWc",
    "context": "- Quarterly: one week off + a trip, every 3 months. \"having every three months one week off so every three months when we go on a trip relax and really trying to eliminate technology eliminate computers phones\" — 2fDYApReHWc ; \"one of my goals has been every three months to go on a trip and take a v",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-100",
    "text": "I used to do them every month now I'm doing them every quarter",
    "videoId": "Y4Z6wQVArPQ",
    "context": "- Quarterly goals report (was monthly): \"I used to do them every month now I'm doing them every quarter\" — Y4Z6wQVArPQ ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-101",
    "text": "another great one that I do every single year is I go on a cleanse. Every year I do a cleanse... this year, one of my goals is to do a juice fast, 15 days. Same thing I did last year",
    "videoId": "NidJpDcCkQs",
    "context": "- Yearly: a cleanse. \"another great one that I do every single year is I go on a cleanse. Every year I do a cleanse... this year, one of my goals is to do a juice fast, 15 days. Same thing I did last year\" — NidJpDcCkQs ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-routines-102",
    "text": "How about once a year you go on a retreat? A meditation retreat. I'm going to vapa [Vipassana] 10day solid meditation retreat. Doing that in October. 10 days of silence me, you know, meditation for 18 hours a day",
    "videoId": "NidJpDcCkQs",
    "context": "- Yearly: 10-day Vipassana. \"How about once a year you go on a retreat? A meditation retreat. I'm going to vapa [Vipassana] 10day solid meditation retreat. Doing that in October. 10 days of silence me, you know, meditation for 18 hours a day\" — NidJpDcCkQs ",
    "artifact": "phase2-routines"
  },
  {
    "id": "phase2-single-0",
    "text": "the idea behind that was uh you are using what is called a softener by saying hey this might sound a little strange or hey I know this doesn't normally happen or hey I know this might seem totally random but I noticed you and I wanted to come up and say hi",
    "videoId": "5ITfL1jNAsM",
    "context": "single-person branch for the relationship area",
    "artifact": "phase2-single"
  },
  {
    "id": "phase2-single-1",
    "text": "for me, when I was single, I had a ritual of going out four days a week. Four days a week, I had to go out to social gatherings, social environments to meet people, to interact with people, to improve my social skills, to approach people",
    "videoId": "NidJpDcCkQs",
    "context": "single-person branch for the relationship area",
    "artifact": "phase2-single"
  },
  {
    "id": "phase2-single-2",
    "text": "By approaching people, I'm building my confidence. I'm becoming more attractive, and I'm preparing myself so that when the woman of my dreams comes, I'm in a position where I actually have the confidence.",
    "videoId": "NidJpDcCkQs",
    "context": "single-person branch for the relationship area",
    "artifact": "phase2-single"
  },
  {
    "id": "phase2-single-3",
    "text": "i consistently focused on a regular basis what i wanted i continued to focus on and read my journal and then focus on who do i need to become and then i created a plan for becoming that",
    "videoId": "xVfwDgP2EGM",
    "context": "single-person branch for the relationship area",
    "artifact": "phase2-single"
  },
  {
    "id": "phase2-single-4",
    "text": "i took out a journal ... and i got clarity and wrote out what do i want and i was so detailed so specific about everything physical appearance uh character traits uh you know certain personality traits and you know certain interests and hobbies all of that stuff",
    "videoId": "xVfwDgP2EGM",
    "context": "single-person branch for the relationship area",
    "artifact": "phase2-single"
  },
  {
    "id": "phase2-single-5",
    "text": "rejection does not exist",
    "videoId": "pgq5MbkmXuM",
    "context": "single-person branch for the relationship area",
    "artifact": "phase2-single"
  },
  {
    "id": "phase2-vision-0",
    "text": "How to manage your life",
    "videoId": "8kco2rjijjE",
    "context": " V1 (earliest) 8kco2rjijjE \"How to manage your life\" — reads Ultimate Vision, Purpose, Identity, Code of Conduct, then per-area visions 190 lbs @ 8% $2M/yr, net worth $10M \"thousands of people\" ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-1",
    "text": "that gives me goosebumps guys focusing on that reading it speaking out loud you can i just get energy from that every day",
    "videoId": "PPlaK8y4PzA",
    "context": "His reaction immediately after: \"that gives me goosebumps guys focusing on that reading it speaking out loud you can i just get energy from that every day\" ( PPlaK8y4PzA )",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-2",
    "text": "health is a very important component of that important component of my vision of my amazing life I want to make sure that I have the energy the Vitality I want to make sure that I can live for a long time I want to live to over a 100 years old you know that's my goal and make sure that I have tons of energy and I look young I look fit I look incredible at that age right that's my belief system that's my aim that's my target that's my vision",
    "videoId": "Kz83kMosOWU",
    "context": " \"health is a very important component of that important component of my vision of my amazing life I want to make sure that I have the energy the Vitality I want to make sure that I can live for a long time I want to live to over a 100 years old you know that's my goal and make sure that I have tons",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-3",
    "text": "health always has to be more important than Fitness always okay you have to prioritize that first because without your health you cease to exist",
    "videoId": "Kz83kMosOWU",
    "context": " \"health always has to be more important than Fitness always okay you have to prioritize that first because without your health you cease to exist\" — Kz83kMosOWU ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-4",
    "text": "to live to be 100 to stay young healthy and vibrant",
    "videoId": "8kco2rjijjE",
    "context": "Health purpose fragment: \"to live to be 100 to stay young healthy and vibrant\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-5",
    "text": "my physical body to be my ultimate vision is to be 190 lbs to 8% body fat to be vital healthy strong athletic taned ripped and energetic to look in the mirror and smile and feel proud feel outstanding sexy have high self-esteem feel confident um to be an inspiration to others",
    "videoId": "8kco2rjijjE",
    "context": " \"my physical body to be my ultimate vision is to be 190 lbs to 8% body fat to be vital healthy strong athletic taned ripped and energetic to look in the mirror and smile and feel proud feel outstanding sexy have high self-esteem feel confident um to be an inspiration to others\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-6",
    "text": "I'm 170 lbs 6% body fat muscular lean and ripped I'm athletic full of energy and radiate Vitality",
    "videoId": "OgRGJBpTOeU",
    "context": "Later version: \"I'm 170 lbs 6% body fat muscular lean and ripped I'm athletic full of energy and radiate Vitality\" — OgRGJBpTOeU / \"i'm physically active and fit weighing 170 pounds at six percent body fat with unstoppable energy\" — PPlaK8y4PzA ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-8",
    "text": "my health and fitness purpose is to be outstanding to be an inspiration to others to be sexy a total 10 um to be attracted more confident non-stop energy to live to be 100 to stay young healthy and vibrant to look in the mirror and feel proud to do Fitness modeling and show[s] ... to be able to um have physical presence when I walk in the room to be a walking anatomy chart",
    "videoId": "8kco2rjijjE",
    "context": " \"my health and fitness purpose is to be outstanding to be an inspiration to others to be sexy a total 10 um to be attracted more confident non-stop energy to live to be 100 to stay young healthy and vibrant to look in the mirror and feel proud to do Fitness modeling and show[s] ... to be able to um",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-9",
    "text": "for my fitness I have I'm an Adonis I'm a Greek god I'm Greek by the way uh world class athlete fitness model shredded Stefan lean mean F[at] burning machine a manifestation of vibrant health and energy I'm an energy Dynamo a peak performer an Exemplar of physical vitality and strength",
    "videoId": "8kco2rjijjE",
    "context": " \"for my fitness I have I'm an Adonis I'm a Greek god I'm Greek by the way uh world class athlete fitness model shredded Stefan lean mean F[at] burning machine a manifestation of vibrant health and energy I'm an energy Dynamo a peak performer an Exemplar of physical vitality and strength\" — 8kco2rji",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-10",
    "text": "next mindset and beliefs you know that was an area of my life that I thought as well you know before I used to think there was just emotions but I thought to myself but your mindset your mentality your thoughts your belief system that's important as well that's a separate area of life and this influen[ces] your your emotions ... I got to have goals to really improve my mindset my belief systems my mentality",
    "videoId": "Kz83kMosOWU",
    "context": " \"next mindset and beliefs you know that was an area of my life that I thought as well you know before I used to think there was just emotions but I thought to myself but your mindset your mentality your thoughts your belief system that's important as well that's a separate area of life and this inf",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-11",
    "text": "Mind and emotions ... for me, the 10 that I desire and I'm after is high levels of happiness, and joy, and freedom, and peace, and gratitude. If I were to be honest where I am right now, I'd say about an eight out of 10.",
    "videoId": "I-SoCQvNi9A",
    "context": "Current-state self-rating and target: \"Mind and emotions ... for me, the 10 that I desire and I'm after is high levels of happiness, and joy, and freedom, and peace, and gratitude. If I were to be honest where I am right now, I'd say about an eight out of 10.\" — I-SoCQvNi9A ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-12",
    "text": "I'll easily read at least 20 books and continue master every area in my life",
    "videoId": "vPEblSGsDhE",
    "context": "Operationalised as goals: \"I'll easily read at least 20 books and continue master every area in my life\" and \"listen to at least thirty blinks using the blink[ist] app\" — vPEblSGsDhE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-14",
    "text": "my ultimate Vision emotionally to every day feel happy grateful proud loving loved excited passionate present committed ecstasy uh confident outgoing social strong determined motivated inspired ade[quate] adequate attractive certain significant balance centered energized fulfilled silly playful outrageous fun worthy **at a level of 9 or 10** to wake up each day excited jumping out of bed and enjoying the process of the day",
    "videoId": "8kco2rjijjE",
    "context": " \"my ultimate Vision emotionally to every day feel happy grateful proud loving loved excited passionate present committed ecstasy uh confident outgoing social strong determined motivated inspired ade[quate] adequate attractive certain significant balance centered energized fulfilled silly playful ou",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-15",
    "text": "i'm a master of my emotions consistently experiencing peak levels of emotional juice and vitality happiness joy laughter fun passion gratitude peace certainty adventure aliveness and fulfillment",
    "videoId": "PPlaK8y4PzA",
    "context": "Later compressed form: \"i'm a master of my emotions consistently experiencing peak levels of emotional juice and vitality happiness joy laughter fun passion gratitude peace certainty adventure aliveness and fulfillment\" — PPlaK8y4PzA ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-16",
    "text": "my emotions to have a deeper sense of meaning in my life to experience life to the fullest I really enjoy the journey and process of life",
    "videoId": "8kco2rjijjE",
    "context": "Purpose for this area: \"my emotions to have a deeper sense of meaning in my life to experience life to the fullest I really enjoy the journey and process of life\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-17",
    "text": "I've got un[stoppable] emotions Unstoppable confidence a beacon of Joy full of fulfillment uh vibrant happiness and ecstasy",
    "videoId": "8kco2rjijjE",
    "context": "Identity labels: \"I've got un[stoppable] emotions Unstoppable confidence a beacon of Joy full of fulfillment uh vibrant happiness and ecstasy\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-18",
    "text": "emotional power unlimited juice and vitality",
    "videoId": "8kco2rjijjE",
    "context": "Area label: \"emotional power unlimited juice and vitality\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-19",
    "text": "[in]credible relationships to be an amazing passionate loving honest exciting fulfilling fun committed extraordinary relationship uh with the woman of my dreams my total 10 my soulmate a beautiful incredible woman to attract and be the woman that I'll spend my life with start a family with and stay committed to forever",
    "videoId": "8kco2rjijjE",
    "context": " \"[in]credible relationships to be an amazing passionate loving honest exciting fulfilling fun committed extraordinary relationship uh with the woman of my dreams my total 10 my soulmate a beautiful incredible woman to attract and be the woman that I'll spend my life with start a family with and sta",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-20",
    "text": "i have an incredibly loving beautiful wife that i have a passionate love affair with that is growing every day",
    "videoId": "PPlaK8y4PzA",
    "context": "Later, with the partner named: \"i have an incredibly loving beautiful wife that i have a passionate love affair with that is growing every day\" / \"created incredible magic moments for the woman i love my soul mate tatiana\" — PPlaK8y4PzA ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-21",
    "text": "created incredible magic moments for the woman i love my soul mate tatiana",
    "videoId": "PPlaK8y4PzA",
    "context": "Later, with the partner named: \"i have an incredibly loving beautiful wife that i have a passionate love affair with that is growing every day\" / \"created incredible magic moments for the woman i love my soul mate tatiana\" — PPlaK8y4PzA ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-22",
    "text": "I have a passionate love affair with a woman of my dreams that grows daily as I hold my relationship and partner number one in my life",
    "videoId": "OgRGJBpTOeU",
    "context": "Priority statement: \"I have a passionate love affair with a woman of my dreams that grows daily as I hold my relationship and partner number one in my life\" — OgRGJBpTOeU ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-23",
    "text": "my relationships what's the reason that I have for having an amazing relationship be able to share my life with someone to have more fun and excitement to be able be in love uh intimacy connection someone to travel with",
    "videoId": "8kco2rjijjE",
    "context": "Purpose: \"my relationships what's the reason that I have for having an amazing relationship be able to share my life with someone to have more fun and excitement to be able be in love uh intimacy connection someone to travel with\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-24",
    "text": "incredible relationships passion and love",
    "videoId": "8kco2rjijjE",
    "context": "Area label: \"incredible relationships passion and love\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-25",
    "text": "there's no amount of success or money or physical fitness ... that pales in comparison to the amount of joy happiness fulfillment love passion intimacy that you get to experience when you find someone who's your soulmate and someone who supports your mission your purpose in life",
    "videoId": "Kz83kMosOWU",
    "context": "Why he ranks it so high: \"there's no amount of success or money or physical fitness ... that pales in comparison to the amount of joy happiness fulfillment love passion intimacy that you get to experience when you find someone who's your soulmate and someone who supports your mission your purpose in",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-26",
    "text": "just magic moments fulfillment to live life on my terms and to never settle for less than I can be do uh create or give to be happy for fun for growth progress connection love significance uh because as the secret to living is giving to fulfill my potential as a human being to live to be a living example of the endless possibilities of the human Spirit to be an inspiration to others a role model to be remembered Legacy to be a ten and attract my perfect 10 to be a mentor leadership to grow and to give to live life of peak experiences Financial freedom freedom to do what I want when I want so I can travel the world so I can live my perfect day confident sexy fun laughter Beauty desire respect contribution to have an impact to add value because it's what God put me here for",
    "videoId": "8kco2rjijjE",
    "context": " \"just magic moments fulfillment to live life on my terms and to never settle for less than I can be do uh create or give to be happy for fun for growth progress connection love significance uh because as the secret to living is giving to fulfill my potential as a human being to live to be a living ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-27",
    "text": "I want my ultimate vision is I want to have products and services in every area of life I want to have more products and services on how to become more free in your life how to build online businesses and make passive income on how to be healthier ... how to improve your body your fitness on how to improve your relationship you know all different areas of life I want to basically share create and share things that are benefiting me with you guys and so that's my ultimate vision",
    "videoId": "jTVs9IbF8L0",
    "context": " \"I want my ultimate vision is I want to have products and services in every area of life I want to have more products and services on how to become more free in your life how to build online businesses and make passive income on how to be healthier ... how to improve your body your fitness on how t",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-28",
    "text": "for my coaching business ... I'm world class coach I'm a facilitator of change I'm a Force for good a force for God I'm an agent of transformation I'm a leader called upon by leaders a Mr solution instant uh change artist a developer of the human Spirit I'm an architect of change",
    "videoId": "8kco2rjijjE",
    "context": "Business identity labels: \"for my coaching business ... I'm world class coach I'm a facilitator of change I'm a Force for good a force for God I'm an agent of transformation I'm a leader called upon by leaders a Mr solution instant uh change artist a developer of the human Spirit I'm an architect of",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-29",
    "text": "a leader and contributor of Lifestyle Transformations",
    "videoId": "8kco2rjijjE",
    "context": "Area labels: \"a leader and contributor of Lifestyle Transformations\" , \"internet marketing Freedom facilitator\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-30",
    "text": "internet marketing Freedom facilitator",
    "videoId": "8kco2rjijjE",
    "context": "Area labels: \"a leader and contributor of Lifestyle Transformations\" , \"internet marketing Freedom facilitator\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-31",
    "text": "even long-term with my business with project life mastery i I want to actually bring in someone that can run my business because even though I've taken my business to this point which has been a very successful business I want to remo[ve myself]",
    "videoId": "oLQiUIJ7PsQ",
    "context": "Longer-term business intent: \"even long-term with my business with project life mastery i I want to actually bring in someone that can run my business because even though I've taken my business to this point which has been a very successful business I want to remo[ve myself]\" — oLQiUIJ7PsQ ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-32",
    "text": "to have live in total abundance Financial Freedom I have this is my vision again uh to be making **$2 million a year** and I'm very specific about this as well which is really key but $2 million a year **$163,000 a month $5,400 a day** uh income with **90% of it being earned through passive income** which is internet marketing businesses real estate and Investments to have a **net worth of $10 million** to own a **$1.7 million penthouse in Yaletown Vancouver** ... a **$6[0] million mansion in Laguna Beach California** a **Lamborghini personal chef personal trainer housekeeper coach** Etc",
    "videoId": "8kco2rjijjE",
    "context": " \"to have live in total abundance Financial Freedom I have this is my vision again uh to be making $2 million a year and I'm very specific about this as well which is really key but $2 million a year $163,000 a month $5,400 a day uh income with 90% of it being earned through passive income which is ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-33",
    "text": "when I shared my vision for my uh business and finances I have exact numbers I have exactly how much I want to make a year how much I want to make a month how much I want to make a day my exact net worth I even have the exact amount of money how much it costs to live in the penth[ouse]",
    "videoId": "8kco2rjijjE",
    "context": " \"when I shared my vision for my uh business and finances I have exact numbers I have exactly how much I want to make a year how much I want to make a month how much I want to make a day my exact net worth I even have the exact amount of money how much it costs to live in the penth[ouse]\" — 8kco2rji",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-34",
    "text": "financially live the life of my dreams be fun never settle live life fully do what I want when I want",
    "videoId": "8kco2rjijjE",
    "context": "Purpose: \"financially live the life of my dreams be fun never settle live life fully do what I want when I want\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-35",
    "text": "extraordinary investor financial genius smart saver wealth Creator strategist uh marketer a creator of the good life creator of Fortune a millionaire",
    "videoId": "8kco2rjijjE",
    "context": "Identity labels: \"extraordinary investor financial genius smart saver wealth Creator strategist uh marketer a creator of the good life creator of Fortune a millionaire\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-36",
    "text": "I want to build a business and be earning $10 million",
    "videoId": "I-SoCQvNi9A",
    "context": "Later escalation of the number: \"I want to build a business and be earning $10 million\" — I-SoCQvNi9A ; and \"making $10 million a year. It's a lot of the yearly stuff or the the five 10 20 year stuff\" — tYCT57Onfas ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-38",
    "text": "my financial goal for 2018 is to make 3.5 million dollars in revenue ... Canadian",
    "videoId": "vPEblSGsDhE",
    "context": "Actual goal-year numbers (2018 review, vPEblSGsDhE ): \"my financial goal for 2018 is to make 3.5 million dollars in revenue ... Canadian\" and \"I'll easily have a six million dollar Canadian dollar investment assets ... the total amount that I have calculated ... is five point two million dollars\".",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-39",
    "text": "I'll easily have a six million dollar Canadian dollar investment assets ... the total amount that I have calculated ... is five point two million dollars",
    "videoId": "vPEblSGsDhE",
    "context": "Actual goal-year numbers (2018 review, vPEblSGsDhE ): \"my financial goal for 2018 is to make 3.5 million dollars in revenue ... Canadian\" and \"I'll easily have a six million dollar Canadian dollar investment assets ... the total amount that I have calculated ... is five point two million dollars\".",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-40",
    "text": "my family struggled financially growing up we never had much money ... my parents actually went through a bankruptcy ... we actually built this beautiful house my dad was in construction built our dream house and had to sell it ... and seeing my parents fight and argue and yell that affected me as a kid and I made a decision that i'm never going to go through that again and my kids will never go through that",
    "videoId": "2V06cH1z3Qo",
    "context": "Why (the pain-why): \"my family struggled financially growing up we never had much money ... my parents actually went through a bankruptcy ... we actually built this beautiful house my dad was in construction built our dream house and had to sell it ... and seeing my parents fight and argue and yell ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-41",
    "text": "my family life you know to be totally connected with and in regular communication [with] each member of my family several times a week having fun supporting each other sharing magic moments in our lives to go on a family vacation every year",
    "videoId": "8kco2rjijjE",
    "context": " \"my family life you know to be totally connected with and in regular communication [with] each member of my family several times a week having fun supporting each other sharing magic moments in our lives to go on a family vacation every year\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-42",
    "text": "i have an extraordinary family life with two children that i have give unconditional love to and help shape them to incredible human beings i have a close relationship with my family that consists of incredible communication and support which includes my mom my dad my brother or sister nieces and nephews",
    "videoId": "PPlaK8y4PzA",
    "context": " \"i have an extraordinary family life with two children that i have give unconditional love to and help shape them to incredible human beings i have a close relationship with my family that consists of incredible communication and support which includes my mom my dad my brother or sister nieces and ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-43",
    "text": "My family, I put at a six out of 10 ... I travel a lot and sometimes I miss some family holidays ... I don't always make it to my nieces' and my nephews' birthday ... one of my goals is do a family trip, a cruise ... to really bond with family",
    "videoId": "I-SoCQvNi9A",
    "context": "Honest current state + the gap he's closing: \"My family, I put at a six out of 10 ... I travel a lot and sometimes I miss some family holidays ... I don't always make it to my nieces' and my nephews' birthday ... one of my goals is do a family trip, a cruise ... to really bond with family\" — I-SoCQv",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-44",
    "text": "for myself it's it's going on family trips and giving to them at a much higher level than before connecting with them at a much deeper level and creating more magic moments",
    "videoId": "Kz83kMosOWU",
    "context": "And: \"for myself it's it's going on family trips and giving to them at a much higher level than before connecting with them at a much deeper level and creating more magic moments\" — Kz83kMosOWU ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-45",
    "text": "extraordinary friendships you know the people that I want to surround myself people that support me inspire me that make me feel good you know we challenge each other people that I travel with have fun with",
    "videoId": "8kco2rjijjE",
    "context": " \"extraordinary friendships you know the people that I want to surround myself people that support me inspire me that make me feel good you know we challenge each other people that I travel with have fun with\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-46",
    "text": "i have extraordinary friendships with friends that i'm constantly growing with that are supportive fun successful leaders and givers that i'm sharing my experience of life with",
    "videoId": "PPlaK8y4PzA",
    "context": " \"i have extraordinary friendships with friends that i'm constantly growing with that are supportive fun successful leaders and givers that i'm sharing my experience of life with\" — PPlaK8y4PzA ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-47",
    "text": "for me [it'd] be like certain celebrities you know people that I love and respect like Dwayne the rock Johnson would come and Kevin Hart would come and Arnold Schwarzenegger would come and stop by ... that's the kind of people that I'd be spending my life with",
    "videoId": "9RxHchflvVs",
    "context": "Named-people version (from the Perfect Day): \"for me [it'd] be like certain celebrities you know people that I love and respect like Dwayne the rock Johnson would come and Kevin Hart would come and Arnold Schwarzenegger would come and stop by ... that's the kind of people that I'd be spending my lif",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-48",
    "text": "having fun in your life now this was an important one for me I realized man I'm crushing it in all different areas of my life my business my health my relationship my friends and family is great but that doesn't guarantee that you're having fun now for me fun I break down as your hobbies right your hobbies remember those having hobbies in your life I break that down as adventure maybe travel got to have that",
    "videoId": "Kz83kMosOWU",
    "context": " \"having fun in your life now this was an important one for me I realized man I'm crushing it in all different areas of my life my business my health my relationship my friends and family is great but that doesn't guarantee that you're having fun now for me fun I break down as your hobbies right you",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-49",
    "text": "I thought to myself yeah you know what I'm not having as much fun as I'd like to have in my life life has become a lot more serious ... maybe that's because I don't have that [as] a freaking area of my life on my pyramid that I'm consistently focusing on and setting goals for ... I decided you know what I'm going to set goals for fun I'm going to make that a priority",
    "videoId": "Kz83kMosOWU",
    "context": " \"I thought to myself yeah you know what I'm not having as much fun as I'd like to have in my life life has become a lot more serious ... maybe that's because I don't have that [as] a freaking area of my life on my pyramid that I'm consistently focusing on and setting goals for ... I decided you kno",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-50",
    "text": "I was the biggest WWE Fan The Rock and Stone Cold Steve Austin and WCW and NWO ... I thought to myself man I got to revisit some of that stuff because I got so much joy out of that so much fun",
    "videoId": "Kz83kMosOWU",
    "context": "Content of his fun vision (his childhood-joy audit): video games (PlayStation 4, UFC 2, NBA with friends over; Diablo, Warcraft as a kid), and pro wrestling fandom — \"I was the biggest WWE Fan The Rock and Stone Cold Steve Austin and WCW and NWO ... I thought to myself man I got to revisit some of t",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-51",
    "text": "my lifestyle consists of total freedom to travel which includes a fun adventurous vacation every three months while enjoying a full three months immersed in a new part of the world every year",
    "videoId": "PPlaK8y4PzA",
    "context": "Travel/lifestyle vision: \"my lifestyle consists of total freedom to travel which includes a fun adventurous vacation every three months while enjoying a full three months immersed in a new part of the world every year\" — PPlaK8y4PzA ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-52",
    "text": "I'll easily do a new fun activity every month",
    "videoId": "vPEblSGsDhE",
    "context": "Operationalised: \"I'll easily do a new fun activity every month\", \"I'll easily live in Los Angeles for at least three months\", \"I'll easily travel through Europe\" — vPEblSGsDhE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-53",
    "text": "I'll easily live in Los Angeles for at least three months",
    "videoId": "vPEblSGsDhE",
    "context": "Operationalised: \"I'll easily do a new fun activity every month\", \"I'll easily live in Los Angeles for at least three months\", \"I'll easily travel through Europe\" — vPEblSGsDhE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-54",
    "text": "I'll easily travel through Europe",
    "videoId": "vPEblSGsDhE",
    "context": "Operationalised: \"I'll easily do a new fun activity every month\", \"I'll easily live in Los Angeles for at least three months\", \"I'll easily travel through Europe\" — vPEblSGsDhE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-55",
    "text": "i'm a philanthropist and a force for good that's dedicated to helping those in need with areas that i'm committed to serving in especially having funded and built over a hundred houses for those that are suffering from poverty and 30 schools for children in need of proper education",
    "videoId": "PPlaK8y4PzA",
    "context": " \"i'm a philanthropist and a force for good that's dedicated to helping those in need with areas that i'm committed to serving in especially having funded and built over a hundred houses for those that are suffering from poverty and 30 schools for children in need of proper education\" — PPlaK8y4PzA ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-56",
    "text": "what would happen if I added contribution to an area of my life where I'm giving not to get I'm giving out of just pure being selfless making an impact making a difference empowering people in the world that I they don't even know who I am they can't give me anything back but it's just pure service to others",
    "videoId": "Kz83kMosOWU",
    "context": "Definition of the area (giving-not-to-get): \"what would happen if I added contribution to an area of my life where I'm giving not to get I'm giving out of just pure being selfless making an impact making a difference empowering people in the world that I they don't even know who I am they can't give",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-57",
    "text": "I've been involved in building houses and schools I've built some houses in Nicaragua last year and El Salvador and built the schools in Ethiopia and Kenya and Ecuador going to Ethiopia later this year to volunteer and build uh one of the schools that I funded",
    "videoId": "Kz83kMosOWU",
    "context": "Track record referenced as vision-in-progress: \"I've been involved in building houses and schools I've built some houses in Nicaragua last year and El Salvador and built the schools in Ethiopia and Kenya and Ecuador going to Ethiopia later this year to volunteer and build uh one of the schools that ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-58",
    "text": "I'll raise and fund at least ten thousand dollars to build three plus houses with world housing",
    "videoId": "vPEblSGsDhE",
    "context": "Yearly-goal form: \"I'll raise and fund at least ten thousand dollars to build three plus houses with world housing\" / \"donate twenty thousand dollars [to] we[building] don't work to build [two] schools [in] Ethiopia\" / \"loaning five thousand dollars through Kiva\" — vPEblSGsDhE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-60",
    "text": "loaning five thousand dollars through Kiva",
    "videoId": "vPEblSGsDhE",
    "context": "Yearly-goal form: \"I'll raise and fund at least ten thousand dollars to build three plus houses with world housing\" / \"donate twenty thousand dollars [to] we[building] don't work to build [two] schools [in] Ethiopia\" / \"loaning five thousand dollars through Kiva\" — vPEblSGsDhE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-61",
    "text": "I built a successful Foundation that serves those [in] need around the world and focuses on solving problems [in] Humanity that I'm passionate about",
    "videoId": "OgRGJBpTOeU",
    "context": "Also: \"I built a successful Foundation that serves those [in] need around the world and focuses on solving problems [in] Humanity that I'm passionate about\" — OgRGJBpTOeU ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-62",
    "text": "my spiritual you know vision is uh be spiritually connected to God the universe nature myself and all beings around me while feeling centered and at peace growing and evolving my spirit and humbly serving my Creator by living my purpose each and every day by making a contribution in the a[dv]ance of others to celebrate fully each and every moment of the day to live in the present to live with an open heart",
    "videoId": "8kco2rjijjE",
    "context": " \"my spiritual you know vision is uh be spiritually connected to God the universe nature myself and all beings around me while feeling centered and at peace growing and evolving my spirit and humbly serving my Creator by living my purpose each and every day by making a contribution in the a[dv]ance ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-63",
    "text": "i am a force for god i have a deep everlasting spiritual connection with god and my creator i am living my destiny",
    "videoId": "PPlaK8y4PzA",
    "context": " \"i am a force for god i have a deep everlasting spiritual connection with god and my creator i am living my destiny\" — PPlaK8y4PzA ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-64",
    "text": "Spirituality, I've got as a seven. For me, my spirituality is my connection with God. It's my relationship with myself. It's my growth, the giving, the contribution in my life, the level of gratitude, the presence, the level of consciousness that I'm operating at ... I've got an amazing relationship with God. I communicate everyday but I want to go deeper.",
    "videoId": "I-SoCQvNi9A",
    "context": "His definition + honest score: \"Spirituality, I've got as a seven. For me, my spirituality is my connection with God. It's my relationship with myself. It's my growth, the giving, the contribution in my life, the level of gratitude, the presence, the level of consciousness that I'm operating at ... ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-65",
    "text": "spirit and soul Force for God",
    "videoId": "8kco2rjijjE",
    "context": "Area label: \"spirit and soul Force for God\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-66",
    "text": "we are not human beings having a spiritual experience we're Spiritual Beings having a human experience ... spirituality doesn't really fit within this because our spirit embodies all of this",
    "videoId": "Kz83kMosOWU",
    "context": "Why spirituality sits outside the pyramid: \"we are not human beings having a spiritual experience we're Spiritual Beings having a human experience ... spirituality doesn't really fit within this because our spirit embodies all of this\" — Kz83kMosOWU ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-67",
    "text": "to be a person who...",
    "videoId": "8kco2rjijjE",
    "context": " Tense and grammar. Two distinct registers exist across versions: V1 ( 8kco2rjijjE ) is written as infinitives — \"to be a person who...\", \"to be 190 lbs\". V2/V3 ( OgRGJBpTOeU , PPlaK8y4PzA ) are present-tense declaratives — \"I am a multi-millionaire\", \"I live in two multi-million dollar homes\", \"I h",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-68",
    "text": "to be 190 lbs",
    "videoId": "8kco2rjijjE",
    "context": " Tense and grammar. Two distinct registers exist across versions: V1 ( 8kco2rjijjE ) is written as infinitives — \"to be a person who...\", \"to be 190 lbs\". V2/V3 ( OgRGJBpTOeU , PPlaK8y4PzA ) are present-tense declaratives — \"I am a multi-millionaire\", \"I live in two multi-million dollar homes\", \"I h",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-73",
    "text": "when you create your vision make sure that it's something that there's no limits by ... imagine as if there's no limits if a magician were able to come along and create the perfect life for you what would that be",
    "videoId": "8kco2rjijjE",
    "context": " No limits. \"when you create your vision make sure that it's something that there's no limits by ... imagine as if there's no limits if a magician were able to come along and create the perfect life for you what would that be\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-74",
    "text": "your vision you want to be unrealistic to be crazy because when you look at things on a scale of 10 years 20 years 30 years anything is possible",
    "videoId": "JZnLIuW7NQw",
    "context": " \"your vision you want to be unrealistic to be crazy because when you look at things on a scale of 10 years 20 years 30 years anything is possible\" — JZnLIuW7NQw ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-75",
    "text": "my vision is something that is just totally crazy and I put out there and I have belief that it's going to happen cuz I focus on it all the time",
    "videoId": "OgRGJBpTOeU",
    "context": " \"my vision is something that is just totally crazy and I put out there and I have belief that it's going to happen cuz I focus on it all the time\" — OgRGJBpTOeU ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-76",
    "text": "your goals are different than a vision your vision is 10 years 20 years from now it's the big picture it might even seem crazy and even unrealistic your goals you want to make sure they're attainable and realistic",
    "videoId": "2V06cH1z3Qo",
    "context": " Vision vs goals — the explicit split. \"your goals are different than a vision your vision is 10 years 20 years from now it's the big picture it might even seem crazy and even unrealistic your goals you want to make sure they're attainable and realistic\" — 2V06cH1z3Qo ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-77",
    "text": "the goals that we set every year those are just the milestones the stepping stones that lead us to the ultimate vision",
    "videoId": "JZnLIuW7NQw",
    "context": " \"the goals that we set every year those are just the milestones the stepping stones that lead us to the ultimate vision\" — JZnLIuW7NQw ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-78",
    "text": "my long-term goals are more the unrealistic ones ... but my yearly goals and my short-term goals I always want to make sure that they're realistic and attainable ... I have a belief level on a scale from 0 to 10, at least a seven",
    "videoId": "tYCT57Onfas",
    "context": " \"my long-term goals are more the unrealistic ones ... but my yearly goals and my short-term goals I always want to make sure that they're realistic and attainable ... I have a belief level on a scale from 0 to 10, at least a seven\" — tYCT57Onfas ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-79",
    "text": "Create the ultimate vision for your life of what you want 10 years, 20 years, 50 years from now",
    "videoId": "NidJpDcCkQs",
    "context": " Horizon. 10 / 20 / 30 / 50 years, stated variously: \"Create the ultimate vision for your life of what you want 10 years, 20 years, 50 years from now\" ( NidJpDcCkQs ); \"5 10 20 years from now\" ( 9RxHchflvVs ); \"10 20 30 40 years\" ( JZnLIuW7NQw ); vision board = \"my yearly, 5 year, 10 year, 20 year g",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-83",
    "text": "if you can write out the vision and get clear and specific about how you want your life to be",
    "videoId": "8kco2rjijjE",
    "context": " Specificity / numbers. \"if you can write out the vision and get clear and specific about how you want your life to be\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-84",
    "text": "I have exact numbers I have exactly how much I want to make a year how much I want to make a month how much I want to make a day my exact net worth",
    "videoId": "8kco2rjijjE",
    "context": " \"I have exact numbers I have exactly how much I want to make a year how much I want to make a month how much I want to make a day my exact net worth\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-85",
    "text": "clarity has so much power you want to be specific we don't want to be vague or general in this process",
    "videoId": "9RxHchflvVs",
    "context": " \"clarity has so much power you want to be specific we don't want to be vague or general in this process\" — 9RxHchflvVs ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-86",
    "text": "the more clear you are about what you want why you want it the more likely you are to actually make it happen",
    "videoId": "8kco2rjijjE",
    "context": " \"the more clear you are about what you want why you want it the more likely you are to actually make it happen\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-87",
    "text": "the key with this as well is really languaging it in a way that inspires you um so I have certain language here that inspires me and juices me and sometimes when I hear certain things from other people or they have a certain Vision I can maybe add that to my vision as well",
    "videoId": "8kco2rjijjE",
    "context": " \"the key with this as well is really languaging it in a way that inspires you um so I have certain language here that inspires me and juices me and sometimes when I hear certain things from other people or they have a certain Vision I can maybe add that to my vision as well\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-88",
    "text": "each area of my life I generally give it a cool name um I put a certain label or I use language to make each area sound more compelling because sometimes this health and fitness or relationships or finances doesn't really drive you ... so I make it sound a little bit more juicy",
    "videoId": "8kco2rjijjE",
    "context": " \"each area of my life I generally give it a cool name um I put a certain label or I use language to make each area sound more compelling because sometimes this health and fitness or relationships or finances doesn't really drive you ... so I make it sound a little bit more juicy\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-89",
    "text": "that inspires me so much more than saying oh you know I'm a coach or I'm a teacher",
    "videoId": "8kco2rjijjE",
    "context": " \"that inspires me so much more than saying oh you know I'm a coach or I'm a teacher\" — 8kco2rjijjE (on identity labels)",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-90",
    "text": "I read this out loud there's a lot of benefit when you read out loud and you speak it with emotion with enthusiasm in your life it just makes you like for me I get goosebumps every time I do this and I focus on it",
    "videoId": "PPlaK8y4PzA",
    "context": " \"I read this out loud there's a lot of benefit when you read out loud and you speak it with emotion with enthusiasm in your life it just makes you like for me I get goosebumps every time I do this and I focus on it\" — PPlaK8y4PzA ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-92",
    "text": "something that excites you something that wakes you up early and keeps you up late",
    "videoId": "PPlaK8y4PzA",
    "context": " \"something that excites you something that wakes you up early and keeps you up late\" — PPlaK8y4PzA ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-93",
    "text": "something that if you were to focus on it would just put a big smile on your face",
    "videoId": "8kco2rjijjE",
    "context": " \"something that if you were to focus on it would just put a big smile on your face\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-94",
    "text": "if someone were to wake you up in the middle of the night 3 o'clock in the morning start shaking you [and] say tell me what your vision is tell me what your purpose or why is ... you got to be able to say it just right then and there without thinking about it",
    "videoId": "2V06cH1z3Qo",
    "context": "Recall test: \"if someone were to wake you up in the middle of the night 3 o'clock in the morning start shaking you [and] say tell me what your vision is tell me what your purpose or why is ... you got to be able to say it just right then and there without thinking about it\" — 2V06cH1z3Qo ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-95",
    "text": "put yourself in a great state. Make sure that you're happy. Make sure you schedule off maybe 30 minutes or an hour of your time ... because if you're in a negative state and you try to do this, if you're frustrated, if you're angry, if you're depressed, then obviously the answers aren't going to come to you",
    "videoId": "tYCT57Onfas",
    "context": " State before writing. \"put yourself in a great state. Make sure that you're happy. Make sure you schedule off maybe 30 minutes or an hour of your time ... because if you're in a negative state and you try to do this, if you're frustrated, if you're angry, if you're depressed, then obviously the ans",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-96",
    "text": "the state that you're in during this time is also very important ... sometimes i put on music and i smile and i celebrate it and i really see it",
    "videoId": "JZnLIuW7NQw",
    "context": " \"the state that you're in during this time is also very important ... sometimes i put on music and i smile and i celebrate it and i really see it\" — JZnLIuW7NQw ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-97",
    "text": "sit down put on some music eliminate distractions put yourself in a great state and really get clear on the life that you want to create no one else can do that for you",
    "videoId": "Kz83kMosOWU",
    "context": " \"sit down put on some music eliminate distractions put yourself in a great state and really get clear on the life that you want to create no one else can do that for you\" — Kz83kMosOWU ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-98",
    "text": "I recommend to actually sit down and write out a paragraph or two of what you want, the vision that you have describing in detail for each area of your life",
    "videoId": "NidJpDcCkQs",
    "context": " Length / format. \"I recommend to actually sit down and write out a paragraph or two of what you want, the vision that you have describing in detail for each area of your life\" — NidJpDcCkQs ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-100",
    "text": "journal ... hour by hour [from] that time you'd wake up to the time you go to bed",
    "videoId": "9RxHchflvVs",
    "context": "Perfect Day format: \"journal ... hour by hour [from] that time you'd wake up to the time you go to bed\" — 9RxHchflvVs ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-101",
    "text": "you want to think about multiple areas of your life. You don't want to just think about one area because you want to make sure that you're living a life of balance",
    "videoId": "tYCT57Onfas",
    "context": " Coverage / balance rule. \"you want to think about multiple areas of your life. You don't want to just think about one area because you want to make sure that you're living a life of balance\" — tYCT57Onfas ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-102",
    "text": "so many people they have a vision maybe for their business but they neglect the other areas and other areas of their life are equally important",
    "videoId": "8kco2rjijjE",
    "context": " \"so many people they have a vision maybe for their business but they neglect the other areas and other areas of their life are equally important\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-103",
    "text": "my day of course I always wanted to consist of family and friends and health and my mission and contribution and just make sure that it checked the box [in] all the different areas of my life mastery blueprint",
    "videoId": "9RxHchflvVs",
    "context": " \"my day of course I always wanted to consist of family and friends and health and my mission and contribution and just make sure that it checked the box [in] all the different areas of my life mastery blueprint\" — 9RxHchflvVs ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-104",
    "text": "this is a process by the way that I go through every week",
    "videoId": "8kco2rjijjE",
    "context": " \"this is a process by the way that I go through every week\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-105",
    "text": "this has to be a ritual that you do every week sometimes I'll do it twice a week if I'm down or kind of unmotivated",
    "videoId": "8kco2rjijjE",
    "context": " \"this has to be a ritual that you do every week sometimes I'll do it twice a week if I'm down or kind of unmotivated\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-106",
    "text": "I don't always read everything every day sometimes it's just every week I'll go over my Visions my purpose and everything but I always make sure I have it there cuz whenever I need that motivation I can tap into that",
    "videoId": "OgRGJBpTOeU",
    "context": " \"I don't always read everything every day sometimes it's just every week I'll go over my Visions my purpose and everything but I always make sure I have it there cuz whenever I need that motivation I can tap into that\" — OgRGJBpTOeU ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-107",
    "text": "i spend maybe five or ten minutes a day going through that so check the box on it",
    "videoId": "PPlaK8y4PzA",
    "context": " \"i spend maybe five or ten minutes a day going through that so check the box on it\" — PPlaK8y4PzA (of the vision/purpose review block)",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-108",
    "text": "I like to write it out and focus on these visions on a weekly basis",
    "videoId": "tYCT57Onfas",
    "context": " \"I like to write it out and focus on these visions on a weekly basis\" — tYCT57Onfas ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-109",
    "text": "i like to frame these things and have it somewhere i can see it every day i found if i have it in a book if i've got it in a file on my computer it's very easy to forget about it but if you got it framed on your wall every time you walk by it every time you go to the bathroom you see it you remind yourself of it",
    "videoId": "PPlaK8y4PzA",
    "context": " \"i like to frame these things and have it somewhere i can see it every day i found if i have it in a book if i've got it in a file on my computer it's very easy to forget about it but if you got it framed on your wall every time you walk by it every time you go to the bathroom you see it you remind",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-110",
    "text": "in my office I've got framed I've got my ultimate vision for my life my ultimate purpose I have those things framed I have my vision board",
    "videoId": "6i2VJCLPdls",
    "context": " \"in my office I've got framed I've got my ultimate vision for my life my ultimate purpose I have those things framed I have my vision board\" — 6i2VJCLPdls ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-111",
    "text": "I've got a closet that on the inside of the closet I put down my incantations my values my vision ... I open the inside and that way I can see everything laid out for my entire life",
    "videoId": "OgRGJBpTOeU",
    "context": " \"I've got a closet that on the inside of the closet I put down my incantations my values my vision ... I open the inside and that way I can see everything laid out for my entire life\" — OgRGJBpTOeU ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-112",
    "text": "I have it written out in my apartment I have it on my desk I have a vision board I have images of that",
    "videoId": "8kco2rjijjE",
    "context": " \"I have it written out in my apartment I have it on my desk I have a vision board I have images of that\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-113",
    "text": "I have it in my phone I've got it written down in notebooks",
    "videoId": "PliFBr__T7Y",
    "context": "Also: phone ( \"I have it in my phone I've got it written down in notebooks\" — PliFBr__T7Y ), screensaver and desktop wallpaper ( An46AnjEPCs , OgRGJBpTOeU ).",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-114",
    "text": "it's something that I've modified and changed around ... it's not set in stone but I'm always creating a higher vision",
    "videoId": "8kco2rjijjE",
    "context": " Update cadence / never finished. \"it's something that I've modified and changed around ... it's not set in stone but I'm always creating a higher vision\" — 8kco2rjijjE ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-115",
    "text": "the vision that we have for our lives is a moving target ... once you get there you're setting a new vision your vision is always expanding",
    "videoId": "JZnLIuW7NQw",
    "context": " \"the vision that we have for our lives is a moving target ... once you get there you're setting a new vision your vision is always expanding\" — JZnLIuW7NQw ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-116",
    "text": "you have to update it every once in a while cuz you actually start achieving the things that are on your vision board",
    "videoId": "An46AnjEPCs",
    "context": " \"you have to update it every once in a while cuz you actually start achieving the things that are on your vision board\" — An46AnjEPCs ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-117",
    "text": "my vision for my life is always changing as well",
    "videoId": "Lp_GOrM16Xc",
    "context": " \"my vision for my life is always changing as well\" — Lp_GOrM16Xc ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-118",
    "text": "You got to constantly update your vision as time goes on. You can't be stagnant with that ... No matter if you've been married to someone for 30 years. I don't care if you're 70 years old. You got to have a vision for more.",
    "videoId": "NidJpDcCkQs",
    "context": " \"You got to constantly update your vision as time goes on. You can't be stagnant with that ... No matter if you've been married to someone for 30 years. I don't care if you're 70 years old. You got to have a vision for more.\" — NidJpDcCkQs ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-120",
    "text": "my vision board is more of my my long-term goals five ten years from now but I have my yearly goals as well as monthly goals",
    "videoId": "OcYECokZIeM",
    "context": "Board = long-term only: \"my vision board is more of my my long-term goals five ten years from now but I have my yearly goals as well as monthly goals\" — OcYECokZIeM ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-121",
    "text": "i even took it a step further and realized i can use technology i can take little video clips from youtube and i can edit together an imovie and put together this vision this vision trailer you know that would have all these video clips of different commercials or different you know homes or whatever it is and i can watch that every single day",
    "videoId": "2V06cH1z3Qo",
    "context": " \"i even took it a step further and realized i can use technology i can take little video clips from youtube and i can edit together an imovie and put together this vision this vision trailer you know that would have all these video clips of different commercials or different you know homes or whate",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-122",
    "text": "music that I loved and I put my voice in the background of it and basically do this incantation walk where I say the things I'm attracting in my life based on my vision board ... I spent a good 30 minutes",
    "videoId": "z2eXtlqviQo",
    "context": "Related audio version: \"music that I loved and I put my voice in the background of it and basically do this incantation walk where I say the things I'm attracting in my life based on my vision board ... I spent a good 30 minutes\" — z2eXtlqviQo ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-123",
    "text": "go to open houses it's one of my favorite things to do because you can find an open house for a five or ten million dollar home go on sunday go check it out browse around get a feel of what it'd be like to live in that place ... you can go to the car dealership and you can take a tesla for a test drive or you can take a ferrari for a test drive",
    "videoId": "2V06cH1z3Qo",
    "context": " \"go to open houses it's one of my favorite things to do because you can find an open house for a five or ten million dollar home go on sunday go check it out browse around get a feel of what it'd be like to live in that place ... you can go to the car dealership and you can take a tesla for a test ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-124",
    "text": "when I was like 23 or 24 years old I went down to San Diego ... I stayed in hostels ... I was walking down the beach and I'm looking at the homes and imagining myself living there one day",
    "videoId": "9RxHchflvVs",
    "context": "And his own literal version: \"when I was like 23 or 24 years old I went down to San Diego ... I stayed in hostels ... I was walking down the beach and I'm looking at the homes and imagining myself living there one day\" — 9RxHchflvVs ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-125",
    "text": "more so privately to be honest because you know only for myself do I really know what my vision is and my goals ... if you're trying to achieve based on what other people want for you it's not going to work",
    "videoId": "F0ToFPMcIqI",
    "context": " Private, not shared. \"more so privately to be honest because you know only for myself do I really know what my vision is and my goals ... if you're trying to achieve based on what other people want for you it's not going to work\" — F0ToFPMcIqI ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-126",
    "text": "it's always special if you have a partner in your life a man or a woman to share this with them even your kids and ask them ask your family what their perfect day is and that's how you can also make sure you're in alignment with that person",
    "videoId": "9RxHchflvVs",
    "context": "Exception — with a partner: \"it's always special if you have a partner in your life a man or a woman to share this with them even your kids and ask them ask your family what their perfect day is and that's how you can also make sure you're in alignment with that person\" — 9RxHchflvVs ",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-127",
    "text": "what are my values [that] need to be in order to create my ultimate vision for my life",
    "videoId": "Lp_GOrM16Xc",
    "context": " Vision → everything else. Vision drives values ( \"what are my values [that] need to be in order to create my ultimate vision for my life\" — Lp_GOrM16Xc ), area selection ( \"identifying your vision identifying what is an amazing life to you ... that's what's going to allow you to understand what are",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-130",
    "text": "without a vision people perish",
    "videoId": "8kco2rjijjE",
    "context": "The recurring justification line: \"without a vision people perish\" (Bible, quoted in 8kco2rjijjE , OgRGJBpTOeU , 2V06cH1z3Qo ) and \"if you don't have a plan for your life then you're going to fit into the plan of someone else's\" ( 8kco2rjijjE , Kz83kMosOWU ).",
    "artifact": "phase2-vision"
  },
  {
    "id": "phase2-vision-131",
    "text": "if you don't have a plan for your life then you're going to fit into the plan of someone else's",
    "videoId": "8kco2rjijjE",
    "context": "The recurring justification line: \"without a vision people perish\" (Bible, quoted in 8kco2rjijjE , OgRGJBpTOeU , 2V06cH1z3Qo ) and \"if you don't have a plan for your life then you're going to fit into the plan of someone else's\" ( 8kco2rjijjE , Kz83kMosOWU ).",
    "artifact": "phase2-vision"
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
