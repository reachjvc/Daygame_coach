"use client"

import { useState } from "react"
import { CATEGORIES } from "@/src/inner-game/config"

// My recommendations for each value
// Format: { [value]: { primary: boolean, reason: string, mapsTo?: string } }
const RECOMMENDATIONS: Record<string, { primary: boolean; reason: string; mapsTo?: string }> = {
  // PRES - Presence, Charisma & Social Magnetism
  "Approachability": { primary: true, reason: "Distinct, actionable" },
  "Authenticity": { primary: true, reason: "Core concept" },
  "Charisma": { primary: true, reason: "Essential" },
  "Charm": { primary: true, reason: "Different from charisma (warmer, softer)" },
  "Composure": { primary: true, reason: "Distinct from Calm (more active/social)" },
  "Directness": { primary: true, reason: "Actionable" },
  "Elegance": { primary: false, reason: "Overlaps with Style/Polish", mapsTo: "Style" },
  "Exuberance": { primary: false, reason: "Overlaps with Energy (PLAY)", mapsTo: "Energy" },
  "Flair": { primary: false, reason: "Overlaps with Style", mapsTo: "Style" },
  "Humor": { primary: true, reason: "Critical for daygame" },
  "Intrigue": { primary: true, reason: "Distinct - creating curiosity" },
  "Inviting": { primary: false, reason: "Overlaps with Warmth/Approachability", mapsTo: "Warmth" },
  "Magnetism": { primary: false, reason: "Synonym for Charisma", mapsTo: "Charisma" },
  "Mystery": { primary: true, reason: "Distinct from Intrigue (being vs creating)" },
  "Pleasantness": { primary: false, reason: "Too generic", mapsTo: "Warmth" },
  "Polish": { primary: false, reason: "Overlaps with Style", mapsTo: "Style" },
  "Presence": { primary: true, reason: "Core concept" },
  "Self-expression": { primary: true, reason: "Distinct" },
  "Social intelligence": { primary: true, reason: "Critical skill" },
  "Style": { primary: true, reason: "Personal aesthetic" },
  "Tact": { primary: true, reason: "Distinct social skill" },
  "Vulnerability": { primary: true, reason: "Core Manson concept" },
  "Warmth": { primary: true, reason: "Distinct from Charm" },
  "Wit": { primary: true, reason: "Different from Humor (quicker, sharper)" },

  // ID - Self-Worth & Identity
  "Acceptance": { primary: true, reason: "Core concept" },
  "Assurance": { primary: false, reason: "Overlaps with Confidence", mapsTo: "Confidence" },
  "Backbone": { primary: false, reason: "Overlaps with Strength/Courage", mapsTo: "Strength" },
  "Capable": { primary: true, reason: "Distinct - competence belief" },
  "Certainty": { primary: false, reason: "Overlaps with Confidence", mapsTo: "Confidence" },
  "Confidence": { primary: true, reason: "Core concept" },
  "Conviction": { primary: true, reason: "Distinct - belief strength" },
  "Dignity": { primary: true, reason: "Distinct - self-respect" },
  "Grace": { primary: true, reason: "Distinct - elegance under pressure" },
  "Groundedness": { primary: true, reason: "Distinct - stable foundation" },
  "Humility": { primary: true, reason: "Important balance to confidence" },
  "Individuality": { primary: true, reason: "Distinct - uniqueness value" },
  "Inner strength": { primary: false, reason: "Overlaps with Strength", mapsTo: "Strength" },
  "Maturity": { primary: true, reason: "Distinct - emotional development" },
  "Poise": { primary: false, reason: "Overlaps with Composure/Grace", mapsTo: "Grace" },
  "Pride": { primary: true, reason: "Distinct - healthy self-regard" },
  "Self-acceptance": { primary: false, reason: "Overlaps with Acceptance", mapsTo: "Acceptance" },
  "Self-assurance": { primary: false, reason: "Overlaps with Confidence", mapsTo: "Confidence" },
  "Self-awareness": { primary: true, reason: "Critical distinct skill" },
  "Self-esteem": { primary: false, reason: "Overlaps with Confidence/Pride", mapsTo: "Confidence" },
  "Self-possession": { primary: false, reason: "Overlaps with Composure", mapsTo: "Composure" },
  "Self-reliance": { primary: true, reason: "Distinct - independence" },
  "Self-respect": { primary: false, reason: "Overlaps with Dignity", mapsTo: "Dignity" },
  "Uniqueness": { primary: false, reason: "Overlaps with Individuality", mapsTo: "Individuality" },

  // DRIVE - Courage, Drive & Intensity
  "Action": { primary: true, reason: "Core concept - bias to act" },
  "Adventure": { primary: true, reason: "Distinct - thrill-seeking" },
  "Ambition": { primary: true, reason: "Core concept" },
  "Boldness": { primary: true, reason: "Distinct from Courage (more proactive)" },
  "Bravery": { primary: false, reason: "Synonym for Courage", mapsTo: "Courage" },
  "Challenge": { primary: true, reason: "Distinct - seeking difficulty" },
  "Courage": { primary: true, reason: "Core concept" },
  "Daring": { primary: false, reason: "Overlaps with Boldness", mapsTo: "Boldness" },
  "Decisive": { primary: true, reason: "Distinct - quick decisions" },
  "Determination": { primary: true, reason: "Core concept" },
  "Drive": { primary: true, reason: "Core concept" },
  "Endurance": { primary: true, reason: "Distinct - lasting power" },
  "Excitement": { primary: false, reason: "Overlaps with Adventure", mapsTo: "Adventure" },
  "Fearless": { primary: false, reason: "Overlaps with Courage", mapsTo: "Courage" },
  "Ferocious": { primary: false, reason: "Too aggressive/niche", mapsTo: "Intensity" },
  "Fierce": { primary: false, reason: "Overlaps with Intensity", mapsTo: "Intensity" },
  "Fortitude": { primary: false, reason: "Overlaps with Endurance/Strength", mapsTo: "Endurance" },
  "Grit": { primary: true, reason: "Distinct - perseverance + passion" },
  "Hustle": { primary: true, reason: "Distinct - scrappy urgency" },
  "Intensity": { primary: true, reason: "Distinct quality" },
  "Motivation": { primary: false, reason: "Overlaps with Drive", mapsTo: "Drive" },
  "Nerve": { primary: false, reason: "Overlaps with Courage", mapsTo: "Courage" },
  "Passion": { primary: true, reason: "Core concept" },
  "Persistence": { primary: true, reason: "Distinct from Determination (more about duration)" },
  "Proactive": { primary: false, reason: "Overlaps with Action", mapsTo: "Action" },
  "Relentless": { primary: false, reason: "Overlaps with Persistence", mapsTo: "Persistence" },
  "Resilience": { primary: true, reason: "Distinct - bouncing back" },
  "Strength": { primary: true, reason: "Core concept" },
  "Tenacity": { primary: false, reason: "Overlaps with Persistence", mapsTo: "Persistence" },
  "Toughness": { primary: false, reason: "Overlaps with Strength", mapsTo: "Strength" },
  "Valor": { primary: false, reason: "Overlaps with Courage", mapsTo: "Courage" },
  "Vigor": { primary: false, reason: "Overlaps with Energy", mapsTo: "Energy" },
  "Willpower": { primary: true, reason: "Distinct - mental strength" },

  // EMO - Emotional Regulation & Inner State
  "Balance": { primary: true, reason: "Core concept" },
  "Calm": { primary: true, reason: "Core concept" },
  "Cheerfulness": { primary: true, reason: "Distinct - positive disposition" },
  "Comfort": { primary: false, reason: "Can be limiting value", mapsTo: "Peace" },
  "Contentment": { primary: true, reason: "Distinct - satisfaction with present" },
  "Equanimity": { primary: false, reason: "Overlaps with Balance/Calm", mapsTo: "Balance" },
  "Feelings": { primary: false, reason: "Too vague", mapsTo: "Sensitivity" },
  "Gratitude": { primary: true, reason: "Core concept" },
  "Happiness": { primary: true, reason: "Core concept" },
  "Harmony": { primary: false, reason: "Overlaps with Balance/Peace", mapsTo: "Balance" },
  "Health": { primary: true, reason: "Distinct - physical wellbeing" },
  "Inner peace": { primary: false, reason: "Overlaps with Peace", mapsTo: "Peace" },
  "Lightness": { primary: true, reason: "Distinct - not taking things heavy" },
  "Mellow": { primary: false, reason: "Overlaps with Calm", mapsTo: "Calm" },
  "Mindfulness": { primary: true, reason: "Distinct practice/value" },
  "Moderation": { primary: false, reason: "Overlaps with Balance", mapsTo: "Balance" },
  "Optimism": { primary: true, reason: "Distinct - positive outlook" },
  "Patience": { primary: true, reason: "Core concept" },
  "Peace": { primary: true, reason: "Core concept" },
  "Present": { primary: false, reason: "Overlaps with Mindfulness", mapsTo: "Mindfulness" },
  "Relaxation": { primary: false, reason: "State not value", mapsTo: "Calm" },
  "Restraint": { primary: true, reason: "Distinct - holding back" },
  "Satisfaction": { primary: false, reason: "Overlaps with Contentment", mapsTo: "Contentment" },
  "Security": { primary: true, reason: "Distinct - safety need" },
  "Self-control": { primary: false, reason: "Overlaps with Restraint", mapsTo: "Restraint" },
  "Sensitivity": { primary: true, reason: "Distinct - emotional awareness" },
  "Serenity": { primary: false, reason: "Overlaps with Peace/Calm", mapsTo: "Peace" },
  "Silence": { primary: false, reason: "Niche, overlaps with Solitude", mapsTo: "Solitude" },
  "Solitude": { primary: true, reason: "Distinct - alone time value" },
  "Stability": { primary: true, reason: "Distinct - consistency" },
  "Stoicism": { primary: true, reason: "Distinct philosophy/approach" },
  "Temperance": { primary: false, reason: "Overlaps with Restraint/Moderation", mapsTo: "Restraint" },
  "Thankful": { primary: false, reason: "Overlaps with Gratitude", mapsTo: "Gratitude" },
  "Tranquility": { primary: false, reason: "Overlaps with Peace", mapsTo: "Peace" },
  "Unflappable": { primary: false, reason: "Overlaps with Composure/Calm", mapsTo: "Composure" },

  // FREE - Freedom, Power & Independence
  "Agency": { primary: true, reason: "Distinct - capacity to act" },
  "Assertiveness": { primary: true, reason: "Distinct skill" },
  "Autonomy": { primary: false, reason: "Overlaps with Independence", mapsTo: "Independence" },
  "Control": { primary: true, reason: "Distinct - being in charge" },
  "Dominance": { primary: false, reason: "Can be negative connotation", mapsTo: "Power" },
  "Empower": { primary: false, reason: "Verb form, overlaps with Power", mapsTo: "Power" },
  "Famous": { primary: false, reason: "Niche, external validation", mapsTo: "Recognition" },
  "Freedom": { primary: true, reason: "Core concept" },
  "Independence": { primary: true, reason: "Core concept" },
  "Influence": { primary: true, reason: "Distinct - soft power" },
  "Leadership": { primary: true, reason: "Core concept" },
  "Liberty": { primary: false, reason: "Overlaps with Freedom", mapsTo: "Freedom" },
  "Potency": { primary: false, reason: "Overlaps with Power", mapsTo: "Power" },
  "Power": { primary: true, reason: "Core concept" },
  "Prosperity": { primary: true, reason: "Distinct - flourishing" },
  "Recognition": { primary: true, reason: "Distinct - being seen" },
  "Risk": { primary: true, reason: "Distinct - comfort with uncertainty" },
  "Self-determination": { primary: false, reason: "Overlaps with Independence/Agency", mapsTo: "Agency" },
  "Self-direction": { primary: false, reason: "Overlaps with Independence", mapsTo: "Independence" },
  "Sovereignty": { primary: false, reason: "Overlaps with Independence/Freedom", mapsTo: "Independence" },
  "Status": { primary: true, reason: "Distinct - social standing" },
  "Success": { primary: true, reason: "Core concept" },
  "Victory": { primary: false, reason: "Overlaps with Winning/Success", mapsTo: "Winning" },
  "Wealth": { primary: true, reason: "Distinct - financial abundance" },
  "Winning": { primary: true, reason: "Distinct - competitive success" },

  // GROW - Growth, Learning & Mastery
  "Acumen": { primary: false, reason: "Overlaps with Intelligence", mapsTo: "Intelligence" },
  "Adaptability": { primary: true, reason: "Distinct - flexibility" },
  "Astuteness": { primary: false, reason: "Overlaps with Intelligence", mapsTo: "Intelligence" },
  "Awareness": { primary: true, reason: "Core concept" },
  "Brilliance": { primary: false, reason: "Overlaps with Intelligence", mapsTo: "Intelligence" },
  "Calibration": { primary: true, reason: "Critical for daygame - adjusting" },
  "Clever": { primary: true, reason: "Distinct - quick/witty thinking" },
  "Common sense": { primary: true, reason: "Distinct - practical judgment" },
  "Consciousness": { primary: false, reason: "Overlaps with Awareness", mapsTo: "Awareness" },
  "Curiosity": { primary: true, reason: "Core concept" },
  "Development": { primary: false, reason: "Overlaps with Growth", mapsTo: "Growth" },
  "Discernment": { primary: true, reason: "Distinct - good judgment" },
  "Discovery": { primary: false, reason: "Overlaps with Exploration", mapsTo: "Exploration" },
  "Experience": { primary: true, reason: "Distinct - valuing lived experience" },
  "Experimentation": { primary: true, reason: "Distinct - trial and error" },
  "Exploration": { primary: true, reason: "Distinct - seeking new" },
  "Genius": { primary: false, reason: "Overlaps with Intelligence", mapsTo: "Intelligence" },
  "Growth": { primary: true, reason: "Core concept" },
  "Improvement": { primary: false, reason: "Overlaps with Growth", mapsTo: "Growth" },
  "Innovation": { primary: true, reason: "Distinct - creating new" },
  "Inquisitive": { primary: false, reason: "Overlaps with Curiosity", mapsTo: "Curiosity" },
  "Insightful": { primary: false, reason: "Overlaps with Wisdom", mapsTo: "Wisdom" },
  "Intelligence": { primary: true, reason: "Core concept" },
  "Intuitive": { primary: true, reason: "Distinct - gut feeling" },
  "Knowledge": { primary: true, reason: "Distinct from Wisdom (facts vs understanding)" },
  "Learning": { primary: true, reason: "Core concept" },
  "Logic": { primary: true, reason: "Distinct - rational thinking" },
  "Mastery": { primary: true, reason: "Core concept" },
  "Open-mindedness": { primary: true, reason: "Distinct - receptive to new ideas" },
  "Perception": { primary: false, reason: "Overlaps with Awareness", mapsTo: "Awareness" },
  "Perceptiveness": { primary: false, reason: "Overlaps with Awareness", mapsTo: "Awareness" },
  "Perspective": { primary: true, reason: "Distinct - big picture view" },
  "Realistic": { primary: true, reason: "Distinct - grounded thinking" },
  "Reason": { primary: false, reason: "Overlaps with Logic", mapsTo: "Logic" },
  "Reflective": { primary: true, reason: "Distinct - self-examination" },
  "Reinvention": { primary: true, reason: "Distinct - transformation" },
  "Resourcefulness": { primary: true, reason: "Distinct - making do" },
  "Sagacity": { primary: false, reason: "Overlaps with Wisdom", mapsTo: "Wisdom" },
  "Savvy": { primary: false, reason: "Overlaps with Clever/Smart", mapsTo: "Smart" },
  "Self-improvement": { primary: false, reason: "Overlaps with Growth", mapsTo: "Growth" },
  "Shrewdness": { primary: false, reason: "Overlaps with Clever", mapsTo: "Clever" },
  "Skill": { primary: true, reason: "Distinct - developed ability" },
  "Smart": { primary: true, reason: "Distinct - practical/street smart" },
  "Talent": { primary: true, reason: "Distinct - natural ability" },
  "Understanding": { primary: false, reason: "Overlaps with Wisdom", mapsTo: "Wisdom" },
  "Versatility": { primary: false, reason: "Overlaps with Adaptability", mapsTo: "Adaptability" },
  "Wisdom": { primary: true, reason: "Core concept" },

  // DISC - Discipline, Structure & Performance
  "Accomplishment": { primary: true, reason: "Distinct - completed goals" },
  "Accuracy": { primary: false, reason: "Overlaps with Precision", mapsTo: "Precision" },
  "Achievement": { primary: false, reason: "Overlaps with Accomplishment", mapsTo: "Accomplishment" },
  "Alertness": { primary: false, reason: "Overlaps with Focus", mapsTo: "Focus" },
  "Careful": { primary: false, reason: "Overlaps with Thorough", mapsTo: "Thorough" },
  "Cleanliness": { primary: true, reason: "Distinct - order in environment" },
  "Clarity": { primary: true, reason: "Distinct - clear thinking/communication" },
  "Commitment": { primary: true, reason: "Core concept" },
  "Competence": { primary: true, reason: "Distinct - ability" },
  "Concentration": { primary: false, reason: "Overlaps with Focus", mapsTo: "Focus" },
  "Consistency": { primary: true, reason: "Core concept" },
  "Dedication": { primary: false, reason: "Overlaps with Commitment", mapsTo: "Commitment" },
  "Diligence": { primary: true, reason: "Distinct - careful effort" },
  "Discipline": { primary: true, reason: "Core concept" },
  "Effectiveness": { primary: true, reason: "Distinct - getting results" },
  "Efficiency": { primary: true, reason: "Distinct - optimal use of resources" },
  "Excellence": { primary: true, reason: "Core concept" },
  "Focus": { primary: true, reason: "Core concept" },
  "Hard work": { primary: true, reason: "Core concept" },
  "Methodical": { primary: false, reason: "Overlaps with Structure", mapsTo: "Structure" },
  "Meticulous": { primary: false, reason: "Overlaps with Thorough", mapsTo: "Thorough" },
  "Order": { primary: true, reason: "Distinct - organized environment" },
  "Organization": { primary: false, reason: "Overlaps with Order", mapsTo: "Order" },
  "Performance": { primary: true, reason: "Distinct - execution quality" },
  "Precision": { primary: true, reason: "Distinct - exactness" },
  "Prepared": { primary: true, reason: "Distinct - readiness" },
  "Productivity": { primary: true, reason: "Distinct - output" },
  "Professionalism": { primary: true, reason: "Distinct - professional conduct" },
  "Punctuality": { primary: true, reason: "Distinct - time respect" },
  "Quality": { primary: true, reason: "Core concept" },
  "Reliable": { primary: true, reason: "Distinct - dependable" },
  "Results-oriented": { primary: false, reason: "Overlaps with Effectiveness", mapsTo: "Effectiveness" },
  "Rigor": { primary: false, reason: "Overlaps with Discipline", mapsTo: "Discipline" },
  "Simplicity": { primary: true, reason: "Distinct - minimalism" },
  "Structure": { primary: true, reason: "Core concept" },
  "Thorough": { primary: true, reason: "Distinct - completeness" },
  "Timeliness": { primary: false, reason: "Overlaps with Punctuality", mapsTo: "Punctuality" },

  // PLAY - Play, Expression & Vitality
  "Adventurousness": { primary: false, reason: "Overlaps with Adventure (DRIVE)", mapsTo: "Adventure" },
  "Amusement": { primary: false, reason: "Overlaps with Fun", mapsTo: "Fun" },
  "Beauty": { primary: true, reason: "Distinct - aesthetic appreciation" },
  "Creation": { primary: false, reason: "Overlaps with Creativity", mapsTo: "Creativity" },
  "Creativity": { primary: true, reason: "Core concept" },
  "Delight": { primary: false, reason: "Overlaps with Joy", mapsTo: "Joy" },
  "Energy": { primary: true, reason: "Core concept" },
  "Enjoyment": { primary: false, reason: "Overlaps with Fun/Joy", mapsTo: "Fun" },
  "Enthusiasm": { primary: true, reason: "Distinct - eager excitement" },
  "Exhilaration": { primary: false, reason: "Overlaps with Excitement", mapsTo: "Adventure" },
  "Expressiveness": { primary: false, reason: "Overlaps with Self-expression", mapsTo: "Self-expression" },
  "Festivity": { primary: false, reason: "Niche", mapsTo: "Fun" },
  "Fun": { primary: true, reason: "Core concept" },
  "Imagination": { primary: true, reason: "Distinct from Creativity" },
  "Irreverent": { primary: true, reason: "Distinct - not taking seriously" },
  "Joy": { primary: true, reason: "Core concept" },
  "Levity": { primary: false, reason: "Overlaps with Lightness", mapsTo: "Lightness" },
  "Liveliness": { primary: false, reason: "Overlaps with Energy", mapsTo: "Energy" },
  "Merriment": { primary: false, reason: "Overlaps with Fun/Joy", mapsTo: "Fun" },
  "Mischief": { primary: true, reason: "Distinct - playful troublemaking" },
  "Novelty": { primary: true, reason: "Distinct - seeking new" },
  "Originality": { primary: true, reason: "Distinct - being unique" },
  "Playfulness": { primary: true, reason: "Core concept" },
  "Recreation": { primary: false, reason: "Overlaps with Fun/Play", mapsTo: "Fun" },
  "Silliness": { primary: true, reason: "Distinct - not taking self seriously" },
  "Spontaneous": { primary: true, reason: "Distinct - unplanned action" },
  "Surprise": { primary: false, reason: "Niche", mapsTo: "Spontaneous" },
  "Vitality": { primary: true, reason: "Distinct - life force" },
  "Whimsy": { primary: false, reason: "Overlaps with Playfulness", mapsTo: "Playfulness" },
  "Wonder": { primary: true, reason: "Distinct - awe/amazement" },
  "Zest": { primary: false, reason: "Overlaps with Energy/Enthusiasm", mapsTo: "Energy" },

  // SOC - Connection, Love & Belonging
  "Affection": { primary: true, reason: "Distinct - warm fondness" },
  "Altruism": { primary: true, reason: "Distinct - selfless concern" },
  "Attentive": { primary: false, reason: "Overlaps with Caring", mapsTo: "Caring" },
  "Belongingness": { primary: false, reason: "Overlaps with Connection", mapsTo: "Connection" },
  "Bonding": { primary: false, reason: "Overlaps with Connection", mapsTo: "Connection" },
  "Camaraderie": { primary: true, reason: "Distinct - friendship bond" },
  "Caring": { primary: true, reason: "Core concept" },
  "Charity": { primary: false, reason: "Overlaps with Generosity", mapsTo: "Generosity" },
  "Closeness": { primary: false, reason: "Overlaps with Intimacy", mapsTo: "Intimacy" },
  "Communication": { primary: true, reason: "Core skill" },
  "Community": { primary: true, reason: "Distinct - group belonging" },
  "Compassion": { primary: true, reason: "Core concept" },
  "Connection": { primary: true, reason: "Core concept" },
  "Contribution": { primary: true, reason: "Distinct - adding value" },
  "Cooperation": { primary: true, reason: "Distinct - working together" },
  "Cordiality": { primary: false, reason: "Overlaps with Warmth", mapsTo: "Warmth" },
  "Courtesy": { primary: true, reason: "Distinct - polite behavior" },
  "Empathy": { primary: true, reason: "Core concept" },
  "Family": { primary: true, reason: "Distinct - family bonds" },
  "Friendship": { primary: true, reason: "Core concept" },
  "Generosity": { primary: true, reason: "Core concept" },
  "Giving": { primary: false, reason: "Overlaps with Generosity", mapsTo: "Generosity" },
  "Hospitality": { primary: true, reason: "Distinct - welcoming others" },
  "Intimacy": { primary: true, reason: "Distinct - close connection" },
  "Kindness": { primary: true, reason: "Core concept" },
  "Love": { primary: true, reason: "Core concept" },
  "Loyalty": { primary: true, reason: "Core concept" },
  "Nurturing": { primary: true, reason: "Distinct - supporting growth" },
  "Openness": { primary: true, reason: "Distinct - being open with others" },
  "Rapport": { primary: false, reason: "Overlaps with Connection", mapsTo: "Connection" },
  "Relatedness": { primary: false, reason: "Overlaps with Connection", mapsTo: "Connection" },
  "Selfless": { primary: false, reason: "Overlaps with Altruism", mapsTo: "Altruism" },
  "Service": { primary: true, reason: "Distinct - helping others" },
  "Sharing": { primary: false, reason: "Overlaps with Generosity", mapsTo: "Generosity" },
  "Support": { primary: true, reason: "Distinct - backing others" },
  "Sympathy": { primary: false, reason: "Overlaps with Compassion", mapsTo: "Compassion" },
  "Teamwork": { primary: true, reason: "Distinct - group collaboration" },
  "Tenderness": { primary: false, reason: "Overlaps with Affection", mapsTo: "Affection" },
  "Thoughtful": { primary: true, reason: "Distinct - considerate" },
  "Togetherness": { primary: false, reason: "Overlaps with Connection", mapsTo: "Connection" },
  "Unity": { primary: false, reason: "Overlaps with Community", mapsTo: "Community" },
  "Welcoming": { primary: false, reason: "Overlaps with Hospitality", mapsTo: "Hospitality" },

  // ETH - Ethics, Integrity & Moral Compass
  "Accountability": { primary: true, reason: "Core concept" },
  "Candor": { primary: false, reason: "Overlaps with Honesty", mapsTo: "Honesty" },
  "Credibility": { primary: false, reason: "Overlaps with Trust", mapsTo: "Trust" },
  "Decency": { primary: true, reason: "Distinct - basic goodness" },
  "Dependability": { primary: false, reason: "Overlaps with Reliable", mapsTo: "Reliable" },
  "Discretion": { primary: true, reason: "Distinct - knowing what to share" },
  "Equality": { primary: true, reason: "Core concept" },
  "Ethical": { primary: false, reason: "Overlaps with Integrity", mapsTo: "Integrity" },
  "Fairness": { primary: true, reason: "Core concept" },
  "Fidelity": { primary: false, reason: "Overlaps with Loyalty", mapsTo: "Loyalty" },
  "Forgiveness": { primary: true, reason: "Distinct - letting go" },
  "Goodness": { primary: false, reason: "Too vague", mapsTo: "Decency" },
  "Goodwill": { primary: false, reason: "Overlaps with Kindness", mapsTo: "Kindness" },
  "Honesty": { primary: true, reason: "Core concept" },
  "Honor": { primary: true, reason: "Distinct - principled conduct" },
  "Integrity": { primary: true, reason: "Core concept" },
  "Justice": { primary: true, reason: "Core concept" },
  "Lawful": { primary: false, reason: "Too narrow/legal", mapsTo: "Justice" },
  "Nobility": { primary: false, reason: "Overlaps with Honor", mapsTo: "Honor" },
  "Ownership": { primary: true, reason: "Distinct - taking responsibility" },
  "Principled": { primary: false, reason: "Overlaps with Integrity", mapsTo: "Integrity" },
  "Prudence": { primary: true, reason: "Distinct - careful judgment" },
  "Rectitude": { primary: false, reason: "Overlaps with Integrity", mapsTo: "Integrity" },
  "Respect": { primary: true, reason: "Core concept" },
  "Responsibility": { primary: true, reason: "Core concept" },
  "Self-honesty": { primary: true, reason: "Distinct - honest with self" },
  "Sincerity": { primary: false, reason: "Overlaps with Honesty", mapsTo: "Honesty" },
  "Stewardship": { primary: true, reason: "Distinct - careful management" },
  "Sustainability": { primary: true, reason: "Distinct - long-term thinking" },
  "Tolerance": { primary: true, reason: "Distinct - accepting differences" },
  "Transparency": { primary: false, reason: "Overlaps with Honesty", mapsTo: "Honesty" },
  "Trust": { primary: true, reason: "Core concept" },
  "Truth": { primary: false, reason: "Overlaps with Honesty", mapsTo: "Honesty" },
  "Virtue": { primary: false, reason: "Too vague", mapsTo: "Integrity" },

  // PURP - Purpose, Vision & Meaning
  "Aspiration": { primary: true, reason: "Distinct - ambitious goals" },
  "Calling": { primary: true, reason: "Distinct - vocational purpose" },
  "Destiny": { primary: false, reason: "Overlaps with Purpose", mapsTo: "Purpose" },
  "Devotion": { primary: true, reason: "Distinct - deep commitment" },
  "Direction": { primary: false, reason: "Overlaps with Purpose/Vision", mapsTo: "Vision" },
  "Faith": { primary: true, reason: "Distinct - trust in larger purpose" },
  "Foresight": { primary: true, reason: "Distinct - seeing ahead" },
  "Fulfillment": { primary: true, reason: "Distinct - sense of completion" },
  "Greatness": { primary: true, reason: "Distinct - striving for exceptional" },
  "Hope": { primary: true, reason: "Core concept" },
  "Inspiring": { primary: true, reason: "Distinct - motivating others" },
  "Legacy": { primary: true, reason: "Distinct - what you leave behind" },
  "Meaning": { primary: true, reason: "Core concept" },
  "Mission": { primary: false, reason: "Overlaps with Purpose", mapsTo: "Purpose" },
  "Potential": { primary: true, reason: "Distinct - unrealized capability" },
  "Purpose": { primary: true, reason: "Core concept" },
  "Reverence": { primary: false, reason: "Overlaps with Spirituality", mapsTo: "Spirituality" },
  "Sacredness": { primary: false, reason: "Overlaps with Spirituality", mapsTo: "Spirituality" },
  "Significance": { primary: false, reason: "Overlaps with Meaning", mapsTo: "Meaning" },
  "Spirit": { primary: false, reason: "Overlaps with Spirituality", mapsTo: "Spirituality" },
  "Spirituality": { primary: true, reason: "Core concept" },
  "Traditional": { primary: true, reason: "Distinct - valuing customs" },
  "Transcendence": { primary: true, reason: "Distinct - beyond self" },
  "Vision": { primary: true, reason: "Core concept" },
}

