'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { damp, damp3 } from 'maath/easing';
import {
  ArrowCounterClockwise,
  ArrowsClockwise,
  ArrowsOutCardinal,
  Check,
  Plus,
  Sparkle,
  Trash,
} from '@phosphor-icons/react';
import {
  CameraViewMode,
  CustomColorwayConfig,
  CustomPrintConfig,
  DEFAULT_CUSTOM_PRINT_CONFIG,
  GARMENT_DESIGN_PATTERNS,
  ProductItem,
} from '@/types/store';
import { RACK_TOP_BAR_Y } from './ChromeRack';
import {
  getCustomDecalTextureEntry,
  getFabricBumpTexture,
} from './ProceduralTextures';
import {
  applyClothShaderRealism,
  ClothShaderUniforms,
  createDefaultClothUniforms,
  UniversalGarmentGLB,
} from './UniversalGarmentGLB';

/**
 * Default to true to render the real 3D .glb models via UniversalGarmentGLB.
 */
export const USE_GLB_MODELS = true;

// Disable Three.js raycast on high-poly GLB sub-meshes (we use a 12-triangle hitbox proxy instead!)
const NOOP_RAYCAST = () => {};

export interface GarmentItemProps {
  product: ProductItem;
  index: number;
  totalItems: number;
  activeIndex: number | null;
  viewMode: CameraViewMode;
  useGlbModels?: boolean;
  customPrint?: CustomPrintConfig;
  customColorway?: CustomColorwayConfig;
  isDirectDragPrintMode?: boolean;
  externalFlippedBack?: boolean;
  onChangeFlippedBack?: (flipped: boolean) => void;
  onUpdateCustomPrint?: (
    updater: (prev: CustomPrintConfig) => CustomPrintConfig
  ) => void;
  onFocusIndex: (index: number) => void;
  onOpenQuickView: (product: ProductItem) => void;
}

/**
 * Helper to compute the target X coordinate along the rack bar for item `index`
 */
export function getGarmentTargetX(
  index: number,
  totalItems: number,
  activeIndex: number | null,
  viewMode: CameraViewMode
): number {
  const centerIndex = (totalItems - 1) / 2;
  const baseSpacing = viewMode === 'overview' ? 0.39 : 0.44;
  const baseX = (index - centerIndex) * baseSpacing;

  if (activeIndex === null) {
    return baseX;
  }

  const spreadOffset = 0.68;
  if (index < activeIndex) {
    return baseX - spreadOffset;
  }
  if (index > activeIndex) {
    return baseX + spreadOffset;
  }
  return baseX;
}

/**
 * Creates a sculpted 3D garment torso BufferGeometry for the procedural mode / fallback
 */
function createSculptedTorsoGeometry(type: ProductItem['type']): THREE.BufferGeometry {
  const height = type === 'jacket' || type === 'hoodie' ? 1.32 : type === 'tank' ? 1.22 : 1.28;
  const radialSegments = 32;
  const heightSegments = 20;

  const geom = new THREE.CylinderGeometry(0.38, 0.42, height, radialSegments, heightSegments, false);
  const pos = geom.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    vertex.fromBufferAttribute(pos, i);
    const normalizedY = (vertex.y + height / 2) / height;
    const angle = Math.atan2(vertex.z, vertex.x);

    let widthScale = 1.16;
    let depthScale = 0.42;

    if (type === 'tank') {
      if (normalizedY > 0.58) {
        const armholePinch = Math.sin(((normalizedY - 0.58) / 0.42) * Math.PI * 0.75);
        widthScale -= armholePinch * 0.28;
      }
    } else if (type === 'hoodie' || type === 'jacket') {
      widthScale = 1.22;
      depthScale = 0.48;
      if (normalizedY < 0.12) {
        const ribPinch = (0.12 - normalizedY) / 0.12;
        widthScale -= ribPinch * 0.12;
      }
    }

    if (normalizedY > 0.86) {
      const shoulderSlope = (normalizedY - 0.86) / 0.14;
      widthScale *= 1 - shoulderSlope * 0.35;
      depthScale *= 1 - shoulderSlope * 0.25;
    }

    const drapeStrength = (1 - normalizedY * 0.75) * 0.016;
    const foldWave =
      Math.sin(angle * 6) * drapeStrength +
      Math.cos(angle * 10 + normalizedY * 2) * (drapeStrength * 0.5);

    vertex.x = vertex.x * widthScale + Math.cos(angle) * foldWave;
    vertex.z = vertex.z * depthScale + Math.sin(angle) * foldWave;

    if (vertex.z > 0) {
      vertex.z += Math.sin(normalizedY * Math.PI) * 0.028;
    }

    pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geom.computeVertexNormals();
  return geom;
}

/**
 * 1D Hooke's Law Spring state & semi-implicit Euler integrator (stiffness: 120, damping: 14)
 */
interface SpringState1D {
  value: number;
  velocity: number;
}

function stepSpring1D(
  spring: SpringState1D,
  target: number,
  dt: number,
  stiffness = 120,
  damping = 14
): number {
  const clampedDt = Math.min(Math.max(dt, 0.001), 0.05);
  const subSteps = 2;
  const subDt = clampedDt / subSteps;

  for (let i = 0; i < subSteps; i++) {
    const displacement = spring.value - target;
    const acceleration = -stiffness * displacement - damping * spring.velocity;
    spring.velocity += acceleration * subDt;
    spring.value += spring.velocity * subDt;
  }

  return spring.value;
}

/**
 * Procedural 3D Garment Sub-Component (Fallback or when toggled to Procedural Mode)
 */
