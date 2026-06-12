// tiles.js — visuals for the build mechanic: rounded sound tiles with letter
// textures, the wooden bench with two slots, and the pop-in picture card.
// All meshes live in the single shared scene.

import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { getScene, tween, Ease, onFrame } from './scene.js';

// Palette (matches SPEC / data.js)
const CORAL = '#FF8A66';
const LEAF = '#7ECB66';
const BROWN = '#4A2F1F';
const WOOD = '#D9A05B';

const TILE_W = 1.6;
const TILE_H = 1.6;
const TILE_D = 0.35;
const TILE_R = 0.18;

const FONT_STACK = "'Fredoka', 'Arial Rounded MT Bold', sans-serif";

// shared rounded geometry (cheap to reuse)
let tileGeo = null;
function getTileGeo() {
  if (!tileGeo) tileGeo = new RoundedBoxGeometry(TILE_W, TILE_H, TILE_D, 4, TILE_R);
  return tileGeo;
}

// ---- Letter texture --------------------------------------------------

const letterTexCache = new Map();

/**
 * Render lowercase letters onto a canvas texture for the +Z face of a tile.
 * @param {string} text e.g. "c" or "at"
 */
function letterTexture(text) {
  if (letterTexCache.has(text)) return letterTexCache.get(text);
  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');

  // soft lighter plate so the letter reads on the colored tile
  g.fillStyle = 'rgba(255,255,255,0.0)';
  g.fillRect(0, 0, size, size);

  g.fillStyle = BROWN;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const fontSize = text.length > 1 ? 150 : 190;
  g.font = `600 ${fontSize}px ${FONT_STACK}`;
  g.fillText(text, size / 2, size / 2 + 8);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  letterTexCache.set(text, tex);
  return tex;
}

// ---- Tile ------------------------------------------------------------

/**
 * Make a sound tile.
 * @param {'onset'|'rime'} type
 * @param {string} text the spelled fragment (e.g. "c", "at")
 * @param {string} spoken the spoken string from data.js
 */
export function makeTile(type, text, spoken) {
  const color = type === 'onset' ? CORAL : LEAF;
  const group = new THREE.Group();

  const sideMat = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0 });
  const box = new THREE.Mesh(getTileGeo(), sideMat);
  group.add(box);

  // letter plate on the front face (+Z)
  const tex = letterTexture(text);
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(TILE_W * 0.92, TILE_H * 0.92),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  plate.position.z = TILE_D / 2 + 0.001;
  group.add(plate);

  group.userData = {
    pickRoot: true,
    kind: 'tile',
    type,
    text,
    spoken,
    slotted: false,
    baseScale: 1,
    phase: Math.random() * Math.PI * 2,
    home: new THREE.Vector3(),
    busy: false,
  };

  getScene().add(group);
  return group;
}

/** Place a tile's resting "home" (arc) position; it bobs around this point. */
export function setTileHome(tile, x, y, z = 0) {
  tile.userData.home.set(x, y, z);
  tile.position.set(x, y, z);
}

/** Idle bob + sway, phase-offset per tile. Driven from the render loop. */
export function startIdle(tiles) {
  return onFrame((dt, t) => {
    for (const tile of tiles) {
      const d = tile.userData;
      if (d.slotted || d.busy) continue;
      const ph = d.phase;
      tile.position.y = d.home.y + Math.sin(t * 1.6 + ph) * 0.09;
      tile.rotation.z = Math.sin(t * 1.1 + ph) * 0.05;
      tile.rotation.x = Math.sin(t * 0.9 + ph) * 0.03;
    }
  });
}

/** Squash-and-stretch tap bounce, relative to the tile's layout scale. */
export async function bounceTile(tile) {
  const s = tile.userData.baseScale || 1;
  await tween(tile.scale, { x: 1.18 * s, y: 0.82 * s, z: 1.1 * s }, 90, Ease.out);
  await tween(tile.scale, { x: 0.92 * s, y: 1.14 * s, z: 0.98 * s }, 90, Ease.out);
  await tween(tile.scale, { x: s, y: s, z: s }, 140, Ease.outBack);
}

