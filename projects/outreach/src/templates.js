// Returns the correct template set for a given vertical
function getTemplates(vertical) {
  switch ((vertical || '').toUpperCase()) {
    case 'MAHARI':    return MAHARI;
    case 'PELAGOS':   return PELAGOS;
    case 'KOAN':      return KOAN;
    case 'PATROL_PAWS': return PATROL_PAWS;
    default:          return PATROL_PAWS; // fallback
  }
}

export function buildEmail1(name, opener, vertical) {
  const t = getTemplates(vertical);
  const greeting = `Hi ${name},`;
  const lines = [greeting, ''];
  if (opener) lines.push(opener, '');
  lines.push(...t.e1Body, '', 'Adam', 'adamthor.co.uk');
  return { subject: t.e1Subject, text: lines.join('\n') };
}

export function buildEmail2(name, vertical) {
  const t = getTemplates(vertical);
  return {
    subject: t.e2Subject,
    text: [`Hi ${name},`, '', ...t.e2Body, '', 'Adam'].join('\n'),
  };
}

export function buildEmail3(name, vertical) {
  const t = getTemplates(vertical);
  return {
    subject: t.e3Subject,
    text: [`Hi ${name},`, '', ...t.e3Body, '', 'Adam', 'adamthor.co.uk'].join('\n'),
  };
}

// -------------------------------------------------------------------
// MAHARI — Luxury Real Estate
// -------------------------------------------------------------------
const MAHARI = {
  e1Subject: "A site I built for a luxury property brand",
  e1Body: [
    'I built a cinematic scroll-driven website for an ultra-luxury real estate brand. Canvas frame scrubbing, a dawn-to-dusk hero video, a pool flyover section, an editorial property grid.',
    '',
    'The kind of site where the experience matches what\'s being sold.',
    '',
    'You can see it here: mahari.adamthor.co.uk',
    '',
    "If you'd like to see what something like this could look like for your portfolio, I'm happy to put a few ideas together.",
  ],

  e2Subject: "Re: A site I built for a luxury property brand",
  e2Body: [
    'Just circling back in case this got buried.',
    '',
    "The idea is simple: when someone arrives at a luxury property site, the first impression should feel like the property, not like a template. Mahari was built to do exactly that.",
    '',
    'Worth a conversation?',
  ],

  e3Subject: "Re: A site I built for a luxury property brand",
  e3Body: [
    "No worries if the timing isn't right. I'll leave it there.",
    '',
    'If you ever want to explore what a properly built site could look like for your portfolio, you know where I am.',
  ],
};

// -------------------------------------------------------------------
// PELAGOS — Superyacht / Luxury Marine
// -------------------------------------------------------------------
const PELAGOS = {
  e1Subject: 'A site I built for a yacht charter brand',
  e1Body: [
    'I built PELAGOS, a scroll-driven superyacht charter site with a looping cinematic hero, animated fleet statistics, a vessel explorer with interactive hotspots, and a charter waters section.',
    '',
    'It looks like the yacht, not like a booking engine.',
    '',
    'pelagos.adamthor.co.uk',
    '',
    "If it's worth exploring, I'd be happy to show you what this could look like for your business.",
  ],

  e2Subject: 'Re: A site I built for a yacht charter brand',
  e2Body: [
    'Following up in case this missed you.',
    '',
    'The gap between what most charter sites look like and what they\'re actually selling is pretty striking. PELAGOS was built to close that gap, where the site itself becomes part of the experience.',
    '',
    'Open to a quick conversation?',
  ],

  e3Subject: 'Re: A site I built for a yacht charter brand',
  e3Body: [
    "No problem if it's not the right moment. Leaving it here if you ever want to revisit.",
  ],
};

// -------------------------------------------------------------------
// KOAN — Premium Artisan / Product Brands
// -------------------------------------------------------------------
const KOAN = {
  e1Subject: 'A site I built for an artisan product brand',
  e1Body: [
    'I built KOAN, a cinematic product showcase for a Japanese artisan knife brand. Canvas scrubbing through a forge-to-blade sequence, a whetstone video section, editorial product photography, a Damascus steel feature, and a commission enquiry flow.',
    '',
    'koan.adamthor.co.uk',
    '',
    "If your product is crafted at that level, a Shopify template isn't a strategy. Happy to show you what a proper showcase could look like.",
  ],

  e2Subject: 'Re: A site I built for an artisan product brand',
  e2Body: [
    'Just following up in case this got lost.',
    '',
    "The point of KOAN is simple: when the product is the story, the website has to tell it properly. Most premium product sites don't. They just list things.",
    '',
    'Worth 15 minutes to chat?',
  ],

  e3Subject: 'Re: A site I built for an artisan product brand',
  e3Body: [
    "All good if it's not the right time. I'll leave it there.",
  ],
};

// -------------------------------------------------------------------
// PATROL_PAWS — Local Service Businesses
// -------------------------------------------------------------------
const PATROL_PAWS = {
  e1Subject: 'A site I built for a local services business',
  e1Body: [
    'I built Patrol Paws for a local dog walking company. Clean, professional, with trust signals, a services and pricing section, an FAQ, and a working contact form.',
    '',
    'Nothing over the top. Just the kind of site that converts enquiries instead of losing them.',
    '',
    'patrolpaws.co.uk',
    '',
    "If you'd like to see what a proper site could do for your bookings, happy to have a chat.",
  ],

  e2Subject: 'Re: A site I built for a local services business',
  e2Body: [
    'Just following up on this.',
    '',
    'The Patrol Paws site took a week and costs almost nothing to run. For a local service business, looking credible online is often the difference between someone booking and someone moving on to the next result.',
    '',
    "Happy to have a quick chat if it's useful.",
  ],

  e3Subject: 'Re: A site I built for a local services business',
  e3Body: [
    "No problem. I'll leave it here in case the timing works better later.",
  ],
};
