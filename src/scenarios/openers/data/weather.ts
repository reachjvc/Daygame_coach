/**
 * WEATHER SYSTEM
 *
 * Weather affects:
 * 1. What the user sees (optional weather description)
 * 2. What the woman is wearing (weather-appropriate modifiers)
 * 3. Her behavior/energy (harder weather = more closed off)
 *
 * Weather is weighted by difficulty:
 * - Lower difficulty = pleasant weather (sunny, mild)
 * - Higher difficulty = challenging weather (rainy, windy, cold)
 */

import type { DifficultyLevel } from "./energy";

export type WeatherType =
  | "sunny"
  | "partly_cloudy"
  | "overcast"
  | "light_rain"
  | "rain"
  | "windy"
  | "cold"
  | "hot"
  | "mild";

export type Season = "spring" | "summer" | "autumn" | "winter";

interface WeatherConfig {
  id: WeatherType;
  name: string;
  /** User-facing descriptions of the weather */
  descriptions: string[];
  /** How this weather affects her demeanor (-1 to +1, negative = more closed) */
  moodModifier: number;
  /** Outfit modifiers - what she might be wearing/doing because of weather */
  outfitModifiers: string[];
  /** Behavior modifiers - how she's reacting to the weather */
  behaviorModifiers: string[];
}

export const WEATHER_CONFIGS: Record<WeatherType, WeatherConfig> = {
  sunny: {
    id: "sunny",
    name: "Sunny",
    descriptions: [
      "It's a sunny day.",
      "The sun is out.",
      "It's bright and sunny.",
      "The weather is beautiful.",
    ],
    moodModifier: 0.1,
    outfitModifiers: [
      "She's wearing sunglasses.",
      "She has sunglasses on her head.",
      "She's squinting slightly in the sun.",
    ],
    behaviorModifiers: [
      "She's enjoying the sunshine.",
      "She's staying in the shade.",
    ],
  },

  partly_cloudy: {
    id: "partly_cloudy",
    name: "Partly Cloudy",
    descriptions: [
      "It's partly cloudy.",
      "There are some clouds in the sky.",
      "The sun keeps going behind clouds.",
    ],
    moodModifier: 0.05,
    outfitModifiers: [],
    behaviorModifiers: [],
  },

  overcast: {
    id: "overcast",
    name: "Overcast",
    descriptions: [
      "It's overcast.",
      "The sky is grey.",
      "It's a cloudy day.",
      "It looks like it might rain.",
    ],
    moodModifier: -0.05,
    outfitModifiers: [
      "She's carrying an umbrella.",
      "She has a jacket with her.",
    ],
    behaviorModifiers: [
      "She keeps glancing at the sky.",
    ],
  },

  light_rain: {
    id: "light_rain",
    name: "Light Rain",
    descriptions: [
      "It's drizzling.",
      "There's a light rain.",
      "It's spitting.",
      "There's a fine mist of rain.",
    ],
    moodModifier: -0.1,
    outfitModifiers: [
      "She has her hood up.",
      "She's holding an umbrella.",
      "Her hair is slightly damp.",
      "She's wearing a rain jacket.",
    ],
    behaviorModifiers: [
      "She's walking quickly to stay dry.",
      "She's sheltering under an awning.",
      "She's trying to stay dry.",
    ],
  },

  rain: {
    id: "rain",
    name: "Rain",
    descriptions: [
      "It's raining.",
      "The rain is coming down.",
      "It's a rainy day.",
      "It's raining steadily.",
    ],
    moodModifier: -0.2,
    outfitModifiers: [
      "She's under an umbrella.",
      "She's in a raincoat.",
      "Her clothes are a bit wet.",
      "She has her hood pulled up.",
      "She's carrying a wet umbrella.",
    ],
    behaviorModifiers: [
      "She's hurrying through the rain.",
      "She's waiting for the rain to ease.",
      "She's sheltering from the rain.",
      "She looks like she got caught in the rain.",
    ],
  },

  windy: {
    id: "windy",
    name: "Windy",
    descriptions: [
      "It's windy.",
      "There's a strong wind.",
      "The wind is picking up.",
      "It's quite blustery.",
    ],
    moodModifier: -0.15,
    outfitModifiers: [
      "Her hair is blowing in the wind.",
      "She's holding her hair back.",
      "Her scarf is flapping.",
      "She's wearing a windbreaker.",
    ],
    behaviorModifiers: [
      "She's battling the wind.",
      "She's holding onto her hat.",
      "She's trying to keep her hair under control.",
      "She's leaning into the wind.",
    ],
  },

  cold: {
    id: "cold",
    name: "Cold",
    descriptions: [
      "It's cold out.",
      "It's a chilly day.",
      "There's a bite in the air.",
      "It's quite cold.",
    ],
    moodModifier: -0.1,
    outfitModifiers: [
      "She's bundled up in a coat.",
      "She's wearing a scarf and gloves.",
      "She's in a warm jacket.",
      "She has a beanie on.",
      "She's wearing layers.",
    ],
    behaviorModifiers: [
      "She has her hands in her pockets.",
      "She looks cold.",
      "She's walking quickly to stay warm.",
      "She's holding a hot drink.",
    ],
  },

  hot: {
    id: "hot",
    name: "Hot",
    descriptions: [
      "It's hot out.",
      "It's a hot day.",
      "The heat is intense.",
      "It's sweltering.",
    ],
    moodModifier: -0.05,
    outfitModifiers: [
      "She has sunglasses on.",
      "She's carrying a water bottle.",
      "She has a sun hat on.",
    ],
    behaviorModifiers: [
      "She's fanning herself.",
      "She's staying in the shade.",
      "She looks hot.",
      "She's drinking water.",
    ],
  },

  mild: {
    id: "mild",
    name: "Mild",
    descriptions: [
      "The weather is mild.",
      "It's a pleasant day.",
      "The temperature is comfortable.",
      "It's nice out.",
    ],
    moodModifier: 0.05,
    outfitModifiers: [],
    behaviorModifiers: [],
  },
};

