import { Color, FrontSide, MeshPhysicalMaterial, MeshStandardMaterial, Vector2 } from 'three';
import { createBrassTextures, type BrassTextures, type ScratchParams } from './brassTextures';

export interface LanternMaterials {
  brass: MeshStandardMaterial;
  steel: MeshStandardMaterial;
  glass: MeshPhysicalMaterial;
  wick: MeshStandardMaterial;
  scratches: { params: ScratchParams; textures: BrassTextures };
}

export function createMaterials(): LanternMaterials {
  const scratchParams: ScratchParams = { count: 500, brightness: 1, seed: 7 };
  const brassTextures = createBrassTextures(scratchParams);

  // v1 brass colour and gloss, with the scratched-lacquer maps (generated after the first frame).
  const brass = new MeshStandardMaterial({
    color: new Color('#b08d57'),
    metalness: 1,
    roughness: 0.35,
    map: brassTextures.map,
    roughnessMap: brassTextures.roughnessMap,
    normalMap: brassTextures.normalMap,
    normalScale: new Vector2(0.18, 0.18),
    envMapIntensity: 1,
  });

  const steel = new MeshStandardMaterial({
    color: new Color('#c8cacc'),
    metalness: 1,
    roughness: 0.5,
    envMapIntensity: 0.6,
  });

  // Toned-down glass: weaker reflections and refraction so the ring and wires do not paint
  // bright lines inside the chimney or appear doubled.
  const glass = new MeshPhysicalMaterial({
    color: new Color('#fffaf0'),
    metalness: 0,
    roughness: 0.03,
    transmission: 1,
    ior: 1.3,
    thickness: 0.005,
    specularIntensity: 0.4,
    envMapIntensity: 0.4,
    transparent: false,
    side: FrontSide,
  });

  const wick = new MeshStandardMaterial({
    color: new Color('#2a2420'),
    roughness: 0.95,
    metalness: 0,
  });

  return {
    brass,
    steel,
    glass,
    wick,
    scratches: { params: scratchParams, textures: brassTextures },
  };
}
