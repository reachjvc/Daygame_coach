"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { CountedLine } from "../../components/kit"
import { liveToolIds, menu, isAddictionId } from "../../menu"
import { useQuitRecord } from "../../record"
import { fill, tooltext as t } from "../../tooltext"
import type { QuitBand, QuitBelief, QuitFact, QuitNeed } from "../../types"
import { useCarry } from "../hooks"
import { usable } from "../common"
import { BeliefBasis } from "./BeliefBasis"
import { IMAGE_FILE, bandAction, changesSince, liesInSentence, resultTop, takenAt, toolFinished, type BeliefResult } from "./flow"
import { bandFor, heldCount, seeThrough, shareUrl } from "./logic"

interface Props {
  addiction: string
  beliefs: QuitBelief[]
  facts: QuitFact[]
  bands: QuitBand[]
  needs: QuitNeed[]
  results: BeliefResult[]
  onRetake: () => void
  onDelete: (index: number) => void
  onClear: () => void
}

const when = (r: BeliefResult) => {
  const at = takenAt(r.at)
  return at === null ? t.beliefs.takenBefore : fill(t.beliefs.takenAt, { at })
}
const word = (rating: number | undefined) => (rating ? t.beliefs.ratings[rating - 1] : "")
const BAND_LABEL = { free: t.beliefs.bandFreeLink, set: t.beliefs.setDate, see: t.beliefs.seeDate, go: t.beliefs.bandLink } as const

