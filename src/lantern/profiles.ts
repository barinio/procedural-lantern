import { CatmullRomCurve3, Vector2, Vector3 } from 'three';

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

/** Wire frame radius as a function of height (bulges with the glass). */
export const WIRE = {
  bottomY: 0.056,
  topY: 0.304, // ends inside the cap brim, well below its top surface
  radiusAt(y: number): number {
    return 0.084 - 1.72 * (y - 0.185) ** 2;
  },
};

export const RING_Y = 0.16;

export const reservoirProfile = smooth(
  [
    [0, 0],
    [0.06, 0],
    [0.08, 0.002],
    [0.088, 0.01],
    [0.0915, 0.026],
    [0.09, 0.042],
    [0.083, 0.054],
    [0.07, 0.061],
    [0.05, 0.0635],
    [0.02, 0.064],
    [0, 0.064],
  ],
  96,
);

/** Gallery cup that holds the glass on top of the reservoir. */
export const galleryProfile = smooth(
  [
    [0.04, 0.062],
    [0.05, 0.0625],
    [0.0525, 0.066],
    [0.053, 0.074],
    [0.0505, 0.077],
    [0.0475, 0.0765],
    [0.047, 0.07],
  ],
  48,
);

export const burnerProfile = smooth(
  [
    [0.046, 0.063],
    [0.044, 0.07],
    [0.04, 0.076],
    [0.032, 0.083],
    [0.02, 0.088],
    [0.011, 0.0905],
    [0.0075, 0.093],
    [0.007, 0.098],
    [0.005, 0.1],
    [0, 0.1],
  ],
  64,
);

/** Barrel-shaped chimney glass, open at both ends. */
export const glassProfile = smooth(
  [
    [0.0465, 0.07],
    [0.049, 0.085],
    [0.06, 0.12],
    [0.0705, 0.175],
    [0.0685, 0.225],
    [0.059, 0.275],
    [0.0525, 0.293], // neck slips into the cap collar
    [0.0515, 0.3],
    [0.051, 0.306],
  ],
  64,
);

/** Closed cap: inner ceiling -> collar the glass sits in -> brim underside -> rolled brim -> top. */
export const capProfile = smooth(
  [
    [0, 0.309],
    [0.05, 0.309],
    [0.0535, 0.3075],
    [0.0535, 0.2975],
    [0.0545, 0.2955], // collar lip, 10 mm below the glass rim
    [0.0568, 0.2955],
    [0.0577, 0.2975],
    [0.0577, 0.3005],
    [0.06, 0.3015],
    [0.07, 0.3015],
    [0.086, 0.302],
    [0.0895, 0.304], // rolled brim
    [0.0885, 0.3068],
    [0.083, 0.3078],
    [0.07, 0.3095],
    [0.055, 0.3135],
    [0.043, 0.3185],
    [0.037, 0.3255],
    [0.033, 0.3335],
    [0.025, 0.3385],
    [0.012, 0.3405],
    [0, 0.341],
  ],
  160,
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
