"use client"

import { useEffect, useState } from "react"
import { Card, ExampleBar, Head, InferredTag, NotSourced, Placeholder } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import { Field, Hub, NotBuilt, Primary, ToHub } from "../shared/Bits"
import { acText } from "../shared/text"
import { ago, dayKey, looksLikeEmail } from "../shared/logic"
import { allHealthy, checkinStreak, filterFeed, seedFeed, type FeedItem, type Perm } from "./logic"
import { aaText as t } from "./text"

type Screen = "hub" | "signup" | "install" | "health" | "add" | "accept" | "activity" | "checkin" | "checkin-run" | "community" | "remove" | "alerts" | "chat" | "filters"
interface Ally {
  name: string
  email: string
  status: "pending" | "accepted"
}

const agoText = (ms: number) => {
  const a = ago(ms)
  return a.unit === "minutes" ? t.agoMinutes(a.n) : a.unit === "hours" ? t.agoHours(a.n) : t.agoDays(a.n)
}

/** Copy A: a monitoring app where a trusted ally reviews what the member did. */
export function AccountabilityA() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <Main />
}

function Main() {
  const [screen, setScreen] = useState<Screen>("hub")
  const [step, setStep] = useState(0)
  const [plan, setPlan] = useState<number | null>(null)
  const [money, setMoney] = useState(false)
  const [promoOpen, setPromoOpen] = useState(false)
  const [promo, setPromo] = useState("")
  const [perms, setPerms] = useLabState<Record<Perm, boolean>>("accountability", "a", "perms", { vpn: true, notifications: false, extension: false })
  const [ally, setAlly] = useLabState<Ally | null>("accountability", "a", "ally", null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [feed, setFeed] = useLabState<FeedItem[] | null>("accountability", "a", "feed", null)
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState("")
  const [checkins, setCheckins] = useLabState<string[]>("accountability", "a", "checkins", [])
  const [confirmRemove, setConfirmRemove] = useState(false)
  const today = dayKey(Date.now())
  const items = feed ?? seedFeed()
  const hub = () => setScreen("hub")
  const open = (id: string) => {
    if (id === "signup") {
      setStep(0)
      setMoney(false)
    }
    setScreen(id as Screen)
  }

  return (
    <div data-testid="accountability-a" data-screen={screen} className="flex flex-col">
      {screen !== "hub" && <ToHub onClick={hub} />}
      {screen === "hub" && <Hub id="a" items={t.screens} onOpen={open} />}

      {screen === "signup" && (
        <section data-testid="a-signup" data-step={step + 1} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" data-testid="a-step-back" onClick={() => (step === 0 ? hub() : setStep(step - 1))} className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
              {acText.back}
            </button>
          </div>
          <div className="flex items-center gap-2" aria-label={t.progressLabel}>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-primary" style={{ width: `${((step + 1) / 7) * 100}%` }} />
            </div>
            <span data-testid="a-step-count" className="text-sm">{t.stepOf(step + 1, 7)}</span>
          </div>
          <h2 className="text-xl font-semibold">{t.signupSteps[step].title}</h2>
          <p className="text-sm text-muted-foreground">{t.signupSteps[step].line}</p>
          {step < 6 && <NotBuilt label={acText.notCopiedSignup} testId="a-gate" />}
          {step === 6 && (
            <>
              <div role="radiogroup" className="flex flex-col gap-2">
                {t.planCards.map((p, i) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={plan === i}
                    data-testid={`a-plan-${i}`}
                    onClick={() => setPlan(i)}
                    className={`flex min-h-16 flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left ${plan === i ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                  >
                    <span className="text-base">{p}{i === 2 ? ` (${t.planNoTrial})` : ""}</span>
                    <NotSourced />
                  </button>
                ))}
              </div>
              <button type="button" data-testid="a-promo-row" aria-expanded={promoOpen} onClick={() => setPromoOpen(!promoOpen)} className="flex min-h-12 items-center justify-between rounded-lg border border-border bg-card px-3 text-left text-sm font-semibold">
                {t.promoRow}
                <span aria-hidden="true">{promoOpen ? "˄" : "˅"}</span>
              </button>
              {promoOpen && <Field label={t.promoLabel} value={promo} onChange={setPromo} testId="a-promo" />}
            </>
          )}
          {step < 6 ? (
            <Primary label={`${acText.next} ›`} onClick={() => setStep(step + 1)} testId="a-next" />
          ) : (
            <>
              <Primary label={`${acText.next} ›`} onClick={() => setMoney(true)} disabled={plan === null} testId="a-next" />
            </>
          )}
          {money && <NotBuilt label={acText.notBuiltMoney} testId="a-money" />}
        </section>
      )}

      {screen === "install" && (
        <section data-testid="a-install" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t.installTitle}</h2>
          <ol className="flex flex-col gap-3">
            {t.installRows.map((r, i) => (
              <li key={r.name} className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card">{i + 1}</span>
                <span className="flex min-w-0 flex-col">
                  {i === 3 && <span className="text-xs text-muted-foreground">{t.optional}</span>}
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-sm text-muted-foreground">{r.line}</span>
                </span>
              </li>
            ))}
          </ol>
          <Primary label={t.startInstall} onClick={() => setScreen("health")} testId="a-start-install" />
        </section>
      )}

      {screen === "health" && (
        <section data-testid="a-health" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t.healthTitle}</h2>
          {t.healthCards.map((c) => {
            const ok = perms[c.id as Perm]
            return (
              <Card key={c.id} testId={`a-health-${c.id}`} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className={`flex size-6 items-center justify-center rounded-full text-xs text-white ${ok ? "bg-green-600" : "bg-red-600"}`}>{ok ? "✓" : "✕"}</span>
                  <span className="font-semibold">{c.name}</span>
                  <span data-testid={`a-health-state-${c.id}`} className="ml-auto text-xs text-muted-foreground">{ok ? t.healthOk : t.healthBad}</span>
                </div>
                <p className="text-sm text-muted-foreground">{ok ? c.ok : c.bad}</p>
                {!ok && (
                  <button type="button" data-testid={`a-fix-${c.id}`} onClick={() => setPerms({ ...perms, [c.id]: true })} className="inline-flex min-h-11 items-center justify-center rounded-full bg-sky-600 px-4 text-sm font-medium text-white">
                    {t.fixNow}
                  </button>
                )}
              </Card>
            )
          })}
          <p className="text-xs text-muted-foreground">{t.fixNote}</p>
          {allHealthy(perms) && <p data-testid="a-all-ok" className="text-sm">{t.healthOk}</p>}
        </section>
      )}

      {screen === "add" && (
        <section data-testid="a-add" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 text-lg font-semibold">{t.addTitle}</h2>
            <InferredTag />
          </div>
          <p className="text-sm text-muted-foreground">{t.addLine}</p>
          {ally === null ? (
            <>
              <Field label={t.addName} value={name} onChange={setName} testId="a-add-name" />
              <Field label={t.addEmail} value={email} onChange={setEmail} testId="a-add-email" type="email" inputMode="email" />
              <Primary label={t.addSend} onClick={() => setAlly({ name: name.trim(), email: email.trim(), status: "pending" })} disabled={name.trim() === "" || !looksLikeEmail(email)} testId="a-add-send" />
              <p className="text-xs text-muted-foreground">{acText.nothingSent}</p>
            </>
          ) : (
            <Card testId="a-add-done" className="flex flex-col gap-2">
              <p className="font-semibold">{t.addPendingTitle}</p>
              <p data-testid="a-ally-row" className="text-sm">{t.allyRow}: {ally.name}, {ally.email}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span data-testid="a-ally-status" className="text-sm text-muted-foreground">{ally.status === "pending" ? t.addPending : t.acceptDone}</span>
                <InferredTag />
              </div>
              <p className="text-xs text-muted-foreground">{acText.nothingSent}</p>
            </Card>
          )}
        </section>
      )}

      {screen === "accept" && (
        <section data-testid="a-accept" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 text-lg font-semibold">{t.acceptTitle}</h2>
            <InferredTag />
          </div>
          <p className="text-sm text-muted-foreground">{t.acceptLine}</p>
          {ally === null ? (
            <p data-testid="a-accept-none" className="text-sm">{t.acceptNoInvite}</p>
          ) : ally.status === "pending" ? (
            <>
              <Primary label={t.acceptBtn} onClick={() => setAlly({ ...ally, status: "accepted" })} testId="a-accept-btn" />
              <p className="text-sm text-muted-foreground">{t.acceptCreate}</p>
              <NotBuilt label={acText.notCopiedSignup} testId="a-accept-gate" />
            </>
          ) : (
            <>
              <p data-testid="a-accept-done" className="text-sm">{t.acceptDone}</p>
              <p className="text-sm text-muted-foreground">{t.acceptCost}</p>
              <Placeholder />
            </>
          )}
        </section>
      )}

      {screen === "activity" && (
        <section data-testid="a-activity" className="flex flex-col gap-3">
          {feed === null && <ExampleBar onClear={() => setFeed([])} />}
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white" aria-hidden="true">{t.allyName[0]}</span>
            <span data-testid="a-streak" aria-label={t.streakLabel} className="inline-flex items-center gap-1 rounded-full border border-orange-500 px-2 py-0.5 text-sm">
              {"▲"} {checkinStreak(checkins, today)}
            </span>
            <button type="button" data-testid="a-chat" aria-label={t.chatLabel} onClick={() => setScreen("chat")} className="ml-auto inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
              {"✉"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" data-testid="a-activity-back" onClick={hub} className="inline-flex min-h-11 items-center text-sm text-muted-foreground">
              {"‹"} {t.backLabel}
            </button>
            <span className="ml-auto text-sm font-semibold">{t.allyName}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-sm">
              <input type="checkbox" data-testid="a-flagged" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="size-5 shrink-0" />
              <span>{t.flaggedOnly}</span>
            </label>
            <button type="button" data-testid="a-search" aria-label={t.searchLabel} aria-pressed={searching} onClick={() => setSearching(!searching)} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card">{"⌕"}</button>
            <button type="button" data-testid="a-filter" aria-label={t.filterLabel} onClick={() => setScreen("filters")} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card">{"▽"}</button>
          </div>
          {searching && <input data-testid="a-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPlaceholder} aria-label={t.searchLabel} className="min-h-11 rounded-md border border-border bg-background px-3 text-base" />}
          <p className="text-xs text-muted-foreground">{t.blurNote}</p>
          {filterFeed(items, flaggedOnly, query).map((it) => (
            <Card key={it.id} testId={`a-card-${it.id}`} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                {it.flagged && <span data-testid="a-flag" aria-label={t.flagMark} className="size-2.5 shrink-0 rounded-full bg-green-500" />}
                <span className="min-w-0 flex-1 truncate">{t.recap}</span>
                <span className="shrink-0 text-muted-foreground">{it.device}</span>
              </div>
              <div aria-hidden="true" className="h-28 overflow-hidden rounded-md bg-muted">
                <div className="grid h-full grid-cols-3 gap-1 blur-md">
                  <span className="bg-sky-800" />
                  <span className="bg-slate-500" />
                  <span className="bg-indigo-400" />
                </div>
              </div>
              <p className="font-semibold">{it.app}</p>
              <p className="text-sm">{it.title}</p>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{agoText(it.minutesAgo * 60_000)}</span>
                <button type="button" data-testid={`a-del-${it.id}`} aria-label={t.deleteLabel} onClick={() => setFeed(items.filter((x) => x.id !== it.id))} className="inline-flex size-11 items-center justify-center text-red-500">
                  {"✕"}
                </button>
              </div>
            </Card>
          ))}
          {filterFeed(items, flaggedOnly, query).length === 0 && (
            <div data-testid="a-empty" className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">{t.emptyFeed}</p>
              <InferredTag />
            </div>
          )}
        </section>
      )}

      {screen === "chat" && (
        <section data-testid="a-chat-screen" className="flex flex-col gap-3">
          <Head title={t.chatTitle} onBack={() => setScreen("activity")} inferred />
          <Placeholder />
        </section>
      )}
      {screen === "filters" && (
        <section data-testid="a-filters" className="flex flex-col gap-3">
          <Head title={t.filterTile} onBack={() => setScreen("activity")} inferred />
          <Placeholder />
        </section>
      )}

      {screen === "checkin" && (
        <section data-testid="a-checkin" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t.focusTitle}</h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div aria-hidden="true" className="relative flex h-28 items-end bg-gradient-to-br from-stone-700 to-stone-900 p-3">
              <span className="absolute right-3 top-3 rounded-full border border-border px-2 text-xs">{"↯"} {checkinStreak(checkins, today)}</span>
              {checkins.includes(today) && <span className="absolute left-3 top-3 flex size-6 items-center justify-center rounded-full bg-green-600 text-xs text-white">✓</span>}
              <span className="text-white">{t.hello}</span>
            </div>
            <div className="flex flex-col gap-2 p-3">
              <p className="font-semibold">{t.startToday}</p>
              <p data-testid="a-today" className="text-sm text-muted-foreground">{today}</p>
              <Primary label={checkins.includes(today) ? t.checkedToday : t.startBtn} onClick={() => setScreen("checkin-run")} testId="a-start-checkin" />
            </div>
          </div>
          <h3 className="text-base font-semibold">{t.nextSteps}</h3>
          {t.steps.map((s) => (
            <Card key={s.name} className="flex items-stretch gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm text-muted-foreground">{s.line}</p>
              </div>
              <Placeholder className="w-24 shrink-0 text-xs" />
            </Card>
          ))}
        </section>
      )}
      {screen === "checkin-run" && (
        <section data-testid="a-checkin-run" className="flex flex-col gap-3">
          <Head title={t.checkinScreen} onBack={() => setScreen("checkin")} inferred />
          <p className="text-sm text-muted-foreground">{t.checkinNote}</p>
          <Placeholder />
          <Primary
            label={t.checkinDone}
            onClick={() => {
              if (!checkins.includes(today)) setCheckins([...checkins, today])
              setScreen("checkin")
            }}
            testId="a-checkin-done"
          />
        </section>
      )}

      {screen === "community" && (
        <section data-testid="a-community" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t.communityTitle}</h2>
          <NotBuilt label={acText.notCopiedCommunity} testId="a-community-tile" />
        </section>
      )}

      {screen === "remove" && (
        <section data-testid="a-remove" className="flex flex-col gap-3">
          <Head title={t.removeTitle} inferred />
          {ally === null ? (
            <p data-testid="a-remove-none" className="text-sm text-muted-foreground">{t.removeNone}</p>
          ) : (
            <Card testId="a-remove-row" className="flex flex-col gap-2">
              <p className="text-sm">{ally.name}, {ally.email}</p>
              {!confirmRemove ? (
                <button type="button" data-testid="a-remove-btn" onClick={() => setConfirmRemove(true)} className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-500 px-4 text-sm text-red-500">{t.removeBtn}</button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm">{t.removeConfirm}</p>
                  <button type="button" data-testid="a-remove-yes" onClick={() => { setAlly(null); setConfirmRemove(false) }} className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-600 px-4 text-sm text-white">{t.removeYes}</button>
                  <button type="button" data-testid="a-remove-cancel" onClick={() => setConfirmRemove(false)} className="inline-flex min-h-11 items-center justify-center text-sm underline">{acText.cancel}</button>
                </div>
              )}
            </Card>
          )}
        </section>
      )}

      {screen === "alerts" && (
        <section data-testid="a-alerts" className="flex flex-col gap-3">
          <Head title={t.alertsTitle} inferred />
          <p className="text-sm text-muted-foreground">{t.alertsStated}</p>
          <p className="text-sm">{t.alertsUnknown}</p>
          <Placeholder />
        </section>
      )}
    </div>
  )
}