type ValueState = {
  primary: boolean
  mapsTo: string
}

export default function ValuesCurationPage() {
  const [values, setValues] = useState<Record<string, ValueState>>(() => {
    const initial: Record<string, ValueState> = {}
    for (const cat of CATEGORIES) {
      for (const v of cat.values) {
        const rec = RECOMMENDATIONS[v]
        initial[v] = {
          primary: rec?.primary ?? true,
          mapsTo: rec?.mapsTo ?? ""
        }
      }
    }
    return initial
  })

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.code)))

  const togglePrimary = (value: string) => {
    setValues(prev => ({
      ...prev,
      [value]: { ...prev[value], primary: !prev[value].primary }
    }))
  }

  const setMapsTo = (value: string, mapsTo: string) => {
    setValues(prev => ({
      ...prev,
      [value]: { ...prev[value], mapsTo }
    }))
  }

  const toggleCategory = (code: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const getCategoryStats = (cat: typeof CATEGORIES[0]) => {
    const primary = cat.values.filter(v => values[v]?.primary).length
    const secondary = cat.values.length - primary
    return { primary, secondary, total: cat.values.length }
  }

  const getTotalStats = () => {
    let primary = 0, secondary = 0
    for (const cat of CATEGORIES) {
      const stats = getCategoryStats(cat)
      primary += stats.primary
      secondary += stats.secondary
    }
    return { primary, secondary, total: primary + secondary }
  }

  const exportConfig = () => {
    const primaryValues: Record<string, string[]> = {}
    const mappings: Record<string, string> = {}

    for (const cat of CATEGORIES) {
      primaryValues[cat.code] = cat.values.filter(v => values[v]?.primary)
      for (const v of cat.values) {
        if (!values[v]?.primary && values[v]?.mapsTo) {
          mappings[v] = values[v].mapsTo
        }
      }
    }

    const output = {
      primaryValues,
      mappings,
      stats: getTotalStats()
    }

    console.log(JSON.stringify(output, null, 2))
    navigator.clipboard.writeText(JSON.stringify(output, null, 2))
    alert("Copied to clipboard! Check console too.")
  }

  const totalStats = getTotalStats()

  // Get all primary values for mapsTo dropdown
  const allPrimaryValues = CATEGORIES.flatMap(cat =>
    cat.values.filter(v => values[v]?.primary)
  ).sort()

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Values Curation Tool</h1>
        <p className="text-gray-400 mb-6">
          Check = Primary (shown in UI). Uncheck = Secondary (inference only, maps to primary value).
        </p>

        {/* Stats bar */}
        <div className="sticky top-0 bg-gray-800 p-4 rounded-lg mb-6 flex items-center justify-between z-10">
          <div className="flex gap-6">
            <div>
              <span className="text-green-400 font-bold text-2xl">{totalStats.primary}</span>
              <span className="text-gray-400 ml-2">Primary</span>
            </div>
            <div>
              <span className="text-yellow-400 font-bold text-2xl">{totalStats.secondary}</span>
              <span className="text-gray-400 ml-2">Secondary</span>
            </div>
            <div>
              <span className="text-gray-300 font-bold text-2xl">{totalStats.total}</span>
              <span className="text-gray-400 ml-2">Total</span>
            </div>
          </div>
          <button
            onClick={exportConfig}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium"
          >
            Export Config
          </button>
        </div>

        {/* Categories */}
        {CATEGORIES.map(cat => {
          const stats = getCategoryStats(cat)
          const isExpanded = expandedCategories.has(cat.code)

          return (
            <div key={cat.code} className="mb-4">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat.code)}
                className="w-full flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: cat.color + "20", borderLeft: `4px solid ${cat.color}` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{isExpanded ? "▼" : "▶"}</span>
                  <span className="font-bold text-lg">{cat.code}</span>
                  <span className="text-gray-300">{cat.label}</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-400">{stats.primary} primary</span>
                  <span className="text-yellow-400">{stats.secondary} secondary</span>
                </div>
              </button>

              {/* Values table */}
              {isExpanded && (
                <div className="mt-2 bg-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-700 text-left text-sm">
                        <th className="p-3 w-12">Show</th>
                        <th className="p-3">Value</th>
                        <th className="p-3">Reasoning</th>
                        <th className="p-3 w-48">Maps To (if secondary)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.values.map(v => {
                        const state = values[v]
                        const rec = RECOMMENDATIONS[v]
                        return (
                          <tr
                            key={v}
                            className={`border-t border-gray-700 ${state?.primary ? "" : "bg-gray-800/50"}`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={state?.primary ?? true}
                                onChange={() => togglePrimary(v)}
                                className="w-5 h-5 accent-green-500"
                              />
                            </td>
                            <td className="p-3 font-medium">
                              {v}
                            </td>
                            <td className="p-3 text-sm text-gray-400">
                              {rec?.reason || "No recommendation"}
                            </td>
                            <td className="p-3">
                              {!state?.primary && (
                                <select
                                  value={state?.mapsTo || ""}
                                  onChange={(e) => setMapsTo(v, e.target.value)}
                                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                                >
                                  <option value="">Select...</option>
                                  {allPrimaryValues.map(pv => (
                                    <option key={pv} value={pv}>{pv}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
