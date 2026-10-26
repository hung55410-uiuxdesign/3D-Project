'use client';

import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  AdaptiveDpr,
  AdaptiveEvents,
  ContactShadows,
  Environment,
  Html,
  Line,
} from '@react-three/drei';
import { damp3 } from 'maath/easing';
import {
  CameraViewMode,
  CustomColorwayConfig,
  CustomPrintConfig,
  LightSourceConfig,
  ProductItem,
  StudioLightingConfig,
} from '@/types/store';
import { ChromeRack, RACK_FLOOR_Y } from './ChromeRack';
import { GarmentItem, getGarmentTargetX } from './GarmentItem';

export interface VirtualStoreSceneProps {
  products: ProductItem[];
  activeIndex: number | null;
  viewMode: CameraViewMode;
  isLoadingProducts: boolean;
  useGlbModels: boolean;
  lightingConfig: StudioLightingConfig;
  isDetailOpen?: boolean;
  customPrint?: CustomPrintConfig;
  customColorway?: CustomColorwayConfig;
  customPrintsByProduct?: Record<string, CustomPrintConfig>;
  customColorwaysByProduct?: Record<string, CustomColorwayConfig>;
  isDirectDragPrintMode?: boolean;
  isFlippedBack?: boolean;
  onChangeFlippedBack?: (flipped: boolean) => void;
  onUpdateCustomPrint?: (
    updater: (prev: CustomPrintConfig) => CustomPrintConfig
  ) => void;
  onFocusIndex: (index: number | null) => void;
  onOpenQuickView: (product: ProductItem) => void;
}

/**
 * Syncs WebGLRenderer toneMappingExposure dynamically whenever lightingConfig.exposure changes
 */
const RendererExposureController: React.FC<{ exposure: number }> = ({
  exposure,
}) => {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
};

/**
 * 3D Visual Gizmo for an individual studio light source so users can see its exact 3D position & direction
 */
const SingleLightGizmo: React.FC<{
  badge: string;
  light: LightSourceConfig;
}> = ({ badge, light }) => {
  const targetPoint = useMemo(() => new THREE.Vector3(0, 0.25, 0), []);
  const lightPos = useMemo(
    () => new THREE.Vector3(light.position[0], light.position[1], light.position[2]),
    [light.position]
  );

  if (!light.enabled) return null;

  return (
    <group>
      {/* Direction ray from Light Position -> Rack Center */}
      <Line
        points={[lightPos, targetPoint]}
        color={light.color}
        lineWidth={1.5}
        transparent
        opacity={0.65}
        dashed
        dashScale={6}
        dashSize={0.35}
        dashOffset={0}
      />

      {/* Glowing 3D Light Bulb Sphere at light source coordinates */}
      <group position={light.position}>
        <mesh>
          <sphereGeometry args={[0.14, 20, 20]} />
          <meshBasicMaterial color={light.color} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.24, 16, 16]} />
          <meshBasicMaterial
            color={light.color}
            transparent
            opacity={0.25}
            depthWrite={false}
          />
        </mesh>

        <Html center distanceFactor={9} zIndexRange={[15, 0]}>
          <div className="pointer-events-none select-none px-2 py-0.5 rounded bg-black/85 border border-[#f2ff00]/80 text-[10px] font-mono text-white whitespace-nowrap shadow-lg">
            <span className="font-bold text-[#f2ff00] mr-1">{badge}</span>
            <span>
              [{light.position[0].toFixed(1)}, {light.position[1].toFixed(1)},{' '}
              {light.position[2].toFixed(1)}]
            </span>
            <span className="ml-1 text-white/60">({light.intensity.toFixed(2)})</span>
          </div>
        </Html>
      </group>
    </group>
  );
};

interface CameraRigProps {
  viewMode: CameraViewMode;
  activeIndex: number | null;
  totalItems: number;
  isDetailOpen: boolean;
}

/**
 * 60FPS Camera Rig using maath/easing damp3 across Overview, Rack, and Focus modes
 * Shifts cameraTargetX by +0.35 when the right-side Product Detail & Custom Print Studio panel is open
 * so the active 3D garment sits cleanly on the left side of the screen.
 */
