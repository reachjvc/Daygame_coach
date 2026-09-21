---
paths:
  - "src/**"
  - "app/**"
  - "components/**"
---

# What is actually live

Read `docs/product/map.md` before describing what this app does, and before
assuming a slice you are editing is reachable by a user.

**And check the map's line about the slice you are in.** Nothing tests whether
those sentences are still true — the test only checks that each slice is
*named*. On 2026-09-19 the `health/` entry said "screens are test-only" while a
user could see weight and sleep on the live tracking dashboard; it had been
wrong for an unknown length of time because nobody who edited that slice ever
read its line. If you are in the slice, you are the only one who will notice.

The three that catch people out: `/test/*` 404s in production by design, so
finding something there means it is **not** in the product; `health/` and
`exercising/` have no live page at all; and `goals/` is over 100k lines of which
only Life Mastery is live. Having code is not being reachable.
