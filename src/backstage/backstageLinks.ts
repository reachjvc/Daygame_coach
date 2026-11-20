/**
 * BACKSTAGE: EVERY LIVE-BUT-HIDDEN PART OF THE SITE, IN ONE LIST.
 *
 * The owner asked (2026-11-20) for one page only his account opens, so he stops hunting for
 * tools that work on the live site but that no menu shows. The quit rows are worked out from
 * the quit data (what is not live yet), so a tool or addiction that goes live drops off by
 * itself and a new hidden one shows up without editing this file.
 *
 * A new hidden page elsewhere (a flag, a preview address) belongs in SECTIONS below.
 */
import { ROUTES } from "@/src/shared/routes"
import { isLive } from "@/src/quit/data"
import { isLiveTool, menu, toolName, viewableIds } from "@/src/quit/menu"

export interface BackstageLink {
  id: string
  label: string
  note: string
  href: string
}

export interface BackstageSection {
  id: string
  title: string
  links: BackstageLink[]
}

const QUIT_LIVE_DEMO = "nicotine"

export function backstageSections(): BackstageSection[] {
  const hiddenAddictions = viewableIds(true).filter((id) => !isLive(id))
  const hiddenTools = menu.groups.flatMap((g) => g.tools).filter((t) => !isLiveTool(t.id) && t.id !== "coach")

  return [
    {
      id: "plan",
      title: "Plan (on a copy of your plan)",
      links: [
        { id: "plan-new", label: "New version of the plan", note: "The plan in short screens, with the version switcher. Your real plan is not touched.", href: ROUTES.planNew },
        { id: "plan-sandbox", label: "Today's plan, on the copy", note: "Exactly today's /plan pages, run on the copy. Use it to compare with the new version.", href: ROUTES.planSandbox },
        { id: "plan-new-role-models", label: "Role models, on the copy", note: "The role model library tied to the copy's council.", href: ROUTES.planNewRoleModels },
      ],
    },
    {
      id: "quit",
      title: "Quit tools not open to everyone yet",
      links: [
        ...hiddenAddictions.map((id) => ({
          id: `quit-${id}`,
          label: menu.addictions[id].title,
          note: "Menu for an addiction that is not live yet.",
          href: `/quit/${id}?preview=1`,
        })),
        ...hiddenTools.map((t) => ({
          id: `quit-tool-${t.id}`,
          label: toolName(t, QUIT_LIVE_DEMO),
          note: "A tool that is not live yet (it may show a Coming soon screen).",
          href: `/quit/${QUIT_LIVE_DEMO}/${t.id}?preview=1`,
        })),
        { id: "quit-coaching", label: "Quit coaching offer", note: "The paid coaching page, not live yet.", href: `/quit/coaching?preview=1&a=${QUIT_LIVE_DEMO}` },
        { id: "quit-lab", label: "Quit tools lab", note: "Every design variant of the quit tools, side by side.", href: "/quit/lab?preview=1" },
      ],
    },
    {
      id: "other",
      title: "Other",
      links: [
        { id: "ai-usage", label: "AI usage and cost", note: "Needs the admin key to show numbers.", href: "/admin/ai-usage" },
        { id: "articles", label: "Articles", note: "Empty for now; taken off the menus.", href: ROUTES.articles },
      ],
    },
  ]
}
