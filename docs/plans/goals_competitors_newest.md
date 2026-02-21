# Research: What Top Habit/Goal Apps Do & What We Should Steal

## What We Already Have (Strong Foundation)

Our goals system is already **more sophisticated than most competitors** in several areas:

| Feature | Our Implementation | Industry Status |
|---|---|---|
| Goal hierarchy (L0-L3) | 4-level tree with parent-child | Only Notion/OKR tools do this |
| Phase/graduation system | acquisition → consolidation → graduated | Unique — no competitor has this |
| Milestone curve editor | Interactive tension + control points | Way beyond any competitor |
| Habit ramp (progressive frequency) | Multi-step ramp with projected dates | Only Strides has something similar |
| Badge engine (bronze→diamond) | Weighted L3 contributions to L2 badges | Comparable to Habitica's depth |
| Heatmap calendar | 12-week GitHub-style grid | Standard (Loop, Todoist have similar) |
| Streak freezes | Available but UX may be underexposed | Duolingo's #1 retention feature |
| Weekly review | Momentum score, trend detection, tier upgrades | Better than most (Reclaim-level) |
| Pacing system | ahead/on-pace/behind with projections | Only Strides has comparable |
| Celebration overlay | 5 tiers from subtle→confetti-epic | Good, but could be more variable |
| Setup wizard | Path → Areas → Goals → Customize → Summary | Solid progressive disclosure |
| TodaysPulse | Time-of-day messages + progress ring + streak | Clean, comparable to Streaks |
| Multiple view modes | Daily, Strategic, Standard, Time-Horizon | More views than any competitor |

**We're already ahead of 90% of habit apps on tracking/visualization/hierarchy.** The gaps are in the psychological/motivational layer.

---

## The 10 Highest-Impact Features to Steal

### Tier 1: Quick Wins (Small changes, big psychological impact)

#### 1. "Skip Day" / Rest Day Mechanic (from Way of Life + Duolingo)
**What they do**: Way of Life has Yes/No/Skip (three-state). Streaks app lets you designate off-days. Duolingo streak freezes activate automatically.
**Our gap**: We have `streak_freezes_available` but the UX around it may be invisible. Users may not know they have freezes or when one was consumed.
**Steal**:
- Add visible "Skip" button alongside check-in (not just increment/done)
- Show "Streak Freeze Used" toast when auto-freeze triggers
- Show freeze count on goal cards so users know they have safety net
- Let users configure rest days per goal (e.g., "not on weekends")

#### 2. Frame Misses as Data, Not Failure (from UX research)
**What they do**: Best apps say "4 of 7 days" not "You failed 3 days." Loop's scoring formula means a few missed days after a long streak barely dent your score.
**Our gap**: Need to audit how we present incomplete periods. The weekly review should frame neutrally.
**Steal**:
- TodaysPulse evening message: "Today's results — 4 of 6 complete" (already neutral ✓)
- Weekly review: ensure tone is analytical ("78% completion rate, trending up") not judgmental
- Never use words like "failed", "missed", "behind" in user-facing copy without pairing with constructive framing

#### 3. Sensory Check-In Moment (from Atoms + Streaks)
**What they do**: Atoms has hold-to-complete with growing circle + haptic vibration. Streaks has ring-fill animation + sound. The *moment of completion* is designed as a micro-reward.
**Our gap**: Our increment buttons are functional but probably not sensory-rich.
**Steal**:
- Add subtle animation on goal completion (progress bar pulse, brief glow, or checkmark animation)
- Haptic feedback on mobile (if PWA supports it — `navigator.vibrate`)
- Brief confetti burst on daily 100% completion (lighter than current celebration system)

---

### Tier 2: Medium Effort, High Impact

#### 4. Identity-Based Framing (from Atoms / James Clear)
**What they do**: During setup, Atoms asks "Who do you want to become?" not just "What do you want to track?" Each habit is connected to an identity statement. "I am becoming a person who approaches confidently."
**Our gap**: Our setup wizard asks path (FTO/Abundance) and selects goals, but doesn't connect to identity.
**Steal**:
- Add identity step to setup wizard between Direction and Goals: "What kind of man are you becoming?"
  - FTO path: "I'm becoming a man who can connect deeply with one great woman"
  - Abundance path: "I'm becoming a man who is naturally attractive and socially fearless"
  - Let user edit/customize the statement
