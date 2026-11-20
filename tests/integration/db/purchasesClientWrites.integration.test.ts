/**
 * A SIGNED-IN PERSON CANNOT WRITE THEMSELVES A PURCHASE.
 *
 * Until 20261120150000_purchases_no_client_insert.sql the policy "Users can
 * insert their own purchases" let any signed-in browser insert a paid-looking
 * row for itself, without paying. Purchases are written by the server with the
 * service role; a person may only read their own.
 */
import { describe, test, expect } from "vitest"
import { admin, newUser } from "@/tests/db/harness"

describe("purchases, from a signed-in browser", () => {
  test("an insert of one's own purchase is refused, and leaves no row", async () => {
    const me = await newUser("purchase-writer")
    const { error } = await me.client.from("purchases").insert({
      user_id: me.id,
      product_id: "lifetime",
      amount_cents: 0,
      status: "completed",
    })
    expect(error, "row security should refuse the insert").not.toBeNull()
    const { data } = await admin().from("purchases").select("id").eq("user_id", me.id)
    expect(data).toEqual([])
  })

  test("one's own purchase, written by the server, can still be read", async () => {
    const me = await newUser("purchase-reader")
    const { error: seeded } = await admin()
      .from("purchases")
      .insert({ user_id: me.id, product_id: "lifetime", amount_cents: 100, status: "completed" })
    expect(seeded).toBeNull()
    const { data, error } = await me.client.from("purchases").select("product_id").eq("user_id", me.id)
    expect(error).toBeNull()
    expect(data).toEqual([{ product_id: "lifetime" }])
  })
})
