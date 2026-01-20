/**
 * Comprehensive Country-to-Region Mappings
 *
 * This file contains explicit mappings for all 336 country/territory paths
 * in the world map SVG. Every path must be either:
 * 1. Assigned to a dateable region (COUNTRY_TO_REGION)
 * 2. Marked as Arctic territory (ARCTIC_TERRITORIES)
 * 3. Marked as locked/unavailable (LOCKED_TERRITORIES)
 *
 * NO FALLBACK LOGIC - all assignments are explicit.
 */

// ============================================================================
// REGION DEFINITIONS
// ============================================================================

export const REGIONS = [
  { id: "north-america", name: "North America", description: "USA, Canada" },
  { id: "latin-america", name: "Latin America", description: "Mexico, Brazil, Argentina, Colombia" },
  { id: "western-europe", name: "Western Europe", description: "UK, France, Germany, Netherlands" },
  { id: "slavic-europe", name: "Slavic Europe", description: "Russia, Ukraine, Belarus" },
  { id: "eastern-europe", name: "Eastern Europe", description: "Poland, Romania, Czech, Balkans" },
  { id: "scandinavia", name: "Scandinavia", description: "Sweden, Norway, Denmark, Finland, Iceland" },
  { id: "southern-europe", name: "Southern Europe", description: "Spain, Italy, Greece, Portugal" },
  { id: "africa", name: "Africa", description: "South Africa, Nigeria, Kenya, Egypt" },
  { id: "middle-east", name: "Middle East", description: "UAE, Turkey, Israel, Lebanon" },
  { id: "south-asia", name: "South Asia", description: "India, Pakistan, Bangladesh" },
  { id: "southeast-asia", name: "Southeast Asia", description: "Thailand, Vietnam, Philippines, Indonesia" },
  { id: "east-asia", name: "East Asia", description: "China, Japan, South Korea, Taiwan" },
  { id: "australia", name: "Australia / Oceania", description: "Australia, New Zealand" },
] as const;

// ============================================================================
// ARCTIC TERRITORIES (Permanently locked - too cold/remote)
// ============================================================================

export const ARCTIC_TERRITORIES = new Set([
  // Greenland & nearby
  "greenland",
  "disko",
  "milne",

  // Canadian Arctic Archipelago
  "baffin",
  "banks",
  "bathurst",
  "bylot",
  "cornwallis",
  "devon",
  "eglinton",
  "ellesmere",
  "king christian",
  "mackenzie king",
  "prescott",
  "prince george",
  "prince of wales",
  "prince patrick",
  "axel heiberg",
  "amund ringnes",
  "ellef ringnes",
  "southhampton",
  "victoria",
  "salisbury",
  "bell",

  // Russian Arctic islands & far eastern Siberia
  "novaya zemlya north",
  "novaya zemlya south",
  "novaya sibir",
  "kotelny",
  "lyakhovsky",
  "wrangel",
  "wrangel-w",
  "komsomolets",
  "bolshevik",
  "october",
  "chukotka", // Far eastern Siberia - geographically confusing near Alaska

  // Bering Sea islands
  "bering island",
  "medny",
  "st. lawrence island",
  "st. lawrence island west",

  // Svalbard
  "spitsbergen",
  "nordaustlandet",
  "edgeoya",

  // Antarctic territories
  "east antarctica",
  "antarctic peninsula",
  "thurston",
  "alexander",
  "smyley",
  "robert",
  "king george",
  "james ross",
  "elephant",
]);

// ============================================================================
// LOCKED TERRITORIES (Too small, uninhabited, or not suitable for dating)
// ============================================================================

