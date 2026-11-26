# Addiction one-pagers: the research behind the quit tools

Source data and rules for the quit tools. Status and decisions: `Plans/quit-finish.md`.
Content rules (every owner note as a numbered rule): `RULEBOOK.md`.

## What is live

- `08-v3/`: the data the quit tools are built from. `kinds.json` (21 number kinds), `pages/<id>.json` (one per
  addiction), `general.json`, `decisions.json`, `replies.json`, `felt/` (felt-difficulty curves: counts and scores
  only). `scripts/quit/import-v3.mjs` turns `pages/` into `src/quit/data/<id>.json`.
- `board/build_v3.py`: refuses to build when a machine-checkable RULEBOOK rule is broken. `import-v3.mjs` reads it
  and `src/quit/validate.ts` copies its checks. Also live: `board/finalize_v3.py`, `check_privacy.py`,
  `check_render_v3.mjs`.
- Rebuild: `python3 board/finalize_v3.py`, then `python3 board/build_v3.py <out.html> <belief-test-url>`.

## Reference only

- `01-05`: the November source-checked research (31 pages, 382 sources). It still backs the `refs` in `08-v3/`;
  `build_v3.py` reads 01-04 only for the safety level. Their schema is in git history.
- `06-template.json`, `07-mirror-stats/`, `community/`, and in `board/` the old board and template pages
  (`board.json`, `build.py`, `build_template.py`, `template*.html`, `one-pager-v3.html`, `merge_rev_v3.py`):
  earlier rounds, read by nothing live.

## Private and history

- The forum posts behind `felt/` stay on his PC: `~/.cache/daygame-research/one-pagers-v2/felt/` (Arctic Shift
  archive, fixed days 2021-2025). Private rule appendix: `~/.cache/daygame-research/one-pagers-v2/rulebook-private.md`.
- Rounds 1-8 and the old schema: `git show 77e121f4:docs/research/addiction-one-pagers/README.md`;
  `git show 18efdb10:docs/research/addiction-one-pagers/08-v3/SCHEMA.md`.
