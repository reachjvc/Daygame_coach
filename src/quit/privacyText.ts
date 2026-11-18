import contact from "./data/contact.json"
import privacy from "./data/privacy.json"
import tooltext from "./data/tooltext.json"

export interface PrivacyItem {
  text?: string
  textKey?: string
  when?: "email" | "noEmail"
  factRef: string
}
export interface PrivacySection {
  id: string
  heading: string
  items: PrivacyItem[]
}

export const privacyDoc = privacy as { title: string; draftLine: string; sections: PrivacySection[] }
export const tooltextDoc = tooltext
export const privacyEmail = (contact as { privacyEmail: string | null }).privacyEmail

/** Items shown for this contact state, with the email slot filled. */
export function visibleItems(items: PrivacyItem[], email: string | null): { text: string; isAsk: boolean }[] {
  return items
    .filter((i) => !i.when || (i.when === "email") === (email !== null))
    .map((i) => {
      const raw = i.textKey ? (tooltext.privacy as Record<string, string>)[i.textKey] : i.text
      return { text: (raw ?? "").replace("{email}", email ?? ""), isAsk: i.textKey === "askThroughCoaching" }
    })
}
