# Archetype Image Generation Guide

## Overview

40 images per region: 10 archetypes x 4 ages (18, 25, 30, 37). Stored at `public/archetypes/{region}/{age}/{archetype}.jpg`. Code: `src/profile/data/archetypes.ts`.

## Prompt Formula

```
{archetype-name} — age {age}
Portrait photo of a {beauty-adjective} {age}-year-old {region} woman, {sub-ethnicity face descriptor}, {hair}, {clothing/accessories}, {setting}, {expression}, {lighting}, shallow depth of field, natural skin texture with visible pores, shot on Canon EOS R5 85mm f/1.4, 1:1
```

Every slot matters. Here's why:

| Slot | Rule |
|------|------|
| **beauty-adjective** | Rotate per archetype: "beautiful", "striking", "radiant", "elegant", "statuesque". Each biases a different face shape. |
| **sub-ethnicity face descriptor** | THE MOST IMPORTANT SLOT. See table below. Must name specific facial geometry (nose shape, lip fullness, eye color/spacing, face shape). Abstract vibes ("sharp features", "soft face") do NOT work — ChatGPT ignores them and reuses one face template. |
| **hair** | Style + color. Be specific ("light brown in a loose low bun", not "brown hair"). For low hair-color-variety regions, face descriptor does the differentiation instead. |
| **clothing** | Archetype-signaling. "Oatmeal turtleneck + gold-rimmed glasses" = intellectual. Keep consistent across regions. |
| **setting** | Archetype-signaling. "University cafe with bookshelves" not just "indoors". Keep consistent across regions. |
| **expression** | Named and specific. "Thoughtful half-smile" not "smiling". |
| **lighting** | Named. "Warm natural light" not "good lighting". |
| **ending** | ALWAYS `natural skin texture with visible pores, shot on Canon EOS R5 85mm f/1.4, 1:1`. Never use `photorealistic` — it makes skin waxy and airbrushed. The camera reference grounds it in real photography. |

### Best Example

> academic-intellectual — age 25
> Portrait photo of a beautiful 25-year-old Western European woman, German features — oval face, soft rounded nose, warm deep brown eyes, gentle arched brows, light skin, dark brown hair in a loose low bun with wispy pieces framing face, tortoiseshell glasses, wearing a navy turtleneck, holding a ceramic coffee mug, in a bright university cafe with bookshelves, thoughtful half-smile, warm natural light from large windows, shallow depth of field, natural skin texture with visible pores, shot on Canon EOS R5 85mm f/1.4, 1:1

## The 10 Archetypes

### Face Descriptors (per region)

The face descriptor is the primary differentiator. It must specify **sub-ethnicity + concrete facial geometry**. Each archetype maps to a different sub-ethnicity so ChatGPT is forced toward 10 genuinely different face templates. The sub-ethnicity stays consistent across ages so the same archetype ages naturally.

**Western European sub-ethnicity mapping:**

| Archetype | Sub-ethnicity | Face descriptor (put in prompt after "{region} woman,") |
|-----------|--------------|--------------------------------------------------------|
| corporate-powerhouse | British | British features — square jaw, straight narrow nose, deep-set hazel eyes, thin defined lips, strong brow line |
| ethereal-creative | French | French features — heart-shaped face, wide-set grey-green eyes, small upturned nose, full soft lips, delicate pointed chin |
| disciplined-athlete | Dutch | Dutch features — strong broad face, high cheekbones, straight prominent nose, bright cornflower-blue eyes, full natural brows |
| academic-intellectual | German | German features — oval face, soft rounded nose, warm deep brown eyes, gentle arched brows |
| fashion-scenester | Northern Italian | Northern Italian features — high arched cheekbones, straight aquiline nose, almond-shaped green eyes, defined dark brows, angular face |
| bohemian-alt | Irish | Irish features — round face, button nose, large blue-green eyes, scattered freckles, full rosy lips |
| modern-traditionalist | Scandinavian-adjacent | Scandinavian-adjacent features — symmetrical oval face, straight fine nose, cool grey-blue eyes, light pink lips |
| urban-nomad | Portuguese-adjacent | Portuguese-adjacent features — warm golden-toned skin, wide easy smile, dark honey-brown eyes, softly arched dark brows |
| guarded-realist | Eastern European-adjacent | Eastern European-adjacent features — high wide cheekbones, angular jaw, pale grey eyes, thin sculpted lips, cool undertone |
| social-connector | Southern French | Southern French features — round expressive face, big warm brown eyes, full curved lips, light dimples when smiling |

**For other regions:** Apply the same principle — find 10 sub-ethnic groups within the region with distinct facial geometry. For example, African could use West African (Yoruba), East African (Ethiopian), Southern African, etc. The key is naming a real population + specific feature dimensions (nose, lips, eyes, face shape).

### Clothing / Setting / Expression (consistent across all regions)

