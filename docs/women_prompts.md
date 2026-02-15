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

| # | Image Set | Status | Ethnicity descriptor | Regions covered | Hair/feature notes | Skin tone rotation |
|---|-----------|--------|---------------------|-----------------|-------------------|--------------------|
| 1 | **Nordic/Slavic** | DONE | "Scandinavian" | Scandinavia, Slavic Europe, Eastern Europe | Blonde to light brown, blue/green/grey eyes, light skin | N/A — hair color provides variety |
| 2 | **Western European** | TODO | "Western European" | Western Europe, North America, Australia/Oceania | Broader mix — brunette common, brown or blue eyes. Think UK/French/German | "fair skin", "light skin", "pale with freckles" |
| 3 | **Mediterranean** | TODO | "Mediterranean" | Southern Europe | Dark brown/black hair, brown eyes, warm features. Think Italian/Spanish/Greek | "olive skin", "warm golden skin", "sun-kissed olive complexion" |
| 4 | **Latin American** | TODO | "Latin American" | Latin America | Dark hair, mix of European and Indigenous features. Think Colombian/Brazilian/Argentine | "warm tan skin", "light caramel skin", "golden brown skin", "olive complexion" |
| 5 | **East Asian** | TODO | "East Asian" | East Asia | Chinese/Japanese/Korean features. Straight black hair common | "porcelain skin", "warm ivory skin", "fair skin" |
| 6 | **Southeast Asian** | TODO | "Southeast Asian" | Southeast Asia | Dark hair, rounder features. Think Thai/Filipino/Vietnamese | "warm brown skin", "golden tan skin", "light brown skin" |
| 7 | **South Asian** | TODO | "South Asian" | South Asia | Dark hair, dark eyes. Think Indian/Pakistani | "warm brown skin", "deep brown skin", "medium brown skin", "golden brown skin" |
| 8 | **African** | DONE | "African" | Africa | Sub-Saharan (North Africa closer to Mediterranean) | "deep ebony skin", "rich dark skin", "warm brown skin", "dark mahogany skin" |

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

- 6 remaining sets x 40 images each = **240 images**
- ChatGPT generates ~10-15 per session before quality drops or it refuses
- Expect ~16-20 ChatGPT sessions total
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

### Set 2: Western European (PENDING — prompts ready)

**Improvements over African set:** Every prompt includes face/build descriptor from archetype table, rotates beauty adjective (striking/elegant/radiant/beautiful/statuesque), and varies skin tone (fair/light/pale with freckles/sun-kissed). Hair color naturally varies (chestnut, auburn, brown, dirty blonde, sandy, copper-red, honey blonde).

#### Age 18

> #1 — corporate-powerhouse — age 18
> Portrait photo of a striking 18-year-old Western European woman, sharp angular features with a defined jawline, fair skin, dark chestnut hair pulled into a sleek low ponytail, wearing a fitted navy blazer over a white crew-neck top, small silver stud earrings, standing in a modern school hallway with glass windows, composed confident expression, cool natural light, shallow depth of field, photorealistic, 1:1

> #2 — ethereal-creative — age 18
> Portrait photo of an elegant 18-year-old Western European woman, delicate fine-boned features with a slender willowy frame, light skin, long wavy auburn hair falling loosely past shoulders, wearing a sage green linen blouse with layered delicate rings, seated in a bright art studio with canvases in background, dreamy faraway gaze, soft diffused natural light, shallow depth of field, photorealistic, 1:1

> #3 — disciplined-athlete — age 18
> Portrait photo of a radiant 18-year-old Western European woman, strong athletic build with broad shoulders, fair skin with light freckles, sandy blonde hair in a high ponytail, wearing a royal blue zip-up running jacket and simple stud earrings, at a sunlit outdoor running track with trees in background, bright energetic smile, golden morning light, shallow depth of field, photorealistic, 1:1

