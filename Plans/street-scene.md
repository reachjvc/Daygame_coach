# Street scene: the opener you practise, drawn as a living picture

Written 2026-11-10. Status: **plan only, nothing built.** The owner picked this on 2026-11-10 from six
"something cool I don't already have" suggestions, and said: the scenarios will be built out, so it may look
different in small or big ways, but he wants to see it in action.

## Only you decide these

Nothing. No money is spent, no data is deleted, nothing here is irreversible. No new library is added.
(Pictures or video made by a paid image service would cost money. They are not in this plan.)

## Part 1, in plain words

**What it is.** Practice Openers today hands you a paragraph: "A woman is sitting in the courtyard, wearing
headphones… She looks a bit sad." This plan draws that same encounter as a moving picture above the paragraph:
the place, the weather, the crowd, her, what she is doing and how she carries herself. The paragraph stays.

**What you will see first.** One page with the same four encounters drawn in three different looks (Phase 1).
You mark the look you like. Only then is it built into the app.

**Doubt first.**

1. **She will be a drawn figure, not a realistic woman.** I draw with code, not a camera. The paragraph says
   "baby doll dress in floral print with black tights and combat boots"; the picture can show a dress shape and
   a colour mood, not that outfit. The picture carries mood and body language; the paragraph stays the detail.
   This is why Look A below is silhouettes: nothing is promised that the drawing cannot keep.
2. **Mostly she is not walking past.** In 5,000 generated encounters she was standing in 39%, seated in 24%,
   walking in 37%. So the usual scene is "you come upon her", with the street moving around her.
3. **It may be a nice picture that teaches nothing.** The honest value is small unless the picture carries
   something the text does not. One way it could (Q3): at harder levels the paragraph drops "she looks a bit
   sad" and you read it from how she stands. That is my idea, not a coach's method.
4. **Scenarios will be rebuilt from the video corpus**, so what an encounter contains will change. The scene
   is built to take a small plain description (place, weather, crowd, her pose, her mood, what she holds), not
   today's generator output. One short translator sits between them; a new scenario brings its own.
5. **Jacob's advice to rebuild from scratch is still open.** This piece is self-contained: a description goes
   in, a picture comes out; no database, no login, no AI call. It would carry over to a rewrite as one folder.

## Blockers, each tried once

| ID | What | Tried, and what it returned | Recommendation |
|---|---|---|---|
| B1 | Does an encounter hold enough facts to draw from, without reading the paragraph? | Generated 5,000 encounters (2026-11-10). Each has: place (41 kinds in 7 families), pose (6), mood (26), weather (9), crowd (3), headphones yes/no (11% yes), outfit family (13 seen), a held item (6%). **Not** as facts: outfit colours, hair, time of day. | Enough. Draw outfit family as a shape and palette; leave hair generic; take time of day from the weather. |
| B2 | Will it run smoothly on a phone? | Drew a test street in a hidden browser at phone size (390 wide), processor slowed 4×: moving buildings, 12 walking figures, 150 raindrops. Held 60 frames a second. A real phone was not tried. | Proceed. Check on the owner's phone in Phase 3. |
| B3 | Can I check my own drawing before he sees it? | Same test saved a screenshot of the scene. Works. | Every look and every pose is looked at in screenshots, at phone and laptop width, before he is asked. |
| B4 | Does the browser already receive these facts? | Read `OpenersTrainer.tsx`: it already shows pose and headphones from the encounter. Yes. | No server change needed. |

## Open questions

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Which look? | Decide on the Phase 1 page, not here. My lean is A (silhouettes). | B or C | One look redrawn; the engine underneath stays. |
| Q2 | Should you choose **when** to open (walk up early, late, from the front or behind)? | Not in the first version. First see the scene. This mechanic is my invention; if wanted, it should copy what a named coach teaches about the approach itself, with his words checked. | Build it now | A game rule that teaches something wrong. |
| Q3 | At harder levels, hide the mood sentence and let the picture show it? | Try it in the lab page (Phase 2), switch on only if you can actually read the moods. | Always show the sentence | None; it is a switch. |
| Q4 | Is it worth building in this codebase while the rewrite is undecided? | Yes: Phase 1 is a standalone page, and Phases 2–3 are one folder with no ties. | Stop after Phase 1 until decided | A few days of work moved by hand later. |
| Q5 | Sound (rain, street, café)? | No. Phones are usually silent and it adds files. | Later, as a switch | None. |

