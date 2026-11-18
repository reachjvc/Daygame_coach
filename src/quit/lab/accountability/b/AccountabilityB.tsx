"use client"

import { useEffect, useRef, useState } from "react"
import { Clock } from "../../checkin/b/CheckinB"
import { Card, ExampleBar, Head, InferredTag, NotSourced, Placeholder, PlaceholderScreen } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import { Hub, LabTag, NotBuilt, ToHub } from "../shared/Bits"
import { acText } from "../shared/text"
import { dayKey } from "../shared/logic"
import {
  TOKEN_DAYS,
  clockDayCount,
  clockStats,
  dayShare,
  seedClocks,
  seedMessages,
  seedPartnerClocks,
  timeLabel,
  tokenDate,
  tokenEarned,
  type ClockData,
  type Msg,
} from "./logic"
import { abText as t } from "./text"

type Screen = "hub" | "photo" | "home" | "clocks" | "clock" | "clocksettings" | "addclock" | "profile" | "chat" | "chatmenu" | "connect" | "request" | "share" | "tempted" | "tokens" | "token" | "other" | "notifications"

/** A coloured ring with the day count inside and a dot riding on the edge. */
function ClockRing({ c, days, size = 150, testId, onClick }: { c: ClockData; days: number; size?: number; testId: string; onClick?: () => void }) {
  const [share, setShare] = useState(0)
  useEffect(() => setShare(dayShare(Date.now())), [])
  const r = size / 2 - 5
  const angle = share * 2 * Math.PI - Math.PI / 2
  const body = (
    <>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.color} strokeWidth={4} />
        <circle cx={size / 2 + r * Math.cos(angle)} cy={size / 2 + r * Math.sin(angle)} r={7} fill={c.color} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span data-testid={`${testId}-days`} className="text-4xl font-bold leading-none">{days}</span>
        <span className="text-xs text-muted-foreground">{t.daysWord}</span>
      </span>
    </>
  )
  const wrap = "relative inline-flex shrink-0 items-center justify-center"
  return (
    <div className="flex flex-col items-center gap-1">
      {onClick ? (
        <button type="button" data-testid={testId} aria-label={c.name} onClick={onClick} className={wrap} style={{ width: size, height: size }}>{body}</button>
      ) : (
        <div data-testid={testId} className={wrap} style={{ width: size, height: size }}>{body}</div>
      )}
      <span className="text-center text-sm font-semibold">{c.name}</span>
    </div>
  )
}

/** Copy B: day clocks that partners follow, with a check-in and a chat. */
export function AccountabilityB() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <Main />
}