/** Comedic jiggle for the silly response. */
export async function jiggleTile(tile) {
  const r0 = tile.rotation.z;
  for (let i = 0; i < 3; i++) {
    await tween(tile.rotation, { z: r0 + 0.35 }, 70, Ease.inOut);
    await tween(tile.rotation, { z: r0 - 0.35 }, 70, Ease.inOut);
  }
  await tween(tile.rotation, { z: r0 }, 70, Ease.inOut);
}

/**
 * Fly a tile from its current position to a target, with a gentle arc.
 * @returns {Promise<void>}
 */
export async function flyTo(tile, x, y, z = 0.2) {
  const d = tile.userData;
  d.busy = true;
  // reset idle rotation so it lands flat
  await Promise.all([
    tween(tile.position, { x, y, z }, 360, Ease.inOut),
    tween(tile.rotation, { x: 0, y: 0, z: 0 }, 360, Ease.inOut),
  ]);
  d.busy = false;
}

export function disposeTile(tile) {
  getScene().remove(tile);
  tile.traverse((o) => {
    // tile box geometry is shared (getTileGeo); plate geometry is per-tile.
    if (o.geometry && o.geometry !== tileGeo) o.geometry.dispose();
    // materials are cheap; letter textures are cached & shared across tiles,
    // so we deliberately do NOT dispose o.material.map here.
    if (o.material && !o.material.map) o.material.dispose();
  });
}

// ---- Bench + slots ---------------------------------------------------

/**
 * Build the wooden bench plank with two slot rims. Returns { group, slots:[L,R] }
 * where each slot has a world position and a `tile` ref when filled.
 */
export function makeBench(y = -2.6) {
  const group = new THREE.Group();

  const plankGeo = new RoundedBoxGeometry(5.2, 1.0, 0.5, 4, 0.22);
  const plank = new THREE.Mesh(
    plankGeo,
    new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.9, metalness: 0 })
  );
  group.add(plank);

  const slots = [];
  const slotX = [-1.25, 1.25];
  for (let i = 0; i < 2; i++) {
    // a darker inset rim to read as a "slot"
    const rim = new THREE.Mesh(
      new RoundedBoxGeometry(1.75, 1.75, 0.12, 4, 0.2),
      new THREE.MeshStandardMaterial({ color: '#C28A45', roughness: 1 })
    );
    rim.position.set(slotX[i], 0.55, 0.05);
    group.add(rim);

    const world = new THREE.Vector3(slotX[i], y + 0.55, 0.35);
    slots.push({ index: i, world, tile: null });
  }

  group.position.set(0, y, 0);
  getScene().add(group);
  return { group, slots };
}

// ---- Picture / goal card --------------------------------------------

const emojiTexCache = new Map();

/**
 * Load a Twemoji SVG into a CanvasTexture. Falls back to drawing the `char`
 * glyph if the SVG can't be fetched/decoded.
 * @param {string} codepoint e.g. "1f408"
 * @param {string} char native glyph fallback
 * @returns {Promise<THREE.CanvasTexture>}
 */
export function emojiTexture(codepoint, char) {
  const key = codepoint || char;
  if (emojiTexCache.has(key)) return Promise.resolve(emojiTexCache.get(key));

  return new Promise((resolve) => {
    const size = 512;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');

    const finishGlyph = () => {
      g.clearRect(0, 0, size, size);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `360px ${FONT_STACK}`;
      g.fillText(char || '⭐', size / 2, size / 2 + 20);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      emojiTexCache.set(key, tex);
      resolve(tex);
    };

    if (!codepoint) { finishGlyph(); return; }

    const img = new Image();
    img.onload = () => {
      g.clearRect(0, 0, size, size);
      // contain the SVG with padding
      const pad = 40;
      g.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      emojiTexCache.set(key, tex);
      resolve(tex);
    };
    img.onerror = finishGlyph;
    img.src = `./assets/twemoji/${codepoint}.svg`;
  });
}

