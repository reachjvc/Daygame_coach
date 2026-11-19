"use client"

import { useEffect, useState } from "react"
import { EvidenceChip, SourcesFold } from "../../components/kit"
import { useSignedIn } from "../../blackbox"
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
import { BandView, BasedOn, CravingLine, HelpFold, HelpRow, JumpChips, NowPill, ToolLink, type BasisPart } from "./Bits"
import { alsoPossible, better, betterOrder, caffeine, cravings, cueBasis, hunger, hungerHelp, medicines, mildForMost, moveForMood, notForEveryone, reviewCaveat, sleepSteps, type SourcedLine } from "./content"
import { dayState, daysToGo, fmtDay, fmtSlip, isNow, latestSlipDay, markDay, phaseWords, rightNow, type CardId, type DayState } from "./logic"
import { useBlackBoxView, type BlackBoxView } from "./readBlackBox"
import { symptomsText as t } from "./text"

const HUGHES = "17365764"
const HAASOVA = "22861822"
/** Fields the date tool's shared basis boxes leave out or word as notes about the summary. */
const REVIEW_FIX = { n: "120 studies reviewed; number of people not reported", where: "USA (the author); studies from several countries" }
const DIARY_FIX = { who: "Smokers who quit and logged their symptoms in an electronic diary; all had a group quit programme", where: "Pittsburgh, USA" }

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
  const bb = useBlackBoxView(props.addiction, signedIn)
  return (
    <div className="w-full">
      <Page {...props} bb={bb} />
    </div>
  )
}

const helpRow = (help: QuitSymptomHelp[], symptom: string) => help.find((h) => h.symptom === symptom)
const without = (refs: QuitRef[], pmid: string) => refs.filter((r) => r.pmid !== pmid)

