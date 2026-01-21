/**
 * OUTFITS - Clothing and appearance descriptions
 *
 * DESIGN PRINCIPLES:
 * 1. Difficulty modulates SPECIFICITY, not just visibility
 *    - Beginner: Detailed descriptions with brand hints, accessories, specific colors
 *    - Master: Generic/vague descriptions that give less to comment on
 *
 * 2. Outfits are tied to:
 *    - Archetypes (personality → style correlation)
 *    - Environments (context-appropriate clothing)
 *    - Seasons/Weather (practical considerations)
 *
 * 3. Real-world flavor: Specific brands, accessories, styling details
 */

import type { DifficultyLevel } from "./energy";

// ============================================================================
// TYPES
// ============================================================================

export type OutfitCategory =
  | "business" // Corporate, formal
  | "smart_casual" // Polished but relaxed
  | "casual" // Everyday, relaxed
  | "athleisure" // Gym-adjacent, sporty daily wear
  | "bohemian" // Artsy, flowy, unique
  | "minimalist" // Clean, simple, neutral
  | "trendy" // Current fashion, social media influenced
  | "edgy" // Dark, alternative, bold
  | "preppy" // Classic, collegiate, polished
  | "relaxed" // Comfortable, low-effort
  | "glamorous" // Evening, dressed up
  | "vintage" // Retro-inspired
  | "sporty" // Active sports wear
  | "streetwear"; // Urban, sneaker culture

export type EnvironmentType =
  | "high_street"
  | "mall"
  | "coffee_shop"
  | "transit"
  | "park"
  | "gym"
  | "campus"
  | "nightlife"
  | "beach"
  | "upscale_area";

/**
 * Outfit with tiered descriptions based on difficulty.
 * - tier1: Most specific (beginner) - colors, brands, accessories, details
 * - tier2: Moderate detail (intermediate/advanced)
 * - tier3: Generic (expert/master) - vague, less to comment on
 */
export interface EnhancedOutfit {
  id: string;
  category: OutfitCategory;
  /** Environments where this outfit makes sense */
  suitableEnvironments: EnvironmentType[];
  /** Detailed descriptions with accessories, colors, brand hints */
  tier1: string[];
  /** Moderate detail descriptions */
  tier2: string[];
  /** Generic/vague descriptions */
  tier3: string[];
  /** Optional conversation hooks based on this outfit */
  hooks?: string[];
}

// ============================================================================
// ENHANCED OUTFIT LIBRARY
// ============================================================================