/**
 * Compose a picture-card texture: white rounded card with the emoji image up
 * top and (optionally) the uppercase word below, per-letter coral/green.
 * @param {THREE.Texture} emojiTex
 * @param {object} [opts] { word, onsetLen, mystery }
 */
function cardTexture(emojiTex, opts = {}) {
  const W = 512;
  const H = 640;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');

  // rounded white card
  roundRect(g, 8, 8, W - 16, H - 16, 48);
  g.fillStyle = '#ffffff';
  g.fill();

  // image area
  const imgSize = 360;
  const imgX = (W - imgSize) / 2;
  const imgY = 40;
  if (emojiTex && emojiTex.image) {
    g.drawImage(emojiTex.image, imgX, imgY, imgSize, imgSize);
  }

  // the written word (the teaching moment)
  if (opts.word) {
    const word = opts.word.toUpperCase();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const fontSize = 130;
    g.font = `600 ${fontSize}px ${FONT_STACK}`;
    // measure per-letter to color onset vs rime
    const letters = word.split('');
    const widths = letters.map((ch) => g.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = W / 2 - total / 2;
    const baseY = 510;
    const onsetLen = opts.onsetLen ?? 1;
    for (let i = 0; i < letters.length; i++) {
      g.fillStyle = i < onsetLen ? CORAL : LEAF;
      g.fillText(letters[i], x + widths[i] / 2, baseY);
      x += widths[i];
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/**
 * Build a card plane mesh (hidden until popped in). Returns the mesh; set its
 * texture via setCardContent then call popCard / hideCard.
 */
export function makeCard() {
  const w = 3.2;
  const h = 4.0;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 1 })
  );
  mesh.visible = false;
  mesh.scale.setScalar(0.001);
  mesh.renderOrder = 30;
  getScene().add(mesh);
  return mesh;
}

/**
 * Set the card's picture/word content.
 * @param {THREE.Mesh} card
 * @param {object} cfg { codepoint, char, word, onsetLen, mystery }
 */
export async function setCardContent(card, cfg) {
  let emojiTex;
  if (cfg.mystery) {
    emojiTex = await emojiTexture('2753', '❓');
  } else {
    emojiTex = await emojiTexture(cfg.codepoint, cfg.char);
  }
  const tex = cardTexture(emojiTex, {
    word: cfg.mystery ? '' : cfg.word,
    onsetLen: cfg.onsetLen,
  });
  if (card.material.map) card.material.map.dispose();
  card.material.map = tex;
  card.material.needsUpdate = true;
}

/** Spring-scale + slight spin pop-in. */
export async function popCard(card, x, y, z = 1.0, scale = 1) {
  card.position.set(x, y, z);
  card.visible = true;
  card.scale.setScalar(0.001);
  card.rotation.z = -0.25;
  card.material.opacity = 1;
  await Promise.all([
    tween(card.scale, { x: scale, y: scale, z: scale }, 520, Ease.outBack),
    tween(card.rotation, { z: 0 }, 520, Ease.outBack),
  ]);
}

/** Show a small translucent goal card (guided/mystery) without spin overshoot. */
export async function showGoalCard(card, x, y, scale = 0.62) {
  card.position.set(x, y, 0.6);
  card.visible = true;
  card.scale.setScalar(0.001);
  card.rotation.z = 0;
  card.material.opacity = 0.92;
  await tween(card.scale, { x: scale, y: scale, z: scale }, 420, Ease.outBack);
}

export async function hideCard(card) {
  if (!card.visible) return;
  await Promise.all([
    tween(card.scale, { x: 0.001, y: 0.001, z: 0.001 }, 240, Ease.out),
    tween(card.material, { opacity: 0 }, 240, Ease.out),
  ]);
  card.visible = false;
}

export { TILE_W, TILE_H };
