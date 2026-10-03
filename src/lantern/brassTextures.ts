import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace, Texture } from 'three';

/** Scratched-lacquer brass: thin bright curved strokes over faint tarnish, all drawn on 2D canvases. */
export interface ScratchParams {
  count: number;
  brightness: number;
  seed: number;
}

export interface BrassTextures {
  map: CanvasTexture;
  roughnessMap: CanvasTexture;
  normalMap: CanvasTexture;
  regenerate(params: ScratchParams): void;
}

const SIZE = 1024;

// Deterministic PRNG so the generated textures are identical on every load.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas2d(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}

/** Horizontal copies needed so a shape spanning [minX, maxX] wraps across the lathe seam. */
function wrapOffsets(minX: number, maxX: number): number[] {
  const out = [0];
  if (minX < 0) out.push(SIZE);
  if (maxX > SIZE) out.push(-SIZE);
  return out;
}

/** Soft blotches; wrapped across U so the lathe seam does not show. */
function blotches(ctx: CanvasRenderingContext2D, rand: () => number, count: number, rgb: string, maxAlpha: number, minR: number, maxR: number): void {
  for (let i = 0; i < count; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = minR + rand() * (maxR - minR);
    const a = rand() * maxAlpha;
    for (const dx of wrapOffsets(x - r, x + r)) {
      const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      g.addColorStop(0, `rgba(${rgb},${a})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x + dx - r, y - r, r * 2, r * 2);
    }
  }
}

interface Stroke {
  x: number;
  y: number;
  cx: number;
  cy: number;
  ex: number;
  ey: number;
  width: number;
  alpha: number;
}

/** Random slightly-curved strokes, a few long bright ones, and small 2-3 line "stars". */
function makeStrokes(rand: () => number, count: number): Stroke[] {
  const strokes: Stroke[] = [];
  const add = (x: number, y: number, angle: number, len: number, alpha: number, width: number) => {
    const bend = (rand() - 0.5) * 0.35 * len; // small curvature
    const mx = x + Math.cos(angle) * len * 0.5 - Math.sin(angle) * bend;
    const my = y + Math.sin(angle) * len * 0.5 + Math.cos(angle) * bend;
    strokes.push({ x, y, cx: mx, cy: my, ex: x + Math.cos(angle) * len, ey: y + Math.sin(angle) * len, width, alpha });
  };
  for (let i = 0; i < count; i++) {
    const long = rand() < 0.12;
    const len = long ? 110 + rand() * 90 : 20 + rand() * 90;
    const alpha = long ? 0.55 + rand() * 0.25 : 0.3 + rand() * 0.4;
    add(rand() * SIZE, rand() * SIZE, rand() * Math.PI * 2, len, alpha, rand() < 0.25 ? 2 : 1);
  }
  const stars = Math.round(count / 40);
  for (let i = 0; i < stars; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const rays = 2 + Math.floor(rand() * 2);
    const base = rand() * Math.PI * 2;
    for (let k = 0; k < rays; k++) {
      add(x, y, base + (k * Math.PI * 2) / rays + (rand() - 0.5) * 0.8, 25 + rand() * 60, 0.5 + rand() * 0.3, 1);
    }
  }
  return strokes;
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], rgb: string, alphaScale: number): void {
  ctx.lineCap = 'round';
  for (const s of strokes) {
    ctx.strokeStyle = `rgba(${rgb},${Math.min(1, s.alpha * alphaScale)})`;
    ctx.lineWidth = s.width;
    for (const dx of wrapOffsets(Math.min(s.x, s.cx, s.ex) - 2, Math.max(s.x, s.cx, s.ex) + 2)) {
      ctx.beginPath();
      ctx.moveTo(s.x + dx, s.y);
      ctx.quadraticCurveTo(s.cx + dx, s.cy, s.ex + dx, s.ey);
      ctx.stroke();
    }
  }
}

/**
 * Scratch mask -> tangent-space normal map: one Sobel pass over the red channel (typed arrays, wrapped
 * edges). Scratches are grooves, so the height goes down where the mask is bright.
 */
function heightToNormal(height: CanvasRenderingContext2D, out: CanvasRenderingContext2D, strength: number): void {
  const src = height.getImageData(0, 0, SIZE, SIZE).data;
  const h = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < h.length; i++) h[i] = src[i * 4] / 255;
  const img = out.createImageData(SIZE, SIZE);
  const dst = img.data;
  const k = strength / 4;
  for (let y = 0; y < SIZE; y++) {
    const ym = ((y - 1 + SIZE) % SIZE) * SIZE;
    const y0 = y * SIZE;
    const yp = ((y + 1) % SIZE) * SIZE;
    for (let x = 0; x < SIZE; x++) {
      const xm = (x - 1 + SIZE) % SIZE;
      const xp = (x + 1) % SIZE;
      const gx = h[ym + xp] + 2 * h[y0 + xp] + h[yp + xp] - h[ym + xm] - 2 * h[y0 + xm] - h[yp + xm];
      const gy = h[yp + xm] + 2 * h[yp + x] + h[yp + xp] - h[ym + xm] - 2 * h[ym + x] - h[ym + xp];
      const nx = gx * k;
      const ny = gy * k;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const i = (y0 + x) * 4;
      dst[i] = (nx * inv * 0.5 + 0.5) * 255;
      dst[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
      dst[i + 2] = (inv * 0.5 + 0.5) * 255;
      dst[i + 3] = 255;
    }
  }
  out.putImageData(img, 0, 0);
}

function texture(canvas: HTMLCanvasElement, srgb: boolean): CanvasTexture {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  // Lathe U spans the circumference (~2x the profile length), so repeat U twice to keep strokes isotropic.
  tex.repeat.set(2, 1);
  tex.anisotropy = 8;
  return tex;
}

export function createBrassTextures(params: ScratchParams): BrassTextures {
  const [colorCanvas, color] = canvas2d();
  const [roughCanvas, rough] = canvas2d();
  const [, height] = canvas2d();
  const [normalCanvas, normal] = canvas2d();

  const result: BrassTextures = {
    map: texture(colorCanvas, true),
    roughnessMap: texture(roughCanvas, false),
    normalMap: texture(normalCanvas, false),
    regenerate(p: ScratchParams) {
      const strokes = makeStrokes(mulberry32(p.seed), Math.round(p.count));

      // Albedo: near-white (tinted by material.color), faint tarnish, scratches a touch lighter.
      color.fillStyle = '#ededed';
      color.fillRect(0, 0, SIZE, SIZE);
      const tr = mulberry32(p.seed + 1);
      blotches(color, tr, 60, '90,70,40', 0.22, 40, 220);
      blotches(color, tr, 120, '70,50,30', 0.15, 6, 30);
      drawStrokes(color, strokes, '255,250,232', 0.6 * p.brightness);

      // Roughness (x material.roughness 0.52): background ~0.45, tarnish duller. Scratches are made
      // ROUGHER: a glossy line mirrors the dark backdrop and reads as a dark crack, while a matte
      // micro-groove scatters the key light and reads as the bright hairline seen in the reference.
      rough.fillStyle = 'rgb(220,220,220)';
      rough.fillRect(0, 0, SIZE, SIZE);
      const rr = mulberry32(p.seed + 1);
      blotches(rough, rr, 60, '255,255,255', 0.4, 40, 220);
      drawStrokes(rough, strokes, '255,255,255', 1.0 * p.brightness);

      // Normal map from a soft scratch mask so the grooves catch light at grazing angles.
      height.fillStyle = '#000';
      height.fillRect(0, 0, SIZE, SIZE);
      drawStrokes(height, strokes, '255,255,255', 1);
      heightToNormal(height, normal, 2.0);

      for (const t of [result.map, result.roughnessMap, result.normalMap] as Texture[]) t.needsUpdate = true;
    },
  };
  // Generated synchronously (~25-60 ms) so the first frame already shows the final brass.
  const t0 = performance.now();
  result.regenerate(params);
  if (import.meta.env.DEV) console.info(`[lantern] scratch textures ${Math.round(performance.now() - t0)} ms`);
  return result;
}
