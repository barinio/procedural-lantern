import { WebGLRenderer } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import type { Flame } from './lantern/flame';
import type { LanternMaterials } from './lantern/materials';
import type { PostFX } from './postfx';

export function setupGui(
  renderer: WebGLRenderer,
  materials: LanternMaterials,
  postfx: PostFX,
  flame: Flame,
  controls: OrbitControls,
): GUI {
  const gui = new GUI({ title: 'Lantern (g)' });

  const brass = gui.addFolder('Brass');
  brass.addColor(materials.brass, 'color');
  brass.add(materials.brass, 'roughness', 0, 1, 0.01);
  brass.add(materials.brass, 'metalness', 0, 1, 0.01);
  brass.add(materials.brass, 'envMapIntensity', 0, 3, 0.01);
  brass.add(materials.brass, 'anisotropy', 0, 1, 0.01);
  brass.add(materials.brass, 'anisotropyRotation', 0, Math.PI, 0.01);

  const glass = gui.addFolder('Glass');
  glass.add(materials.glass, 'transmission', 0, 1, 0.01);
  glass.add(materials.glass, 'ior', 1, 2.333, 0.01);
  glass.add(materials.glass, 'thickness', 0, 0.2, 0.001);
  glass.add(materials.glass, 'roughness', 0, 1, 0.01);

  const bloom = gui.addFolder('Bloom');
  bloom.add(postfx.bloom, 'strength', 0, 3, 0.01);
  bloom.add(postfx.bloom, 'radius', 0, 1, 0.01);
  bloom.add(postfx.bloom, 'threshold', 0, 5, 0.01);

  const flameFolder = gui.addFolder('Flame');
  flameFolder.add(flame.params, 'brightness', 0, 6, 0.05);
  flameFolder.add(flame.params, 'lightIntensity', 0, 0.5, 0.005).name('light intensity');

  const view = gui.addFolder('View');
  view.add(renderer, 'toneMappingExposure', 0.1, 3, 0.01).name('exposure');
  view.add(controls, 'autoRotate');

  gui.close();
  window.addEventListener('keydown', (e) => {
    if (e.key === 'g' || e.key === 'G') gui.show(gui._hidden);
  });
  return gui;
}
