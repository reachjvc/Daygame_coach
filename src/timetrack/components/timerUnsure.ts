"use client"

import { createContext, useContext } from "react"

/**
 * THE RUNNING TIMER IS NOT CONFIRMED YET: the page has just opened, or woken
 * after it was asleep, and the account has not answered (`CheckState.unsure`).
 *
 * Every place that draws the running timer (the phone's bar and its row in the
 * list, the PC's timer bar, the header pill, the tab title) shows "Checking…"
 * instead of the old copy's name and clock, so a timer the other device
 * stopped never flashes as still running. Stop stays where it was and works:
 * a tap is held until the check answers (D2, `afterCheck`).
 */
export const TimerUnsureContext = createContext(false)

export const useTimerUnsure = () => useContext(TimerUnsureContext)

/** What stands in for the timer's name and clock while it is unsure */
export const CHECKING_TIMER = "Checking…"
