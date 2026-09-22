"use client"

/**
 * The quit-a-vice module as it was before the Black Box took the front door.
 *
 * Kept, complete and working, at its own address. Nothing here was deleted:
 * the six flows, the learn spine, the shortlist and the seven tools all still
 * run off `quit-vice-v1`, which the Black Box neither reads nor writes. The
 * only change is that this screen is no longer what you land on, and nothing
 * links to it except one line at the foot of the new page.
 */

import { ViceHub } from "@/src/vice/components/ViceHub"

export default function QuitViceOldPage() {
  return <ViceHub />
}
