'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { MathUtils } from 'three';
import type { PointLight } from 'three';
import { useGalleryStore } from '@/store/gallery-store';

export function ChapterLights() {
  const archive = useRef<PointLight>(null);
  const atelier = useRef<PointLight>(null);
  const rouge = useRef<PointLight>(null);
  const reverie = useRef<PointLight>(null);
  const progress = useGalleryStore((state) => state.progress);

  useFrame((_, delta) => {
    const section = progress * 4;
    const strengths = [0, 1, 2, 3].map((index) => Math.max(0, 1 - Math.abs(section - index - 0.35)));
    const lights = [archive.current, atelier.current, rouge.current, reverie.current];
    const maxima = [7, 10, 24, 18];
    lights.forEach((light, index) => {
      if (light) light.intensity = MathUtils.damp(light.intensity, strengths[index]! * maxima[index]!, 3.5, delta);
    });
  });

  return (
    <>
      <pointLight ref={archive} color="#d2b993" distance={18} position={[-2, 3, 5]} />
      <pointLight ref={atelier} color="#fff4df" distance={20} position={[2, 4, -10]} />
      <pointLight ref={rouge} color="#d20c43" distance={20} position={[-3, 2, -24]} />
      <pointLight ref={reverie} color="#8cbcff" distance={22} position={[3, 3, -38]} />
    </>
  );
}
