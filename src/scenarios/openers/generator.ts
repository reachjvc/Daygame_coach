/**
 * SCENARIO GENERATOR V2
 *
 * Generates realistic daygame scenarios with:
 * - Position-constrained base texts
 * - Energy dimension (difficulty-weighted)
 * - Difficulty-based visibility filtering
 * - Environment weighting (for archetype integration)
 * - Subtle hooks/openers (difficulty-gated)
 * - Compact AI handoff format
 */

import {
  type EnergyState,
  type DifficultyLevel,
  sampleEnergy,
  sampleEnergyWithFilters,
  getEnergyText,
  getEnergyAiDescription,
  getEnergyApproachability,
} from "./data/energy";

import {
  type Position,
  type ActivityId,
  getBaseText,
  getValidPositions,
} from "./data/base-texts";
import {
  type OutfitCategory,
  getOutfitByCategory,
  getOutfitText,
  sampleOutfitCategory,
  // New enhanced outfit system
  selectOutfitForScenario,
  getAccessoryTextForDifficulty,
  getHairTextForDifficulty,
} from "./data/outfits";
import {
  type WeatherType,
  type Season,
  sampleWeather,
  sampleWeatherWithFilters,
  getWeatherText,
  getWeatherOutfitModifier,
  getWeatherBehaviorModifier,
  getWeatherMoodModifier,
  getWeatherAiDescription,
} from "./data/weather";
import { getCountryRegion, getDisplayName, normalizeCountryId } from "@/src/profile";
import { type SandboxSettings } from "../config";

// ============================================================================
// ENVIRONMENT TYPES AND WEIGHTS
// ============================================================================

export type EnvironmentCode =
  | "1.1"
  | "1.2"
  | "1.3"
  | "1.4"
  | "1.5"
  | "1.6"
  | "1.7"
  | "1.8"
  | "1.9"
  | "2.1"
  | "2.2"
  | "2.3"
  | "2.4"
  | "2.5"
  | "2.6"
  | "3.1"
  | "3.2"
  | "3.3"
  | "3.4"
  | "3.5"
  | "3.6"
  | "4.1"
  | "4.2"
  | "4.3"
  | "4.4"
  | "4.5"
  | "5.1"
  | "5.2"
  | "5.3"
  | "5.4"
  | "5.5"
  | "5.6"
  | "6.1"
  | "6.2"
  | "6.3"
  | "7.1"
  | "7.2"
  | "7.3"
  | "7.4"
  | "7.5"
  | "7.6";

export interface EnvironmentWeights {
  "1.1"?: number; // Shopping
  "1.2"?: number; // Commute/Work
  "1.3"?: number; // Transit
  "1.4"?: number; // Leisure
  "1.5"?: number; // Waiting
  "1.6"?: number; // Food/Drink
  "1.7"?: number; // Digital/Media
  "1.8"?: number; // Pet Activities
  "1.9"?: number; // Utility
  "2.1"?: number; // Mall - Customer Browsing
  "2.2"?: number; // Mall - Employee
  "2.3"?: number; // Mall - Food Court
  "2.4"?: number; // Mall - Transit/Movement
  "2.5"?: number; // Mall - Digital/Media
  "2.6"?: number; // Mall - Waiting
  "3.1"?: number; // Coffee Shop - Work/Productivity
  "3.2"?: number; // Coffee Shop - Leisure/Relaxation
  "3.3"?: number; // Coffee Shop - Waiting/Social
  "3.4"?: number; // Coffee Shop - Ordering/Service
  "3.5"?: number; // Coffee Shop - Digital/Media
  "3.6"?: number; // Coffee Shop - Break/Idle
  "4.1"?: number; // Transit - Waiting
  "4.2"?: number; // Transit - Arriving/Departing
  "4.3"?: number; // Transit - Digital/Media
  "4.4"?: number; // Transit - Utility/Help
  "4.5"?: number; // Transit - Idle
  "5.1"?: number; // Park - Sitting/Relaxing
  "5.2"?: number; // Park - Walking
  "5.3"?: number; // Park - Exercise
  "5.4"?: number; // Park - Digital/Media
  "5.5"?: number; // Park - Social/Waiting
  "5.6"?: number; // Park - Special Activities
  "6.1"?: number; // Gym - Pre-Workout
  "6.2"?: number; // Gym - Post-Workout
  "6.3"?: number; // Gym - Digital/Media
  "7.1"?: number; // Campus - Between Classes
  "7.2"?: number; // Campus - Studying
  "7.3"?: number; // Campus - Social/Break
  "7.4"?: number; // Campus - Leisure
  "7.5"?: number; // Campus - Digital/Media
  "7.6"?: number; // Campus - Idle
}

/** Default environment weights (equal distribution) */
const DEFAULT_ENVIRONMENT_WEIGHTS: EnvironmentWeights = {
  "1.1": 1.0,
  "1.2": 1.0,
  "1.3": 1.0,
  "1.4": 1.0,
  "1.5": 1.0,
  "1.6": 1.0,
  "1.7": 1.0,
  "1.8": 1.0,
  "1.9": 1.0,
  "2.1": 1.0,
  "2.2": 1.0,
  "2.3": 1.0,
  "2.4": 1.0,
  "2.5": 1.0,
  "2.6": 1.0,
  "3.1": 1.0,
  "3.2": 1.0,
  "3.3": 1.0,
  "3.4": 1.0,
  "3.5": 1.0,
  "3.6": 1.0,
  "4.1": 1.0,
  "4.2": 1.0,
  "4.3": 1.0,
  "4.4": 1.0,
  "4.5": 1.0,
  "5.1": 1.0,
  "5.2": 1.0,
  "5.3": 1.0,
  "5.4": 1.0,
  "5.5": 1.0,
  "5.6": 1.0,
  "6.1": 1.0,
  "6.2": 1.0,
  "6.3": 1.0,
  "7.1": 1.0,
  "7.2": 1.0,
  "7.3": 1.0,
  "7.4": 1.0,
  "7.5": 1.0,
  "7.6": 1.0,
};

/**
 * Archetype environment preferences (for future archetype integration)
 * Higher weight = more likely to encounter in that environment
 */
export const ARCHETYPE_ENVIRONMENT_WEIGHTS: Record<string, EnvironmentWeights> = {
  powerhouse: {
    "1.2": 2.5, // Commute/Work - very likely
    "1.4": 0.5, // Leisure - less likely
    "1.6": 1.5, // Food/Drink - coffee runs
    "1.7": 0.8, // Digital - on phone for work
  },
  creative: {
    "1.1": 1.5, // Shopping - unique shops
    "1.4": 2.0, // Leisure - exploring, photography
    "1.6": 1.5, // Coffee shops
    "1.8": 0.5, // Less likely with pets
  },
  intellectual: {
    "1.4": 1.8, // Leisure - bookstores, museums
    "1.6": 1.5, // Coffee/reading
    "1.7": 1.2, // On phone (reading)
  },
  athlete: {
    "1.3": 1.5, // Transit - running/jogging
    "1.4": 2.0, // Leisure - parks, walking
    "1.6": 1.0, // Post-workout smoothie
    "1.8": 1.5, // Dog walking
  },
  socialite: {
    "1.1": 2.0, // Shopping
    "1.4": 1.5, // Leisure
    "1.5": 1.5, // Waiting for friends
    "1.6": 2.0, // Food/Drink - social spots
    "1.7": 1.5, // On phone
  },
  free_spirit: {
    "1.4": 2.5, // Leisure - wandering, exploring
    "1.1": 1.2, // Quirky shops
    "1.6": 1.0, // Cafes
    "1.8": 1.5, // Dog walking
  },
  nurturer: {
    "1.1": 1.5, // Shopping for others
    "1.5": 1.2, // Waiting
    "1.6": 1.5, // Food prep
    "1.8": 2.0, // Pet activities
  },
  rebel: {
    "1.3": 1.5, // Transit - moving through
    "1.4": 1.2, // Leisure
    "1.7": 1.5, // Headphones, music
    "1.2": 0.5, // Less likely in work areas
  },
};

// ============================================================================
// HOOKS / OPENER HINTS
// Subtle details that give natural conversation starters
// ============================================================================

interface HookConfig {
  /** The hook text that's appended to the description */
  text: string;
  /** Which activity IDs this hook applies to (empty = all) */
  activityIds?: ActivityId[];
  /** Which environment codes this hook applies to */
  envCodes?: EnvironmentCode[];
  /** Probability of this hook appearing (0-1) */
  probability: number;
}

const HOOKS: HookConfig[] = [
  // Shopping hooks
  {
    text: "She's looking at something interesting in the window.",
    envCodes: ["1.1"],
    probability: 0.15,
  },
  {
    text: "She seems to be deciding between two options.",
    activityIds: ["1.1.5", "1.1.6"],
    probability: 0.2,
  },
  {
    text: "She's carrying bags from a shop you recognize.",
    activityIds: ["1.1.4", "1.1.7"],
    probability: 0.12,
  },

  // Coffee/Food hooks
  {
    text: "She's holding a coffee from a place you know.",
    envCodes: ["1.6"],
    activityIds: ["1.2.4", "1.6.1"],
    probability: 0.15,
  },
  {
    text: "She's eating something that looks good.",
    activityIds: ["1.6.2", "1.6.3"],
    probability: 0.12,
  },

  // Navigation/Lost hooks
  {
    text: "She looks like she might be looking for something.",
    activityIds: ["1.9.4", "1.9.5", "1.4.8"],
    probability: 0.25,
  },
  {
    text: "She's looking at her phone then around, like she's finding a place.",
    activityIds: ["1.9.5", "1.4.8"],
    probability: 0.2,
  },

  // Photography hooks
  {
    text: "She's taking a photo of something you can comment on.",
    activityIds: ["1.4.7", "1.4.11"],
    probability: 0.3,
  },

  // Pet hooks
  {
    text: "Her dog is pretty cute.",
    envCodes: ["1.8"],
    probability: 0.3,
  },
  {
    text: "Her dog seems friendly.",
    activityIds: ["1.8.1", "1.8.2"],
    probability: 0.25,
  },

  // Street performer hooks
  {
    text: "The performer is doing something interesting.",
    activityIds: ["1.4.10"],
    probability: 0.3,
  },

  // Waiting hooks
  {
    text: "She keeps checking her phone like she's waiting for someone.",
    envCodes: ["1.5"],
    probability: 0.15,
  },

  // General environment hooks
  {
    text: "She seems new to the area.",
    activityIds: ["1.3.3", "1.4.4"],
    probability: 0.2,
  },
  {
    text: "She's looking at a nearby shop/cafe you could mention.",
    envCodes: ["1.1", "1.4"],
    probability: 0.1,
  },
];

// ============================================================================
// VISIBLE ITEMS (observable food/drink details)
// ============================================================================

export type VisibleItemType = "eating" | "drinking" | "post_eating";

export const REGION_IDS = [
  "north-america",
  "latin-america",
  "western-europe",
  "slavic-europe",
  "eastern-europe",
  "scandinavia",
  "southern-europe",
  "africa",
  "middle-east",
  "south-asia",
  "southeast-asia",
  "east-asia",
  "australia",
] as const;

export type RegionId = (typeof REGION_IDS)[number];
export type CountryId = string;

export const DEFAULT_REGIONAL_ITEM_PROBABILITY = 0.35;
export const DEFAULT_COUNTRY_ITEM_PROBABILITY = 0.45;
export const DEFAULT_FOREIGN_ITEM_PROBABILITY = 0.2;

export const REGIONAL_ITEM_PROBABILITY_BY_REGION: Partial<Record<RegionId, number>> = {};
export const COUNTRY_ITEM_PROBABILITY_BY_ID: Partial<Record<string, number>> = {};
export const FOREIGN_ITEM_PROBABILITY_BY_REGION: Partial<Record<RegionId, number>> = {};

export const VISIBLE_ITEM_TEMPLATES: Record<VisibleItemType, string> = {
  eating: "She's eating {item}.",
  drinking: "She's drinking {item}.",
  post_eating: "She has an empty {item}.",
};

export const VISIBLE_ITEMS_BY_ENV: Partial<
  Record<EnvironmentCode, Partial<Record<VisibleItemType, string[]>>>
