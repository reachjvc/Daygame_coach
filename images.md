# Role Model Images Plan

## Goal
Create a consistent, game-like portrait set for all 30 role models. Start by re-generating Marcus Aurelius to validate the “living” effect (subtle motion via frame variation), then scale to the full archive.

## Constraints (global)
- Aspect ratio: 1:1 (square).
- Composition: top 50–60% = clear portrait; bottom 40–50% = smooth gradient to pure black.
- Lighting: warm golden/orange rim light from behind + cool teal fill from front.
- Style: painterly digital illustration, cinematic contrast, saturated and vibrant (character select screen feel).
- No text, logos, watermarks, or modern artifacts.
- Frames should be consistent in identity/composition with *subtle* variance (no big pose or camera shifts).

## Phase 1 — Pilot: Marcus Aurelius (12-frame loop)
**Objective:** confirm the “breathing” effect and visual consistency before scaling.

1. **Rebuild prompt (Marcus-specific)**
   - Use the exact prompt wording from the user’s brief.
   - Add consistent negatives: “no text, no watermark, no extra limbs, no cropped head, no modern clothing.”
2. **Generate 12 candidates (or 12+ and curate down to 12)**
   - Keep pose and framing consistent; only allow micro-variance (embers, hair movement, eyelids, rim light shimmer).
   - If the tool supports seeds or image-to-image with low variance, lock to a base seed and generate slight variations.
3. **Curate a loop**
   - Pick 12 frames that look like gentle motion when played at 2–3 FPS.
   - Ensure frame 12 can transition smoothly back to frame 1.
4. **Optimize**
   - **Pilot format:** PNG for review fidelity; defer compression decisions until approved.
   - Target size: 1024–1536 px square; keep file size manageable for web (sub-2 MB per frame if possible).
5. **Place assets**
   - Save to `public/marcus-test/`.
   - Naming: `marcus_loop_01.png` … `marcus_loop_12.png`.
6. **Test**
   - Verify loop on `app/test/marcus-loop/page.tsx`.
   - Confirm “alive but stable” (no jitter, no identity drift).

**Exit criteria:** The Marcus loop looks alive, cinematic, and consistent with the brief when looped at 2–3 FPS.

## Phase 2 — Global Prompt Template (for all role models)
Create a base template to keep consistency across 30 figures. Suggested template fields:
- **Name & era**
- **Appearance** (hair, face, age, ethnicity)
- **Clothing/attire**
- **Iconic motif** (subtle background hints, not literal props)
- **Mood** (stoic, fierce, visionary, etc.)

**Base template (example):**
“Painterly digital illustration portrait of {NAME}, {ROLE/ERA}. {APPEARANCE}. {ATTIRE}. {EXPRESSION}. Looking slightly off-camera. Lighting: dramatic warm golden-orange rim light from behind + cool teal fill from front. Background: deep atmospheric teal and dark brown with floating embers/dust. Rich saturated colors, high contrast, cinematic drama. Mood: powerful, epic, timeless. Style feels like a video game character select screen. Top 50–60%: clear portrait, full detail. Bottom 40–50%: smooth gradient to pure black. Aspect ratio: 1:1.”

## Phase 3 — Scale to All 30 Role Models
1. **Extract roster**
   - Use `src/inner-game/data/roleModels.ts` as the source of names + short descriptors.
2. **Create per-role-model prompt modifiers**
   - Keep the base template fixed.
   - Only change identity-specific details (appearance, attire, motif, expression).
3. **Generate 8–12 frames per role model**
   - Target 12 frames for uniformity.
   - Lock composition and seed style per character.
4. **QA pass**
   - Consistent lighting, color palette, and framing across the set.
   - Identity clarity (readable at card size).
   - No anachronistic props or text artifacts.
5. **Archive**
   - Directory scheme (pick one and stick to it):
     - `public/role-models/{slug}/frame_01.png` … `frame_12.png`
     - or `public/{Name}/name_loop_01.png` …
   - Create a simple manifest (JSON/TS) mapping role model id → folder path (optional, but helpful later).

## Phase 4 — Integration Readiness
Once the archive exists:
- Hook gallery cards to their images (static or looping).
- Use the same loop frame count everywhere for smoother animation logic.
- Add lazy-loading if needed (12 frames × 30 can be heavy).

## Open Decisions
- **Folder naming convention (final archive):** `public/marcus-test/` for pilot; decide final structure before scaling.
- **Final output size & format:** keep PNG for pilot; likely convert to WebP (lossy) for production to reduce size.
- **Generation tool:** use ChatGPT Plus image generation for pilot unless you prefer Midjourney.