function Page({ addiction, course, help, note, b3, nums, bb }: InnerProps & { bb: BlackBoxView }) {
  const carry = useCarry()
  const today = useToday()
  const rec = useQuitRecord(addiction)
  const ready = rec.ready && bb.ready
  useEffect(() => {
    if (!ready) return
    count(addiction, "symptoms", "start")
    count(addiction, "symptoms", "done")
  }, [addiction, ready])
  if (!ready) return null

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
  const moodBasis: BasisPart[] = [
    { label: t.basisLabelReview, basis: { ...hard.basis, ...REVIEW_FIX, caveat: `${reviewCaveat} ${hard.basis.caveat}` } },
    { label: t.basisLabelDiary, basis: { ...fade.basis, ...DIARY_FIX, caveat: `${t.moodScore} Tracked up to day 21. The review puts the end at 2 to 4 weeks, so the two do not agree.` } },
  ]
  const sleepBasis: BasisPart[] = [
    { label: t.basisLabelReview, basis: { ...hard.basis, ...REVIEW_FIX } },
    { label: t.basisLabelDiary, basis: { ...fade.basis, ...DIARY_FIX, design: "Diary study: symptoms rated day by day, before and after quitting.", caveat: "It saw no clear change in sleep after quitting, so no day range is drawn from it." } },
  ]
  const rowRefs = (symptoms: string[]) => realRefs(course.filter((c) => symptoms.includes(c.symptom)).flatMap((c) => realRefs(c.refs)))
  const moodRefs = uniqueRefs(rowRefs(["irritable", "anxious", "low-mood", "brain-fog", "restless"]))
  const sleepRefs = uniqueRefs(rowRefs(["sleep"]))
  const cueRefs = uniqueRefs(rowRefs(["cue-craving"]))

  const move = helpRow(help, "craving") as QuitSymptomHelp
  const moveRefs = realRefs(move.refs).filter((r) => r.pmid === HAASOVA)
  const fog = helpRow(help, "brain-fog") as QuitSymptomHelp
  const fogRefs = without(realRefs(fog.refs), HUGHES)

  const numPart = (n: QuitNumber, label: string): BasisPart => ({ label, text: n.headline, basis: { ...n.basis, caveat: n.caveat } })
  const moodParts: BasisPart[] = [
    ...moodBasis,
    { label: t.basisLabelMild, text: mildForMost.text, basis: mildForMost.basis },
    numPart(nums.first, t.basisLabelAnxiety),
    { label: t.basisLabelGilbert, text: notForEveryone.text, basis: notForEveryone.basis },
  ]
  const moodAllRefs = uniqueRefs([...moodRefs, ...mildForMost.refs, nums.first.ref, ...notForEveryone.refs])
  const b3Basis: BasisPart = {
    text: b3.proof,
    basis: { who: t.b3Who, n: "469", design: t.b3Design, where: "London, UK", when: "Published 2010", caveat: b3.weak ?? "" },
  }

  const betterLine = (id: string) => better.find((b) => b.id === id) as SourcedLine
  const betterParts: BasisPart[] = []
  const betterRefs: QuitRef[] = []
  for (const row of betterOrder) {
    if (row.better) {
      const b = betterLine(row.better)
      betterParts.push({ label: row.when, text: b.text, basis: b.basis })
      betterRefs.push(...b.refs)
    } else if (row.belief === "b3") {
      betterParts.push({ ...b3Basis, label: row.when })
      betterRefs.push(...realRefs(b3.refs))
    } else if (row.number) {
      const n = row.number === "after-first-month" ? nums.first : row.number === "after-mood" ? nums.mood : nums.erection
      betterParts.push(numPart(n, row.when))
      betterRefs.push(n.ref)
    }
  }

  const allRefs = uniqueRefs([
    ...cravings.refs,
    ...moveRefs,
    ...cueRefs,
    ...moodAllRefs,
    ...moveForMood.refs,
    ...fogRefs,
    ...caffeine.refs,
    ...sleepRefs,
    ...sleepSteps.refs,
    ...hunger.refs,
    nums.weight.ref,
    ...hungerHelp.flatMap((h) => h.refs),
    ...alsoPossible.refs,
    ...medicines.refs,
    ...betterRefs,
  ])

  const phase = (id: CardId) =>
    day !== null ? (
      <p data-testid={`phase-${id}`} className="mt-2 text-sm font-medium">
        {t.youAre(day)} {phaseWords(id, day)}
      </p>
    ) : null

  const cards: { id: CardId; label: string }[] = [
    { id: "craving", label: cravings.title },
    { id: "mood", label: t.moodTitle },
    { id: "sleep", label: t.sleepTitle },
    { id: "cue", label: t.cueShort },
    { id: "hunger", label: hunger.title },
  ]

  return (
    <div data-testid="symptoms" className="flex flex-col gap-4">
      <DayCard state={state} link={link} live={live} today={today} />
      <JumpChips items={cards.map((c) => ({ ...c, now: isNow(c.id, day) }))} />
      {note && (
        <p data-testid="course-note" className="text-sm text-muted-foreground">
          {note}
        </p>
      )}

      <ul data-testid="symptom-cards" className="flex flex-col gap-3">
        <Card id="craving" title={cravings.title} day={day}>
          <CravingLine day={day} />
          {phase("craving")}
          <p className="mt-2 text-base">{cravings.text}</p>
          <HelpFold testId="help-craving" count={2}>
            <HelpRow testId="help-sos-row">
              <ToolLink href={link("sos")} live={live("sos")} testId="help-sos">
                {t.cravingHelpLink}
              </ToolLink>
              <p className="text-muted-foreground">{t.cravingHelpLine}</p>
            </HelpRow>
            <HelpItem testId="help-move" text={t.cravingMove} evidence={move.evidence} refs={moveRefs} basis={{ who: tt.sos.moveWho, n: t.cravingMoveN, where: "Several countries (UK authors)", design: `${tt.sos.moveDesign} ${tt.sos.moveMeasured}`, when: "Published 2013", caveat: tt.sos.moveCaveat }} />
          </HelpFold>
          <BasedOn testId="basis-craving" label={t.basedOnTiming} parts={[{ text: cravings.detail, basis: cravings.basis }]} refs={cravings.refs} evidence={cravings.evidence} />
        </Card>

        <Card id="mood" title={t.moodTitle} day={day}>
          <BandView id="mood" band={bandFor("nicotine", "irritable")!} day={day} caption={t.moodCaption} />
          {phase("mood")}
          <p className="mt-2 text-base">
            {t.moodNote} {t.moodPlain}
          </p>
          <p data-testid="anxiety-line" className="mt-2 text-sm text-muted-foreground">
            {t.anxietyLine}
          </p>
          <HelpFold testId="help-mood" count={3}>
            <HelpItem testId="help-mood-move" text={moveForMood.text} evidence={moveForMood.evidence} refs={moveForMood.refs} basis={moveForMood.basis} />
            <HelpItem testId="help-fog" head={t.fogHead} text={t.fogHelp} evidence={fog.evidence} refs={fogRefs} basis={{ who: t.fogWho, n: "79 studies", where: "Several countries", design: t.fogDesign, when: "Published 2012", caveat: t.fogCaveat }} />
            <HelpRow testId="help-caffeine-mood">
              <p>{t.coffeeSeeSleep}</p>
            </HelpRow>
            <HelpRow testId="help-no-tip">
              <p className="text-muted-foreground">{t.noMoodTip}</p>
            </HelpRow>
          </HelpFold>
          <BasedOn testId="basis-mood" label={t.basedOnTiming} parts={moodParts} refs={moodAllRefs} evidence="moderate" />
        </Card>

        <Card id="sleep" title={t.sleepTitle} day={day}>
          <BandView id="sleep" band={bandFor("nicotine", "sleep")!} day={day} caption={t.sleepCaption} />
          {phase("sleep")}
          <HelpFold testId="help-sleep" count={2}>
            <div data-testid="sleep-steps" className="py-3">
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
          <BasedOn testId="basis-sleep" label={t.basedOnTiming} parts={sleepBasis} refs={sleepRefs} evidence="weak" />
        </Card>

        <Card id="cue" title={t.cueTitle} day={day}>
          <BandView id="cue" band={bandFor("nicotine", "cue-craving")!} day={day} caption={t.cueCaption} />
          {phase("cue")}
          <p className="mt-2 text-base">{t.cuePlain}</p>
          <HelpFold testId="help-cue" count={2}>
            <HelpRow testId="help-cue-sos-row">
              <ToolLink href={link("sos")} live={live("sos")} testId="help-cue-sos">
                {t.cueHelpLink}
              </ToolLink>
              <p className="text-muted-foreground">{t.cueHelpIn}</p>
            </HelpRow>
            <HelpRow testId="help-ifthen-row">
              <ToolLink href={link("ifthen")} live={live("ifthen")} testId="help-ifthen">
                {t.ifThen}
              </ToolLink>
              <p className="text-muted-foreground">{live("ifthen") ? t.ifThenLiveLine : t.ifThenLine}</p>
            </HelpRow>
          </HelpFold>
          <BasedOn testId="basis-cue" label={t.basedOnTiming} parts={[{ basis: cueBasis }]} refs={cueRefs} evidence="weak" />
        </Card>

        <Card id="hunger" title={hunger.title} day={day}>
          {phase("hunger")}
          <p className="mt-2 text-base">{hunger.text}</p>
          <p className="mt-2 text-base">
            <span className="font-medium">{t.weightHead}</span> {nums.weight.headline} {t.weightLine} {t.weightSmokers}
          </p>
          <HelpFold testId="help-hunger" count={hungerHelp.length}>
            {hungerHelp.map((h) => (
              <HelpItem key={h.id} testId={`help-${h.id}`} text={h.text} evidence={h.evidence} refs={h.refs} basis={h.basis} />
            ))}
          </HelpFold>
          <BasedOn testId="basis-hunger" label={t.basedOnHunger} parts={[{ text: hunger.text, basis: hunger.basis }, numPart(nums.weight, t.weightHead)]} refs={uniqueRefs([...hunger.refs, nums.weight.ref])} evidence={hunger.evidence} />
        </Card>
      </ul>

      <section data-testid="good-to-know" className="rounded-lg border border-border bg-card p-3 text-sm">
        <h2 className="text-base font-semibold">{t.moreLabel}</h2>
        <p data-testid="medicines" className="mt-2">
          <span className="font-medium">{t.cigarettesOnly}:</span> {medicines.text}
        </p>
        <BasedOn testId="basis-medicines" parts={[{ basis: medicines.basis }]} refs={medicines.refs} evidence={medicines.evidence} />
        <p data-testid="also-possible" className="mt-1 text-muted-foreground">
          {alsoPossible.text}
        </p>
      </section>

      <section data-testid="better" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t.betterTitle}</h2>
        <div className="rounded-lg border border-border bg-card px-3 pb-1">
          <ol className="flex flex-col divide-y divide-border">
            {betterOrder.map((row) => {
              const sourced = row.better ? betterLine(row.better) : null
              const label = `${row.when}${sourced?.cigarettesOnly ? ", cigarettes only" : `, ${t.studiedInSmokers}`}`
              const n = row.number === "after-first-month" ? nums.first : row.number === "after-mood" ? nums.mood : row.number ? nums.erection : null
              const text = sourced ? sourced.text : row.belief === "b3" ? b3.proof : n ? n.headline : ""
              const who = sourced
                ? `${tt.common.basis.who}: ${sourced.basis.who} (${sourced.basis.n})`
                : n
                  ? `${tt.common.basis.who}: ${n.counted} (${n.basis.n})`
                  : row.belief === "b3"
                    ? `${tt.common.basis.who}: ${t.b3Who} (469)`
                    : ""
              return (
                <li key={row.when} data-testid={`better-${row.when}`} className="py-3">
                  <p className="text-sm font-semibold text-primary">{label}</p>
                  <p className="mt-1 text-base">{text}</p>
                  {who && <p className="mt-1 text-sm text-muted-foreground">{who}</p>}
                </li>
              )
            })}
          </ol>
          <BasedOn testId="basis-better" parts={betterParts} refs={uniqueRefs(betterRefs)} />
        </div>
      </section>

      <SourcesFold refs={allRefs} />
    </div>
  )
}

function CaffeineItem({ testId }: { testId: string }) {
  return (
    <div data-testid={testId} className="py-3">
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
    <li id={`card-${id}`} data-testid={`card-${id}`} className="scroll-mt-4 rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 break-words text-base font-semibold">{title}</h2>
        {isNow(id, day) && <NowPill id={id} />}
      </div>
      {children}
    </li>
  )
}

function HelpItem({ testId, head, text, evidence, refs, basis }: { testId: string; head?: string; text: string; evidence: SourcedLine["evidence"]; refs: QuitRef[]; basis: Partial<SourcedLine["basis"]> }) {
  return (
    <div data-testid={testId} className="py-3">
      {head && <p className="font-medium">{head}</p>}
      <p>{text}</p>
      <div className="mt-2">
        <EvidenceChip evidence={evidence} />
      </div>
      <BasedOn testId={`${testId}-basis`} parts={[{ basis }]} refs={refs} />
    </div>
  )
}

function DayCard({ state, link, live, today }: { state: DayState; link: (id: string) => string; live: (id: string) => boolean; today: string }) {
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
            {t.countedFrom(fmtDay(state.from, today))}
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
            {daysToGo(state.n)} {t.aheadFirst(fmtDay(state.date, today))}
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