> = {
  "1.6": {
    eating: [
      "a slice of pizza",
      "a sandwich",
      "a wrap",
      "a pastry",
      "a salad box",
      "a burrito",
      "a noodle cup",
      "a hot dog",
    ],
    drinking: [
      "a latte",
      "a cappuccino",
      "a flat white",
      "an iced coffee",
      "a cold brew",
      "a bottled juice",
      "an iced tea",
      "a takeaway tea",
    ],
  },
  "2.3": {
    eating: [
      "a slice of pizza",
      "a burger",
      "a sushi box",
      "a noodle bowl",
      "a rice bowl",
      "a chicken wrap",
      "a salad box",
      "a poke bowl",
    ],
    post_eating: [
      "tray with a burger wrapper",
      "pizza tray",
      "noodle bowl",
      "sushi box",
      "rice bowl",
      "salad box",
      "takeout box",
      "food court tray",
    ],
  },
  "3.2": {
    drinking: [
      "a latte",
      "a cappuccino",
      "a flat white",
      "an iced coffee",
      "a chai latte",
      "a hot tea",
      "a cold brew",
      "a mocha",
    ],
  },
  "3.4": {
    drinking: [
      "a latte",
      "a cappuccino",
      "a flat white",
      "an americano",
      "a mocha",
      "a matcha latte",
      "an iced coffee",
      "a hot tea",
    ],
  },
  "5.1": {
    eating: [
      "a sandwich",
      "a salad box",
      "a wrap",
      "a fruit cup",
      "a granola bar",
      "a pastry",
      "a noodle cup",
      "a burrito",
    ],
    drinking: [
      "a bottled water",
      "an iced tea",
      "a latte",
      "an iced coffee",
      "a smoothie",
      "a juice bottle",
      "a hot tea",
      "a sparkling water",
    ],
  },
  "6.2": {
    drinking: [
      "a bottle of water",
      "a sports drink",
      "an electrolyte drink",
      "a protein shake",
      "a recovery smoothie",
      "a canned energy drink",
    ],
  },
  "7.3": {
    eating: [
      "a sandwich",
      "a salad bowl",
      "a burrito",
      "a noodle cup",
      "a slice of pizza",
      "a sushi roll",
      "a rice bowl",
      "a wrap",
    ],
    drinking: [
      "a latte",
      "an iced coffee",
      "a bubble tea",
      "an iced tea",
      "a canned energy drink",
      "a bottled water",
      "a cold brew",
      "a chai latte",
    ],
  },
};

export const REGIONAL_ITEMS_BY_REGION: Record<RegionId, Partial<Record<VisibleItemType, string[]>>> = {
  "north-america": {
    eating: ["a bagel sandwich", "a slice of pizza", "a burger", "a breakfast burrito"],
    drinking: ["a cold brew", "an iced coffee", "a smoothie", "a soda"],
    post_eating: ["bagel wrapper", "pizza box", "burger wrapper", "burrito wrapper"],
  },
  "latin-america": {
    eating: ["a taco", "an arepa", "a burrito", "some empanadas"],
    drinking: ["a horchata", "a yerba mate", "an agua fresca", "a cafe con leche"],
    post_eating: ["taco wrapper", "arepa wrapper", "empanada bag", "burrito wrapper"],
  },
  "western-europe": {
    eating: ["a baguette sandwich", "a croissant", "a panini", "a ham and cheese toastie"],
    drinking: ["an espresso", "a cafe au lait", "a cappuccino", "a sparkling water"],
    post_eating: ["croissant bag", "panini wrapper", "baguette wrapper", "toastie wrapper"],
  },
  "slavic-europe": {
    eating: ["a pirozhok", "some pelmeni", "a blini", "a cabbage roll"],
    drinking: ["a black tea", "a kompot", "a kefir drink", "a mineral water"],
    post_eating: ["pirozhok bag", "pelmeni container", "blini wrapper", "cabbage roll container"],
  },
  "eastern-europe": {
    eating: ["pierogi", "a sausage roll", "a cheese pastry", "a potato pancake"],
    drinking: ["a black tea", "a fruit kompot", "a kefir", "a mineral water"],
    post_eating: ["pierogi box", "sausage roll wrapper", "pastry bag", "pancake wrapper"],
  },
  "scandinavia": {
    eating: ["a cinnamon bun", "a cardamom bun", "an open-faced sandwich", "a rye sandwich"],
    drinking: ["a filter coffee", "a black coffee", "a herbal tea", "a lingonberry soda"],
    post_eating: ["bun bag", "sandwich wrapper", "rye sandwich wrapper", "pastry bag"],
  },
  "southern-europe": {
    eating: ["a panini", "a slice of focaccia", "a pizza slice", "a gelato cup"],
    drinking: ["an espresso", "a cafe latte", "a sparkling water", "a citrus soda"],
    post_eating: ["panini wrapper", "focaccia paper", "pizza box", "gelato cup"],
  },
  "africa": {
    eating: ["a meat pie", "a samosa", "a chapati wrap", "a jollof rice bowl"],
    drinking: ["a ginger tea", "a hibiscus drink", "a sweet tea", "a bottled water"],
    post_eating: ["meat pie bag", "samosa wrapper", "chapati wrapper", "rice bowl"],
  },
  "middle-east": {
    eating: ["a shawarma wrap", "a falafel pita", "a manakish slice", "a baklava piece"],
    drinking: ["a mint tea", "a strong coffee", "a cardamom coffee", "a yogurt drink"],
    post_eating: ["shawarma wrapper", "falafel bag", "manakish wrapper", "baklava box"],
  },
  "south-asia": {
    eating: ["a samosa", "a chaat cup", "a paneer wrap", "a paratha roll"],
    drinking: ["a masala chai", "a mango lassi", "a sweet tea", "a lime soda"],
    post_eating: ["samosa bag", "chaat cup", "paneer wrap foil", "paratha wrapper"],
  },
  "southeast-asia": {
    eating: ["a banh mi", "a rice bowl", "fresh spring rolls", "satay skewers"],
    drinking: ["a thai iced tea", "a coconut drink", "an iced tea", "a lime soda"],
    post_eating: ["banh mi wrapper", "rice bowl", "spring roll box", "satay stick tray"],
  },
  "east-asia": {
    eating: ["a sushi roll", "a bao bun", "a rice ball", "a noodle cup"],
    drinking: ["a bubble tea", "a green tea", "a canned coffee", "an iced tea"],
    post_eating: ["sushi box", "bao wrapper", "rice ball wrapper", "noodle cup"],
  },
  "australia": {
    eating: ["a meat pie", "an avo toast slice", "a sausage roll", "a lamington"],
    drinking: ["a flat white", "a long black", "an iced coffee", "a sparkling water"],
    post_eating: ["meat pie bag", "toast wrapper", "sausage roll wrapper", "lamington box"],
  },
};

export const COUNTRY_ITEMS_BY_ID: Partial<
  Record<CountryId, Partial<Record<VisibleItemType, string[]>>>
