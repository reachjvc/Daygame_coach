"use client"

import type { ReactNode } from "react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkout } from "@/src/home/components/Checkout"

interface CheckoutButtonProps {
  productId: string
  children?: ReactNode
  onClick?: () => void
  className?: string
  [key: string]: any
}

export function CheckoutButton({ productId, children, className = "", ...props }: CheckoutButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col justify-end">
        <Button onClick={() => setIsOpen(true)} className={`flex items-center justify-center ${className}`} {...props}>
          {children || "Get Instant Access"}
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Purchase</DialogTitle>
            <DialogDescription>Stripe migration in progress (temporary flow).</DialogDescription>
          </DialogHeader>
          <Checkout productId={productId} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
