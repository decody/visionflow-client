'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useGalleryStore } from '@/store/gallery-store';

const target = new Vector3();

export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const progress = useGalleryStore((state) => state.progress);
  const pointerX = useGalleryStore((state) => state.pointerX);

  useFrame((_, delta) => {
    const travel = progress * 42;
    const mobile = typeof window !== 'undefined' && window.innerWidth < 700;
    const x = mobile ? 0 : pointerX * .38;
    target.set(x, mobile ? .2 : .1, 7 - travel);
    camera.position.lerp(target, 1 - Math.exp(-delta * 4.2));
    camera.lookAt(0, 0, camera.position.z - 7);
  });
  return null;
}
