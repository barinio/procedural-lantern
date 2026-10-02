import {
  CanvasTexture,
  Color,
  FrontSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';

export interface LanternMaterials {
  brass: MeshStandardMaterial;
  steel: MeshStandardMaterial;
  glass: MeshPhysicalMaterial;
  wick: MeshStandardMaterial;
}

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

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

/** Soft blotches drawn with radial gradients; wraps horizontally to hide the lathe seam. */
function blotches(
  ctx: CanvasRenderingContext2D,
  size: number,
  rand: () => number,
  count: number,
  rgb: string,
  maxAlpha: number,
  minR: number,
  maxR: number,
): void {
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = minR + rand() * (maxR - minR);
    const a = rand() * maxAlpha;
    for (const dx of [-size, 0, size]) {
      const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      g.addColorStop(0, `rgba(${rgb},${a})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x + dx - r, y - r, r * 2, r * 2);
    }
  }
}

/** Fine horizontal scratches (lathe-turned / polished look). */
function scratches(
  ctx: CanvasRenderingContext2D,
  size: number,
  rand: () => number,
  count: number,
  rgb: string,
  maxAlpha: number,
): void {
  ctx.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    const y = rand() * size;
    const x = rand() * size;
    const len = 20 + rand() * size * 0.5;
    const tilt = (rand() - 0.5) * 6;
    ctx.strokeStyle = `rgba(${rgb},${rand() * maxAlpha})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + tilt);
    ctx.stroke();
  }
}

function brassColorMap(): CanvasTexture {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  const rand = mulberry32(7);
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(0, 0, size, size);
  blotches(ctx, size, rand, 90, '120,90,50', 0.18, 20, 110); // darker tarnish
  blotches(ctx, size, rand, 50, '255,245,220', 0.22, 15, 70); // polished spots
  scratches(ctx, size, rand, 500, '90,70,40', 0.12);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function brassRoughnessMap(): CanvasTexture {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  const rand = mulberry32(42);
  ctx.fillStyle = 'rgb(190,190,190)';
  ctx.fillRect(0, 0, size, size);
  blotches(ctx, size, rand, 80, '255,255,255', 0.35, 20, 120); // dull, fingerprinted
  blotches(ctx, size, rand, 60, '60,60,60', 0.35, 10, 60); // glossy spots
  scratches(ctx, size, rand, 700, '255,255,255', 0.25);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = NoColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function createMaterials(): LanternMaterials {
  const brass = new MeshStandardMaterial({
    color: new Color('#b08d57'),
    metalness: 1,
    roughness: 0.35,
    map: brassColorMap(),
    roughnessMap: brassRoughnessMap(),
    envMapIntensity: 1,
  });

  const steel = new MeshStandardMaterial({
    color: new Color('#c8cacc'),
    metalness: 1,
    roughness: 0.5,
    envMapIntensity: 0.6,
  });

  const glass = new MeshPhysicalMaterial({
    color: new Color('#fffaf0'),
    metalness: 0,
    roughness: 0.05,
    transmission: 1,
    ior: 1.5,
    thickness: 0.03,
    specularIntensity: 1,
    envMapIntensity: 1,
    transparent: false,
    side: FrontSide,
  });

  const wick = new MeshStandardMaterial({
    color: new Color('#2a2420'),
    roughness: 0.95,
    metalness: 0,
  });

  return { brass, steel, glass, wick };
}
