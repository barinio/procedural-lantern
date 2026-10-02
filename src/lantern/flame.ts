import { Color, Group, Mesh, PointLight, ShaderMaterial, SphereGeometry } from 'three';
import { BLOOM_LAYER } from '../postfx';

export interface Flame {
  group: Group;
  material: ShaderMaterial;
  light: PointLight;
  params: { brightness: number; lightIntensity: number };
  update(t: number): void;
}

const noiseGlsl = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    return 0.6 * vnoise(p) + 0.3 * vnoise(p * 2.1) + 0.1 * vnoise(p * 4.3);
  }
`;

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  varying float vHeight;
  varying vec3 vLocal;
  ${noiseGlsl}
  void main() {
    vec3 p = position;
    // h: 0 at the base of the unit sphere, 1 at the tip
    float h = clamp(p.y * 0.5 + 0.5, 0.0, 1.0);
    // Teardrop: narrow the top half into a tip
    p.xz *= mix(1.0, 0.15, smoothstep(0.35, 1.0, h));
    // Sway grows towards the tip
    float sway = h * h;
    p.x += sway * (fbm(vec3(uTime * 1.7, 0.0, 0.0)) - 0.5) * 0.5;
    p.z += sway * (fbm(vec3(0.0, uTime * 1.3, 3.0)) - 0.5) * 0.5;
    p.y += sway * (vnoise(vec3(uTime * 3.0, 1.0, 7.0)) - 0.5) * 0.25;
    vHeight = h;
    vLocal = position;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uBrightness;
  uniform vec3 uCore;
  uniform vec3 uEdge;
  uniform vec3 uBase;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  varying float vHeight;
  varying vec3 vLocal;
  ${noiseGlsl}
  void main() {
    float facing = abs(dot(normalize(vNormalV), normalize(vViewDir)));
    float n = fbm(vLocal * 3.0 + vec3(0.0, -uTime * 4.0, 0.0));
    // Alpha cutout instead of blending: the flame must stay opaque to be seen through transmission glass.
    float edge = facing - 0.25 * n - 0.1 * vHeight;
    if (edge < 0.12) discard;
    float core = smoothstep(0.4, 0.95, edge) * (1.0 - 0.5 * smoothstep(0.5, 1.0, vHeight));
    vec3 col = mix(uEdge, uCore, core);
    // Faint blue at the very bottom like a real wick flame
    col = mix(uBase, col, smoothstep(0.0, 0.22, vHeight));
    float fade = 1.0 - 0.35 * smoothstep(0.6, 1.0, vHeight);
    gl_FragColor = vec4(col * uBrightness * fade * (0.75 + 0.5 * n), 1.0);
  }
`;

export function createFlame(): Flame {
  const params = { brightness: 1.0, lightIntensity: 0.06 };
  const group = new Group();

  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBrightness: { value: params.brightness },
      // Linear HDR values chosen so ACES maps the core to ~#fff2c0 instead of clipping to white
      uCore: { value: new Color(1.6, 0.8, 0.1) },
      uEdge: { value: new Color(1.1, 0.32, 0.03) },
      uBase: { value: new Color(0.25, 0.35, 1.0) },
    },
    vertexShader,
    fragmentShader,
    transparent: false,
  });

  const mesh = new Mesh(new SphereGeometry(1, 48, 32), material);
  // Unit sphere scaled into an elongated drop (meters)
  mesh.scale.set(0.0072, 0.021, 0.0072);
  mesh.position.y = 0.133;
  mesh.layers.enable(BLOOM_LAYER);
  group.add(mesh);

  const light = new PointLight('#ffa040', params.lightIntensity, 2, 2);
  light.position.y = 0.14;
  light.castShadow = false;
  group.add(light);

  return {
    group,
    material,
    light,
    params,
    update(t: number) {
      material.uniforms.uTime.value = t;
      material.uniforms.uBrightness.value = params.brightness;
      const flicker =
        1 +
        0.08 * Math.sin(t * 7.3) +
        0.05 * Math.sin(t * 13.1 + 1.7) +
        0.04 * Math.sin(t * 23.7 + 0.4);
      light.intensity = params.lightIntensity * flicker;
    },
  };
}
