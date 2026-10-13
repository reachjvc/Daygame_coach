# Tests worth their keep — the inventory

The file-by-file verdicts that `docs/plans/tests-worth-their-keep.md` executes.

**Snapshot:** 2026-10-13, HEAD `b62c809c` plus the shared working tree as it stood
that morning. Eight auditing agents read every test file in full (unit, database,
browser) and opened the production code wherever a verdict depended on it. I
re-checked six of their claims by hand (dead callers of `computeBottleneck` and
`runningCopyOf`, `feedbackFlags` defining its own helper, `trackingRepo`'s
in-test logic, `quit-vice.spec.ts`'s `/test` target, the tripwire constant test);
all six held.

**This is a shortlist, not a licence.** Peers edited about 25 test files while
the audit ran. Whoever executes a row re-reads the file first, and if the file has
changed in a way that alters the verdict, skips the row and says so in the commit.

## Legend

- **KEEP** — earns its place. **TRIM** — keep the file, remove the named tests.
  **DELETE** — the file goes. **MERGE → X** — fold into file X.
  **REWRITE** — what it protects matters, the test is weak or brittle; the row
  says what the replacement asserts. **DEMOTE** — a browser test whose behaviour
  belongs in a unit or database test.
- **Rule ids** are the deletion reasons D1–D9, defined in the plan's execution half.
- **†** — the code under test is reachable only from a `/test/*` lab page, which
  404s in production. These rows wait for open question Q3 (Phase 4).
- **dead** — the code under test has no caller anywhere outside `tests/`. These
  rows also delete product code if Q4 is answered "delete".
- **DOM** — the file needs a browser-like environment (jsdom). Used by Phase 6.

## Totals

| Scope | Files | Tests (call sites) | Phase 1 cut (no decision) | + dead code (Q4) | + lab-only (Q3) | All | Files deleted |
|---|---|---|---|---|---|---|---|
| WP-U1 goals a–l | 47 | 983 | ~90 | ~99 | ~400 | 592 | 2 dead + 11 † |
| WP-U2 goals m–z | 48 | 1,377 | ~76 | ~11 | ~394 | 481 | 1 + 5 † |
| WP-U3 programs | 72 | 924 | ~49 | ~76 | — | 125 | 3 |
| WP-U4 timetrack + vice | 64 | 920 | 84 | — | ~110 | ~194 | 2 |
| WP-U5 db + tracking + health | 75 | 956 | ~221 | ~43 | — | 264 | 1 |
| WP-U6 everything else in tests/unit | 69 | 862 | ~184 | ~72 | ~55 | ~311 | 4 |
| **Unit total** | **375** | **6,022** | **~704 (12 %)** | **~301** | **~959** | **~1,964 (33 %)** | **13 + 16 †** |
| WP-I database (`tests/integration`) | 22 | 300 | 185 (+9 folded into 1) | — | — | 185 | 6 (+2 merged) |
| WP-E browser (`tests/e2e`) | 81 specs | 656 tests, 1,191 runs per pass | to 349 runs per PR, 450 nightly | — | — | — | ~25 specs |

**Within a row, tests marked dead or † wait for Phase 4; the rest go in Phase 1.**

Not counted above: `tests/unit/architecture.test.ts` and `tests/unit/architecture/*`
(10 files, about 110 tests), which a peer session is deleting on your instruction.

---

## WP-U1 — tests/unit/goals, files a–l

KEEP unchanged: backfillGoalLinks, catalogueProducesValidGoals, climbsDoNotRoll,
connectedPair, experiencePromotion, goalProgressOneOwner, goalsReadRolls,
lifePlanDayService, lifePlanMapper. `fixtures/areaLanguage.ts` stays (used by
northStarAreaBoxes and northStarOffers).

| file | tests | verdict | rules | cut | tests to remove |
|---|---|---|---|---|---|
| abstinenceDetector | 12 | TRIM | D5 | 2 | "a Danish stop-verb works at all, which it did not"; "the guess still applies when nobody has said otherwise" |
| answerInventory | 11 | DELETE (dead) | D9 | 11 | whole file; `src/goals/data/answerInventory.ts` has no importer |
| answerNamespaces | 4 | TRIM | D1 | 1 | "the two renamed questions kept their place in the catalogue" |
| backfillReachesTheAccount (DOM) | 3 | TRIM | D5, D7 | 1 | "sends nothing from a device that did not do the pushing" (also a real 50 ms sleep) |
| badgeEngine | 32 | TRIM | D1, D5, D9, † | 18 | "computes bronze/silver tier for l2_approach…" (2); "has 31 total badge configs…"; "every tier has a non-empty name"; "none < iron < … < mythic"; "every badge has correct structure"; computeAllBadges block (4, †); all 8 detectTierUpgrades tests (dead branch) |
| bottleneck | 11 | DELETE (dead) | D9 | 11 | whole file; `computeWillGate`, `computeBottleneck` have no caller |
| changeYourLifeService | 41 | DELETE † | D9 | 41 | whole file; reached only from `app/test/change-your-life/*` |
| clarifiers | 4 | DELETE † | D9 | 4 | whole file; used only by `/test/new-goals` |
| couldNotBeReadIsNotEmpty | 10 | TRIM | D1, D2, D4, D5, D7 | 5 | "and an account genuinely holding nothing is a different decision"; "so the banner's own condition is false for that browser"; "and true only when both halves are empty"; "says this is not your plan…"; "does not promise there is a plan to come back to" |
| countsAndPacing | 7 | TRIM | D5 | 2 | "reports progress against the total…"; "earns the hundred at a hundred approaches…" |
| doneTodayOneOwner (DOM) | 8 | TRIM | D3, D5 | 1 | "and the header above that row counts it too" |
| editsWhileLoading | 8 | TRIM | D5 | 1 | "and sends nothing in that case, or every load writes its own plan back" |
| footerTellsTheTruth | 6 | TRIM | D1, D4, D5 | 3 | "so the footer's first branch is not taken"; "a day-half change does not…"; "a plan sent up carries a stamp the server is free to ignore" |
| goalAchievements | 23 | TRIM | D1, D3, D4 | 2 | "gives every badge a label and a line a person would read"; "is deterministic" |
| goalCategories | 17 | TRIM | D1, D5, D7, D9 | 15 | everything except "should return default config for unknown category" and "should replace underscores with spaces in unknown category name" |
| goalDisplayService | 14 | TRIM | D1, D7, D9 | 10 | "returns known label…", "returns label for known phases", "returns abbreviations for known periods"; isUnknownCategory (3, dead); getGoalTypeLabel (2, dead); getGoalPhaseStyle (2, Tailwind classes) |
| goalGraph | 43 | TRIM | D1, D3, D4, D5, D9 | 27 | "GOAL_TEMPLATE_MAP has every template"; 4 template-flag pins; getLeafGoals (5, dead); CROSS_AREA_EDGES (6, dead); getCrossAreaInfluence (3, dead); getCrossAreaContributors (2, dead); 6 getTemplatesByCategory existence checks — **keep** "dirty_dog contains all dirty dog goals" |
| goalHierarchyService | 10 | TRIM | D1, D5 | 3 | "returns green for input goals"; "returns red for outcome goals"; "handles dirty_dog category" |
| goalIntakeShapes | 16 | DELETE † | D9 | 16 | whole file and `fixtures/goalLists.ts` |
| goalListIntake | 45 | DELETE † | D9 | 45 | whole file |
| goalPeriodRoll | 17 | TRIM | D4, D5 | 1 | "archives through the admin client…" (both mocks return the same fake) |
| goalPlanMapper | 24 | DELETE † | D9 | 24 | whole file; `/api/goals/plan` is called only by `/test/new-goals` |
| goalShapes | 8 | TRIM | D1, D3 | 2 | "is exactly the three…"; "gives every shape a label and a hint…" — **keep** "allows only the two that are actually written" (mirrors a CHECK) |
| goalTriage | 17 | DELETE † | D9, D7 | 17 | whole file; mounted only at `/test/goal-review` |
| goalsService | 158 | TRIM | D1, D5, D9, † | 71 | dead blocks: buildGoalTree (9), filterGoals (11), groupGoalsByTimeHorizon (3), getDaysLeftInWeek (4), findExistingByTemplate (3), getWeeklyRhythm (6); † blocks groupGoalsByLifeArea (4), filterScorecardGoals (8); deriveTimeHorizon recurring pins (5); getCelebrationTier except "custom period → toast" (7); getInputMode "counter with target 150"; deriveChildLevel "L0 → L1", "L1 → L2"; formatStreakLabel "1 week"; generateDirtyDogInserts "all inserts parented…"; getTimeOfDayBracket's 4 "boundary:" tests; buildMilestoneCelebrationData's two badge-upgrade tests (dead branch) |
| graduation | 27 | TRIM | D5 | 1 | "includes null phase L3 habit_ramp goals" |
| healthPanelReachable | 3 | TRIM | D7, D5 | 1 | "compares against 'health' and 'fitness'…" |
| horizonService | 15 | TRIM | D1, D9, † | 9 | "HORIZONS_ORDERED runs abstract→concrete…"; "suggests start+365…" (†); clampDateWithin (5, dead); interpolateDateISO (2, †) |
| intakeMigration | 23 | DELETE † | D9, D2 | 23 | whole file |
| intakeService | 33 | DELETE † | D9 | 33 | whole file |
| ladderForSave | 11 | TRIM | D5 | 2 | "the target comes from the field…"; "the first week of a rate reads 25%, not 0%" |
| ladderFromAName | 9 | TRIM | D5 | 2 | "leaves a unitless climb alone…"; "and one carrying a unit" |
| lifeDirectionService | 62 | DELETE † | D9 | 62 | whole file. **Write-coverage:** the only mention of `src/goals/lifeDirectionService.ts:setGoalField`; remove that baseline row in the same commit as the code |
| lifeMasteryCopyLint | 4 | REWRITE | D5, † | 2 | remove the two "no guru pronouns…" lab tests; rewrite tests 1 and 3 to lint live strings only (LIFE_MASTERY_AREAS, VISION_RUNGS, HORIZON_SCREEN) |
| lifeMasteryExemplar | 9 | DELETE † | D9 | 9 | whole file (imports the 673 KB corpus nothing else uses) |
| lifeMasteryRegressions | 60 | DELETE † | D7, D9 | 60 | whole file; ~24 tests regex `VisionPlanLab.tsx`, docs or a script |
| lifeMasterySimple | 61 | TRIM † | D1, D9 | 51 | keep the 8 rungSentences tests, "offers exactly the horizons the opening screen shows…", "attributes every quote to a video"; the rest is v1 at `/test/life-mastery-v1` |
| lifePlanSync | 22 | TRIM | D5, D7 | 3 | "does not import on a failed read even with an unset marker"; "says a conflict happened and that nothing was saved"; "says work is safe when the plan cannot be reached" |

Phase 1 cut: about 90. Dead-code rows (Q4): about 99. † rows (Q3): about 400.
If the owner keeps the lab tests (Q3 = c), the lab files get about 46 fallback
trims instead, which the auditing agent did not list by name — re-audit them then.

Dead product code found (Q4): goalsService `buildGoalTree`, `filterGoals`,
`groupGoalsByTimeHorizon`, `getDaysLeftInWeek`, `findExistingByTemplate`,
`getWeeklyRhythm`, `computeWillGate`, `computeBottleneck`; goalGraph `getLeafGoals`,
`CROSS_AREA_EDGES`, `getCrossAreaInfluence`, `getCrossAreaContributors`;
goalCategories `GOAL_CATEGORIES`, `GOAL_CATEGORY_MAP`; goalDisplayService
`isUnknownCategory`, `getGoalTypeLabel`; horizonService `clampDateWithin`,
`suggestChildWithin`; `src/goals/data/answerInventory.ts`; `lifeMasteryCorpus.ts`.

Near-misses that stay: goalShapes "allows only the two that are actually written";
goalGraph "dirty_dog contains all dirty dog goals"; climbsDoNotRoll's weekly
control; goalsReadRolls "rolls in the user's own timezone"; the two anti-vacuity
guards ("produces goals at all", "the scan actually reads files"); connectedPair's
two known-wrong pins (convert to `it.fails`); lifePlanSync "DOES re-import over a
plan somebody deliberately emptied"; goalPeriodRoll's timezone tests.

Open for the owner: graduation `detectAllPhaseTransitions` builds dates with
`new Date(...).toISOString()` and passes only by tolerance under the pinned zone
(likely REWRITE with ISO literals).

## WP-U2 — tests/unit/goals, files m–z

KEEP unchanged: metricPeriodFit, milestoneService, neverDo,
noPlaceholdersOnLiveGoals, northStarAreaBoxes, northStarFlowAdopts, northStarKeys,
northStarStepIds, oneThingBox, programReferenceKept, programReferenceReconciled,
rePush, removingAPushedGoal, routineCardLinked, secondDeviceCounts,
shapeChangeClears, stages, systemsTrainingWeek, templateDirection,
trackTabDerivedTicks.

| file | tests | verdict | rules | cut | tests to remove |
|---|---|---|---|---|---|
| noFabricatedFields | 7 | DELETE † | D9 | 7 | whole file (`/test/vision-plan` only) |
| northStarFlowSaves (DOM) | 7 | TRIM | D5 | 1 | "does not save a plan it has only just been handed by the server" |
| northStarOffers | 18 | REWRITE 1 | D4 | 0 | "keeps an area the person invented out of the catalogue's way" → `expect(areaOffer(invented)).toBeNull()` |
| northStarPersonas | 16 | TRIM | D1, D4, D5, D6 | 3 | "has nothing offered to it, which is the point"; "starts empty, and nothing is filled in on their behalf"; "still has the twelve areas and the routines to open"; REWRITE "suggests nothing for a driver it has nothing to say about" as `toEqual([])` |
| northStarPromises | 19 | TRIM | D1, D4 | 2 | "has a one thing to show before any season focus is picked at all"; "offers every set as several questions and not as one box" |
| northStarRecap (DOM) | 18 | TRIM | D1, D5 | 2 | "is a step in the rail that is never scored"; "shows what somebody wrote, not the goal they ticked" |
| northStarService | 352 | TRIM | D1, D4, D5, D9 | 28 | D1 (11): "opens with the twelve Blueprint areas and the three default routines", "stores the paragraph and stamps updatedAt", "keeps ladder answers keyed by rung", "asks the why, the identity, the standards, the gap and the affirmations, in his order", "shows his own answer on the two prompts that read as one question", "offers the full ritual on the morning routine…", "puts rating before planning", "marks the catalogue step a workshop…", "prompts pass 1 with his menu…", "still carries the means values people actually say", "labels the start box without guessing a value"; D5 (10): "gives every seeded routine a distinct id", "survives a save and a reload", "creates a target ladder that survives a storage round trip unchanged", "never inserts the example by itself", "keeps both lists on one record…", "spaces a bench climb on the plate grid", "records the enrollment, and nothing copied from the program", "adds the workout routine when the plan has not got one", "starting a second program replaces the reference…", "no program is a no-op"; D4/D5 (2): "counts a bucket-list experience as something you want…", "does not touch the one thing when the goals and the season are cleared"; dead (5): "moves one day of a repeat…" (moveBlock), "takes a block off the grid…" (unplaceStep), "buckets the milestones into months…", "sorts each month by date" (planTimeline), "finds the need behind a single target…" (routineNeedsForTarget). Also drop the dead-function lines `areasWithoutGoals` and `tabHasContent` (4 tests) |
| northStarSteps | 15 | TRIM | D5, D7 | 7 | D5: "shows nothing done on a plan nobody has touched", "fills every one of them when every box is filled", "covers every step in the flow…"; D7 (the 4 in "changing step writes the address"). Replace the 4 with one jsdom render test: change step, assert `location.search` is `?step=x`, and that a throwing `history.replaceState` still changes the step |
| northStarToday | 4 | TRIM | D7 | 2 | "the flow takes a timezone and uses it to work out today"; "the page reads the account's zone and hands it over" |
| northStarTrack | 116 | TRIM | D5 | 1 | "recognised NOTHING on a second device before the link existed" |
| oneThing | 51 | TRIM | D4, D5 | 2 | "compares only the words, because the row no longer holds a deadline"; "makes the previous one current again when the newest chapter is deleted" |
| oneThingSupports | 6 | TRIM | D1, D2, D4 | 5 | all but "under the keys the account already holds" (that one pins stored keys — keep) |
| parseGoalTargetOnRealTitles | 13 | TRIM | D5 | 3 | "refuses a car's model number"; "keeps a countable noun as the unit"; "still takes the noun behind a measurement…" |
| practiceRate | 14 | TRIM | D5 | 1 | "agree in week one, on the owner's own ramp" |
| presetStartScaling | 3 | DELETE † | D9, D4 | 3 | whole file |
| previewState | 20 | TRIM | D1, D5, † | 5 (+2 †) | "sets targetValue from insert target_value"; "extracts milestoneConfig from insert milestone_config"; "milestoneConfig is undefined when insert has no milestone_config"; "preserves _tempId and _tempParentId…"; "updates target_value when state has override"; † "excludes requiresOptIn L1 templates from both paths", "still returns non-opt-in L1s" |
| pushValidation | 4 | TRIM | D6 | 1 | "every goal in it produces a row the route will accept" (returns early when a fixture in another session's /tmp is missing) |
| rampAdvances | 11 | REWRITE 1 | D5 | 0 | "the time of day the goal was created does not shift the week" must actually vary `created_at` (00:00 vs 23:30) |
| repLadderService | 57 | DELETE † | D9 | 57 | whole file (`/test/change-your-life/start` only) |
| seasonBandCounts (DOM) | 4 | TRIM | D5 | 2 | "said 0 of 1 for a plan that HAD the tick…"; "counts a tick that IS there" |
| setupInserts | 34 | DELETE † | D9 | 34 | whole file (`/test/archive/goal-setup`, `/test/goalsv11`) |
| storagePromises | 3 | TRIM | D5, D7 | 1 | "does not tell you on the Track step that the plan is only here" |
| streakFreeze | 15 | TRIM | D5 | 1 | "returns false when streak is 0 even with freezes available" |
| trainingProgramCard (DOM) | 15 | TRIM | D7 | 2 | "speaks the app's tokens, at a size people can read, with no orange"; "keeps green for the one thing on this card that IS finished" |
| treeGenerationService | 21 | TRIM | D1, D5 | 9 | "input goals have goal_nature 'input'"; "outcome goals have goal_nature 'outcome'"; "L3 goals have display_category set"; "linked_metric is set where template defines it"; "approach_volume uses cumulative metric…"; "phone_numbers and instadates use cumulative metrics"; "milestone_ladder goals include milestone_config…"; "habit_ramp goals include ramp_steps…"; "L1 root comes first" |
| visionPlanService.embedder | 1 | DELETE (move to tests/manual) | D6 | 1 | `it.skipIf(!RUN)` never runs in `npm test`; downloads ~100 MB when enabled |
| visionPlanService | 298 | DELETE † (else TRIM) | D9, D1, D3 | 6 (+291 †) | dead in every case (6): "goalFeeders is the exact inverse of feedsGoalIds"; "goalEdges flags cross-area edges by effective area"; "goalEdges falls back to the pillar when areaId is absent"; "daysAway reports the gap the UI needs to explain itself"; "only circled one-year wants graduate to goals"; "the bi-weekly check-in fires every 14 days and not in between". If labs retired: whole file, but keep or move "prompts cover distinct angles, not one restated" (`REASON_PROMPTS` is live) and the `goalHorizon`/`goalNeedsAction` tests. If labs stay: fallback trims "has the 12 canonical areas…", "pyramid rows match the slide…", "drops last and changes the approach first…", "only the first move skips the dabbler guard-rail", "offers his five horizons", "the state session is a gate that stores nothing", "starts above the areas and derives them…", "stores the phases verbatim", "each move records a verdict our taxonomy can hold", "the guard-rail sends a lost-excitement answer…", "rampSummary reads as plain language", "goalRollup needs no new track math…" |
| weeklyReview | 12 | TRIM | D1 | 2 | "includes tier upgrades from parameter"; "includes goalNature in momentum entries" |

Dead product code found (Q4): northStarService `moveBlock`, `unplaceStep`,
`areasWithoutGoals`, `tabHasContent`, `planTimeline`, `routineNeedsForTarget`,
`dayNote`; oneThingService `oneThingState`; visionPlanService `goalFeeders`,
`goalEdges`, `daysAway`, `circledThisYear`, `biweeklyCheckinDue`,
`BIWEEKLY_CHECKIN`, `guideSession`, the `parseVisionPlanState` wrapper.

Slow, kept: northStarFlowSaves and northStarFlowAdopts (fake time stepped in 500 ms
`act` slices), northStarAreaBoxes (~50 renders), oneThingBox (34 renders),
northStarService's `it.each` over ~40 source files.

## WP-U3 — tests/unit/programs

The cleanest slice: mostly real behaviour. 76 of its 125 cuts are tests of product
code nothing calls.

KEEP unchanged: accountWideUnit, adjustDoesNotRace, buildYourWeek,
builderUnitSwitch, describeLoggedSet, describeTrainingWeek, enduranceBlocks.test.tsx,
enduranceMinutes, enrollRoute, enrollmentLoadFailure, finishSheet, historyRow,
keepChanges, lastSets, liftHistorySheet, liftMenu, liveRest, liveScreenPastMode,
liveScreenVanished, logPastWorkoutDialog, missWording, openWorkoutDoor,
pastPrograms, programActions, programRepo.enroll (only cover for three write
functions), programSheet, programsLocation, receiptBody, receiptHeading,
restSurvivesReload, retryableRefusals, runningProgramUnitSwitch (only cover),
setRow, todayCardOtherWorkout, trainingCardState, unfinishedLifts, useLiveWorkout.
(The 2026-10-01 plan's "receiptBody 24/27 weak" and "restSurvivesReload 7/7 weak"
were syntactic counts; both files test presence and absence, which is the
behaviour.)

| file | tests | verdict | rules | cut | tests to remove |
|---|---|---|---|---|---|
| WeekStrip (DOM) | 7 | REWRITE | D7 | 0 | "a day with a session…" reads a className; assert a data attribute |
| builder | 65 | TRIM | D9, D1 | 23 | dead: "an empty design asks for a day…", "a day with no lifts is named as the problem", "a finished design has no problems", "scheme kind toggles carry the reps across…", "switching to the same scheme kind is a no-op", "a note is stored, trimmed and removable", all 6 in "progression is a choice", all 9 in "supersets", "a half-assigned week is reported, not interpreted"; D1 "the library says which lifts are on a bar". Rewrite 7 fixtures without the dead helpers; drop the `isCustomProgram` lines |
| builderLeftovers | 8 | TRIM | D5 | 2 | "sets by reps"; "a lift the library has never heard of is still kept…" |
| catalog | 5 | MERGE → catalogReachable | D9, D4, D5 | 4 | remove the 4 OFFERED_DISCIPLINES / Half-Ironman tests; move "no screen spells the catalogue's size as a word" |
| catalogReachable | 4 | TRIM | D1, D9, D4 | 3 | remove the 3 discipline-vocabulary tests; replace with one test that `Object.keys(DISCIPLINES)` equals the `program_drafts.discipline` CHECK list |
| customize | 43 | REWRITE 1 | — | 0 | "every library entry builds an exercise the wire schema accepts" never calls `CustomScheduleSchema` |
| dayNameRule | 2 | TRIM | D7 | 1 | "each screen can still rename a day…"; also fix line 65 (`if (!/onCommit/.test(context)) return` is a no-op) |
| editActiveProgram (DOM) | 4 | TRIM | D5 | 1 | "Cancel hands the decision back rather than hiding itself" |
| enduranceBlocks.test.ts | 8 | TRIM | D5 | 2 | "and it is told apart from the block beside it"; "the printed blocks add up to what the header claims" (first add a 60 s → "Jog 1 min" case). No overlap with the `.tsx` sibling |
| engine | 114 | TRIM | D9, D2, D1 | 16 | needsInput (2), lastTimePerLift (5), unknownExerciseIds (6), "an entry sent against a running plan is unknown…" (all dead); "the program has sessions to count" (D2); "70.3 brick sessions chain a bike then a run" (D1) |
| enginePhase0 | 42 | TRIM | D9, D5, D1 | 3 | "cannot be logged closed"; "our number says it is ours…"; "the default is what the database actually does today" |
| enrollmentName | 5 | TRIM | D5 | 1 | "does not call a self-built week 'Your own program' once it has a name" |
| liftRows | 27 | TRIM | D5 | 2 | "tells a warm-up set 1 from a working set 1"; "returns the whole list, because the order is stored whole" |
| lifts | 37 | TRIM | D9, D1, D5 | 15 | 13 dead body-group / drop-set / custom-entry tests; "the machines a leg day actually uses are in the pool"; "swapping still offers like-for-like". Rewrite 6 to target the live `freeLiftEntry` |
| liveTouchTargets | 6 | MERGE → trainingTypeFloor | D5, D4, D7 | 5 | the text floor already lives in trainingTypeFloor; the `h-11 w-11` source regexes go; move the `MoreHorizontal` ban |
| liveWorkoutScreen (DOM) | 4 | TRIM | D5 | 1 | "starts the clock on the tick, with the write still on the wire" |
| oneWayToLog | 8 | TRIM | D4, D7 | 4 | "the log route itself is gone…"; "/api/health/workout exports GET and DELETE and no POST"; "TodaySessionWidget, RestTimer and WorkoutLogger do not exist"; "the training screen has three tabs…" |
| programCatalog (DOM) | 6 | TRIM | D7 | 1 | "has no 'View' buttons left to compete with Start" |
| programEditor (DOM) | 11 | TRIM | D7 | 2 | "has no control under 44px"; "has exactly one solid orange control" |
| programNaming | 2 | TRIM | D7, D5 | 1 | "the four surfaces that used to get it wrong now use enrollmentName" |
| programRow (DOM) | 5 | REWRITE | D7 | 0 | drop className assertions; keep tagName, href, nesting |
| programText | 46 | TRIM | D9 | 9 | the 3 + 5 re-applying-text tests (`carryAuthoredSettings` is dead — see Q4 note); "the shipped example parses cleanly" |
| programWeekService | 15 | TRIM | D5 | 3 | "lists the weekdays of a program pinned to them"; "takes a renamed day from the enrollment's own schedule"; "reads week N of M for an endurance plan" |
| runningCopyOf | 11 | DELETE (dead) | D9 | 11 | whole file |
| saveRunningSchedule | 6 | TRIM | D8 | 1 | "null clears the custom week — restoring the catalogue program" |
| schemas | 8 | TRIM | D5 | 2 | "a custom programId with no name is refused, at the name"; "a named custom week is accepted, and the name survives" |
| sessionEdits | 13 | TRIM | D5 | 1 | "is a 409 at the route, not a 500" |
| setEntry | 16 | TRIM | D1 | 1 | "SET_LIMITS' weight ceiling is the column's ceiling" |
| setMenu (DOM) | 11 | TRIM | D7, D5 | 1 | "opens off the number, which is a 44px button and not a caption" |
| setSaveState (DOM) | 13 | TRIM | D5 | 1 | "a queued set that the server later acks is saved, not stuck"; drop the `text-amber-500` line |
| trainingStyles | 3 | TRIM | D1, D4 | 1 | "it can only ever hold class names" |
| trainingTypeFloor | 7 | TRIM | D4 | 1 | "src/programs/components/ui.tsx does not exist and nothing imports it" |
| weekSoFar | 13 | TRIM | D1 | 1 | "says which zone it answered in, so a reader can tell" |
| workoutSchemas | 10 | TRIM | D1 | 3 | "does not require one — every live workout starts now"; "may name the kind and the distance"; "takes null as 'clear the distance'" |
| workoutVanished (DOM) | 9 | TRIM | D5, D9 | 2 | "shows the server's sentence as written…"; "a refresh that finds nothing open says so…" |

Dead product code found (Q4): 11 exports in `src/programs/builder.ts`, 5 in
`src/programs/data/exerciseLibrary.ts`, `runningCopyOf`, `sameWeek`, `needsInput`,
`lastTimePerLift`, `unknownExerciseIds` in `programsService.ts`;
`OFFERED_DISCIPLINES`, `programsByDiscipline`; `isCustomProgram`;
`useLiveWorkout.refresh`. **Two decisions before deleting:** `carryAuthoredSettings`
may be a live bug rather than dead code (its comment says re-applying text unpins
weekdays); and the dead `sameWeek` disagrees with the live `customize.sameWeek` —
decide which is right first.

## WP-U4 — tests/unit/timetrack and tests/unit/vice

KEEP unchanged (timetrack): aChangeInsideAnObjectIsAChange,
aCloneDoesNotStealItsTemplatesIds, aDayTotalsTheSecondsItTracked,
aRefusalTheBrowserCannotMatch, aRestoreAsksBeforeItDeletes,
anApprovalLocksItsOwnMembersWeek, calendarFetch, deletingAThingStopsItCreatingEntries,
editsReachTheRunningEntry, findingAProject, importExportService, importOfferBanner,
networkGuard, nothingHappensUntilYouAskForIt, oneLinkCannotArriveTwice,
oneNightShiftCountedOnce, stateMigration, stateUpdateSafety, syncRetry,
theSheetKeepsTheTimeYouTyped, timetrackFormatService, timetrackPaging.
KEEP unchanged (vice): blackboxChart, blackboxCorrections, storageClaimIsTrue,
testimonialVices, viceComponentCopy, viceSyncService, wordBudget.

| file | tests | verdict | rules | cut | tests to remove |
|---|---|---|---|---|---|
| timetrack/aCsvImportSurvivesItsWorstRow | 7 | TRIM | D5 | 1 | "returns a result at all, where it used to throw past its caller" |
| timetrack/aProjectTheDatabaseWouldRefuse | 8 | TRIM | D4 | 1 | "is the database's, not a remembered version of it" (or rewrite to scan every migration) |
| timetrack/aPullDoesNotUndoWhatYouJustDid (DOM) | 6 | REWRITE | D7 | 0 | ~9.1 s of real `setTimeout` sleeps → fake timers, as syncRetry does |
| timetrack/anAddressTheDatabaseRefuses | 6 | REWRITE | D2 | 0 | "the pattern is the database's own" tests a hand copy; parse it from the migration |
| timetrack/anEntryCannotEndBeforeItStarts | 16 | TRIM | D5, D4, D7 | 2 | "undo of a displacement still resumes the entry it stopped"; "the migration still says what this rule assumes it says" |
| timetrack/anOldRecurringMeetingStillImports | 24 | TRIM + SPLIT | D2, D5 | 3 | "there are enough shapes for this to mean anything"; "and every instance it returns is inside the window"; "still lands on the weekdays it names, however old it is". See Phase 6 for the split |
| timetrack/calendarService | 40 | TRIM | D1, D5 | 4 | "only the title is copied, exactly like Toggl"; "day column total sums the visible portion"; "and the usual order still works"; "and an event that genuinely has no length is still reported as such" |
| timetrack/demoDataService | 8 | TRIM | D1, D5 | 1 | "only the old seeded rows count as sample data" |
| timetrack/enterCommitsEscapeDiscards (DOM) | 6 | TRIM | D5 | 1 | "Escape throws it away" |
| timetrack/everyProjectPeriodIsReachableOnce | 10 | TRIM | D5 | 3 | "every step lands on a different month"; "February is reachable, which it was not"; "each period ends the day before the next one starts" |
| timetrack/everyScreenAgreesAboutOneNightShift | 16 | TRIM | D5 | 1 | "and they add up to the shift, which is the whole claim" — keep the 400 ms performance bound |
| timetrack/projectsEmptyState | 10 | REWRITE | D7 | 0 | assert the tab and the action words, not three exact sentences |
| timetrack/reportsService | 41 | TRIM | D2, D1, D5 | 2 | "the table covers both verdicts, or neither test above asserts anything"; "the ceiling and the window in the reasons are the exported constants" |
| timetrack/statefulPickers (DOM) | 10 | REWRITE | D7 | 0 | `pointerRow` selects by Tailwind classes; use a test id |
| timetrack/sync | 41 | TRIM | D7 | 1 | "it returns a new object, so the queue can still tell what it sent" — keep every mergeIncoming test (only cover) |
| timetrack/syncAdoption (DOM) | 5 | TRIM | D5 | 1 | "and it still says it is saved, rather than sitting on 'starting'" |
| timetrack/theSizeTripwireMeansSomething | 2 | DELETE | D1 | 2 | whole file |
| timetrack/timetrackMapper | 17 | TRIM | D5 | 1 | "a genuinely empty payload still gives an empty workspace" |
| timetrack/timetrackService | 48 | TRIM | D5 | 1 | "no hour is counted twice" |
| timetrack/twelveHourTimesSurviveBeingEdited (DOM) | 8 | TRIM | D5, D2 | 1 | "and do not depend on today's date, so a clock change cannot move them" |
| vice/again | 9 | MERGE → viceCopyLint | D1, D7 | 9 | whole file; move "never answers with try harder" and "obeys the module's language rules" into the lint |
| vice/blackboxMeaning | 7 | TRIM | D1 | 2 | "accents exactly one family"; "accents the good stretch, not the bad night" |
| vice/blackboxService | 16 | TRIM | D5 | 1 | "has no span to draw when nothing has been recorded" |
| vice/blackboxStore | 25 | TRIM | D5, D7 | 5 | "never mentions the old key anywhere in the store"; "exports and imports back to the same record"; "still accepts a record this app wrote"; "survives export and import like any other row"; "does not become the live run" — **keep** "uses its own key" (persisted storage key) |
| vice/helpDoorReachable (DOM) | 10 | REWRITE | D6 | 0 | `if (!specific) return`; assert the service exists instead |
| vice/helpFreshness | 7 | TRIM | D5, D1 | 3 | "carries a verification date that parses as a real day"; "shows the date to the person reading it…"; "covers the regions the door offers…". **Time bomb:** the 90-day test turns `npm test` red on 2026-12-24 with no code change — move it to a scheduled CI job (Q12) |
| vice/modules | 11 | TRIM | D1, D7 | 9 | 5 copy pins, 3 order/count pins; move "has no controlling language…" to viceCopyLint |
| vice/researchIsShipped | 13 | TRIM | D7, D6 | 1 | "puts something in front of a first-time user mid-urge…" |
| vice/shortlist | 8 | TRIM | D7, D1 | 6 | the 4 source/copy regexes, "marks the items that only hold when somebody else controls them"; move "obeys the module's language rules" to viceCopyLint |
| vice/testimonials | 17 | TRIM | D7 | 2 | "says so on the page about survivorship bias"; move "keeps controlling language … framing copy" to viceCopyLint |
| vice/urgeResponses | 5 | TRIM | D5 | 1 | "keeps watching last, and keeps it" |
| vice/versions | 19 | TRIM | D1, D7, D4, D5 | 14 | everything except "has a default that exists…", the two word-budget tests and the two "routes every … somewhere real" |
| vice/viceCopyLint | 13 | TRIM | D7, D1, D3 | 3 | "keeps the standing line on the urge tool free of any demand"; "runs the mission sequence from day one with no gaps and no repeats"; "names a source for the steps that reproduce published material" — it absorbs 5 merged checks |
| vice/viceService | 88 | TRIM | D4, D1 | 2 | "every step kind in every flow has a renderer branch and a done rule"; "uses hazard days drawn from the reported windows rather than round numbers". **Q3:** 83 of its 88 tests exercise functions only `/test/archive/quit-vice` imports; with the archive treated as frozen, ~110 more vice tests go (move the 5 `planProblem` tests next to HelpDoor first) |
| vice/voicesRendering (DOM) | 3 | REWRITE | D6 | 0 | ~400–500 jsdom renders; dedupe by testimonial id; remove the two `if (...) return` guards |

## WP-U5 — tests/unit/db, tests/unit/tracking, tests/unit/health

`tests/helpers/fakeSupabase.ts` is a real in-memory query engine, not a mock echo.
Its blind spots: `.not()` ignores everything except `is null`, select column lists
are ignored, no constraints or row security, `rpc` only records. Twenty files
hand-roll chains with no-op `eq`/`order` instead — those cannot see a dropped
`user_id` filter.

KEEP unchanged (db): aRefusedRowIsNamedInAWayTheBrowserCanMatch, authCookies,
backdatedSession, correctionKeepsItsOrder, correctionStaleRead,
correctionWorkoutGone, deleteOpenWorkout, goalProgress, isolatingARefusedRow,
lifePlanDayRepo, linkedMetrics (collapse to `it.each`), oneClockDecidesWhatSinceMeans,
paging, programRepoGuards, programRepoRetryable, reTickKeepsItsTime, schemaMirror
(until Phase 7 retires the mirror), staleSessionCookie,
thePushRouteCapsWhatItAccepts, theWriteOrderRespectsTheForeignKeys,
timetrackBackup, todaysSetsCarryTheirLift, updateSet, workoutRepoStart.
KEEP (tracking): dashboardService, metricSourceFailure, metricUnavailable,
milestoneRules, rollTrackingCounters. KEEP (health): collapseSets,
describeSessionRow, oneLiftTwoNames, personalRecords, progressReads, volumeRule,
workoutHistoryPaging.

| file | tests | verdict | rules | cut | tests to remove |
|---|---|---|---|---|---|
| db/auditRlsExpectations | 3 | TRIM | D7 | 1 | "the audit script reads this list rather than keeping its own copy" |
| db/goalEnums | 28 | TRIM | D1, D5, D9 | 26 | all 7 "const arrays", all 10 "Zod schemas", all 7 "type guards", "CATEGORY_LABELS has entry for every…", "CATEGORY_ORDER has same length…" — **keep** "CATEGORY_ORDER contains every…" and "no duplicates" (the compile check is defeated by an `as` cast) |
| db/goalPeriods | 4 | TRIM | D5, D2 | 2 | "custom is not a rolling period…"; "dateUtils' GoalPeriod is exactly the rolling set" |
| db/goalSchemas | 29 | TRIM | D1, D4 | 17 | create: "accepts full payload…", "rejects invalid goal_type", "rejects invalid display_category", "rejects missing title", "rejects missing target_value"; all 6 UpdateGoalSchema tests; batch: "accepts goals with life_area but no category (no refine)", "accepts goals with _tempParentId", "rejects missing _tempId", "rejects goal with invalid goal_type in batch"; both "error messages include field names" |
| db/goalTypes | 19 | TRIM | D2, D5, D1 | 11 | the 5 progress cases (covered by goalProgress); is_complete "true when exceeds"; "should return positive number for future date"; "should preserve all original goal fields"; the 3 DailyGoalSnapshotInsert tests |
| db/lastSetsForLifts | 7 | TRIM | D8 | 1 | "asks for finished workouts only, newest first, with a tie-break and a bound" → replace with a shared-fake test where an open workout is excluded |
| db/lifePlanRepo | 14 | TRIM | D8 | 1 | "hands back the new revision the function returned" |
| db/pagingSortsBySomethingUnique | 2 | TRIM | D2 | 1 | "would notice a single-column sort on a composite table" |
| db/removeProgramSessionGuard | 5 | TRIM | D7 | 1 | "refuses before reading the enrollment, not after" |
| db/sessionSummaryTransform | 13 | TRIM | D1, D3, D5 | 7 | "should transform session with all fields"; "should handle null fields"; "should handle empty approaches array"; "should transform milestones to achievements with full info"; "should handle empty milestones array"; both "N+1 query fix validation" tests |
| db/setsInWorkoutOrder | 7 | TRIM | D4, D5 | 1 | "stays where it was done, not where it was last edited" |
| db/trackingEnums | 26 | TRIM | D1, D9 | 24 | all 6 count pins, all 12 Zod schema tests, all 6 type guards — keep the 2 config exhaustiveness tests. Before cutting: if the owner wants tracking enums tied to their CHECK constraints, extend `enumConstraintSync` first |
| db/viceRepo | 15 | TRIM | D4, D9 | 3 | "sends nothing at all when there is nothing to send"; "is false for an account with no runs…"; "does not count another account's runs" (`accountHasViceRows` has no caller) |
| db/workoutGone | 16 | TRIM | D5, D7 | 2 | "the database's own sentence never reaches the caller"; "the second question is actually asked…" |
| db/workoutRepoFinish | 19 | TRIM | D5 | 1 | "personal bests are judged from the EDITED start, not from today" (the idempotency tests are real — keep) |
| tracking/achievementsService | 39 | TRIM | D4, D5 | 2 | "running it twice on the same rows gives the same answer"; "deleting rows lowers the counters…" |
| tracking/counterRules | 11 | TRIM | D1, D5 | 2 | "zeroes every weekly counter, not a subset"; "covers sessions, approaches, numbers, instadates and field reports" |
| tracking/counterShapes | 5 | REWRITE | D6 | 0 | in "shows the streak throughout the week after…", `weekAfter` is always empty; assert next Monday's week shows 4, then 0 |
| tracking/customReportConfig | 21 | TRIM | D1, D3, D4, D7, D9 | 16 | "at least 50 fields"; the 3 typed-property checks; "usedIn should be an array…"; 2 CATEGORY_INFO checks; "valid Tailwind color names"; the 4 SUGGESTED_FIELD_IDS tests (dead); "all FIELD_LIBRARY categories should have CATEGORY_INFO"; "POST_SESSION_MOOD defined"; "reserved prefix"; "all SESSION_IMPORT_FIELD_IDS unique" |
| tracking/goalTotalTile | 6 | TRIM | D4 | 1 | "never touches the goal itself…" |
| tracking/metricCatalog | 15 | TRIM | D1 | 1 | "defaults are the four tiles the dashboard shipped with, in order" |
| tracking/metricsService | 35 | TRIM | D5 | 1 | the verbatim duplicate "a goal with no target is still trackable, just without a percentage" |
| tracking/milestones | 14 | TRIM | D1, D4, D5 | 4 | "tiers run bronze to diamond…"; "every category holds at least one badge"; "every badge is filed under a category that is offered as a filter"; "every badge has a rule that can award it" |
| tracking/reconcileUserProgress | 10 | TRIM | D8, D5, D7 | 3 | "running it again awards nothing and changes no date"; "a quiet reconcile reads the history once…"; "deleting rows lowers the counters and takes no badge away" |
| tracking/schemas | 104 | TRIM | D1, D2, D5 | 56 | all 7 enum-block tests; 2 CreateSession, 3 UpdateSession, 8 CreateApproach, 6 UpdateApproach "should accept…", 10 CreateFieldReport, 9 CreateReview declaration restatements; all 10 "type shape" tests. Keep the 48 bound/refine/default tests (convert to tables). Add the missing future-timestamp refine test |
| tracking/sessionImportHelpers | 27 | TRIM | D1, D5, D7 | 10 | mood 1–5 emoji ×5; "neutral emoji for mood 6"; "negative value"; "true when multiple context fields are set"; "false for large approach count (50)"; "COLLAPSE_THRESHOLD should be defined as 5" |
| tracking/streakDecay | 16 | TRIM | D4 | 1 | "keeps a live streak alive" (expected value computed on the real clock) |
| tracking/trackingDisplayService | 16 | TRIM | D1, D7, D9 | 14 | known outcome label and emoji; both getOutcomeColor; getSetTypeLabel ×2, getSetTypeEmoji ×2, isUnknownOutcome ×3, isUnknownSetType ×3 — keep the two unknown fallbacks |
| tracking/trackingService | 31 | TRIM | D4, D9 | 21 | estimateMinutes "text", "select", "multiselect", "scale", "number", "unknown default", "rounds to nearest minute"; all 7 getConversationText and 7 getConversationAudioUrl (dead) |
| tracking/useSession (DOM) | 8 | TRIM | D7 | 1 | "does not re-read sessionStorage when pageshow event fires with persisted=false"; replace the other test's 100 ms sleep with `waitFor` |
| tracking/voiceLanguage | 12 | TRIM | D1, D3 | 8 | "at least 5 languages"; "every entry has code, label, whisperLang"; "includes English (US)"; "includes Danish"; "contains all codes"; "is en-US"; "returns label for valid code"; "returns whisper language for valid code" |
| health/exerciseMax | 4 | REWRITE | D5 | 0 | `tileEstimate` is a test-local copy; drive `getExerciseMax` and `liftBests` on the same rows through the shared fake |
| health/healthService | 31 | TRIM | D9 | 6 | buildWorkoutHeatmapWeeks ×2, computeWeekStreak ×4 (no caller; drop from progressReads' ALLOWED if the code goes) |
| health/personalBestBaseline | 6 | TRIM | D5 | 1 | "the sets are asked for in pages" |
| health/trainingSettings | 3 | TRIM | D4, D5 | 1 | "writes the column defaults rather than null…" |
| health/workoutDate | 15 | TRIM | D5, D2 | 1 | "accepts a date, accepts a date and time, refuses a bare time" |
| health/workoutPaging | 6 | TRIM | D4, D5, D7 | 4 | "the sets are read in pages…"; "a history that exactly fills a page still asks once more"; "the warm-up stays ahead of the working set…"; "a small history is read in a single request" |
| health/workoutSetSchema | 7 | DELETE (dead) | D9 | 7 | whole file; `WorkoutSetSchema` has no importer |
| health/workoutsByLocalDate | 7 | TRIM | D1 | 2 | both "which step a session ticks" tests |

## WP-U6 — everything else in tests/unit

Out of scope: `architecture.test.ts` and `architecture/*` (being deleted by a peer),
`docs/knownFailuresWired` and `hooks/testGate` (already deleted by a peer).

KEEP unchanged: docs/instructionBudget (its MEMORY.md test is a no-op wherever the
home-dir file is missing — note, not cut), docs/instructionInvariants,
docs/planConceptCheck, hooks/hookCommandPaths, hooks/neverHook,
navigation/returnTo, navigation/routeConstantsResolve, navigation/sweepDebt,
navigation/tabBarCurrent, navigation/testRoutesSealed, pipeline/ingestQaScreen,
profile/regionList, profile/saveDatingPreferences (only cover for two write
functions), pwa/installAssets, scenario-engine/extract, settings/clockSync,
shared/errorScrub, shared/historyBarrier, shared/periodEquivalence,
shared/safeRedirect, shared/staleWorkerCleanup, shared/typedNumber,
shared/useLoad, e2e-isolation (until Phase 8/9 rewrite it), lintRatchet,
trainingSpecsGuarded, writeCoverage.

| file | tests | verdict | rules | cut | tests to remove |
|---|---|---|---|---|---|
| articles/articlesService | 22 | TRIM | D1, D7 | 5 | pillar `test.each`; "exactly 4 pillar entries"; "should build prompt without style guide"; "…all feedback type explanations"; "…quality standards" |
| articles/feedbackEnum | 12 | DELETE | D1, D9, D5 | 12 | whole file |
| articles/feedbackFlags | 10 | DELETE | D2 | 10 | whole file (defines its own `addFlag`; calls no production code) |
| articles/schemas | 53 | TRIM | D1, D5 | 15 | FeedbackType accept/reject; PhaseAction ×3; "rejects contract with missing title"; "accepts section with notes"; flag ×2; LearningSuggestion ×3; AnalyzeComments "rejects flags with invalid type"; Approve "rejects malformed suggestion in array"; "accepts valid suggestion". 38 bound/refine/path-traversal tests stay. **Q3:** the whole articles slice backs only `/test` and `/api/test` pages |
| auth/autocomplete | 2 | REWRITE | D7 | 0 | render the 4 auth forms and assert the inputs' `autocomplete` attributes, instead of source `toContain` |
| dashboard/dashboardViewer | 5 | REWRITE | D7, D1 | 0 | asserts an exact code line; replace with pure `unlockHref` / `toDashboardProfile` tests |
| infra/localDeploy | 7 | TRIM | D6, D7 | 2 | "run-local.sh still proves the loopback rule…"; "the production Caddyfile, once it exists…" |
| inner-game/progressUtils | 30 | TRIM | D9 | 20 | calculateCompletionPercentage, getResumeStep, canNavigateToStep (no product caller) — **keep** the enum-numbering test (persisted step numbers) |
| inner-game/schemas | 45 | TRIM | D1, D5 | 37 | everything except the 8 bound tests ("substep 0-10", "below 0", "above 10", "non-integer", and the four 10/5000-character length bounds) |
| inner-game/valueCutting | 64 | TRIM | D9, D1, D5 | 45 | 36 tests of 10 unused pairwise/tournament functions; getAspirationalDefault ×4; 4 single-source getValueSource tests; "should format display names correctly" |
| navigation/backNavigation | 4 | TRIM | D5 | 1 | "has routes to check" |
| navigation/lifeMasteryRoutes | 8 | TRIM | D1, D7 | 3 | "keeps the Black Box and the retired module at two different addresses"; "has a page for every vice step…"; "keeps the old address working" (replace with a redirect assertion) |
| navigation/routeReachability | 7 | TRIM | D4, D5 | 2 | "a route linked only from an orphan is still an orphan"; "the /test-link allowlist only shrinks" |
| navigation/tabBarDestinations | 3 | TRIM | D1 | 1 | "the live workout screen opts out in writing…" |
| profile/levelProgressBar (DOM) | 5 | TRIM | D7 | 1 | "keeps the crown and the gauge…" |
| profile/loginDestination | 5 | TRIM | D5, D7 | 2 | "a brand-new account with no profile row…"; "does not read the profile at all…" |
| profile/onboardingPrefill | 16 | TRIM | D4 | 1 | "looks only at the three answers…" |
| profile/profileService | 34 | TRIM | D1, D5 | 7 | "nullify tertiary when secondary is nullified…"; "both are NaN"; the valid-region `test.each`; ProfileServiceError ×4 |
| profile/regionListCallers (DOM) | 4 | TRIM | D5 | 1 | "names every region rather than showing a database id" |
| qa/confidence | 33 | TRIM | D4, D5 | 7 | "clamp score to maximum 1.0"; "minimum 0.0"; getConfidenceLabel 0.85, 1.0, 0.5, 0, 0.1 |
| qa/prompt | 35 | TRIM | D4 | 3 | "should return trimmed question"; "should handle empty string"; "should preserve internal whitespace" |
| qa/qaServiceHelpers | 32 | TRIM | D1, D3, D4 | 16 | createNoContextResponse ×8; chunksToSources ×5 (identity map — the "get and set DTO" case); getDefaultModel ×3 |
| qa/schemas | 34 | TRIM | D1 | 13 | "reject missing question"; "special characters"; "unicode"; "newlines"; "valid retrieval options"; "empty retrieval object"; "valid generation options"; "empty generation object"; "all valid provider values"; "reject invalid provider"; "any string for model"; "full valid request"; "partial options" |
| scenarios/difficulty | 15 | TRIM | D5, D1 | 4 | levels 0 and 100 (interior points); "has all 5 levels" — keep "receptiveness values in decreasing order" |
| scenarios/keepitgoing | 41 | TRIM | D1, D3 | 10 | the 4 "Rubric Tag Effects"; the 4 "Score-to-Interest Delta"; "exitRisk max is 4"; "falls back to seed-based random when situationId not found" |
| settings/difficultyEnum | 14 | TRIM | D1 | 12 | everything except "covers every value in DIFFICULTY_LEVELS" and "has same count…" |
| settings/settingsToggles (DOM) | 9 | TRIM | D5 | 1 | "only the changed key is sent…" (7.1 s file) |
| settings/timezoneSource | 6 | TRIM | D8, D5 | 1 | "records a detected zone only when told to" |
| shared/bottomSheet (DOM) | 4 | TRIM | D7 | 1 | "the tab bar uses the shared sheet instead of its own copy" |
| shared/buttonVariants | 2 | TRIM | D7 | 1 | "the variants this phase did not touch are unchanged" — keep the outline/ghost bug test |
| shared/dateUtils | 24 | TRIM | D5, D3 | 2 | "returns YYYY-MM-DD format"; "returns a Date object" |
| shared/draftInput (DOM) | 8 | DELETE (dead) | D9 | 8 | with `components/ui/draft-input.tsx`; update dayNameRule's "Use DraftInput" message |
| shared/fontStack | 5 | TRIM | D5 | 1 | "the mono stack is the one that names the mono stand-in" |
| shared/offlineShell (DOM) | 6 | REWRITE 1 | D4 | 0 | "a failed registration is reported" passes through the no-build-id branch; stub `NEXT_PUBLIC_BUILD_ID` |
| shared/passwordRules | 8 | TRIM | D1 | 1 | "exports the minimum…" |
| shared/phoneInputZoom | 2 | TRIM | D7 | 1 | "the nine boxes the app makes large…" |
| shared/serviceWorker | 22 | TRIM | D5 | 2 | "install stores the scripts the shell page names…"; "signing in empties the store…" |
| shared/stepper (DOM) | 4 | DELETE (dead) | D9 | 4 | with `components/ui/stepper.tsx` |
| shared/streakRuns | 9 | TRIM | D5 | 1 | "does not hide a run that is over" |
| shared/touchTargets | 2 | REWRITE | D7 | 0 | use `buttonVariants({size})` instead of slicing button.tsx by `indexOf` |
| shared/weight | 9 | TRIM | D1, D5 | 1 | "matches what the column can actually hold" |
| ciWorkflows | 6 | TRIM | D7 | 1 | "the database tests are a CI step" (rewritten wholesale in Phase 9) |

Slow, and fixed by memoising rather than cutting: writeCoverage (7.4 s,
`writeFunctions()` run 4×), routeReachability (5.2 s, `benchLinkers` 3×),
settingsToggles (7.1 s). Eight files each re-implement a source-tree walker that
`tests/support/appRoutes.ts` already provides.

---

## WP-I — tests/integration (database suite)

**0 of 300 tests call a `src/db` repo function.** 5 call a production TypeScript
function (lifePlanRoundTrip), 19 call database functions through SQL, 266 (89 %)
run SQL the test wrote itself.

| file | tests | verdict | rules | cut | notes |
|---|---|---|---|---|---|
| embeddingsRepo | 7 | DELETE | D8, D4, D2 | 7 | copies `storeEmbeddings` in SQL; the mirror column is `double precision[]`, not `vector` |
| enumConstraintSync | 8 | TRIM | D3, D7 | 1 | remove "can query CHECK constraints"; match on the constraint's column, not `def.includes(column)` (:86); extend to every CHECK-backed enum |
| finishWorkoutTimes | 6 | TRIM | D5, D3 | 1 | remove "a second finish…refused" (= workoutFinish:101); name the constraint in the bare `rejects.toThrow()` at :236, :292 |
| goalRepo | 22 | TRIM | D1, D2, D4, D5, D3 | 19 | keep 2.1e (name the FK) and 2.2b; **add** the two untested partial uniques `uq_user_goals_template` / `linked_metric` |
| innerGameProgressRepo | 16 | DELETE (keep 1) | D1, D2, D4, D3 | 14 | keep "one per user" (name it); fold the cascade into the catalog test |
| lifeAnswers | 8 | KEEP, trim 1, rewrite 1 | D1, D4 | 1 | remove "accepts an ordinary answer"; "delete own rows" must run through `asUser`; fix 7 leaked connections |
| lifePlanDay | 10 | TRIM | D4, D8 | 2 | the two "two devices" tests run their own `ON CONFLICT`, not `saveDay` |
| lifePlanRoundTrip | 5 | KEEP 3, MOVE 1, REWRITE 1 | D8, D6 | 0 | `set_config('test.uid',…,true)` at :153, :181, :205, :270 does nothing; the year test is ~6,570 serial inserts |
| milestoneAwarding | 5 | TRIM | D5 | 1 | "re-awarding never rewrites the day" |
| pagedReadsOrderUniquely | 3 | KEEP | — | 0 | fix the leaked client at :245 |
| profilesRepo | 11 | DELETE | D1, D2, D4 | 11 | INSERT then SELECT the same row |
| programBusy | 4 | MERGE → programRepo | D5 | 1 | remove "ending…nothing open works" |
| programDrafts | 13 | KEEP, trim 1, rewrite 1 | D2, D6 | 1 | remove "keeps a week you save"; the `updated_at` test uses `>=` (:261) — seed an old value |
| programRepo | 21 | TRIM | D4, D5, D1, D3 | 4 | "is_active keeps sessions"; "erasing keeps workouts"; "many finished runs"; "custom_schedule null"; name the constraints at :168, :214, :231, :264 |
| scenarioRepo | 7 | DELETE | D2, D4, D8, D3 | 7 | aggregates written in the test's own SQL |
| settingsRepo | 23 | TRIM | D1, D2, D3, D4, D5, D8 | 15 | keep the 4 CHECK refusals (name them) and the 3 signup tests — but those run a pasted copy of `handle_new_user` (:630); test the real one |
| setup.integration | 5 | DELETE | D1, D2 | 5 | harness self-tests; replace with the isolation proof |
| trackingRepo | 71 | DELETE (fold 3) | D2, D4, D8, D5, D3 | 68 | "Simulate endSession logic"; `if (sessionCount === 10)` in the test; "ownership" is the test's own WHERE |
| valueComparisonRepo | 18 | DELETE (fold 2) | D2, D4, D3 | 16 | describes named after repo functions they never call; `WHERE 1=0` (:148) |
| valuesRepo | 13 | TRIM | D2, D4, D5, D3 | 10 | keep unique `(user_id, value_id)` (name it) and the value→user_values cascade |
| workoutFinish | 4 | KEEP | — | 0 | row lock, row-security-hidden finish, NUMERIC ceiling; asserts SQLSTATE |
| workoutSchema | 20 | KEEP, trim 1, rewrite 1 | D1, D4 | 1 | remove "program_session_logs no longer exists"; "set corrected in place" runs as owner, so the UPDATE policy is never tested |

Totals: remove 185, fold 9 into one catalog test ("every user-owned table cascades
from the user, except a named list"), move 1 to unit, keep 105 — about 30 of which
need a sharper assertion (12 bare `rejects.toThrow()`, 4 no-op `set_config`, 3
owner-run "policy" tests, 3 tests of the pasted trigger, 1 `>=`, 7 substring
matches).

Missing tests found: the two `user_goals` partial uniques; `claim_beta_slot` (no
test; programDrafts' header cites "beta-invite tests" that do not exist); row
security on any `src/db` read path; the 29 live tables absent from the mirror
(19 timetrack, 4 health logs, 2 vice, `dashboard_widgets`, `embeddings_test`,
`error_reports`, `life_chapters`).

First repo-level tests to write in Phase 7: trackingRepo `getSessionSummaries`,
`insertMilestones`, field reports, custom-template ownership, and `endSession`
(`src/tracking/trackingService.ts:145`); `getScenarioStats`; `listValues`'
display-name fallback; `resetProgress`; `updateTimezone`; `saveDay` + `readDayRows`
paging; `storeEmbeddings` + `match_embeddings`.

---

## WP-E — tests/e2e (browser suite)

Account key: **A** = TEST_USER, **B** = TEST_USER_B, **T** = training account,
**none** = signed out. "Runs" = tests × projects per pass today.

### Delete (targets a page that does not exist where CI runs, or proves nothing)

| spec | tests | runs | rules | evidence |
|---|---|---|---|---|
| articles | 6 | 6 | D3, D1 | heading visibility; route-sweep already renders it |
| cross-browser/auth-flows | 7 | 14 | D3, D4, D5, D9 | expects `/dashboard/goals` after `/test/archive` |
| cross-browser/goals-cross | 7 | 14 | D9 | archived goals hub and goal setup |
| cross-browser/no-overflow | 7 | 14 | D5, D9, D7 | same check as route-sweep; includes a `/test` page |
| cross-browser/scenarios-cross | 3 | 6 | D3, D4, D5 | "back works" is a plain `goto` |
| cross-browser/stepped-flow-back | 4 | 8 | D9 | `/test/life-direction`; every caller is a lab page |
| cross-browser/tracking-cross | 7 | 14 | D3, D5, D6 | page-load checks; filter test asserts nothing |
| form-errors | 9 | 9 | D4, D5, D6, D7 | "on login OR error shown" |
| goals-data-consistency | 4 | 4 | D9, D6, D5 | archived hub; the API halves move to goalRepo integration |
| goals-hub | 8 | 24 | D9 | `/test/archive/goals-hub` |
| goals-tour | 4 | 4 | D9, D7 | `/test/archive/goal-setup`; 18 sleeps |
| integration/goals-tracking-flow | 3 | 3 | D9, D3, D5 | archived hub |
| mobile/mobile-goals | 7 | 14 | D9 | all `/test/archive` |
| mobile/mobile-scenarios | 3 | 6 | D3, D4, D5 | covered by sweep-phone |
| mobile/mobile-tracking | 6 | 12 | D3, D5, D6 | covered by route-sweep |
| quit-vice | 60 | 60 | D9 | `/test/archive/quit-vice`; keep a 1–3 test lab smoke for local runs only if Q3 keeps the lab; move the Vices-routine test |
| security-input | 20 | 20 | D4, D6 | `[200,201,400].toContain`; demote the 3 real 400 checks to a validator unit test |
| start-session | 1 | 1 | D5 | identical to session-tracking "start, counter 0" |
| variant-a-v4-smoke, variant-b-smoke, variant-d-smoke | 22 | 22 | D9 | `/test/goalsv4` prototypes |
| vision-plan | 3 | 3 | D9, D6 | lab page; 2 suites permanently skipped; 300 s model download |
| weekly-review | 5 | 5 | D3, D4 | back-link wait already matches the start URL |

Also delete: the 8 tracked PNGs in `tests/e2e/screenshots/` (and 8 untracked
variant PNGs), `tests/e2e/CONTINUATION_PROMPT.md` (stale February hand-off),
helpers `goals.helper.ts`, `viewport.helper.ts` and `navigation.helper`'s
`goToGoals`.

### Rewrite, trim, merge, demote

| spec | tests | runs now | verdict | what changes |
|---|---|---|---|---|
| approach-logging, data-persistence, session-tracking | 6 + 4 + 13 | 6 + 4 + 39 | MERGE → one tracking-session spec (6 desktop + 1 phone) | outcome/mood/tags actually verified; no Tailwind-class assertions |
| auth-errors | 5 | 5 | TRIM | move the 401 test to error-handling; delete the other 4 |
| auth.spec | 5 | 5 | TRIM to 2 | invalid credentials + logout, on a throwaway logout account |
| blackbox | 27 | 27 | TRIM | delete the archive test (:393); demote 4 form-validation tests to component tests; mint UUIDs per run (fixed ids at :167, :226-229, :612-615, :646, :921 collide across accounts) |
| cold-open-signed-out | 7 | 7 | KEEP | demote its ratchet test to unit |
| custom-report-builder | 24 | 24 | REWRITE to 2 | save-and-verify; today's save assertion matches the start URL |
| dashboard-navigation | 8 | 24 | TRIM to 1 desktop | settings test accepts a login redirect |
| dating-preferences-gate | 6 | 6 | TRIM to 2 | "holds the save" asserts submit is enabled |
| deadControls | 10 | 10 | TRIM to the Black Box test | 9 of 10 drive `/test/archive/quit-vice` |
| error-handling | 6 | 6 | TRIM to 3 + the 401 test | demote the 35 s timeout test |
| error-reporting | 4 | 4 | REWRITE | 3 tests need a crash trigger outside `/test/crash`; demote the flood test |
| field-report | 27 | 81 | REWRITE to 4 desktop | save assertion is a tautology; ~15 if-visible branches |
| health-past-workout | 2 | 2 | DEMOTE | to workoutFinish / workoutSchema integration |
| inner-game-flow | 5 | 5 | TRIM to 1 | start-or-signup either/or |
| life-mastery-day-persists | 4 | 8 | TRIM | runs twice (missing from chromium's testIgnore); demote the 2099 test |
| life-mastery-track | 4 | 4 | KEEP | seed its own "foreign" goal |
| mobile/mobile-life-mastery-day | 1 | 1 | KEEP | poll instead of the 8 s sleep |
| mobile/mobile-navigation | 3 | 3 | TRIM to 1 | |
| mobile/mobile-toggl | 19 | 57 | REWRITE route; one phone project | mobile-iphone and toggl-iphone are the same device |
| mobile/mobile-training | 5 | 15 | TRIM | demote t4 (API only); t5 claims touch targets but asserts visibility |
| one-thing | 7 | 7 | TRIM | demote the 2 request-only tests |
| password-reset | 9 | 45 | TRIM | delete the enumeration test; Chromium + iPhone only |
| programs-drafts | 1 | 1 | DEMOTE | to programDrafts integration |
| programs-history-progress | 9 | 9 | KEEP | replace 3 s sleeps with polls; stop writing screenshots |
| programs-live-workout | 13 | 52 | TRIM | demote 3 API-only tests; only 4 engine-sensitive tests off Chromium |
| protected-routes | 5 | 5 | TRIM to 1 table-driven redirect test | |
| qa-chat | 6 | 6 | TRIM to 1 with a stubbed `/api/qa` | all 6 skip today: `/dashboard/qa` needs `has_purchased`, which no code writes |
| scenarios-hub | 6 | 18 | TRIM to 1 | |
| security-auth | 6 | 6 | TRIM to 2 | absorb the timetrack 401 test; remove hardcoded `localhost:3000` (:48) |
| security-idor + security-rls | 6 + 5 | 11 | MERGE → security-idor (API only) | remove the 11 skips-if-B-missing; stop accepting 500 |
| settings | 9 | 9 | TRIM to 2 | toggle test asserts nothing |
| signup-flow | 6 | 30 | TRIM to 4 | Chromium + iPhone |
| smoke | 5 | 25 | TRIM to redirect + font | `/test` 404s on 5 projects |
| sweep/cold-open, junk-params, route-sweep | 20 + 6 + 30 | 168 | KEEP | desktop + phone on PRs, WebKit nightly; fix junk-params' `/programs` case (zero navigations); demote the ratchets |
| timetrack-edge-cases, timetrack-sync | 4 + 9 | 26 | REWRITE to `/dashboard/time` | 23 sleeps (54.4 s in timetrack-sync alone); move the 401 test to security-auth |
| toggl-time-tracker | 16 | 48 | REWRITE route | Chromium for all; engine subset nightly |
| tracking-dashboard | 9 | 27 | TRIM to 2 | 4 achievement tests pass when there are none |
| tracking-history | 5 | 5 | REWRITE to 3 with a seeded report | deletes the FIRST report on the account |
| tracking-tiles | 6 | 6 | KEEP 4 | demote the API test |
| vice-offline | 2 | 2 | TRIM to 1 | t2 checks the archive route |

KEEP unchanged: blackbox-seed-race, cross-browser/vice-cross (nightly engines),
dashboard-training-card, life-mastery-program-link, programs-build-week,
programs-live-desktop, programs-live-menus, programs-offline (PR: Chromium +
iPhone), programs-one-language, programs-open-workout, programs-past-workout,
vice-dialog-targets.

**Runs per pass:** 1,191 today → 349 per PR (desktop Chromium signed in 237,
public 27, iPhone/WebKit 85) → 450 nightly (adds Firefox, desktop WebKit,
Android). Literal sleep time per pass: 377 s today (a lower bound; helper sleeps
multiply it to an estimated 12–15 minutes), about 220 s after the verdicts, before
sleeps become polls.

### Timing-sensitive tests (keep, but run in a one-worker lane or rewrite to poll)

timetrack-sync.spec.ts:313-353 (≤5 POSTs in 12 s) and :367-397 (120 ms pull race);
programs-live-workout.spec.ts:342-383 (10 s ± 3 s background rest clock);
mobile-life-mastery-day.spec.ts:127 (8 s debounce); toggl-time-tracker.spec.ts:373-414
(idle detection).

---

## DOM classification (Phase 6 starting list — the red run decides, not this list)

72 files need jsdom; about 300 can run under Node.

- goals: backfillReachesTheAccount, doneTodayOneOwner, northStarAreaBoxes,
  northStarFlowAdopts, northStarFlowSaves, northStarKeys, northStarRecap,
  seasonBandCounts, systemsTrainingWeek, trainingProgramCard (pragma present);
  **oneThingBox, removingAPushedGoal, routineCardLinked, secondDeviceCounts,
  trackTabDerivedTicks (no pragma yet)**.
- programs (28; 6 already have the pragma): WeekStrip, adjustDoesNotRace,
  buildYourWeek, editActiveProgram, enduranceBlocks.test.tsx,
  enrollmentLoadFailure, finishSheet, historyRow, liftHistorySheet, liftMenu,
  liveScreenPastMode, liveScreenVanished, liveWorkoutScreen,
  logPastWorkoutDialog, pastPrograms, programCatalog, programEditor, programRow,
  programSheet, receiptBody, restSurvivesReload, retryableRefusals, setMenu,
  setRow, setSaveState, todayCardOtherWorkout, useLiveWorkout, workoutVanished.
- timetrack (12): aPullDoesNotUndoWhatYouJustDid, aRefusalTheBrowserCannotMatch,
  aRestoreAsksBeforeItDeletes, editsReachTheRunningEntry,
  enterCommitsEscapeDiscards, importOfferBanner, nothingHappensUntilYouAskForIt,
  statefulPickers, syncAdoption, syncRetry, theSheetKeepsTheTimeYouTyped,
  twelveHourTimesSurviveBeingEdited.
- vice (3): blackboxChart, helpDoorReachable, voicesRendering.
- tracking (1): useSession.
- elsewhere (13, 11 after deletions): navigation/tabBarCurrent,
  profile/levelProgressBar, profile/regionList, profile/regionListCallers,
  settings/clockSync, settings/settingsToggles, shared/bottomSheet,
  shared/draftInput, shared/historyBarrier, shared/offlineShell,
  shared/staleWorkerCleanup, shared/stepper, shared/useLoad.

One file to check under Node after the switch: vice/blackboxStore's "mints a
UUID…" redefines `globalThis.crypto`. Classify by what a file uses, never by its
extension: vitest treats a positional `foo.test.ts` as a substring filter and
also selects `foo.test.tsx`.
