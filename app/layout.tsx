import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ViewportHeightUpdater } from "@/components/ViewportHeightUpdater"
import { HistoryBarrierProvider } from "@/src/shared/HistoryBarrierContext"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
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
  title: "AI Daygame Coach - Practice Social Skills from Home",
  description:
    "Master your daygame and social skills with our AI coach. Practice approach scenarios, get real-time feedback, and build confidence before taking it to the real world.",
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
    title: "Time",
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
        <ViewportHeightUpdater />
        <HistoryBarrierProvider>
          {children}
        </HistoryBarrierProvider>
      </body>
    </html>
  )
}
