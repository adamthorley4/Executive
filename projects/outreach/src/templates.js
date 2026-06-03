export function buildEmail1(name, opener) {
  const greeting = `Hi ${name},`;

  const lines = [greeting, ''];
  if (opener) lines.push(opener, '');
  lines.push(
    'Running a business like yours solo, most of the operational weight stays invisible until it compounds. Client intake, scheduling, follow-up sequences, proposal admin — unglamorous work that still takes real time.',
    '',
    "That's what I focus on. Not forcing AI into things that should stay human. Just finding where the drag is and cutting it.",
    '',
    'Does any of this sound familiar?',
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
      'Worked with a business coach recently who was spending close to 10 hours a week on client admin. Onboarding forms, follow-up sequences, scheduling back-and-forth. Cut it to under 90 minutes with some targeted automation.',
      '',
      'If that sounds familiar, might be worth a conversation.',
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
      "No worries if the timing isn't right. If the back-end of your business ever becomes a real problem, you know where I am.",
      '',
      'Adam',
      'adamthor.co.uk',
    ].join('\n'),
  };
}
