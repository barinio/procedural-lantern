import { CatmullRomCurve3, Vector2, Vector3 } from 'three';

// Dimensions in meters, taken from docs/reference.jpg (reservoir width 240 px = 0.18 m).

// Smooths a coarse (radius, height) polyline with a centripetal Catmull-Rom spline,
// so control points act as fillets instead of hard corners.
function smooth(points: [number, number][], samples = 64): Vector2[] {
  const curve = new CatmullRomCurve3(
    points.map(([r, y]) => new Vector3(r, y, 0)),
    false,
    'centripetal',
  );
  return curve.getSpacedPoints(samples).map((p) => new Vector2(Math.max(p.x, 0), p.y));
}

/** Cap brim: a thin cone rising ~17 deg from the rim (r 0.057) to the dome base (r 0.034). */
export const BRIM = {
  rimR: 0.0568,
  rimTop: 0.2952,
  domeR: 0.034,
  slope: Math.tan((17 * Math.PI) / 180),
  /** Height of the brim's top surface at radius r. */
  topAt(r: number): number {
    return this.rimTop + (this.rimR - Math.min(Math.max(r, this.domeR), this.rimR)) * this.slope;
  },
  /** Height of the brim's underside at radius r (~2.4 mm under the top). */
  bottomAt(r: number): number {
    return this.topAt(r) - 0.0024;
  },
};

/** Key heights shared by several parts. */
export const DIM = {
  reservoirTop: 0.081, // dome centre
  plateTop: 0.0815,
  wickTop: 0.1165,
  glassBottom: 0.0815,
  glassTop: 0.296,
  /** Visual centre line of the brim rim (used for proportion checks). */
  brimLine: 0.2945,
  domeTop: 0.3385,
};

/** Wire frame: follows the glass barrel ~5 mm outside it, from the reservoir to ferrules under the brim. */
const wireCurve = new CatmullRomCurve3(
  (
    [
      [0.0645, 0.0735], // buried in the reservoir top (ferrule)
      [0.0705, 0.105],
      [0.0752, 0.14],
      [0.077, 0.18],
      [0.0752, 0.22],
      [0.068, 0.255],
      [0.0585, 0.278],
      [0.053, 0.2925], // ends inside a ferrule under the brim, ~3.5 mm under its top surface
    ] as [number, number][]
  ).map(([r, y]) => new Vector3(r, y, 0)),
  false,
  'centripetal',
);
const wireSamples = wireCurve.getPoints(200);

export const WIRE = {
  /** Points of the wire in its (radius, height) plane. */
  points: wireSamples.map((p) => new Vector2(p.x, p.y)),
  radiusAt(y: number): number {
    for (let i = 1; i < wireSamples.length; i++) {
      const a = wireSamples[i - 1];
      const b = wireSamples[i];
      if (y >= a.y && y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y);
    }
    return y < wireSamples[0].y ? wireSamples[0].x : wireSamples[wireSamples.length - 1].x;
  },
};

/** Frame ring at ~37 % of the glass height. */
export const RING_Y = DIM.glassBottom + 0.37 * (DIM.glassTop - DIM.glassBottom);

/**
 * Reservoir: wall tapers from dia 0.18 at the bottom to ~0.168 at the top, bottom edge rounded ~12 mm,
 * top edge rounded ~20 mm into a soft dome whose centre sits ~9 mm above the edge.
 */
export const reservoirProfile = smooth(
  [
    [0, 0],
    [0.075, 0],
    [0.0842, 0.0022],
    [0.0892, 0.0075],
    [0.09, 0.014],
    [0.0878, 0.038],
    [0.0858, 0.053],
    [0.0836, 0.0612],
    [0.0792, 0.0675],
    [0.0728, 0.0718],
    [0.064, 0.0754],
    [0.045, 0.0786],
    [0.022, 0.0805],
    [0, 0.081],
  ],
  140,
);

/** Flat plate (dia 0.124, 3 mm) with a crisp edge and a low rim that seats the glass. */
export const galleryProfile = smooth(
  [
    [0, 0.0785],
    [0.059, 0.0785],
    [0.0616, 0.0788],
    [0.062, 0.0802],
    [0.0612, 0.0815],
    [0.0586, 0.0815],
    [0.0585, 0.0838],
    [0.0573, 0.0845],
    [0.0559, 0.0839],
    [0.0556, 0.0817],
    [0.045, 0.0815],
    [0, 0.0815],
  ],
  96,
);

/** Burner bell: dia 0.088 at the base, rounding in over ~27 mm to a short neck (dia 0.02) under the wick. */
export const burnerProfile = smooth(
  [
    [0.0441, DIM.plateTop - 0.0003],
    [0.0438, 0.0845],
    [0.0418, 0.0888],
    [0.0368, 0.0943],
    [0.029, 0.0995],
    [0.019, 0.104],
    [0.0122, 0.107],
    [0.0102, 0.1095], // neck
    [0.0098, 0.1135],
    [0.0078, 0.1146],
    [0.005, 0.115],
    [0, 0.115],
  ],
  96,
);

/** Barrel chimney, open at both ends; the neck slips into the thin collar under the cap. */
export const glassProfile = smooth(
  [
    [0.0545, DIM.glassBottom],
    [0.058, 0.093],
    [0.0655, 0.123],
    [0.071, 0.17],
    [0.0705, 0.2],
    [0.0655, 0.235],
    [0.0575, 0.262],
    [0.0505, 0.276],
    [0.0466, 0.286],
    [0.0455, DIM.glassTop],
  ],
  80,
);

/**
 * Closed "conical hat" cap. Underside: ceiling -> narrow 5 mm collar hugging the glass top (hidden under
 * the brim) -> thin sloped brim with a small rounded rim. Top: brim cone up to r 0.034, then a bell dome
 * (slightly concave at the foot, round at the crown) rising to DIM.domeTop.
 */
const C = BRIM;
export const capProfile = smooth(
  [
    [0, 0.2972],
    [0.0445, 0.2972],
    [0.0461, 0.2962],
    [0.0462, 0.2912],
    [0.0469, 0.2904], // collar lip, ~5.5 mm below the glass rim
    [0.0477, 0.2912],
    [0.0477, C.bottomAt(0.0477) - 0.0004],
    [0.0485, C.bottomAt(0.0485)],
    [0.053, C.bottomAt(0.053)],
    [0.0562, C.bottomAt(0.0562)],
    [0.0572, C.rimTop - 0.0014], // thin rounded rim
    [C.rimR, C.rimTop],
    [0.054, C.topAt(0.054)],
    [0.045, C.topAt(0.045)],
    [0.037, C.topAt(0.037)],
    [0.0335, C.topAt(0.034) + 0.0012], // concave foot of the bell
    [0.031, C.topAt(0.034) + 0.005],
    [0.0283, 0.313],
    [0.0258, 0.321],
    [0.0218, 0.328],
    [0.0155, 0.3337],
    [0.0075, 0.3373],
    [0, DIM.domeTop],
  ],
  220,
);

/** Knurled thumb wheel, revolved around its own (local Y) axis. */
export const wheelProfile = smooth(
  [
    [0, -0.003],
    [0.0085, -0.003],
    [0.0095, -0.0022],
    [0.0095, 0.0022],
    [0.0085, 0.003],
    [0, 0.003],
  ],
  24,
);
