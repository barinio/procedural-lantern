import './style.css';

const startMs = performance.now();
import {
  ACESFilmicToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  Timer,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setupEnvironment } from './environment';
import { setupGui } from './gui';
import { createFlame } from './lantern/flame';
import { buildLantern } from './lantern/geometry';
import { createMaterials } from './lantern/materials';
import { setupPostFX } from './postfx';

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
// PCFSoftShadowMap is removed in r18x (it logs a warning); PCF + shadow.radius gives the soft edge.
renderer.shadowMap.type = PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new Scene();
const camera = new PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.01, 20);
// Reference framing: front, ~25 deg to the right, looking down ~20 deg, 1.49 m away.
// A longer lens (20 deg FOV) keeps perspective from inflating the cap/handle vs the reservoir.
camera.position.set(0.591, 0.719, 1.268);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.21, 0);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.4;
controls.minDistance = 0.2;
controls.maxDistance = 3;
controls.maxPolarAngle = Math.PI * 0.49;
controls.update();

setupEnvironment(scene, renderer);
const materials = createMaterials();
const lantern = buildLantern(materials);
scene.add(lantern.root);

const flame = createFlame();
lantern.flameAnchor.add(flame.group);

const postfx = setupPostFX(renderer, scene, camera);
postfx.resize(window.innerWidth, window.innerHeight);
setupGui(renderer, materials, postfx, flame, controls);

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  postfx.resize(w, h);
});

(window as unknown as { __lantern: unknown }).__lantern = { camera, controls, renderer, scene, postfx, flame };

const timer = new Timer();
timer.connect(document);
let firstFrame = true;
renderer.setAnimationLoop((time) => {
  timer.update(time);
  flame.update(timer.getElapsed());
  controls.update(timer.getDelta());
  postfx.render();
  if (firstFrame) {
    firstFrame = false;
    if (import.meta.env.DEV) {
      const now = performance.now();
      console.info(`[lantern] first frame: ${Math.round(now - startMs)} ms after script start, ${Math.round(now)} ms after navigation`);
    }
  }
});
