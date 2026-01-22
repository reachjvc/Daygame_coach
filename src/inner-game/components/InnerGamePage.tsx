"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import type { ValueItem } from "../types"

export function InnerGamePage() {
  const [values, setValues] = useState<ValueItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchValues() {
      setLoading(true)

      try {
        const response = await fetch("/api/inner-game/values")
        if (!response.ok) throw new Error(`Request failed (status ${response.status})`)

        const data = (await response.json()) as ValueItem[]
        setValues(data)
      } catch (error) {
        console.error("Failed to load values:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchValues()
  }, [])

  const toggleValue = (id: string) => {
    setSelected((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  const saveSelection = async () => {
    setSaving(true)

    try {
      const selectedArray = Array.from(selected)
      const response = await fetch("/api/inner-game/values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valueIds: selectedArray }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error ?? `Request failed (status ${response.status})`)
      }

      alert("Your selections have been saved!")
    } catch (error) {
      console.error("Failed to save selections:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-12">Loading values...</div>

  const categories = Array.from(new Set(values.map((v) => v.category)))
  const valuesByCategory: Record<string, ValueItem[]> = {}
  categories.forEach((cat) => {
    valuesByCategory[cat] = values.filter((v) => v.category === cat)
  })

  const categoryColors: Record<string, string> = {
    Discipline: "bg-red-500/20",
    Drive: "bg-orange-500/20",
    Emotion: "bg-yellow-400/20",
    Ethics: "bg-green-400/20",
    Freedom: "bg-blue-400/20",
    Growth: "bg-indigo-400/20",
    Identity: "bg-purple-400/20",
    Play: "bg-pink-400/20",
    Purpose: "bg-rose-400/20",
    Social: "bg-teal-400/20",
  }

  return (
    <div className="min-h-screen bg-background py-12">
        <header className="fixed top-0 left-0 w-full bg-background/80 backdrop-blur z-10 border-b">
            <div className="max-w-[95%] mx-auto py-4">
                <Button asChild variant="outline">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>
        </header>
      <div className="max-w-[95%] mx-auto space-y-8 pt-20">
        <h1 className="text-3xl font-bold mb-4 text-foreground">Choose Your Values</h1>
        <p className="text-muted-foreground mb-6">
          Select the values that resonate with you. You can update these later in your profile.
        </p>

        {categories.map((cat) => (
          <div key={cat}>
            <h2 className="text-xl font-semibold mb-2 text-foreground">{cat}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {valuesByCategory[cat].map((value) => (
                <button
                  key={value.id}
                  onClick={() => toggleValue(value.id)}
                  className={`p-3 border rounded-lg cursor-pointer text-center font-medium transition-all duration-150
                    ${selected.has(value.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : `${categoryColors[cat] || "bg-card"} border-border text-foreground`
                    }
                  `}
                >
                  {value.display_name || value.id.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        ))}

        <Button
          onClick={saveSelection}
          disabled={saving}
          className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? "Saving..." : "Save Selections"}
        </Button>
      </div>
    </div>
  )
}
