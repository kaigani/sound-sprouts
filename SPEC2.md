# Sound Sprouts — Phase 2 Asset Integration Spec

Goal: swap the procedural ThreeJS visuals + Web Speech audio for the new
generated assets, matching the concept art (`01 reference/concept-screen.png`,
one level up from the repo). The game logic, three modes, build mechanic, and
animations must keep working exactly as now. Do NOT change game rules or
`js/data.js`.

## New assets already on disk (do not regenerate)

- `assets/gen/tiles/<fragment>.png` — 31 glossy pre-shaded letter tiles, 512²
  RGBA, transparent bg with a faint soft drop shadow. Onsets are BLUE, rimes
  are ORANGE. Keys = ONSETS/RIMES keys in data.js (e.g. `c.png`, `at.png`).
- `assets/gen/objects/<word>.png` — 30 picture objects + `mystery.png`, 512²
  RGB on WHITE bg, pre-shaded glossy toy style. Keys = WORDS `word` values.
- `assets/gen/ui/btn-home.png btn-sound.png btn-shuffle.png btn-play.png` —
  256² RGBA round glossy buttons (cream frame).
- `assets/gen/bg.png` — full illustrated background plate (~1392×752): blue sky,
  smiling sun, clouds, green hills, trees, flowers, picket fence, and a round
  WOODEN PODIUM STAGE centered at the bottom (purple base + scalloped bunting).
- `assets/audio/<category>/<key>.m4a` + `assets/audio/manifest.json`. Categories
  and keys:
  - `fragments/<fragKey>` — spoken sound of each onset/rime (e.g. `c` = "kuh",
    `at` = "at").
  - `words/<word>` — the word said brightly ("Cat!").
  - `celebrate/<word>` — "You made cat!"
  - `prompts/<word>` — "Can you make cat?"
  - `bonus/<word>` — "Mat! That's a real word too!" (one clip, self-contained).
  - `misc/` — `silly-1`,`silly-2`,`silly-3`,`mixer-intro`,`mystery-intro`,
    `mystery-outro`,`hooray`.
  manifest.json shape:
  `{ "<category>": { "<key>": { "file": "<category>/<key>.m4a", "dur": <sec> } } }`

## 1. New module `js/audio.js` (recorded-clip player)

A small player mirroring speech.js semantics but for the recorded clips, with
Web-Speech fallback so the game still runs if a clip is missing.

- On import, fetch `assets/audio/manifest.json` (await-able `ready` promise).
  Build an HTMLAudioElement cache lazily (`new Audio(url)`), `preload="auto"`.
- `unlock()` — on first user gesture, play+immediately-pause a tiny/silent
  clip to satisfy iOS autoplay, and call `speech.unlock()` too.
