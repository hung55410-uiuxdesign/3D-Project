const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { NodeIO } = require('@gltf-transform/core');
const { prune } = require('@gltf-transform/functions');

const io = new NodeIO();

const SRC_ROOT = 'D:/Downloads/3d';
const DST_ROOT = '3d-assets';
const GROUPS = ['dress', 'set', 'shirt', 'sweater'];

function isSkipMaterial(matName) {
  const n = (matName || '').toLowerCase();
  return (
    n.includes('button') ||
    n.includes('slider') ||
    n.includes('stopper') ||
    n.includes('eyelet') ||
    n.includes('ring') ||
    n.includes('diamond') ||
    n.includes('crystal') ||
    n.includes('hook') ||
    n.includes('dritz') ||
    n.includes('zipper') ||
    n.includes('teeth') ||
    n.includes('metal') ||
    n.includes('chain') ||
    n.includes('buckle') ||
    n.includes('qiyan') ||
    n === 'front' ||
    n === '1_front' ||
    n.includes('stitch')
  );
}

function isHardwareMaterial(matName) {
  const n = (matName || '').toLowerCase();
  return (
    n.includes('slider') ||
    n.includes('stopper') ||
    n.includes('eyelet') ||
    n.includes('ring') ||
    n.includes('diamond') ||
    n.includes('crystal') ||
    n.includes('hook') ||
    n.includes('dritz') ||
    n.includes('zipper') ||
    n.includes('metal') ||
    n.includes('chain') ||
    n.includes('buckle') ||
    n.includes('qiyan')
  );
}

/**
 * 1. Flood-fill transparent background pixels (alpha < 245) in non-lace baseColorTextures
 *    with the nearest/dominant opaque fabric RGB and alpha=255 so UVs crossing 1.0 or seam margins
 *    never get clipped by alphaTest or bleed white!
 */
async function fixBaseColorTexturesAndAlpha(doc, lowerFile) {
  const isCutoutDress =
    lowerFile === 'polka_dot_dress.glb' ||
    lowerFile === 'black_mesh_dress.glb' ||
    lowerFile === 'hollowed_floral_dress.glb';

  const processedTex = new Set();

  for (const mat of doc.getRoot().listMaterials()) {
    const tex = mat.getBaseColorTexture();
    if (!tex || processedTex.has(tex) || isCutoutDress) continue;
    processedTex.add(tex);

    const img = tex.getImage();
    if (!img) continue;

    const { data, info } = await sharp(Buffer.from(img))
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (info.channels < 4) continue;

    let transparentCount = 0;
    let sumR = 0,
      sumG = 0,
      sumB = 0,
      opaqueCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a >= 220) {
        sumR += data[i];
        sumG += data[i + 1];
        sumB += data[i + 2];
        opaqueCount++;
      } else {
        transparentCount++;
      }
    }

    if (transparentCount > 0 && opaqueCount > 0) {
      const fillR = Math.round(sumR / opaqueCount);
      const fillG = Math.round(sumG / opaqueCount);
      const fillB = Math.round(sumB / opaqueCount);

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 245) {
          if (a === 0) {
            data[i] = fillR;
            data[i + 1] = fillG;
            data[i + 2] = fillB;
          } else {
            const t = a / 255;
            data[i] = Math.round(data[i] * t + fillR * (1 - t));
            data[i + 1] = Math.round(data[i + 1] * t + fillG * (1 - t));
            data[i + 2] = Math.round(data[i + 2] * t + fillB * (1 - t));
          }
          data[i + 3] = 255;
        }
      }

      const fixedPng = await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 },
      })
        .png({ compressionLevel: 6 })
        .toBuffer();
      tex.setImage(fixedPng);
    }
  }
}

/**
 * 2. Repair corrupted Style3D Magenta normal map islands (R > 160, G < 95, B > 160 -> RGB(128, 128, 255))
 */
async function repairMagentaNormalTextures(doc) {
  const processedTextures = new Set();

  for (const mat of doc.getRoot().listMaterials()) {
    const normTex = mat.getNormalTexture();
    if (!normTex || processedTextures.has(normTex)) continue;
    processedTextures.add(normTex);

    const img = normTex.getImage();
    if (!img) continue;

    const { data, info } = await sharp(Buffer.from(img))
      .raw()
      .toBuffer({ resolveWithObject: true });

    let magentaPixels = 0;
    const ch = info.channels;
    for (let i = 0; i < data.length; i += ch) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 160 && g < 95 && b > 160) {
        data[i] = 128;
        data[i + 1] = 128;
        data[i + 2] = 255;
        magentaPixels++;
      }
    }

    if (magentaPixels > 100) {
      const fixedPng = await sharp(data, {
        raw: { width: info.width, height: info.height, channels: ch },
      })
        .png({ compressionLevel: 6 })
        .toBuffer();
      normTex.setImage(fixedPng);
    }
  }
}

