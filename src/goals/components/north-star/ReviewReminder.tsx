"use client"

import { useRef, useState } from "react"
import type { Reminder } from "@/src/db/lifePlanRemindersRepo"
import { usePushDevice } from "@/src/notifications/hooks/usePushDevice"
import { REVIEW_REMINDER_COPY as COPY } from "@/src/goals/data/northStar"

type ReminderState = Reminder & { hasEnabledDevice: boolean }

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 06:00 to 22:00

/**
 * THE WEEKLY REVIEW REMINDER (Plans/life-plan-after-setup.md, Phase 5, d4).
 *
 * A switch, a weekday and an hour. Each change sends only the key that changed;
 * on failure the old values stay and the line says so. When the reminder is on
 * and no device of this account takes reminders, the device block says why
 * this one cannot, or offers to switch notifications on here.
 */
export function ReviewReminder({ reminder, onChange }: { reminder: ReminderState | null; onChange: (next: ReminderState) => void }) {
  const [note, setNote] = useState<"saved" | "failed" | null>(null)
  const [saving, setSaving] = useState(false)
  // The newest value, so an answer that lands after "Turn on notifications" does not undo it.
  const latest = useRef(reminder)
  latest.current = reminder
  if (reminder === null) return null

  const save = async (patch: Partial<Reminder>) => {
    setSaving(true)
    try {
      const res = await fetch("/api/life-plan/reminders", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error("not saved")
      const result = (await res.json()) as Reminder
      onChange({ ...result, hasEnabledDevice: latest.current?.hasEnabledDevice ?? reminder.hasEnabledDevice })
      setNote("saved")
    } catch {
      setNote("failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section data-testid="review-reminder" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-zinc-200">{COPY.heading}</h2>
        <button
          type="button"
          role="switch"
          aria-checked={reminder.pushOn}
          aria-label={COPY.switchLabel}
          disabled={saving}
          onClick={() => void save({ pushOn: !reminder.pushOn })}
          className={`ml-auto relative inline-flex h-6 w-11 items-center rounded-full border transition-colors disabled:opacity-50 ${
            reminder.pushOn ? "bg-violet-500/60 border-violet-400/60" : "bg-white/10 border-white/15"
          }`}
        >
          <span className={`inline-block size-4 rounded-full bg-white transition-transform ${reminder.pushOn ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
      <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{COPY.help}</p>
      <div className="flex flex-wrap items-center gap-3 mt-3 text-[12.5px] text-zinc-300">
        <label className="flex items-center gap-2">
          {COPY.dayLabel}
          <select
            value={reminder.reviewDay}
            disabled={saving}
            onChange={(e) => void save({ reviewDay: Number(e.target.value) })}
            className="rounded-lg border border-white/15 bg-zinc-900 px-2 py-1 text-zinc-100"
          >
            {COPY.days.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          {COPY.hourLabel}
          <select
            value={reminder.reviewHour}
            disabled={saving}
            onChange={(e) => void save({ reviewHour: Number(e.target.value) })}
            className="rounded-lg border border-white/15 bg-zinc-900 px-2 py-1 text-zinc-100"
          >
            {HOURS.map((h) => <option key={h} value={h}>{`${String(h).padStart(2, "0")}:00`}</option>)}
          </select>
        </label>
        {note && (
          <span role="status" className={`text-[11.5px] ${note === "saved" ? "text-emerald-300/90" : "text-red-300"}`}>
            {note === "saved" ? COPY.saved : COPY.failed}
          </span>
        )}
      </div>
      {reminder.pushOn && !reminder.hasEnabledDevice && <DeviceBlock reminder={reminder} onChange={onChange} />}
    </section>
  )
}

/** Why this device cannot take the reminder, or the button that switches it on here. */
function DeviceBlock({ reminder, onChange }: { reminder: ReminderState; onChange: (next: ReminderState) => void }) {
  const push = usePushDevice()
  const text =
    push.support === "unsupported" || push.support === "dev" ? COPY.unsupported
    : push.support === "needs-install" ? COPY.needsInstall
    : push.permission === "denied" ? COPY.denied
    : null
  return (
    <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/[0.05] px-3 py-2.5 text-[12px] text-amber-100">
      {text ?? (
        <button
          type="button"
          disabled={push.busy}
          onClick={() => void push.turnOn().then((ok) => { if (ok) onChange({ ...reminder, hasEnabledDevice: true }) })}
          className="font-medium underline underline-offset-2 disabled:opacity-50"
        >
          {COPY.turnOn}
        </button>
      )}
    </div>
  )
}
