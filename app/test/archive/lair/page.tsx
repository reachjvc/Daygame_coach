import { LairPage } from "@/src/lair"

/**
 * THE ARCHIVED LAIR, still working.
 *
 * It was /lair — a configurable board of widgets, including Mission Control,
 * which was its own goals surface. It is here rather than deleted because it is
 * one of several surfaces built for the same job, and the point of keeping it is
 * to look at what was better about it before it goes for good.
 *
 * IT IS NOT A MOCK. Same page, same widgets, same real data: the board still
 * saves through /api/lair and Mission Control still reads and writes real goals.
 *
 * Its widget registry is untouched on purpose. Retiring Mission Control on its
 * own would have meant migrating every saved layout — `validateLayout` rejects a
 * whole layout containing a widget id it does not know, so anyone whose board
 * still listed it could not have saved any change to their Lair again. Moving
 * the page instead leaves every saved board valid.
 */
export default LairPage