/**
 * Weather weights by difficulty level.
 * Higher weight = more likely to be selected at that difficulty.
 */
const WEATHER_WEIGHTS: Record<DifficultyLevel, Record<WeatherType, number>> = {
  beginner: {
    sunny: 0.35,
    partly_cloudy: 0.2,
    overcast: 0.1,
    light_rain: 0.0,
    rain: 0.0,
    windy: 0.0,
    cold: 0.05,
    hot: 0.1,
    mild: 0.2,
  },
  intermediate: {
    sunny: 0.25,
    partly_cloudy: 0.2,
    overcast: 0.15,
    light_rain: 0.05,
    rain: 0.0,
    windy: 0.05,
    cold: 0.1,
    hot: 0.1,
    mild: 0.1,
  },
  advanced: {
    sunny: 0.15,
    partly_cloudy: 0.15,
    overcast: 0.2,
    light_rain: 0.1,
    rain: 0.05,
    windy: 0.1,
    cold: 0.1,
    hot: 0.05,
    mild: 0.1,
  },
  expert: {
    sunny: 0.1,
    partly_cloudy: 0.1,
    overcast: 0.15,
    light_rain: 0.15,
    rain: 0.1,
    windy: 0.15,
    cold: 0.15,
    hot: 0.0,
    mild: 0.1,
  },
  master: {
    sunny: 0.05,
    partly_cloudy: 0.05,
    overcast: 0.15,
    light_rain: 0.2,
    rain: 0.15,
    windy: 0.2,
    cold: 0.15,
    hot: 0.0,
    mild: 0.05,
  },
};

/**
 * Season weights - which weather types are more common in each season
 */
const SEASON_WEATHER_MODIFIERS: Record<Season, Partial<Record<WeatherType, number>>> = {
  spring: {
    light_rain: 1.5,
    rain: 1.3,
    mild: 1.5,
    windy: 1.2,
  },
  summer: {
    sunny: 1.8,
    hot: 2.0,
    partly_cloudy: 1.3,
    cold: 0.1,
  },
  autumn: {
    overcast: 1.5,
    windy: 1.5,
    rain: 1.3,
    cold: 1.3,
  },
  winter: {
    cold: 2.0,
    overcast: 1.5,
    rain: 1.2,
    sunny: 0.5,
    hot: 0.0,
  },
};

/**
 * Sample weather based on difficulty and optional season
 */
export function sampleWeather(
  difficulty: DifficultyLevel,
  season?: Season
): WeatherType {
  const baseWeights = { ...WEATHER_WEIGHTS[difficulty] };

  // Apply seasonal modifiers if season is provided
  if (season) {
    const seasonMods = SEASON_WEATHER_MODIFIERS[season];
    for (const [weather, modifier] of Object.entries(seasonMods)) {
      if (baseWeights[weather as WeatherType] !== undefined) {
        baseWeights[weather as WeatherType] *= modifier;
      }
    }
  }

  const entries = Object.entries(baseWeights) as [WeatherType, number][];
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (const [weather, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      return weather;
    }
  }

  return "mild"; // Fallback
}

/**
 * Get weather description text based on difficulty
 * Returns empty string if weather shouldn't be shown
 */