> = {
  "usa": {
    eating: ["a slice of pizza", "a bagel sandwich", "a breakfast burrito"],
    drinking: ["an iced coffee", "a cold brew", "a soda"],
    post_eating: ["pizza box", "bagel wrapper", "burrito wrapper"],
  },
  "canada": {
    eating: ["a poutine cup", "a salmon wrap", "a maple donut"],
    drinking: ["a double-double coffee", "a hot chocolate", "a bottled water"],
    post_eating: ["poutine cup", "wrap foil", "donut bag"],
  },
  "mexico": {
    eating: ["a taco", "a torta", "a quesadilla"],
    drinking: ["a horchata", "agua fresca", "a jamaica tea"],
    post_eating: ["taco wrapper", "torta bag", "quesadilla wrapper"],
  },
  "brazil": {
    eating: ["a coxinha", "a pastel", "a cheese bread bun"],
    drinking: ["a guarana soda", "a fresh coconut", "a cafezinho"],
    post_eating: ["coxinha bag", "pastel wrapper", "cheese bread bag"],
  },
  "argentina": {
    eating: ["an empanada", "a choripan", "a medialuna"],
    drinking: ["a yerba mate", "a black coffee", "a soda"],
    post_eating: ["empanada bag", "choripan wrapper", "medialuna bag"],
  },
  "colombia": {
    eating: ["an arepa", "an empanada", "a pandebono"],
    drinking: ["a black coffee", "a panela lemonade", "a fruit juice"],
    post_eating: ["arepa wrapper", "empanada bag", "pandebono bag"],
  },
  "chile": {
    eating: ["a completo hot dog", "an empanada", "a sandwich"],
    drinking: ["a black coffee", "a mote con huesillo", "a bottled water"],
    post_eating: ["hot dog tray", "empanada bag", "sandwich wrapper"],
  },
  "peru": {
    eating: ["an anticucho skewer", "a sandwich", "a causa roll"],
    drinking: ["a chicha morada", "a bottled water", "a black coffee"],
    post_eating: ["anticucho tray", "sandwich wrapper", "causa box"],
  },
  "britain": {
    eating: ["a sausage roll", "a bacon bap", "a fish and chips box"],
    drinking: ["a black tea", "a latte", "a bottled water"],
    post_eating: ["sausage roll bag", "bap wrapper", "chips box"],
  },
  "france": {
    eating: ["a croissant", "a baguette sandwich", "a crepe"],
    drinking: ["an espresso", "a cafe au lait", "a sparkling water"],
    post_eating: ["croissant bag", "baguette wrapper", "crepe paper"],
  },
  "germany": {
    eating: ["a pretzel", "a bratwurst roll", "a schnitzel sandwich"],
    drinking: ["a black coffee", "an apple spritzer", "a bottled water"],
    post_eating: ["pretzel bag", "bratwurst tray", "schnitzel wrapper"],
  },
  "netherlands": {
    eating: ["a stroopwafel", "a herring bun", "a cheese toastie"],
    drinking: ["a filter coffee", "a hot tea", "a bottled water"],
    post_eating: ["stroopwafel bag", "herring wrapper", "toastie wrapper"],
  },
  "belgium": {
    eating: ["a waffle", "a fries cone", "a chocolate pastry"],
    drinking: ["a hot chocolate", "a black coffee", "a bottled water"],
    post_eating: ["waffle bag", "fries cone", "pastry bag"],
  },
  "switzerland": {
    eating: ["a raclette sandwich", "a rosti box", "a pretzel"],
    drinking: ["a hot chocolate", "a black coffee", "a bottled water"],
    post_eating: ["raclette wrapper", "rosti box", "pretzel bag"],
  },
  "russia": {
    eating: ["a pirozhok", "a blini wrap", "a pelmeni cup"],
    drinking: ["a black tea", "a kompot", "a mineral water"],
    post_eating: ["pirozhok bag", "blini wrapper", "pelmeni cup"],
  },
  "belarus": {
    eating: ["a draniki", "a pirozhok", "a blini"],
    drinking: ["a black tea", "a kompot", "a mineral water"],
    post_eating: ["draniki tray", "pirozhok bag", "blini wrapper"],
  },
  "ukraine": {
    eating: ["a vareniki box", "a potato pancake", "a cabbage roll"],
    drinking: ["a black tea", "a fruit kompot", "a kefir drink"],
    post_eating: ["vareniki box", "pancake wrapper", "cabbage roll container"],
  },
  "poland": {
    eating: ["pierogi", "a zapiekanka", "a kielbasa roll"],
    drinking: ["a black tea", "a kompot", "a bottled water"],
    post_eating: ["pierogi box", "zapiekanka wrapper", "kielbasa tray"],
  },
  "romania": {
    eating: ["a covrigi pretzel", "a mici roll", "a cheese pastry"],
    drinking: ["a black coffee", "a mineral water", "a lemonade"],
    post_eating: ["covrigi bag", "mici tray", "pastry bag"],
  },
  "czech": {
    eating: ["a trdelnik", "a sausage roll", "a cheese pastry"],
    drinking: ["a black coffee", "a bottled water", "a fruit soda"],
    post_eating: ["trdelnik bag", "sausage roll wrapper", "pastry bag"],
  },
  "hungary": {
    eating: ["a langos", "a sausage roll", "a strudel"],
    drinking: ["a black coffee", "a mineral water", "a fruit soda"],
    post_eating: ["langos wrapper", "sausage roll bag", "strudel bag"],
  },
  "croatia": {
    eating: ["a burek", "a cevapi wrap", "a pastry"],
    drinking: ["a black coffee", "a bottled water", "a lemon soda"],
    post_eating: ["burek wrapper", "cevapi tray", "pastry bag"],
  },
  "bulgaria": {
    eating: ["a banitsa", "a kebabche wrap", "a pastry"],
    drinking: ["a black coffee", "a boza drink", "a bottled water"],
    post_eating: ["banitsa bag", "kebabche tray", "pastry bag"],
  },
  "serbia": {
    eating: ["a cevapi wrap", "a burek", "a pastry"],
    drinking: ["a black coffee", "a yogurt drink", "a mineral water"],
    post_eating: ["cevapi tray", "burek wrapper", "pastry bag"],
  },
  "denmark": {
    eating: ["a smorrebrod", "a hot dog", "a pastry"],
    drinking: ["a filter coffee", "a black coffee", "a bottled water"],
    post_eating: ["smorrebrod wrapper", "hot dog tray", "pastry bag"],
  },
  "sweden": {
    eating: ["a cinnamon bun", "an open-faced sandwich", "a shrimp sandwich"],
    drinking: ["a filter coffee", "a black coffee", "a lingonberry soda"],
    post_eating: ["bun bag", "sandwich wrapper", "shrimp sandwich wrapper"],
  },
  "norway": {
    eating: ["a skillingsbolle", "a salmon wrap", "a waffle cone"],
    drinking: ["a filter coffee", "a black coffee", "a bottled water"],
    post_eating: ["skillingsbolle bag", "salmon wrap foil", "waffle cone"],
  },
  "finland": {
    eating: ["a korvapuusti", "a rye sandwich", "a salmon wrap"],
    drinking: ["a filter coffee", "a black coffee", "a berry juice"],
    post_eating: ["korvapuusti bag", "sandwich wrapper", "salmon wrap foil"],
  },
  "iceland": {
    eating: ["a kleinur", "a hot dog", "a skyr cup"],
    drinking: ["a black coffee", "a hot chocolate", "a bottled water"],
    post_eating: ["kleinur bag", "hot dog tray", "skyr cup"],
  },
  "italy": {
    eating: ["a panini", "a slice of pizza", "an arancini"],
    drinking: ["an espresso", "a cafe latte", "a sparkling water"],
    post_eating: ["panini wrapper", "pizza box", "arancini bag"],
  },
  "spain": {
    eating: ["a bocadillo", "a tortilla slice", "a churro"],
    drinking: ["a cortado", "a sparkling water", "a citrus soda"],
    post_eating: ["bocadillo wrapper", "tortilla tray", "churro bag"],
  },
  "greece": {
    eating: ["a gyro wrap", "a spinach pie", "a souvlaki skewer"],
    drinking: ["a frappe coffee", "a bottled water", "a lemon soda"],
    post_eating: ["gyro wrapper", "pie bag", "souvlaki tray"],
  },
  "portugal": {
    eating: ["a pastel de nata", "a bifana sandwich", "a cheese pastry"],
    drinking: ["a galao coffee", "an espresso", "a bottled water"],
    post_eating: ["nata box", "bifana wrapper", "pastry bag"],
  },
  "south africa": {
    eating: ["a bunny chow", "a meat pie", "a boerewors roll"],
    drinking: ["a rooibos tea", "a ginger beer", "a bottled water"],
    post_eating: ["bunny chow box", "meat pie bag", "boerewors wrapper"],
  },
  "nigeria": {
    eating: ["a meat pie", "a suya skewer", "a jollof rice bowl"],
    drinking: ["a malt drink", "a hibiscus drink", "a bottled water"],
    post_eating: ["meat pie bag", "suya tray", "jollof bowl"],
  },
  "kenya": {
    eating: ["a mandazi", "a samosa", "a nyama choma wrap"],
    drinking: ["a chai tea", "a bottled water", "a fresh juice"],
    post_eating: ["mandazi bag", "samosa wrapper", "nyama choma foil"],
  },
  "egypt": {
    eating: ["a falafel sandwich", "a koshari box", "a shawarma wrap"],
    drinking: ["a mint tea", "a hibiscus drink", "a bottled water"],
    post_eating: ["falafel bag", "koshari box", "shawarma wrapper"],
  },
  "morocco": {
    eating: ["a msemen", "a tagine box", "a kebab wrap"],
    drinking: ["a mint tea", "a black coffee", "a bottled water"],
    post_eating: ["msemen bag", "tagine box", "kebab wrapper"],
  },
  "ghana": {
    eating: ["a meat pie", "a kelewele cup", "a jollof rice bowl"],
    drinking: ["a sobolo drink", "a bottled water", "a malt drink"],
    post_eating: ["meat pie bag", "kelewele cup", "rice bowl"],
  },
  "emirates": {
    eating: ["a shawarma wrap", "a manakish slice", "a falafel pita"],
    drinking: ["a mint tea", "a cardamom coffee", "a bottled water"],
    post_eating: ["shawarma wrapper", "manakish box", "falafel bag"],
  },
  "turkey": {
    eating: ["a simit", "a doner wrap", "a borek slice"],
    drinking: ["a turkish tea", "an ayran", "a bottled water"],
    post_eating: ["simit bag", "doner wrapper", "borek box"],
  },
  "israel": {
    eating: ["a falafel pita", "a sabich sandwich", "a bourekas"],
    drinking: ["a mint tea", "an iced coffee", "a lemonade"],
    post_eating: ["falafel bag", "sabich wrapper", "bourekas bag"],
  },
  "lebanon": {
    eating: ["a manousheh", "a shawarma wrap", "a falafel pita"],
    drinking: ["a mint tea", "a black coffee", "a bottled water"],
    post_eating: ["manousheh box", "shawarma wrapper", "falafel bag"],
  },
  "saudi": {
    eating: ["a shawarma wrap", "a kabsa box", "a falafel pita"],
    drinking: ["an arabic coffee", "a mint tea", "a bottled water"],
    post_eating: ["shawarma wrapper", "kabsa box", "falafel bag"],
  },
  "india": {
    eating: ["a samosa", "a chaat cup", "a vada pav"],
    drinking: ["a masala chai", "a mango lassi", "a lime soda"],
    post_eating: ["samosa bag", "chaat cup", "vada pav wrapper"],
  },
  "pakistan": {
    eating: ["a samosa", "a seekh kebab roll", "a paratha roll"],
    drinking: ["a doodh pati tea", "a lime soda", "a bottled water"],
    post_eating: ["samosa bag", "kebab roll wrapper", "paratha wrapper"],
  },
  "bangladesh": {
    eating: ["a fuchka cup", "a samosa", "a curry roll"],
    drinking: ["a sweet tea", "a lime soda", "a bottled water"],
    post_eating: ["fuchka cup", "samosa bag", "curry roll wrapper"],
  },
  "sri lanka": {
    eating: ["a kottu box", "an egg roti roll", "a snack mix"],
    drinking: ["a milk tea", "a lime soda", "a bottled water"],
    post_eating: ["kottu box", "roti wrapper", "snack bag"],
  },
  "thailand": {
    eating: ["a pad thai box", "a satay skewer", "a mango sticky rice cup"],
    drinking: ["a thai iced tea", "a coconut drink", "a lime soda"],
    post_eating: ["pad thai box", "satay stick tray", "sticky rice cup"],
  },
  "vietnam": {
    eating: ["a banh mi", "a pho cup", "a spring roll pack"],
    drinking: ["an iced coffee", "an iced tea", "a coconut drink"],
    post_eating: ["banh mi wrapper", "pho cup", "spring roll box"],
  },
  "philippines": {
    eating: ["a lumpia pack", "a bbq skewer", "a rice bowl"],
    drinking: ["a calamansi juice", "a bottled water", "an iced tea"],
    post_eating: ["lumpia box", "bbq skewer tray", "rice bowl"],
  },
  "indonesia": {
    eating: ["a nasi goreng box", "a satay skewer", "a martabak slice"],
    drinking: ["an iced tea", "a bottled water", "a kopi coffee"],
    post_eating: ["nasi box", "satay tray", "martabak box"],
  },
  "malaysia": {
    eating: ["a nasi lemak pack", "a satay skewer", "a roti canai"],
    drinking: ["a teh tarik", "an iced tea", "a bottled water"],
    post_eating: ["nasi lemak pack", "satay tray", "roti wrapper"],
  },
  "singapore": {
    eating: ["a kaya toast", "a chicken rice box", "a satay skewer"],
    drinking: ["a kopi", "a bubble tea", "a bottled water"],
    post_eating: ["kaya toast wrapper", "chicken rice box", "satay tray"],
  },
  "japan": {
    eating: ["a sushi roll", "an onigiri", "a takoyaki cup"],
    drinking: ["a green tea", "a canned coffee", "a bubble tea"],
    post_eating: ["sushi box", "onigiri wrapper", "takoyaki cup"],
  },
  "south korea": {
    eating: ["a kimbap roll", "a tteokbokki cup", "a fried chicken box"],
    drinking: ["a barley tea", "a bubble tea", "an iced coffee"],
    post_eating: ["kimbap box", "tteokbokki cup", "chicken box"],
  },
  "china": {
    eating: ["a bao bun", "a noodle bowl", "a dumpling box"],
    drinking: ["a green tea", "a soy milk", "a bubble tea"],
    post_eating: ["bao wrapper", "noodle bowl", "dumpling box"],
  },
  "taiwan": {
    eating: ["a bao bun", "a scallion pancake", "a noodle box"],
    drinking: ["a bubble tea", "a black tea", "a soy milk"],
    post_eating: ["bao wrapper", "pancake bag", "noodle box"],
  },
  "australia": {
    eating: ["a meat pie", "an avo toast slice", "a sausage roll"],
    drinking: ["a flat white", "a long black", "an iced coffee"],
    post_eating: ["meat pie bag", "toast wrapper", "sausage roll wrapper"],
  },
  "new zealand": {
    eating: ["a meat pie", "a mince and cheese roll", "a fish and chips box"],
    drinking: ["a flat white", "a long black", "a bottled water"],
    post_eating: ["meat pie bag", "cheese roll wrapper", "chips box"],
  },
};

export const COUNTRY_ITEM_IDS = Object.keys(COUNTRY_ITEMS_BY_ID).sort();

export const ACTIVITY_VISIBLE_ITEM_TYPE: Partial<Record<ActivityId, VisibleItemType>> = {
  "1.6.1": "drinking",
  "1.6.2": "eating",
  "1.6.3": "eating",
  "2.3.3": "eating",
  "2.3.4": "post_eating",
  "3.2.1": "drinking",
  "3.4.2": "drinking",
  "5.1.9": "eating",
  "5.1.10": "drinking",
  "6.2.4": "drinking",
  "7.3.4": "eating",
  "7.3.5": "drinking",
};

type VisibleItemSource =
  | "default"
  | "regional"
  | "country"
  | "secondary_region"
  | "secondary_country";

interface VisibleItemSelection {
  type: VisibleItemType;
  item: string;
  text: string;
  source: VisibleItemSource;
  regionId?: RegionId;
  countryId?: CountryId;
}

const FOREIGN_PREFERENCE_MULTIPLIER = 1.35;
const FOREIGN_USER_MULTIPLIER = 1.15;
const COUNTRY_WEIGHT_BOOST = 1.15;

const COUNTRY_ITEM_ALIASES: Record<string, CountryId> = {
  "united states": "usa",
  "united states of america": "usa",
  "us": "usa",
  "u s": "usa",
  "u s a": "usa",
  "america": "usa",
  "united kingdom": "britain",
  "uk": "britain",
  "u k": "britain",
  "great britain": "britain",
  "england": "britain",
  "scotland": "britain",
  "wales": "britain",
  "northern ireland": "britain",
  "uae": "emirates",
  "united arab emirates": "emirates",
  "czech republic": "czech",
  "russian federation": "russia",
  "south korea": "south korea",
  "republic of korea": "south korea",
  "korea south": "south korea",
  "viet nam": "vietnam",
  "south africa": "south africa",
  "new zealand": "new zealand",
  "saudi arabia": "saudi",
  "puerto rico": "usa",
};

function clampProbability(value: number, fallback: number): number {
  if (Number.isNaN(value)) return fallback;
  return Math.min(Math.max(value, 0), 1);
}

function probabilityToWeight(probability: number): number {
  const clamped = Math.min(Math.max(probability, 0), 0.99);
  if (clamped <= 0) return 0;
  return clamped / (1 - clamped);
}

function normalizeCountryItemKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveCountryItemId(value?: string | null): CountryId | undefined {
  if (!value) return undefined;
  const normalized = normalizeCountryItemKey(value);
  if (COUNTRY_ITEMS_BY_ID[normalized]) return normalized;

  const alias = COUNTRY_ITEM_ALIASES[normalized];
  if (alias && COUNTRY_ITEMS_BY_ID[alias]) return alias;

  const displayName = getDisplayName(value);
  const normalizedDisplay = normalizeCountryItemKey(displayName);
  if (COUNTRY_ITEMS_BY_ID[normalizedDisplay]) return normalizedDisplay;

  const displayAlias = COUNTRY_ITEM_ALIASES[normalizedDisplay];
  if (displayAlias && COUNTRY_ITEMS_BY_ID[displayAlias]) return displayAlias;

  const normalizedId = normalizeCountryItemKey(normalizeCountryId(value));
  if (COUNTRY_ITEMS_BY_ID[normalizedId]) return normalizedId;

  const idAlias = COUNTRY_ITEM_ALIASES[normalizedId];
  if (idAlias && COUNTRY_ITEMS_BY_ID[idAlias]) return idAlias;

  return undefined;
}

interface VisibleItemPool {
  items: string[];
  weight: number;
  source: VisibleItemSource;
  regionId?: RegionId;
  countryId?: CountryId;
}

function addItemPool(
  pools: VisibleItemPool[],
  items: string[] | undefined,
  weight: number,
  source: VisibleItemSource,
  regionId?: RegionId,
  countryId?: CountryId
) {
  if (!items || items.length === 0) return;
  if (weight <= 0) return;
  pools.push({ items, weight, source, regionId, countryId });
}

