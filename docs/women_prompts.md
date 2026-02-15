# Archetype Image Generation Guide

## What We Have

**40 Scandinavian images** — 10 archetypes x 4 age groups (18, 25, 30, 37), stored in `public/archetypes/{age}/{archetype}.jpg`. These cover the "Nordic/Slavic" image set.

The code that serves them is in `src/profile/data/archetypes.ts`. Currently `getArchetypes(ageRange)` only uses age to pick images. It needs to be extended to also accept region.

## Prompt Formula That Works

Generated via ChatGPT image generation. This format consistently produced great results:

```
{archetype-name} — age {age}
Portrait photo of a {beauty-adjective} {age}-year-old {ethnicity} woman, {face/build descriptor}, {hair description}, {clothing/accessories}, {setting/environment}, {expression}, {lighting}, shallow depth of field, photorealistic, 1:1
```

### What each slot does

| Slot | Purpose | Why it matters |
|------|---------|---------------|
| **beauty-adjective** | Rotate: "beautiful", "striking", "radiant", "elegant", "statuesque" | Pushes ChatGPT toward different face archetypes. "Striking" ≠ "radiant" |
| **face/build descriptor** | From archetype table below (e.g. "sharp angular features" vs "soft round face") | **THIS IS THE KEY DIFFERENTIATOR.** Without it, all images converge to one face |
| **hair description** | Style + color/texture specific to ethnicity | For regions where hair color varies (Scandinavian), this alone creates variety. For regions where it doesn't (African, East Asian), face/build does the heavy lifting |
| **clothing/accessories** | From archetype table — signals the archetype | Keep consistent across regions |
| **setting/environment** | From archetype table — reinforces archetype | Keep consistent across regions |
| **expression** | From archetype table — matches personality | Named and specific, never generic |

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

Each has a distinct visual language. Clothing/setting/expression stay consistent across ALL regions. The **face/build** column is the critical differentiator — it forces ChatGPT to generate a different-looking woman for each archetype, not just the same face in different outfits.

**IMPORTANT: The face/build descriptor MUST go in every prompt, right after the ethnicity.** This is what prevents the "same woman in 40 outfits" problem. Without it, ChatGPT converges on one generic face per ethnicity.

| Archetype | Face/Build (put in prompt) | Clothing Signals | Setting Signals | Expression |
|-----------|---------------------------|-----------------|-----------------|------------|
| corporate-powerhouse | sharp angular features, defined jawline, tall and poised | Navy/black blazer, diamond/pearl studs, pendant necklace | Office, glass building, corporate | Confident, commanding |
| ethereal-creative | delicate fine-boned features, slender, willowy frame | Artsy layers, statement rings, bohemian-adjacent but refined | Gallery, studio, warm cafe | Dreamy, slightly detached, faraway gaze |
| disciplined-athlete | strong athletic build, broad shoulders, radiant skin | Athletic wear (running jacket, sports top), ponytail, smartwatch | Gym, park, running track | Direct, energetic, bright eyes |
| academic-intellectual | soft features, wide thoughtful eyes, understated | Glasses, turtleneck/cable knit, books | Library, university cafe, home study | Thoughtful half-smile, curious |
| fashion-scenester | high cheekbones, photogenic bone structure, model-adjacent | Designer accessories, silk scarf, statement earrings, watch | Shopping street, boutique, city | Self-assured, trend-aware |
| bohemian-alt | warm round face, natural no-makeup beauty, freckles okay | Linen/wrap dress, layered necklaces, nose ring okay, earthy colors | Market, outdoor cafe, artisan studio | Warm, relaxed, genuine smile |
| modern-traditionalist | classic symmetrical features, graceful oval face | Cashmere, pearls, modest/elegant, soft pink/cream palette | Elegant home, restaurant, garden | Graceful, warm, reserved |
| urban-nomad | girl-next-door approachable look, sun-kissed, slightly windswept | Linen shirt/blazer, backpack or crossbody bag, minimal jewelry | European street, piazza, cobblestone | Carefree, open, laughing |
| guarded-realist | striking bone structure, minimal makeup, intense eyes | Minimal — black/charcoal, simple gold, understated | Minimalist apartment, marble cafe | Measured, guarded, looking slightly past camera |
| social-connector | expressive round face, big warm eyes, infectious energy | Colorful clothing, hoops/statement jewelry, warm palette | Brunch spot, wine bar, dinner event | Big smile, animated, warm |

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

