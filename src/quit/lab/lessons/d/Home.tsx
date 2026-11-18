"use client"

import { useState } from "react"
import { Card, Head, InferredTag, NotSourced, Placeholder, PlaceholderScreen, ShareBtn } from "../../progress/shared/Bits"
import { CardPager, SampleTag } from "../shared/Bits"
import { arcFraction, weekOf } from "../shared/logic"
import { lsText } from "../shared/text"
import { money } from "./logic"
import type { DState } from "./state"
import { dText } from "./text"

export type Go = (view: string, n?: number) => void

const btn = "inline-flex min-h-12 w-full items-center justify-center rounded-md bg-sky-600 px-4 font-medium text-white"
const ghost = "inline-flex min-h-12 w-full items-center justify-center rounded-md border border-sky-400 px-4 font-medium"

/** Half-circle ring with the day in the middle. */
function Arc({ day }: { day: number }) {
  const f = arcFraction(day, 28)
  return (
    <div data-testid="d-arc" data-day={day} className="relative mx-auto w-64">
      <svg viewBox="0 0 100 58" className="w-full" aria-hidden="true">
        <path d="M10 50 A40 40 0 0 1 90 50" pathLength="100" fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-border" />
        <path d="M10 50 A40 40 0 0 1 90 50" pathLength="100" fill="none" strokeWidth="7" strokeLinecap="round" stroke="#38bdf8" strokeDasharray={`${f * 100} 100`} />
        <circle cx="10" cy="50" r="4" fill="#38bdf8" />
        <text x="90" y="56" textAnchor="middle" fontSize="7" fill="#fbbf24">{"★"}</text>
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <p className="text-4xl font-bold">{`${dText.dayWord} ${day}`}</p>
        <p className="text-sm text-muted-foreground">{dText.ofWord}</p>
      </div>
    </div>
  )
}

function Tile() {
  return <div className="h-24 rounded-lg border border-dashed border-border" aria-hidden="true" />
}

/** The home tab: badge row, day arc, figures, weekly guide, game, reasons, health, cravings, stories, tips. */
export function Home({ s, day, saved, bestNow, onGo }: { s: DState; day: number; saved: number | null; bestNow: number; onGo: Go }) {
  const week = weekOf(day)
  const reasons = [...s.motiv.map((i) => dText.motivOptions[i]), ...s.extra]
  const savedText = money(saved)
  return (
    <div data-testid="d-home" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">{dText.homeTitle}</h2>
        <button type="button" data-testid="d-settings" onClick={() => onGo("ph", -1)} className="inline-flex min-h-11 items-center gap-1 text-sm">
          {`${dText.settings} ⚙`}
        </button>
      </div>
      <button type="button" data-testid="d-badge-row" onClick={() => onGo("badges")} className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-card p-3 text-left">
        <span aria-hidden="true">{"🏅"}</span>
        <span className="flex-1 text-sm">{dText.badgeRow}</span>
        <span aria-hidden="true">{"›"}</span>
      </button>
      <Card>
        <h3 className="mb-2 text-lg font-semibold">{dText.progressCard}</h3>
        <Arc day={Math.min(28, day)} />
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-border p-2" data-testid="d-saved">
            <p className="text-xl font-bold">{savedText ?? <NotSourced />}</p>
            <p className="text-xs text-muted-foreground">{dText.saved}</p>
          </div>
          <div className="rounded-lg border border-border p-2" data-testid="d-best">
            <p className="text-xl font-bold">{dText.dayUnit(bestNow)}</p>
            <p className="text-xs text-muted-foreground">{dText.bestStreak}</p>
          </div>
        </div>
      </Card>
      <button type="button" data-testid="d-weekly" data-week={week} onClick={() => onGo("guide", week)} className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card p-3 text-left">
        <span className="size-12 shrink-0 rounded bg-gradient-to-br from-teal-500 to-amber-400" aria-hidden="true" />
        <span className="flex-1">
          <span className="block text-xs text-muted-foreground">{dText.weekGuide}</span>
          {week <= 2 ? <span className="block font-semibold">{dText.weekTitles[week - 1]}</span> : <Placeholder />}
        </span>
        <span aria-hidden="true">{"›"}</span>
      </button>
      <button type="button" data-testid="d-play" onClick={() => onGo("gamestart")} className={ghost}>{dText.playBtn}</button>
      <Card>
        <h3 className="mb-2 font-semibold">{dText.motivations}</h3>
        {reasons.length ? (
          <CardPager id="d-reasons" count={reasons.length} render={(i) => <p className="rounded-lg border border-border p-3 text-sm">{reasons[i]}</p>} />
        ) : (
          <Placeholder />
        )}
      </Card>
      <Card>
        <h3 className="mb-2 font-semibold">{dText.health}</h3>
        <div className="flex flex-col gap-2"><NotSourced /><NotSourced /></div>
        <button type="button" data-testid="d-view-progress" onClick={() => onGo("tab", 1)} className="mt-2 inline-flex min-h-11 items-center text-sm underline">{dText.viewProgress}</button>
      </Card>
      <Card>
        <h3 className="font-semibold">{dText.cravings}</h3>
        <p className="mb-2 text-sm text-muted-foreground">{dText.cravingsLine}</p>
        <CardPager
          id="d-cravings"
          count={5}
          render={(i) =>
            i < 3 ? (
              <button type="button" data-testid={`d-craving-${i}`} onClick={() => onGo("craving", i)} className="flex min-h-28 w-full flex-col justify-end rounded-lg border border-border bg-gradient-to-br from-pink-700/60 to-sky-800/60 p-3 text-left">
                <span className="text-xs text-muted-foreground">{dText.cravingLabel}</span>
                <span className="font-semibold">{dText.cravingCards[i]}</span>
              </button>
            ) : (
              <Placeholder className="min-h-28" />
            )
          }
        />
      </Card>
      <Card>
        <h3 className="mb-2 font-semibold">{dText.gettingStarted}</h3>
        <Placeholder />
      </Card>
      <Card>
        <h3 className="mb-2 font-semibold">{dText.stories}</h3>
        <CardPager id="d-stories" count={8} render={() => <Placeholder className="min-h-28" />} />
        <button type="button" data-testid="d-view-stories" onClick={() => onGo("stories")} className="inline-flex min-h-11 items-center text-sm underline">{dText.viewStories}</button>
      </Card>
      <Card>
        <h3 className="mb-2 font-semibold">{dText.tipsTitle}</h3>
        <p className="mb-2 rounded bg-pink-700/50 px-3 py-4 text-center text-sm font-bold tracking-widest">{dText.tipsBanner}</p>
        {s.tips.map((t) => (
          <div key={t.title} data-testid="d-tip" className="mb-2 rounded border border-border p-2 text-sm">
            <p className="font-semibold">{t.title}</p>
            <p className="whitespace-pre-wrap">{t.body}</p>
          </div>
        ))}
        <p className="mb-2 text-sm">{dText.tipsFirst}</p>
        <button type="button" data-testid="d-tip-add" onClick={() => onGo("tipform")} className={btn}>{dText.tipsAdd}</button>
        <button type="button" data-testid="d-tips-page" onClick={() => onGo("tips")} className="mt-1 inline-flex min-h-11 items-center text-sm underline">{dText.tipsPage}</button>
      </Card>
    </div>
  )
}

