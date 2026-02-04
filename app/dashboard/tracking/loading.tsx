import { Loader2 } from "lucide-react"

export default function TrackingLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  )
}