export const ENHANCED_OUTFITS: EnhancedOutfit[] = [
  // ============================================================================
  // BUSINESS (Professional, corporate)
  // ============================================================================
  {
    id: "business_power_suit",
    category: "business",
    suitableEnvironments: ["high_street", "coffee_shop", "transit", "upscale_area"],
    tier1: [
      "She's wearing a tailored charcoal blazer over a cream silk blouse, with high-waisted trousers and beige heels. A delicate gold watch catches the light.",
      "Navy blue power suit with a subtle pinstripe, paired with a pearl necklace and structured leather tote. Her heels click purposefully on the pavement.",
      "Fitted black blazer with gold buttons, white silk camisole underneath, and cigarette pants. She's carrying what looks like a Celine bag.",
    ],
    tier2: [
      "She's in a sharp blazer and tailored trousers with heels.",
      "Professional suit with a silk top and nice jewelry.",
      "Smart business attire with a structured bag.",
    ],
    tier3: [
      "She's dressed professionally.",
      "She's in business clothes.",
      "She looks like she's heading to or from work.",
    ],
    hooks: ["Her outfit looks like she has an important meeting", "The gold details on her blazer"],
  },
  {
    id: "business_feminine_exec",
    category: "business",
    suitableEnvironments: ["high_street", "coffee_shop", "transit", "upscale_area"],
    tier1: [
      "Burgundy sheath dress with a matching belt cinching her waist, tan heels, and a camel trench coat draped over her arm. Small diamond studs in her ears.",
      "Forest green wrap dress that hits just below the knee, tan leather pumps, and a structured black handbag. Her hair is pulled back in a sleek low bun.",
      "Cream pencil skirt with a tucked-in black silk blouse, pointed stilettos, and a thin gold chain around her neck. She looks like she runs things.",
    ],
    tier2: [
      "Elegant dress with a belt and matching heels.",
      "Professional wrap dress with a structured bag.",
      "Pencil skirt and silk blouse combination.",
    ],
    tier3: [
      "She's in professional office wear.",
      "She's dressed for work.",
      "Business attire.",
    ],
    hooks: ["The way her outfit is coordinated", "Her confident professional look"],
  },
  {
    id: "business_modern_corp",
    category: "business",
    suitableEnvironments: ["high_street", "coffee_shop", "transit", "mall"],
    tier1: [
      "Wide-leg black trousers with a cropped white blazer and a simple gold pendant. White sneakers give it a modern edge. AirPods in, coffee in hand.",
      "Olive green suit pants with an oversized matching blazer worn over a ribbed white tank. Minimalist gold hoops and white Veja sneakers.",
      "High-waisted navy culottes with a fitted grey turtleneck and a long camel coat. She's carrying a leather laptop sleeve.",
    ],
    tier2: [
      "Modern suit with sneakers instead of heels.",
      "Tailored trousers with an oversized blazer.",
      "Professional culottes with a fitted top.",
    ],
    tier3: [
      "She's in smart work clothes.",
      "Professional outfit.",
      "Office attire.",
    ],
  },
  {
    id: "business_creative_director",
    category: "business",
    suitableEnvironments: ["high_street", "coffee_shop", "upscale_area"],
    tier1: [
      "All-black outfit: silk button-up, pleated wide-leg trousers, and chunky-heeled boots. Oversized black sunglasses pushed up on her head, silver rings on multiple fingers.",
      "Camel cashmere turtleneck tucked into high-waisted leather pants, with pointed ankle boots. A vintage Hermès scarf tied around her wrist.",
      "Structured white shirt dress with a thick black belt, knee-high boots, and a geometric silver necklace. Red lipstick as the only pop of color.",
    ],
    tier2: [
      "All-black professional look with statement accessories.",
      "Leather pants with a cashmere top and boots.",
      "Shirt dress with bold accessories.",
    ],
    tier3: [
      "She's in stylish work clothes.",
      "Professional but fashionable.",
      "Smart dark outfit.",
    ],
  },
  {
    id: "business_lawyer_vibe",
    category: "business",
    suitableEnvironments: ["high_street", "coffee_shop", "transit", "upscale_area"],
    tier1: [
      "Charcoal grey skirt suit with a light blue oxford shirt, patent leather pumps, and a leather briefcase-style bag. Pearl earrings and a thin gold bracelet.",
      "Black pantsuit with a white button-up and a burgundy tie-neck blouse peeking out. Pointed-toe flats and a Coach bag.",
      "Navy blazer dress with gold buttons down the front, sheer tights, and classic black pumps. Understated but clearly expensive jewelry.",
    ],
    tier2: [
      "Classic skirt suit with a nice blouse.",
      "Sharp pantsuit with subtle details.",
      "Blazer dress with classic accessories.",
    ],
    tier3: [
      "She's dressed formally.",
      "Professional attire.",
      "Business clothes.",
    ],
  },

  // ============================================================================
  // SMART CASUAL (Polished but relaxed)
  // ============================================================================
  {
    id: "smart_casual_brunch",
    category: "smart_casual",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "upscale_area"],
    tier1: [
      "Light wash mom jeans with a tucked-in white linen button-up, sleeves rolled to the elbows. Tan leather mules and small gold hoops. A woven basket bag hangs from her shoulder.",
      "Midi floral skirt in muted tones with a fitted cream ribbed top and tan leather sandals. Delicate layered necklaces and a straw tote.",
      "Dusty rose linen trousers with a white eyelet top and espadrille wedges. She's wearing dainty gold rings and has a raffia clutch.",
    ],
    tier2: [
      "Nice jeans with a linen shirt and leather accessories.",
      "Floral midi skirt with a fitted top.",
      "Linen trousers with a pretty blouse.",
    ],
    tier3: [
      "She's dressed casually but put-together.",
      "Smart casual outfit.",
      "Nice but relaxed clothes.",
    ],
    hooks: ["Her basket bag looks like she's heading somewhere nice", "The summer vibe of her outfit"],
  },
  {
    id: "smart_casual_date_ready",
    category: "smart_casual",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "upscale_area"],
    tier1: [
      "Black cigarette pants with a sage green silk camisole and a cream cardigan draped over her shoulders. Strappy black heels and a YSL-style crossbody.",
      "Wine-colored slip skirt with a black turtleneck and ankle boots. Small gold hoops, a vintage-looking watch, and a quilted leather bag.",
      "Dark blue wide-leg jeans with a crisp white blouse, slightly unbuttoned, and tan block heels. Tortoiseshell sunglasses perched on her head.",
    ],
    tier2: [
      "Elegant pants with a silk top and nice cardigan.",
      "Slip skirt with a cozy turtleneck and boots.",
      "Wide-leg jeans with a white blouse and heels.",
    ],
    tier3: [
      "She's nicely dressed.",
      "Put-together casual look.",
      "Smart outfit.",
    ],
  },
  {
    id: "smart_casual_creative_office",
    category: "smart_casual",
    suitableEnvironments: ["high_street", "coffee_shop", "campus", "mall"],
    tier1: [
      "Olive utility jumpsuit with the sleeves cuffed, white canvas sneakers, and a tan leather crossbody. Simple gold studs and her hair in a low ponytail.",
      "Rust-colored wide-leg pants with a cream cable-knit sweater half-tucked in. White Adidas Sambas and a canvas tote bag covered in enamel pins.",
      "Black culottes with an oversized blue chambray shirt and bright white Air Force 1s. Silver jewelry and a small backpack.",
    ],
    tier2: [
      "Utility jumpsuit with sneakers and a crossbody bag.",
      "Wide-leg pants with a cozy sweater.",
      "Culottes with an oversized shirt and sneakers.",
    ],
    tier3: [
      "Casual but neat outfit.",
      "Relaxed smart clothes.",
      "Put-together look.",
    ],
  },
  {
    id: "smart_casual_gallery_opening",
    category: "smart_casual",
    suitableEnvironments: ["high_street", "coffee_shop", "upscale_area"],
    tier1: [
      "Black silk midi dress with a chunky gold chain belt, strappy black sandals, and dramatic gold earrings. Red nail polish and a small clutch.",
      "Cream linen blazer over a black bodysuit and high-waisted cream trousers. Pointed-toe mules and architectural silver jewelry.",
      "Emerald green satin blouse tucked into black tailored shorts, with black tights and ankle boots. Statement earrings that look handmade.",
    ],
    tier2: [
      "Silk dress with gold accessories.",
      "Linen blazer with coordinated separates.",
      "Satin blouse with tailored shorts.",
    ],
    tier3: [
      "She's dressed up nicely.",
      "Elegant outfit.",
      "Smart evening look.",
    ],
  },
  {
    id: "smart_casual_effortless",
    category: "smart_casual",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "park"],
    tier1: [
      "Straight-leg khakis with a striped Breton top and white leather sneakers. A light denim jacket tied around her waist and a small leather crossbody.",
      "Camel-colored cashmere sweater with dark fitted jeans and brown suede ankle boots. Simple gold chain and a structured tan handbag.",
      "White wide-leg trousers with a navy blue polo shirt, sleeves rolled up. White Converse and a classic leather belt. Tortoiseshell hair clip.",
    ],
    tier2: [
      "Khakis with a striped top and sneakers.",
      "Cashmere sweater with jeans and suede boots.",
      "Wide-leg trousers with a polo and sneakers.",
    ],
    tier3: [
      "She's casually dressed.",
      "Simple nice outfit.",
      "Relaxed clothes.",
    ],
  },

  // ============================================================================
  // CASUAL (Everyday, relaxed)
  // ============================================================================
  {
    id: "casual_weekend_errands",
    category: "casual",
    suitableEnvironments: ["high_street", "mall", "coffee_shop", "park", "transit"],
    tier1: [
      "Light blue mom jeans with a cropped white tank and an oversized flannel shirt tied at the waist. Beat-up white Converse and a small canvas backpack.",
      "High-waisted black leggings with an oversized vintage band tee knotted at the hip. Platform Docs and a faded denim jacket. Scrunchie on her wrist.",
      "Baggy carpenter jeans with a fitted black crop top and a cropped grey hoodie. Nike Dunks and hoop earrings. Her hair's in a claw clip.",
    ],
    tier2: [
      "Mom jeans with a tank top and flannel shirt.",
      "Leggings with an oversized vintage tee.",
      "Baggy jeans with a crop top and hoodie.",
    ],
    tier3: [
      "She's dressed casually.",
      "Casual everyday clothes.",
      "Relaxed outfit.",
    ],
    hooks: ["Her vintage band tee", "The way she's styled her outfit"],
  },
  {
    id: "casual_coffee_run",
    category: "casual",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "park"],
    tier1: [
      "Grey joggers with a white cropped sweatshirt and clean white Nike Air Max. Hair in a messy bun, AirPods in, and a reusable coffee cup in hand.",
      "Black bike shorts with an oversized sage green hoodie that hits mid-thigh. White New Balance 550s and a small crossbody bag.",
      "Faded blue jeans with a cream ribbed henley and a brown leather jacket. Worn-in white Vans and a silver thumb ring.",
    ],
    tier2: [
      "Joggers with a cropped sweatshirt and nice sneakers.",
      "Bike shorts with an oversized hoodie.",
      "Jeans with a henley and leather jacket.",
    ],
    tier3: [
      "Casual clothes.",
      "Comfortable outfit.",
      "Everyday wear.",
    ],
  },
  {
    id: "casual_summer_day",
    category: "casual",
    suitableEnvironments: ["high_street", "park", "mall", "beach"],
    tier1: [
      "Flowy white midi skirt with a fitted yellow crop top and brown leather sandals. Small gold necklace with a sun pendant. Canvas tote over her shoulder.",
      "High-waisted denim shorts with a loose white linen button-up, mostly unbuttoned over a black bikini top. Platform sandals and round sunglasses.",
      "Sage green linen shorts with a matching cropped tank and white Birkenstocks. Beaded bracelets stacked on her wrist and a straw beach bag.",
    ],
    tier2: [
      "Flowy skirt with a crop top and sandals.",
      "Denim shorts with a linen shirt.",
      "Matching linen set with sandals.",
    ],
    tier3: [
      "She's in summer clothes.",
      "Light casual outfit.",
      "Dressed for warm weather.",
    ],
  },
  {
    id: "casual_tomboy",
    category: "casual",
    suitableEnvironments: ["high_street", "park", "mall", "campus", "transit"],
    tier1: [
      "Oversized graphic tee tucked into baggy khaki cargo pants with a thick black belt. Platform Converse and a snapback cap worn backwards.",
      "Dark blue dickies with a white baby tee and a vintage windbreaker. Old school Vans and a chain wallet. Silver rings on most fingers.",
      "Black cargo shorts with a oversized basketball jersey over a long-sleeve white tee. High-top Jordans and small hoop earrings.",
    ],
    tier2: [
      "Graphic tee with cargo pants and sneakers.",
      "Dickies with a baby tee and windbreaker.",
      "Cargo shorts with a basketball jersey.",
    ],
    tier3: [
      "She's in casual sporty clothes.",
      "Tomboyish outfit.",
      "Relaxed streetwear.",
    ],
  },
  {
    id: "casual_cozy_layers",
    category: "casual",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "campus"],
    tier1: [
      "Oversized cream cable-knit sweater over black leggings and Ugg boots. Hair down, minimal makeup, gold necklace with a small initial pendant.",
      "Rust-colored corduroy overshirt as a jacket over a white tee and vintage Levi's. Brown leather Chelsea boots and a simple gold chain.",
      "Olive green utility jacket over a striped long-sleeve tee and high-waisted dark jeans. Brown leather ankle boots and a beanie.",
    ],
    tier2: [
      "Oversized sweater with leggings and boots.",
      "Corduroy overshirt with jeans.",
      "Utility jacket layered over a striped tee.",
    ],
    tier3: [
      "Cozy casual outfit.",
      "Layered clothes.",
      "Relaxed look.",
    ],
  },

  // ============================================================================
  // ATHLEISURE (Gym-adjacent, sporty daily wear)
  // ============================================================================
  {
    id: "athleisure_pilates_princess",
    category: "athleisure",
    suitableEnvironments: ["high_street", "mall", "coffee_shop", "gym", "park"],
    tier1: [
      "Matching dusty pink Lululemon set - high-waisted leggings and a cropped tank. White Hokas and a clean white baseball cap. Stanley tumbler in hand.",
      "Sage green Alo Yoga set with a cream colored cropped hoodie over top. White New Balance and a small crossbody bag. Hair in a slicked-back bun.",
      "Black flared leggings with a cream ribbed sports bra and an oversized grey zip-up. Clean white Nikes and gold huggie earrings.",
    ],
    tier2: [
      "Matching workout set in a soft color with nice sneakers.",
      "Yoga clothes with a cropped hoodie.",
      "Flared leggings with a sports bra and zip-up.",
    ],
    tier3: [
      "She's in workout clothes.",
      "Athletic wear.",
      "Gym outfit.",
    ],
    hooks: ["Her matching workout set", "The Stanley cup she's carrying"],
  },
  {
    id: "athleisure_post_gym",
    category: "athleisure",
    suitableEnvironments: ["high_street", "mall", "coffee_shop", "gym"],
    tier1: [
      "Black Nike leggings with a white racerback tank, slightly sweaty. Grey zip-up hoodie unzipped, gym bag over her shoulder, hair in a high ponytail.",
      "Dark blue Under Armour compression tights with a matching sports bra visible under a sheer mesh tank. AirPods in, towel around her neck.",
      "Burgundy Gymshark leggings with a black crop top and a denim jacket thrown over. Nike Metcons and a blender bottle in her gym bag.",
    ],
    tier2: [
      "Workout leggings and tank with a gym bag.",
      "Compression tights with a sports bra showing.",
      "Athletic set with a jacket over top.",
    ],
    tier3: [
      "She looks like she just worked out.",
      "In gym clothes.",
      "Athletic outfit.",
    ],
  },
  {
    id: "athleisure_running_errands",
    category: "athleisure",
    suitableEnvironments: ["high_street", "mall", "coffee_shop", "park"],
    tier1: [
      "Grey sweatpants tucked into cream Ugg Tazz slippers, with a tight white long-sleeve and a puffy black vest. Hair clipped up messily.",
      "Black biker shorts with an oversized vintage Nike crewneck that hits her thighs. White platform Converses and a claw clip. Small gold studs.",
      "Olive joggers with a white cropped tank and an open cream button-up as a light layer. Beat-up white Sambas and a small crossbody.",
    ],
    tier2: [
      "Sweatpants with a fitted top and puffy vest.",
      "Biker shorts with an oversized vintage sweatshirt.",
      "Joggers with a cropped tank and button-up.",
    ],
    tier3: [
      "She's in comfortable athletic wear.",
      "Sporty casual clothes.",
      "Athleisure outfit.",
    ],
  },
  {
    id: "athleisure_tennis_club",
    category: "athleisure",
    suitableEnvironments: ["high_street", "mall", "coffee_shop", "park", "upscale_area"],
    tier1: [
      "White pleated tennis skirt with a fitted navy blue polo. Clean white Tretorns and a white visor. Thin gold chain and small diamond studs.",
      "Cream cable-knit tennis sweater over a white athletic dress. White leather sneakers and a tennis bag. Hair in a neat low ponytail with a ribbon.",
      "Mint green athletic skort with a matching zip-up jacket over a white sports bra. White New Balances and a simple tennis bracelet.",
    ],
    tier2: [
      "Tennis skirt with a polo and clean white sneakers.",
      "Athletic dress with a cable-knit sweater.",
      "Matching athletic set with a tennis skort.",
    ],
    tier3: [
      "She's in tennis clothes.",
      "Athletic outfit.",
      "Sporty clothes.",
    ],
  },
  {
    id: "athleisure_yoga_glow",
    category: "athleisure",
    suitableEnvironments: ["high_street", "coffee_shop", "park"],
    tier1: [
      "High-waisted burgundy leggings with a matching long-line sports bra, yoga mat bag over her shoulder. Hair flowing, no makeup, crystal pendant necklace.",
      "Loose olive green linen pants over black leggings with a fitted black tank. Barefoot sandals and multiple beaded bracelets. Carrying a yoga mat.",
      "Dusty blue flowy yoga pants with a cream racerback tank. Simple wooden bead mala around her wrist. Natural, dewy skin and a canvas tote.",
    ],
    tier2: [
      "Matching yoga set with a mat bag.",
      "Flowy pants with a fitted tank, carrying a yoga mat.",
      "Loose yoga outfit with natural jewelry.",
    ],
    tier3: [
      "She looks like she does yoga.",
      "In workout clothes.",
      "Athletic outfit.",
    ],
  },

  // ============================================================================
  // BOHEMIAN (Artsy, flowy, unique)
  // ============================================================================
  {
    id: "bohemian_free_spirit",
    category: "bohemian",
    suitableEnvironments: ["high_street", "park", "coffee_shop", "mall"],
    tier1: [
      "Flowing rust-colored maxi dress with an intricate paisley print, brown leather gladiator sandals, and layers of gold coin necklaces. Rings on every finger.",
      "Cream crochet top over a burnt orange bralette, with wide-leg faded jeans and tan suede fringe boots. Turquoise jewelry and braided leather bracelets.",
      "Patchwork denim skirt to mid-calf with a white peasant blouse and brown leather sandals. Multiple ear piercings with mismatched earrings and a woven belt.",
    ],
    tier2: [
      "Flowy printed maxi dress with sandals and layered jewelry.",
      "Crochet top with wide-leg jeans and fringe boots.",
      "Patchwork skirt with a peasant blouse.",
    ],
    tier3: [
      "She's in a flowy bohemian outfit.",
      "Artistic, layered clothing.",
      "Free-spirited style.",
    ],
    hooks: ["Her layered jewelry", "The handmade look of her outfit"],
  },
  {
    id: "bohemian_festival_vibes",
    category: "bohemian",
    suitableEnvironments: ["high_street", "park", "coffee_shop"],
    tier1: [
      "Flowing white kaftan with gold embroidery over denim cutoffs. Brown leather sandals with ankle straps, stacked gold bangles, and a flower tucked behind her ear.",
      "Tie-dye maxi skirt in sunset colors with a cropped white crochet halter top. Barefoot sandals, layered necklaces, and temporary gold tattoos on her arms.",
      "Embroidered floral romper in dusty blue with a tan suede fringe vest. Brown ankle boots and a crossbody made of woven fabric. Feather earrings.",
    ],
    tier2: [
      "Embroidered kaftan over shorts with gold jewelry.",
      "Tie-dye skirt with a crochet top.",
      "Floral romper with a fringe vest.",
    ],
    tier3: [
      "She's in festival-style clothes.",
      "Bohemian outfit.",
      "Flowy artistic clothing.",
    ],
  },
  {
    id: "bohemian_earth_mama",
    category: "bohemian",
    suitableEnvironments: ["high_street", "park", "coffee_shop", "mall"],
    tier1: [
      "Olive green linen wide-leg pants with a cream silk wrap top. Brown leather clogs and a macramé plant hanger converted into a bag. Crystal pendant on a leather cord.",
      "Long tiered rust skirt with a fitted cream turtleneck and a chunky knit cardigan. Brown leather boots and a basket bag. Amber beaded necklace.",
      "Brown velvet flared pants with an embroidered cream tunic. Platform sandals and oversized gold hoops. Woven belt with wooden beads.",
    ],
    tier2: [
      "Linen pants with a wrap top and earthy accessories.",
      "Tiered skirt with a turtleneck and cardigan.",
      "Velvet flares with an embroidered top.",
    ],
    tier3: [
      "She's in earthy, natural clothing.",
      "Bohemian style.",
      "Artsy outfit.",
    ],
  },
  {
    id: "bohemian_moroccan_inspired",
    category: "bohemian",
    suitableEnvironments: ["high_street", "coffee_shop", "upscale_area"],
    tier1: [
      "Burnt orange embroidered tunic dress with gold thread, tan leather babouche slippers, and stacked gold cuff bracelets. Kohl-lined eyes and dangly coin earrings.",
      "Wide-leg printed palazzo pants in deep teal with a cream off-shoulder top. Gold metallic sandals and layered pendant necklaces. Henna-style jewelry.",
      "Flowing cobalt blue caftan with silver embroidery over white linen pants. Silver ankle bracelets and a vintage silver cuff. Dramatic silver earrings.",
    ],
    tier2: [
      "Embroidered tunic dress with gold accessories.",
      "Printed palazzo pants with an off-shoulder top.",
      "Flowing caftan with silver jewelry.",
    ],
    tier3: [
      "She's in ethnic-inspired clothing.",
      "Bohemian outfit.",
      "Flowy patterned clothes.",
    ],
  },
  {
    id: "bohemian_vintage_romantic",
    category: "bohemian",
    suitableEnvironments: ["high_street", "coffee_shop", "park"],
    tier1: [
      "Vintage floral midi dress with puff sleeves and a square neckline. Brown leather Mary Janes and a velvet ribbon choker. Pearl drop earrings.",
      "High-waisted cream lace skirt with a dusty pink silk blouse. Tan leather pointed flats and an antique locket on a gold chain. Hair in loose waves.",
      "Flowing sage green wrap dress with delicate white florals. Brown leather sandals and a straw hat. Vintage pearl bracelet and a basket bag.",
    ],
    tier2: [
      "Vintage floral dress with Mary Janes.",
      "Lace skirt with a silk blouse and antique jewelry.",
      "Wrap dress with a straw hat and basket bag.",
    ],
    tier3: [
      "She's in a romantic vintage style.",
      "Feminine flowy outfit.",
      "Bohemian dress.",
    ],
  },

  // ============================================================================
  // MINIMALIST (Clean, simple, neutral)
  // ============================================================================
  {
    id: "minimalist_scandinavian",
    category: "minimalist",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "upscale_area"],
    tier1: [
      "Oversized cream cashmere sweater with black straight-leg trousers and white leather sneakers. No jewelry except a thin gold watch. Hair in a neat low bun.",
      "Camel wool coat over a white turtleneck and charcoal wide-leg pants. Black leather loafers and a structured black tote. Simple gold studs.",
      "Grey wool turtleneck dress hitting mid-calf with black leather ankle boots. Minimal gold rings and a black leather crossbody. Clean, natural makeup.",
    ],
    tier2: [
      "Oversized sweater with tailored trousers and white sneakers.",
      "Camel coat over a turtleneck with loafers.",
      "Knit dress with leather boots.",
    ],
    tier3: [
      "She's in simple, clean clothes.",
      "Minimalist outfit.",
      "Understated style.",
    ],
    hooks: ["The quality of her clothes", "Her effortlessly put-together look"],
  },
  {
    id: "minimalist_all_black",
    category: "minimalist",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "upscale_area", "transit"],
    tier1: [
      "Head-to-toe black: silk blouse tucked into high-waisted wide-leg trousers, pointed-toe ankle boots, and a structured leather bag. Single silver ring.",
      "Black cashmere crewneck with black cigarette pants and black leather loafers. Small silver hoops and a black canvas tote. Hair slicked back.",
      "Black turtleneck bodysuit with black tailored culottes and black Maison Margiela Tabis. No jewelry. Architectural black sunglasses.",
    ],
    tier2: [
      "All-black silk blouse and wide-leg trousers.",
      "Black cashmere with black pants and loafers.",
      "Black turtleneck with culottes and designer shoes.",
    ],
    tier3: [
      "She's in all black.",
      "Simple dark outfit.",
      "Black clothes.",
    ],
  },
  {
    id: "minimalist_cream_tones",
    category: "minimalist",
    suitableEnvironments: ["high_street", "coffee_shop", "upscale_area"],
    tier1: [
      "Cream ribbed knit set - cropped long-sleeve and matching high-waisted wide-leg pants. Tan leather mules and a woven cream bag. Dainty gold necklace.",
      "Off-white linen blazer over a matching linen crop top and high-waisted trousers. Tan leather sandals and small gold hoops. Hair down, effortless.",
      "Beige cashmere wrap cardigan over a white silk camisole and ecru wide-leg pants. Cream leather ballet flats and a structured straw bag.",
    ],
    tier2: [
      "Matching cream knit set with tan accessories.",
      "White linen blazer with matching separates.",
      "Cashmere cardigan with silk and neutral tones.",
    ],
    tier3: [
      "She's in neutral tones.",
      "Cream-colored outfit.",
      "Simple light clothes.",
    ],
  },
  {
    id: "minimalist_architectural",
    category: "minimalist",
    suitableEnvironments: ["high_street", "coffee_shop", "upscale_area"],
    tier1: [
      "Structured white shirt with exaggerated collar tucked into black high-waisted trousers with an asymmetric hem. Black pointed mules and geometric silver earrings.",
      "Grey oversized blazer worn as a dress, belted at the waist with a thick black leather belt. Black thigh-high boots and no visible jewelry.",
      "White pleated midi skirt with a black mock-neck sleeveless top. White leather boots and a single statement silver cuff.",
    ],
    tier2: [
      "Structured white shirt with unusual trousers.",
      "Oversized blazer worn as a dress with boots.",
      "Pleated skirt with a sleek top and statement jewelry.",
    ],
    tier3: [
      "She's in interesting minimal clothes.",
      "Clean structured outfit.",
      "Simple but architectural.",
    ],
  },
  {
    id: "minimalist_japanese_inspired",
    category: "minimalist",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "upscale_area"],
    tier1: [
      "Oversized navy linen shirt worn as a tunic over loose black pants. Black leather slides and a small structured black bag. No jewelry, hair tied back simply.",
      "White boxy cotton top with dramatic dropped shoulders over pleated wide-leg pants in charcoal. Black leather sandals and a simple leather pouch.",
      "Black deconstructed blazer over a white asymmetric top and black pleated hakama-style pants. Black leather boots and a single silver ear cuff.",
    ],
    tier2: [
      "Oversized linen tunic over loose pants.",
      "Boxy top with dramatic pleated pants.",
      "Deconstructed blazer with unusual silhouette.",
    ],
    tier3: [
      "She's in loose, minimal clothes.",
      "Clean simple outfit.",
      "Understated style.",
    ],
  },

  // ============================================================================
  // TRENDY (Current fashion, social media influenced)
  // ============================================================================
  {
    id: "trendy_instagram_influencer",
    category: "trendy",
    suitableEnvironments: ["high_street", "mall", "coffee_shop", "upscale_area"],
    tier1: [
      "Oversized blazer in a bold chartreuse over a white crop top and baggy low-rise jeans. Chunky white platform sneakers and gold layered necklaces. Phone in hand.",
      "Leather trench coat in butter yellow over a black bodysuit and matching leather pants. Pointed-toe boots and oversized gold hoops. Perfect blowout.",
      "Mint green matching set - oversized button-up and pleated mini skirt. White chunky loafers and a micro designer bag. Statement sunglasses.",
    ],
    tier2: [
      "Bold colored blazer with a crop top and baggy jeans.",
      "Statement leather trench with matching pieces.",
      "Matching set in a trendy color with designer accessories.",
    ],
    tier3: [
      "She's in trendy, fashionable clothes.",
      "Very put-together outfit.",
      "Fashion-forward style.",
    ],
    hooks: ["Her bold color choice", "The way her outfit looks curated"],
  },
  {
    id: "trendy_quiet_luxury",
    category: "trendy",
    suitableEnvironments: ["high_street", "coffee_shop", "upscale_area"],
    tier1: [
      "Oversized beige cashmere sweater with wide-leg cream trousers and tan suede loafers. Small gold studs and a Bottega-style woven bag. Effortlessly expensive-looking.",
      "Camel hair coat over a cream silk shirt and chocolate brown tailored pants. Brown leather loafers and a thin gold bracelet. Hair in a low chignon.",
      "Navy cashmere cardigan worn buttoned as a top, tucked into ecru high-waisted trousers. Brown leather ballet flats and a simple gold chain.",
    ],
    tier2: [
      "Expensive-looking cashmere with tailored trousers.",
      "Camel coat over silk with understated accessories.",
      "Quality cardigan with tailored pants.",
    ],
    tier3: [
      "She's in expensive-looking clothes.",
      "Understated luxury.",
      "Classic outfit.",
    ],
  },
  {
    id: "trendy_y2k_revival",
    category: "trendy",
    suitableEnvironments: ["high_street", "mall", "coffee_shop", "campus"],
    tier1: [
      "Low-rise baggy jeans with a tiny cropped baby tee and platform flip-flops. Butterfly clips in her hair and a mini shoulder bag. Frosted lip gloss.",
      "Velour tracksuit in hot pink with a rhinestone zipper. Chunky white sneakers and small hoop earrings. Hair in space buns with face-framing pieces.",
      "Pleated mini skirt with a fitted polo shirt and knee-high boots. Chunky silver jewelry and a baguette bag. Heavy eyeliner and glossy lips.",
    ],
    tier2: [
      "Low-rise jeans with a tiny top and platforms.",
      "Velour tracksuit with chunky sneakers.",
      "Mini skirt with polo shirt and boots.",
    ],
    tier3: [
      "She's in retro-trendy clothes.",
      "Y2K-inspired outfit.",
      "Trendy throwback style.",
    ],
  },
  {
    id: "trendy_coastal_grandmother",
    category: "trendy",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "park", "beach"],
    tier1: [
      "White linen shirt with the sleeves rolled, tucked into cream high-waisted linen shorts. Brown leather sandals and a straw tote. Reading glasses on a chain.",
      "Cream cable-knit sweater draped over shoulders with a white cotton dress. Tan leather espadrilles and a basket bag. Classic pearl studs and a gold watch.",
      "Navy and white striped boat-neck top with cream linen wide-leg pants. White leather sneakers and a navy canvas bag. Simple gold jewelry.",
    ],
    tier2: [
      "White linen shirt with cream shorts and a straw bag.",
      "Cable-knit sweater with a white dress.",
      "Striped top with linen pants and classic accessories.",
    ],
    tier3: [
      "She's in relaxed elegant clothes.",
      "Coastal style outfit.",
      "Classic casual wear.",
    ],
  },
  {
    id: "trendy_mob_wife_aesthetic",
    category: "trendy",
    suitableEnvironments: ["high_street", "mall", "coffee_shop", "upscale_area"],
    tier1: [
      "Oversized leopard print faux fur coat over all black - black turtleneck and black leather pants. Black pointed boots and gold chunky jewelry. Red lipstick.",
      "Burgundy velvet blazer over a black lace camisole and black wide-leg pants. Gold chain belt and stiletto boots. Dramatic gold earrings.",
      "Black bodycon dress under a long camel fur coat. Black patent leather heels and a quilted leather bag. Heavy gold jewelry and dark sunglasses.",
    ],
    tier2: [
      "Leopard coat over all black with gold jewelry.",
      "Velvet blazer with lace and wide-leg pants.",
      "Bodycon dress under a fur coat with heels.",
    ],
    tier3: [
      "She's in glamorous dark clothes.",
      "Bold dressy outfit.",
      "Statement style.",
    ],
  },

  // ============================================================================
  // EDGY (Dark, alternative, bold)
  // ============================================================================
  {
    id: "edgy_leather_rebel",
    category: "edgy",
    suitableEnvironments: ["high_street", "mall", "coffee_shop", "transit"],
    tier1: [
      "Worn-in black leather jacket covered in band pins over a Nirvana tee and ripped black skinny jeans. Chunky Doc Martens and silver chains. Smudged black eyeliner.",
      "Black leather biker vest over a sheer black long-sleeve with a visible black bra. Black cargo pants and platform boots. Multiple silver rings and a choker.",
      "Oversized vintage leather jacket over a cropped band tee and black mom jeans with chain detail. Beat-up Converse and multiple ear piercings.",
    ],
    tier2: [
      "Leather jacket with band pins over ripped jeans.",
      "Leather vest with sheer top and cargo pants.",
      "Vintage leather jacket with chain details.",
    ],
    tier3: [
      "She's in dark alternative clothes.",
      "Edgy rock-inspired outfit.",
      "Dark leather and black.",
    ],
    hooks: ["Her band pins", "The worn-in look of her jacket"],
  },
  {
    id: "edgy_goth_lite",
    category: "edgy",
    suitableEnvironments: ["high_street", "mall", "coffee_shop"],
    tier1: [
      "Black velvet mini dress with long mesh sleeves. Black platform boots to the knee and silver pentagram earrings. Burgundy lipstick and pale foundation.",
      "Black lace corset top over a long black mesh skirt. Chunky black boots and a spiked choker. Black nail polish and silver rings.",
      "Oversized black hoodie dress with fishnet tights and chunky platform sneakers. Multiple black rubber bracelets and a small bat pendant necklace.",
    ],
    tier2: [
      "Black velvet dress with mesh sleeves and platform boots.",
      "Lace corset with mesh skirt and statement accessories.",
      "Oversized hoodie dress with fishnets.",
    ],
    tier3: [
      "She's in dark goth-inspired clothes.",
      "All black with edgy details.",
      "Alternative style outfit.",
    ],
  },
  {
    id: "edgy_punk_revival",
    category: "edgy",
    suitableEnvironments: ["high_street", "mall", "coffee_shop", "transit"],
    tier1: [
      "Plaid bondage pants with a cropped Dead Kennedys tee and a studded belt. Black combat boots and a safety pin through her ear. Partially shaved head.",
      "Black leather mini skirt with a ripped fishnet top over a black bra. Tall platform boots with buckles and a spiked collar. Heavy black eyeliner.",
      "Tartan pants with suspenders hanging down over a tight black tank. Doc Martens with colored laces and a chain wallet. Multiple facial piercings.",
    ],
    tier2: [
      "Plaid bondage pants with a band tee and studs.",
      "Leather skirt with fishnet and platform boots.",
      "Tartan pants with suspenders and chains.",
    ],
    tier3: [
      "She's in punk-style clothes.",
      "Edgy alternative outfit.",
      "Dark rebellious style.",
    ],
  },
  {
    id: "edgy_dark_romantic",
    category: "edgy",
    suitableEnvironments: ["high_street", "coffee_shop", "upscale_area"],
    tier1: [
      "Black silk slip dress with a black leather jacket and black ankle boots. Silver snake earrings and multiple silver rings. Dark red lipstick, hair loose and wavy.",
      "Black lace midi dress with a fitted black blazer. Black pointed-toe stilettos and a black clutch with silver hardware. Dark smoky eye and burgundy nails.",
      "Black velvet cropped blazer over a black bustier and high-waisted black trousers. Black patent heels and a choker with a pendant. Dramatic dark makeup.",
    ],
    tier2: [
      "Silk slip dress with leather jacket.",
      "Lace dress with fitted blazer.",
      "Velvet blazer over bustier and trousers.",
    ],
    tier3: [
      "She's in dark elegant clothes.",
      "Edgy but feminine outfit.",
      "Dark dressy style.",
    ],
  },
  {
    id: "edgy_grunge_core",
    category: "edgy",
    suitableEnvironments: ["high_street", "mall", "coffee_shop", "campus"],
    tier1: [
      "Oversized flannel in dark green and black over a white baby tee and ripped baggy jeans. Beat-up Converse and a beanie. Silver hoop in her nose.",
      "Faded black oversized hoodie over a slip dress with combat boots. Messy hair and smudged makeup. Silver thumb ring and a frayed tote bag.",
      "Brown oversized cardigan over a vintage band tee and black ripped jeans. Platform Docs and layered silver chains. Dark circles like she doesn't sleep.",
    ],
    tier2: [
      "Oversized flannel over a baby tee and ripped jeans.",
      "Hoodie over a slip dress with combat boots.",
      "Cardigan with band tee and ripped jeans.",
    ],
    tier3: [
      "She's in grunge-style clothes.",
      "Layered casual dark outfit.",
      "Alternative relaxed style.",
    ],
  },

  // ============================================================================
  // PREPPY (Classic, collegiate, polished)
  // ============================================================================
  {
    id: "preppy_ivy_league",
    category: "preppy",
    suitableEnvironments: ["high_street", "coffee_shop", "campus", "mall"],
    tier1: [
      "Navy cable-knit sweater over a white oxford shirt with the collar popped, tucked into khaki chinos. Brown leather loafers with no socks. Pearl studs and a headband.",
      "Forest green blazer over a cream cricket sweater and navy pleated skirt. Brown leather penny loafers and a ribbon in her hair. Simple gold jewelry.",
      "Burgundy V-neck sweater with a white button-up underneath and grey flannel trousers. Brown suede brogues and a leather satchel. Tortoiseshell glasses.",
    ],
    tier2: [
      "Cable-knit sweater over an oxford with chinos.",
      "Blazer over a cricket sweater and pleated skirt.",
      "V-neck sweater with a button-up and trousers.",
    ],
    tier3: [
      "She's in preppy collegiate clothes.",
      "Classic style outfit.",
      "Traditional polished look.",
    ],
    hooks: ["Her classic preppy style", "The quality of her accessories"],
  },
  {
    id: "preppy_country_club",
    category: "preppy",
    suitableEnvironments: ["high_street", "coffee_shop", "upscale_area", "park"],
    tier1: [
      "White polo dress with navy trim and white leather sneakers. A navy sweater tied around her shoulders and a tennis bracelet. Hair in a sleek low ponytail.",
      "Pastel pink cashmere sweater with a white pleated tennis skirt and Jack Purcells. Small pearl necklace and gold studs. Natural makeup.",
      "Navy and white striped shirt dress with a brown leather belt. Brown leather sandals and a straw bag. Gold anchor earrings and a navy headband.",
    ],
    tier2: [
      "Polo dress with a sweater tied around shoulders.",
      "Cashmere sweater with a tennis skirt.",
      "Striped shirt dress with a belt.",
    ],
    tier3: [
      "She's in country club style clothes.",
      "Polished casual outfit.",
      "Classic preppy.",
    ],
  },
  {
    id: "preppy_new_england",
    category: "preppy",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "park"],
    tier1: [
      "Navy peacoat over a cream fisherman sweater and dark straight-leg jeans. Brown leather boots and a plaid scarf. Simple gold hoops.",
      "Camel hair coat over a red tartan dress with black tights. Black leather riding boots and a structured leather bag. Pearl earrings.",
      "Green quilted vest over a white turtleneck and corduroys in burnt orange. Brown leather duck boots and a plaid headband.",
    ],
    tier2: [
      "Peacoat over a fisherman sweater and jeans.",
      "Camel coat over a tartan dress with boots.",
      "Quilted vest with a turtleneck and corduroys.",
    ],
    tier3: [
      "She's in New England-style clothes.",
      "Classic layered outfit.",
      "Traditional preppy.",
    ],
  },
  {
    id: "preppy_modern_prep",
    category: "preppy",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "campus"],
    tier1: [
      "Oversized men's button-up in light blue tucked into high-waisted navy shorts. White Vejas and a canvas tote. Gold signet ring and small diamond studs.",
      "Cream cashmere cardigan buttoned up as a top with a pleated grey midi skirt. White sneakers and a structured canvas bag. Tortoiseshell hair clip.",
      "Navy blazer over a white Breton stripe shirt and high-waisted wide-leg jeans. White leather sneakers and gold hoop earrings. Hair half-up.",
    ],
    tier2: [
      "Oversized button-up with shorts and white sneakers.",
      "Cardigan as a top with a pleated skirt.",
      "Blazer over a stripe shirt with wide-leg jeans.",
    ],
    tier3: [
      "She's in modern preppy clothes.",
      "Polished casual outfit.",
      "Clean classic style.",
    ],
  },
  {
    id: "preppy_equestrian",
    category: "preppy",
    suitableEnvironments: ["high_street", "coffee_shop", "upscale_area", "park"],
    tier1: [
      "Fitted navy blazer with gold buttons over a cream silk blouse and tan riding pants. Tall brown leather boots and a Hermès-style scarf. Gold snaffle bit bracelet.",
      "Hunter green cable-knit sweater with a white collared shirt underneath and beige jodhpurs. Brown leather ankle boots and a leather belt. Simple gold studs.",
      "Tan suede jacket over a navy turtleneck and dark brown riding-style pants. Knee-high brown leather boots and a structured leather bag.",
    ],
    tier2: [
      "Navy blazer with riding pants and tall boots.",
      "Cable-knit with jodhpurs and leather accessories.",
      "Suede jacket with riding-style pants.",
    ],
    tier3: [
      "She's in equestrian-style clothes.",
      "Classic riding-inspired outfit.",
      "Polished traditional style.",
    ],
  },

  // ============================================================================
  // RELAXED (Comfortable, low-effort)
  // ============================================================================
  {
    id: "relaxed_cozy_sunday",
    category: "relaxed",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "park"],
    tier1: [
      "Oversized grey crewneck sweatshirt over black leggings and cream Ugg boots. Hair in a messy topknot, no makeup. Small gold studs barely visible.",
      "Baggy cream cashmere hoodie over bike shorts with fuzzy slippers that she somehow made work outside. Hair air-drying in waves.",
      "Oversized vintage tee half-tucked into grey sweatpants with Nike slides. Scrunchie on her wrist, AirPods in, clearly just woke up.",
    ],
    tier2: [
      "Oversized sweatshirt with leggings and Uggs.",
      "Baggy hoodie with bike shorts and slippers.",
      "Vintage tee with sweatpants and slides.",
    ],
    tier3: [
      "She's in very comfortable clothes.",
      "Super relaxed outfit.",
      "Cozy casual wear.",
    ],
    hooks: ["She looks incredibly comfortable", "Her cozy Sunday vibe"],
  },
  {
    id: "relaxed_work_from_home",
    category: "relaxed",
    suitableEnvironments: ["high_street", "coffee_shop", "mall"],
    tier1: [
      "Soft knit matching set in sage green - oversized sweater and wide-leg pants. White slippers and a messy bun. Still has her blue light glasses on.",
      "Cream ribbed lounge set with a long cardigan over top. Fuzzy socks with sneakers somehow. Coffee cup in hand, laptop bag over shoulder.",
      "Oversized flannel shirt as a jacket over a white tank and grey joggers. Birkenstock clogs and reading glasses pushed up on her head.",
    ],
    tier2: [
      "Matching knit set with slippers.",
      "Lounge set with a long cardigan.",
      "Flannel over a tank with joggers.",
    ],
    tier3: [
      "She's in comfy work-from-home clothes.",
      "Very casual outfit.",
      "Relaxed comfortable clothes.",
    ],
  },
  {
    id: "relaxed_soft_girl",
    category: "relaxed",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "campus"],
    tier1: [
      "Oversized cream cardigan worn over a tiny white crop top and light wash baggy jeans. White platform sneakers and a claw clip. Minimal gold jewelry.",
      "Pastel pink oversized sweater tucked slightly into mom jeans. White Air Force 1s and small pearl earrings. Hair down with a center part.",
      "Light blue cropped hoodie with high-waisted cream sweats. Clean white Converse and a simple gold necklace. Dewy, barely-there makeup.",
    ],
    tier2: [
      "Oversized cardigan with a crop top and baggy jeans.",
      "Pastel sweater with mom jeans and sneakers.",
      "Cropped hoodie with cream sweats.",
    ],
    tier3: [
      "She's in soft pastel clothes.",
      "Casual comfortable outfit.",
      "Relaxed cute style.",
    ],
  },
  {
    id: "relaxed_european_holiday",
    category: "relaxed",
    suitableEnvironments: ["high_street", "coffee_shop", "park", "beach"],
    tier1: [
      "White linen pants rolled at the ankle with a striped blue and white oversized shirt. Brown leather sandals and a woven beach tote. Hair wavy from the sea.",
      "Cream flowy maxi dress with thin straps and espadrilles. Straw hat and a basket bag. Gold anklet and natural tan.",
      "Light blue linen shorts with a white cotton tank and flat brown leather sandals. Canvas bag and tortoiseshell sunglasses. Effortlessly sun-kissed.",
    ],
    tier2: [
      "Linen pants with a striped shirt and sandals.",
      "Flowy maxi dress with espadrilles.",
      "Linen shorts with a tank and flat sandals.",
    ],
    tier3: [
      "She's in relaxed vacation clothes.",
      "Breezy casual outfit.",
      "Comfortable travel wear.",
    ],
  },
  {
    id: "relaxed_normcore",
    category: "relaxed",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "park", "transit"],
    tier1: [
      "Perfectly fitting plain grey tee tucked into mid-wash straight-leg jeans. White New Balance 550s and a simple canvas tote. No jewelry, clean nails.",
      "Navy blue crewneck sweatshirt with khaki chinos and white Reeboks. Simple ponytail and no makeup. She somehow looks incredibly put-together.",
      "White oxford shirt with the sleeves rolled over a plain white tee and faded blue jeans. Beat-up white sneakers and a simple leather watch.",
    ],
    tier2: [
      "Plain grey tee with straight-leg jeans.",
      "Crewneck sweatshirt with chinos.",
      "Oxford shirt over a tee with faded jeans.",
    ],
    tier3: [
      "She's in very simple clothes.",
      "Basic casual outfit.",
      "Plain everyday wear.",
    ],
  },

  // ============================================================================
  // GLAMOROUS (Evening, dressed up)
  // ============================================================================
  {
    id: "glamorous_date_night",
    category: "glamorous",
    suitableEnvironments: ["high_street", "upscale_area", "nightlife"],
    tier1: [
      "Fitted black mini dress with a deep V-neck and strappy black heels. Gold drop earrings and a clutch with gold hardware. Hair blown out, red lipstick.",
      "Emerald green satin slip dress with a black blazer draped over her shoulders. Black stilettos and diamond studs. Smoky eye and natural lip color.",
      "Burgundy velvet wrap dress with beige heels. Gold cuff bracelet and small hoops. Hair in loose Hollywood waves.",
    ],
    tier2: [
      "Black mini dress with heels and gold accessories.",
      "Satin slip dress with a blazer and heels.",
      "Velvet wrap dress with heels and gold jewelry.",
    ],
    tier3: [
      "She's dressed up for evening.",
      "Nice dressy outfit.",
      "Going-out clothes.",
    ],
    hooks: ["She looks like she's going somewhere nice", "Her elegant evening look"],
  },
  {
    id: "glamorous_cocktail_party",
    category: "glamorous",
    suitableEnvironments: ["high_street", "upscale_area", "nightlife"],
    tier1: [
      "Sequined black midi dress with a high slit and strappy silver heels. Crystal drop earrings and a silver clutch. Hair in a sleek updo.",
      "Off-shoulder red dress hitting above the knee with black patent heels. Statement gold earrings and a black evening bag. Bold red lip.",
      "Navy blue one-shoulder gown with a thigh-high slit and silver stilettos. Diamond tennis bracelet and small studs. Hair swept to one side.",
    ],
    tier2: [
      "Sequined dress with silver heels and crystals.",
      "Red off-shoulder dress with statement jewelry.",
      "One-shoulder gown with diamonds.",
    ],
    tier3: [
      "She's in cocktail attire.",
      "Dressy evening outfit.",
      "Formal going-out clothes.",
    ],
  },
  {
    id: "glamorous_power_glam",
    category: "glamorous",
    suitableEnvironments: ["high_street", "upscale_area", "nightlife"],
    tier1: [
      "White fitted blazer dress with gold buttons and beige platform heels. Gold chunky chain necklace and matching bracelet. Hair sleek, makeup flawless.",
      "Black high-waisted wide-leg trousers with a gold sequined halter top. Black pointed stilettos and gold hoop earrings. Red lips and contoured cheekbones.",
      "All-white pantsuit with a black lace bralette showing. Black patent heels and dramatic gold earrings. Hair in a high ponytail.",
    ],
    tier2: [
      "White blazer dress with gold accessories.",
      "Sequined top with tailored trousers and heels.",
      "White pantsuit with lace and gold details.",
    ],
    tier3: [
      "She's in glamorous power clothes.",
      "Bold dressy outfit.",
      "Statement evening wear.",
    ],
  },
  {
    id: "glamorous_old_hollywood",
    category: "glamorous",
    suitableEnvironments: ["upscale_area", "nightlife"],
    tier1: [
      "Floor-length black satin gown with a low back and elbow-length gloves. Diamond earrings and a vintage-style clutch. Classic red lip and pin-curled hair.",
      "Champagne-colored silk dress with delicate beading, draped elegantly. Gold strappy heels and pearl drop earrings. Hair in smooth finger waves.",
      "Deep red velvet gown with a sweetheart neckline and a fur stole. Black heels and vintage diamond jewelry. Old Hollywood glam makeup.",
    ],
    tier2: [
      "Floor-length satin gown with elegant accessories.",
      "Silk dress with beading and pearls.",
      "Velvet gown with fur and vintage jewelry.",
    ],
    tier3: [
      "She's in an elegant gown.",
      "Very formal dress.",
      "Red carpet style outfit.",
    ],
  },
  {
    id: "glamorous_club_ready",
    category: "glamorous",
    suitableEnvironments: ["high_street", "nightlife"],
    tier1: [
      "Tight black leather mini skirt with a sparkling silver halter top. Platform heels and dangly crystal earrings. Glitter eyeshadow and glossy lips.",
      "Neon pink bodycon mini dress with cutouts and clear platform heels. Layered gold chains and hoop earrings. Bold makeup and high ponytail.",
      "Mesh black dress over a matching bra and shorts set. Strappy black heels and silver body chain. Dramatic eye makeup and slicked-back hair.",
    ],
    tier2: [
      "Leather skirt with a sparkly top and platform heels.",
      "Neon bodycon dress with platforms and gold jewelry.",
      "Mesh dress with strappy heels.",
    ],
    tier3: [
      "She's dressed for clubbing.",
      "Going-out outfit.",
      "Party clothes.",
    ],
  },

  // ============================================================================
  // VINTAGE (Retro-inspired)
  // ============================================================================
  {
    id: "vintage_50s_pinup",
    category: "vintage",
    suitableEnvironments: ["high_street", "coffee_shop", "park", "mall"],
    tier1: [
      "Cherry red halter dress with white polka dots, cinched at the waist with a wide black belt. Red kitten heels and a black headband. Cat-eye sunglasses.",
      "High-waisted black cigarette pants with a fitted white blouse with Peter Pan collar. Red ballet flats and a red lip. Hair in victory rolls.",
      "A-line dress in powder blue with cap sleeves and a full skirt. White kitten heels and pearl earrings. Hair curled and pinned up with a bow.",
    ],
    tier2: [
      "Polka dot halter dress with a wide belt.",
      "High-waisted pants with a collared blouse.",
      "A-line dress with cap sleeves and pearls.",
    ],
    tier3: [
      "She's in retro 50s style clothes.",
      "Vintage-inspired outfit.",
      "Classic old-fashioned style.",
    ],
    hooks: ["Her adorable retro style", "The vintage vibe of her outfit"],
  },
  {
    id: "vintage_70s_disco",
    category: "vintage",
    suitableEnvironments: ["high_street", "coffee_shop", "mall"],
    tier1: [
      "High-waisted bell-bottom jeans in rust orange with a cream peasant blouse. Platform sandals and big gold hoops. Hair feathered and parted in the middle.",
      "Brown corduroy flares with a burnt orange turtleneck and a suede fringe vest. Brown platform boots and layered gold chains. Natural glowy makeup.",
      "Floral maxi dress with flowing sleeves and a deep V-neck. Platform sandals and oversized sunglasses. Hair big and wavy with a center part.",
    ],
    tier2: [
      "Bell-bottom jeans with a peasant blouse and platforms.",
      "Corduroy flares with a turtleneck and fringe vest.",
      "Floral maxi dress with platforms.",
    ],
    tier3: [
      "She's in 70s-inspired clothes.",
      "Retro flares and platforms.",
      "Vintage boho style.",
    ],
  },
  {
    id: "vintage_80s_power",
    category: "vintage",
    suitableEnvironments: ["high_street", "coffee_shop", "mall"],
    tier1: [
      "Oversized blazer in hot pink with padded shoulders over a black bodysuit and high-waisted jeans. White pumps and big gold earrings. Bold blush.",
      "Purple sequined top with a black pencil skirt and black pumps. Big teased hair and dramatic makeup. Chunky gold jewelry everywhere.",
      "Acid wash denim jacket over a neon graphic tee and black leggings. White high-top Reeboks and a scrunchie. Bright eyeshadow.",
    ],
    tier2: [
      "Oversized blazer with padded shoulders and jeans.",
      "Sequined top with a pencil skirt.",
      "Denim jacket over neon with leggings.",
    ],
    tier3: [
      "She's in 80s-inspired clothes.",
      "Retro bold style.",
      "Vintage power dressing.",
    ],
  },
  {
    id: "vintage_90s_grunge",
    category: "vintage",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "campus"],
    tier1: [
      "Oversized flannel in blue and green over a black slip dress. Doc Martens and a choker. Messy hair and dark lipstick.",
      "Baggy ripped jeans with a faded band tee and a cardigan tied around the waist. Platform sneakers and small hoop earrings. Smudged liner.",
      "Baby doll dress in floral print with black tights and combat boots. A denim jacket and a velvet scrunchie. Dark nail polish.",
    ],
    tier2: [
      "Flannel over a slip dress with Docs.",
      "Baggy jeans with a band tee and platforms.",
      "Baby doll dress with tights and combat boots.",
    ],
    tier3: [
      "She's in 90s grunge style.",
      "Vintage alternative clothes.",
      "Retro layered outfit.",
    ],
  },
  {
    id: "vintage_thrift_find",
    category: "vintage",
    suitableEnvironments: ["high_street", "coffee_shop", "mall", "park"],
    tier1: [
      "Vintage Levi's 501s with a tucked-in silk blouse that's clearly from another decade. Brown leather loafers and a vintage Coach bag. Simple gold jewelry.",
      "Pleated wool midi skirt in camel with a fitted black turtleneck and penny loafers. A vintage brooch and cat-eye glasses. Her outfit screams estate sale.",
      "High-waisted wide-leg trousers in forest green with a cream pussy-bow blouse. Tan leather mules and pearl earrings. Everything looks like it has a story.",
    ],
    tier2: [
      "Vintage Levi's with a silk blouse and loafers.",
      "Pleated skirt with a turtleneck and vintage accessories.",
      "Wide-leg trousers with a bow blouse.",
    ],
    tier3: [
      "She's in vintage clothes.",
      "Thrifted style outfit.",
      "Retro-looking clothes.",
    ],
  },

  // ============================================================================
  // SPORTY (Active sports wear)
  // ============================================================================
  {
    id: "sporty_runner",
    category: "sporty",
    suitableEnvironments: ["high_street", "park", "gym"],
    tier1: [
      "Black running shorts with a neon yellow tank top and brand new Hokas. AirPods in, GPS watch on her wrist, hair in a high ponytail. Slight sheen of sweat.",
      "Grey compression leggings with a black Nike running top. White Ultraboosts and a running vest. Gel packets visible in her pocket.",
      "Navy blue athletic shorts with a white moisture-wicking tee. Bright orange Brooks running shoes and a visor. She's stretching by a lamppost.",
    ],
    tier2: [
      "Running shorts and tank with nice running shoes.",
      "Compression leggings with a running top and vest.",
      "Athletic shorts with a performance tee.",
    ],
    tier3: [
      "She's in running gear.",
      "Athletic clothes for running.",
      "Sports outfit.",
    ],
  },
  {
    id: "sporty_cyclist",
    category: "sporty",
    suitableEnvironments: ["high_street", "park", "coffee_shop"],
    tier1: [
      "Black padded cycling shorts with a bright pink cycling jersey. Clip-in cycling shoes and a helmet clipped to her bag. Tan lines on her arms.",
      "Dark green cycling bib shorts with a matching jersey. White cycling shoes and wraparound sunglasses. A cycling cap under her helmet.",
      "Casual cycling outfit: black leggings with a bright blue windbreaker and flat cycling shoes. A messenger bag and reflective ankle straps.",
    ],
    tier2: [
      "Cycling shorts and jersey with cycling shoes.",
      "Bib shorts with a matching jersey.",
      "Leggings with a windbreaker for cycling.",
    ],
    tier3: [
      "She's in cycling gear.",
      "Athletic cycling clothes.",
      "Sports outfit for biking.",
    ],
  },
  {
    id: "sporty_gym_regular",
    category: "sporty",
    suitableEnvironments: ["gym", "coffee_shop", "mall"],
    tier1: [
      "Black compression shorts over patterned leggings with a fitted grey crop tank. Nike Metcons and a lifting belt around her waist. Hair in braids, chalk on her hands.",
      "High-waisted black leggings with a sports bra in a cutout mesh design, zip-up hoodie unzipped. Cross-training shoes and lifting gloves.",
      "Baggy basketball shorts over compression tights with an oversized cutoff tee. High-top training shoes and a sweatband. Gym bag with protein shaker visible.",
    ],
    tier2: [
      "Compression gear with a crop tank and lifting belt.",
      "Leggings and sports bra with a zip-up.",
      "Basketball shorts over tights with a cutoff.",
    ],
    tier3: [
      "She looks like she lifts.",
      "Gym workout clothes.",
      "Athletic training outfit.",
    ],
  },
  {
    id: "sporty_hiking",
    category: "sporty",
    suitableEnvironments: ["park", "high_street", "coffee_shop"],
    tier1: [
      "Olive green hiking pants that zip off into shorts, with a fitted black moisture-wicking top. Salomon hiking boots and a Patagonia backpack. Carabiner on her belt loop.",
      "Grey quick-dry shorts with a navy blue long-sleeve sun shirt. Trail runners and a wide-brimmed hat. Nalgene bottle clipped to her pack.",
      "Black leggings with a flannel tied around her waist and a fitted grey athletic top. Hiking boots with colorful laces. Hair in two French braids.",
    ],
    tier2: [
      "Hiking pants with a moisture-wicking top and hiking boots.",
      "Quick-dry shorts with a sun shirt and trail runners.",
      "Leggings with a flannel and hiking boots.",
    ],
    tier3: [
      "She's in hiking gear.",
      "Outdoor athletic clothes.",
      "Trail-ready outfit.",
    ],
  },
  {
    id: "sporty_swimmer",
    category: "sporty",
    suitableEnvironments: ["beach", "gym", "park"],
    tier1: [
      "Competition swimsuit visible under a cropped hoodie and swim parka shorts. Flip-flops and wet hair slicked back. Goggle marks around her eyes.",
      "Navy blue one-piece peeking out from under an oversized tee and shorts. Slides and a mesh swim bag. Chlorine smell and damp hair.",
      "Athletic bikini top under a loose tank with board shorts. Rainbow flip-flops and a towel over her shoulder. Hair in a wet braid.",
    ],
    tier2: [
      "Swimsuit under a hoodie and swim shorts.",
      "One-piece under a tee with swim gear.",
      "Bikini top under a tank with board shorts.",
    ],
    tier3: [
      "She looks like she just swam.",
      "Swimming gear.",
      "Athlete in pool clothes.",
    ],
  },

  // ============================================================================
  // STREETWEAR (Urban, sneaker culture)
  // ============================================================================
  {
    id: "streetwear_hypebeast",
    category: "streetwear",
    suitableEnvironments: ["high_street", "mall", "coffee_shop", "transit"],
    tier1: [
      "Oversized Off-White hoodie over baggy cargo pants. Travis Scott Jordan 1s and a Supreme shoulder bag. Gold chain and AirPods Max.",
      "Vintage Nike tech fleece set in grey with Yeezy 350s in an earth tone. Small crossbody bag and simple gold studs. Hair in a sleek low bun.",
      "Boxy graphic tee from a Japanese brand with wide-leg jeans and Nike Dunks in a rare colorway. Bucket hat and a tote covered in pins.",
    ],
    tier2: [
      "Designer hoodie with cargo pants and hyped sneakers.",
      "Tech fleece set with Yeezys.",
      "Graphic tee with wide-leg jeans and Dunks.",
    ],
    tier3: [
      "She's in streetwear.",
      "Urban fashion outfit.",
      "Hyped clothes and sneakers.",
    ],
    hooks: ["Her rare sneakers", "The brand of her hoodie"],
  },
  {
    id: "streetwear_skater",
    category: "streetwear",
    suitableEnvironments: ["high_street", "park", "mall", "transit"],
    tier1: [
      "Baggy Dickies in tan with a cropped band tee and a flannel tied around her waist. Beat-up Vans Old Skools and a Thrasher beanie. Skateboard in hand.",
      "Oversized graphic tee over a long-sleeve with baggy jeans and high-top Vans. Chain wallet and a backpack covered in patches.",
      "Black baggy cargo pants with a cropped white tank and an oversized denim jacket. Suicoke sandals over white socks. Beaded bracelet.",
    ],
    tier2: [
      "Dickies with a cropped tee and skate shoes.",
      "Graphic tee with baggy jeans and high-tops.",
      "Cargo pants with a tank and chunky sandals.",
    ],
    tier3: [
      "She's in skater style clothes.",
      "Baggy streetwear outfit.",
      "Urban casual style.",
    ],
  },
  {
    id: "streetwear_korean_influenced",
    category: "streetwear",
    suitableEnvironments: ["high_street", "mall", "coffee_shop"],
    tier1: [
      "Oversized blazer in cream over a white graphic tee and black wide-leg trousers. Chunky New Balance 530s and a small crossbody. Round glasses and slicked hair.",
      "Black oversized hoodie with white script, baggy black pants, and platform Converse. Silver chain jewelry and small hoop earrings. Minimal makeup.",
      "Cropped cream cardigan over a black fitted tee with high-waisted grey slacks. White Asics Gel-Kayano and a structured mini bag. Hair in curtain bangs.",
    ],
    tier2: [
      "Oversized blazer with wide-leg trousers and chunky sneakers.",
      "Black hoodie with baggy pants and platforms.",
      "Cropped cardigan with slacks and Asics.",
    ],
    tier3: [
      "She's in Korean-style streetwear.",
      "Minimalist urban outfit.",
      "Clean streetwear look.",
    ],
  },
  {
    id: "streetwear_gorpcore",
    category: "streetwear",
    suitableEnvironments: ["high_street", "park", "coffee_shop", "transit"],
    tier1: [
      "Arc'teryx shell jacket in black over a Patagonia fleece and hiking pants. Salomon XT-6 sneakers and a North Face backpack. Carabiner keychain.",
      "Olive cargo pants with a black The North Face puffer vest over a grey hoodie. Trail runners and a crossbody bag. Beanie even though it's not that cold.",
      "Black Gramicci pants with a vintage fleece in wild colors and Hoka trail shoes. Canvas messenger bag and no-show socks. Utilitarian watch.",
    ],
    tier2: [
      "Technical jacket over fleece with trail sneakers.",
      "Cargo pants with a puffer vest and trail runners.",
      "Technical pants with vintage fleece and Hokas.",
    ],
    tier3: [
      "She's in outdoor-style streetwear.",
      "Technical urban outfit.",
      "Gorpcore style.",
    ],
  },
  {
    id: "streetwear_vintage_nike",
    category: "streetwear",
    suitableEnvironments: ["high_street", "mall", "coffee_shop", "campus"],
    tier1: [
      "Vintage Nike windbreaker from the 90s over a white crop top and high-waisted Levi's. Nike Cortez in white and red and a simple gold chain.",
      "Oversized vintage Nike tee tucked into grey sweatpants with the Nike swoosh. Air Max 97s and a mini backpack. Hair in a claw clip.",
      "Matching vintage Nike tracksuit in navy and white. Clean white Air Force 1s and small gold hoops. Scrunchie on her wrist.",
    ],
    tier2: [
      "Vintage windbreaker with jeans and Cortez.",
      "Vintage Nike tee with sweats and Air Max.",
      "Vintage tracksuit with Air Force 1s.",
    ],
    tier3: [
      "She's in vintage athletic wear.",
      "Retro Nike outfit.",
      "Classic sportswear style.",
    ],
  },
];