> #4 — academic-intellectual — age 18
> Portrait photo of a beautiful 18-year-old Western European woman, soft features with wide thoughtful eyes, light skin, medium brown hair in a casual side braid, thin wire-framed glasses, wearing an oversized cream cable-knit sweater, holding a paperback book, sitting in a cozy window seat in a library, curious half-smile, warm natural window light, shallow depth of field, photorealistic, 1:1

> #5 — fashion-scenester — age 18
> Portrait photo of a statuesque 18-year-old Western European woman, high cheekbones with photogenic bone structure, fair complexion, straight dark brown hair at shoulder length, wearing a black leather jacket over a white crop top, small gold hoop earrings, standing on a European shopping street with boutiques, self-assured cool expression, bright overcast daylight, shallow depth of field, photorealistic, 1:1

> #6 — bohemian-alt — age 18
> Portrait photo of a radiant 18-year-old Western European woman, warm round face with natural no-makeup beauty, pale skin with freckles, long curly copper-red hair, small silver nose stud, wearing a cream linen wrap top with a simple leather cord necklace, at an outdoor flea market with colorful stalls, warm genuine smile, soft golden afternoon light, shallow depth of field, photorealistic, 1:1

> #7 — modern-traditionalist — age 18
> Portrait photo of an elegant 18-year-old Western European woman, classic symmetrical features with a graceful oval face, fair skin, honey blonde hair in a neat low bun, wearing a soft pink cardigan over a white peter pan collar blouse, small pearl stud earrings, standing in an elegant garden with trimmed hedges, reserved graceful smile, gentle overcast light, shallow depth of field, photorealistic, 1:1

> #8 — urban-nomad — age 18
> Portrait photo of a beautiful 18-year-old Western European woman, girl-next-door approachable look, sun-kissed light skin, windswept dirty blonde hair at shoulder length, wearing a white linen button-down shirt and canvas crossbody bag, walking through a European cobblestone piazza, carefree laughing expression, bright warm sunlight, shallow depth of field, photorealistic, 1:1

> #9 — guarded-realist — age 18
> Portrait photo of a striking 18-year-old Western European woman, prominent bone structure with intense blue-grey eyes, fair complexion, straight dark blonde hair tucked behind ears, wearing a charcoal turtleneck and small silver bar necklace, seated at a minimalist white cafe with a glass of water, measured calm gaze looking slightly past camera, cool muted natural light, shallow depth of field, photorealistic, 1:1

> #10 — social-connector — age 18
> Portrait photo of a beautiful 18-year-old Western European woman, expressive round face with big warm brown eyes, light skin, medium brown wavy hair with a side part, wearing a mustard yellow blouse and small gold hoop earrings, at a busy outdoor brunch cafe with friends blurred in background, bright animated smile, warm sunny natural light, shallow depth of field, photorealistic, 1:1

#### Age 25

> #11 — corporate-powerhouse — age 25
> Portrait photo of a striking 25-year-old Western European woman, sharp angular features with a defined jawline, tall and poised, fair skin, sleek dark brown hair at collar length, wearing a tailored charcoal blazer with a silk cream camisole, diamond stud earrings, thin gold pendant necklace, standing by floor-to-ceiling windows in a modern glass office, commanding confident expression, cool natural daylight, shallow depth of field, photorealistic, 1:1

> #12 — ethereal-creative — age 25
> Portrait photo of an elegant 25-year-old Western European woman, delicate fine-boned features with a slender willowy frame, light ivory skin, long straight honey-brown hair with a center part, wearing a flowing dusty rose silk blouse with stacked thin gold rings, in a warmly lit gallery space with abstract paintings, dreamy slightly detached expression, soft warm ambient light, shallow depth of field, photorealistic, 1:1

> #13 — disciplined-athlete — age 25
> Portrait photo of a radiant 25-year-old Western European woman, strong athletic build with broad shoulders and radiant skin, fair skin with freckles across nose, light auburn hair in a French braid, wearing a fitted black sports top and smartwatch, at a modern gym with weights blurred in background, direct energetic expression with bright eyes, clean overhead gym lighting, shallow depth of field, photorealistic, 1:1

