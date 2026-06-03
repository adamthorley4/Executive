// Shared name extraction used by step1 and step2.
// Returns a first name string or '' if nothing reliable found.

const NOT_A_NAME = new Set([
  // Business/coaching jargon
  'Business', 'Growth', 'Catalyst', 'Coach', 'Coaching', 'Consulting', 'Consultant',
  'Services', 'Solutions', 'Management', 'Leadership', 'Executive', 'Corporate',
  'Professional', 'Global', 'Digital', 'Strategic', 'Creative', 'Agency', 'Firm',
  'Academy', 'Institute', 'University', 'School', 'College', 'Center', 'Studio',
  'Organization', 'Association', 'Foundation', 'Society', 'Network', 'Community',
  // Common page/section words
  'Information', 'Contact', 'About', 'Welcome', 'Resources', 'Portfolio', 'Newsletter',
  'Subscribe', 'Download', 'Schedule', 'Calendar', 'Appointment', 'Session', 'Package',
  'Investment', 'Pricing', 'Program', 'Programs', 'Approach', 'Method', 'Framework',
  'Process', 'System', 'Journey', 'Experience', 'Results', 'Impact', 'Transformation',
  // Motivational/marketing words
  'Success', 'Achievement', 'Champion', 'Winner', 'Finisher', 'Achiever', 'Leader',
  'Expert', 'Specialist', 'Authority', 'Master', 'Power', 'Energy', 'Focus',
  'Purpose', 'Vision', 'Mission', 'Values', 'Balance', 'Wellness', 'Health', 'Wealth',
  // Determiners / pronouns / articles that slip through
  'The', 'This', 'Your', 'Our', 'My', 'We', 'All', 'Every', 'Many', 'Most',
  'Some', 'Other', 'Various', 'Different', 'Each', 'Both', 'Any', 'Few',
  // Common verbs capitalised mid-sentence or in headings
  'Join', 'Learn', 'Discover', 'Explore', 'Find', 'Get', 'Start', 'Build',
  'Transform', 'Elevate', 'Unlock', 'Achieve', 'Connect', 'Register', 'Attend',
  'Complete', 'Begin', 'Continue', 'Create', 'Improve', 'Develop', 'Work', 'Help',
  // Adjectives often capitalised
  'Free', 'Premium', 'Advanced', 'Basic', 'Special', 'Limited', 'Exclusive',
  'Certified', 'Qualified', 'Accredited', 'International', 'Independent',
]);

const PATTERNS = [
  // "Hi, I'm Sarah" / "I'm Sarah" / "Hi I am Sarah"
  /(?:Hi,?\s+)?I(?:'m| am)\s+([A-Z][a-z]{2,})\b/,
  // "Meet Sarah"
  /\bMeet\s+([A-Z][a-z]{2,})\b/,
  // "My name is Sarah"
  /My name is\s+([A-Z][a-z]{2,})\b/,
  // "About Sarah Jones" as a heading
  /^#{1,3}\s+About\s+([A-Z][a-z]{2,})\s+[A-Z][a-z]{2,}\s*$/m,
  // "Sarah Jones's journey..." / "Sarah Jones' work..." — possessive
  /\b([A-Z][a-z]{2,})\s+[A-Z][a-z]{2,}['']s\s+/,
  // "Sarah Jones is a coach/consultant/founder/mentor"
  /^([A-Z][a-z]{2,})\s+[A-Z][a-z]{2,}\s+is\s+a(?:n)?\s+(?:certified\s+)?(?:business\s+|executive\s+|life\s+|leadership\s+)?(?:coach|consultant|founder|mentor|advisor|speaker|trainer)\b/m,
  // "Sarah has helped/worked/dedicated..." — lone first name as subject (min 4 chars)
  /^([A-Z][a-z]{3,})\s+(?:has|is)\s+(?:made|been|worked|dedicated|committed|helped)/m,
  // © 2024 Sarah Jones
  /©\s*(?:\d{4}\s*)?([A-Z][a-z]{2,})\s+[A-Z][a-z]{2,}/,
];

export function extractName(markdown) {
  for (const pattern of PATTERNS) {
    const match = markdown.match(pattern);
    if (!match) continue;
    const candidate = match[1];
    // Reject if in blocklist, too long to be a first name, or contains digits
    if (NOT_A_NAME.has(candidate)) continue;
    if (candidate.length > 15) continue;
    if (/\d/.test(candidate)) continue;
    return candidate;
  }
  return '';
}
