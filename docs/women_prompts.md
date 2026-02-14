# Archetype Image Generation Guide

## What We Have

**40 Scandinavian images** — 10 archetypes x 4 age groups (18, 25, 30, 37), stored in `public/archetypes/{age}/{archetype}.jpg`. These cover the "Nordic/Slavic" image set.

The code that serves them is in `src/profile/data/archetypes.ts`. Currently `getArchetypes(ageRange)` only uses age to pick images. It needs to be extended to also accept region.

## Prompt Formula That Works

Generated via ChatGPT image generation. This format consistently produced great results:

```
{archetype-name} — age {age}
Portrait photo of a beautiful {age}-year-old {ethnicity} woman, {hair description}, {clothing/accessories}, {setting/environment}, {expression}, {lighting}, shallow depth of field, photorealistic, 1:1
```

### Best Example (user's favorite)

> academic-intellectual — age 25
> Portrait photo of a beautiful 25-year-old Scandinavian woman, light brown hair in a loose low bun, thin gold-rimmed glasses, wearing an oatmeal turtleneck sweater, holding a coffee cup, sitting in a bright minimalist university cafe with bookshelves in background, thoughtful half-smile, warm natural light, shallow depth of field, photorealistic, 1:1

### Why It Works
- **Specific hair**: "light brown hair in a loose low bun" — not generic
- **Archetype-signaling clothing**: "oatmeal turtleneck" + "gold-rimmed glasses" = intellectual
- **Archetype-signaling setting**: "university cafe with bookshelves" — not just "indoors"
- **Specific prop**: "holding a coffee cup" — adds naturalism
- **Named expression**: "thoughtful half-smile" — not just "smiling"
- **Named lighting**: "warm natural light" — not just "good lighting"
- **Always ends with**: `shallow depth of field, photorealistic, 1:1`

## More Examples That Worked Well

### fashion-scenester — age 37
> Portrait photo of a beautiful 37-year-old Scandinavian woman, caramel blonde hair styled in soft waves, wearing a tailored camel coat over a black turtleneck, gold statement earrings, leather gloves in hand, standing outside a luxury boutique entrance, composed confident expression, overcast Scandinavian light, shallow depth of field, photorealistic, 1:1

### bohemian-alt — age 37
> Portrait photo of a beautiful 37-year-old Scandinavian woman, long sandy blonde hair with natural waves, small silver hoop earrings, wearing an olive green oversized knit cardigan over a white v-neck, turquoise pendant necklace, sitting in a cozy artisan studio with plants and pottery visible, warm thoughtful expression, soft natural light, shallow depth of field, photorealistic, 1:1

### social-connector — age 37
> Portrait photo of a beautiful 37-year-old Scandinavian woman, styled blonde hair with volume, wearing an elegant emerald green silk blouse, gold link bracelet, pearl stud earrings, at an upscale dinner event with soft candlelight bokeh in background, warm confident smile, golden ambient lighting, shallow depth of field, photorealistic, 1:1

### guarded-realist — age 37
> Portrait photo of a beautiful 37-year-old Scandinavian woman, straight ash blonde hair at collar length, wearing a black turtleneck with a simple gold bar necklace, small gold hoop earrings, seated at a clean white marble cafe counter with a coffee, composed expression looking slightly past camera, cool overcast Scandinavian light, shallow depth of field, photorealistic, 1:1

## The 10 Archetypes

Each has a distinct visual language. These signals should stay consistent across ALL regions — only skin/hair/features change.

| Archetype | Clothing Signals | Setting Signals | Expression |
|-----------|-----------------|-----------------|------------|
| corporate-powerhouse | Navy/black blazer, diamond/pearl studs, pendant necklace | Office, glass building, corporate | Confident smile or composed |
| ethereal-creative | Artsy layers, statement rings, bohemian-adjacent but refined | Gallery, studio, warm cafe | Dreamy, slightly detached |
| disciplined-athlete | Athletic wear (running jacket, sports top), ponytail, smartwatch | Gym, park, running track | Direct, confident, energetic |
| academic-intellectual | Glasses, turtleneck/cable knit, books | Library, university cafe, home study | Thoughtful, half-smile |
| fashion-scenester | Designer accessories, silk scarf, statement earrings, watch | Shopping street, boutique, city | Confident, trend-aware |
| bohemian-alt | Linen/wrap dress, layered necklaces, nose ring okay, earthy colors | Market, outdoor cafe, artisan studio | Warm, relaxed, genuine |
| modern-traditionalist | Cashmere, pearls, modest/elegant, soft pink/cream palette | Elegant home, restaurant, garden | Graceful, warm, reserved |
| urban-nomad | Linen shirt/blazer, backpack or crossbody bag, minimal jewelry | European street, piazza, cobblestone | Carefree, open, laughing |
| guarded-realist | Minimal — black/charcoal, simple gold, understated | Minimalist apartment, marble cafe | Measured, slightly guarded, composed |
| social-connector | Colorful clothing, hoops/statement jewelry, warm palette | Brunch spot, wine bar, dinner event | Big smile, animated, warm |

## Age Progression Rules

As age increases, the same archetype gets more refined:

