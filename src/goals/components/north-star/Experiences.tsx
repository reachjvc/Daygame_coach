"use client"

/**
 * Things to experience.
 *
 * The door that is not a door: nothing here feeds the question queue, nothing
 * gets a date, nothing gets rungs. It is a list, and the reason it is a list is
 * that half of what people want out of a life is not an achievement. "See the
 * northern lights" put through the goal machinery gets asked where you are
 * today and what it costs you if you never do it, and both questions are the
 * page being clever at the exact moment it should be quiet.
 *
 * The one bridge back is `promote`: the item you decide to actually chase
 * becomes a finish-line goal, and the line stays here marked rather than
 * vanishing, because a bucket list that empties as things get serious is a
 * bucket list that empties exactly as it starts working.
 */

import { useState } from "react"
import { Check, Plus, Trash2 } from "lucide-react"
import type { NsPlan } from "@/src/goals/types"
import { EXPERIENCES_COPY, EXPERIENCE_PROMPTS } from "@/src/goals/data/northStarStart"
import { experienceCount, parseGoalDump } from "@/src/goals/northStarService"
import { GeneratePanel, type GenerateHandlers } from "./Generate"
import { RampHeader } from "./StartRamps"

export interface ExperienceHandlers extends GenerateHandlers {
  onAddExperiences: (text: string, areaId: string | null) => void
  onToggleExperience: (id: string) => void
  onPromoteExperience: (id: string, areaId: string) => void
  onUpdateExperience: (id: string, patch: { areaId?: string | null; title?: string }) => void
  onRemoveExperience: (id: string) => void
}

export function ExperiencesRamp({
  plan,
  handlers,
  onBack,
}: {
  plan: NsPlan
  handlers: ExperienceHandlers
  onBack: () => void
}) {
  const [text, setText] = useState("")
  const lines = parseGoalDump(text)

  return (
    <div>
      <RampHeader title={EXPERIENCES_COPY.title} help={EXPERIENCES_COPY.help} onBack={onBack} />

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={EXPERIENCES_COPY.placeholder}
        aria-label={EXPERIENCES_COPY.title}
        className="w-full mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-white/30 transition-colors leading-relaxed resize-y"
      />

      {/* Six angles at the same question, for the moment the box goes blank
          after four lines. Deliberately including the one nobody writes first. */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {EXPERIENCE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => setText((current) => `${current.replace(/\n*$/, "")}\n${prompt}: `.replace(/^\n/, ""))}
            className="text-[10.5px] px-2 py-0.5 rounded-full border border-white/10 text-zinc-500 hover:text-zinc-100 hover:border-white/30 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-2.5">
        <span className="text-[11px] text-zinc-600">{lines.length > 0 ? `${lines.length} lines` : ""}</span>
        <button
          onClick={() => { if (lines.length > 0) { handlers.onAddExperiences(text, null); setText("") } }}
          disabled={lines.length === 0}
          className="ml-auto text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {EXPERIENCES_COPY.add(lines.length)}
        </button>
      </div>

      {/* The door where a model earns its place most: "twenty things to have
          done" is exactly the question a catalogue is useless for and a list of
          somebody's own half-written wants is a good prompt for. */}
      <GeneratePanel plan={plan} text={text} areaId={null} handlers={handlers} />

      <ExperienceList plan={plan} handlers={handlers} />
    </div>
  )
}

/**
 * The list itself.
 *
 * Also rendered on its own, collapsed, at the bottom of the goals tab — the
 * door is where you write them and this is where you live with them, and two
 * copies of the same rows would drift.
 */
export function ExperienceList({ plan, handlers }: { plan: NsPlan; handlers: ExperienceHandlers }) {
  const [promoting, setPromoting] = useState<string | null>(null)
  const counts = experienceCount(plan)

  if (plan.experiences.length === 0) {
    return <p className="text-[11.5px] text-zinc-600 mt-4">{EXPERIENCES_COPY.countNone}</p>
  }

  return (
    <div className="mt-4">
      <p className="text-[11px] text-zinc-500 tabular-nums">{EXPERIENCES_COPY.count(counts.total, counts.done)}</p>
      <ul className="mt-2 space-y-1">
        {plan.experiences.map((item) => {
          const area = item.areaId ? plan.areas.find((a) => a.id === item.areaId) : null
          return (
            <li key={item.id} className="group/x rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlers.onToggleExperience(item.id)}
                  aria-pressed={item.done}
                  aria-label={item.done ? EXPERIENCES_COPY.undo : EXPERIENCES_COPY.done}
                  className={`size-4 shrink-0 rounded-[4px] border inline-flex items-center justify-center transition-colors ${
                    item.done ? "bg-emerald-500/25 border-emerald-400/50" : "border-white/15 hover:border-white/40"
                  }`}
                >
                  {item.done && <Check className="size-2.5 text-emerald-200" />}
                </button>

                {area && <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: area.color }} />}

                <span className={`min-w-0 flex-1 text-[12.5px] ${item.done ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
                  {item.title}
                </span>

                {item.goalId ? (
                  <span className="shrink-0 text-[10px] text-violet-300/80">{EXPERIENCES_COPY.promoted}</span>
                ) : (
                  <button
                    onClick={() => setPromoting(promoting === item.id ? null : item.id)}
                    className="shrink-0 text-[10.5px] text-zinc-600 hover:text-zinc-200 transition-colors"
                  >
                    {EXPERIENCES_COPY.promote}
                  </button>
                )}

                <button
                  onClick={() => handlers.onRemoveExperience(item.id)}
                  aria-label={`${EXPERIENCES_COPY.remove} ${item.title}`}
                  className="shrink-0 text-zinc-700 hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>

              {/* Promoting asks one question, because a goal has to live in an
                  area and plenty of these belong to none. */}
              {promoting === item.id && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pl-6">
                  <span className="text-[10.5px] text-zinc-500">{EXPERIENCES_COPY.promoteWhere}</span>
                  {plan.areas.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => { handlers.onPromoteExperience(item.id, a.id); setPromoting(null) }}
                      className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full border border-white/10 text-zinc-300 hover:bg-white/10 hover:border-white/30 transition-colors"
                    >
                      <Plus className="size-2.5 text-zinc-600" />
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
