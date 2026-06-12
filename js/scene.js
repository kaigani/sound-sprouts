// scene.js — three.js renderer, scene, camera, garden background, resize, the
// render loop, and a tiny self-contained tween helper used everywhere else.

import * as THREE from 'three';

// ---- Easing ----------------------------------------------------------

export const Ease = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  // ease-out-back: a little overshoot, great for pops
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

// ---- Module state ----------------------------------------------------

let renderer, scene, camera;
let clouds = [];
const tweens = [];
const everyFrame = [];
let raycaster, ndc;

const SKY_TOP = new THREE.Color('#FFF7E8');
const SKY_BOT = new THREE.Color('#BDE8FF');

/**
 * Boot the renderer/scene/camera and build the garden background.
 * @param {HTMLCanvasElement} canvas
 */
export function initScene(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 12);
  camera.lookAt(0, 0, 0);

  buildBackground();
  buildLights();

  raycaster = new THREE.Raycaster();
  ndc = new THREE.Vector2();

  window.addEventListener('resize', onResize);
  onResize();

  renderer.setAnimationLoop(renderLoop);
  return { scene, camera, renderer };
}

function buildLights() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(3, 6, 6);
  scene.add(dir);
}

/** Full-screen gradient sky (background plane), hills and drifting clouds. */
function buildBackground() {
  // Gradient sky as a large plane far behind everything, lit independently.
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 4;
  skyCanvas.height = 256;
  const sctx = skyCanvas.getContext('2d');
  const grad = sctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#FFF7E8');
  grad.addColorStop(1, '#BDE8FF');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshBasicMaterial({ map: skyTex, depthWrite: false })
  );
  sky.position.set(0, 0, -20);
  sky.renderOrder = -10;
  scene.add(sky);

  // Rolling hills: two flattened domes across the bottom. They sit BEHIND the
  // play plane (z=0) and are squashed on the z-axis too, so their near surface
  // never bulges in front of the bench / cards (the original radius-16/18 spheres
  // reached z≈+10 and occluded the whole lower play area). Crests are tuned via
  // visible-plane math to land in the bottom ~15% of the screen, clearly below
  // the bench, in both portrait and landscape.
  // front: radius 14, scale (1, 0.30, 0.16) at (x, -9.04, -7) -> crest ndcy≈-0.70,
  //         near surface z = -7 + 14*0.16 ≈ -4.76 (well behind everything).
  const hillBack = makeHill('#9ED98B', 15, -9.54, -9, 0.30, 0.16);
  hillBack.position.x = -3;
  const hillFront = makeHill('#7FC96E', 14, -9.04, -7, 0.30, 0.16);
  hillFront.position.x = 3.5;
  scene.add(hillBack, hillFront);

  // Clouds: soft white blobs (merged spheres) drifting slowly.
  for (let i = 0; i < 3; i++) {
    const c = makeCloud();
    c.position.set(-10 + i * 8 + Math.random() * 3, 3 + Math.random() * 2.5, -10);
    c.userData.speed = 0.12 + Math.random() * 0.1;
    clouds.push(c);
    scene.add(c);
  }
}

function makeHill(color, radius, y, z, scaleY = 0.42, scaleZ = 1) {
  const geo = new THREE.SphereGeometry(radius, 32, 16);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 });
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(1, scaleY, scaleZ);
  m.position.set(0, y, z);
  return m;
}

function makeCloud() {
  const group = new THREE.Group();
  // Soft white clouds. With only ambient + one directional light the un-lit
  // hemisphere of each blob reads as storm-gray, so we add a strong white
  // emissive floor to keep them near-white from every angle (SPEC: soft white).
  const mat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: new THREE.Color('#fdfdff'),
    emissiveIntensity: 0.65,
    roughness: 1,
    metalness: 0,
  });
  const blobs = [
    [0, 0, 1.0],
    [-1.0, -0.2, 0.8],
    [1.0, -0.2, 0.8],
    [0.4, 0.4, 0.7],
  ];
  for (const [x, y, r] of blobs) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
    s.position.set(x, y, 0);
    group.add(s);
  }
  group.scale.setScalar(0.9);
  return group;
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// ---- Visible-plane math (fit layout to viewport at z=0) --------------

