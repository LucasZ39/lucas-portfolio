/* ──────────────────────────────────────────────────────
   DEPARTURE — Scroll-driven plane takeoff
   Vanilla JS · single timeline driven by scroll position
   ────────────────────────────────────────────────────── */

(() => {
'use strict';

// ─────────────────────────────────────────────────────
// DOM
// ─────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const scene        = $('scene');
const sky          = $('sky');
const sun          = $('sun');
const horizon      = $('horizon');
const ground       = $('ground');
const runway       = $('runway');
const runwayStripes= $('runwayStripes');
const planeWrap    = $('planeWrap');
const plane        = $('plane');
const exhaust      = $('exhaust');
const gearFront    = $('gearFront');
const gearRear     = $('gearRear');
const stars        = $('stars');
const streaks      = $('streaks');
const progressFill = $('progressFill');
const phaseLabel   = $('phaseLabel');
const altReadout   = $('altReadout');
const scrollHint   = $('scrollHint');
const cloudFar     = $('cloudFar');
const cloudMid     = $('cloudMid');
const cloudNear    = $('cloudNear');

const heroTexts    = document.querySelectorAll('.hero-text');
const phaseTicks   = document.querySelectorAll('.phase-tick');
const personalPhotos = [...document.querySelectorAll('.photo-frame img')];

// Decode the gallery before its phase appears. Explicit decoding also forces
// browsers to paint every image without waiting for a hover-driven repaint.
let personalPhotosPrepared = false;
function preparePersonalPhotos() {
  if (personalPhotosPrepared) return;
  personalPhotosPrepared = true;

  personalPhotos.forEach(img => {
    const preload = new Image();
    preload.src = img.currentSrc || img.src;

    const decode = () => {
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {});
      }
    };

    if (img.complete) decode();
    else img.addEventListener('load', decode, { once: true });
  });
}

// ─────────────────────────────────────────────────────
// MATH HELPERS
// ─────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInCubic  = t => t * t * t;
const easeInOut    = t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;

// Map a value from one range to another, clamped, with optional easing
function map(v, inMin, inMax, outMin, outMax, ease = x => x) {
  const t = clamp((v - inMin) / (inMax - inMin), 0, 1);
  return outMin + (outMax - outMin) * ease(t);
}

