'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector3 } from 'three';
import { chapters } from '@/config/gallery';
import { useGalleryStore } from '@/store/gallery-store';

const target = new Vector3();

export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const entered = useGalleryStore((state) => state.entered);
  const entryProgress = useGalleryStore((state) => state.entryProgress);
  const progress = useGalleryStore((state) => state.progress);
  const pointerX = useGalleryStore((state) => state.pointerX);

  useFrame((_, delta) => {
    const entryEase = entryProgress * entryProgress * (3 - 2 * entryProgress);
    const entryDepth = entered ? (1 - entryEase) * 12 : 15;
    const mobile = typeof window !== 'undefined' && window.innerWidth < 700;
    const section = Math.min(3, Math.floor(progress * 3.001));
    const local = progress * 3 - section;
    const fromZ = chapters[section]?.z ?? 0;
    const toZ = chapters[Math.min(3, section + 1)]?.z ?? fromZ;
    const sceneZ = MathUtils.lerp(fromZ, toZ, local);
    const pointerShift = mobile ? 0 : pointerX * .48;
    const chapterX = section === 0 ? Math.sin(local * Math.PI) * 1.4 : section === 1 ? Math.sin(local * Math.PI * 2) * .75 : section === 2 ? Math.cos(local * Math.PI) * 1.1 : Math.sin(local * Math.PI) * .45;
    const chapterY = section === 0 ? .15 : section === 1 ? Math.sin(local * Math.PI) * .6 : section === 2 ? -.1 + local * .5 : .15 + local * 1.25;
    target.set(chapterX + pointerShift, mobile ? chapterY * .55 : chapterY, 7 + sceneZ + entryDepth);
    camera.position.lerp(target, 1 - Math.exp(-delta * 4.2));
    camera.lookAt(section === 2 ? Math.sin(local * Math.PI) * .8 : 0, section === 3 ? .45 : 0, camera.position.z - 7);
  });
  return null;
}