export const LOCKED_TERRITORIES = new Set([
  // Alaska duplicate that appears on the far east edge of the map
  "alaska",

  // Falkland Islands
  "falklands east",
  "falklands west",

  // Remote Indian Ocean
  "kerguelen",
  "aldabra",

  // Kuril Islands (too small/remote)
  "onekotan",
  "paramushir",
  "iturup",
  "urup",

  // Small Bahamas islands
  "andros",
  "bimini",
  "inagua",
  "eleuthera",
  "grand bahama",

  // Cape Verde / Azores small islands
  "boa vista",
  "santiago",
  "santo antao",
  "sao miguel",
  "pico",
  "terceira",

  // Maldives (too small)
  "gan",
  "male",
  "maldive",

  // Hawaiian islands (part of USA, but separate small islands)
  "kahului",
  "kauai",
  "oahu",
  "hawaii",

  // Galapagos
  "galapagos",

  // Seychelles
  "mahe",
  "praslin",

  // Comoros
  "grande comore",
  "mayotte",

  // Small Pacific islands
  "raiatea",
  "tahiti",
  "efate",
  "malakula",
  "rennell",
  "santa ana",
  "santa isabel",
  "choiseul",

  // Small Caribbean islands
  "grenada",
  "st. lucia",
  "st. vincent",
  "dominica",
  "guadeloupe",
  "martinique",

  // Indian Ocean
  "soqotra",
  "wilczek",
]);

// ============================================================================
// HOVER LABEL SUPPRESSION (Use for edge cases where hover labels should be hidden)
// ============================================================================

export const HOVER_LABEL_SUPPRESS = new Set<string>([]);

// ============================================================================
// COUNTRY TO REGION MAPPINGS
// ============================================================================

