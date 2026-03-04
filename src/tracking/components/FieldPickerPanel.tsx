"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, ChevronUp, X } from "lucide-react"

import type { FieldDefinition, FieldCategory } from "@/src/tracking/types"
import type { TemplateField } from "@/src/db/trackingTypes"
import { FIELD_LIBRARY, CATEGORY_INFO } from "@/src/tracking/config"
import { CATEGORY_ICONS, CATEGORY_COLORS_MAP } from "@/src/tracking/components/templateIcons"

interface FieldPickerPanelProps {
  /** IDs of fields already in use (excluded from picker) */
  excludeFieldIds: Set<string>
  /** Called when user selects a field from the library */
  onAddField: (field: FieldDefinition) => void
  /** Called when user creates a custom text field */
  onAddCustomField: (label: string) => void
  /** Compact mode hides category descriptions */
  compact?: boolean
}

export function FieldPickerPanel({
  excludeFieldIds,
  onAddField,
  onAddCustomField,
  compact,
}: FieldPickerPanelProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [activeCategory, setActiveCategory] = useState<FieldCategory | "all">("all")
  const [customFieldLabel, setCustomFieldLabel] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  const availableFields = useMemo(() => {
    let fields = FIELD_LIBRARY.filter(f => !excludeFieldIds.has(f.id))
    if (activeCategory !== "all") {
      fields = fields.filter(f => f.category === activeCategory)
    }
    return fields
  }, [excludeFieldIds, activeCategory])

  const handleAddCustomField = () => {
    const label = customFieldLabel.trim()
    if (!label) return
    onAddCustomField(label)
    setCustomFieldLabel("")
    setShowCustomInput(false)
  }

  return (
    <div className="space-y-3" data-testid="field-picker-panel">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="w-full py-3 border-2 border-dashed border-muted-foreground/30 rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        data-testid="field-picker-toggle"
      >
        {showPicker ? (
          <><ChevronUp className="size-4" /> Hide fields</>
        ) : (
          <><Plus className="size-4" /> Add a field</>
        )}
      </button>

      {showPicker && (
        <Card className={`${compact ? "p-3" : "p-4"} space-y-4`}>
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory("all")}
              className="h-8"
            >
              All
            </Button>
            {(Object.keys(CATEGORY_INFO) as FieldCategory[]).map(cat => (
              <Button
                key={cat}
                type="button"
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                className="h-8 gap-1.5"
              >
                {CATEGORY_ICONS[cat]}
                <span className="hidden sm:inline">{CATEGORY_INFO[cat].label}</span>
              </Button>
            ))}
          </div>

          {/* Field list */}
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {availableFields.map(field => {
              const fieldColors = CATEGORY_COLORS_MAP[field.category]
              return (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => {
                    onAddField(field)
                  }}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${fieldColors.border} ${fieldColors.bg}`}
                  data-testid={`field-option-${field.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`size-2 rounded-full ${fieldColors.dot}`} />
                      <span className="font-medium">{field.label}</span>
                    </div>
                    <Badge variant="outline" className={`text-xs ${fieldColors.text}`}>
                      {CATEGORY_INFO[field.category].label}
                    </Badge>
                  </div>
                  {!compact && (
                    <p className="text-sm text-muted-foreground mt-1 ml-4">{field.description}</p>
                  )}
                </button>
              )
            })}

            {availableFields.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No more fields in this category
              </p>
            )}
          </div>

          {/* Custom text field entry */}
          <div className="border-t pt-3">
            {showCustomInput ? (
              <div className="flex gap-2">
                <Input
                  value={customFieldLabel}
                  onChange={(e) => setCustomFieldLabel(e.target.value)}
                  placeholder="Field label (e.g. 'Body Language Notes')"
                  className="flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddCustomField()
                    }
                    if (e.key === "Escape") {
                      setShowCustomInput(false)
                      setCustomFieldLabel("")
                    }
                  }}
                  data-testid="custom-field-label-input"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCustomField}
                  disabled={!customFieldLabel.trim()}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCustomInput(false)
                    setCustomFieldLabel("")
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full text-left p-3 rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary"
                data-testid="add-custom-field-btn"
              >
                <div className="flex items-center gap-2">
                  <Plus className="size-4" />
                  <span className="font-medium">Custom text field</span>
                </div>
                <p className="text-sm mt-1 ml-6">Type your own label to create a textarea field</p>
              </button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

/**
 * Generate an ad-hoc custom field definition.
 * Returns a TemplateField suitable for FieldRenderer.
 */
export function createCustomTextField(label: string): TemplateField {
  const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  return {
    id,
    type: "textarea",
    label,
    placeholder: `Enter ${label.toLowerCase()}...`,
    rows: 4,
  }
}