function getVisibleItem(
  activityId: ActivityId,
  envCode: EnvironmentCode,
  options: {
    regionId?: RegionId;
    countryId?: CountryId;
    secondaryRegionId?: RegionId;
    secondaryCountryId?: CountryId;
    regionalItemProbability?: number;
    countryItemProbability?: number;
    foreignItemProbability?: number;
    datingForeigners?: boolean;
    userIsForeign?: boolean;
  }
): VisibleItemSelection | null {
  const itemType = ACTIVITY_VISIBLE_ITEM_TYPE[activityId];
  if (!itemType) return null;

  const defaultItems = VISIBLE_ITEMS_BY_ENV[envCode]?.[itemType];
  if (!defaultItems || defaultItems.length === 0) return null;

  const normalizedCountryId = options.countryId ? normalizeCountryId(options.countryId) : undefined;
  const normalizedSecondaryCountryId = options.secondaryCountryId
    ? normalizeCountryId(options.secondaryCountryId)
    : undefined;
  const resolvedCountryId = resolveCountryItemId(options.countryId);
  const resolvedSecondaryCountryId = resolveCountryItemId(options.secondaryCountryId);
  const primaryRegionId =
    options.regionId || (normalizedCountryId ? getCountryRegion(normalizedCountryId) : null);
  const secondaryRegionId =
    options.secondaryRegionId ||
    (normalizedSecondaryCountryId ? getCountryRegion(normalizedSecondaryCountryId) : null);

  const pools: VisibleItemPool[] = [];
  addItemPool(pools, defaultItems, 1, "default");

  if (resolvedCountryId) {
    const countryItems = COUNTRY_ITEMS_BY_ID[resolvedCountryId]?.[itemType];
    const probability = clampProbability(
      options.countryItemProbability ??
        COUNTRY_ITEM_PROBABILITY_BY_ID[resolvedCountryId] ??
        DEFAULT_COUNTRY_ITEM_PROBABILITY,
      DEFAULT_COUNTRY_ITEM_PROBABILITY
    );
    const weight = probabilityToWeight(probability);
    addItemPool(
      pools,
      countryItems,
      weight * COUNTRY_WEIGHT_BOOST,
      "country",
      undefined,
      resolvedCountryId
    );
  }

  if (primaryRegionId) {
    const regionalItems = REGIONAL_ITEMS_BY_REGION[primaryRegionId as RegionId]?.[itemType];
    const probability = clampProbability(
      options.regionalItemProbability ??
        REGIONAL_ITEM_PROBABILITY_BY_REGION[primaryRegionId as RegionId] ??
        DEFAULT_REGIONAL_ITEM_PROBABILITY,
      DEFAULT_REGIONAL_ITEM_PROBABILITY
    );
    const weight = probabilityToWeight(probability);
    addItemPool(pools, regionalItems, weight, "regional", primaryRegionId as RegionId);
  }

  const secondaryCountryItems = resolvedSecondaryCountryId
    ? COUNTRY_ITEMS_BY_ID[resolvedSecondaryCountryId]?.[itemType]
    : undefined;
  const useSecondaryCountry =
    Boolean(secondaryCountryItems && resolvedSecondaryCountryId) &&
    resolvedSecondaryCountryId !== resolvedCountryId &&
    (!secondaryRegionId || secondaryRegionId !== primaryRegionId);

  const useSecondaryRegion =
    Boolean(secondaryRegionId) &&
    secondaryRegionId !== primaryRegionId &&
    !useSecondaryCountry;

  if (useSecondaryRegion) {
    const secondaryItems =
      REGIONAL_ITEMS_BY_REGION[secondaryRegionId as RegionId]?.[itemType];
    const probability = clampProbability(
      options.foreignItemProbability ??
        FOREIGN_ITEM_PROBABILITY_BY_REGION[secondaryRegionId as RegionId] ??
        DEFAULT_FOREIGN_ITEM_PROBABILITY,
      DEFAULT_FOREIGN_ITEM_PROBABILITY
    );
    let weight = probabilityToWeight(probability);
    if (options.datingForeigners) {
      weight *= FOREIGN_PREFERENCE_MULTIPLIER;
    }
    if (options.userIsForeign) {
      weight *= FOREIGN_USER_MULTIPLIER;
    }
    addItemPool(
      pools,
      secondaryItems,
      weight,
      "secondary_region",
      secondaryRegionId as RegionId
    );
  }

  if (useSecondaryCountry) {
    const probability = clampProbability(
      options.foreignItemProbability ??
        DEFAULT_FOREIGN_ITEM_PROBABILITY,
      DEFAULT_FOREIGN_ITEM_PROBABILITY
    );
    let weight = probabilityToWeight(probability) * COUNTRY_WEIGHT_BOOST;
    if (options.datingForeigners) {
      weight *= FOREIGN_PREFERENCE_MULTIPLIER;
    }
    if (options.userIsForeign) {
      weight *= FOREIGN_USER_MULTIPLIER;
    }
    addItemPool(
      pools,
      secondaryCountryItems,
      weight,
      "secondary_country",
      undefined,
      resolvedSecondaryCountryId
    );
  }

  if (pools.length === 0) return null;

  const selectedPool = weightedSample(pools.map((pool) => ({
    value: pool,
    weight: pool.weight,
  })));
  const item = randomChoice(selectedPool.items);
  const text = VISIBLE_ITEM_TEMPLATES[itemType].replace("{item}", item);

  return {
    type: itemType,
    item,
    text,
    source: selectedPool.source,
    regionId: selectedPool.regionId,
    countryId: selectedPool.countryId,
  };
}

// ============================================================================
// OUTFIT SAMPLING (visibility + environment weighting)
// ============================================================================

const OUTFIT_VISIBILITY: Record<DifficultyLevel, number> = {
  beginner: 1.0,
  intermediate: 0.8,
  advanced: 0.4,
  expert: 0.15,
  master: 0,
};

const MALL_BROWSE_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  trendy: 0.25,
  smart_casual: 0.2,
  casual: 0.2,
  minimalist: 0.1,
  preppy: 0.1,
  bohemian: 0.05,
  business: 0.05,
  edgy: 0.05,
};

const MALL_EMPLOYEE_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  smart_casual: 0.35,
  casual: 0.25,
  minimalist: 0.15,
  business: 0.1,
  preppy: 0.1,
  relaxed: 0.05,
};

const MALL_FOOD_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  casual: 0.3,
  trendy: 0.2,
  smart_casual: 0.2,
  relaxed: 0.15,
  athleisure: 0.1,
  minimalist: 0.05,
};

const MALL_WAIT_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  casual: 0.25,
  smart_casual: 0.2,
  minimalist: 0.15,
  trendy: 0.15,
  preppy: 0.1,
  relaxed: 0.1,
  bohemian: 0.05,
};

const COFFEE_WORK_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  smart_casual: 0.35,
  business: 0.2,
  minimalist: 0.2,
  preppy: 0.1,
  casual: 0.1,
  trendy: 0.05,
};

const COFFEE_LEISURE_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  smart_casual: 0.25,
  casual: 0.25,
  bohemian: 0.15,
  minimalist: 0.1,
  relaxed: 0.1,
  trendy: 0.1,
  preppy: 0.05,
};

const COFFEE_SOCIAL_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  smart_casual: 0.3,
  trendy: 0.2,
  casual: 0.2,
  minimalist: 0.1,
  preppy: 0.1,
  bohemian: 0.1,
};

const COFFEE_ORDER_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  casual: 0.3,
  smart_casual: 0.25,
  trendy: 0.15,
  minimalist: 0.1,
  athleisure: 0.1,
  relaxed: 0.1,
};

const COFFEE_DIGITAL_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  casual: 0.25,
  smart_casual: 0.25,
  minimalist: 0.15,
  trendy: 0.15,
  athleisure: 0.1,
  relaxed: 0.1,
};

const COFFEE_BREAK_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  relaxed: 0.25,
  casual: 0.25,
  smart_casual: 0.2,
  athleisure: 0.1,
  minimalist: 0.1,
  trendy: 0.1,
};

const TRANSIT_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  casual: 0.25,
  smart_casual: 0.2,
  athleisure: 0.15,
  minimalist: 0.15,
  trendy: 0.1,
  business: 0.1,
  relaxed: 0.05,
};

const PARK_RELAX_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  relaxed: 0.3,
  casual: 0.25,
  bohemian: 0.15,
  athleisure: 0.1,
  minimalist: 0.1,
  trendy: 0.05,
  preppy: 0.05,
};

const PARK_WALK_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  athleisure: 0.35,
  casual: 0.25,
  relaxed: 0.15,
  trendy: 0.1,
  minimalist: 0.1,
  bohemian: 0.05,
};

const PARK_EXERCISE_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  athleisure: 0.6,
  casual: 0.2,
  relaxed: 0.1,
  trendy: 0.05,
  minimalist: 0.05,
};

const PARK_DIGITAL_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  casual: 0.25,
  relaxed: 0.2,
  athleisure: 0.2,
  bohemian: 0.1,
  minimalist: 0.1,
  trendy: 0.1,
  preppy: 0.05,
};

const PARK_SOCIAL_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  casual: 0.3,
  relaxed: 0.2,
  smart_casual: 0.2,
  trendy: 0.1,
  bohemian: 0.1,
  athleisure: 0.1,
};

const PARK_SPECIAL_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  casual: 0.3,
  relaxed: 0.25,
  athleisure: 0.2,
  bohemian: 0.1,
  minimalist: 0.1,
  trendy: 0.05,
};

const GYM_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  athleisure: 0.65,
  casual: 0.15,
  relaxed: 0.1,
  trendy: 0.05,
  minimalist: 0.05,
};

const CAMPUS_MOVE_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  casual: 0.3,
  athleisure: 0.2,
  smart_casual: 0.2,
  preppy: 0.1,
  minimalist: 0.1,
  trendy: 0.1,
};

const CAMPUS_STUDY_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  smart_casual: 0.3,
  minimalist: 0.2,
  preppy: 0.2,
  casual: 0.15,
  trendy: 0.1,
  bohemian: 0.05,
};

const CAMPUS_SOCIAL_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  casual: 0.3,
  smart_casual: 0.25,
  trendy: 0.2,
  preppy: 0.1,
  bohemian: 0.1,
  athleisure: 0.05,
};

const CAMPUS_LEISURE_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  casual: 0.25,
  relaxed: 0.2,
  bohemian: 0.15,
  athleisure: 0.15,
  trendy: 0.1,
  minimalist: 0.1,
  preppy: 0.05,
};

const CAMPUS_DIGITAL_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  casual: 0.25,
  athleisure: 0.2,
  minimalist: 0.15,
  smart_casual: 0.15,
  trendy: 0.1,
  relaxed: 0.1,
  preppy: 0.05,
};

const CAMPUS_IDLE_OUTFITS: Partial<Record<OutfitCategory, number>> = {
  casual: 0.25,
  relaxed: 0.2,
  smart_casual: 0.2,
  athleisure: 0.15,
  minimalist: 0.1,
  trendy: 0.1,
};

const OUTFIT_WEIGHTS_BY_ENV: Record<
  EnvironmentCode,
  Partial<Record<OutfitCategory, number>>
> = {
  "1.1": {
    trendy: 0.2,
    smart_casual: 0.2,
    casual: 0.2,
    minimalist: 0.1,
    preppy: 0.1,
    bohemian: 0.1,
    business: 0.05,
    edgy: 0.05,
  },
  "1.2": {
    business: 0.5,
    smart_casual: 0.3,
    minimalist: 0.1,
    preppy: 0.1,
  },
  "1.3": {
    casual: 0.25,
    smart_casual: 0.2,
    athleisure: 0.15,
    trendy: 0.15,
    minimalist: 0.1,
    business: 0.1,
    relaxed: 0.05,
  },
  "1.4": {
    casual: 0.3,
    bohemian: 0.15,
    trendy: 0.15,
    athleisure: 0.15,
    relaxed: 0.1,
    minimalist: 0.1,
    edgy: 0.05,
  },
  "1.5": {
    smart_casual: 0.2,
    casual: 0.2,
    minimalist: 0.15,
    trendy: 0.15,
    preppy: 0.1,
    business: 0.1,
    bohemian: 0.1,
  },
  "1.6": {
    smart_casual: 0.25,
    trendy: 0.2,
    casual: 0.2,
    business: 0.15,
    minimalist: 0.1,
    preppy: 0.1,
  },
  "1.7": {
    casual: 0.25,
    smart_casual: 0.2,
    minimalist: 0.15,
    trendy: 0.15,
    athleisure: 0.1,
    business: 0.1,
    edgy: 0.05,
  },
  "1.8": {
    athleisure: 0.4,
    casual: 0.3,
    relaxed: 0.2,
    smart_casual: 0.05,
    trendy: 0.05,
  },
  "1.9": {
    casual: 0.3,
    smart_casual: 0.2,
    athleisure: 0.15,
    relaxed: 0.15,
    minimalist: 0.1,
    business: 0.05,
    trendy: 0.05,
  },
  "2.1": MALL_BROWSE_OUTFITS,
  "2.2": MALL_EMPLOYEE_OUTFITS,
  "2.3": MALL_FOOD_OUTFITS,
  "2.4": MALL_BROWSE_OUTFITS,
  "2.5": MALL_BROWSE_OUTFITS,
  "2.6": MALL_WAIT_OUTFITS,
  "3.1": COFFEE_WORK_OUTFITS,
  "3.2": COFFEE_LEISURE_OUTFITS,
  "3.3": COFFEE_SOCIAL_OUTFITS,
  "3.4": COFFEE_ORDER_OUTFITS,
  "3.5": COFFEE_DIGITAL_OUTFITS,
  "3.6": COFFEE_BREAK_OUTFITS,
  "4.1": TRANSIT_OUTFITS,
  "4.2": TRANSIT_OUTFITS,
  "4.3": TRANSIT_OUTFITS,
  "4.4": TRANSIT_OUTFITS,
  "4.5": TRANSIT_OUTFITS,
  "5.1": PARK_RELAX_OUTFITS,
  "5.2": PARK_WALK_OUTFITS,
  "5.3": PARK_EXERCISE_OUTFITS,
  "5.4": PARK_DIGITAL_OUTFITS,
  "5.5": PARK_SOCIAL_OUTFITS,
  "5.6": PARK_SPECIAL_OUTFITS,
  "6.1": GYM_OUTFITS,
  "6.2": GYM_OUTFITS,
  "6.3": GYM_OUTFITS,
  "7.1": CAMPUS_MOVE_OUTFITS,
  "7.2": CAMPUS_STUDY_OUTFITS,
  "7.3": CAMPUS_SOCIAL_OUTFITS,
  "7.4": CAMPUS_LEISURE_OUTFITS,
  "7.5": CAMPUS_DIGITAL_OUTFITS,
  "7.6": CAMPUS_IDLE_OUTFITS,
};

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratedScenarioV2 {
  /** What the user sees */
  userFacing: {
    description: string;
    environment: string;
    activity: string;
    hook?: string; // Optional opener hint
    weatherDescription?: string; // Optional weather description
  };
  /** Compact data for AI handoff */
  aiHandoff: {
    env: string;
    activity: string;
    position: Position;
    energy: EnergyState;
    energyDescription: string;
    approachability: number;
    crowd: string;
    hasHeadphones: boolean;
    listeningTo?: string;
    visibleItem?: VisibleItemSelection;
    outfit: {
      id: string;
      category: OutfitCategory;
      description: string;
    };
    /** Optional conversation hooks based on outfit (only at beginner difficulty) */
    outfitHooks?: string[];
    weather?: {
      type: WeatherType;
      moodModifier: number;
      aiDescription: string;
    };
  };
  /** Metadata */
  meta: {
    activityId: ActivityId;
    difficulty: DifficultyLevel;
    calculatedDifficulty: number;
  };
}