> #14 — academic-intellectual — age 25
> Portrait photo of a beautiful 25-year-old Western European woman, soft features with wide thoughtful eyes, light skin, dark brown hair in a loose low bun with wispy pieces framing face, tortoiseshell glasses, wearing a navy turtleneck, holding a ceramic coffee mug, in a bright university cafe with bookshelves, thoughtful half-smile, warm natural light from large windows, shallow depth of field, photorealistic, 1:1

> #15 — fashion-scenester — age 25
> Portrait photo of a statuesque 25-year-old Western European woman, high cheekbones with photogenic bone structure, fair complexion, sleek chestnut brown hair pulled back in a low chignon, wearing a camel cashmere coat over a black turtleneck, gold link chain necklace, statement sunglasses pushed up on head, on a city shopping street with elegant storefronts, self-assured polished expression, bright overcast European daylight, shallow depth of field, photorealistic, 1:1

> #16 — bohemian-alt — age 25
> Portrait photo of a radiant 25-year-old Western European woman, warm round face with natural beauty, pale skin with light freckles, long loose wavy copper-auburn hair, tiny gold nose ring, wearing an olive green oversized linen shirt with layered pendant necklaces on leather cord, seated at a weathered wooden table at an outdoor cafe with hanging ivy, genuine relaxed smile, soft dappled afternoon light, shallow depth of field, photorealistic, 1:1

> #17 — modern-traditionalist — age 25
> Portrait photo of an elegant 25-year-old Western European woman, classic symmetrical features with a graceful oval face, fair skin, medium brown hair in soft waves at shoulder length, wearing a cream cashmere sweater with a single strand of pearls, at an elegant restaurant with white tablecloths and candles, warm reserved smile, soft golden candlelight, shallow depth of field, photorealistic, 1:1

> #18 — urban-nomad — age 25
> Portrait photo of a beautiful 25-year-old Western European woman, girl-next-door approachable look, sun-kissed light skin, tousled dirty blonde hair with natural highlights, wearing a chambray button-down shirt and small leather backpack strap visible on shoulder, on a European side street with colorful building facades, open carefree expression, warm golden-hour sunlight, shallow depth of field, photorealistic, 1:1

> #19 — guarded-realist — age 25
> Portrait photo of a striking 25-year-old Western European woman, prominent bone structure with intense green eyes and minimal makeup, fair complexion, straight dark brown hair at jaw length in a blunt bob, wearing a black crew-neck sweater and single thin gold chain, arms loosely crossed, in a modern minimalist apartment with large windows, calm assessing gaze, cool overcast natural light, shallow depth of field, photorealistic, 1:1

> #20 — social-connector — age 25
> Portrait photo of a beautiful 25-year-old Western European woman, expressive round face with big warm hazel eyes and infectious energy, light skin, medium brown hair styled in loose curls, wearing a rich burgundy wrap top and gold hoop earrings, at an upscale wine bar with warm lighting and other guests blurred behind, vibrant warm smile, rich amber ambient lighting, shallow depth of field, photorealistic, 1:1

#### Age 30

> #21 — corporate-powerhouse — age 30
> Portrait photo of a striking 30-year-old Western European woman, sharp angular features with a defined jawline, tall and poised, fair skin, dark brown hair in a sleek straight style at shoulder length, wearing a fitted black blazer with a white silk shirt, pearl stud earrings and a thin gold watch, seated at a dark wood executive desk with a laptop, confident commanding expression, warm overhead office lighting, shallow depth of field, photorealistic, 1:1

> #22 — ethereal-creative — age 30
> Portrait photo of an elegant 30-year-old Western European woman, delicate fine-boned features with a slender willowy frame, light skin, long wavy light brown hair with golden highlights, wearing a draped ivory silk wrap top with a collection of delicate gold rings, in a bright creative studio with fabric samples and sketchbooks, faraway dreamy gaze, soft warm natural light from skylights, shallow depth of field, photorealistic, 1:1

