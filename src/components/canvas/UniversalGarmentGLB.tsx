'use client';

import React, {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import {
  GarmentModelConfig,
  ProductItem,
} from '@/types/store';
import {
  getEmptyDecalTexture,
  getFabricBumpTexture,
  getFabricWeaveRoughnessTexture,
} from './ProceduralTextures';

// Disable expensive raycasting on high-poly GLB sub-meshes (GarmentItem uses a 12-triangle hitbox proxy)
const NOOP_RAYCAST = () => {};

/**
 * Default keywords to detect and hide non-clothing meshes, floating decals, logos, mannequins, or studio stages
 */
const DEFAULT_HIDDEN_MESH_KEYWORDS = [
  'logo',
  'graphic',
  'decal',
  'print',
  'label',
  'tag',
  'brand',
  'text',
  'sticker',
  'avatar',
  'mannequin',
  'body_dummy',
  'floor',
  'ground',
  'plane',
  'stage',
  'background',
  'camera',
  'light',
];

/**
 * Keywords to detect metallic hardware / accessories (zippers, buttons, buckles, hooks)
 */
const HARDWARE_METAL_KEYWORDS = [
  'zip',
  'zipper',
  'metal',
  'button',
  'buckle',
  'eyelet',
  'drawstring_tip',
  'hanger',
  'hook',
  'slider',
  'stopper',
  'chain',
  'ring',
  'brass',
  'crystal',
  'diamond',
];

/**
 * Keywords to detect collar, cuff, rib, or hem trims that can receive `product.accentColor`
 */
const TRIM_ACCENT_KEYWORDS = [
  'collar',
  'cuff',
  'rib',
  'hem',
  'neckband',
  'trim',
];

/**
 * Real-time GPU Soft-Cloth & Hanger Drape Uniforms stored on `material.userData.shaderUniforms`
 * so `useFrame` can mutate uniform values at 60fps without recompiling shaders or re-rendering React.
 */
export interface ClothShaderUniforms {
  uTime: { value: number };
  uDragX: { value: number };
  uTwistY: { value: number };
  uBBoxMinY: { value: number };
  uBBoxMaxY: { value: number };
  uBBoxMin: { value: THREE.Vector3 };
  uBBoxMax: { value: THREE.Vector3 };
  uSurfaceZ: { value: THREE.Vector2 };
  uShoulderWidth: { value: number };
  uFocusDim: { value: number };
  uHasCustomColorway: { value: number };
  uCustomPrimaryColor: { value: THREE.Color };
  uCustomAccentColor: { value: THREE.Color };
  uCustomPatternMode: { value: number };
  uCustomDecalMap: { value: THREE.Texture };
  uHasCustomDecal: { value: number };
  uDecalSide: { value: number };
  uDecalOffset: { value: THREE.Vector2 };
  uDecalScale: { value: number };
  uDecalRotation: { value: number };
  uDecalAspect: { value: number };
  uDecalOpacity: { value: number };
}

export function createDefaultClothUniforms(
  bboxMinY = -1.52,
  bboxMaxY = -0.04,
  shoulderWidth = 0.2
): ClothShaderUniforms {
  return {
    uTime: { value: 0 },
    uDragX: { value: 0 },
    uTwistY: { value: 0 },
    uBBoxMinY: { value: bboxMinY },
    uBBoxMaxY: { value: bboxMaxY },
    uBBoxMin: { value: new THREE.Vector3(-0.46, bboxMinY, -0.18) },
    uBBoxMax: { value: new THREE.Vector3(0.46, bboxMaxY, 0.18) },
    uSurfaceZ: { value: new THREE.Vector2(0.14, -0.14) },
    uShoulderWidth: { value: shoulderWidth },
    uFocusDim: { value: 1.0 },
    uHasCustomColorway: { value: 0.0 },
    uCustomPrimaryColor: { value: new THREE.Color('#141619') },
    uCustomAccentColor: { value: new THREE.Color('#f2ff00') },
    uCustomPatternMode: { value: 0.0 },
    uCustomDecalMap: { value: getEmptyDecalTexture() },
    uHasCustomDecal: { value: 0.0 },
    uDecalSide: { value: 1.0 },
    uDecalOffset: { value: new THREE.Vector2(0, 0.08) },
    uDecalScale: { value: 0.32 },
    uDecalRotation: { value: 0.0 },
    uDecalAspect: { value: 1.0 },
    uDecalOpacity: { value: 0.95 },
  };
}

/**
 * Injects the GPU Soft-Cloth Vertex Deformation (Static Gravity Slump + Horizontal Trail +
 * 180° Torsional Twist + Subtle Air Ripple) & passes local vertex coordinates for Planar Decal Projection.
 */
export function injectSoftClothVertexShader(
  shader: {
    uniforms: Record<string, { value: unknown }>;
    vertexShader: string;
    fragmentShader: string;
  },
  clothUniforms: ClothShaderUniforms
) {
  shader.uniforms.uTime = clothUniforms.uTime;
  shader.uniforms.uDragX = clothUniforms.uDragX;
  shader.uniforms.uTwistY = clothUniforms.uTwistY;
  shader.uniforms.uBBoxMinY = clothUniforms.uBBoxMinY;
  shader.uniforms.uBBoxMaxY = clothUniforms.uBBoxMaxY;
  shader.uniforms.uBBoxMin = clothUniforms.uBBoxMin;
  shader.uniforms.uBBoxMax = clothUniforms.uBBoxMax;
  shader.uniforms.uShoulderWidth = clothUniforms.uShoulderWidth;
  shader.uniforms.uFocusDim = clothUniforms.uFocusDim;
  shader.uniforms.uHasCustomColorway = clothUniforms.uHasCustomColorway;
  shader.uniforms.uCustomPrimaryColor = clothUniforms.uCustomPrimaryColor;
  shader.uniforms.uCustomAccentColor = clothUniforms.uCustomAccentColor;
  shader.uniforms.uCustomPatternMode = clothUniforms.uCustomPatternMode;
  shader.uniforms.uCustomDecalMap = clothUniforms.uCustomDecalMap;
  shader.uniforms.uHasCustomDecal = clothUniforms.uHasCustomDecal;
  shader.uniforms.uDecalSide = clothUniforms.uDecalSide;
  shader.uniforms.uDecalOffset = clothUniforms.uDecalOffset;
  shader.uniforms.uDecalScale = clothUniforms.uDecalScale;
  shader.uniforms.uDecalRotation = clothUniforms.uDecalRotation;
  shader.uniforms.uDecalAspect = clothUniforms.uDecalAspect;
  shader.uniforms.uDecalOpacity = clothUniforms.uDecalOpacity;

  shader.vertexShader = `
    uniform float uTime;
    uniform float uDragX;
    uniform float uTwistY;
    uniform float uBBoxMinY;
    uniform float uBBoxMaxY;
    uniform float uShoulderWidth;
    varying vec3 vLocalPos;
    varying vec3 vLocalNormal;
  \n` + shader.vertexShader;

  // Store original normal for Front/Back Decal Projection, then rotate vertex normals with torsional twist
  shader.vertexShader = shader.vertexShader.replace(
    '#include <beginnormal_vertex>',
    `#include <beginnormal_vertex>
    vLocalNormal = objectNormal;
    float normBBoxSpanY = max( uBBoxMaxY - uBBoxMinY, 0.001 );
    float normNormalizedY = clamp( ( uBBoxMaxY - position.y ) / normBBoxSpanY, 0.0, 1.0 );
    float normDynamicRegion = smoothstep( 0.18, 1.0, normNormalizedY );
    float normClothWeight = pow( normDynamicRegion, 1.45 );
    float normLagAngle = -uTwistY * normClothWeight * 0.55;
    float normCosA = cos( normLagAngle );
    float normSinA = sin( normLagAngle );
    vec3 twistedNormal = objectNormal;
    twistedNormal.x = objectNormal.x * normCosA - objectNormal.z * normSinA;
    twistedNormal.z = objectNormal.x * normSinA + objectNormal.z * normCosA;
    objectNormal = normalize( twistedNormal );
    `
  );

  // Deform vertex positions in #include <begin_vertex>
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vLocalPos = position.xyz;
    float bboxSpanY = max( uBBoxMaxY - uBBoxMinY, 0.001 );
    float normalizedY = clamp( ( uBBoxMaxY - position.y ) / bboxSpanY, 0.0, 1.0 );

    // 1. Hanger Shoulder Support & Static Gravity Slump:
    // Keep collar & upper shoulders (normalizedY < 0.18) elevated and add subtle upward tenting
    // at the two shoulder peaks (shoulderPeakX = 0.16m) as if supported by an internal hanger inside the garment.
    float pinWeight = smoothstep( 0.0, 0.25, normalizedY );
    float shoulderPeakX = 0.16;
    float shoulderSupport = exp( -pow( ( abs( position.x ) - shoulderPeakX ) * 4.0, 2.0 ) ) * ( 1.0 - smoothstep( 0.0, 0.25, normalizedY ) );
    transformed.y += shoulderSupport * 0.024;

    // Flatten mannequin chest/back puffiness as normalizedY increases downward
    transformed.z *= mix( 0.95, 0.72, pinWeight );

    // Do NOT pull upper shoulders (normalizedY < 0.20) downward; only relax outer sleeves below normalizedY > 0.20
    float outerSpan = max( 0.0, abs( position.x ) - uShoulderWidth );
    float sleeveGravity = smoothstep( 0.20, 0.38, normalizedY );
    transformed.y -= outerSpan * ( 0.22 * pinWeight ) * sleeveGravity;
    transformed.x -= sign( position.x ) * outerSpan * 0.14 * smoothstep( 0.20, 0.42, normalizedY );

    // 2. Soft-Cloth Weight: locked at collar/shoulders (normalizedY < 0.18), soft & fluid below chest (normalizedY > 0.25)
    float dynamicRegion = smoothstep( 0.18, 1.0, normalizedY );
    float clothWeight = pow( dynamicRegion, 1.45 );

    // 3. Horizontal Cloth Trail when sliding left/right along the rack bar
    transformed.x -= uDragX * clothWeight * 0.35;
    transformed.z += abs( uDragX ) * sin( normalizedY * 3.14159265 ) * 0.08;

    // 4. Torsional Cloth Twist when flipping 90/180 degrees between angled rack, front, and back views
    float lagAngle = -uTwistY * clothWeight * 0.55;
    float cosA = cos( lagAngle );
    float sinA = sin( lagAngle );
    float prevX = transformed.x;
    float prevZ = transformed.z;
    transformed.x = prevX * cosA - prevZ * sinA;
    transformed.z = prevX * sinA + prevZ * cosA;

    // 5. Subtle Air Ripple & Motion-Amplified Cloth Wave
    float motionIntensity = clamp( abs( uDragX ) + abs( uTwistY ), 0.0, 1.0 );
    float wave = sin( uTime * 3.5 + position.x * 4.0 + position.y * 2.5 ) * ( 0.008 + motionIntensity * 0.045 ) * clothWeight;
    transformed.z += wave;
    `
  );
}

/**
 * Upgrades Three.js MeshStandardMaterial into a realistic Textile / Cloth shader:
 * - Real-time GPU Soft-Cloth Vertex Deformation (Static Gravity Slump, Horizontal Trail, Torsional Twist, Air Ripple)
 * - Planar DTG Decal Projection onto Front or Back torso before normal/lighting passes so fabric folds & weave show through the print
 * - 3D Spotlight Focus dimming (uFocusDim) for non-selected side garments
 */
export function applyClothShaderRealism(
  stdMat: THREE.MeshStandardMaterial,
  mode: 'matte' | 'semigloss' | 'sequin' | 'hardware',
  sharedUniforms?: ClothShaderUniforms
): ClothShaderUniforms {
  const clothUniforms = sharedUniforms ?? createDefaultClothUniforms();
  stdMat.userData.shaderUniforms = clothUniforms;

  stdMat.customProgramCacheKey = () => `loops_universal_softcloth_${mode}_v14`;
  stdMat.onBeforeCompile = (shader) => {
    injectSoftClothVertexShader(shader, clothUniforms);
    stdMat.userData.shaderUniforms = clothUniforms;

    shader.fragmentShader = `
      uniform vec3 uBBoxMin;
      uniform vec3 uBBoxMax;
      uniform float uFocusDim;
      uniform float uHasCustomColorway;
      uniform vec3 uCustomPrimaryColor;
      uniform vec3 uCustomAccentColor;
      uniform float uCustomPatternMode;
      uniform sampler2D uCustomDecalMap;
      uniform float uHasCustomDecal;
      uniform float uDecalSide;
      uniform vec2 uDecalOffset;
      uniform float uDecalScale;
      uniform float uDecalRotation;
      uniform float uDecalAspect;
      uniform float uDecalOpacity;
      varying vec3 vLocalPos;
      varying vec3 vLocalNormal;
    \n` + shader.fragmentShader;

    if (mode === 'hardware') {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        reflectedLight.directDiffuse *= uFocusDim;
        reflectedLight.indirectDiffuse *= uFocusDim;
        reflectedLight.directSpecular *= uFocusDim;
        reflectedLight.indirectSpecular *= uFocusDim;
        `
      );
      return;
    }

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      diffuseColor.rgb = clamp( diffuseColor.rgb * 0.93 + vec3( 0.014 ), vec3( 0.0 ), vec3( 0.93 ) );
      ${
        mode === 'sequin'
          ? 'diffuseColor.rgb *= vec3( 1.14, 0.93, 0.64 );'
          : ''
      }

      // Real-time Custom Colorway & Garment Surface Pattern / Design Studio
      if ( uHasCustomColorway > 0.5 ) {
        vec3 cwBBoxSize = max( uBBoxMax - uBBoxMin, vec3( 0.0001 ) );
        vec3 cwNormPos = clamp( ( vLocalPos - uBBoxMin ) / cwBBoxSize, 0.0, 1.0 );

        // Preserve underlying fabric knit/seam luminance detail so even textured GLB models look hyper-realistic
        float baseLuma = dot( diffuseColor.rgb, vec3( 0.299, 0.587, 0.114 ) );
        float fabricShade = mix( 1.0, clamp( baseLuma * 1.38 + 0.34, 0.48, 1.18 ), 0.58 );

        float patternMix = 0.0;
        if ( uCustomPatternMode < 0.5 ) {
          // Mode 0: Solid Body + Collar/Hem/Cuff Accent Trim
          float collarTrim = smoothstep( 0.87, 0.92, cwNormPos.y ) * ( 1.0 - smoothstep( 0.16, 0.24, abs( cwNormPos.x - 0.5 ) ) );
          float hemTrim = 1.0 - smoothstep( 0.035, 0.065, cwNormPos.y );
          patternMix = clamp( collarTrim + hemTrim, 0.0, 1.0 );
        } else if ( uCustomPatternMode < 1.5 ) {
          // Mode 1: Two-Tone Streetwear Split (Colorblock Chest/Sleeves vs Lower Torso)
          float splitLine = 0.54 + ( cwNormPos.x - 0.5 ) * 0.16;
          float upperBlock = smoothstep( splitLine - 0.012, splitLine + 0.012, cwNormPos.y );
          float outerSleeves = smoothstep( 0.24, 0.27, abs( cwNormPos.x - 0.5 ) );
          patternMix = clamp( max( upperBlock, outerSleeves ), 0.0, 1.0 );
        } else if ( uCustomPatternMode < 2.5 ) {
          // Mode 2: Ombre Vertical Gradient Fade
          patternMix = smoothstep( 0.12, 0.88, 1.0 - cwNormPos.y );
        } else if ( uCustomPatternMode < 3.5 ) {
          // Mode 3: Streetwear Vertical Pinstripes
          float stripeWave = sin( vLocalPos.x * 56.0 );
          patternMix = smoothstep( 0.25, 0.45, stripeWave );
        } else if ( uCustomPatternMode < 4.5 ) {
          // Mode 4: Y2K Cyber Checker / Grid
          float gx = sin( vLocalPos.x * 38.0 );
          float gy = sin( vLocalPos.y * 38.0 );
          patternMix = smoothstep( -0.1, 0.1, gx * gy );
        } else {
          // Mode 5: Acid Wash / Tie-Dye Organic Marble
          float swirl = sin( vLocalPos.x * 13.0 + sin( vLocalPos.y * 11.0 ) * 2.4 ) * cos( vLocalPos.y * 13.0 - vLocalPos.x * 8.5 );
          patternMix = smoothstep( -0.25, 0.35, swirl );
        }

        vec3 customFabricRgb = mix( uCustomPrimaryColor, uCustomAccentColor, clamp( patternMix, 0.0, 1.0 ) );
        diffuseColor.rgb = clamp( customFabricRgb * fabricShade, vec3( 0.0 ), vec3( 0.94 ) );
      }

      // Real-time DTG Planar Decal Projection (Front / Back Torso Only, Wrinkle & Normal-Map Aware)
      if ( uHasCustomDecal > 0.5 ) {
        vec3 bboxSize = max( uBBoxMax - uBBoxMin, vec3( 0.0001 ) );
        vec3 normPos = clamp( ( vLocalPos - uBBoxMin ) / bboxSize, 0.0, 1.0 );

        // Exclude outer sleeves (abs(normPos.x - 0.5) < 0.28) and extreme collar/hem edges
        float torsoMaskX = 1.0 - smoothstep( 0.23, 0.28, abs( normPos.x - 0.5 ) );
        float torsoMaskY = smoothstep( 0.06, 0.12, normPos.y ) * ( 1.0 - smoothstep( 0.86, 0.94, normPos.y ) );

        // Verify surface faces the selected print side (uDecalSide = +1.0 for front, -1.0 for back)
        float sideNormalMask = smoothstep( 0.05, 0.25, vLocalNormal.z * uDecalSide );
        float centerZ = ( uBBoxMin.z + uBBoxMax.z ) * 0.5;
        float sideDepthMask = smoothstep( -0.015, 0.015, ( vLocalPos.z - centerZ ) * uDecalSide );
        float surfaceMask = torsoMaskX * torsoMaskY * sideNormalMask * sideDepthMask;

        if ( surfaceMask > 0.001 ) {
          float chestCenterX = ( uBBoxMin.x + uBBoxMax.x ) * 0.5;
          float chestCenterY = uBBoxMin.y + bboxSize.y * 0.56;
          float printBaseSpan = min( bboxSize.x * 0.68, bboxSize.y * 0.58 );
          float boxSpan = max( uDecalScale * printBaseSpan, 0.02 );

          vec2 relDecal = vec2(
            ( vLocalPos.x - chestCenterX ) * uDecalSide - uDecalOffset.x * printBaseSpan,
            ( vLocalPos.y - chestCenterY ) - uDecalOffset.y * printBaseSpan
          );
          float cosR = cos( uDecalRotation );
          float sinR = sin( uDecalRotation );
          vec2 rotDecal = vec2(
            relDecal.x * cosR - relDecal.y * sinR,
            relDecal.x * sinR + relDecal.y * cosR
          );

          float aspect = max( uDecalAspect, 0.05 );
          float widthScale = aspect >= 1.0 ? 1.0 : aspect;
          float heightScale = aspect >= 1.0 ? ( 1.0 / aspect ) : 1.0;

          vec2 decalUV = vec2(
            rotDecal.x / ( boxSpan * widthScale ) + 0.5,
            rotDecal.y / ( boxSpan * heightScale ) + 0.5
          );

          if ( decalUV.x >= 0.0 && decalUV.x <= 1.0 && decalUV.y >= 0.0 && decalUV.y <= 1.0 ) {
            vec4 decalColor = texture2D( uCustomDecalMap, decalUV );
            float blendAlpha = clamp( decalColor.a * uDecalOpacity * surfaceMask, 0.0, 1.0 );
            diffuseColor.rgb = mix( diffuseColor.rgb, decalColor.rgb, blendAlpha );
          }
        }
      }
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>
      vec3 dNdx = dFdx( normal );
      vec3 dNdy = dFdy( normal );
      float foldCurvature = clamp( ( length( dNdx ) + length( dNdy ) ) * 2.5, 0.0, 1.0 );
      float underFold = clamp( -normal.y * 0.30, 0.0, 0.24 );
      float cavityAO = 1.0 - clamp( foldCurvature * 0.32 + underFold, 0.0, 0.38 );

      reflectedLight.directDiffuse *= cavityAO;
      reflectedLight.indirectDiffuse *= ( cavityAO * 0.88 );

      float ndotv = clamp( abs( dot( normal, geometryViewDir ) ), 0.0, 1.0 );
      float clothSheen = pow( 1.0 - ndotv, 3.0 ) * 0.075;

      ${
        mode === 'sequin'
          ? `
      float sequinGlint = pow( clamp( 1.0 - abs( normal.x * 0.65 + normal.y * 0.45 ), 0.0, 1.0 ), 5.0 ) * 0.24;
      reflectedLight.directSpecular = reflectedLight.directSpecular * vec3( 1.25, 0.96, 0.52 ) * 0.52 + vec3( 0.96, 0.78, 0.40 ) * sequinGlint;
      reflectedLight.indirectSpecular *= vec3( 1.15, 0.90, 0.50 ) * 0.40;
      `
          : mode === 'semigloss'
          ? `
      reflectedLight.directSpecular *= 0.34;
      reflectedLight.indirectSpecular *= 0.36;
      reflectedLight.directDiffuse += ( diffuseColor.rgb + vec3( 0.06 ) ) * ( clothSheen * 0.55 );
      `
          : `
      reflectedLight.directSpecular *= 0.10;
      reflectedLight.indirectSpecular *= 0.12;
      reflectedLight.directDiffuse += ( diffuseColor.rgb + vec3( 0.05 ) ) * clothSheen;
      `
      }

      // 3D Spotlight Focus: keep active garment 100% vibrant while non-selected side garments smoothly dim
      reflectedLight.directDiffuse *= uFocusDim;
      reflectedLight.indirectDiffuse *= uFocusDim;
      reflectedLight.directSpecular *= uFocusDim;
      reflectedLight.indirectSpecular *= uFocusDim;
      `
    );
  };

  return clothUniforms;
}

/**
 * Computes the world-space bounding box of ONLY visible meshes (`visible === true` for node and all ancestors)
 */
function computeVisibleBoundingBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const tempBox = new THREE.Box3();

  const traverseVisible = (node: THREE.Object3D) => {
    if (!node.visible) return;
    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh;
      if (mesh.geometry) {
        if (!mesh.geometry.boundingBox) {
          mesh.geometry.computeBoundingBox();
        }
        if (mesh.geometry.boundingBox) {
          tempBox.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
          box.union(tempBox);
        }
      }
    }
    for (let i = 0; i < node.children.length; i++) {
      traverseVisible(node.children[i]);
    }
  };

  traverseVisible(root);
  return box;
}

/**
 * Measures the garment's collar/neck horizontal center (X, Z) from the top 16% of visible vertices
 * and the garment's mid-shoulder height (shoulderMaxY at |X| in [0.14m, 0.18m]).
 * This guarantees:
 * 1. The garment's collar/neck is centered at (X = 0, Z = 0) directly under the hanger neck,
 *    preventing front-heavy garments from shifting off the hanger in Z when angled on the rack.
 * 2. The hanger's contoured shoulder arms (Y = -0.115m at |X| = 0.16m) sit INSIDE the garment's
 *    shoulders (Y = -0.105m at |X| = 0.16m) instead of floating in mid-air above the collar.
 */
function computeCollarAndShoulderMetrics(
  root: THREE.Object3D,
  fullBox: THREE.Box3,
  scaleFactor: number
): {
  neckCenterX: number;
  neckCenterZ: number;
  shoulderMaxY: number;
} {
  root.updateMatrixWorld(true);
  const fullSizeY = Math.max(fullBox.max.y - fullBox.min.y, 0.001);
  const fullCenter = new THREE.Vector3();
  fullBox.getCenter(fullCenter);

  const collarMinY = fullBox.max.y - fullSizeY * 0.16;
  const upperTorsoMinY = fullBox.max.y - fullSizeY * 0.35;

  let minCollarX = Infinity;
  let maxCollarX = -Infinity;
  let minCollarZ = Infinity;
  let maxCollarZ = -Infinity;
  let foundCollarVerts = false;

  const v = new THREE.Vector3();

  // Pass 1: Find horizontal center (X, Z) of the collar / upper shoulder zone (top 16% of Y)
  const traversePass1 = (node: THREE.Object3D) => {
    if (!node.visible) return;
    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh;
      const posAttr = mesh.geometry?.attributes?.position;
      if (posAttr) {
        const count = posAttr.count;
        const step = count > 15000 ? Math.ceil(count / 15000) : 1;
        for (let i = 0; i < count; i += step) {
          v.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrixWorld);
          if (v.y >= collarMinY) {
            if (v.x < minCollarX) minCollarX = v.x;
            if (v.x > maxCollarX) maxCollarX = v.x;
            if (v.z < minCollarZ) minCollarZ = v.z;
            if (v.z > maxCollarZ) maxCollarZ = v.z;
            foundCollarVerts = true;
          }
        }
      }
    }
    for (let i = 0; i < node.children.length; i++) {
      traversePass1(node.children[i]);
    }
  };
  traversePass1(root);

  const neckCenterX = foundCollarVerts
    ? (minCollarX + maxCollarX) * 0.5
    : fullCenter.x;

  // Pass 2: Find the inner collar Z thickness center (|X - neckCenterX| * scaleFactor <= 0.14)
  // and the garment's mid-shoulder height (|X - neckCenterX| * scaleFactor in [0.135m, 0.185m])
  let innerCollarMinZ = Infinity;
  let innerCollarMaxZ = -Infinity;
  let foundInnerCollarZ = false;
  let midShoulderMaxY = -Infinity;
  let fallbackShoulderMaxY = -Infinity;

  const traversePass2 = (node: THREE.Object3D) => {
    if (!node.visible) return;
    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh;
      const posAttr = mesh.geometry?.attributes?.position;
      if (posAttr) {
        const count = posAttr.count;
        const step = count > 15000 ? Math.ceil(count / 15000) : 1;
        for (let i = 0; i < count; i += step) {
          v.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrixWorld);
          if (v.y < upperTorsoMinY) continue;
          const absScaledX = Math.abs(v.x - neckCenterX) * scaleFactor;
          if (v.y >= collarMinY && absScaledX <= 0.14) {
            if (v.z < innerCollarMinZ) innerCollarMinZ = v.z;
            if (v.z > innerCollarMaxZ) innerCollarMaxZ = v.z;
            foundInnerCollarZ = true;
          }
          if (absScaledX >= 0.135 && absScaledX <= 0.185) {
            if (v.y > midShoulderMaxY) midShoulderMaxY = v.y;
          }
          if (absScaledX >= 0.08 && absScaledX <= 0.22) {
            if (v.y > fallbackShoulderMaxY) fallbackShoulderMaxY = v.y;
          }
        }
      }
    }
    for (let i = 0; i < node.children.length; i++) {
      traversePass2(node.children[i]);
    }
  };
  traversePass2(root);

  const neckCenterZ = foundInnerCollarZ
    ? (innerCollarMinZ + innerCollarMaxZ) * 0.5
    : foundCollarVerts
    ? (minCollarZ + maxCollarZ) * 0.5
    : fullCenter.z;

  const shoulderMaxY = Number.isFinite(midShoulderMaxY)
    ? midShoulderMaxY
    : Number.isFinite(fallbackShoulderMaxY)
    ? fallbackShoulderMaxY
    : fullBox.max.y - fullSizeY * 0.04;

  return {
    neckCenterX,
    neckCenterZ,
    shoulderMaxY,
  };
}

/**
 * Per-Model Error Boundary: catches missing .glb 404 or GLTFLoader errors per garment
 * so missing models gracefully render the Procedural 3D Fallback without crashing the rack.
 */
export class PerModelErrorBoundary extends Component<
  {
    modelUrl: string;
    fallback: React.ReactNode;
    children: React.ReactNode;
  },
  { hasError: boolean; failedUrl: string | null }
> {
  constructor(props: {
    modelUrl: string;
    fallback: React.ReactNode;
    children: React.ReactNode;
  }) {
    super(props);
    this.state = { hasError: false, failedUrl: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  static getDerivedStateFromProps(
    nextProps: { modelUrl: string },
    prevState: { hasError: boolean; failedUrl: string | null }
  ) {
    if (prevState.hasError && prevState.failedUrl !== nextProps.modelUrl) {
      return { hasError: false, failedUrl: null };
    }
    return null;
  }

  componentDidCatch() {
    this.setState({ hasError: true, failedUrl: this.props.modelUrl });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Module-level cache of verified .glb URLs so we only probe each unique path once
const modelExistenceCache = new Map<string, boolean>();
const modelCheckPending = new Map<string, Promise<boolean>>();

async function checkGlbUrlExists(url: string): Promise<boolean> {
  if (modelExistenceCache.has(url)) {
    return modelExistenceCache.get(url)!;
  }
  if (modelCheckPending.has(url)) {
    return modelCheckPending.get(url)!;
  }

  const promise = (async () => {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const ok =
        res.ok &&
        !(res.headers.get('content-type') || '').includes('text/html');
      modelExistenceCache.set(url, ok);
      return ok;
    } catch {
      modelExistenceCache.set(url, false);
      return false;
    } finally {
      modelCheckPending.delete(url);
    }
  })();

  modelCheckPending.set(url, promise);
  return promise;
}

// Module-level cache of sanitized texture maps (with baked brand watermarks erased)
const sanitizedTextureCache = new Map<string, THREE.Texture>();

/**
 * Removes baked-in brand watermarks (such as the Style3D chest logo inside multi-tone UV islands
 * on `green_and_white_hoodie.glb`) while preserving the garment's multi-tone colorblock texture.
 */
function sanitizeBakedLogoTexture(
  tex: THREE.Texture,
  lowerModelUrl: string
): THREE.Texture {
  if (!lowerModelUrl.includes('green_and_white_hoodie')) {
    return tex;
  }

  const cacheKey = `${lowerModelUrl}_${tex.uuid}`;
  const cached = sanitizedTextureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const img = tex.image as
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap
    | undefined;
  if (!img || typeof document === 'undefined') {
    return tex;
  }

  const w = Number(img.width) || 1024;
  const h = Number(img.height) || 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return tex;
  }

  try {
    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
    // Sample surrounding clean emerald green fabric pixel on the front chest UV island
    const sampleData = ctx.getImageData(
      Math.floor(w * 0.52),
      Math.floor(h * 0.28),
      1,
      1
    ).data;
    const r = sampleData[0] || 52;
    const g = sampleData[1] || 83;
    const b = sampleData[2] || 48;

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    // Erase the baked Style3D chest logo region (X: 57%..70%, Y: 24%..37%)
    ctx.fillRect(
      Math.floor(w * 0.56),
      Math.floor(h * 0.23),
      Math.ceil(w * 0.14),
      Math.ceil(h * 0.15)
    );

    const cleanTex = new THREE.CanvasTexture(canvas);
    cleanTex.flipY = tex.flipY;
    cleanTex.colorSpace = tex.colorSpace;
    cleanTex.wrapS = tex.wrapS;
    cleanTex.wrapT = tex.wrapT;
    cleanTex.anisotropy = 8;
    cleanTex.needsUpdate = true;

    sanitizedTextureCache.set(cacheKey, cleanTex);
    return cleanTex;
  } catch {
    return tex;
  }
}

/**
 * Resolves a product's `GarmentModelConfig` with safe defaults
 */
export function resolveGarmentModelConfig(
  product: ProductItem
): Required<GarmentModelConfig> {
  const cfg = product.modelConfig;
  const modelUrl = cfg?.modelUrl || product.modelUrl || '/models/tshirt.glb';
  const lowerUrl = modelUrl.toLowerCase();
  const isFullLengthAsset =
    product.assetGroup === 'dress' || product.assetGroup === 'set';

  // Single-color template copies in /3d-assets/ that have a baked Style3D logo on solid fabric
  const isSingleColorLogoTemplate =
    lowerUrl.includes('off-white_printed_hoodie') ||
    lowerUrl.includes('apricot_printed_hooded_casual_hoodie') ||
    lowerUrl.includes('cowboy_shirt');

  // Default stripBaseColorMap to true as specified in GarmentModelConfig, unless overridden
  const stripBaseColorMap =
    cfg?.stripBaseColorMap !== undefined
      ? cfg.stripBaseColorMap
      : isSingleColorLogoTemplate
      ? true
      : modelUrl.startsWith('/3d-assets/')
      ? false
      : true;

  return {
    modelUrl,
    targetHeight: cfg?.targetHeight ?? (isFullLengthAsset ? 1.72 : 1.42),
    hookOffsetY: cfg?.hookOffsetY ?? 0,
    stripBaseColorMap,
    stripNormalMap: cfg?.stripNormalMap ?? false,
    roughnessOverride: cfg?.roughnessOverride ?? 0.85,
    hiddenMeshKeywords: cfg?.hiddenMeshKeywords ?? [],
  };
}

/**
 * Core Universal GLB Renderer implementing:
 * 1. GarmentModelConfig
 * 2. Universal Sanitizer (Logo/Decal/Stage removal, Hardware separation, Collar/Cuff accentColor, BaseColor strip, DoubleSide)
 * 3. Auto Bounding-Box Normalization (Visible-only Box3, uniform targetHeight scaling, hanger hook alignment)
 * (No new logo/decal is added onto the garment — only original logos are stripped)
 */
const UniversalGarmentGLBInner: React.FC<{
  product: ProductItem;
  config: Required<GarmentModelConfig>;
}> = ({ product, config }) => {
  const { scene } = useGLTF(config.modelUrl);

  const weaveRoughnessMap = useMemo(
    () => getFabricWeaveRoughnessTexture(),
    []
  );
  const weaveBumpMap = useMemo(() => getFabricBumpTexture(), []);

  const wrapperGroup = useMemo(() => {
    const tempWrapper = new THREE.Group();
    const clonedScene = scene.clone(true);
    const sharedClothUniforms = createDefaultClothUniforms();

    const lowerModelUrl = config.modelUrl.toLowerCase();
    const isSequin = lowerModelUrl.includes('sequin');
    const isSemiGloss =
      lowerModelUrl.includes('leather') ||
      lowerModelUrl.includes('satin') ||
      lowerModelUrl.includes('down_coat');
    const isCutoutLaceDress =
      lowerModelUrl.includes('polka_dot_dress') ||
      lowerModelUrl.includes('black_mesh_dress') ||
      lowerModelUrl.includes('hollowed_floral_dress');

    const allHiddenKeywords = [
      ...DEFAULT_HIDDEN_MESH_KEYWORDS,
      ...config.hiddenMeshKeywords.map((k) => k.toLowerCase()),
    ];

    // =========================================================================
    // STEP 2: UNIVERSAL SANITIZER (Traverse & Filter / Separate / Strip / DoubleSide)
    // =========================================================================
    clonedScene.traverse((child) => {
      const nodeName = (child.name || '').toLowerCase();

      // 2.1 Check if node name matches any non-clothing / logo / decal / stage keyword
      if (
        child !== clonedScene &&
        allHiddenKeywords.some((kw) => nodeName.includes(kw))
      ) {
        child.visible = false;
        return;
      }

      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.raycast = NOOP_RAYCAST;

      const rawMaterials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      // Check if any material on this mesh is a logo/decal/transparent overlay
      const isMeshFabricAllowed =
        nodeName.includes('mesh_fabric') || isCutoutLaceDress;

      for (const rawMat of rawMaterials) {
        if (!rawMat) continue;
        const matName = (rawMat.name || '').toLowerCase();
        const std = rawMat as THREE.MeshStandardMaterial;

        if (allHiddenKeywords.some((kw) => matName.includes(kw))) {
          mesh.visible = false;
          return;
        }

        const isMainFabricMaterial =
          matName.includes('uniform') ||
          matName.includes('fabric') ||
          matName.includes('cloth') ||
          matName.includes('cotton') ||
          matName.includes('knit') ||
          matName.includes('denim');

        if (
          config.stripBaseColorMap &&
          !isMeshFabricAllowed &&
          !isMainFabricMaterial &&
          (std.transparent === true ||
            std.alphaMap !== null ||
            (typeof std.opacity === 'number' && std.opacity < 0.98))
        ) {
          mesh.visible = false;
          return;
        }
      }

      // 2.2 & 2.3 Clone & sanitize each material on the visible garment mesh
      const sanitizeMaterial = (mat: THREE.Material): THREE.Material => {
        const stdMat = (mat as THREE.MeshStandardMaterial).clone();
        const matName = (stdMat.name || '').toLowerCase();
        const combinedIdentifier = `${nodeName} ${matName}`;

        const isHardware = HARDWARE_METAL_KEYWORDS.some((kw) =>
          combinedIdentifier.includes(kw)
        );
        const isTrimPart = TRIM_ACCENT_KEYWORDS.some((kw) =>
          combinedIdentifier.includes(kw)
        );

        // Mandatory DoubleSide so inside of collars, sleeves & hoods never turn invisible
        stdMat.side = THREE.DoubleSide;
        stdMat.depthWrite = true;
        stdMat.depthTest = true;
        stdMat.transparent = false;
        stdMat.alphaTest = isCutoutLaceDress ? 0.22 : 0;

        if (isHardware) {
          // Preserve or upgrade metallic zippers, buttons, buckles, hooks & sync with soft-cloth vertex deformation
          stdMat.metalness = 0.85;
          stdMat.roughness = 0.2;
          stdMat.envMapIntensity = 1.3;
          applyClothShaderRealism(stdMat, 'hardware', sharedClothUniforms);
          stdMat.needsUpdate = true;
          return stdMat;
        }

        // Fabric Material Processing
        if (config.stripNormalMap) {
          stdMat.normalMap = null;
        } else if (stdMat.normalMap) {
          stdMat.normalMap.anisotropy = 8;
          if (stdMat.normalScale) {
            stdMat.normalScale.set(1.3, 1.3);
          }
        } else if (weaveBumpMap) {
          stdMat.bumpMap = weaveBumpMap;
          stdMat.bumpScale = 0.012;
        }

        if (config.stripBaseColorMap) {
          // Strip original BaseColor texture (removes Style3D/brand logos completely) and apply clean solid color
          stdMat.map = null;
          if (isTrimPart && product.accentColor) {
            stdMat.color.set(product.accentColor);
          } else {
            stdMat.color.set(product.baseColor);
          }
        } else {
          if (stdMat.map) {
            stdMat.map = sanitizeBakedLogoTexture(stdMat.map, lowerModelUrl);
            stdMat.map.anisotropy = 8;
          }
        }

        stdMat.metalness = 0.0;
        stdMat.metalnessMap = null;
        stdMat.emissiveMap = null;
        stdMat.roughness = isSequin
          ? 0.58
          : isSemiGloss
          ? 0.72
          : config.roughnessOverride;

        if (!stdMat.roughnessMap && !isSequin) {
          stdMat.roughnessMap = weaveRoughnessMap;
        }

        stdMat.envMapIntensity = isSequin
          ? 0.45
          : isSemiGloss
          ? 0.24
          : 0.15;

        applyClothShaderRealism(
          stdMat,
          isSequin ? 'sequin' : isSemiGloss ? 'semigloss' : 'matte',
          sharedClothUniforms
        );

        stdMat.needsUpdate = true;
        return stdMat;
      };

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(sanitizeMaterial);
      } else if (mesh.material) {
        mesh.material = sanitizeMaterial(mesh.material);
      }
    });

    // =========================================================================
    // STEP 3: AUTO BOUNDING-BOX NORMALIZATION & BAKING INTO NORMALIZED METER SPACE
    // =========================================================================
    tempWrapper.add(clonedScene);
    let box = computeVisibleBoundingBox(tempWrapper);

    if (box.isEmpty()) {
      box = new THREE.Box3().setFromObject(tempWrapper);
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Auto-orient sideways exports so the garment front faces +Z
    if (size.z > size.x * 1.15) {
      clonedScene.rotation.y += Math.PI / 2;
      box = computeVisibleBoundingBox(tempWrapper);
      box.getSize(size);
      box.getCenter(center);
    }

    // Compute scaleFactor based on targetHeight (with width guard so wide sleeves fit the rack cleanly)
    let scaleFactor = (config.targetHeight || 1.65) / Math.max(size.y, 0.001);
    const maxRackWidth = 1.04;
    if (size.x * scaleFactor > maxRackWidth) {
      scaleFactor = maxRackWidth / Math.max(size.x, 0.001);
    }

    // Measure collar horizontal center (X, Z) and mid-shoulder height (Y)
    const { neckCenterX, neckCenterZ, shoulderMaxY } =
      computeCollarAndShoulderMetrics(tempWrapper, box, scaleFactor);

    // Step 2: Automatic Collar Overlap Offset (`collarOverlapOffset`) by garment type
    // Lifts the garment higher so the collar / hood covers the lower stem of the hook,
    // leaving only the black C-hook curve wrapping over the horizontal chrome rack bar.
    const isHoodieOrHighCollar =
      product.type === 'hoodie' ||
      product.type === 'jacket' ||
      lowerModelUrl.includes('hoodie') ||
      lowerModelUrl.includes('jacket') ||
      lowerModelUrl.includes('coat') ||
      lowerModelUrl.includes('sweatshirt') ||
      lowerModelUrl.includes('blazer');

    const baselineTopOffset = -0.265;
    const collarOverlapOffset = isHoodieOrHighCollar ? 0.135 : 0.085;

    // Push all garment models lower down along the taller hanger neck stem,
    // keeping at least 12.5cm of visible hanger stem below the horizontal rack bar (-0.125m)
    // while ensuring the collar/shoulders cover the lower bridge (-0.205m).
    const topBasedPosY =
      -box.max.y * scaleFactor + baselineTopOffset + collarOverlapOffset;
    const shoulderBasedPosY = -0.205 - shoulderMaxY * scaleFactor;
    const maxRackClearancePosY = -box.max.y * scaleFactor - 0.125;
    const basePosY = Math.min(
      Math.max(topBasedPosY, shoulderBasedPosY),
      maxRackClearancePosY
    );

    clonedScene.scale.setScalar(scaleFactor);
    clonedScene.position.set(
      -neckCenterX * scaleFactor,
      basePosY + config.hookOffsetY,
      -neckCenterZ * scaleFactor
    );

    tempWrapper.updateMatrixWorld(true);

    // Bake the normalized world matrix of each visible sub-mesh into its cloned BufferGeometry
    // so that in the GPU Vertex Shader (#include <begin_vertex>), `position` is guaranteed to be
    // in Normalized Garment Space (meters, Y-up, origin (0,0,0) at the Hanger Hook Pivot on the rack bar).
    const bakedWrapper = new THREE.Group();
    const isNodeAndAncestorsVisible = (node: THREE.Object3D): boolean => {
      let curr: THREE.Object3D | null = node;
      while (curr) {
        if (!curr.visible) return false;
        curr = curr.parent;
      }
      return true;
    };

    clonedScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      if (!isNodeAndAncestorsVisible(child)) return;

      const srcMesh = child as THREE.Mesh;
      if (!srcMesh.geometry) return;

      const bakedGeom = srcMesh.geometry.clone();
      bakedGeom.applyMatrix4(srcMesh.matrixWorld);
      bakedGeom.computeBoundingBox();
      bakedGeom.computeBoundingSphere();

      const bakedMesh = new THREE.Mesh(bakedGeom, srcMesh.material);
      bakedMesh.name = srcMesh.name;
      bakedMesh.castShadow = false;
      bakedMesh.receiveShadow = false;
      bakedMesh.raycast = NOOP_RAYCAST;
      bakedWrapper.add(bakedMesh);
    });

    const normalizedBox = computeVisibleBoundingBox(bakedWrapper);
    if (!normalizedBox.isEmpty()) {
      sharedClothUniforms.uBBoxMinY.value = normalizedBox.min.y;
      sharedClothUniforms.uBBoxMaxY.value = normalizedBox.max.y;
      sharedClothUniforms.uBBoxMin.value.copy(normalizedBox.min);
      sharedClothUniforms.uBBoxMax.value.copy(normalizedBox.max);

      const bboxSize = new THREE.Vector3();
      normalizedBox.getSize(bboxSize);
      const chestCenterX = (normalizedBox.min.x + normalizedBox.max.x) * 0.5;
      const chestCenterY = normalizedBox.min.y + bboxSize.y * 0.56;
      let maxChestZ = normalizedBox.max.z * 0.65;
      let minChestZ = normalizedBox.min.z * 0.65;
      let foundChestVerts = false;
      let sampledMaxZ = -Infinity;
      let sampledMinZ = Infinity;

      bakedWrapper.traverse((c) => {
        if (!(c as THREE.Mesh).isMesh) return;
        const posAttr = (c as THREE.Mesh).geometry?.getAttribute('position');
        if (!posAttr) return;
        const step = Math.max(1, Math.floor(posAttr.count / 1200));
        for (let i = 0; i < posAttr.count; i += step) {
          const vx = posAttr.getX(i);
          const vy = posAttr.getY(i);
          if (
            Math.abs(vx - chestCenterX) < bboxSize.x * 0.18 &&
            Math.abs(vy - chestCenterY) < bboxSize.y * 0.16
          ) {
            const vz = posAttr.getZ(i);
            if (vz > sampledMaxZ) sampledMaxZ = vz;
            if (vz < sampledMinZ) sampledMinZ = vz;
            foundChestVerts = true;
          }
        }
      });

      if (foundChestVerts) {
        maxChestZ = sampledMaxZ * 0.76;
        minChestZ = sampledMinZ * 0.76;
      }
      sharedClothUniforms.uSurfaceZ.value.set(maxChestZ, minChestZ);
    }

    bakedWrapper.userData.shaderUniforms = sharedClothUniforms;
    bakedWrapper.updateMatrixWorld(true);
    return bakedWrapper;
  }, [
    scene,
    config,
    product.baseColor,
    product.accentColor,
    weaveRoughnessMap,
    weaveBumpMap,
  ]);

  return (
    <group>
      <primitive object={wrapperGroup} />
    </group>
  );
};

export interface UniversalGarmentGLBProps {
  product: ProductItem;
  fallback: React.ReactNode;
}

/**
 * Public Multi-Model GLB Wrapper with Per-Model Existence Check & PerModelErrorBoundary
 */
export const UniversalGarmentGLB: React.FC<UniversalGarmentGLBProps> = ({
  product,
  fallback,
}) => {
  const config = useMemo(() => resolveGarmentModelConfig(product), [product]);
  const [existsStatus, setExistsStatus] = useState<'checking' | 'ok' | 'missing'>(
    () => {
      if (modelExistenceCache.has(config.modelUrl)) {
        return modelExistenceCache.get(config.modelUrl) ? 'ok' : 'missing';
      }
      return 'checking';
    }
  );

  useEffect(() => {
    let mounted = true;
    if (modelExistenceCache.has(config.modelUrl)) {
      setExistsStatus(
        modelExistenceCache.get(config.modelUrl) ? 'ok' : 'missing'
      );
      return;
    }

    setExistsStatus('checking');
    checkGlbUrlExists(config.modelUrl).then((ok) => {
      if (mounted) {
        setExistsStatus(ok ? 'ok' : 'missing');
      }
    });

    return () => {
      mounted = false;
    };
  }, [config.modelUrl]);

  if (existsStatus === 'missing') {
    return <>{fallback}</>;
  }

  if (existsStatus === 'checking') {
    return <>{fallback}</>;
  }

  return (
    <PerModelErrorBoundary modelUrl={config.modelUrl} fallback={fallback}>
      <Suspense fallback={fallback}>
        <UniversalGarmentGLBInner
          product={product}
          config={config}
        />
      </Suspense>
    </PerModelErrorBoundary>
  );
};
