"use client";

import { CircleCheck, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BlackBoxBridge } from "../../components/BlackBoxBridge";
import { LocalBlackBoxBridge } from "../../components/LocalBlackBoxBridge";
import { OneQuestion, PrimaryButton } from "../../components/kit";
import {
  nowInBrowser,
  useSignedIn,
  type QuitBlackBoxApi,
} from "../../blackbox";
import { endingForBelief, reportAt } from "../../blackboxLogic";
import { isLiveTool } from "../../menu";
import { addDays, isIsoDay, todayIso, useQuitRecord } from "../../record";
import { tooltext as tt } from "../../tooltext";
import { useVerb } from "../../wording";
import type { ToolProps } from "../../types";
import { useCarry, useDoneCount, useStartCount, useToolState } from "../hooks";
import {
  EMPTY_CHECKIN,
  entryCount,
  applySlips,
  draftKey,
  firstMonth,
  PLEDGE_MAX,
  NOTE_MAX,
  canFill,
  dayLabel,
  hasOutcome,
  lookBack,
  MODES,
  mergeSlips,
  monthCounts,
  noSlipCase,
  putDay,
  monthName,
  monthOf,
  parseCheckin,
  seedExample,
  shiftMonth,
  showsLastMonth,
  slipDays,
  DEFAULT_REMINDERS,
  type CheckinState,
  type Day,
  type Days,
  type Draft,
  type FlowKind,
  type Reminders,
} from "./logic";
import {
  checkinText as t,
  FEELINGS,
  SCALE,
  URGE_SCALE,
  pastPhrase,
} from "./text";
import {
  Card,
  CountTiles,
  DaySummary,
  MonthView,
  PatternView,
  RemindersView,
  TAB_IDS,
  TabRow,
  type TabId,
} from "./Views";

/** Daily check-in: a morning pledge and forecast, an evening result, his month, a forecast pattern, reminders. Nicotine only. */
export function CheckinTool({ addiction }: ToolProps) {
  return <Inner addiction={addiction} />;
}

function Inner({ addiction }: { addiction: string }) {
  const signedIn = useSignedIn(true, true);
  const [bb, setBb] = useState<QuitBlackBoxApi | null>(null);
  const onApi = useCallback((api: QuitBlackBoxApi | null) => setBb(api), []);
  // Signed in the Black Box syncs to the account; otherwise it is the copy in this browser.
  return (
    <>
      {signedIn ? (
        <BlackBoxBridge viceId={addiction} onApi={onApi} />
      ) : (
        <LocalBlackBoxBridge viceId={addiction} onApi={onApi} />
      )}
      <Screens addiction={addiction} signedIn={signedIn} bb={bb} />
    </>
  );
}

/** The hour of the day, checked again every minute (the morning button turns into the evening one at 12:00). */
function useHour(): number {
  const [h, setH] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setH(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);
  return h;
}