// ============================================================================
// DIFFICULTY-BASED TIER SELECTION
// ============================================================================

/**
 * Maps difficulty level to which description tier to use.
 * Lower difficulty = more detail (tier1), higher = less detail (tier3)
 */
export function getDescriptionTierForDifficulty(difficulty: DifficultyLevel): 1 | 2 | 3 {
  const tierMap: Record<DifficultyLevel, 1 | 2 | 3> = {
    beginner: 1, // Most specific - colors, brands, accessories
    intermediate: 1, // Still detailed but randomly might get tier 2
    advanced: 2, // Moderate detail
    expert: 3, // Generic
    master: 3, // Very generic
  };

  // Add some randomness for intermediate difficulties
  if (difficulty === "intermediate" && Math.random() < 0.3) {
    return 2;
  }
  if (difficulty === "advanced" && Math.random() < 0.3) {
    return 3;
  }

  return tierMap[difficulty];
}

/**
 * Get outfit description text based on difficulty.
 * Returns empty string at higher difficulties with some probability.
 */
export function getEnhancedOutfitTextForDifficulty(
  outfit: EnhancedOutfit,
  difficulty: DifficultyLevel
): string {
  // Probability of showing outfit at all
  const showProbability: Record<DifficultyLevel, number> = {
    beginner: 1.0,
    intermediate: 0.9,
    advanced: 0.6,
    expert: 0.3,
    master: 0.1,
  };

  if (Math.random() > showProbability[difficulty]) {
    return "";
  }

  const tier = getDescriptionTierForDifficulty(difficulty);
  const descriptions =
    tier === 1 ? outfit.tier1 : tier === 2 ? outfit.tier2 : outfit.tier3;

  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

// ============================================================================
// ENVIRONMENT-BASED FILTERING
// ============================================================================

/**
 * Map location codes to environment types
 */
export function getEnvironmentTypeFromCode(locationCode: string): EnvironmentType {
  const mainCode = locationCode.split(".")[0];
  const envMap: Record<string, EnvironmentType> = {
    "1": "high_street",
    "2": "mall",
    "3": "coffee_shop",
    "4": "transit",
    "5": "park",
    "6": "gym",
    "7": "campus",
  };
  return envMap[mainCode] || "high_street";
}

/**
 * Get outfits suitable for a specific environment
 */
export function getOutfitsForEnvironment(environment: EnvironmentType): EnhancedOutfit[] {
  return ENHANCED_OUTFITS.filter((outfit) =>
    outfit.suitableEnvironments.includes(environment)
  );
}

/**
 * Get outfits by category that are also suitable for an environment
 */
export function getOutfitsForCategoryAndEnvironment(
  category: OutfitCategory,
  environment: EnvironmentType
): EnhancedOutfit[] {
  return ENHANCED_OUTFITS.filter(
    (outfit) =>
      outfit.category === category &&
      outfit.suitableEnvironments.includes(environment)
  );
}

// ============================================================================
// ARCHETYPE-BASED SELECTION
// ============================================================================

// These weights determine which outfits are more likely for each archetype
export const ARCHETYPE_OUTFIT_WEIGHTS: Record<
  string,
  Partial<Record<OutfitCategory, number>>
> = {
  powerhouse: {
    business: 0.45,
    smart_casual: 0.25,
    minimalist: 0.15,
    glamorous: 0.1,
    casual: 0.05,
  },
  creative: {
    bohemian: 0.3,
    vintage: 0.2,
    edgy: 0.2,
    casual: 0.15,
    trendy: 0.15,
  },
  intellectual: {
    smart_casual: 0.3,
    minimalist: 0.25,
    preppy: 0.2,
    vintage: 0.15,
    casual: 0.1,
  },
  athlete: {
    athleisure: 0.35,
    sporty: 0.25,
    casual: 0.2,
    streetwear: 0.1,
    relaxed: 0.1,
  },
  socialite: {
    trendy: 0.3,
    glamorous: 0.25,
    smart_casual: 0.2,
    business: 0.15,
    preppy: 0.1,
  },
  free_spirit: {
    bohemian: 0.4,
    casual: 0.25,
    vintage: 0.15,
    relaxed: 0.1,
    edgy: 0.1,
  },
  nurturer: {
    casual: 0.35,
    relaxed: 0.3,
    smart_casual: 0.2,
    preppy: 0.1,
    bohemian: 0.05,
  },
  rebel: {
    edgy: 0.4,
    streetwear: 0.2,
    casual: 0.2,
    trendy: 0.1,
    vintage: 0.1,
  },
  party_girl: {
    glamorous: 0.4,
    trendy: 0.3,
    edgy: 0.15,
    streetwear: 0.15,
  },
  student: {
    casual: 0.35,
    preppy: 0.2,
    athleisure: 0.15,
    streetwear: 0.15,
    relaxed: 0.15,
  },
  artist: {
    bohemian: 0.35,
    vintage: 0.25,
    edgy: 0.2,
    casual: 0.1,
    streetwear: 0.1,
  },
  professional: {
    business: 0.5,
    smart_casual: 0.3,
    minimalist: 0.15,
    preppy: 0.05,
  },
  traveler: {
    casual: 0.3,
    relaxed: 0.25,
    athleisure: 0.15,
    bohemian: 0.15,
    smart_casual: 0.15,
  },
};

/**
 * Sample an outfit category based on archetype weights
 */
export function sampleOutfitCategoryForArchetype(archetypeId: string): OutfitCategory {
  const weights = ARCHETYPE_OUTFIT_WEIGHTS[archetypeId];

  if (!weights) {
    // Default to uniform distribution
    const categories: OutfitCategory[] = [
      "casual",
      "smart_casual",
      "athleisure",
      "trendy",
      "relaxed",
    ];
    return categories[Math.floor(Math.random() * categories.length)];
  }

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + (w || 0), 0);
  let random = Math.random() * totalWeight;

  for (const [category, weight] of Object.entries(weights)) {
    random -= weight || 0;
    if (random <= 0) return category as OutfitCategory;
  }

  return "casual";
}

