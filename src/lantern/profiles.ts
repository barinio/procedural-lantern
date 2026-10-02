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
  topY: 0.312,
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
    [0.053, 0.3],
    [0.051, 0.306],
  ],
  64,
);

export const capProfile = smooth(
  [
    [0.046, 0.302],
    [0.06, 0.3015],
    [0.074, 0.302],
    [0.0775, 0.3045],
    [0.0755, 0.3075],
    [0.068, 0.31],
    [0.052, 0.317],
    [0.04, 0.325],
    [0.033, 0.338],
    [0.026, 0.347],
    [0.012, 0.3515],
    [0, 0.352],
  ],
  80,
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
