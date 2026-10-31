/**
 * The Universe API's own personal-data patterns (its pii-guard middleware), reused so the game
 * refuses the same things before they could ever reach the Universe or be stored.
 */
const PII_PATTERNS: RegExp[] = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // email
  /\+?\d[\d\-\s().]{7,}\d/, // phone-like
  /\d{7,}/, // a long digit run
  /\bmy name is\b/i,
  /\bnazywam się\b/i,
  /\bi (?:live|reside) at\b/i,
  /\bmy (?:address|phone|email|password)\b/i,
  /\b\d{1,5}\s+\w+(?:\s\w+)?\s+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|way|close|court|ct)\b/i,
  /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/, // UK postcode shape
];

export const looksPersonal = (text: string) => PII_PATTERNS.some((re) => re.test(text));
