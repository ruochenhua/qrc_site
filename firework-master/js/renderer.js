import { getRecipeById } from './systems.js';

const BACKDROP_PRESETS = {
  sky: {
    midnight: { top: '#050a1a', mid: '#0f1d3d', bottom: '#1a3260', stars: 90 },
    twilight: { top: '#2a1645', mid: '#4a2b75', bottom: '#6e4299', stars: 55 },
    festival: { top: '#2a0a0a', mid: '#4a1a2a', bottom: '#1a2a50', stars: 70 },
    clear: { top: '#050a1a', mid: '#0f2448', bottom: '#1a3d66', stars: 110 },
  },
  ground: {
    village: { color: '#0b1120', roofColor: '#2a3b5a' },
    grass: { color: '#0a1812', hillColor: '#1c3628' },
    city: { color: '#0a0f1a', buildingColor: '#24304a' },
    park: { color: '#0b181f', treeColor: '#223d48' },
  },
};

const CLOUD_COUNTS = { none: 0, few: 2, scattered: 4 };

const CAMERA_PRESETS = {
  low:  { ground: 0.33, focus: 0.36 },
  mid:  { ground: 0.30, focus: 0.30 },
  high: { ground: 0.28, focus: 0.22 },
};

const GRAVITY = 0.07;
const AIR_RESISTANCE = 0.97;
const LAUNCH_INTERVAL = 1200; // ms between shells

const COLOR_HEX_MAP = {
  red: '#ff4444',
  gold: '#ffcc33',
  blue: '#4488ff',
  green: '#44ff88',
  white: '#ffffff',
  purple: '#cc66ff',
  pink: '#ff88cc',
  silver: '#ccccdd',
  multi: null,
};

function colorNameToHex(name) {
  return COLOR_HEX_MAP[name] || '#ffffff';
}

function colorsFromVector(colorVector) {
  const entries = Object.entries(colorVector || {}).filter(([, v]) => v > 0);
  if (entries.length === 0) return ['#ffffff'];
  if (entries.length === 1) return [colorNameToHex(entries[0][0])];

  entries.sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const palette = [];
  const segments = 24;
  for (const [name, weight] of entries) {
    const n = Math.max(1, Math.round((weight / total) * segments));
    const hex = colorNameToHex(name);
    for (let i = 0; i < n; i++) palette.push(hex);
  }
  return palette;
}

function activeEffects(effectsVector) {
  const set = new Set();
  for (const [name, strength] of Object.entries(effectsVector)) {
    if (strength > 0) set.add(name);
  }
  return set;
}

