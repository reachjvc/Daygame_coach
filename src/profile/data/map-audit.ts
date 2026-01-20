/**
 * Map Audit Utility
 *
 * Extracts and analyzes all country path IDs from the world map SVG.
 * Used for debugging and ensuring complete country-to-region mapping.
 */

export interface CountryPath {
  id: string;
  normalizedId: string;
  displayName: string;
}

/**
 * Normalizes a country ID for consistent matching
 */
export function normalizeCountryId(id: string): string {
  return id.toLowerCase().trim().replace(/_/g, ' ');
}

/**
 * Converts a country ID to a display name
 */
export function getDisplayName(id: string): string {
  const normalized = normalizeCountryId(id);

  // Custom display names for special cases
  const customNames: Record<string, string> = {
    'alaska-westcopy': 'Alaska',
    'adak': 'USA',
    'adak west': 'USA',
    'amchitka': 'USA',
    'amchitka west': 'USA',
    'another aleutian west': 'USA',
    'attu': 'USA',
    'attu west': 'USA',
    'umnak': 'USA',
    'umnak west': 'USA',
    'unalaska': 'USA',
    'unalaska west': 'USA',
    'newfoundland': 'Canada',
    'vancouver': 'Canada',
    'haida gwaii': 'Canada',
    'usa': 'USA',
    'south africa': 'South Africa',
    'north macedonia': 'North Macedonia',
    'south korea': 'South Korea',
    'north korea': 'North Korea',
    'disko': 'Disko Island',
    'milne': 'Milne Land',
    'southhampton': 'Southampton Island',
    'novaya zemlya north': 'Novaya Zemlya (North)',
    'novaya zemlya south': 'Novaya Zemlya (South)',
    'novaya sibir': 'Novaya Sibir',
    'kotelny': 'Kotelny Island',
    'lyakhovsky': 'Lyakhovsky Islands',
    'komsomolets': 'Komsomolets Island',
    'bolshevik': 'Bolshevik Island',
    'october': 'October Revolution Island',
    'wrangel-w': 'Wrangel (West)',
    'new zealand north island': 'New Zealand',
    'new zealand south island': 'New Zealand',
    'papua new guinea': 'Papua New Guinea',
    'new britain': 'Papua New Guinea',
    'new ireland': 'Papua New Guinea',
    'bougainville': 'Papua New Guinea',
    'sri lanka': 'Sri Lanka',
    'saudi': 'Saudi Arabia',
    'emirates': 'UAE',
    'britain': 'United Kingdom',
    'ulster': 'United Kingdom',
    'corsica': 'France',
    'drc': 'DR Congo',
    'south_sudan': 'South Sudan',
    'falklands east': 'Falkland Islands (East)',
    'falklands west': 'Falkland Islands (West)',
    'puerto rico': 'Puerto Rico (USA)',
    'st. lawrence island': 'St. Lawrence Island',
    'st. lawrence island west': 'St. Lawrence Island (West)',
    'east malaysia': 'Malaysia',
    'east antarctica': 'East Antarctica',
    'tierra del fuego argentina': 'Argentina',
    'tierra del fuego chile': 'Chile',
    'chiloe': 'Chile',
    'gotland': 'Sweden',
    'sjælland': 'Denmark',
    'hiumaa': 'Estonia',
    'saaremaa': 'Estonia',
    'sakhalin': 'Russia',
    'gran canaria': 'Spain',
    'tenerife': 'Spain',
    'lanzarote': 'Spain',
    'majorca': 'Spain',
    'madeira': 'Portugal',
    'sicily': 'Italy',
    'sardinia': 'Italy',
    'crete': 'Greece',
    'hainan': 'China',
    'honshu': 'Japan',
    'hokkaido': 'Japan',
    'shikoku': 'Japan',
    'kyushu': 'Japan',
    'kalimantan': 'Indonesia',
    'sumatra': 'Indonesia',
    'java': 'Indonesia',
    'bali': 'Indonesia',
    'lombok': 'Indonesia',
    'sumba': 'Indonesia',
    'flores': 'Indonesia',
    'timor': 'Indonesia',
    'sulawesi': 'Indonesia',
    'maluku': 'Indonesia',
    'seram': 'Indonesia',
    'irian jaya': 'Indonesia',
    'luzon': 'Philippines',
    'mindoro': 'Philippines',
    'samar': 'Philippines',
    'cebu': 'Philippines',
    'negros': 'Philippines',
    'palawan': 'Philippines',
    'malaita': 'Solomon Islands',
    'new georgia': 'Solomon Islands',
    'tasmania': 'Australia',
    'espiritu santo': 'Vanuatu',
    'bioko': 'Equatorial Guinea',
    'cabinda': 'Angola',
    'casamance': 'Senegal',
    'sao tome': 'Sao Tome and Principe',
    'principe': 'Sao Tome and Principe',
  };

  if (customNames[normalized]) {
    return customNames[normalized];
  }

  // Capitalize each word
  return normalized
    .split(/[-_ ]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Checks if an ID is a noise/non-country path
 */
export function isNoiseId(id: string): boolean {
  const noisePatterns = [
    /^path\d+$/i,        // path123, path302, path7462
    /^path-\d+$/i,       // path-123, path-1
    /^svg\d*$/i,         // svg, svg2
    /^defs\d*$/i,        // defs, defs344
    /^metadata\d*$/i,    // metadata346
    /^namedview\d*$/i,   // namedview342
    /^false$/i,          // false
    /^desc\d+$/i,        // desc7821
    /^path-effect/i,     // path-effect1, path-effect2, etc.
  ];

  return noisePatterns.some(pattern => pattern.test(id));
}

/**
 * Parses the SVG and extracts all country path IDs
 */
export async function extractCountryPaths(): Promise<CountryPath[]> {
  try {
    const response = await fetch('/world-map.svg');
    const svgText = await response.text();

    // Extract all id attributes
    const idMatches = svgText.matchAll(/id="([^"]*)"/g);
    const paths: CountryPath[] = [];

    for (const match of idMatches) {
      const id = match[1];

      // Skip noise IDs
      if (isNoiseId(id)) {
        continue;
      }

      const normalizedId = normalizeCountryId(id);
      const displayName = getDisplayName(id);

      paths.push({
        id,
        normalizedId,
        displayName,
      });
    }

    // Sort by normalized ID
    paths.sort((a, b) => a.normalizedId.localeCompare(b.normalizedId));

    return paths;
  } catch (error) {
    console.error('Failed to extract country paths:', error);
    return [];
  }
}

/**
 * Categorizes a country path based on mapping
 */
export function categorizeCountry(
  normalizedId: string,
  countryToRegion: Record<string, string>,
  arcticTerritories: Set<string>,
  lockedTerritories: Set<string>
): 'mapped' | 'arctic' | 'locked' | 'unassigned' {
  if (arcticTerritories.has(normalizedId)) return 'arctic';
  if (lockedTerritories.has(normalizedId)) return 'locked';
  if (countryToRegion[normalizedId]) return 'mapped';
  return 'unassigned';
}

/**
 * Generates a full audit report
 */
export interface AuditReport {
  totalPaths: number;
  mapped: CountryPath[];
  arctic: CountryPath[];
  locked: CountryPath[];
  unassigned: CountryPath[];
  regionCounts: Record<string, number>;
}

export async function generateAuditReport(
  countryToRegion: Record<string, string>,
  arcticTerritories: Set<string>,
  lockedTerritories: Set<string>
): Promise<AuditReport> {
  const allPaths = await extractCountryPaths();

  const report: AuditReport = {
    totalPaths: allPaths.length,
    mapped: [],
    arctic: [],
    locked: [],
    unassigned: [],
    regionCounts: {},
  };

  for (const path of allPaths) {
    const category = categorizeCountry(
      path.normalizedId,
      countryToRegion,
      arcticTerritories,
      lockedTerritories
    );

    switch (category) {
      case 'mapped':
        report.mapped.push(path);
        const region = countryToRegion[path.normalizedId];
        report.regionCounts[region] = (report.regionCounts[region] || 0) + 1;
        break;
      case 'arctic':
        report.arctic.push(path);
        break;
      case 'locked':
        report.locked.push(path);
        break;
      case 'unassigned':
        report.unassigned.push(path);
        break;
    }
  }

  return report;
}