// Mix two RGB colors
function mixRgb(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}
const rgb  = (r, g, b) => `rgb(${r}, ${g}, ${b})`;
const rgba = (r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${a})`;

// ─────────────────────────────────────────────────────
// SKY GRADIENT KEYFRAMES
// Color triples = [top, middle, bottom] of sky
// ─────────────────────────────────────────────────────
const SKY_FRAMES = [
  // 0.00 — predawn (boarding)
  { t: 0.00, top: [  8, 12, 38], mid: [ 26, 22, 64], bot: [ 60, 35, 75] },
  // 0.20 — first light
  { t: 0.20, top: [ 22, 26, 70], mid: [ 90, 60,110], bot: [220,135, 95] },
  // 0.45 — sunrise (during takeoff roll)
  { t: 0.45, top: [ 50, 80,150], mid: [180,150,170], bot: [255,170,110] },
  // 0.65 — bright morning (climb)
  { t: 0.65, top: [ 80,150,220], mid: [165,210,245], bot: [220,238,255] },
  // 0.85 — high altitude
  { t: 0.85, top: [ 18, 40,100], mid: [ 60,120,200], bot: [150,200,245] },
  // 1.00 — cruise twilight
  { t: 1.00, top: [  5,  8, 30], mid: [ 50, 30, 90], bot: [180, 90,140] },
];

// Sun glow and horizon glow keyframes (alpha)
const SUN_FRAMES = [
  { t: 0.00, color: 'rgba(0,0,0,0)',           top: '85%' },
  { t: 0.25, color: 'rgba(255,140, 80,0.55)',  top: '78%' },
  { t: 0.45, color: 'rgba(255,180,110,0.85)',  top: '72%' },
  { t: 0.60, color: 'rgba(255,220,170,0.45)',  top: '55%' },
  { t: 0.85, color: 'rgba(255,180,110,0.25)',  top: '35%' },
  { t: 1.00, color: 'rgba(255, 90,140,0.7)',   top: '60%' },
];

function interpSky(t) {
  // Find the two frames bracketing t
  let i = 0;
  while (i < SKY_FRAMES.length - 1 && SKY_FRAMES[i + 1].t < t) i++;
  const a = SKY_FRAMES[i], b = SKY_FRAMES[Math.min(i + 1, SKY_FRAMES.length - 1)];
  const lt = (t - a.t) / Math.max(0.0001, (b.t - a.t));
  const top = mixRgb(a.top, b.top, lt);
  const mid = mixRgb(a.mid, b.mid, lt);
  const bot = mixRgb(a.bot, b.bot, lt);
  return { top, mid, bot };
}

function interpSun(t) {
  let i = 0;
  while (i < SUN_FRAMES.length - 1 && SUN_FRAMES[i + 1].t < t) i++;
  const a = SUN_FRAMES[i], b = SUN_FRAMES[Math.min(i + 1, SUN_FRAMES.length - 1)];
  const lt = (t - a.t) / Math.max(0.0001, (b.t - a.t));
  // color is a string but we'll just step at midpoint for simplicity, blend top numerically
  const aTop = parseFloat(a.top), bTop = parseFloat(b.top);
  return {
    color: lt < 0.5 ? a.color : b.color,
    top: lerp(aTop, bTop, lt) + '%',
  };
}

// ─────────────────────────────────────────────────────
// GENERATE CLOUDS
// ─────────────────────────────────────────────────────
function svgCloud(color, opacity) {
  return `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
    <g fill="${color}" opacity="${opacity}">
      <ellipse cx="40"  cy="55" rx="30" ry="18"/>
      <ellipse cx="70"  cy="42" rx="35" ry="22"/>
      <ellipse cx="110" cy="38" rx="40" ry="26"/>
      <ellipse cx="155" cy="48" rx="32" ry="20"/>
      <ellipse cx="180" cy="58" rx="22" ry="14"/>
    </g>
  </svg>`;
}

function populateClouds(band, count, sizeRange, colorVar, baseOpacity, depth) {
  const html = [];
  for (let i = 0; i < count; i++) {
    const w = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
    const left = -10 + Math.random() * 120;  // 0..120% spread
    const top  = Math.random() * 60;
    const op   = baseOpacity * (0.6 + Math.random() * 0.5);
    const blur = depth === 'far' ? 3 : depth === 'mid' ? 1.5 : 0.5;
    const tint = depth === 'far'
      ? 'rgba(180,200,240,0.85)'
      : depth === 'mid'
        ? 'rgba(220,230,250,0.95)'
        : 'rgba(255,255,255,1)';
    html.push(
      `<div class="cloud" data-base-left="${left}" style="
         left:${left}%;
         top:${top}%;
         width:${w}px;
         height:${w * 0.4}px;
         opacity:${op};
         filter:blur(${blur}px);
      ">${svgCloud(tint, 0.95)}</div>`
    );
  }
  band.innerHTML = html.join('');
}

populateClouds(cloudFar,  10, [180, 320], 'far',  0.55, 'far');
populateClouds(cloudMid,  8,  [240, 420], 'mid',  0.7,  'mid');
populateClouds(cloudNear, 6,  [320, 560], 'near', 0.85, 'near');

// Cache cloud elements
const cloudsFar  = [...cloudFar.querySelectorAll('.cloud')];
const cloudsMid  = [...cloudMid.querySelectorAll('.cloud')];
const cloudsNear = [...cloudNear.querySelectorAll('.cloud')];

// ─────────────────────────────────────────────────────
// STARS (canvas)
// ─────────────────────────────────────────────────────
const sctx = stars.getContext('2d');
let STARS_PTS = [];
function resizeStars() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  stars.width  = Math.floor(window.innerWidth  * dpr);
  stars.height = Math.floor(window.innerHeight * dpr);
  stars.style.width  = window.innerWidth  + 'px';
  stars.style.height = window.innerHeight + 'px';
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  STARS_PTS = [];
  for (let i = 0; i < 180; i++) {
    STARS_PTS.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight * 0.7,
      r: Math.random() * 1.5 + 0.2,
      tw: Math.random() * Math.PI * 2,
    });
  }
}

