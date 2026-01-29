# Vertical Slice: Articles & Research
**Status:** Reference
**Updated:** 29-01-2026 (Danish time)

## Changelog
- 29-01-2026 11:00 - Added iterative refinement workflow and feedback types
- 29-01-2026 08:10 - Added writing guidelines

## Slice Purpose

Provides a knowledge library of research-backed articles covering performance psychology, self-improvement, and social dynamics. The content is designed to add value whether users subscribe to the app or not.

This slice serves the **SEO and content marketing** goals of the platform.

---

## UI Page

**Path:** `app/dashboard/articles/page.tsx`

The UI displays:
1. Content pillars overview (4 pillars from universal to narrow)
2. Article tier types (flagship, standard, quick)
3. Expected content formats
4. Article listing (when content is available)

---

## Content Pillars

| Pillar | Name | Breadth | Description |
|--------|------|---------|-------------|
| learning | Learning from Experience | Universal | AARs, sports debriefs, poker mindset, journaling |
| inner-game | Inner Game & Masculinity | Broad | Confidence, values, identity, fear |
| action | Taking Action IRL | Medium | Cold approach, conversation, reading signals |
| tactics | Daygame Tactics | Narrow | Openers, text game, field reports, stats |

---

## Article Tiers

| Tier | Name | Production Time | Volume Target |
|------|------|-----------------|---------------|
| flagship | Flagship | 10-20 hrs (personal) | 1-2/month |
| standard | Standard | 1-2 hrs (AI + edit) | 4-8/month |
| quick | Quick Read | 15-30 min | 10-20/month |

---

## Writing Guidelines

[TO BE REFINED] Don't stop at the first satisfying conclusion. Push ideas one level further than expected - whether that's applying a principle recursively, drawing analogies from unexpected domains, or following a thought to its uncomfortable logical extreme. AI writing tends to land on the obvious; human writing overshoots it.

---

## Types

**File:** `src/articles/types.ts`

```typescript
export type ArticleTier = "flagship" | "standard" | "quick"
export type ArticlePillar = "learning" | "inner-game" | "action" | "tactics"
export type ArticleStatus = "draft" | "published" | "archived"

export interface Article {
  id: string
  slug: string
  title: string
  description: string
  content: string
  tier: ArticleTier
  pillar: ArticlePillar
  status: ArticleStatus
  readTimeMinutes: number
  isPremium: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  metadata: ArticleMetadata
}

export interface ArticleMetadata {
  keywords: string[]
  author: string
  featuredImage?: string
  relatedArticleIds?: string[]
}

export interface ContentPillar {
  id: ArticlePillar
  name: string
  description: string
  breadth: "universal" | "broad" | "medium" | "narrow"
  icon: string
}
```

---

## Config

**File:** `src/articles/config.ts`

Contains:
- `CONTENT_PILLARS` - Array of pillar definitions
- `ARTICLE_TIERS` - Tier metadata
- `SCALABLE_FORMATS` - Content format examples
- `ARTICLES_CONFIG` - Display configuration

---

## Security Requirements

### Authentication
- Logged-in users can access the articles list page
- Return 401 redirect to login if not authenticated

### Content Gating (Future)
- `isPremium: false` articles are freely accessible
- `isPremium: true` articles require subscription
- Email capture may be required for some free content

---

## Files in This Slice

```
src/articles/
├── types.ts              # TypeScript types
├── config.ts             # Configuration
├── index.ts              # Public exports
└── components/
    └── ArticlesPage.tsx  # UI component

app/dashboard/articles/
└── page.tsx              # Next.js page
```

---

## Future Development

### Phase 1: Infrastructure (Current)
- [x] Slice structure created
- [x] Navigation added
- [x] Dashboard section added
- [ ] Database schema for articles
- [ ] API endpoints for article CRUD

### Phase 2: Content Production
- [ ] Admin interface for article creation
- [ ] Markdown editor with preview
- [ ] AI-assisted drafting workflow
- [ ] Image upload and management

### Phase 3: Public Access
- [ ] Public article routes (SEO)
- [ ] Email capture for gated content
- [ ] Related articles recommendations
- [ ] Search functionality

---

## Iterative Refinement Workflow

Articles are refined through an iterative feedback loop. AI must understand this process to work effectively on article tasks.

### File Structure

```
docs/articles/{articleId}/
├── draft1.md       # Initial AI-generated draft
├── feedback1.md    # Human feedback on draft1
├── draft2.md       # Revised draft incorporating feedback1
├── feedback2.md    # Human feedback on draft2
├── ...             # Continue until publishable
└── learnings.md    # Accumulated insights from EXCELLENT sections
```

### Feedback Types

When reviewing a draft, the user marks sections with these feedback types:

| Type | Meaning | AI Action |
|------|---------|-----------|
| **Excellent** | This works perfectly - extract WHY it works | Preserve exactly. Add to learnings.md. Study the pattern. |
| **Good** | Keep as-is | No changes needed |
| **Almost** | Close, minor tweaks needed | Small adjustments only |
| **Angle** | Wrong direction from this point | Rewrite this section AND everything after it |
| **AI** | Too obviously AI-written | Complete rewrite with different approach |
| **Note** | Custom comment | Follow the specific instruction |

### The Loop

1. **Draft N** → AI generates based on research + prior learnings
2. **Review** → Human marks sections with feedback types
3. **Feedback N** → Saved with version number
4. **Draft N+1** → AI incorporates feedback:
   - Keep EXCELLENT and Good sections untouched
   - Tweak Almost sections
   - Rewrite AI sections completely (different angle)
   - Rewrite from Angle point onwards
   - Apply learnings from learnings.md to avoid past mistakes

### For AI: Working on Articles

When asked to draft or revise an article:

1. **Check for existing files** in `docs/articles/{articleId}/`
2. **Read learnings.md** if it exists - these are patterns that work
3. **Read the latest feedback** to understand what needs to change
4. **Preserve what's marked Good/Excellent** - don't touch these
5. **Apply Writing Guidelines** (see above) to new content
6. **Reference research** from FIELD_REPORT_RESEARCH_PLAN.md or other sources

The goal is convergence: each draft should be measurably better than the last, with fewer sections marked AI/Angle and more marked Good/Excellent.

---

## Related Documentation

- [SEO.md](../brainstorm/SEO.md) - Content strategy and production approach
- [FIELD_REPORT_RESEARCH_PLAN.md](../brainstorm/FIELD_REPORT_RESEARCH_PLAN.md) - Research on learning from experience
