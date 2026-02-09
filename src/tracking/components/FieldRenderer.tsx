"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Plus, X, Check } from "lucide-react"
import type { TemplateField } from "@/src/db/trackingTypes"
import type { VoiceRecorderResult, AudioUploadResult } from "../types"
import { VoiceRecorderButton } from "./VoiceRecorderButton"
import { AudioUploadButton } from "./AudioUploadButton"

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

// Field types where voice input makes sense on the label row
const VOICE_LABEL_TYPES = new Set(["text", "textarea"])

export function FieldRenderer({ field, value, onChange, variant = "default" }: FieldRendererProps) {
  const [tagInput, setTagInput] = useState("")
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null)

  // Revoke blob URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl)
    }
  }, [audioBlobUrl])

  // Voice transcription handler for text/textarea fields (appends to existing value)
  const handleVoiceComplete = (result: VoiceRecorderResult) => {
    if (!result.transcription) return
    const current = (value as string) || ""
    const separator = current ? " " : ""
    onChange(current + separator + result.transcription)
  }

  // Audio file upload handler for conversation fields
  const handleAudioUpload = (result: AudioUploadResult) => {
    setAudioBlobUrl(result.audioBlobUrl)
    if (result.transcription) {
      const current = (value as string) || ""
      const separator = current ? "\n\n" : ""
      onChange(current + separator + result.transcription)
    }
  }

  const isConversationField = field.allowAudio && field.type === "textarea"

  const inputClassName = cn(
    "transition-all duration-200 bg-background border-border/50",
    variant === "card" && "bg-background/50 focus:border-primary"
  )

  const renderField = () => {
    switch (field.type) {
      case "text":
        return (
          <Input
            id={field.id}
            data-testid={`field-input-${field.id}`}
            placeholder={field.placeholder}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputClassName}
          />
        )

      case "textarea": {
        // Multiple textareas mode (for conversations, etc.)
        if (field.multiple) {
          // Backward compatibility: convert string to array
          const items = Array.isArray(value) ? value : (value ? [value as string] : [""])

          // Auto-migrate string to array on first render
          if (typeof value === 'string' && value !== '') {
            onChange([value])
          } else if (!value || (Array.isArray(value) && value.length === 0)) {
            onChange([""])
          }

          return (
            <div className="space-y-3" data-testid={`field-multiple-${field.id}`}>
              {items.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex gap-2">
                    <textarea
                      data-testid={`field-multiple-${field.id}-${index}`}
                      placeholder={`${field.placeholder || field.label} ${items.length > 1 ? `#${index + 1}` : ""}`}
                      value={(item as string) || ""}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                        const newItems = [...items]
                        newItems[index] = e.target.value
                        onChange(newItems)
                      }}
                      rows={field.rows || 4}
                      className={cn(
                        "flex-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-200",
                        variant === "card" && "bg-background/50 border-border/50 focus:border-primary"
                      )}
                    />
                    <div className="flex flex-col gap-1">
                      {field.allowAudio && (
                        <>
                          <VoiceRecorderButton
                            onComplete={(result) => {
                              if (!result.transcription) return
                              const newItems = [...items]
                              const current = (newItems[index] as string) || ""
                              const separator = current ? " " : ""
                              newItems[index] = current + separator + result.transcription
                              onChange(newItems)
                            }}
                            data-testid={`voice-btn-${field.id}-${index}`}
                          />
                          <AudioUploadButton
                            onComplete={(result) => {
                              if (result.transcription) {
                                const newItems = [...items]
                                const current = (newItems[index] as string) || ""
                                const separator = current ? "\n\n" : ""
                                newItems[index] = current + separator + result.transcription
                                onChange(newItems)
                              }
                            }}
                            data-testid={`audio-upload-${field.id}-${index}`}
                          />
                        </>
                      )}
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          data-testid={`field-multiple-remove-${field.id}-${index}`}
                          onClick={() => {
                            const newItems = items.filter((_, i) => i !== index)
                            onChange(newItems.length > 0 ? newItems : [""])
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid={`field-multiple-add-${field.id}`}
                onClick={() => onChange([...items, ""])}
                className="w-full"
              >
                <Plus className="size-4 mr-2" />
                Add {field.label}
              </Button>
            </div>
          )
        }

        // Single textarea mode (default)
        return (
          <textarea
            id={field.id}
            data-testid={`field-input-${field.id}`}
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
      }

      case "number":
        return (
          <Input
            id={field.id}
            data-testid={`field-input-${field.id}`}
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
            <div className="flex gap-2 sm:gap-3" data-testid={`field-select-${field.id}`}>
              {field.options?.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  data-testid={`field-option-${field.id}-${index}`}
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
          <div className="flex flex-wrap gap-2" data-testid={`field-select-${field.id}`}>
            {field.options?.map((option) => (
              <Button
                key={option}
                type="button"
                data-testid={`field-option-${field.id}-${option.toLowerCase().replace(/\s+/g, '-')}`}
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
        const predefinedOptions = field.options || []
        const customValues = selectedValues.filter(v => !predefinedOptions.includes(v))
        return (
          <div className="space-y-3" data-testid={`field-multiselect-${field.id}`}>
            <div className="flex flex-wrap gap-2">
              {predefinedOptions.map((option) => {
                const isSelected = selectedValues.includes(option)
                return (
                  <Button
                    key={option}
                    type="button"
                    data-testid={`field-option-${field.id}-${option.toLowerCase().replace(/\s+/g, '-')}`}
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
            {field.allowCustom && (
              <>
                {customValues.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {customValues.map((custom) => (
                      <Badge key={custom} variant="secondary" className="flex items-center gap-1">
                        {custom}
                        <button
                          type="button"
                          onClick={() => onChange(selectedValues.filter((v) => v !== custom))}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    data-testid={`field-custom-input-${field.id}`}
                    placeholder="Add your own..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagInput.trim()) {
                        e.preventDefault()
                        if (!selectedValues.includes(tagInput.trim())) {
                          onChange([...selectedValues, tagInput.trim()])
                        }
                        setTagInput("")
                      }
                    }}
                    className={inputClassName}
                  />
                  <VoiceRecorderButton
                    onComplete={(result) => {
                      if (result.transcription) {
                        const current = tagInput
                        const separator = current ? " " : ""
                        setTagInput(current + separator + result.transcription)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    data-testid={`field-custom-add-${field.id}`}
                    onClick={() => {
                      if (tagInput.trim() && !selectedValues.includes(tagInput.trim())) {
                        onChange([...selectedValues, tagInput.trim()])
                        setTagInput("")
                      }
                    }}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )
      }

      case "scale": {
        const min = field.min ?? 1
        const max = field.max ?? 5
        const scaleOptions = Array.from({ length: max - min + 1 }, (_, i) => min + i)
        return (
          <div className="flex gap-2" data-testid={`field-scale-${field.id}`}>
            {scaleOptions.map((num) => (
              <button
                key={num}
                type="button"
                data-testid={`field-scale-${field.id}-${num}`}
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

      case "slider": {
        const min = field.min ?? 1
        const max = field.max ?? 10
        const currentValue = (value as number) ?? Math.floor((min + max) / 2)
        return (
          <div className="space-y-3" data-testid={`field-slider-${field.id}`}>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={min}
                max={max}
                value={currentValue}
                onChange={(e) => onChange(Number(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                data-testid={`field-slider-input-${field.id}`}
              />
              <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg">
                {currentValue}
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>{min}</span>
              <span>{max}</span>
            </div>
          </div>
        )
      }

      case "datetime":
        return (
          <Input
            id={field.id}
            data-testid={`field-input-${field.id}`}
            type="datetime-local"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        )

      case "list": {
        const listItems = (value as string[]) || []
        const count = field.count || 3
        return (
          <div className="space-y-2" data-testid={`field-list-${field.id}`}>
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  data-testid={`field-list-${field.id}-${i}`}
                  placeholder={`${field.placeholder || "Item"} ${i + 1}`}
                  value={listItems[i] || ""}
                  onChange={(e) => {
                    const newList = [...listItems]
                    newList[i] = e.target.value
                    onChange(newList)
                  }}
                  className="flex-1"
                />
                <VoiceRecorderButton
                  onComplete={(result) => {
                    if (!result.transcription) return
                    const newList = [...listItems]
                    const current = newList[i] || ""
                    const separator = current ? " " : ""
                    newList[i] = current + separator + result.transcription
                    onChange(newList)
                  }}
                />
              </div>
            ))}
          </div>
        )
      }

      case "tags": {
        const tags = (value as string[]) || []
        return (
          <div className="space-y-2" data-testid={`field-tags-${field.id}`}>
            <div className="flex flex-wrap gap-2" data-testid={`field-tags-list-${field.id}`}>
              {tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="flex items-center gap-1" data-testid={`field-tag-${field.id}-${i}`}>
                  {tag}
                  <button
                    type="button"
                    data-testid={`field-tag-remove-${field.id}-${i}`}
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
                data-testid={`field-tags-input-${field.id}`}
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
              <VoiceRecorderButton
                onComplete={(result) => {
                  if (result.transcription) {
                    const current = tagInput
                    const separator = current ? " " : ""
                    setTagInput(current + separator + result.transcription)
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                data-testid={`field-tags-add-${field.id}`}
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

  // Show voice/audio buttons in label only for single textareas (not multiple)
  const showLabelVoice = VOICE_LABEL_TYPES.has(field.type) && !field.multiple

  return (
    <div className={cn(
      "space-y-2",
      variant === "card" && "p-4 rounded-xl bg-muted/30 border border-border/50"
    )}>
      <div className="flex items-center justify-between">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {field.label}
        </Label>
        {showLabelVoice && (
          <div className="flex items-center gap-1">
            <VoiceRecorderButton
              onComplete={handleVoiceComplete}
              data-testid={`voice-btn-${field.id}`}
            />
            {isConversationField && (
              <AudioUploadButton
                onComplete={handleAudioUpload}
                data-testid={`audio-upload-${field.id}`}
              />
            )}
          </div>
        )}
      </div>
      {renderField()}
      {isConversationField && audioBlobUrl && !field.multiple && (
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
          <audio src={audioBlobUrl} controls className="h-8 flex-1" />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              URL.revokeObjectURL(audioBlobUrl)
              setAudioBlobUrl(null)
            }}
            className="text-muted-foreground hover:text-destructive shrink-0"
            title="Remove audio"
          >
            <X className="size-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