const CameraRig: React.FC<CameraRigProps> = ({
  viewMode,
  activeIndex,
  totalItems,
  isDetailOpen,
}) => {
  const lookAtTarget = useRef(new THREE.Vector3(0, 0.2, 0));

  useFrame((state, delta) => {
    let targetCamPos: [number, number, number] = [0, 0.2, 8.5];
    let targetLookAt: [number, number, number] = [0, 0.15, 0];

    const pointerX = state.pointer.x * 0.18;
    const pointerY = state.pointer.y * 0.1;

    if (viewMode === 'overview') {
      targetCamPos = [pointerX * 0.5, 0.2 + pointerY * 0.4, 8.5];
      targetLookAt = [0, 0.15, 0];
    } else if (viewMode === 'focus' && activeIndex !== null) {
      const focusedX = getGarmentTargetX(
        activeIndex,
        totalItems,
        activeIndex,
        'focus'
      );
      const panelCameraOffsetX = isDetailOpen ? 0.35 : 0;
      targetCamPos = [
        focusedX + panelCameraOffsetX + pointerX * 0.25,
        0.35 + pointerY * 0.2,
        3.75,
      ];
      targetLookAt = [focusedX + panelCameraOffsetX, 0.28, 0.1];
    } else {
      targetCamPos = [pointerX * 0.6, 0.35 + pointerY * 0.3, 4.8];
      targetLookAt = [pointerX * 0.2, 0.25, 0];
    }

    damp3(state.camera.position, targetCamPos, 0.24, delta);
    damp3(lookAtTarget.current, targetLookAt, 0.22, delta);
    state.camera.lookAt(lookAtTarget.current);
  });

  return null;
};

/**
 * Subtle animated 3D rack transition group when switching collections
 */
const RackContentGroup: React.FC<{
  products: ProductItem[];
  activeIndex: number | null;
  viewMode: CameraViewMode;
  isLoadingProducts: boolean;
  useGlbModels: boolean;
  customPrint?: CustomPrintConfig;
  customColorway?: CustomColorwayConfig;
  customPrintsByProduct?: Record<string, CustomPrintConfig>;
  customColorwaysByProduct?: Record<string, CustomColorwayConfig>;
  isDirectDragPrintMode?: boolean;
  isFlippedBack?: boolean;
  onChangeFlippedBack?: (flipped: boolean) => void;
  onUpdateCustomPrint?: (
    updater: (prev: CustomPrintConfig) => CustomPrintConfig
  ) => void;
  onFocusIndex: (index: number | null) => void;
  onOpenQuickView: (product: ProductItem) => void;
}> = ({
  products,
  activeIndex,
  viewMode,
  isLoadingProducts,
  useGlbModels,
  customPrint,
  customColorway,
  customPrintsByProduct,
  customColorwaysByProduct,
  isDirectDragPrintMode,
  isFlippedBack,
  onChangeFlippedBack,
  onUpdateCustomPrint,
  onFocusIndex,
  onOpenQuickView,
}) => {
  const rackGroupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (!rackGroupRef.current) return;
    const targetY = isLoadingProducts ? -0.06 : 0;
    damp3(rackGroupRef.current.position, [0, targetY, 0], 0.15, delta);
  });

  return (
    <group ref={rackGroupRef}>
      {/* Procedural Metallic Chrome Rack with 2 Teardrop Bases */}
      <ChromeRack />

      {/* 3D Garments Hanging Along the Bar */}
      {products.map((product, idx) => (
        <GarmentItem
          key={product.id}
          product={product}
          index={idx}
          totalItems={products.length}
          activeIndex={activeIndex}
          viewMode={viewMode}
          useGlbModels={useGlbModels}
          customPrint={
            customPrintsByProduct?.[product.id] ??
            (activeIndex === idx ? customPrint : undefined)
          }
          customColorway={
            customColorwaysByProduct?.[product.id] ??
            (activeIndex === idx ? customColorway : undefined)
          }
          isDirectDragPrintMode={
            activeIndex === idx ? isDirectDragPrintMode : false
          }
          externalFlippedBack={
            activeIndex === idx ? isFlippedBack : undefined
          }
          onChangeFlippedBack={
            activeIndex === idx ? onChangeFlippedBack : undefined
          }
          onUpdateCustomPrint={
            activeIndex === idx ? onUpdateCustomPrint : undefined
          }
          onFocusIndex={(i) => onFocusIndex(i)}
          onOpenQuickView={onOpenQuickView}
        />
      ))}
    </group>
  );
};