// ─────────────────────────────────────────────────────
// STREAKS (canvas) — motion blur during takeoff roll
// ─────────────────────────────────────────────────────
const stctx = streaks.getContext('2d');
function resizeStreaks() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  streaks.width  = Math.floor(window.innerWidth  * dpr);
  streaks.height = Math.floor(window.innerHeight * 0.25 * dpr);
  streaks.style.width  = window.innerWidth + 'px';
  streaks.style.height = (window.innerHeight * 0.25) + 'px';
  stctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function onResize() {
  resizeStars();
  resizeStreaks();
}
window.addEventListener('resize', onResize);
onResize();

// ─────────────────────────────────────────────────────
// MAIN TIMELINE
// ─────────────────────────────────────────────────────
const STATE = { t: 0, raw: 0 };

function setSky(t) {
  const { top, mid, bot } = interpSky(t);
  sky.style.background = `linear-gradient(to bottom,
    ${rgb(...top)} 0%,
    ${rgb(...mid)} 50%,
    ${rgb(...bot)} 100%)`;

  const sn = interpSun(t);
  sun.style.background = `radial-gradient(circle at center,
    ${sn.color} 0%,
    rgba(255,120,80,0) 45%,
    transparent 70%)`;
  sun.style.top = sn.top;
}

function setStars(t) {
  // Stars visible from t > 0.78 onward
  const op = smoothstep(0.78, 0.95, t);
  stars.style.opacity = op.toFixed(3);
}

function setGround(t) {
  // Ground slides downward and tilts/shrinks once we lift off (t > 0.45)
  const lift = smoothstep(0.42, 0.62, t);     // 0..1 as we rotate + climb
  const climb = smoothstep(0.55, 0.85, t);     // continued recession
  const totalTy = lift * window.innerHeight * 0.4 + climb * window.innerHeight * 0.6;
  const scaleY  = 1 - climb * 0.6;
  ground.style.transform = `translateY(${totalTy}px) scaleY(${scaleY})`;
  ground.style.opacity = 1 - smoothstep(0.80, 0.95, t);
}

function setRunwayStripes(t) {
  // Stripes scroll left rapidly during the takeoff roll
  // Speed peaks at t ~ 0.40 and tapers as we lift off
  const speed = smoothstep(0.12, 0.42, t) * (1 - smoothstep(0.42, 0.60, t));
  STATE.stripeOffset = (STATE.stripeOffset || 0) + speed * 80;
  runwayStripes.style.backgroundPosition = `${-STATE.stripeOffset}px 0`;
}

function setHorizon(t) {
  // Horizon dips down as we climb (camera tilts up), then fades out completely.
  const climb = smoothstep(0.55, 0.95, t);
  horizon.style.bottom = (25 - climb * 12) + '%';   // dips below ground
  horizon.style.opacity = 1 - smoothstep(0.70, 0.88, t);
}