- Show identity statement at top of Daily Action View as a persistent reminder
- Frame goal completions as "votes for your identity" (Clear's language)

#### 5. Scaffolded Goal Activation (from Fabulous)
**What they do**: Fabulous adds ONE habit at a time. Only after 3+ days of consistency does it introduce the next habit. This prevents the "10 goals on day 1" overwhelm that kills 92% of attempts.
**Our gap**: Setup wizard dumps an entire L1→L2→L3 tree on day one. User sees 15+ goals immediately.
**Steal**:
- After setup, activate only 3-5 L3 goals initially (the most foundational ones for the chosen path)
- Other goals exist but are "locked" — shown as dimmed/upcoming
- Unlock next batch after user demonstrates consistency (e.g., 5/7 days for 2 weeks)
- Notification: "You've been consistent — ready to add [Goal Name]?"
- This maps naturally to our phase system: new goals start in "acquisition"

#### 6. Implementation Intentions / Habit Stacking (from Atoms + Clear)
**What they do**: Atoms prompts: "When and where will you do this?" Users commit to "After I wake up, in the living room, I will do 10 approaches." This anchors habits to existing routines.
**Our gap**: No time/place/trigger anchoring for goals.
**Steal**:
- Add optional "When I..." field to goal creation: "After [existing routine], I will [this goal]"
- Show the trigger cue in Daily Action View alongside the goal
- Pre-populate suggestions for daygame goals: "After work", "On my lunch break", "Saturday afternoon"

#### 7. Streak Visibility & Recovery UX (from Duolingo)
**What they do**: Streak is the HERO metric in Duolingo — huge number, fire icon, prominent placement. When a streak breaks, they offer "Streak Repair" (costs gems). Streak freezes are clearly communicated.
**Our gap**: We track streaks and have freezes, but they may not be the hero element.
**Steal**:
- Make current_streak the most prominent number on DailyActionView (big, with fire icon)
- When a streak freeze is consumed, show a clear notification: "Streak Freeze saved your 14-day streak!"
- When streak breaks: gentle recovery prompt, not punishment — "Your 14-day streak ended. Start a new one today?"
- Show "streak at risk" indicator when user hasn't checked in and freeze count is 0

---

### Tier 3: Bigger Features Worth Building

#### 8. Variable Celebration Rewards (from Habitica)
**What they do**: Habitica uses random drops (eggs, potions, equipment) with variable schedules. You never know when you'll get a rare drop. Variable rewards create 3x more engagement than predictable ones.
**Our gap**: Our celebrations are tier-based and predictable (you know confetti comes at milestone X).
**Steal**:
- Add occasional "surprise" micro-rewards at random completions (not every time)
- Could be: unlocking a new insight/tip, a "streak shield" (free freeze), a cosmetic unlock
- Even just a random motivational quote from a coaching perspective works
- Key: ~15-20% chance on any completion, not 100%

#### 9. "Bright Red Line" / Commitment Visibility (from Beeminder)
**What they do**: Beeminder plots your minimum required trajectory on a graph. Your job is to stay above the line. If you cross it, consequences happen.
**Our gap**: Our pacing system calculates ahead/on-pace/behind but it's shown as a badge. No visual trajectory.
**Steal**:
- Add a simple trend line to the heatmap or a new mini-chart showing actual vs. required pace
- The ProjectionTimeline already has milestone dots — could add a "required pace" line underneath
- This makes the abstract "behind pace" concrete: "You can see the gap here"

#### 10. Weekly Planning Ritual (from Reclaim + "Reset Sunday" pattern)
**What they do**: Reclaim auto-generates a weekly focus time plan. The "Reset Sunday" pattern (popular in productivity communities) is a 30-minute weekly session where you review last week, plan next week, adjust goals.
**Our gap**: We have WeeklyReviewDialog but it's retrospective. No forward-planning element.
**Steal**:
- Add "This Week's Focus" section to weekly review: after reviewing last week, prompt user to pick 1-3 priority goals for the coming week
- Surface the weekly focus on the Daily Action View throughout the week
- End weekly review with: "Your focus this week: [Goal A] and [Goal B]"

---

## Features We Should NOT Copy

| Feature | Source | Why Skip |
|---|---|---|
| Real-money stakes | Beeminder/StickK | Too aggressive for our audience. Daygame already has enough emotional stakes. |
| Social sharing / leaderboards | Habitica/Goalify | Privacy-sensitive domain. Nobody wants to broadcast their approach count. |
| RPG character system | Habitica | Would clash with our clean, serious UI. Too much overhead. |
| Extensive onboarding quiz | Noom | Our setup wizard is already well-structured. More questions = more abandonment. |
| AI scheduling | Reclaim/Motion | Out of scope — we're not a calendar app. |
| Anti-charity punishment | StickK | Too aggressive, potentially offensive. |
| Coaching marketplace | Coach.me | We ARE the coach. No marketplace needed. |

---

## Prioritized Implementation Order

If we were to build these, the order by impact-per-effort:

1. **Frame misses as data** — Copy audit, minimal code changes
2. **Streak visibility + recovery UX** — Make streak the hero, add freeze notifications
3. **Skip day mechanic** — Three-state check-in (Done/Skip/Miss)
4. **Sensory check-in moment** — Animations on completion
5. **Identity framing in setup** — New wizard step + persistent identity display
6. **Scaffolded goal activation** — Lock/unlock system for progressive rollout
7. **Weekly planning ritual** — Forward-planning addition to weekly review
8. **Implementation intentions** — "When I..." field in goal creation
9. **Variable celebration rewards** — Random micro-rewards at ~15-20% frequency
10. **Commitment visibility (trend line)** — Actual vs. required pace chart

---

## Key Behavioral Principles to Embed in All Future Work

1. **One-tap daily interaction** — If logging takes more effort than the habit, users stop logging
2. **Forgiveness > punishment** — Streak freezes, rest days, graceful recovery. 21% churn reduction (Duolingo data)
3. **Start tiny** — 3 goals, not 15. Unlock more after consistency is proven
4. **Connect to identity** — "Who are you becoming?" not just "What are you tracking?"
5. **Celebrate selectively** — Reserve big celebrations for real milestones. Variable > predictable
6. **Reflect weekly** — Tracking without reflection is just data collection
7. **Frame positively** — "4 of 7" not "failed 3". Analytics tone, not judge tone
