export function buildEmail1(name, opener) {
  const greeting = `Hi ${name},`;

  const lines = [greeting, ''];
  if (opener) lines.push(opener, '');
  lines.push(
    'Most businesses have more operational friction than they realise. Things quietly slowing growth, wasting time, losing opportunities. Nobody notices until it compounds.',
    '',
    "That's basically what I focus on.",
    '',
    "Not selling software. Not forcing AI into places it doesn't belong. Just finding the friction and fixing it.",
    '',
    'Have you ever taken a step back to look at where friction exists inside your business?',
    '',
    'Adam',
    'adamthor.co.uk',
  );

  return {
    subject: 'The admin trap',
    text: lines.join('\n'),
  };
}

export function buildEmail2(name) {
  return {
    subject: 'Re: The admin trap',
    text: [
      `Hi ${name},`,
      '',
      "Just wanted to make sure this didn't get buried.",
      '',
      'Adam',
    ].join('\n'),
  };
}

export function buildEmail3(name) {
  return {
    subject: 'Re: The admin trap',
    text: [
      `Hi ${name},`,
      '',
      "No worries if the timing isn't right. Happy to pick this up whenever it makes sense.",
      '',
      'Adam',
      'adamthor.co.uk',
    ].join('\n'),
  };
}
