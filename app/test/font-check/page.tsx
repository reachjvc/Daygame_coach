"use client"

/**
 * WHAT IS THIS BROWSER ACTUALLY DOING TO THE TEXT?
 *
 * Built because the site "looked zoomed in" on the user's machine and every
 * measurement available to me said it was fine. It said so honestly: the two
 * font stand-ins `next/font` generates are both `local(Arial)`, and the Linux
 * box the tests run on has no Arial, so the broken and the correct font stacks
 * rendered byte-identical here. Playwright also starts every run with a clean
 * profile, so it can never see a service worker or a zoom setting either.
 *
 * Rather than guess a fourth time, this page asks the browser that has the
 * problem. Open it, read the top line, or send a picture of it.
 *
 * Every number is measured in the browser, not assumed.
 */

import { useEffect, useState } from "react"

interface Report {
  zoomPercent: number
  devicePixelRatio: number
  geistLoaded: boolean
  geistMonoLoaded: boolean
  bodyFamily: string
  bodyFontSize: string
  rootFontSize: string
  measuredWidth: number
  geistWidth: number
  arialWidth: number
  sansWidth: number
  monoFallbackWidth: number
  workers: number
  caches: string[]
  viewport: string
}

const PROBE = "Track your approaches, write reports"

export default function FontCheckPage() {
  const [r, setR] = useState<Report | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready

      const probe = document.createElement("span")
      probe.style.cssText = "position:absolute;left:-9999px;top:0;white-space:nowrap;font-size:16px"
      probe.textContent = PROBE
      document.body.appendChild(probe)
      const widthIn = (family: string) => {
        probe.style.fontFamily = family
        return Math.round(probe.getBoundingClientRect().width * 10) / 10
      }
      const measured = widthIn(getComputedStyle(document.body).fontFamily)
      const geistWidth = widthIn("Geist")
      const arialWidth = widthIn("Arial")
      const sansWidth = widthIn("sans-serif")
      const monoFallbackWidth = widthIn('"Geist Mono Fallback"')
      probe.remove()

      const fonts = document as unknown as { fonts: { check: (f: string) => boolean } }
      const workers =
        "serviceWorker" in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0
      const cacheNames = "caches" in window ? await caches.keys() : []

      if (cancelled) return
      setR({
        // Browser zoom shows up here on a normal display: 125% zoom reads as 1.25.
        zoomPercent: Math.round(window.devicePixelRatio * 100),
        devicePixelRatio: window.devicePixelRatio,
        geistLoaded: fonts.fonts.check("16px Geist"),
        geistMonoLoaded: fonts.fonts.check("16px 'Geist Mono'"),
        bodyFamily: getComputedStyle(document.body).fontFamily,
        bodyFontSize: getComputedStyle(document.body).fontSize,
        rootFontSize: getComputedStyle(document.documentElement).fontSize,
        measuredWidth: measured,
        geistWidth,
        arialWidth,
        sansWidth,
        monoFallbackWidth,
        workers,
        caches: cacheNames,
        viewport: `${window.innerWidth} x ${window.innerHeight}`,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!r) return <main style={{ padding: 24 }}>Measuring…</main>

  const usingGeist = r.geistLoaded && Math.abs(r.measuredWidth - r.geistWidth) < 1
  const oversizedBy = r.geistWidth > 0 ? Math.round((r.measuredWidth / r.geistWidth - 1) * 1000) / 10 : 0

  const verdicts: Array<{ ok: boolean; text: string }> = [
    {
      ok: usingGeist,
      text: usingGeist
        ? "Text is being drawn in Geist, the app's real font."
        : `Text is NOT Geist — it is ${oversizedBy > 0 ? `${oversizedBy}% wider` : `${-oversizedBy}% narrower`} than Geist would be. The webfont did not arrive.`,
    },
    {
      ok: r.zoomPercent === 100,
      text:
        r.zoomPercent === 100
          ? "Browser zoom is 100%."
          : `Browser zoom (or display scaling) is about ${r.zoomPercent}%. Ctrl+0 (Cmd+0 on a Mac) resets it. This alone makes everything look bigger.`,
    },
    {
      ok: r.workers === 0,
      text:
        r.workers === 0
          ? "No service worker — nothing is serving you old files."
          : `${r.workers} service worker(s) still registered. One of these can serve stylesheets and fonts from an old build.`,
    },
    {
      ok: r.caches.length === 0,
      text:
        r.caches.length === 0
          ? "No cached files held by a worker."
          : `Cached files still stored: ${r.caches.join(", ")}.`,
    },
    {
      ok: r.rootFontSize === "16px",
      text:
        r.rootFontSize === "16px"
          ? "Base text size is the normal 16px."
          : `Base text size is ${r.rootFontSize}, not 16px. A browser "minimum font size" or default-size setting does this.`,
    },
  ]

  const allGood = verdicts.every((v) => v.ok)

  return (
    <main style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Font check</h1>
      <p style={{ opacity: 0.7, marginBottom: 20 }}>
        What this browser is doing to the text, measured just now. Send a picture of this page.
      </p>

      <div
        style={{
          padding: 16,
          borderRadius: 10,
          marginBottom: 20,
          background: allGood ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${allGood ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"}`,
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        {allGood ? "Everything here looks correct." : "Found something — see the red lines below."}
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "grid", gap: 10 }}>
        {verdicts.map((v, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              padding: "10px 12px",
              borderRadius: 8,
              background: v.ok ? "rgba(255,255,255,0.04)" : "rgba(239,68,68,0.12)",
            }}
          >
            <span aria-hidden style={{ fontSize: 18, lineHeight: "24px" }}>{v.ok ? "✅" : "❌"}</span>
            <span style={{ fontSize: 16, lineHeight: "24px" }}>{v.text}</span>
          </li>
        ))}
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>The raw numbers</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <tbody>
          {(
            [
              ["Zoom / pixel ratio", `${r.zoomPercent}% (devicePixelRatio ${r.devicePixelRatio})`],
              ["Window size", r.viewport],
              ["Root text size", r.rootFontSize],
              ["Body text size", r.bodyFontSize],
              ["Body font stack", r.bodyFamily],
              ["Geist webfont loaded", String(r.geistLoaded)],
              ["Geist Mono loaded", String(r.geistMonoLoaded)],
              ["Test string as drawn", `${r.measuredWidth}px`],
              ["…in real Geist", `${r.geistWidth}px`],
              ["…in Arial", `${r.arialWidth}px`],
              ["…in plain sans-serif", `${r.sansWidth}px`],
              ["…in the mono stand-in", `${r.monoFallbackWidth}px`],
              ["Service workers", String(r.workers)],
              ["Caches", r.caches.length ? r.caches.join(", ") : "none"],
            ] as Array<[string, string]>
          ).map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: "6px 10px 6px 0", opacity: 0.7, whiteSpace: "nowrap", verticalAlign: "top" }}>{k}</td>
              <td style={{ padding: "6px 0", fontFamily: "var(--font-geist-mono)", wordBreak: "break-word" }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 18, fontWeight: 600, margin: "24px 0 8px" }}>The same sentence, four ways</h2>
      <p style={{ opacity: 0.7, fontSize: 14, marginBottom: 10 }}>
        If the first line looks the same size as the second, the font is right. If it looks like the fourth, that is
        the bug.
      </p>
      {(
        [
          ["As the app draws it", getComputedStyle(document.body).fontFamily],
          ["Real Geist", "Geist"],
          ["Correct stand-in", '"Geist Fallback", sans-serif'],
          ["Wrong stand-in (the bug)", '"Geist Mono Fallback", sans-serif'],
        ] as Array<[string, string]>
      ).map(([label, family]) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 2 }}>{label}</div>
          <div style={{ fontFamily: family, fontSize: 16 }}>{PROBE}</div>
        </div>
      ))}
    </main>
  )
}
