const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { NodeIO } = require('@gltf-transform/core');

const io = new NodeIO();

const assetDirs = [
  '3d-assets/dress',
  '3d-assets/set',
  '3d-assets/shirt',
  '3d-assets/sweater',
];

function isHardwareMaterial(matName) {
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
    n.includes('qiyan')
  );
}

async function repairMagentaNormalTextures(doc, fileName) {
  let repairedCount = 0;
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
        .png()
        .toBuffer();
      normTex.setImage(fixedPng);
      repairedCount++;
      console.log(
        `  [NormalFix] ${fileName}: neutralized ${magentaPixels} corrupted magenta pixels in ${mat.getName()}`
      );
    }
  }
  return repairedCount;
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
    const ia = idx.getScalar(i);
    const ib = idx.getScalar(i + 1);
    const ic = idx.getScalar(i + 2);
    union(ia, ib);
    union(ib, ic);
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
    result.push(comp);
  }
  return result;
}

function recomputeCleanClothNormals(prim) {
  const pos = prim.getAttribute('POSITION');
  const norm = prim.getAttribute('NORMAL');
  const idx = prim.getIndices();
  if (!pos || !norm || !idx) return;

  const vCount = pos.getCount();
  const iCount = idx.getCount();

  const accumX = new Float32Array(vCount);
  const accumY = new Float32Array(vCount);
  const accumZ = new Float32Array(vCount);

  for (let i = 0; i < iCount; i += 3) {
    const ia = idx.getScalar(i);
    const ib = idx.getScalar(i + 1);
    const ic = idx.getScalar(i + 2);

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

    accumX[ia] += nx;
    accumY[ia] += ny;
    accumZ[ia] += nz;
    accumX[ib] += nx;
    accumY[ib] += ny;
    accumZ[ib] += nz;
    accumX[ic] += nx;
    accumY[ic] += ny;
    accumZ[ic] += nz;
  }

  for (let i = 0; i < vCount; i++) {
    const len = Math.hypot(accumX[i], accumY[i], accumZ[i]);
    if (len > 1e-8) {
      norm.setElement(i, [accumX[i] / len, accumY[i] / len, accumZ[i] / len]);
    }
  }
}

(async () => {
  let totalBeforeTris = 0;
  let totalAfterTris = 0;

  for (const dir of assetDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.glb')) continue;
      const filePath = path.join(dir, file);
      const lowerFile = file.toLowerCase();

      const doc = await io.read(filePath);

      const hasMagenta =
        lowerFile.includes('golden_sequin') ||
        lowerFile.includes('business_suit') ||
        lowerFile.includes('sweatshirt_and_jacket') ||
        lowerFile.includes('wide-shoulder_blazer');
      if (hasMagenta) {
        await repairMagentaNormalTextures(doc, `${dir}/${file}`);
      }

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

      if (totalV === 0) continue;

      const spanY = maxAll[1] - minAll[1];
      const spanZ = maxAll[2] - minAll[2];
      const upAxis = spanZ > spanY ? 2 : 1;
      const garmentHeight = Math.max(spanY, spanZ, 1e-4);
      const gx = sumX / totalV;
      const gy = (upAxis === 2 ? sumY : sumZ) / totalV;

      const allClothComps = [];
      const meshes = doc.getRoot().listMeshes();

      meshes.forEach((mesh, mi) => {
        mesh.listPrimitives().forEach((prim, pi) => {
          const matName = prim.getMaterial()?.getName() || '';
          const idx = prim.getIndices();
          if (idx) totalBeforeTris += idx.getCount() / 3;

          if (isHardwareMaterial(matName)) return;
          const comps = extractPrimitiveComponents(prim, mi, pi, gx, gy, upAxis);
          allClothComps.push(...comps);
        });
      });

      const discardedComps = new Set();
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

      const bboxTolerance = garmentHeight * 0.026;
      const eligibleComps = allClothComps.filter(
        (c) => !discardedComps.has(c) && c.verts.length >= 28
      );
      const visited = new Set();

      for (let i = 0; i < eligibleComps.length; i++) {
        const a = eligibleComps[i];
        if (visited.has(a)) continue;

        const cluster = [a];
        visited.add(a);

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

          if (dMin <= bboxTolerance && dMax <= bboxTolerance) {
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

      if (lowerFile.startsWith('jk_school_uniform')) {
        for (const c of survivingComps) {
          if (c.min[0] < -80 && c.max[0] > 5 && c.max[0] < 35) {
            const pos = c.prim.getAttribute('POSITION');
            for (const vi of c.verts) {
              const v = pos.getElement(vi, []);
              if (v[0] > -14 && v[0] <= 18 && v[1] < -50) {
                const t = Math.min(1, Math.max(0, (v[0] - -14) / 10));
                v[1] += t * 2.8;
                pos.setElement(vi, v);
              }
            }
          }
        }
      }

      for (const mesh of meshes) {
        for (const prim of mesh.listPrimitives()) {
          const matName = prim.getMaterial()?.getName() || '';
          if (isHardwareMaterial(matName)) {
            const idx = prim.getIndices();
            if (idx) totalAfterTris += idx.getCount() / 3;
            continue;
          }

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
          totalAfterTris += newIndices.length / 3;

          recomputeCleanClothNormals(prim);
        }
        if (mesh.listPrimitives().length === 0) {
          mesh.dispose();
        }
      }

      await io.write(filePath, doc);
      console.log(
        `✓ Optimized ${dir}/${file}: removed ${discardedComps.size} inner-backing twin sheets`
      );
    }
  }

  console.log(
    `\n=== DONE: Triangles reduced from ${Math.round(
      totalBeforeTris
    )} -> ${Math.round(totalAfterTris)} (-${(
      (1 - totalAfterTris / totalBeforeTris) *
      100
    ).toFixed(1)}%) ===`
  );
})();
