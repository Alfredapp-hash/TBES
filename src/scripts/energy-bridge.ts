// Control-point strands: main bridge, lower strand.

type Point = { x: number; y: number };
type RGB = [number, number, number];

type Strand = {
  a: Point;
  b: Point;
  c: Point;
  d: Point;
  half: number;
  strength: number;
};

type Curve = {
  pts: Point[];
  norms: Point[];
  ts: number[];
  cum: number[];
  total: number;
};

type Sample = { x: number; y: number; nx: number; ny: number; t: number };

type Mote = {
  strand: 0 | 1;
  u: number;
  duration: number;
  jitter: number;
  radius: number;
  alpha: number;
  large: boolean;
};

type Veil = { scale: number; alpha: number };

type StrandGfx = {
  curve: Curve;
  veils: { path: Path2D; fill: CanvasGradient }[];
  clip: Path2D;
  spine: Path2D;
  glow: CanvasGradient;
  glowWidth: number;
  line: CanvasGradient;
  lineWidth: number;
};

const CYAN: RGB = [58, 212, 255];
const GREEN: RGB = [62, 224, 160];
const BLUE: RGB = [77, 141, 255];

const STRANDS: readonly Strand[] = [
  {
    a: { x: 0.56, y: 0.4 },
    b: { x: 0.66, y: 0.16 },
    c: { x: 0.78, y: 0.15 },
    d: { x: 0.9, y: 0.38 },
    half: 28,
    strength: 1,
  },
  {
    a: { x: 0.54, y: 0.48 },
    b: { x: 0.66, y: 0.3 },
    c: { x: 0.78, y: 0.28 },
    d: { x: 0.89, y: 0.46 },
    half: 12,
    strength: 0.7,
  },
];

const HEAD_PERIOD = 5.5;
const REDUCED_HEAD = 0.42;
const ARC_STEPS = 128;
const VEILS = veilLayers();

let started = false;
const motes = buildMotes();

function veilLayers(): Veil[] {
  const count = 14;
  const outer = 2;
  const inner = 0.1;
  const peak = 1.05;
  const sigma = 0.7;
  const falloff = (radius: number) => peak * Math.exp(-0.5 * (radius / sigma) ** 2);
  const layers: Veil[] = [];
  let previous = 0;
  for (let i = 0; i < count; i += 1) {
    const scale = outer + ((inner - outer) * i) / (count - 1);
    const density = falloff(scale);
    layers.push({ scale, alpha: Math.max(0, density - previous) });
    previous = density;
  }
  return layers;
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function colorAt(t: number): RGB {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  if (u < 0.5) return mix(CYAN, GREEN, u * 2);
  return mix(GREEN, BLUE, (u - 0.5) * 2);
}

function lift(color: RGB, amount: number): RGB {
  return [
    color[0] + (255 - color[0]) * amount,
    color[1] + (255 - color[1]) * amount,
    color[2] + (255 - color[2]) * amount,
  ];
}

function rgba(color: RGB, alpha: number): string {
  const a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
  return `rgba(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])},${a})`;
}

function cubic(a: number, b: number, c: number, d: number, t: number): number {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
}

function cubicDeriv(a: number, b: number, c: number, d: number, t: number): number {
  const u = 1 - t;
  return 3 * u * u * (b - a) + 6 * u * t * (c - b) + 3 * t * t * (d - c);
}

function buildCurve(strand: Strand, width: number, height: number): Curve {
  const pts: Point[] = [];
  const norms: Point[] = [];
  const ts: number[] = [];
  const cum: number[] = [];
  let total = 0;
  let prevX = 0;
  let prevY = 0;
  let prevNx = 0;
  let prevNy = 0;

  for (let i = 0; i <= ARC_STEPS; i += 1) {
    const t = i / ARC_STEPS;
    const x = cubic(strand.a.x, strand.b.x, strand.c.x, strand.d.x, t) * width;
    const y = cubic(strand.a.y, strand.b.y, strand.c.y, strand.d.y, t) * height;
    const vx = cubicDeriv(strand.a.x, strand.b.x, strand.c.x, strand.d.x, t) * width;
    const vy = cubicDeriv(strand.a.y, strand.b.y, strand.c.y, strand.d.y, t) * height;
    const length = Math.hypot(vx, vy) || 1;
    let nx = -vy / length;
    let ny = vx / length;
    if (i > 0 && nx * prevNx + ny * prevNy < 0) {
      nx = -nx;
      ny = -ny;
    }
    if (i > 0) total += Math.hypot(x - prevX, y - prevY);
    prevX = x;
    prevY = y;
    prevNx = nx;
    prevNy = ny;
    pts.push({ x, y });
    norms.push({ x: nx, y: ny });
    ts.push(t);
    cum.push(total);
  }

  return { pts, norms, ts, cum, total };
}

function ribbonPath(curve: Curve, half: number): Path2D {
  const path = new Path2D();
  const count = curve.pts.length;
  const left: Point[] = new Array(count);
  const right: Point[] = new Array(count);

  for (let i = 0; i < count; i += 1) {
    const hw = half * Math.sin(Math.PI * curve.ts[i]);
    const point = curve.pts[i];
    const normal = curve.norms[i];
    left[i] = { x: point.x + normal.x * hw, y: point.y + normal.y * hw };
    right[i] = { x: point.x - normal.x * hw, y: point.y - normal.y * hw };
  }

  path.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < count; i += 1) path.lineTo(left[i].x, left[i].y);
  for (let i = count - 1; i >= 0; i -= 1) path.lineTo(right[i].x, right[i].y);
  path.closePath();
  return path;
}

