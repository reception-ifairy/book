/**
 * The iFairy content profile (13+) in code: personal details are removed from the player's own
 * words before anything stores or sends them, distress is flagged for a warmer narrator and a
 * support card, and every page is linted before the player sees it.
 */

const PERSONAL: RegExp[] = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /\+?\d[\d\-\s().]{7,}\d/g,
  /\d{7,}/g,
  /\b(?:my name is|i'?m called|call me)\s+[\p{L}'-]+(?:\s+[\p{L}'-]+)?/giu,
  /\b(?:nazywam się|mam na imię)\s+[\p{L}'-]+(?:\s+[\p{L}'-]+)?/giu,
  /\bi(?:'m| am)\s+\d{1,2}(?:\s*(?:years?|yrs?)(?:\s*old)?)?\b/gi,
  /\bmam\s+\d{1,2}\s+lat(?:a)?\b/gi,
  /\b(?:i live|i reside)\s+(?:in|at|on)\s+[^,.!?]{2,40}/gi,
  /\bmieszkam\s+(?:w|we|na|przy)\s+[^,.!?]{2,40}/giu,
  /\b(?:my school is|i go to|chodzę do)\s+[^,.!?]{2,40}/giu,
  /\b\d{1,5}\s+\w+(?:\s\w+)?\s+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|way|close|court|ct)\b/gi,
  /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/g,
];

const DISTRESS = [
  /\b(?:want|wanna)\s+to\s+die\b/i, /\bkill\s+myself\b/i, /\bhurt(?:ing)?\s+myself\b/i, /\bself[-\s]?harm/i, /\bnobody\s+(?:likes|loves|cares about)\s+me\b/i,
  /\bi'?m\s+(?:so\s+)?(?:scared|afraid|sad|lonely)\b/i, /\b(?:being|getting)\s+bullied\b/i, /\bno\s*one\s+cares\b/i, /\bhate\s+my\s+life\b/i,
  /chcę\s+umrzeć/i, /zabić\s+się/i, /samookalecz/i, /nikt\s+mnie\s+nie\s+(?:lubi|kocha)/i, /boję\s+się/i, /(?:znęcają|dokuczają)\s+się\s+nade\s+mną/i, /jestem\s+(?:bardzo\s+)?(?:smutn|samotn)/i,
];

export interface Screened {
  text: string;
  privacy: boolean;
  distress: boolean;
}

/** The player's own words with personal details replaced, plus what was noticed. */
export function screenInput(text: string): Screened {
  let out = text;
  for (const re of PERSONAL) out = out.replace(re, '[personal detail removed]');
  return { text: out, privacy: out !== text, distress: DISTRESS.some((re) => re.test(text)) };
}

/** Retired source-gods (canon lock) and mythological deities the Travellers Roster excludes. */
const BANNED_NAMES = [
  'Omoikane', 'Tara', 'Moros', 'Anansi', 'Hephaestus', 'TinkerMaster', 'Zeus', 'Athena', 'Poseidon', 'Hades', 'Apollo', 'Aphrodite', 'Ares', 'Hermes', 'Kronos', 'Cronus',
  'Odin', 'Thor', 'Freyja', 'Freya', 'Loki', 'Perun', 'Veles', 'Svarog', 'Jade Emperor', 'Amaterasu', 'Ra', 'Osiris', 'Isis', 'Anubis',
];
const BANNED_RE = new RegExp(`(?<![\\p{L}])(?:${BANNED_NAMES.join('|')})(?![\\p{L}])`, 'u');
const ASKS_PERSONAL = /\b(?:what(?:'s| is) your (?:real )?(?:name|age|school|address)|how old are you|where do you (?:live|go to school)|jak (?:masz na imię|się nazywasz)|ile masz lat|gdzie mieszkasz|do jakiej szkoły)\b/i;

export interface LintInput {
  narration: string;
  narrator_aside: string;
  free_form_prompt: string;
  choices: { label: string; kind: string }[];
  ending: { type: string; title: string } | null;
}

/** Hard problems get one repair round; everything else is normalised by the page builder. */
export function lintPage(p: LintInput, depth: number): string[] {
  const issues: string[] = [];
  const text = [p.narration, p.narrator_aside, p.free_form_prompt, ...p.choices.map((c) => c.label), p.ending?.title ?? ''].join('\n');
  const banned = text.match(BANNED_RE);
  if (banned) issues.push(`"${banned[0]}" may not appear in the iFairy Universe (canon lock: the only forces are Logos, Mythos, Gnosis, Phantasia and If-AI).`);
  if (ASKS_PERSONAL.test(text)) issues.push('Never ask the player for personal details.');
  if (p.ending && depth < 4) issues.push(`Do not end the adventure yet (page ${depth + 1}); continue with two options.`);
  if (!p.ending && (p.choices.length !== 2 || p.choices[0]?.kind === p.choices[1]?.kind)) issues.push('Offer exactly two guided options, each calling on a different force.');
  return issues;
}