function Art({ week }: { week: number }) {
  return (
    <div className="relative h-36 overflow-hidden rounded-t-xl bg-gradient-to-r from-teal-600 to-amber-400" aria-hidden="true">
      <span className="absolute left-3 top-10 h-6 w-24 -skew-x-12 bg-white/40" />
      <span className="absolute right-3 top-16 h-6 w-24 skew-x-12 bg-white/40" />
      <span className="absolute -bottom-8 left-1/2 flex size-20 -translate-x-1/2 items-center justify-center rounded-full bg-background text-3xl font-bold">{week}</span>
    </div>
  )
}

/** The weekly guide: the lesson. Weeks 1 and 2 have sample lessons; weeks 3 and 4 were never seen. */
export function Guide({ week, onBack, onGo }: { week: number; onBack: () => void; onGo: Go }) {
  if (week > 2) return <PlaceholderScreen title={dText.weekTitle(week)} onBack={onBack} />
  return (
    <section data-testid="d-guide" data-week={week} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" data-testid="screen-back" aria-label={lsText.back} onClick={onBack} className="inline-flex min-h-11 items-center self-start text-sm underline">{dText.back}</button>
        {week === 2 && <InferredTag />}
      </div>
      <Art week={week} />
      <div className="mt-6 flex flex-col gap-3">
        <SampleTag />
        <p className="text-sm text-muted-foreground">{dText.guideLabel}</p>
        <h2 className="text-3xl font-bold">{dText.weekTitle(week)}</h2>
        {dText.guideBody[week - 1].map((p) => (
          <p key={p} className="text-sm leading-relaxed">{p}</p>
        ))}
        <h3 className="text-xl font-bold text-sky-300">{dText.missionsHead}</h3>
        <p className="text-sm">{dText.missionsLine}</p>
        <MissionRow onGo={onGo} />
        <button type="button" data-testid="d-all-missions" onClick={() => onGo("ph", -2)} className="inline-flex min-h-11 items-center text-sm underline">{dText.viewMissions}</button>
      </div>
    </section>
  )
}

/** The five mission cards: three titles seen, two never seen. */
export function MissionRow({ onGo }: { onGo: Go }) {
  return (
    <CardPager
      id="d-missions"
      count={5}
      render={(i) =>
        i === 0 || i === 2 ? (
          <button type="button" data-testid={`d-mission-${i}`} onClick={() => onGo("mission", i)} className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-2 text-left">
            <Tile />
            <span className="text-xs text-muted-foreground">{dText.missionLabel}</span>
            <span className="font-semibold">{dText.missionTitles[i === 0 ? 0 : 1]}</span>
          </button>
        ) : (
          <Placeholder className="min-h-32" />
        )
      }
    />
  )
}

