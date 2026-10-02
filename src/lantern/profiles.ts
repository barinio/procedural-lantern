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

/** Cap brim: a thin cone rising ~13 deg from the rim (r 0.057) to the dome base (r 0.0425). */
export const BRIM = {
  rimR: 0.0568,
  rimTop: 0.2952,
  domeR: 0.0425,
  slope: Math.tan((13 * Math.PI) / 180),
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
  plateTop: 0.0782,
  wickTop: 0.1126,
  glassBottom: 0.0782,
  glassTop: 0.2958,
  /** Visual centre line of the brim rim (used for proportion checks). */
  brimLine: 0.2945,
  domeTop: 0.3385,
};

/** Wire frame: follows the glass barrel ~5 mm outside it, from the reservoir to ferrules under the brim. */
const wireCurve = new CatmullRomCurve3(
  (
    [
      [0.0645, 0.068], // buried in the reservoir top (ferrule)
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
 * Reservoir "pillow": dia 0.18 at the bottom, bottom edge ~12 mm, slightly convex wall, a large ~32 mm
 * shoulder and a soft domed top (centre ~9 mm above the shoulder).
 */
export const reservoirProfile = smooth(
  [
    [0, 0],
    [0.074, 0],
    [0.0835, 0.0025],
    [0.0885, 0.008],
    [0.0903, 0.016],
    [0.0905, 0.026], // wall bulges ~3 mm past a straight taper
    [0.0895, 0.036],
    [0.0868, 0.0465], // ~32 mm shoulder into the pillowed top
    [0.0822, 0.056],
    [0.0758, 0.0635],
    [0.0675, 0.0694],
    [0.057, 0.0737],
    [0.042, 0.0773],
    [0.022, 0.0801],
    [0, 0.081],
  ],
  160,
);

/** Flat plate (dia 0.11, 3 mm) resting on the reservoir dome, with a low lip that seats the glass. */
export const galleryProfile = smooth(
  [
    [0, DIM.plateTop - 0.003],
    [0.053, DIM.plateTop - 0.003],
    [0.0546, DIM.plateTop - 0.0027],
    [0.055, DIM.plateTop - 0.0013],
    [0.0546, DIM.plateTop],
    [0.0541, DIM.plateTop],
    [0.0541, DIM.plateTop + 0.0019],
    [0.0532, DIM.plateTop + 0.0025],
    [0.0522, DIM.plateTop + 0.002],
    [0.052, DIM.plateTop + 0.0002],
    [0.045, DIM.plateTop],
    [0, DIM.plateTop],
  ],
  96,
);

/** Tiered burner: lower tier dia 0.07 -> 0.05 over 12 mm, then a small dome to a dia 0.02 neck (27 mm total). */
const P = DIM.plateTop;
export const burnerProfile = smooth(
  [
    [0.0351, P - 0.0003],
    [0.0349, P + 0.003],
    [0.0332, P + 0.0075],
    [0.0292, P + 0.0105],
    [0.026, P + 0.0118], // shelf between the tiers
    [0.0249, P + 0.0126],
    [0.0246, P + 0.015],
    [0.022, P + 0.0195],
    [0.0165, P + 0.0235],
    [0.0117, P + 0.026],
    [0.0102, P + 0.027], // neck
    [0.0098, P + 0.031],
    [0.0078, P + 0.0321],
    [0.005, P + 0.0324],
    [0, P + 0.0324],
  ],
  110,
);

/** Barrel chimney, open at both ends; the neck slips into the thin collar under the cap. */
export const glassProfile = smooth(
  [
    [0.051, DIM.glassBottom],
    [0.0545, 0.089],
    [0.0632, 0.118],
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
    [0, 0.2963],
    [0.0445, 0.2963],
    [0.0461, 0.2958],
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
    [0.047, C.topAt(0.047)],
    [0.0435, C.topAt(0.0435)],
    [0.0412, C.topAt(C.domeR) + 0.0012], // slightly concave foot
    [0.0385, C.topAt(C.domeR) + 0.0048],
    [0.034, 0.3073], // near-straight conical side
    [0.028, 0.315],
    [0.022, 0.3228],
    [0.0172, 0.3297], // round crown, r ~0.02
    [0.0118, 0.3348],
    [0.0058, 0.3376],
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
