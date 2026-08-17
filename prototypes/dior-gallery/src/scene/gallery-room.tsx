'use client';

import { useThree } from '@react-three/fiber';
import type { Chapter } from '@/config/gallery';
import { useGalleryStore } from '@/store/gallery-store';
import { ArchiveTunnel } from './archive-tunnel';
import { Artwork } from './artwork';
import { CrystalBreath } from './crystal-breath';
import { RougeMirrorHall } from './rouge-mirror-hall';
import { AtelierWorkbench } from './room-effects';
import { ReverieBackdrop } from './reverie-stage';

const SHOW_REVERIE_BACKDROP = false;

export function GalleryRoom({ chapter }: { chapter: Chapter }) {
  const size = useThree((state) => state.size);
  const mobile = size.width < 700 || size.width / Math.max(1, size.height) < .72;
  const activeChapter = useGalleryStore((state) => state.chapter);
  const progress = useGalleryStore((state) => state.progress);
  const showAtelierContents = progress > .025 && progress < .65;
  const showRougeContents = progress > .38 && progress < .9;
  const showArchiveContents = progress < .43;
  const showReverieContents = progress > .68;
  const pale = chapter.id === 'atelier';
  const floorColor = chapter.id === 'reverie' ? '#070808' : chapter.id === 'rouge' ? '#090104' : pale ? '#8f8982' : '#151311';
  const placements: Array<{ position: [number, number, number]; rotation: [number, number, number]; scale: number }> = [
    { position: [-4.9, 1.25, 0], rotation: [0, 0.38, 0], scale: .9 },
    { position: [-2.45, -.9, -.6], rotation: [0, .14, 0], scale: .72 },
    { position: [0, 1.0, -1.25], rotation: [0, 0, 0], scale: 1.12 },
    { position: [2.65, -.8, -.55], rotation: [0, -.15, 0], scale: .72 },
    { position: [5.05, 1.1, 0], rotation: [0, -.38, 0], scale: .9 },
  ];
  const archivePlacements: typeof placements = [
    { position: [-4.84, .55, 2.05], rotation: [0, 1.25, 0], scale: .7 },
    { position: [4.84, .45, .25], rotation: [0, -1.29, 0], scale: .68 },
    { position: [-4.86, -.75, -1.55], rotation: [0, 1.34, 0], scale: .66 },
    { position: [4.86, -.55, -3.45], rotation: [0, -1.38, 0], scale: .66 },
    { position: [-4.88, .65, -5.35], rotation: [0, 1.43, 0], scale: .69 },
  ];
  const mobileArchivePlacements: typeof placements = [
    { position: [-3.38, .75, 1.55], rotation: [0, 1.13, 0], scale: .72 },
    { position: [3.38, .62, .15], rotation: [0, -1.16, 0], scale: .72 },
    { position: [-3.4, -.62, -1.45], rotation: [0, 1.2, 0], scale: .69 },
    { position: [3.4, -.5, -3.15], rotation: [0, -1.24, 0], scale: .69 },
    { position: [-3.42, .7, -4.95], rotation: [0, 1.29, 0], scale: .71 },
  ];
  const atelierPlacements: Array<{ position: [number, number, number]; rotation: [number, number, number]; width: number; height: number }> = [
    { position: [-4.95, 1.23125, -2.46], rotation: [0, 0, 0], width: 2.8, height: 2.1 },
    { position: [-4.3167, -.71875, -2.46], rotation: [0, 0, 0], width: 1.5333, height: 1.15 },
    { position: [-1.53, 1.4, -2.46], rotation: [0, 0, 0], width: 3.25, height: 2.4375 },
    { position: [-1.88, -1.1, -2.46], rotation: [0, 0, 0], width: 2.55, height: 1.9125 },
  ];
  const mobileAtelierPlacements: typeof atelierPlacements = [
    { position: [-1.52, 1.58, -2.46], rotation: [0, 0, 0], width: 1.72, height: 1.29 },
    { position: [-1.76, -.05, -2.46], rotation: [0, 0, 0], width: 1.28, height: .96 },
    { position: [.55, 1.72, -2.46], rotation: [0, 0, 0], width: 2.05, height: 1.54 },
    { position: [-.05, -.22, -2.46], rotation: [0, 0, 0], width: 1.7, height: 1.275 },
  ];
  const selectedArchivePlacements = mobile ? mobileArchivePlacements : archivePlacements;
  const selectedAtelierPlacements = mobile ? mobileAtelierPlacements : atelierPlacements;
  return (
    <group position={[0, 0, chapter.z]}>
      {chapter.id === 'archive' ? <ArchiveTunnel mobile={mobile} /> : null}
      {chapter.id !== 'reverie' && chapter.id !== 'archive' ? <mesh position={[0, -2.8, -1]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[chapter.id === 'rouge' ? 15 : 18, 12]} /><meshStandardMaterial color={floorColor} metalness={chapter.id === 'rouge' ? .62 : .08} roughness={chapter.id === 'rouge' ? .24 : .92} /></mesh> : null}
      {chapter.id !== 'archive' ? <mesh position={[0, 0, -2.55]}><planeGeometry args={chapter.id === 'reverie' ? [28, 17] : chapter.id === 'atelier' || chapter.id === 'rouge' ? [28, 15] : [17, 7]} /><meshBasicMaterial color={chapter.color} /></mesh> : null}
      {chapter.id === 'reverie' ? showReverieContents ? (
        <>
          {SHOW_REVERIE_BACKDROP ? <ReverieBackdrop url={chapter.images[0]!} /> : null}
          <Artwork backplate={false} edgeFeather={0.24} height={5.25} id="reverie-2" interactive={false} pointerTiltY position={[0, mobile ? .32 : .45, -0.15]} scale={mobile ? 1.15 : 1.275} url={chapter.images[0]!} width={3.12} worldZ={chapter.z} />
        </>
      ) : null : chapter.id === 'atelier' ? showAtelierContents ? chapter.images.map((url, index) => (
        <Artwork alwaysVisible backplate={false} edgeFeather={0.001} frameColor="#d7ccb9" framed frameThickness={mobile ? .085 : .12} id={`${chapter.id}-${index}`} interactive={false} key={url} url={url} worldZ={chapter.z} {...selectedAtelierPlacements[index]!} />
      )) : null : chapter.id === 'rouge' ? showRougeContents ? <RougeMirrorHall images={chapter.images} mobile={mobile} showHero worldZ={chapter.z} /> : null : showArchiveContents ? chapter.images.map((url, index) => <Artwork archive framed id={`${chapter.id}-${index}`} key={url} url={url} worldZ={chapter.z} {...selectedArchivePlacements[index]!} />) : null}
      {chapter.id === 'atelier' && showAtelierContents ? <group position={mobile ? [.55, -.46, .52] : [3, -.49, .3]} scale={mobile ? .64 : .82}><AtelierWorkbench /></group> : null}
      {chapter.id === 'reverie' && activeChapter === 'reverie' ? <CrystalBreath /> : null}
    </group>
  );
}