/** A mission page: never seen. Only the first one carries a short sample lesson of ours. */
export function Mission({ i, onBack }: { i: number; onBack: () => void }) {
  return (
    <section data-testid="d-mission" className="flex flex-col gap-3">
      <Head title={dText.missionTitles[i === 2 ? 1 : 0]} onBack={onBack} inferred />
      <Tile />
      {i === 0 ? (
        <div data-testid="d-mission-lesson" className="flex flex-col gap-2">
          <SampleTag />
          {dText.missionPrompt.map((p) => (
            <p key={p} className="text-sm leading-relaxed">{p}</p>
          ))}
        </div>
      ) : (
        <>
          <Placeholder />
          <Placeholder />
        </>
      )}
    </section>
  )
}

/** A craving card page: title, one paragraph (never seen), share, and the game button on the game card. */
export function CravingCard({ i, onBack, onGo }: { i: number; onBack: () => void; onGo: Go }) {
  return (
    <section data-testid="d-craving-page" className="flex flex-col gap-3">
      <Head title={dText.cravingCards[i]} onBack={onBack} right={<ShareBtn text={dText.cravingCards[i]} testId="d-craving-share" />} inferred />
      <Placeholder />
      {i === 0 && <button type="button" data-testid="d-craving-play" onClick={() => onGo("gamestart")} className={btn}>{dText.playBtn}</button>}
    </section>
  )
}

/** The game start page (pink); high scores and instructions were never seen. */
export function GameStart({ onBack, onStart, onGo }: { onBack: () => void; onStart: () => void; onGo: Go }) {
  return (
    <section data-testid="d-gamestart" className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 rounded-2xl bg-pink-700 p-6 text-center text-white">
      <button type="button" data-testid="screen-back" onClick={onBack} className="inline-flex min-h-11 items-center self-start text-sm underline">{dText.back}</button>
      <h2 className="text-4xl font-bold">{dText.gameTitle}</h2>
      <svg width="70" height="40" viewBox="0 0 70 40" aria-hidden="true"><path d="M5 30 Q20 5 35 25 T65 10" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" /></svg>
      <button type="button" data-testid="d-game-start" onClick={onStart} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-white px-4 font-bold text-black">{dText.gameStart}</button>
      <button type="button" data-testid="d-game-scores" onClick={() => onGo("ph", -3)} className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-white px-4 font-bold">{dText.gameScores}</button>
      <button type="button" data-testid="d-game-help" onClick={() => onGo("ph", -4)} className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-white px-4 font-bold">{dText.gameHelp}</button>
    </section>
  )
}

/** Tips list page: six cards, each page was never seen. */
export function TipsPage({ onBack, onGo }: { onBack: () => void; onGo: Go }) {
  return (
    <section data-testid="d-tips" className="flex flex-col gap-2">
      <Head title={dText.tipsPage} onBack={onBack} />
      {dText.tipsList.map((t, i) => (
        <button key={t} type="button" data-testid={`d-tipcard-${i}`} onClick={() => onGo("ph", 10 + i)} className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-card p-3 text-left">
          <span className="size-10 shrink-0 rounded bg-gradient-to-br from-teal-600 to-sky-700" aria-hidden="true" />
          <span className="flex-1">{t}</span>
          <span aria-hidden="true">{"›"}</span>
        </button>
      ))}
    </section>
  )
}

/** Write your own tip: title (65), tip (2000), photo. */
export function TipForm({ onBack, onSave }: { onBack: () => void; onSave: (title: string, body: string) => void }) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  return (
    <section data-testid="d-tipform" className="flex flex-col gap-3">
      <Head title={dText.tipsAdd} onBack={onBack} />
      <input data-testid="d-tip-title" aria-label={dText.tipTitleField} placeholder={dText.tipTitleField} maxLength={65} value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-11 rounded-md border border-border bg-background px-3" />
      <textarea data-testid="d-tip-body" aria-label={dText.tipField} placeholder={dText.tipField} maxLength={2000} rows={6} value={body} onChange={(e) => setBody(e.target.value)} className="rounded-md border border-border bg-background p-3" />
      <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border px-4 text-sm">
        {dText.addPhoto}
        <input type="file" accept="image/*" aria-label={dText.photoLabel} className="sr-only" />
      </label>
      <button type="button" data-testid="d-tip-save" disabled={!title.trim() || !body.trim()} onClick={() => onSave(title.trim(), body.trim())} className={`${btn} disabled:opacity-40`}>{dText.tipAdd}</button>
    </section>
  )
}

/** All success stories: only the structure was seen; every card is a placeholder. */
export function StoriesPage({ onBack }: { onBack: () => void }) {
  return (
    <section data-testid="d-stories-page" className="flex flex-col gap-3">
      <Head title={dText.storiesTitle} onBack={onBack} />
      <Placeholder className="min-h-24" />
      <Placeholder className="min-h-24" />
      <Placeholder className="min-h-24" />
    </section>
  )
}
