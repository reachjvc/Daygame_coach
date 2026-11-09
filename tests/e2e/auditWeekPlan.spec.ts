import { test, expect } from "./fixtures/test";
import { randomUUID } from "node:crypto";
import { stackAdmin } from "./fixtures/stack";
import { ROUTES } from "@/src/shared/routes";

/**
 * THE REVIEW AND THE PERFECT WEEK, after the alpha testers' findings
 * F14-F18 (picky-eye-05/06/07, fast-review-03/04/05/06/11):
 * - a box never uses the name of a choice, and the top box pre-fills "Do more",
 *   so the week starts from what the boxes show;
 * - an activity's card says how many of its hours were marked avoiding;
 * - best hours come from growth answers only, low hours are named for admin,
 *   and Martell's step 4 is in the checklist;
 * - a block's kind is picked, never assumed, it can go on several days in one
 *   save, and a new From moves To along with it.
 */

const QUARTER = 15 * 60_000;

// The hours below are UTC clock hours.
test.use({ accountTimezone: "UTC" });
const START = Date.parse("2026-11-02T10:00:00Z");

async function seed(userId: string): Promise<string> {
  const admin = stackAdmin();
  expect(
    (await admin.from("audit_runs").delete().eq("user_id", userId)).error,
  ).toBeNull();
  const id = randomUUID();
  expect(
    (
      await admin.from("audit_runs").insert({
        id,
        user_id: userId,
        started_at: new Date(START).toISOString(),
        ends_at: new Date(START + 14 * 86400_000).toISOString(),
        ended_at: new Date(START + 4 * 3600_000).toISOString(),
        quiet_start: 0,
        quiet_end: 0,
      })
    ).error,
  ).toBeNull();
  // 10:00 UTC work (builds), 11:00 a series (fun, builds nothing), 12:00 admin (low), 13:00 scrolling while avoiding.
  const hours: [string, number, number, boolean][] = [
    ["Coding the app", 5, 6, false],
    ["Series", 7, 2, false],
    ["Admin", 2, 4, false],
    ["Scrolling", 2, 1, true],
  ];
  const rows = hours.flatMap(([activity, energy, growth, avoiding], h) =>
    [0, 1, 2, 3].map((q) => ({
      id: randomUUID(),
      user_id: userId,
      run_id: id,
      slot_at: new Date(START + (h * 4 + q) * QUARTER).toISOString(),
      activity,
      energy,
      growth,
      avoiding: avoiding && q < 2,
      source: "app",
    })),
  );
  expect((await admin.from("audit_slots").insert(rows)).error).toBeNull();
  return id;
}

async function storedWeek(
  runId: string,
): Promise<
  { day: number; start: number; end: number; what: string; kind: string }[]
> {
  const r = await stackAdmin()
    .from("audit_runs")
    .select("review")
    .eq("id", runId)
    .single();
  expect(r.error).toBeNull();
  return r.data!.review?.week ?? [];
}

