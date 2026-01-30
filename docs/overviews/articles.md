# Articles System Overview

**Status:** Active
**Updated:** 29-01-2026 21:20

## Changelog
- 29-01-2026 21:20 - Initial creation

---

## Architecture

```
src/articles/
├── types.ts              # All type definitions
├── config.ts             # Constants (page sizes, scalable formats)
├── articlesService.ts    # AI content generation (Claude)
├── index.ts              # Public exports
└── components/
    └── ArticlesPage.tsx  # Public dashboard display

docs/articles/
├── INDEX.md              # Philosophy & brainstorm
├── writing_style.md      # Tone/style guide
└── {article-id}/         # One folder per article
    ├── manifest.json     # Metadata & section structure
    ├── draft1.md         # Versioned drafts
    ├── draft2.md
    ├── feedback1.json    # Machine-readable feedback
    ├── feedback1.md      # Human-readable feedback
    └── learnings.md      # Extracted "excellent" sections

app/api/
├── articles/alternatives/route.ts  # Generate AI alternatives
└── test/
    ├── articles/route.ts           # List/fetch articles
    ├── generate-draft/route.ts     # AI-revise draft from feedback
    ├── save-feedback/route.ts      # Save feedback files
    └── pending-draft/route.ts      # Queue for Claude processing
```

**Output:** 3 alternatives using different rhetorical strategies: [note to self: not sure to keep? maybe expand, or write .md for humans, and commands for AI based on human logic]
- Research claims
- Domain analogies
- Concrete scenes
- Provocative claims
- Question hooks

**Workflow:**
1. Select article and draft version
2. Read section, right-click to add feedback
3. Accumulate flags in sidebar
4. Save feedback (keeps current draft)
5. Export & Draft (AI generates next version)
6. Load new draft, repeat


SCALABLE_FORMATS = [
  "Research Summaries",
  "Framework Breakdowns",
  "Quote Compilations",
  "Comparison Posts",
  "How-to Guides",
  "Checklists/Templates"
]
```

## Current Articles [should be in index]

| ID | Title | Status |
|----|-------|--------|
| 01-8020-rule | The 80/20 Rule for Learning | Draft 2 |
| 02-reflection-vs-rumination | Reflection vs Rumination | Draft |
| 03-elite-athlete-debriefs | Elite Athlete Debriefs | Draft |
| 04-military-aar | Military AAR | Draft |
| 05-building-confidence | Building Confidence | Draft |
| 06-habit-science | Habit Science | Draft |

