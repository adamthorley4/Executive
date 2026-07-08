// Vertical-specific detail: the industry phrase used in Email 1, and the demo link.
const VERTICALS = {
  MAHARI:       { industry: 'luxury real estate', article: 'a',  link: 'mahari.adamthor.co.uk' },
  PELAGOS:      { industry: 'yacht charter',       article: 'a',  link: 'pelagos.adamthor.co.uk' },
  KOAN:         { industry: 'artisan product',     article: 'an', link: 'koan.adamthor.co.uk' },
  PATROL_PAWS:  { industry: 'local service',       article: 'a',  link: 'patrolpaws.co.uk' },
};

function getVertical(vertical) {
  return VERTICALS[(vertical || '').toUpperCase()] || VERTICALS.PATROL_PAWS;
}

function ukHour() {
  const hourPart = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date()).find(p => p.type === 'hour');
  return parseInt(hourPart.value, 10);
}

// name is '' when we're not 100% sure of it (see isSafeName) — greeting omits it in that case.
function greeting(name) {
  const hour = ukHour();
  const timeOfDay = hour >= 17 ? 'evening' : hour >= 12 ? 'afternoon' : 'morning';
  return `Good ${timeOfDay}${name ? ' ' + name : ''},`;
}

const SUBJECT = 'Website Concept';
const SIGNATURE = ['Adam', 'Adamthor.co.uk'];

export function buildEmail1(name, vertical) {
  const { industry, article, link } = getVertical(vertical);
  const lines = [
    greeting(name),
    '',
    "I hope you don't mind me reaching out.",
    '',
    "I'm a web designer, and I've recently been creating website concepts for different industries to demonstrate what's possible with a modern, high-converting website.",
    '',
    `I thought I'd send over my latest concept for ${article} ${industry} business, as I felt it aligned closely with what you do.`,
    '',
    'View the concept here:',
    link,
    '',
    "While it's built for a fictional brand, everything, from the layout and user journey to the functionality, is designed with businesses like yours in mind.",
    '',
    "If you've ever considered refreshing your website, I'd be happy to put together something bespoke for your business.",
    '',
    'Thanks for your time,',
    '',
    ...SIGNATURE,
  ];
  return { subject: SUBJECT, text: lines.join('\n') };
}

export function buildEmail2(name, vertical) {
  const { link } = getVertical(vertical);
  const lines = [
    greeting(name),
    '',
    'Just wanted to bump this in case it slipped through your inbox.',
    '',
    "Here's the website concept again:",
    link,
    '',
    "No pressure at all. I just thought it might give you an idea of what's possible. If you'd ever like something similar built for your business, I'd be happy to help.",
    '',
    'Thanks,',
    '',
    ...SIGNATURE,
  ];
  return { subject: SUBJECT, text: lines.join('\n') };
}

export function buildEmail3(name) {
  const lines = [
    greeting(name),
    '',
    "I'll leave this here after this email, but I just wanted to check in one last time.",
    '',
    "If a new website isn't on the cards right now, no worries at all.",
    '',
    'If it ever becomes a priority in the future, feel free to keep my details.',
    '',
    'Thanks for taking the time to read my emails, and I wish you all the best.',
    '',
    ...SIGNATURE,
  ];
  return { subject: SUBJECT, text: lines.join('\n') };
}