function spinePath(curve: Curve): Path2D {
  const path = new Path2D();
  path.moveTo(curve.pts[0].x, curve.pts[0].y);
  for (let i = 1; i < curve.pts.length; i += 1) path.lineTo(curve.pts[i].x, curve.pts[i].y);
  return path;
}

function spectrum(
  ctx: CanvasRenderingContext2D,
  curve: Curve,
  alpha: number,
  amount: number,
  fadeEnds: boolean,
): CanvasGradient {
  const start = curve.pts[0];
  const end = curve.pts[curve.pts.length - 1];
  const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
  const stops = fadeEnds ? [0, 0.08, 0.22, 0.5, 0.78, 0.92, 1] : [0, 0.22, 0.5, 0.78, 1];
  for (const t of stops) {
    const fade = fadeEnds ? Math.sin(Math.PI * t) : 1;
    gradient.addColorStop(t, rgba(lift(colorAt(t), amount), alpha * fade));
  }
  return gradient;
}

function buildGfx(
  ctx: CanvasRenderingContext2D,
  strand: Strand,
  width: number,
  height: number,
): StrandGfx {
  const curve = buildCurve(strand, width, height);
  return {
    curve,
    veils: VEILS.map((veil) => ({
      path: ribbonPath(curve, strand.half * veil.scale),
      fill: spectrum(ctx, curve, veil.alpha * strand.strength, 0, false),
    })),
    clip: ribbonPath(curve, strand.half),
    spine: spinePath(curve),
    glow: spectrum(ctx, curve, 0.09 * strand.strength, 0.1, true),
    glowWidth: strand.half * 0.42,
    line: spectrum(ctx, curve, 0.18 * strand.strength, 0.24, true),
    lineWidth: Math.max(1.2, strand.half * 0.05),
  };
}

