'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';

import { GalleryScene } from '@/scene/gallery-scene';
import { useGalleryStore } from '@/store/gallery-store';

export function GalleryCanvas({ onContextLost }: { onContextLost: () => void }) {
  const reducedMotion = useGalleryStore((state) => state.reducedMotion);
  return (
    <Canvas camera={{ fov: 42, near: 0.1, far: 90, position: [0, 0, 7] }} dpr={reducedMotion ? 1 : [1, 1.35]} gl={{ antialias: !reducedMotion, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
      gl.domElement.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        onContextLost();
      }, { once: true });
    }}>
      <color attach="background" args={['#11100f']} />
      <fog attach="fog" args={['#11100f', 8, 26]} />
      <Suspense fallback={null}><GalleryScene /></Suspense>
    </Canvas>
  );
}
