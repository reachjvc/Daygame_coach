"use client"

import { useEffect } from "react"

import { claimThisDevice } from "../pushClient"

/** Drawn by the (app) layout: once per page load, this browser's push address is the signed-in person's. See `claimThisDevice`. */
export function ClaimThisDevice() {
  useEffect(() => {
    void claimThisDevice()
  }, [])
  return null
}