> #23 — disciplined-athlete — age 30
> Portrait photo of a radiant 30-year-old Western European woman, strong athletic build with broad shoulders and glowing skin, fair skin with light freckles, auburn hair in a sleek low ponytail, wearing a fitted dark green running jacket and small diamond stud earrings, smartwatch on wrist, at a scenic park trail with autumn trees, direct confident expression with bright eyes, crisp golden morning light, shallow depth of field, photorealistic, 1:1

> #24 — academic-intellectual — age 30
> Portrait photo of a beautiful 30-year-old Western European woman, soft features with wide thoughtful eyes, light skin, dark brown hair parted in the center and tucked behind ears, thin gold-rimmed oval glasses, wearing a slate grey wool blazer over a cream knit top, holding a leather-bound journal, in a home study with floor-to-ceiling bookshelves, contemplative half-smile, warm natural light from a desk lamp and window, shallow depth of field, photorealistic, 1:1

> #25 — fashion-scenester — age 30
> Portrait photo of a statuesque 30-year-old Western European woman, high cheekbones with photogenic bone structure, fair complexion, rich chestnut hair in a polished blowout with subtle highlights, wearing a tailored navy trench coat with a silk scarf, gold statement earrings, carrying a structured leather bag, on a Paris-style boulevard with cafe awnings, sophisticated self-assured expression, soft overcast European light, shallow depth of field, photorealistic, 1:1

> #26 — bohemian-alt — age 30
> Portrait photo of a radiant 30-year-old Western European woman, warm round face with natural no-makeup beauty, pale skin with freckles across cheeks, loose long auburn waves, small silver hoop earrings, wearing an earthy rust-colored wrap dress with a layered gold and leather necklace, in a bright artisan pottery studio with shelves of handmade ceramics, warm easy-going expression, soft diffused natural light, shallow depth of field, photorealistic, 1:1

> #27 — modern-traditionalist — age 30
> Portrait photo of an elegant 30-year-old Western European woman, classic symmetrical features with a graceful oval face, fair skin, medium brown hair in a soft chignon, wearing a tailored powder blue cashmere sweater with a strand of pearls and small pearl drop earrings, seated in an elegant living room with fresh flowers on the table, graceful warm smile, gentle natural afternoon light, shallow depth of field, photorealistic, 1:1

> #28 — urban-nomad — age 30
> Portrait photo of a beautiful 30-year-old Western European woman, girl-next-door approachable look, sun-kissed light skin, tousled sandy brown hair with sun-bleached ends, wearing a relaxed linen blazer over a white v-neck tee, leather crossbody bag, walking through a Mediterranean-style European side street with stone walls, open easy smile, warm golden afternoon light, shallow depth of field, photorealistic, 1:1

> #29 — guarded-realist — age 30
> Portrait photo of a striking 30-year-old Western European woman, prominent bone structure with intense grey-blue eyes and minimal makeup, fair complexion, straight dark ash-brown hair at collar length, wearing a fitted black turtleneck with a simple gold bar pendant, seated at a clean marble cafe counter with an espresso, composed measured gaze looking slightly past camera, cool muted natural light, shallow depth of field, photorealistic, 1:1

> #30 — social-connector — age 30
> Portrait photo of a beautiful 30-year-old Western European woman, expressive round face with big warm brown eyes and infectious energy, light skin, chestnut brown hair in a voluminous blowout, wearing a jewel-toned sapphire blue silk blouse with gold link bracelet and small gold hoops, at an intimate dinner party with soft candles and wine glasses on table, vibrant magnetic smile, warm golden ambient candlelight, shallow depth of field, photorealistic, 1:1

#### Age 37

> #31 — corporate-powerhouse — age 37
> Portrait photo of a striking 37-year-old Western European woman, sharp angular features with a defined jawline, tall and poised, fair skin, sleek dark brown hair in a refined shoulder-length bob, wearing a tailored deep navy power suit with diamond stud earrings and a thin gold watch, leather portfolio in hand, standing in a corner office with city skyline visible through windows, commanding confident expression, warm golden overhead lighting, shallow depth of field, photorealistic, 1:1

