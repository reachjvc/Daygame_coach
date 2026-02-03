"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        // Root
        root: "w-full",
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-4",

        // Caption - hide default label when using dropdowns
        month_caption: "flex items-center justify-between px-1 h-9",
        caption_label: "hidden",

        // Dropdowns for month/year - styled for dark mode
        dropdowns: "flex items-center gap-2",
        dropdown: cn(
          // Base styling
          "rounded-md px-2 py-1.5 text-sm font-medium cursor-pointer",
          // Colors that work in dark mode
          "bg-muted/50 text-foreground border border-border",
          // Hover/focus states
          "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50",
          // Remove default browser styling
          "appearance-none",
          // Custom dropdown arrow
          "bg-[length:16px_16px] bg-[right_4px_center] bg-no-repeat pr-7",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]"
        ),
        months_dropdown: "min-w-[110px]",
        years_dropdown: "min-w-[75px]",

        // Navigation buttons
        nav: "flex items-center gap-1",
        button_previous: cn(
          "inline-flex items-center justify-center rounded-md",
          "h-7 w-7 bg-transparent p-0",
          "text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        ),
        button_next: cn(
          "inline-flex items-center justify-center rounded-md",
          "h-7 w-7 bg-transparent p-0",
          "text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        ),

        // Week grid
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground w-9 font-normal text-[0.8rem] text-center",
        week: "flex w-full mt-2",

        // Days
        day: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center",
        day_button: cn(
          "inline-flex items-center justify-center rounded-md",
          "h-8 w-8 p-0 font-normal transition-colors",
          "hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        ),

        // Day states
        today: "bg-primary/20 text-primary font-semibold",
        selected: "!bg-primary !text-primary-foreground hover:!bg-primary/90",
        outside: "text-muted-foreground/50",
        disabled: "text-muted-foreground/30 cursor-not-allowed hover:bg-transparent",
        hidden: "invisible",

        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") {
            return <ChevronLeft className="h-4 w-4" />
          }
          return <ChevronRight className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