- **18**: Fresh, youthful, minimal makeup, more casual versions of archetype signals
- **25**: Young professional, natural beauty, archetype signals clear but not over-the-top
- **30**: Established, confident, polished. Upgraded materials (linen > cotton, silk > polyester)
- **37**: Peak refinement. Expensive/quality clothing, elegant settings, sophisticated

Example progression for **urban-nomad**:
- 18: White linen shirt, canvas backpack, European piazza, laughing
- 25: Linen top, backpack, city street, windswept
- 30: Same casual vibe, slightly more polished
- 37: Linen blazer (not shirt), leather crossbody (not backpack), cobblestone side street

## 8 Image Sets Needed

Each set = 40 images (10 archetypes x 4 ages).

| # | Image Set | Ethnicity descriptor | Regions covered | Hair/feature notes |
|---|-----------|---------------------|-----------------|-------------------|
| 1 | **Nordic/Slavic** | "Scandinavian" | Scandinavia, Slavic Europe, Eastern Europe | DONE. Blonde to light brown, blue/green/grey eyes, light skin |
| 2 | **Western European** | "Western European" | Western Europe, North America, Australia/Oceania | Broader mix — brunette common, lighter skin, brown or blue eyes. Think UK/French/German |
| 3 | **Mediterranean** | "Mediterranean" | Southern Europe | Olive skin, dark brown/black hair, brown eyes, warm features. Think Italian/Spanish/Greek |
| 4 | **Latin American** | "Latin American" | Latin America | Tan/olive, dark hair, mix of European and Indigenous features. Think Colombian/Brazilian/Argentine |
| 5 | **East Asian** | "East Asian" | East Asia | Chinese/Japanese/Korean features. Straight black hair common, lighter skin |
| 6 | **Southeast Asian** | "Southeast Asian" | Southeast Asia | Warmer skin tone, dark hair, rounder features. Think Thai/Filipino/Vietnamese |
| 7 | **South Asian** | "South Asian" | South Asia | Medium to dark brown skin, dark hair, dark eyes. Think Indian/Pakistani |
| 8 | **African** | "African" | Africa | Dark skin, diverse features, dark hair. Sub-Saharan look (North Africa closer to Mediterranean) |

## Folder Structure

Current: `public/archetypes/{age}/{archetype}.jpg`

New: `public/archetypes/{region}/{age}/{archetype}.jpg`

Example:
```
public/archetypes/scandinavian/18/corporate-powerhouse.jpg   (move existing)
public/archetypes/western-european/18/corporate-powerhouse.jpg
public/archetypes/mediterranean/18/corporate-powerhouse.jpg
...etc
```

The `archetypes.ts` code needs updating to accept `(ageRange, region)` instead of just `(ageRange)`.

## ChatGPT Generation Workflow

### Prompt template for a batch

Give ChatGPT all 15 (or 40) at once in this format:

```
I need you to generate {N} AI portrait photos one at a time.
After each image, I'll say "next" and you generate the next one.

GLOBAL STYLE (apply to ALL images):
- Photorealistic portrait photo, square 1:1 aspect ratio
- Beautiful {ethnicity} woman
- Head-and-shoulders to upper-body framing
- Shallow depth of field, soft bokeh background
- Natural or soft lighting
- No text, no watermarks, no logos

AGE GUIDE:
- Age 18 = youthful, fresh-faced, minimal makeup
- Age 25 = young professional, natural beauty
- Age 30 = established, confident, polished
- Age 37 = refined, mature elegance (still very attractive, just more sophisticated)

Here is the queue. Start with #1.

#1 — {archetype} — age {age}
{full prompt}

#2 — {archetype} — age {age}
{full prompt}

...
```

### Key lessons from Scandinavian batch
- ChatGPT sometimes generates 4 at once in a batch, sometimes one at a time
- It may skip some or generate duplicates — always count outputs and re-prompt for missing
- ChatGPT exports as PNG — convert to JPG with `sharp` (quality 90) before placing
- File naming from ChatGPT is timestamp-based — visual matching is needed to place them

### Converting and placing images

```bash
node -e "
const sharp = require('sharp');
const mappings = [
  { src: 'public/new_folder/chatgpt-image.png', dst: 'public/archetypes/{region}/{age}/{archetype}.jpg' },
  // ...more mappings
];
(async () => {
  for (const m of mappings) {
    await sharp(m.src).jpeg({ quality: 90 }).toFile(m.dst);
    console.log('OK: ' + m.dst);
  }
})();
"
```

## Task Estimate

- 7 remaining sets x 40 images each = **280 images**
- ChatGPT generates ~10-15 per session before quality drops or it refuses
- Expect ~20-25 ChatGPT sessions total
- After generation: visual matching + conversion + archetypes.ts code update

## Code Changes Needed (after images exist)

1. Move existing images from `public/archetypes/{age}/` to `public/archetypes/scandinavian/{age}/`
2. Update `archetypes.ts`:
   - `getArchetypes(ageRange, region)` — add region param
   - Map region IDs from `regions.ts` to image set folder names
   - Fallback: if region images don't exist yet, use scandinavian
3. Update all 3 callers of `getArchetypes()`:
   - `OnboardingFlow.tsx`
   - `UserPreferences.tsx`
   - `ArchetypeSelector.tsx`
   — pass the user's `preferred_region` from profile
