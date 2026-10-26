import fs from 'fs';
import path from 'path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const assetDirs = [
  '3d-assets/sweater',
  '3d-assets/dress',
  '3d-assets/set',
  '3d-assets/shirt',
];

let updatedFiles = 0;

for (const dir of assetDirs) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.glb')) continue;
    const filePath = path.join(dir, file);
    const lowerName = file.toLowerCase();

    const isSemiGloss =
      lowerName.includes('leather') ||
      lowerName.includes('satin') ||
      lowerName.includes('sequin') ||
      lowerName.includes('down_coat');

    try {
      const doc = await io.read(filePath);

      for (const mat of doc.getRoot().listMaterials()) {
        const matName = (mat.getName() || '').toLowerCase();
        const isHardware =
          matName.includes('slider') ||
          matName.includes('stopper') ||
          matName.includes('eyelet') ||
          matName.includes('ring') ||
          matName.includes('metal');

        mat.setDoubleSided(true);
        if (mat.getAlphaMode() === 'BLEND') {
          mat.setAlphaMode('MASK');
          mat.setAlphaCutoff(0.35);
        }

        if (!isHardware) {
          // Fabric is a dielectric (non-metal): metallicFactor = 0.0, high matte roughness
          mat.setMetallicFactor(0.0);
          mat.setRoughnessFactor(isSemiGloss ? 0.62 : 0.88);
          // Detach Style3D's artificial orange metallicRoughnessTexture (G=0.5) & duplicate emissiveTexture
          mat.setMetallicRoughnessTexture(null);
          mat.setEmissiveTexture(null);
          mat.setNormalScale(0.55);
        }
      }

      // Special seam fix for green_and_white_hoodie.glb where inner white layer sat 1mm under green collar/shoulder
      if (lowerName === 'green_and_white_hoodie.glb') {
        for (const mesh of doc.getRoot().listMeshes()) {
          for (const prim of mesh.listPrimitives()) {
            const pos = prim.getAttribute('POSITION');
            const uv = prim.getAttribute('TEXCOORD_0');
            if (!pos || !uv) continue;

            // Compute horizontal center (X, Y in Z-up mesh space)
            let cx = 0;
            let cy = 0;
            const count = pos.getCount();
            for (let i = 0; i < count; i++) {
              const p = pos.getElement(i, []);
              cx += p[0];
              cy += p[1];
            }
            cx /= count;
            cy /= count;

            for (let i = 0; i < count; i++) {
              const t = uv.getElement(i, []);
              const p = pos.getElement(i, []);
              const isWhiteLayer = t[0] > 0.79 || t[1] > 0.6;
              // Where the white inner hood/sleeve meets the green outer collar/shoulder (Z between 118 and 138.8)
              if (isWhiteLayer && p[2] > 118 && p[2] < 138.8) {
                p[0] = cx + (p[0] - cx) * 0.94;
                p[1] = cy + (p[1] - cy) * 0.92;
                pos.setElement(i, p);
              }
            }
          }
        }
      }

      // Prune unused duplicate emissive & orange MR textures to save VRAM!
      await doc.transform(prune());
      await io.write(filePath, doc);
      updatedFiles++;
    } catch (err) {
      console.error(`Skipped ${filePath}:`, err.message);
    }
  }
}

console.log(`✓ Upgraded PBR Fabric materials & pruned redundant textures across ${updatedFiles} GLB files.`);
