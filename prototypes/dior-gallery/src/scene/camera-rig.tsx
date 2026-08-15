'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { chapters } from '@/config/gallery';
import { useGalleryStore } from '@/store/gallery-store';

const target = new Vector3();

export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const entered = useGalleryStore((state) => state.entered);
  const entryProgress = useGalleryStore((state) => state.entryProgress);
  const progress = useGalleryStore((state) => state.progress);
  const pointerX = useGalleryStore((state) => state.pointerX);

  useFrame((_, delta) => {
    const entryEase = entryProgress * entryProgress * (3 - 2 * entryProgress);
    const entryDepth = entered ? (1 - entryEase) * 12 : 15;
    const mobile = size.width < 700 || size.width / Math.max(1, size.height) < .72;
    const section = Math.min(3, Math.floor(progress * 3.001));
    const local = progress * 3 - section;
    const fromZ = chapters[section]?.z ?? 0;
    const toZ = chapters[Math.min(3, section + 1)]?.z ?? fromZ;
    const mobileTravel = MathUtils.smoothstep(local, .56, 1);
    const sceneZ = MathUtils.lerp(fromZ, toZ, mobile ? mobileTravel : local);
    const pointerShift = mobile ? 0 : pointerX * .48;
    const mobileFocus = MathUtils.smoothstep(local, .14, .5) * (1 - MathUtils.smoothstep(local, .54, .82));
    const desktopX = section === 0 ? Math.sin(local * Math.PI) * 1.4 : section === 1 ? Math.sin(local * Math.PI * 2) * .75 : section === 2 ? Math.cos(local * Math.PI) * 1.1 : Math.sin(local * Math.PI) * .45;
    const desktopY = section === 0 ? .15 : section === 1 ? Math.sin(local * Math.PI) * .6 : section === 2 ? -.1 + local * .5 : .15 + local * 1.25;
    const mobileX = section === 0 ? mobileFocus * 1.2 : section === 1 ? .15 + mobileFocus * 1.05 : 0;
    const mobileY = section === 0 ? .2 + mobileFocus * .16 : section === 1 ? .12 + mobileFocus * .2 : section === 2 ? .08 : .36;
    const mobileDistanceByChapter = section === 0 ? 4.2 - mobileFocus * 1.1 : section === 1 ? 4.5 - mobileFocus * 1.65 : section === 2 ? 4.25 - mobileFocus * 1.45 : 2.35;
    const mobileDistance = mobile ? mobileDistanceByChapter * entryEase : 0;
    const chapterX = mobile ? mobileX : desktopX;
    const chapterY = mobile ? mobileY : desktopY;
    target.set(chapterX + pointerShift, chapterY, 7 + sceneZ + entryDepth + mobileDistance);
    camera.position.lerp(target, 1 - Math.exp(-delta * 4.2));
    const lookX = mobile
      ? section === 0 ? mobileFocus * .55 : section === 1 ? .4 + mobileFocus * .4 : 0
      : section === 2 ? Math.sin(local * Math.PI) * .8 : 0;
    const lookY = mobile ? (section === 3 ? .38 : .08) : section === 3 ? .45 : 0;
    camera.lookAt(lookX, lookY, camera.position.z - 7 - mobileDistance * .35);

    if (camera instanceof PerspectiveCamera) {
      const nextFov = mobile ? 48 : 42;
      if (Math.abs(camera.fov - nextFov) > .01) {
        camera.fov = MathUtils.damp(camera.fov, nextFov, 5, delta);
        camera.updateProjectionMatrix();
      }
    }
  });
  return null;
}
