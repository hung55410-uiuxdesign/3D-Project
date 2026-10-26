import fs from 'fs';
import path from 'path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, reorder, simplify, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const assetDirs = [
  '3d-assets/sweater',
  '3d-assets/dress',
  '3d-assets/set',
  '3d-assets/shirt',
];

function countVertices(doc) {
  let total = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (pos) total += pos.getCount();
    }
  }
  return total;
}

let grandBeforeVerts = 0;
let grandAfterVerts = 0;
let grandBeforeBytes = 0;
let grandAfterBytes = 0;

for (const dir of assetDirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.glb'));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const statBefore = fs.statSync(filePath);
    grandBeforeBytes += statBefore.size;

    try {
      const doc = await io.read(filePath);
      const beforeVerts = countVertices(doc);
      grandBeforeVerts += beforeVerts;

      // Only simplify if vertex count is high (> 25,000), keeping UV borders locked (lockBorder: true)
      // Textures (doc.getRoot().listTextures()) are NOT modified at all -> 100% original texture quality!
      const targetVerts = 24000;
      const ratio = beforeVerts > targetVerts ? Math.max(0.12, targetVerts / beforeVerts) : 1.0;

      const transforms = [
        dedup(),
        weld(),
      ];

      if (ratio < 0.95) {
        transforms.push(
          simplify({
            simplifier: MeshoptSimplifier,
            ratio,
            error: 0.008,
            lockBorder: true,
          })
        );
      }

      transforms.push(
        reorder({
          encoder: MeshoptEncoder,
          target: 'performance',
        }),
        prune()
      );

      await doc.transform(...transforms);

      const afterVerts = countVertices(doc);
      grandAfterVerts += afterVerts;

      await io.write(filePath, doc);
      const statAfter = fs.statSync(filePath);
      grandAfterBytes += statAfter.size;

      console.log(
        `✓ ${filePath.padEnd(65)} | Verts: ${beforeVerts.toLocaleString().padStart(9)} -> ${afterVerts.toLocaleString().padStart(8)} | MB: ${(statBefore.size / 1048576).toFixed(1)} -> ${(statAfter.size / 1048576).toFixed(1)}`
      );
    } catch (err) {
      console.error(`✗ Skipped ${filePath}:`, err.message);
      grandAfterBytes += statBefore.size;
    }
  }
}

// Also copy optimized blouse to public/models/blank_tshirt.glb
if (fs.existsSync('3d-assets/shirt/black_acetate_loose-fit_blouse.glb')) {
  fs.copyFileSync(
    '3d-assets/shirt/black_acetate_loose-fit_blouse.glb',
    'public/models/blank_tshirt.glb'
  );
}

console.log('================================================================================');
console.log(
  `TOTAL VERTICES: ${grandBeforeVerts.toLocaleString()} -> ${grandAfterVerts.toLocaleString()} (-${(
    (1 - grandAfterVerts / Math.max(1, grandBeforeVerts)) *
    100
  ).toFixed(1)}%)`
);
console.log(
  `TOTAL SIZE:     ${(grandBeforeBytes / 1048576).toFixed(1)} MB -> ${(
    grandAfterBytes / 1048576
  ).toFixed(1)} MB (-${(
    (1 - grandAfterBytes / Math.max(1, grandBeforeBytes)) *
    100
  ).toFixed(1)}%)`
);
