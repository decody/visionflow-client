'use client';

import { chapters } from '@/config/gallery';
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
      <Atmosphere color="#dfc8a2" count={720} position={[0, 0, -1]} radius={[15, 8, 11]} size={13} speed={0.025} />
      <Atmosphere color="#fff4df" count={520} position={[0, 0, -14]} radius={[15, 8, 11]} size={10} speed={0.014} />
      <Atmosphere color="#ff245c" count={640} position={[0, 0, -28]} radius={[16, 8, 12]} size={16} speed={0.022} />
      <Atmosphere color="#dce9ff" count={1280} position={[0, 0, -42]} radius={[18, 9, 14]} size={20} speed={-0.018} />
      {chapters.map((chapter) => <GalleryRoom key={chapter.id} chapter={chapter} />)}
      <CursorAura />
      <CameraRig />
    </>
  );
}