export class FireworkRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.shells = [];
    this.particles = [];
    this.running = false;
    this.lastTime = 0;
    this.onComplete = null;
    this._raf = null;
    this.backdrop = null;
    this._bgCanvas = null;
    this._bgDirty = true;
    this._stars = [];
    this._clouds = [];
    this._camera = {
      ground: CAMERA_PRESETS.mid.ground,
      focus: CAMERA_PRESETS.mid.focus,
      targetGround: CAMERA_PRESETS.mid.ground,
      targetFocus: CAMERA_PRESETS.mid.focus,
    };
    this._cameraInitialized = false;
    this._showMaxHeight = 0.55;
  }

  _requestFrame(cb) {
    const raf = (typeof globalThis !== 'undefined' && globalThis.requestAnimationFrame) || ((fn) => setTimeout(fn, 16));
    return raf(cb);
  }

  _cancelFrame(id) {
    const caf = (typeof globalThis !== 'undefined' && globalThis.cancelAnimationFrame) || clearTimeout;
    return caf(id);
  }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  resize() {
    if (!this.canvas) return;
    let rect = this.canvas.getBoundingClientRect ? this.canvas.getBoundingClientRect() : { width: this.canvas.width, height: this.canvas.height };
    if (!rect.width || !rect.height) {
      rect = { width: this.canvas.clientWidth || 800, height: this.canvas.clientHeight || 600 };
    }
    if (!rect.width || !rect.height) {
      rect = { width: globalThis.innerWidth || 800, height: globalThis.innerHeight || 600 };
    }
    const dpr = (typeof globalThis !== 'undefined' && globalThis.devicePixelRatio) || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    if (this.ctx && this.ctx.setTransform) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else if (this.ctx && this.ctx.scale) {
      this.ctx.scale(dpr, dpr);
    }
    this.width = rect.width;
    this.height = rect.height;
    this._bgDirty = true;
    this._cameraInitialized = false;
  }

  setBackdrop(config) {
    this.backdrop = config || null;
    this._bgDirty = true;
    this._stars = [];
    this._clouds = [];
  }

  _seededRandom(seed) {
    // Bit-mix close seeds, then run an LCG for deterministic decorative elements.
    let s = seed | 0;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s = Math.abs(s) % 233280;
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  }

  _cameraPresetForHeight(maxHeight) {
    if (maxHeight <= 0.42) return CAMERA_PRESETS.low;
    if (maxHeight <= 0.68) return CAMERA_PRESETS.mid;
    return CAMERA_PRESETS.high;
  }

  _setCameraForShow(shells) {
    const heights = shells.map(shell =>
      typeof shell.height === 'number' ? shell.height : ({ low: 0.35, mid: 0.55, high: 0.78 }[shell.height] || 0.55)
    );
    const maxHeight = Math.max(0.25, ...heights);
    this._showMaxHeight = maxHeight;
    const preset = this._cameraPresetForHeight(maxHeight);
    this._camera.targetGround = preset.ground;
    this._camera.targetFocus = preset.focus;
    if (!this._cameraInitialized) {
      this._camera.ground = preset.ground;
      this._camera.focus = preset.focus;
      this._cameraInitialized = true;
    }
  }

  _updateCamera(dt) {
    const factor = 1 - Math.exp(-dt * 0.006);
    this._camera.ground += (this._camera.targetGround - this._camera.ground) * factor;
    this._camera.focus += (this._camera.targetFocus - this._camera.focus) * factor;
  }

  _horizon() {
    return this.height * (1 - this._camera.ground);
  }

  _focusY() {
    return this.height * this._camera.focus;
  }

  _renderBackdrop(ctx, w, h) {
    if (!this.backdrop) return;
    const horizon = this._horizon();
    const { sky, ground, clouds } = this.backdrop;
    this._drawSky(ctx, w, h, horizon, sky);
    this._drawHorizonGlow(ctx, w, horizon, sky, ground);
    this._drawStars(ctx, w, horizon, sky);
    this._initClouds(w, horizon, clouds);
    this._drawClouds(ctx, w, horizon);
    this._drawGround(ctx, w, h, horizon, ground);
  }

  _renderBackground(ctx, w, h) {
    // Kept for backwards compatibility; delegates to live backdrop rendering.
    this._renderBackdrop(ctx, w, h);
  }

  _drawSky(ctx, w, h, horizon, skyKey) {
    const preset = BACKDROP_PRESETS.sky[skyKey] || BACKDROP_PRESETS.sky.midnight;
    if (!ctx.createLinearGradient) {
      ctx.fillStyle = preset.bottom;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    const grad = ctx.createLinearGradient(0, 0, 0, horizon);
    grad.addColorStop(0, preset.top);
    grad.addColorStop(0.55, preset.mid);
    grad.addColorStop(1, preset.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  _hexToRgba(hex, alpha) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  _drawHorizonGlow(ctx, w, horizon, skyKey, groundKey) {
    if (!ctx.createLinearGradient) return;
    const skyPreset = BACKDROP_PRESETS.sky[skyKey] || BACKDROP_PRESETS.sky.midnight;
    const groundPreset = BACKDROP_PRESETS.ground[groundKey] || BACKDROP_PRESETS.ground.village;
    const glow = ctx.createLinearGradient(0, horizon - 55, 0, horizon + 55);
    glow.addColorStop(0, 'rgba(255,255,255,0)');
    glow.addColorStop(0.45, this._hexToRgba(skyPreset.bottom, 0.3));
    glow.addColorStop(0.55, this._hexToRgba(groundPreset.color, 0.35));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillRect(0, horizon - 55, w, 110);
  }

  _drawStars(ctx, w, horizon, skyKey) {
    if (!ctx.fillRect) return;
    const preset = BACKDROP_PRESETS.sky[skyKey] || BACKDROP_PRESETS.sky.midnight;
    const count = preset.stars || 60;
    if (this._stars.length === 0) {
      for (let i = 0; i < count; i++) {
        const seed = i * 137;
        this._stars.push({
          x: this._seededRandom(seed) * w,
          y: this._seededRandom(seed + 1) * horizon * 0.92,
          size: 0.5 + this._seededRandom(seed + 2) * 1.5,
          phase: this._seededRandom(seed + 3) * Math.PI * 2,
        });
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const s of this._stars) {
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(Date.now() * 0.00035 + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _initClouds(w, horizon, cloudsKey) {
    const count = CLOUD_COUNTS[cloudsKey] || 0;
    if (this._clouds.length === count) return;
    this._clouds = [];
    for (let i = 0; i < count; i++) {
      const seed = i * 53 + 7;
      this._clouds.push({
        x: this._seededRandom(seed) * w,
        y: (0.05 + this._seededRandom(seed + 1) * 0.4) * horizon,
        scale: 0.5 + this._seededRandom(seed + 2) * 0.8,
        speed: 0.003 + this._seededRandom(seed + 3) * 0.005,
        opacity: 0.10 + this._seededRandom(seed + 4) * 0.12,
      });
    }
  }

  _drawClouds(ctx, w, _horizon) {
    if (!ctx.beginPath || this._clouds.length === 0) return;
    ctx.fillStyle = 'rgba(180,190,210,1)';
    for (const c of this._clouds) {
      c.x += c.speed;
      if (c.x > w + 80 * c.scale) c.x = -80 * c.scale;
      const cy = c.y;
      const base = c.x;
      const s = c.scale;
      ctx.globalAlpha = c.opacity;
      ctx.beginPath();
      ctx.arc(base, cy, 14 * s, 0, Math.PI * 2);
      ctx.arc(base + 14 * s, cy - 5 * s, 18 * s, 0, Math.PI * 2);
      ctx.arc(base + 30 * s, cy, 15 * s, 0, Math.PI * 2);
      ctx.arc(base + 18 * s, cy + 6 * s, 13 * s, 0, Math.PI * 2);
      ctx.arc(base + 6 * s, cy + 3 * s, 10 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawGround(ctx, w, h, horizon, groundKey) {
    if (!ctx.fillRect) return;
    const preset = BACKDROP_PRESETS.ground[groundKey] || BACKDROP_PRESETS.ground.village;
    const groundH = h - horizon;

    // Base ground with a subtle top-to-bottom darkening.
    if (ctx.createLinearGradient) {
      const baseGrad = ctx.createLinearGradient(0, horizon, 0, h);
      baseGrad.addColorStop(0, preset.color);
      baseGrad.addColorStop(1, '#000000');
      ctx.fillStyle = baseGrad;
    } else {
      ctx.fillStyle = preset.color;
    }
    ctx.fillRect(0, horizon, w, groundH);

    ctx.fillStyle = preset.roofColor || preset.buildingColor || preset.hillColor || preset.treeColor || preset.color;
    switch (groundKey) {
      case 'village':
        this._drawVillageGround(ctx, w, h, horizon);
        break;
      case 'grass':
        this._drawGrassGround(ctx, w, h, horizon);
        break;
      case 'city':
        this._drawCityGround(ctx, w, h, horizon);
        break;
      case 'park':
        this._drawParkGround(ctx, w, h, horizon);
        break;
      default:
        this._drawVillageGround(ctx, w, h, horizon);
    }
  }

  _drawSkyline(ctx, w, h, horizon, opts) {
    const groundH = h - horizon;
    const segments = [];
    ctx.beginPath();
    ctx.moveTo(0, h);
    let x = 0;
    let seed = opts.seed;
    let baseY = horizon + groundH * (opts.baseMin + this._seededRandom(seed) * (opts.baseMax - opts.baseMin));
    ctx.lineTo(0, baseY);
    while (x < w) {
      const width = opts.widthMin + this._seededRandom(seed + 1) * (opts.widthMax - opts.widthMin);
      const height = opts.heightMin + this._seededRandom(seed + 2) * (opts.heightMax - opts.heightMin);
      const nextX = Math.min(w, x + width);
      if (opts.peaked) {
        const peakX = x + width * (0.25 + this._seededRandom(seed + 3) * 0.5);
        const peakY = baseY - height;
        ctx.lineTo(peakX, peakY);
        ctx.lineTo(nextX, baseY);
      } else {
        const topY = baseY - height;
        ctx.lineTo(x, topY);
        ctx.lineTo(nextX, topY);
        ctx.lineTo(nextX, baseY);
      }
      segments.push({ x, y: baseY, width: nextX - x, height });
      x = nextX;
      baseY = horizon + groundH * (opts.baseMin + this._seededRandom(seed + 4) * (opts.baseMax - opts.baseMin));
      if (x < w) ctx.lineTo(x, baseY);
      seed += 7;
    }
    ctx.lineTo(w, h);
    ctx.fill();
    return segments;
  }

  _drawCottage(ctx, x, baseline, width, height) {
    // Wall.
    ctx.fillStyle = '#3d5475';
    ctx.fillRect(x, baseline - height, width, height);
    // Steep pointed roof.
    ctx.fillStyle = '#2a3c56';
    ctx.beginPath();
    ctx.moveTo(x - width * 0.1, baseline - height);
    ctx.lineTo(x + width * 0.5, baseline - height - height * 0.55);
    ctx.lineTo(x + width * 1.1, baseline - height);
    ctx.fill();
    // Warm window.
    ctx.fillStyle = 'rgba(255, 200, 85, 0.6)';
    ctx.fillRect(x + width * 0.2, baseline - height * 0.55, width * 0.22, height * 0.28);
  }

  _drawPine(ctx, x, baseY, size) {
    ctx.fillStyle = '#0c121f';
    // Trunk.
    ctx.fillRect(x - size * 0.07, baseY - size * 0.12, size * 0.14, size * 0.12);
    // Three tiers.
    ctx.beginPath();
    ctx.moveTo(x - size * 0.32, baseY - size * 0.12);
    ctx.lineTo(x, baseY - size * 0.52);
    ctx.lineTo(x + size * 0.32, baseY - size * 0.12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.26, baseY - size * 0.38);
    ctx.lineTo(x, baseY - size * 0.78);
    ctx.lineTo(x + size * 0.26, baseY - size * 0.38);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.18, baseY - size * 0.65);
    ctx.lineTo(x, baseY - size);
    ctx.lineTo(x + size * 0.18, baseY - size * 0.65);
    ctx.fill();
  }

  _drawMountainLayer(ctx, w, h, horizon, opts) {
    const groundH = h - horizon;
    ctx.fillStyle = opts.color;
    const prevAlpha = ctx.globalAlpha;
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    const overhang = opts.overhang || 100;
    const step = opts.step || 25;
    const amps = opts.amps || [0.1];
    const phases = opts.phases || amps.map(() => 0);

    const sampleY = (x) => {
      let val = opts.base;
      for (let k = 0; k < amps.length; k++) {
        const n = k + 1;
        val += amps[k] * Math.cos((x / w) * n * Math.PI + phases[k]);
      }
      return horizon - groundH * val;
    };

    ctx.beginPath();
    ctx.moveTo(-overhang, h);
    ctx.lineTo(-overhang, sampleY(-overhang));
    for (let i = -overhang; i <= w + overhang; i += step) {
      ctx.lineTo(i, sampleY(i));
    }
    ctx.lineTo(w + overhang, h);
    ctx.fill();
    ctx.globalAlpha = prevAlpha;
  }

  _drawVillageGround(ctx, w, h, horizon) {
    const groundH = h - horizon;

    // Multiple mountain ridges that rise above the horizon and exit horizontally.
    this._drawMountainLayer(ctx, w, h, horizon, {
      color: '#252f4d', alpha: 0.65, base: 0.26, amps: [0.08, 0.04, 0.02], phases: [0, 1.2, 2.5], step: 30,
    });
    this._drawMountainLayer(ctx, w, h, horizon, {
      color: '#1b243d', alpha: 0.85, base: 0.16, amps: [0.10, 0.05, 0.03], phases: [2.0, 0.5, 1.8], step: 25,
    });
    this._drawMountainLayer(ctx, w, h, horizon, {
      color: '#12182a', base: 0.06, amps: [0.12, 0.06, 0.04], phases: [1.0, 2.2, 0.5], step: 20,
    });

    // Mid rolling hill (below horizon, same smooth off-screen exit).
    this._drawMountainLayer(ctx, w, h, horizon, {
      color: '#1b263d', base: -0.48, amps: [0.06, 0.03], phases: [0.8, 2.2], step: 30, overhang: 80,
    });

    // Sparse cottages on the hill.
    let seed = 101;
    let x = 40;
    while (x < w - 40) {
      x += 90 + this._seededRandom(seed) * 200;
      if (x > w - 40) break;
      const width = 20 + this._seededRandom(seed + 1) * 24;
      const height = 16 + this._seededRandom(seed + 2) * 18;
      const baseline = horizon + groundH * (0.62 + this._seededRandom(seed + 3) * 0.04);
      this._drawCottage(ctx, x, baseline, width, height);
      seed += 10;
    }

    // Foreground pine trees.
    let tx = -20;
    seed = 201;
    while (tx < w + 20) {
      tx += 60 + this._seededRandom(seed) * 140;
      if (tx > w + 20) break;
      const size = 18 + this._seededRandom(seed + 1) * 32;
      const baseY = h - 4 - this._seededRandom(seed + 2) * 18;
      this._drawPine(ctx, tx, baseY, size);
      seed += 5;
    }
  }

  _drawGrassGround(ctx, w, h, horizon) {
    const groundH = h - horizon;
    const layers = [
      { color: '#0d1c13', offset: -0.05, amp: 0.10 },
      { color: '#142b1e', offset: 0.15, amp: 0.14 },
      { color: '#1e3f2e', offset: 0.40, amp: 0.18 },
    ];
    for (const layer of layers) {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, horizon + groundH * layer.offset);
      for (let i = 0; i <= w; i += 30) {
        const y = horizon + groundH * (layer.offset + layer.amp * Math.sin(i * 0.007 + layer.offset * 12));
        ctx.lineTo(i, y);
      }
      ctx.lineTo(w, h);
      ctx.fill();
    }
  }

  _drawCityGround(ctx, w, h, horizon) {
    const groundH = h - horizon;

    // Distant skyline (rises above horizon to hide the straight line).
    ctx.fillStyle = '#131a2b';
    this._drawSkyline(ctx, w, h, horizon, {
      seed: 31,
      baseMin: -0.05,
      baseMax: 0.10,
      heightMin: 15,
      heightMax: groundH * 0.55,
      widthMin: 28,
      widthMax: 64,
      peaked: false,
    });

    // Near skyline.
    ctx.fillStyle = '#2b3d5a';
    const buildings = this._drawSkyline(ctx, w, h, horizon, {
      seed: 131,
      baseMin: 0.25,
      baseMax: 0.55,
      heightMin: 22,
      heightMax: groundH * 0.85,
      widthMin: 24,
      widthMax: 72,
      peaked: false,
    });

    // Lit windows.
    ctx.fillStyle = 'rgba(255, 215, 110, 0.45)';
    let seed = 231;
    for (const b of buildings) {
      if (this._seededRandom(seed) > 0.2) {
        const cols = Math.max(1, Math.floor(b.width / 8));
        const rows = Math.max(1, Math.floor(b.height / 14));
        for (let r = 1; r < rows; r++) {
          for (let c = 1; c < cols; c++) {
            if (this._seededRandom(seed + r * cols + c) > 0.62) {
              ctx.fillRect(b.x + c * 6, b.y - r * 11, 3, 5);
            }
          }
        }
      }
      seed += 7;
    }
  }

  _drawParkGround(ctx, w, h, horizon) {
    const groundH = h - horizon;

    // Rolling hill (rises above horizon).
    ctx.fillStyle = '#132b21';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, horizon - groundH * 0.05);
    for (let i = 0; i <= w; i += 40) {
      const y = horizon + groundH * (-0.05 + 0.12 * Math.sin(i * 0.008) + 0.07 * Math.sin(i * 0.022));
      ctx.lineTo(i, y);
    }
    ctx.lineTo(w, h);
    ctx.fill();

    // Tree silhouettes.
    ctx.fillStyle = '#1d4031';
    let x = 0;
    let seed = 41;
    while (x < w) {
      x += 40 + this._seededRandom(seed) * 90;
      if (x > w) break;
      const trunkW = 3 + this._seededRandom(seed + 1) * 4;
      const trunkH = 10 + this._seededRandom(seed + 2) * 18;
      const foliageR = 12 + this._seededRandom(seed + 3) * 20;
      const baseY = horizon + groundH * (0.30 + this._seededRandom(seed + 4) * 0.45);
      ctx.fillRect(x - trunkW * 0.5, baseY - trunkH, trunkW, trunkH);
      ctx.beginPath();
      ctx.arc(x, baseY - trunkH - foliageR * 0.35, foliageR, 0, Math.PI * 2);
      ctx.fill();
      seed += 5;
    }
  }

  playShow(show, onComplete) {
    if (!this.canvas || !this.ctx) return;
    this.stop();
    this.running = true;
    this.onComplete = onComplete;
    this.shells = [];
    this.particles = [];
    this._pendingSecondary = [];
    this._startTime = null;
    const now = (typeof globalThis !== 'undefined' && globalThis.performance && globalThis.performance.now) ? globalThis.performance.now() : Date.now();
    this.lastTime = now;

    const shells = show.map(item => {
      if (typeof item === 'string') return getRecipeById(item);
      return item;
    }).filter(Boolean);
    this._setCameraForShow(shells);
    this._scheduleShells(shells);

    this._raf = this._requestFrame(t => this._loop(t));
  }

  stop() {
    this.running = false;
    if (this._raf) this._cancelFrame(this._raf);
    this._raf = null;
    if (this._previewInterval) {
      clearInterval(this._previewInterval);
      this._previewInterval = null;
    }
    if (this._ambientInterval) {
      clearInterval(this._ambientInterval);
      this._ambientInterval = null;
    }
  }

  startPreview(shell) {
    if (!this.canvas || !this.ctx) return;
    this.stop();
    this.running = true;
    this.shells = [];
    this.particles = [];
    this._pendingSecondary = [];
    this._startTime = null;
    this._showDuration = Infinity;
    this._previewShell = shell;
    const now = (typeof globalThis !== 'undefined' && globalThis.performance && globalThis.performance.now) ? globalThis.performance.now() : Date.now();
    this.lastTime = now;
    this._launch(shell);
    this._previewInterval = setInterval(() => {
      if (this.running) this._launch(shell);
    }, 1400);
    this._raf = this._requestFrame(t => this._loop(t));
  }

  preview(shell) {
    this.startPreview(shell);
  }

  startAmbient() {
    if (!this.canvas || !this.ctx) return;
    this.stop();
    this.running = true;
    this.shells = [];
    this.particles = [];
    this._pendingSecondary = [];
    this._startTime = null;
    this._showDuration = Infinity;
    this._previewShell = null;
    this.setBackdrop(null);

    const colors = ['red', 'gold', 'blue', 'green', 'purple', 'pink', 'silver', 'white'];
    const shapes = ['peony', 'chrysanthemum', 'willow', 'ring', 'heart', 'star', 'palm'];

    const launchOne = () => {
      if (!this.running) return;
      const shell = {
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        height: 0.22 + Math.random() * 0.30,
        effects: {},
      };
      this._launch(shell);
    };

    launchOne();
    this._ambientInterval = setInterval(launchOne, 2200 + Math.floor(Math.random() * 2600));

    const now = (typeof globalThis !== 'undefined' && globalThis.performance && globalThis.performance.now) ? globalThis.performance.now() : Date.now();
    this.lastTime = now;
    this._raf = this._requestFrame(t => this._loop(t));
  }

  _scheduleShells(shells) {
    let delay = 0;
    for (const shell of shells) {
      setTimeout(() => {
        if (this.running) this._launch(shell);
      }, delay);
      delay += LAUNCH_INTERVAL;
    }
    this._showDuration = delay + 2500;
  }

  _launch(shell) {
    const startX = this.width * (0.2 + Math.random() * 0.6);
    const startY = this.height;
    const heightValue = typeof shell.height === 'number' ? shell.height : { low: 0.35, mid: 0.55, high: 0.78 }[shell.height] || 0.55;

    let targetY;
    if (this._previewShell) {
      const topMargin = 0.06;
      targetY = this.height * (1 - heightValue * (1 - topMargin));
    } else {
      const horizonY = this._horizon();
      const focusY = this._focusY();
      const maxH = Math.max(0.25, this._showMaxHeight);
      const ratio = Math.min(1, heightValue / maxH);
      targetY = horizonY - ratio * Math.max(0, horizonY - focusY);
    }

    const frames = 40 + Math.random() * 15;
    const vy = (targetY - startY) / frames;
    const duration = frames;
    const vx = (Math.random() - 0.5) * 0.5;

    this.shells.push({
      x: startX,
      y: startY,
      vx,
      vy,
      targetY,
      recipe: shell,
      age: 0,
      maxAge: duration,
      trail: shell.effects && shell.effects.tail ? true : (typeof shell.effect === 'string' && shell.effect.includes('tail')),
      history: [],
    });
  }

  _explode(shell, isSecondary = false) {
    const recipe = shell.recipe;
    const attr = isSecondary && recipe.secondaryAttr ? recipe.secondaryAttr : recipe;
    let colors;
    if (typeof recipe.color === 'string') {
      colors = parseColors(recipe.color);
    } else {
      colors = colorsFromVector(attr.color || recipe.color);
    }

    const shape = recipe.shape || 'peony';
    const shapeInfo = getShapeInfo(shape);

    const scale = typeof attr.scale === 'number' ? 0.5 + attr.scale * 1.5 : 1.2;
    const density = typeof attr.density === 'number' ? 0.3 + attr.density * 1.2 : 1.0;
    const count = Math.max(12, Math.floor(getParticleCount(shape) * scale * density));

    const duration = typeof attr.duration === 'number' ? attr.duration : 0.5;
    const life = Math.floor(40 + duration * 120);

    const effects = activeEffects(attr.effects || {});
    if (typeof recipe.effect === 'string') effects.add(recipe.effect);

    for (let i = 0; i < count; i++) {
      const angle = shapeInfo.angle(i, count);
      const speed = shapeInfo.speed(i, count) * scale;
      const v = shapeInfo.velocity(angle, speed);
      this.particles.push({
        x: shell.x,
        y: shell.y,
        vx: v.vx,
        vy: v.vy,
        life,
        maxLife: life,
        color: colors[i % colors.length],
        effect: effects,
        size: 1.5 + Math.random(),
        history: [],
        gravityScale: shapeInfo.gravityScale || 1,
      });
    }

    if (effects.has('bouquet')) {
      for (let j = 0; j < 5; j++) {
        const bx = shell.x + (Math.random() - 0.5) * 40;
        const by = shell.y + (Math.random() - 0.5) * 40;
        for (let i = 0; i < 18; i++) {
          const angle = (Math.PI * 2 * i) / 18;
          const speed = 1 + Math.random();
          this.particles.push({
            x: bx,
            y: by,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 35,
            maxLife: 35,
            color: colors[i % colors.length],
            effect: new Set(),
            size: 1,
            history: [],
          });
        }
      }
    }

    if (!isSecondary && recipe.hasSecondary && recipe.secondaryAttr) {
      this._pendingSecondary.push({ x: shell.x, y: shell.y, attr: recipe.secondaryAttr });
    }
  }

  _loop(timestamp) {
    if (!this.running) return;
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this._updateCamera(dt);
    this._update(dt);
    this._draw();

    if (!this._startTime) this._startTime = timestamp;
    const totalElapsed = timestamp - this._startTime;

    if (totalElapsed > this._showDuration && this.shells.length === 0 && this.particles.length === 0) {
      this.stop();
      if (this.onComplete) this.onComplete();
      return;
    }

    this._raf = this._requestFrame(t => this._loop(t));
  }

  _update(dt) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const shell = this.shells[i];
      shell.age++;
      shell.vy += GRAVITY * 0.3;
      shell.x += shell.vx;
      shell.y += shell.vy;

      if (shell.trail) {
        shell.history.push({ x: shell.x, y: shell.y });
        if (shell.history.length > 12) shell.history.shift();
      }

      if (shell.age >= shell.maxAge || shell.y <= shell.targetY) {
        this._explode(shell);
        this.shells.splice(i, 1);
      }
    }

    // Process pending secondary explosions
    for (let i = this._pendingSecondary.length - 1; i >= 0; i--) {
      const pending = this._pendingSecondary[i];
      pending.attr.delay -= dt / 1000;
      if (pending.attr.delay <= 0) {
        this._explode({ recipe: { secondaryAttr: pending.attr, hasSecondary: false }, x: pending.x, y: pending.y }, true);
        this._pendingSecondary.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vx *= AIR_RESISTANCE;
      p.vy *= AIR_RESISTANCE;
      p.vy += GRAVITY * (p.gravityScale || 1);
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      p.history.push({ x: p.x, y: p.y });
      if (p.history.length > 6) p.history.shift();

      if (p.effect.has('crackle') && Math.random() < 0.03 && p.life > 10) {
        for (let k = 0; k < 3; k++) {
          this.particles.push({
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 12,
            maxLife: 12,
            color: '#ffffff',
            effect: new Set(),
            size: 0.8,
            history: [],
          });
        }
      }

      if (p.life <= 0 || p.y > this.height + 20) {
        this.particles.splice(i, 1);
      }
    }

    // Cap total particles for performance
    if (this.particles.length > 600) {
      this.particles.splice(0, this.particles.length - 600);
    }
  }

  _draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.globalCompositeOperation = 'source-over';
    if (this.backdrop) {
      this._renderBackdrop(ctx, w, h);
      // Subtle trail fade that keeps the scenery readable.
      ctx.fillStyle = 'rgba(5, 8, 20, 0.18)';
      ctx.fillRect(0, 0, w, h);
    } else {
      // Clear with trail fade
      ctx.fillStyle = 'rgba(5, 8, 20, 0.25)';
      ctx.fillRect(0, 0, w, h);
    }

    ctx.globalCompositeOperation = 'lighter';

    for (const shell of this.shells) {
      // Rising shell head with soft glow
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(shell.x, shell.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Rising trail
      if (shell.history.length > 1) {
        ctx.beginPath();
        ctx.moveTo(shell.history[0].x, shell.history[0].y);
        for (let i = 1; i < shell.history.length; i++) {
          ctx.lineTo(shell.history[i].x, shell.history[i].y);
        }
        ctx.strokeStyle = shell.trail ? `rgba(255,255,255,0.5)` : `rgba(255,255,255,0.18)`;
        ctx.lineWidth = shell.trail ? 2.5 : 1.5;
        ctx.stroke();
      }
    }

    for (const p of this.particles) {
      const progress = 1 - p.life / p.maxLife;
      let alpha = 1 - progress;

      if (p.effect.has('glitter')) {
        alpha *= 0.5 + 0.5 * Math.sin(Date.now() * 0.015 + p.x);
      } else if (p.effect.has('strobe')) {
        alpha = alpha > 0.5 ? 1 : 0.15;
      }

      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 5;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (p.history.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.history[0].x, p.history[0].y);
        for (let i = 1; i < p.history.length; i++) {
          ctx.lineTo(p.history[i].x, p.history[i].y);
        }
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.6;
        ctx.globalAlpha = Math.max(0, alpha * 0.6);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

export function parseColors(colorString) {
  if (colorString === 'multi') {
    return ['#ff4444', '#ffcc33', '#4488ff', '#44ff88', '#cc66ff', '#ff88cc'];
  }

  const parts = colorString.split('+');
  return parts.map(c => COLOR_HEX_MAP[c] || '#ffffff');
}

function getShapeInfo(shape) {
  switch (shape) {
    case 'chrysanthemum':
      return {
        count: 60,
        angle: (_i, _count) => Math.random() * Math.PI * 2,
        speed: () => 2.4 + Math.random() * 0.8,
        velocity: (angle, speed) => ({ vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }),
      };
    case 'willow':
      return {
        count: 50,
        // Upward hemisphere burst, then droops under higher gravity
        angle: (_i, _count) => -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9,
        speed: () => 2.2 + Math.random() * 0.7,
        velocity: (angle, speed) => ({ vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }),
        gravityScale: 1.6,
      };
    case 'palm':
      return {
        count: 70,
        angle: (i, count) => {
          const arms = 7;
          const arm = Math.floor((i / count) * arms);
          return (Math.PI * 2 * arm) / arms + (Math.random() - 0.5) * 0.25;
        },
        speed: () => 3.2 + Math.random() * 0.8,
        velocity: (angle, speed) => ({ vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }),
      };
    case 'star':
      return {
        count: 50,
        angle: (i, count) => (Math.PI * 2 * i) / count,
        speed: (i, count) => {
          const points = 5;
          const phase = (i / count) * points * Math.PI;
          return 2.6 + Math.abs(Math.cos(phase)) * 1.2 + Math.random() * 0.4;
        },
        velocity: (angle, speed) => ({ vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }),
      };
    case 'heart':
      return {
        count: 55,
        angle: (i, count) => (Math.PI * 2 * i) / count,
        speed: () => 2.6 + Math.random() * 0.6,
        velocity: (angle, speed) => {
          // Parametric heart, mapped to outward velocity
          const t = angle;
          const hx = 16 * Math.pow(Math.sin(t), 3);
          const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          const heartAngle = Math.atan2(hy, hx);
          return { vx: Math.cos(heartAngle) * speed, vy: Math.sin(heartAngle) * speed };
        },
      };
    case 'ring':
      return {
        count: 45,
        angle: (i, count) => (Math.PI * 2 * i) / count,
        speed: () => 3.0 + Math.random() * 0.2,
        velocity: (angle, speed) => ({ vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }),
      };
    case 'crackling':
      return {
        count: 40,
        angle: (_i, _count) => Math.random() * Math.PI * 2,
        speed: () => 2.4 + Math.random() * 0.8,
        velocity: (angle, speed) => ({ vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }),
      };
    default: // peony
      return {
        count: 48,
        angle: (_i, _count) => Math.random() * Math.PI * 2,
        speed: () => 2.8 + Math.random() * 0.8,
        velocity: (angle, speed) => ({ vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }),
      };
  }
}

function getParticleCount(shape) {
  return getShapeInfo(shape).count;
}
