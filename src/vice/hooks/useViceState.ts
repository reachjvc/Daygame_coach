"use client"

/**
 * The one piece of state, loaded once and written on every change.
 *
 * Shared by the hub and all four flows, which is the point: somebody who starts
 * in "watch it first" and moves to "run an experiment" keeps their log, their
 * plans, their card and their voice work. Four flows, one set of answers.
 *
 * localStorage only. Nothing here goes to a server, and the sort of thing
 * people type into these boxes is exactly the sort of thing that should not.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ViceCard, ViceEpisode, ViceFlowId, ViceHandlers, ViceState, ViceUsage, ViceVoice } from "../types"
import * as vice from "../viceService"

export function useViceState(flowId: ViceFlowId | null) {
  const [state, setState] = useState<ViceState>(vice.emptyViceState)
  const [loaded, setLoaded] = useState(false)
  /** Read on the client only. Rendering "today" on the server hydrates wrong. */
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    setToday(vice.todayISO())
    const saved = vice.loadViceState(window.localStorage.getItem(vice.VICE_STORAGE_KEY))
    if (saved) setState(saved)
    setLoaded(true)
  }, [])

  // Writing before the load has finished would put the empty state over the
  // saved one on every refresh, which is the classic way one of these silently
  // eats a week of somebody's entries.
  useEffect(() => {
    if (!loaded) return
    if (vice.viceStateIsUntouched(state)) return
    window.localStorage.setItem(vice.VICE_STORAGE_KEY, vice.serializeViceState(state))
  }, [state, loaded])

  // Recording which flow they are in, once, after load. Same guard.
  useEffect(() => {
    if (!loaded || !today || !flowId || state.flowId === flowId) return
    setState((s) => vice.setFlow(s, flowId, today))
  }, [loaded, today, flowId, state.flowId])

  const reset = useCallback(() => {
    window.localStorage.removeItem(vice.VICE_STORAGE_KEY)
    setState(vice.emptyViceState())
  }, [])

  /**
   * The handler bag.
   *
   * `now` is read at call time rather than closed over, so a page left open
   * across midnight does not stamp yesterday onto tomorrow's entries.
   */
  const handlers: ViceHandlers = useMemo(() => {
    const now = () => vice.todayISO()
    return {
      setVice: (viceId, label) => setState((s) => vice.setVice(s, viceId, label, now())),
      setAnswer: (id, text) => setState((s) => vice.setAnswer(s, id, text, now())),
      setScale: (id, value) => setState((s) => vice.setScale(s, id, value, now())),
      setList: (id, items) => setState((s) => vice.setList(s, id, items, now())),
      toggleListItem: (id, item) => setState((s) => vice.toggleListItem(s, id, item, now())),
      setStepDone: (stepId, done) => setState((s) => vice.setStepDone(s, stepId, done, now())),
      setSafety: (withdrawal) => setState((s) => vice.setSafety(s, withdrawal, now())),
      acknowledgeSafety: () => setState((s) => vice.acknowledgeSafety(s, now())),
      offerLength: (days) => setState((s) => vice.offerLength(s, days, now())),
      setExperiment: (days, startDate) => setState((s) => vice.setExperiment(s, days, startDate, now())),
      setHypothesis: (text) => setState((s) => vice.setHypothesis(s, text, now())),
      addPlan: (when, then, kind) => setState((s) => vice.addPlan(s, when, then, now(), kind)),
      removePlan: (id) => setState((s) => vice.removePlan(s, id, now())),
      addEpisode: (episode: ViceEpisode) => setState((s) => vice.addEpisode(s, episode, now())),
      updateEpisode: (id, patch) => setState((s) => vice.updateEpisode(s, id, patch, now())),
      removeEpisode: (id) => setState((s) => vice.removeEpisode(s, id, now())),
      toggleMission: (day) => setState((s) => vice.toggleMission(s, day, now())),
      setVoice: (patch: Partial<ViceVoice>) =>
        setState((s) => ({ ...s, voice: { ...s.voice, ...patch }, updatedAt: now(), createdAt: s.createdAt ?? now() })),
      setCard: (patch: Partial<ViceCard>) =>
        setState((s) => ({ ...s, card: { ...s.card, ...patch }, updatedAt: now(), createdAt: s.createdAt ?? now() })),
      setCriterion: (id, answer) => setState((s) => vice.setCriterion(s, id, answer, now())),
      setUsage: (patch: Partial<ViceUsage>) => setState((s) => vice.setUsage(s, patch, now())),
      setGuess: (guess) => setState((s) => vice.setGuess(s, guess, now())),
      setHelpLocale: (locale) => setState((s) => vice.setHelpLocale(s, locale, now())),
      // All three are replaced by the shell, which owns the dialogs. Left as
      // no-ops rather than optional so no step has to null-check a handler.
      openUrge: () => {},
      openHelp: () => {},
      openTool: () => {},
      goToStep: () => {},
      nextStep: () => {},
    }
  }, [])

  return { state, setState, loaded, today, handlers, reset }
}