const ProceduralGarmentMesh: React.FC<{ product: ProductItem }> = ({ product }) => {
  const torsoMeshRef = useRef<THREE.Mesh>(null!);

  const torsoGeometry = useMemo(
    () => createSculptedTorsoGeometry(product.type),
    [product.type]
  );
  const bumpTexture = useMemo(() => getFabricBumpTexture(), []);

  const isLongSleeve = product.type === 'hoodie' || product.type === 'jacket';
  const isTank = product.type === 'tank';
  const hasHood = product.type === 'hoodie';
  const hasZipper = product.type === 'hoodie' || product.type === 'jacket';

  const sharedClothUniforms = useMemo(
    () => createDefaultClothUniforms(-0.68, 0.68, 0.2),
    []
  );

  const fabricMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: product.baseColor,
      bumpMap: bumpTexture ?? undefined,
      bumpScale: 0.008,
      roughness: 0.86,
      metalness: 0.0,
      envMapIntensity: 0.3,
      side: THREE.DoubleSide,
    });
    applyClothShaderRealism(mat, 'matte', sharedClothUniforms);
    return mat;
  }, [product.baseColor, bumpTexture, sharedClothUniforms]);

  const accentMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: product.accentColor || product.baseColor,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    applyClothShaderRealism(mat, 'matte', sharedClothUniforms);
    return mat;
  }, [product.accentColor, product.baseColor, sharedClothUniforms]);

  return (
    <group
      position={[0, -0.82, 0]}
      userData={{ shaderUniforms: sharedClothUniforms }}
    >
      <mesh
        ref={torsoMeshRef}
        geometry={torsoGeometry}
        material={fabricMaterial}
        raycast={NOOP_RAYCAST}
      />

      <mesh
        position={[0, 0.62, 0.01]}
        rotation={[Math.PI * 0.52, 0, 0]}
        material={accentMaterial}
        raycast={NOOP_RAYCAST}
      >
        <torusGeometry args={[0.17, 0.032, 12, 24]} />
      </mesh>

      <mesh
        position={[0, 0.61, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={NOOP_RAYCAST}
      >
        <circleGeometry args={[0.155, 16]} />
        <meshStandardMaterial color="#0b0c0e" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {!isTank && (
        <>
          <group
            position={[-0.47, isLongSleeve ? 0.18 : 0.34, 0]}
            rotation={[0, 0, isLongSleeve ? 0.34 : 0.56]}
          >
            <mesh
              scale={[1, 1, 0.72]}
              material={fabricMaterial}
              raycast={NOOP_RAYCAST}
            >
              <cylinderGeometry
                args={[
                  0.145,
                  isLongSleeve ? 0.115 : 0.155,
                  isLongSleeve ? 0.82 : 0.42,
                  20,
                ]}
              />
            </mesh>
          </group>

          <group
            position={[0.47, isLongSleeve ? 0.18 : 0.34, 0]}
            rotation={[0, 0, isLongSleeve ? -0.34 : -0.56]}
          >
            <mesh
              scale={[1, 1, 0.72]}
              material={fabricMaterial}
              raycast={NOOP_RAYCAST}
            >
              <cylinderGeometry
                args={[
                  0.145,
                  isLongSleeve ? 0.115 : 0.155,
                  isLongSleeve ? 0.82 : 0.42,
                  20,
                ]}
              />
            </mesh>
          </group>
        </>
      )}

      {hasHood && (
        <group position={[0, 0.68, -0.08]}>
          <mesh
            scale={[1.05, 0.85, 0.95]}
            material={fabricMaterial}
            raycast={NOOP_RAYCAST}
          >
            <sphereGeometry args={[0.24, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.68]} />
          </mesh>
        </group>
      )}

      {hasZipper && (
        <group position={[0, 0, 0.182]}>
          <mesh raycast={NOOP_RAYCAST}>
            <boxGeometry args={[0.022, 1.26, 0.012]} />
            <meshStandardMaterial color="#d4d8dd" metalness={0.88} roughness={0.2} />
          </mesh>
        </group>
      )}
    </group>
  );
};

const HANGER_GLB_PATH = '/ultis/clothes_hanger.glb';
useGLTF.preload(HANGER_GLB_PATH);

let cachedHookGeometry: THREE.BufferGeometry | null = null;
let cachedBodyGeometry: THREE.BufferGeometry | null = null;
let sharedHookMaterial: THREE.MeshStandardMaterial | null = null;
let sharedBodyMaterial: THREE.MeshStandardMaterial | null = null;

function getSplitHangerParts(scene: THREE.Group) {
  if (
    cachedHookGeometry &&
    cachedBodyGeometry &&
    sharedHookMaterial &&
    sharedBodyMaterial
  ) {
    return {
      hookGeometry: cachedHookGeometry,
      bodyGeometry: cachedBodyGeometry,
      hookMaterial: sharedHookMaterial,
      bodyMaterial: sharedBodyMaterial,
    };
  }

  let sourceGeom: THREE.BufferGeometry | null = null;
  scene.traverse((child) => {
    if (!sourceGeom && (child as THREE.Mesh).isMesh) {
      sourceGeom = (child as THREE.Mesh).geometry;
    }
  });

  if (!sourceGeom) {
    return null;
  }

  const nonIndexed = (sourceGeom as THREE.BufferGeometry).index
    ? (sourceGeom as THREE.BufferGeometry).toNonIndexed()
    : (sourceGeom as THREE.BufferGeometry).clone();

  const posAttr = nonIndexed.getAttribute('position');
  const vertCount = posAttr.count;

  const hookPositions: number[] = [];
  const bodyPositions: number[] = [];

  const toUpright = (idx: number): [number, number, number] => {
    const rx = posAttr.getX(idx);
    const ry = posAttr.getY(idx);
    const rz = posAttr.getZ(idx);
    // Transform from raw STL/GLTF space into upright world space centered on X=0, Z=0
    const wx = rx - 17.21783065;
    const wy = rz - 4.02624082;
    const wz = -(ry - 1.21992552);
    return [wx, wy, wz];
  };

  const hookScaleXZ = 0.022;
  const hookScaleY = 0.025;
  // Compact concealed inner-collar bridge scale (< 8.5cm total width, never pokes out of collars/hoods)
  const bridgeScaleX = 0.011;
  const bridgeScaleY = 0.014;
  const bridgeScaleZ = 0.012;

  for (let i = 0; i < vertCount; i += 3) {
    const v0 = toUpright(i);
    const v1 = toUpright(i + 1);
    const v2 = toUpright(i + 2);
    const avgY = (v0[1] + v1[1] + v2[1]) / 3;
    const maxAbsX = Math.max(
      Math.abs(v0[0]),
      Math.abs(v1[0]),
      Math.abs(v2[0])
    );

    // 1. Top Swivel Hook Curve (wy >= 4.05, |wx| <= 2.8): origin (0,0,0) at C-hole center (wy = 6.85)
    if (avgY >= 4.05 && maxAbsX <= 2.8) {
      for (const v of [v0, v1, v2]) {
        hookPositions.push(
          v[0] * hookScaleXZ,
          (v[1] - 6.85) * hookScaleY,
          v[2] * hookScaleXZ
        );
      }
    }

    // 2. Concealed Inner Collar Bridge: ONLY keep the central neck apex (wy in [2.3, 4.15], |wx| <= 3.6)
    // Eliminates the long horizontal shoulder wings so the hanger NEVER pokes through hoods, collars, or shoulders.
    if (avgY >= 2.3 && avgY <= 4.15 && maxAbsX <= 3.6) {
      for (const v of [v0, v1, v2]) {
        bodyPositions.push(
          v[0] * bridgeScaleX,
          (v[1] - 4.1) * bridgeScaleY,
          v[2] * bridgeScaleZ
        );
      }
    }
  }

  cachedHookGeometry = new THREE.BufferGeometry();
  cachedHookGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(hookPositions, 3)
  );
  cachedHookGeometry.computeVertexNormals();

  cachedBodyGeometry = new THREE.BufferGeometry();
  cachedBodyGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(bodyPositions, 3)
  );
  cachedBodyGeometry.computeVertexNormals();

  sharedHookMaterial = new THREE.MeshStandardMaterial({
    color: '#181a1e',
    roughness: 0.3,
    metalness: 0.48,
    envMapIntensity: 1.0,
    side: THREE.DoubleSide,
  });

  sharedBodyMaterial = new THREE.MeshStandardMaterial({
    color: '#14161a',
    roughness: 0.42,
    metalness: 0.28,
    envMapIntensity: 0.8,
    side: THREE.DoubleSide,
  });

  return {
    hookGeometry: cachedHookGeometry,
    bodyGeometry: cachedBodyGeometry,
    hookMaterial: sharedHookMaterial,
    bodyMaterial: sharedBodyMaterial,
  };
}

