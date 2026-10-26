'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export const RACK_TOP_BAR_Y = 1.46;
export const RACK_FLOOR_Y = -1.95;
export const RACK_POST_X = 3.35;

export const ChromeRack: React.FC = () => {
  // 1. Continuous Chrome Tubular Frame: Left Post -> Left Elbow -> Top Bar -> Right Elbow -> Right Post
  const rackTubeGeometry = useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    const postX = RACK_POST_X;
    const topY = RACK_TOP_BAR_Y;
    const bottomY = RACK_FLOOR_Y + 0.35;
    const bendRadius = 0.38;

    // Left vertical post
    path.add(
      new THREE.LineCurve3(
        new THREE.Vector3(-postX, bottomY, 0),
        new THREE.Vector3(-postX, topY - bendRadius, 0)
      )
    );

    // Left 90-degree smooth elbow bend
    path.add(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-postX, topY - bendRadius, 0),
        new THREE.Vector3(-postX, topY, 0),
        new THREE.Vector3(-postX + bendRadius, topY, 0)
      )
    );

    // Long top horizontal bar
    path.add(
      new THREE.LineCurve3(
        new THREE.Vector3(-postX + bendRadius, topY, 0),
        new THREE.Vector3(postX - bendRadius, topY, 0)
      )
    );

    // Right 90-degree smooth elbow bend
    path.add(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(postX - bendRadius, topY, 0),
        new THREE.Vector3(postX, topY, 0),
        new THREE.Vector3(postX, topY - bendRadius, 0)
      )
    );

    // Right vertical post
    path.add(
      new THREE.LineCurve3(
        new THREE.Vector3(postX, topY - bendRadius, 0),
        new THREE.Vector3(postX, bottomY, 0)
      )
    );

    // Sleek boutique chrome bar radius (0.0145) so the clothes_hanger.glb hook wraps cleanly around it
    return new THREE.TubeGeometry(path, 140, 0.0145, 32, false);
  }, []);

  // 2. Sculptural Teardrop Base (LatheGeometry) - swollen belly at bottom tapering smoothly upward
  const teardropBaseGeometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    const steps = 36;
    const height = 0.62;

    // Bottom flat disc center to rim
    points.push(new THREE.Vector2(0.001, 0));
    points.push(new THREE.Vector2(0.26, 0));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps; // 0 (bottom) -> 1 (top neck)
      const y = t * height;
      // Teardrop curve: bulges out at t ~ 0.22, then tapers gracefully to tube radius (0.0145)
      const bulge = Math.sin(Math.pow(1 - t, 1.35) * Math.PI * 0.88);
      const r = 0.016 + bulge * 0.28 * (1 - t * 0.55);
      points.push(new THREE.Vector2(r, y));
    }

    // Close neck into post
    points.push(new THREE.Vector2(0.0145, height));

    const geom = new THREE.LatheGeometry(points, 48);
    geom.computeVertexNormals();
    return geom;
  }, []);

  return (
    <group name="procedural-chrome-rack">
      {/* Main Continuous Chrome Tubular Frame */}
      <mesh geometry={rackTubeGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#f4f6f9"
          metalness={0.92}
          roughness={0.12}
          envMapIntensity={1.65}
        />
      </mesh>

      {/* Left Bulbous Teardrop Base */}
      <group position={[-RACK_POST_X, RACK_FLOOR_Y, 0]}>
        <mesh
          geometry={teardropBaseGeometry}
          scale={[0.95, 1, 1.25]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color="#eef2f6"
            metalness={0.92}
            roughness={0.12}
            envMapIntensity={1.6}
          />
        </mesh>

        {/* Machined Chrome Collar Joint */}
        <mesh position={[0, 0.62, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.046, 0.05, 32]} />
          <meshStandardMaterial
            color="#d8dee6"
            metalness={0.94}
            roughness={0.1}
            envMapIntensity={1.7}
          />
        </mesh>

        {/* Dark Rubber Floor Pad under base */}
        <mesh position={[0, 0.008, 0]} scale={[0.96, 1, 1.26]}>
          <cylinderGeometry args={[0.29, 0.3, 0.016, 36]} />
          <meshStandardMaterial color="#181a1d" roughness={0.85} metalness={0.1} />
        </mesh>
      </group>

      {/* Right Bulbous Teardrop Base */}
      <group position={[RACK_POST_X, RACK_FLOOR_Y, 0]}>
        <mesh
          geometry={teardropBaseGeometry}
          scale={[0.95, 1, 1.25]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color="#eef2f6"
            metalness={0.92}
            roughness={0.12}
            envMapIntensity={1.6}
          />
        </mesh>

        {/* Machined Chrome Collar Joint */}
        <mesh position={[0, 0.62, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.046, 0.05, 32]} />
          <meshStandardMaterial
            color="#d8dee6"
            metalness={0.94}
            roughness={0.1}
            envMapIntensity={1.7}
          />
        </mesh>

        {/* Dark Rubber Floor Pad under base */}
        <mesh position={[0, 0.008, 0]} scale={[0.96, 1, 1.26]}>
          <cylinderGeometry args={[0.29, 0.3, 0.016, 36]} />
          <meshStandardMaterial color="#181a1d" roughness={0.85} metalness={0.1} />
        </mesh>
      </group>

      {/* Subtle Chrome Stopper Rings near both ends of the top bar */}
      <mesh
        position={[-RACK_POST_X + 0.42, RACK_TOP_BAR_Y, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.034, 0.034, 0.024, 24]} />
        <meshStandardMaterial color="#ffffff" metalness={0.95} roughness={0.08} />
      </mesh>
      <mesh
        position={[RACK_POST_X - 0.42, RACK_TOP_BAR_Y, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.034, 0.034, 0.024, 24]} />
        <meshStandardMaterial color="#ffffff" metalness={0.95} roughness={0.08} />
      </mesh>
    </group>
  );
};
