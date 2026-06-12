# Sound Sprouts 🌱

A gentle ThreeJS phonics word-builder for a 4-year-old. Tap big sound tiles,
hear each sound spoken, blend them into a word, hear the word, see a picture,
get confetti. No score, no failure, no reading required to play.

Designed and tuned for **iPad Safari** (huge touch targets, immediate audio +
visual feedback on every tap), and works on desktop browsers too.

## The three modes

- 🎯 **Make a Word** — a goal picture appears; build the word from four tiles.
  "Wrong" picks usually still land on a real word, so it always feels like a win.
- ❓ **Mystery Picture** — same building, but the goal is hidden behind a `?`.
  Finish a word and the picture is revealed. The suspense is the fun part.
- 🎨 **Word Mixer** — free play. Mix four beginning sounds and three endings;
  every real picture-word you find is added to a little garden row at the top.

Every mode uses the same friendly build mechanic: tap a tile to hear its sound,
it flies to the bench, fill both slots, and the game cheers, sparkles, or makes
a silly noise — never anything negative.

## Run it locally

No build step. Just serve the folder over HTTP (ES modules need a server):

```sh
cd sound-sprouts
python3 -m http.server
```

Then open <http://localhost:8000> (use a recent Chrome/Safari/Edge).

> Open it on an iPad on the same network for the intended experience.

## Live demo

https://kaigani.github.io/sound-sprouts/

## How it works

- Plain ES modules, no framework, no bundler. Served straight from disk.
- ThreeJS (vendored locally) draws the garden, the tiles, and the picture cards.
- **All speech uses the device's built-in voices via the Web Speech API** —
  there are *no recorded voice assets* in this project. Pronunciation is tuned
  in `js/data.js` using deliberately spelled "spoken" strings (e.g. `buh`, `at`).
- Sound effects are synthesized at runtime with the Web Audio API — also no
  audio files.
- No analytics, no external links, no network requests at runtime. Everything
  is local and safe by default.

## Credits & license

Picture cards use **Twemoji** graphics. See [`ASSETS.md`](./ASSETS.md) for the
full asset manifest, sources, and the Twemoji **CC-BY 4.0** attribution line,
along with the Fredoka font license.

Built with care for one small learner. 🌱
