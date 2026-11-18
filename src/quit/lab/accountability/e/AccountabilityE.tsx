"use client"

import { useEffect, useRef, useState } from "react"
import { Card, ExampleBar, InferredTag, NotSourced, Placeholder } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import { Field, Hub, LabTag, NotBuilt, Primary, ToHub } from "../shared/Bits"
import { acText } from "../shared/text"
import { addDays, dayKey } from "../shared/logic"
import {
  dayOf,
  exampleCommitment,
  incentives,
  isReportDue,
  isSuccess,
  lengthDays,
  nextReportDue,
  periodCount,
  pie,
  progressPct,
  type Commitment,
  type Kind,
  type Recipient,
} from "./logic"
import { aeText as t } from "./text"

type Screen = "hub" | "list" | "create" | "referee" | "supporters" | "stakes" | "commitment" | "report" | "refereeview" | "journal" | "editor" | "privacy" | "outcome" | "collect" | "together" | "details"

const blank = (): Commitment => ({
  id: "",
  goal: "",
  category: "",
  start: "",
  end: "",
  kind: "ongoing",
  required: "",
  referee: { contact: "", status: "none" },
  supporters: [],
  openToCommunity: false,
  stake: 0,
  recipient: null,
  recipientContact: "",
  reports: [],
  journal: [],
  privacy: { who: t.everyone, media: t.everyone },
})

const money = (n: number) => `$${n.toFixed(2)}`

/** Copy E: a commitment contract with a referee, supporters and a stake preview. */
export function AccountabilityE() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <Main />
}

