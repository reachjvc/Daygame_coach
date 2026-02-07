/**
 * Keep It Going - Response Templates
 *
 * Her responses based on quality of user's message.
 * Includes standard responses, her questions back, and close responses.
 */

import type { Language, ResponseQuality, CloseOutcome } from "../types"

interface ResponseSet {
  positive: string[] // Good statement -> she opens up
  neutral: string[] // Okay response -> she gives more
  deflect: string[] // Bad/interview -> short answer
  skeptical: string[] // Try-hard -> she's skeptical
}

export const RESPONSES: Record<Language, ResponseSet> = {
  da: {
    positive: [
      '*smiler* "Haha, måske. Hvad med dig?"',
      '*griner lidt* "Okay, det er faktisk ret sandt."',
      '"Fair nok. Du er ikke helt ved siden af."',
      '*smiler* "Det kan du godt sige. Hvorfor spørger du?"',
    ],
    neutral: [
      '"Måske. Hvad får dig til at sige det?"',
      '"Hmm, interessant observation."',
      '*tænker* "Jeg ved ikke... måske?"',
    ],
    deflect: ['"Okay?"', '"Jah..."', '"Det ved jeg ikke."', '*kort pause* "Sure."'],
    skeptical: [
      '*hæver øjenbryn* "Det var... noget at sige."',
      '"Øh, okay?"',
      '*ser skeptisk ud* "Right."',
    ],
  },
  en: {
    positive: [
      '*smiles* "Haha, maybe. What about you?"',
      '*laughs a bit* "Okay, that\'s actually pretty true."',
      '"Fair enough. You\'re not totally off."',
      '*smiles* "You could say that. Why do you ask?"',
    ],
    neutral: [
      '"Maybe. What makes you say that?"',
      '"Hmm, interesting observation."',
      '*thinks* "I don\'t know... maybe?"',
    ],
    deflect: ['"Okay?"', '"Yeah..."', '"I don\'t know."', '*short pause* "Sure."'],
    skeptical: [
      '*raises eyebrow* "That was... something to say."',
      '"Uh, okay?"',
      '*looks skeptical* "Right."',
    ],
  },
}

// Her questions back - triggered when score >= 7 for 2+ consecutive turns
export const HER_QUESTIONS: Record<Language, string[]> = {
  da: [
    '"Hvad med dig?" *nysgerrig*',
    '"Og dig? Hvad laver du?" *smiler*',
    '"Okay, men hvem er du egentlig?"',
    '"Du er mystisk. Hvad hedder du?"',
  ],
  en: [
    '"What about you?" *curious*',
    '"And you? What do you do?" *smiles*',
    '"Okay, but who are you actually?"',
    '"You\'re mysterious. What\'s your name?"',
  ],
}

// Close responses based on conversation quality
export const CLOSE_RESPONSES: Record<Language, { success: string[]; hesitant: string[]; decline: string[] }> = {
  da: {
    success: [
      '*smiler* "Okay, fair nok. Det her er mit nummer..."',
      '"Du er sød. Her." *giver nummer*',
    ],
    hesitant: [
      '"Hmm... har du Instagram? Så kan vi skrive der først."',
      '"Jeg ved ikke... vi har kun snakket i to minutter."',
    ],
    decline: ['"Nej tak, men hyggeligt at møde dig."', '*smiler høfligt* "Jeg er god, men tak."'],
  },
  en: {
    success: ['*smiles* "Okay, fair enough. Here\'s my number..."', '"You\'re sweet. Here." *gives number*'],
    hesitant: [
      '"Hmm... do you have Instagram? We could chat there first."',
      '"I don\'t know... we\'ve only been talking for two minutes."',
    ],
    decline: ['"No thanks, but nice meeting you."', '*smiles politely* "I\'m good, but thanks."'],
  },
}

export function pickResponse(quality: ResponseQuality, language: Language): string {
  const options = RESPONSES[language][quality]
  return options[Math.floor(Math.random() * options.length)]
}

export function pickHerQuestion(language: Language): string {
  const options = HER_QUESTIONS[language]
  return options[Math.floor(Math.random() * options.length)]
}

export function pickCloseResponse(outcome: CloseOutcome, language: Language): string {
  const options = CLOSE_RESPONSES[language][outcome]
  return options[Math.floor(Math.random() * options.length)]
}
