"use client"

import Link from "next/link"
import { createContext, useContext, type ComponentProps } from "react"
import { ROUTES } from "@/src/shared/routes"

/**
 * WHERE THE LIBRARY LIVES FOR THE PAGE THAT IS DRAWING IT.
 *
 * `/plan` links to `/plan/role-models` and its people to `/plan/role-models/<id>`. On `/plan/new` (the copy space) the
 * same library is mounted under `/plan/new/role-models`, where every request is aimed at the copy space's own council,
 * so a link there must stay there. The default is the real library.
 */
export const RoleModelsHomeContext = createContext<string>(ROUTES.roleModels)

export const useRoleModelsHome = (): string => useContext(RoleModelsHomeContext)

/** The address of one person's profile, under the library the page is in. */
export function useRoleModelHref(): (id: string) => string {
  const home = useContext(RoleModelsHomeContext)
  return (id) => `${home}/${encodeURIComponent(id)}`
}

/**
 * A link to the library written with the real address (`href={ROUTES.roleModels}`), moved under the library the page
 * is in: the real one on `/plan`, the copy space's own on `/plan/new`.
 */
export function RoleModelsLink({ href, ...rest }: ComponentProps<typeof Link>) {
  const home = useContext(RoleModelsHomeContext)
  const to = typeof href === "string" && href.startsWith(ROUTES.roleModels) ? home + href.slice(ROUTES.roleModels.length) : href
  return <Link href={to} {...rest} />
}