// ============================================================================
// MAIN SELECTION FUNCTION
// ============================================================================

export interface OutfitSelectionParams {
  archetypeId: string;
  locationCode: string;
  difficulty: DifficultyLevel;
}

/**
 * Main function to select an outfit and get its description.
 * Integrates archetype preference, environment suitability, and difficulty-based description tier.
 */
export function selectOutfitForScenario(params: OutfitSelectionParams): {
  outfit: EnhancedOutfit;
  description: string;
  hooks: string[];
} {
  const { archetypeId, locationCode, difficulty } = params;

  // 1. Determine environment from location code
  const environment = getEnvironmentTypeFromCode(locationCode);

  // 2. Sample outfit category based on archetype
  const category = sampleOutfitCategoryForArchetype(archetypeId);

  // 3. Get outfits that match both category and environment
  let candidates = getOutfitsForCategoryAndEnvironment(category, environment);

  // 4. If no matches, fall back to just environment-appropriate outfits
  if (candidates.length === 0) {
    candidates = getOutfitsForEnvironment(environment);
  }

  // 5. If still nothing, fall back to full list
  if (candidates.length === 0) {
    candidates = ENHANCED_OUTFITS;
  }

  // 6. Select random outfit from candidates
  const outfit = candidates[Math.floor(Math.random() * candidates.length)];

  // 7. Get description based on difficulty tier
  const description = getEnhancedOutfitTextForDifficulty(outfit, difficulty);

  // 8. Get hooks (conversation starters) if available and difficulty allows
  let hooks: string[] = [];
  if (outfit.hooks && difficulty === "beginner") {
    hooks = outfit.hooks;
  }

  return { outfit, description, hooks };
}

