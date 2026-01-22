/**
 * BASE TEXTS - Position-constrained observation texts
 *
 * CORE PRINCIPLE: Only describe what you can PHYSICALLY SEE.
 * You cannot see:
 * - Her internal state (enjoying, stressed, bored)
 * - Her purpose (going to work, on a break, running an errand)
 * - Her destination (heading to a meeting, going home)
 * - Her relationships (waiting for a friend vs waiting for anyone)
 *
 * You CAN see:
 * - Physical actions (walking, standing, looking at phone)
 * - Speed (walking fast, slowly, standing still)
 * - Objects (bags, coffee, dog, camera, phone)
 * - Clothing (work clothes, casual, coat)
 * - Location context (near office building, by shop window)
 *
 * Energy and other modifiers are added separately by the generator.
 */

export type Position =
  | "standing"
  | "walking_slow"
  | "walking_moderate"
  | "walking_brisk"
  | "walking_fast"
  | "seated";

export type ActivityId =
  // 1.1 High Street - Shopping District
  | "1.1.1" // Shopping for something specific
  | "1.1.2" // Browsing shops
  | "1.1.3" // Window shopping
  | "1.1.4" // Carrying shopping bags
  | "1.1.5" // Looking for a gift
  | "1.1.6" // Comparing items
  | "1.1.7" // Just finished shopping
  | "1.1.8" // Looking at shop windows
  // 1.2 High Street - Commute/Work
  | "1.2.1" // Going to work
  | "1.2.2" // Leaving work
  | "1.2.3" // On a short work break
  | "1.2.4" // Getting coffee for work
  | "1.2.5" // Stepping outside from work
  | "1.2.6" // Running a work errand
  | "1.2.7" // Heading to a meeting
  | "1.2.8" // Leaving a meeting
  | "1.2.9" // On lunch break
  | "1.2.10" // Getting lunch to-go
  | "1.2.11" // Smoke break outside work
  // 1.3 High Street - Transit/Movement
  | "1.3.1" // Commuting somewhere
  | "1.3.2" // Walking between places
  | "1.3.3" // Just arrived somewhere
  | "1.3.4" // About to leave
  | "1.3.5" // Walking briskly
  // 1.4 High Street - Leisure/Exploring
  | "1.4.1" // Taking a walk
  | "1.4.2" // Getting fresh air
  | "1.4.3" // People-watching
  | "1.4.4" // Exploring the area
  | "1.4.5" // Wandering without a destination
  | "1.4.6" // Looking at buildings
  | "1.4.7" // Taking photos
  | "1.4.8" // Checking a map
  | "1.4.9" // Standing near a landmark
  | "1.4.10" // Watching street performer
  | "1.4.11" // Doing photography (active)
  // 1.5 High Street - Waiting/Paused
  | "1.5.1" // Waiting for a friend
  | "1.5.2" // Waiting for an appointment
  | "1.5.3" // Killing time before something
  | "1.5.4" // Early for something
  | "1.5.5" // Idle with no clear purpose
  // 1.6 High Street - Food/Drink
  | "1.6.1" // Drinking a takeaway drink
  | "1.6.2" // Eating while walking
  | "1.6.3" // Eating on a bench
  // 1.7 High Street - Digital/Media
  | "1.7.1" // On a phone call
  | "1.7.2" // Sending messages
  | "1.7.3" // On phone (scrolling or reading)
  | "1.7.4" // Listening to music (headphones visible)
  | "1.7.5" // Listening to a podcast (headphones visible)
  | "1.7.6" // Taking a voice note
  // 1.8 High Street - Pet Activities
  | "1.8.1" // Walking a dog
  | "1.8.2" // Dog pause (dog sniffing/paused)
  // 1.9 High Street - Maintenance/Utility
  | "1.9.1" // Fixing something (bag, shoe, bike)
  | "1.9.2" // Adjusting clothes/accessories
  | "1.9.3" // Dealing with weather
  | "1.9.4" // Phone died / looking for help
  | "1.9.5" // Lost / checking directions on phone
  // 2.1 Mall - Customer Browsing
  | "2.1.1" // Shopping for something specific
  | "2.1.2" // Browsing shops
  | "2.1.3" // Comparing items
  | "2.1.4" // Looking for a gift
  | "2.1.5" // Trying on clothes (near fitting room)
  | "2.1.6" // Carrying shopping bags
  | "2.1.7" // Just finished shopping
  | "2.1.8" // Picking up an order
  | "2.1.9" // Returning an item
  | "2.1.10" // Waiting for service (at counter)
  | "2.1.11" // Just received order/purchase
  | "2.1.12" // Asking employee a question
  | "2.1.13" // At checkout / paying
  | "2.1.14" // Comparing prices on phone
  // 2.2 Mall - Employee
  | "2.2.1" // Working at counter/register
  | "2.2.2" // Stocking shelves
  | "2.2.3" // Organizing displays
  | "2.2.4" // Idle at counter (no customers)
  | "2.2.5" // On break (visible in store area)
  // 2.3 Mall - Food Court
  | "2.3.1" // Ordering food
  | "2.3.2" // Waiting for order
  | "2.3.3" // Eating at food court
  | "2.3.4" // Just finished eating
  // 2.4 Mall - Transit/Movement
  | "2.4.1" // Walking between stores
  | "2.4.2" // Checking mall directory
  | "2.4.3" // Just arrived at mall
  | "2.4.4" // About to leave mall
  // 2.5 Mall - Digital/Media
  | "2.5.1" // On phone (scrolling or reading)
  | "2.5.2" // On a phone call
  | "2.5.3" // Sending messages
  // 2.6 Mall - Waiting/Paused
  | "2.6.1" // Waiting for a friend
  | "2.6.2" // Sitting on mall bench
  | "2.6.3" // Idle with no clear purpose
  // 3.1 Coffee Shop - Work/Productivity
  | "3.1.1" // Working on a laptop
  | "3.1.2" // Taking a work call
  | "3.1.3" // Responding to work messages
  | "3.1.4" // Reading work documents
  // 3.2 Coffee Shop - Leisure/Relaxation
  | "3.2.1" // Drinking coffee (seated)
  | "3.2.2" // Reading a book
  | "3.2.3" // Reading on her phone
  | "3.2.4" // Journaling
  | "3.2.5" // People-watching
  | "3.2.6" // Sketching / drawing
  // 3.3 Coffee Shop - Waiting/Social
  | "3.3.1" // Waiting for a friend
  | "3.3.2" // Just finished meeting friend
  | "3.3.3" // Early for meeting someone
  // 3.4 Coffee Shop - Ordering/Service
  | "3.4.1" // Waiting for order (at counter)
  | "3.4.2" // Just received order
  | "3.4.3" // Ordering at counter
  | "3.4.4" // Looking at menu
  // 3.5 Coffee Shop - Digital/Media
  | "3.5.1" // On phone (scrolling or reading)
  | "3.5.2" // On a phone call
  | "3.5.3" // Listening to music (headphones visible)
  | "3.5.4" // Sending messages
  // 3.6 Coffee Shop - Break/Idle
  | "3.6.1" // On a short work break
  | "3.6.2" // Smoke break outside cafe
  | "3.6.3" // Idle with no clear purpose
  // 4.1 Transit - Waiting
  | "4.1.1" // Waiting for transport
  | "4.1.2" // Checking transport times
  | "4.1.3" // Sitting at a transit stop
  | "4.1.4" // Standing near a transit stop
  | "4.1.5" // Delayed and waiting
  | "4.1.6" // Missed train/bus (frustrated)
  | "4.1.7" // Killing time (long wait)
  // 4.2 Transit - Arriving/Departing
  | "4.2.1" // Just arrived somewhere
  | "4.2.2" // About to leave
  | "4.2.3" // About to board (transport arriving)
  | "4.2.4" // Just got off transport
  // 4.3 Transit - Digital/Media
  | "4.3.1" // On phone (scrolling or reading)
  | "4.3.2" // On a phone call
  | "4.3.3" // Listening to music (headphones visible)
  | "4.3.4" // Listening to a podcast (headphones visible)
  | "4.3.5" // Sending messages
  // 4.4 Transit - Utility/Help
  | "4.4.1" // Lost tourist (checking map/phone)
  | "4.4.2" // Phone died / looking for help
  | "4.4.3" // Checking directions on phone
  // 4.5 Transit - Idle
  | "4.5.1" // Idle with no clear purpose
  // 5.1 Park - Sitting/Relaxing
  | "5.1.1" // Sitting on a bench
  | "5.1.2" // Sitting in the sun
  | "5.1.3" // Sitting in the shade
  | "5.1.4" // Reading a book
  | "5.1.5" // Reading on her phone
  | "5.1.6" // Journaling
  | "5.1.7" // People-watching
  | "5.1.8" // Sketching / drawing
  | "5.1.9" // Eating lunch
  | "5.1.10" // Drinking coffee
  // 5.2 Park - Walking
  | "5.2.1" // Taking a walk
  | "5.2.2" // Walking briskly
  | "5.2.3" // Wandering without clear destination
  | "5.2.4" // Walking a dog
  | "5.2.5" // Dog pause (dog sniffing/playing)
  | "5.2.6" // At dog park
  // 5.3 Park - Exercise
  | "5.3.1" // Going for a run (pre-run)
  | "5.3.2" // Running
  | "5.3.3" // Stretching (pre/post exercise)
  | "5.3.4" // Cooling down after exercise
  | "5.3.5" // Sitting post-workout
  | "5.3.6" // Drinking water after exercise
  // 5.4 Park - Digital/Media
  | "5.4.1" // On phone (scrolling or reading)
  | "5.4.2" // On a phone call
  | "5.4.3" // Listening to music (headphones visible)
  | "5.4.4" // Listening to a podcast (headphones visible)
  | "5.4.5" // Taking photos
  | "5.4.6" // Doing photography (active/serious)
  // 5.5 Park - Social/Waiting
  | "5.5.1" // Waiting for a friend
  | "5.5.2" // Just finished seeing a friend
  // 5.6 Park - Special Activities
  | "5.6.1" // Feeding birds/ducks
  | "5.6.2" // Getting fresh air
  | "5.6.3" // Idle with no clear purpose
  // 6.1 Gym - Pre-Workout
  | "6.1.1" // Heading to the gym
  | "6.1.2" // Arriving at gym
  | "6.1.3" // Stretching (pre-workout)
  | "6.1.4" // Looking at phone (pre-workout)
  | "6.1.5" // Waiting for equipment
  // 6.2 Gym - Post-Workout
  | "6.2.1" // Leaving the gym
  | "6.2.2" // Cooling down after exercise
  | "6.2.3" // Sitting post-workout
  | "6.2.4" // Drinking water after exercise
  | "6.2.5" // Stretching (post-workout)
  | "6.2.6" // Looking at phone (post-workout)
  // 6.3 Gym - Digital/Media
  | "6.3.1" // On phone (scrolling or reading)
  | "6.3.2" // Listening to music (headphones visible)
  // 7.1 Campus - Between Classes
  | "7.1.1" // Walking between classes
  | "7.1.2" // Heading to class
  | "7.1.3" // Leaving class
  | "7.1.4" // Checking schedule/phone
  | "7.1.5" // Rushing between buildings
  // 7.2 Campus - Studying
  | "7.2.1" // Studying outdoors
  | "7.2.2" // Reading on campus
  | "7.2.3" // Working on laptop
  | "7.2.4" // Taking notes
  // 7.3 Campus - Social/Break
  | "7.3.1" // On a break between classes
  | "7.3.2" // Waiting for a friend
  | "7.3.3" // Just finished seeing a friend
  | "7.3.4" // Eating lunch on campus
  | "7.3.5" // Getting coffee on campus
  // 7.4 Campus - Leisure
  | "7.4.1" // Sitting in campus courtyard
  | "7.4.2" // Walking through campus
  | "7.4.3" // People-watching on campus
  | "7.4.4" // Taking photos on campus
  // 7.5 Campus - Digital/Media
  | "7.5.1" // On phone (scrolling or reading)
  | "7.5.2" // On a phone call
  | "7.5.3" // Listening to music (headphones visible)
  | "7.5.4" // Sending messages
  // 7.6 Campus - Idle
  | "7.6.1"; // Idle with no clear purpose

interface ActivityTexts {
  /** Which positions are valid for this activity */
  validPositions: Position[];
  /** Base observation texts grouped by position */
  texts: Partial<Record<Position, string[]>>;
}

/**
 * Base texts - ONLY observable facts
 */
