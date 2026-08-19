/**
 * Template-id namespaces that deliberately live outside `GOAL_TEMPLATE_MAP`.
 *
 * `template_id` started as a pointer into the goalGraph registry, and the goals
 * hub sweeps up any goal pointing at a template that no longer exists — see
 * `getOrphanedGoalIds` and the auto-archive in `GET /api/goals/tree`. That
 * sweep is right for a catalogue goal whose template was deleted and lethal for
 * anything else that ever put a value in that column: on the first render of
 * the hub, the whole plan is archived and the page it came from shows an empty
 * list with no error anywhere.
 *
 * So a namespace is either in the registry or it is declared here. Two are:
 *
 *   `fw:` — the new-goals framework plan, validated and persisted through
 *           `/api/goals/plan` rather than the registry.
 *   `ns:` — goals pushed from the North Star flow's track step, tagged
 *           `ns:<run>:<plan goal id>` so a second push is idempotent.
 *
 * Kept in its own module with no imports so both the producer and the sweep can
 * read the same list without either importing the other.
 */
export const NON_REGISTRY_TEMPLATE_PREFIXES = ["fw:", "ns:"] as const

/** Whether a template id belongs to a namespace the registry never held. */
export function isNonRegistryTemplateId(templateId: string): boolean {
  return NON_REGISTRY_TEMPLATE_PREFIXES.some((prefix) => templateId.startsWith(prefix))
}
