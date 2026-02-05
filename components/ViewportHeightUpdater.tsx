"use client"

import { useEffect } from "react"

export function ViewportHeightUpdater() {
  useEffect(() => {
    const root = document.documentElement
    const setVh = () => {
      const height = window.visualViewport?.height ?? window.innerHeight
      root.style.setProperty("--app-vh", `${height * 0.01}px`)
    }

    setVh()
    window.addEventListener("resize", setVh)
    window.visualViewport?.addEventListener("resize", setVh)
    window.visualViewport?.addEventListener("scroll", setVh)

    return () => {
      window.removeEventListener("resize", setVh)
      window.visualViewport?.removeEventListener("resize", setVh)
      window.visualViewport?.removeEventListener("scroll", setVh)
    }
  }, [])

  return null
}
