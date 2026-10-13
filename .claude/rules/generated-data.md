---
paths:
  - "src/*/data/**"
  - "scripts/training-data/**"
  - "data/**"
  - "docs/research/**"
---

# Bulk-generated data

- Read the generated records themselves, not a count or preview.
- Filter on the content, never on handles, filenames or truncated previews.
- Check boundary cases (largest, last, oddly named file) before assuming a mapping holds.
- Assert on meaning, not shape. Pattern: `tests/unit/vice/testimonials.test.ts`.
