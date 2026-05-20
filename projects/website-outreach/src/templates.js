function getSubject(webStatus) {
  return webStatus === 'None'
    ? "You don't exist online"
    : "Your website is working against you";
}

export function buildEmail1(opener, webStatus) {
  const lines = ['Hi there,', ''];
  if (opener) lines.push(opener, '');
  lines.push(
    'Research shows businesses without a website lose around a third of potential clients at the Google search step. Someone hears about them, searches the name, finds nothing, and calls a competitor instead.',
    '',
    'In the competitive world of Dubai real estate, where almost every client does their homework before picking up the phone, that gap compounds fast.',
    '',
    'I build clean, professional websites for boutique agencies. Quick turnarounds, no ongoing fees, you own everything.',
    '',
    'Worth a quick conversation?',
    '',
    'Adam',
  );
  return {
    subject: getSubject(webStatus),
    text: lines.join('\n'),
  };
}

export function buildEmail2(webStatus) {
  return {
    subject: `Re: ${getSubject(webStatus)}`,
    text: [
      'Hi there,',
      '',
      "Just wanted to make sure this didn't get buried.",
      '',
      'Adam',
    ].join('\n'),
  };
}

export function buildEmail3(webStatus) {
  return {
    subject: `Re: ${getSubject(webStatus)}`,
    text: [
      'Hi there,',
      '',
      "No worries if the timing isn't right. Happy to pick this up whenever it makes sense.",
      '',
      'Adam',
    ].join('\n'),
  };
}
