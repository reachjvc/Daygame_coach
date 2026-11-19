"use client"

import { useCallback, useEffect, useState } from "react"
import { EvidenceChip, SourceTap, SourcesFold } from "../../components/kit"
import { NumberCard } from "../../components/NumberCard"
import { useLocalQuitBlackBox, useQuitBlackBox, useSignedIn, type QuitBlackBoxApi } from "../../blackbox"
import { count } from "../../count"
import { isLiveTool } from "../../menu"
import { todayIso, useQuitRecord } from "../../record"
import { tooltext as tt } from "../../tooltext"
import type { QuitBelief, QuitNumber, QuitRef, QuitSymptomCourse, QuitSymptomHelp, ToolProps } from "../../types"
import { realRefs, uniqueRefs, usable } from "../common"
import { stretches } from "../date/hardDays"
import { useCarry } from "../hooks"
import { NotReady } from "../NotReady"
import { bandFor } from "./bands"
import { BandView, BasedOn, CravingLine, HelpFold, Legend, NowPill, ToolLink, type BasisPart } from "./Bits"
import { alsoPossible, better, betterOrder, caffeine, cravings, hunger, hungerHelp, moveForMood, notForEveryone, reviewCaveat, sleepSteps, type SourcedLine } from "./content"
import { dayState, daysToGo, fmtDay, fmtSlip, isNow, latestSlipDay, markDay, phaseWords, rightNow, type CardId, type DayState } from "./logic"
import { symptomsText as t } from "./text"

const HUGHES = "17365764"
const HAASOVA = "22861822"

