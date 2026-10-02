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

function shadowed<T extends Object3D>(obj: T, cast = true, receive = true): T {
  obj.castShadow = cast;
  obj.receiveShadow = receive;
  return obj;
}

function lathe(profile: Vector2[], segments = SEGMENTS): LatheGeometry {
  return new LatheGeometry(profile, segments);
}

function frameWire(angle: number): TubeGeometry {
  const points: Vector3[] = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const y = WIRE.bottomY + ((WIRE.topY - WIRE.bottomY) * i) / steps;
    const r = WIRE.radiusAt(y);
    points.push(new Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
  }
  return new TubeGeometry(new CatmullRomCurve3(points), 96, WIRE_RADIUS, 12, false);
}

function handle(): TubeGeometry {
  const curve = new CatmullRomCurve3(
    [
      new Vector3(-0.047, 0.321, 0),
      new Vector3(-0.061, 0.365, 0),
      new Vector3(-0.06, 0.41, 0),
      new Vector3(-0.04, 0.446, 0),
      new Vector3(0, 0.46, 0),
      new Vector3(0.04, 0.446, 0),
      new Vector3(0.06, 0.41, 0),
      new Vector3(0.061, 0.365, 0),
      new Vector3(0.047, 0.321, 0),
    ],
    false,
    'centripetal',
  );
  return new TubeGeometry(curve, 128, 0.0026, 16, false);
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
  wickMesh.position.y = 0.102;
  root.add(wickMesh);

  // Thumb wheel on a short spindle, sticking out of the burner collar
  const wheelGroup = new Group();
  const spindle = shadowed(
    new Mesh(new CylinderGeometry(0.0022, 0.0022, 0.04, 16), brass),
  );
  spindle.rotation.z = Math.PI / 2;
  spindle.position.x = 0.04;
  const wheel = shadowed(new Mesh(knurledWheel(), brass));
  wheel.rotation.z = Math.PI / 2;
  wheel.position.x = 0.061;
  const knob = shadowed(new Mesh(new CylinderGeometry(0.003, 0.0035, 0.004, 24), brass));
  knob.rotation.z = Math.PI / 2;
  knob.position.x = 0.066;
  wheelGroup.add(spindle, wheel, knob);
  wheelGroup.position.y = 0.07;
  // Points along +X, midway between two frame wires: opposite the shadow, as in the reference.
  wheelGroup.rotation.y = 0;
  root.add(wheelGroup);

  // Frame wires, diagonal to the handle plane
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + (i * Math.PI) / 2;
    root.add(shadowed(new Mesh(frameWire(angle), steel)));
    // Brass ferrule where the wire enters the reservoir
    const r = WIRE.radiusAt(0.064);
    const ferrule = shadowed(new Mesh(new CylinderGeometry(0.0038, 0.0046, 0.006, 20), brass));
    ferrule.position.set(Math.cos(angle) * r, 0.064, Math.sin(angle) * r);
    root.add(ferrule);
  }

  const ring = shadowed(
    new Mesh(new TorusGeometry(WIRE.radiusAt(RING_Y), WIRE_RADIUS * 1.1, 12, 128), steel),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = RING_Y;
  root.add(ring);

  // Handle ears on the cap and the bail itself
  for (const side of [-1, 1]) {
    const ear = shadowed(new Mesh(new TorusGeometry(0.0045, 0.0016, 10, 32), brass));
    ear.position.set(side * 0.047, 0.321, 0);
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