export function getWeatherText(
  weather: WeatherType,
  difficulty: DifficultyLevel
): string {
  const config = WEATHER_CONFIGS[weather];

  // Visibility decreases with difficulty
  const showProbability: Record<DifficultyLevel, number> = {
    beginner: 0.8,
    intermediate: 0.6,
    advanced: 0.4,
    expert: 0.2,
    master: 0.1,
  };

  if (Math.random() > showProbability[difficulty]) {
    return "";
  }

  return config.descriptions[Math.floor(Math.random() * config.descriptions.length)];
}

/**
 * Get weather-related outfit modifier
 */
export function getWeatherOutfitModifier(
  weather: WeatherType,
  difficulty: DifficultyLevel
): string {
  const config = WEATHER_CONFIGS[weather];

  if (config.outfitModifiers.length === 0) {
    return "";
  }

  // Show outfit modifiers more at lower difficulty
  const showProbability: Record<DifficultyLevel, number> = {
    beginner: 0.6,
    intermediate: 0.4,
    advanced: 0.25,
    expert: 0.15,
    master: 0.05,
  };

  if (Math.random() > showProbability[difficulty]) {
    return "";
  }

  return config.outfitModifiers[
    Math.floor(Math.random() * config.outfitModifiers.length)
  ];
}

/**
 * Get weather-related behavior modifier
 */
export function getWeatherBehaviorModifier(
  weather: WeatherType,
  difficulty: DifficultyLevel
): string {
  const config = WEATHER_CONFIGS[weather];

  if (config.behaviorModifiers.length === 0) {
    return "";
  }

  // Show behavior modifiers more at lower difficulty
  const showProbability: Record<DifficultyLevel, number> = {
    beginner: 0.5,
    intermediate: 0.35,
    advanced: 0.2,
    expert: 0.1,
    master: 0.05,
  };

  if (Math.random() > showProbability[difficulty]) {
    return "";
  }

  return config.behaviorModifiers[
    Math.floor(Math.random() * config.behaviorModifiers.length)
  ];
}

/**
 * Get weather mood modifier (affects approachability)
 */
export function getWeatherMoodModifier(weather: WeatherType): number {
  return WEATHER_CONFIGS[weather].moodModifier;
}

/**
 * Get AI description of how weather affects the scenario
 */
export function getWeatherAiDescription(weather: WeatherType): string {
  const config = WEATHER_CONFIGS[weather];
  const mood = config.moodModifier;

  let moodDescription = "";
  if (mood > 0.05) {
    moodDescription = "The pleasant weather puts her in a slightly better mood.";
  } else if (mood < -0.15) {
    moodDescription = "The weather is making her less receptive to being stopped.";
  } else if (mood < -0.05) {
    moodDescription = "The weather is mildly affecting her mood.";
  }

  return `Weather: ${config.name}. ${moodDescription}`.trim();
}

// Weather categories for sandbox filtering
const BAD_WEATHER_TYPES: WeatherType[] = [
  "rain",
  "light_rain",
  "cold",
  "windy",
  "overcast",
];

const HOT_WEATHER_TYPES: WeatherType[] = ["hot"];

export interface WeatherSandboxFilters {
  enableBadWeather?: boolean;
  enableHotWeather?: boolean;
}

/**
 * Sample weather with sandbox filters applied
 */
export function sampleWeatherWithFilters(
  difficulty: DifficultyLevel,
  season?: Season,
  filters?: WeatherSandboxFilters
): WeatherType {
  const baseWeights = { ...WEATHER_WEIGHTS[difficulty] };

  // Apply seasonal modifiers if season is provided
  if (season) {
    const seasonMods = SEASON_WEATHER_MODIFIERS[season];
    for (const [weather, modifier] of Object.entries(seasonMods)) {
      if (baseWeights[weather as WeatherType] !== undefined) {
        baseWeights[weather as WeatherType] *= modifier;
      }
    }
  }

  // Apply sandbox filters - set weight to 0 for disabled weather types
  if (filters) {
    if (filters.enableBadWeather === false) {
      for (const weather of BAD_WEATHER_TYPES) {
        baseWeights[weather] = 0;
      }
    }
    if (filters.enableHotWeather === false) {
      for (const weather of HOT_WEATHER_TYPES) {
        baseWeights[weather] = 0;
      }
    }
  }

  const entries = Object.entries(baseWeights) as [WeatherType, number][];
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);

  // Fallback: if all weights are 0, return pleasant weather
  if (totalWeight === 0) {
    const pleasantWeather: WeatherType[] = ["sunny", "partly_cloudy", "mild"];
    return pleasantWeather[Math.floor(Math.random() * pleasantWeather.length)];
  }

  let random = Math.random() * totalWeight;

  for (const [weather, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      return weather;
    }
  }

  return "mild";
}