/** The result of the newest test, what changed since the one before, the earlier results, and what to do next. */
export function BeliefsResult({ addiction, beliefs, facts, bands, needs, results, onRetake, onDelete, onClear }: Props) {
  const carry = useCarry()
  const { record } = useQuitRecord(addiction)
  const finished = liveToolIds()
  const givesOpen = toolFinished(finished, "gives")
  const latest = results[results.length - 1]
  const previous = results.length > 1 ? results[results.length - 2] : null
  const earlier = results.slice(0, -1).map((r, index) => ({ r, index })).reverse()
  const held = heldCount(latest.ratings, beliefs)
  const band = bandFor(held, bands)
  const action = band ? bandAction(band, finished, record.quitDate) : null
  const top = useMemo(() => resultTop(latest.ratings, beliefs), [latest.ratings, beliefs])
  const seen = useMemo(() => seeThrough(latest.ratings, beliefs), [latest.ratings, beliefs])
  const changes = useMemo(() => (previous ? changesSince(previous.ratings, latest.ratings, beliefs) : []), [previous, latest.ratings, beliefs])
  const lies = isAddictionId(addiction) ? menu.addictions[addiction].lies : ""
  const slots = { n: held, total: beliefs.length, lies: liesInSentence(lies) }
  const [confirmClear, setConfirmClear] = useState(false)

  const cardHref = carry(`/quit/${addiction}/card`, { held: String(held), v: "2" })
  const [copied, setCopied] = useState(false)
  // The card is fetched ahead, so a share sheet opens straight from the tap (a phone wants the tap to start it).
  const file = useRef<File | null>(null)
  useEffect(() => {
    let dead = false
    file.current = null
    fetch(cardHref)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (b && !dead) file.current = new File([b], IMAGE_FILE, { type: "image/png" })
      })
      .catch(() => {})
    return () => {
      dead = true
    }
  }, [cardHref])

  const share = async () => {
    const data = { title: fill(t.beliefs.shareTitle, slots), text: fill(t.beliefs.shareText, slots), url: shareUrl(window.location.origin, addiction) }
    try {
      if (typeof navigator.share === "function") {
        const f = file.current
        if (f && typeof navigator.canShare === "function" && navigator.canShare({ files: [f] })) await navigator.share({ title: data.title, text: data.text, files: [f] })
        else await navigator.share(data)
        return
      }
      await navigator.clipboard.writeText(data.url)
      setCopied(true)
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      try {
        await navigator.clipboard.writeText(data.url)
        setCopied(true)
      } catch {
        // the clipboard is blocked: nothing more to try
      }
    }
  }

  const saveImage = async () => {
    try {
      let blob: Blob | null = file.current
      if (!blob) {
        const r = await fetch(cardHref)
        if (!r.ok) throw new Error("card")
        blob = await r.blob()
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = IMAGE_FILE
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      window.open(cardHref, "_blank", "noopener")
    }
  }

  const canStop = latest.canStop
  const lastCanStop = previous?.canStop && canStop && previous.canStop !== canStop ? previous.canStop : null
  const needLink = (b: QuitBelief) => {
    const need = needs.find((n) => n.id === usable<string>(b.need))
    if (!givesOpen || !need) return null
    return (
      <Link href={`${carry(`/quit/${addiction}/gives`)}#need=${encodeURIComponent(need.id)}`} data-testid="need-link" className="mt-3 inline-flex min-h-11 items-center text-primary underline">
        {t.beliefs.swapsLink}
      </Link>
    )
  }

  return (
    <div data-testid="result" className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">{t.beliefs.resultTitle}</h2>
        <p data-testid="taken-on" className="text-sm text-muted-foreground">
          {when(latest)}
        </p>
      </header>

      <section data-testid="band" className="rounded-lg border border-border bg-card p-4">
        <p data-testid="held-line" className="text-2xl font-semibold">
          {fill(t.beliefs.heldLine, slots)}
        </p>
        {band && (
          <>
            <p data-testid="band-label" className="mt-1 text-xl font-semibold text-primary">
              {band.label}
            </p>
            <p>{band.text}</p>
          </>
        )}
        {action && (
          <Link href={carry(action.href)} data-testid="band-link" className="mt-2 inline-flex min-h-11 items-center text-primary underline">
            {BAND_LABEL[action.kind]}
          </Link>
        )}
      </section>

      {canStop && (
        <section data-testid="canstop-answer" className="rounded-md border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{t.beliefs.canStopQuestion}</p>
          <p className="text-lg font-semibold">{t.beliefs.canStopOptions[canStop]}</p>
          <p className="mt-1">{t.beliefs.canStopLine[canStop]}</p>
          {lastCanStop && (
            <p data-testid="canstop-last" className="mt-1 text-sm text-muted-foreground">
              {fill(t.beliefs.lastTime, { answer: t.beliefs.canStopOptions[lastCanStop] })}
            </p>
          )}
        </section>
      )}

      <section data-testid="top">
        {top.kind !== "none" && (
          <h2 data-testid="top-heading" className="text-lg font-semibold">
            {top.kind === "held" ? t.beliefs.topHeading : t.beliefs.softHeading}
          </h2>
        )}
        {top.kind === "none" && <p className="text-muted-foreground">{t.beliefs.noTop}</p>}
        <div className="mt-2 flex flex-col gap-4">
          {top.list.map((b) => (
            <article key={b.id} data-testid="top-belief" className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t.beliefs.thoughtLabel}</p>
              <p className="text-lg leading-snug">{`“${b.limiting}”`}</p>
              <p className="mt-3 text-sm text-muted-foreground">{t.beliefs.counterLabel}</p>
              <p className="font-medium">{b.counterpart}</p>
              <p className="mt-3 text-sm text-muted-foreground">{t.beliefs.whenLabel}</p>
              <p>{b.whenThought}</p>
              <p className="mt-3 text-sm text-muted-foreground">{t.beliefs.testLabel}</p>
              <p>{usable<string>(b.test)}</p>
              <details data-testid="top-proof" className="mt-3 text-sm">
                <summary className="flex min-h-11 cursor-pointer items-center font-medium">{t.beliefs.proofFold}</summary>
                <p>{b.proof}</p>
                <CountedLine text={b.counted} />
                <BeliefBasis item={b} />
              </details>
              {needLink(b)}
            </article>
          ))}
        </div>
      </section>

      {seen.length > 0 && (
        <section data-testid="see-through">
          <h2 className="text-lg font-semibold">{t.beliefs.seeThrough}</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {seen.map((b) => (
              <li key={b.id} className="rounded-md border border-border bg-card px-3 py-2">
                {usable<string>(b.short)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {previous && (
        <section data-testid="since-last">
          <h2 className="text-lg font-semibold">{t.beliefs.sinceHeading}</h2>
          {changes.length === 0 ? (
            <p className="mt-1 text-muted-foreground">{t.beliefs.sinceSame}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {changes.map((c) => (
                <li key={c.id} data-testid="since-change" className="rounded-md border border-border bg-card px-3 py-2">
                  {fill(c.dir === "more" ? t.beliefs.changeMore : t.beliefs.changeLess, {
                    short: usable<string>(beliefs.find((b) => b.id === c.id)?.short) ?? c.id,
                    from: word(c.from),
                    to: word(c.to),
                  })}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <details data-testid="answers" className="rounded-md border border-border bg-card px-3 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium">{t.beliefs.answersFold}</summary>
        <ul className="flex flex-col pb-2">
          {beliefs.map((b) => (
            <li key={b.id} className="flex items-start justify-between gap-3 border-b border-border py-1.5">
              <span className="min-w-0">{usable<string>(b.short)}</span>
              <span className="shrink-0 text-muted-foreground">{word(latest.ratings[b.id])}</span>
            </li>
          ))}
          {facts.map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-3 border-b border-border py-1.5">
              <span className="min-w-0">{f.statement}</span>
              <span className="shrink-0 text-muted-foreground">{typeof latest.facts[f.id] === "boolean" ? (latest.facts[f.id] === f.answer ? t.beliefs.factRight : t.beliefs.factWrong) : ""}</span>
            </li>
          ))}
          {canStop && (
            <li className="flex items-start justify-between gap-3 py-1.5">
              <span className="min-w-0">{t.beliefs.canStopQuestion}</span>
              <span className="shrink-0 text-muted-foreground">{t.beliefs.canStopOptions[canStop]}</span>
            </li>
          )}
        </ul>
      </details>

      <section className="flex flex-col gap-2">
        <button type="button" data-testid="share" onClick={share} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-card px-4">
          {t.beliefs.share}
        </button>
        {copied && (
          <p role="status" data-testid="link-copied" className="text-sm text-muted-foreground">
            {t.beliefs.linkCopied}
          </p>
        )}
        <button type="button" data-testid="save-image" onClick={saveImage} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-card px-4">
          {t.beliefs.saveImage}
        </button>
      </section>

      <button type="button" data-testid="again" onClick={onRetake} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-card px-4 font-medium">
        {t.beliefs.again}
      </button>

      {earlier.length > 0 && (
        <section data-testid="earlier">
          <h2 className="text-lg font-semibold">{t.beliefs.earlierHeading}</h2>
          <ul className="mt-2 flex flex-col gap-3">
            {earlier.map(({ r, index }) => (
              <EarlierItem key={`${r.at}-${index}`} r={r} beliefs={beliefs} bands={bands} onDelete={() => onDelete(index)} />
            ))}
          </ul>
        </section>
      )}

      <div>
        {!confirmClear ? (
          <button type="button" data-testid="clear-answers" onClick={() => setConfirmClear(true)} className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
            {t.beliefs.clearAll}
          </button>
        ) : (
          <div data-testid="clear-confirm" role="alertdialog" aria-label={t.beliefs.clearAsk} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
            <p>{t.beliefs.clearAsk}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" data-testid="clear-yes" onClick={onClear} className="min-h-12 rounded-md border border-border">
                {t.beliefs.clearYes}
              </button>
              <button type="button" data-testid="clear-no" onClick={() => setConfirmClear(false)} className="min-h-12 rounded-md bg-primary text-primary-foreground">
                {t.beliefs.keepIt}
              </button>
            </div>
          </div>
        )}
      </div>

      {givesOpen && (
        <Link
          href={carry(`/quit/${addiction}/gives`)}
          data-testid="next-gives"
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground"
        >
          {t.beliefs.next}
        </Link>
      )}
      <Link href={carry(`/quit/${addiction}`)} data-testid="to-menu" className="inline-flex min-h-11 items-center justify-center text-primary underline">
        {t.beliefs.toMenu}
      </Link>
    </div>
  )
}

function EarlierItem({ r, beliefs, bands, onDelete }: { r: BeliefResult; beliefs: QuitBelief[]; bands: QuitBand[]; onDelete: () => void }) {
  const [ask, setAsk] = useState(false)
  const held = heldCount(r.ratings, beliefs)
  const band = bandFor(held, bands)
  const top = resultTop(r.ratings, beliefs)
  return (
    <li data-testid="earlier-result" className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-sm">
      <p data-testid="earlier-when" className="text-muted-foreground">
        {when(r)}
      </p>
      <p className="font-semibold">
        {fill(t.beliefs.heldLine, { n: held, total: beliefs.length })}
        {band ? `, ${band.label}` : ""}
      </p>
      {r.canStop && (
        <p>
          {t.beliefs.canStopQuestion} {t.beliefs.canStopOptions[r.canStop]}
        </p>
      )}
      {top.kind === "held" &&
        top.list.map((b) => (
          <p key={b.id} data-testid="earlier-top" className="text-muted-foreground">{`“${b.limiting}”`}</p>
        ))}
      {!ask ? (
        <button type="button" data-testid="earlier-delete" onClick={() => setAsk(true)} className="inline-flex min-h-11 items-center self-start text-muted-foreground underline">
          {t.beliefs.delete}
        </button>
      ) : (
        <div role="alertdialog" aria-label={t.beliefs.deleteAsk} className="flex flex-col gap-2">
          <p>{t.beliefs.deleteAsk}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" data-testid="earlier-delete-yes" onClick={onDelete} className="min-h-12 rounded-md border border-border">
              {t.beliefs.delete}
            </button>
            <button type="button" data-testid="earlier-delete-no" onClick={() => setAsk(false)} className="min-h-12 rounded-md bg-primary text-primary-foreground">
              {t.beliefs.keepIt}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
