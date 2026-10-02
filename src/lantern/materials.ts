import { Color, FrontSide, MeshPhysicalMaterial, MeshStandardMaterial, Vector2 } from 'three';
import { createBrassTextures, type BrassTextures, type ScratchParams } from './brassTextures';

export interface LanternMaterials {
  brass: MeshPhysicalMaterial;
  steel: MeshStandardMaterial;
  glass: MeshPhysicalMaterial;
  wick: MeshStandardMaterial;
  scratches: { params: ScratchParams; textures: BrassTextures };
}

export function createMaterials(): LanternMaterials {
  const scratchParams: ScratchParams = { count: 500, brightness: 1, seed: 7 };
  const brassTextures = createBrassTextures(scratchParams);

  // Darker, olive brass under a scratched lacquer; anisotropy kept low so it does not read as brushed.
  const brass = new MeshPhysicalMaterial({
    color: new Color('#a08445'),
    metalness: 1,
    roughness: 0.52, // x roughnessMap background (~0.86) = ~0.45
    anisotropy: 0.1,
    anisotropyRotation: 0,
    map: brassTextures.map,
    roughnessMap: brassTextures.roughnessMap,
    normalMap: brassTextures.normalMap,
    normalScale: new Vector2(0.18, 0.18),
    envMapIntensity: 1,
  });

  const steel = new MeshStandardMaterial({
    color: new Color('#c8cacc'),
    metalness: 1,
    roughness: 0.35,
    envMapIntensity: 0.8,
  });

  const glass = new MeshPhysicalMaterial({
    color: new Color('#fffaf0'),
    metalness: 0,
    roughness: 0.02,
    transmission: 1,
    ior: 1.45,
    thickness: 0.01,
    specularIntensity: 1,
    envMapIntensity: 1,
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
