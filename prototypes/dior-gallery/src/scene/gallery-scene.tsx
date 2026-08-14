'use client';

import { chapters } from '@/config/gallery';
import { ArchiveAtelierTransition } from './archive-atelier-transition';
import { CameraRig } from './camera-rig';
import { Atmosphere } from './atmosphere';
import { ChapterLights } from './chapter-lights';
import { CursorAura } from './cursor-aura';
import { GalleryRoom } from './gallery-room';

export function GalleryScene() {
  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight color="#fff5e8" intensity={2.1} position={[3, 7, 8]} />
      <ChapterLights />
      <Atmosphere accentColor="#8f63ff" color="#ffd85c" count={720} position={[0, 0, -1]} radius={[15, 8, 11]} secondaryColor="#43a8ff" size={18} speed={0.025} />
      <Atmosphere accentColor="#a66cff" color="#ffe278" count={520} position={[0, 0, -18]} radius={[15, 8, 11]} secondaryColor="#4bbdff" size={14} speed={0.014} />
      <Atmosphere accentColor="#ffd45f" color="#ff3568" count={640} position={[0, 0, -35]} radius={[16, 8, 12]} secondaryColor="#7b6dff" size={21} speed={0.022} />
      <Atmosphere accentColor="#ffd45f" color="#68baff" count={520} position={[0, 0, -49]} radius={[18, 9, 14]} secondaryColor="#a86cff" size={20} speed={-0.018} />
      <ArchiveAtelierTransition />
      {chapters.map((chapter) => <GalleryRoom key={chapter.id} chapter={chapter} />)}
      <CursorAura />
      <CameraRig />
    </>
  );
}
