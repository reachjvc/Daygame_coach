/**
 * Keep It Going - Situations Data
 *
 * Pre-defined situations with openers and first responses in Danish and English.
 */

import type { Situation } from "../types"

export const SITUATIONS: Situation[] = [
  {
    id: "bookstore",
    location: {
      da: "Boghandel",
      en: "Bookstore",
    },
    setup: {
      da: "Hun kigger på bøger.",
      en: "She's browsing books.",
    },
    yourOpener: {
      da: "Hey - to sekunder. Du så ud som om du faktisk læste bagsiden.",
      en: "Hey - quick. You look like you actually read the back cover.",
    },
    herFirstResponse: {
      da: '"Ja?" *kigger op, lidt skeptisk*',
      en: '"Yeah?" *looks up, slightly skeptical*',
    },
  },
  {
    id: "cafe",
    location: {
      da: "Cafe",
      en: "Coffee shop",
    },
    setup: {
      da: "Hun sidder med laptop, ser fokuseret ud.",
      en: "She's sitting with her laptop, looks focused.",
    },
    yourOpener: {
      da: "Undskyld - 30 sekunder. Du har den der 'lad mig være produktiv' energi.",
      en: "Sorry - 30 seconds. You have that 'let me be productive' energy.",
    },
    herFirstResponse: {
      da: '"Øh, jeg arbejder faktisk..." *kigger op fra laptop*',
      en: '"Uh, I\'m actually working..." *looks up from laptop*',
    },
  },
  {
    id: "street",
    location: {
      da: "Gaden",
      en: "Street",
    },
    setup: {
      da: "Hun går med formål, ser travl ud.",
      en: "She's walking with purpose, looks busy.",
    },
    yourOpener: {
      da: "Hey, hurtigt - du gik som om du faktisk ved hvor du skal hen. Det er sjældent.",
      en: "Hey, quick - you walked like you actually know where you're going. That's rare.",
    },
    herFirstResponse: {
      da: '"Haha, jeg skal bare et sted hen?" *sakker lidt ned*',
      en: '"Haha, I\'m just going somewhere?" *slows down slightly*',
    },
  },
  {
    id: "metro",
    location: {
      da: "Metrostation",
      en: "Metro station",
    },
    setup: {
      da: "Hun venter på metroen, kigger på sin telefon.",
      en: "She's waiting for the metro, looking at her phone.",
    },
    yourOpener: {
      da: "Hey - du ser ud som en der faktisk ved hvilken retning hun skal. Jeg er lost.",
      en: "Hey - you look like someone who actually knows which direction to go. I'm lost.",
    },
    herFirstResponse: {
      da: '"Øh, hvor skal du hen?" *kigger op fra telefon*',
      en: '"Uh, where are you going?" *looks up from phone*',
    },
  },
  {
    id: "mall",
    location: {
      da: "Storcenter",
      en: "Shopping mall",
    },
    setup: {
      da: "Hun går rundt med en pose, ser afslappet ud.",
      en: "She's walking around with a bag, looks relaxed.",
    },
    yourOpener: {
      da: "Hey - to sekunder. Du har den der 'jeg ved præcis hvad jeg vil have' energi. Imponerende.",
      en: "Hey - quick. You have that 'I know exactly what I want' energy. Impressive.",
    },
    herFirstResponse: {
      da: '"Haha, tak?" *stopper, smiler lidt*',
      en: '"Haha, thanks?" *stops, smiles slightly*',
    },
  },
  {
    id: "gym",
    location: {
      da: "Fitnesscenter",
      en: "Gym",
    },
    setup: {
      da: "Hun er mellem sæt, tjekker sin telefon.",
      en: "She's between sets, checking her phone.",
    },
    yourOpener: {
      da: "Hey - to sekunder. Du ser ud som en der faktisk ved hvad hun laver herinde.",
      en: "Hey - quick. You look like someone who actually knows what she's doing in here.",
    },
    herFirstResponse: {
      da: '"Haha, tak? Øh, jeg prøver." *tager høretelefoner af*',
      en: '"Haha, thanks? Uh, I try." *takes headphones off*',
    },
  },
  {
    id: "grocery",
    location: {
      da: "Supermarked",
      en: "Grocery store",
    },
    setup: {
      da: "Hun kigger på grøntsager, ser fokuseret ud.",
      en: "She's looking at vegetables, looks focused.",
    },
    yourOpener: {
      da: "Hey - den der avocado er ikke moden endnu. Bare så du ved det.",
      en: "Hey - that avocado isn't ripe yet. Just so you know.",
    },
    herFirstResponse: {
      da: '"Øh, hvad? Hvordan kan du se det?" *kigger op*',
      en: '"Uh, what? How can you tell?" *looks up*',
    },
  },
  {
    id: "park",
    location: {
      da: "Park",
      en: "Park",
    },
    setup: {
      da: "Hun sidder på en bænk og læser.",
      en: "She's sitting on a bench reading.",
    },
    yourOpener: {
      da: "Hey - du ser ud som en der faktisk nyder at læse og ikke bare gør det for billedet.",
      en: "Hey - you look like someone who actually enjoys reading and isn't just doing it for the gram.",
    },
    herFirstResponse: {
      da: '*kigger op* "Haha, ja? Det er bare en god bog."',
      en: '*looks up* "Haha, yeah? It\'s just a good book."',
    },
  },
  {
    id: "busstop",
    location: {
      da: "Busstoppested",
      en: "Bus stop",
    },
    setup: {
      da: "Hun venter på bussen, ser lidt træt ud.",
      en: "She's waiting for the bus, looks a bit tired.",
    },
    yourOpener: {
      da: "Hey - du har den der 'jeg håber virkelig bussen kommer til tiden' energi.",
      en: "Hey - you have that 'I really hope the bus is on time' energy.",
    },
    herFirstResponse: {
      da: '*smiler træt* "Haha, ja. Den er altid forsinket."',
      en: '*smiles tiredly* "Haha, yeah. It\'s always late."',
    },
  },
  {
    id: "library",
    location: {
      da: "Bibliotek",
      en: "Library",
    },
    setup: {
      da: "Hun kigger på hylderne, ser koncentreret ud.",
      en: "She's browsing the shelves, looks concentrated.",
    },
    yourOpener: {
      da: "Hey - hurtigt. Du ser ud som en der faktisk låner bøger og ikke bare bruger wifi'et.",
      en: "Hey - quick. You look like someone who actually borrows books and doesn't just use the wifi.",
    },
    herFirstResponse: {
      da: '*griner stille* "Haha, ja. Wifi er bonus."',
      en: '*laughs quietly* "Haha, yeah. Wifi is a bonus."',
    },
  },
]
