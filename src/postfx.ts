import { Camera, Scene, Vector2, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export interface PostFX {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  resize(width: number, height: number): void;
}

export function setupPostFX(renderer: WebGLRenderer, scene: Scene, camera: Camera): PostFX {
  const size = renderer.getSize(new Vector2());
  // Composer targets are HalfFloat, so values > 1 survive until bloom; threshold > 1 keeps metal speculars out.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(size, 0.35, 0.4, 3.2);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  return {
    composer,
    bloom,
    resize(width, height) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    },
  };
}
