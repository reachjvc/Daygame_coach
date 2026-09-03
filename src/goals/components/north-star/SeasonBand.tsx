"use client"

/**
 * THE ONE THING AND THIS SEASON, ON THE PAGE PEOPLE ACTUALLY OPEN.
 *
 * Reported from the page: "I want it to go on this page, keeping the old
 * functionality, but linked to the new way of doing things. I also want the
 * one and our season's priority at the top."
 *
 * The two decisions the whole plan hangs off — the single change this season is
 * for, and the two or three areas it is about — were visible only inside the
 * flow that wrote them. The tracking dashboard is what somebody opens daily,
 * and it said nothing about either. So they go at the top of it, with the way
 * into today's list beside them.
 *
 * **It reads the plan where the plan lives.** The flow is localStorage-first
 * and every step but Track touches no API, so this band is a client component
 * that loads the same key the flow saves to. That has one honest consequence:
 * on a different browser there is no plan to show, and the band says "build
 * your plan" rather than pretending the account has none.
 *
 * **It renders nothing until the plan has loaded.** A server-rendered "no plan
 * yet" that flips to somebody's one thing a tick later is a page that lies for
 * one frame, and this is the first thing on it.
 *
 * Additive by design: nothing else on the dashboard moves or changes behaviour.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
/* ArrowRight only. `Telescope` is the Life Mastery mark on the test index and
   would fit here, but it is not in `iconRoles.ts` and putting one icon in two
   files is exactly what that registry governs — so the band goes without one
   rather than registering an icon nobody asked to register. */
import { ArrowRight } from "lucide-react"
import type { NsPlan } from "@/src/goals/types"
import { NORTH_STAR_STORAGE_KEY, SEASON_BAND_COPY } from "@/src/goals/data/northStar"
import { loadNsPlan, planIsUntouched, todayISO } from "@/src/goals/northStarService"
import { oneThingCountdown, oneThingPrompt, oneThingStage, type OneThing } from "@/src/goals/oneThingService"
import { todayItems, todayProgress } from "@/src/goals/northStarTrackService"
import { withReturn } from "@/src/shared/returnTo"

const PLAN_PATH = "/dashboard/goals/plan"
/**
 * WHERE THESE LINKS CAME FROM, carried on the link.
 *
 * This band lives on the tracking page, and the plan it opens has its own back
 * control aimed at the goals hub. Without the return address, opening your plan
 * from here and pressing back lands you somewhere you have never been.
 */
const HERE = "/dashboard/tracking"

/* The shape of the reply is `OneThing` from `oneThingService` — the same type
   the route builds it from. This file used to redeclare a four-field version of
   it by hand, as did the step, so the contract lived in three places and none of
   them was the one the server used. */