function Main() {
  const today = dayKey(Date.now())
  const [stored, setStored] = useLabState<Commitment[] | null>("accountability", "e", "list", null)
  const list = stored ?? [exampleCommitment(today)]
  const sample = stored === null
  const cur: Commitment | undefined = list[0]
  const [screen, setScreen] = useState<Screen>("hub")
  const [tab, setTab] = useState(0)
  const [wiz, setWiz] = useState(0)
  const [draft, setDraft] = useState<Commitment>(blank())
  const [target, setTarget] = useState<"draft" | "cur">("cur")
  const [from, setFrom] = useState<Screen>("hub")
  const [refDraft, setRefDraft] = useState("")
  const [supDraft, setSupDraft] = useState("")
  const [amount, setAmount] = useState("")
  const [stakeNext, setStakeNext] = useState(false)
  const [countText, setCountText] = useState("")
  const count = Number(countText || 0)
  const [note, setNote] = useState("")
  const [attached, setAttached] = useState(false)
  const [sent, setSent] = useState(false)
  const [msg, setMsg] = useState("")
  const [dTab, setDTab] = useState(0)
  const [info, setInfo] = useState(false)
  const [tool, setTool] = useState<"crop" | "draw" | "text">("draw")

  const go = (s: Screen) => setScreen(s)
  const hub = () => go("hub")
  const T: Commitment | undefined = target === "draft" ? draft : cur
  const patch = (p: Partial<Commitment>) => {
    if (target === "draft") setDraft({ ...draft, ...p })
    else if (cur) setStored([{ ...cur, ...p }, ...list.slice(1)])
  }
  const edit = (to: Screen, tgt: "draft" | "cur", back: Screen) => {
    setTarget(tgt)
    setFrom(back)
    setRefDraft("")
    setSupDraft("")
    setAmount(tgt === "draft" ? String(draft.stake || "") : "")
    setStakeNext(false)
    go(to)
  }
  const open = (id: string) => {
    setSent(false)
    setCountText("")
    setNote("")
    setAttached(false)
    setTarget("cur")
    if (id === "create") {
      setWiz(0)
      setDraft(blank())
      setTarget("cur")
    }
    if (id === "referee" || id === "supporters" || id === "stakes") return edit(id as Screen, "cur", "hub")
    go(id as Screen)
  }
  const needCur = (children: React.ReactNode) =>
    cur ? children : <p data-testid="e-need-cur" className="text-sm text-muted-foreground">{t.noneActive}</p>

  const createReady = draft.category !== "" && draft.goal.trim() !== "" && draft.start !== "" && draft.end > draft.start && (draft.kind === "oneshot" || draft.category !== "") && draft.required.trim() !== ""
  const finish = () => {
    setStored([{ ...draft, id: `c${list.length + 1}` }, ...list.filter((c) => stored !== null || c.id !== "ex1")])
    setTarget("cur")
    go("commitment")
  }
  const stakeNum = Number(amount)
  const stakeValid = Number.isFinite(stakeNum) && stakeNum > 0
  const previewPeriods = T ? periodCount(T.start && T.end ? T : { kind: T.kind, start: today, end: addDays(today, 42) }) : 1
  const active = list.filter((c) => c.reports.length < periodCount(c))
  const complete = list.filter((c) => c.reports.length >= periodCount(c))

  const sendMsg = (photo: boolean) => {
    if (!cur) return
    patch({ journal: [...cur.journal, { id: `j${cur.journal.length + 1}`, who: "me", text: photo ? t.photoMsg : msg.trim(), photo }] })
    setMsg("")
  }
  const sendReport = () => {
    if (!cur) return
    patch({
      reports: [...cur.reports, { period: cur.reports.length + 1, count, note: note.trim(), verdict: cur.referee.status === "invited" ? "awaiting" : "confirmed", day: today }],
    })
    setSent(true)
  }
  const setVerdict = (i: number, verdict: "confirmed" | "overturned") => {
    if (!cur) return
    patch({ reports: cur.reports.map((r, k) => (k === i ? { ...r, verdict } : r)) })
  }
  const [proof, setProof] = useState<number[]>([])

  return (
    <div data-testid="accountability-e" data-screen={screen} className="flex flex-col">
      {screen !== "hub" && <ToHub onClick={hub} />}
      {sample && screen !== "hub" && <ExampleBar onClear={() => setStored([])} />}
      {screen === "hub" && <Hub id="e" items={t.screens} onOpen={open} />}

      {screen === "list" && (
        <section data-testid="e-list" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span aria-label={t.menuLabel} className="inline-flex size-11 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">{"≡"}</span>
            <h2 className="min-w-0 flex-1 truncate text-center text-lg font-semibold">{t.listTitle}</h2>
            <span aria-label={t.messagesLabel} className="inline-flex size-11 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">{"✉"}</span>
            <span aria-label={t.bellLabel} className="inline-flex size-11 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">{"♪"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div role="tablist" className="flex min-w-0 flex-1 gap-1">
              {t.tabs.map((label, i) => (
                <button key={label} type="button" role="tab" aria-selected={tab === i} data-testid={`e-tab-${i}`} onClick={() => setTab(i)} className={`min-h-11 flex-1 rounded-full border text-sm ${tab === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                  {label}
                </button>
              ))}
            </div>
            <button type="button" data-testid="e-create" onClick={() => open("create")} className="inline-flex min-h-11 items-center rounded-full bg-orange-500 px-4 text-sm font-medium text-white">{t.create}</button>
          </div>
          {(tab === 0 ? active : complete).map((c) => (
            <button key={c.id} type="button" data-testid={`e-card-${c.id}`} onClick={() => go("commitment")} className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-card p-3 text-left">
              <span data-testid="e-card-pct" className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-orange-500 text-sm">{progressPct(c, today)}%</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-semibold">{c.goal}</span>
                <span className="text-sm text-muted-foreground">{t.referee}: {c.referee.status === "none" ? t.noReferee : c.referee.contact}</span>
                <span className="text-sm text-muted-foreground">{t.supporters(c.supporters.length)}</span>
                <span className="text-sm text-muted-foreground">{t.nextReportOn(nextReportDue(c))}</span>
              </span>
            </button>
          ))}
          {(tab === 0 ? active : complete).length === 0 && <p className="text-sm text-muted-foreground">{tab === 0 ? t.noneActive : t.noneComplete}</p>}
          <div className="grid grid-cols-5 gap-2" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">{t.navSlot}</span>
            ))}
          </div>
        </section>
      )}

      {screen === "create" && (
        <section data-testid="e-create-screen" data-step={wiz + 1} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 text-lg font-semibold">{t.createTitle}</h2>
            <InferredTag />
          </div>
          <p className="text-sm text-muted-foreground">{t.stepOf(wiz + 1, 4)}</p>
          {wiz === 0 && (
            <>
              <p className="font-semibold">{t.chooseGoal}</p>
              <div role="radiogroup" className="flex flex-wrap gap-2">
                {t.categories.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={draft.category === c} data-testid={`e-cat-${c}`} onClick={() => setDraft({ ...draft, category: c, kind: c === "Weight loss" ? "ongoing" : draft.kind })} className={`min-h-11 rounded-full border px-3 text-sm ${draft.category === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                    {c}
                  </button>
                ))}
              </div>
              <Field label={t.goalLabel} value={draft.goal} onChange={(v) => setDraft({ ...draft, goal: v })} testId="e-goal" />
            </>
          )}
          {wiz === 1 && (
            <>
              <p className="font-semibold">{t.datesTitle}</p>
              <label className="flex flex-col gap-1 text-sm">
                <span>{t.startLabel}</span>
                <input type="date" data-testid="e-start" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className="min-h-11 rounded-md border border-border bg-background px-3 text-base" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>{t.endLabel}</span>
                <input type="date" data-testid="e-end" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className="min-h-11 rounded-md border border-border bg-background px-3 text-base" />
              </label>
            </>
          )}
          {wiz === 2 && (
            <>
              <p className="font-semibold">{t.typeTitle}</p>
              <div role="radiogroup" className="flex flex-col gap-2">
                {(["oneshot", "ongoing"] as Kind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={draft.kind === k}
                    disabled={k === "oneshot" && draft.category === "Weight loss"}
                    data-testid={`e-kind-${k}`}
                    onClick={() => setDraft({ ...draft, kind: k })}
                    className={`min-h-12 rounded-lg border px-3 text-left text-sm disabled:opacity-40 ${draft.kind === k ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                  >
                    {k === "oneshot" ? t.oneShot : t.ongoing}
                  </button>
                ))}
              </div>
              {draft.category === "Weight loss" && <p className="text-xs text-muted-foreground">{t.weightLossNote}</p>}
              <div className="flex flex-col gap-1">
                <Field label={t.requiredLabel} value={draft.required} onChange={(v) => setDraft({ ...draft, required: v.replace(/[^0-9]/g, "") })} testId="e-required" inputMode="numeric" />
                <InferredTag />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>{t.windowsLine}</span>
                <NotSourced />
              </div>
            </>
          )}
          {wiz === 3 && (
            <>
              <p className="font-semibold">{t.optionalTitle}</p>
              <p className="text-sm text-muted-foreground">{t.optionalLine}</p>
              <button type="button" data-testid="e-opt-referee" onClick={() => edit("referee", "draft", "create")} className="min-h-12 rounded-lg border border-border bg-card px-3 text-left text-sm">{t.addReferee}</button>
              <button type="button" data-testid="e-opt-supporters" onClick={() => edit("supporters", "draft", "create")} className="min-h-12 rounded-lg border border-border bg-card px-3 text-left text-sm">{t.addSupporters}</button>
              <button type="button" data-testid="e-opt-stakes" onClick={() => edit("stakes", "draft", "create")} className="min-h-12 rounded-lg border border-border bg-card px-3 text-left text-sm">{t.addStakes}</button>
              <Primary label={t.createBtn} onClick={finish} disabled={!createReady} testId="e-finish" />
            </>
          )}
          <div className="flex gap-2">
            <button type="button" data-testid="e-wiz-back" disabled={wiz === 0} onClick={() => setWiz(wiz - 1)} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-border text-sm disabled:opacity-40">{t.prevStep}</button>
            {wiz < 3 && (
              <button type="button" data-testid="e-wiz-next" onClick={() => setWiz(wiz + 1)} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">{t.nextStep}</button>
            )}
          </div>
        </section>
      )}

      {screen === "referee" && T && (
        <section data-testid="e-referee" className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 text-lg font-semibold">{t.refereeTitle}</h2>
            <button type="button" data-testid="e-referee-close" aria-label={t.closeLabel} onClick={() => go(from)} className="inline-flex size-11 items-center justify-center text-xl">{"×"}</button>
          </div>
          <p className="text-sm text-muted-foreground">{t.refereeLine}</p>
          <Field label={t.refereeField} value={refDraft} onChange={setRefDraft} testId="e-referee-field" inputMode="email" />
          <Primary label={t.refereeSend} onClick={() => { patch({ referee: { contact: refDraft.trim(), status: "invited" } }); setRefDraft("") }} disabled={refDraft.trim() === ""} testId="e-referee-send" />
          <p className="text-xs text-muted-foreground">{acText.nothingSent}</p>
          <p data-testid="e-referee-status" className="text-sm">{T.referee.status === "invited" ? `${T.referee.contact}: ${t.refereeAwaiting}` : t.refereeNote}</p>
          <p className="text-xs text-muted-foreground">{t.refereeOne}</p>
        </section>
      )}
      {screen === "referee" && !T && needCur(null)}

      {screen === "supporters" && T && (
        <section data-testid="e-supporters" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 text-lg font-semibold">{t.supportersTitle}</h2>
            <InferredTag />
          </div>
          <p className="text-sm text-muted-foreground">{t.supportersLine}</p>
          <Field label={t.supporterField} value={supDraft} onChange={setSupDraft} testId="e-supporter-field" inputMode="email" />
          <Primary label={t.supporterAdd} onClick={() => { patch({ supporters: [...T.supporters, supDraft.trim()] }); setSupDraft("") }} disabled={supDraft.trim() === ""} testId="e-supporter-add" />
          <p className="text-xs text-muted-foreground">{acText.nothingSent}</p>
          <ul data-testid="e-supporter-list" className="flex flex-col gap-1 text-sm">
            {T.supporters.map((s, i) => <li key={`${s}-${i}`}>{s}</li>)}
          </ul>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" data-testid="e-community" checked={T.openToCommunity} onChange={(e) => patch({ openToCommunity: e.target.checked })} className="size-5" />
            {t.communityToggle}
          </label>
          <button type="button" data-testid="e-supporters-done" onClick={() => go(from)} className="inline-flex min-h-11 items-center justify-center text-sm underline">{acText.back}</button>
        </section>
      )}
      {screen === "supporters" && !T && needCur(null)}

      {screen === "stakes" && T && (
        <section data-testid="e-stakes" className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-2xl bg-neutral-900 p-4 text-white">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl">{t.stakesTitle}</h2>
              <button type="button" data-testid="e-stakes-info" aria-label={t.stakesInfoLabel} aria-pressed={info} onClick={() => setInfo(!info)} className="inline-flex size-11 items-center justify-center rounded-full border border-neutral-500 text-sm">{"i"}</button>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex flex-col gap-1 text-xs">
                <span>{t.amountLabel}</span>
                <span className="flex items-center gap-1">
                  <span aria-hidden="true">$</span>
                  <input data-testid="e-amount" inputMode="decimal" value={target === "cur" ? (T.stake > 0 ? String(T.stake) : amount) : amount} disabled={target === "cur" && T.stake > 0} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} className="min-h-11 w-24 rounded-md bg-neutral-800 px-2 text-center text-lg" />
                </span>
                <span className="text-neutral-400">{t.perPeriod}</span>
              </label>
              <div className="flex flex-col gap-1 text-xs">
                <span data-testid="e-total" className="text-lg font-bold">{money((target === "cur" && T.stake > 0 ? T.stake : stakeValid ? stakeNum : 0) * previewPeriods)}</span>
                <span className="text-neutral-400">{t.totalLabel}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300">
              <span>{t.boostLine}</span>
              <NotSourced />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300">
              <span>{t.minimumLine}</span>
              <NotSourced />
            </div>
          </div>
          {info && (
            <div data-testid="e-stakes-info-tile" className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <InferredTag />
                <span className="text-xs text-muted-foreground">{t.stakesInfo}</span>
              </div>
              <Placeholder />
            </div>
          )}
          {target === "cur" && T.stake > 0 && <p data-testid="e-stakes-locked" className="text-xs text-muted-foreground">{t.stakesLocked}</p>}
          <p className="font-semibold">{t.whoGets}</p>
          <div role="radiogroup" className="grid grid-cols-2 gap-3">
            {t.recipients.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={T.recipient === r.id}
                disabled={target === "cur" && T.stake > 0}
                data-testid={`e-recipient-${r.id}`}
                onClick={() => patch({ recipient: r.id as Recipient })}
                className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border text-sm disabled:opacity-60 ${T.recipient === r.id ? "border-primary bg-primary/10" : "border-border bg-card"}`}
              >
                <span aria-hidden="true" className="text-3xl text-orange-400">{r.glyph}</span>
                <span className="font-semibold">{r.name}</span>
              </button>
            ))}
          </div>
          {T.recipient === "friend" && <Field label={t.friendField} value={T.recipientContact} onChange={(v) => patch({ recipientContact: v })} testId="e-friend" inputMode="email" disabled={target === "cur" && T.stake > 0} />}
          {(T.recipient === "charity" || T.recipient === "anti") && (
            <div className="flex flex-col gap-1">
              <p className="text-sm">{t.listsTile}</p>
              <Placeholder />
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t.previewNote}</p>
          {target === "draft" && (
            <Primary
              label={t.stakesNext}
              onClick={() => {
                if (stakeValid) patch({ stake: stakeNum })
                setStakeNext(true)
              }}
              disabled={!stakeValid || T.recipient === null}
              testId="e-stakes-next"
            />
          )}
          {stakeNext && (
            <div className="flex flex-col gap-2">
              <NotBuilt label={acText.notBuiltMoney} testId="e-pay-tile" />
              <button type="button" data-testid="e-stakes-done" onClick={() => go(from)} className="inline-flex min-h-11 items-center justify-center text-sm underline">{acText.back}</button>
            </div>
          )}
        </section>
      )}
      {screen === "stakes" && !T && needCur(null)}

      {screen === "commitment" && needCur(
        cur && (
          <section data-testid="e-commitment" className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 data-testid="e-goal-title" className="min-w-0 flex-1 truncate text-lg font-semibold">{cur.goal}</h2>
              <button type="button" data-testid="e-share" aria-label={t.shareLabel} onClick={() => setSent(true)} className="inline-flex size-11 items-center justify-center rounded-full border border-border">{"↗"}</button>
            </div>
            <Card className="flex items-center gap-3">
              <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-muted">{t.referee[0]}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{cur.referee.status === "none" ? t.notInvited : cur.referee.contact}</span>
              <span className="text-xs text-muted-foreground">{t.referee}</span>
            </Card>
            <Card className="flex items-center gap-3">
              <span className="min-w-0 flex-1 text-sm">{t.supporterRow(cur.supporters.length)}</span>
              <button type="button" data-testid="e-add-supporter" onClick={() => edit("supporters", "cur", "commitment")} className="inline-flex min-h-11 items-center px-2 text-sm text-orange-400 underline">{t.supporterAdd2}</button>
            </Card>
            <div className="flex items-center gap-2">
              <h3 className="min-w-0 flex-1 font-semibold">{t.detailsHeader}</h3>
              <button type="button" data-testid="e-lock" aria-label={t.lockLabel} onClick={() => go("privacy")} className="inline-flex size-11 items-center justify-center">{"⚿"}</button>
            </div>
            <dl className="grid grid-cols-2 gap-1 text-sm">
              <dt className="text-muted-foreground">{t.contractId}</dt>
              <dd>{cur.id}</dd>
              <dt className="text-muted-foreground">{t.startRow}</dt>
              <dd data-testid="e-start-row">{cur.start}</dd>
              <dt className="text-muted-foreground">{t.endRow}</dt>
              <dd data-testid="e-end-row">{cur.end}</dd>
            </dl>
            {sent && <p className="text-xs text-muted-foreground">{acText.nothingSent}</p>}
            <div className="grid grid-cols-3 items-center gap-2 border-t border-border pt-3">
              <button type="button" data-testid="e-reports-tab" onClick={() => go("outcome")} className="min-h-11 text-sm">{t.reportsTab}</button>
              <button type="button" data-testid="e-record" aria-label={t.reportBtn} onClick={() => go("report")} className="mx-auto size-16 rounded-full bg-red-600" />
              <button type="button" data-testid="e-journal-tab" onClick={() => go("journal")} className="min-h-11 text-sm">{t.journalTab}</button>
            </div>
          </section>
        ),
      )}

      {screen === "report" && needCur(
        cur && (
          <section data-testid="e-report" className="flex flex-col items-center gap-3 rounded-2xl border border-border p-4">
            <div className="flex w-full justify-end">
              <button type="button" data-testid="e-report-close" aria-label={t.closeLabel} onClick={() => go("commitment")} className="inline-flex size-11 items-center justify-center text-xl">{"×"}</button>
            </div>
            <h2 className="text-lg">{t.reportTitle}</h2>
            <div aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-muted">{cur.goal[0]}</div>
            <p className="font-semibold">{cur.goal}</p>
            <p className="text-sm text-muted-foreground">{t.periodLabel}: {addDays(cur.start, 7 * cur.reports.length)} - {addDays(cur.start, 7 * (cur.reports.length + 1)) > cur.end ? cur.end : addDays(cur.start, 7 * (cur.reports.length + 1))}</p>
            <p data-testid="e-required-line" className="text-sm">{t.requiredLine}: {cur.required === "" ? t.needUnset : cur.required}</p>
            <input
              data-testid="e-count"
              aria-label={t.countLabel}
              inputMode="numeric"
              placeholder="0"
              value={countText}
              onChange={(e) => setCountText(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              className="size-24 rounded-full bg-neutral-800 text-center text-3xl font-bold text-white placeholder:text-neutral-500"
            />
            <button type="button" data-testid="e-send-report" onClick={sendReport} disabled={sent} className="inline-flex min-h-12 items-center rounded-full bg-red-500 px-8 text-white disabled:opacity-50">{t.sendReport}</button>
            {sent && <p data-testid="e-report-sent" className="text-sm">{cur.referee.status === "invited" ? t.reportSent : t.reportSentHonor}</p>}
            <div className="flex w-full items-center gap-2">
              <span className="text-sm">{t.journalEntry}</span>
              <button type="button" data-testid="e-attach" aria-label={t.attach} onClick={() => setAttached(true)} className="inline-flex size-11 items-center justify-center rounded-md border border-border">{"▣"}</button>
            </div>
            {attached && <p data-testid="e-attached" className="w-full text-xs text-muted-foreground">{t.attached}</p>}
            <textarea data-testid="e-note" aria-label={t.journalEntry} value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="w-full rounded-md border border-border bg-background p-2 text-base" />
            <p className="text-xs text-muted-foreground">{acText.nothingSent}</p>
          </section>
        ),
      )}

      {screen === "refereeview" && needCur(
        cur && (
          <section data-testid="e-refereeview" className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 flex-1 text-lg font-semibold">{t.refereeViewTitle}</h2>
              <LabTag />
              <InferredTag />
            </div>
            <p className="text-sm text-muted-foreground">{t.refereeViewLine}</p>
            <p className="text-xs text-muted-foreground">{acText.nothingSent}</p>
            {cur.reports.length === 0 && <p className="text-sm">{t.noReports}</p>}
            {cur.reports.map((r, i) => (
              <Card key={r.period} testId={`e-rv-${i}`} className="flex flex-col gap-2">
                <p className="text-sm">{t.periodWord} {r.period}: {r.count}</p>
                <p data-testid={`e-rv-verdict-${i}`} className="text-sm text-muted-foreground">{t.verdicts[r.verdict]}</p>
                {proof.includes(i) && <p className="text-xs text-muted-foreground">{t.proofAsked}</p>}
                <div className="grid grid-cols-1 gap-2">
                  <button type="button" data-testid={`e-rv-confirm-${i}`} onClick={() => setVerdict(i, "confirmed")} className="min-h-11 rounded-full bg-green-700 text-sm text-white">{t.confirm}</button>
                  <button type="button" data-testid={`e-rv-proof-${i}`} onClick={() => setProof([...proof, i])} className="min-h-11 rounded-full border border-border text-sm">{t.askProof}</button>
                  <button type="button" data-testid={`e-rv-overturn-${i}`} onClick={() => setVerdict(i, "overturned")} className="min-h-11 rounded-full border border-red-500 text-sm text-red-500">{t.overturn}</button>
                </div>
              </Card>
            ))}
          </section>
        ),
      )}

      {screen === "journal" && needCur(
        cur && (
          <section data-testid="e-journal" className="flex min-h-[60vh] flex-col gap-3 rounded-2xl border border-border p-3">
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 flex-1 text-lg font-semibold">{t.journalTitle}</h2>
              <button type="button" data-testid="e-journal-close" aria-label={t.closeLabel} onClick={() => go("commitment")} className="inline-flex size-11 items-center justify-center text-xl">{"×"}</button>
            </div>
            <ul className="flex flex-1 flex-col gap-2" data-testid="e-thread">
              {cur.journal.map((m) => (
                <li key={m.id} className="flex items-start gap-2">
                  <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs">{(m.who === "me" ? t.me : t.supporterName)[0]}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-xs text-muted-foreground">{m.who === "me" ? t.me : t.supporterName}</span>
                    <span className="break-words text-sm">{m.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">{acText.nothingSent}</p>
            <div className="flex items-center gap-2">
              <button type="button" data-testid="e-camera" aria-label={t.cameraLabel} onClick={() => go("editor")} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border">{"◉"}</button>
              <input data-testid="e-msg" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t.messagePlaceholder} aria-label={t.messagePlaceholder} className="min-h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-base" />
              <button type="button" data-testid="e-msg-send" aria-label={t.sendLabel} disabled={msg.trim() === ""} onClick={() => sendMsg(false)} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">{"➤"}</button>
            </div>
          </section>
        ),
      )}

      {screen === "editor" && (
        <section data-testid="e-editor" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" data-testid="e-editor-back" onClick={() => go("journal")} className="inline-flex min-h-11 items-center text-sm underline">{acText.back}</button>
            <h2 className="min-w-0 flex-1 text-center text-base font-semibold">{t.editorTitle}</h2>
            {(["crop", "draw", "text"] as const).map((k) => (
              <button key={k} type="button" data-testid={`e-tool-${k}`} aria-pressed={tool === k} aria-label={{ crop: t.toolCrop, draw: t.toolDraw, text: t.toolText }[k]} onClick={() => setTool(k)} className={`inline-flex size-11 items-center justify-center rounded-full border text-lg ${tool === k ? "border-primary bg-primary/10" : "border-border"}`}>
                {{ crop: "▭", draw: "✎", text: "T" }[k]}
              </button>
            ))}
          </div>
          <DrawPad enabled={tool === "draw"} />
          {tool !== "draw" && <Placeholder />}
          <button type="button" data-testid="e-send-picture" aria-label={t.sendPicture} onClick={() => { sendMsg(true); go("journal") }} className="inline-flex size-14 items-center justify-center self-end rounded-full bg-primary text-xl text-primary-foreground">{"➤"}</button>
          <p className="text-xs text-muted-foreground">{acText.nothingSent}</p>
        </section>
      )}

      {screen === "privacy" && needCur(
        cur && (
          <section data-testid="e-privacy" className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-md bg-orange-500 px-3 text-white">
              <button type="button" data-testid="e-privacy-back" onClick={() => go("commitment")} className="inline-flex min-h-11 items-center text-sm">{"‹"} {acText.back}</button>
              <h2 className="min-w-0 flex-1 text-center text-sm font-semibold">{t.privacyTitle}</h2>
            </div>
            <p className="font-semibold">{cur.goal}</p>
            <Card className="flex flex-col gap-1">
              <p className="text-sm">{t.whoSees}</p>
              <p data-testid="e-privacy-who" className="font-semibold">{cur.privacy.who}</p>
            </Card>
            <Card className="flex flex-col gap-1">
              <p className="text-sm">{t.whoMedia}</p>
              <p data-testid="e-privacy-media" className="font-semibold">{cur.privacy.media}</p>
            </Card>
            <p className="text-xs text-muted-foreground">{t.privacyNote}</p>
            <p className="text-sm">{t.optionsTile}</p>
            <Placeholder />
          </section>
        ),
      )}

      {screen === "outcome" && needCur(
        cur && (
          <section data-testid="e-outcome" className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 flex-1 text-lg font-semibold">{t.outcomeTitle}</h2>
              <InferredTag />
            </div>
            {cur.reports.length === 0 && <p className="text-sm text-muted-foreground">{t.noReports}</p>}
            {cur.reports.map((r, i) => {
              const ok = isSuccess(r, cur.required)
              return (
                <Card key={r.period} testId={`e-outcome-${i}`} className="flex flex-col gap-1">
                  <p data-testid={`e-outcome-mark-${i}`} className="text-sm font-semibold">{t.periodWord} {r.period}: {ok ? t.success : t.failed}</p>
                  <p className="text-xs text-muted-foreground">{t.emailPreview}: {t.emailLine(r.period, ok)}</p>
                </Card>
              )
            })}
            <p className="text-sm">{t.chargeTile}</p>
            <NotBuilt label={acText.notBuiltMoney} testId="e-charge-tile" />
            <p className="text-xs text-muted-foreground">{acText.nothingSent}</p>
          </section>
        ),
      )}

      {screen === "collect" && (
        <section data-testid="e-collect" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 text-lg font-semibold">{t.collectTitle}</h2>
            <InferredTag />
          </div>
          <NotBuilt label={acText.notBuiltMoney} testId="e-collect-tile" />
        </section>
      )}

      {screen === "together" && needCur(
        cur && (() => {
          const inc = incentives(cur)
          const due = isReportDue(cur, today)
          return (
            <section data-testid="e-together" className="flex flex-col gap-3">
              <h2 className="text-center text-xl font-semibold">{t.homeTitle}</h2>
              <h3 className="font-semibold">{t.incentives}</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  [t.saved, inc.saved, "saved"],
                  [t.forfeited, inc.forfeited, "forfeited"],
                  [t.remaining, inc.remaining, "remaining"],
                  [t.totalAtStake, inc.total, "total"],
                ].map(([label, v, id]) => (
                  <div key={id as string} className="flex flex-col rounded-xl border border-border bg-card p-3">
                    <span className="text-xs text-muted-foreground">{label as string}</span>
                    <span data-testid={`e-inc-${id as string}`} className="text-lg font-semibold">{money(v as number)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t.previewNote}</p>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <span aria-hidden="true" className="text-xl">{"♛"}</span>
                <span className="min-w-0 flex-1 font-semibold">{t.leaderboard}</span>
                <button type="button" data-testid="e-leaderboard-go" onClick={() => setSent(true)} className="inline-flex min-h-11 items-center rounded-full bg-orange-500 px-4 text-sm text-white">{t.go}</button>
              </div>
              {sent && <NotBuilt label={acText.notCopiedCommunity} testId="e-leaderboard-tile" />}
              <h3 className="font-semibold">{t.myCommitments}</h3>
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{cur.goal}</p>
                    <p className="text-sm text-muted-foreground">{t.lengthLine(lengthDays(cur))}</p>
                  </div>
                  <button type="button" data-testid="e-report-due" onClick={() => go("report")} className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-orange-500 px-3 text-sm text-white">{t.reportDue}</button>
                </div>
                <div aria-hidden="true" className="flex h-24 items-end justify-around rounded-lg bg-purple-950/50 px-4">
                  {[48, 72, 56].map((h, i) => <span key={i} className="w-6 rounded-t-md bg-orange-400" style={{ height: h * 0.9 }} />)}
                </div>
                <div className="flex justify-between text-sm">
                  <span data-testid="e-day-of">{t.dayOf(dayOf(cur, today), lengthDays(cur))}</span>
                  <span>{due ? t.nextDueNow : t.nextDue(nextReportDue(cur))}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div data-testid="e-together-bar" className="h-full bg-purple-700" style={{ width: `${progressPct(cur, today)}%` }} />
                </div>
                <button type="button" data-testid="e-open-details" onClick={() => go("details")} className="inline-flex min-h-11 items-center self-start text-sm underline">{t.detailsTitle}</button>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-border pt-2">
                <span aria-label={t.personNav} className="flex min-h-11 items-center justify-center text-xl text-muted-foreground">{"☺"}</span>
                <span aria-label={t.gearNav} className="flex min-h-11 items-center justify-center text-xl text-muted-foreground">{"⚙"}</span>
              </div>
            </section>
          )
        })(),
      )}

      {screen === "details" && needCur(
        cur && (() => {
          const p = pie(cur)
          const totalP = p.success + p.failed
          const circ = 2 * Math.PI * 40
          const days = Array.from({ length: Math.min(lengthDays(cur), 84) }, (_, i) => addDays(cur.start, i))
          const stateOf = (d: string) => {
            if (d === today) return "today"
            const r = cur.reports.find((x) => x.day === d)
            return r ? (isSuccess(r, cur.required) ? "success" : "missed") : "none"
          }
          return (
            <section data-testid="e-details" className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{cur.goal}</h2>
                <InferredTag />
              </div>
              <button type="button" data-testid="e-details-report" onClick={() => go("report")} className="inline-flex min-h-11 items-center justify-center rounded-full bg-orange-500 text-sm text-white">{t.reportDue}</button>
              <div role="tablist" className="flex gap-1">
                {[t.summaryTab, t.timelineTab].map((label, i) => (
                  <button key={label} type="button" role="tab" aria-selected={dTab === i} data-testid={`e-dtab-${i}`} onClick={() => setDTab(i)} className={`min-h-11 flex-1 rounded-full border text-sm ${dTab === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{label}</button>
                ))}
              </div>
              {dTab === 0 ? (
                <>
                  <Card className="flex items-center gap-4">
                    <svg width="96" height="96" viewBox="0 0 100 100" aria-label={t.pieTitle} data-testid="e-pie" data-success={p.success} data-failed={p.failed} className="-rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" strokeWidth="18" className="stroke-border" />
                      {totalP > 0 && <circle cx="50" cy="50" r="40" fill="none" strokeWidth="18" stroke="#22c55e" strokeDasharray={`${(p.success / totalP) * circ} ${circ}`} />}
                      {totalP > 0 && p.failed > 0 && <circle cx="50" cy="50" r="40" fill="none" strokeWidth="18" stroke="#ef4444" strokeDasharray={`${(p.failed / totalP) * circ} ${circ}`} strokeDashoffset={-(p.success / totalP) * circ} />}
                    </svg>
                    <ul className="text-sm">
                      <li>{t.pieSuccess}: {p.success}</li>
                      <li>{t.pieFailed}: {p.failed}</li>
                    </ul>
                  </Card>
                  <div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full bg-purple-700" style={{ width: `${progressPct(cur, today)}%` }} /></div>
                  <p className="font-semibold">{t.calendarTitle}</p>
                  <div data-testid="e-calendar" className="grid grid-cols-7 gap-1">
                    {days.map((d) => {
                      const s = stateOf(d)
                      return <span key={d} data-state={s} className={`flex size-9 items-center justify-center rounded text-xs ${s === "success" ? "bg-green-600 text-white" : s === "missed" ? "bg-red-600 text-white" : s === "today" ? "bg-orange-500 text-white" : "bg-card"}`}>{Number(d.slice(8))}</span>
                    })}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {t.calendarKey.map((k) => <span key={k}>{k}</span>)}
                  </div>
                  <p className="font-semibold">{t.pointsTitle}</p>
                  <Placeholder />
                </>
              ) : (
                <Placeholder />
              )}
            </section>
          )
        })(),
      )}
    </div>
  )
}

/** A canvas you can draw on with a finger or mouse; a picture from this device can be loaded into it. Nothing leaves the browser. */
function DrawPad({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const down = useRef(false)
  const pos = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect()
    const c = ref.current
    if (!r || !c) return { x: 0, y: 0 }
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height }
  }
  useEffect(() => {
    const ctx = ref.current?.getContext("2d")
    if (ctx && ref.current) {
      ctx.fillStyle = "#374151"
      ctx.fillRect(0, 0, ref.current.width, ref.current.height)
    }
  }, [])
  const load = (file: File | undefined) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const c = ref.current
      const ctx = c?.getContext("2d")
      if (c && ctx) {
        const k = Math.min(c.width / img.width, c.height / img.height)
        ctx.fillStyle = "#374151"
        ctx.fillRect(0, 0, c.width, c.height)
        ctx.drawImage(img, (c.width - img.width * k) / 2, (c.height - img.height * k) / 2, img.width * k, img.height * k)
      }
      URL.revokeObjectURL(url)
    }
    img.src = url
  }
  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={ref}
        width={320}
        height={240}
        data-testid="e-canvas"
        aria-label={t.drawLabel}
        className="w-full touch-none rounded-lg border border-border"
        onPointerDown={(e) => {
          if (!enabled) return
          down.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          const ctx = ref.current?.getContext("2d")
          const p = pos(e)
          if (ctx) {
            ctx.strokeStyle = "#f97316"
            ctx.lineWidth = 4
            ctx.lineCap = "round"
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
          }
        }}
        onPointerMove={(e) => {
          if (!down.current) return
          const ctx = ref.current?.getContext("2d")
          const p = pos(e)
          if (ctx) {
            ctx.lineTo(p.x, p.y)
            ctx.stroke()
          }
        }}
        onPointerUp={() => (down.current = false)}
        onPointerCancel={() => (down.current = false)}
      />
      <label className="flex min-h-11 items-center text-sm underline">
        {t.chooseImage}
        <input type="file" accept="image/*" data-testid="e-file" className="sr-only" onChange={(e) => load(e.target.files?.[0])} />
      </label>
    </div>
  )
}
