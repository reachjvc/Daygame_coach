"use client"

import { useEffect, useState } from "react"
import { PlaceholderScreen } from "../../progress/shared/Bits"
import { SnakeGame } from "../../sos/c/SnakeGame"
import { labStore } from "../../store"
import { FixedNav, NavSpace, SkipBar, Sheet, useLessonState } from "../shared/Bits"
import { dayNumber, savedAmount } from "../shared/logic"
import { CravingCard, GameStart, Guide, Home, Mission, StoriesPage, TipForm, TipsPage } from "./Home"
import { countEarned, earnedBadges } from "./logic"
import { DayOne, Signup, Welcome } from "./Onboarding"
import { INITIAL_D } from "./state"
import { AskSheet, Badges, Diary, Discover, EightDays, Finish, Mood, Progress, Relapse } from "./Tabs"
import { dText } from "./text"

interface Cur {
  k: string
  n: number
}
const ROOT: Cur = { k: "root", n: 0 }

const phTitle = (n: number): string => (n === -1 ? dText.settings : n === -2 ? dText.viewMissions : n === -3 ? dText.gameScores : n === -4 ? dText.gameHelp : (dText.tipsList[n - 10] ?? dText.placeholderTitle))

/** Copy D: 28-day guide. Welcome cards, sign-up, day-one questions, then four tabs with the weekly guide, missions, cravings game, badges, diary, discover, slip flow and finish. */
export function LessonsD() {
  const [s, update] = useLessonState("d", INITIAL_D)
  const [tab, setTab] = useState(0)
  const [cur, setCur] = useState<Cur>(ROOT)
  const [stack, setStack] = useState<Cur[]>([])
  const [helped, setHelped] = useState(false)
  const day = dayNumber(s.quitMs, Date.now(), s.skips)
  const saved = savedAmount(s.perDay, s.packCost, day)
  const earned = earnedBadges({ day, saved, buddy: !!s.buddy, reminders: s.notif, reasons: s.motiv.length > 0 || s.extra.length > 0, played: s.played })
  const bestNow = Math.max(s.best, day)

  useEffect(() => {
    setStack([])
    setCur(ROOT)
  }, [tab])

  const go = (k: string, n = 0) => {
    if (k === "tab") {
      setTab(n)
      setStack([])
      setCur(ROOT)
      return
    }
    setStack((st) => [...st, cur])
    setCur({ k, n })
  }
  const back = () => {
    setCur(stack[stack.length - 1] ?? ROOT)
    setStack(stack.slice(0, -1))
  }

  if (s.stage === "welcome") {
    return <div data-testid="lessons-d"><Welcome onDone={() => update({ stage: "signup" })} /></div>
  }
  if (s.stage === "signup") {
    return <div data-testid="lessons-d"><Signup s={s} update={update} onDone={() => update({ stage: "dayone" })} /></div>
  }
  if (s.stage === "dayone") {
    return (
      <div data-testid="lessons-d">
        <DayOne
          update={update}
          onAsk={() => { update({ stage: "app" }); setCur({ k: "relapse", n: 0 }) }}
          onDone={() => update({ stage: "app" })}
        />
      </div>
    )
  }

  const skip = () => {
    update((c) => ({ skips: c.skips + 1 }))
    setStack([])
    setCur(ROOT)
  }
  const restart = (ms: number) => {
    update({ best: Math.max(s.best, day), attempts: s.attempts + 1, quitMs: ms, skips: 0, askedDay: dayNumber(ms, Date.now(), 0), finishSeen: false, day8Shown: false })
    setStack([])
    setCur(ROOT)
  }
  const gameTotal = Number(labStore().get("sos", "c", "total")) || 0

  let body: React.ReactNode
  let nav = false
  if (cur.k === "relapse") body = <Relapse days={day} saved={saved} onGo={restart} />
  else if (day > 28 && !s.finishSeen) body = <Finish s={s} day={Math.max(29, day) - 1} saved={saved} badges={countEarned(earned)} game={gameTotal} update={update} onDone={() => update({ finishSeen: true })} />
  else if (cur.k === "guide") body = <Guide week={cur.n} onBack={back} onGo={go} />
  else if (cur.k === "mission") body = <Mission i={cur.n} onBack={back} />
  else if (cur.k === "craving") body = <CravingCard i={cur.n} onBack={back} onGo={go} />
  else if (cur.k === "gamestart") body = <GameStart onBack={back} onStart={() => { update({ played: true }); go("game") }} onGo={go} />
  else if (cur.k === "game") body = <SnakeGame countUp onBack={() => { setHelped(true); setStack([]); setCur(ROOT) }} />
  else if (cur.k === "tips") body = <TipsPage onBack={back} onGo={go} />
  else if (cur.k === "tipform") body = <TipForm onBack={back} onSave={(title, b) => { update({ tips: [...s.tips, { title, body: b }] }); back() }} />
  else if (cur.k === "stories") body = <StoriesPage onBack={back} />
  else if (cur.k === "badges") body = <Badges earned={earned} onBack={back} />
  else if (cur.k === "ph") body = <PlaceholderScreen title={phTitle(cur.n)} onBack={back} />
  else {
    nav = true
    body =
      tab === 0 ? (
        <Home s={s} day={day} saved={saved} bestNow={bestNow} onGo={go} />
      ) : tab === 1 ? (
        s.moodDay < day ? (
          <Mood onDone={() => update({ moodDay: day })} onSkip={() => update({ moodDay: day })} />
        ) : (
          <Progress s={s} day={day} saved={saved} onGo={go} />
        )
      ) : tab === 2 ? (
        <Diary s={s} day={day} update={update} bestNow={bestNow} onGo={go} />
      ) : (
        <Discover />
      )
  }

  const ask = s.askedDay < day && cur.k !== "relapse"
  const eight = !ask && day >= 8 && !s.day8Shown && cur.k !== "relapse" && !(day > 28 && !s.finishSeen)
  return (
    <div data-testid="lessons-d" className="flex flex-col gap-3">
      <SkipBar day={day} onSkip={skip} />
      {body}
      {nav && <FixedNav items={dText.tabs} value={tab} onChange={setTab} id="d-tab" />}
      {nav && <NavSpace />}
      {ask && <AskSheet onNo={() => update({ askedDay: day })} onYes={() => { update({ askedDay: day }); setCur({ k: "relapse", n: 0 }) }} />}
      {eight && <EightDays day={day} saved={saved} badges={countEarned(earned)} onClose={() => update({ day8Shown: true })} />}
      {helped && (
        <Sheet testId="d-helped">
          <div className="flex flex-col gap-3 pt-2 text-center">
            <h3 className="text-lg font-semibold">{dText.gameHelped}</h3>
            <div className="flex gap-3">
              <button type="button" data-testid="d-helped-yes" onClick={() => setHelped(false)} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-sky-600 px-2 text-sm font-medium text-white">{dText.helpedYes}</button>
              <button type="button" data-testid="d-helped-no" onClick={() => setHelped(false)} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-sky-600 px-2 text-sm font-medium text-white">{dText.helpedNo}</button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  )
}