function setClouds(t) {
  // All clouds drift left slowly all the time
  // Plus a faster drift as we ascend & "fly through"
  const drift = STATE.cloudDrift = (STATE.cloudDrift || 0) + 0.05 + smoothstep(0.4, 0.95, t) * 2.2;

  // Vertical movement: clouds rise up the screen (we're climbing past them)
  const climb = smoothstep(0.5, 0.95, t);
  // Distance from camera — at boarding/taxi clouds are FAR away (high up, small).
  // As we climb, near clouds approach.
  const proximity = smoothstep(0.4, 0.9, t);

  function moveBand(els, parallax, vRise, baseY) {
    els.forEach((el, i) => {
      const baseLeft = parseFloat(el.dataset.baseLeft);
      const x = (baseLeft - drift * parallax) % 130;
      const adj = x < -20 ? x + 130 : x;
      // Push clouds high & far at boarding; let them descend toward eye-level during climb.
      const ty = baseY - vRise * (60 + (i % 3) * 20);
      el.style.transform = `translate(${adj - baseLeft}vw, ${ty}vh)`;
    });
  }

  // At low t: clouds parked high in the sky, distant and faint.
  // At climb/cruise: they envelop the scene.
  const startOffsetFar  = lerp(-22, 0, proximity);
  const startOffsetMid  = lerp(-26, 0, proximity);
  const startOffsetNear = lerp(-30, 0, proximity);

  moveBand(cloudsFar,  0.15, climb * 0.5, startOffsetFar);
  moveBand(cloudsMid,  0.40, climb * 0.9, startOffsetMid);
  moveBand(cloudsNear, 0.90, climb * 1.6, startOffsetNear);

  // Opacity: very subtle during ground phases, full during climb, fading at top of cruise.
  const groundFade = smoothstep(0.20, 0.55, t);   // 0 on ground, 1 mid-climb
  const topFade    = smoothstep(0.92, 1.00, t);   // fade slightly at cruise apex
  cloudFar.style.opacity  = (0.12 + 0.45 * groundFade) * (1 - topFade * 0.5);
  cloudMid.style.opacity  = (0.06 + 0.70 * groundFade) * (1 - topFade * 0.6);
  cloudNear.style.opacity = (0.00 + 0.90 * groundFade) * (1 - topFade * 0.7);
}

function setPlane(t) {
  // Plane motion through phases — driven entirely by t.
  // We compose a single transform.

  // Horizontal: starts at -65% (left of center), moves right then settles
  let tx;       // in pixels, relative to its default centered position
  let ty;       // in pixels
  let rot;      // degrees
  let scale = 1;

  const w = window.innerWidth;
  const h = window.innerHeight;

  if (t < 0.08) {
    // Boarding — plane parked at left of runway, visible from the start
    tx = -w * 0.40;
    ty = 0;
    rot = 0;
  } else if (t < 0.25) {
    // Taxi — slowly creeps right along runway
    const lt = smoothstep(0.08, 0.25, t);
    tx = lerp(-w * 0.40, -w * 0.30, easeInOut(lt));
    ty = 0;
    rot = 0;
  } else if (t < 0.42) {
    // Roll — accelerates down runway
    const lt = (t - 0.25) / (0.42 - 0.25);
    tx = lerp(-w * 0.30, w * 0.05, easeInCubic(lt));
    ty = 0;
    rot = 0;
  } else if (t < 0.55) {
    // Rotate — nose pitches up, slight lift
    const lt = (t - 0.42) / (0.55 - 0.42);
    tx = lerp(w * 0.05, w * 0.10, lt);
    ty = -lt * h * 0.06;
    rot = -lerp(0, 14, easeOutCubic(lt));
  } else if (t < 0.75) {
    // Climb — angled up, gaining altitude
    const lt = (t - 0.55) / (0.75 - 0.55);
    tx = lerp(w * 0.10, w * 0.05, lt);          // drifts back slightly (perspective)
    ty = lerp(-h * 0.06, -h * 0.18, easeInOut(lt));
    rot = lerp(-14, -8, lt);
    scale = lerp(1, 0.95, lt);
  } else {
    // Cruise — level out, settle center-right
    const lt = (t - 0.75) / (1.0 - 0.75);
    tx = lerp(w * 0.05, w * 0.08, lt);
    ty = lerp(-h * 0.18, -h * 0.22, lt);
    rot = lerp(-8, -3, easeOutCubic(lt));
    scale = lerp(0.95, 0.9, lt);
  }

  // Subtle vertical bob (engine vibration on roll, gentle sway in cruise)
  const time = performance.now() / 1000;
  if (t > 0.20 && t < 0.45) {
    ty += Math.sin(time * 28) * 0.6;
    tx += Math.sin(time * 19) * 0.3;
  } else if (t > 0.55) {
    ty += Math.sin(time * 1.4) * 2;
  }

  plane.style.transform =
    `translate(calc(-65% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rot}deg) scale(${scale})`;

  // Landing gear retracts at start of climb
  const gearUp = t > 0.55;
  gearFront.classList.toggle('retracted', gearUp);
  gearRear .classList.toggle('retracted', gearUp);

  // Plane shadow strength fades as we climb (less floor contact)
  const shadowAlpha = 0.5 * (1 - smoothstep(0.45, 0.85, t));
  plane.style.filter = `drop-shadow(0 ${24 - 20 * smoothstep(0.45,0.85,t)}px ${24 - 20 * smoothstep(0.45,0.85,t)}px rgba(0,0,0,${shadowAlpha.toFixed(2)}))`;
}

