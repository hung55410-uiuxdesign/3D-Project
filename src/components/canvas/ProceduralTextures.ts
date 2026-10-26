'use client';

import * as THREE from 'three';
import { ProductItem } from '@/types/store';

const patternTextureCache = new Map<string, THREE.CanvasTexture>();
const decalTextureCache = new Map<string, THREE.CanvasTexture>();
let sharedBumpTexture: THREE.CanvasTexture | null = null;
let sharedRoughnessTexture: THREE.CanvasTexture | null = null;

/**
 * Generates a subtle tileable cloth micro-weave bump/normal map
 */
export function getFabricBumpTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (sharedBumpTexture) return sharedBumpTexture;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    // Subtle woven threads
    for (let y = 0; y < size; y += 2) {
      ctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, y, size, 1);
    }
    for (let x = 0; x < size; x += 2) {
      ctx.fillStyle = x % 4 === 0 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
      ctx.fillRect(x, 0, 1, size);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(22, 22);
  texture.needsUpdate = true;
  sharedBumpTexture = texture;
  return texture;
}

/**
 * Generates a high-frequency woven textile roughness map (values in 0.86..1.0)
 * so cloth scatters light across microscopic fibers instead of reflecting like smooth plastic
 */
export function getFabricWeaveRoughnessTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (sharedRoughnessTexture) return sharedRoughnessTexture;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#ececec';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 2) {
      ctx.fillStyle = y % 4 === 0 ? '#ffffff' : '#d8d8d8';
      ctx.fillRect(0, y, size, 1);
    }
    for (let x = 0; x < size; x += 2) {
      ctx.fillStyle = x % 4 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(195,195,195,0.45)';
      ctx.fillRect(x, 0, 1, size);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(26, 26);
  texture.needsUpdate = true;
  sharedRoughnessTexture = texture;
  return texture;
}

/**
 * Generates procedural HTML5 Canvas fabric texture for any ProductItem
 */