// ============================================================================
// LEGACY COMPATIBILITY LAYER
// ============================================================================

// Keep old types and functions for backward compatibility with existing code

export type OutfitCategory_Legacy = OutfitCategory;

export interface OutfitDescription {
  id: string;
  category: OutfitCategory;
  descriptions: string[];
  pieces?: {
    top?: string[];
    bottom?: string[];
    shoes?: string[];
    accessories?: string[];
  };
}

// Convert enhanced outfits to legacy format for backward compatibility
export const OUTFITS: OutfitDescription[] = ENHANCED_OUTFITS.map((outfit) => ({
  id: outfit.id,
  category: outfit.category,
  descriptions: [...outfit.tier1, ...outfit.tier2, ...outfit.tier3],
}));

export function getOutfitByCategory(category: OutfitCategory): OutfitDescription {
  const categoryOutfits = OUTFITS.filter((o) => o.category === category);
  return categoryOutfits[Math.floor(Math.random() * categoryOutfits.length)];
}

export function getRandomOutfit(): OutfitDescription {
  return OUTFITS[Math.floor(Math.random() * OUTFITS.length)];
}

export function getOutfitText(outfit: OutfitDescription): string {
  return outfit.descriptions[Math.floor(Math.random() * outfit.descriptions.length)];
}

