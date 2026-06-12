// Sound Sprouts — phonics content data.
// All pronunciation tuning happens HERE via `spoken` strings (fed to Web Speech API),
// never in game code. Schwa forms ("buh") are deliberate: bare consonants get
// spelled out by TTS engines ("b" -> "bee").

export const ONSETS = {
  b: { spoken: 'buh' },
  c: { spoken: 'kuh' },
  d: { spoken: 'duh' },
  f: { spoken: 'fuh' },
  h: { spoken: 'huh' },
  j: { spoken: 'juh' },
  l: { spoken: 'luh' },
  m: { spoken: 'muh' },
  n: { spoken: 'nuh' },
  p: { spoken: 'puh' },
  r: { spoken: 'ruh' },
  s: { spoken: 'suh' },
  t: { spoken: 'tuh' },
  v: { spoken: 'vuh' },
  w: { spoken: 'wuh' },
};

export const RIMES = {
  at: { spoken: 'at' },
  an: { spoken: 'an' },
  ap: { spoken: 'ap' },
  ag: { spoken: 'ag' },
  og: { spoken: 'og' },
  ox: { spoken: 'ox' },
  ig: { spoken: 'ig' },
  in: { spoken: 'in' },
  en: { spoken: 'en' },
  ed: { spoken: 'ed' },
  et: { spoken: 'et' },
  eb: { spoken: 'eb' },
  un: { spoken: 'un' },
  ug: { spoken: 'ug' },
  up: { spoken: 'up' },
  us: { spoken: 'us' },
};

// Words with pictures. `emoji` is the Twemoji codepoint -> assets/twemoji/<emoji>.svg
// `char` is the native glyph (fallback rendering + dev reference).
export const WORDS = [
  { word: 'cat', onset: 'c', rime: 'at', emoji: '1f408', char: '🐈' },
  { word: 'hat', onset: 'h', rime: 'at', emoji: '1f3a9', char: '🎩' },
  { word: 'bat', onset: 'b', rime: 'at', emoji: '1f987', char: '🦇' },
  { word: 'rat', onset: 'r', rime: 'at', emoji: '1f400', char: '🐀' },
  { word: 'van', onset: 'v', rime: 'an', emoji: '1f690', char: '🚐' },
  { word: 'man', onset: 'm', rime: 'an', emoji: '1f468', char: '👨' },
  { word: 'pan', onset: 'p', rime: 'an', emoji: '1f373', char: '🍳' },
  { word: 'map', onset: 'm', rime: 'ap', emoji: '1f5fa', char: '🗺️' },
  { word: 'cap', onset: 'c', rime: 'ap', emoji: '1f9e2', char: '🧢' },
  { word: 'bag', onset: 'b', rime: 'ag', emoji: '1f45c', char: '👜' },
  { word: 'dog', onset: 'd', rime: 'og', emoji: '1f415', char: '🐕' },
  { word: 'log', onset: 'l', rime: 'og', emoji: '1fab5', char: '🪵' },
  { word: 'fox', onset: 'f', rime: 'ox', emoji: '1f98a', char: '🦊' },
  { word: 'box', onset: 'b', rime: 'ox', emoji: '1f4e6', char: '📦' },
  { word: 'pig', onset: 'p', rime: 'ig', emoji: '1f437', char: '🐷' },
  { word: 'pin', onset: 'p', rime: 'in', emoji: '1f4cc', char: '📌' },
  { word: 'hen', onset: 'h', rime: 'en', emoji: '1f414', char: '🐔' },
  { word: 'pen', onset: 'p', rime: 'en', emoji: '1f58a', char: '🖊️' },
  { word: 'ten', onset: 't', rime: 'en', emoji: '1f51f', char: '🔟' },
  { word: 'bed', onset: 'b', rime: 'ed', emoji: '1f6cf', char: '🛏️' },
  { word: 'jet', onset: 'j', rime: 'et', emoji: '2708', char: '✈️' },
  { word: 'net', onset: 'n', rime: 'et', emoji: '1f945', char: '🥅' },
  { word: 'web', onset: 'w', rime: 'eb', emoji: '1f578', char: '🕸️' },
  { word: 'sun', onset: 's', rime: 'un', emoji: '1f31e', char: '🌞' },
  { word: 'run', onset: 'r', rime: 'un', emoji: '1f3c3', char: '🏃' },
  { word: 'bug', onset: 'b', rime: 'ug', emoji: '1f41b', char: '🐛' },
  { word: 'pup', onset: 'p', rime: 'up', emoji: '1f436', char: '🐶' },
  { word: 'cup', onset: 'c', rime: 'up', emoji: '2615', char: '☕' },
  { word: 'bus', onset: 'b', rime: 'us', emoji: '1f68c', char: '🚌' },
];

// Real words a child can legitimately build from our tiles but that have no
// picture card. These get a warm "that's a real word!" response (star sparkle,
// no image) — never the silly-sound response. Curated wholesome-only.
export const BONUS_WORDS = [
  'mat', 'sat', 'pat',
  'can', 'fan', 'ran', 'tan',
  'lap', 'nap', 'tap', 'sap',
  'rag', 'tag', 'wag',
  'fog', 'hog', 'jog', 'cog', 'bog',
  'big', 'dig', 'fig', 'jig', 'wig', 'rig',
  'bin', 'fin', 'tin', 'win',
  'den', 'men',
  'red', 'fed', 'led', 'wed',
  'pet', 'vet', 'wet', 'let', 'met', 'set', 'bet',
  'fun', 'bun',
  'hug', 'mug', 'rug', 'jug', 'tug', 'dug', 'lug',
];

// Hand-curated Word Mixer (free play) tile sets. Each guarantees several
// picture words; bonus words add extra discoveries.
export const FREEPLAY_SETS = [
  { onsets: ['c', 'h', 'b', 'm'], rimes: ['at', 'ap', 'ag'] }, // cat hat bat cap map bag
  { onsets: ['d', 'l', 'p', 'b'], rimes: ['og', 'ig', 'ed'] }, // dog log pig bed (+big dig)
  { onsets: ['s', 'r', 't', 'p'], rimes: ['un', 'en', 'in'] }, // sun run ten pen pin
  { onsets: ['f', 'b', 'j', 'n'], rimes: ['ox', 'et', 'us'] }, // fox box jet net bus
];

// Spoken phrase templates. {word} / {blend} / {onset} / {rime} are substituted.
export const PHRASES = {
  celebrate: [
    'You made {word}!',
    'Hooray! {word}!',
    'Wow, you built {word}!',
    'Yay! {word}!',
  ],
  bonus: [
    '{word}! That is a real word too!',
    'Ooh, {word} is a word! Can you find one with a picture?',
  ],
  silly: [
    '{blend}! What a silly sound! Try another one.',
    'Hee hee, {blend}? That is so silly! Try again.',
  ],
  guidedPrompt: [
    'Can you make {word}?',
    'Let’s build {word}!',
  ],
  mysteryPrompt: [
    'Mystery word! Listen. {onset}. {rime}. What does it make?',
  ],
};
