"use client"

import type { CSSProperties, ReactNode } from "react"

export function GlassCard({
  children,
  className = "",
  glowColor,
  style,
}: {
  children: ReactNode
  className?: string
  glowColor?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(0, 255, 127, 0.03), rgba(124, 77, 255, 0.04), rgba(15, 15, 35, 0.55))",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: glowColor
          ? `1px solid ${glowColor}30`
          : "1px solid rgba(0, 255, 127, 0.08)",
        boxShadow: glowColor
          ? `0 0 20px ${glowColor}10, inset 0 1px 0 rgba(0,255,127,0.05)`
          : "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(0,255,127,0.04), inset 0 0 30px rgba(124,77,255,0.02)",
        ...style,
      }}
    >
      {children}
    </div>
  )
}