export function getOutfitTextForDifficulty(
  outfit: OutfitDescription,
  difficulty: DifficultyLevel
): string {
  const showProbability: Record<DifficultyLevel, number> = {
    beginner: 1.0,
    intermediate: 0.8,
    advanced: 0.4,
    expert: 0.15,
    master: 0,
  };

  if (Math.random() > showProbability[difficulty]) {
    return "";
  }

  return getOutfitText(outfit);
}

export function sampleOutfitCategory(
  weights?: Partial<Record<OutfitCategory, number>>
): OutfitCategory {
  const categories: OutfitCategory[] = [
    "business",
    "smart_casual",
    "casual",
    "athleisure",
    "bohemian",
    "minimalist",
    "trendy",
    "edgy",
    "preppy",
    "relaxed",
    "glamorous",
    "vintage",
    "sporty",
    "streetwear",
  ];

  if (!weights) {
    return categories[Math.floor(Math.random() * categories.length)];
  }

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + (w || 0), 0);
  let random = Math.random() * totalWeight;

  for (const category of categories) {
    const weight = weights[category] || 0;
    random -= weight;
    if (random <= 0) return category;
  }

  return "casual";
}

// ============================================================================
// ACCESSORIES (Enhanced with difficulty tiers)
// ============================================================================

