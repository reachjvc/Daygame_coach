import { ImageResponse } from "next/og"
import { BrandMark } from "@/components/BrandMark"
import { BRAND } from "@/src/shared/brand"

/** The picture a pasted link to the site shows (1200x630): the mark, the name, W1. */
export const alt = BRAND.name
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "rgb(18, 18, 18)",
          color: "rgb(245, 245, 245)",
          padding: "0 90px",
          gap: 70,
        }}
      >
        <BrandMark size={300} className="" />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 800, lineHeight: 1.05 }}>{BRAND.name}</div>
          <div style={{ display: "flex", fontSize: 34, lineHeight: 1.35, color: "rgb(161, 161, 170)", marginTop: 28 }}>
            {BRAND.description}
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
