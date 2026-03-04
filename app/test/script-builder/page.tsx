"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import ScriptBuilder from "./ScriptBuilder"

export default function ScriptBuilderPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-8 py-12">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/test">
            <ArrowLeft className="size-4 mr-2" />
            Back to Test Pages
          </Link>
        </Button>
        <ScriptBuilder />
      </div>
    </div>
  )
}