export const BASE_TEXTS: Record<ActivityId, ActivityTexts> = {
  // ============================================================================
  // 1.1 HIGH STREET - SHOPPING DISTRICT
  // ============================================================================

  "1.1.1": {
    // Shopping for something specific
    validPositions: ["standing", "walking_slow", "walking_moderate"],
    texts: {
      standing: [
        "You see a woman looking at a shop display.",
        "A woman is looking at something in a store window.",
        "You notice a woman stopped outside a shop.",
        "There's a woman paused at a storefront.",
        "A woman is standing near a shop entrance.",
      ],
      walking_slow: [
        "You see a woman walking between shops.",
        "A woman is walking slowly down the street, glancing at shops.",
        "You notice a woman going from shop to shop.",
        "There's a woman walking along, looking at the stores.",
        "A woman is walking past the shops.",
      ],
      walking_moderate: [
        "You see a woman walking past the shops.",
        "A woman is making her way down the high street.",
        "You notice a woman walking through the shopping area.",
        "There's a woman walking down the street.",
        "A woman is walking along, glancing at shop windows.",
      ],
    },
  },

  "1.1.2": {
    // Browsing shops
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing outside a shop.",
        "A woman is looking into a store window.",
        "You notice a woman stopped by a shop display.",
        "There's a woman standing near a shop.",
        "A woman has paused to look at a storefront.",
      ],
      walking_slow: [
        "You see a woman walking past the shops.",
        "A woman is walking slowly past the stores.",
        "You notice a woman walking down the high street.",
        "There's a woman going from shop to shop.",
        "A woman is walking along the storefronts.",
        "You see a woman going from window to window.",
      ],
    },
  },

  "1.1.3": {
    // Window shopping
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman stopped in front of a shop window.",
        "A woman is looking at a window display.",
        "You notice a woman standing by a storefront.",
        "There's a woman looking into a shop window.",
        "A woman has paused at a display.",
        "You see a woman looking at a shop window.",
      ],
      walking_slow: [
        "You see a woman walking past the shop windows.",
        "A woman is walking slowly, glancing at displays.",
        "You notice a woman walking along the storefronts.",
        "There's a woman walking past the shops.",
        "A woman is walking along, looking at the windows.",
      ],
    },
  },

  "1.1.4": {
    // Carrying shopping bags
    validPositions: ["standing", "walking_slow", "walking_moderate", "walking_brisk"],
    texts: {
      standing: [
        "You see a woman with shopping bags, standing on the street.",
        "A woman with bags has stopped for a moment.",
        "You notice a woman with shopping bags near a bench.",
        "There's a woman with bags, paused on the street.",
        "A woman is resting with her shopping bags.",
        "You see a woman adjusting her grip on her bags.",
      ],
      walking_slow: [
        "You see a woman with shopping bags, walking slowly.",
        "A woman with bags is walking down the street.",
        "You notice a woman with several bags.",
        "There's a woman walking along with shopping bags.",
        "A woman is carrying bags from a few different stores.",
        "You notice a woman loaded up with shopping bags.",
      ],
      walking_moderate: [
        "You see a woman with shopping bags.",
        "A woman carrying several bags is walking by.",
        "You notice a woman with bags from some shops.",
        "There's a woman walking with a few shopping bags.",
        "A woman with branded bags is walking along.",
        "You see a woman carrying a handful of bags.",
      ],
      walking_brisk: [
        "You see a woman with shopping bags, walking quickly.",
        "A woman with bags is walking at a brisk pace.",
        "You notice a woman with bags, walking fast.",
        "There's a woman walking quickly with shopping bags.",
        "A woman is hurrying along with her shopping.",
      ],
    },
  },

  "1.1.5": {
    // Looking for a gift
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman looking carefully at a shop window.",
        "A woman is looking at something in a display.",
        "You notice a woman studying items through a window.",
        "There's a woman looking into a shop.",
        "A woman is standing at a window, looking at things.",
      ],
      walking_slow: [
        "You see a woman going from shop to shop.",
        "A woman is walking between stores.",
        "You notice a woman looking at different shops.",
        "There's a woman checking out different shops.",
        "A woman is walking along, looking at the stores.",
      ],
    },
  },

  "1.1.6": {
    // Comparing items
    validPositions: ["standing"],
    texts: {
      standing: [
        "You see a woman holding something, looking at a display.",
        "A woman is comparing items in her hands.",
        "You notice a woman standing by a shop, looking at something.",
        "There's a woman looking at items at a storefront.",
        "A woman is studying something in her hands.",
        "You see a woman holding up something to look at.",
      ],
    },
  },

  "1.1.7": {
    // Just finished shopping
    validPositions: ["standing", "walking_slow", "walking_moderate"],
    texts: {
      standing: [
        "You see a woman with bags, looking around.",
        "A woman with shopping bags is standing on the street.",
        "You notice a woman with bags, paused on the street.",
        "There's a woman with bags standing near the shops.",
      ],
      walking_slow: [
        "You see a woman with bags, walking slowly.",
        "A woman carrying shopping bags is walking along.",
        "You notice a woman with bags.",
        "There's a woman walking slowly with bags.",
        "A woman with shopping bags is walking along.",
      ],
      walking_moderate: [
        "You see a woman with bags.",
        "A woman with shopping bags is walking.",
        "You notice a woman with bags.",
        "There's a woman carrying bags.",
      ],
    },
  },

  "1.1.8": {
    // Looking at shop windows
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman looking at a shop window.",
        "A woman is looking into a storefront.",
        "You notice a woman stopped at a window display.",
        "There's a woman looking at a shop window.",
        "A woman has paused by a display.",
      ],
      walking_slow: [
        "You see a woman walking past the shops, looking at windows.",
        "A woman is walking along, glancing at displays.",
        "You notice a woman walking past the storefronts.",
        "There's a woman walking and looking at shop windows.",
        "A woman is looking at the shop windows as she walks.",
      ],
    },
  },

  // ============================================================================
  // 1.2 HIGH STREET - COMMUTE/WORK
  // Note: For these, we describe what we SEE (clothes, speed, objects)
  // The AI knows the internal context, but user only sees observable facts
  // ============================================================================

  "1.2.1": {
    // Going to work
    validPositions: ["walking_brisk", "walking_moderate", "walking_fast"],
    texts: {
      walking_brisk: [
        "You see a woman in smart clothes walking quickly.",
        "A woman in work clothes is walking briskly.",
        "You notice a woman walking quickly.",
        "There's a woman walking at a brisk pace with a coffee.",
        "A woman is walking at a quick pace.",
      ],
      walking_moderate: [
        "You see a woman in work clothes walking down the street.",
        "A woman is walking along in smart clothes.",
        "You notice a woman in office clothes.",
        "There's a woman walking along in professional attire.",
      ],
      walking_fast: [
        "You see a woman walking very quickly.",
        "A woman in work clothes is walking fast.",
        "You notice a woman moving fast.",
        "There's a woman rushing down the street.",
      ],
    },
  },

  "1.2.2": {
    // Leaving work
    validPositions: ["walking_moderate", "walking_slow", "walking_brisk"],
    texts: {
      walking_moderate: [
        "You see a woman in work clothes walking along.",
        "A woman in office clothes is walking down the street.",
        "You notice a woman in smart clothes.",
        "There's a woman walking at an easy pace.",
      ],
      walking_slow: [
        "You see a woman in work clothes walking slowly.",
        "A woman in office attire is walking along.",
        "You notice a woman in work clothes, walking slowly.",
        "There's a woman in smart clothes, walking slowly.",
      ],
      walking_brisk: [
        "You see a woman in work clothes walking quickly.",
        "A woman in office clothes is walking briskly.",
        "You notice a woman in smart clothes, walking at a quick pace.",
      ],
    },
  },

  "1.2.3": {
    // On a short work break
    validPositions: ["standing", "walking_slow", "seated"],
    texts: {
      standing: [
        "You see a woman in work clothes standing outside a building.",
        "A woman in office clothes is standing on the street.",
        "You notice a woman in smart clothes standing by a building.",
        "There's a woman in professional attire outside.",
        "A woman is standing near an office entrance.",
        "You see a woman in a blazer standing outside.",
        "There's a woman in business clothes standing in the sun.",
        "A woman in smart clothes is standing by the door.",
      ],
      walking_slow: [
        "You see a woman in work clothes walking slowly.",
        "A woman in office clothes is walking nearby.",
        "You notice a woman in smart clothes walking slowly.",
        "There's a woman in professional attire strolling.",
        "A woman in work clothes is walking around.",
      ],
      seated: [
        "You see a woman in work clothes sitting on a bench.",
        "A woman in office clothes is sitting outside.",
        "You notice a woman in smart clothes sitting down.",
        "There's a woman in professional attire on a bench.",
        "A woman in business clothes is seated outside.",
      ],
    },
  },

  "1.2.4": {
    // Getting coffee for work
    validPositions: ["walking_brisk", "walking_moderate", "standing"],
    texts: {
      walking_brisk: [
        "You see a woman walking quickly toward a coffee shop.",
        "A woman is walking briskly with a coffee cup.",
        "You notice a woman walking quickly with a coffee.",
        "There's a woman walking fast, coffee in hand.",
      ],
      walking_moderate: [
        "You see a woman walking toward a coffee shop.",
        "A woman is walking with a coffee cup.",
        "You notice a woman with a coffee.",
      ],
      standing: [
        "You see a woman waiting at a coffee shop.",
        "A woman is waiting for her coffee order.",
        "You notice a woman picking up a coffee.",
      ],
    },
  },

  "1.2.5": {
    // Stepping outside from work
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman in work clothes standing outside.",
        "A woman in office clothes is standing in the sun.",
        "You notice a woman in smart clothes outside a building.",
        "There's a woman in work clothes standing by an entrance.",
        "A woman is standing outside an office building.",
      ],
      walking_slow: [
        "You see a woman in work clothes walking slowly outside.",
        "A woman in office clothes is walking nearby.",
        "You notice a woman in smart clothes taking a slow walk.",
      ],
    },
  },

  "1.2.6": {
    // Running a work errand
    validPositions: ["walking_brisk", "walking_moderate", "walking_fast"],
    texts: {
      walking_brisk: [
        "You see a woman in work clothes walking quickly.",
        "A woman in office clothes is walking briskly with some papers.",
        "You notice a woman walking fast, carrying something.",
        "There's a woman in smart clothes walking at a quick pace.",
      ],
      walking_moderate: [
        "You see a woman in work clothes walking down the street.",
        "A woman is walking along carrying a folder.",
        "You notice a woman in office clothes walking.",
      ],
      walking_fast: [
        "You see a woman rushing along.",
        "A woman is walking very fast.",
        "You notice a woman moving quickly.",
      ],
    },
  },

  "1.2.7": {
    // Heading to a meeting
    validPositions: ["walking_brisk", "walking_fast", "walking_moderate"],
    texts: {
      walking_brisk: [
        "You see a woman in smart clothes walking quickly.",
        "A woman in business attire is walking briskly.",
        "You notice a woman in formal clothes walking at a quick pace.",
        "There's a woman in office clothes walking quickly.",
      ],
      walking_fast: [
        "You see a woman in smart clothes walking very fast.",
        "A woman in work clothes is almost jogging.",
        "You notice a woman moving fast in business attire.",
      ],
      walking_moderate: [
        "You see a woman in business clothes walking.",
        "A woman in smart attire is walking along.",
        "You notice a woman in office clothes.",
      ],
    },
  },

  "1.2.8": {
    // Leaving a meeting
    validPositions: ["walking_moderate", "walking_slow", "walking_brisk"],
    texts: {
      walking_moderate: [
        "You see a woman in business attire walking along.",
        "A woman in smart clothes is walking.",
        "You notice a woman in office clothes walking at an easy pace.",
      ],
      walking_slow: [
        "You see a woman in business clothes walking slowly.",
        "A woman in office attire is walking along.",
        "You notice a woman in smart clothes walking slowly.",
      ],
      walking_brisk: [
        "You see a woman in business attire walking quickly.",
        "A woman in smart clothes is walking briskly.",
        "You notice a woman in office clothes walking fast.",
      ],
    },
  },

  "1.2.9": {
    // On lunch break
    validPositions: ["walking_slow", "standing", "seated", "walking_moderate"],
    texts: {
      walking_slow: [
        "You see a woman in work clothes walking slowly.",
        "A woman in office clothes is walking along.",
        "You notice a woman in smart clothes walking.",
        "There's a woman walking slowly.",
      ],
      standing: [
        "You see a woman in work clothes standing and checking her phone.",
        "A woman in office clothes is standing around.",
        "You notice a woman standing in the sun.",
      ],
      seated: [
        "You see a woman sitting on a bench with food.",
        "A woman is eating lunch on a bench.",
        "You notice a woman seated with some food.",
      ],
      walking_moderate: [
        "You see a woman in work clothes walking.",
        "A woman in office clothes is walking around.",
        "You notice a woman walking around.",
      ],
    },
  },

  "1.2.10": {
    // Getting lunch to-go
    validPositions: ["walking_moderate", "walking_brisk", "standing"],
    texts: {
      walking_moderate: [
        "You see a woman walking toward a food place.",
        "A woman is walking along.",
        "You notice a woman walking.",
        "There's a woman walking toward a restaurant.",
      ],
      walking_brisk: [
        "You see a woman walking quickly.",
        "A woman is walking briskly.",
        "You notice a woman walking fast.",
      ],
      standing: [
        "You see a woman waiting at a food counter.",
        "A woman is standing at a food place.",
        "You notice a woman picking up food.",
      ],
    },
  },

  "1.2.11": {
    // Smoke break outside work
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing outside, smoking.",
        "A woman is having a cigarette outside.",
        "You notice a woman smoking outside a building.",
        "There's a woman standing outside, smoking.",
        "A woman is standing and smoking.",
      ],
      walking_slow: [
        "You see a woman walking slowly while smoking.",
        "A woman is pacing slowly with a cigarette.",
      ],
    },
  },

  // ============================================================================
  // 1.3 HIGH STREET - TRANSIT/MOVEMENT
  // ============================================================================

  "1.3.1": {
    // Commuting somewhere
    validPositions: ["walking_moderate", "walking_brisk", "walking_fast"],
    texts: {
      walking_moderate: [
        "You see a woman walking at a steady pace.",
        "A woman is walking along.",
        "You notice a woman walking.",
        "There's a woman walking down the street.",
      ],
      walking_brisk: [
        "You see a woman walking briskly.",
        "A woman is walking quickly.",
        "You notice a woman walking at a brisk pace.",
        "There's a woman moving quickly along the street.",
      ],
      walking_fast: [
        "You see a woman walking very fast.",
        "A woman is almost jogging down the street.",
        "You notice a woman rushing somewhere.",
      ],
    },
  },

  "1.3.2": {
    // Walking between places
    validPositions: ["walking_moderate", "walking_slow", "walking_brisk"],
    texts: {
      walking_moderate: [
        "You see a woman walking down the street.",
        "A woman is walking along.",
        "You notice a woman walking.",
        "There's a woman walking at a normal pace.",
        "A woman is walking down the street.",
      ],
      walking_slow: [
        "You see a woman walking slowly.",
        "A woman is walking along, not in any rush.",
        "You notice a woman walking slowly.",
      ],
      walking_brisk: [
        "You see a woman walking quickly.",
        "A woman is walking briskly.",
        "You notice a woman moving at a quick pace.",
      ],
    },
  },

  "1.3.3": {
    // Just arrived somewhere
    validPositions: ["standing", "walking_slow", "walking_moderate"],
    texts: {
      standing: [
        "You see a woman standing and looking around.",
        "A woman is standing, looking at her surroundings.",
        "You notice a woman looking around.",
        "There's a woman standing and looking around.",
      ],
      walking_slow: [
        "You see a woman walking slowly, looking around.",
        "A woman is taking in her surroundings.",
        "You notice a woman walking slowly, looking around the area.",
      ],
      walking_moderate: [
        "You see a woman walking, looking around.",
        "A woman is walking along, looking around.",
      ],
    },
  },

  "1.3.4": {
    // About to leave
    validPositions: ["walking_moderate", "standing", "walking_brisk"],
    texts: {
      walking_moderate: [
        "You see a woman walking.",
        "A woman is making her way down the street.",
        "You notice a woman heading off.",
      ],
      standing: [
        "You see a woman standing, gathering her things.",
        "A woman is getting ready to go.",
        "You notice a woman about to leave.",
      ],
      walking_brisk: [
        "You see a woman walking quickly.",
        "A woman is heading off quickly.",
        "You notice a woman walking briskly.",
      ],
    },
  },

  "1.3.5": {
    // Walking briskly
    validPositions: ["walking_brisk", "walking_fast"],
    texts: {
      walking_brisk: [
        "You see a woman walking briskly down the street.",
        "A woman is walking at a quick pace.",
        "You notice a woman walking briskly.",
        "There's a woman walking at a quick pace.",
        "A woman is moving along briskly.",
      ],
      walking_fast: [
        "You see a woman walking very fast.",
        "A woman is almost jogging down the street.",
        "You notice a woman in a hurry.",
        "There's a woman rushing somewhere.",
      ],
    },
  },

  // ============================================================================
  // 1.4 HIGH STREET - LEISURE/EXPLORING
  // ============================================================================

  "1.4.1": {
    // Taking a walk
    validPositions: ["walking_slow", "walking_moderate"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly.",
        "A woman is walking along the street.",
        "You notice a woman out for a walk.",
        "There's a woman walking slowly.",
        "A woman is walking slowly.",
      ],
      walking_moderate: [
        "You see a woman out for a walk.",
        "A woman is walking along.",
        "You notice a woman walking.",
        "There's a woman walking at an easy pace.",
      ],
    },
  },

  "1.4.2": {
    // Getting fresh air
    validPositions: ["walking_slow", "standing", "walking_moderate"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly.",
        "A woman is walking slowly.",
        "You notice a woman walking.",
        "There's a woman out walking.",
      ],
      standing: [
        "You see a woman standing outside.",
        "A woman is standing still.",
        "You notice a woman standing outside.",
      ],
      walking_moderate: [
        "You see a woman walking.",
        "A woman is out walking.",
      ],
    },
  },

  "1.4.3": {
    // People-watching
    validPositions: ["standing", "seated", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing, watching people go by.",
        "A woman is watching people from where she stands.",
        "You notice a woman watching the crowds.",
        "There's a woman standing and watching people.",
      ],
      seated: [
        "You see a woman sitting, watching people.",
        "A woman is seated on a bench, watching people.",
        "You notice a woman sitting and watching the crowds.",
        "There's a woman watching people from a bench.",
      ],
      walking_slow: [
        "You see a woman walking slowly, watching people around her.",
        "A woman is walking and watching the crowds.",
      ],
    },
  },

  "1.4.4": {
    // Exploring the area
    validPositions: ["walking_slow", "walking_moderate", "standing"],
    texts: {
      walking_slow: [
        "You see a woman walking around, looking at things.",
        "A woman is walking around, taking in the sights.",
        "You notice a woman looking around as she walks.",
        "There's a woman walking slowly, looking around.",
      ],
      walking_moderate: [
        "You see a woman walking around.",
        "A woman is checking out the area.",
        "You notice a woman walking and looking around.",
      ],
      standing: [
        "You see a woman standing, looking around.",
        "A woman is taking in the area.",
        "You notice a woman standing and looking around.",
      ],
    },
  },

  "1.4.5": {
    // Wandering without a destination
    validPositions: ["walking_slow", "walking_moderate", "standing"],
    texts: {
      walking_slow: [
        "You see a woman wandering along.",
        "A woman is walking slowly.",
        "You notice a woman walking around.",
        "There's a woman wandering down the street.",
        "A woman is wandering around.",
      ],
      walking_moderate: [
        "You see a woman walking around.",
        "A woman is wandering along the street.",
      ],
      standing: [
        "You see a woman standing around.",
        "A woman is standing, looking around.",
      ],
    },
  },

  "1.4.6": {
    // Looking at buildings
    validPositions: ["standing", "walking_slow", "walking_moderate"],
    texts: {
      standing: [
        "You see a woman looking up at a building.",
        "A woman is looking at the buildings.",
        "You notice a woman looking at a building.",
        "There's a woman looking at the buildings around her.",
      ],
      walking_slow: [
        "You see a woman walking slowly, looking at buildings.",
        "A woman is walking and looking at the buildings.",
        "You notice a woman looking at the buildings as she walks.",
      ],
      walking_moderate: [
        "You see a woman walking and glancing at buildings.",
        "A woman is looking at the buildings as she walks.",
      ],
    },
  },

  "1.4.7": {
    // Taking photos
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman taking a photo with her phone.",
        "A woman is taking a photo.",
        "You notice a woman snapping a picture.",
        "There's a woman taking photos.",
        "A woman is standing and taking a picture.",
      ],
      walking_slow: [
        "You see a woman walking slowly, taking photos.",
        "A woman is walking and snapping pictures.",
        "You notice a woman taking photos as she walks.",
      ],
    },
  },

  "1.4.8": {
    // Checking a map
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman looking at her phone.",
        "A woman is looking at directions on her phone.",
        "You notice a woman looking at a map.",
        "There's a woman checking her phone.",
        "A woman is standing, looking at a map.",
      ],
      walking_slow: [
        "You see a woman walking slowly, looking at her phone.",
        "A woman is walking and looking at her phone.",
        "You notice a woman following directions on her phone.",
      ],
    },
  },

  "1.4.9": {
    // Standing near a landmark
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing near a landmark.",
        "A woman is standing by a notable building.",
        "You notice a woman near a landmark.",
        "There's a woman standing by a famous spot.",
      ],
      walking_slow: [
        "You see a woman walking slowly near a landmark.",
        "A woman is walking past a notable spot.",
      ],
    },
  },

  "1.4.10": {
    // Watching street performer
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman watching a street performer.",
        "A woman is standing and watching a busker.",
        "You notice a woman watching a street performance.",
        "There's a woman watching a musician.",
        "A woman is standing in a crowd watching a performer.",
      ],
      seated: [
        "You see a woman sitting and watching a street performer.",
        "A woman is seated, watching a performance.",
      ],
    },
  },

  "1.4.11": {
    // Doing photography (active)
    validPositions: ["standing", "walking_slow", "walking_moderate"],
    texts: {
      standing: [
        "You see a woman with a camera, taking photos.",
        "A woman is taking photos with a real camera.",
        "You notice a woman with a camera.",
        "There's a woman with a camera, taking a shot.",
      ],
      walking_slow: [
        "You see a woman with a camera, walking and looking around.",
        "A woman is walking slowly, camera in hand.",
        "You notice a woman with a camera.",
      ],
      walking_moderate: [
        "You see a woman walking with a camera.",
        "A woman is moving around with her camera.",
      ],
    },
  },

  // ============================================================================
  // 1.5 HIGH STREET - WAITING/PAUSED
  // Note: We can't know WHO or WHAT she's waiting for. Just that she's waiting.
  // ============================================================================

  "1.5.1": {
    // Waiting for a friend
    validPositions: ["standing", "seated", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing, looking around.",
        "A woman is waiting, checking her phone.",
        "You notice a woman standing around.",
        "There's a woman waiting for someone.",
        "A woman is standing and looking around.",
      ],
      seated: [
        "You see a woman sitting on a bench, waiting.",
        "A woman is seated, looking around.",
        "You notice a woman sitting and waiting.",
      ],
      walking_slow: [
        "You see a woman pacing slowly.",
        "A woman is walking around slowly.",
      ],
    },
  },

  "1.5.2": {
    // Waiting for an appointment
    validPositions: ["standing", "seated", "walking_slow"],
    texts: {
      standing: [
        "You see a woman waiting outside a building.",
        "A woman is standing near a building.",
        "You notice a woman waiting outside.",
        "There's a woman checking her watch.",
      ],
      seated: [
        "You see a woman sitting and waiting.",
        "A woman is seated, checking her phone.",
      ],
      walking_slow: [
        "You see a woman pacing slowly.",
        "A woman is walking around slowly, waiting.",
      ],
    },
  },

  "1.5.3": {
    // Killing time before something
    validPositions: ["walking_slow", "standing", "seated"],
    texts: {
      walking_slow: [
        "You see a woman walking around slowly.",
        "A woman is walking around.",
        "You notice a woman walking around.",
        "There's a woman walking around.",
      ],
      standing: [
        "You see a woman standing around.",
        "A woman is waiting around.",
        "You notice a woman standing around.",
      ],
      seated: [
        "You see a woman sitting on a bench.",
        "A woman is seated, on her phone.",
        "You notice a woman sitting and waiting.",
      ],
    },
  },

  "1.5.4": {
    // Early for something
    validPositions: ["standing", "seated", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing around.",
        "A woman is standing nearby.",
        "You notice a woman waiting around.",
        "There's a woman standing and looking around.",
      ],
      seated: [
        "You see a woman sitting on a bench.",
        "A woman is seated, waiting.",
      ],
      walking_slow: [
        "You see a woman walking slowly.",
        "A woman is walking around slowly.",
      ],
    },
  },

  "1.5.5": {
    // Idle with no clear purpose
    validPositions: ["standing", "seated", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing around.",
        "A woman is standing around.",
        "You notice a woman standing around.",
        "There's a woman standing with nothing to do.",
      ],
      seated: [
        "You see a woman sitting on a bench.",
        "A woman is seated.",
        "You notice a woman sitting on a bench.",
      ],
      walking_slow: [
        "You see a woman wandering around.",
        "A woman is walking slowly.",
      ],
    },
  },

  // ============================================================================
  // 1.6 HIGH STREET - FOOD/DRINK
  // ============================================================================

  "1.6.1": {
    // Drinking a takeaway drink
    validPositions: ["walking_slow", "walking_moderate", "standing"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly with a coffee.",
        "A woman is walking along with a takeaway cup.",
        "You notice a woman with a drink.",
        "There's a woman sipping her coffee as she walks.",
      ],
      walking_moderate: [
        "You see a woman walking with a coffee.",
        "A woman is walking with a takeaway coffee.",
        "You notice a woman with a drink.",
      ],
      standing: [
        "You see a woman standing with her coffee.",
        "A woman is standing with a takeaway cup.",
        "You notice a woman drinking her coffee.",
      ],
    },
  },

  "1.6.2": {
    // Eating while walking
    validPositions: ["walking_slow", "walking_moderate"],
    texts: {
      walking_slow: [
        "You see a woman eating while walking slowly.",
        "A woman is walking and eating.",
        "You notice a woman snacking as she walks.",
        "There's a woman eating on the go.",
      ],
      walking_moderate: [
        "You see a woman eating while she walks.",
        "A woman is walking and eating.",
        "You notice a woman eating while walking.",
      ],
    },
  },

  "1.6.3": {
    // Eating on a bench
    validPositions: ["seated"],
    texts: {
      seated: [
        "You see a woman eating on a bench.",
        "A woman is seated on a bench, eating.",
        "You notice a woman eating on a bench.",
        "There's a woman eating her lunch outside.",
        "A woman is sitting and eating.",
        "You see a woman eating on a bench.",
      ],
    },
  },

  // ============================================================================
  // 1.7 HIGH STREET - DIGITAL/MEDIA
  // ============================================================================

  "1.7.1": {
    // On a phone call
    validPositions: ["walking_slow", "standing", "walking_moderate"],
    texts: {
      walking_slow: [
        "You see a woman on a phone call, walking slowly.",
        "A woman is talking on her phone as she walks.",
        "You notice a woman on her phone.",
        "There's a woman on a call, pacing slowly.",
      ],
      standing: [
        "You see a woman standing and talking on her phone.",
        "A woman is on a phone call.",
        "You notice a woman having a phone conversation.",
        "There's a woman standing, on a phone call.",
      ],
      walking_moderate: [
        "You see a woman walking and talking on her phone.",
        "A woman is on a call while walking.",
      ],
    },
  },

  "1.7.2": {
    // Sending messages
    validPositions: ["standing", "walking_slow", "seated"],
    texts: {
      standing: [
        "You see a woman standing, typing on her phone.",
        "A woman is texting.",
        "You notice a woman on her phone.",
        "There's a woman typing on her phone.",
      ],
      walking_slow: [
        "You see a woman walking slowly, on her phone.",
        "A woman is looking at her phone while she walks.",
        "You notice a woman texting as she walks.",
      ],
      seated: [
        "You see a woman sitting and on her phone.",
        "A woman is seated, on her phone.",
        "You notice a woman on a bench, on her phone.",
      ],
    },
  },

  "1.7.3": {
    // On phone (scrolling or reading)
    validPositions: ["walking_slow", "standing", "seated"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly, looking at her phone.",
        "A woman is scrolling through her phone as she walks.",
        "You notice a woman on her phone.",
        "There's a woman walking and looking at her phone.",
      ],
      standing: [
        "You see a woman standing, scrolling on her phone.",
        "A woman is looking at her phone.",
        "You notice a woman on her phone.",
        "There's a woman standing and scrolling.",
      ],
      seated: [
        "You see a woman sitting and looking at her phone.",
        "A woman is seated, scrolling through her phone.",
        "You notice a woman on a bench, on her phone.",
      ],
    },
  },

  "1.7.4": {
    // Listening to music (headphones visible)
    validPositions: ["walking_moderate", "walking_brisk", "walking_slow"],
    texts: {
      walking_moderate: [
        "You see a woman walking with headphones on.",
        "A woman with headphones is walking down the street.",
        "You notice a woman with headphones.",
        "There's a woman with headphones, walking along.",
      ],
      walking_brisk: [
        "You see a woman walking briskly with headphones.",
        "A woman with headphones is walking quickly.",
        "You notice a woman with headphones, walking fast.",
      ],
      walking_slow: [
        "You see a woman walking slowly with headphones on.",
        "A woman is walking slowly with headphones.",
        "You notice a woman with headphones.",
      ],
    },
  },

  "1.7.5": {
    // Listening to a podcast (headphones visible)
    validPositions: ["walking_moderate", "walking_slow", "walking_brisk"],
    texts: {
      walking_moderate: [
        "You see a woman walking with headphones.",
        "A woman with headphones is walking at a steady pace.",
        "You notice a woman with headphones as she walks.",
        "There's a woman with headphones.",
      ],
      walking_slow: [
        "You see a woman walking slowly with headphones.",
        "A woman is walking with headphones.",
        "You notice a woman with headphones, walking slowly.",
      ],
      walking_brisk: [
        "You see a woman walking briskly, headphones on.",
        "A woman with headphones is walking at a quick pace.",
      ],
    },
  },

  "1.7.6": {
    // Taking a voice note
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman talking into her phone.",
        "A woman is speaking into her phone.",
        "You notice a woman recording something on her phone.",
        "There's a woman leaving a voice message.",
      ],
      walking_slow: [
        "You see a woman walking slowly, talking into her phone.",
        "A woman is talking into her phone as she walks.",
        "You notice a woman talking into her phone while walking.",
      ],
    },
  },

  // ============================================================================
  // 1.8 HIGH STREET - PET ACTIVITIES
  // ============================================================================

  "1.8.1": {
    // Walking a dog
    validPositions: ["walking_slow", "walking_moderate"],
    texts: {
      walking_slow: [
        "You see a woman walking a dog.",
        "A woman is out with her dog.",
        "You notice a woman walking a dog.",
        "There's a woman with a dog.",
        "A woman is walking along with her dog.",
      ],
      walking_moderate: [
        "You see a woman walking a dog.",
        "A woman with a dog is walking down the street.",
        "You notice a woman and her dog.",
      ],
    },
  },

  "1.8.2": {
    // Dog pause (dog sniffing/paused)
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman stopped while her dog sniffs something.",
        "A woman is waiting while her dog sniffs around.",
        "You notice a woman paused, her dog is sniffing around.",
        "There's a woman standing while her dog sniffs.",
        "A woman with a dog has stopped.",
        "You notice a woman letting her dog explore.",
        "There's a woman waiting for her dog to finish sniffing.",
      ],
      walking_slow: [
        "You see a woman walking slowly while her dog sniffs around.",
        "A woman is being led by her sniffing dog.",
        "You notice a woman following her curious dog.",
        "There's a woman walking slowly as her dog investigates.",
        "A woman is letting her dog set the pace.",
      ],
    },
  },

  // ============================================================================
  // 1.9 HIGH STREET - MAINTENANCE/UTILITY
  // ============================================================================

  "1.9.1": {
    // Fixing something (bag, shoe, bike)
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman stopping to fix something.",
        "A woman is adjusting something with her bag.",
        "You notice a woman fixing her shoe or bag.",
        "There's a woman stopping to sort something out.",
        "A woman is standing and fixing something.",
      ],
      seated: [
        "You see a woman sitting down to fix something.",
        "A woman is seated, dealing with her bag or shoe.",
        "You notice a woman sitting and fixing something.",
      ],
    },
  },

  "1.9.2": {
    // Adjusting clothes/accessories
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman adjusting her clothes.",
        "A woman is fixing her jacket or scarf.",
        "You notice a woman adjusting something she's wearing.",
        "There's a woman straightening her outfit.",
      ],
      walking_slow: [
        "You see a woman walking slowly, adjusting her clothes.",
        "A woman is walking and fixing something with her outfit.",
      ],
    },
  },

  "1.9.3": {
    // Dealing with weather
    validPositions: ["standing", "walking_slow", "walking_moderate"],
    texts: {
      standing: [
        "You see a woman putting on or taking off a jacket.",
        "A woman is dealing with an umbrella.",
        "You notice a woman adjusting for the weather.",
        "There's a woman putting on a coat or scarf.",
      ],
      walking_slow: [
        "You see a woman walking slowly, putting on a jacket.",
        "A woman is walking and dealing with an umbrella.",
        "You notice a woman adjusting her clothes.",
      ],
      walking_moderate: [
        "You see a woman walking, trying to put on her jacket.",
        "A woman is walking and managing her umbrella.",
      ],
    },
  },

  "1.9.4": {
    // Phone died / looking for help
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman looking at her phone, looking puzzled.",
        "A woman looks lost.",
        "You notice a woman looking around.",
        "There's a woman looking confused at her phone.",
        "A woman is standing, looking around uncertainly.",
        "You notice a woman tapping her phone with a frown.",
        "There's a woman looking at her dead phone.",
        "A woman seems unsure of where to go.",
      ],
      walking_slow: [
        "You see a woman walking slowly, looking around.",
        "A woman seems to be looking for something.",
        "You notice a woman walking uncertainly.",
        "There's a woman looking around as if lost.",
        "A woman is glancing around, looking unsure.",
      ],
    },
  },

  "1.9.5": {
    // Lost / checking directions on phone
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman looking at directions on her phone.",
        "A woman is looking at her phone and then around.",
        "You notice a woman looking at a map on her phone.",
        "There's a woman standing, looking at her phone.",
        "A woman seems to be figuring out where to go.",
      ],
      walking_slow: [
        "You see a woman walking slowly, looking at her phone.",
        "A woman is walking and looking at her phone.",
        "You notice a woman navigating with her phone.",
      ],
    },
  },
  // ============================================================================
  // 2.1 MALL - CUSTOMER BROWSING
  // ============================================================================

  "2.1.1": {
    // Shopping for something specific
    validPositions: ["walking_slow", "standing", "walking_moderate"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly past the displays.",
        "A woman is moving slowly along the shopfronts inside the mall.",
      ],
      standing: [
        "You see a woman stopped by a store display, looking at items.",
        "A woman is standing near a shelf, scanning products.",
      ],
      walking_moderate: [
        "You see a woman walking through the mall corridor.",
        "A woman is walking between store entrances.",
      ],
    },
  },

  "2.1.2": {
    // Browsing shops
    validPositions: ["walking_slow", "standing", "walking_moderate"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly and glancing into shop windows.",
        "A woman is moving slowly past the storefronts inside the mall.",
      ],
      standing: [
        "You see a woman standing outside a shop, looking in.",
        "A woman is paused at a window display inside the mall.",
      ],
      walking_moderate: [
        "You see a woman walking through the mall, looking at shops.",
        "A woman is walking past store entrances, glancing at displays.",
      ],
    },
  },

  "2.1.3": {
    // Comparing items
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman holding two items and looking between them.",
        "A woman is standing by a shelf, comparing items in her hands.",
      ],
      walking_slow: [
        "You see a woman walking slowly with items in hand.",
        "A woman is moving slowly, looking down at something she picked up.",
      ],
    },
  },

  "2.1.4": {
    // Looking for a gift
    validPositions: ["walking_slow", "standing", "walking_moderate"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly and checking different displays.",
        "A woman is moving slowly past shelves, scanning items.",
      ],
      standing: [
        "You see a woman standing at a display, looking closely at items.",
        "A woman is paused at a shelf, studying products.",
      ],
      walking_moderate: [
        "You see a woman walking between stores, looking around.",
        "A woman is walking through the mall, glancing at displays.",
      ],
    },
  },

  "2.1.5": {
    // Trying on clothes (near fitting room)
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing near fitting rooms with clothes in her arm.",
        "A woman is paused by the fitting room area, holding several items.",
      ],
      walking_slow: [
        "You see a woman walking slowly near the fitting rooms.",
        "A woman is moving slowly with a few clothing items in hand.",
      ],
    },
  },

  "2.1.6": {
    // Carrying shopping bags
    validPositions: ["walking_moderate", "walking_slow", "standing"],
    texts: {
      walking_moderate: [
        "You see a woman walking through the mall with shopping bags.",
        "A woman is walking along with a couple of store bags.",
      ],
      walking_slow: [
        "You see a woman walking slowly with shopping bags.",
        "A woman is moving slowly, holding several bags.",
      ],
      standing: [
        "You see a woman standing with shopping bags at her side.",
        "A woman is paused in the mall, holding a few bags.",
      ],
    },
  },

  "2.1.7": {
    // Just finished shopping
    validPositions: ["walking_moderate", "standing", "walking_slow"],
    texts: {
      walking_moderate: [
        "You see a woman walking away from a store with a new bag.",
        "A woman is walking through the mall with a fresh store bag.",
      ],
      standing: [
        "You see a woman standing with a store bag and a receipt.",
        "A woman is paused near a store entrance with a bag in hand.",
      ],
      walking_slow: [
        "You see a woman walking slowly with a store bag.",
        "A woman is moving slowly, holding a bag from a shop.",
      ],
    },
  },

  "2.1.8": {
    // Picking up an order
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing at a pickup counter with her phone out.",
        "A woman is waiting at a counter, holding a phone in her hand.",
      ],
      walking_slow: [
        "You see a woman walking slowly away from a pickup counter.",
        "A woman is moving slowly with a small bag in hand.",
      ],
    },
  },

  "2.1.9": {
    // Returning an item
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing at a counter with a bag in hand.",
        "A woman is paused at a service desk holding a boxed item.",
      ],
      walking_slow: [
        "You see a woman walking slowly with a store bag in hand.",
        "A woman is moving slowly, holding a small box.",
      ],
    },
  },

  "2.1.10": {
    // Waiting for service (at counter)
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing at a counter, waiting.",
        "A woman is paused at a service counter, looking ahead.",
      ],
      walking_slow: [
        "You see a woman walking slowly near the counter area.",
        "A woman is moving slowly along the service desk.",
      ],
    },
  },

  "2.1.11": {
    // Just received order/purchase
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing with a store bag and a receipt.",
        "A woman is paused at the counter, holding a small purchase.",
      ],
      walking_slow: [
        "You see a woman walking slowly away from the counter with a bag.",
        "A woman is moving slowly, holding a fresh purchase.",
      ],
    },
  },

  "2.1.12": {
    // Asking employee a question
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing near a staff member, gesturing toward a shelf.",
        "A woman is paused by the counter, talking to an employee.",
      ],
      walking_slow: [
        "You see a woman walking slowly with a staff member nearby.",
        "A woman is moving slowly, looking toward the shelves.",
      ],
    },
  },

  "2.1.13": {
    // At checkout / paying
    validPositions: ["standing"],
    texts: {
      standing: [
        "You see a woman at the checkout with a card in hand.",
        "A woman is standing at the register, holding her phone.",
        "You notice a woman at the till with a small stack of items.",
      ],
    },
  },

  "2.1.14": {
    // Comparing prices on phone
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman looking at her phone, then at a price tag.",
        "A woman is standing by a shelf, checking her phone.",
      ],
      walking_slow: [
        "You see a woman walking slowly while looking at her phone.",
        "A woman is moving slowly, glancing between her phone and the shelves.",
      ],
    },
  },
  // ============================================================================
  // 2.2 MALL - EMPLOYEE
  // ============================================================================

  "2.2.1": {
    // Working at counter/register
    validPositions: ["standing"],
    texts: {
      standing: [
        "You see a woman standing behind a counter at a register.",
        "A woman is standing at the till, scanning items.",
        "You notice a woman behind the counter, ready to help.",
      ],
    },
  },

  "2.2.2": {
    // Stocking shelves
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing by shelves, placing items.",
        "A woman is standing near a shelf with merchandise in her hands.",
      ],
      walking_slow: [
        "You see a woman walking slowly with a stack of items.",
        "A woman is moving slowly along the shelves with products.",
      ],
    },
  },

  "2.2.3": {
    // Organizing displays
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing at a display, adjusting items.",
        "A woman is standing by a table display, straightening products.",
      ],
      walking_slow: [
        "You see a woman walking slowly around a display table.",
        "A woman is moving slowly, arranging items on a display.",
      ],
    },
  },

  "2.2.4": {
    // Idle at counter (no customers)
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing behind a counter, waiting.",
        "A woman is standing at the register with no one in front of her.",
      ],
      seated: [
        "You see a woman seated behind the counter.",
        "A woman is sitting on a stool near the register.",
      ],
    },
  },

  "2.2.5": {
    // On break (visible in store area)
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman sitting in a back area with a drink.",
        "A woman is seated near the staff area with a drink.",
      ],
      standing: [
        "You see a woman standing near a staff door, holding a drink.",
        "A woman is standing off to the side, away from the counter.",
      ],
    },
  },

  // ============================================================================
  // 2.3 MALL - FOOD COURT
  // ============================================================================

  "2.3.1": {
    // Ordering food
    validPositions: ["standing"],
    texts: {
      standing: [
        "You see a woman standing at a food counter, looking up at the menu.",
        "A woman is standing at the counter, pointing at the menu board.",
        "You notice a woman ordering at a food stall.",
      ],
    },
  },

  "2.3.2": {
    // Waiting for order
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing near a food counter, waiting.",
        "A woman is standing by the pickup area with a receipt.",
      ],
      seated: [
        "You see a woman seated with a tray, waiting.",
        "A woman is sitting at a table, looking toward the counter.",
      ],
    },
  },

  "2.3.3": {
    // Eating at food court
    validPositions: ["seated"],
    texts: {
      seated: [
        "You see a woman seated at a table with a tray of food.",
        "A woman is sitting at the food court, eating.",
        "You notice a woman eating with a tray in front of her.",
      ],
    },
  },

  "2.3.4": {
    // Just finished eating
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated with an empty tray.",
        "A woman is sitting at a table, pushing her tray away.",
      ],
      standing: [
        "You see a woman standing with an empty tray.",
        "A woman is standing near a table, holding a finished meal tray.",
      ],
    },
  },

  // ============================================================================
  // 2.4 MALL - TRANSIT/MOVEMENT
  // ============================================================================

  "2.4.1": {
    // Walking between stores
    validPositions: ["walking_moderate", "walking_slow"],
    texts: {
      walking_moderate: [
        "You see a woman walking through the mall corridor.",
        "A woman is walking at a steady pace between stores.",
      ],
      walking_slow: [
        "You see a woman walking slowly between storefronts.",
        "A woman is moving slowly along the mall walkway.",
      ],
    },
  },

  "2.4.2": {
    // Checking mall directory
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing at a mall directory map.",
        "A woman is paused in front of a directory screen.",
      ],
      walking_slow: [
        "You see a woman walking slowly toward a directory sign.",
        "A woman is moving slowly, looking at a mall map.",
      ],
    },
  },

  "2.4.3": {
    // Just arrived at mall
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing near the mall entrance, looking around.",
        "A woman is paused just inside the entrance.",
      ],
      walking_slow: [
        "You see a woman walking slowly in from the entrance.",
        "A woman is moving slowly inside the mall, glancing around.",
      ],
    },
  },

  "2.4.4": {
    // About to leave mall
    validPositions: ["walking_moderate", "walking_slow"],
    texts: {
      walking_moderate: [
        "You see a woman walking toward the mall exit with a bag.",
        "A woman is walking at a steady pace toward the doors.",
      ],
      walking_slow: [
        "You see a woman walking slowly toward the exit.",
        "A woman is moving slowly toward the mall doors with a bag.",
      ],
    },
  },

  // ============================================================================
  // 2.5 MALL - DIGITAL/MEDIA
  // ============================================================================

  "2.5.1": {
    // On phone (scrolling or reading)
    validPositions: ["standing", "seated", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing in the mall, scrolling on her phone.",
        "A woman is standing near a store, looking at her phone.",
      ],
      seated: [
        "You see a woman seated on a bench, looking at her phone.",
        "A woman is sitting in the mall, scrolling on her phone.",
      ],
      walking_slow: [
        "You see a woman walking slowly while reading her phone.",
        "A woman is moving slowly through the mall, eyes on her phone.",
      ],
    },
  },

  "2.5.2": {
    // On a phone call
    validPositions: ["walking_slow", "standing", "seated"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly while talking on her phone.",
        "A woman is on a call, moving slowly through the mall.",
      ],
      standing: [
        "You see a woman standing and talking on her phone.",
        "A woman is on a call near the storefronts.",
      ],
      seated: [
        "You see a woman seated on a bench, talking on her phone.",
        "A woman is sitting and speaking into her phone.",
      ],
    },
  },

  "2.5.3": {
    // Sending messages
    validPositions: ["standing", "seated", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing and typing on her phone.",
        "A woman is standing near a store, texting.",
      ],
      seated: [
        "You see a woman seated on a bench, typing on her phone.",
        "A woman is sitting and texting.",
      ],
      walking_slow: [
        "You see a woman walking slowly, typing on her phone.",
        "A woman is moving slowly through the mall, texting.",
      ],
    },
  },

  // ============================================================================
  // 2.6 MALL - WAITING/PAUSED
  // ============================================================================

  "2.6.1": {
    // Waiting for a friend
    validPositions: ["standing", "seated", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing near a storefront, checking her phone.",
        "A woman is standing and looking around the mall.",
      ],
      seated: [
        "You see a woman seated on a bench, looking around.",
        "A woman is sitting in the mall, checking her phone.",
      ],
      walking_slow: [
        "You see a woman walking slowly, glancing around the mall.",
        "A woman is moving slowly while looking toward the shops.",
      ],
    },
  },

  "2.6.2": {
    // Sitting on mall bench
    validPositions: ["seated"],
    texts: {
      seated: [
        "You see a woman seated on a mall bench.",
        "A woman is sitting on a bench, resting.",
        "You notice a woman sitting with a shopping bag beside her.",
      ],
    },
  },

  "2.6.3": {
    // Idle with no clear purpose
    validPositions: ["standing", "walking_slow", "seated"],
    texts: {
      standing: [
        "You see a woman standing in the mall, looking around.",
        "A woman is paused in the corridor with no one nearby.",
      ],
      walking_slow: [
        "You see a woman walking slowly through the mall.",
        "A woman is moving slowly along the walkway.",
      ],
      seated: [
        "You see a woman seated on a bench, waiting.",
        "A woman is sitting and looking around the mall.",
      ],
    },
  },
  // ============================================================================
  // 3.1 COFFEE SHOP - WORK/PRODUCTIVITY
  // ============================================================================

  "3.1.1": {
    // Working on a laptop
    validPositions: ["seated"],
    texts: {
      seated: [
        "You see a woman seated at a table with a laptop open.",
        "A woman is sitting at a cafe table, typing on a laptop.",
        "You notice a woman focused on her laptop at a table.",
      ],
    },
  },

  "3.1.2": {
    // Taking a work call
    validPositions: ["standing", "seated", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing by a table, talking on her phone.",
        "A woman is standing near the counter, on a phone call.",
      ],
      seated: [
        "You see a woman seated with her phone to her ear.",
        "A woman is sitting at a cafe table, on a call.",
      ],
      walking_slow: [
        "You see a woman walking slowly near the cafe entrance, on a call.",
        "A woman is moving slowly while speaking into her phone.",
      ],
    },
  },

  "3.1.3": {
    // Responding to work messages
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated at a table, typing on her phone.",
        "A woman is sitting with a laptop open, tapping at her phone.",
      ],
      standing: [
        "You see a woman standing by a table, typing on her phone.",
        "A woman is standing and tapping out a message.",
      ],
    },
  },

  "3.1.4": {
    // Reading work documents
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated at a table, reading a document.",
        "A woman is sitting with papers spread out in front of her.",
      ],
      standing: [
        "You see a woman standing and reading a few pages.",
        "A woman is standing by a table, scanning a document.",
      ],
    },
  },

  // ============================================================================
  // 3.2 COFFEE SHOP - LEISURE/RELAXATION
  // ============================================================================

  "3.2.1": {
    // Drinking coffee (seated)
    validPositions: ["seated"],
    texts: {
      seated: [
        "You see a woman seated with a coffee cup in front of her.",
        "A woman is sitting at a table, sipping a coffee.",
        "You notice a woman sitting with a mug in her hands.",
      ],
    },
  },

  "3.2.2": {
    // Reading a book
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated at a table, reading a book.",
        "A woman is sitting with a book open in front of her.",
      ],
      standing: [
        "You see a woman standing with an open book in her hands.",
        "A woman is standing by a window, reading a book.",
      ],
    },
  },

  "3.2.3": {
    // Reading on her phone
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, reading on her phone.",
        "A woman is sitting at a table, scrolling through her phone.",
      ],
      standing: [
        "You see a woman standing and reading her phone.",
        "A woman is standing near the counter, looking at her phone.",
      ],
    },
  },

  "3.2.4": {
    // Journaling
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, writing in a notebook.",
        "A woman is sitting at a table, journaling in a notebook.",
      ],
      standing: [
        "You see a woman standing and writing in a small notebook.",
        "A woman is standing by a table, jotting notes down.",
      ],
    },
  },

  "3.2.5": {
    // People-watching
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, looking around the cafe.",
        "A woman is sitting by a window, watching the room.",
      ],
      standing: [
        "You see a woman standing near the window, looking out.",
        "A woman is standing and scanning the cafe.",
      ],
    },
  },

  "3.2.6": {
    // Sketching / drawing
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, sketching in a notebook.",
        "A woman is sitting at a table, drawing in a sketchbook.",
      ],
      standing: [
        "You see a woman standing and sketching on a small pad.",
        "A woman is standing by a table, drawing in a notebook.",
      ],
    },
  },

  // ============================================================================
  // 3.3 COFFEE SHOP - WAITING/SOCIAL
  // ============================================================================

  "3.3.1": {
    // Waiting for a friend
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated at a table, looking toward the door.",
        "A woman is sitting with a coffee, glancing around the cafe.",
      ],
      standing: [
        "You see a woman standing near the entrance, looking around.",
        "A woman is standing by a table, checking her phone.",
      ],
    },
  },

  "3.3.2": {
    // Just finished meeting friend
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, closing a laptop and gathering her things.",
        "A woman is sitting at a table, pushing her cup aside.",
      ],
      standing: [
        "You see a woman standing by a table, packing up her things.",
        "A woman is standing with an empty cup in her hand.",
      ],
    },
  },

  "3.3.3": {
    // Early for meeting someone
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, looking at her phone and then around.",
        "A woman is sitting at a table, scanning the cafe.",
      ],
      standing: [
        "You see a woman standing near a table, checking her phone.",
        "A woman is standing and looking toward the entrance.",
      ],
    },
  },

  // ============================================================================
  // 3.4 COFFEE SHOP - ORDERING/SERVICE
  // ============================================================================

  "3.4.1": {
    // Waiting for order (at counter)
    validPositions: ["standing"],
    texts: {
      standing: [
        "You see a woman standing at the counter, waiting for her order.",
        "A woman is paused near the pickup area.",
        "You notice a woman standing by the counter with a receipt.",
      ],
    },
  },

  "3.4.2": {
    // Just received order
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing with a fresh coffee in her hand.",
        "A woman is stepping away from the counter with a drink.",
      ],
      seated: [
        "You see a woman seated with a new drink in front of her.",
        "A woman is sitting at a table, placing a cup down.",
      ],
    },
  },

  "3.4.3": {
    // Ordering at counter
    validPositions: ["standing"],
    texts: {
      standing: [
        "You see a woman standing at the counter, ordering a drink.",
        "A woman is at the counter, speaking to the barista.",
        "You notice a woman pointing at the menu board.",
      ],
    },
  },

  "3.4.4": {
    // Looking at menu
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing and looking up at the menu board.",
        "A woman is standing near the counter, reading the menu.",
      ],
      seated: [
        "You see a woman seated, reading a menu card.",
        "A woman is sitting at a table, looking at a menu.",
      ],
    },
  },

  // ============================================================================
  // 3.5 COFFEE SHOP - DIGITAL/MEDIA
  // ============================================================================

  "3.5.1": {
    // On phone (scrolling or reading)
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, scrolling on her phone.",
        "A woman is sitting at a table, reading something on her phone.",
      ],
      standing: [
        "You see a woman standing near the counter, looking at her phone.",
        "A woman is standing and scrolling through her phone.",
      ],
    },
  },

  "3.5.2": {
    // On a phone call
    validPositions: ["standing", "seated", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing and talking on her phone.",
        "A woman is on a call near the counter.",
      ],
      seated: [
        "You see a woman seated, talking on her phone.",
        "A woman is sitting at a table, speaking into her phone.",
      ],
      walking_slow: [
        "You see a woman walking slowly near the cafe entrance on a call.",
        "A woman is moving slowly while talking on her phone.",
      ],
    },
  },

  "3.5.3": {
    // Listening to music (headphones visible)
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated with headphones on.",
        "A woman is sitting at a table, wearing headphones.",
      ],
      standing: [
        "You see a woman standing with headphones on.",
        "A woman is standing near the counter, wearing earbuds.",
      ],
    },
  },

  "3.5.4": {
    // Sending messages
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, typing on her phone.",
        "A woman is sitting at a table, texting.",
      ],
      standing: [
        "You see a woman standing and typing on her phone.",
        "A woman is standing near the counter, sending a message.",
      ],
    },
  },

  // ============================================================================
  // 3.6 COFFEE SHOP - BREAK/IDLE
  // ============================================================================

  "3.6.1": {
    // On a short work break
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, stretching her arms at a table.",
        "A woman is sitting with a coffee, looking at her phone.",
      ],
      standing: [
        "You see a woman standing with a coffee, checking her phone.",
        "A woman is standing near a table, taking a quick break.",
      ],
    },
  },

  "3.6.2": {
    // Smoke break outside cafe
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing outside the cafe with a cigarette.",
        "A woman is standing near the door, holding a cigarette.",
      ],
      seated: [
        "You see a woman seated outside the cafe, holding a cigarette.",
        "A woman is sitting on a bench outside with a cigarette.",
      ],
    },
  },

  "3.6.3": {
    // Idle with no clear purpose
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated at a table, looking around.",
        "A woman is sitting with a drink, not doing much.",
      ],
      standing: [
        "You see a woman standing near a table, looking around the cafe.",
        "A woman is standing by the counter, waiting.",
      ],
    },
  },
  // ============================================================================
  // 4.1 TRANSIT - WAITING
  // ============================================================================

  "4.1.1": {
    // Waiting for transport
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing at a transit stop with a bag.",
        "A woman is standing on the platform, looking down the line.",
      ],
      seated: [
        "You see a woman seated on a bench at the stop.",
        "A woman is sitting on the platform with her bag beside her.",
      ],
    },
  },

  "4.1.2": {
    // Checking transport times
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing and looking up at a timetable screen.",
        "A woman is standing near the schedule board, checking times.",
      ],
      seated: [
        "You see a woman seated, checking a timetable on her phone.",
        "A woman is sitting at the stop, looking at the transit board.",
      ],
    },
  },

  "4.1.3": {
    // Sitting at a transit stop
    validPositions: ["seated"],
    texts: {
      seated: [
        "You see a woman sitting on a bench at the stop.",
        "A woman is seated at the platform, resting her bag on her lap.",
        "You notice a woman sitting and looking toward the tracks.",
      ],
    },
  },

  "4.1.4": {
    // Standing near a transit stop
    validPositions: ["standing"],
    texts: {
      standing: [
        "You see a woman standing near a transit stop sign.",
        "A woman is standing on the platform, looking around.",
        "You notice a woman standing near the edge of the stop.",
      ],
    },
  },

  "4.1.5": {
    // Delayed and waiting
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing and repeatedly looking at the schedule.",
        "A woman is standing by the platform screen, checking it again.",
      ],
      seated: [
        "You see a woman seated, looking up at the timetable display.",
        "A woman is sitting at the stop, glancing at the screen.",
      ],
    },
  },

  "4.1.6": {
    // Missed train/bus (frustrated)
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing and watching a bus pull away.",
        "A woman is standing near the stop, looking down the road.",
      ],
      seated: [
        "You see a woman seated, looking toward the departing transport.",
        "A woman is sitting at the stop, looking down the line.",
      ],
    },
  },

  "4.1.7": {
    // Killing time (long wait)
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, scrolling on her phone at the stop.",
        "A woman is sitting on a bench, passing the time.",
      ],
      standing: [
        "You see a woman standing and looking around the platform.",
        "A woman is standing at the stop, checking her phone.",
      ],
    },
  },

  // ============================================================================
  // 4.2 TRANSIT - ARRIVING/DEPARTING
  // ============================================================================

  "4.2.1": {
    // Just arrived somewhere
    validPositions: ["walking_moderate", "standing", "walking_slow"],
    texts: {
      walking_moderate: [
        "You see a woman walking away from a transit stop with a bag.",
        "A woman is walking at a steady pace, just off the platform.",
      ],
      standing: [
        "You see a woman standing near the platform, looking around.",
        "A woman is paused just outside the transit doors.",
      ],
      walking_slow: [
        "You see a woman walking slowly away from the stop.",
        "A woman is moving slowly with a bag in hand.",
      ],
    },
  },

  "4.2.2": {
    // About to leave
    validPositions: ["standing", "walking_slow", "walking_moderate"],
    texts: {
      standing: [
        "You see a woman standing near the platform, holding a ticket.",
        "A woman is standing by the doors, looking down the line.",
      ],
      walking_slow: [
        "You see a woman walking slowly toward the platform edge.",
        "A woman is moving slowly toward the boarding area.",
      ],
      walking_moderate: [
        "You see a woman walking at a steady pace toward the platform.",
        "A woman is walking toward the stop with a bag.",
      ],
    },
  },

  "4.2.3": {
    // About to board (transport arriving)
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing near the doors, ready to board.",
        "A woman is standing in line at the platform edge.",
      ],
      walking_slow: [
        "You see a woman walking slowly toward the arriving transport.",
        "A woman is moving slowly toward the doors with a bag.",
      ],
    },
  },

  "4.2.4": {
    // Just got off transport
    validPositions: ["walking_moderate", "standing", "walking_brisk"],
    texts: {
      walking_moderate: [
        "You see a woman walking away from the platform, just off transit.",
        "A woman is walking at a steady pace away from the stop.",
      ],
      standing: [
        "You see a woman standing near the platform doors with a bag.",
        "A woman is paused just off the transit doors.",
      ],
      walking_brisk: [
        "You see a woman walking briskly away from the platform.",
        "A woman is moving quickly away from the stop.",
      ],
    },
  },

  // ============================================================================
  // 4.3 TRANSIT - DIGITAL/MEDIA
  // ============================================================================

  "4.3.1": {
    // On phone (scrolling or reading)
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing at the stop, scrolling on her phone.",
        "A woman is standing on the platform, reading her phone.",
      ],
      seated: [
        "You see a woman seated on a bench, looking at her phone.",
        "A woman is sitting at the stop, scrolling on her phone.",
      ],
    },
  },

  "4.3.2": {
    // On a phone call
    validPositions: ["standing", "walking_slow", "seated"],
    texts: {
      standing: [
        "You see a woman standing on the platform, talking on her phone.",
        "A woman is on a call near the transit stop.",
      ],
      walking_slow: [
        "You see a woman walking slowly while talking on her phone.",
        "A woman is moving slowly along the platform, on a call.",
      ],
      seated: [
        "You see a woman seated on a bench, talking on her phone.",
        "A woman is sitting at the stop, speaking into her phone.",
      ],
    },
  },

  "4.3.3": {
    // Listening to music (headphones visible)
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing with headphones on at the stop.",
        "A woman is standing on the platform, wearing earbuds.",
      ],
      seated: [
        "You see a woman seated on a bench with headphones on.",
        "A woman is sitting at the stop, wearing headphones.",
      ],
    },
  },

  "4.3.4": {
    // Listening to a podcast (headphones visible)
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated with headphones on at the stop.",
        "A woman is sitting on a bench, wearing earbuds.",
      ],
      standing: [
        "You see a woman standing with headphones on by the platform.",
        "A woman is standing near the stop, wearing headphones.",
      ],
    },
  },

  "4.3.5": {
    // Sending messages
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing at the stop, typing on her phone.",
        "A woman is standing on the platform, texting.",
      ],
      seated: [
        "You see a woman seated on a bench, typing on her phone.",
        "A woman is sitting at the stop, sending a message.",
      ],
    },
  },

  // ============================================================================
  // 4.4 TRANSIT - UTILITY/HELP
  // ============================================================================

  "4.4.1": {
    // Lost tourist (checking map/phone)
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing and looking at a map on her phone.",
        "A woman is standing near the stop, checking a map.",
      ],
      walking_slow: [
        "You see a woman walking slowly while checking her phone map.",
        "A woman is moving slowly, looking between her phone and the signs.",
      ],
    },
  },

  "4.4.2": {
    // Phone died / looking for help
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing and tapping her phone screen.",
        "A woman is standing near the stop, staring at her phone.",
      ],
      walking_slow: [
        "You see a woman walking slowly and looking around.",
        "A woman is moving slowly, glancing at her phone.",
      ],
    },
  },

  "4.4.3": {
    // Checking directions on phone
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing and checking directions on her phone.",
        "A woman is standing near the platform, looking at a map app.",
      ],
      walking_slow: [
        "You see a woman walking slowly while checking her phone directions.",
        "A woman is moving slowly, glancing between her phone and signs.",
      ],
    },
  },

  // ============================================================================
  // 4.5 TRANSIT - IDLE
  // ============================================================================

  "4.5.1": {
    // Idle with no clear purpose
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing on the platform, looking around.",
        "A woman is standing near the stop with her hands in her pockets.",
      ],
      seated: [
        "You see a woman seated on a bench, looking around.",
        "A woman is sitting at the stop, not doing much.",
      ],
    },
  },
  // ============================================================================
  // 5.1 PARK - SITTING/RELAXING
  // ============================================================================

  "5.1.1": {
    // Sitting on a bench
    validPositions: ["seated"],
    texts: {
      seated: [
        "You see a woman seated on a park bench.",
        "A woman is sitting on a bench, looking around.",
        "You notice a woman sitting with her hands in her lap.",
      ],
    },
  },

  "5.1.2": {
    // Sitting in the sun
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated in a sunny spot on a bench.",
        "A woman is sitting in the sun with her face turned upward.",
      ],
      standing: [
        "You see a woman standing in a patch of sunlight.",
        "A woman is standing in the sun, looking around the park.",
      ],
    },
  },

  "5.1.3": {
    // Sitting in the shade
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated on a shaded bench.",
        "A woman is sitting under a tree in the shade.",
      ],
      standing: [
        "You see a woman standing in the shade near a tree.",
        "A woman is standing under a tree, looking around.",
      ],
    },
  },

  "5.1.4": {
    // Reading a book
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated on a bench, reading a book.",
        "A woman is sitting with a book open in her hands.",
      ],
      standing: [
        "You see a woman standing and reading a book.",
        "A woman is standing in the park with a book in her hands.",
      ],
    },
  },

  "5.1.5": {
    // Reading on her phone
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, reading on her phone.",
        "A woman is sitting on a bench, scrolling on her phone.",
      ],
      standing: [
        "You see a woman standing in the park, looking at her phone.",
        "A woman is standing and scrolling through her phone.",
      ],
    },
  },

  "5.1.6": {
    // Journaling
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, writing in a notebook.",
        "A woman is sitting on a bench, journaling.",
      ],
      standing: [
        "You see a woman standing and writing in a notebook.",
        "A woman is standing near a bench, jotting notes down.",
      ],
    },
  },

  "5.1.7": {
    // People-watching
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated on a bench, looking around the park.",
        "A woman is sitting and watching people walk by.",
      ],
      standing: [
        "You see a woman standing near the path, watching people pass.",
        "A woman is standing and scanning the park.",
      ],
    },
  },

  "5.1.8": {
    // Sketching / drawing
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, sketching in a notebook.",
        "A woman is sitting on a bench, drawing in a sketchbook.",
      ],
      standing: [
        "You see a woman standing and sketching on a small pad.",
        "A woman is standing near a tree, drawing in a notebook.",
      ],
    },
  },

  "5.1.9": {
    // Eating lunch
    validPositions: ["seated"],
    texts: {
      seated: [
        "You see a woman seated on a bench, eating lunch.",
        "A woman is sitting with a lunch container in her lap.",
        "You notice a woman eating on a bench.",
      ],
    },
  },

  "5.1.10": {
    // Drinking coffee
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated on a bench, holding a coffee cup.",
        "A woman is sitting with a takeaway coffee in her hand.",
      ],
      standing: [
        "You see a woman standing on the path with a coffee cup.",
        "A woman is standing in the park, sipping a coffee.",
      ],
    },
  },

  // ============================================================================
  // 5.2 PARK - WALKING
  // ============================================================================

  "5.2.1": {
    // Taking a walk
    validPositions: ["walking_slow", "walking_moderate"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly along a park path.",
        "A woman is strolling through the park.",
      ],
      walking_moderate: [
        "You see a woman walking at a steady pace along the path.",
        "A woman is walking through the park.",
      ],
    },
  },

  "5.2.2": {
    // Walking briskly
    validPositions: ["walking_brisk", "walking_moderate"],
    texts: {
      walking_brisk: [
        "You see a woman walking briskly along the park path.",
        "A woman is walking quickly through the park.",
      ],
      walking_moderate: [
        "You see a woman walking at a steady pace.",
        "A woman is walking through the park with purpose.",
      ],
    },
  },

  "5.2.3": {
    // Wandering without clear destination
    validPositions: ["walking_slow", "walking_moderate"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly and looking around the park.",
        "A woman is wandering along the path at an easy pace.",
      ],
      walking_moderate: [
        "You see a woman walking through the park, glancing around.",
        "A woman is moving at a steady pace, looking around.",
      ],
    },
  },

  "5.2.4": {
    // Walking a dog
    validPositions: ["walking_slow", "walking_moderate"],
    texts: {
      walking_slow: [
        "You see a woman walking a dog on a leash.",
        "A woman is strolling with her dog along the path.",
      ],
      walking_moderate: [
        "You see a woman walking a dog at a steady pace.",
        "A woman is walking with her dog through the park.",
      ],
    },
  },

  "5.2.5": {
    // Dog pause (dog sniffing/playing)
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing while her dog sniffs the grass.",
        "A woman is paused on the path as her dog explores.",
      ],
      walking_slow: [
        "You see a woman walking slowly while her dog sniffs around.",
        "A woman is moving slowly, letting her dog lead.",
      ],
    },
  },

  "5.2.6": {
    // At dog park
    validPositions: ["standing", "walking_slow", "seated"],
    texts: {
      standing: [
        "You see a woman standing by the dog park fence.",
        "A woman is standing near the dog park, watching the dogs.",
      ],
      walking_slow: [
        "You see a woman walking slowly around the dog park area.",
        "A woman is moving slowly along the fence line.",
      ],
      seated: [
        "You see a woman seated near the dog park, watching the dogs.",
        "A woman is sitting on a bench by the dog park.",
      ],
    },
  },

  // ============================================================================
  // 5.3 PARK - EXERCISE
  // ============================================================================

  "5.3.1": {
    // Going for a run (pre-run)
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing on the path, tying her shoes.",
        "A woman is standing near the path, stretching her legs.",
      ],
      walking_slow: [
        "You see a woman walking slowly, adjusting her earbuds.",
        "A woman is moving slowly along the path, rolling her shoulders.",
      ],
    },
  },

  "5.3.2": {
    // Running
    validPositions: ["walking_fast"],
    texts: {
      walking_fast: [
        "You see a woman running along the park path.",
        "A woman is jogging quickly through the park.",
        "You notice a woman running past at a fast pace.",
      ],
    },
  },

  "5.3.3": {
    // Stretching (pre/post exercise)
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing and stretching her legs.",
        "A woman is standing on the grass, stretching her arms.",
      ],
      seated: [
        "You see a woman seated on the grass, stretching.",
        "A woman is sitting on a bench, stretching one leg out.",
      ],
    },
  },

  "5.3.4": {
    // Cooling down after exercise
    validPositions: ["walking_slow", "standing", "seated"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly along the path, wiping her brow.",
        "A woman is moving slowly along the path, slowing her pace.",
      ],
      standing: [
        "You see a woman standing on the path, stretching her shoulders.",
        "A woman is standing and stretching her shoulders.",
      ],
      seated: [
        "You see a woman seated on a bench, hands resting on her knees.",
        "A woman is sitting with her hands on her knees.",
      ],
    },
  },

  "5.3.5": {
    // Sitting post-workout
    validPositions: ["seated"],
    texts: {
      seated: [
        "You see a woman seated on a bench with a water bottle beside her.",
        "A woman is sitting with a towel in her hand.",
        "You notice a woman sitting with her elbows on her knees.",
      ],
    },
  },

  "5.3.6": {
    // Drinking water after exercise
    validPositions: ["standing", "seated", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing and drinking from a water bottle.",
        "A woman is standing on the path, sipping water.",
      ],
      seated: [
        "You see a woman seated on a bench, drinking water.",
        "A woman is sitting and taking a sip from her bottle.",
      ],
      walking_slow: [
        "You see a woman walking slowly, drinking from a bottle.",
        "A woman is moving slowly while taking a sip of water.",
      ],
    },
  },

  // ============================================================================
  // 5.4 PARK - DIGITAL/MEDIA
  // ============================================================================

  "5.4.1": {
    // On phone (scrolling or reading)
    validPositions: ["seated", "standing", "walking_slow"],
    texts: {
      seated: [
        "You see a woman seated on a bench, scrolling on her phone.",
        "A woman is sitting in the park, reading her phone.",
      ],
      standing: [
        "You see a woman standing by the path, looking at her phone.",
        "A woman is standing and scrolling on her phone.",
      ],
      walking_slow: [
        "You see a woman walking slowly while reading her phone.",
        "A woman is moving slowly along the path, eyes on her phone.",
      ],
    },
  },

  "5.4.2": {
    // On a phone call
    validPositions: ["walking_slow", "standing", "seated"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly, talking on her phone.",
        "A woman is moving slowly along the path, on a call.",
      ],
      standing: [
        "You see a woman standing by the path, talking on her phone.",
        "A woman is standing in the park, on a call.",
      ],
      seated: [
        "You see a woman seated on a bench, talking on her phone.",
        "A woman is sitting and speaking into her phone.",
      ],
    },
  },

  "5.4.3": {
    // Listening to music (headphones visible)
    validPositions: ["walking_slow", "seated", "standing"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly with headphones on.",
        "A woman is moving slowly along the path, wearing earbuds.",
      ],
      seated: [
        "You see a woman seated on a bench with headphones on.",
        "A woman is sitting in the park, wearing headphones.",
      ],
      standing: [
        "You see a woman standing by the path with headphones on.",
        "A woman is standing in the park, wearing earbuds.",
      ],
    },
  },

  "5.4.4": {
    // Listening to a podcast (headphones visible)
    validPositions: ["walking_slow", "seated", "standing"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly with headphones on.",
        "A woman is moving slowly along the path, wearing earbuds.",
      ],
      seated: [
        "You see a woman seated on a bench with headphones on.",
        "A woman is sitting in the park, wearing headphones.",
      ],
      standing: [
        "You see a woman standing by the path with headphones on.",
        "A woman is standing in the park, wearing earbuds.",
      ],
    },
  },

  "5.4.5": {
    // Taking photos
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing and taking a photo.",
        "A woman is standing by the path, holding up her phone to take a picture.",
      ],
      walking_slow: [
        "You see a woman walking slowly, stopping to take a photo.",
        "A woman is moving slowly through the park, taking pictures.",
      ],
    },
  },

  "5.4.6": {
    // Doing photography (active/serious)
    validPositions: ["standing", "walking_slow", "walking_moderate"],
    texts: {
      standing: [
        "You see a woman standing with a camera, aiming it carefully.",
        "A woman is standing still, taking photos with a camera.",
      ],
      walking_slow: [
        "You see a woman walking slowly with a camera, looking for a shot.",
        "A woman is moving slowly through the park with a camera in hand.",
      ],
      walking_moderate: [
        "You see a woman walking at a steady pace with a camera.",
        "A woman is walking through the park with a camera on a strap.",
      ],
    },
  },

  // ============================================================================
  // 5.5 PARK - SOCIAL/WAITING
  // ============================================================================

  "5.5.1": {
    // Waiting for a friend
    validPositions: ["seated", "standing", "walking_slow"],
    texts: {
      seated: [
        "You see a woman seated on a bench, looking around.",
        "A woman is sitting and checking her phone near the path.",
      ],
      standing: [
        "You see a woman standing near the path, checking her phone.",
        "A woman is standing and looking around the park.",
      ],
      walking_slow: [
        "You see a woman walking slowly, glancing down the path.",
        "A woman is moving slowly, scanning the park.",
      ],
    },
  },

  "5.5.2": {
    // Just finished seeing a friend
    validPositions: ["walking_slow", "seated", "standing"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly away from a bench.",
        "A woman is moving slowly along the path, looking back once.",
      ],
      seated: [
        "You see a woman seated, gathering her things on a bench.",
        "A woman is sitting and closing a bag on her lap.",
      ],
      standing: [
        "You see a woman standing near a bench, packing up her things.",
        "A woman is standing by the path, holding a drink.",
      ],
    },
  },

  // ============================================================================
  // 5.6 PARK - SPECIAL ACTIVITIES
  // ============================================================================

  "5.6.1": {
    // Feeding birds/ducks
    validPositions: ["standing", "walking_slow", "seated"],
    texts: {
      standing: [
        "You see a woman standing by a pond, tossing small bits of food.",
        "A woman is standing near the water, feeding birds.",
      ],
      walking_slow: [
        "You see a woman walking slowly by the pond, scattering crumbs.",
        "A woman is moving slowly along the water, feeding birds.",
      ],
      seated: [
        "You see a woman seated by the water, feeding birds.",
        "A woman is sitting on a bench, tossing bits of food.",
      ],
    },
  },

  "5.6.2": {
    // Getting fresh air
    validPositions: ["walking_slow", "seated", "standing"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly along the path, taking in the park.",
        "A woman is moving slowly through the park, looking around.",
      ],
      seated: [
        "You see a woman seated on a bench, looking around the park.",
        "A woman is sitting in the park, taking a moment.",
      ],
      standing: [
        "You see a woman standing on the path, looking around.",
        "A woman is standing in the park, taking in the surroundings.",
      ],
    },
  },

  "5.6.3": {
    // Idle with no clear purpose
    validPositions: ["seated", "standing", "walking_slow"],
    texts: {
      seated: [
        "You see a woman seated on a bench, looking around.",
        "A woman is sitting in the park, not doing much.",
      ],
      standing: [
        "You see a woman standing by the path, looking around.",
        "A woman is standing in the park with her hands in her pockets.",
      ],
      walking_slow: [
        "You see a woman walking slowly along the path.",
        "A woman is moving slowly through the park.",
      ],
    },
  },
  // ============================================================================
  // 6.1 GYM - PRE-WORKOUT
  // ============================================================================

  "6.1.1": {
    // Heading to the gym
    validPositions: ["walking_moderate", "walking_brisk"],
    texts: {
      walking_moderate: [
        "You see a woman walking toward the gym with a gym bag.",
        "A woman is walking at a steady pace, gym bag over her shoulder.",
      ],
      walking_brisk: [
        "You see a woman walking briskly toward the gym entrance.",
        "A woman is moving quickly with a gym bag.",
      ],
    },
  },

  "6.1.2": {
    // Arriving at gym
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing near the gym entrance, adjusting her bag.",
        "A woman is paused by the door, looking toward the gym floor.",
      ],
      walking_slow: [
        "You see a woman walking slowly into the gym.",
        "A woman is moving slowly past the front desk.",
      ],
    },
  },

  "6.1.3": {
    // Stretching (pre-workout)
    validPositions: ["standing"],
    texts: {
      standing: [
        "You see a woman standing and stretching her arms.",
        "A woman is standing by the gym floor, stretching her legs.",
        "You notice a woman standing and rolling her shoulders.",
      ],
    },
  },

  "6.1.4": {
    // Looking at phone (pre-workout)
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing and looking at her phone.",
        "A woman is standing by a machine, checking her phone.",
      ],
      seated: [
        "You see a woman seated on a bench, looking at her phone.",
        "A woman is sitting and scrolling on her phone.",
      ],
    },
  },

  "6.1.5": {
    // Waiting for equipment
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing near a machine, waiting.",
        "A woman is standing by the weights, watching the equipment.",
      ],
      walking_slow: [
        "You see a woman walking slowly between machines, waiting.",
        "A woman is moving slowly near the equipment area.",
      ],
    },
  },

  // ============================================================================
  // 6.2 GYM - POST-WORKOUT
  // ============================================================================

  "6.2.1": {
    // Leaving the gym
    validPositions: ["walking_moderate", "walking_slow"],
    texts: {
      walking_moderate: [
        "You see a woman walking out of the gym with a towel.",
        "A woman is walking at a steady pace, gym bag in hand.",
      ],
      walking_slow: [
        "You see a woman walking slowly toward the gym exit.",
        "A woman is moving slowly toward the doors with a towel.",
      ],
    },
  },

  "6.2.2": {
    // Cooling down after exercise
    validPositions: ["walking_slow", "standing"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly around the gym floor.",
        "A woman is moving slowly around the gym floor.",
      ],
      standing: [
        "You see a woman standing by a wall, stretching her shoulders.",
        "A woman is standing and stretching her shoulders.",
      ],
    },
  },

  "6.2.3": {
    // Sitting post-workout
    validPositions: ["seated"],
    texts: {
      seated: [
        "You see a woman seated on a bench with a towel in hand.",
        "A woman is sitting with a towel and water bottle.",
        "You notice a woman sitting with a water bottle by her side.",
      ],
    },
  },

  "6.2.4": {
    // Drinking water after exercise
    validPositions: ["standing", "seated", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing and drinking from a water bottle.",
        "A woman is standing by the machines, taking a sip.",
      ],
      seated: [
        "You see a woman seated on a bench, drinking water.",
        "A woman is sitting and taking a drink from a bottle.",
      ],
      walking_slow: [
        "You see a woman walking slowly while drinking water.",
        "A woman is moving slowly, sipping from a bottle.",
      ],
    },
  },

  "6.2.5": {
    // Stretching (post-workout)
    validPositions: ["standing", "seated"],
    texts: {
      standing: [
        "You see a woman standing and stretching her legs.",
        "A woman is standing near a mat, stretching.",
      ],
      seated: [
        "You see a woman seated on a mat, stretching.",
        "A woman is sitting and stretching her hamstrings.",
      ],
    },
  },

  "6.2.6": {
    // Looking at phone (post-workout)
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated on a bench, looking at her phone.",
        "A woman is sitting and scrolling on her phone.",
      ],
      standing: [
        "You see a woman standing by a machine, checking her phone.",
        "A woman is standing and tapping on her phone.",
      ],
    },
  },

  // ============================================================================
  // 6.3 GYM - DIGITAL/MEDIA
  // ============================================================================

  "6.3.1": {
    // On phone (scrolling or reading)
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated on a bench, scrolling on her phone.",
        "A woman is sitting in the gym, looking at her phone.",
      ],
      standing: [
        "You see a woman standing by the machines, looking at her phone.",
        "A woman is standing and scrolling on her phone.",
      ],
    },
  },

  "6.3.2": {
    // Listening to music (headphones visible)
    validPositions: ["standing", "walking_slow", "seated"],
    texts: {
      standing: [
        "You see a woman standing with headphones on in the gym.",
        "A woman is standing by a machine, wearing earbuds.",
      ],
      walking_slow: [
        "You see a woman walking slowly with headphones on.",
        "A woman is moving slowly between machines, wearing earbuds.",
      ],
      seated: [
        "You see a woman seated on a bench with headphones on.",
        "A woman is sitting and wearing headphones.",
      ],
    },
  },
  // ============================================================================
  // 7.1 CAMPUS - BETWEEN CLASSES
  // ============================================================================

  "7.1.1": {
    // Walking between classes
    validPositions: ["walking_moderate", "walking_brisk", "walking_slow"],
    texts: {
      walking_moderate: [
        "You see a woman walking across campus with a backpack.",
        "A woman is walking at a steady pace between buildings.",
      ],
      walking_brisk: [
        "You see a woman walking briskly across campus.",
        "A woman is moving quickly between buildings with a backpack.",
      ],
      walking_slow: [
        "You see a woman walking slowly across campus.",
        "A woman is moving slowly between buildings, looking around.",
      ],
    },
  },

  "7.1.2": {
    // Heading to class
    validPositions: ["walking_moderate", "walking_brisk", "walking_slow"],
    texts: {
      walking_moderate: [
        "You see a woman walking toward a campus building with a notebook.",
        "A woman is walking at a steady pace toward class.",
      ],
      walking_brisk: [
        "You see a woman walking briskly toward a campus building.",
        "A woman is moving quickly with a backpack and notebook.",
      ],
      walking_slow: [
        "You see a woman walking slowly toward a building.",
        "A woman is moving slowly across campus, looking ahead.",
      ],
    },
  },

  "7.1.3": {
    // Leaving class
    validPositions: ["walking_moderate", "walking_slow", "standing"],
    texts: {
      walking_moderate: [
        "You see a woman walking out of a campus building with a notebook.",
        "A woman is walking at a steady pace away from a classroom.",
      ],
      walking_slow: [
        "You see a woman walking slowly away from a building.",
        "A woman is moving slowly across campus with a backpack.",
      ],
      standing: [
        "You see a woman standing just outside a classroom door.",
        "A woman is paused near a building entrance with a notebook.",
      ],
    },
  },

  "7.1.4": {
    // Checking schedule/phone
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing and checking her phone on campus.",
        "A woman is standing near a building, looking at her phone.",
      ],
      walking_slow: [
        "You see a woman walking slowly while checking her phone.",
        "A woman is moving slowly across campus, eyes on her phone.",
      ],
    },
  },

  "7.1.5": {
    // Rushing between buildings
    validPositions: ["walking_fast", "walking_brisk"],
    texts: {
      walking_fast: [
        "You see a woman moving quickly across campus with a backpack.",
        "A woman is walking fast between buildings.",
      ],
      walking_brisk: [
        "You see a woman walking briskly across campus.",
        "A woman is moving quickly toward another building.",
      ],
    },
  },

  // ============================================================================
  // 7.2 CAMPUS - STUDYING
  // ============================================================================

  "7.2.1": {
    // Studying outdoors
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated outdoors with books open.",
        "A woman is sitting on campus grass, studying from a notebook.",
      ],
      standing: [
        "You see a woman standing with a notebook, reading.",
        "A woman is standing outdoors, looking at her notes.",
      ],
    },
  },

  "7.2.2": {
    // Reading on campus
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated with a book open on her lap.",
        "A woman is sitting on a bench, reading.",
      ],
      standing: [
        "You see a woman standing with a book in her hands.",
        "A woman is standing near a building, reading.",
      ],
    },
  },

  "7.2.3": {
    // Working on laptop
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated with a laptop open on her lap.",
        "A woman is sitting at an outdoor table, typing on a laptop.",
      ],
      standing: [
        "You see a woman standing with a laptop open on a ledge.",
        "A woman is standing and typing on a laptop.",
      ],
    },
  },

  "7.2.4": {
    // Taking notes
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, writing in a notebook.",
        "A woman is sitting on a bench, taking notes.",
      ],
      standing: [
        "You see a woman standing and writing in a notebook.",
        "A woman is standing near a building, taking notes.",
      ],
    },
  },

  // ============================================================================
  // 7.3 CAMPUS - SOCIAL/BREAK
  // ============================================================================

  "7.3.1": {
    // On a break between classes
    validPositions: ["seated", "standing", "walking_slow"],
    texts: {
      seated: [
        "You see a woman seated on steps, looking at her phone.",
        "A woman is sitting on a bench with a snack.",
      ],
      standing: [
        "You see a woman standing near a building, looking around.",
        "A woman is standing by a courtyard wall, looking around.",
      ],
      walking_slow: [
        "You see a woman walking slowly across campus with a drink.",
        "A woman is moving slowly between buildings with a drink.",
      ],
    },
  },

  "7.3.2": {
    // Waiting for a friend
    validPositions: ["standing", "seated", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing near a building, checking her phone.",
        "A woman is standing on the path, looking around.",
      ],
      seated: [
        "You see a woman seated on a bench, looking around.",
        "A woman is sitting with a backpack beside her.",
      ],
      walking_slow: [
        "You see a woman walking slowly, glancing around campus.",
        "A woman is moving slowly along the path, looking around.",
      ],
    },
  },

  "7.3.3": {
    // Just finished seeing a friend
    validPositions: ["walking_slow", "standing", "seated"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly away from a bench.",
        "A woman is moving slowly across campus, looking back once.",
      ],
      standing: [
        "You see a woman standing near a bench, packing up her things.",
        "A woman is standing with a bag over her shoulder.",
      ],
      seated: [
        "You see a woman seated, closing a notebook.",
        "A woman is sitting and sliding a bag onto her shoulder.",
      ],
    },
  },

  "7.3.4": {
    // Eating lunch on campus
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated on a bench, eating lunch.",
        "A woman is sitting with a lunch container in her lap.",
      ],
      standing: [
        "You see a woman standing with a lunch container in hand.",
        "A woman is standing near a courtyard, eating.",
      ],
    },
  },

  "7.3.5": {
    // Getting coffee on campus
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing with a coffee cup in her hand.",
        "A woman is standing near a campus cafe, holding a drink.",
      ],
      walking_slow: [
        "You see a woman walking slowly with a coffee cup.",
        "A woman is moving slowly across campus, sipping coffee.",
      ],
    },
  },

  // ============================================================================
  // 7.4 CAMPUS - LEISURE
  // ============================================================================

  "7.4.1": {
    // Sitting in campus courtyard
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated in the courtyard, looking around.",
        "A woman is sitting on a courtyard bench.",
      ],
      standing: [
        "You see a woman standing in the courtyard, looking around.",
        "A woman is standing near a fountain, taking in the scene.",
      ],
    },
  },

  "7.4.2": {
    // Walking through campus
    validPositions: ["walking_slow", "walking_moderate"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly through campus.",
        "A woman is moving slowly along a campus path.",
      ],
      walking_moderate: [
        "You see a woman walking at a steady pace across campus.",
        "A woman is walking through the courtyard.",
      ],
    },
  },

  "7.4.3": {
    // People-watching on campus
    validPositions: ["seated", "standing"],
    texts: {
      seated: [
        "You see a woman seated, watching people cross the courtyard.",
        "A woman is sitting on a bench, looking around campus.",
      ],
      standing: [
        "You see a woman standing near the path, watching people pass.",
        "A woman is standing in the courtyard, looking around.",
      ],
    },
  },

  "7.4.4": {
    // Taking photos on campus
    validPositions: ["standing", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing and taking a photo on campus.",
        "A woman is standing near a building, holding up her phone.",
      ],
      walking_slow: [
        "You see a woman walking slowly, stopping to take photos.",
        "A woman is moving slowly across campus, taking pictures.",
      ],
    },
  },

  // ============================================================================
  // 7.5 CAMPUS - DIGITAL/MEDIA
  // ============================================================================

  "7.5.1": {
    // On phone (scrolling or reading)
    validPositions: ["seated", "standing", "walking_slow"],
    texts: {
      seated: [
        "You see a woman seated, scrolling on her phone.",
        "A woman is sitting on a bench, reading her phone.",
      ],
      standing: [
        "You see a woman standing near a building, looking at her phone.",
        "A woman is standing and scrolling on her phone.",
      ],
      walking_slow: [
        "You see a woman walking slowly while reading her phone.",
        "A woman is moving slowly across campus, eyes on her phone.",
      ],
    },
  },

  "7.5.2": {
    // On a phone call
    validPositions: ["walking_slow", "standing", "seated"],
    texts: {
      walking_slow: [
        "You see a woman walking slowly, talking on her phone.",
        "A woman is moving slowly across campus, on a call.",
      ],
      standing: [
        "You see a woman standing near a building, talking on her phone.",
        "A woman is standing and speaking into her phone.",
      ],
      seated: [
        "You see a woman seated on a bench, talking on her phone.",
        "A woman is sitting and speaking into her phone.",
      ],
    },
  },

  "7.5.3": {
    // Listening to music (headphones visible)
    validPositions: ["walking_moderate", "seated", "walking_slow"],
    texts: {
      walking_moderate: [
        "You see a woman walking across campus with headphones on.",
        "A woman is walking at a steady pace, wearing earbuds.",
      ],
      seated: [
        "You see a woman seated on a bench with headphones on.",
        "A woman is sitting in the courtyard, wearing headphones.",
      ],
      walking_slow: [
        "You see a woman walking slowly with headphones on.",
        "A woman is moving slowly across campus, wearing earbuds.",
      ],
    },
  },

  "7.5.4": {
    // Sending messages
    validPositions: ["standing", "seated", "walking_slow"],
    texts: {
      standing: [
        "You see a woman standing and typing on her phone.",
        "A woman is standing near a building, texting.",
      ],
      seated: [
        "You see a woman seated, typing on her phone.",
        "A woman is sitting on a bench, sending a message.",
      ],
      walking_slow: [
        "You see a woman walking slowly while texting.",
        "A woman is moving slowly across campus, typing on her phone.",
      ],
    },
  },

  // ============================================================================
  // 7.6 CAMPUS - IDLE
  // ============================================================================

  "7.6.1": {
    // Idle with no clear purpose
    validPositions: ["seated", "standing", "walking_slow"],
    texts: {
      seated: [
        "You see a woman seated on a bench, looking around.",
        "A woman is sitting on campus, not doing much.",
      ],
      standing: [
        "You see a woman standing near a building, looking around.",
        "A woman is standing on the path, waiting.",
      ],
      walking_slow: [
        "You see a woman walking slowly across campus.",
        "A woman is moving slowly along the path.",
      ],
    },
  },
};

/**
 * Get a random base text for an activity and position
 */
export function getBaseText(activityId: ActivityId, position: Position): string {
  const activity = BASE_TEXTS[activityId];

  if (!activity) {
    return "You see a woman nearby.";
  }

  const texts = activity.texts[position];

  if (!texts || texts.length === 0) {
    // Position not valid for this activity - fallback
    const fallbackPosition = activity.validPositions[0];
    const fallbackTexts = activity.texts[fallbackPosition];
    if (fallbackTexts && fallbackTexts.length > 0) {
      return fallbackTexts[Math.floor(Math.random() * fallbackTexts.length)];
    }
    return "You see a woman nearby.";
  }

  return texts[Math.floor(Math.random() * texts.length)];
}

/**
 * Get valid positions for an activity
 */
export function getValidPositions(activityId: ActivityId): Position[] {
  return BASE_TEXTS[activityId]?.validPositions || ["standing", "walking_slow"];
}

/**
 * Check if a position is valid for an activity
 */
export function isValidPosition(activityId: ActivityId, position: Position): boolean {
  const activity = BASE_TEXTS[activityId];
  return activity ? activity.validPositions.includes(position) : false;
}
