import {
  BackSide,
  BufferAttribute,
  CircleGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  SphereGeometry,
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

  // Gradient backdrop dome instead of a flat color: the transmission glass refracts whatever is
  // behind it, and a hard floor/black horizon showed up as a sharp band inside the chimney.
  const horizon = new Color('#3a3a40');
  const zenith = new Color('#15151a');
  const backdrop = new Mesh(
    new SphereGeometry(8, 48, 24),
    new ShaderMaterial({
      uniforms: { uHorizon: { value: horizon }, uZenith: { value: zenith } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uHorizon;
        uniform vec3 uZenith;
        varying vec3 vDir;
        void main() {
          float t = smoothstep(0.0, 0.55, vDir.y);
          gl_FragColor = vec4(mix(uHorizon, uZenith, t), 1.0);
        }`,
      side: BackSide,
      depthWrite: false,
    }),
  );
  backdrop.name = 'backdrop';
  scene.add(backdrop);
  scene.background = null;

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
  // Gentle radial falloff baked into vertex colors; the shader patch below finishes the fade.
  const pos = floorGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i)) / 1.5;
    const v = 0.45 + 0.55 * Math.max(0, 1 - r * r) ** 1.5;
    colors.set([v, v, v], i * 3);
  }
  floorGeo.setAttribute('color', new BufferAttribute(colors, 3));
  const floor = new Mesh(
    floorGeo,
    new MeshStandardMaterial({ color: '#a2a2a8', roughness: 0.8, metalness: 0, vertexColors: true }),
  );
  // Blend the lit floor into the backdrop's horizon color by distance from the lantern, so there
  // is no hard floor edge anywhere (seen directly or refracted through the glass).
  floor.material.onBeforeCompile = (shader) => {
    shader.uniforms.uHorizon = { value: horizon };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFloorXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFloorXZ = (modelMatrix * vec4(position, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uHorizon;\nvarying vec2 vFloorXZ;')
      .replace(
        '#include <opaque_fragment>',
        '#include <opaque_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uHorizon, smoothstep(0.45, 1.4, length(vFloorXZ)));',
      );
  };
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  return { key, fill, floor };
}