export const VirtualStoreScene: React.FC<VirtualStoreSceneProps> = ({
  products,
  activeIndex,
  viewMode,
  isLoadingProducts,
  useGlbModels,
  lightingConfig,
  isDetailOpen = false,
  customPrint,
  customColorway,
  customPrintsByProduct,
  customColorwaysByProduct,
  isDirectDragPrintMode = false,
  isFlippedBack,
  onChangeFlippedBack,
  onUpdateCustomPrint,
  onFocusIndex,
  onOpenQuickView,
}) => {
  const focusedSpotX =
    activeIndex !== null
      ? getGarmentTargetX(activeIndex, products.length || 10, activeIndex, 'focus')
      : 0;

  return (
    <div className="relative w-full h-full z-10">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.2, 8.5], fov: 38, near: 0.1, far: 60 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: lightingConfig.exposure,
        }}
        onPointerMissed={() => {
          if (activeIndex !== null && !isDetailOpen) {
            onFocusIndex(null);
          }
        }}
      >
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <RendererExposureController exposure={lightingConfig.exposure} />

        {/* Dynamic Studio Hemisphere Fill */}
        <hemisphereLight
          args={[
            lightingConfig.ambientSkyColor,
            lightingConfig.ambientGroundColor,
            lightingConfig.ambientIntensity,
          ]}
        />

        {/* 1. Key Light (Front-Right Primary Softbox) */}
        {lightingConfig.keyLight.enabled && (
          <directionalLight
            position={lightingConfig.keyLight.position}
            intensity={lightingConfig.keyLight.intensity}
            color={lightingConfig.keyLight.color}
          />
        )}

        {/* 2. Fill Light (Front-Left Angled Garment Illuminator) */}
        {lightingConfig.fillLight.enabled && (
          <directionalLight
            position={lightingConfig.fillLight.position}
            intensity={lightingConfig.fillLight.intensity}
            color={lightingConfig.fillLight.color}
          />
        )}

        {/* 3. Rim / Top Backlight (Shoulder & Chrome Bar Definition) */}
        {lightingConfig.rimLight.enabled && (
          <directionalLight
            position={lightingConfig.rimLight.position}
            intensity={lightingConfig.rimLight.intensity}
            color={lightingConfig.rimLight.color}
          />
        )}

        {/* 4. 3D Spotlight Focus on the Active Center Garment */}
        {activeIndex !== null && (
          <pointLight
            position={[focusedSpotX, 0.55, 1.35]}
            intensity={0.85}
            distance={2.6}
            decay={2}
            color="#ffffff"
          />
        )}

        {/* 3D Visual Light Position Gizmos (when toggled on in Preview UI) */}
        {lightingConfig.showLightHelpers && (
          <group>
            <SingleLightGizmo badge="KEY" light={lightingConfig.keyLight} />
            <SingleLightGizmo badge="FILL" light={lightingConfig.fillLight} />
            <SingleLightGizmo badge="RIM" light={lightingConfig.rimLight} />
          </group>
        )}

        <Suspense fallback={null}>
          <Environment
            preset={lightingConfig.envPreset}
            environmentIntensity={lightingConfig.envIntensity}
          />
        </Suspense>

        {/* Camera Animation Rig */}
        <CameraRig
          viewMode={viewMode}
          activeIndex={activeIndex}
          totalItems={products.length || 10}
          isDetailOpen={isDetailOpen}
        />

        {/* Chrome Rack + Garments */}
        <RackContentGroup
          products={products}
          activeIndex={activeIndex}
          viewMode={viewMode}
          isLoadingProducts={isLoadingProducts}
          useGlbModels={useGlbModels}
          customPrint={customPrint}
          customColorway={customColorway}
          customPrintsByProduct={customPrintsByProduct}
          customColorwaysByProduct={customColorwaysByProduct}
          isDirectDragPrintMode={isDirectDragPrintMode}
          isFlippedBack={isFlippedBack}
          onChangeFlippedBack={onChangeFlippedBack}
          onUpdateCustomPrint={onUpdateCustomPrint}
          onFocusIndex={onFocusIndex}
          onOpenQuickView={onOpenQuickView}
        />

        {/* Soft Baked Studio Floor Contact Shadows */}
        <ContactShadows
          position={[0, RACK_FLOOR_Y + 0.01, 0]}
          frames={1}
          resolution={256}
          opacity={lightingConfig.contactShadowOpacity}
          scale={12}
          blur={2.4}
          far={4.2}
          color="#1e2024"
        />
      </Canvas>
    </div>
  );
};
