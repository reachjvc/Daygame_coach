import { ImageResponse } from "next/og"
import { BrandMark } from "@/components/BrandMark"
import type { NextRequest } from "next/server"
import { getAddiction } from "@/src/quit/data"
import { frame, isFlag, isViewable } from "@/src/quit/menu"
import { parseHeld } from "@/src/quit/tools/beliefs/logic"
import { usable } from "@/src/quit/tools/common"
import { fill, tooltext } from "@/src/quit/tooltext"
import type { QuitBelief } from "@/src/quit/types"

/** The share image of the lies test: the count only, nothing about the reader. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ addiction: string }> }) {
  const { addiction } = await params
  const preview = isFlag(req.nextUrl.searchParams.getAll("preview"))
  if (!isViewable(addiction, preview)) return new Response(null, { status: 404 })
  const held = parseHeld(req.nextUrl.searchParams.get("held"))
  if (held === null) return new Response(null, { status: 400 })
  const data = getAddiction(addiction)
  if (!data) return new Response(null, { status: 404 })
  const total = usable<QuitBelief[]>(data.beliefs)?.length ?? 12
  const line = fill(tooltext.beliefs.shareText, { n: held, total, name: data.name })

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
        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 40, color: "#a1a1aa" }}>
          <BrandMark size={72} className="" />
          {frame.siteName}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 360, fontWeight: 700, lineHeight: 1 }}>{held}</div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.15, marginTop: 30 }}>{line}</div>
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "#a1a1aa" }}>{`/quit/${addiction}/beliefs`}</div>
      </div>
    ),
    { width: 1080, height: 1350, headers: { "Cache-Control": "public, max-age=86400" } },
  )
}