| Archetype | Clothing Signals | Setting Signals | Expression |
|-----------|-----------------|-----------------|------------|
| corporate-powerhouse | Navy/black blazer, diamond/pearl studs, pendant necklace | Office, glass building, corporate | Confident, commanding |
| ethereal-creative | Artsy layers, statement rings, refined-bohemian | Gallery, studio, warm cafe | Dreamy, faraway gaze |
| disciplined-athlete | Running jacket/sports top, ponytail, smartwatch | Gym, park, running track | Direct, energetic, bright eyes |
| academic-intellectual | Glasses, turtleneck/cable knit, books | Library, university cafe, home study | Thoughtful half-smile, curious |
| fashion-scenester | Designer accessories, silk scarf, statement earrings | Shopping street, boutique, city | Self-assured, polished |
| bohemian-alt | Linen/wrap, layered necklaces, nose ring okay, earthy colors | Market, outdoor cafe, artisan studio | Warm, relaxed, genuine smile |
| modern-traditionalist | Cashmere, pearls, modest/elegant, pink/cream palette | Elegant home, restaurant, garden | Graceful, warm, reserved |
| urban-nomad | Linen shirt/blazer, crossbody bag, minimal jewelry | European street, piazza, cobblestone | Carefree, open, laughing |
| guarded-realist | Minimal black/charcoal, simple gold, understated | Minimalist apartment, marble cafe | Measured, guarded, looking past camera |
| social-connector | Colorful, hoops/statement jewelry, warm palette | Brunch spot, wine bar, dinner event | Big smile, animated, warm |

## Age Progression

| Age | Vibe | Material upgrade |
|-----|------|-----------------|
| 18 | Fresh, youthful, minimal makeup, casual | Cotton, canvas, simple |
| 25 | Young professional, natural beauty | Linen, leather, first real jewelry |
| 30 | Established, confident, polished | Silk, cashmere, structured bags |
| 37 | Peak refinement, sophisticated elegance | Designer, luxury, high-quality everything |

## Image Sets

| # | Region | Status | Folder name | Notes |
|---|--------|--------|-------------|-------|
| 1 | Nordic/Slavic | DONE (40/40) | `scandinavian` | Hair color variety made faces diverse naturally |
| 2 | Western European | DONE (40/40) | `western-european` | Sub-ethnicity face descriptors used for age 30+37 |
| 3 | Mediterranean | TODO | `mediterranean` | |
| 4 | Latin American | TODO | `latin-american` | |
| 5 | East Asian | TODO | `east-asian` | Low hair-color variety — face descriptor carries all differentiation |
| 6 | Southeast Asian | TODO | `southeast-asian` | Same as above |
| 7 | South Asian | TODO | `south-asian` | Same as above |
| 8 | African | DONE (40/40) | `african` | Faces lack diversity (pre-dates sub-ethnicity fix). May need regen. |

### Skin tone rotation per region

Don't use one skin tone for all 40 prompts. Rotate across archetypes:

| Region | Skin tones to rotate |
|--------|---------------------|
| Western European | "fair skin", "light skin", "pale with freckles", "sun-kissed light skin" |
| Mediterranean | "olive skin", "warm golden skin", "sun-kissed olive complexion" |
| Latin American | "warm tan skin", "light caramel skin", "golden brown skin", "olive complexion" |
| East Asian | "porcelain skin", "warm ivory skin", "fair skin" |
| Southeast Asian | "warm brown skin", "golden tan skin", "light brown skin" |
| South Asian | "warm brown skin", "deep brown skin", "medium brown skin", "golden brown skin" |
| African | "deep ebony skin", "rich dark skin", "warm brown skin", "dark mahogany skin" |

## ChatGPT Workflow

### Batch template

```
I need you to generate {N} portrait photos one at a time.
After each image, I'll say "next" and you generate the next one.

GLOBAL STYLE (apply to ALL images):
- Photorealistic portrait, square 1:1 aspect ratio
- Each woman must look like a DIFFERENT person — vary face shape, bone structure, skin tone
- Head-and-shoulders to upper-body framing
- Shallow depth of field, soft bokeh background
- Natural or soft lighting
- No text, no watermarks, no logos
- IMPORTANT: Natural skin with visible pores and subtle texture. No airbrushed or waxy skin. These should look like real photos, not retouched magazine covers.
- Simulate being shot on a Canon EOS R5 with 85mm f/1.4 lens

AGE GUIDE:
- 18 = youthful, fresh-faced, minimal makeup
- 25 = young professional, natural beauty
- 30 = established, confident, polished
- 37 = refined, mature elegance

Here is the queue. Start with #1.

#1 — {archetype} — age {age}
{full prompt}

#2 — ...
```

### Practical tips
- ChatGPT generates ~10-15 per session before quality drops
- It may skip or duplicate — always count outputs and re-prompt for missing
- Exports as PNG — convert to JPG with `sharp` (quality 90)
- File naming is timestamp-based — visual match to place

### Conversion script

```bash
node -e "
const sharp = require('sharp');
const mappings = [
  { src: 'public/new_folder/chatgpt-image.png', dst: 'public/archetypes/{region}/{age}/{archetype}.jpg' },
];
(async () => {
  for (const m of mappings) {
    await sharp(m.src).jpeg({ quality: 90 }).toFile(m.dst);
    console.log('OK: ' + m.dst);
  }
})();
"
```

## Code Changes Needed (after images exist)

1. Update `archetypes.ts`: `getArchetypes(ageRange, region)` — add region param, map region IDs from `regions.ts` to folder names, fallback to scandinavian if region images missing
2. Update callers: `OnboardingFlow.tsx`, `UserPreferences.tsx`, `ArchetypeSelector.tsx` — pass `preferred_region` from profile
