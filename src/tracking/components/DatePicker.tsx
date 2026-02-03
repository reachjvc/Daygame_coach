"use client"

import * as React from "react"
import { format, startOfDay } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date: Date
  onDateChange: (date: Date) => void
  className?: string
  "data-testid"?: string
}

export function DatePicker({
  date,
  onDateChange,
  className,
  "data-testid": testId,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Allow full 2025 calendar year up to today
  const today = startOfDay(new Date())
  const startOf2025 = new Date(2025, 0, 1) // Jan 1, 2025

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onDateChange(selectedDate)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-testid={testId}
          className={cn(
            "justify-start text-left font-normal gap-2 px-3 py-1.5 h-auto",
            "bg-gradient-to-r from-primary/15 to-primary/5 border-primary/20 shadow-sm hover:border-primary/40 hover:bg-gradient-to-r hover:from-primary/20 hover:to-primary/10",
            className
          )}
        >
          <CalendarIcon className="size-3.5 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {format(date, "EEE")}
            <span className="text-muted-foreground mx-1">·</span>
            {format(date, "d")}
            <span className="text-muted-foreground mx-1">·</span>
            {format(date, "MMM")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={date}
          onSelect={handleSelect}
          defaultMonth={date}
          startMonth={startOf2025}
          endMonth={today}
          disabled={{ after: today, before: startOf2025 }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