export type AccessoryType =
  | "bag"
  | "sunglasses"
  | "hat"
  | "jewelry"
  | "scarf"
  | "watch"
  | "tech"
  | "drink";

export interface AccessoryDescription {
  type: AccessoryType;
  /** Detailed descriptions (for beginner) */
  tier1: string[];
  /** Simple descriptions (for advanced+) */
  tier2: string[];
}

export const ACCESSORIES: AccessoryDescription[] = [
  {
    type: "bag",
    tier1: [
      "She's carrying a quilted Chanel-style crossbody bag.",
      "She has a worn-in leather tote that looks expensive.",
      "A small Jacquemus-style mini bag hangs from her shoulder.",
      "She's carrying a canvas tote covered in enamel pins.",
      "A structured Hermès Birkin-style bag in her hand.",
      "Vintage Coach bag with brass hardware slung across her body.",
    ],
    tier2: [
      "She's carrying a nice bag.",
      "She has a crossbody bag.",
      "There's a tote over her shoulder.",
    ],
  },
  {
    type: "sunglasses",
    tier1: [
      "Oversized black Celine-style sunglasses cover half her face.",
      "Vintage cat-eye sunglasses pushed up on her head.",
      "She's wearing trendy tiny rectangular sunglasses.",
      "Ray-Ban Wayfarers in tortoiseshell on her face.",
    ],
    tier2: [
      "She's wearing sunglasses.",
      "Sunglasses on her head.",
      "She has shades on.",
    ],
  },
  {
    type: "hat",
    tier1: [
      "A cream-colored cashmere beanie perfectly positioned on her head.",
      "She's wearing a vintage-looking baseball cap backwards.",
      "A wide-brimmed straw hat shades her face.",
      "Corduroy bucket hat in a fall color.",
      "Classic black beret tilted to one side.",
    ],
    tier2: [
      "She's wearing a hat.",
      "A beanie on her head.",
      "She has a cap on.",
    ],
  },
  {
    type: "jewelry",
    tier1: [
      "Layered gold chains of different lengths catch the light.",
      "Statement earrings that look handmade dangle as she moves.",
      "A thin gold bracelet with a tiny charm on her wrist.",
      "Stacked silver rings on almost every finger.",
      "A vintage-looking locket on a long chain.",
      "Small diamond studs that are definitely real.",
    ],
    tier2: [
      "She's wearing noticeable jewelry.",
      "Some gold accessories.",
      "Nice earrings.",
    ],
  },
  {
    type: "scarf",
    tier1: [
      "A silk Hermès-style scarf tied loosely around her neck.",
      "Oversized cashmere scarf in camel wrapped around her.",
      "A colorful vintage scarf used as a headband.",
      "Thin silk scarf tied to her bag handle.",
    ],
    tier2: [
      "She's wearing a scarf.",
      "A nice scarf around her neck.",
      "She has a scarf on.",
    ],
  },
  {
    type: "watch",
    tier1: [
      "A vintage gold Cartier Tank on her wrist.",
      "Apple Watch Ultra with a nice band.",
      "Classic Rolex Datejust catching the light.",
      "Minimalist Daniel Wellington-style watch.",
    ],
    tier2: [
      "She's wearing a watch.",
      "A nice watch on her wrist.",
      "She has a watch.",
    ],
  },
  {
    type: "tech",
    tier1: [
      "AirPods Pro in, clearly in her own world.",
      "AirPods Max in a trendy color over her ears.",
      "Phone in hand, occasionally glancing at it.",
      "Kindle in one hand, coffee in the other.",
    ],
    tier2: [
      "She has earbuds in.",
      "Phone in hand.",
      "She's listening to something.",
    ],
  },
  {
    type: "drink",
    tier1: [
      "A Stanley tumbler in a trendy color in her hand.",
      "Iced oat milk latte with a reusable straw.",
      "A matcha in a clear cup, perfectly layered.",
      "Reusable coffee cup with a cute design.",
    ],
    tier2: [
      "Coffee in hand.",
      "She's carrying a drink.",
      "A cup in her hand.",
    ],
  },
];