export function SeasonBand() {
  const [plan, setPlan] = useState<NsPlan | null>(null)
  const [loaded, setLoaded] = useState(false)
  /**
   * THE ONE THING COMES FROM THE DATABASE, NOT FROM THE PLAN.
   *
   * This line used to read `plan.seasonFocusId` — the goal you star on the
   * Focus step — while the One Thing step wrote a sentence somewhere else
   * entirely. So writing your one thing changed nothing here, which is the bug
   * that started all of this. It now reads the newest row on your account and
   * holds no copy of it.
   */
  const [oneThing, setOneThing] = useState<OneThing | null>(null)

  /**
   * BOTH BEFORE DECIDING WHAT TO DRAW.
   *
   * The plan is read from this browser and the one thing from the account, and
   * they arrive at different times. Deciding on the plan alone drew the "build
   * your plan" invitation for a moment — or permanently, on a browser with no
   * local plan at all, which is exactly the person this change was made for:
   * a saved one thing, a new phone, and a header that showed neither.
   */
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    setPlan(loadNsPlan(window.localStorage.getItem(NORTH_STAR_STORAGE_KEY)))
    setLoaded(true)
    fetch("/api/life-answers?key=one_thing")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setOneThing(d?.current ?? null))
      .catch(() => setOneThing(null))
      .finally(() => setFetched(true))
  }, [])

  if (!loaded || !fetched) return null

  /* An UNTOUCHED plan counts as no plan. Merely opening the flow writes one to
     localStorage, so "is there a key" would put "Nothing named yet / No areas
     picked yet" at the top of the dashboard of somebody who has never filled
     anything in — two blanks where the invitation should be.

     A saved one thing overrides that: it is on the account, so it belongs on
     this page whether or not this particular browser has ever opened the flow. */
  if (!oneThing && (!plan || planIsUntouched(plan))) {
    return (
      <section className="mb-6 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold">{SEASON_BAND_COPY.noneTitle}</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-prose">{SEASON_BAND_COPY.noneHelp}</p>
          </div>
          <Link
            href={withReturn(PLAN_PATH, HERE)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50 transition-colors shrink-0"
          >
            {SEASON_BAND_COPY.build}
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        </div>
      </section>
    )
  }

  const areas = (plan?.seasonAreaIds ?? [])
    .map((id) => plan?.areas.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a)
  const today = todayISO()
  const stage = oneThingStage(oneThing)
  const prompt = oneThingPrompt(oneThing)
  /* Routine steps only, and that is why no goals are fetched: their ticks are
     on the plan. A driver's count lives in `user_goals` and belongs to the row
     that can increment it, not to a summary band. */
  const progress = plan ? todayProgress(todayItems(plan, today, [], "")) : { done: 0, total: 0 }

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4 sm:p-5" data-testid="season-band">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div className="min-w-0">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{SEASON_BAND_COPY.oneThingLabel}</span>
            {/* Clicking it opens the step that owns it, where the ones before
                it are listed. */}
            <Link
              href={withReturn(`${PLAN_PATH}?step=one`, HERE)}
              className="block font-semibold text-lg leading-snug hover:underline underline-offset-2"
              data-testid="season-band-one-thing"
            >
              {oneThing ? (
                oneThing.body
              ) : (
                <span className="text-muted-foreground font-normal text-base">{SEASON_BAND_COPY.noFocus}</span>
              )}
            </Link>
            {/* THE DEADLINE ITSELF, not only the number of sleeps.
                "120 days left" is not a thing anybody can put in a calendar,
                and the day it names was typed on the form by the person reading
                this — so it comes back to them here. The wording is
                `oneThingCountdown`, shared with the step, so the two screens
                cannot word the same fact differently. */}
            {oneThing && (
              <span
                data-testid="season-band-countdown"
                className={`inline-block mt-1 rounded-full border px-2 py-0.5 text-[11px] ${
                  stage === "running"
                    ? "border-border text-muted-foreground"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                }`}
              >
                {oneThingCountdown(oneThing)}
              </span>
            )}
            {/* AND THE ASK, once the deadline is close enough to act on. Same
                rule as the step: a fortnight out, then every day after it runs
                out. Silent before that, so it still means something when it
                appears. */}
            {prompt && (
              <Link
                href={withReturn(`${PLAN_PATH}?step=one`, HERE)}
                data-testid="season-band-prompt"
                className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-300 hover:underline underline-offset-2"
              >
                {prompt}
                <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
          <div className="min-w-0">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{SEASON_BAND_COPY.seasonLabel}</span>
            {areas.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5 mt-1">
                {areas.map((area) => (
                  <li
                    key={area.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs"
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: area.color }} />
                    {area.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">{SEASON_BAND_COPY.noAreas}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 shrink-0">
          <Link
            href={withReturn(`${PLAN_PATH}?step=today`, HERE)}
            className="inline-flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
            data-testid="season-band-today"
          >
            <span className="font-medium">{SEASON_BAND_COPY.openToday}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {progress.total > 0 ? SEASON_BAND_COPY.todayProgress(progress.done, progress.total) : ""}
            </span>
          </Link>
          <Link
            href={withReturn(PLAN_PATH, HERE)}
            className="inline-flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            {SEASON_BAND_COPY.openPlan}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
