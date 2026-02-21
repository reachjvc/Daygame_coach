const ARCHETYPE_FILES = [
  "academic-intellectual.jpg",
  "bohemian-alt.jpg",
  "corporate-powerhouse.jpg",
  "disciplined-athlete.jpg",
  "ethereal-creative.jpg",
  "fashion-scenester.jpg",
  "guarded-realist.jpg",
  "modern-traditionalist.jpg",
  "social-connector.jpg",
  "urban-nomad.jpg",
]

const AGE_FOLDERS = ["18", "25", "30", "37"]

/** Maps region IDs to the image set folder name under public/archetypes/ */
const REGION_TO_IMAGE_FOLDER: Record<string, string> = {
  "scandinavia": "scandinavian",
  "slavic-europe": "scandinavian",
  "eastern-europe": "scandinavian",
  "western-europe": "western-european",
  "north-america": "western-european",
  "australia": "western-european",
  "southern-europe": "mediterranean",
  "latin-america": "latin-american",
  "east-asia": "east-asian",
  "southeast-asia": "southeast-asian",
  "south-asia": "south-asian",
  "middle-east": "south-asian",
  "africa": "african",
}

const DEFAULT_FOLDER = "scandinavian"

/** Region folders that have images on disk. Add folder names here as image sets are generated. */
const AVAILABLE_FOLDERS = new Set(["scandinavian", "african", "western-european", "mediterranean", "latin-american", "east-asian", "southeast-asian", "south-asian"])

const resolveAgeFolder = (avgAge: number) =>
  avgAge < 22 ? "18" : avgAge < 28 ? "25" : avgAge < 34 ? "30" : "37"

const resolveRegionFolder = (region?: string): string => {
  if (!region) return DEFAULT_FOLDER
  const folder = REGION_TO_IMAGE_FOLDER[region] ?? DEFAULT_FOLDER
  return AVAILABLE_FOLDERS.has(folder) ? folder : DEFAULT_FOLDER
}

const getImagePath = (regionFolder: string, ageFolder: string, fileName: string) =>
  `/archetypes/${regionFolder}/${ageFolder}/${fileName}`

export const getArchetypes = (ageRange: number[], region?: string) => {
  const avgAge = Math.floor((ageRange[0] + ageRange[1]) / 2)
  const ageFolder = resolveAgeFolder(avgAge)
  const regionFolder = resolveRegionFolder(region)

  const img = (fileName: string) => getImagePath(regionFolder, ageFolder, fileName)

  return [
    {
      name: "Corporate Powerhouse",
      vibe: "Polished, fast-paced, high-status",
      barrier: "Efficiency: She views the approach through a 'cost-benefit' lens of her time",
      image: img("corporate-powerhouse.jpg"),
    },
    {
      name: "Ethereal Creative",
      vibe: "Artsy, individualistic, slightly detached",
      barrier: "Authenticity: She detects 'scripts' immediately. She wants a 'vibe' or a 'spark'",
      image: img("ethereal-creative.jpg"),
    },
    {
      name: "Disciplined Athlete",
      vibe: "Direct, high-energy, no-nonsense",
      barrier: "Directness: She respects strength and clarity. Don't 'pander' to her",
      image: img("disciplined-athlete.jpg"),
    },
    {
      name: "Academic/Intellectual",
      vibe: "Observant, cautious, thoughtful",
      barrier: "Logic: She needs a 'reason' for the approach that makes sense to her brain",
      image: img("academic-intellectual.jpg"),
    },
    {
      name: "Fashion Scenester",
      vibe: "Trend-conscious, high social awareness",
      barrier: "Status: She is checking if you 'belong' in her social tier",
      image: img("fashion-scenester.jpg"),
    },
    {
      name: "Bohemian/Alt",
      vibe: "Relaxed, non-conformist, warm",
      barrier: "Judgment: She is sensitive to 'aggressive' or 'creepy' energy",
      image: img("bohemian-alt.jpg"),
    },
    {
      name: "Modern Traditionalist",
      vibe: "Family-oriented, polite, reserved",
      barrier: "Modesty: She is wary of 'pick-up' vibes; she values 'gentlemanly' intent",
      image: img("modern-traditionalist.jpg"),
    },
    {
      name: "Urban Nomad",
      vibe: "Tourist, traveler, open-minded",
      barrier: "Adventure: She is looking for an 'experience' or a 'local' connection",
      image: img("urban-nomad.jpg"),
    },
    {
      name: "Guarded Realist",
      vibe: "Practical, slightly skeptical, emotionally contained",
      barrier: "Safety & credibility. Common in: Nordic cities, post-30 demographics",
      image: img("guarded-realist.jpg"),
    },
    {
      name: "Social Connector",
      vibe: "Warm, talkative, network-oriented",
      barrier: "Social proof (who are you, where are you from). Common in: nightlife-adjacent daygame",
      image: img("social-connector.jpg"),
    },
  ]
}

export const ethnicities = [
  "Asian",
  "Black",
  "Caucasian",
  "Hispanic/Latina",
  "Middle Eastern",
  "Mixed",
  "No Preference",
]
