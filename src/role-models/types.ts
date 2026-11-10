import type { z } from "zod"

import type { personSchema, sourceSchema, valueSchema } from "./schema"

export type RoleModelPerson = z.infer<typeof personSchema>
export type RoleModelSource = z.infer<typeof sourceSchema>
export type RoleModelValue = z.infer<typeof valueSchema>
export type RoleModelStatus = RoleModelPerson["review"]["status"]