| # | Image Set | Ethnicity descriptor | Regions covered | Hair/feature notes | Skin tone rotation |
|---|-----------|---------------------|-----------------|-------------------|--------------------|
| 1 | **Nordic/Slavic** | "Scandinavian" | Scandinavia, Slavic Europe, Eastern Europe | DONE. Blonde to light brown, blue/green/grey eyes, light skin | N/A — hair color provides variety |
| 2 | **Western European** | "Western European" | Western Europe, North America, Australia/Oceania | Broader mix — brunette common, brown or blue eyes. Think UK/French/German | "fair skin", "light skin", "pale with freckles" |
| 3 | **Mediterranean** | "Mediterranean" | Southern Europe | Dark brown/black hair, brown eyes, warm features. Think Italian/Spanish/Greek | "olive skin", "warm golden skin", "sun-kissed olive complexion" |
| 4 | **Latin American** | "Latin American" | Latin America | Dark hair, mix of European and Indigenous features. Think Colombian/Brazilian/Argentine | "warm tan skin", "light caramel skin", "golden brown skin", "olive complexion" |
| 5 | **East Asian** | "East Asian" | East Asia | Chinese/Japanese/Korean features. Straight black hair common | "porcelain skin", "warm ivory skin", "fair skin" |
| 6 | **Southeast Asian** | "Southeast Asian" | Southeast Asia | Dark hair, rounder features. Think Thai/Filipino/Vietnamese | "warm brown skin", "golden tan skin", "light brown skin" |
| 7 | **South Asian** | "South Asian" | South Asia | Dark hair, dark eyes. Think Indian/Pakistani | "warm brown skin", "deep brown skin", "medium brown skin", "golden brown skin" |
| 8 | **African** | "African" | Africa | Sub-Saharan (North Africa closer to Mediterranean) | "deep ebony skin", "rich dark skin", "warm brown skin", "dark mahogany skin" |

### Avoiding the "same woman" problem

**Why the Scandinavian set worked:** Hair COLOR varied (ash blonde, caramel, light brown, strawberry). Each color pushed ChatGPT toward a different face automatically. No extra effort needed.

**Why the African set failed:** "African woman, dark skin" x40 = one face template with 40 wigs. Hair STYLE variation (braids vs afro vs locs) only changes what's on top of the head — the face underneath stays identical.

**Rules for all remaining sets:**

1. **Face/build descriptor from archetype table is MANDATORY** in every prompt. This is the primary face differentiator. "Sharp angular features" and "warm round face" will generate genuinely different women.
2. **Rotate skin tone** across the 10 archetypes using the skin tone column above. Don't use the same skin tone descriptor for all 40 prompts. Even within one ethnicity, real people vary.
3. **Rotate the beauty adjective**: cycle through "beautiful", "striking", "radiant", "elegant", "statuesque" across the 10 archetypes. Each word biases a different face shape.
4. **For regions with low hair-color variety** (African, East Asian, South Asian, Southeast Asian): the face/build + skin tone rotation are doing ALL the differentiation work. Be extra specific with these.
5. **For regions with high hair-color variety** (Scandinavian, Western European): hair color helps, but still include face/build descriptors for consistency.

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
- Each woman should look like a DIFFERENT person — vary face shape, build, skin tone
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

## Completed Sets

### Set 8: African (DONE — but with caveats)

Generated 40 prompts with Claude, fed to ChatGPT image gen.

**What went wrong:** All 40 prompts used "beautiful African woman, dark skin" with no face/build variation. Result: all images look like the same woman in different outfits and hairstyles. Hair style variety (braids, locs, afro, TWA, etc.) was NOT enough — it only changes what's on top of the head. The face underneath converged to one template.

**What the next set must do differently:** Use the face/build descriptors from the archetype table and rotate skin tones. See "Avoiding the same woman problem" section above.

**What DID work (keep for future sets):**
- Hair style variety across all 40 — no two identical
- Age signaling through hair: younger = freer/bigger (afros, puffs, bantu knots), older = refined/intentional (tapered cuts, chignons, finger waves)

**Examples that worked well:**

> **bohemian-alt — age 25**
> Portrait photo of a beautiful 25-year-old African woman, dark skin, long faux locs with scattered golden beads, small nose ring, wearing an oversized rust-colored linen shirt with layered chain necklaces, seated at a weathered wooden table at an outdoor cafe with hanging plants, genuine easy-going expression, soft warm natural light, shallow depth of field, photorealistic, 1:1

> **corporate-powerhouse — age 37**
> Portrait photo of a beautiful 37-year-old African woman, dark skin, elegant protective style updo, wearing a tailored deep burgundy power suit with diamond stud earrings and a thin gold chain necklace, leather portfolio in hand, standing in an executive boardroom with dark wood paneling, commanding confident expression, warm golden overhead lighting, shallow depth of field, photorealistic, 1:1

> **guarded-realist — age 30**
> Portrait photo of a beautiful 30-year-old African woman, dark skin, locs pulled into a sleek high bun, wearing a charcoal cashmere crewneck with a single thin gold chain, arms crossed loosely, standing in a modern minimalist apartment with concrete walls and a single plant, calm assessing gaze, soft muted natural light, shallow depth of field, photorealistic, 1:1

> **social-connector — age 37**
> Portrait photo of a beautiful 37-year-old African woman, dark skin, elegant short natural hair with finger waves, wearing a jewel-toned emerald silk dress with chandelier gold earrings and a delicate tennis bracelet, at an intimate dinner party with soft candles and flowers on the table, vibrant magnetic smile, rich warm golden ambient light, shallow depth of field, photorealistic, 1:1

---

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