/**
 * Concealed Neck-Hook Hanger (/public/ultis/clothes_hanger.glb):
 * 1. Top Hook Curve: Wraps perpendicularly around the horizontal chrome rack bar at (0, 0, 0).
 * 2. Vertical Neck Stem: Plunges 0.20 units straight down into the center of the garment's collar (X=0, Z=0)
 *    so there is never an air gap between the hook and the garment.
 * 3. Compact Inner Collar Bridge (< 8.5cm wide): Tucked deep inside the neck cavity at Y = -0.15m,
 *    guaranteed never to pierce through hoodies, collars, or shoulders.
 */
const GlbClothesHanger: React.FC<{
  parentGroupRef: React.RefObject<THREE.Group>;
}> = ({ parentGroupRef }) => {
  const { scene } = useGLTF(HANGER_GLB_PATH);
  const hookMeshRef = useRef<THREE.Mesh>(null!);

  const parts = useMemo(() => getSplitHangerParts(scene), [scene]);

  useFrame(() => {
    if (hookMeshRef.current && parentGroupRef.current) {
      // Keep the C-hook perpendicular to the World-X horizontal rack bar regardless of garment rotation
      hookMeshRef.current.rotation.y =
        Math.PI / 2 - parentGroupRef.current.rotation.y;
    }
  });

  if (!parts) return null;

  return (
    <group>
      {/* 1. Top Hook Curve: C-hole centered at (0, 0, 0) wrapping over the horizontal chrome bar */}
      <mesh
        ref={hookMeshRef}
        geometry={parts.hookGeometry}
        material={parts.hookMaterial}
        position={[0, 0, 0]}
        raycast={NOOP_RAYCAST}
      />

      {/* 2. Tall Vertical Neck Stem: Extends from Y = -0.04 down to Y = -0.34 to push models lower below the rack bar */}
      <mesh
        position={[0, -0.19, 0]}
        material={parts.hookMaterial}
        raycast={NOOP_RAYCAST}
      >
        <cylinderGeometry args={[0.0052, 0.0058, 0.3, 12]} />
      </mesh>

      {/* 3. Concealed Inner Collar Bridge (< 8.5cm wide): Lowered to Y = -0.265 inside the garment neck cavity */}
      <mesh
        geometry={parts.bodyGeometry}
        material={parts.bodyMaterial}
        position={[0, -0.265, 0]}
        raycast={NOOP_RAYCAST}
      />
    </group>
  );
};

/**
 * Boutique Hanger wrapper with Suspense around /ultis/clothes_hanger.glb
 */
const BoutiqueHanger: React.FC<{
  parentGroupRef: React.RefObject<THREE.Group>;
}> = ({ parentGroupRef }) => {
  return (
    <group name="boutique-hanger">
      <Suspense fallback={null}>
        <GlbClothesHanger parentGroupRef={parentGroupRef} />
      </Suspense>
    </group>
  );
};

