# Procedural Lantern

A kerosene lantern rendered in real time with vanilla three.js. The page loads **no 3D models, no HDRIs and no texture files**. Every part of the scene is generated in code at startup.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc --noEmit && vite build
npm run preview
```

Press `g` to show or hide the tweak panel (lil-gui).

## What is procedural

- **Geometry:** lathe profiles (reservoir, gallery, burner, glass chimney, cap, knurled wheel). Tubes along Catmull-Rom curves for the frame wires and the handle. A torus for the ring. Simple primitives for the wick, spindle and ferrules.
- **Textures:** the brass color map and roughness map are painted on a 2D canvas (seeded blotches and scratches), then used as `CanvasTexture`.
- **Environment:** `RoomEnvironment` goes through `PMREMGenerator` to give image-based lighting with no HDR file. There is one directional key light with soft shadows, plus a hemisphere fill. A gradient backdrop dome (GLSL) sits behind everything. The floor disk blends into the backdrop's horizon color by radius, through an `onBeforeCompile` patch.
- **Flame:** a `ShaderMaterial` with value-noise fbm written in GLSL, plus a flickering point light. The flame shader is opaque with an alpha cutout, because transmission glass only refracts opaque objects.
- **Post:** selective bloom. The flame sits on its own layer. A first composer renders the scene with every other mesh blacked out (glass hidden) and blurs it. A second composer adds that glow onto the normal render, then `OutputPass` applies ACES tone mapping + sRGB.
- **Brass:** `MeshPhysicalMaterial` with anisotropy along the lathe U direction (circular brushing). Real tangents come from `computeTangents()`.

## Files

```
src/
  main.ts            renderer, camera, controls, loop
  environment.ts     IBL, lights, floor
  postfx.ts          composer + bloom
  gui.ts             lil-gui panel (toggle with g)
  style.css
  lantern/
    profiles.ts      lathe profiles, wire/ring layout
    geometry.ts      buildLantern()
    materials.ts     brass / steel / glass + canvas textures
    flame.ts         flame shader + flickering light
docs/
  reference.jpg      original reference render
  screenshots/       captures of this build
```