/** Today as an ISO day, refreshed each minute and when the tab is shown again. */
function useToday(): string {
  const [today, setToday] = useState(() => todayIso())
  useEffect(() => {
    const tick = () => setToday(todayIso())
    const id = setInterval(tick, 60_000)
    document.addEventListener("visibilitychange", tick)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [])
  return today
}

/** The Black Box bridge, signed in (synced with the account) or signed out (the browser copy). Only read from. */
function SignedBridge({ viceId, onApi }: { viceId: string; onApi: (api: QuitBlackBoxApi | null) => void }) {
  const api = useQuitBlackBox(viceId)
  useEffect(() => {
    onApi(api)
    return () => onApi(null)
  }, [api, onApi])
  return null
}
function LocalBridge({ viceId, onApi }: { viceId: string; onApi: (api: QuitBlackBoxApi | null) => void }) {
  const api = useLocalQuitBlackBox(viceId)
  useEffect(() => {
    onApi(api)
    return () => onApi(null)
  }, [api, onApi])
  return null
}

/** What you'll feel, and when: a reference page. It reads the day from the Black Box or the record and writes nothing. */
export function SymptomsTool({ addiction, data }: ToolProps) {
  const course = usable<QuitSymptomCourse[]>(data.symptomCourse)
  const help = usable<QuitSymptomHelp[]>(data.symptomHelp)
  const numbers = usable<QuitNumber[]>(data.numbers)
  const beliefs = usable<QuitBelief[]>(data.beliefs)
  const b3 = beliefs?.find((b) => b.id === "b3")
  const first = numbers?.find((n) => n.kind === "after-first-month")
  const weight = numbers?.find((n) => n.kind === "after-body" && n.ref.pmid === "22782848")
  const erection = numbers?.find((n) => n.kind === "after-body" && n.ref.pmid === "15610111")
  const mood = numbers?.find((n) => n.kind === "after-mood")
  const rows = (help ?? []).filter((h) => ["craving", "anxious", "low-mood", "brain-fog"].includes(h.symptom))
  if (!course || course.length === 0 || !help || !b3 || !first || !weight || !erection || !mood || rows.length < 4) return <NotReady />
  const note = usable<string>(data.symptomCourseNote) ?? ""
  return <Inner addiction={addiction} course={course} help={help} note={note} b3={b3} nums={{ first, weight, erection, mood }} />
}

interface Nums {
  first: QuitNumber
  weight: QuitNumber
  erection: QuitNumber
  mood: QuitNumber
}
interface InnerProps {
  addiction: string
  course: QuitSymptomCourse[]
  help: QuitSymptomHelp[]
  note: string
  b3: QuitBelief
  nums: Nums
}

function Inner(props: InnerProps) {
  const signedIn = useSignedIn(false, true)
  const [bb, setBb] = useState<QuitBlackBoxApi | null>(null)
  const onApi = useCallback((api: QuitBlackBoxApi | null) => setBb(api), [])
  return (
    <div className="w-full">
      {signedIn === true ? <SignedBridge key="in" viceId={props.addiction} onApi={onApi} /> : null}
      {signedIn === false ? <LocalBridge key="out" viceId={props.addiction} onApi={onApi} /> : null}
      <Page {...props} bb={bb} />
    </div>
  )
}

const helpRow = (help: QuitSymptomHelp[], symptom: string) => help.find((h) => h.symptom === symptom)
const without = (refs: QuitRef[], pmid: string) => refs.filter((r) => r.pmid !== pmid)

function Page({ addiction, course, help, note, b3, nums, bb }: InnerProps & { bb: QuitBlackBoxApi | null }) {
  const carry = useCarry()
  const today = useToday()
  const rec = useQuitRecord(addiction)
  const ready = rec.ready && bb !== null && bb.ready
  useEffect(() => {
    if (!ready) return
    count(addiction, "symptoms", "start")
    count(addiction, "symptoms", "done")
  }, [addiction, ready])
  if (!ready || !bb) return null

  const state = dayState({
    runStart: bb.run?.startedOn ?? null,
    recordDate: rec.record.quitDate,
    goal: rec.record.goal,
    slipDay: bb.run ? null : latestSlipDay(bb.reports),
    today,
  })
  const day = markDay(state)
  const link = (id: string) => carry(`/quit/${addiction}/${id}`)
  const live = (id: string) => isLiveTool(id)

  const stretch = stretches(course, note)
  const hard = stretch[0]
  const fade = stretch[1]
  const cue = stretch[2]
  const moodBasis: BasisPart[] = [
    { label: t.basisLabelReview, basis: { ...hard.basis } },
    { label: t.basisLabelDiary, basis: { ...fade.basis, caveat: `${reviewCaveat} ${t.moodScore}` } },
  ]
  const sleepBasis: BasisPart[] = [
    { label: t.basisLabelReview, basis: { ...hard.basis } },
    { label: t.basisLabelDiary, basis: { ...fade.basis, design: "Diary study: symptoms rated day by day, before and after quitting.", caveat: "It saw no clear change in sleep after quitting, so no day range is drawn from it." } },
  ]
  const rowRefs = (symptoms: string[]) => realRefs(course.filter((c) => symptoms.includes(c.symptom)).flatMap((c) => realRefs(c.refs)))
  const moodRefs = uniqueRefs(rowRefs(["irritable", "anxious", "low-mood", "brain-fog", "restless"]))
  const sleepRefs = uniqueRefs(rowRefs(["sleep"]))
  const cueRefs = uniqueRefs(rowRefs(["cue-craving"]))

  const move = helpRow(help, "craving") as QuitSymptomHelp
  const moveText = move.text.replace(" for five minutes", "")
  const moveRefs = realRefs(move.refs).filter((r) => r.pmid === HAASOVA)
  const anxious = helpRow(help, "anxious") as QuitSymptomHelp
  const lowMood = helpRow(help, "low-mood") as QuitSymptomHelp
  const fog = helpRow(help, "brain-fog") as QuitSymptomHelp

  const betterLine = (id: string) => better.find((b) => b.id === id) as SourcedLine
  const allRefs = uniqueRefs([
    ...cravings.refs,
    ...moveRefs,
    ...cueRefs,
    ...moodRefs,
    ...notForEveryone.refs,
    ...moveForMood.refs,
    nums.first.ref,
    ...realRefs(anxious.refs).filter((r) => r.pmid !== HUGHES),
    ...without(realRefs(lowMood.refs), HUGHES),
    ...without(realRefs(fog.refs), HUGHES),
    ...caffeine.refs,
    ...sleepRefs,
    ...sleepSteps.refs,
    ...hunger.refs,
    nums.weight.ref,
    ...hungerHelp.flatMap((h) => h.refs),
    ...alsoPossible.refs,
    ...better.flatMap((b) => b.refs),
    ...realRefs(b3.refs),
    nums.erection.ref,
    nums.mood.ref,
  ])

  const phase = (id: CardId) =>
    day !== null ? (
      <p data-testid={`phase-${id}`} className="mt-2 text-sm">
        {t.youAre(day)} {phaseWords(id, day)}
      </p>
    ) : null

  return (
    <div data-testid="symptoms" className="flex flex-col gap-4">
      <DayCard state={state} link={link} live={live} />

      <Legend />
      <ul data-testid="symptom-cards" className="flex flex-col gap-3">
        <Card id="craving" title={cravings.title} day={day}>
          <CravingLine day={day} />
          {phase("craving")}
          <p className="mt-2 text-base">{cravings.text}</p>
          <HelpFold testId="help-craving" startOpen={isNow("craving", day)}>
            <div className="rounded-md border border-border p-3">
              <ToolLink href={link("sos")} live={live("sos")} testId="help-sos">
                {t.cravingHelpLink}
              </ToolLink>
              <p className="text-muted-foreground">{t.cravingHelpLine}</p>
            </div>
            <HelpItem testId="help-move" text={moveText} evidence={move.evidence} refs={moveRefs} basis={{ who: tt.sos.moveWho, design: `${tt.sos.moveDesign} ${tt.sos.moveMeasured}`, when: "Published 2013", caveat: tt.sos.moveCaveat }} />
          </HelpFold>
          <BasedOn testId="basis-craving" parts={[{ basis: cravings.basis }]} refs={cravings.refs} evidence={cravings.evidence} />
        </Card>

        <Card id="cue" title={t.cueTitle} day={day}>
          <BandView id="cue" band={bandFor("nicotine", "cue-craving")!} day={day} caption={t.cueCaption} />
          {phase("cue")}
          <HelpFold testId="help-cue" startOpen={isNow("cue", day)}>
            <div className="rounded-md border border-border p-3">
              <ToolLink href={link("sos")} live={live("sos")} testId="help-cue-sos">
                {t.cueHelpLink}
              </ToolLink>
              <p className="text-muted-foreground">{t.cueHelpIn}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <ToolLink href={link("ifthen")} live={live("ifthen")} testId="help-ifthen">
                {t.ifThen}
              </ToolLink>
              {!live("ifthen") && <p className="text-muted-foreground">{t.ifThenLine}</p>}
            </div>
          </HelpFold>
          <BasedOn testId="basis-cue" parts={[{ basis: { ...cue.basis } }]} refs={cueRefs} evidence="weak" />
        </Card>

        <Card id="mood" title={t.moodTitle} day={day}>
          <BandView id="mood" band={bandFor("nicotine", "irritable")!} day={day} caption={t.moodCaption} />
          {phase("mood")}
          <p className="mt-2 text-sm text-muted-foreground">{t.moodNote}</p>
          <div data-testid="not-for-everyone" className="mt-2 rounded-md border border-border p-3 text-sm">
            <p>{notForEveryone.text}</p>
            <BasedOn testId="basis-gilbert" parts={[{ basis: notForEveryone.basis }]} refs={notForEveryone.refs} evidence={notForEveryone.evidence} />
          </div>
          <HelpFold testId="help-mood" startOpen={isNow("mood", day)}>
            <HelpItem testId="help-mood-move" text={moveForMood.text} evidence={moveForMood.evidence} refs={moveForMood.refs} basis={moveForMood.basis} />
            <div className="rounded-md border border-border p-3">
              <p className="font-medium">{t.anxietyHead}</p>
              <div className="mt-2">
                <NumberCard n={nums.first} />
              </div>
              <p className="mt-2">{t.moodDisagree}</p>
              <p className="mt-2">{anxious.text}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <EvidenceChip evidence={anxious.evidence} />
              </div>
              <SourceTap refs={without(realRefs(anxious.refs), HUGHES)} />
            </div>
            <PlainHelp head={t.lowMoodHead} row={lowMood} testId="help-lowmood" />
            <PlainHelp head={t.fogHead} row={fog} testId="help-fog" />
            <CaffeineItem testId="help-caffeine-mood" />
          </HelpFold>
          <BasedOn testId="basis-mood" parts={moodBasis} refs={moodRefs} evidence="moderate" />
        </Card>

        <Card id="sleep" title={t.sleepTitle} day={day}>
          <BandView id="sleep" band={bandFor("nicotine", "sleep")!} day={day} caption={t.sleepCaption} />
          {phase("sleep")}
          <HelpFold testId="help-sleep" startOpen={isNow("sleep", day)}>
            <div data-testid="sleep-steps" className="rounded-md border border-border p-3">
              <p className="font-medium">{sleepSteps.title}</p>
              <ol className="mt-1 flex list-decimal flex-col gap-1 pl-5">
                {sleepSteps.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <div className="mt-2">
                <EvidenceChip evidence={sleepSteps.evidence} />
              </div>
              <BasedOn testId="basis-sleep-steps" parts={[{ basis: sleepSteps.basis }]} refs={sleepSteps.refs} />
            </div>
            <CaffeineItem testId="help-caffeine-sleep" />
          </HelpFold>
          <BasedOn testId="basis-sleep" parts={sleepBasis} refs={sleepRefs} evidence="weak" />
        </Card>

        <Card id="hunger" title={hunger.title} day={day}>
          {phase("hunger")}
          <p className="mt-2 text-base">{hunger.text}</p>
          <div className="mt-3">
            <NumberCard n={nums.weight} />
            <p className="mt-2 text-sm text-muted-foreground">{t.weightLine}</p>
          </div>
          <HelpFold testId="help-hunger" startOpen={false}>
            {hungerHelp.map((h) => (
              <HelpItem key={h.id} testId={`help-${h.id}`} text={h.text} evidence={h.evidence} refs={h.refs} basis={h.basis} />
            ))}
          </HelpFold>
          <BasedOn testId="basis-hunger" parts={[{ basis: hunger.basis }]} refs={hunger.refs} evidence={hunger.evidence} />
        </Card>
      </ul>

      <div data-testid="also-possible" className="text-sm text-muted-foreground">
        {alsoPossible.text}
        <SourceTap refs={alsoPossible.refs} />
      </div>

      <section data-testid="better" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t.betterTitle}</h2>
        <ol className="flex flex-col gap-3">
          {betterOrder.map((row) => {
            const sourced = row.better ? betterLine(row.better) : null
            const label = `${row.when}${sourced?.cigarettesOnly ? ", cigarettes only" : ""}`
            return (
              <li key={row.when} data-testid={`better-${row.when}`} className="rounded-lg border border-border bg-card p-3">
                <p className="text-sm font-semibold">{label}</p>
                {sourced && (
                  <>
                    <p className="mt-1 text-base">{sourced.text}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {tt.common.basis.who}: {sourced.basis.who}
                    </p>
                    <BasedOn testId={`basis-better-${sourced.id}`} parts={[{ basis: sourced.basis }]} refs={sourced.refs} evidence={sourced.evidence} />
                  </>
                )}
                {row.number === "after-first-month" && (
                  <>
                    <p className="mt-1 text-base">
                      {nums.first.headline} {t.seeMood}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {tt.common.counted} {nums.first.counted}
                    </p>
                  </>
                )}
                {row.belief === "b3" && (
                  <>
                    <p className="mt-1 text-base">{b3.proof}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{b3.weak}</p>
                    <SourceTap refs={realRefs(b3.refs)} />
                  </>
                )}
                {row.number === "after-body:15610111" && (
                  <div className="mt-2">
                    <NumberCard n={nums.erection} />
                  </div>
                )}
                {row.number === "after-mood" && (
                  <div className="mt-2">
                    <NumberCard n={nums.mood} />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
        {note && (
          <p data-testid="course-note" className="text-sm text-muted-foreground">
            {note}
          </p>
        )}
      </section>

      <SourcesFold refs={allRefs} />
    </div>
  )

}

function CaffeineItem({ testId }: { testId: string }) {
  return (
    <div data-testid={testId} className="rounded-md border border-border p-3">
      <p className="font-medium">
        {t.caffeineHead} <span className="text-sm font-normal text-muted-foreground">({t.cigarettesOnly})</span>
      </p>
      <p className="mt-1">{caffeine.text}</p>
      <div className="mt-2">
        <EvidenceChip evidence={caffeine.evidence} />
      </div>
      <BasedOn testId={`${testId}-basis`} parts={[{ basis: caffeine.basis }]} refs={caffeine.refs} />
    </div>
  )
}

function Card({ id, title, day, children }: { id: CardId; title: string; day: number | null; children: React.ReactNode }) {
  return (
    <li data-testid={`card-${id}`} className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 break-words text-base font-semibold">{title}</h2>
        {isNow(id, day) && <NowPill id={id} />}
      </div>
      {children}
    </li>
  )
}

function HelpItem({ testId, text, evidence, refs, basis }: { testId: string; text: string; evidence: SourcedLine["evidence"]; refs: QuitRef[]; basis: SourcedLine["basis"] | Partial<SourcedLine["basis"]> }) {
  return (
    <div data-testid={testId} className="rounded-md border border-border p-3">
      <p>{text}</p>
      <div className="mt-2">
        <EvidenceChip evidence={evidence} />
      </div>
      <BasedOn testId={`${testId}-basis`} parts={[{ basis }]} refs={refs} />
    </div>
  )
}

function PlainHelp({ head, row, testId }: { head: string; row: QuitSymptomHelp; testId: string }) {
  return (
    <div data-testid={testId} className="rounded-md border border-border p-3">
      <p className="font-medium">{head}</p>
      <p className="mt-1">{row.text}</p>
      <div className="mt-2">
        <EvidenceChip evidence={row.evidence} />
      </div>
      <SourceTap refs={without(realRefs(row.refs), HUGHES)} />
    </div>
  )
}

function DayCard({ state, link, live }: { state: DayState; link: (id: string) => string; live: (id: string) => boolean }) {
  const calendar = live("date") ? (
    <ToolLink href={link("date")} live testId="calendar-link">
      {t.calendarLink}
    </ToolLink>
  ) : null
  return (
    <section data-testid="day-card" data-state={state.kind} className="rounded-lg border border-border bg-card p-4">
      {state.kind === "day" && (
        <>
          <p className="flex items-baseline gap-2">
            <span data-testid="day-number" className="text-4xl font-semibold tabular-nums">
              {`Day ${state.n}`}
            </span>
          </p>
          <p data-testid="day-from" className="text-sm text-muted-foreground">
            {t.countedFrom(fmtDay(state.from))}
          </p>
          <p className="mt-3 text-sm font-medium text-muted-foreground">{t.rightNow}</p>
          <p data-testid="right-now" className="text-base">
            {rightNow(state.n)}
          </p>
          {calendar}
        </>
      )}
      {state.kind === "ahead" && (
        <>
          <p data-testid="day-ahead" className="text-2xl font-semibold">
            {daysToGo(state.n)} {t.aheadFirst(fmtDay(state.date))}
          </p>
          <p className="mt-1 text-base">{t.aheadLine}</p>
          {calendar}
        </>
      )}
      {state.kind === "slip" && (
        <>
          <p data-testid="day-slip" className="text-base font-medium">
            {t.slipLine(fmtSlip(state.slipDay))}
          </p>
          <div className="mt-1">
            <ToolLink href={link("slip")} live={live("slip")} testId="slip-link">
              {t.slipTool}
            </ToolLink>
          </div>
          {calendar}
        </>
      )}
      {state.kind === "none" && (
        <>
          <p data-testid="day-none" className="text-base">
            {t.noDate}
          </p>
          <div className="mt-1">
            <ToolLink href={link("date")} live={live("date")} testId="date-link">
              {t.noDateLink}
            </ToolLink>
          </div>
        </>
      )}
    </section>
  )
}