/** Today as an ISO day, refreshed so a tab left open over midnight changes day. */
function useToday(): string {
  const [today, setToday] = useState(() => todayIso());
  useEffect(() => {
    const tick = () => setToday(todayIso());
    const id = setInterval(tick, 10_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return today;
}

const STEPS: Record<FlowKind, readonly string[]> = {
  morning: ["pledge", "forecast"],
  evening: ["outcome", "hard", "urges", "feelings", "note"],
};

/** The answers of a day that a flow edits (the slip answer is saved at once, so it is not one of them). */
function answersOf(kind: FlowKind, d: Day | undefined): Day {
  if (!d) return {};
  return kind === "morning"
    ? { pledge: d.pledge, forecast: d.forecast }
    : { hard: d.hard, urges: d.urges, feelings: d.feelings, note: d.note };
}

type View =
  | { kind: "tab"; tab: TabId }
  | { kind: "flow"; flow: FlowKind; date: string; step: number; month: boolean }
  | { kind: "done"; date: string; month: boolean };

interface Want {
  date: string;
  at: string;
}

function Screens({
  addiction,
  signedIn,
  bb,
}: {
  addiction: string;
  signedIn: boolean | null;
  bb: QuitBlackBoxApi | null;
}) {
  const carry = useCarry();
  const pathname = usePathname();
  const sp = useSearchParams();
  const today = useToday();
  const hour = useHour();
  const rec = useQuitRecord(addiction);
  const { state, update } = useToolState<CheckinState>(
    addiction,
    "checkin",
    EMPTY_CHECKIN,
    parseCheckin,
  );
  const started = useStartCount(addiction, "checkin");
  const [ex, setEx] = useState<{ days: Days; reminders: Reminders } | null>(
    null,
  );
  const [want, setWant] = useState<Want | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const filing = useRef<Set<string>>(new Set());
  const lock = useRef<string | null>(null);
  const sigRef = useRef<string | null>(null);
  const screenAt = useRef(0);
  /** Every tap on a screen that has just changed is ignored for 400 ms: a double tap must not land on the next screen's buttons. */
  const tapOk = () => Date.now() - screenAt.current >= 400;
  const filedIds = useRef<Set<string>>(new Set());
  const seen = useRef<Set<string>>(new Set());

  /* ----- the address: the tab or the flow screen is in the URL, so Back and reload work ----- */
  const key = sp.toString();
  const hrefFor = useCallback(
    (params: Record<string, string>) => {
      const p = new URLSearchParams();
      for (const k of ["preview", "present"])
        if (sp.getAll(k).includes("1")) p.set(k, "1");
      for (const [k, v] of Object.entries(params)) p.set(k, v);
      const q = p.toString();
      return q ? `${pathname}?${q}` : pathname;
    },
    [sp, pathname],
  );
  const keyOf = useCallback(
    (params: Record<string, string>) => hrefFor(params).split("?")[1] ?? "",
    [hrefFor],
  );

  // The history entries made in this visit, so an in-page Back steps back when the previous entry is the wanted screen.
  const trail = useRef<{ stack: string[]; idx: number } | null>(null);
  const ready = state !== null && rec.ready;
  useEffect(() => {
    lock.current = null;
    if (!ready) return;
    const tr = trail.current;
    if (!tr) {
      trail.current = { stack: [key], idx: 0 };
      return;
    }
    if (tr.stack[tr.idx] === key) return;
    if (tr.stack[tr.idx - 1] === key) tr.idx -= 1;
    else if (tr.stack[tr.idx + 1] === key) tr.idx += 1;
    else {
      tr.stack = [...tr.stack.slice(0, tr.idx + 1), key];
      tr.idx += 1;
    }
  }, [key, ready]);

  const go = (params: Record<string, string>) =>
    window.history.pushState(null, "", hrefFor(params));
  const swap = (params: Record<string, string>) => {
    const href = hrefFor(params);
    const tr = trail.current;
    if (tr) tr.stack[tr.idx] = href.split("?")[1] ?? "";
    window.history.replaceState(null, "", href);
  };
  /** Back: a step back in history when the previous entry is the wanted screen (or any, with `any`), else a rewrite of this one. */
  const back = (params: Record<string, string>, any = false) => {
    if (!tapOk()) return;
    const tr = trail.current;
    if (tr && tr.idx > 0 && (any || tr.stack[tr.idx - 1] === keyOf(params)))
      window.history.back();
    else swap(params);
  };
  /** A double tap on one screen moves once: the second tap finds this screen locked until the address changes. */
  const move = (fn: () => void) => {
    if (!tapOk()) return;
    if (lock.current === key) return;
    lock.current = key;
    // the screen is about to change (the address follows a moment later): taps from now on are ignored
    screenAt.current = Date.now();
    fn();
  };

  /* ----- what the address says ----- */
  const slips = slipDays(bb?.reports ?? []);
  const stored = state?.days ?? {};
  /** What the calendar shows: Black Box slips count as slipped days (and win over his own "No"). */
  const days: Days = ex ? ex.days : mergeSlips(stored, slips);
  /** What is counted: only his own check-in answers, with the Black Box slips applied to them. A slip that is only in the Black Box is not a check-in. */
  const own: Days = ex ? ex.days : applySlips(stored, slips);

  const view: View = (() => {
    const tab = sp.get("tab");
    const flow = sp.get("flow");
    const d = sp.get("d");
    const done = sp.get("done");
    if (
      ex === null &&
      (flow === "morning" || flow === "evening") &&
      d !== null &&
      canFill(d, today)
    ) {
      const total = STEPS[flow].length;
      const raw = Number(sp.get("s"));
      const step =
        Number.isInteger(raw) && raw >= 1 && raw <= total
          ? raw
          : (state?.drafts[draftKey(flow, d)]?.step ?? 1);
      return {
        kind: "flow",
        flow,
        date: d,
        step,
        month: sp.get("f") === "month",
      };
    }
    if (ex === null && done !== null && isIsoDay(done) && days[done])
      return { kind: "done", date: done, month: sp.get("f") === "month" };
    return {
      kind: "tab",
      tab: TAB_IDS.includes(tab as TabId) ? (tab as TabId) : "today",
    };
  })();
  useDoneCount(addiction, "checkin", view.kind === "done");
  const sig =
    view.kind === "tab"
      ? "tab"
      : view.kind === "flow"
        ? `flow|${view.flow}|${view.date}|${view.step}`
        : `done|${view.date}`;
  if (sigRef.current === null) sigRef.current = sig;
  else if (sigRef.current !== sig) {
    sigRef.current = sig;
    screenAt.current = Date.now();
  }

  const mParam = sp.get("m");
  const monthNow = monthOf(today);
  const monthYm =
    mParam &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(mParam) &&
    mParam <= monthNow &&
    mParam >= firstMonth(own, today)
      ? mParam
      : monthNow;
  const dayParam = sp.get("day");
  const monthDay = dayParam && isIsoDay(dayParam) ? dayParam : null;
  const modeParam = MODES.indexOf(
    (sp.get("mode") ?? "") as (typeof MODES)[number],
  );
  const monthMode = modeParam >= 0 ? modeParam : 0;
  const monthParams = (patch: {
    m?: string;
    mode?: number;
    day?: string | null;
  }): Record<string, string> => {
    const m = patch.m ?? monthYm;
    const mode = patch.mode ?? monthMode;
    const day = patch.day === undefined ? monthDay : patch.day;
    return {
      tab: "month",
      ...(m !== monthNow ? { m } : {}),
      ...(mode !== 0 ? { mode: MODES[mode] } : {}),
      ...(day ? { day } : {}),
    };
  };
  const verb = useVerb(rec.record.unit);
  const past = pastPhrase(verb);

  // The filing waits for the Black Box to be read; the answer on screen never waits.
  useEffect(() => {
    if (!want || !bb || !bb.ready || !bb.settled || !state) return;
    const { date, at } = want;
    setWant(null);
    const run = bb.run;
    // The Black Box would move a slip before the run's start or before its latest report: here that is "no run that day".
    const latest = run
      ? bb.reports
          .filter((r) => r.attemptId === run.id)
          .reduce(
            (m, r) => (r.at.slice(0, 10) > m ? r.at.slice(0, 10) : m),
            run.startedOn,
          )
      : "";
    const id =
      run && date >= latest
        ? bb.fileSlip({ at, thought: "", ending: endingForBelief(null, []) })
        : null;
    if (id) {
      filedIds.current.add(id);
      update((s) => ({
        ...s,
        days: putDay(s.days, date, {
          ...s.days[date],
          slipped: true,
          slipReportId: id,
        }),
      }));
    }
  }, [want, bb, state, update]);

  // A slip saved here that is no longer in the record (removed elsewhere): the day's slip answer is cleared, and the evening says so once.
  useEffect(() => {
    if (!state || !bb || !bb.ready || !bb.settled || want) return;
    for (const r of bb.reports) seen.current.add(r.id);
    // A report filed in this visit may not be in this copy of the Black Box for one render: it counts as gone only after it was seen.
    const gone = Object.entries(state.days).filter(
      ([, d]) =>
        d.slipReportId &&
        !bb.reports.some((r) => r.id === d.slipReportId) &&
        !(
          filedIds.current.has(d.slipReportId) &&
          !seen.current.has(d.slipReportId)
        ),
    );
    if (gone.length === 0) return;
    update((s) => {
      let days = s.days;
      for (const [date] of gone) {
        const d = days[date];
        if (d?.slipReportId)
          days = putDay(days, date, {
            ...d,
            slipped: undefined,
            slipReportId: undefined,
            slipGone: true,
          });
      }
      return { ...s, days };
    });
  }, [state, bb, want, update]);

  if (!state || !rec.ready) return null;

  /* ----- the slip answer ----- */
  /** The report is still in the Black Box. (`bb.has` also needs a living run, and a slip ends the run.) */
  const inBox = (id: string) => !!bb?.reports.some((r) => r.id === id);
  const setOutcome = (date: string, slipped: boolean) => {
    if (!tapOk()) return;
    const day = state.days[date];
    const wall = todayIso();
    if (slipped) {
      if (
        day?.slipped === true &&
        (day.slipReportId ? inBox(day.slipReportId) : filing.current.has(date))
      )
        return;
      filing.current.add(date);
      setBlocked(null);
      update((s) => ({
        ...s,
        days: putDay(s.days, date, {
          ...s.days[date],
          slipped: true,
          slipReportId: undefined,
          slipGone: undefined,
        }),
      }));
      setWant({ date, at: reportAt(date, wall, nowInBrowser()) });
      return;
    }
    if (
      day?.slipReportId &&
      inBox(day.slipReportId) &&
      !bb?.undo(day.slipReportId)
    ) {
      setBlocked(date);
      return;
    }
    filing.current.delete(date);
    setBlocked(null);
    setWant((w) => (w?.date === date ? null : w));
    update((s) => ({
      ...s,
      days: putDay(s.days, date, {
        ...s.days[date],
        slipped: false,
        slipReportId: undefined,
        slipGone: undefined,
      }),
    }));
  };
  const undoSlip = (date: string) => {
    if (!tapOk()) return;
    const id = state.days[date]?.slipReportId;
    if (!id || !bb) return;
    if (!bb.undo(id)) {
      setBlocked(date);
      return;
    }
    filing.current.delete(date);
    setBlocked(null);
    update((s) => ({
      ...s,
      days: putDay(s.days, date, {
        ...s.days[date],
        slipped: undefined,
        slipReportId: undefined,
      }),
    }));
  };

  /* ----- flows ----- */
  const draftFor = (s: CheckinState, kind: FlowKind, date: string): Draft =>
    s.drafts[draftKey(kind, date)] ?? {
      kind,
      date,
      step: 1,
      answers: answersOf(kind, s.days[date]),
    };
  const withDraft = (s: CheckinState, d: Draft): CheckinState => ({
    ...s,
    drafts: { ...s.drafts, [draftKey(d.kind, d.date)]: d },
  });
  const flowParams = (
    kind: FlowKind,
    date: string,
    step: number,
    month: boolean,
  ): Record<string, string> => ({
    flow: kind,
    d: date,
    s: String(step),
    ...(month
      ? { f: "month", ...(monthMode !== 0 ? { mode: MODES[monthMode] } : {}) }
      : {}),
  });
  const startFlow = (kind: FlowKind, date: string, month = false) =>
    move(() => {
      started();
      const step = state.drafts[draftKey(kind, date)]?.step ?? 1;
      go(flowParams(kind, date, step, month));
    });
  const setAnswer = (kind: FlowKind, date: string, step: number, patch: Day) =>
    update((s) => {
      const d = draftFor(s, kind, date);
      return withDraft(s, { ...d, step, answers: { ...d.answers, ...patch } });
    });
  const toStep = (kind: FlowKind, date: string, n: number, month: boolean) =>
    move(() => {
      update((s) => {
        const d = s.drafts[draftKey(kind, date)];
        return d ? withDraft(s, { ...d, step: n }) : s;
      });
      go(flowParams(kind, date, n, month));
    });
  /** Saves, then shows the done screen so that browser Back leaves the flow: this visit's flow entries are walked back first. */
  const finish = (kind: FlowKind, date: string, month: boolean) =>
    move(() => {
      update((s) => {
        const a = draftFor(s, kind, date).answers;
        const prev = s.days[date] ?? {};
        const next =
          kind === "morning"
            ? {
                ...prev,
                pledge: a.pledge?.trim() || undefined,
                forecast: a.forecast,
              }
            : {
                ...prev,
                hard: a.hard,
                urges: a.urges,
                feelings: a.feelings,
                note: a.note?.trim() || undefined,
                slipGone: undefined,
              };
        const rest = { ...s.drafts };
        delete rest[draftKey(kind, date)];
        return { ...s, days: putDay(s.days, date, next), drafts: rest };
      });
      const doneParams = {
        done: date,
        ...(month
          ? {
              f: "month",
              ...(monthMode !== 0 ? { mode: MODES[monthMode] } : {}),
            }
          : {}),
      };
      const tr = trail.current;
      let n = 0;
      if (tr)
        while (tr.idx - n >= 0 && tr.stack[tr.idx - n].includes("flow=")) n++;
      if (n > 1) {
        window.addEventListener("popstate", () => swap(doneParams), {
          once: true,
        });
        window.history.go(-(n - 1));
      } else swap(doneParams);
    });

  const slipLive = isLiveTool("slip");
  const thatOf = (date: string) => date !== today;

  const outlineLink =
    "inline-flex min-h-12 items-center justify-center rounded-md border border-primary px-4 font-medium text-primary";
  const slipNext = (
    <>
      {slipLive ? (
        <Link
          href={carry(`/quit/${addiction}/slip`)}
          data-testid="slip-link"
          className={outlineLink}
        >
          {tt.sos.slipLink}
        </Link>
      ) : (
        <p data-testid="slip-step">{tt.sos.yesStep}</p>
      )}
    </>
  );

  /* ----- one flow screen ----- */
  function renderFlow(
    kind: FlowKind,
    date: string,
    step: number,
    month: boolean,
  ) {
    if (!state) return null;
    const steps = STEPS[kind];
    const day = state.days[date];
    const ans = draftFor(state, kind, date).answers;
    const id = steps[step - 1];
    const that = thatOf(date);
    const foreign = bb
      ? bb.reports.some(
          (r) =>
            r.wentThrough &&
            r.at.slice(0, 10) === date &&
            r.id !== day?.slipReportId,
        )
      : false;
    // An unanswered question one cannot skip: a reload on a later screen without the answer lands on the first.
    if (
      kind === "evening" &&
      step > 1 &&
      !foreign &&
      day?.slipped === undefined
    ) {
      return renderFlow(kind, date, 1, month);
    }
    const last = step === steps.length;
    const set = (patch: Day) => setAnswer(kind, date, step, patch);
    const slipOk = foreign || hasOutcome(day);
    const filedHere = !!day?.slipReportId && inBox(day.slipReportId);
    const loading = !bb || !bb.settled;
    const status = (() => {
      if (!day?.slipReportId || !bb)
        return signedIn === false ? t.savedLocal : t.saving;
      const st = bb.status(day.slipReportId);
      if (signedIn === true)
        return st === "saved"
          ? tt.sos.savedAccount
          : st === "local"
            ? t.localOnly
            : t.saving;
      return signedIn === false ? t.savedLocal : t.saving;
    })();
    const noSlip =
      day?.slipped === true &&
      !day.slipReportId &&
      want?.date !== date &&
      !!bb?.settled;
    const noSlipKind = noSlipCase(date, bb?.runs ?? []);

    const title =
      id === "pledge"
        ? t.pledgeTitle(that)
        : id === "forecast"
          ? t.forecastTitle(that)
          : id === "outcome"
            ? foreign
              ? t.slipInRecord(dayLabel(date))
              : t.outcomeTitle(verb, that, dayLabel(date))
            : id === "hard"
              ? t.hardTitle(that)
              : id === "urges"
                ? t.urgesTitle(that)
                : id === "feelings"
                  ? t.feelingsTitle(that)
                  : t.noteTitle(that);

    /** A tap on a row saves it and moves on by itself (through the move lock); on the last morning screen it saves and finishes. */
    const pick = (patch: Day) => {
      if (!tapOk()) return;
      set(patch);
      if (last) finish(kind, date, month);
      else toStep(kind, date, step + 1, month);
    };
    const scale = (
      words: readonly string[],
      value: number | undefined,
      onPick: (n: number) => void,
      testId: string,
      numbers = true,
    ) => (
      <div
        role="radiogroup"
        aria-label={title}
        data-testid={testId}
        className="flex flex-col gap-2"
      >
        {words.map((word, i) => {
          const n = i + 1;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              data-testid={`${testId}-${n}`}
              onClick={() => onPick(n)}
              className={`flex min-h-12 items-center gap-3 rounded-md border px-3 text-left ${value === n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {numbers && (
                <span className="w-5 text-center font-semibold tabular-nums">
                  {n}
                </span>
              )}
              <span>{word}</span>
            </button>
          );
        })}
      </div>
    );

    const scaleValue = id === "forecast" ? ans.forecast : id === "hard" ? ans.hard : id === "urges" ? ans.urges : 0;
    const isScale = id === "forecast" || id === "hard" || id === "urges";
    const showContinue = !last && (!isScale || scaleValue !== undefined);
    const nextDisabled =
      (id === "outcome" && !slipOk) ||
      (kind === "morning" &&
        last &&
        ans.forecast === undefined &&
        !ans.pledge?.trim());
    return (
      <OneQuestion
        step={step}
        total={steps.length}
        onBack={null}
      >
        {step > 1 && (
          <button
            type="button"
            data-testid="screen-back"
            onClick={() => back(flowParams(kind, date, step - 1, month))}
            className="inline-flex min-h-11 min-w-11 items-center self-start text-sm text-muted-foreground underline"
          >
            {t.back}
          </button>
        )}
        <p className="text-sm text-muted-foreground">{dayLabel(date)}</p>
        <h2
          data-testid={`step-${id}`}
          className="text-lg font-semibold leading-snug"
        >
          {title}
        </h2>

        {id === "pledge" && (
          <>
            <p className="text-sm text-muted-foreground">{t.pledgeHelp}</p>
            <input
              data-testid="pledge-input"
              aria-label={t.pledgeTitle(that)}
              placeholder={t.pledgePlaceholder(that)}
              maxLength={PLEDGE_MAX}
              value={ans.pledge ?? ""}
              onChange={(e) => set({ pledge: e.target.value })}
              className="min-h-12 w-full min-w-0 rounded-md border border-border bg-background px-3 text-base"
            />
          </>
        )}
        {id === "forecast" &&
          scale(SCALE, ans.forecast, (n) => pick({ forecast: n }), "forecast")}

        {id === "outcome" && (
          <>
            {foreign ? (
              <Card testId="slip-in-record">
                <p className="text-sm text-muted-foreground">{t.slipHeld}</p>
              </Card>
            ) : (
              <>
                <div
                  role="radiogroup"
                  aria-label={title}
                  className="flex flex-col gap-2"
                >
                  {[false, true].map((sl) => (
                    <button
                      key={String(sl)}
                      type="button"
                      role="radio"
                      disabled={loading}
                      aria-checked={day?.slipped === sl}
                      data-testid={sl ? "outcome-slip" : "outcome-clear"}
                      onClick={() => setOutcome(date, sl)}
                      className={`min-h-12 rounded-md border px-3 text-left disabled:opacity-50 ${day?.slipped === sl ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                    >
                      {sl ? t.outcomeSlip(past) : t.outcomeClear}
                    </button>
                  ))}
                </div>
                {loading && (
                  <p
                    data-testid="record-loading"
                    className="text-sm text-muted-foreground"
                  >
                    {t.loadingRecord}
                  </p>
                )}
                {day?.slipGone && (
                  <p
                    data-testid="slip-gone"
                    className="text-sm text-muted-foreground"
                  >
                    {t.slipGone}
                  </p>
                )}
                {day?.slipped === true &&
                  (filedHere || noSlip || blocked === date) && (
                    <div
                      data-testid="slip-block"
                      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
                    >
                      {filedHere && (
                        <>
                          <p className="font-medium">{t.slipHeld}</p>
                          <p data-testid="slip-status">{status}</p>
                          <button
                            type="button"
                            data-testid="slip-undo"
                            onClick={() => undoSlip(date)}
                            className="inline-flex min-h-11 items-center self-start text-primary underline"
                          >
                            {tt.blackbox.undo}
                          </button>
                        </>
                      )}
                      {noSlip && (
                        <div
                          data-testid="slip-none"
                          className="flex flex-col gap-2"
                        >
                          <p>
                            {noSlipKind === "later"
                              ? t.noSlipLater
                              : noSlipKind === "never"
                                ? t.noSlipNever
                                : noSlipKind === "before"
                                  ? t.noSlipBefore
                                  : noSlipKind === "ended"
                                    ? t.noSlipEnded
                                    : t.noSlipOther}
                          </p>
                          {noSlipKind === "never" && isLiveTool("date") && (
                            <Link
                              href={carry(`/quit/${addiction}/date`)}
                              data-testid="none-date-link"
                              className="inline-flex min-h-11 items-center self-start text-primary underline"
                            >
                              {t.openDate}
                            </Link>
                          )}
                        </div>
                      )}
                      {blocked === date && (
                        <p data-testid="slip-blocked">{t.slipBlocked}</p>
                      )}
                    </div>
                  )}
              </>
            )}
          </>
        )}

        {id === "hard" && (
          <>
            {day?.forecast !== undefined && (
              <p
                data-testid="hard-forecast"
                className="text-sm text-muted-foreground"
              >
                {t.expectedThen(that, day.forecast)}
              </p>
            )}
            {scale(SCALE, ans.hard, (n) => pick({ hard: n }), "hard")}
          </>
        )}
        {id === "urges" &&
          scale(
            URGE_SCALE,
            ans.urges,
            (n) => pick({ urges: n }),
            "urges",
            false,
          )}

        {id === "feelings" && (
          <>
            <p className="text-sm text-muted-foreground">{t.feelingsHelp}</p>
            <div className="flex flex-wrap gap-2">
              {FEELINGS.map((f) => {
                const on = ans.feelings?.includes(f.id) ?? false;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    data-testid={`feeling-${f.id}`}
                    onClick={() =>
                      tapOk() &&
                      set({
                        feelings: on
                          ? (ans.feelings ?? []).filter((x) => x !== f.id)
                          : [...(ans.feelings ?? []), f.id],
                      })
                    }
                    className={`inline-flex min-h-11 items-center rounded-full border px-4 text-base ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {id === "note" && (
          <textarea
            data-testid="note-input"
            aria-label={title}
            placeholder={t.notePlaceholder}
            rows={5}
            maxLength={NOTE_MAX}
            value={ans.note ?? ""}
            onChange={(e) => set({ note: e.target.value })}
            className="w-full min-w-0 rounded-md border border-border bg-background p-3 text-base [overflow-wrap:anywhere]"
          />
        )}

        <div className="flex flex-col gap-2">
          {kind === "morning" && last ? (
            !nextDisabled && (
              <PrimaryButton
                testId="flow-save"
                onClick={() => finish(kind, date, month)}
              >
                {t.save}
              </PrimaryButton>
            )
          ) : last ? (
            <PrimaryButton
              testId="flow-done"
              onClick={() => finish(kind, date, month)}
            >
              {that ? t.doneThat : t.doneToday}
            </PrimaryButton>
          ) : (
            showContinue && (
              <PrimaryButton
                testId="flow-next"
                disabled={nextDisabled}
                onClick={() => toStep(kind, date, step + 1, month)}
              >
                {t.next}
              </PrimaryButton>
            )
          )}
          {kind === "evening" && (step >= 2 || slipOk) && !last && (
            <button
              type="button"
              data-testid="flow-done"
              onClick={() => finish(kind, date, month)}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border px-4 text-base"
            >
              {that ? t.doneThat : t.doneToday}
            </button>
          )}
        </div>
      </OneQuestion>
    );
  }

  /* ----- the screens ----- */
  if (view.kind === "flow")
    return (
      <div data-testid="checkin">
        {renderFlow(view.flow, view.date, view.step, view.month)}
      </div>
    );

  if (view.kind === "done") {
    const dd = days[view.date];
    const dayId = state.days[view.date]?.slipReportId;
    // "A slip doesn't undo the days before." only when a slip was saved, or is in the record for that day.
    const slipInRecord =
      dd?.slipped === true &&
      ((!!dayId && inBox(dayId)) || slips.has(view.date));
    const clearN = monthCounts(own, monthOf(view.date)).clear;
    return (
      <section data-testid="done-screen" className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">
          {t.savedFor(dayLabel(view.date))}
        </h2>
        {dd?.slipped === false && (
          <div
            data-testid="done-clear"
            className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-5 text-center"
          >
            <CircleCheck className="size-10 text-primary" aria-hidden />
            <p className="text-2xl font-semibold">{t.clearBig}</p>
            <p className="text-sm text-muted-foreground">
              {t.clearMonth(clearN)}
            </p>
          </div>
        )}
        {slipInRecord && (
          <div
            data-testid="done-slip"
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
          >
            <p className="text-lg font-semibold">{t.slipHeld}</p>
            {clearN > 0 && (
              <p className="text-sm text-muted-foreground">
                {t.clearMonth(clearN)}
              </p>
            )}
            {slipNext}
          </div>
        )}
        {!slipInRecord &&
          dd?.slipped === true &&
          noSlipCase(view.date, bb?.runs ?? []) === "ended" && (
            <div data-testid="done-restart" className="flex flex-col gap-2">
              {slipNext}
            </div>
          )}
        <DaySummary
          date={view.date}
          day={dd}
          verb={verb}
          testId="done-summary"
          hideDate
          hideOutcome={dd?.slipped === false || slipInRecord}
        />
        {dd?.slipped === undefined && dd?.hard === undefined && (
          <p data-testid="come-back" className="text-sm text-muted-foreground">
            {t.comeBack}
          </p>
        )}
        <PrimaryButton
          testId="done-back"
          onClick={() =>
            swap(
              view.month
                ? monthParams({ m: monthOf(view.date), day: view.date })
                : {},
            )
          }
        >
          {view.month ? t.doneMonth : t.backToToday}
        </PrimaryButton>
      </section>
    );
  }

  const tab = view.tab;
  const times = ex ? ex.reminders : state.reminders;
  const onFill = ex ? null : (date: string) => startFlow("evening", date, true);
  const hasEntries = entryCount(stored) > 0;
  const missed = ex ? null : lookBack(days, today);
  const counts = monthCounts(own, monthNow);
  const prev = shiftMonth(monthNow, -1);
  const prevCounts = monthCounts(own, prev);
  const day = days[today];
  const morningSaved = !!day?.pledge?.trim() || day?.forecast !== undefined;
  const eveningOpen = day?.slipped === undefined && day?.hard === undefined;
  const mainAction: FlowKind | null = ex
    ? null
    : !morningSaved && hour < 12
      ? "morning"
      : eveningOpen
        ? "evening"
        : null;
  const link = `${typeof window === "undefined" ? "" : window.location.origin}/quit/${addiction}/checkin`;
  const btn =
    "inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm";

  return (
    <div data-testid="checkin" className="flex w-full flex-col gap-4">
      {ex && (
        <div
          data-testid="example-bar"
          role="status"
          className="flex flex-wrap items-center justify-between gap-x-3 rounded-md border border-dashed border-primary px-3 py-1 text-sm"
        >
          <span>{t.exampleBar}</span>
          <button
            type="button"
            data-testid="example-leave"
            onClick={() => {
              setEx(null);
              if (tab === "month") swap({ tab: "month" });
            }}
            className="inline-flex min-h-11 items-center text-primary underline"
          >
            {t.leaveExample}
          </button>
        </div>
      )}
      <TabRow
        value={tab}
        onChange={(id) =>
          id !== tab && move(() => go(id === "today" ? {} : { tab: id }))
        }
      />

      {tab === "today" && (
        <div data-testid="tab-today-panel" className="flex flex-col gap-3">
          <p data-testid="today-date" className="text-base font-medium">
            {dayLabel(today)}
          </p>
          {mainAction && (
            <PrimaryButton
              testId="main-action"
              onClick={() => startFlow(mainAction, todayIso())}
            >
              {mainAction === "morning" ? t.startMorning : t.startEvening}
            </PrimaryButton>
          )}
          {morningSaved && !eveningOpen && (
            <p
              data-testid="both-done"
              className="flex items-center gap-2 font-medium"
            >
              <CircleCheck className="size-5 text-primary" aria-hidden />
              {t.bothDone}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Card testId="morning-card">
              <h2 className="flex items-center gap-2 font-medium">
                <Sun className="size-5 text-primary" aria-hidden />
                {t.morningTitle}
              </h2>
              {morningSaved ? (
                <div className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground">
                  {day?.pledge?.trim() ? (
                    <p
                      data-testid="morning-pledge"
                      className="[overflow-wrap:anywhere]"
                    >
                      {t.pledgeLine(day.pledge.trim())}
                    </p>
                  ) : null}
                  {day?.forecast !== undefined ? (
                    <p data-testid="morning-forecast">
                      {t.expectedLine(day.forecast)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  {hour >= 12 && !ex ? t.skipped : t.notYet}
                </p>
              )}
              {!ex && (morningSaved || mainAction !== "morning") && (
                <button
                  type="button"
                  data-testid="morning-start"
                  onClick={() => startFlow("morning", todayIso())}
                  className={`mt-2 ${btn}`}
                >
                  {morningSaved ? t.change : hour >= 12 ? t.fillIn : t.start}
                </button>
              )}
            </Card>
            <Card testId="evening-card">
              <h2 className="flex items-center gap-2 font-medium">
                <Moon className="size-5 text-primary" aria-hidden />
                {t.eveningTitle}
              </h2>
              {!eveningOpen ? (
                <div className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground">
                  {day?.slipped !== undefined && (
                    <p data-testid="evening-result">
                      {day.slipped ? t.slipResult(past) : t.clearResult}
                    </p>
                  )}
                  {day?.hard !== undefined && (
                    <p data-testid="evening-hard">{t.hardLine(day.hard)}</p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{t.notYet}</p>
              )}
              {!ex && (!eveningOpen || mainAction !== "evening") && (
                <button
                  type="button"
                  data-testid="evening-start"
                  onClick={() => startFlow("evening", todayIso())}
                  className={`mt-2 ${btn}`}
                >
                  {!eveningOpen ? t.change : t.start}
                </button>
              )}
            </Card>
          </div>
          {missed && (
            <button
              type="button"
              data-testid="lookback-start"
              onClick={() => startFlow("evening", addDays(todayIso(), -1))}
              className={`${btn} w-full justify-center`}
            >
              {t.fillYesterday(dayLabel(missed))}
            </button>
          )}
          {!hasEntries && !ex && (
            <button
              type="button"
              data-testid="see-example"
              onClick={() =>
                setEx({
                  days: seedExample(today),
                  reminders: DEFAULT_REMINDERS,
                })
              }
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-primary px-4 text-primary"
            >
              {t.seeExample}
            </button>
          )}
          <Card testId="month-counts">
            <h2 className="mb-2 font-medium">{t.monthTitle}</h2>
            {entryCount(own) === 0 ? (
              <p data-testid="counts-start" className="text-sm">
                {t.countsStart}
              </p>
            ) : (
              <CountTiles
                checked={counts.checkedIn}
                clear={counts.clear}
                ids={["count-checked", "count-clear"]}
              />
            )}
            {showsLastMonth(today) && entryCount(own) > 0 && (
              <div
                data-testid="last-month"
                className="mt-3 flex flex-col gap-2 border-t border-border pt-3"
              >
                <p className="text-sm font-medium">
                  {t.lastMonthTitle(monthName(prev))}
                </p>
                <CountTiles
                  checked={prevCounts.checkedIn}
                  clear={prevCounts.clear}
                  ids={["last-checked", "last-clear"]}
                />
              </div>
            )}
            {entryCount(own) > 0 && (
              <p
                data-testid="counts-note"
                className="mt-2 text-xs text-muted-foreground"
              >
                {t.countsNote(verb)}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {t.neverResets}
            </p>
          </Card>
          {!ex && <p className="text-xs text-muted-foreground">{t.keptHere}</p>}
        </div>
      )}
      {tab === "month" && (
        <MonthView
          days={days}
          own={own}
          today={today}
          verb={verb}
          ym={monthYm}
          mode={monthMode}
          picked={monthDay}
          onNav={(p) => swap(monthParams(p))}
          onFill={onFill}
        />
      )}
      {tab === "pattern" && (
        <PatternView days={own} example={ex !== null} verb={verb} />
      )}
      {tab === "reminders" && (
        <RemindersView
          times={times}
          today={today}
          link={link}
          onChange={(r) =>
            ex
              ? setEx({ ...ex, reminders: r })
              : update((s) => ({ ...s, reminders: r }))
          }
        />
      )}
    </div>
  );
}