- `play(category, key, { fallbackText, rate, pitch } = {})` → Promise that
  resolves when the clip ends (or on error/timeout). It is the PRIMARY channel:
  before playing, stop any currently-playing primary clip AND `speech.stop()`
  (so prompts/words don't overlap). If the manifest/clip is missing and
  `fallbackText` is given, delegate to `speech.speak(fallbackText, {rate,pitch})`.
  Use the manifest `dur` (+300ms) as a safety timeout to resolve if `ended`
  never fires. Recorded clips have a fixed voice, so `rate`/`pitch` only affect
  the Web-Speech fallback path.
- `playSeq(items, { gap = 250 })` where items = `[ [cat,key]|{cat,key,fallbackText}, ... ]`
  → plays sequentially with gaps; resolves at the end.
- `stop()` — pause/reset the active clip and `speech.stop()`.
- SFX (`js/sfx.js`, WebAudio) is a SEPARATE layer — leave it; pops/tada/etc.
  still fire alongside clips.

## 2. Rewire `js/game.js` speech call sites → recorded clips

Keep Web-Speech only where the text is arbitrary nonsense (the silly blend).
Each `speech.*` site becomes an `audio.*` call with a `fallbackText` equal to
what it used to speak:

- Tile tap in `slot()` (~L306) and `popOut()` (~L331):
  `audio.play('fragments', d.text, { fallbackText: d.spoken })`.
  (`d.text` is the fragment key; `d.spoken` is the old TTS string.)
- `speakPrompt()` — restructure the stored prompt. Add `this.prompt` descriptor
  set when a round starts:
  - guided: `{ kind:'guided', word }` → `audio.play('prompts', word, {fallbackText:'Can you make '+word+'?'})`.
  - mystery: `{ kind:'mystery', onsetKey, rimeKey }` →
    `audio.playSeq([ {cat:'misc',key:'mystery-intro'}, {cat:'fragments',key:onsetKey,fallbackText:onsetSpoken}, {cat:'fragments',key:rimeKey,fallbackText:rimeSpoken}, {cat:'misc',key:'mystery-outro'} ], {gap:300})`.
  - freeplay: `{ kind:'mixer' }` → `audio.play('misc','mixer-intro', {fallbackText:'Mix the sounds! What can you make?'})`.
  The 🔊 speaker button replays this descriptor. Keep `lastPrompt` working or
  replace it with the descriptor — your call, just keep 🔊 functional in all modes.
- Word reveal in `celebrate()` (~L368, the awaited slow word):
  `await audio.play('words', wordObj.word, { fallbackText: wordObj.word })`.
- Celebrate phrase (~L387): `audio.play('celebrate', wordObj.word, { fallbackText: fill(rand(PHRASES.celebrate),{word:wordObj.word}) })`.
- `bonus()` (~L409-410): replace the two speech calls with a single
  `await audio.play('bonus', blend, { fallbackText: fill(rand(PHRASES.bonus),{word:blend}) })`
  (the clip already says the word + phrase; drop the separate blend speak).
- `silly()` (~L420-421): the blend is arbitrary nonsense with no recording —
  keep `await speech.speak(blend, {rate:0.7})` for the blend, then
  `audio.play('misc', 'silly-'+(1..3 random), { fallbackText: fill(rand(PHRASES.silly),{blend}) })`.

Add `import * as audio from './audio.js'` to game.js and main.js. In main.js,
call `audio.unlock()` in the same first-gesture handler that calls
`speech.unlock()`, and `await audio.ready` (or just let it resolve) before/at boot
(non-blocking is fine — fallbacks cover the gap).

## 3. Tiles → textured sprite planes (`js/tiles.js`)

Replace the `RoundedBoxGeometry` + canvas-letter-texture tile body with a flat
textured plane using the pre-shaded PNG:

- `makeTile(type, key, spoken)`: load `assets/gen/tiles/<key>.png` as a
  `CanvasTexture`/`TextureLoader` texture (`SRGBColorSpace`, transparent),
  material = `MeshBasicMaterial({ map, transparent:true, depthWrite:false })`
  (art is pre-shaded — no scene light needed; MeshBasic keeps the vivid look).
  Geometry = `PlaneGeometry` sized to the current tile world size (keep the
  existing ~1.6 unit footprint so layout math is unchanged). Cache textures by
  key. Keep `userData` exactly as today (`type, text:key, spoken, slotted, busy,
  home, …`) so game.js/raycast/animations are untouched.
- Keep ALL existing animations — bob, sway, squash-stretch `bounceTile`,
  `jiggleTile`, `flyTo`, slot logic. They mutate position/scale/rotation and
  work the same on a plane. (If tiles previously relied on a box's depth for the
  raycast, ensure the plane still gets picked — it will via the mesh.)
- The tiles should face the camera (camera is head-on at z+, so a default
  +Z-facing plane is fine; do not billboard per-frame unless needed).
- Drop the per-letter canvas texture code path for tiles (no longer needed).

## 4. Picture card → generated object art (`js/tiles.js setCardContent`)

- Replace the Twemoji-SVG load with `assets/gen/objects/<word>.png` (RGB white).
  Draw it onto the existing white rounded card canvas, with the word beneath in
  big Fredoka letters, per-letter colored coral(onset)+green(rime) using
  `onsetLen` exactly as today. Mystery goal card uses `objects/mystery.png` and
  no word. Keep the spring `popCard`/`hideCard` animations and the translucent
  goal-card behavior.
- Defensive: if an object PNG fails to load, fall back to drawing the data.js
  `char` glyph (keep the existing fallback).

## 5. Background & stage (`js/scene.js`, `index.html`, `css/style.css`)

Use the illustrated plate as the scene background and REMOVE the procedural
sky-gradient, hills, clouds, and the wooden bench mesh:

- Simplest robust approach: set `assets/gen/bg.png` as a CSS background on a
  full-viewport element behind the canvas — `background-size: cover;
  background-position: center bottom;` (keeps the podium centered & visible in
  portrait and landscape). Make the WebGL renderer transparent
  (`alpha:true`, `setClearAlpha(0)`), and delete the gradient/hills/clouds
  meshes + their per-frame updates from scene.js.
- The word-build area (two slots) + picture card should sit centered in the
  lower-middle, visually over the podium. Remove the brown bench mesh (the
  podium is painted in the bg). For the two slots, render subtle soft rounded
  translucent rectangles (or faint outlined planes) as drop targets centered
  over the podium top — keep `bench.slots[0/1].world` positions so slot/flyTo
  logic is unchanged; just retune their world Y so tiles land on the podium and
  the popped card sits just above. Pixel-perfect podium registration is NOT
  required — centered placement that reads as "on the stage" is enough.
- Tiles float in their arc in the UPPER portion (as now), clearly above the
  podium. Re-verify nothing is clipped in portrait AND landscape.

## 6. HUD buttons (`index.html`/`css`/`main.js`)

Replace the emoji-glyph buttons with `<img>` (or CSS background-image) using
`assets/gen/ui/btn-*.png`: Home→btn-home, Speaker→btn-sound, Shuffle→btn-shuffle,
Again→btn-play. Keep positions, ≥64px touch targets, press feedback, and all
existing click handlers/ids. The title "Sound Sprouts 🌱" and the three menu
buttons can stay as styled DOM over the new bg (keep the menu readable — add a
soft text shadow / translucent panel if needed against the sky).

## 7. Keep the debug hook

`window.SPROUTS = { state(), tileXY() }` MUST keep working (it's used for
automated testing): `state()` → `{screen, mode, slots:{onset,rime}, lastResult}`,
`tileXY()` → array of `{label, type, x, y}` in CSS pixel canvas coords for each
active tappable tile. Update it if you move tiles, but keep the same shape.

## Acceptance

- `python3 -m http.server` → all three modes fully playable, no console errors,
  no 404s (every tile/object/ui/bg/audio path resolves; check manifest keys).
- Recorded warm voice plays for fragments, words, prompts, celebrate, bonus;
  silly still voices the nonsense blend (TTS) + recorded silly phrase.
- Visuals read like the concept: illustrated bg with podium, glossy blue/orange
  letter tiles, object picture cards, glossy round HUD buttons.
- Legible & tappable in iPad portrait and landscape; Home always escapes.
- Graceful fallback if any audio clip or object image is missing.
