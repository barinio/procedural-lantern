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
  brass: MeshPhysicalMaterial;
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

/** Full-width rows of slightly different value: circumferential brushing once wrapped on a lathe. */
function brushed(
  ctx: CanvasRenderingContext2D,
  size: number,
  rand: () => number,
  rgb: string,
  maxAlpha: number,
): void {
  for (let y = 0; y < size; y++) {
    ctx.fillStyle = `rgba(${rgb},${rand() * rand() * maxAlpha})`;
    ctx.fillRect(0, y, size, 1);
  }
}

function brassColorMap(): CanvasTexture {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  const rand = mulberry32(7);
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(0, 0, size, size);
  blotches(ctx, size, rand, 70, '95,70,40', 0.42, 25, 120); // tarnish patches
  blotches(ctx, size, rand, 120, '70,50,30', 0.3, 4, 18); // small oxidation spots
  blotches(ctx, size, rand, 40, '255,245,220', 0.2, 15, 70); // polished spots
  brushed(ctx, size, rand, '80,60,35', 0.18);
  scratches(ctx, size, rand, 400, '90,70,40', 0.15);
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
  ctx.fillStyle = 'rgb(200,200,200)';
  ctx.fillRect(0, 0, size, size);
  brushed(ctx, size, rand, '255,255,255', 0.55); // rougher brushing grooves
  brushed(ctx, size, rand, '90,90,90', 0.35); // glossier ridges
  blotches(ctx, size, rand, 70, '255,255,255', 0.5, 25, 120); // dull tarnish (matches color map)
  blotches(ctx, size, rand, 50, '60,60,60', 0.35, 10, 60); // polished spots
  scratches(ctx, size, rand, 600, '255,255,255', 0.3);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = NoColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function createMaterials(): LanternMaterials {
  // Anisotropy direction follows the lathe's U (around the axis), i.e. circular brushing.
  const brass = new MeshPhysicalMaterial({
    color: new Color('#c4a265'),
    metalness: 1,
    roughness: 0.42,
    anisotropy: 0.5,
    anisotropyRotation: 0,
    map: brassColorMap(),
    roughnessMap: brassRoughnessMap(),
    envMapIntensity: 1,
  });

  const steel = new MeshStandardMaterial({
    color: new Color('#c8cacc'),
    metalness: 1,
    roughness: 0.35,
    envMapIntensity: 0.8,
  });

  const glass = new MeshPhysicalMaterial({
    color: new Color('#fffaf0'),
    metalness: 0,
    roughness: 0.05,
    transmission: 1,
    ior: 1.45,
    thickness: 0.01,
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
