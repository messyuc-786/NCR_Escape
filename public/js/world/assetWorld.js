// Additive visual-art layer for NCR ESCAPE.
//
// Loads a Blender-authored glTF (public/assets/world/ncr-world.glb) built directly
// from this project's own live road-network coordinates (public/js/roads/network.js),
// so every road ribbon, bridge pylon, flyover pillar and building block in the GLB is
// spatially anchored to exactly where the procedural game world already expects them.
//
// This module is PURELY VISUAL. It never touches collision, physics, traffic, or race
// logic — those all continue to run against the existing procedural geometry in
// world/district.js and roads/network.js exactly as before. If this file fails to load
// (missing GLB, network error, older browser) the game must keep working unmodified;
// callers should treat loadAssetWorld() as best-effort and never block boot on it.

import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';

const ASSET_URL = '/assets/world/ncr-world.glb';

/**
 * Loads the Blender-authored world GLB and adds it to the given Three.js scene as a
 * pure visual overlay. Resolves with { object, loaded: true } on success, or
 * { object: null, loaded: false, error } if it could not be loaded — callers should
 * treat the latter as a soft failure, not a fatal one.
 *
 * @param {THREE.Scene} scene
 * @param {{ visible?: boolean }} [options]
 */
export function loadAssetWorld(scene, options = {}) {
  const { visible = true } = options;
  const loader = new GLTFLoader();

  return new Promise((resolve) => {
    loader.load(
      ASSET_URL,
      (gltf) => {
        const root = gltf.scene;
        root.name = 'NCR_AssetWorld';
        root.visible = visible;
        root.traverse((node) => {
          // Visual-only: never participates in raycasting/collision queries.
          node.userData.isAssetWorldVisual = true;
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        scene.add(root);
        window.__NCR_ASSET_WORLD_READY = true;
        resolve({ object: root, loaded: true });
      },
      undefined,
      (error) => {
        console.warn('[assetWorld] failed to load', ASSET_URL, '— continuing with procedural-only visuals.', error);
        window.__NCR_ASSET_WORLD_READY = false;
        resolve({ object: null, loaded: false, error });
      }
    );
  });
}
