'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';

import { GalleryScene } from '@/scene/gallery-scene';

export function GalleryCanvas() {
  return (
    <Canvas camera={{ fov: 42, near: 0.1, far: 90, position: [0, 0, 7] }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <color attach="background" args={['#11100f']} />
      <fog attach="fog" args={['#11100f', 8, 26]} />
      <Suspense fallback={null}><GalleryScene /></Suspense>
    </Canvas>
  );
}
