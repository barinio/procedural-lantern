import {
  BufferAttribute,
  CircleGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  Scene,
  WebGLRenderer,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface EnvironmentRig {
  key: DirectionalLight;
  fill: HemisphereLight;
  floor: Mesh;
}

export function setupEnvironment(scene: Scene, renderer: WebGLRenderer): EnvironmentRig {
  // Procedural HDR studio: RoomEnvironment is built from boxes + emissive panels, no files.
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  // Tall, thin bright panel front-left (~20 deg up): a smooth barrel reflects it as one long vertical
  // highlight down the left edge of the glass. A directional light would only give a point highlight.
  const strip = new Mesh(new PlaneGeometry(0.6, 7), new MeshBasicMaterial({ color: new Color().setScalar(80) }));
  strip.position.set(-1.2, 0.45, 0.9).normalize().multiplyScalar(6);
  strip.lookAt(0, strip.position.y, 0);
  room.add(strip);
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.55;
  room.dispose();
  pmrem.dispose();

  scene.background = new Color('#1a1a1e');

  const key = new DirectionalLight('#fff4e6', 1.62);
  // ~35 deg above the horizon, right-front: a longer shadow falling left-back, as in the reference
  key.position.set(1.1, 0.95, 0.8);
  key.target.position.set(0, 0.15, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const cam = key.shadow.camera;
  cam.left = cam.bottom = -0.6;
  cam.right = cam.top = 0.6;
  cam.near = 0.5;
  cam.far = 4;
  key.shadow.radius = 6;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.002;
  scene.add(key, key.target);

  const fill = new HemisphereLight('#b8c4dd', '#2a2622', 0.35);
  scene.add(fill);

  const floorGeo = new CircleGeometry(1.5, 128, 0, Math.PI * 2);
  // Radial falloff baked into vertex colors so the disk melts into the dark background.
  const pos = floorGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i)) / 1.5;
    const v = 0.12 + 0.88 * Math.max(0, 1 - r * r) ** 1.5;
    colors.set([v, v, v], i * 3);
  }
  floorGeo.setAttribute('color', new BufferAttribute(colors, 3));
  const floor = new Mesh(
    floorGeo,
    new MeshStandardMaterial({ color: '#a2a2a8', roughness: 0.8, metalness: 0, vertexColors: true }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  return { key, fill, floor };
}
