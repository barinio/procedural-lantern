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
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.55;
  room.dispose();
  pmrem.dispose();

  scene.background = new Color('#1a1a1e');

  const key = new DirectionalLight('#fff4e6', 1.25);
  key.position.set(0.9, 1.6, 0.7);
  key.target.position.set(0, 0.15, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const cam = key.shadow.camera;
  cam.left = cam.bottom = -0.45;
  cam.right = cam.top = 0.45;
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
