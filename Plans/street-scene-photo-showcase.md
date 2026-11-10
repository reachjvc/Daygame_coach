# Street scene, round 2: the drawn street and a photo close-up, in one playable encounter

Written 2026-11-10. Status: **built 2026-11-10 with the owner's four pictures; page: https://claude.ai/artifact/HN67Vjb4yHLM49FScHpunT. Verdict given in chat: A if the approach itself is trained, otherwise C; B ruled out; D not really tested (the filter is too mild). Awaits his reaction.** Follows `Plans/street-scene.md` and
the first showcase page (https://claude.ai/artifact/BsDff3e3aTrZ64KiJLHWr9). The owner liked the drawn
street, showed a photo-real portrait he had made in ChatGPT, and asked for a showcase that combines the two.
He said the scenario may be guessed and need not match the app's scenarios or code.

This is one standalone page. Nothing is built into the app, so it is unaffected by the open question of a
rewrite.

## Only you decide these

- **Money: none.** I cannot make photos, and the project holds no key for an image service. The showcase
  uses the one photo you sent.
- **Optional, free, about ten minutes of your time:** three more pictures of the same woman from ChatGPT
  (prompts in Phase 0). With them, her reactions are photos. Without them the showcase still works: her
  reactions are her words plus the drawn street. Say "go" with or without them.
- **Where the photo goes:** on a private page only you can open. Not into the code repository, which is
  public.

## Part 1, in plain words

**The idea being tested.** The drawing is good at distance and movement: the street, her pace, whether she
stops. The photo is good at face to face: who she is, how she looks at you. So the drawing carries the
approach and the photo carries the conversation.

**The encounter (invented for this demo, not a coach's method):**

1. **Far, drawn.** A pedestrian shopping street on a sunny afternoon, redrawn to match your photo: pale
   buildings, a green copper spire, a crowd. She has long wavy light-brown hair, a navy sweater, a canvas
   tote and glasses. She walks, then slows at a shop window.
2. **Say hi.** She turns. The camera moves in and the drawing dissolves into the photo.
3. **Near, photo, alive.** She is cut loose from the background, so the street behind her drifts and blurs
   as the camera moves. Slow push-in, people passing out of focus, light shifting.
4. **Your line.** Three lines to choose from: a direct one, one about something she carries, a hesitant one.
5. **Her answer.** Her reply in words, and her reaction. A warm answer stays in the close-up and gives you a
   second line. A polite no cuts back to the drawing: she walks on into the crowd.
6. **A switch on the page** shows the close-up three ways: **Photo**, **Drawn by code**, **Painted** (the
   photo run through a rough filter, as a stand-in for an illustrated style). This is the comparison the
   verdict rests on.

**Doubt first.**

1. **Two worlds.** A flat drawing dissolving into a photo may feel like two different products glued
   together. This is the main thing the showcase is for; I cannot know before it is built.
2. **One photo is one expression.** Without the optional pictures she answers a cold line and a warm line
   with the same face.
3. **I judge from still screenshots.** I cannot feel motion the way you do. Your reaction outranks my
   verdict.
4. **The photo shows Zara and H&M signs.** Fine on a private page; not usable in a product.

## Blockers, each tried once

| ID | What | Tried, and what it returned | Recommendation |
|---|---|---|---|
| B1 | Can I make photo-real pictures? | No. Checked the project's keys: only the one for Claude, no image service. | Use your photo. More pictures come from you (Phase 0) or, later, a paid service on your yes. |
| B2 | Can she be cut loose from the background, hair included? | Installed a free cut-out tool in a scratch folder and ran it on your photo (2026-11-10). She came out clean, loose hair included. Two passers-by came along as separate pieces. | Works. Keep only the largest piece. |
| B3 | Does the photo fit on a page? | It is 1199 × 1312, 2.8 MB; a page may hold 16 MB. Conversion to a smaller format not run yet. | Fits. |
| B4 | The same woman with other expressions? | Cannot try it myself. ChatGPT can change a picture you upload; how well it keeps her face is unknown until you try. | Optional Phase 0. Judge the three pictures before using them. |
| B5 | Does the dissolve from drawing to photo hold together? | Not testable before building. | Phase 3 builds it; the Drawn and Painted modes are the fallback and the comparison. |

## Phases

### Phase 0 (you, optional): three more pictures

In ChatGPT, upload the photo and ask, one at a time:

1. "Same woman, same place, same clothes, same framing. She is laughing, looking at the camera. No shop
   names or logos visible."
2. "Same woman, same place, same clothes, same framing. She looks unsure and a little guarded: polite
   half-smile, eyebrows slightly raised. No shop names or logos visible."
3. "Same woman, same place, same clothes, same framing. She has turned her head to look down the street,
   about to walk on. No shop names or logos visible."

Paste them into the chat with "go".

### Phase 1: prepare the photo

Cut her out; keep the largest piece; fill and blur the street behind her so it can move on its own; shrink
the files. Same for any Phase 0 pictures. Check: no fringe around her hair at phone and laptop size.

### Phase 2: redraw the street for this encounter

Daytime light, pale buildings, the spire, a denser crowd, paving instead of wet ground; her drawn figure
matched to the photo (hair, sweater, tote, glasses). Check: at the moment of the cut, her drawn pose and
position line up with the photo.

### Phase 3: the join and the living photo

Her turn, the camera move, the dissolve; then the photo's own life: push-in, background drift, passers-by
out of focus. Check: screenshots through the dissolve at five moments; nothing jumps.

### Phase 4: the exchange and the three modes

Three lines, her replies, two outcomes (stay and continue; she walks on, back in the drawing). The
Photo / Drawn / Painted switch. Reduced-motion devices get stills and the same choices.

### Phase 5: check, publish, verdict

Every path and every mode in screenshots at phone and laptop width; smoothness measured; no errors. Publish
as a private page, link in chat. Then my verdict, chosen from the list below, with what I saw that led to
it and what I could not judge.

## The verdicts I may come back with

Written before building, so the answer is not bent to fit the work done.

| | Verdict | What would make me say it | What would follow |
|---|---|---|---|
| A | **Both, as built.** Drawing for the approach, photo for the conversation. | The cut feels like moving closer, not like changing product; her face changes which line you would pick. | A library of women per type; reactions per woman are the cost to price. |
| B | **The photo is not needed.** | The Drawn close-up carries the exchange nearly as well; the photo adds an uncanny or "stock picture" feel. | Spend the effort on a better drawn figure. No image costs at all. |
| C | **Photo only; drop the drawn street.** | Once her face is on screen, the far shot feels like a delay before the real thing. | Living photos plus words; much less to build. |
| D | **Painted, not photo.** | The Painted mode joins the drawing without a seam and keeps her character. | Ask the image service for illustration in one fixed style; also avoids looking like a real person. |
| E | **Neither moves the needle.** | The exchange is only as good as her replies; the pictures do not change what you learn. | Put the effort into realistic conversations from the video corpus; pictures later. |
| F | **Something neither of us planned.** | The build turns up a better idea than A–E. | I say so, with the reason. |

## Ground rules for the session that builds this

- The photo and anything cut from it stay in the scratch folder and on the private page. Never committed.
- No paid service is called. No account or password is asked for.
- The woman shown is an adult; any further pictures keep her plainly so.
- One page, no changes to the app.