export const GarmentItem: React.FC<GarmentItemProps> = ({
  product,
  index,
  totalItems,
  activeIndex,
  viewMode,
  useGlbModels = USE_GLB_MODELS,
  customPrint,
  customColorway,
  isDirectDragPrintMode = false,
  externalFlippedBack,
  onChangeFlippedBack,
  onUpdateCustomPrint,
  onFocusIndex,
  onOpenQuickView,
}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const decalGizmoAnchorRef = useRef<THREE.Group>(null!);
  const gizmoBoxRef = useRef<HTMLDivElement | null>(null);
  const decalGizmoWorldVecRef = useRef(new THREE.Vector3());

  const [hovered, setHovered] = useState(false);
  const [internalFlippedBack, setInternalFlippedBack] = useState(false);
  const [isGizmoSelected, setIsGizmoSelected] = useState(true);
  const [activeGizmoAction, setActiveGizmoAction] = useState<
    'none' | 'move' | 'scale' | 'rotate'
  >('none');

  const isActive = activeIndex === index;
  const isFlippedBack =
    isActive && externalFlippedBack !== undefined
      ? externalFlippedBack
      : internalFlippedBack;

  const setFlippedBack = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? next(isFlippedBack) : next;
    setInternalFlippedBack(resolved);
    if (isActive && onChangeFlippedBack) {
      onChangeFlippedBack(resolved);
    }
  };

  // Automatically select gizmo when a new graphic is uploaded or side changes
  useEffect(() => {
    if (customPrint?.enabled && customPrint?.imageUrl) {
      setIsGizmoSelected(true);
    }
  }, [customPrint?.enabled, customPrint?.imageUrl, customPrint?.side]);

  // Progressive staggered GLB mounting
  const [glbReady, setGlbReady] = useState(false);
  useEffect(() => {
    setGlbReady(false);
    const distFromCenter = Math.abs(index - (totalItems - 1) / 2);
    const delayMs = Math.round(distFromCenter * 85);
    const timer = setTimeout(() => setGlbReady(true), delayMs);
    return () => clearTimeout(timer);
  }, [product, index, totalItems]);

  // Automatically reset 180° flip state when switching items or leaving focus
  useEffect(() => {
    if (!isActive) {
      setInternalFlippedBack(false);
    }
  }, [isActive, activeIndex, product.id, viewMode]);

  // Keyboard shortcut 'F' to flip 180° between Front and Back when this garment is active
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setFlippedBack((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Live screen-space metrics computed at 60fps in useFrame so Gizmo matches the 3D shader decal 1:1
  const gizmoMetricsRef = useRef({
    baseSpanPx: 220,
    widthPx: 120,
    heightPx: 120,
  });

  // Interactive On-Shirt Transform Session State (Move, Corner Resize/Scale, Rotate)
  const transformSessionRef = useRef<{
    action: 'none' | 'move' | 'scale' | 'rotate';
    moved: boolean;
    startX: number;
    startY: number;
    centerX: number;
    centerY: number;
    startDist: number;
    startAngleDeg: number;
    initOffsetX: number;
    initOffsetY: number;
    initScale: number;
    initRotation: number;
  }>({
    action: 'none',
    moved: false,
    startX: 0,
    startY: 0,
    centerX: 0,
    centerY: 0,
    startDist: 100,
    startAngleDeg: 0,
    initOffsetX: 0,
    initOffsetY: 0.08,
    initScale: 0.32,
    initRotation: 0,
  });

  useEffect(() => {
    if (!isActive) return;

    const handlePointerMove = (e: PointerEvent) => {
      const sess = transformSessionRef.current;
      if (sess.action === 'none' || !onUpdateCustomPrint) return;

      const dx = e.clientX - sess.startX;
      const dy = e.clientY - sess.startY;
      if (Math.hypot(dx, dy) > 2) {
        sess.moved = true;
      }

      if (sess.action === 'move') {
        const baseSpanPx = Math.max(gizmoMetricsRef.current.baseSpanPx, 60);
        const nextX = THREE.MathUtils.clamp(
          Number((sess.initOffsetX + dx / baseSpanPx).toFixed(3)),
          -0.45,
          0.45
        );
        const nextY = THREE.MathUtils.clamp(
          Number((sess.initOffsetY - dy / baseSpanPx).toFixed(3)),
          -0.45,
          0.45
        );
        onUpdateCustomPrint((prev) => ({
          ...prev,
          offsetX: nextX,
          offsetY: nextY,
        }));
      } else if (sess.action === 'scale') {
        const currDist = Math.hypot(
          e.clientX - sess.centerX,
          e.clientY - sess.centerY
        );
        const ratio = currDist / Math.max(sess.startDist, 10);
        const nextScale = THREE.MathUtils.clamp(
          Number((sess.initScale * ratio).toFixed(3)),
          0.08,
          0.88
        );
        onUpdateCustomPrint((prev) => ({
          ...prev,
          scale: nextScale,
        }));
      } else if (sess.action === 'rotate') {
        const currAngleDeg =
          Math.atan2(e.clientY - sess.centerY, e.clientX - sess.centerX) *
          (180 / Math.PI);
        const deltaDeg = currAngleDeg - sess.startAngleDeg;
        const rawDeg = sess.initRotation + deltaDeg;
        let wrapped = ((((rawDeg + 180) % 360) + 360) % 360) - 180;

        if (e.shiftKey) {
          wrapped = Math.round(wrapped / 15) * 15;
        } else {
          const snapTargets = [0, 90, -90, 180, -180];
          for (const target of snapTargets) {
            if (Math.abs(wrapped - target) <= 2.5) {
              wrapped = target === -180 ? 180 : target;
              break;
            }
          }
        }

        onUpdateCustomPrint((prev) => ({
          ...prev,
          rotation: Math.round(wrapped),
        }));
      }
    };

    const handlePointerUp = () => {
      if (transformSessionRef.current.action !== 'none') {
        transformSessionRef.current.action = 'none';
        setActiveGizmoAction('none');
        if (typeof document !== 'undefined') {
          document.body.style.cursor = 'auto';
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isActive, onUpdateCustomPrint]);

  const beginGizmoTransform = (
    e: React.PointerEvent,
    action: 'move' | 'scale' | 'rotate'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!customPrint) return;

    setIsGizmoSelected(true);
    setActiveGizmoAction(action);

    let centerX = e.clientX;
    let centerY = e.clientY;
    if (gizmoBoxRef.current) {
      const rect = gizmoBoxRef.current.getBoundingClientRect();
      centerX = rect.left + rect.width * 0.5;
      centerY = rect.top + rect.height * 0.5;
    }

    const startDist = Math.max(
      Math.hypot(e.clientX - centerX, e.clientY - centerY),
      12
    );
    const startAngleDeg =
      Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

    transformSessionRef.current = {
      action,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      centerX,
      centerY,
      startDist,
      startAngleDeg,
      initOffsetX: customPrint.offsetX,
      initOffsetY: customPrint.offsetY,
      initScale: customPrint.scale,
      initRotation: customPrint.rotation,
    };

    if (typeof document !== 'undefined') {
      document.body.style.cursor =
        action === 'move'
          ? 'grabbing'
          : action === 'rotate'
          ? 'grabbing'
          : 'nwse-resize';
    }
  };

  const initialX = useMemo(
    () => getGarmentTargetX(index, totalItems, null, 'overview'),
    [index, totalItems]
  );

  const physicsRef = useRef({
    initialized: false,
    prevPosX: initialX,
    prevRotY: Math.PI * 0.42,
    currentRotY: Math.PI * 0.42,
    currentFocusDim: 1.0,
    swaySpring: { value: 0, velocity: 0 } as SpringState1D,
    dragXSpring: { value: 0, velocity: 0 } as SpringState1D,
    twistYSpring: { value: 0, velocity: 0 } as SpringState1D,
  });

  // 60FPS Damped Animation + 180° Flip Torsional Whip + Spring Pendulum Physics + Custom Print Decal & Gizmo Sync
  useFrame((state, rawDelta) => {
    if (!groupRef.current) return;

    const dt = Math.min(Math.max(rawDelta, 0.001), 0.05);
    const physics = physicsRef.current;

    const targetX = getGarmentTargetX(index, totalItems, activeIndex, viewMode);
    let targetRotY = Math.PI * 0.42;

    if (isActive) {
      const idleSway = Math.sin(state.clock.elapsedTime * 1.6) * 0.035;
      const flipBaseAngle = isFlippedBack ? Math.PI : 0;
      targetRotY = flipBaseAngle + idleSway;
    } else if (activeIndex !== null) {
      targetRotY = Math.PI * 0.44;
    } else if (hovered && viewMode !== 'overview') {
      targetRotY = Math.PI * 0.32;
    }

    // 1. Damp position along the horizontal chrome rack bar (Pivot locked at Y = RACK_TOP_BAR_Y, Z = 0)
    damp3(
      groupRef.current.position,
      [targetX, RACK_TOP_BAR_Y, 0],
      0.18,
      dt
    );

    // 2. Damp base Y rotation around the hanger neck (smoothTime = 0.28 when active for 180° Torsional Whip)
    const rotSmoothTime = isActive ? 0.28 : 0.18;
    damp(physics, 'currentRotY', targetRotY, rotSmoothTime, dt);

    // 3D Spotlight Focus: keep active garment at 1.0 brightness, dim non-selected side garments to 0.42
    const targetFocusDim = activeIndex === null || isActive ? 1.0 : 0.42;
    damp(physics, 'currentFocusDim', targetFocusDim, 0.22, dt);

    const currentPosX = groupRef.current.position.x;
    const currentRotY = physics.currentRotY;

    if (!physics.initialized) {
      physics.prevPosX = currentPosX;
      physics.prevRotY = currentRotY;
      physics.initialized = true;
    }

    // 3. Compute real-time linear & angular velocities
    const linearVelocityX = (currentPosX - physics.prevPosX) / dt;
    const angularVelocityY = (currentRotY - physics.prevRotY) / dt;

    physics.prevPosX = currentPosX;
    physics.prevRotY = currentRotY;

    // 4. Spring Pendulum at Top Hook (stiffness: 120, damping: 14)
    const breezeZ = Math.sin(state.clock.elapsedTime * 1.2 + index * 0.7) * 0.008;
    const breezeX = hovered && !isActive ? -0.02 : 0;

    const targetSwayZ =
      THREE.MathUtils.clamp(-linearVelocityX * 0.075, -0.26, 0.26) + breezeZ;
    const swayAngleZ = stepSpring1D(
      physics.swaySpring,
      targetSwayZ,
      dt,
      120,
      14
    );

    // 5. Spring-smoothed Cloth Follow-Through (`uDragX`) & 180° Torsional Twist (`uTwistY`)
    const targetDragX = THREE.MathUtils.clamp(
      linearVelocityX * 0.24,
      -0.85,
      0.85
    );
    const smoothDragX = stepSpring1D(
      physics.dragXSpring,
      targetDragX,
      dt,
      120,
      14
    );

    const targetTwistY = THREE.MathUtils.clamp(
      angularVelocityY * 0.28,
      -1.55,
      1.55
    );
    const smoothTwistY = stepSpring1D(
      physics.twistYSpring,
      targetTwistY,
      dt,
      120,
      14
    );

    // Euler order 'ZXY' ensures `swayAngleZ` swings the entire hanger + garment as a pendulum
    // along the World-X horizontal rack bar around the hook pivot point (currentPosX, RACK_TOP_BAR_Y, 0)
    groupRef.current.rotation.order = 'ZXY';
    groupRef.current.rotation.set(breezeX, currentRotY, swayAngleZ);

    // 6. Stream `uTime`, `uDragX`, `uTwistY`, `uFocusDim`, Custom Colorway & Custom Print Decal uniforms into `material.userData.shaderUniforms`
    const elapsedTime = state.clock.elapsedTime + index * 0.45;
    const hasCustomDecal = Boolean(
      customPrint && customPrint.enabled && customPrint.imageUrl
    );
    const decalEntry = hasCustomDecal
      ? getCustomDecalTextureEntry(customPrint!.imageUrl)
      : null;

    const hasCustomColorway = Boolean(customColorway && customColorway.enabled);
    const patternShaderCode = hasCustomColorway
      ? GARMENT_DESIGN_PATTERNS.find((p) => p.id === customColorway!.pattern)
          ?.shaderCode ?? 0
      : 0;

    let primaryUniforms: ClothShaderUniforms | null = null;

    const syncUniforms = (u: ClothShaderUniforms | undefined) => {
      if (!u) return;
      if (!primaryUniforms) primaryUniforms = u;
      u.uTime.value = elapsedTime;
      u.uDragX.value = smoothDragX;
      u.uTwistY.value = smoothTwistY;
      u.uFocusDim.value = physics.currentFocusDim;

      if (hasCustomColorway && customColorway) {
        u.uHasCustomColorway.value = 1.0;
        u.uCustomPrimaryColor.value.set(customColorway.primaryColor);
        u.uCustomAccentColor.value.set(customColorway.accentColor);
        u.uCustomPatternMode.value = patternShaderCode;
      } else {
        u.uHasCustomColorway.value = 0.0;
      }

      if (hasCustomDecal && decalEntry && decalEntry.ready && customPrint) {
        u.uCustomDecalMap.value = decalEntry.texture;
        u.uHasCustomDecal.value = 1.0;
        u.uDecalSide.value = customPrint.side === 'back' ? -1.0 : 1.0;
        u.uDecalOffset.value.set(customPrint.offsetX, customPrint.offsetY);
        u.uDecalScale.value = customPrint.scale;
        u.uDecalRotation.value = THREE.MathUtils.degToRad(customPrint.rotation);
        u.uDecalAspect.value = decalEntry.aspect;
        u.uDecalOpacity.value = customPrint.opacity;
      } else {
        u.uHasCustomDecal.value = 0.0;
      }
    };

    groupRef.current.traverse((child) => {
      syncUniforms(
        child.userData?.shaderUniforms as ClothShaderUniforms | undefined
      );
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material;
        const mats = Array.isArray(mat) ? mat : [mat];
        for (let i = 0; i < mats.length; i++) {
          syncUniforms(
            mats[i]?.userData?.shaderUniforms as ClothShaderUniforms | undefined
          );
        }
      }
    });

    // 7. Synchronize 3D Anchor & Screen-Space Pixel Dimensions of the On-Shirt Transform Gizmo at 60fps
    if (
      hasCustomDecal &&
      customPrint &&
      primaryUniforms &&
      decalGizmoAnchorRef.current
    ) {
      const u = primaryUniforms as ClothShaderUniforms;
      const bboxMin = u.uBBoxMin.value;
      const bboxMax = u.uBBoxMax.value;
      const bboxSizeX = Math.max(bboxMax.x - bboxMin.x, 0.1);
      const bboxSizeY = Math.max(bboxMax.y - bboxMin.y, 0.1);
      const chestCenterX = (bboxMin.x + bboxMax.x) * 0.5;
      const chestCenterY = bboxMin.y + bboxSizeY * 0.56;
      const printBaseSpan = Math.min(bboxSizeX * 0.68, bboxSizeY * 0.58);
      const decalSideSign = customPrint.side === 'back' ? -1.0 : 1.0;

      const localPosX =
        chestCenterX + customPrint.offsetX * printBaseSpan * decalSideSign;
      const localPosY =
        chestCenterY +
        customPrint.offsetY * printBaseSpan +
        (useGlbModels ? 0 : -0.82);
      const surfaceZ =
        customPrint.side === 'back'
          ? u.uSurfaceZ.value.y
          : u.uSurfaceZ.value.x;

      decalGizmoAnchorRef.current.position.set(localPosX, localPosY, surfaceZ);

      const worldPos = decalGizmoWorldVecRef.current.set(
        localPosX,
        localPosY,
        surfaceZ
      );
      groupRef.current.localToWorld(worldPos);
      const distToCam = Math.max(
        state.camera.position.distanceTo(worldPos),
        0.5
      );
      const fovDeg = (state.camera as THREE.PerspectiveCamera).fov || 38;
      const visibleHeightMeters =
        2 * Math.tan(THREE.MathUtils.degToRad(fovDeg * 0.5)) * distToCam;
      const pixelsPerMeter =
        state.size.height / Math.max(visibleHeightMeters, 0.01);

      const boxSpanMeters = Math.max(customPrint.scale * printBaseSpan, 0.02);
      const aspect =
        decalEntry && decalEntry.ready
          ? Math.max(decalEntry.aspect, 0.05)
          : 1.0;
      const widthScale = aspect >= 1.0 ? 1.0 : aspect;
      const heightScale = aspect >= 1.0 ? 1.0 / aspect : 1.0;

      const boxWidthPx = Math.max(
        boxSpanMeters * widthScale * pixelsPerMeter,
        36
      );
      const boxHeightPx = Math.max(
        boxSpanMeters * heightScale * pixelsPerMeter,
        36
      );

      gizmoMetricsRef.current.baseSpanPx = Math.max(
        printBaseSpan * pixelsPerMeter,
        60
      );
      gizmoMetricsRef.current.widthPx = boxWidthPx;
      gizmoMetricsRef.current.heightPx = boxHeightPx;

      if (gizmoBoxRef.current) {
        gizmoBoxRef.current.style.width = `${boxWidthPx.toFixed(1)}px`;
        gizmoBoxRef.current.style.height = `${boxHeightPx.toFixed(1)}px`;
        gizmoBoxRef.current.style.transform = `rotate(${customPrint.rotation}deg)`;
      }
    }
  });

  const hasVisibleOnShirtDecal = Boolean(
    isActive &&
      customPrint &&
      customPrint.enabled &&
      customPrint.imageUrl &&
      ((customPrint.side === 'front' && !isFlippedBack) ||
        (customPrint.side === 'back' && isFlippedBack))
  );

  const handleGarmentClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (transformSessionRef.current.moved) {
      transformSessionRef.current.moved = false;
      return;
    }
    if (isActive) {
      if (hasVisibleOnShirtDecal && isGizmoSelected) {
        // Clicking outside the design on the shirt hides the transform frame so user can preview cleanly
        setIsGizmoSelected(false);
        return;
      }
      onOpenQuickView(product);
    } else {
      onFocusIndex(index);
    }
  };

  const handleGizmoWheel = (e: React.WheelEvent) => {
    if (!customPrint?.enabled || !onUpdateCustomPrint) return;
    e.stopPropagation();
    const deltaScale = -e.deltaY * 0.00035;
    onUpdateCustomPrint((prev) => ({
      ...prev,
      scale: Number(
        THREE.MathUtils.clamp(prev.scale + deltaScale, 0.08, 0.88).toFixed(3)
      ),
    }));
  };

  return (
    <group
      ref={groupRef}
      position={[initialX, RACK_TOP_BAR_Y, 0]}
      rotation={[0, Math.PI * 0.42, 0]}
    >
      {/* 12-Triangle Invisible Hitbox Proxy */}
      <mesh
        position={[0, -0.82, 0]}
        onClick={handleGarmentClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          if (typeof document !== 'undefined') {
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          setHovered(false);
          if (typeof document !== 'undefined') {
            document.body.style.cursor = 'auto';
          }
        }}
      >
        <boxGeometry args={[0.88, 1.45, 0.32]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Black Contoured Hanger (/ultis/clothes_hanger.glb) with Swivel Hook locked to Rack Bar */}
      <BoutiqueHanger parentGroupRef={groupRef} />

      {/* 3D Garment Body: Universal Multi-Model .GLB Pipeline with Per-Model Procedural Fallback */}
      {useGlbModels && glbReady ? (
        <UniversalGarmentGLB
          product={product}
          fallback={<ProceduralGarmentMesh product={product} />}
        />
      ) : (
        <ProceduralGarmentMesh product={product} />
      )}

      {/* =====================================================================
          INTERACTIVE ON-SHIRT DESIGN TRANSFORM GIZMO
          (Click design to select -> Drag center to move, 4 corners to resize, top handle to rotate)
         ===================================================================== */}
      <group ref={decalGizmoAnchorRef} position={[0, -0.68, 0.14]}>
        {hasVisibleOnShirtDecal && customPrint && (
          <Html center position={[0, 0, 0]} zIndexRange={[35, 0]}>
            <div
              ref={gizmoBoxRef}
              onWheel={handleGizmoWheel}
              onPointerDown={(e) => beginGizmoTransform(e, 'move')}
              onClick={(e) => {
                e.stopPropagation();
                if (!isGizmoSelected) {
                  setIsGizmoSelected(true);
                }
              }}
              style={{
                width: `${gizmoMetricsRef.current.widthPx}px`,
                height: `${gizmoMetricsRef.current.heightPx}px`,
                transform: `rotate(${customPrint.rotation}deg)`,
              }}
              className={`relative select-none transition-shadow ${
                isGizmoSelected
                  ? 'border-2 border-[#f2ff00] shadow-[0_0_0_1px_rgba(0,0,0,0.75),0_0_18px_rgba(242,255,0,0.25)] cursor-move'
                  : 'border border-transparent hover:border-[#f2ff00]/80 hover:bg-[#f2ff00]/5 cursor-pointer group'
              }`}
              title={
                isGizmoSelected
                  ? 'Drag to move · Drag corners to resize · Drag top handle to rotate'
                  : 'Click design to show resize & rotate handles'
              }
            >
              {/* Subtle hover hint when unselected */}
              {!isGizmoSelected && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 text-[#f2ff00] border border-[#f2ff00]/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest whitespace-nowrap shadow-md">
                  Click to Edit Design
                </div>
              )}

              {/* Active Transform Handles (4 Corners + 4 Edges + Top Rotation Handle + Bottom Mini Toolbar) */}
              {isGizmoSelected && (
                <>
                  {/* Crosshair guides while actively dragging/rotating */}
                  {activeGizmoAction !== 'none' && (
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-[#f2ff00]/45" />
                      <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-[#f2ff00]/45" />
                    </div>
                  )}

                  {/* TOP ROTATION STEM & HANDLE */}
                  <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 h-7 w-[2px] bg-[#f2ff00] shadow-[0_0_2px_rgba(0,0,0,0.9)]" />
                  <div
                    onPointerDown={(e) => beginGizmoTransform(e, 'rotate')}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -top-9 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#f2ff00] text-black border-2 border-black shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                    title="Drag to rotate design (Hold Shift to snap 15°)"
                  >
                    <ArrowsClockwise weight="bold" className="w-3.5 h-3.5" />
                  </div>

                  {/* 4 CORNER RESIZE HANDLES (NW, NE, SW, SE) */}
                  <div
                    onPointerDown={(e) => beginGizmoTransform(e, 'scale')}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -top-2 -left-2 w-3.5 h-3.5 bg-[#f2ff00] border-2 border-black shadow-md cursor-nwse-resize hover:scale-125 transition-transform"
                    title="Drag corner to resize"
                  />
                  <div
                    onPointerDown={(e) => beginGizmoTransform(e, 'scale')}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -top-2 -right-2 w-3.5 h-3.5 bg-[#f2ff00] border-2 border-black shadow-md cursor-nesw-resize hover:scale-125 transition-transform"
                    title="Drag corner to resize"
                  />
                  <div
                    onPointerDown={(e) => beginGizmoTransform(e, 'scale')}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -bottom-2 -left-2 w-3.5 h-3.5 bg-[#f2ff00] border-2 border-black shadow-md cursor-nesw-resize hover:scale-125 transition-transform"
                    title="Drag corner to resize"
                  />
                  <div
                    onPointerDown={(e) => beginGizmoTransform(e, 'scale')}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -bottom-2 -right-2 w-3.5 h-3.5 bg-[#f2ff00] border-2 border-black shadow-md cursor-nwse-resize hover:scale-125 transition-transform"
                    title="Drag corner to resize"
                  />

                  {/* 4 MID-EDGE RESIZE HANDLES (Top, Bottom, Left, Right) */}
                  <div
                    onPointerDown={(e) => beginGizmoTransform(e, 'scale')}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border border-black shadow-sm cursor-ns-resize hover:scale-125 transition-transform"
                    title="Drag to resize"
                  />
                  <div
                    onPointerDown={(e) => beginGizmoTransform(e, 'scale')}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border border-black shadow-sm cursor-ns-resize hover:scale-125 transition-transform"
                    title="Drag to resize"
                  />
                  <div
                    onPointerDown={(e) => beginGizmoTransform(e, 'scale')}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-2.5 bg-white border border-black shadow-sm cursor-ew-resize hover:scale-125 transition-transform"
                    title="Drag to resize"
                  />
                  <div
                    onPointerDown={(e) => beginGizmoTransform(e, 'scale')}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 bg-white border border-black shadow-sm cursor-ew-resize hover:scale-125 transition-transform"
                    title="Drag to resize"
                  />

                  {/* Upright Floating Mini Toolbar below the bounding box */}
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      transform: `translate(-50%, 0) rotate(${-customPrint.rotation}deg)`,
                    }}
                    className="absolute -bottom-9 left-1/2 flex items-center gap-1 bg-black/90 text-white border border-[#f2ff00]/50 px-2 py-0.5 shadow-xl whitespace-nowrap font-mono text-[9px] uppercase tracking-wider"
                  >
                    <ArrowsOutCardinal
                      weight="bold"
                      className="w-3 h-3 text-[#f2ff00]"
                    />
                    <span className="text-[#f2ff00] font-bold">
                      {Math.round(customPrint.scale * 100)}%
                    </span>
                    <span className="text-white/40">·</span>
                    <span>{customPrint.rotation}°</span>

                    {/* Reset Transform */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateCustomPrint?.((prev) => ({
                          ...prev,
                          offsetX: DEFAULT_CUSTOM_PRINT_CONFIG.offsetX,
                          offsetY: DEFAULT_CUSTOM_PRINT_CONFIG.offsetY,
                          scale: DEFAULT_CUSTOM_PRINT_CONFIG.scale,
                          rotation: DEFAULT_CUSTOM_PRINT_CONFIG.rotation,
                        }));
                      }}
                      className="ml-1 p-0.5 text-white/70 hover:text-[#f2ff00] transition-colors cursor-pointer"
                      title="Reset position, size & angle"
                    >
                      <ArrowCounterClockwise weight="bold" className="w-3 h-3" />
                    </button>

                    {/* Remove Print */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateCustomPrint?.(() => DEFAULT_CUSTOM_PRINT_CONFIG);
                      }}
                      className="p-0.5 text-white/70 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove print from shirt"
                    >
                      <Trash weight="bold" className="w-3 h-3" />
                    </button>

                    {/* Hide Frame / Done */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsGizmoSelected(false);
                      }}
                      className="p-0.5 text-[#f2ff00] hover:text-white transition-colors cursor-pointer"
                      title="Hide frame (Click design on shirt anytime to edit again)"
                    >
                      <Check weight="bold" className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </Html>
        )}
      </group>

      {/* Floating Hover Index Indicator when browsing in Rack Mode */}
      {hovered && !isActive && viewMode !== 'overview' && (
        <Html center position={[0, -1.6, 0]} distanceFactor={6}>
          <div className="pointer-events-none select-none whitespace-nowrap bg-black/85 text-white font-mono text-[10px] px-2 py-0.5 uppercase tracking-widest border border-white/15 backdrop-blur-sm">
            {String(index + 1).padStart(2, '0')} / {product.name}
            {product.assetGroup ? ` [${product.assetGroup}]` : ''}
          </div>
        </Html>
      )}

      {/* Neon Yellow Product Tag + 180° Front/Back Flip Button + Quick View below active garment */}
      {isActive && (
        <Html center position={[0, -1.62, 0.15]} zIndexRange={[30, 0]}>
          <div className="flex items-center gap-1.5 animate-fadeIn">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenQuickView(product);
              }}
              className="bg-[#f2ff00] text-black font-mono font-bold text-xs px-3 py-1.5 uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-1.5 hover:bg-white transition-colors whitespace-nowrap border border-black/20"
              title="Click to inspect & customize print"
            >
              <span>{product.name}</span>
              <span className="text-[10px] font-extrabold bg-black text-[#f2ff00] px-1.5 py-0.5 ml-1">
                ${product.price}
              </span>
              <Plus weight="bold" className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {/* 180° Front/Back Flip Button (Shortcut: F) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFlippedBack((prev) => !prev);
              }}
              className="bg-black text-[#f2ff00] border border-[#f2ff00]/40 hover:bg-[#f2ff00] hover:text-black transition-colors font-mono text-xs px-2.5 py-1 uppercase flex items-center gap-1.5 cursor-pointer shadow-md whitespace-nowrap"
              title="Flip 180° Front / Back (Shortcut: F)"
            >
              <ArrowsClockwise
                weight="bold"
                className={`w-3.5 h-3.5 transition-transform duration-500 ${
                  isFlippedBack ? 'rotate-180' : 'rotate-0'
                }`}
              />
              <span>{isFlippedBack ? 'FLIP TO FRONT' : 'FLIP TO BACK'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenQuickView(product);
              }}
              className="bg-black text-[#f2ff00] hover:bg-[#f2ff00] hover:text-black font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 shadow-md transition-colors flex items-center gap-1 whitespace-nowrap border border-[#f2ff00]/40"
            >
              <Sparkle weight="fill" className="w-3 h-3" />
              <span>Customize / View</span>
            </button>
          </div>
        </Html>
      )}
    </group>
  );
};