function setExhaust(t) {
  // Exhaust kicks on during roll, peaks at takeoff, persists during climb/cruise (smaller)
  const intensity =
    smoothstep(0.20, 0.40, t) *           // ramp up
    (1 - smoothstep(0.85, 1.0, t) * 0.3); // slight taper at the top
  const w = lerp(0, 260, intensity);
  exhaust.style.width = w + 'px';
  exhaust.style.opacity = intensity.toFixed(2);
}

function setStreaks(t) {
  // Show only during the takeoff roll
  const vis = smoothstep(0.22, 0.32, t) * (1 - smoothstep(0.45, 0.60, t));
  streaks.style.opacity = vis.toFixed(2);
  if (vis <= 0.01) return;

  const W = window.innerWidth;
  const H = window.innerHeight * 0.25;
  // Bail if the viewport hasn't reported a usable width yet (some sandboxed
  // iframes report 0 for a frame before layout settles). Avoids divide-by-zero
  // NaN in the offset math below → non-finite gradient stops → crash.
  if (W <= 0 || H <= 0) return;
  stctx.clearRect(0, 0, W, H);

  const count = 28;
  const speed = vis * 22;
  STATE.streakOffset = ((STATE.streakOffset || 0) + speed) % W;

  for (let i = 0; i < count; i++) {
    const seed = (i * 137 + 13) % 1000 / 1000;
    const y = seed * H;
    const len = 40 + (1 - seed) * 220 * vis;
    const x = (W - ((seed * W + STATE.streakOffset * (1 + seed * 2)) % (W + len)));
    if (!isFinite(x) || !isFinite(len) || len <= 0) continue;
    const alpha = 0.15 + seed * 0.35 * vis;
    const grad = stctx.createLinearGradient(x, 0, x + len, 0);
    grad.addColorStop(0, `rgba(255,235,200,0)`);
    grad.addColorStop(0.5, `rgba(255,235,200,${alpha.toFixed(2)})`);
    grad.addColorStop(1, `rgba(255,235,200,0)`);
    stctx.fillStyle = grad;
    stctx.fillRect(x, y, len, 1.5);
  }
}

function setStarsFrame() {
  if (parseFloat(stars.style.opacity) <= 0.01) return;
  const W = window.innerWidth, H = window.innerHeight;
  sctx.clearRect(0, 0, W, H);
  const time = performance.now() / 1000;
  for (const s of STARS_PTS) {
    const a = 0.4 + Math.sin(time * 1.5 + s.tw) * 0.4;
    sctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
    sctx.fillRect(s.x, s.y, s.r, s.r);
  }
}

// Phase boundaries (t values) — also used by hero text and phase tick highlighting
const PHASE_EDGES  = [0.00, 0.08, 0.22, 0.38, 0.52, 0.66, 0.82, 1.00];
const PHASE_LABELS = ['INTRO', 'EDUCATION', 'PROJECT', 'INTERNSHIP I', 'INTERNSHIP II', 'INTERNSHIP III', 'PERSONAL'];
let _lastAlt = -1;
let _lastLabel = '';

