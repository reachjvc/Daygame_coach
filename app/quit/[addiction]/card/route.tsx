import { ImageResponse } from "next/og"
import { BrandMark } from "@/components/BrandMark"
import type { NextRequest } from "next/server"
import { getAddiction } from "@/src/quit/data"
import { frame, isFlag, isViewable, menu } from "@/src/quit/menu"
import { liesInSentence } from "@/src/quit/tools/beliefs/flow"
import { parseHeld } from "@/src/quit/tools/beliefs/logic"
import { fill, tooltext } from "@/src/quit/tooltext"

const MUTED = "#a1a1aa"

/** The share image of the lies test: the count only, nothing about the reader. Without `held` it asks the question (the page's own preview image). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ addiction: string }> }) {
  const { addiction } = await params
  const preview = isFlag(req.nextUrl.searchParams.getAll("preview"))
  if (!isViewable(addiction, preview)) return new Response(null, { status: 404 })
  const rawHeld = req.nextUrl.searchParams.get("held")
  const held = rawHeld === null ? null : parseHeld(rawHeld)
  if (rawHeld !== null && held === null) return new Response(null, { status: 400 })
  if (!getAddiction(addiction)) return new Response(null, { status: 404 })
  const slots = { n: held ?? 0, lies: liesInSentence(menu.addictions[addiction].lies) }
  const line = fill(held === null ? tooltext.beliefs.questionCard : tooltext.beliefs.shareText, slots)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0b0d",
          color: "#f5f5f5",
          padding: 90,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 40, color: MUTED }}>
          <BrandMark size={72} className="" />
          {frame.siteName}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 360, fontWeight: 700, lineHeight: 1, color: "#a78bfa" }}>{held === null ? "?" : held}</div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.15, marginTop: 30 }}>{line}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 36, color: MUTED }}>
          {held !== null && <div style={{ display: "flex", fontSize: 30, marginBottom: 10 }}>{tooltext.beliefs.cardAsk}</div>}
          <div style={{ display: "flex" }}>{`${req.nextUrl.host}/quit/${addiction}/beliefs`}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, headers: { "Cache-Control": "public, max-age=86400" } },
  )
}