export function getAccessoryTextForDifficulty(difficulty: DifficultyLevel): string {
  const showProbability: Record<DifficultyLevel, number> = {
    beginner: 0.5,
    intermediate: 0.35,
    advanced: 0.15,
    expert: 0.05,
    master: 0,
  };

  if (Math.random() > showProbability[difficulty]) {
    return "";
  }

  const accessory = ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)];
  const tier = difficulty === "beginner" || difficulty === "intermediate" ? "tier1" : "tier2";
  const descriptions = accessory[tier];

  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

export function getRandomAccessory(): string {
  const accessory = ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)];
  return accessory.tier1[Math.floor(Math.random() * accessory.tier1.length)];
}

// ============================================================================
// HAIR DESCRIPTIONS (with difficulty tiers)
// ============================================================================

export interface HairDescription {
  tier1: string[];
  tier2: string[];
}

export const HAIR_STYLES: HairDescription = {
  tier1: [
    "Her hair is in a perfect messy bun held by a claw clip.",
    "Long waves cascading over her shoulders, clearly styled.",
    "A sleek high ponytail with face-framing pieces.",
    "Hair in two French braids, a little wisps escaping.",
    "Freshly blown-out hair that bounces as she walks.",
    "A low chignon that looks effortless but took effort.",
    "Curtain bangs framing her face, the rest in a low bun.",
    "Short pixie cut that she keeps touching.",
    "Space buns that somehow look cool on her.",
    "Slicked-back wet-look hair, very editorial.",
  ],
  tier2: [
    "Her hair is up.",
    "Hair down and loose.",
    "She has long hair.",
    "Short hair.",
    "Her hair is tied back.",
  ],
};

export const HAIR_DESCRIPTIONS = HAIR_STYLES.tier1; // Legacy compatibility

export function getHairTextForDifficulty(difficulty: DifficultyLevel): string {
  const showProbability: Record<DifficultyLevel, number> = {
    beginner: 0.4,
    intermediate: 0.25,
    advanced: 0.1,
    expert: 0,
    master: 0,
  };

  if (Math.random() > showProbability[difficulty]) {
    return "";
  }

  const tier = difficulty === "beginner" ? "tier1" : "tier2";
  const descriptions = HAIR_STYLES[tier];

  return descriptions[Math.floor(Math.random() * descriptions.length)];
}
