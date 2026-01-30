"use client"

import { useState, ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Plus, X, Check } from "lucide-react"
import type { TemplateField } from "@/src/db/trackingTypes"

interface FieldRendererProps {
  field: TemplateField
  value: unknown
  onChange: (value: unknown) => void
  prefillData?: Record<string, unknown>
  variant?: "default" | "card"
}

// Check if all options are emoji-only (for special emoji picker rendering)
function isEmojiOptions(options?: string[]): boolean {
  if (!options || options.length === 0) return false
  // Match single emoji characters (including emoji with skin tones, etc.)
  const emojiRegex = /^[\p{Emoji}]+$/u
  return options.every(opt => emojiRegex.test(opt))
}

export function FieldRenderer({ field, value, onChange, variant = "default" }: FieldRendererProps) {
  const [tagInput, setTagInput] = useState("")

  const inputClassName = cn(
    "transition-all duration-200",
    variant === "card" && "bg-background/50 border-border/50 focus:border-primary"
  )

  const renderField = () => {
    switch (field.type) {
      case "text":
        return (
          <Input
            id={field.id}
            placeholder={field.placeholder}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputClassName}
          />
        )

      case "textarea":
        return (
          <textarea
            id={field.id}
            placeholder={field.placeholder}
            value={(value as string) || ""}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
            rows={field.rows || 4}
            className={cn(
              "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-200",
              variant === "card" && "bg-background/50 border-border/50 focus:border-primary"
            )}
          />
        )

      case "number":
        return (
          <Input
            id={field.id}
            type="number"
            placeholder={field.placeholder}
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            min={field.min}
            max={field.max}
            className={inputClassName}
          />
        )

      case "select":
        // Special emoji mood picker
        if (isEmojiOptions(field.options)) {
          return (
            <div className="flex gap-2 sm:gap-3">
              {field.options?.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange(option)}
                  className={cn(
                    "text-2xl sm:text-3xl p-2 sm:p-3 rounded-xl transition-all duration-200 hover:scale-110",
                    value === option
                      ? "bg-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-lg"
                      : "bg-muted/50 hover:bg-muted opacity-60 hover:opacity-100"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )
        }
        // Regular button group select
        return (
          <div className="flex flex-wrap gap-2">
            {field.options?.map((option) => (
              <Button
                key={option}
                type="button"
                variant={value === option ? "default" : "outline"}
                size="sm"
                onClick={() => onChange(option)}
                className="transition-all duration-200"
              >
                {value === option && <Check className="size-3 mr-1" />}
                {option}
              </Button>
            ))}
          </div>
        )

      case "multiselect": {
        const selectedValues = (value as string[]) || []
        return (
          <div className="flex flex-wrap gap-2">
            {field.options?.map((option) => {
              const isSelected = selectedValues.includes(option)
              return (
                <Button
                  key={option}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (isSelected) {
                      onChange(selectedValues.filter((v) => v !== option))
                    } else {
                      onChange([...selectedValues, option])
                    }
                  }}
                  className="transition-all duration-200"
                >
                  {isSelected && <Check className="size-3 mr-1" />}
                  {option}
                </Button>
              )
            })}
          </div>
        )
      }

      case "scale": {
        const min = field.min ?? 1
        const max = field.max ?? 5
        const scaleOptions = Array.from({ length: max - min + 1 }, (_, i) => min + i)
        return (
          <div className="flex gap-2">
            {scaleOptions.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onChange(num)}
                className={cn(
                  "w-11 h-11 rounded-xl font-semibold transition-all duration-200",
                  value === num
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {num}
              </button>
            ))}
          </div>
        )
      }

      case "datetime":
        return (
          <Input
            id={field.id}
            type="datetime-local"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        )

      case "list": {
        const listItems = (value as string[]) || []
        const count = field.count || 3
        return (
          <div className="space-y-2">
            {Array.from({ length: count }, (_, i) => (
              <Input
                key={i}
                placeholder={`${field.placeholder || "Item"} ${i + 1}`}
                value={listItems[i] || ""}
                onChange={(e) => {
                  const newList = [...listItems]
                  newList[i] = e.target.value
                  onChange(newList)
                }}
              />
            ))}
          </div>
        )
      }

      case "tags": {
        const tags = (value as string[]) || []
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={field.placeholder || "Add tag..."}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    e.preventDefault()
                    if (!tags.includes(tagInput.trim())) {
                      onChange([...tags, tagInput.trim()])
                    }
                    setTagInput("")
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                    onChange([...tags, tagInput.trim()])
                    setTagInput("")
                  }
                }}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        )
      }

      default:
        return (
          <Input
            id={field.id}
            placeholder={field.placeholder}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputClassName}
          />
        )
    }
  }

  return (
    <div className={cn(
      "space-y-2",
      variant === "card" && "p-4 rounded-xl bg-muted/30 border border-border/50"
    )}>
      <Label htmlFor={field.id} className="flex items-center gap-1 text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {renderField()}
    </div>
  )
}
