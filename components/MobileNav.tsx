"use client"

import * as React from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"

export type MobileNavItem =
  | {
      type: "link"
      href: string
      label: string
      icon?: React.ReactNode
      variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
      testId?: string
      className?: string
    }
  | {
      type: "action"
      label: string
      icon?: React.ReactNode
      action: () => void | Promise<void>
      variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
      testId?: string
      className?: string
    }

interface MobileNavProps {
  items: MobileNavItem[]
  ctaItems?: MobileNavItem[]
  isPreviewMode?: boolean
}

export function MobileNav({ items, ctaItems = [], isPreviewMode = false }: MobileNavProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:hidden top-0 left-0 translate-x-0 translate-y-0 w-full h-full max-w-none rounded-none pt-safe pb-safe">
        <DialogHeader className="text-left">
          <DialogTitle>Menu</DialogTitle>
          {isPreviewMode && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs text-amber-600 font-medium">Preview Mode</span>
            </div>
          )}
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-2">
          {items.map((item) => {
            if (item.type === "link") {
              return (
                <DialogClose asChild key={`${item.label}-${item.href}`}>
                  <Button
                    asChild
                    variant={item.variant ?? "ghost"}
                    className={`w-full justify-start ${item.className ?? ""}`}
                    data-testid={item.testId}
                  >
                    <Link href={item.href}>
                      {item.icon}
                      {item.label}
                    </Link>
                  </Button>
                </DialogClose>
              )
            }

            return (
              <form action={item.action} key={item.label}>
                <Button
                  type="submit"
                  variant={item.variant ?? "ghost"}
                  className={`w-full justify-start ${item.className ?? ""}`}
                  data-testid={item.testId}
                >
                  {item.icon}
                  {item.label}
                </Button>
              </form>
            )
          })}
        </div>

        {ctaItems.length > 0 && (
          <div className="mt-6 border-t border-border pt-4 flex flex-col gap-2">
            {ctaItems.map((item) => {
              if (item.type === "link") {
                return (
                  <DialogClose asChild key={`${item.label}-${item.href}`}>
                    <Button
                      asChild
                      variant={item.variant ?? "default"}
                      className={`w-full justify-start ${item.className ?? ""}`}
                      data-testid={item.testId}
                    >
                      <Link href={item.href}>
                        {item.icon}
                        {item.label}
                      </Link>
                    </Button>
                  </DialogClose>
                )
              }

              return (
                <form action={item.action} key={item.label}>
                  <Button
                    type="submit"
                    variant={item.variant ?? "default"}
                    className={`w-full justify-start ${item.className ?? ""}`}
                    data-testid={item.testId}
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                </form>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
