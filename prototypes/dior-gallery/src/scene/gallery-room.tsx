'use client';

import type { Chapter } from '@/config/gallery';
import { Artwork } from './artwork';
import { AtelierVeil, ReverieMirrors, RougeGlass } from './room-effects';

export function GalleryRoom({ chapter }: { chapter: Chapter }) {
  const pale = chapter.id === 'atelier';
  const placements: Array<{ position: [number, number, number]; rotation: [number, number, number]; scale: number }> = [
    { position: [-4.9, 1.25, 0], rotation: [0, 0.38, 0], scale: .9 },
    { position: [-2.45, -.9, -.6], rotation: [0, .14, 0], scale: .72 },
    { position: [0, 1.0, -1.25], rotation: [0, 0, 0], scale: 1.12 },
    { position: [2.65, -.8, -.55], rotation: [0, -.15, 0], scale: .72 },
    { position: [5.05, 1.1, 0], rotation: [0, -.38, 0], scale: .9 },
  ];
  return (
    <group position={[0, 0, chapter.z]}>
      <mesh position={[0, -2.8, -1]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[18, 12]} /><meshStandardMaterial color={pale ? '#beb7ae' : '#151311'} roughness={.92} /></mesh>
      <mesh position={[0, 0, -2.55]}><planeGeometry args={[17, 7]} /><meshStandardMaterial color={chapter.color} roughness={.95} /></mesh>
      {chapter.images.map((url, index) => <Artwork archive={chapter.id === 'archive'} key={url} url={url} worldZ={chapter.z} {...placements[index]!} />)}
      {chapter.id === 'atelier' ? <AtelierVeil /> : null}
      {chapter.id === 'rouge' ? <RougeGlass /> : null}
      {chapter.id === 'reverie' ? <ReverieMirrors /> : null}
    </group>
  );
}
