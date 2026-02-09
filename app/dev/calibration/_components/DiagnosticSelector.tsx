"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DiagnosticSelectorProps {
  diagnostics: string[]
  selected: string | null
  onSelect: (value: string | null) => void
}

export function DiagnosticSelector({ diagnostics, selected, onSelect }: DiagnosticSelectorProps) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm font-medium">Select Diagnostic:</label>
      <Select
        value={selected || ""}
        onValueChange={(value) => onSelect(value || null)}
      >
        <SelectTrigger className="w-[400px]">
          <SelectValue placeholder="Choose a diagnostic file..." />
        </SelectTrigger>
        <SelectContent>
          {diagnostics.map((file) => (
            <SelectItem key={file} value={file}>
              {file}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
