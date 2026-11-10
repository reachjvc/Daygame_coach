# Sell page: a landing page mock that shows the product moving

Written 2026-11-10. Status: **plan only, nothing built.** The owner asked for a fast way to see how the
product could be sold: a landing page with animations showing different parts of the product. It may invent
prices and how finished features look, but must also use what exists and how it looks today. It need not be
perfect, and it will not be built into the app like this.

This is one standalone private page. Nothing in the app, the live sales page or Stripe changes, so the open
question of a rewrite does not touch it.

## Only you decide these

- **Money: none.** The prices are words on a mock page. Nothing is bought and no payment setting is touched.
- **Deleting data, anything that cannot be undone: none.**
- **Your street photos** (the woman from the street scene showcase) would be reused on this page. The page is
  private, as that one is. They never go into the code repository, which is public. Say no and the hero uses
  the drawn street only.

## Part 1, in plain words

**What you get.** One page you scroll like a visitor would, on a phone or a laptop. Each section sells one
part of the product with a small animation of that part at work, drawn in the app's own look (charcoal,
orange, the same typeface). At the end there is a price table and a closing section built on your campaign
line.

**The angle.** Dating leads, the whole life follows. That is your own order ("dating first, the whole life
later", `docs/product/brand.md`), and it fits your tiers (`docs/product/vision.md` item 6): the life tools
are the cheap or free base, the conversation practice is what costs money. Today's sales page mentions only
the practice chat and none of the life half.

**The name on the page:** 10K Reps, as a working name. It is the one you said is probably your favourite, and
it gives the page its story: every approach, workout and tracked day is a rep, and a counter can run. The
name is still undecided; this page is also a chance to see it in use.

**The scroll, section by section.** "Real" = exists in the app today. "Planned" = in a plan or the vision,
not built. "Invented" = made up for this page.

| # | Section | What moves | Sells | Basis |
|---|---|---|---|---|
| 1 | **Hero** | The drawn street: she walks, slows at a window; a "Say hi" button pulses. Press it and she turns and the picture closes in on her. A rep counter ticks from 0 to 1. | The promise: practise the moment you fear, before you do it for real. | Planned (street scene showcase); your photos if you say yes |
| 2 | **Practise** | A phone with a chat that types itself: the situation card (who she is, the weather, her mood), your opener, her reply, then the coach's marks on your line. Four tabs swap the scenario. | Scenarios, the paid core. | Real: the four built scenarios and the situation generator. Invented: polish of the feedback card |
| 3 | **From real streets** | A wall of small video tiles collapses into one transcript, then into a branching map of how a conversation goes. A line lights up as "what a coach said here". | Why her replies are realistic: built from real recorded approaches, not guessed by AI. | Planned (the video pipeline, the conversation map) |
| 4 | **Ask the coach** | A question types itself; the answer appears with its sources under it and a score for how much of the answer they back. | Ask Coach: answers from real coaches, with receipts. | Real: sources and the score are shown today. Invented: the tidier look |
| 5 | **Out there** | A phone in the hand: tap, tap, tap, the approach count rises; an outcome tag and a mood are picked; a voice note draws its wave. Then the week's chart draws itself and a badge drops in. | Tracking: the real world, not practice. | Real: session tracker, voice note, stats, achievements. Invented: nicer chart |
| 6 | **The rest of your life** | Your one sentence at the top (the north star); under it goals fall into place; then "Today" with three ticks being ticked. Around it four tiles wake up one at a time: a set logged at the rack, a running timer, a quarter-hour energy ping, a quit-a-vice calendar. | The life half: one plan, and the tools that live it. | Real: Your plan, gym, Time, time & energy audit, the Black Box |
| 7 | **Ten years** | A graph draws from "today" out to ten years. You type the sentence you want to be able to say; it is sealed and three dates appear: 1, 5 and 10 years. Then the line: **"Ten years from now, you might be able to say… I DID IT."** | The reason to start now. | Your campaign line (real). The sealed sentence: invented (noted in brand.md, never asked for) |
| 8 | **Prices** | Three cards; a monthly / yearly switch rolls the numbers. | The offer. | Invented, see below |
| 9 | **Questions and the last button** | Folding questions ("Is this pickup tricks?", "Do I need to go out to use it?", "What does the AI know?"). | Removes the last doubts. | Invented wording |

**Three opening headlines on a switch** (wording is the cheapest thing to compare):

- A. "Ten thousand reps from now, you are a different man."
- B. "Practise the first ten seconds until they are boring."
- C. "Stop reading about it. Get your reps in."

**The invented prices.**

| Tier | Price | Holds | Why this number |
|---|---|---|---|
| **Base** | Free | Your plan, tracking, gym, time, the audit | Your vision: basic tier free or about $1.99 |
| **Practice** | $19 a month, or $135 a year ($11.25 a month) | Everything in Base, plus Scenarios, the street scene, Ask Coach | Close to today's $20 and $135 on the live page |
| **Founding member** | $249 once, first 100 men | Practice for life | Invented launch offer, to see how one looks on the page |

**A "what is real" switch.** Each section carries a small tag: Real today, Planned or Invented. One switch
hides the tags so you see the page as a visitor would. A note box sits at each section (Save button, a
green "Saved", your earlier notes listed), so your reactions are kept.

**Doubt first.**

1. **No testimonials, no user counts.** Nobody has used the product but you, so the page shows none. A real
   sales page leans on them; this one will feel thinner there. Today's live page says "Join hundreds of men",
   which is not true. I leave the live page alone in this plan; say the word and I change that line.
2. **A mock can look better than the product.** The animated screens are redrawn, not recordings. The tags
   are the guard against fooling yourself.
3. **I judge motion from still pictures.** Your reaction outranks mine.
4. **The name is not decided**, and 10kreps.com belongs to someone else (brand.md). Fine on a private page.

## Blockers, each tried once

| ID | What | Tried, and what it returned | Recommendation |
|---|---|---|---|
| B1 | Can I see today's sales page as a visitor does? | 2026-11-10: opened it in a hidden browser at phone width and took a full-page picture. Works. Read from it: headline "Master Daygame From Home", three feature cards, three price cards ($20, $35, $135), "Join hundreds of men". | Use as the "today" reference. |
| B2 | Can I see the signed-in screens (chat, tracker, plan, gym, time)? | Opened `/plan` signed out: sent to the sign-in page, as it should be. Your own login is never used. The local test backend is running (checked: its containers are up) and the test suite has a test account with seeded data. | Phase 0 signs in there with the test account and photographs each screen. |
| B3 | Can the lab pages be seen without signing in? | Opened `/test/scenario-lab` on the local server: it loaded, no sign-in asked. | Use for anything that only exists in the lab (role models, scenario lab). |
| B4 | Are the street photos still there? | Listed the files of the street scene page: 4 cut-outs of her and 2 backgrounds, each in a phone and a laptop size, about 0.9 MB in all. They can be copied page to page without passing through the repository. | Reuse in the hero if you say yes. |
| B5 | Can a redrawn screen match the app? | Read the app's colours and typeface from `app/globals.css`: charcoal #121212, slate #1f2937, orange #ff6b35, red #e63946, Geist. The page host allows that typeface. | Redraw screens in code with these values, checked against the Phase 0 pictures. A picture cannot animate its insides; a redrawn screen can. |

## Questions, each with a recommendation

Decided as recommended unless you say otherwise.

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Which half leads? | Dating leads; the life half is section 6. | Life leads ("design your life"), dating is one tool in it. | Reordering sections: an hour. |
| Q2 | Which name is on the page? | 10K Reps. | DayGame Coach (today's), or a switch between two names. | One word to swap. |
| Q3 | Photos or drawing in the hero? | Drawn street, closing in on your photo of her. | Drawn only. | The hero is rebuilt without the photo. |
| Q4 | One direction or several? | One page, with the three headlines on a switch. | Two or three whole pages in different styles. | You see one style; a second is a new round. |
| Q5 | Are the invented prices worth arguing about now? | No. They are placeholders to see a price table. | Research prices of similar products first. | None; numbers are swapped in a minute. |

## Phases

### Phase 0: photograph what exists

Sign in to the local test backend with the test account. At phone (390 wide) and laptop (1280 wide) size,
photograph: the sales page, a Scenarios chat mid-conversation, the session tracker, the tracking stats, Your
plan on Today, the live workout, Time's timer, an audit ping, the Black Box calendar, Ask Coach with an
answer. Pictures stay in the scratch folder. Check: one picture per screen, each readable.

### Phase 1: the words

Write every headline, section text, price card and question. Check: reading only the headlines from top to
bottom tells the whole pitch, and no line claims users, results or numbers that do not exist.

### Phase 2: the page without motion

The nine sections laid out with the redrawn screens as stills, the price table with its switch, the tags and
the "what is real" switch. Check: phone and laptop pictures beside the Phase 0 pictures; the redrawn screens
are recognisably the app.

### Phase 3: the motion

One animation per section, as in the table. Each starts when its section scrolls into view and can be
replayed. The hero and the chat are the two that must be good; the rest may be simple. Devices set to reduced
motion get the stills. Check: pictures at five moments of each animation; nothing jumps or overlaps.

### Phase 4: notes, check, publish

The note box at each section. Every section and both switches checked at phone and laptop size; no sideways
scroll; no errors. Publish as a private page and put the link in chat, with what I could not judge.

## Ground rules for the session that builds this

- One page. No change to the app, the live sales page or Stripe.
- Photos and screen pictures stay in the scratch folder and on the private page. Never committed.
- Signed-in pictures come from the test account only.
- No invented testimonial, user count or result. Invented prices and features carry their tag.
- No paid service is called.