// ============================================================================
// ACTIVITY DATA (simplified from v1)
// ============================================================================

interface ActivityConfig {
  id: ActivityId;
  name: string;
  crowdWeights: { value: string; weight: number }[];
  headphoneVariant?: {
    baseProbability: number;
    scaledProbability: number;
    listeningTo: string[];
  };
}

const ACTIVITIES: ActivityConfig[] = [
  // ============================================================================
  // 1.1 HIGH STREET - SHOPPING DISTRICT
  // ============================================================================
  {
    id: "1.1.1",
    name: "Shopping for something specific",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
  },
  {
    id: "1.1.2",
    name: "Browsing shops",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.1.3",
    name: "Window shopping",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.08,
      scaledProbability: 0.25,
      listeningTo: ["music", "podcast", "audiobook", "nothing"],
    },
  },
  {
    id: "1.1.4",
    name: "Carrying shopping bags",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "1.1.5",
    name: "Looking for a gift",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.1.6",
    name: "Comparing items",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.1.7",
    name: "Just finished shopping",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "phone call", "nothing"],
    },
  },
  {
    id: "1.1.8",
    name: "Looking at shop windows",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },

  // ============================================================================
  // 1.2 HIGH STREET - COMMUTE/WORK
  // ============================================================================
  {
    id: "1.2.1",
    name: "Going to work",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
    headphoneVariant: {
      baseProbability: 0.15,
      scaledProbability: 0.4,
      listeningTo: ["music", "news podcast", "audiobook", "nothing"],
    },
  },
  {
    id: "1.2.2",
    name: "Leaving work",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
    headphoneVariant: {
      baseProbability: 0.12,
      scaledProbability: 0.35,
      listeningTo: ["music", "podcast", "audiobook", "phone call", "nothing"],
    },
  },
  {
    id: "1.2.3",
    name: "On a short work break",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "phone call", "nothing"],
    },
  },
  {
    id: "1.2.4",
    name: "Getting coffee for work",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "1.2.5",
    name: "Stepping outside from work",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.2.6",
    name: "Running a work errand",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "1.2.7",
    name: "Heading to a meeting",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "1.2.8",
    name: "Leaving a meeting",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
  },
  {
    id: "1.2.9",
    name: "On lunch break",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "nothing"],
    },
  },
  {
    id: "1.2.10",
    name: "Getting lunch to-go",
    crowdWeights: [
      { value: "low", weight: 0.1 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.4 },
    ],
  },
  {
    id: "1.2.11",
    name: "Smoke break outside work",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },

  // ============================================================================
  // 1.3 HIGH STREET - TRANSIT/MOVEMENT
  // ============================================================================
  {
    id: "1.3.1",
    name: "Commuting somewhere",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
    headphoneVariant: {
      baseProbability: 0.2,
      scaledProbability: 0.5,
      listeningTo: ["music", "podcast", "audiobook", "nothing"],
    },
  },
  {
    id: "1.3.2",
    name: "Walking between places",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.15,
      scaledProbability: 0.4,
      listeningTo: ["music", "podcast", "audiobook", "nothing"],
    },
  },
  {
    id: "1.3.3",
    name: "Just arrived somewhere",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "1.3.4",
    name: "About to leave",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "1.3.5",
    name: "Walking briskly",
    crowdWeights: [
      { value: "low", weight: 0.1 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.4 },
    ],
    headphoneVariant: {
      baseProbability: 0.15,
      scaledProbability: 0.4,
      listeningTo: ["music", "podcast", "nothing"],
    },
  },

  // ============================================================================
  // 1.4 HIGH STREET - LEISURE/EXPLORING
  // ============================================================================
  {
    id: "1.4.1",
    name: "Taking a walk",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.15,
      scaledProbability: 0.35,
      listeningTo: ["music", "podcast", "audiobook", "nothing"],
    },
  },
  {
    id: "1.4.2",
    name: "Getting fresh air",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.4.3",
    name: "People-watching",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "1.4.4",
    name: "Exploring the area",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.4.5",
    name: "Wandering without a destination",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.12,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "nothing"],
    },
  },
  {
    id: "1.4.6",
    name: "Looking at buildings",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.4.7",
    name: "Taking photos",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.4.8",
    name: "Checking a map",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "1.4.9",
    name: "Standing near a landmark",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.4 },
    ],
  },
  {
    id: "1.4.10",
    name: "Watching street performer",
    crowdWeights: [
      { value: "low", weight: 0.1 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.4 },
    ],
  },
  {
    id: "1.4.11",
    name: "Doing photography",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },

  // ============================================================================
  // 1.5 HIGH STREET - WAITING/PAUSED
  // ============================================================================
  {
    id: "1.5.1",
    name: "Waiting for a friend",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "nothing"],
    },
  },
  {
    id: "1.5.2",
    name: "Waiting for an appointment",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
  },
  {
    id: "1.5.3",
    name: "Killing time",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.12,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "nothing"],
    },
  },
  {
    id: "1.5.4",
    name: "Early for something",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.5.5",
    name: "Idle with no clear purpose",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },

  // ============================================================================
  // 1.6 HIGH STREET - FOOD/DRINK
  // ============================================================================
  {
    id: "1.6.1",
    name: "Drinking a takeaway drink",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.6.2",
    name: "Eating while walking",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "1.6.3",
    name: "Eating on a bench",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.25,
      listeningTo: ["music", "podcast", "youtube video", "nothing"],
    },
  },

  // ============================================================================
  // 1.7 HIGH STREET - DIGITAL/MEDIA
  // ============================================================================
  {
    id: "1.7.1",
    name: "On a phone call",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.7.2",
    name: "Sending messages",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.7.3",
    name: "On phone (scrolling)",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.7.4",
    name: "Listening to music",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
    headphoneVariant: {
      baseProbability: 1.0, // Always has headphones
      scaledProbability: 1.0,
      listeningTo: ["pop music", "workout playlist", "indie music", "classical", "lo-fi", "rock"],
    },
  },
  {
    id: "1.7.5",
    name: "Listening to a podcast",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 1.0, // Always has headphones
      scaledProbability: 1.0,
      listeningTo: ["true crime podcast", "comedy podcast", "self-help podcast", "news podcast", "storytelling podcast"],
    },
  },
  {
    id: "1.7.6",
    name: "Taking a voice note",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },

  // ============================================================================
  // 1.8 HIGH STREET - PET ACTIVITIES
  // ============================================================================
  {
    id: "1.8.1",
    name: "Walking a dog",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.12,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "nothing"],
    },
  },
  {
    id: "1.8.2",
    name: "Dog pause (dog sniffing)",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },

  // ============================================================================
  // 1.9 HIGH STREET - MAINTENANCE/UTILITY
  // ============================================================================
  {
    id: "1.9.1",
    name: "Fixing something",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.9.2",
    name: "Adjusting clothes",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "1.9.3",
    name: "Dealing with weather",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "1.9.4",
    name: "Phone died / looking for help",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "1.9.5",
    name: "Lost / checking directions",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
  },
  // 2.1 activities
  {
    id: "2.1.1",
    name: "Shopping for something specific",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.1.10",
    name: "Waiting for service (at counter)",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.7 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.1.11",
    name: "Just received order/purchase",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.6 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.1.12",
    name: "Asking employee a question",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.1.13",
    name: "At checkout / paying",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.7 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.1.14",
    name: "Comparing prices on phone",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.1.2",
    name: "Browsing shops",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "shopping playlist", "audiobook", "podcast", "phone call", "nothing, just zoning out"],
    },
  },
  {
    id: "2.1.3",
    name: "Comparing items",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.1.4",
    name: "Looking for a gift",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.1.5",
    name: "Trying on clothes (near fitting room)",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.1.6",
    name: "Carrying shopping bags",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.6 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.1.7",
    name: "Just finished shopping",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.6 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.1.8",
    name: "Picking up an order",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.6 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.1.9",
    name: "Returning an item",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.6 },
      { value: "high", weight: 0 },
    ],
  },

  // 2.2 activities
  {
    id: "2.2.1",
    name: "Working at counter/register",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.6 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.2.2",
    name: "Stocking shelves",
    crowdWeights: [
      { value: "low", weight: 0.7 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.2.3",
    name: "Organizing displays",
    crowdWeights: [
      { value: "low", weight: 0.7 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.2.4",
    name: "Idle at counter (no customers)",
    crowdWeights: [
      { value: "low", weight: 0.9 },
      { value: "medium", weight: 0.1 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.2.5",
    name: "On break (visible in store area)",
    crowdWeights: [
      { value: "low", weight: 0.7 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "phone call", "audiobook", "youtube", "nothing, just peace"],
    },
  },

  // 2.3 activities
  {
    id: "2.3.1",
    name: "Ordering food",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.7 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.3.2",
    name: "Waiting for order",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.8 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.3.3",
    name: "Eating at food court",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.7 },
      { value: "high", weight: 0 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "youtube video", "podcast", "audiobook", "phone call", "nothing, just eating"],
    },
  },
  {
    id: "2.3.4",
    name: "Just finished eating",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.6 },
      { value: "high", weight: 0 },
    ],
  },

  // 2.4 activities
  {
    id: "2.4.1",
    name: "Walking between stores",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.7 },
      { value: "high", weight: 0 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "shopping playlist", "phone call", "nothing, just blocking mall music"],
    },
  },
  {
    id: "2.4.2",
    name: "Checking mall directory",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.6 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.4.3",
    name: "Just arrived at mall",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.6 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.4.4",
    name: "About to leave mall",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.6 },
      { value: "high", weight: 0 },
    ],
  },

  // 2.5 activities
  {
    id: "2.5.1",
    name: "On phone (scrolling or reading)",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.5.2",
    name: "On a phone call",
    crowdWeights: [
      { value: "low", weight: 0.7 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "2.5.3",
    name: "Sending messages",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0 },
    ],
  },

  // 2.6 activities
  {
    id: "2.6.1",
    name: "Waiting for a friend",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.6 },
      { value: "high", weight: 0 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "phone call", "audiobook", "youtube", "nothing, just blocking noise"],
    },
  },
  {
    id: "2.6.2",
    name: "Sitting on mall bench",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "meditation app", "phone call", "nothing, just resting"],
    },
  },
  {
    id: "2.6.3",
    name: "Idle with no clear purpose",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0 },
    ],
  },

  // 3.1 activities
  {
    id: "3.1.1",
    name: "Working on a laptop",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["focus music", "white noise", "lo-fi beats", "classical", "ambient", "work call", "nothing, just blocking noise"],
    },
  },
  {
    id: "3.1.2",
    name: "Taking a work call",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "3.1.3",
    name: "Responding to work messages",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "3.1.4",
    name: "Reading work documents",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },

  // 3.2 activities
  {
    id: "3.2.1",
    name: "Drinking coffee (seated)",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "meditation app", "phone call", "nothing, just relaxing"],
    },
  },
  {
    id: "3.2.2",
    name: "Reading a book",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "3.2.3",
    name: "Reading on her phone",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "3.2.4",
    name: "Journaling",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["ambient music", "nature sounds", "lo-fi", "meditation music", "white noise", "nothing, just focus"],
    },
  },
  {
    id: "3.2.5",
    name: "People-watching",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "3.2.6",
    name: "Sketching / drawing",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "ambient sounds", "podcast", "audiobook", "inspiration playlist", "nothing, just concentrating"],
    },
  },

  // 3.3 activities
  {
    id: "3.3.1",
    name: "Waiting for a friend",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "phone call with someone else", "killing time playlist", "nothing, just waiting"],
    },
  },
  {
    id: "3.3.2",
    name: "Just finished meeting friend",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "3.3.3",
    name: "Early for meeting someone",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },

  // 3.4 activities
  {
    id: "3.4.1",
    name: "Waiting for order (at counter)",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "3.4.2",
    name: "Just received order",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "3.4.3",
    name: "Ordering at counter",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "3.4.4",
    name: "Looking at menu",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },

  // 3.5 activities
  {
    id: "3.5.1",
    name: "On phone (scrolling or reading)",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "3.5.2",
    name: "On a phone call",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "3.5.3",
    name: "Listening to music (headphones visible)",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 1.0,
      scaledProbability: 1.0,
      listeningTo: ["chill music", "study playlist", "indie music", "jazz", "lo-fi", "classical", "pop", "ambient", "acoustic"],
    },
  },
  {
    id: "3.5.4",
    name: "Sending messages",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },

  // 3.6 activities
  {
    id: "3.6.1",
    name: "On a short work break",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "meditation app", "phone call", "audiobook", "nothing, just decompressing"],
    },
  },
  {
    id: "3.6.2",
    name: "Smoke break outside cafe",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "3.6.3",
    name: "Idle with no clear purpose",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },

  // 4.1 activities
  {
    id: "4.1.1",
    name: "Waiting for transport",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "news", "language learning", "phone call", "nothing, just zoning out"],
    },
  },
  {
    id: "4.1.2",
    name: "Checking transport times",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "4.1.3",
    name: "Sitting at a transit stop",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "meditation app", "phone call", "youtube", "nothing, just blocking noise"],
    },
  },
  {
    id: "4.1.4",
    name: "Standing near a transit stop",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "news briefing", "work call", "nothing, just waiting"],
    },
  },
  {
    id: "4.1.5",
    name: "Delayed and waiting",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "4.1.6",
    name: "Missed train/bus",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "4.1.7",
    name: "Killing time (long wait)",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "youtube", "phone call", "meditation app", "nothing, just bored"],
    },
  },

  // 4.2 activities
  {
    id: "4.2.1",
    name: "Just arrived somewhere",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "phone call", "navigation directions", "nothing, just arriving"],
    },
  },
  {
    id: "4.2.2",
    name: "About to leave",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
  },
  {
    id: "4.2.3",
    name: "About to board (transport arriving)",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.4 },
    ],
  },
  {
    id: "4.2.4",
    name: "Just got off transport",
    crowdWeights: [
      { value: "low", weight: 0.1 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.4 },
    ],
  },

  // 4.3 activities
  {
    id: "4.3.1",
    name: "On phone (scrolling or reading)",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
  },
  {
    id: "4.3.2",
    name: "On a phone call",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "4.3.3",
    name: "Listening to music (headphones visible)",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
    headphoneVariant: {
      baseProbability: 1.0,
      scaledProbability: 1.0,
      listeningTo: ["commute playlist", "workout music", "pop music", "chill vibes", "upbeat music", "lo-fi", "rock", "electronic", "indie"],
    },
  },
  {
    id: "4.3.4",
    name: "Listening to a podcast (headphones visible)",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
    headphoneVariant: {
      baseProbability: 1.0,
      scaledProbability: 1.0,
      listeningTo: ["true crime podcast", "news podcast", "comedy podcast", "self help podcast", "business podcast", "storytelling podcast", "history podcast", "interview podcast"],
    },
  },
  {
    id: "4.3.5",
    name: "Sending messages",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
  },

  // 4.4 activities
  {
    id: "4.4.1",
    name: "Lost tourist (checking map/phone)",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "4.4.2",
    name: "Phone died / looking for help",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
  },
  {
    id: "4.4.3",
    name: "Checking directions on phone",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
  },

  // 4.5 activities
  {
    id: "4.5.1",
    name: "Idle with no clear purpose",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "nothing, just blocking world", "audiobook", "random spotify", "meditation"],
    },
  },

  // 5.1 activities
  {
    id: "5.1.1",
    name: "Sitting on a bench",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "nature sounds", "meditation app", "phone call", "nothing, just relaxing"],
    },
  },
  {
    id: "5.1.10",
    name: "Drinking coffee",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "5.1.2",
    name: "Sitting in the sun",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "5.1.3",
    name: "Sitting in the shade",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "5.1.4",
    name: "Reading a book",
    crowdWeights: [
      { value: "low", weight: 0.7 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0 },
    ],
  },
  {
    id: "5.1.5",
    name: "Reading on her phone",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "5.1.6",
    name: "Journaling",
    crowdWeights: [
      { value: "low", weight: 0.8 },
      { value: "medium", weight: 0.2 },
      { value: "high", weight: 0 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["ambient music", "nature sounds", "lo-fi", "meditation music", "white noise", "nothing, just focus"],
    },
  },
  {
    id: "5.1.7",
    name: "People-watching",
    crowdWeights: [
      { value: "low", weight: 0.1 },
      { value: "medium", weight: 0.7 },
      { value: "high", weight: 0.2 },
    ],
  },
  {
    id: "5.1.8",
    name: "Sketching / drawing",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "ambient sounds", "classical", "lo-fi", "jazz", "nature sounds", "nothing, just concentrating"],
    },
  },
  {
    id: "5.1.9",
    name: "Eating lunch",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "youtube", "phone call", "nothing, just eating"],
    },
  },

  // 5.2 activities
  {
    id: "5.2.1",
    name: "Taking a walk",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "meditation audio", "nature sounds", "phone call", "nothing, just thinking"],
    },
  },
  {
    id: "5.2.2",
    name: "Walking briskly",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["workout music", "upbeat playlist", "podcast", "audiobook", "motivational audio", "nothing, just exercising"],
    },
  },
  {
    id: "5.2.3",
    name: "Wandering without clear destination",
    crowdWeights: [
      { value: "low", weight: 0.7 },
      { value: "medium", weight: 0.2 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "ambient music", "daydreaming playlist", "nothing, just in thoughts"],
    },
  },
  {
    id: "5.2.4",
    name: "Walking a dog",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "phone call", "dog training audio", "nothing, just walking"],
    },
  },
  {
    id: "5.2.5",
    name: "Dog pause (dog sniffing/playing)",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "5.2.6",
    name: "At dog park",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.7 },
      { value: "high", weight: 0.1 },
    ],
  },

  // 5.3 activities
  {
    id: "5.3.1",
    name: "Going for a run (pre-run)",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["workout music", "running playlist", "pump up music", "podcast", "motivational audio", "nothing, just preparing"],
    },
  },
  {
    id: "5.3.2",
    name: "Running",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["running playlist", "high energy music", "EDM", "rock", "workout mix", "podcast", "nothing, just running"],
    },
  },
  {
    id: "5.3.3",
    name: "Stretching (pre/post exercise)",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "workout playlist", "podcast", "guided stretching", "meditation audio", "nothing, just focusing"],
    },
  },
  {
    id: "5.3.4",
    name: "Cooling down after exercise",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["chill music", "cooldown playlist", "podcast", "audiobook", "meditation audio", "nothing, just recovering"],
    },
  },
  {
    id: "5.3.5",
    name: "Sitting post-workout",
    crowdWeights: [
      { value: "low", weight: 0.7 },
      { value: "medium", weight: 0.2 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "recovery playlist", "phone call", "nothing, just resting"],
    },
  },
  {
    id: "5.3.6",
    name: "Drinking water after exercise",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },

  // 5.4 activities
  {
    id: "5.4.1",
    name: "On phone (scrolling or reading)",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "5.4.2",
    name: "On a phone call",
    crowdWeights: [
      { value: "low", weight: 0.7 },
      { value: "medium", weight: 0.2 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "5.4.3",
    name: "Listening to music (headphones visible)",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 1.0,
      scaledProbability: 1.0,
      listeningTo: ["chill music", "nature playlist", "acoustic", "indie", "classical", "lo-fi", "jazz", "ambient", "meditation music"],
    },
  },
  {
    id: "5.4.4",
    name: "Listening to a podcast (headphones visible)",
    crowdWeights: [
      { value: "low", weight: 0.7 },
      { value: "medium", weight: 0.2 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 1.0,
      scaledProbability: 1.0,
      listeningTo: ["true crime podcast", "self help podcast", "comedy podcast", "storytelling podcast", "wellness podcast", "nature podcast", "interview podcast"],
    },
  },
  {
    id: "5.4.5",
    name: "Taking photos",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "5.4.6",
    name: "Doing photography (active/serious)",
    crowdWeights: [
      { value: "low", weight: 0.7 },
      { value: "medium", weight: 0.2 },
      { value: "high", weight: 0.1 },
    ],
  },

  // 5.5 activities
  {
    id: "5.5.1",
    name: "Waiting for a friend",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "phone call with someone else", "killing time playlist", "nothing, just waiting"],
    },
  },
  {
    id: "5.5.2",
    name: "Just finished seeing a friend",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },

  // 5.6 activities
  {
    id: "5.6.1",
    name: "Feeding birds/ducks",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "5.6.2",
    name: "Getting fresh air",
    crowdWeights: [
      { value: "low", weight: 0.7 },
      { value: "medium", weight: 0.2 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "5.6.3",
    name: "Idle with no clear purpose",
    crowdWeights: [
      { value: "low", weight: 0.8 },
      { value: "medium", weight: 0.2 },
      { value: "high", weight: 0 },
    ],
  },

  // 6.1 activities
  {
    id: "6.1.1",
    name: "Heading to the gym",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["workout music", "pump up playlist", "motivational podcast", "EDM", "rock", "phone call", "nothing, just focused"],
    },
  },
  {
    id: "6.1.2",
    name: "Arriving at gym",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "6.1.3",
    name: "Stretching (pre-workout)",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["workout music", "pump up playlist", "warm up music", "podcast", "motivational audio", "nothing, just focusing"],
    },
  },
  {
    id: "6.1.4",
    name: "Looking at phone (pre-workout)",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "6.1.5",
    name: "Waiting for equipment",
    crowdWeights: [
      { value: "low", weight: 0.1 },
      { value: "medium", weight: 0.6 },
      { value: "high", weight: 0.3 },
    ],
  },

  // 6.2 activities
  {
    id: "6.2.1",
    name: "Leaving the gym",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "cooldown playlist", "phone call", "nothing, just tired"],
    },
  },
  {
    id: "6.2.2",
    name: "Cooling down after exercise",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["chill music", "cooldown playlist", "podcast", "meditation audio", "phone call", "nothing, just recovering"],
    },
  },
  {
    id: "6.2.3",
    name: "Sitting post-workout",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "recovery sounds", "phone call", "nothing, just resting"],
    },
  },
  {
    id: "6.2.4",
    name: "Drinking water after exercise",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "6.2.5",
    name: "Stretching (post-workout)",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "recovery playlist", "guided stretching", "meditation audio", "podcast", "nothing, just focusing"],
    },
  },
  {
    id: "6.2.6",
    name: "Looking at phone (post-workout)",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },

  // 6.3 activities
  {
    id: "6.3.1",
    name: "On phone (scrolling or reading)",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "6.3.2",
    name: "Listening to music (headphones visible)",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 1.0,
      scaledProbability: 1.0,
      listeningTo: ["workout music", "gym playlist", "EDM", "rock", "hip-hop", "motivational audio", "pump up mix", "high energy beats"],
    },
  },

  // 7.1 activities
  {
    id: "7.1.1",
    name: "Walking between classes",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "lecture recording", "language app", "phone call", "nothing, just walking"],
    },
  },
  {
    id: "7.1.2",
    name: "Heading to class",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "last minute lecture notes", "audiobook", "study music", "nothing, just focused"],
    },
  },
  {
    id: "7.1.3",
    name: "Leaving class",
    crowdWeights: [
      { value: "low", weight: 0.1 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.4 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "decompression playlist", "phone call", "nothing, just leaving"],
    },
  },
  {
    id: "7.1.4",
    name: "Checking schedule/phone",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },
  {
    id: "7.1.5",
    name: "Rushing between buildings",
    crowdWeights: [
      { value: "low", weight: 0.1 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.4 },
    ],
  },

  // 7.2 activities
  {
    id: "7.2.1",
    name: "Studying outdoors",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["study music", "lo-fi", "classical", "white noise", "ambient sounds", "nothing, just concentrating"],
    },
  },
  {
    id: "7.2.2",
    name: "Reading on campus",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "7.2.3",
    name: "Working on laptop",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["study music", "lo-fi", "classical", "white noise", "ambient", "lecture recording", "nothing, just focusing"],
    },
  },
  {
    id: "7.2.4",
    name: "Taking notes",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
  },

  // 7.3 activities
  {
    id: "7.3.1",
    name: "On a break between classes",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "phone call", "audiobook", "decompression playlist", "nothing, just relaxing"],
    },
  },
  {
    id: "7.3.2",
    name: "Waiting for a friend",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "phone call with someone else", "killing time playlist", "nothing, just waiting"],
    },
  },
  {
    id: "7.3.3",
    name: "Just finished seeing a friend",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
  },
  {
    id: "7.3.4",
    name: "Eating lunch on campus",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "youtube", "audiobook", "phone call", "nothing, just eating"],
    },
  },
  {
    id: "7.3.5",
    name: "Getting coffee on campus",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.3 },
    ],
  },

  // 7.4 activities
  {
    id: "7.4.1",
    name: "Sitting in campus courtyard",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "chill playlist", "meditation app", "phone call", "nothing, just relaxing"],
    },
  },
  {
    id: "7.4.2",
    name: "Walking through campus",
    crowdWeights: [
      { value: "low", weight: 0.4 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "audiobook", "walking playlist", "phone call", "nothing, just walking"],
    },
  },
  {
    id: "7.4.3",
    name: "People-watching on campus",
    crowdWeights: [
      { value: "low", weight: 0.2 },
      { value: "medium", weight: 0.6 },
      { value: "high", weight: 0.2 },
    ],
  },
  {
    id: "7.4.4",
    name: "Taking photos on campus",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },

  // 7.5 activities
  {
    id: "7.5.1",
    name: "On phone (scrolling or reading)",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
  },
  {
    id: "7.5.2",
    name: "On a phone call",
    crowdWeights: [
      { value: "low", weight: 0.5 },
      { value: "medium", weight: 0.4 },
      { value: "high", weight: 0.1 },
    ],
  },
  {
    id: "7.5.3",
    name: "Listening to music (headphones visible)",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
    headphoneVariant: {
      baseProbability: 1.0,
      scaledProbability: 1.0,
      listeningTo: ["study music", "indie music", "pop", "lo-fi", "rock", "hip-hop", "chill vibes", "podcast", "audiobook"],
    },
  },
  {
    id: "7.5.4",
    name: "Sending messages",
    crowdWeights: [
      { value: "low", weight: 0.3 },
      { value: "medium", weight: 0.5 },
      { value: "high", weight: 0.2 },
    ],
  },

  // 7.6 activities
  {
    id: "7.6.1",
    name: "Idle with no clear purpose",
    crowdWeights: [
      { value: "low", weight: 0.6 },
      { value: "medium", weight: 0.3 },
      { value: "high", weight: 0.1 },
    ],
    headphoneVariant: {
      baseProbability: 0.1,
      scaledProbability: 0.3,
      listeningTo: ["music", "podcast", "nothing, just zoning out", "audiobook", "random playlist", "meditation"],
    },
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function weightedSample<T>(options: { value: T; weight: number }[]): T {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let random = Math.random() * total;

  for (const option of options) {
    random -= option.weight;
    if (random <= 0) return option.value;
  }

  return options[options.length - 1].value;
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/** Get environment name based on activity ID prefix */
function getEnvironmentName(activityId: ActivityId): { name: string; code: string } {
  const prefix = activityId.substring(0, 3);
  const environments: Record<string, { name: string; code: string }> = {
    "1.1": { name: "High Street - Shopping District", code: "1.1" },
    "1.2": { name: "High Street - Commute/Work", code: "1.2" },
    "1.3": { name: "High Street - Transit", code: "1.3" },
    "1.4": { name: "High Street - Leisure", code: "1.4" },
    "1.5": { name: "High Street - Waiting", code: "1.5" },
    "1.6": { name: "High Street - Food/Drink", code: "1.6" },
    "1.7": { name: "High Street - Digital/Media", code: "1.7" },
    "1.8": { name: "High Street - Pet Activities", code: "1.8" },
    "1.9": { name: "High Street - Utility", code: "1.9" },
    "2.1": { name: "Mall - Customer Browsing", code: "2.1" },
    "2.2": { name: "Mall - Employee", code: "2.2" },
    "2.3": { name: "Mall - Food Court", code: "2.3" },
    "2.4": { name: "Mall - Transit/Movement", code: "2.4" },
    "2.5": { name: "Mall - Digital/Media", code: "2.5" },
    "2.6": { name: "Mall - Waiting", code: "2.6" },
    "3.1": { name: "Coffee Shop - Work/Productivity", code: "3.1" },
    "3.2": { name: "Coffee Shop - Leisure/Relaxation", code: "3.2" },
    "3.3": { name: "Coffee Shop - Waiting/Social", code: "3.3" },
    "3.4": { name: "Coffee Shop - Ordering/Service", code: "3.4" },
    "3.5": { name: "Coffee Shop - Digital/Media", code: "3.5" },
    "3.6": { name: "Coffee Shop - Break/Idle", code: "3.6" },
    "4.1": { name: "Transit - Waiting", code: "4.1" },
    "4.2": { name: "Transit - Arriving/Departing", code: "4.2" },
    "4.3": { name: "Transit - Digital/Media", code: "4.3" },
    "4.4": { name: "Transit - Utility/Help", code: "4.4" },
    "4.5": { name: "Transit - Idle", code: "4.5" },
    "5.1": { name: "Park - Sitting/Relaxing", code: "5.1" },
    "5.2": { name: "Park - Walking", code: "5.2" },
    "5.3": { name: "Park - Exercise", code: "5.3" },
    "5.4": { name: "Park - Digital/Media", code: "5.4" },
    "5.5": { name: "Park - Social/Waiting", code: "5.5" },
    "5.6": { name: "Park - Special Activities", code: "5.6" },
    "6.1": { name: "Gym - Pre-Workout", code: "6.1" },
    "6.2": { name: "Gym - Post-Workout", code: "6.2" },
    "6.3": { name: "Gym - Digital/Media", code: "6.3" },
    "7.1": { name: "Campus - Between Classes", code: "7.1" },
    "7.2": { name: "Campus - Studying", code: "7.2" },
    "7.3": { name: "Campus - Social/Break", code: "7.3" },
    "7.4": { name: "Campus - Leisure", code: "7.4" },
    "7.5": { name: "Campus - Digital/Media", code: "7.5" },
    "7.6": { name: "Campus - Idle", code: "7.6" },
  };
  return environments[prefix] || { name: "High Street", code: "1" };
}

function difficultyToMultiplier(difficulty: DifficultyLevel): number {
  const map: Record<DifficultyLevel, number> = {
    beginner: 0,
    intermediate: 0.25,
    advanced: 0.5,
    expert: 0.75,
    master: 1,
  };
  return map[difficulty];
}

// ============================================================================
// POSITION SAMPLING (respects activity constraints + energy compatibility)
// ============================================================================

/**
 * Energy-position compatibility constraints
 * Some energies should NEVER be paired with certain positions to avoid contradictions
 * like "walking briskly" + "relaxed" + "no rush in her movement"
 */
const ENERGY_POSITION_EXCLUSIONS: Partial<Record<EnergyState, Position[]>> = {
  rushed: ["standing", "seated", "walking_slow"], // Rushed people don't stand around
  relaxed: ["walking_brisk", "walking_fast"], // Relaxed people don't rush
  bored: ["walking_brisk", "walking_fast"], // Bored people aren't rushing
  tired: ["walking_brisk", "walking_fast"], // Tired people move slowly
  daydreaming: ["walking_brisk", "walking_fast"], // Daydreamers drift slowly
};

/** Position weights - modified by energy */
function samplePosition(activityId: ActivityId, energy: EnergyState): Position {
  const validPositions = getValidPositions(activityId);

  // Filter out incompatible positions for this energy
  const exclusions = ENERGY_POSITION_EXCLUSIONS[energy] || [];
  const compatiblePositions = validPositions.filter((p) => !exclusions.includes(p));

  // Use compatible positions if any remain, otherwise fallback to all valid
  const positionsToUse = compatiblePositions.length > 0 ? compatiblePositions : validPositions;

  // Energy affects position likelihood (biases for remaining positions)
  const energyPositionBias: Partial<Record<EnergyState, Partial<Record<Position, number>>>> = {
    bubbly: { standing: 1.2, walking_slow: 1.1 },
    cheerful: { standing: 1.1, walking_slow: 1.1 },
    relaxed: { standing: 1.3, walking_slow: 1.2 },
    neutral: {},
    daydreaming: { standing: 1.4, walking_slow: 1.1 },
    preoccupied: { walking_moderate: 1.2 },
    focused: { walking_moderate: 1.3, walking_brisk: 1.2 },
    rushed: { walking_brisk: 1.5, walking_fast: 1.3 },
    closed: { walking_moderate: 1.2 },
    icy: { walking_brisk: 1.3, walking_moderate: 1.1 },
    // New energies
    curious: { standing: 1.2, walking_slow: 1.3 },
    playful: { standing: 1.1, walking_slow: 1.2 },
    tired: { standing: 1.3, seated: 1.5, walking_slow: 1.2 },
    stressed: { walking_moderate: 1.3, walking_brisk: 1.2 },
    distracted: { standing: 1.2, walking_slow: 1.3 },
    confident: { walking_moderate: 1.2, walking_brisk: 1.1 },
    shy: { standing: 1.2, walking_slow: 1.1 },
    bored: { standing: 1.3, seated: 1.5 },
  };

  const biases = energyPositionBias[energy] || {};

  // Build weighted options
  const options = positionsToUse.map((pos) => ({
    value: pos,
    weight: biases[pos] || 1.0,
  }));

  return weightedSample(options);
}

// ============================================================================
// HEADPHONE LOGIC
// ============================================================================

function shouldHaveHeadphones(
  activity: ActivityConfig,
  difficulty: DifficultyLevel
): boolean {
  if (!activity.headphoneVariant) return false;

  const multiplier = difficultyToMultiplier(difficulty);
  const probability =
    activity.headphoneVariant.baseProbability +
    (activity.headphoneVariant.scaledProbability -
      activity.headphoneVariant.baseProbability) *
      multiplier;

  return Math.random() < probability;
}

// ============================================================================
// CROWD TEXT (only shown at lower difficulties)
// ============================================================================

const CROWD_TEXTS: Record<string, string[]> = {
  low: [
    "The area is quiet.",
    "There aren't many people around.",
    "It feels fairly empty.",
  ],
  medium: [], // Don't mention - it's the default
  high: [
    "The area is busy.",
    "There are lots of people around.",
    "It's crowded.",
  ],
};

function getCrowdText(crowd: string, difficulty: DifficultyLevel): string {
  // Only show crowd info at beginner/intermediate
  if (difficulty === "advanced" || difficulty === "expert" || difficulty === "master") {
    return "";
  }

  const texts = CROWD_TEXTS[crowd];
  if (!texts || texts.length === 0) return "";

  return randomChoice(texts);
}

// ============================================================================
// HEADPHONE TEXT
// ============================================================================

const HEADPHONE_TEXTS = [
  "She's wearing headphones.",
  "She has headphones on.",
  "You notice she's wearing earbuds.",
  "She's got headphones in.",
];

function getHeadphoneText(hasHeadphones: boolean, baseText: string): string {
  if (!hasHeadphones) return "";
  // Don't add headphone text if base text already mentions headphones
  if (baseText.toLowerCase().includes("headphone") || baseText.toLowerCase().includes("earbud")) {
    return "";
  }
  return randomChoice(HEADPHONE_TEXTS);
}

// ============================================================================
// HOOK SELECTION
// ============================================================================

/**
 * Get a hook/opener hint for the scenario (difficulty-gated)
 * Hooks are more common at lower difficulties to help beginners
 */
function getHook(
  activityId: ActivityId,
  envCode: EnvironmentCode,
  difficulty: DifficultyLevel
): string | undefined {
  // Hook probability by difficulty
  const hookProbabilityMultiplier: Record<DifficultyLevel, number> = {
    beginner: 1.0,      // Full hook probability
    intermediate: 0.7,  // 70% of base probability
    advanced: 0.4,      // 40% of base probability
    expert: 0.15,       // 15% of base probability
    master: 0,          // No hooks at master
  };

  const multiplier = hookProbabilityMultiplier[difficulty];
  if (multiplier === 0) return undefined;

  // Find applicable hooks
  const applicableHooks = HOOKS.filter((hook) => {
    // Check activity match (if specified)
    if (hook.activityIds && !hook.activityIds.includes(activityId)) {
      return false;
    }
    // Check environment match (if specified)
    if (hook.envCodes && !hook.envCodes.includes(envCode)) {
      return false;
    }
    return true;
  });

  if (applicableHooks.length === 0) return undefined;

  // Try each applicable hook
  for (const hook of applicableHooks) {
    if (Math.random() < hook.probability * multiplier) {
      return hook.text;
    }
  }

  return undefined;
}

// ============================================================================
// ENVIRONMENT-WEIGHTED ACTIVITY SELECTION
// ============================================================================

/**
 * Select an activity with optional environment weighting
 */
function selectActivity(
  environmentWeights?: EnvironmentWeights,
  specificActivityId?: ActivityId
): ActivityConfig {
  // If specific activity requested, use that
  if (specificActivityId) {
    return ACTIVITIES.find((a) => a.id === specificActivityId) || randomChoice(ACTIVITIES);
  }

  // If no environment weights, equal chance for all
  if (!environmentWeights) {
    return randomChoice(ACTIVITIES);
  }

  // Merge with defaults
  const weights = { ...DEFAULT_ENVIRONMENT_WEIGHTS, ...environmentWeights };

  // Group activities by environment
  const activitiesByEnv: Record<string, ActivityConfig[]> = {};
  for (const activity of ACTIVITIES) {
    const envCode = activity.id.substring(0, 3) as EnvironmentCode;
    if (!activitiesByEnv[envCode]) {
      activitiesByEnv[envCode] = [];
    }
    activitiesByEnv[envCode].push(activity);
  }

  // Build weighted environment options
  const envOptions = Object.entries(weights)
    .filter(([code]) => activitiesByEnv[code]?.length > 0)
    .map(([code, weight]) => ({
      value: code as EnvironmentCode,
      weight: weight || 1.0,
    }));

  // Sample environment
  const selectedEnv = weightedSample(envOptions);

  // Pick random activity from that environment
  return randomChoice(activitiesByEnv[selectedEnv]);
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export interface GeneratorOptionsV2 {
  /** Activity ID. Random if not provided. */
  activityId?: ActivityId;
  /** Difficulty level. Defaults to intermediate. */
  difficulty?: DifficultyLevel;
  /** Environment weights for activity selection (for archetype integration) */
  environmentWeights?: EnvironmentWeights;
  /** Archetype ID for outfit selection (e.g., "powerhouse", "creative", "athlete"). */
  archetypeId?: string;
  /** Preferred region id for regional item flavoring (optional). */
  regionId?: RegionId;
  /** Preferred country id for country-level item flavoring (optional). */
  countryId?: CountryId;
  /** Secondary region id for foreign flavoring (optional). */
  secondaryRegionId?: RegionId;
  /** Secondary country id for foreign flavoring (optional). */
  secondaryCountryId?: CountryId;
  /** Override probability for regional items (0-1). */
  regionalItemProbability?: number;
  /** Override probability for country items (0-1). */
  countryItemProbability?: number;
  /** Override probability for foreign/secondary items (0-1). */
  foreignItemProbability?: number;
  /** Whether the user is primarily dating foreigners (boosts foreign pool). */
  datingForeigners?: boolean;
  /** Whether the user is a foreigner in the current location (boosts foreign pool). */
  userIsForeign?: boolean;
  /** Whether to include hooks/opener hints. Defaults to true. */
  includeHooks?: boolean;
  /** Whether to include weather. Defaults to false. */
  includeWeather?: boolean;
  /** Season for weather sampling. Random seasonal weighting if not provided. */
  season?: Season;
  /** Whether to use the enhanced outfit system with tiered descriptions. Defaults to true. */
  useEnhancedOutfits?: boolean;
  /** Sandbox settings for customizing scenario generation */
  sandboxSettings?: SandboxSettings;
}

export function generateScenarioV2(
  options: GeneratorOptionsV2 = {}
): GeneratedScenarioV2 {
  const {
    difficulty = "intermediate",
    environmentWeights,
    archetypeId = "creative", // Default archetype for outfit selection
    regionId,
    countryId,
    secondaryRegionId,
    secondaryCountryId,
    regionalItemProbability,
    countryItemProbability,
    foreignItemProbability,
    datingForeigners,
    userIsForeign,
    includeHooks = true,
    includeWeather = false,
    season,
    useEnhancedOutfits = true,
    sandboxSettings,
  } = options;

  // Apply environment filters from sandbox settings
  let filteredEnvironmentWeights = environmentWeights;
  if (sandboxSettings?.environments) {
    const envFilters = sandboxSettings.environments;
    if (filteredEnvironmentWeights) {
      filteredEnvironmentWeights = { ...filteredEnvironmentWeights };
    } else {
      filteredEnvironmentWeights = {};
    }
    // Filter out disabled environments by setting their weight to 0
    if (!envFilters.enableGymScenarios) {
      filteredEnvironmentWeights["6.1"] = 0;
      filteredEnvironmentWeights["6.2"] = 0;
      filteredEnvironmentWeights["6.3"] = 0;
    }
    if (!envFilters.enableTransitScenarios) {
      filteredEnvironmentWeights["4.1"] = 0;
      filteredEnvironmentWeights["4.2"] = 0;
      filteredEnvironmentWeights["4.3"] = 0;
      filteredEnvironmentWeights["4.4"] = 0;
      filteredEnvironmentWeights["4.5"] = 0;
    }
    if (!envFilters.enableCampusScenarios) {
      filteredEnvironmentWeights["7.1"] = 0;
      filteredEnvironmentWeights["7.2"] = 0;
      filteredEnvironmentWeights["7.3"] = 0;
      filteredEnvironmentWeights["7.4"] = 0;
      filteredEnvironmentWeights["7.5"] = 0;
      filteredEnvironmentWeights["7.6"] = 0;
    }
  }

  // Select activity (with optional environment weighting)
  const activity = selectActivity(filteredEnvironmentWeights, options.activityId);

  // Get environment info
  const envInfo = getEnvironmentName(activity.id);
  const envCode = envInfo.code as EnvironmentCode;

  // Sample energy based on difficulty with sandbox filters
  const energy = sandboxSettings?.energy
    ? sampleEnergyWithFilters(difficulty, {
        enableNegativeEnergies: sandboxSettings.energy.enableNegativeEnergies,
        enableNeutralEnergies: sandboxSettings.energy.enableNeutralEnergies,
        enableShyEnergies: sandboxSettings.energy.enableShyEnergies,
      })
    : sampleEnergy(difficulty);

  // Sample position (constrained by activity, influenced by energy)
  let position = samplePosition(activity.id, energy);

  // Apply movement filters from sandbox settings
  if (sandboxSettings?.movement?.enableFastMovement === false) {
    // Re-sample if we got a fast movement position
    if (position === "walking_brisk" || position === "walking_fast") {
      const validPositions = getValidPositions(activity.id).filter(
        (p) => p !== "walking_brisk" && p !== "walking_fast"
      );
      if (validPositions.length > 0) {
        position = validPositions[Math.floor(Math.random() * validPositions.length)];
      }
    }
  }

  // Sample crowd
  let crowd = weightedSample(activity.crowdWeights);

  // Apply crowd filter from sandbox settings
  if (sandboxSettings?.environments?.enableHighCrowdScenarios === false && crowd === "high") {
    crowd = Math.random() < 0.5 ? "low" : "medium";
  }

  // Check headphones (with sandbox filter)
  let hasHeadphones = shouldHaveHeadphones(activity, difficulty);
  if (sandboxSettings?.movement?.enableHeadphones === false) {
    hasHeadphones = false;
  }
  const listeningTo = hasHeadphones && activity.headphoneVariant
    ? randomChoice(activity.headphoneVariant.listeningTo)
    : undefined;

  // Sample outfit using enhanced system or legacy system
  let outfitText = "";
  let outfitCategory: OutfitCategory;
  let outfitId: string;
  let outfitDescription: string; // Full description for AI handoff
  let outfitHooks: string[] = [];

  if (useEnhancedOutfits) {
    // NEW: Enhanced outfit system with tiered descriptions
    const outfitResult = selectOutfitForScenario({
      archetypeId,
      locationCode: envCode,
      difficulty,
    });
    outfitText = outfitResult.description;
    outfitCategory = outfitResult.outfit.category;
    outfitId = outfitResult.outfit.id;
    outfitDescription = outfitResult.description; // For AI handoff
    outfitHooks = outfitResult.hooks;

    // Add accessory text at appropriate difficulty levels
    const accessoryText = getAccessoryTextForDifficulty(difficulty);
    if (accessoryText) {
      outfitText = outfitText ? `${outfitText} ${accessoryText}` : accessoryText;
    }

    // Add hair description at appropriate difficulty levels
    const hairText = getHairTextForDifficulty(difficulty);
    if (hairText) {
      outfitText = outfitText ? `${outfitText} ${hairText}` : hairText;
    }
  } else {
    // LEGACY: Original outfit system
    outfitCategory = sampleOutfitCategory(OUTFIT_WEIGHTS_BY_ENV[envCode]);
    const outfit = getOutfitByCategory(outfitCategory);
    outfitId = outfit.id;
    outfitDescription = getOutfitText(outfit);
    outfitText =
      Math.random() < OUTFIT_VISIBILITY[difficulty] ? outfitDescription : "";
  }

  // Apply display filter for outfit text
  if (sandboxSettings?.display?.showOutfitDescriptions === false) {
    outfitText = "";
  }

  // Sample weather if enabled (with sandbox filters)
  const weather = includeWeather
    ? sandboxSettings?.weather
      ? sampleWeatherWithFilters(difficulty, season, {
          enableBadWeather: sandboxSettings.weather.enableBadWeather,
          enableHotWeather: sandboxSettings.weather.enableHotWeather,
        })
      : sampleWeather(difficulty, season)
    : undefined;

  // Apply display filters for weather
  const showWeather = sandboxSettings?.weather?.showWeatherDescriptions !== false;
  const weatherText = weather && showWeather ? getWeatherText(weather, difficulty) : "";
  const weatherOutfitMod = weather ? getWeatherOutfitModifier(weather, difficulty) : "";
  const weatherBehaviorMod = weather ? getWeatherBehaviorModifier(weather, difficulty) : "";

  // Build user-facing description
  const baseText = getBaseText(activity.id, position);

  // Apply display filter for energy text
  const showEnergy = sandboxSettings?.energy?.showEnergyDescriptions !== false;
  const energyText = showEnergy ? getEnergyText(energy, difficulty) : "";

  // Apply display filter for crowd text
  const showCrowd = sandboxSettings?.display?.showCrowdDescriptions !== false;
  const crowdText = showCrowd ? getCrowdText(crowd, difficulty) : "";

  const headphoneText = getHeadphoneText(hasHeadphones, baseText);
  const visibleItem = getVisibleItem(
    activity.id,
    envCode,
    {
      regionId,
      countryId,
      secondaryRegionId,
      secondaryCountryId,
      regionalItemProbability,
      countryItemProbability,
      foreignItemProbability,
      datingForeigners,
      userIsForeign,
    }
  );
  const visibleItemText = visibleItem?.text ?? "";

  // Combine texts (filter empty strings)
  const descriptionParts = [
    baseText,
    visibleItemText,
    outfitText,
    weatherOutfitMod, // Weather-related outfit detail (e.g., "She has her hood up")
    energyText,
    weatherBehaviorMod, // Weather-related behavior (e.g., "She's hurrying through the rain")
    crowdText,
    headphoneText,
  ].filter((t) => t.length > 0);
  const description = descriptionParts.join(" ");

  // Get optional hook/opener hint (with sandbox filter)
  const showHooks = sandboxSettings?.display?.showOpenerHooks !== false;
  const hook = includeHooks && showHooks
    ? getHook(activity.id, envCode, difficulty)
    : undefined;

  // Calculate difficulty score
  const approachability = getEnergyApproachability(energy);
  let calculatedDifficulty = 1 - approachability; // Invert: low approachability = high difficulty

  if (hasHeadphones) calculatedDifficulty += 0.15;
  if (position === "walking_brisk" || position === "walking_fast") calculatedDifficulty += 0.1;

  // Weather affects difficulty (bad weather = harder to approach)
  if (weather) {
    const weatherMoodMod = getWeatherMoodModifier(weather);
    calculatedDifficulty -= weatherMoodMod; // Negative mood = higher difficulty
  }

  calculatedDifficulty = Math.min(Math.max(calculatedDifficulty, 0), 1);

  return {
    userFacing: {
      description,
      environment: envInfo.name,
      activity: activity.name,
      hook,
      weatherDescription: weatherText || undefined,
    },
    aiHandoff: {
      env: envInfo.code,
      activity: activity.name,
      position,
      energy,
      energyDescription: getEnergyAiDescription(energy),
      approachability,
      crowd,
      hasHeadphones,
      listeningTo,
      visibleItem: visibleItem || undefined,
      outfit: {
        id: outfitId,
        category: outfitCategory,
        description: outfitDescription,
      },
      outfitHooks: outfitHooks.length > 0 ? outfitHooks : undefined,
      weather: weather
        ? {
            type: weather,
            moodModifier: getWeatherMoodModifier(weather),
            aiDescription: getWeatherAiDescription(weather),
          }
        : undefined,
    },
    meta: {
      activityId: activity.id,
      difficulty,
      calculatedDifficulty,
    },
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export function getAvailableActivities(): { id: ActivityId; name: string }[] {
  return ACTIVITIES.map((a) => ({ id: a.id, name: a.name }));
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
  "master",
];
