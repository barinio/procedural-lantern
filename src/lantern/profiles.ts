import { CatmullRomCurve3, Vector2, Vector3 } from 'three';

// Dimensions in meters, taken from docs/reference.jpg (reservoir width 238 px = 0.18 m).

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

/** Key heights shared by several parts. */
export const DIM = {
  reservoirTop: 0.08,
  wickTop: 0.13,
  glassBottom: 0.084,
  glassTop: 0.296,
  brimTop: 0.299,
};

/** Wire frame: follows the glass barrel ~5 mm outside it, from the reservoir into the cap brim. */
const wireCurve = new CatmullRomCurve3(
  (
    [
      [0.0645, 0.074], // buried in the reservoir top (ferrule)
      [0.0705, 0.105],
      [0.0752, 0.14],
      [0.077, 0.18],
      [0.0752, 0.22],
      [0.068, 0.255],
      [0.0585, 0.28],
      [0.0545, 0.2935], // inside the brim, >= 3 mm under its top surface
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

/** Flat wide puck: flat top and bottom, near-vertical wall, rounded edges. */
export const reservoirProfile = smooth(
  [
    [0, 0],
    [0.068, 0],
    [0.081, 0.003],
    [0.0885, 0.013],
    [0.09, 0.026],
    [0.09, 0.052],
    [0.088, 0.066],
    [0.082, 0.0755],
    [0.071, 0.0795],
    [0.05, 0.08],
    [0, 0.08],
  ],
  120,
);

/** Thin round plate on the reservoir with a raised rim the glass sits in. */
export const galleryProfile = smooth(
  [
    [0, 0.0795],
    [0.058, 0.0795],
    [0.0612, 0.081],
    [0.062, 0.0885],
    [0.0602, 0.0905],
    [0.0568, 0.09],
    [0.0558, 0.0855],
    [0.05, 0.084],
    [0, 0.084],
  ],
  64,
);

/** Burner: low pot-shaped collar with a lip, a shallow dome and the wick tube. */
export const burnerProfile = smooth(
  [
    [0.044, 0.0835],
    [0.0425, 0.09],
    [0.0435, 0.1],
    [0.044, 0.107], // lip
    [0.0415, 0.1105],
    [0.033, 0.1155],
    [0.02, 0.1205],
    [0.011, 0.1235],
    [0.0068, 0.125],
    [0.006, 0.1285],
    [0.004, 0.13],
    [0, 0.13],
  ],
  80,
);

/** Barrel chimney, open at both ends; the neck slips into the cap collar. */
export const glassProfile = smooth(
  [
    [0.0545, 0.084],
    [0.058, 0.095],
    [0.0655, 0.125],
    [0.071, 0.17],
    [0.0705, 0.2],
    [0.0655, 0.235],
    [0.0575, 0.262],
    [0.0505, 0.276],
    [0.0475, 0.284],
    [0.047, DIM.glassTop],
  ],
  80,
);

/**
 * Closed cap: inner ceiling -> collar the glass sits in -> brim underside -> rolled brim ->
 * tall rounded "bowler hat" dome -> axis.
 */
export const capProfile = smooth(
  [
    [0, 0.2965],
    [0.044, 0.2965],
    [0.0482, 0.2952],
    [0.0485, 0.2855],
    [0.0495, 0.2832], // collar lip, ~13 mm below the glass rim
    [0.0516, 0.2832],
    [0.0525, 0.2852],
    [0.0525, 0.2885],
    [0.0545, 0.2895],
    [0.0565, 0.2915],
    [0.057, 0.295], // rolled brim edge
    [0.0552, 0.2985],
    [0.048, DIM.brimTop],
    [0.0455, 0.3015],
    [0.0445, 0.31],
    [0.0425, 0.322],
    [0.0365, 0.3315],
    [0.026, 0.338],
    [0.012, 0.3405],
    [0, 0.341],
  ],
  200,
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
