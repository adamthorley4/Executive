// Shared name extraction used by step1 and step2.
// Returns a first name string or '' if nothing reliable found.
//
// Strategy: extract a candidate using pattern matching, then validate it against
// a known first-names allowlist. A word must be a real first name to be returned —
// we don't try to enumerate everything that isn't a name.

import FIRST_NAMES from './first-names.js';

const PATTERNS = [
  // "My name is Sarah"
  /My name is\s+([A-Z][a-z]{2,})\b/,
  // "Hi, I'm Sarah" / "I'm Sarah" / "Hi I am Sarah"
  /(?:Hi,?\s+)?I(?:'m| am)\s+([A-Z][a-z]{2,})\b/,
  // "Meet Sarah"
  /\bMeet\s+([A-Z][a-z]{2,})\b/,
  // "About Sarah Jones" as a heading — requires two capitalised words (first + last)
  /^#{1,3}\s+About\s+([A-Z][a-z]{2,})\s+[A-Z][a-z]{2,}\s*$/m,
  // "Sarah Jones is a coach/consultant/founder/mentor" — requires apparent full name
  /^([A-Z][a-z]{2,})\s+[A-Z][a-z]{2,}\s+is\s+a(?:n)?\s+(?:certified\s+)?(?:business\s+|executive\s+|life\s+|leadership\s+)?(?:coach|consultant|founder|mentor|advisor|speaker|trainer)\b/m,
  // "Sarah Jones's journey..." / "Sarah Jones' work..." — possessive full name
  /\b([A-Z][a-z]{2,})\s+[A-Z][a-z]{2,}['']s\s+/,
  // "Sarah has helped/worked/dedicated..." — lone first name as sentence subject (min 4 chars)
  /^([A-Z][a-z]{3,})\s+(?:has|is)\s+(?:made|been|worked|dedicated|committed|helped)/m,
  // © 2024 Sarah Jones
  /©\s*(?:\d{4}\s*)?([A-Z][a-z]{2,})\s+[A-Z][a-z]{2,}/,
];

function isValidCandidate(name) {
  if (!name || name.length < 2 || name.length > 20) return false;
  if (/\d/.test(name)) return false;
  return FIRST_NAMES.has(name);
}

export function isSafeName(name) {
  return isValidCandidate(name);
}

export function extractName(markdown) {
  for (const pattern of PATTERNS) {
    const match = markdown.match(pattern);
    if (!match) continue;
    const candidate = match[1];
    if (isValidCandidate(candidate)) return candidate;
  }
  return '';
}
