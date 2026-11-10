import { ROUTES } from "@/src/shared/routes"

/** The gallery's address, and each profile's. */
export const ROLE_MODELS_HREF = ROUTES.roleModels

export const roleModelHref = (id: string): string => `${ROUTES.roleModels}/${encodeURIComponent(id)}`
