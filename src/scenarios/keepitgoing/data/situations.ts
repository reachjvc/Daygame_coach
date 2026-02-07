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
]
