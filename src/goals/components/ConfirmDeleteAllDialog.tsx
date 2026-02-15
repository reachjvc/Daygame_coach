"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"

interface ConfirmDeleteAllDialogProps {
  goalCount: number
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDeleteAllDialog({
  goalCount,
  isDeleting,
  onConfirm,
  onCancel,
}: ConfirmDeleteAllDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in duration-200" data-testid="goals-delete-all-confirm">
      <div className="relative bg-card border border-border rounded-2xl p-6 max-w-sm mx-4 text-center shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-destructive/15">
          <AlertTriangle className="size-7 text-destructive" />
        </div>

        <h3 className="text-lg font-bold mb-1">Delete all goals?</h3>

        <p className="text-sm text-muted-foreground mb-5">
          This will permanently delete{" "}
          <span className="font-semibold text-foreground">{goalCount} goal{goalCount !== 1 ? "s" : ""}</span>.
          All progress, streaks, and history will be lost. This cannot be undone.
        </p>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onCancel}
            disabled={isDeleting}
            data-testid="goals-delete-all-cancel"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid="goals-delete-all-confirm-yes"
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin mr-1" />
            ) : (
              <Trash2 className="size-4 mr-1" />
            )}
            {isDeleting ? "Deleting..." : "Delete All"}
          </Button>
        </div>
      </div>
    </div>
  )
}
