import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  Object3D,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { LanternMaterials } from './materials';
import {
  DIM,
  RING_Y,
  WIRE,
  burnerProfile,
  capProfile,
  galleryProfile,
  glassProfile,
  reservoirProfile,
  wheelProfile,
} from './profiles';

const SEGMENTS = 96;
const WIRE_RADIUS = 0.0021;
/** Handle ear: upright ring standing on the brim. */
const EAR = { x: 0.0545, y: 0.3035 };

function shadowed<T extends Object3D>(obj: T, cast = true, receive = true): T {
  obj.castShadow = cast;
  obj.receiveShadow = receive;
  return obj;
}

function lathe(profile: Vector2[], segments = SEGMENTS): LatheGeometry {
  const geo = new LatheGeometry(profile, segments);
  // Real tangents: without them anisotropic brass falls back to per-pixel derivatives and shows facets.
  geo.computeTangents();
  return geo;
}

function frameWire(angle: number): TubeGeometry {
  const points = WIRE.points.map((p) => new Vector3(Math.cos(angle) * p.x, p.y, Math.sin(angle) * p.x));
  return new TubeGeometry(new CatmullRomCurve3(points), 160, WIRE_RADIUS, 12, false);
}

/** Horseshoe bail: ends buried in the cap through the ears, near-vertical lower sides, round top. */
function handle(): TubeGeometry {
  const half: [number, number][] = [
    [0.0535, 0.295], // buried in the brim
    [EAR.x, EAR.y],
    [0.06, 0.311],
    [0.0648, 0.323],
    [0.066, 0.345],
    [0.065, 0.364],
    [0.0575, 0.386],
    [0.04, 0.4025],
    [0.0205, 0.4085],
  ];
  const left = half.map(([x, y]) => new Vector3(-x, y, 0));
  const right = [...half].reverse().map(([x, y]) => new Vector3(x, y, 0));
  const curve = new CatmullRomCurve3([...left, new Vector3(0, 0.41, 0), ...right], false, 'centripetal');
  return new TubeGeometry(curve, 160, 0.0026, 16, false);
}

/** Lathe wheel with its rim radially modulated to read as knurling. */
function knurledWheel(): LatheGeometry {
  const geo = lathe(wheelProfile, 120);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 0.009) continue;
    const a = Math.atan2(z, x);
    const k = 1 + 0.07 * Math.sign(Math.sin(a * 30)) * Math.abs(Math.sin(a * 30)) ** 0.5;
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

export interface LanternParts {
  root: Group;
  glass: Mesh;
  flameAnchor: Object3D;
}

export function buildLantern(materials: LanternMaterials): LanternParts {
  const { brass, steel, glass: glassMat, wick } = materials;
  const root = new Group();
  root.name = 'lantern';

  root.add(shadowed(new Mesh(lathe(reservoirProfile), brass)));
  root.add(shadowed(new Mesh(lathe(galleryProfile), brass)));
  root.add(shadowed(new Mesh(lathe(burnerProfile), brass)));
  root.add(shadowed(new Mesh(lathe(capProfile), brass)));

  // Wick: flat cotton strip poking out of the burner tube
  const wickMesh = shadowed(new Mesh(new BoxGeometry(0.009, 0.008, 0.0016), wick));
  wickMesh.position.y = DIM.wickTop - 0.002;
  root.add(wickMesh);

  // Thumb wheel on a short spindle out of the reservoir wall, upper third of its height
  const wheelGroup = new Group();
  const spindle = shadowed(
    new Mesh(new CylinderGeometry(0.0022, 0.0022, 0.018, 16), brass),
  );
  spindle.rotation.z = Math.PI / 2;
  spindle.position.x = 0.093;
  const wheel = shadowed(new Mesh(knurledWheel(), brass));
  wheel.rotation.z = Math.PI / 2;
  wheel.position.x = 0.0975;
  const knob = shadowed(new Mesh(new CylinderGeometry(0.003, 0.0035, 0.004, 24), brass));
  knob.rotation.z = Math.PI / 2;
  knob.position.x = 0.1025;
  wheelGroup.add(spindle, wheel, knob);
  wheelGroup.position.y = 0.062;
  // Points along +X, midway between two frame wires: right of the default camera,
  // on the side opposite the shadow, as in the reference photo.
  wheelGroup.rotation.y = 0;
  root.add(wheelGroup);

  // Frame wires, diagonal to the handle plane
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + (i * Math.PI) / 2;
    root.add(shadowed(new Mesh(frameWire(angle), steel)));
    // Brass ferrule where the wire enters the reservoir
    const fy = DIM.reservoirTop + 0.002;
    const r = WIRE.radiusAt(fy);
    const ferrule = shadowed(new Mesh(new CylinderGeometry(0.0038, 0.0046, 0.006, 20), brass));
    ferrule.position.set(Math.cos(angle) * r, fy, Math.sin(angle) * r);
    root.add(ferrule);
    // Matching ferrule under the cap brim
    const ty = 0.2875;
    const rTop = WIRE.radiusAt(ty);
    const topFerrule = shadowed(new Mesh(new CylinderGeometry(0.0027, 0.0025, 0.0045, 20), brass));
    topFerrule.position.set(Math.cos(angle) * rTop, ty, Math.sin(angle) * rTop);
    root.add(topFerrule);
  }

  const ring = shadowed(
    new Mesh(new TorusGeometry(WIRE.radiusAt(RING_Y), WIRE_RADIUS * 1.1, 12, 128), steel),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = RING_Y;
  root.add(ring);

  // Handle ears on the cap and the bail itself
  for (const side of [-1, 1]) {
    // Small ring on the brim edge
    const ear = shadowed(new Mesh(new TorusGeometry(0.0046, 0.0015, 10, 32), brass));
    ear.position.set(side * EAR.x, EAR.y, 0);
    // Hole axis (+Z) along the bail's direction where it threads through
    ear.lookAt(new Vector3(side * (EAR.x + 0.0055), EAR.y + 0.0075, 0));
    root.add(ear);
  }
  root.add(shadowed(new Mesh(handle(), steel)));

  // Glass does not cast a shadow: a solid shadow would make it read as opaque.
  const glass = shadowed(new Mesh(lathe(glassProfile), glassMat), false, false);
  root.add(glass);

  const flameAnchor = new Object3D();
  root.add(flameAnchor);

  return { root, glass, flameAnchor };
}
