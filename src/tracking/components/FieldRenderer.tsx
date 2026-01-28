"use client"

import { useState, ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Plus, X } from "lucide-react"
import type { TemplateField } from "@/src/db/trackingTypes"

interface FieldRendererProps {
  field: TemplateField
  value: unknown
  onChange: (value: unknown) => void
  prefillData?: Record<string, unknown>
}

export function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  const [tagInput, setTagInput] = useState("")

  const renderField = () => {
    switch (field.type) {
      case "text":
        return (
          <Input
            id={field.id}
            placeholder={field.placeholder}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
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
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
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
          />
        )

      case "select":
        return (
          <div className="flex flex-wrap gap-2">
            {field.options?.map((option) => (
              <Button
                key={option}
                type="button"
                variant={value === option ? "default" : "outline"}
                size="sm"
                onClick={() => onChange(option)}
              >
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
                >
                  {option}
                </Button>
              )
            })}
          </div>
        )
      }

      case "scale": {
        const min = field.min ?? 1
        const max = field.max ?? 10
        const scaleOptions = Array.from({ length: max - min + 1 }, (_, i) => min + i)
        return (
          <div className="flex flex-wrap gap-2">
            {scaleOptions.map((num) => (
              <Button
                key={num}
                type="button"
                variant={value === num ? "default" : "outline"}
                size="sm"
                className={cn(
                  "w-10 h-10",
                  value === num && "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() => onChange(num)}
              >
                {num}
              </Button>
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
          />
        )
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.id} className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      {renderField()}
    </div>
  )
}