/**
 * The visible width/height of the z=0 plane in world units, given the camera.
 * Used to scale and place tiles/bench so the layout fits portrait & landscape.
 */
export function visibleSize(z = 0) {
  const dist = camera.position.z - z;
  const vH = 2 * Math.tan((camera.fov * Math.PI) / 180 / 2) * dist;
  const vW = vH * camera.aspect;
  return { width: vW, height: vH };
}

// ---- Tween system ----------------------------------------------------

/**
 * Tween numeric props on an object (e.g. position/scale/rotation sub-objects or
 * plain numbers). `props` is a flat map: { 'position.x': 1, scale: 1.2 }.
 * Supports nested dotted paths. Returns a Promise resolving on completion.
 *
 * @param {object} obj
 * @param {Record<string, number>} props
 * @param {number} ms
 * @param {(t:number)=>number} [ease]
 * @param {object} [extra] { delay, onUpdate }
 * @returns {Promise<void>}
 */
export function tween(obj, props, ms, ease = Ease.out, extra = {}) {
  return new Promise((resolve) => {
    const delay = extra.delay || 0;
    const keys = Object.keys(props);
    const t = {
      obj,
      keys,
      to: props,
      from: null,
      ms: Math.max(1, ms),
      ease,
      elapsed: -delay,
      onUpdate: extra.onUpdate,
      resolve,
      done: false,
    };
    tweens.push(t);
  });
}

function getPath(obj, path) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  return o[parts[parts.length - 1]];
}

function setPath(obj, path, val) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = val;
}

function stepTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const t = tweens[i];
    t.elapsed += dt * 1000;
    if (t.elapsed < 0) continue;
    if (!t.from) {
      t.from = {};
      for (const k of t.keys) t.from[k] = getPath(t.obj, k);
    }
    let p = t.elapsed / t.ms;
    if (p >= 1) p = 1;
    const e = t.ease(p);
    for (const k of t.keys) {
      setPath(t.obj, k, t.from[k] + (t.to[k] - t.from[k]) * e);
    }
    if (t.onUpdate) t.onUpdate(p);
    if (p >= 1) {
      t.done = true;
      tweens.splice(i, 1);
      t.resolve();
    }
  }
}

/** Register a callback run every frame with (dt, time). Returns an unsubscribe. */
export function onFrame(fn) {
  everyFrame.push(fn);
  return () => {
    const i = everyFrame.indexOf(fn);
    if (i >= 0) everyFrame.splice(i, 1);
  };
}

let lastT = 0;
let elapsedTime = 0;

function renderLoop(time) {
  const tSec = time / 1000;
  let dt = tSec - lastT;
  lastT = tSec;
  if (dt > 0.1) dt = 0.1; // clamp big gaps (tab switch)
  elapsedTime += dt;

  stepTweens(dt);

  // drift clouds, wrap around
  const half = visibleSize(-10).width / 2 + 6;
  for (const c of clouds) {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > half) c.position.x = -half;
  }

  for (const fn of everyFrame) fn(dt, elapsedTime);

  renderer.render(scene, camera);
}

// ---- Raycasting (pointerdown) ----------------------------------------

/**
 * Raycast from a client x/y against a set of meshes; returns first hit object
 * (the .userData.pickRoot if present, else the object itself), or null.
 * @param {number} clientX
 * @param {number} clientY
 * @param {THREE.Object3D[]} targets
 */
export function pick(clientX, clientY, targets) {
  ndc.x = (clientX / window.innerWidth) * 2 - 1;
  ndc.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(targets, true);
  if (!hits.length) return null;
  let o = hits[0].object;
  while (o && !o.userData.pickRoot && o.parent) o = o.parent;
  return (o && o.userData.pickRoot) ? o : hits[0].object;
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function now() { return elapsedTime; }
