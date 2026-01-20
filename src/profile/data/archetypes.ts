const AVAILABLE_IMAGES = new Set([
  "/archetypes/18/powerhouse_scandinavian.jpg",
  "/archetypes/25/bohemian-alt.jpg",
  "/archetypes/25/corporate-powerhouse.jpg",
  "/archetypes/25/disciplined-athlete.jpg",
  "/archetypes/25/ethereal-creative.jpg",
  "/archetypes/25/fashion-scenester.jpg",
  "/archetypes/25/guarded-realist.jpg",
  "/archetypes/25/modern-traditionalist.jpg",
  "/archetypes/25/social-connector.jpg",
  "/archetypes/25/urban-nomad.jpg",
  "/archetypes/30/academic-intellectual.jpg",
  "/archetypes/30/corporate-powerhouse.jpg",
  "/archetypes/30/disciplined-athlete.jpg",
  "/archetypes/30/ethereal-creative.jpg",
  "/archetypes/30/fashion-scenester.jpg",
])

const AVAILABLE_FOLDERS = new Set(
  Array.from(AVAILABLE_IMAGES, (path) => path.split("/")[2])
)

const resolveAgeFolder = (avgAge: number) => {
  const preferred = avgAge < 30 ? "25" : avgAge < 35 ? "30" : "35"
  if (AVAILABLE_FOLDERS.has(preferred)) {
    return preferred
  }
  if (AVAILABLE_FOLDERS.has("30")) {
    return "30"
  }
  return AVAILABLE_FOLDERS.has("25") ? "25" : preferred
}

const getImagePath = (ageFolder: string, fileName: string) => {
  const path = `/archetypes/${ageFolder}/${fileName}`
  return AVAILABLE_IMAGES.has(path) ? path : null
}

export const getArchetypes = (ageRange: number[]) => {
  const avgAge = Math.floor((ageRange[0] + ageRange[1]) / 2)
  const ageFolder = resolveAgeFolder(avgAge)

  return [
    {
      name: "Corporate Powerhouse",
      vibe: "Polished, fast-paced, high-status",
      barrier: "Efficiency: She views the approach through a 'cost-benefit' lens of her time",
      image: getImagePath(ageFolder, "corporate-powerhouse.jpg"),
    },
    {
      name: "Ethereal Creative",
      vibe: "Artsy, individualistic, slightly detached",
      barrier: "Authenticity: She detects 'scripts' immediately. She wants a 'vibe' or a 'spark'",
      image: getImagePath(ageFolder, "ethereal-creative.jpg"),
    },
    {
      name: "Disciplined Athlete",
      vibe: "Direct, high-energy, no-nonsense",
      barrier: "Directness: She respects strength and clarity. Don't 'pander' to her",
      image: getImagePath(ageFolder, "disciplined-athlete.jpg"),
    },
    {
      name: "Academic/Intellectual",
      vibe: "Observant, cautious, thoughtful",
      barrier: "Logic: She needs a 'reason' for the approach that makes sense to her brain",
      image: getImagePath(ageFolder, "academic-intellectual.jpg"),
    },
    {
      name: "Fashion Scenester",
      vibe: "Trend-conscious, high social awareness",
      barrier: "Status: She is checking if you 'belong' in her social tier",
      image: getImagePath(ageFolder, "fashion-scenester.jpg"),
    },
    {
      name: "Bohemian/Alt",
      vibe: "Relaxed, non-conformist, warm",
      barrier: "Judgment: She is sensitive to 'aggressive' or 'creepy' energy",
      image: getImagePath(ageFolder, "bohemian-alt.jpg"),
    },
    {
      name: "Modern Traditionalist",
      vibe: "Family-oriented, polite, reserved",
      barrier: "Modesty: She is wary of 'pick-up' vibes; she values 'gentlemanly' intent",
      image: getImagePath(ageFolder, "modern-traditionalist.jpg"),
    },
    {
      name: "Urban Nomad",
      vibe: "Tourist, traveler, open-minded",
      barrier: "Adventure: She is looking for an 'experience' or a 'local' connection",
      image: getImagePath(ageFolder, "urban-nomad.jpg"),
    },
    {
      name: "Guarded Realist",
      vibe: "Practical, slightly skeptical, emotionally contained",
      barrier: "Safety & credibility. Common in: Nordic cities, post-30 demographics",
      image: getImagePath(ageFolder, "guarded-realist.jpg"),
    },
    {
      name: "Social Connector",
      vibe: "Warm, talkative, network-oriented",
      barrier: "Social proof (who are you, where are you from). Common in: nightlife-adjacent daygame",
      image: getImagePath(ageFolder, "social-connector.jpg"),
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