export function createGarmentPatternTexture(
  product: ProductItem
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const cacheKey = `${product.id}_${product.patternType}_${product.baseColor}_${product.accentColor}`;
  if (patternTextureCache.has(cacheKey)) {
    return patternTextureCache.get(cacheKey)!;
  }

  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  const base = product.baseColor || '#d4d4d8';
  const accent = product.accentColor || '#f2ff00';
  const pattern = product.patternType || 'solid';

  // Base fill
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  if (pattern === 'tiedye') {
    // HALFTONE ACID TEE & Tie-Dye garments: swirling acid bursts + halftone dot matrix
    const centerGrad = ctx.createRadialGradient(
      size * 0.48,
      size * 0.42,
      size * 0.04,
      size * 0.5,
      size * 0.48,
      size * 0.65
    );
    centerGrad.addColorStop(0, accent);
    centerGrad.addColorStop(0.28, base);
    centerGrad.addColorStop(0.52, accent);
    centerGrad.addColorStop(0.76, base);
    centerGrad.addColorStop(1, '#091526');
    ctx.fillStyle = centerGrad;
    ctx.fillRect(0, 0, size, size);

    // Organic tie-dye splash blobs
    const blobs = [
      { x: 0.3, y: 0.3, r: 0.28, color: accent },
      { x: 0.72, y: 0.28, r: 0.24, color: accent },
      { x: 0.5, y: 0.68, r: 0.32, color: accent },
      { x: 0.22, y: 0.75, r: 0.22, color: base },
      { x: 0.78, y: 0.72, r: 0.25, color: base },
    ];
    blobs.forEach((b) => {
      const g = ctx.createRadialGradient(
        b.x * size,
        b.y * size,
        10,
        b.x * size,
        b.y * size,
        b.r * size
      );
      g.addColorStop(0, b.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x * size, b.y * size, b.r * size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Halftone dot matrix pattern across torso
    ctx.save();
    const step = 18;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const dx = (x - size * 0.5) / (size * 0.5);
        const dy = (y - size * 0.45) / (size * 0.5);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const wave = Math.sin(dist * 10 - Math.atan2(dy, dx) * 3) * 0.5 + 0.5;
        const radius = Math.max(1.2, wave * 6.5 * (1 - Math.min(0.85, dist * 0.65)));

        ctx.fillStyle = dist % 0.35 < 0.18 ? 'rgba(10, 14, 23, 0.36)' : 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  } else if (pattern === 'stripes') {
    // KIMI VELOUR ZIP & Striped garments: horizontal velour stripes
    const stripeCount = 22;
    const stripeHeight = size / stripeCount;

    for (let i = 0; i < stripeCount; i++) {
      const isAccent = i % 2 === 1;
      ctx.fillStyle = isAccent ? accent : base;
      ctx.fillRect(0, i * stripeHeight, size, stripeHeight + 1);

      // Velour plush sheen gradient inside each stripe
      const sheen = ctx.createLinearGradient(
        0,
        i * stripeHeight,
        0,
        (i + 1) * stripeHeight
      );
      sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
      sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
      sheen.addColorStop(1, 'rgba(0,0,0,0.14)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, i * stripeHeight, size, stripeHeight);
    }
  } else if (pattern === 'harness') {
    // HARNESS TEE & Tactical Harness garments: washed jersey + crimson webbing straps & silver D-rings
    const wash = ctx.createRadialGradient(
      size * 0.5,
      size * 0.45,
      size * 0.05,
      size * 0.5,
      size * 0.5,
      size * 0.7
    );
    wash.addColorStop(0, base);
    wash.addColorStop(1, shadeHexColor(base, -16));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    const strapColor = accent || '#d91e2a';
    const strapWidth = 44;

    const drawStrap = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = strapWidth + 6;
      ctx.beginPath();
      ctx.moveTo(x1, y1 + 4);
      ctx.lineTo(x2, y2 + 4);
      ctx.stroke();

      ctx.strokeStyle = strapColor;
      ctx.lineWidth = strapWidth;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Technical double-stitching along strap edges
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    };

    // Vertical & diagonal tactical straps across torso
    drawStrap(size * 0.34, 0, size * 0.38, size);
    drawStrap(size * 0.66, 0, size * 0.62, size);
    drawStrap(size * 0.15, size * 0.36, size * 0.85, size * 0.36);
    drawStrap(size * 0.25, size * 0.62, size * 0.75, size * 0.62);

    // Metallic O-Rings / Buckles at intersections
    const drawBuckle = (cx: number, cy: number) => {
      ctx.save();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 31, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    drawBuckle(size * 0.36, size * 0.36);
    drawBuckle(size * 0.64, size * 0.36);
    drawBuckle(size * 0.37, size * 0.62);
    drawBuckle(size * 0.63, size * 0.62);
    ctx.restore();
  } else if (pattern === 'custom') {
    // Acid-washed cyber mesh / grid pattern
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, base);
    grad.addColorStop(0.5, shadeHexColor(base, 18));
    grad.addColorStop(1, shadeHexColor(base, -22));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle cyber grid & contrast flatlock seams
    ctx.strokeStyle = `${accent}33`;
    ctx.lineWidth = 2;
    const gridStep = 48;
    for (let i = 0; i < size; i += gridStep) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

    // Ergonomic contour seam lines in accent color
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 6]);
    ctx.beginPath();
    ctx.arc(size * 0.2, size * 0.5, size * 0.25, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size * 0.8, size * 0.5, size * 0.25, Math.PI * 0.6, Math.PI * 1.4);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // Solid garment-dyed enzyme wash with subtle highlight gradient
    const solidGrad = ctx.createRadialGradient(
      size * 0.5,
      size * 0.38,
      size * 0.08,
      size * 0.5,
      size * 0.5,
      size * 0.75
    );
    solidGrad.addColorStop(0, shadeHexColor(base, 14));
    solidGrad.addColorStop(0.6, base);
    solidGrad.addColorStop(1, shadeHexColor(base, -20));
    ctx.fillStyle = solidGrad;
    ctx.fillRect(0, 0, size, size);
  }

  // Subtle fabric weave grain across all garments
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 0; y < size; y += 4) {
    ctx.fillRect(0, y, size, 1.5);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  for (let x = 0; x < size; x += 4) {
    ctx.fillRect(x, 0, 1.5, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;

  patternTextureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Generates a transparent PNG-style Y2K graphic texture for <Decal /> on the garment chest
 */
export function createY2KDecalTexture(product: ProductItem): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const key = `${product.id}_${product.decalUrl || 'loops'}_${product.accentColor}`;
  if (decalTextureCache.has(key)) {
    return decalTextureCache.get(key)!;
  }

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const decalType = product.decalUrl || 'loops-crest';
  const isLightBase = isBrightHex(product.baseColor);
  const primaryInk = isLightBase ? '#111317' : '#f8fafc';
  const highlightInk = product.accentColor || '#f2ff00';

  ctx.save();

  if (decalType === 'harness-sigil') {
    // Tactical Y2K spec box + crosshair
    ctx.strokeStyle = primaryInk;
    ctx.lineWidth = 5;
    ctx.strokeRect(96, 130, 320, 220);

    ctx.fillStyle = highlightInk;
    ctx.fillRect(96, 130, 320, 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EDRIC STUDIO® // ARCHIVE', cx, 160);

    ctx.fillStyle = primaryInk;
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('HARNESS.SYS', cx, 235);

    ctx.font = '700 18px monospace';
    ctx.fillText('RE-WORN TACTICAL UNIT 24/7', cx, 275);
    ctx.fillText('SERIAL: ES-2002-HRN', cx, 310);
  } else if (decalType === 'loops-crest') {
    // Gothic / Y2K oval chrome crest for KIMI VELOUR ZIP
    ctx.strokeStyle = primaryInk;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 185, 110, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = highlightInk;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 172, 97, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = primaryInk;
    ctx.font = 'italic 900 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('edric studio®', cx, cy + 12);

    ctx.font = '700 18px monospace';
    ctx.fillText('EST. 2000 // CURATED DROP', cx, cy + 62);
  } else if (decalType === 'halftone-acid') {
    // Acid smiley / cyber star badge for HALFTONE ACID TEE
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, 155, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f2ff00';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 145, 0, Math.PI * 2);
    ctx.stroke();

    // Cyber four-point star
    drawFourPointStar(ctx, cx, cy - 22, 75, 22, '#f2ff00');

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ACID // 24/7', cx, cy + 88);
  } else if (decalType === 'cyber-star' || decalType === 'chrome-angel') {
    drawFourPointStar(ctx, cx, cy - 10, 145, 36, highlightInk);
    drawFourPointStar(ctx, cx, cy - 10, 95, 20, primaryInk);

    ctx.fillStyle = primaryInk;
    ctx.font = '900 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EDRIC STUDIO® Y2K', cx, cy + 135);
  } else {
    // Default bold Y2K typographic graphic
    ctx.fillStyle = '#f2ff00';
    ctx.fillRect(cx - 170, cy - 75, 340, 95);

    ctx.strokeStyle = primaryInk;
    ctx.lineWidth = 5;
    ctx.strokeRect(cx - 170, cy - 75, 340, 95);

    ctx.fillStyle = '#090a0c';
    ctx.font = '900 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('edric studio®', cx, cy - 12);

    ctx.fillStyle = primaryInk;
    ctx.font = '700 22px monospace';
    ctx.fillText('RARE PIECES // RE-WORN', cx, cy + 68);
  }

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  decalTextureCache.set(key, texture);
  return texture;
}

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function isBrightHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return true;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58;
}

function shadeHexColor(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

// ============================================================================
// CUSTOM PRINT STUDIO: 1x1 Fallback Texture, 3 Y2K Presets & Async Blob Loader
// ============================================================================

let sharedEmptyDecalTexture: THREE.DataTexture | null = null;

export function getEmptyDecalTexture(): THREE.DataTexture {
  if (sharedEmptyDecalTexture) return sharedEmptyDecalTexture;
  const data = new Uint8Array([0, 0, 0, 0]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  sharedEmptyDecalTexture = tex;
  return tex;
}

export interface CustomDecalCacheEntry {
  texture: THREE.Texture;
  ready: boolean;
  aspect: number;
}

const customDecalUrlCache = new Map<string, CustomDecalCacheEntry>();

export function getCustomDecalTextureEntry(
  imageUrl: string | null | undefined
): CustomDecalCacheEntry {
  const empty = getEmptyDecalTexture();
  if (!imageUrl || typeof window === 'undefined') {
    return { texture: empty, ready: false, aspect: 1.0 };
  }

  const cached = customDecalUrlCache.get(imageUrl);
  if (cached) {
    return cached;
  }

  const entry: CustomDecalCacheEntry = {
    texture: empty,
    ready: false,
    aspect: 1.0,
  };
  customDecalUrlCache.set(imageUrl, entry);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const w = Math.max(img.naturalWidth || img.width || 512, 1);
    const h = Math.max(img.naturalHeight || img.height || 512, 1);
    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    entry.texture = tex;
    entry.aspect = w / h;
    entry.ready = true;
  };
  img.src = imageUrl;

  return entry;
}

export interface CustomPrintPresetItem {
  id: 'y2k-crest' | 'cyber-sigil' | 'acid-stamp';
  label: string;
  dataUrl: string;
}

let cachedCustomPrintPresets: CustomPrintPresetItem[] | null = null;

export function getCustomPrintPresets(): CustomPrintPresetItem[] {
  if (typeof document === 'undefined') return [];
  if (cachedCustomPrintPresets) return cachedCustomPrintPresets;

  const makePresetDataUrl = (
    drawFn: (ctx: CanvasRenderingContext2D, s: number) => void
  ): string => {
    const s = 512;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, s, s);
      drawFn(ctx, s);
    }
    return canvas.toDataURL('image/png');
  };

  // Preset 1: Y2K Chrome Crest
  const crestUrl = makePresetDataUrl((ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    ctx.fillStyle = 'rgba(12, 14, 18, 0.88)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 220, 132, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f2ff00';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 212, 124, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 194, 108, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f2ff00';
    ctx.font = 'italic 900 50px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('edric studio®', cx, cy + 12);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px monospace';
    ctx.fillText('ARCHIVE STUDIO // 2026', cx, cy + 68);
  });

  // Preset 2: Cyber Star Sigil
  const sigilUrl = makePresetDataUrl((ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    ctx.strokeStyle = '#f2ff00';
    ctx.lineWidth = 6;
    ctx.strokeRect(56, 56, s - 112, s - 112);

    drawFourPointStar(ctx, cx, cy - 18, 175, 44, '#f2ff00');
    drawFourPointStar(ctx, cx, cy - 18, 115, 24, '#111317');
    drawFourPointStar(ctx, cx, cy - 18, 68, 14, '#ffffff');

    ctx.fillStyle = '#111317';
    ctx.fillRect(82, s - 144, s - 164, 58);
    ctx.strokeStyle = '#f2ff00';
    ctx.lineWidth = 4;
    ctx.strokeRect(82, s - 144, s - 164, 58);

    ctx.fillStyle = '#f2ff00';
    ctx.font = '900 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER // SIGIL 01', cx, s - 104);
  });

  // Preset 3: Acid Spec Stamp
  const stampUrl = makePresetDataUrl((ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    ctx.fillStyle = '#f2ff00';
    ctx.fillRect(64, 96, s - 128, 320);

    ctx.strokeStyle = '#090a0c';
    ctx.lineWidth = 10;
    ctx.strokeRect(64, 96, s - 128, 320);

    ctx.fillStyle = '#090a0c';
    ctx.fillRect(64, 96, s - 128, 72);

    ctx.fillStyle = '#f2ff00';
    ctx.font = '900 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EDRIC STUDIO® // DTG', cx, 142);

    ctx.fillStyle = '#090a0c';
    ctx.font = '900 66px sans-serif';
    ctx.fillText('RARE 24/7', cx, cy + 28);

    ctx.font = '700 22px monospace';
    ctx.fillText('HEAVYWEIGHT ARCHIVE SPEC', cx, cy + 84);
    ctx.fillText('SERIAL NO. ES-8804-X', cx, cy + 122);
  });

  cachedCustomPrintPresets = [
    { id: 'y2k-crest', label: 'Y2K Crest', dataUrl: crestUrl },
    { id: 'cyber-sigil', label: 'Cyber Sigil', dataUrl: sigilUrl },
    { id: 'acid-stamp', label: 'Acid Stamp', dataUrl: stampUrl },
  ];

  return cachedCustomPrintPresets;
}
