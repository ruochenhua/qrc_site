import { getRecipeById } from './systems.js';

const BACKDROP_PRESETS = {
  sky: {
    midnight: { top: '#050a1a', mid: '#0f1d3d', bottom: '#1a3260', stars: 90 },
    twilight: { top: '#2a1645', mid: '#4a2b75', bottom: '#6e4299', stars: 55 },
    festival: { top: '#2a0a0a', mid: '#4a1a2a', bottom: '#1a2a50', stars: 70 },
    clear: { top: '#050a1a', mid: '#0f2448', bottom: '#1a3d66', stars: 110 },
  },
  ground: {
    village: { color: '#131830', roofColor: '#202642' },
    grass: { color: '#111f15', hillColor: '#1a2e1f' },
    city: { color: '#0f1422', buildingColor: '#1c2335' },
    park: { color: '#12222b', treeColor: '#1b3138' },
  },
};

const CLOUD_COUNTS = { none: 0, few: 2, scattered: 4 };

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

  _ensureBackground() {
    if (!this.backdrop || !this.ctx) return;
    const needRebuild = this._bgDirty || !this._bgCanvas ||
                        this._bgCanvas.width !== this.width ||
                        this._bgCanvas.height !== this.height;
    if (!needRebuild) return;

    const canCreate = (typeof document !== 'undefined' && document.createElement);
    if (!canCreate) {
      this._bgCanvas = null;
      return;
    }

    if (!this._bgCanvas) {
      this._bgCanvas = document.createElement('canvas');
    }
    this._bgCanvas.width = this.width;
    this._bgCanvas.height = this.height;
    const bgCtx = this._bgCanvas.getContext('2d');
    if (!bgCtx) return;

    this._renderBackground(bgCtx, this.width, this.height);
    this._bgDirty = false;
  }

  _renderBackground(ctx, w, h) {
    const { sky, ground, clouds } = this.backdrop;
    const horizon = h * 0.78;
    this._drawSky(ctx, w, h, horizon, sky);
    this._drawGround(ctx, w, h, horizon, ground);
    this._initClouds(w, horizon, clouds);
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
      ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(Date.now() * 0.002 + s.phase));
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
        speed: 0.015 + this._seededRandom(seed + 3) * 0.025,
        opacity: 0.12 + this._seededRandom(seed + 4) * 0.14,
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
    ctx.fillStyle = preset.color;
    ctx.fillRect(0, horizon, w, h - horizon);

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

  _drawVillageGround(ctx, w, h, horizon) {
    const groundH = h - horizon;
    const base = horizon + groundH * 0.25;
    let x = 0;
    let seed = 11;
    while (x < w) {
      const width = 24 + this._seededRandom(seed) * 36;
      const height = 16 + this._seededRandom(seed + 1) * 28;
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.lineTo(x + width * 0.5, base - height);
      ctx.lineTo(x + width, base);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x + width * 0.15, base, width * 0.7, height * 0.55);
      x += width - 4 + this._seededRandom(seed + 2) * 8;
      seed += 3;
    }
  }

  _drawGrassGround(ctx, w, h, horizon) {
    const groundH = h - horizon;
    const seed = 21;
    for (let i = 0; i < 5; i++) {
      const x = this._seededRandom(seed + i * 3) * w;
      const r = 30 + this._seededRandom(seed + i * 3 + 1) * 70;
      const y = horizon + groundH * (0.2 + this._seededRandom(seed + i * 3 + 2) * 0.7);
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI, 0);
      ctx.lineTo(x + r, horizon + groundH);
      ctx.lineTo(x - r, horizon + groundH);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawCityGround(ctx, w, h, horizon) {
    const groundH = h - horizon;
    let x = 0;
    let seed = 31;
    while (x < w) {
      const width = 18 + this._seededRandom(seed) * 34;
      const height = 20 + this._seededRandom(seed + 1) * groundH * 0.9;
      ctx.fillRect(x, horizon + groundH - height, width, height);
      x += width + 2 + this._seededRandom(seed + 2) * 10;
      seed += 3;
    }
  }

  _drawParkGround(ctx, w, h, horizon) {
    const groundH = h - horizon;
    // Flat ground with a few trees
    let x = 0;
    let seed = 41;
    while (x < w) {
      const gap = 40 + this._seededRandom(seed) * 70;
      x += gap;
      if (x > w) break;
      const trunkW = 4 + this._seededRandom(seed + 1) * 4;
      const trunkH = 10 + this._seededRandom(seed + 2) * 14;
      const foliageR = 14 + this._seededRandom(seed + 3) * 16;
      ctx.fillRect(x - trunkW * 0.5, horizon + groundH * 0.55 - trunkH, trunkW, trunkH);
      ctx.beginPath();
      ctx.arc(x, horizon + groundH * 0.55 - trunkH - foliageR * 0.4, foliageR, 0, Math.PI * 2);
      ctx.fill();
      x += trunkW;
      seed += 4;
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
    // In preview mode use a tighter top margin so tall shells remain visible in the small canvas.
    const topMargin = this._previewShell ? 0.06 : 0.15;
    const targetY = this.height * (1 - heightValue * (1 - topMargin));
    const vy = -(5 + Math.random() * 1.5);
    const duration = Math.abs((targetY - startY) / vy);
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
      this._ensureBackground();
      if (this._bgCanvas && ctx.drawImage) {
        ctx.drawImage(this._bgCanvas, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#050814';
        ctx.fillRect(0, 0, w, h);
      }
      // Subtle trail fade that keeps the scenery readable.
      ctx.fillStyle = 'rgba(5, 8, 20, 0.18)';
      ctx.fillRect(0, 0, w, h);
      const horizon = h * 0.78;
      this._drawStars(ctx, w, horizon, this.backdrop.sky);
      this._drawClouds(ctx, w, horizon);
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
