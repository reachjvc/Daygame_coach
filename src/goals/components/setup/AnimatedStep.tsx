"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"

export function AnimatedStep({ children, stepKey }: { children: ReactNode; stepKey: string }) {
  const [visible, setVisible] = useState(false)
  const prevKey = useRef(stepKey)

  useEffect(() => {
    if (stepKey !== prevKey.current) {
      setVisible(false)
      const timer = setTimeout(() => {
        prevKey.current = stepKey
        setVisible(true)
      }, 50)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(timer)
    }
  }, [stepKey])

  return (
    <div
      className="transition-all duration-500 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
      }}
    >
      {children}
    </div>
  )
}