function extractPrimitiveComponents(prim, mi, pi, gx, gy, upAxis) {
  const pos = prim.getAttribute('POSITION');
  const uv = prim.getAttribute('TEXCOORD_0');
  const idx = prim.getIndices();
  if (!pos || !idx) return [];

  const vCount = pos.getCount();
  const iCount = idx.getCount();
  const parent = new Int32Array(vCount);
  for (let i = 0; i < vCount; i++) parent[i] = i;

  const find = (x) => {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    let curr = x;
    while (curr !== root) {
      const nxt = parent[curr];
      parent[curr] = root;
      curr = nxt;
    }
    return root;
  };

  const union = (x, y) => {
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry) parent[rx] = ry;
  };

  for (let i = 0; i < iCount; i += 3) {
    union(idx.getScalar(i), idx.getScalar(i + 1));
    union(idx.getScalar(i + 1), idx.getScalar(i + 2));
  }

  const compMap = new Map();
  let orderCounter = 0;

  for (let i = 0; i < vCount; i++) {
    const r = find(i);
    let comp = compMap.get(r);
    if (!comp) {
      comp = {
        root: r,
        mi,
        pi,
        prim,
        order: orderCounter++,
        verts: [],
        tris: [],
        min: [Infinity, Infinity, Infinity],
        max: [-Infinity, -Infinity, -Infinity],
        uMin: Infinity,
        uMax: -Infinity,
        vMin: Infinity,
        vMax: -Infinity,
        avgR: 0,
        outFaces: 0,
        inFaces: 0,
      };
      compMap.set(r, comp);
    }
    comp.verts.push(i);
    const v = pos.getElement(i, []);
    for (let k = 0; k < 3; k++) {
      if (v[k] < comp.min[k]) comp.min[k] = v[k];
      if (v[k] > comp.max[k]) comp.max[k] = v[k];
    }
    if (uv) {
      const u = uv.getElement(i, []);
      if (u[0] < comp.uMin) comp.uMin = u[0];
      if (u[0] > comp.uMax) comp.uMax = u[0];
      if (u[1] < comp.vMin) comp.vMin = u[1];
      if (u[1] > comp.vMax) comp.vMax = u[1];
    }
    const dx = v[0] - gx;
    const dy = (upAxis === 2 ? v[1] : v[2]) - gy;
    comp.avgR += Math.hypot(dx, dy);
  }

  for (let i = 0; i < iCount; i += 3) {
    const ia = idx.getScalar(i);
    const ib = idx.getScalar(i + 1);
    const ic = idx.getScalar(i + 2);
    const r = find(ia);
    const comp = compMap.get(r);
    comp.tris.push(ia, ib, ic);

    const a = pos.getElement(ia, []);
    const b = pos.getElement(ib, []);
    const c = pos.getElement(ic, []);
    const ux = b[0] - a[0],
      uy = b[1] - a[1],
      uz = b[2] - a[2];
    const vx = c[0] - a[0],
      vy = c[1] - a[1],
      vz = c[2] - a[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;

    const cx = (a[0] + b[0] + c[0]) / 3 - gx;
    const cy = ((upAxis === 2 ? a[1] + b[1] + c[1] : a[2] + b[2] + c[2]) / 3) - gy;
    const nHorizY = upAxis === 2 ? ny : nz;

    if (nx * cx + nHorizY * cy >= 0) comp.outFaces++;
    else comp.inFaces++;
  }

  const result = [];
  for (const comp of compMap.values()) {
    comp.avgR /= Math.max(1, comp.verts.length);
    const totalF = comp.outFaces + comp.inFaces;
    comp.outPct = totalF > 0 ? comp.outFaces / totalF : 0.5;
    comp.diag = Math.hypot(
      comp.max[0] - comp.min[0],
      comp.max[1] - comp.min[1],
      comp.max[2] - comp.min[2]
    );
    result.push(comp);
  }
  return result;
}