export const COUNTRY_TO_REGION: Record<string, string> = {
  // -------------------------
  // NORTH AMERICA (USA, Canada only - Mexico is Latin America for daygame purposes)
  // -------------------------
  "canada": "north-america",
  "usa": "north-america",
  "alaska-westcopy": "north-america",
  // Aleutian Islands (Alaska chain)
  "adak": "north-america",
  "adak west": "north-america",
  "attu": "north-america",
  "attu west": "north-america",
  "amchitka": "north-america",
  "amchitka west": "north-america",
  "another aleutian west": "north-america",
  "umnak": "north-america",
  "umnak west": "north-america",
  "unalaska": "north-america",
  "unalaska west": "north-america",
  "newfoundland": "north-america",
  "vancouver": "north-america",
  "haida gwaii": "north-america",

  // -------------------------
  // LATIN AMERICA (Mexico + Central/South America + Caribbean)
  // -------------------------
  "mexico": "latin-america",
  "guatemala": "latin-america",
  "belize": "latin-america",
  "honduras": "latin-america",
  "el salvador": "latin-america",
  "nicaragua": "latin-america",
  "costa rica": "latin-america",
  "panama": "latin-america",
  "colombia": "latin-america",
  "venezuela": "latin-america",
  "guyana": "latin-america",
  "guyane": "latin-america",
  "suriname": "latin-america",
  "ecuador": "latin-america",
  "peru": "latin-america",
  "bolivia": "latin-america",
  "chile": "latin-america",
  "paraguay": "latin-america",
  "uruguay": "latin-america",
  "brazil": "latin-america",
  "argentina": "latin-america",
  "cuba": "latin-america",
  "jamaica": "latin-america",
  "haiti": "latin-america",
  "domincan republic": "latin-america",
  "haiti-dominican border": "latin-america",
  "puerto rico": "latin-america",
  "trinidad": "latin-america",
  "tierra del fuego argentina": "latin-america",
  "tierra del fuego chile": "latin-america",
  "chiloe": "latin-america",

  // -------------------------
  // WESTERN EUROPE
  // -------------------------
  "britain": "western-europe",
  "ulster": "western-europe",
  "ireland": "western-europe",
  "france": "western-europe",
  "corsica": "western-europe",
  "germany": "western-europe",
  "netherlands": "western-europe",
  "belgium": "western-europe",
  "switzerland": "western-europe",
  "austria": "western-europe",

  // -------------------------
  // SCANDINAVIA
  // -------------------------
  "norway": "scandinavia",
  "sweden": "scandinavia",
  "gotland": "scandinavia",
  "denmark": "scandinavia",
  "sjælland": "scandinavia",
  "finland": "scandinavia",
  "hiumaa": "eastern-europe",
  "saaremaa": "eastern-europe",
  "iceland": "scandinavia", // Moved from Arctic - has dating scene

  // -------------------------
  // SLAVIC EUROPE (Russia, Ukraine, Belarus - fair skin, blue eyes, distinctive features)
  // Note: Chukotka (far eastern Siberia) hidden as Arctic due to geographic confusion
  // -------------------------
  "russia": "slavic-europe",
  "ukraine": "slavic-europe",
  "belarus": "slavic-europe",
  "sakhalin": "slavic-europe",

  // -------------------------
  // EASTERN EUROPE (Poland, Balkans, Baltics, Central Europe)
  // -------------------------
  "poland": "eastern-europe",
  "czech": "eastern-europe",
  "slovakia": "eastern-europe",
  "hungary": "eastern-europe",
  "romania": "eastern-europe",
  "bulgaria": "eastern-europe",
  "thrace": "eastern-europe",
  "serbia": "eastern-europe",
  "bosnia": "eastern-europe",
  "croatia": "eastern-europe",
  "slovenia": "eastern-europe",
  "montenegro": "eastern-europe",
  "albania": "eastern-europe",
  "macedonia": "eastern-europe",
  "moldova": "eastern-europe",
  "lithuania": "eastern-europe",
  "estonia": "eastern-europe",

  // -------------------------
  // SOUTHERN EUROPE
  // -------------------------
  "spain": "southern-europe",
  "gran canaria": "southern-europe",
  "tenerife": "southern-europe",
  "lanzarote": "southern-europe",
  "madeira": "southern-europe",
  "portugal": "southern-europe",
  "italy": "southern-europe",
  "sicily": "southern-europe",
  "sardinia": "southern-europe",
  "majorca": "southern-europe",
  "greece": "southern-europe",
  "crete": "southern-europe",
  "malta": "southern-europe",
  "cyprus": "southern-europe",

  // -------------------------
  // MIDDLE EAST
  // -------------------------
  "turkey": "middle-east",
  "syria": "middle-east",
  "lebanon": "middle-east",
  "israel": "middle-east",
  "jordan": "middle-east",
  "iraq": "middle-east",
  "kuwait": "middle-east",
  "saudi": "middle-east",
  "yemen": "middle-east",
  "oman": "middle-east",
  "emirates": "middle-east",
  "qatar": "middle-east",
  "iran": "middle-east",
  "afghanistan": "middle-east",
  "azerbaijan": "middle-east",
  "armenia": "middle-east",
  "georgia": "middle-east",
  "kazakhstan": "middle-east",
  "kirgizstan": "middle-east",
  "tajikistan": "middle-east",
  "turkmenistan": "middle-east",
  "uzbekistan": "middle-east",

  // -------------------------
  // AFRICA
  // -------------------------
  "morocco": "africa",
  "algeria": "africa",
  "tunisia": "africa",
  "libya": "africa",
  "egypt": "africa",
  "mauretania": "africa",
  "mali": "africa",
  "niger": "africa",
  "chad": "africa",
  "sudan": "africa",
  "south sudan": "africa",
  "senegal": "africa",
  "gambia": "africa",
  "casamance": "africa",
  "bissau": "africa",
  "guinee": "africa",
  "sierra leone": "africa",
  "liberia": "africa",
  "ivoire": "africa",
  "burkina": "africa",
  "ghana": "africa",
  "togo": "africa",
  "benin": "africa",
  "nigeria": "africa",
  "cameroon": "africa",
  "centrafrique": "africa",
  "equatorial guinea": "africa",
  "bioko": "africa",
  "gabon": "africa",
  "sao tome": "africa",
  "principe": "africa",
  "cabinda": "africa",
  "congo": "africa",
  "drc": "africa",
  "rwanda": "africa",
  "burundi": "africa",
  "uganda": "africa",
  "eritrea": "africa",
  "djibouti": "africa",
  "ethiopia": "africa",
  "somalia": "africa",
  "somaliland": "africa",
  "kenya": "africa",
  "tanzania": "africa",
  "zambia": "africa",
  "malawi": "africa",
  "mozambique": "africa",
  "zimbabwe": "africa",
  "angola": "africa",
  "namibia": "africa",
  "botswana": "africa",
  "swaziland": "africa",
  "lesotho": "africa",
  "south africa": "africa",
  "madagascar": "africa",
  "mauritius": "africa",
  "reunion": "africa",

  // -------------------------
  // SOUTH ASIA
  // -------------------------
  "pakistan": "south-asia",
  "india": "south-asia",
  "sri lanka": "south-asia",
  "bangladesh": "south-asia",
  "bhutan": "south-asia",
  "nepal": "south-asia",

  // -------------------------
  // SOUTHEAST ASIA
  // -------------------------
  "burma": "southeast-asia",
  "thailand": "southeast-asia",
  "laos": "southeast-asia",
  "cambodia": "southeast-asia",
  "vietnam": "southeast-asia",
  "malaysia": "southeast-asia",
  "brunei": "southeast-asia",
  "east malaysia": "southeast-asia",
  "kalimantan": "southeast-asia",
  "sumatra": "southeast-asia",
  "java": "southeast-asia",
  "bali": "southeast-asia",
  "lombok": "southeast-asia",
  "sumba": "southeast-asia",
  "flores": "southeast-asia",
  "timor": "southeast-asia",
  "sulawesi": "southeast-asia",
  "maluku": "southeast-asia",
  "seram": "southeast-asia",
  "luzon": "southeast-asia",
  "mindoro": "southeast-asia",
  "samar": "southeast-asia",
  "cebu": "southeast-asia",
  "negros": "southeast-asia",
  "palawan": "southeast-asia",
  "bougainville": "southeast-asia",
  "malaita": "southeast-asia",

  // -------------------------
  // EAST ASIA
  // -------------------------
  "china": "east-asia",
  "hainan": "east-asia",
  "mongolia": "east-asia",
  "north korea": "east-asia",
  "south korea": "east-asia",
  "honshu": "east-asia",
  "hokkaido": "east-asia",
  "shikoku": "east-asia",
  "kyushu": "east-asia",
  "taiwan": "east-asia",

  // -------------------------
  // AUSTRALIA / OCEANIA
  // -------------------------
  "australia": "australia",
  "tasmania": "australia",
  "papua new guinea": "australia",
  "irian jaya": "australia",
  "new britain": "australia",
  "new ireland": "australia",
  "new georgia": "australia",
  "new zealand north island": "australia",
  "new zealand south island": "australia",
  "new caledonia": "australia",
  "espiritu santo": "australia",
  "fiji": "australia",
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Get the total count of all handled territories
 */
export function getTotalHandledCount(): number {
  return (
    Object.keys(COUNTRY_TO_REGION).length +
    ARCTIC_TERRITORIES.size +
    LOCKED_TERRITORIES.size
  );
}

/**
 * Check if a normalized country ID is handled
 */
export function isCountryHandled(normalizedId: string): boolean {
  return (
    normalizedId in COUNTRY_TO_REGION ||
    ARCTIC_TERRITORIES.has(normalizedId) ||
    LOCKED_TERRITORIES.has(normalizedId)
  );
}

/**
 * Get the region for a country, or null if it's arctic/locked
 */
export function getCountryRegion(normalizedId: string): string | null {
  if (ARCTIC_TERRITORIES.has(normalizedId) || LOCKED_TERRITORIES.has(normalizedId)) {
    return null;
  }
  return COUNTRY_TO_REGION[normalizedId] || null;
}

/**
 * Check if a country is in the Arctic Circle
 */
export function isArctic(normalizedId: string): boolean {
  return ARCTIC_TERRITORIES.has(normalizedId);
}

/**
 * Check if a country is locked
 */
export function isLocked(normalizedId: string): boolean {
  return LOCKED_TERRITORIES.has(normalizedId);
}
