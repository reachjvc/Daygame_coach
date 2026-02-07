"use client"

import { useCallback } from "react"
import { LairPage } from "./LairPage"
import type { UserLairLayout } from "../types"

interface LairContentProps {
  initialLayout: UserLairLayout
}

export function LairContent({ initialLayout }: LairContentProps) {
  const handleSaveLayout = useCallback(async (layout: UserLairLayout) => {
    const response = await fetch("/api/lair", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(layout),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || "Failed to save layout")
    }
  }, [])

  return (
    <LairPage
      initialLayout={initialLayout}
      onSaveLayout={handleSaveLayout}
    />
  )
}