## Phases

### Phase 1: three looks, one page (you look, you mark)

One page, "Street scene, three looks". Four real encounters from the generator, each drawn in each look,
moving, with its real paragraph underneath:

- standing at a shop window, light rain, relaxed
- seated in a café, headphones, focused
- walking fast on the high street, rushed, busy crowd
- seated in a park, sunny, cheerful

The looks, each named after something real you can look up:

- **A. Silhouettes at dusk**: dark figures against layered, glowing colour (like the games *Alto's Odyssey*
  and *Firewatch*). Outfit is an outline; mood is posture and pace.
- **B. Soft flat colour**: simple coloured shapes, faces without detail (like the game *Florence*). Outfit
  colours show.
- **C. Ink sketch**: loose line drawing on paper, one accent colour for her (like a *New Yorker* street
  drawing).

Each look has Yes / Maybe / No and a note box with Save, a "Saved" badge and all earlier notes listed.

Acceptance: every scene checked by me in screenshots at 390 and 1280 wide, light and dark; a still picture
when the device asks for reduced motion; the mood is visibly different between relaxed, focused, rushed and
cheerful. Then the link goes to the owner. **Nothing after this starts before his mark.**

### Phase 2: the scene engine, in the lab

Depends on: Phase 1 mark.

- New folder `src/scenarios/scene/`:
  - `sceneSpec.ts`: the plain description (place family, weather, crowd, pose, pace, body language, headphones,
    held item, outfit shape and palette).
  - `sceneFromOpener.ts`: the translator from today's encounter. 7 place families; 6 poses; 26 moods folded
    into about 5 ways of carrying herself (open, neutral, absorbed, hurried, closed); 9 weathers; 3 crowds;
    13 outfit families. About 200 activities folded into about 12 props or stances (phone, bags, coffee,
    book, bench, shop window, camera, map, queue…). An activity with no drawing gets the plain pose; the
    scene never shows something the paragraph contradicts.
  - `StreetScene.tsx`: the picture, drawn in the chosen look.
- Lab page `/test/street-scene`: generate, step through, filter by place, pose, mood, weather; the Q3 switch.

Acceptance: a unit test runs 5,000 generated encounters through the translator, none fails and every field
is one the picture knows; screenshots of every place × pose, every weather, every body language; 60 frames a
second in the slowed test from B2; `npm test` and the type check green.

### Phase 3: into Practice Openers, live

Depends on: Phase 2.

- The scene sits above the paragraph in Practice Openers at `/scenarios`. A new encounter fades in as a new
  scene. Settings bar gets "Scene on/off" (remembered on the device).
- Reduced-motion devices get the still picture.

Acceptance: on the live site, signed in, at phone width: generate five encounters, each scene matches its
paragraph (place, pose, weather, headphones); typing and scoring an opener work as before; the e2e test for
openers passes. Owner tries it on his own phone; "built and live" until he says it is good.

### Phase 4: later, only on your word

- Q2, choosing when and how to walk up (needs a named coach's method first).
- Her reaction after your opener is scored (she smiles, keeps walking, stops), from the score the evaluator
  already returns.
- The same scene as the header of Keep It Going, and of scenarios built from the corpus.

## Ground rules for the session that builds this

- No new library; SVG and CSS only (a new dependency needs the owner's yes and has been refused by the
  commit guard before).
- Other sessions share this checkout: `git commit --only <paths>`; type check before push.
- The figure stays a clothed, ordinary person in a street. No body emphasis; the product is about talking
  to her.
- Phase 1's page keeps its marks in the page's own database; read them before Phase 2.
