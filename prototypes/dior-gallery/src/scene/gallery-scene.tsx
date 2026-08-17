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
      <Atmosphere accentColor="#d8e5ff" chapterIndex={0} color="#e9c98b" count={420} position={[0, 0, -1]} radius={[15, 8, 11]} secondaryColor="#7695b8" size={15} speed={0.018} />
      <Atmosphere accentColor="#fffaf0" chapterIndex={1} color="#e5ddd0" count={280} position={[0, 0, -18]} radius={[15, 8, 11]} secondaryColor="#c9a96e" size={11} speed={0.009} />
      <Atmosphere accentColor="#ff315d" chapterIndex={2} color="#8d0929" count={360} position={[0, 0, -35]} radius={[16, 8, 12]} secondaryColor="#e6a2ad" size={17} speed={0.016} />
      <Atmosphere accentColor="#f4f0e7" chapterIndex={3} color="#e4bd63" count={340} position={[0, 0, -49]} radius={[18, 9, 14]} secondaryColor="#b7bec9" size={16} speed={-0.012} />
      <ArchiveAtelierTransition />
      {chapters.map((chapter) => <GalleryRoom key={chapter.id} chapter={chapter} />)}
      <CursorAura />
      <CameraRig />
    </>
  );
}