function Main() {
  const today = dayKey(Date.now())
  const [screen, setScreen] = useState<Screen>("hub")
  const [tab, setTab] = useState(0)
  const [partnerView, setPartnerView] = useState(false)
  const [otherTitle, setOtherTitle] = useState("")
  const [tokenIdx, setTokenIdx] = useState(0)
  const [clocks, setClocks] = useLabState<ClockData[] | null>("accountability", "b", "clocks", null)
  const [checkins, setCheckins] = useLabState<string[]>("accountability", "b", "checkins", [])
  const [request, setRequest] = useLabState<"none" | "pending">("accountability", "b", "request", "none")
  const [msgs, setMsgs] = useLabState<Msg[] | null>("accountability", "b", "msgs", null)
  const [draft, setDraft] = useState("")
  const [note, setNote] = useState(false)
  const list = clocks ?? seedClocks(today)
  const mine = list[0]
  const myDays = mine ? clockDayCount(mine, today) : 0
  const chat = msgs ?? seedMessages(Date.now())
  const hub = () => setScreen("hub")
  const go = (s: Screen) => setScreen(s)
  const tile = (i: number) => {
    if (i === 0) return go("clocks")
    if (i === 1) return go("profile")
    if (i === 2) return go("chat")
    if (i === 4) return go("connect")
    if (i === 7) return go("notifications")
    setOtherTitle(t.tiles[i])
    go("other")
  }
  const send = () => {
    if (draft.trim() === "") return
    setMsgs([...chat, { id: `m${chat.length + 1}`, mine: true, text: draft.trim(), at: Date.now() }])
    setDraft("")
  }
  const bottom = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (screen === "chat") bottom.current?.scrollIntoView?.({ block: "end" })
  }, [screen, chat.length])
  const clearExample = () => {
    setClocks([])
    setMsgs([])
  }
  const sample = clocks === null

  return (
    <div data-testid="accountability-b" data-screen={screen} className="flex flex-col">
      {screen !== "hub" && <ToHub onClick={hub} />}
      {sample && screen !== "hub" && <ExampleBar onClear={clearExample} />}
      {screen === "hub" && <Hub id="b" items={t.screens} onOpen={(id) => go(id as Screen)} />}

      {screen === "home" && (
        <section data-testid="b-home" className="flex flex-col gap-3">
          <h2 className="text-center text-lg font-semibold">{t.homeTitle}</h2>
          <div className="grid grid-cols-2 gap-3">
            {t.tiles.map((label, i) => (
              <button key={label} type="button" data-testid={`b-tile-${i}`} onClick={() => tile(i)} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm">
                <span aria-hidden="true" className="text-3xl text-sky-400">{t.tileGlyphs[i]}</span>
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {screen === "other" && (
        <section data-testid="b-other" className="flex flex-col gap-3">
          <Head title={otherTitle} onBack={() => go("home")} />
          <NotBuilt label={t.otherTool} />
        </section>
      )}
      {screen === "notifications" && <div data-testid="b-notifications"><PlaceholderScreen title={t.tiles[7]} onBack={() => go("home")} /></div>}

      {screen === "clocks" && (
        <section data-testid="b-clocks" className="flex flex-col gap-3">
          <Head title={t.clocksTitle} onBack={() => go("home")} />
          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1">
            {t.tabs.map((label, i) => (
              <button key={label} type="button" role="tab" aria-selected={tab === i} data-testid={`b-tab-${i}`} onClick={() => setTab(i)} className={`min-h-11 rounded-full text-sm ${tab === i ? "bg-muted font-semibold" : ""}`}>
                {label}
              </button>
            ))}
          </div>
          {tab === 0 && (
            <>
              <div className="grid grid-cols-2 gap-y-4">
                {list.map((c) => (
                  <ClockRing key={c.id} c={c} days={clockDayCount(c, today)} testId={`b-clock-${c.id}`} size={150} onClick={() => go("clock")} />
                ))}
              </div>
              <div className="flex justify-end">
                <button type="button" data-testid="b-add" aria-label={t.addClock} onClick={() => go("addclock")} className="inline-flex size-14 items-center justify-center rounded-full bg-sky-500 text-3xl text-white">{"+"}</button>
              </div>
            </>
          )}
          {tab === 1 && (
            <>
              <div className="flex items-center gap-2">
                <button type="button" data-testid="b-partner-view" aria-pressed={partnerView} onClick={() => setPartnerView(!partnerView)} className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${partnerView ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
                  {t.partnerViewToggle}
                </button>
                <LabTag />
              </div>
              {partnerView ? (
                <Card testId="b-partner-card" className="flex flex-col items-center gap-2">
                  <p className="text-sm text-muted-foreground">{t.partnerViewTitle}</p>
                  {mine && <ClockRing c={mine} days={myDays} testId="b-partner-clock" size={130} />}
                  <p data-testid="b-partner-state" className="text-sm">{checkins.includes(today) ? t.partnerViewChecked : t.partnerViewOpen}</p>
                </Card>
              ) : sample ? (
                <>
                  <button type="button" data-testid="b-partner-open" onClick={() => go("profile")} className="inline-flex min-h-11 items-center self-start text-sm underline">{t.partnerRow}</button>
                  <div className="grid grid-cols-2 gap-y-4">
                    {seedPartnerClocks(today).map((c) => (
                      <ClockRing key={c.id} c={c} days={clockDayCount(c, today)} testId={`b-following-${c.id}`} size={150} />
                    ))}
                  </div>
                </>
              ) : (
                <Placeholder />
              )}
            </>
          )}
        </section>
      )}

      {screen === "addclock" && <div data-testid="b-addclock"><PlaceholderScreen title={t.addClockTitle} onBack={() => go("clocks")} /></div>}
      {screen === "clocksettings" && <div data-testid="b-clocksettings"><PlaceholderScreen title={t.clockSettingsTitle} onBack={() => go("clock")} /></div>}

      {screen === "clock" && (
        <div data-testid="b-clock-screen" className="flex flex-col gap-3">
          <Clock days={myDays} checkins={checkins} today={today} onCheckin={() => setCheckins([...checkins, today])} onClose={() => go("clocks")} onGear={() => go("clocksettings")} />
          <Card testId="b-stats" className="mt-12 flex flex-col gap-2">
            <p className="font-semibold">{t.statsTitle}</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">{t.statCurrent}</dt>
              <dd data-testid="b-stat-current">{clockStats(mine?.start ?? today, today, 0).current}</dd>
              <dt className="text-muted-foreground">{t.statMax}</dt>
              <dd data-testid="b-stat-max">{clockStats(mine?.start ?? today, today, 0).current}</dd>
              <dt className="text-muted-foreground">{t.statResets}</dt>
              <dd data-testid="b-stat-resets">{clockStats(mine?.start ?? today, today, 0).resets}</dd>
              <dt className="text-muted-foreground">{t.statMoney}</dt>
              <dd><NotSourced /></dd>
            </dl>
          </Card>
        </div>
      )}

      {screen === "profile" && (
        <section data-testid="b-profile" className="flex flex-col items-center gap-3">
          <div className="flex w-full items-center">
            <button type="button" data-testid="b-profile-close" aria-label={t.closeLabel} onClick={() => go("home")} className="inline-flex size-11 items-center justify-center text-xl">{"×"}</button>
            <h2 className="min-w-0 flex-1 text-center text-base font-semibold">{t.partnerName}</h2>
            <span className="size-11" />
          </div>
          <div aria-hidden="true" className="flex size-32 items-center justify-center rounded-full border-4 border-sky-500 bg-muted text-4xl">{t.partnerName[0]}</div>
          <p className="text-center text-sm text-muted-foreground">{t.bio}</p>
          <div className="flex w-full items-center gap-2">
            <button type="button" data-testid="b-partners-btn" onClick={() => go("request")} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-md bg-indigo-700 text-sm font-medium text-white">
              {t.partnersBtn}
            </button>
            <button type="button" data-testid="b-chat-btn" aria-label={t.chatBtn} onClick={() => go("chat")} className="inline-flex size-12 items-center justify-center rounded-md border border-border bg-card">{"✉"}</button>
          </div>
          <p className="self-start text-sm text-muted-foreground">{t.publicClocks}</p>
          {sample ? (
            <div className="grid w-full grid-cols-2 gap-y-4">
              {seedPartnerClocks(today).map((c) => (
                <ClockRing key={c.id} c={c} days={clockDayCount(c, today)} testId={`b-profile-${c.id}`} size={150} />
              ))}
            </div>
          ) : (
            <Placeholder />
          )}
        </section>
      )}

      {screen === "request" && (
        <section data-testid="b-request" className="flex flex-col gap-3">
          <Head title={t.requestTitle} onBack={() => go("profile")} inferred />
          <p className="text-sm text-muted-foreground">{t.requestStated}</p>
          {request === "none" ? (
            <button type="button" data-testid="b-request-send" onClick={() => setRequest("pending")} className="inline-flex min-h-12 items-center justify-center rounded-md bg-indigo-700 text-sm font-medium text-white">{t.requestSend}</button>
          ) : (
            <div className="flex items-center gap-2">
              <span data-testid="b-request-pending" className="rounded-full border border-border px-3 py-1 text-sm">{t.requestPending}</span>
              <InferredTag />
            </div>
          )}
          <p className="text-xs text-muted-foreground">{acText.nothingSent}</p>
          <p className="text-sm">{t.requestAnswers}</p>
          <Placeholder />
        </section>
      )}

      {screen === "chat" && (
        <section data-testid="b-chat" className="flex min-h-[70vh] flex-col gap-2">
          <div className="flex items-center gap-2">
            <button type="button" data-testid="b-chat-back" aria-label={t.chatBack} onClick={() => go("profile")} className="inline-flex size-11 items-center justify-center text-xl">{"←"}</button>
            <h2 className="min-w-0 flex-1 truncate text-center text-base font-semibold">{t.partnerName}</h2>
            <button type="button" data-testid="b-chat-menu" aria-label={t.chatMenu} onClick={() => go("chatmenu")} className="inline-flex size-11 items-center justify-center text-xl">{"⋮"}</button>
          </div>
          <p className="text-center text-xs text-muted-foreground">{t.chatToday}</p>
          <div className="flex flex-1 flex-col gap-2" data-testid="b-bubbles">
            {chat.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
                <span className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.mine ? "bg-blue-600 text-white" : "bg-card"}`}>{m.text}</span>
                <span className="text-xs text-muted-foreground">{timeLabel(m.at)}</span>
              </div>
            ))}
            <div ref={bottom} />
          </div>
          <p className="text-xs text-muted-foreground">{acText.nothingSent}</p>
          <div className="flex items-center gap-2 border-t border-border pt-2">
            <button
              type="button"
              data-testid="b-camera"
              aria-label={t.chatCamera}
              onClick={() => go("photo")}
              className="inline-flex size-11 shrink-0 items-center justify-center text-blue-500"
            >
              <svg width="26" height="22" viewBox="0 0 26 22" aria-hidden="true" className="fill-none stroke-current" strokeWidth="2">
                <path d="M2 6h5l2-3h8l2 3h5v14H2z" />
                <circle cx="13" cy="13" r="4" />
              </svg>
            </button>
            <input data-testid="b-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={t.chatPlaceholder} aria-label={t.chatPlaceholder} className="min-h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-base" />
            <button type="button" data-testid="b-send" disabled={draft.trim() === ""} onClick={send} className={`inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium ${draft.trim() === "" ? "bg-muted text-muted-foreground" : "bg-blue-600 text-white"}`}>
              {t.chatSend}
            </button>
          </div>
        </section>
      )}
      {screen === "photo" && <div data-testid="b-photo"><PlaceholderScreen title={t.chatCamera} onBack={() => go("chat")} /></div>}
      {screen === "chatmenu" && <div data-testid="b-chatmenu"><PlaceholderScreen title={t.chatMenuTitle} onBack={() => go("chat")} /></div>}

      {screen === "connect" && (
        <section data-testid="b-connect" className="flex flex-col gap-3">
          <Head title={t.connectTitle} onBack={() => go("home")} inferred />
          <p className="text-sm text-muted-foreground">{t.connectStated}</p>
          <Placeholder />
          <Placeholder />
        </section>
      )}
      {screen === "share" && (
        <section data-testid="b-share" className="flex flex-col gap-3">
          <Head title={t.shareTitle} inferred />
          <p className="text-sm text-muted-foreground">{t.shareStated}</p>
          <Placeholder />
        </section>
      )}
      {screen === "tempted" && (
        <section data-testid="b-tempted" className="flex flex-col gap-3">
          <Head title={t.temptedTitle} inferred />
          <p className="text-sm text-muted-foreground">{t.temptedStated}</p>
          <Placeholder />
        </section>
      )}

      {screen === "tokens" && (
        <section data-testid="b-tokens" className="flex flex-col gap-3">
          <Head title={t.tokensTitle} />
          <div className="grid grid-cols-3 gap-3">
            {TOKEN_DAYS.map((d, i) => {
              const ok = tokenEarned(myDays, d)
              return (
                <button
                  key={d}
                  type="button"
                  data-testid={`b-token-${i}`}
                  data-earned={ok ? "1" : "0"}
                  onClick={() => ok && (setTokenIdx(i), go("token"))}
                  className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-full border-2 px-1 text-center text-xs ${ok ? "border-amber-400 bg-amber-400/10" : "border-border opacity-60"}`}
                >
                  <span className="font-semibold">{t.tokenNames[i]}</span>
                  {!ok && <span className="text-[10px] text-muted-foreground">{t.tokenLocked}</span>}
                </button>
              )
            })}
          </div>
          <InferredTag />
        </section>
      )}

      {screen === "token" && (
        <section data-testid="b-token-page" className="relative flex flex-col items-center gap-3 overflow-hidden py-4">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex h-32 justify-around">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="animate-bounce text-lg" style={{ animationDelay: `${i * 90}ms`, color: ["#f59e0b", "#0ea5e9", "#22c55e", "#ec4899"][i % 4] }}>{"●"}</span>
            ))}
          </div>
          <div className="mt-10 flex size-40 flex-col items-center justify-center rounded-full border-4 border-amber-400 bg-amber-400/10 text-center">
            <span className="text-sm font-semibold">{t.tokenNames[tokenIdx]}</span>
          </div>
          <h2 className="text-xl font-semibold">{t.tokenCongrats}</h2>
          <p className="text-sm text-muted-foreground">{t.tokenNew}</p>
          <dl className="grid w-full grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{t.tokenClock}</dt>
            <dd>{mine?.name ?? t.clockName}</dd>
            <dt className="text-muted-foreground">{t.tokenType}</dt>
            <dd data-testid="b-token-type">{t.tokenTypes[tokenIdx]}</dd>
            <dt className="text-muted-foreground">{t.tokenStart}</dt>
            <dd data-testid="b-token-start">{mine?.start ?? today}</dd>
            <dt className="text-muted-foreground">{t.tokenEarned}</dt>
            <dd data-testid="b-token-earned">{tokenDate(mine?.start ?? today, TOKEN_DAYS[tokenIdx])}</dd>
          </dl>
          <div className="flex items-center gap-2">
            <button type="button" data-testid="b-token-share" onClick={() => setNote(true)} className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm">{t.tokenShare}</button>
            <InferredTag />
          </div>
          {note && <p data-testid="b-token-note" className="text-xs text-muted-foreground">{acText.nothingSent}</p>}
          <button type="button" data-testid="b-token-back" onClick={() => go("tokens")} className="inline-flex min-h-11 items-center text-sm underline">{t.tokenBack}</button>
        </section>
      )}
    </div>
  )
}
