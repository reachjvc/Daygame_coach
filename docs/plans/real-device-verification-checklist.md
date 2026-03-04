# Real-Device Verification Checklist (Tier 3)

**Purpose**: Gate for beta branch merges. These 8 interaction sequences catch OS-level rendering bugs invisible to emulators (keyboard resize, rubber-band scroll, notch clipping, safe areas).

**Evidence format**: Screen recording of each sequence (not screenshots — recordings capture transient failure states).

**Devices required**: 1 iPhone (iOS Safari) + 1 Android (Chrome)

---

## Pre-flight

- [ ] App running on a URL accessible from phone (localhost tunnel, staging, or Vercel preview)
- [ ] Logged in as test user on both devices

---

## Sequence 1: Keyboard + Fixed Modal (iOS)

**Page**: Goals Hub → New Goal button

**Steps**:
1. Tap "New Goal" to open the form modal
2. Tap the title input field
3. Keyboard opens
4. Type a goal title
5. Scroll within the modal to reach the submit button
6. Tap submit

**Pass criteria**:
- [ ] Title input remains fully visible above keyboard
- [ ] Submit button is accessible (can scroll to it within modal)
- [ ] Modal doesn't jump, clip, or extend behind the notch
- [ ] Goal is created successfully

---

## Sequence 2: Keyboard + Fixed Modal (Android)

**Page**: Goals Hub → New Goal button

**Steps**: Same as Sequence 1

**Pass criteria**:
- [ ] Title input remains visible when keyboard opens
- [ ] Content within modal is scrollable
- [ ] No content hidden behind keyboard
- [ ] Goal is created successfully

---

## Sequence 3: Setup Wizard Long Form

**Page**: /dashboard/goals/setup → Step 2 (Goals step)

**Steps**:
1. Complete step 1 (select a path)
2. On step 2, scroll to the bottom of the goal list
3. Tap a number input (target value stepper)
4. Keyboard opens
5. Type a number
6. Tap the "View Summary" button in the BottomBar

**Pass criteria**:
- [ ] Input scrolls into view when focused
- [ ] BottomBar ("View Summary") remains accessible above keyboard
- [ ] No content clipped by notch (top) or home indicator (bottom)
- [ ] Number input accepts the typed value

---

## Sequence 4: Tracking Field Report Multi-Input

**Page**: /dashboard/tracking/report (select any template)

**Steps**:
1. Scroll to a textarea field
2. Tap the textarea
3. Type some text
4. Tap the next input field below it
5. Type in that field
6. Scroll through remaining fields

**Pass criteria**:
- [ ] Each field scrolls into view when focused
- [ ] Voice recorder buttons (if present) don't overlap the input
- [ ] No horizontal overflow at any point during typing
- [ ] Tab order moves correctly between fields

---

## Sequence 5: Notch / Safe Area (Celebration Overlay)

**Page**: Goals Hub with a goal near completion

**Steps**:
1. Increment a goal to reach its target (trigger milestone)
2. Observe the celebration overlay (confetti-full tier)
3. Read the overlay content
4. Tap "Continue" to dismiss

**Pass criteria**:
- [ ] Overlay content doesn't clip behind the notch (top of screen)
- [ ] "Continue" button doesn't overlap the home indicator (bottom)
- [ ] Content is centered and readable
- [ ] Dismiss button registers on first tap

*Alternative if milestone can't be triggered*: Open any `fixed inset-0` modal (e.g., "Delete All" confirmation) and verify content clears notch and home indicator.

---

## Sequence 6: Rubber-Band Scroll + Fixed Elements

**Page**: Goals Hub with 5+ goals

**Steps**:
1. Scroll to the very bottom of the goal list
2. Continue scrolling past the end (overscroll / rubber-band)
3. Let the page bounce back
4. Repeat from the top (scroll up past the first element)

**Pass criteria**:
- [ ] Fixed elements (header, any visible toasts) don't shift or glitch during bounce
- [ ] Page settles back to its original position cleanly
- [ ] No visual artifacts or flickering

---

## Sequence 7: Touch Targets

**Page**: Goals Hub → expand a goal card

**Steps**:
1. Tap the expand chevron on a goal card
2. Tap the +1 increment button
3. Tap the edit button
4. Close the edit modal
5. Tap the reset button (if visible)

**Pass criteria**:
- [ ] Each button registers on first tap (no double-tap needed)
- [ ] No mis-taps on adjacent buttons
- [ ] Buttons have visually clear hit areas (not cramped)

---

## Sequence 8: Orientation Change

**Page**: Goals Hub

**Steps**:
1. View the goals hub in portrait orientation
2. Rotate phone to landscape
3. Interact with a goal card (expand, increment)
4. Rotate back to portrait

**Pass criteria**:
- [ ] Layout reflows correctly in both directions
- [ ] No content stuck off-screen after rotation
- [ ] No horizontal scrollbar appears in either orientation
- [ ] Interactive elements remain tappable after rotation

---

## Summary

| # | Sequence | iOS | Android |
|---|----------|-----|---------|
| 1 | Keyboard + Modal | [ ] Pass | — |
| 2 | Keyboard + Modal | — | [ ] Pass |
| 3 | Setup Wizard Form | [ ] Pass | [ ] Pass |
| 4 | Field Report Multi-Input | [ ] Pass | [ ] Pass |
| 5 | Notch / Safe Area | [ ] Pass | [ ] Pass |
| 6 | Rubber-Band Scroll | [ ] Pass | [ ] Pass |
| 7 | Touch Targets | [ ] Pass | [ ] Pass |
| 8 | Orientation Change | [ ] Pass | [ ] Pass |

**Total recordings needed**: 15 (8 iOS + 7 Android, sequence 1 is iOS-only, sequence 2 is Android-only)

**Gate rule**: All boxes must be checked before merging to beta. If a sequence fails, fix the implementation and re-record that sequence only.