(async () => {
  let processedFiles = 0;

  for (const g of GROUPS) {
    const srcDir = path.join(SRC_ROOT, g);
    const dstDir = path.join(DST_ROOT, g);
    if (!fs.existsSync(srcDir)) continue;

    for (const file of fs.readdirSync(srcDir)) {
      if (!file.endsWith('.glb')) continue;
      const srcPath = path.join(srcDir, file);
      const dstPath = path.join(dstDir, file);
      const lowerFile = file.toLowerCase();

      const isCutoutDress =
        lowerFile === 'polka_dot_dress.glb' ||
        lowerFile === 'black_mesh_dress.glb' ||
        lowerFile === 'hollowed_floral_dress.glb';
      const isSemiGloss =
        lowerFile.includes('leather') ||
        lowerFile.includes('satin') ||
        lowerFile.includes('sequin') ||
        lowerFile.includes('down_coat');

      // Read 100% pristine un-simplified original GLB
      const doc = await io.read(srcPath);

      // 1. Flood-fill transparent background margins in non-lace textures
      await fixBaseColorTexturesAndAlpha(doc, lowerFile);

      // 2. Repair corrupted Magenta normal maps in the 5 affected files
      const hasMagenta =
        lowerFile.includes('golden_sequin') ||
        lowerFile.includes('business_suit') ||
        lowerFile.includes('sweatshirt_and_jacket') ||
        lowerFile.includes('wide-shoulder_blazer');
      if (hasMagenta) {
        await repairMagentaNormalTextures(doc);
      }

      // 3. Configure clean PBR material flags & detach redundant orange MR / duplicate emissive textures
      for (const mat of doc.getRoot().listMaterials()) {
        const matName = mat.getName() || '';
        const isHw = isHardwareMaterial(matName);

        mat.setDoubleSided(true);
        if (isCutoutDress && mat.getAlphaMode() === 'BLEND') {
          mat.setAlphaMode('MASK');
          mat.setAlphaCutoff(0.25);
        } else if (!isCutoutDress) {
          mat.setAlphaMode('OPAQUE');
        }

        if (!isHw) {
          mat.setMetallicFactor(0.0);
          mat.setRoughnessFactor(isSemiGloss ? 0.68 : 0.92);
          mat.setMetallicRoughnessTexture(null);
          mat.setEmissiveTexture(null);
        }
      }

      // 4. Measure overall garment bounds & horizontal center
      let minAll = [Infinity, Infinity, Infinity];
      let maxAll = [-Infinity, -Infinity, -Infinity];
      let sumX = 0,
        sumY = 0,
        sumZ = 0,
        totalV = 0;

      for (const mesh of doc.getRoot().listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
          const pos = prim.getAttribute('POSITION');
          if (!pos) continue;
          for (let i = 0; i < pos.getCount(); i++) {
            const v = pos.getElement(i, []);
            for (let k = 0; k < 3; k++) {
              if (v[k] < minAll[k]) minAll[k] = v[k];
              if (v[k] > maxAll[k]) maxAll[k] = v[k];
            }
            sumX += v[0];
            sumY += v[1];
            sumZ += v[2];
            totalV++;
          }
        }
      }

      const spanY = maxAll[1] - minAll[1];
      const spanZ = maxAll[2] - minAll[2];
      const upAxis = spanZ > spanY ? 2 : 1;
      const garmentHeight = Math.max(spanY, spanZ, 1e-4);
      const gx = sumX / Math.max(1, totalV);
      const gy = (upAxis === 2 ? sumY : sumZ) / Math.max(1, totalV);

      // 5. Extract components of cloth primitives (excluding stitches, buttons, hardware)
      const allClothComps = [];
      const meshes = doc.getRoot().listMeshes();

      meshes.forEach((mesh, mi) => {
        mesh.listPrimitives().forEach((prim, pi) => {
          const matName = prim.getMaterial()?.getName() || '';
          if (isSkipMaterial(matName)) return;
          const comps = extractPrimitiveComponents(prim, mi, pi, gx, gy, upAxis);
          allClothComps.push(...comps);
        });
      });

      const discardedComps = new Set();

      // Remove untextured solid-white collar interfacing behind floral lace collar in polka_dot_dress.glb
      if (lowerFile === 'polka_dot_dress.glb') {
        for (const c of allClothComps) {
          if (
            c.mi === 2 &&
            c.uMin > 0.21 &&
            c.uMax < 0.46 &&
            c.vMin > 0.68 &&
            c.vMax < 0.88
          ) {
            discardedComps.add(c);
          }
        }
      }

      // 6. Strict Coincident Twin-Sheet Deduplication:
      // Only consider large cloth panels (verts >= 80 && diag >= 8% of garmentHeight)
      // whose min/max match within 2.0% of the component's OWN diagonal size!
      const eligibleComps = allClothComps.filter(
        (c) =>
          !discardedComps.has(c) &&
          c.verts.length >= 80 &&
          c.diag >= garmentHeight * 0.08
      );
      const visited = new Set();

      for (let i = 0; i < eligibleComps.length; i++) {
        const a = eligibleComps[i];
        if (visited.has(a)) continue;

        const cluster = [a];
        visited.add(a);
        const tol = a.diag * 0.02;

        for (let j = i + 1; j < eligibleComps.length; j++) {
          const b = eligibleComps[j];
          if (visited.has(b)) continue;

          const dMin = Math.max(
            Math.abs(a.min[0] - b.min[0]),
            Math.abs(a.min[1] - b.min[1]),
            Math.abs(a.min[2] - b.min[2])
          );
          const dMax = Math.max(
            Math.abs(a.max[0] - b.max[0]),
            Math.abs(a.max[1] - b.max[1]),
            Math.abs(a.max[2] - b.max[2])
          );
          const ratio =
            Math.min(a.verts.length, b.verts.length) /
            Math.max(a.verts.length, b.verts.length);

          if (dMin <= tol && dMax <= tol && ratio >= 0.45) {
            cluster.push(b);
            visited.add(b);
          }
        }

        if (cluster.length > 1) {
          const byPrim = new Map();
          for (const c of cluster) {
            const key = `${c.mi}_${c.pi}`;
            const prev = byPrim.get(key);
            if (!prev) {
              byPrim.set(key, c);
            } else {
              let cWins = false;
              if (
                c.outPct > 0.7 &&
                prev.outPct > 0.7 &&
                Math.abs(c.avgR - prev.avgR) > garmentHeight * 0.001
              ) {
                cWins = c.avgR > prev.avgR;
              } else {
                const cScore =
                  c.verts.length * (1 + c.outPct * 0.15) - c.order * 2;
                const prevScore =
                  prev.verts.length * (1 + prev.outPct * 0.15) - prev.order * 2;
                cWins = cScore > prevScore;
              }
              if (cWins) {
                discardedComps.add(prev);
                byPrim.set(key, c);
              } else {
                discardedComps.add(c);
              }
            }
          }

          const primWinners = Array.from(byPrim.values());
          if (primWinners.length > 1) {
            primWinners.sort((x, y) => {
              if (Math.abs(x.outPct - y.outPct) > 0.35) {
                return y.outPct - x.outPct;
              }
              return y.avgR - x.avgR;
            });
            for (let k = 1; k < primWinners.length; k++) {
              discardedComps.add(primWinners[k]);
            }
          }
        }
      }

      const survivingComps = allClothComps.filter(
        (c) => !discardedComps.has(c)
      );

      // 7. Rebuild index buffers for cloth primitives while preserving 100% of original vertex positions & normals!
      for (const mesh of meshes) {
        for (const prim of mesh.listPrimitives()) {
          const matName = prim.getMaterial()?.getName() || '';
          if (isSkipMaterial(matName)) continue;

          const primComps = survivingComps.filter((c) => c.prim === prim);
          if (primComps.length === 0) {
            prim.dispose();
            continue;
          }

          const newIndices = [];
          for (const c of primComps) {
            for (let i = 0; i < c.tris.length; i++) {
              newIndices.push(c.tris[i]);
            }
          }

          const idxAttr = prim.getIndices();
          idxAttr.setArray(new Uint32Array(newIndices));
        }
        if (mesh.listPrimitives().length === 0) {
          mesh.dispose();
        }
      }

      // Dispose unused orange metallicRoughnessTexture & duplicate emissiveTexture directly
      const usedTextures = new Set();
      for (const mat of doc.getRoot().listMaterials()) {
        if (mat.getBaseColorTexture()) usedTextures.add(mat.getBaseColorTexture());
        if (mat.getNormalTexture()) usedTextures.add(mat.getNormalTexture());
        if (mat.getMetallicRoughnessTexture()) usedTextures.add(mat.getMetallicRoughnessTexture());
        if (mat.getEmissiveTexture()) usedTextures.add(mat.getEmissiveTexture());
      }
      for (const tex of doc.getRoot().listTextures()) {
        if (!usedTextures.has(tex)) {
          tex.dispose();
        }
      }

      await io.write(dstPath, doc);
      processedFiles++;
      console.log(
        `✓ Rebuilt [${processedFiles}/48] ${g}/${file}: 100% original outer geometry, removed ${discardedComps.size} inner twin sheets`
      );
    }
  }

  console.log(`\n=== ALL ${processedFiles} MODELS REBUILT AT 100% ORIGINAL PRECISION ===`);
})();