> #32 — ethereal-creative — age 37
> Portrait photo of an elegant 37-year-old Western European woman, delicate fine-boned features with a slender willowy frame, light ivory skin, long flowing light brown hair with subtle caramel highlights, wearing a draped cream silk blouse with artistic gold statement ring and thin chain bracelet, in a refined gallery opening with modern sculpture in background, serene slightly detached dreamy expression, soft warm gallery lighting, shallow depth of field, photorealistic, 1:1

> #33 — disciplined-athlete — age 37
> Portrait photo of a radiant 37-year-old Western European woman, strong athletic build with broad shoulders and glowing radiant skin, fair skin with light freckles, auburn hair in a sleek ponytail, wearing a tailored charcoal running jacket over a performance top, rose gold smartwatch, at a scenic waterside running path with morning mist, direct confident expression with bright clear eyes, crisp cool morning light, shallow depth of field, photorealistic, 1:1

> #34 — academic-intellectual — age 37
> Portrait photo of a beautiful 37-year-old Western European woman, soft features with wide thoughtful eyes, light skin, dark brown hair in a refined low twist with pieces framing face, elegant gold-rimmed glasses, wearing a charcoal wool blazer over an ivory silk blouse, holding a coffee cup, in a sunlit home library with leather-bound books, warm contemplative half-smile, rich warm natural light, shallow depth of field, photorealistic, 1:1

> #35 — fashion-scenester — age 37
> Portrait photo of a statuesque 37-year-old Western European woman, high cheekbones with photogenic bone structure, fair complexion, rich dark chestnut hair styled in polished waves, wearing a tailored camel coat over a black cashmere turtleneck, silk scarf tucked at collar, gold statement earrings, designer watch, standing outside a luxury boutique with marble facade, composed self-assured expression, soft overcast European light, shallow depth of field, photorealistic, 1:1

> #36 — bohemian-alt — age 37
> Portrait photo of a radiant 37-year-old Western European woman, warm round face with natural beauty, pale skin with light freckles, long loose auburn waves with a few grey-touched strands, small gold hoop earrings, wearing an olive green oversized knit cardigan over a white v-neck, turquoise pendant necklace, in a cozy home studio with plants and pottery and bookshelves, warm thoughtful expression, soft golden natural light, shallow depth of field, photorealistic, 1:1

> #37 — modern-traditionalist — age 37
> Portrait photo of an elegant 37-year-old Western European woman, classic symmetrical features with a graceful oval face, fair skin, medium brown hair in a polished side-swept style, wearing a dove grey cashmere wrap dress with pearl drop earrings and a delicate gold bracelet, seated in a refined restaurant with white linen and crystal glassware, graceful warm reserved smile, soft candlelit ambient light, shallow depth of field, photorealistic, 1:1

> #38 — urban-nomad — age 37
> Portrait photo of a beautiful 37-year-old Western European woman, girl-next-door approachable look, sun-kissed light skin, tousled sandy blonde highlighted hair, wearing a linen blazer over a white crew-neck, leather crossbody bag, silver minimal earrings, on a quiet European cobblestone side street with ivy-covered walls, relaxed open laughing expression, warm late afternoon golden light, shallow depth of field, photorealistic, 1:1

> #39 — guarded-realist — age 37
> Portrait photo of a striking 37-year-old Western European woman, prominent bone structure with intense grey eyes and minimal makeup, fair complexion, straight dark brown hair at collar length in a precise cut, wearing a black cashmere turtleneck with a simple gold bar necklace, small gold stud earrings, seated at a sleek marble cafe counter with an espresso, composed guarded expression looking slightly past camera, cool overcast Northern European light, shallow depth of field, photorealistic, 1:1

> #40 — social-connector — age 37
> Portrait photo of a beautiful 37-year-old Western European woman, expressive round face with big warm hazel eyes and infectious energy, light skin, styled chestnut brown hair with subtle highlights in voluminous waves, wearing an elegant emerald green silk blouse with gold chandelier earrings and a delicate tennis bracelet, at an intimate dinner event with soft candles and flowers on table, vibrant warm magnetic smile, rich warm golden ambient light, shallow depth of field, photorealistic, 1:1

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
