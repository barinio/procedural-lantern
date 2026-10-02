import {
  Camera,
  Layers,
  Material,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/** Objects on this layer (the flame) are the only ones that bloom. */
export const BLOOM_LAYER = 1;

export interface PostFX {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  render(): void;
  resize(width: number, height: number): void;
}

export function setupPostFX(renderer: WebGLRenderer, scene: Scene, camera: Camera): PostFX {
  const size = renderer.getSize(new Vector2());
  const bloomLayer = new Layers();
  bloomLayer.set(BLOOM_LAYER);

  // Pass 1: the scene with every non-bloom mesh painted black -> bloom only (kept off-screen).
  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(size, 0.45, 0.5, 0);
  bloomComposer.addPass(bloom);

  // Pass 2: the normal scene + bloom texture added on top, then tone mapping in OutputPass.
  const mixPass = new ShaderPass(
    new ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D baseTexture;
        uniform sampler2D bloomTexture;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv);
        }`,
    }),
    'baseTexture',
  );
  mixPass.needsSwap = true;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(mixPass);
  composer.addPass(new OutputPass());

  const black = new MeshBasicMaterial({ color: 0x000000 });
  const saved = new Map<Mesh, Material | Material[]>();
  const hidden: Object3D[] = [];

  function darken(obj: Object3D): void {
    if (!(obj as Mesh).isMesh || bloomLayer.test(obj.layers)) return;
    const mesh = obj as Mesh;
    // Transmissive glass would hide the flame in a black pass, so drop it instead of blackening it.
    if ((mesh.material as { transmission?: number }).transmission) {
      if (mesh.visible) hidden.push(mesh);
      mesh.visible = false;
      return;
    }
    saved.set(mesh, mesh.material);
    mesh.material = black;
  }

  function restore(): void {
    for (const [mesh, mat] of saved) mesh.material = mat;
    saved.clear();
    for (const obj of hidden) obj.visible = true;
    hidden.length = 0;
  }

  return {
    composer,
    bloom,
    render() {
      const background = scene.background;
      const autoShadow = renderer.shadowMap.autoUpdate;
      scene.background = null;
      renderer.shadowMap.autoUpdate = false; // shadows are only needed for the main pass
      scene.traverse(darken);
      bloomComposer.render();
      restore();
      scene.background = background;
      renderer.shadowMap.autoUpdate = autoShadow;
      composer.render();
    },
    resize(width, height) {
      for (const c of [bloomComposer, composer]) {
        c.setPixelRatio(renderer.getPixelRatio());
        c.setSize(width, height);
      }
    },
  };
}
