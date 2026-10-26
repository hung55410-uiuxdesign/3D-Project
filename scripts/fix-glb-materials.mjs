import fs from 'fs';
import path from 'path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const assetDirs = [
  '3d-assets/sweater',
  '3d-assets/dress',
  '3d-assets/set',
  '3d-assets/shirt',
];

let fixedCount = 0;

for (const dir of assetDirs) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.glb')) continue;
    const filePath = path.join(dir, file);
    try {
      const doc = await io.read(filePath);
      let changed = false;
      for (const mat of doc.getRoot().listMaterials()) {
        if (!mat.getDoubleSided()) {
          mat.setDoubleSided(true);
          changed = true;
        }
        if (mat.getAlphaMode() === 'BLEND') {
          mat.setAlphaMode('MASK');
          mat.setAlphaCutoff(0.35);
          changed = true;
        }
      }
      if (changed) {
        await io.write(filePath, doc);
        fixedCount++;
      }
    } catch (err) {
      console.error(`Skipped ${filePath}:`, err.message);
    }
  }
}

console.log(`✓ Fixed material alphaMode (BLEND -> MASK) & doubleSided on ${fixedCount} GLB files.`);