function sampleArc(curve: Curve, u: number): Sample {
  const first = curve.pts[0];
  const firstN = curve.norms[0];
  if (curve.total <= 0 || u <= 0) {
    return { x: first.x, y: first.y, nx: firstN.x, ny: firstN.y, t: 0 };
  }
  const target = (u >= 1 ? 0.999999 : u) * curve.total;
  let lo = 0;
  let hi = curve.cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (curve.cum[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  if (lo === 0) return { x: first.x, y: first.y, nx: firstN.x, ny: firstN.y, t: 0 };
  const i1 = lo;
  const i0 = lo - 1;
  const span = curve.cum[i1] - curve.cum[i0] || 1;
  const f = (target - curve.cum[i0]) / span;
  const p0 = curve.pts[i0];
  const p1 = curve.pts[i1];
  const n0 = curve.norms[i0];
  const n1 = curve.norms[i1];
  const nx = n0.x + (n1.x - n0.x) * f;
  const ny = n0.y + (n1.y - n0.y) * f;
  const length = Math.hypot(nx, ny) || 1;
  return {
    x: p0.x + (p1.x - p0.x) * f,
    y: p0.y + (p1.y - p0.y) * f,
    nx: nx / length,
    ny: ny / length,
    t: curve.ts[i0] + (curve.ts[i1] - curve.ts[i0]) * f,
  };
}

function pointAt(strand: Strand, t: number, width: number, height: number): Point {
  return {
    x: cubic(strand.a.x, strand.b.x, strand.c.x, strand.d.x, t) * width,
    y: cubic(strand.a.y, strand.b.y, strand.c.y, strand.d.y, t) * height,
  };
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildMotes(): Mote[] {
  const rand = mulberry32(0x71c3a91e);
  const groups: { strand: 0 | 1; count: number; large: number }[] = [
    { strand: 0, count: 26, large: 4 },
    { strand: 1, count: 14, large: 2 },
  ];
  const list: Mote[] = [];
  for (const group of groups) {
    const largeAt = new Set<number>();
    while (largeAt.size < group.large) largeAt.add(Math.floor(rand() * group.count));
    for (let i = 0; i < group.count; i += 1) {
      const large = largeAt.has(i);
      const slot = (i + 0.5) / group.count;
      list.push({
        strand: group.strand,
        u: slot + (rand() - 0.5) * (0.7 / group.count),
        duration: (large ? 8.3 : 7) + rand() * (large ? 1.7 : 3),
        jitter: (rand() * 2 - 1) * (large ? 3.2 : 4.4),
        radius: large ? 3.6 + rand() * 1.8 : 1.35 + rand() * 1.35,
        alpha: large ? 0.26 + rand() * 0.12 : 0.55 + rand() * 0.32,
        large,
      });
    }
  }
  return list;
}

function boot(): void {
  if (started) return;
  const canvas = document.querySelector<HTMLCanvasElement>("canvas.energy-bridge[data-energy-bridge]");
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  started = true;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motion.matches;
  let raf = 0;
  let animating = false;
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let gfx: StrandGfx[] = [];
  let seconds = 0;
  let startedAt = 0;

  const drawMote = (mote: Mote, largePass: boolean) => {
    if (mote.large !== largePass) return;
    const curve = gfx[mote.strand]?.curve;
    if (!curve) return;
    const travel = reduced ? mote.u : (mote.u + seconds / mote.duration) % 1;
    const sample = sampleArc(curve, travel);
    const fade = Math.sin(Math.PI * sample.t);
    if (fade < 0.025) return;
    const x = sample.x + sample.nx * mote.jitter;
    const y = sample.y + sample.ny * mote.jitter;
    const tint = lift(colorAt(sample.t), mote.large ? 0.24 : 0.4);
    const alpha = mote.alpha * fade;
    if (mote.large) {
      const radius = mote.radius * 3.6;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, rgba(lift(tint, 0.3), alpha));
      glow.addColorStop(0.28, rgba(tint, alpha * 0.45));
      glow.addColorStop(1, rgba(tint, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.fillStyle = rgba(tint, alpha * 0.22);
    ctx.beginPath();
    ctx.arc(x, y, mote.radius * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(lift(tint, 0.18), alpha);
    ctx.beginPath();
    ctx.arc(x, y, mote.radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawHead = () => {
    const strand = gfx[0];
    if (!strand) return;
    let x: number;
    let y: number;
    let t: number;
    if (reduced) {
      t = REDUCED_HEAD;
      const point = pointAt(STRANDS[0], t, cssW, cssH);
      x = point.x;
      y = point.y;
    } else {
      const sample = sampleArc(strand.curve, (seconds % HEAD_PERIOD) / HEAD_PERIOD);
      x = sample.x;
      y = sample.y;
      t = sample.t;
    }
    const fade = Math.sin(Math.PI * t);
    if (fade < 0.02) return;
    const tint = colorAt(t);
    const hot = lift(tint, 0.3);
    const radius = 88;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, rgba(hot, 0.5 * fade));
    glow.addColorStop(0.16, rgba(hot, 0.2 * fade));
    glow.addColorStop(0.42, rgba(tint, 0.07 * fade));
    glow.addColorStop(1, rgba(tint, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const paint = () => {
    if (cssW < 2 || cssH < 2 || gfx.length < 2) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    for (const index of [1, 0]) {
      const strand = gfx[index];
      if (!strand) continue;
      for (const veil of strand.veils) {
        ctx.fillStyle = veil.fill;
        ctx.fill(veil.path);
      }
      ctx.save();
      ctx.clip(strand.clip);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = strand.glow;
      ctx.lineWidth = strand.glowWidth;
      ctx.stroke(strand.spine);
      ctx.strokeStyle = strand.line;
      ctx.lineWidth = strand.lineWidth;
      ctx.stroke(strand.spine);
      ctx.restore();
    }
    for (const mote of motes) drawMote(mote, true);
    for (const mote of motes) drawMote(mote, false);
    drawHead();
  };

  const resize = () => {
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width < 2 || height < 2) return;
    const bufferW = Math.max(1, Math.round(width * nextDpr));
    const bufferH = Math.max(1, Math.round(height * nextDpr));
    const changed =
      bufferW !== canvas.width || bufferH !== canvas.height || width !== cssW || height !== cssH || nextDpr !== dpr;
    cssW = width;
    cssH = height;
    dpr = nextDpr;
    if (changed) {
      canvas.width = bufferW;
      canvas.height = bufferH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (changed) gfx = STRANDS.map((strand) => buildGfx(ctx, strand, width, height));
    paint();
  };

  const frame = (now: number) => {
    if (!animating) return;
    seconds = (now - startedAt) / 1000;
    paint();
    if (!animating) return;
    raf = window.requestAnimationFrame(frame);
  };

  const syncMotion = () => {
    reduced = motion.matches;
    if (reduced) {
      animating = false;
      window.cancelAnimationFrame(raf);
      raf = 0;
      paint();
      return;
    }
    if (animating) return;
    animating = true;
    startedAt = performance.now();
    raf = window.requestAnimationFrame(frame);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(parent);
  resize();
  motion.addEventListener("change", syncMotion);
  syncMotion();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