function setHero(t) {
  // Compute current phase idx for label + tick highlight
  let phaseIdx = 0;
  for (let i = 0; i < PHASE_LABELS.length; i++) {
    if (t >= PHASE_EDGES[i] && t < PHASE_EDGES[i + 1]) { phaseIdx = i; break; }
    if (t >= 1) phaseIdx = PHASE_LABELS.length - 1;
  }

  // Compute opacity per hero text directly from t (avoids transition reset on re-toggle).
  // Fade in just before the phase starts, hold full, fade out at the end.
  const fade = 0.04;
  heroTexts.forEach((el, i) => {
    const start = PHASE_EDGES[i];
    const end   = PHASE_EDGES[i + 1];
    let opacity;
    if (t < start - fade || t > end) {
      opacity = 0;
    } else if (i === 0 && t < fade) {
      // First phase — full opacity from the very start
      opacity = 1;
    } else {
      const inFade  = smoothstep(start - fade, start, t);
      const outFade = 1 - smoothstep(end - fade, end, t);
      opacity = Math.min(inFade, outFade);
    }
    el.style.opacity = opacity.toFixed(3);
    el.style.transform = `translateY(${(20 * (1 - opacity)).toFixed(1)}px)`;
    // Fully faded phases still occupy the same screen position. Hide them
    // from hit testing so their cards cannot intercept links in the active phase.
    el.style.visibility = opacity > 0.001 ? 'visible' : 'hidden';
    el.inert = opacity < 0.5;
  });

  // Phase ticks — only flip class on phase change
  if (PHASE_LABELS[phaseIdx] !== _lastLabel) {
    phaseTicks.forEach((el, i) => {
      el.classList.toggle('active', i === phaseIdx);
    });
    phaseLabel.textContent = PHASE_LABELS[phaseIdx];
    _lastLabel = PHASE_LABELS[phaseIdx];
  }

  // Altitude readout — only update when value changes
  const alt = Math.floor(smoothstep(0.50, 1.0, t) * 36000);
  if (alt !== _lastAlt) {
    altReadout.textContent = `ALT ${alt.toLocaleString()} ft`;
    _lastAlt = alt;
  }
}

function setHint(t) {
  scrollHint.classList.toggle('gone', t > 0.04);
}

function setProgress(t) {
  progressFill.style.width = (t * 100).toFixed(2) + '%';
}

// ─────────────────────────────────────────────────────
// MAIN UPDATE
// ─────────────────────────────────────────────────────
let needsRAF = false;

// Debug: ?t=0.5 freezes timeline; ?t= toggles freeze off
const _qp = new URLSearchParams(location.search);
const _fixedT = _qp.has('t') ? parseFloat(_qp.get('t')) : null;

function update() {
  needsRAF = false;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  STATE.raw = window.scrollY;
  STATE.t = _fixedT !== null && !isNaN(_fixedT)
    ? clamp(_fixedT, 0, 1)
    : clamp(STATE.raw / Math.max(1, max), 0, 1);
  const t = STATE.t;

  // Start preparing the gallery during Internship III, comfortably before
  // the Personal phase begins at t = 0.82.
  if (t >= 0.66) preparePersonalPhotos();

  setSky(t);
  setStars(t);
  setGround(t);
  setRunwayStripes(t);
  setHorizon(t);
  setClouds(t);
  setPlane(t);
  setExhaust(t);
  setStreaks(t);
  setStarsFrame();
  setHero(t);
  setHint(t);
  setProgress(t);
}

function requestUpdate() {
  if (!needsRAF) {
    needsRAF = true;
    requestAnimationFrame(update);
  }
}

window.addEventListener('scroll', update, { passive: true });
window.addEventListener('resize', () => { onResize(); update(); });

// Continuous loop is needed for time-based effects (strobe drift, stars twinkle, streaks).
// Use rAF when the tab is focused (smooth 60fps), fall back to setInterval when
// rAF is throttled (background tabs, embedded previews).
let _lastTick = performance.now();
function loop() {
  update();
  _lastTick = performance.now();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Safety net: if rAF hasn't run in 300ms (tab throttled), use a slower setInterval.
setInterval(() => {
  if (performance.now() - _lastTick > 300) {
    update();
    _lastTick = performance.now();
  }
}, 100);

// Expose for debugging (before the first update, in case any frame throws)
window.__departure = { STATE, setSky, setPlane, setHero, heroTexts, PHASE_EDGES };

// Run one update immediately so the page paints in its correct initial state
try { update(); } catch (e) { console.warn('initial update failed', e); }

})();
