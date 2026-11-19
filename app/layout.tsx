import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ViewportHeightUpdater } from "@/components/ViewportHeightUpdater"
import { ClockSync } from "@/components/ClockSync"
import { HistoryBarrierProvider } from "@/src/shared/HistoryBarrierContext"
import "./globals.css"
import { BRAND } from "@/src/shared/brand"
import { FacetScope } from "@/components/FacetScope"
import { ErrorReporting } from "@/src/shared/components/ErrorReporting"
import { StaleWorkerCleanup } from "@/src/shared/components/StaleWorkerCleanup"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  // Not preloaded: the first screen of most pages draws no monospace text, and a
  // preloaded font is downloaded whether it is used or not (about 23 KB).
  preload: false,
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Deliberately no maximum-scale / user-scalable: false. That is the usual way
  // to stop iOS zooming when a field is tapped, and it also stops anyone who
  // needs to magnify the screen. The fields are 16px on phones instead.
  themeColor: "#0b1120",
}

export const metadata: Metadata = {
  title: { default: BRAND.name, template: "%s · " + BRAND.name },
  description:
    "Plan the life you want, build the habits, quit what holds you back and get better at dating. One day at a time.",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
  // Installed on an iPhone this opens without browser chrome; the status bar is
  // drawn over the page, which is why the layout uses safe-area insets.
  appleWebApp: {
    capable: true,
    // The name under the icon on an iPhone home screen. Was "Time", which
    // made one feature look like the whole product. See app/manifest.ts.
    title: BRAND.short,
    statusBarStyle: "black-translucent",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ErrorReporting />
        {/* Development only: a worker left over from a production build on this
            same address serves stale styles and fonts over the dev server. It
            used to be cleared only on the two pages that mount the tracker. */}
        <StaleWorkerCleanup />
        <ViewportHeightUpdater />
        {/* Every signed-in page files things by date, so the account has to
            know which day it is on before any of them draw. Does nothing when
            signed out, and nothing at all if a zone was ever set. */}
        <ClockSync />
        <HistoryBarrierProvider>
          {/* each page in its part's colour: src/shared/facets.ts */}
          <FacetScope>{children}</FacetScope>
        </HistoryBarrierProvider>
      </body>
    </html>
  )
}