test.describe("review and perfect week after the alpha findings @phone", () => {
  test("the review: boxes are not choices, Do more is pre-filled into the week, avoiding hours show, best and low hours follow Martell", async ({
    page,
    account,
  }) => {
    await seed(account.id);
    await page.goto(`${ROUTES.audit}?view=review`);
    const row = page
      .getByTestId("review-activity")
      .filter({ hasText: "Coding the app" });
    await expect(row).toBeVisible({ timeout: 60_000 });

    // One meaning per word: the box describes, the pill is the (pre-filled) choice.
    await expect(page.getByTestId("review-box-more")).toContainText(
      "Lifts you and builds your life",
    );
    await expect(page.getByTestId("review-box-more")).not.toContainText(
      "Do more",
    );
    await expect(page.getByTestId("review-box-cut")).not.toContainText("Cut");
    await expect(row).toContainText("Do more");

    const week = page.getByTestId("perfect-week");
    await expect(week.getByTestId("week-inputs")).toContainText(
      "Do more: Coding the app",
    );
    await expect(week.getByTestId("week-best-hours")).toHaveText(
      "Best hours, for your hardest work: 10:00.",
    );
    await expect(week.getByTestId("week-low-hours")).toHaveText(
      "Low hours, for admin and calls: 12:00 and 13:00.",
    );
    await week.getByText("Martell's steps").click();
    await expect(week.locator("ol > li")).toHaveCount(7);
    await expect(week.locator("ol > li").nth(3)).toContainText(
      "Cut bleed time",
    );

    // The pre-filled choice in the card: changing it takes it out of the week.
    await row.click();
    const sheet = page.getByTestId("review-activity-sheet");
    await expect(sheet.getByRole("radio", { name: "Do more" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(sheet.getByTestId("review-prefilled")).toBeVisible();
    await sheet.getByRole("radio", { name: "Keep" }).click();
    await sheet.getByTestId("review-save").click();
    await expect(sheet.getByTestId("review-saved")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(week.getByTestId("week-inputs")).toContainText(
      'No activity is set to "Do more" yet',
    );

    // Avoiding hours on the card.
    await page
      .getByTestId("review-activity")
      .filter({ hasText: "Scrolling" })
      .click();
    await expect(sheet.getByTestId("review-avoiding")).toHaveText(
      'Marked "avoiding something": 0.5 hours of its 1 hour.',
    );
    await expect(sheet.getByRole("radio", { name: "Do more" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  test("a week block: its kind is picked, it goes on several days in one save, and From moves To along", async ({
    page,
    account,
  }) => {
    const id = await seed(account.id);
    await page.goto(`${ROUTES.audit}?view=review`);
    const week = page.getByTestId("perfect-week");
    await expect(week.getByTestId("week-add-0")).toBeVisible({
      timeout: 60_000,
    });

    await week.getByTestId("week-add-0").click();
    const sheet = page.getByTestId("week-block-sheet");
    await sheet.getByTestId("week-what").fill("Gym");
    // No kind until one is picked.
    await expect(sheet.getByRole("radio", { checked: true })).toHaveCount(0);
    await sheet.getByTestId("week-save").click();
    await expect(sheet.getByTestId("week-error")).toHaveText(
      "Not saved: Pick a kind.",
    );
    await sheet.getByRole("radio", { name: "Workout or hobby" }).click();

    // From 17:00 moves To from 10:00 to 18:00, keeping the hour.
    await sheet.getByTestId("week-start").selectOption("1020");
    await expect(sheet.getByTestId("week-end")).toHaveValue("1080");

    await sheet.getByTestId("week-day-pick-2").click();
    await sheet.getByTestId("week-day-pick-4").click();
    await expect(sheet.getByTestId("week-save")).toHaveText("Save on 3 days");
    await sheet.getByTestId("week-save").click();
    await expect(sheet).toBeHidden();
    for (const day of [0, 2, 4])
      await expect(
        week.getByTestId(`week-day-${day}`).getByTestId("week-block"),
      ).toContainText("17:00–18:00");
    expect(
      (await storedWeek(id)).map((b) => [
        b.day,
        b.start,
        b.end,
        b.what,
        b.kind,
      ]),
    ).toEqual([
      [0, 1020, 1080, "Gym", "workout"],
      [2, 1020, 1080, "Gym", "workout"],
      [4, 1020, 1080, "Gym", "workout"],
    ]);
    await expect(week.getByTestId("week-totals")).toHaveText(
      "In the week: Workout or hobby 3 h",
    );

    // A name already in the week brings its kind.
    await week.getByTestId("week-add-1").click();
    await sheet.getByTestId("week-what").fill("gym");
    await expect(
      sheet.getByRole("radio", { name: "Workout or hobby" }),
    ).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    // Moving one: open Wednesday's, From 18:00, Save. Two taps past opening it.
    await week.getByTestId("week-day-2").getByTestId("week-block").click();
    await sheet.getByTestId("week-start").selectOption("1080");
    await expect(sheet.getByTestId("week-end")).toHaveValue("1140");
    await sheet.getByTestId("week-save").click();
    await expect(sheet).toBeHidden();
    await expect(
      week.getByTestId("week-day-2").getByTestId("week-block"),
    ).toContainText("18:00–19:00");

    await page.reload();
    await page.getByTestId("audit-past-row").first().click();
    await expect(
      week.getByTestId("week-day-2").getByTestId("week-block"),
    ).toContainText("18:00–19:00", { timeout: 60_000 });
    await expect(
      week.getByTestId("week-day-0").getByTestId("week-block"),
    ).toContainText("17:00–18:00");
  });
});
