import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Daygame Coach",
  description: "AI-powered daygame coaching platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
